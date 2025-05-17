/**
 * 全局网络请求配置
 */

// 请求并发数限制
export const MAX_CONCURRENT_REQUESTS = 5;

// 默认请求超时(毫秒)
export const DEFAULT_REQUEST_TIMEOUT = 30000;

// 默认重试次数
export const DEFAULT_RETRY_COUNT = 3;

// 初始重试延迟(毫秒)
export const INITIAL_RETRY_DELAY = 1000;

// 批量请求的默认批次大小
export const DEFAULT_BATCH_SIZE = 3;

// 批量请求的默认批次间隔(毫秒)
export const DEFAULT_BATCH_INTERVAL = 300;

// 默认缓存时间(毫秒) - 1小时
export const DEFAULT_CACHE_TTL = 60 * 60 * 1000;

// 可以临时降低并发请求数，用于处理资源不足的情况
export const configureLowResourceMode = (enabled: boolean): void => {
  if (enabled) {
    (window as any).__LOW_RESOURCE_MODE = true;
    console.log('已启用低资源模式，减少并发请求数');
  } else {
    (window as any).__LOW_RESOURCE_MODE = false;
    console.log('已禁用低资源模式');
  }
};

// 检查是否处于低资源模式
export const isLowResourceMode = (): boolean => {
  return !!(window as any).__LOW_RESOURCE_MODE;
};

// 根据当前资源模式获取并发请求限制
export const getCurrentConcurrentLimit = (): number => {
  return isLowResourceMode() ? 2 : MAX_CONCURRENT_REQUESTS;
};

// 定义网络错误类型
export enum NetworkErrorType {
  TIMEOUT = 'timeout',
  CONNECTION = 'connection',
  SERVER = 'server',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// 网络错误处理器配置
export interface NetworkErrorHandler {
  type: NetworkErrorType;
  handler: (error: any) => void;
}

// 全局错误处理器
const errorHandlers: NetworkErrorHandler[] = [];

// 注册错误处理器
export const registerErrorHandler = (handler: NetworkErrorHandler): void => {
  errorHandlers.push(handler);
};

// 处理网络错误
export const handleNetworkError = (error: any): void => {
  let errorType = NetworkErrorType.UNKNOWN;
  
  // 确定错误类型
  if (error.message && error.message.includes('timeout')) {
    errorType = NetworkErrorType.TIMEOUT;
  } else if (error.message && error.message.includes('Failed to fetch')) {
    errorType = NetworkErrorType.CONNECTION;
  } else if (error.status === 401) {
    errorType = NetworkErrorType.UNAUTHORIZED;
  } else if (error.status === 403) {
    errorType = NetworkErrorType.FORBIDDEN;
  } else if (error.status === 404) {
    errorType = NetworkErrorType.NOT_FOUND;
  } else if (error.status && error.status >= 500) {
    errorType = NetworkErrorType.SERVER;
  } else if (error.status === 422) {
    errorType = NetworkErrorType.VALIDATION;
  }
  
  // 调用匹配的错误处理器
  const matchedHandlers = errorHandlers.filter(h => h.type === errorType);
  matchedHandlers.forEach(handler => handler.handler(error));
  
  // 如果没有匹配的处理器，记录错误
  if (matchedHandlers.length === 0) {
    console.error(`未处理的网络错误(${errorType}):`, error);
  }
}; 