/**
 * 统一API客户端 - 核心基础设施
 *
 * 功能：
 * - 统一HTTP客户端
 * - 请求/响应拦截
 * - 错误处理
 * - 超时控制
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError, logInfo } from "@/utils/logger";

export interface APIRequestConfig {
  timeout?: number;
  retries?: number;
  showToast?: boolean;
  skipAuth?: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * 统一API客户端类
 */
export class APIClient {
  private defaultTimeout = 30000; // 30秒
  private defaultRetries = 3;

  /**
   * 执行数据库查询
   */
  async query<T = any>(
    table: string,
    options: {
      select?: string;
      filter?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      single?: boolean;
    } = {},
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    try {
      logInfo(`执行数据库查询: ${table}`, options);

      let query: any = supabase.from(table);

      // 添加选择字段
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select("*");
      }

      // 添加过滤条件
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // 添加排序
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // 添加限制
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // 执行查询
      const response = options.single ? await query.single() : await query;

      if (response.error) {
        throw response.error;
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  /**
   * 插入数据
   */
  async insert<T = any>(
    table: string,
    data: any,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    try {
      logInfo(`插入数据到 ${table}`, {
        count: Array.isArray(data) ? data.length : 1,
      });

      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw error;
      }

      if (config.showToast !== false) {
        toast.success("数据保存成功");
      }

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  /**
   * 更新数据
   */
  async update<T = any>(
    table: string,
    data: any,
    filter: Record<string, any>,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    try {
      logInfo(`更新 ${table} 数据`, { filter, data });

      let query: any = supabase.from(table).update(data);

      // 添加过滤条件
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();

      if (error) {
        throw error;
      }

      if (config.showToast !== false) {
        toast.success("数据更新成功");
      }

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  /**
   * 删除数据
   */
  async delete<T = any>(
    table: string,
    filter: Record<string, any>,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    try {
      logInfo(`删除 ${table} 数据`, filter);

      let query: any = supabase.from(table).delete();

      // 添加过滤条件
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: result, error } = await query.select();

      if (error) {
        throw error;
      }

      if (config.showToast !== false) {
        toast.success("数据删除成功");
      }

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  /**
   * 执行RPC函数
   */
  async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {},
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    try {
      logInfo(`执行RPC函数: ${functionName}`, params);

      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  /**
   * 批量操作
   */
  async batch(
    operations: Array<() => Promise<any>>
  ): Promise<APIResponse<any[]>> {
    try {
      logInfo("执行批量操作", { count: operations.length });

      const results = await Promise.allSettled(operations.map((op) => op()));

      const successes = results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      const failures = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected"
        )
        .map((result) => result.reason);

      if (failures.length > 0) {
        logError("批量操作部分失败", {
          failures: failures.length,
          successes: successes.length,
        });
      }

      return {
        success: failures.length === 0,
        data: successes,
        error:
          failures.length > 0 ? `${failures.length} 个操作失败` : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, config: APIRequestConfig = {}): APIResponse {
    logError("API请求失败", error);

    let errorMessage = "操作失败";
    let errorCode = "UNKNOWN_ERROR";

    if (error?.message) {
      errorMessage = error.message;
    }

    if (error?.code) {
      errorCode = error.code;
    }

    // 根据错误类型提供友好提示
    if (errorMessage.includes("unique constraint")) {
      errorMessage = "数据已存在，无法重复添加";
      errorCode = "DUPLICATE_ERROR";
    } else if (errorMessage.includes("foreign key")) {
      errorMessage = "数据关联错误，请检查相关数据";
      errorCode = "FOREIGN_KEY_ERROR";
    } else if (errorMessage.includes("permission")) {
      errorMessage = "权限不足，无法执行此操作";
      errorCode = "PERMISSION_ERROR";
    } else if (errorMessage.includes("network")) {
      errorMessage = "网络连接失败，请检查网络状态";
      errorCode = "NETWORK_ERROR";
    }

    if (config.showToast !== false) {
      toast.error(errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    };
  }
}

// 导出单例实例
export const apiClient = new APIClient();

// 向后兼容的API函数
export const handleApiError = (error: any) => {
  return apiClient["handleError"](error, { showToast: true });
};
