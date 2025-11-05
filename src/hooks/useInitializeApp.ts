/**
 * 🚀 useInitializeApp - 应用初始化Hook
 * 提供统一的应用初始化逻辑，支持UnifiedAppContext架构
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  UseInitializeAppOptions,
  UseInitializeAppReturn,
  AppError,
} from "@/contexts/unified/types";
import { useUnifiedApp } from "@/contexts/unified/UnifiedAppContext";

// ==================== 初始化步骤定义 ====================

interface InitializationStep {
  name: string;
  description: string;
  weight: number; // 权重，用于计算进度
  execute: () => Promise<void>;
  retryable: boolean;
  required: boolean;
}

// ==================== Hook实现 ====================

export const useInitializeApp = (
  options: UseInitializeAppOptions = {}
): UseInitializeAppReturn => {
  const {
    skipAuthInit = false,
    preloadGradeData = true,
    enablePerformanceMode = true,
    onInitComplete,
    onError,
  } = options;

  // 状态管理
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [progress, setProgress] = useState(0);

  // UnifiedApp上下文
  const { state, actions, ui } = useUnifiedApp();

  // 防止重复初始化
  const initializationRef = useRef(false);
  const stepsRef = useRef<InitializationStep[]>([]);

  // ==================== 错误处理 ====================

  const createAppError = useCallback(
    (
      message: string,
      code?: string,
      recoverable: boolean = true
    ): AppError => ({
      id: `INIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      code,
      timestamp: Date.now(),
      module: "initialization",
      recoverable,
      retryCount: 0,
    }),
    []
  );

  const handleError = useCallback(
    (error: AppError) => {
      setError(error);
      onError?.(error);

      toast.error(error.message, {
        description: error.recoverable
          ? "点击重试或稍后再试"
          : "请联系系统管理员",
        action: error.recoverable
          ? {
              label: "重试",
              onClick: () => retry(),
            }
          : undefined,
      });

      console.error("❌ 应用初始化错误:", error);
    },
    [onError]
  );

  // ==================== 初始化步骤定义 ====================

  const createInitializationSteps = useCallback((): InitializationStep[] => {
    const steps: InitializationStep[] = [
      // Step 1: UI模块初始化
      {
        name: "ui",
        description: "初始化UI模块",
        weight: 10,
        retryable: true,
        required: true,
        execute: async () => {
          // UI模块通常自动初始化，这里可以添加额外的UI设置
          if (enablePerformanceMode) {
            // 根据设备性能自动调整性能模式
            const isLowPerformance =
              navigator.hardwareConcurrency < 4 ||
              (window.performance?.memory as any)?.usedJSHeapSize >
                100 * 1024 * 1024;

            if (isLowPerformance) {
              ui.setPerformanceMode("low");
              ui.addNotification({
                type: "info",
                title: "性能模式",
                message: "检测到设备性能较低，已自动启用低性能模式",
              });
            }
          }
        },
      },

      // Step 2: 认证模块初始化
      {
        name: "auth",
        description: "初始化认证模块",
        weight: 20,
        retryable: true,
        required: !skipAuthInit,
        execute: async () => {
          if (skipAuthInit) return;

          // 等待认证就绪
          let attempts = 0;
          const maxAttempts = 30; // 最多等待30秒

          while (!state.auth.isAuthReady && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
            setProgress((prev) => Math.min(prev + 1, 30));
          }

          if (!state.auth.isAuthReady) {
            throw createAppError("认证模块初始化超时", "AUTH_TIMEOUT");
          }

          // 如果有认证错误，抛出异常
          if (state.auth.error) {
            throw createAppError(
              `认证错误: ${state.auth.error.message}`,
              "AUTH_ERROR",
              state.auth.error.recoverable
            );
          }
        },
      },

      // Step 3: 成绩数据预加载（可选）
      {
        name: "gradeData",
        description: "预加载成绩数据",
        weight: 50,
        retryable: true,
        required: false,
        execute: async () => {
          if (!preloadGradeData || !state.auth.user) return;

          try {
            await actions.grade.loadAllData();

            if (state.grade.error) {
              throw createAppError(
                `数据加载失败: ${state.grade.error.message}`,
                "DATA_LOAD_ERROR",
                state.grade.error.recoverable
              );
            }

            ui.addNotification({
              type: "success",
              title: "数据加载完成",
              message: `成功加载 ${state.grade.allGradeData.length} 条成绩记录`,
            });
          } catch (error: any) {
            // 数据预加载失败不应该阻止应用初始化
            console.warn("⚠️ 成绩数据预加载失败:", error);
            ui.addNotification({
              type: "warning",
              title: "数据预加载失败",
              message: "部分数据加载失败，您可以稍后手动刷新",
            });
          }
        },
      },

      // Step 4: 应用状态恢复
      {
        name: "stateRestore",
        description: "恢复应用状态",
        weight: 10,
        retryable: true,
        required: false,
        execute: async () => {
          try {
            // 恢复主题设置
            const savedTheme = localStorage.getItem("app-theme");
            if (
              savedTheme &&
              ["light", "dark", "system"].includes(savedTheme)
            ) {
              ui.setTheme(savedTheme as any);
            }

            // 恢复性能模式设置
            const savedPerformanceMode = localStorage.getItem(
              "app-performance-mode"
            );
            if (
              savedPerformanceMode &&
              ["high", "balanced", "low"].includes(savedPerformanceMode)
            ) {
              ui.setPerformanceMode(savedPerformanceMode as any);
            }

            // 恢复筛选器状态（如果有的话）
            const savedFilter = localStorage.getItem("app-grade-filter");
            if (savedFilter && state.auth.user) {
              try {
                const filterData = JSON.parse(savedFilter);
                actions.grade.setFilter(filterData);
              } catch (error) {
                console.warn("⚠️ 筛选器状态恢复失败:", error);
              }
            }
          } catch (error: any) {
            console.warn("⚠️ 应用状态恢复失败:", error);
            // 状态恢复失败不应该影响应用初始化
          }
        },
      },

      // Step 5: 完成初始化
      {
        name: "finalize",
        description: "完成初始化",
        weight: 10,
        retryable: false,
        required: true,
        execute: async () => {
          // 标记应用为已初始化
          setInitialized(true);
          setProgress(100);

          // 显示成功通知
          ui.addNotification({
            type: "success",
            title: "应用初始化完成",
            message: "所有模块加载完成，开始使用吧！",
          });

          // 调用完成回调
          onInitComplete?.();

          // 开发模式下输出初始化信息
          if (process.env.NODE_ENV === "development") {
            console.log("🎉 应用初始化完成", {
              version: state.version,
              buildTime: state.buildTime,
              user: state.auth.user?.email,
              gradeDataCount: state.grade.allGradeData.length,
              performance: ui.performanceMode,
            });
          }
        },
      },
    ];

    return steps.filter((step) => step.required || true); // 可以根据配置过滤步骤
  }, [
    skipAuthInit,
    preloadGradeData,
    enablePerformanceMode,
    state,
    actions,
    ui,
    onInitComplete,
    createAppError,
  ]);

  // ==================== 初始化执行 ====================

  const executeInitialization = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const steps = createInitializationSteps();
      stepsRef.current = steps;

      const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
      let completedWeight = 0;

      for (const step of steps) {
        try {
          console.log(`🔄 执行初始化步骤: ${step.name} - ${step.description}`);

          await step.execute();

          completedWeight += step.weight;
          const newProgress = Math.round((completedWeight / totalWeight) * 100);
          setProgress(newProgress);

          console.log(`✅ 完成初始化步骤: ${step.name} (${newProgress}%)`);
        } catch (error: any) {
          console.error(`❌ 初始化步骤失败: ${step.name}`, error);

          if (step.required) {
            // 必需步骤失败，终止初始化
            const appError =
              error instanceof Error
                ? createAppError(
                    `${step.description}失败: ${error.message}`,
                    `${step.name.toUpperCase()}_ERROR`
                  )
                : createAppError(
                    `${step.description}失败`,
                    `${step.name.toUpperCase()}_ERROR`
                  );

            throw appError;
          } else {
            // 可选步骤失败，继续初始化但记录警告
            console.warn(`⚠️ 可选步骤失败，继续初始化: ${step.name}`, error);
            ui.addNotification({
              type: "warning",
              title: `${step.description}失败`,
              message: "这不会影响应用的基本功能",
            });
          }
        }
      }

      console.log("🎉 应用初始化完成");
    } catch (error: any) {
      console.error("❌ 应用初始化失败:", error);

      const appError =
        error instanceof Error && "module" in error
          ? (error as AppError)
          : createAppError("应用初始化失败", "INIT_ERROR");

      handleError(appError);
    } finally {
      setLoading(false);
      initializationRef.current = false;
    }
  }, [createInitializationSteps, createAppError, handleError, ui]);

  // ==================== 重试机制 ====================

  const retry = useCallback(async () => {
    if (loading) return;

    setError(null);
    await executeInitialization();
  }, [loading, executeInitialization]);

  // ==================== 自动初始化 ====================

  useEffect(() => {
    if (!initialized && !loading && !error) {
      executeInitialization();
    }
  }, [initialized, loading, error, executeInitialization]);

  // ==================== 返回值 ====================

  return {
    initialized,
    loading,
    error,
    progress,
    retry,
  };
};

// ==================== 便捷Hook ====================

export const useAppInitialization = () => {
  const { state } = useUnifiedApp();

  return {
    isInitialized: state.initialized,
    isAuthReady: state.auth.isAuthReady,
    hasUser: !!state.auth.user,
    hasGradeData: state.grade.allGradeData.length > 0,
    version: state.version,
    buildTime: state.buildTime,
  };
};
