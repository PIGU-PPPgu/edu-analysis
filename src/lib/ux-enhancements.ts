// UX Enhancement Configuration
// 统一管理系统的用户体验优化设置

import { ReactNode } from "react";

// UX配置选项
export interface UXConfig {
  // 加载状态配置
  loading: {
    showProgressBar: boolean;
    minLoadingTime: number; // 最小加载时间，避免闪烁
    timeoutWarning: number; // 超时警告时间
    skeletonAnimationDuration: number;
  };

  // 错误处理配置
  errorHandling: {
    showErrorBoundary: boolean;
    enableErrorReporting: boolean;
    retryAttempts: number;
    showDetailedErrors: boolean; // 开发环境显示详细错误
  };

  // 响应式设计配置
  responsive: {
    mobileBreakpoint: number;
    tabletBreakpoint: number;
    enableMobileOptimizations: boolean;
    autoCollapseOnMobile: boolean;
  };

  // 表单优化配置
  forms: {
    enableRealTimeValidation: boolean;
    enableAutoSave: boolean;
    autoSaveInterval: number; // 自动保存间隔（毫秒）
    showFieldStrength: boolean;
  };

  // 动画配置
  animations: {
    enableTransitions: boolean;
    transitionDuration: number;
    enableReducedMotion: boolean; // 支持用户偏好设置
  };

  // 无障碍访问配置
  accessibility: {
    enableFocusVisible: boolean;
    enableScreenReaderOptimizations: boolean;
    highContrastMode: boolean;
  };
}

// 默认UX配置
export const defaultUXConfig: UXConfig = {
  loading: {
    showProgressBar: true,
    minLoadingTime: 300, // 300ms最小加载时间
    timeoutWarning: 10000, // 10秒超时警告
    skeletonAnimationDuration: 1500,
  },

  errorHandling: {
    showErrorBoundary: true,
    enableErrorReporting: process.env.NODE_ENV === "production",
    retryAttempts: 3,
    showDetailedErrors: process.env.NODE_ENV === "development",
  },

  responsive: {
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024,
    enableMobileOptimizations: true,
    autoCollapseOnMobile: true,
  },

  forms: {
    enableRealTimeValidation: true,
    enableAutoSave: true,
    autoSaveInterval: 30000, // 30秒自动保存
    showFieldStrength: true,
  },

  animations: {
    enableTransitions: true,
    transitionDuration: 200,
    enableReducedMotion: true,
  },

  accessibility: {
    enableFocusVisible: true,
    enableScreenReaderOptimizations: true,
    highContrastMode: false,
  },
};

// UX优化工具函数
export const uxUtils = {
  // 检测用户偏好
  getUserPreferences: () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)"
    ).matches;
    const isTouchDevice = "ontouchstart" in window;

    return {
      prefersReducedMotion,
      prefersHighContrast,
      isTouchDevice,
    };
  },

  // 设备检测
  getDeviceInfo: () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < defaultUXConfig.responsive.mobileBreakpoint;
    const isTablet =
      width >= defaultUXConfig.responsive.mobileBreakpoint &&
      width < defaultUXConfig.responsive.tabletBreakpoint;
    const isDesktop = width >= defaultUXConfig.responsive.tabletBreakpoint;

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      aspectRatio: width / height,
    };
  },

  // 延迟执行（防止加载闪烁）
  delayedExecution: async (
    fn: () => void,
    minDelay: number = defaultUXConfig.loading.minLoadingTime
  ) => {
    const start = Date.now();
    const result = await fn();
    const elapsed = Date.now() - start;

    if (elapsed < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
    }

    return result;
  },

  // 防抖函数
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // 节流函数
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

// 性能监控工具
export const performanceMonitor = {
  // 页面加载性能监控
  measurePageLoad: () => {
    if (typeof window !== "undefined" && "performance" in window) {
      const perfData = window.performance;
      const loadTime =
        perfData.timing.loadEventEnd - perfData.timing.navigationStart;
      const domContentLoaded =
        perfData.timing.domContentLoadedEventEnd -
        perfData.timing.navigationStart;

      return {
        totalLoadTime: loadTime,
        domContentLoadedTime: domContentLoaded,
        timeToFirstByte:
          perfData.timing.responseStart - perfData.timing.navigationStart,
        resourceLoadTime:
          perfData.timing.loadEventEnd -
          perfData.timing.domContentLoadedEventEnd,
      };
    }
    return null;
  },

  // 组件渲染性能监控
  measureRender: (componentName: string, renderFn: () => ReactNode) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();

    if (process.env.NODE_ENV === "development") {
      console.log(`${componentName} 渲染耗时: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  },

  // 内存使用监控
  getMemoryUsage: () => {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  },
};

// UX错误类型定义
export class UXError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "UXError";
  }
}

// 常见UX错误代码
export const UX_ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PERMISSION_ERROR: "PERMISSION_ERROR",
  CHUNK_LOAD_ERROR: "CHUNK_LOAD_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

// UX状态管理器
export class UXStateManager {
  private static instance: UXStateManager;
  private config: UXConfig;
  private listeners: Map<string, Function[]> = new Map();

  private constructor(config: UXConfig = defaultUXConfig) {
    this.config = { ...config };
  }

  static getInstance(config?: UXConfig): UXStateManager {
    if (!UXStateManager.instance) {
      UXStateManager.instance = new UXStateManager(config);
    }
    return UXStateManager.instance;
  }

  updateConfig(newConfig: Partial<UXConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.notifyListeners("configUpdate", this.config);
  }

  getConfig(): UXConfig {
    return { ...this.config };
  }

  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }
}

// 导出默认实例
export const uxManager = UXStateManager.getInstance();
