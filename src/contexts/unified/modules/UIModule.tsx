/**
 * 🎨 UI模块 - UnifiedAppContext
 * 管理应用的UI状态、主题、通知等界面相关功能
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  UIModuleState,
  UIModuleActions,
  NotificationState,
  LoadingState,
} from "../types";

// ==================== 状态和Action类型 ====================

interface UIModuleContextType extends UIModuleState, UIModuleActions {}

type UIAction =
  | { type: "SET_THEME"; payload: UIModuleState["theme"] }
  | { type: "SET_SIDEBAR_COLLAPSED"; payload: boolean }
  | { type: "SET_COMPACT_MODE"; payload: boolean }
  | { type: "SET_IS_MOBILE"; payload: boolean }
  | { type: "SET_VIEWPORT"; payload: { width: number; height: number } }
  | { type: "ADD_NOTIFICATION"; payload: NotificationState }
  | { type: "REMOVE_NOTIFICATION"; payload: string }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SET_GLOBAL_LOADING"; payload: Partial<LoadingState> }
  | { type: "CLEAR_GLOBAL_LOADING" }
  | { type: "SET_PERFORMANCE_MODE"; payload: UIModuleState["performanceMode"] }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "RESET_STATE" };

// ==================== 初始状态 ====================

const getInitialTheme = (): UIModuleState["theme"] => {
  if (typeof window === "undefined") return "system";

  const stored = localStorage.getItem("app-theme");
  if (stored && ["light", "dark", "system"].includes(stored)) {
    return stored as UIModuleState["theme"];
  }

  return "system";
};

const getInitialViewport = () => {
  if (typeof window === "undefined") {
    return { width: 1024, height: 768 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const initialState: UIModuleState = {
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  compactMode: false,
  isMobile: false,
  viewport: getInitialViewport(),
  notifications: [],
  globalLoading: {
    isLoading: false,
    operation: undefined,
    progress: 0,
    message: undefined,
  },
  performanceMode: "balanced",
};

// ==================== Reducer ====================

function uiReducer(state: UIModuleState, action: UIAction): UIModuleState {
  switch (action.type) {
    case "SET_THEME":
      return { ...state, theme: action.payload };

    case "SET_SIDEBAR_COLLAPSED":
      return { ...state, sidebarCollapsed: action.payload };

    case "SET_COMPACT_MODE":
      return { ...state, compactMode: action.payload };

    case "SET_IS_MOBILE":
      return { ...state, isMobile: action.payload };

    case "SET_VIEWPORT":
      return { ...state, viewport: action.payload };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 10), // 限制最多10个通知
      };

    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload
        ),
      };

    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] };

    case "SET_GLOBAL_LOADING":
      return {
        ...state,
        globalLoading: { ...state.globalLoading, ...action.payload },
      };

    case "CLEAR_GLOBAL_LOADING":
      return {
        ...state,
        globalLoading: {
          isLoading: false,
          operation: undefined,
          progress: 0,
          message: undefined,
        },
      };

    case "SET_PERFORMANCE_MODE":
      return { ...state, performanceMode: action.payload };

    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case "RESET_STATE":
      return { ...initialState };

    default:
      return state;
  }
}

// ==================== Context ====================

const UIModuleContext = createContext<UIModuleContextType | undefined>(
  undefined
);

// ==================== Provider ====================

export const UIModuleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // ==================== 响应式检测 ====================

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      dispatch({ type: "SET_VIEWPORT", payload: { width, height } });
      dispatch({ type: "SET_IS_MOBILE", payload: width < 768 });
    };

    // 初始化
    updateViewport();

    // 监听窗口大小变化
    const handleResize = () => {
      updateViewport();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ==================== 主题管理 ====================

  const setTheme = useCallback((theme: UIModuleState["theme"]) => {
    dispatch({ type: "SET_THEME", payload: theme });

    if (typeof window !== "undefined") {
      localStorage.setItem("app-theme", theme);

      // 应用主题到DOM
      const root = document.documentElement;
      root.classList.remove("light", "dark");

      if (theme === "system") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        root.classList.add(prefersDark ? "dark" : "light");
      } else {
        root.classList.add(theme);
      }
    }
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === "undefined" || state.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    handleChange(); // 初始应用
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [state.theme]);

  // ==================== Actions ====================

  const toggleSidebar = useCallback(() => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  }, []);

  const setCompactMode = useCallback((compact: boolean) => {
    dispatch({ type: "SET_COMPACT_MODE", payload: compact });
  }, []);

  const addNotification = useCallback(
    (notification: Omit<NotificationState, "id" | "timestamp">) => {
      const fullNotification: NotificationState = {
        ...notification,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      dispatch({ type: "ADD_NOTIFICATION", payload: fullNotification });

      // 自动移除非持久通知
      if (!notification.persistent) {
        const timeout = notification.type === "error" ? 8000 : 5000;
        setTimeout(() => {
          dispatch({
            type: "REMOVE_NOTIFICATION",
            payload: fullNotification.id,
          });
        }, timeout);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: "REMOVE_NOTIFICATION", payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: "CLEAR_NOTIFICATIONS" });
  }, []);

  const setGlobalLoading = useCallback((loading: Partial<LoadingState>) => {
    dispatch({ type: "SET_GLOBAL_LOADING", payload: loading });
  }, []);

  const clearGlobalLoading = useCallback(() => {
    dispatch({ type: "CLEAR_GLOBAL_LOADING" });
  }, []);

  const setPerformanceMode = useCallback(
    (mode: UIModuleState["performanceMode"]) => {
      dispatch({ type: "SET_PERFORMANCE_MODE", payload: mode });

      if (typeof window !== "undefined") {
        localStorage.setItem("app-performance-mode", mode);

        // 应用性能模式到DOM
        const root = document.documentElement;
        root.classList.remove(
          "performance-high",
          "performance-balanced",
          "performance-low"
        );
        root.classList.add(`performance-${mode}`);
      }
    },
    []
  );

  // ==================== 计算属性 ====================

  const actualTheme = useMemo(() => {
    if (state.theme === "system") {
      if (typeof window === "undefined") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return state.theme;
  }, [state.theme]);

  // ==================== 初始化 ====================

  useEffect(() => {
    // 初始化主题
    setTheme(state.theme);

    // 初始化性能模式
    const storedPerformanceMode = localStorage.getItem("app-performance-mode");
    if (
      storedPerformanceMode &&
      ["high", "balanced", "low"].includes(storedPerformanceMode)
    ) {
      setPerformanceMode(
        storedPerformanceMode as UIModuleState["performanceMode"]
      );
    }
  }, [setTheme, setPerformanceMode, state.theme]);

  // ==================== Context Value ====================

  const contextValue: UIModuleContextType = {
    // State
    theme: state.theme,
    sidebarCollapsed: state.sidebarCollapsed,
    compactMode: state.compactMode,
    isMobile: state.isMobile,
    viewport: state.viewport,
    notifications: state.notifications,
    globalLoading: state.globalLoading,
    performanceMode: state.performanceMode,

    // Actions
    setTheme,
    toggleSidebar,
    setCompactMode,
    addNotification,
    removeNotification,
    clearNotifications,
    setGlobalLoading,
    clearGlobalLoading,
    setPerformanceMode,
  };

  return (
    <UIModuleContext.Provider value={contextValue}>
      {children}
    </UIModuleContext.Provider>
  );
};

// ==================== Hook ====================

export const useUIModule = (): UIModuleContextType => {
  const context = useContext(UIModuleContext);
  if (!context) {
    throw new Error("useUIModule must be used within UIModuleProvider");
  }
  return context;
};

// ==================== 便捷Hooks ====================

export const useTheme = () => {
  const { theme, setTheme } = useUIModule();

  const actualTheme = useMemo(() => {
    if (theme === "system") {
      if (typeof window === "undefined") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  }, [theme]);

  return {
    theme,
    actualTheme,
    setTheme,
    isDark: actualTheme === "dark",
    isLight: actualTheme === "light",
  };
};

export const useNotifications = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useUIModule();

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    hasNotifications: notifications.length > 0,
    unreadCount: notifications.length,
  };
};

export const useGlobalLoading = () => {
  const { globalLoading, setGlobalLoading, clearGlobalLoading } = useUIModule();

  const withGlobalLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options: Partial<LoadingState> = {}
    ): Promise<T> => {
      setGlobalLoading({
        isLoading: true,
        message: "处理中...",
        progress: 0,
        ...options,
      });

      try {
        const result = await asyncFn();
        return result;
      } finally {
        clearGlobalLoading();
      }
    },
    [setGlobalLoading, clearGlobalLoading]
  );

  return {
    ...globalLoading,
    setGlobalLoading,
    clearGlobalLoading,
    withGlobalLoading,
  };
};

export const useResponsive = () => {
  const { isMobile, viewport } = useUIModule();

  return {
    isMobile,
    isTablet: viewport.width >= 768 && viewport.width < 1024,
    isDesktop: viewport.width >= 1024,
    viewport,
    breakpoint: isMobile
      ? "mobile"
      : viewport.width < 1024
        ? "tablet"
        : "desktop",
  };
};
