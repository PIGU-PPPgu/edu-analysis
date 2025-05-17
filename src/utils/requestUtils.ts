/**
 * 请求工具函数，用于管理请求队列和进行重试
 */

import { toast } from "sonner";

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
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
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
    errorMessage = "请求失败，请稍后重试"
  } = options;

  return globalRequestQueue.enqueue(async () => {
    try {
      return await fetchWithRetry(fetchFn, maxRetries, retryDelay);
    } catch (error) {
      console.error("请求最终失败:", error);
      if (showErrorToast) {
        toast.error(errorMessage, {
          description: error instanceof Error ? error.message : "未知错误"
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
export const setCacheData = <T>(key: string, data: T, ttlMs = 3600000): void => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttlMs
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