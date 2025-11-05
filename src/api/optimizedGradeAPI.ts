/**
 * 优化的成绩数据API - 后端优化版本
 * 集成缓存、错误重试、统计预计算等优化策略
 */

import { supabase } from "@/integrations/supabase/client";
import {
  GradeRecord,
  GradeFilter,
  GradeDataResponse,
  GradeStatistics,
} from "@/types/grade";

// 缓存配置
const CACHE_CONFIG = {
  statistics: 60 * 1000, // 统计数据缓存1分钟
  gradeData: 30 * 1000, // 成绩数据缓存30秒
  classList: 5 * 60 * 1000, // 班级列表缓存5分钟
};

// 内存缓存实现
class APICache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new APICache();

// 定期清理缓存
setInterval(() => apiCache.cleanup(), 60 * 1000);

// 重试配置
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
};

// 指数退避重试
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number = RETRY_CONFIG.maxAttempts
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;

    const delay = Math.min(
      RETRY_CONFIG.baseDelay * 2 ** (RETRY_CONFIG.maxAttempts - attempts),
      RETRY_CONFIG.maxDelay
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, attempts - 1);
  }
}

/**
 * 优化的成绩数据获取 - 使用数据库端统计
 */
export async function fetchOptimizedGradeData(
  examId?: string,
  filter?: GradeFilter,
  pagination: { page?: number; pageSize?: number } = {}
): Promise<GradeDataResponse> {
  const cacheKey = `gradeData:${JSON.stringify({ examId, filter, pagination })}`;

  // 检查缓存
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    const { page = 1, pageSize = 50 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 使用数据库函数进行优化查询
    const query = supabase.rpc("get_grade_data_optimized", {
      p_exam_id: examId,
      p_class_filter: filter?.class,
      p_grade_level_filter: filter?.gradeLevel,
      p_score_min: filter?.scoreRange?.min,
      p_score_max: filter?.scoreRange?.max,
      p_limit: pageSize,
      p_offset: from,
    });

    const { data, error } = await query;

    if (error) throw error;

    const response: GradeDataResponse = {
      data: data?.records || [],
      total: data?.total_count || 0,
      statistics: data?.statistics,
    };

    // 缓存结果
    apiCache.set(cacheKey, response, CACHE_CONFIG.gradeData);

    return response;
  });

  return result;
}

/**
 * 获取预计算的统计数据
 */
export async function fetchPrecomputedStatistics(
  examId: string,
  filters?: GradeFilter
): Promise<{ data: GradeStatistics; error?: string }> {
  const cacheKey = `statistics:${examId}:${JSON.stringify(filters)}`;

  // 检查缓存
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await withRetry(async () => {
      const { data, error } = await supabase.rpc("get_grade_statistics", {
        p_exam_id: examId,
        p_class_filter: filters?.class,
        p_subject_filter: filters?.subject,
      });

      if (error) throw error;
      return { data };
    });

    // 缓存统计数据
    apiCache.set(cacheKey, result, CACHE_CONFIG.statistics);
    return result;
  } catch (error) {
    return {
      data: {} as GradeStatistics,
      error: error instanceof Error ? error.message : "获取统计数据失败",
    };
  }
}

/**
 * 批量预取数据 - 智能预加载
 */
export async function prefetchGradeData(
  examIds: string[],
  commonFilters?: GradeFilter
): Promise<void> {
  const prefetchPromises = examIds.map((examId) =>
    fetchOptimizedGradeData(examId, commonFilters, {
      page: 1,
      pageSize: 50,
    }).catch((error) => console.warn(`预取数据失败 ${examId}:`, error))
  );

  await Promise.allSettled(prefetchPromises);
}

/**
 * 实时数据刷新检查
 */
export async function checkDataFreshness(examId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_data_freshness", {
      p_exam_id: examId,
    });

    if (error) throw error;
    return data?.is_fresh || false;
  } catch (error) {
    console.warn("检查数据新鲜度失败:", error);
    return false;
  }
}

/**
 * 清理相关缓存
 */
export function clearGradeDataCache(examId?: string) {
  if (examId) {
    // 清理特定考试的缓存
    for (const key of apiCache["cache"].keys()) {
      if (key.includes(examId)) {
        apiCache["cache"].delete(key);
      }
    }
  } else {
    // 清理所有缓存
    apiCache.clear();
  }
}

// 导出缓存实例用于调试
export { apiCache };
