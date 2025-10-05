/**
 * 全局加载状态管理Context
 *
 * 功能:
 * - 统一管理全局加载状态
 * - 支持多个并发加载操作
 * - 自动超时提醒和重试机制
 * - 加载进度追踪
 * - 加载队列管理
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Loading } from "@/components/ui/loading";
import { NotificationManager } from "@/services/NotificationManager";

interface LoadingOperation {
  id: string;
  message: string;
  progress?: number;
  startTime: number;
  timeoutMs: number;
  retryable: boolean;
  onRetry?: () => void;
}

interface GlobalLoadingContextType {
  // 状态查询
  isLoading: boolean;
  hasActiveLoading: (id?: string) => boolean;
  getProgress: (id: string) => number | undefined;

  // 加载控制
  startLoading: (id: string, options?: LoadingOptions) => void;
  stopLoading: (id: string) => void;
  updateProgress: (id: string, progress: number, message?: string) => void;

  // 便捷方法
  withLoading: <T>(
    id: string,
    asyncFn: () => Promise<T>,
    options?: LoadingOptions
  ) => Promise<T>;
}

interface LoadingOptions {
  message?: string;
  progress?: number;
  timeoutMs?: number;
  retryable?: boolean;
  onRetry?: () => void;
  showGlobalOverlay?: boolean;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const GlobalLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operations, setOperations] = useState<Map<string, LoadingOperation>>(new Map());
  const [showOverlay, setShowOverlay] = useState(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理超时定时器
  const clearOperationTimeout = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // 设置超时警告
  const setupTimeout = useCallback((operation: LoadingOperation) => {
    clearOperationTimeout(operation.id);

    const timeout = setTimeout(() => {
      const currentOp = operations.get(operation.id);
      if (currentOp && currentOp.retryable && currentOp.onRetry) {
        NotificationManager.warning("操作超时", {
          description: `${currentOp.message} 耗时较长，可能遇到问题`,
          duration: 8000,
          action: {
            label: "重试",
            onClick: () => {
              stopLoading(operation.id);
              currentOp.onRetry?.();
            },
          },
        });
      } else {
        NotificationManager.info("请耐心等待", {
          description: `${currentOp?.message || "操作"} 正在处理中...`,
          duration: 5000,
        });
      }
    }, operation.timeoutMs);

    timeoutRefs.current.set(operation.id, timeout);
  }, [operations]);

  // 开始加载
  const startLoading = useCallback((id: string, options: LoadingOptions = {}) => {
    const operation: LoadingOperation = {
      id,
      message: options.message || "加载中...",
      progress: options.progress,
      startTime: Date.now(),
      timeoutMs: options.timeoutMs || 15000, // 默认15秒超时
      retryable: options.retryable ?? false,
      onRetry: options.onRetry,
    };

    setOperations(prev => {
      const newOps = new Map(prev);
      newOps.set(id, operation);
      return newOps;
    });

    if (options.showGlobalOverlay) {
      setShowOverlay(true);
    }

    // 设置超时提醒
    setupTimeout(operation);

    console.log(`[GlobalLoading] 开始加载: ${id} - ${operation.message}`);
  }, [setupTimeout]);

  // 停止加载
  const stopLoading = useCallback((id: string) => {
    setOperations(prev => {
      const newOps = new Map(prev);
      const operation = newOps.get(id);

      if (operation) {
        const duration = Date.now() - operation.startTime;
        console.log(`[GlobalLoading] 停止加载: ${id} (耗时: ${duration}ms)`);
        newOps.delete(id);
      }

      return newOps;
    });

    clearOperationTimeout(id);

    // 如果没有其他加载操作，隐藏全局遮罩
    setOperations(current => {
      if (current.size === 0) {
        setShowOverlay(false);
      }
      return current;
    });
  }, [clearOperationTimeout]);

  // 更新进度
  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    setOperations(prev => {
      const newOps = new Map(prev);
      const operation = newOps.get(id);

      if (operation) {
        newOps.set(id, {
          ...operation,
          progress: Math.min(100, Math.max(0, progress)),
          ...(message && { message }),
        });
      }

      return newOps;
    });
  }, []);

  // 便捷包装器
  const withLoading = useCallback(
    async <T,>(
      id: string,
      asyncFn: () => Promise<T>,
      options: LoadingOptions = {}
    ): Promise<T> => {
      startLoading(id, {
        message: options.message || "处理中...",
        ...options,
      });

      try {
        const result = await asyncFn();
        stopLoading(id);
        return result;
      } catch (error) {
        stopLoading(id);
        throw error;
      }
    },
    [startLoading, stopLoading]
  );

  // 查询方法
  const isLoading = operations.size > 0;
  const hasActiveLoading = useCallback((id?: string) => {
    if (id) {
      return operations.has(id);
    }
    return operations.size > 0;
  }, [operations]);

  const getProgress = useCallback((id: string) => {
    return operations.get(id)?.progress;
  }, [operations]);

  // 清理所有超时定时器
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // 获取当前主要加载操作（最新的）
  const currentOperation = Array.from(operations.values()).pop();

  return (
    <GlobalLoadingContext.Provider
      value={{
        isLoading,
        hasActiveLoading,
        getProgress,
        startLoading,
        stopLoading,
        updateProgress,
        withLoading,
      }}
    >
      {children}

      {/* 全局加载遮罩 */}
      {showOverlay && currentOperation && (
        <Loading
          fullScreen
          size="lg"
          text={currentOperation.message}
        />
      )}
    </GlobalLoadingContext.Provider>
  );
};

/**
 * 使用全局加载状态的Hook
 */
export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return context;
};

/**
 * 便捷Hook - 为特定操作创建加载控制器
 */
export const useLoadingOperation = (operationId: string) => {
  const { startLoading, stopLoading, updateProgress, hasActiveLoading, getProgress } = useGlobalLoading();

  const start = useCallback((options?: LoadingOptions) => {
    startLoading(operationId, options);
  }, [startLoading, operationId]);

  const stop = useCallback(() => {
    stopLoading(operationId);
  }, [stopLoading, operationId]);

  const update = useCallback((progress: number, message?: string) => {
    updateProgress(operationId, progress, message);
  }, [updateProgress, operationId]);

  const isActive = hasActiveLoading(operationId);
  const progress = getProgress(operationId);

  return {
    isLoading: isActive,
    progress,
    start,
    stop,
    update,
  };
};
