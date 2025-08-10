/**
 * 🚀 UnifiedAppContext - 统一应用状态管理
 * 现代化的Context架构，整合所有应用状态
 *
 * 特性:
 * - 模块化设计，每个功能独立管理
 * - 性能优化，减少不必要的重渲染
 * - 向后兼容，支持渐进迁移
 * - TypeScript完整支持
 * - 错误边界和恢复机制
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from "react";
import {
  UnifiedAppContextType,
  UnifiedAppState,
  UnifiedAppActions,
  UnifiedAppConfig,
} from "./types";

// 模块Provider导入
import { AuthModuleProvider, useAuthModule } from "./modules/AuthModule";
import { GradeModuleProvider, useGradeModule } from "./modules/GradeModule";
import { FilterModuleProvider, useFilterModule } from "./modules/FilterModule";
import { UIModuleProvider, useUIModule } from "./modules/UIModule";

// ==================== 默认配置 ====================

const defaultConfig: UnifiedAppConfig = {
  modules: {
    auth: { enabled: true, lazy: false, initializationOrder: 1 },
    grade: {
      enabled: true,
      lazy: false,
      initializationOrder: 3,
      dependencies: ["auth"],
    },
    filter: { enabled: true, lazy: false, initializationOrder: 2 },
    ui: { enabled: true, lazy: false, initializationOrder: 0 },
  },
  enableDevTools: import.meta.env.DEV,
  performanceLogging: import.meta.env.DEV,
  errorBoundary: true,
  persistState: true,
  legacyContextSupport: true,
  migrationMode: true,
};

// ==================== Context ====================

const UnifiedAppContext = createContext<UnifiedAppContextType | undefined>(
  undefined
);

// ==================== 内部组件：状态聚合器 ====================

const StateAggregator: React.FC<{
  children: React.ReactNode;
  config: UnifiedAppConfig;
}> = ({ children, config }) => {
  const [initialized, setInitialized] = useState(false);
  const [version] = useState("1.0.0");
  const [buildTime] = useState(new Date().toISOString());

  // 获取各模块状态和操作
  const authModule = useAuthModule();
  const gradeModule = useGradeModule();
  const filterModule = useFilterModule();
  const uiModule = useUIModule();

  // ==================== 统一状态 ====================

  const state: UnifiedAppState = useMemo(
    () => ({
      auth: {
        user: authModule.user,
        session: authModule.session,
        userRole: authModule.userRole,
        isAuthReady: authModule.isAuthReady,
        loading: authModule.loading,
        error: authModule.error,
      },
      grade: {
        allGradeData: gradeModule.allGradeData,
        wideGradeData: gradeModule.wideGradeData,
        filteredGradeData: gradeModule.filteredGradeData,
        examList: gradeModule.examList,
        statistics: gradeModule.statistics,
        filter: gradeModule.filter,
        loading: gradeModule.loading,
        error: gradeModule.error,
        lastUpdated: gradeModule.lastUpdated,
        availableSubjects: gradeModule.availableSubjects,
        availableClasses: gradeModule.availableClasses,
        availableGrades: gradeModule.availableGrades,
        availableExamTypes: gradeModule.availableExamTypes,
      },
      filter: {
        mode: filterModule.mode,
        selectedClasses: filterModule.selectedClasses,
        selectedSubjects: filterModule.selectedSubjects,
        selectedExam: filterModule.selectedExam,
        searchTerm: filterModule.searchTerm,
        dateRange: filterModule.dateRange,
        isFiltered: filterModule.isFiltered,
      },
      ui: {
        theme: uiModule.theme,
        sidebarCollapsed: uiModule.sidebarCollapsed,
        compactMode: uiModule.compactMode,
        isMobile: uiModule.isMobile,
        viewport: uiModule.viewport,
        notifications: uiModule.notifications,
        globalLoading: uiModule.globalLoading,
        performanceMode: uiModule.performanceMode,
      },
      initialized,
      version,
      buildTime,
    }),
    [
      // 只依赖具体的状态值，而不是整个模块对象
      authModule.user,
      authModule.session,
      authModule.userRole,
      authModule.isAuthReady,
      authModule.loading,
      authModule.error,
      gradeModule.allGradeData,
      gradeModule.wideGradeData,
      gradeModule.filteredGradeData,
      gradeModule.examList,
      gradeModule.statistics,
      gradeModule.filter,
      gradeModule.loading,
      gradeModule.error,
      gradeModule.lastUpdated,
      gradeModule.availableSubjects,
      gradeModule.availableClasses,
      gradeModule.availableGrades,
      gradeModule.availableExamTypes,
      filterModule.mode,
      filterModule.selectedClasses,
      filterModule.selectedSubjects,
      filterModule.selectedExam,
      filterModule.searchTerm,
      filterModule.dateRange,
      filterModule.isFiltered,
      uiModule.theme,
      uiModule.sidebarCollapsed,
      uiModule.compactMode,
      uiModule.isMobile,
      uiModule.viewport,
      uiModule.notifications,
      uiModule.globalLoading,
      uiModule.performanceMode,
      initialized,
      version,
      buildTime,
    ]
  );

  // ==================== 稳定化工具函数 ====================

  // 稳定化重置函数
  const resetApp = useCallback(() => {
    setInitialized(false);
    // 这里可以添加重置各模块状态的逻辑
    console.log("🔄 重置应用状态");
  }, []);

  // 稳定化模块状态获取函数
  const getModuleState = useCallback(
    (module: keyof UnifiedAppState) => {
      return state[module];
    },
    [state]
  );

  // 使用useCallback稳定化初始化函数，避免循环依赖
  const initializeApp = useCallback(async () => {
    if (initialized) return; // 防止重复初始化

    try {
      uiModule.setGlobalLoading({
        isLoading: true,
        operation: "initialize",
        message: "初始化应用...",
        progress: 0,
      });

      // 等待认证就绪
      if (!authModule.isAuthReady) {
        uiModule.setGlobalLoading({
          progress: 30,
          message: "等待认证就绪...",
        });
        // 这里可以添加等待逻辑
      }

      uiModule.setGlobalLoading({ progress: 60, message: "加载数据..." });

      // 如果用户已登录，预加载成绩数据
      if (authModule.user) {
        await gradeModule.loadAllData();
      }

      uiModule.setGlobalLoading({ progress: 100, message: "初始化完成" });
      setInitialized(true);

      if (config.enableDevTools) {
        console.log("🚀 UnifiedAppContext 初始化成功", {
          version,
          buildTime,
          enabledModules: Object.entries(config.modules)
            .filter(([, cfg]) => cfg.enabled)
            .map(([name]) => name),
        });
      }
    } catch (error) {
      console.error("❌ UnifiedAppContext 初始化失败:", error);
      uiModule.addNotification({
        type: "error",
        title: "初始化失败",
        message: "应用初始化时发生错误，请刷新页面重试",
        persistent: true,
      });
    } finally {
      uiModule.clearGlobalLoading();
    }
  }, [
    initialized,
    authModule.isAuthReady,
    authModule.user,
    gradeModule.loadAllData,
    uiModule.setGlobalLoading,
    uiModule.addNotification,
    uiModule.clearGlobalLoading,
    config.enableDevTools,
    config.modules,
    version,
    buildTime,
  ]);

  // ==================== 统一操作 ====================

  const actions: UnifiedAppActions = useMemo(
    () => ({
      auth: {
        signIn: authModule.signIn,
        signUp: authModule.signUp,
        signOut: authModule.signOut,
        refreshAuth: authModule.refreshAuth,
        clearError: authModule.clearError,
      },
      grade: {
        loadAllData: gradeModule.loadAllData,
        loadExamData: gradeModule.loadExamData,
        refreshData: gradeModule.refreshData,
        setFilter: gradeModule.setFilter,
        updateFilter: gradeModule.updateFilter,
        clearFilter: gradeModule.clearFilter,
        getStudentGrades: gradeModule.getStudentGrades,
        getSubjectGrades: gradeModule.getSubjectGrades,
        getClassGrades: gradeModule.getClassGrades,
        clearError: gradeModule.clearError,
        retry: gradeModule.retry,
      },
      filter: {
        updateFilter: filterModule.updateFilter,
        resetFilter: filterModule.resetFilter,
        setMode: filterModule.setMode,
        addClassFilter: filterModule.addClassFilter,
        removeClassFilter: filterModule.removeClassFilter,
        toggleSubjectFilter: filterModule.toggleSubjectFilter,
      },
      ui: {
        setTheme: uiModule.setTheme,
        toggleSidebar: uiModule.toggleSidebar,
        setCompactMode: uiModule.setCompactMode,
        addNotification: uiModule.addNotification,
        removeNotification: uiModule.removeNotification,
        clearNotifications: uiModule.clearNotifications,
        setGlobalLoading: uiModule.setGlobalLoading,
        clearGlobalLoading: uiModule.clearGlobalLoading,
        setPerformanceMode: uiModule.setPerformanceMode,
      },
      // 全局操作 - 使用已稳定化的函数
      initialize: initializeApp,
      reset: resetApp,
      getModuleState,
    }),
    [
      // 只依赖模块的方法，而不是整个模块对象
      authModule.signIn,
      authModule.signUp,
      authModule.signOut,
      authModule.refreshAuth,
      authModule.clearError,
      gradeModule.loadAllData,
      gradeModule.loadExamData,
      gradeModule.refreshData,
      gradeModule.setFilter,
      gradeModule.updateFilter,
      gradeModule.clearFilter,
      gradeModule.getStudentGrades,
      gradeModule.getSubjectGrades,
      gradeModule.getClassGrades,
      gradeModule.clearError,
      gradeModule.retry,
      filterModule.updateFilter,
      filterModule.resetFilter,
      filterModule.setMode,
      filterModule.addClassFilter,
      filterModule.removeClassFilter,
      filterModule.toggleSubjectFilter,
      uiModule.setTheme,
      uiModule.toggleSidebar,
      uiModule.setCompactMode,
      uiModule.addNotification,
      uiModule.removeNotification,
      uiModule.clearNotifications,
      uiModule.setGlobalLoading,
      uiModule.clearGlobalLoading,
      uiModule.setPerformanceMode,
      initializeApp,
      resetApp,
      getModuleState,
    ]
  );

  // ==================== 便捷访问器 ====================

  const auth = useMemo(
    () => ({
      ...state.auth,
      ...actions.auth,
    }),
    [state.auth, actions.auth]
  );

  const grade = useMemo(
    () => ({
      ...state.grade,
      ...actions.grade,
    }),
    [state.grade, actions.grade]
  );

  const filter = useMemo(
    () => ({
      ...state.filter,
      ...actions.filter,
    }),
    [state.filter, actions.filter]
  );

  const ui = useMemo(
    () => ({
      ...state.ui,
      ...actions.ui,
    }),
    [state.ui, actions.ui]
  );

  // ==================== 开发工具 ====================

  const debug = useMemo(
    () => ({
      logState: () => {
        console.group("🔍 UnifiedAppContext State");
        console.log("Auth:", state.auth);
        console.log("Grade:", state.grade);
        console.log("Filter:", state.filter);
        console.log("UI:", state.ui);
        console.log("Meta:", { initialized, version, buildTime });
        console.groupEnd();
      },
      exportState: () => {
        return JSON.stringify(
          {
            timestamp: Date.now(),
            version,
            state: {
              auth: {
                userRole: state.auth.userRole,
                isAuthReady: state.auth.isAuthReady,
              },
              grade: {
                filter: state.grade.filter,
                lastUpdated: state.grade.lastUpdated,
                availableSubjects: state.grade.availableSubjects,
                availableClasses: state.grade.availableClasses,
              },
              filter: state.filter,
              ui: {
                theme: state.ui.theme,
                sidebarCollapsed: state.ui.sidebarCollapsed,
                compactMode: state.ui.compactMode,
                performanceMode: state.ui.performanceMode,
              },
            },
          },
          null,
          2
        );
      },
      importState: (stateJson: string) => {
        try {
          const importedData = JSON.parse(stateJson);
          console.log("📥 导入状态:", importedData);
          // 这里可以实现状态导入逻辑
        } catch (error) {
          console.error("❌ 导入状态失败:", error);
        }
      },
    }),
    [state, initialized, version, buildTime]
  );

  // ==================== 初始化 ====================

  useEffect(() => {
    if (!initialized && authModule.isAuthReady) {
      initializeApp();
    }
  }, [initialized, authModule.isAuthReady, initializeApp]);

  // ==================== Context Value ====================

  const contextValue: UnifiedAppContextType = useMemo(
    () => ({
      state,
      actions,
      auth,
      grade,
      filter,
      ui,
      debug: config.enableDevTools
        ? debug
        : {
            logState: () => {},
            exportState: () => "Debug disabled",
            importState: () => {},
          },
    }),
    [state, actions, auth, grade, filter, ui, debug, config.enableDevTools]
  );

  return (
    <UnifiedAppContext.Provider value={contextValue}>
      {children}
    </UnifiedAppContext.Provider>
  );
};

// ==================== Provider ====================

export const UnifiedAppProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<UnifiedAppConfig>;
}> = ({ children, config: userConfig = {} }) => {
  const config = useMemo(
    () => ({
      ...defaultConfig,
      ...userConfig,
      modules: {
        ...defaultConfig.modules,
        ...userConfig.modules,
      },
    }),
    [userConfig]
  );

  return (
    <UIModuleProvider>
      <AuthModuleProvider>
        <FilterModuleProvider>
          <GradeModuleProvider>
            <StateAggregator config={config}>{children}</StateAggregator>
          </GradeModuleProvider>
        </FilterModuleProvider>
      </AuthModuleProvider>
    </UIModuleProvider>
  );
};

// ==================== Hook ====================

export const useUnifiedApp = (): UnifiedAppContextType => {
  const context = useContext(UnifiedAppContext);
  if (!context) {
    throw new Error("useUnifiedApp must be used within UnifiedAppProvider");
  }
  return context;
};

// ==================== 便捷Hooks ====================

export const useAppAuth = () => {
  const { auth } = useUnifiedApp();
  return auth;
};

export const useAppGrade = () => {
  const { grade } = useUnifiedApp();
  return grade;
};

export const useAppFilter = () => {
  const { filter } = useUnifiedApp();
  return filter;
};

export const useAppUI = () => {
  const { ui } = useUnifiedApp();
  return ui;
};

export const useAppState = () => {
  const { state } = useUnifiedApp();
  return state;
};

export const useAppActions = () => {
  const { actions } = useUnifiedApp();
  return actions;
};

// ==================== 向后兼容Hooks ====================

// 为了支持现有代码的渐进迁移
export const useModernGradeAnalysis = () => {
  console.warn(
    "⚠️ useModernGradeAnalysis is deprecated. Use useAppGrade instead."
  );
  return useAppGrade();
};

export const useAuthContext = () => {
  console.warn("⚠️ useAuthContext is deprecated. Use useAppAuth instead.");
  return useAppAuth();
};

export const useFilter = () => {
  console.warn(
    "⚠️ useFilter from FilterContext is deprecated. Use useAppFilter instead."
  );
  return useAppFilter();
};

// ==================== 性能监控Hook ====================

export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });

  useEffect(() => {
    const now = performance.now();
    setMetrics((prev) => {
      const newRenderCount = prev.renderCount + 1;
      const renderTime = now - prev.lastRenderTime;
      const newAverageRenderTime =
        prev.averageRenderTime === 0
          ? renderTime
          : (prev.averageRenderTime * (newRenderCount - 1) + renderTime) /
            newRenderCount;

      return {
        renderCount: newRenderCount,
        lastRenderTime: now,
        averageRenderTime: newAverageRenderTime,
      };
    });
  });

  return metrics;
};
