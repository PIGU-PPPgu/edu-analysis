/**
 * 📱 视口检测和响应式状态管理 Hook
 * 提供设备类型、屏幕方向、安全区域等移动端检测功能
 */

import { useState, useEffect, useCallback } from "react";

// 设备类型
export type DeviceType = "mobile" | "tablet" | "desktop";

// 屏幕方向
export type ScreenOrientation = "portrait" | "landscape";

// 视口信息接口
export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: ScreenOrientation;
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  aspectRatio: number;
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// 断点配置
export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

// 默认断点
const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
};

/**
 * 获取设备类型
 */
const getDeviceType = (
  width: number,
  breakpoints: BreakpointConfig
): DeviceType => {
  if (width < breakpoints.mobile) return "mobile";
  if (width < breakpoints.tablet) return "tablet";
  return "desktop";
};

/**
 * 获取屏幕方向
 */
const getOrientation = (width: number, height: number): ScreenOrientation => {
  return width > height ? "landscape" : "portrait";
};

/**
 * 检测是否为触摸设备
 */
const checkTouchSupport = (): boolean => {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * 获取安全区域信息
 */
const getSafeArea = () => {
  // 检测CSS env变量支持
  const supportsEnv = CSS.supports("padding: env(safe-area-inset-top)");

  if (supportsEnv) {
    const getEnvValue = (side: string): number => {
      const testEl = document.createElement("div");
      testEl.style.padding = `env(safe-area-inset-${side})`;
      document.body.appendChild(testEl);
      const computed = window.getComputedStyle(testEl);
      const value = parseInt(computed.paddingTop) || 0;
      document.body.removeChild(testEl);
      return value;
    };

    return {
      top: getEnvValue("top"),
      right: getEnvValue("right"),
      bottom: getEnvValue("bottom"),
      left: getEnvValue("left"),
    };
  }

  // 回退到默认值
  return { top: 0, right: 0, bottom: 0, left: 0 };
};

/**
 * 主要的视口检测 Hook
 */
export const useViewport = (
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): ViewportInfo => {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => {
    // 服务端渲染兼容性处理
    if (typeof window === "undefined") {
      return {
        width: 1200,
        height: 800,
        deviceType: "desktop",
        orientation: "landscape",
        isTouch: false,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        aspectRatio: 1.5,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width, breakpoints);
    const orientation = getOrientation(width, height);
    const isTouch = checkTouchSupport();

    return {
      width,
      height,
      deviceType,
      orientation,
      isTouch,
      isMobile: deviceType === "mobile",
      isTablet: deviceType === "tablet",
      isDesktop: deviceType === "desktop",
      aspectRatio: width / height,
      safeArea: getSafeArea(),
    };
  });

  const updateViewport = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width, breakpoints);
    const orientation = getOrientation(width, height);
    const isTouch = checkTouchSupport();

    setViewportInfo({
      width,
      height,
      deviceType,
      orientation,
      isTouch,
      isMobile: deviceType === "mobile",
      isTablet: deviceType === "tablet",
      isDesktop: deviceType === "desktop",
      aspectRatio: width / height,
      safeArea: getSafeArea(),
    });
  }, [breakpoints]);

  useEffect(() => {
    updateViewport();

    // 监听窗口大小变化
    window.addEventListener("resize", updateViewport);

    // 监听屏幕方向变化
    if ("orientation" in screen) {
      screen.orientation?.addEventListener("change", updateViewport);
    } else if ("orientationchange" in window) {
      window.addEventListener("orientationchange", updateViewport);
    }

    return () => {
      window.removeEventListener("resize", updateViewport);
      if ("orientation" in screen) {
        screen.orientation?.removeEventListener("change", updateViewport);
      } else if ("orientationchange" in window) {
        window.removeEventListener("orientationchange", updateViewport);
      }
    };
  }, [updateViewport]);

  return viewportInfo;
};

/**
 * 断点检测 Hook
 */
export const useBreakpoint = (
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
) => {
  const { width, deviceType } = useViewport(breakpoints);

  return {
    width,
    deviceType,
    isAbove: (breakpoint: keyof BreakpointConfig) =>
      width >= breakpoints[breakpoint],
    isBelow: (breakpoint: keyof BreakpointConfig) =>
      width < breakpoints[breakpoint],
    isBetween: (min: keyof BreakpointConfig, max: keyof BreakpointConfig) =>
      width >= breakpoints[min] && width < breakpoints[max],
    isExactly: (breakpoint: keyof BreakpointConfig) =>
      deviceType === breakpoint,
  };
};

/**
 * 屏幕方向检测 Hook
 */
export const useOrientation = () => {
  const { orientation, width, height } = useViewport();

  const [orientationSupport, setOrientationSupport] = useState({
    hasAPI: false,
    hasEvent: false,
    angle: 0,
  });

  useEffect(() => {
    const checkOrientationAPI = () => {
      const hasAPI = "orientation" in screen;
      const hasEvent = "orientationchange" in window;
      const angle = hasAPI ? screen.orientation?.angle || 0 : 0;

      setOrientationSupport({
        hasAPI,
        hasEvent,
        angle,
      });
    };

    checkOrientationAPI();

    const handleOrientationChange = () => {
      checkOrientationAPI();
    };

    if (orientationSupport.hasEvent) {
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    return () => {
      if (orientationSupport.hasEvent) {
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange
        );
      }
    };
  }, [orientationSupport.hasEvent]);

  return {
    orientation,
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    angle: orientationSupport.angle,
    hasOrientationAPI: orientationSupport.hasAPI,
    dimensions: { width, height },
  };
};

/**
 * 安全区域 Hook
 */
export const useSafeArea = () => {
  const { safeArea } = useViewport();

  return {
    safeArea,
    safeAreaStyle: {
      paddingTop: safeArea.top,
      paddingRight: safeArea.right,
      paddingBottom: safeArea.bottom,
      paddingLeft: safeArea.left,
    },
    safeAreaInsets: `${safeArea.top}px ${safeArea.right}px ${safeArea.bottom}px ${safeArea.left}px`,
    hasSafeArea:
      safeArea.top > 0 ||
      safeArea.right > 0 ||
      safeArea.bottom > 0 ||
      safeArea.left > 0,
  };
};

/**
 * 媒体查询 Hook
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    setMatches(mediaQuery.matches);

    // 现代浏览器使用 addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // 旧浏览器使用 addListener
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
};

/**
 * 设备性能检测 Hook
 */
export const useDevicePerformance = () => {
  const [performance, setPerformance] = useState({
    level: "medium" as "low" | "medium" | "high",
    cores: 1,
    memory: 4,
    connection: "unknown" as string,
    supportedFeatures: {
      webgl: false,
      webgl2: false,
      webworkers: false,
      canvas: false,
    },
  });

  useEffect(() => {
    const detectPerformance = () => {
      // CPU 核心数
      const cores = navigator.hardwareConcurrency || 1;

      // 内存信息 (如果可用)
      // @ts-ignore
      const memory = navigator.deviceMemory || 4;

      // 网络连接信息
      // @ts-ignore
      const connection = navigator.connection?.effectiveType || "unknown";

      // 功能支持检测
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl");
      const gl2 = canvas.getContext("webgl2");

      const supportedFeatures = {
        webgl: !!gl,
        webgl2: !!gl2,
        webworkers: typeof Worker !== "undefined",
        canvas: !!canvas.getContext("2d"),
      };

      // 性能等级评估
      let level: "low" | "medium" | "high" = "medium";
      if (cores >= 4 && memory >= 8 && supportedFeatures.webgl2) {
        level = "high";
      } else if (cores <= 2 || memory <= 2) {
        level = "low";
      }

      setPerformance({
        level,
        cores,
        memory,
        connection,
        supportedFeatures,
      });
    };

    detectPerformance();
  }, []);

  return performance;
};

/**
 * 预设的响应式断点常量
 */
export const RESPONSIVE_BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * 常用媒体查询字符串
 */
export const MEDIA_QUERIES = {
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
  landscape: "(orientation: landscape)",
  portrait: "(orientation: portrait)",
  touch: "(pointer: coarse)",
  hover: "(hover: hover)",
  darkMode: "(prefers-color-scheme: dark)",
  lightMode: "(prefers-color-scheme: light)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
  highDPI: "(min-resolution: 192dpi)",
} as const;
