/**
 * 🚀 前端性能优化工具集
 * 提供组件渲染优化、内存管理、懒加载等性能优化功能
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, throttle } from 'lodash-es';

// 性能监控配置
export const PERFORMANCE_CONFIG = {
  // 组件渲染性能监控
  RENDER_THRESHOLD_MS: 16, // 60fps 阈值
  SLOW_RENDER_THRESHOLD_MS: 100, // 慢渲染阈值
  
  // 内存使用监控
  MEMORY_CHECK_INTERVAL: 30000, // 30秒检查一次内存
  MEMORY_WARNING_THRESHOLD: 50 * 1024 * 1024, // 50MB 警告阈值
  
  // 懒加载配置
  INTERSECTION_THRESHOLD: 0.1, // 10% 可见时触发
  INTERSECTION_ROOT_MARGIN: '50px', // 提前50px加载
  
  // 缓存配置
  CACHE_TTL: 5 * 60 * 1000, // 5分钟缓存
  MAX_CACHE_SIZE: 100, // 最大缓存条目数
  
  // 防抖/节流配置
  DEBOUNCE_DELAY: 300, // 默认防抖延迟
  THROTTLE_DELAY: 100, // 默认节流延迟
};

// 性能监控数据接口
export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  memoryUsage: number;
  timestamp: number;
  props?: any;
  rerenderCount?: number;
}

// 内存监控管理器
class MemoryMonitor {
  private static instance: MemoryMonitor;
  private metrics: PerformanceMetrics[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }
  
  startMonitoring(): void {
    if (this.checkInterval) return;
    
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL);
  }
  
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = memory.usedJSHeapSize;
      
      if (usage > PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD) {
        console.warn('🚨 内存使用过高:', {
          used: `${(usage / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
        });
        
        // 触发垃圾回收建议
        this.suggestGarbageCollection();
      }
    }
  }
  
  private suggestGarbageCollection(): void {
    // 清理过期的性能指标
    const cutoff = Date.now() - PERFORMANCE_CONFIG.CACHE_TTL;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
    
    // 发出内存清理事件
    window.dispatchEvent(new CustomEvent('memory-pressure', {
      detail: { suggestion: 'cleanup-caches' }
    }));
  }
  
  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // 限制指标数组大小
    if (this.metrics.length > PERFORMANCE_CONFIG.MAX_CACHE_SIZE) {
      this.metrics.shift();
    }
  }
  
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

// 全局内存监控实例
export const memoryMonitor = MemoryMonitor.getInstance();

/**
 * 组件渲染性能监控 Hook
 */
export function useRenderPerformance(componentName: string, props?: any) {
  const startTimeRef = useRef<number>();
  const rerenderCountRef = useRef(0);
  
  // 渲染开始
  const renderStart = useCallback(() => {
    startTimeRef.current = performance.now();
    rerenderCountRef.current++;
  }, []);
  
  // 渲染结束
  const renderEnd = useCallback(() => {
    if (startTimeRef.current) {
      const renderTime = performance.now() - startTimeRef.current;
      
      // 记录性能指标
      const metric: PerformanceMetrics = {
        componentName,
        renderTime,
        memoryUsage: 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0,
        timestamp: Date.now(),
        props: props ? JSON.stringify(props).length : 0, // 记录props大小
        rerenderCount: rerenderCountRef.current
      };
      
      memoryMonitor.addMetric(metric);
      
      // 慢渲染警告
      if (renderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD_MS) {
        console.warn(`🐌 慢渲染检测: ${componentName} 耗时 ${renderTime.toFixed(2)}ms`, {
          rerenderCount: rerenderCountRef.current,
          propsSize: metric.props
        });
      }
    }
  }, [componentName, props]);
  
  useEffect(() => {
    renderStart();
    return renderEnd;
  });
  
  return { renderStart, renderEnd, rerenderCount: rerenderCountRef.current };
}

/**
 * 智能缓存 Hook
 */
export function useSmartCache<T>(
  key: string, 
  factory: () => T | Promise<T>, 
  deps: any[] = [],
  ttl: number = PERFORMANCE_CONFIG.CACHE_TTL
) {
  const cache = useRef(new Map<string, { data: T; timestamp: number; ttl: number }>());
  
  return useMemo(() => {
    const cacheKey = `${key}_${JSON.stringify(deps)}`;
    const cached = cache.current.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < cached.ttl)) {
      return cached.data;
    }
    
    const result = factory();
    
    // 清理过期缓存
    const now = Date.now();
    for (const [k, v] of cache.current.entries()) {
      if (now - v.timestamp > v.ttl) {
        cache.current.delete(k);
      }
    }
    
    // 限制缓存大小
    if (cache.current.size >= PERFORMANCE_CONFIG.MAX_CACHE_SIZE) {
      const oldestKey = cache.current.keys().next().value;
      cache.current.delete(oldestKey);
    }
    
    cache.current.set(cacheKey, { data: result, timestamp: now, ttl });
    return result;
  }, deps);
}

/**
 * 懒加载 Hook
 */
export function useLazyLoad(
  threshold: number = PERFORMANCE_CONFIG.INTERSECTION_THRESHOLD,
  rootMargin: string = PERFORMANCE_CONFIG.INTERSECTION_ROOT_MARGIN
) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element || isLoaded) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [threshold, rootMargin, isLoaded]);
  
  return { ref: elementRef, isVisible, isLoaded };
}

/**
 * 优化的防抖 Hook
 */
export function useOptimizedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = PERFORMANCE_CONFIG.DEBOUNCE_DELAY,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
) {
  const debouncedFn = useMemo(
    () => debounce(callback, delay, options),
    [callback, delay, options?.leading, options?.trailing, options?.maxWait]
  );
  
  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);
  
  return debouncedFn;
}

/**
 * 优化的节流 Hook
 */
export function useOptimizedThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = PERFORMANCE_CONFIG.THROTTLE_DELAY,
  options?: { leading?: boolean; trailing?: boolean }
) {
  const throttledFn = useMemo(
    () => throttle(callback, delay, options),
    [callback, delay, options?.leading, options?.trailing]
  );
  
  useEffect(() => {
    return () => {
      throttledFn.cancel();
    };
  }, [throttledFn]);
  
  return throttledFn;
}

/**
 * 虚拟滚动 Hook
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  const handleScroll = useOptimizedThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // 60fps
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
}

/**
 * 图片懒加载 Hook
 */
export function useImageLazyLoad(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ref, isVisible } = useLazyLoad();
  
  useEffect(() => {
    if (!isVisible || !src) return;
    
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setError(null);
    };
    
    img.onerror = () => {
      setIsLoading(false);
      setError('Failed to load image');
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isVisible]);
  
  return { ref, imageSrc, isLoading, error };
}

/**
 * 批量操作优化 Hook
 */
export function useBatchProcessor<T, R>(
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 50,
  delay: number = 100
) {
  const queueRef = useRef<T[]>([]);
  const processingRef = useRef(false);
  const callbacksRef = useRef<Array<(result: R) => void>>([]);
  
  const processQueue = useOptimizedDebounce(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    
    processingRef.current = true;
    const batch = queueRef.current.splice(0, batchSize);
    const callbacks = callbacksRef.current.splice(0, batch.length);
    
    try {
      const results = await processor(batch);
      callbacks.forEach((callback, index) => {
        callback(results[index]);
      });
    } catch (error) {
      console.error('批量处理失败:', error);
    } finally {
      processingRef.current = false;
      
      // 如果还有待处理的项目，继续处理
      if (queueRef.current.length > 0) {
        processQueue();
      }
    }
  }, delay);
  
  const addToQueue = useCallback((item: T): Promise<R> => {
    return new Promise((resolve) => {
      queueRef.current.push(item);
      callbacksRef.current.push(resolve);
      processQueue();
    });
  }, [processQueue]);
  
  return { addToQueue };
}

/**
 * 性能监控仪表板数据 Hook
 */
export function usePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  useEffect(() => {
    if (isMonitoring) {
      memoryMonitor.startMonitoring();
      
      const updateMetrics = () => {
        setMetrics(memoryMonitor.getMetrics());
      };
      
      const interval = setInterval(updateMetrics, 1000);
      updateMetrics();
      
      return () => {
        clearInterval(interval);
        memoryMonitor.stopMonitoring();
      };
    }
  }, [isMonitoring]);
  
  const startMonitoring = useCallback(() => setIsMonitoring(true), []);
  const stopMonitoring = useCallback(() => setIsMonitoring(false), []);
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    memoryMonitor.getMetrics().length = 0;
  }, []);
  
  // 计算统计数据
  const stats = useMemo(() => {
    if (metrics.length === 0) return null;
    
    const renderTimes = metrics.map(m => m.renderTime);
    const memoryUsages = metrics.map(m => m.memoryUsage);
    
    return {
      totalComponents: metrics.length,
      avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      currentMemory: memoryUsages[memoryUsages.length - 1] / 1024 / 1024, // MB
      peakMemory: Math.max(...memoryUsages) / 1024 / 1024, // MB
      slowRenders: metrics.filter(m => m.renderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD_MS).length
    };
  }, [metrics]);
  
  return {
    metrics,
    stats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics
  };
}

/**
 * 错误边界性能监控
 */
export function trackErrorBoundary(error: Error, errorInfo: any, componentName: string) {
  const metric: PerformanceMetrics = {
    componentName: `ErrorBoundary:${componentName}`,
    renderTime: 0,
    memoryUsage: 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0,
    timestamp: Date.now(),
    props: {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    }
  };
  
  memoryMonitor.addMetric(metric);
  
  console.error('🚨 组件错误追踪:', {
    component: componentName,
    error: error.message,
    memory: `${(metric.memoryUsage / 1024 / 1024).toFixed(2)}MB`
  });
}

/**
 * 初始化性能优化系统
 */
export function initializePerformanceOptimizer() {
  // 启动内存监控
  memoryMonitor.startMonitoring();
  
  // 监听内存压力事件
  window.addEventListener('memory-pressure', (event: any) => {
    console.warn('🚨 内存压力警告:', event.detail);
  });
  
  // 监听页面卸载，清理资源
  window.addEventListener('beforeunload', () => {
    memoryMonitor.stopMonitoring();
  });
  
  console.log('🚀 性能优化系统已启动');
}