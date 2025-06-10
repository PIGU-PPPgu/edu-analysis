import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorState {
  error: Error | null;
  errorId?: string;
  isRetrying: boolean;
}

interface UseErrorHandlingReturn {
  error: Error | null;
  errorId?: string;
  isRetrying: boolean;
  setError: (error: Error | null) => void;
  clearError: () => void;
  retry: (retryFn?: () => Promise<void>) => Promise<void>;
  handleAsyncError: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

export const useErrorHandling = (
  onError?: (error: Error) => void
): UseErrorHandlingReturn => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false
  });

  const setError = useCallback((error: Error | null) => {
    if (error) {
      const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setErrorState({
        error,
        errorId,
        isRetrying: false
      });

      // 显示错误提示
      toast.error(error.message || '系统出现错误', {
        description: `错误ID: ${errorId}`,
        action: {
          label: '重试',
          onClick: () => retry()
        }
      });

      // 调用外部错误处理函数
      onError?.(error);

      // 记录错误到控制台
      console.error('Error occurred:', error, { errorId });
    } else {
      setErrorState({
        error: null,
        isRetrying: false
      });
    }
  }, [onError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false
    });
  }, []);

  const retry = useCallback(async (retryFn?: () => Promise<void>) => {
    setErrorState(prev => ({
      ...prev,
      isRetrying: true
    }));

    try {
      if (retryFn) {
        await retryFn();
      }
      clearError();
      toast.success('操作重试成功');
    } catch (error) {
      setError(error as Error);
    } finally {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false
      }));
    }
  }, [setError, clearError]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      const result = await asyncFn();
      clearError();
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [setError, clearError]);

  return {
    error: errorState.error,
    errorId: errorState.errorId,
    isRetrying: errorState.isRetrying,
    setError,
    clearError,
    retry,
    handleAsyncError
  };
}; 