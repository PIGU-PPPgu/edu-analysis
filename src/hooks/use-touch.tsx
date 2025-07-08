/**
 * 🤚 触摸检测和手势支持 Hook
 * 为移动端设备提供触摸手势检测和优化
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// 触摸手势类型
export type TouchGesture = 'tap' | 'long-press' | 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'pinch' | 'scroll';

// 触摸配置接口
export interface TouchConfig {
  longPressDelay?: number;      // 长按延迟 (ms)
  swipeThreshold?: number;      // 滑动阈值 (px)
  pinchThreshold?: number;      // 缩放阈值
  preventScroll?: boolean;      // 是否阻止滚动
  enableMultiTouch?: boolean;   // 是否启用多点触控
}

// 触摸事件数据
export interface TouchEventData {
  gesture: TouchGesture;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  duration: number;
  scale?: number;               // 缩放比例
  rotation?: number;            // 旋转角度
}

// 默认配置
const DEFAULT_CONFIG: Required<TouchConfig> = {
  longPressDelay: 800,
  swipeThreshold: 50,
  pinchThreshold: 0.1,
  preventScroll: false,
  enableMultiTouch: true
};

/**
 * 检测设备是否支持触摸
 */
export const useIsTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchSupport = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    setIsTouchDevice(checkTouchSupport());
  }, []);

  return isTouchDevice;
};

/**
 * 主要的触摸检测 Hook
 */
export const useTouch = (
  config: TouchConfig = {},
  onGesture?: (data: TouchEventData) => void
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [isPressed, setIsPressed] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<TouchGesture | null>(null);
  
  // 触摸状态跟踪
  const touchState = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    longPressTimer: null as NodeJS.Timeout | null,
    initialDistance: 0,
    initialScale: 1,
    touches: [] as Touch[]
  });

  const isTouchDevice = useIsTouchDevice();

  // 清理定时器
  const clearLongPressTimer = useCallback(() => {
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }
  }, []);

  // 计算两点距离
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 发送手势事件
  const emitGesture = useCallback((gesture: TouchGesture, additionalData?: Partial<TouchEventData>) => {
    const state = touchState.current;
    const data: TouchEventData = {
      gesture,
      startX: state.startX,
      startY: state.startY,
      endX: state.endX,
      endY: state.endY,
      deltaX: state.endX - state.startX,
      deltaY: state.endY - state.startY,
      duration: Date.now() - state.startTime,
      ...additionalData
    };

    setCurrentGesture(gesture);
    onGesture?.(data);

    // 短暂显示手势类型，然后清除
    setTimeout(() => setCurrentGesture(null), 100);
  }, [onGesture]);

  // 触摸开始处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (finalConfig.preventScroll) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const state = touchState.current;
    
    state.startTime = Date.now();
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.touches = Array.from(e.touches);

    setIsPressed(true);

    // 设置长按定时器
    state.longPressTimer = setTimeout(() => {
      emitGesture('long-press');
    }, finalConfig.longPressDelay);

    // 多点触控处理
    if (finalConfig.enableMultiTouch && e.touches.length === 2) {
      state.initialDistance = getDistance(e.touches[0], e.touches[1]);
    }
  }, [finalConfig, emitGesture, getDistance]);

  // 触摸移动处理
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (finalConfig.preventScroll) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const state = touchState.current;
    
    state.endX = touch.clientX;
    state.endY = touch.clientY;

    // 如果移动超出阈值，取消长按
    const deltaX = Math.abs(state.endX - state.startX);
    const deltaY = Math.abs(state.endY - state.startY);
    
    if (deltaX > 10 || deltaY > 10) {
      clearLongPressTimer();
    }

    // 多点触控缩放检测
    if (finalConfig.enableMultiTouch && e.touches.length === 2) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / state.initialDistance;
      
      if (Math.abs(scale - 1) > finalConfig.pinchThreshold) {
        emitGesture('pinch', { scale });
      }
    }

    // 滚动检测
    if (e.touches.length === 1) {
      emitGesture('scroll');
    }
  }, [finalConfig, clearLongPressTimer, emitGesture, getDistance]);

  // 触摸结束处理
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const state = touchState.current;
    
    clearLongPressTimer();
    setIsPressed(false);

    if (!state.endX && !state.endY) {
      // 简单点击
      emitGesture('tap');
      return;
    }

    const deltaX = state.endX - state.startX;
    const deltaY = state.endY - state.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 滑动手势检测
    if (absDeltaX > finalConfig.swipeThreshold || absDeltaY > finalConfig.swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // 水平滑动
        emitGesture(deltaX > 0 ? 'swipe-right' : 'swipe-left');
      } else {
        // 垂直滑动
        emitGesture(deltaY > 0 ? 'swipe-down' : 'swipe-up');
      }
    } else {
      // 小幅移动当作点击
      emitGesture('tap');
    }

    // 重置状态
    state.endX = 0;
    state.endY = 0;
  }, [finalConfig, clearLongPressTimer, emitGesture]);

  // 清理效果
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  // 返回触摸处理器和状态
  return {
    // 状态
    isTouchDevice,
    isPressed,
    currentGesture,
    
    // 事件处理器
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    
    // 工具方法
    clearLongPressTimer
  };
};

/**
 * 简化的触摸检测 Hook - 仅检测基本手势
 */
export const useSimpleTouch = (onTap?: () => void, onLongPress?: () => void) => {
  return useTouch(
    { longPressDelay: 600 },
    useCallback((data: TouchEventData) => {
      switch (data.gesture) {
        case 'tap':
          onTap?.();
          break;
        case 'long-press':
          onLongPress?.();
          break;
      }
    }, [onTap, onLongPress])
  );
};

/**
 * 滑动检测 Hook
 */
export const useSwipe = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) => {
  return useTouch(
    { swipeThreshold: 80 },
    useCallback((data: TouchEventData) => {
      switch (data.gesture) {
        case 'swipe-left':
          onSwipeLeft?.();
          break;
        case 'swipe-right':
          onSwipeRight?.();
          break;
        case 'swipe-up':
          onSwipeUp?.();
          break;
        case 'swipe-down':
          onSwipeDown?.();
          break;
      }
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])
  );
};

/**
 * 缩放检测 Hook
 */
export const usePinch = (onPinch?: (scale: number) => void) => {
  return useTouch(
    { enableMultiTouch: true, pinchThreshold: 0.1 },
    useCallback((data: TouchEventData) => {
      if (data.gesture === 'pinch' && data.scale) {
        onPinch?.(data.scale);
      }
    }, [onPinch])
  );
};