import { useState, useCallback, useRef } from "react";

interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  operation?: string;
}

interface UseLoadingStateReturn {
  isLoading: boolean;
  progress?: number;
  message?: string;
  operation?: string;
  setLoading: (loading: boolean, options?: Partial<LoadingState>) => void;
  updateProgress: (progress: number, message?: string) => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    options?: Partial<LoadingState>
  ) => Promise<T>;
  resetLoading: () => void;
}

export const useLoadingState = (
  initialState: Partial<LoadingState> = {}
): UseLoadingStateReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: "加载中...",
    operation: undefined,
    ...initialState,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const setLoading = useCallback(
    (loading: boolean, options: Partial<LoadingState> = {}) => {
      // 清除之前的超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setLoadingState((prev) => ({
        ...prev,
        isLoading: loading,
        progress: loading ? (options.progress ?? prev.progress) : 0,
        message: options.message ?? (loading ? "加载中..." : ""),
        operation: options.operation ?? prev.operation,
      }));

      // 如果开始加载，设置一个默认的超时提醒
      if (loading) {
        timeoutRef.current = setTimeout(() => {
          setLoadingState((prev) =>
            prev.isLoading
              ? {
                  ...prev,
                  message: "加载时间较长，请耐心等待...",
                }
              : prev
          );
        }, 10000); // 10秒后提醒用户
      }
    },
    []
  );

  const updateProgress = useCallback((progress: number, message?: string) => {
    setLoadingState((prev) => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      ...(message && { message }),
    }));
  }, []);

  const withLoading = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: Partial<LoadingState> = {}
    ): Promise<T> => {
      setLoading(true, {
        message: "正在处理...",
        progress: 0,
        ...options,
      });

      try {
        const result = await asyncFn();
        return result;
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const resetLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoadingState({
      isLoading: false,
      progress: 0,
      message: "加载中...",
      operation: undefined,
    });
  }, []);

  return {
    isLoading: loadingState.isLoading,
    progress: loadingState.progress,
    message: loadingState.message,
    operation: loadingState.operation,
    setLoading,
    updateProgress,
    withLoading,
    resetLoading,
  };
};
