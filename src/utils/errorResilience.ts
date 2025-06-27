/**
 * 错误恢复工具
 * 专门处理React DOM操作冲突问题
 */

// DOM错误类型
const DOM_ERROR_PATTERNS = [
  /Failed to execute 'removeChild' on 'Node'/,
  /The node to be removed is not a child of this node/,
  /Cannot read property.*of null/,
  /Cannot read properties of null/
];

// 检查是否是可恢复的DOM错误
export function isRecoverableDOMError(error: Error): boolean {
  return DOM_ERROR_PATTERNS.some(pattern => pattern.test(error.message));
}

// 错误恢复策略
export function handleDOMError(error: Error, retryCallback?: () => void): void {
  console.warn('检测到DOM操作冲突，尝试恢复:', error.message);
  
  if (isRecoverableDOMError(error)) {
    // 延迟重试
    if (retryCallback) {
      setTimeout(() => {
        try {
          retryCallback();
        } catch (retryError) {
          console.error('重试失败:', retryError);
        }
      }, 100);
    }
  } else {
    // 非可恢复错误，重新抛出
    throw error;
  }
}

// 安全的状态更新函数
export function safeStateUpdate<T>(
  setState: React.Dispatch<React.SetStateAction<T>>, 
  value: T | ((prev: T) => T),
  errorCallback?: (error: Error) => void
): void {
  try {
    setState(value);
  } catch (error) {
    if (error instanceof Error && isRecoverableDOMError(error)) {
      console.warn('状态更新遇到DOM冲突，延迟重试');
      setTimeout(() => {
        try {
          setState(value);
        } catch (retryError) {
          console.error('延迟重试也失败:', retryError);
          errorCallback?.(retryError as Error);
        }
      }, 50);
    } else {
      errorCallback?.(error as Error);
    }
  }
}

// 强制刷新组件的Hook
export function useForceUpdate() {
  const [, setTick] = React.useState(0);
  return React.useCallback(() => {
    setTick(tick => tick + 1);
  }, []);
}

// 导入React用于Hook
import React from 'react';