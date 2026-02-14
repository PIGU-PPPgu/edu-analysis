/**
 * API重试机制单元测试
 *
 * 测试场景：
 * 1. 成功重试场景
 * 2. 最大重试次数限制
 * 3. 超时处理
 * 4. 错误分类（可重试 vs 不可重试）
 * 5. 指数退避延迟计算
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  retryWithExponentialBackoff,
  withRetry,
  isRetryableError,
  getBackoffDelay,
  retryableSelect,
  retryableWrite,
} from "../apiRetry";

describe("API重试机制", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("isRetryableError - 错误分类", () => {
    it("应该识别网络错误为可重试", () => {
      const networkErrors = [
        { code: "ECONNRESET" },
        { code: "ETIMEDOUT" },
        { code: "ENOTFOUND" },
        { code: "ECONNREFUSED" },
      ];

      networkErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it("应该识别超时错误为可重试", () => {
      const timeoutErrors = [
        { message: "Request timeout" },
        { message: "Operation timed out" },
        { message: "request timeout exceeded" },
      ];

      timeoutErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it("应该识别临时服务器错误为可重试", () => {
      const serverErrors = [
        { status: 408 }, // Request Timeout
        { status: 429 }, // Too Many Requests
        { status: 502 }, // Bad Gateway
        { status: 503 }, // Service Unavailable
        { status: 504 }, // Gateway Timeout
      ];

      serverErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it("应该识别数据库约束错误为不可重试", () => {
      const dbErrors = [
        { code: "23505", message: "unique violation" }, // unique_violation
        { code: "23503", message: "foreign key violation" }, // foreign_key_violation
        { code: "42501", message: "insufficient privilege" }, // insufficient_privilege
      ];

      dbErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(false);
      });
    });

    it("应该识别权限错误为不可重试", () => {
      const authErrors = [
        { status: 401, message: "Unauthorized" },
        { status: 403, message: "Forbidden" },
      ];

      authErrors.forEach((error) => {
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe("getBackoffDelay - 指数退避计算", () => {
    it("应该正确计算指数退避延迟", () => {
      expect(getBackoffDelay(0, 1000)).toBe(1000); // 1s
      expect(getBackoffDelay(1, 1000)).toBe(2000); // 2s
      expect(getBackoffDelay(2, 1000)).toBe(4000); // 4s
      expect(getBackoffDelay(3, 1000)).toBe(8000); // 8s
    });

    it("应该支持自定义初始延迟", () => {
      expect(getBackoffDelay(0, 500)).toBe(500);
      expect(getBackoffDelay(1, 500)).toBe(1000);
      expect(getBackoffDelay(2, 500)).toBe(2000);
    });
  });

  describe("retryWithExponentialBackoff - 重试成功场景", () => {
    it("应该在第一次尝试成功时立即返回", async () => {
      const successFn = vi.fn().mockResolvedValue("success");

      const result = await retryWithExponentialBackoff(successFn, {
        maxRetries: 3,
        initialDelay: 1000,
        operationName: "测试操作",
      });

      expect(result).toBe("success");
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it("应该在第二次尝试成功时返回（经过1次重试）", async () => {
      const failOnceFn = vi
        .fn()
        .mockRejectedValueOnce({ code: "ECONNRESET" })
        .mockResolvedValueOnce("success");

      const promise = retryWithExponentialBackoff(failOnceFn, {
        maxRetries: 3,
        initialDelay: 1000,
        operationName: "测试操作",
      });

      // 快进时间到第一次重试
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBe("success");
      expect(failOnceFn).toHaveBeenCalledTimes(2);
    });

    it("应该在第三次尝试成功时返回（经过2次重试）", async () => {
      const failTwiceFn = vi
        .fn()
        .mockRejectedValueOnce({ code: "ETIMEDOUT" })
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce("success");

      const promise = retryWithExponentialBackoff(failTwiceFn, {
        maxRetries: 3,
        initialDelay: 1000,
        operationName: "测试操作",
      });

      // 第一次重试：1s后
      await vi.advanceTimersByTimeAsync(1000);
      // 第二次重试：再2s后
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe("success");
      expect(failTwiceFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("retryWithExponentialBackoff - 最大重试次数", () => {
    it("应该在达到最大重试次数后抛出错误", async () => {
      const alwaysFailFn = vi.fn().mockRejectedValue({ code: "ECONNRESET" });

      const promise = retryWithExponentialBackoff(alwaysFailFn, {
        maxRetries: 2,
        initialDelay: 1000,
        operationName: "测试操作",
      });

      // 第一次重试：1s后
      await vi.advanceTimersByTimeAsync(1000);
      // 第二次重试：再2s后
      await vi.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toEqual({ code: "ECONNRESET" });
      expect(alwaysFailFn).toHaveBeenCalledTimes(3); // 初始 + 2次重试
    });

    it("应该遵守maxRetries=0配置（不重试）", async () => {
      const failFn = vi.fn().mockRejectedValue({ code: "ETIMEDOUT" });

      await expect(
        retryWithExponentialBackoff(failFn, {
          maxRetries: 0,
          operationName: "测试操作",
        })
      ).rejects.toEqual({ code: "ETIMEDOUT" });

      expect(failFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("retryWithExponentialBackoff - 不可重试错误", () => {
    it("应该立即抛出不可重试的错误（权限错误）", async () => {
      const authErrorFn = vi.fn().mockRejectedValue({
        status: 401,
        message: "Unauthorized",
      });

      await expect(
        retryWithExponentialBackoff(authErrorFn, {
          maxRetries: 3,
          operationName: "测试操作",
        })
      ).rejects.toEqual({ status: 401, message: "Unauthorized" });

      expect(authErrorFn).toHaveBeenCalledTimes(1); // 不应重试
    });

    it("应该立即抛出不可重试的错误（数据库约束）", async () => {
      const dbErrorFn = vi.fn().mockRejectedValue({
        code: "23505",
        message: "unique_violation",
      });

      await expect(
        retryWithExponentialBackoff(dbErrorFn, {
          maxRetries: 3,
          operationName: "测试操作",
        })
      ).rejects.toEqual({ code: "23505", message: "unique_violation" });

      expect(dbErrorFn).toHaveBeenCalledTimes(1); // 不应重试
    });
  });

  describe("retryWithExponentialBackoff - 超时处理", () => {
    it("应该在操作超时时抛出超时错误", async () => {
      const slowFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve("too slow"), 10000);
          })
      );

      const promise = retryWithExponentialBackoff(slowFn, {
        timeout: 2000,
        maxRetries: 0,
        operationName: "慢速操作",
      });

      // 快进到超时时间
      await vi.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow("慢速操作超时（2000ms）");
    });
  });

  describe("withRetry - Supabase包装器", () => {
    it("应该成功包装Supabase查询操作", async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        data: [{ id: 1, name: "Test" }],
        error: null,
      });

      const result = await withRetry(mockQuery, {
        operationName: "查询学生列表",
      });

      expect(result).toEqual({
        data: [{ id: 1, name: "Test" }],
        error: null,
      });
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("应该在查询失败时重试", async () => {
      const mockQuery = vi
        .fn()
        .mockRejectedValueOnce({ code: "ECONNRESET" })
        .mockResolvedValueOnce({ data: [], error: null });

      const promise = withRetry(mockQuery, {
        operationName: "查询操作",
        maxRetries: 2,
      });

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual({ data: [], error: null });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe("retryableSelect - 读操作便捷函数", () => {
    it("应该默认重试3次", async () => {
      const selectFn = vi
        .fn()
        .mockRejectedValueOnce({ status: 503 })
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce({ data: [] });

      const promise = retryableSelect(selectFn, "查询测试");

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      expect(selectFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("retryableWrite - 写操作便捷函数", () => {
    it("应该默认重试2次（写操作更谨慎）", async () => {
      const writeFn = vi
        .fn()
        .mockRejectedValueOnce({ code: "ETIMEDOUT" })
        .mockResolvedValueOnce({ data: { id: 1 } });

      const promise = retryableWrite(writeFn, "写入测试");

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual({ data: { id: 1 } });
      expect(writeFn).toHaveBeenCalledTimes(2);
    });

    it("应该只对明确的网络错误重试", async () => {
      const writeFn = vi.fn().mockRejectedValue({
        code: "23505",
        message: "unique constraint",
      });

      await expect(retryableWrite(writeFn, "写入测试")).rejects.toEqual({
        code: "23505",
        message: "unique constraint",
      });

      expect(writeFn).toHaveBeenCalledTimes(1); // 不应重试约束错误
    });
  });

  describe("性能和边界情况", () => {
    it("应该正确处理空错误对象", () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
      expect(isRetryableError({})).toBe(false);
    });

    it("应该正确处理字符串错误", () => {
      expect(isRetryableError("connection reset")).toBe(false);
    });

    it("应该支持自定义重试判断函数", async () => {
      const customFn = vi
        .fn()
        .mockRejectedValueOnce({ custom: "error" })
        .mockResolvedValueOnce("success");

      const customShouldRetry = (error: any) => error?.custom === "error";

      const promise = retryWithExponentialBackoff(customFn, {
        shouldRetry: customShouldRetry,
        maxRetries: 2,
        initialDelay: 100,
        operationName: "自定义重试",
      });

      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result).toBe("success");
      expect(customFn).toHaveBeenCalledTimes(2);
    });
  });
});
