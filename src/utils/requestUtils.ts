/**
 * 请求工具函数，用于管理请求队列和进行重试
 * 包含安全拦截和防护机制
 */

import { toast } from "sonner";
import { ApiSecurity, ApiErrorHandler } from "./apiSecurity";

// 请求队列
export class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 将请求添加到队列，并在合适的时机自动执行
   * @param task 要执行的异步任务
   * @returns 任务执行结果的Promise
   */
  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        } finally {
          this.running--;
          this.processQueue();
        }
      });

      this.processQueue();
    });
  }

  private processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      this.running++;
      task().catch(() => {
        // 错误已在任务内部处理
      });
    }
  }
}

// 全局请求队列实例
export const globalRequestQueue = new RequestQueue(3);

/**
 * 带有重试功能的异步请求函数
 * @param fetchFn 要执行的异步请求函数
 * @param maxRetries 最大重试次数
 * @param delay 初始延迟时间(ms)
 * @returns 请求结果
 */
export const fetchWithRetry = async <T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      console.log(`请求失败，${i + 1}/${maxRetries}次重试`, error);

      // 指数退避延迟
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i))
      );
    }
  }
  throw lastError;
};

/**
 * 在全局队列中执行请求，带重试功能
 * @param fetchFn 要执行的异步请求函数
 * @param options 配置选项
 * @returns 请求结果
 */
export const queuedFetchWithRetry = async <T>(
  fetchFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    showErrorToast?: boolean;
    errorMessage?: string;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showErrorToast = true,
    errorMessage = "请求失败，请稍后重试",
  } = options;

  return globalRequestQueue.enqueue(async () => {
    try {
      return await fetchWithRetry(fetchFn, maxRetries, retryDelay);
    } catch (error) {
      console.error("请求最终失败:", error);
      if (showErrorToast) {
        toast.error(errorMessage, {
          description: error instanceof Error ? error.message : "未知错误",
        });
      }
      throw error;
    }
  });
};

/**
 * 简单的数据缓存工具
 * @param key 缓存键
 * @param data 要缓存的数据
 * @param ttlMs 缓存有效期(毫秒)
 */
export const setCacheData = <T>(
  key: string,
  data: T,
  ttlMs = 3600000
): void => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttlMs,
      })
    );
  } catch (e) {
    console.warn("写入缓存失败", e);
  }
};

/**
 * 从缓存获取数据
 * @param key 缓存键
 * @returns 缓存的数据，如果未找到或已过期则返回null
 */
export const getCachedData = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, expiry } = JSON.parse(cached);
      if (Date.now() < expiry) {
        return data as T;
      }
    }
  } catch (e) {
    console.warn("读取缓存失败", e);
  }
  return null;
};

/**
 * 安全的API请求包装器
 * 集成了队列管理、重试机制和安全验证
 */
export const secureQueuedRequest = async <T>(
  config: {
    endpoint: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  },
  options: {
    maxRetries?: number;
    retryDelay?: number;
    showErrorToast?: boolean;
    errorMessage?: string;
    useCache?: boolean;
    cacheKey?: string;
    cacheTTL?: number;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showErrorToast = true,
    errorMessage = "请求失败，请稍后重试",
    useCache = false,
    cacheKey,
    cacheTTL = 300000, // 5分钟默认缓存
  } = options;

  // 如果启用缓存且有缓存键，先尝试从缓存获取
  if (useCache && cacheKey) {
    const cachedData = getCachedData<T>(cacheKey);
    if (cachedData) {
      console.log(`[CACHE-HIT] 使用缓存数据: ${cacheKey}`);
      return cachedData;
    }
  }

  return globalRequestQueue.enqueue(async () => {
    try {
      const response = await fetchWithRetry(
        async () => {
          // 网络状态检查
          if (!ApiSecurity.isOnline()) {
            throw new Error("网络连接不可用");
          }

          // 通过安全API包装器发送请求
          const result = await ApiSecurity.secureRequest<T>({
            endpoint: config.endpoint,
            method: config.method || "GET",
            headers: config.headers,
            body: config.body,
            timeout: config.timeout,
          });

          if (!result.success) {
            throw new Error(result.error || result.message || "请求失败");
          }

          return result.data!;
        },
        maxRetries,
        retryDelay
      );

      // 如果启用缓存，存储响应数据
      if (useCache && cacheKey && response) {
        setCacheData(cacheKey, response, cacheTTL);
        console.log(`[CACHE-SET] 缓存响应数据: ${cacheKey}`);
      }

      return response;
    } catch (error) {
      const errorMsg = ApiErrorHandler.handleError(error, config.endpoint);
      console.error(`[SECURE-REQUEST-ERROR] ${config.endpoint}:`, error);

      if (showErrorToast) {
        toast.error(errorMessage, {
          description: errorMsg,
        });
      }
      throw new Error(errorMsg);
    }
  });
};

/**
 * 安全的AI API请求包装器
 */
export const secureAiRequest = async <T>(
  provider: "openai" | "doubao" | "generic",
  payload: any,
  apiKey: string,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    showErrorToast?: boolean;
    errorMessage?: string;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 2,
    retryDelay = 2000,
    showErrorToast = true,
    errorMessage = "AI请求失败，请稍后重试",
  } = options;

  return globalRequestQueue.enqueue(async () => {
    try {
      return await fetchWithRetry(
        async () => {
          // 网络状态检查
          if (!ApiSecurity.isOnline()) {
            throw new Error("网络连接不可用");
          }

          // 通过安全AI API包装器发送请求
          const result = await ApiSecurity.secureAiRequest<T>(
            provider,
            payload,
            apiKey
          );

          if (!result.success) {
            throw new Error(result.error || result.message || "AI请求失败");
          }

          return result.data!;
        },
        maxRetries,
        retryDelay
      );
    } catch (error) {
      const errorMsg = ApiErrorHandler.handleError(error, `AI-${provider}`);
      console.error(`[SECURE-AI-ERROR] ${provider}:`, error);

      if (showErrorToast) {
        toast.error(errorMessage, {
          description: errorMsg,
        });
      }
      throw new Error(errorMsg);
    }
  });
};

/**
 * 请求拦截器配置
 */
export class RequestInterceptor {
  private static interceptors: ((config: any) => any)[] = [];
  private static responseInterceptors: ((response: any) => any)[] = [];

  static addRequestInterceptor(interceptor: (config: any) => any) {
    this.interceptors.push(interceptor);
  }

  static addResponseInterceptor(interceptor: (response: any) => any) {
    this.responseInterceptors.push(interceptor);
  }

  static applyRequestInterceptors(config: any): any {
    return this.interceptors.reduce(
      (acc, interceptor) => interceptor(acc),
      config
    );
  }

  static applyResponseInterceptors(response: any): any {
    return this.responseInterceptors.reduce(
      (acc, interceptor) => interceptor(acc),
      response
    );
  }
}

// 添加默认安全拦截器
RequestInterceptor.addRequestInterceptor((config) => {
  // 添加安全请求头
  config.headers = {
    "X-Requested-With": "XMLHttpRequest",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    ...config.headers,
  };

  // 记录请求
  console.log(
    `[REQUEST-INTERCEPTOR] ${config.method || "GET"} ${config.endpoint}`
  );

  return config;
});

RequestInterceptor.addResponseInterceptor((response) => {
  // 响应安全检查
  if (response && typeof response === "object") {
    // 移除潜在的敏感字段
    const sensitiveFields = ["password", "token", "secret", "apiKey"];
    sensitiveFields.forEach((field) => {
      if (field in response) {
        console.warn(`[SECURITY-WARNING] 响应中包含敏感字段: ${field}`);
        delete response[field];
      }
    });
  }

  return response;
});

// 导出常用的安全请求方法
export { ApiSecurity, ApiErrorHandler };

/**
 * 便捷的安全GET请求
 */
export const secureGet = <T>(endpoint: string, options = {}) =>
  secureQueuedRequest<T>({ endpoint, method: "GET" }, options);

/**
 * 便捷的安全POST请求
 */
export const securePost = <T>(endpoint: string, body: any, options = {}) =>
  secureQueuedRequest<T>({ endpoint, method: "POST", body }, options);

/**
 * 便捷的安全PUT请求
 */
export const securePut = <T>(endpoint: string, body: any, options = {}) =>
  secureQueuedRequest<T>({ endpoint, method: "PUT", body }, options);

/**
 * 便捷的安全DELETE请求
 */
export const secureDelete = <T>(endpoint: string, options = {}) =>
  secureQueuedRequest<T>({ endpoint, method: "DELETE" }, options);
