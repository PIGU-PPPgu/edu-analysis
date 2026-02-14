/**
 * API重试机制 - 指数退避重试工具
 *
 * 功能：
 * - 指数退避重试（1s, 2s, 4s）
 * - 智能错误分类（仅对可重试错误进行重试）
 * - 超时控制
 * - 类型安全的Supabase操作包装
 */

import { PostgrestError } from "@supabase/supabase-js";
import { logError, logInfo } from "./logger";

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /** 最大重试次数，默认3次 */
  maxRetries?: number;
  /** 初始延迟时间（毫秒），默认1000ms */
  initialDelay?: number;
  /** 操作超时时间（毫秒），默认30000ms */
  timeout?: number;
  /** 自定义重试条件判断函数 */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** 操作名称，用于日志记录 */
  operationName?: string;
}

/**
 * 默认重试配置
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  timeout: 30000,
  shouldRetry: isRetryableError,
  operationName: "API操作",
};

/**
 * 判断错误是否可重试
 *
 * 可重试的错误类型：
 * - 网络错误（ECONNRESET, ETIMEDOUT, ENOTFOUND等）
 * - 超时错误
 * - 临时服务器错误（503 Service Unavailable, 429 Too Many Requests）
 * - Supabase临时错误
 */
export function isRetryableError(error: any): boolean {
  // 网络错误
  if (error?.code) {
    const networkErrors = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNREFUSED",
      "ENETUNREACH",
      "EAI_AGAIN",
    ];
    if (networkErrors.includes(error.code)) {
      return true;
    }
  }

  // 超时错误
  if (error?.message) {
    const timeoutPatterns = [
      /timeout/i,
      /timed out/i,
      /time out/i,
      /request timeout/i,
    ];
    if (timeoutPatterns.some((pattern) => pattern.test(error.message))) {
      return true;
    }
  }

  // HTTP状态码错误
  if (error?.status) {
    const retryableStatuses = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error (部分情况)
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];
    if (retryableStatuses.includes(error.status)) {
      return true;
    }
  }

  // PostgrestError特殊处理
  if (isPostgrestError(error)) {
    // 某些Supabase错误不应重试（如权限错误、数据验证错误）
    const nonRetryableCodes = [
      "23505", // unique_violation
      "23503", // foreign_key_violation
      "42501", // insufficient_privilege
      "42P01", // undefined_table
    ];
    if (error.code && nonRetryableCodes.includes(error.code)) {
      return false;
    }
    // 其他数据库错误可能是临时的
    return true;
  }

  // 默认不重试
  return false;
}

/**
 * 类型守卫：检查是否为PostgrestError
 */
function isPostgrestError(error: any): error is PostgrestError {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    "details" in error
  );
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟时间
 *
 * @param attempt 当前尝试次数（从0开始）
 * @param initialDelay 初始延迟时间（毫秒）
 * @returns 延迟时间（毫秒）
 *
 * @example
 * getBackoffDelay(0, 1000) // 1000ms (1s)
 * getBackoffDelay(1, 1000) // 2000ms (2s)
 * getBackoffDelay(2, 1000) // 4000ms (4s)
 */
export function getBackoffDelay(attempt: number, initialDelay: number): number {
  return initialDelay * Math.pow(2, attempt);
}

/**
 * 带超时的Promise包装
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName}超时（${timeoutMs}ms）`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * 指数退避重试函数
 *
 * @param fn 要执行的异步函数
 * @param options 重试配置选项
 * @returns 函数执行结果
 *
 * @example
 * const result = await retryWithExponentialBackoff(
 *   async () => fetchData(),
 *   { maxRetries: 3, operationName: '获取数据' }
 * );
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      logInfo(
        `${opts.operationName} - 尝试 ${attempt + 1}/${opts.maxRetries + 1}`
      );

      // 带超时执行
      const result = await withTimeout(fn(), opts.timeout, opts.operationName);

      // 成功则返回结果
      if (attempt > 0) {
        logInfo(`${opts.operationName} - 重试成功（第${attempt + 1}次尝试）`);
      }
      return result;
    } catch (error) {
      lastError = error;

      // 检查是否应该重试
      const shouldRetry = opts.shouldRetry(error, attempt);
      const isLastAttempt = attempt === opts.maxRetries;

      if (!shouldRetry || isLastAttempt) {
        logError(
          `${opts.operationName} - ${isLastAttempt ? "达到最大重试次数" : "不可重试的错误"}`,
          { error, attempt: attempt + 1 }
        );
        throw error;
      }

      // 计算退避延迟
      const backoffDelay = getBackoffDelay(attempt, opts.initialDelay);
      logInfo(
        `${opts.operationName} - 第${attempt + 1}次失败，${backoffDelay}ms后重试`,
        { error: error?.message || error }
      );

      // 等待后重试
      await delay(backoffDelay);
    }
  }

  // 理论上不会到达这里，但为了类型安全
  throw lastError;
}

/**
 * Supabase操作包装器 - 自动添加重试机制
 *
 * @param operation Supabase操作函数
 * @param options 重试配置选项
 * @returns 包装后的操作结果
 *
 * @example
 * // 查询操作
 * const { data, error } = await withRetry(
 *   () => supabase.from('students').select('*'),
 *   { operationName: '查询学生列表' }
 * );
 *
 * @example
 * // 插入操作
 * const { data, error } = await withRetry(
 *   () => supabase.from('grades').insert(newGrade),
 *   { operationName: '插入成绩', maxRetries: 2 }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithExponentialBackoff(operation, {
    ...options,
    shouldRetry: (error, attempt) => {
      // 如果提供了自定义判断函数，优先使用
      if (options.shouldRetry) {
        return options.shouldRetry(error, attempt);
      }
      // 否则使用默认判断
      return isRetryableError(error);
    },
  });
}

/**
 * 创建带重试的Supabase查询包装器（仅用于SELECT操作）
 *
 * @example
 * const query = createRetryableQuery(supabase);
 * const { data, error } = await query
 *   .from('students')
 *   .select('*')
 *   .eq('class_id', classId);
 */
export function createRetryableQuery(supabaseClient: any) {
  return {
    from: (table: string) => {
      const builder = supabaseClient.from(table);
      const originalThen = builder.then?.bind(builder);

      // 包装then方法，添加重试逻辑
      if (originalThen) {
        builder.then = function (onfulfilled?: any, onrejected?: any) {
          return withRetry(() => originalThen(onfulfilled, onrejected), {
            operationName: `查询${table}表`,
          });
        };
      }

      return builder;
    },
  };
}

/**
 * 便捷函数：包装Supabase读操作（SELECT）
 * 高安全性，适合频繁调用
 */
export async function retryableSelect<T = any>(
  operation: () => Promise<T>,
  operationName: string = "查询操作"
): Promise<T> {
  return withRetry(operation, {
    operationName,
    maxRetries: 3, // 读操作可以多次重试
  });
}

/**
 * 便捷函数：包装Supabase写操作（INSERT/UPDATE）
 * 谨慎重试，避免重复写入
 *
 * 注意: 该函数直接返回操作结果，保持原有的返回类型
 * 对于Supabase操作，会保留{data, error}结构
 */
export async function retryableWrite<T = any>(
  operation: () => Promise<T>,
  operationName: string = "写入操作",
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(operation, {
    operationName,
    maxRetries: 2, // 写操作重试次数较少
    shouldRetry: (error, attempt) => {
      // 写操作更谨慎：只重试明确的网络错误和超时
      if (error?.code && ["ECONNRESET", "ETIMEDOUT"].includes(error.code)) {
        return true;
      }
      if (error?.status && [408, 503, 504].includes(error.status)) {
        return true;
      }
      return false;
    },
    ...options,
  });
}
