/**
 * 标准化API调用Hook
 * 提供统一的加载状态、错误处理和成功响应处理
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  type ApiResponse, 
  type StandardError,
  errorHandler 
} from '@/services/errorHandler';

interface UseStandardizedApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: StandardError) => void;
}

interface UseStandardizedApiState<T> {
  data: T | null;
  error: StandardError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseStandardizedApiReturn<T> extends UseStandardizedApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
  retry: () => Promise<T | null>;
}

/**
 * 标准化API调用Hook
 */
export function useStandardizedApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseStandardizedApiOptions = {}
): UseStandardizedApiReturn<T> {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage,
    errorMessage,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<UseStandardizedApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false
  });

  const lastArgsRef = useRef<any[]>([]);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    lastArgsRef.current = args;
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false
    }));

    try {
      const response = await apiFunction(...args);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          data: response.data,
          isLoading: false,
          isSuccess: true,
          isError: false
        }));

        // 成功回调
        if (onSuccess) {
          onSuccess(response.data);
        }

        // 成功提示
        if (showSuccessToast) {
          toast.success(successMessage || '操作成功');
        }

        return response.data;
      } else {
        throw new Error(response.error || '未知错误');
      }
    } catch (error) {
      const standardError = errorHandler.handle(error);
      
      setState(prev => ({
        ...prev,
        error: standardError,
        isLoading: false,
        isSuccess: false,
        isError: true
      }));

      // 错误回调
      if (onError) {
        onError(standardError);
      }

      // 错误提示
      if (showErrorToast) {
        toast.error(errorMessage || standardError.message || '操作失败');
      }

      return null;
    }
  }, [apiFunction, showSuccessToast, showErrorToast, successMessage, errorMessage, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false
    });
  }, []);

  const retry = useCallback(async (): Promise<T | null> => {
    return execute(...lastArgsRef.current);
  }, [execute]);

  return {
    ...state,
    execute,
    reset,
    retry
  };
}

/**
 * 列表API专用Hook，包含刷新功能
 */
interface UseStandardizedListApiOptions extends UseStandardizedApiOptions {
  initialLoad?: boolean;
}

interface UseStandardizedListApiReturn<T> extends UseStandardizedApiReturn<T> {
  refetch: () => Promise<T | null>;
}

export function useStandardizedListApi<T = any>(
  apiFunction: () => Promise<ApiResponse<T>>,
  options: UseStandardizedListApiOptions = {}
): UseStandardizedListApiReturn<T> {
  const {
    initialLoad = false,
    ...restOptions
  } = options;

  const baseResult = useStandardizedApi(apiFunction, restOptions);

  // 初始加载
  React.useEffect(() => {
    if (initialLoad) {
      baseResult.execute();
    }
  }, [initialLoad, baseResult.execute]);

  const refetch = useCallback(async (): Promise<T | null> => {
    return baseResult.execute();
  }, [baseResult.execute]);

  return {
    ...baseResult,
    refetch
  };
}

/**
 * 表单提交API专用Hook
 */
interface UseStandardizedFormApiOptions extends UseStandardizedApiOptions {
  resetOnSuccess?: boolean;
}

export function useStandardizedFormApi<T = any>(
  apiFunction: (data: any) => Promise<ApiResponse<T>>,
  options: UseStandardizedFormApiOptions = {}
): UseStandardizedApiReturn<T> {
  const {
    resetOnSuccess = false,
    onSuccess,
    ...restOptions
  } = options;

  const handleSuccess = useCallback((data: T) => {
    if (onSuccess) {
      onSuccess(data);
    }
  }, [onSuccess]);

  return useStandardizedApi(apiFunction, {
    ...restOptions,
    onSuccess: handleSuccess,
    showSuccessToast: true // 表单提交默认显示成功提示
  });
}

/**
 * 删除操作专用Hook，包含确认对话框
 */
interface UseStandardizedDeleteApiOptions extends UseStandardizedApiOptions {
  confirmMessage?: string;
  skipConfirm?: boolean;
}

interface UseStandardizedDeleteApiReturn<T> extends UseStandardizedApiReturn<T> {
  executeWithConfirm: (id: string | number) => Promise<T | null>;
}

export function useStandardizedDeleteApi<T = any>(
  apiFunction: (id: string | number) => Promise<ApiResponse<T>>,
  options: UseStandardizedDeleteApiOptions = {}
): UseStandardizedDeleteApiReturn<T> {
  const {
    confirmMessage = '确定要删除吗？',
    skipConfirm = false,
    ...restOptions
  } = options;

  const baseResult = useStandardizedApi(apiFunction, {
    ...restOptions,
    showSuccessToast: true // 删除操作默认显示成功提示
  });

  const executeWithConfirm = useCallback(async (id: string | number): Promise<T | null> => {
    if (!skipConfirm) {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return null;
      }
    }
    
    return baseResult.execute(id);
  }, [baseResult.execute, confirmMessage, skipConfirm]);

  return {
    ...baseResult,
    executeWithConfirm
  };
}

// 为了兼容性，导入React
import React from 'react';