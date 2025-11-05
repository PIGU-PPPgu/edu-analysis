/**
 * 🔧 查询优化工具集
 * 配合数据库索引策略，提供前端查询优化方案
 */

import { SupabaseClient } from "@supabase/supabase-js";

// 查询性能配置
export const QUERY_PERFORMANCE_CONFIG = {
  // 默认分页大小
  DEFAULT_PAGE_SIZE: 50,
  // 大数据集分页大小
  LARGE_DATA_PAGE_SIZE: 100,
  // 实时查询限制
  REALTIME_LIMIT: 20,
  // 缓存时间（毫秒）
  CACHE_DURATION: 5 * 60 * 1000, // 5分钟
};

// 优化的查询构建器
export class OptimizedQueryBuilder {
  private supabase: SupabaseClient;
  private queryCache = new Map<string, { data: any; timestamp: number }>();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 🎯 优化的学生成绩查询
   * 利用索引: idx_grade_data_student_exam_date
   */
  async getStudentGrades(
    studentId: string,
    options: {
      limit?: number;
      examId?: string;
      dateRange?: { start: string; end: string };
    } = {}
  ) {
    const cacheKey = `student_grades_${studentId}_${JSON.stringify(options)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from("grade_data")
      .select(
        `
        id,
        exam_id,
        exam_title,
        exam_date,
        total_score,
        chinese_score,
        math_score,
        english_score,
        chinese_grade,
        math_grade,
        english_grade,
        created_at
      `
      )
      .eq("student_id", studentId)
      .order("exam_date", { ascending: false });

    if (options.examId) {
      query = query.eq("exam_id", options.examId);
    }

    if (options.dateRange) {
      query = query
        .gte("exam_date", options.dateRange.start)
        .lte("exam_date", options.dateRange.end);
    }

    query = query.limit(
      options.limit || QUERY_PERFORMANCE_CONFIG.DEFAULT_PAGE_SIZE
    );

    const result = await query;

    if (!result.error) {
      this.setCachedResult(cacheKey, result.data);
    }

    return result;
  }

  /**
   * 🎯 优化的班级成绩查询
   * 利用索引: idx_grade_data_class_exam
   */
  async getClassGrades(
    className: string,
    examId?: string,
    options: {
      includeDetails?: boolean;
      limit?: number;
    } = {}
  ) {
    const cacheKey = `class_grades_${className}_${examId}_${JSON.stringify(options)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const selectFields = options.includeDetails
      ? "*"
      : `
        student_id,
        name,
        total_score,
        chinese_score,
        math_score,
        english_score,
        total_grade
      `;

    let query = this.supabase
      .from("grade_data")
      .select(selectFields)
      .eq("class_name", className)
      .order("total_score", { ascending: false });

    if (examId) {
      query = query.eq("exam_id", examId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const result = await query;

    if (!result.error) {
      this.setCachedResult(cacheKey, result.data);
    }

    return result;
  }

  /**
   * 🎯 优化的考试统计查询
   * 利用索引: idx_grade_data_exam_comprehensive
   */
  async getExamStatistics(examId: string) {
    const cacheKey = `exam_stats_${examId}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    // 使用聚合查询，利用索引优化
    const result = await this.supabase.rpc("get_exam_statistics", {
      p_exam_id: examId,
    });

    if (!result.error) {
      this.setCachedResult(cacheKey, result.data);
    }

    return result;
  }

  /**
   * 🎯 优化的最近成绩查询
   * 利用索引: idx_grade_data_recent, idx_grade_data_timeline
   */
  async getRecentGrades(
    options: {
      days?: number;
      limit?: number;
      className?: string;
    } = {}
  ) {
    const { days = 30, limit = QUERY_PERFORMANCE_CONFIG.REALTIME_LIMIT } =
      options;
    const cacheKey = `recent_grades_${JSON.stringify(options)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = this.supabase
      .from("grade_data")
      .select(
        `
        id,
        student_id,
        name,
        class_name,
        exam_title,
        exam_date,
        total_score,
        created_at
      `
      )
      .gte("exam_date", cutoffDate.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options.className) {
      query = query.eq("class_name", options.className);
    }

    const result = await query;

    if (!result.error) {
      this.setCachedResult(cacheKey, result.data);
    }

    return result;
  }

  /**
   * 🎯 优化的科目成绩查询
   * 利用索引: idx_grade_data_chinese, idx_grade_data_math, idx_grade_data_english
   */
  async getSubjectGrades(
    subject: "chinese" | "math" | "english" | "physics" | "chemistry",
    options: {
      examId?: string;
      className?: string;
      minScore?: number;
      limit?: number;
    } = {}
  ) {
    const cacheKey = `subject_grades_${subject}_${JSON.stringify(options)}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const scoreField = `${subject}_score`;
    const gradeField = `${subject}_grade`;

    let query = this.supabase
      .from("grade_data")
      .select(
        `
        student_id,
        name,
        class_name,
        exam_id,
        exam_title,
        ${scoreField},
        ${gradeField}
      `
      )
      .not(scoreField, "is", null)
      .order(scoreField, { ascending: false });

    if (options.examId) {
      query = query.eq("exam_id", options.examId);
    }

    if (options.className) {
      query = query.eq("class_name", options.className);
    }

    if (options.minScore) {
      query = query.gte(scoreField, options.minScore);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const result = await query;

    if (!result.error) {
      this.setCachedResult(cacheKey, result.data);
    }

    return result;
  }

  /**
   * 🎯 批量查询优化
   * 减少数据库往返次数
   */
  async getBatchData(studentIds: string[], examId: string) {
    const cacheKey = `batch_data_${examId}_${studentIds.join(",")}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const result = await this.supabase
      .from("grade_data")
      .select("*")
      .eq("exam_id", examId)
      .in("student_id", studentIds);

    if (!result.error) {
      this.setCachedResult(cacheKey, result.data);
    }

    return result;
  }

  /**
   * 缓存管理
   */
  private getCachedResult(key: string) {
    const cached = this.queryCache.get(key);
    if (
      cached &&
      Date.now() - cached.timestamp < QUERY_PERFORMANCE_CONFIG.CACHE_DURATION
    ) {
      console.log(`📋 缓存命中: ${key}`);
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 缓存存储: ${key}`);
  }

  /**
   * 清理过期缓存
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp >= QUERY_PERFORMANCE_CONFIG.CACHE_DURATION) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clearAllCache() {
    this.queryCache.clear();
    console.log("🧹 所有缓存已清空");
  }
}

/**
 * 分页查询优化器
 */
export class PaginationOptimizer {
  static calculateOptimalPageSize(totalRecords: number): number {
    if (totalRecords < 100) return totalRecords;
    if (totalRecords < 1000) return QUERY_PERFORMANCE_CONFIG.DEFAULT_PAGE_SIZE;
    return QUERY_PERFORMANCE_CONFIG.LARGE_DATA_PAGE_SIZE;
  }

  static async getPaginatedData<T>(
    queryFn: (
      offset: number,
      limit: number
    ) => Promise<{ data: T[] | null; count?: number; error: any }>,
    page: number = 1,
    pageSize?: number
  ) {
    const limit = pageSize || QUERY_PERFORMANCE_CONFIG.DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;

    const result = await queryFn(offset, limit);

    return {
      data: result.data || [],
      page,
      pageSize: limit,
      totalCount: result.count || 0,
      totalPages: result.count ? Math.ceil(result.count / limit) : 0,
      hasNextPage: result.data && result.data.length === limit,
      error: result.error,
    };
  }
}

/**
 * 查询性能监控
 */
export class QueryPerformanceMonitor {
  private static queryTimes = new Map<string, number[]>();

  static startTimer(queryName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }

      this.queryTimes.get(queryName)!.push(duration);

      console.log(`🔍 查询性能: ${queryName} - ${duration.toFixed(2)}ms`);

      // 如果查询时间超过阈值，发出警告
      if (duration > 1000) {
        console.warn(
          `⚠️ 慢查询警告: ${queryName} 耗时 ${duration.toFixed(2)}ms`
        );
      }
    };
  }

  static getQueryStats(queryName: string) {
    const times = this.queryTimes.get(queryName) || [];
    if (times.length === 0) return null;

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      count: times.length,
      average: avg,
      min,
      max,
      total: times.reduce((sum, time) => sum + time, 0),
    };
  }

  static getAllStats() {
    const stats: Record<string, any> = {};
    for (const [queryName] of this.queryTimes) {
      stats[queryName] = this.getQueryStats(queryName);
    }
    return stats;
  }
}

/**
 * 智能查询建议器
 */
export class QuerySuggestionEngine {
  static analyzeMostUsedQueries(supabase: SupabaseClient) {
    // 这里可以接入实际的查询日志分析
    console.log("📊 分析查询模式...");

    return {
      suggestions: [
        "考虑为频繁查询的字段组合添加复合索引",
        "使用SELECT指定字段而不是SELECT *",
        "为大数据集查询添加LIMIT",
        "使用适当的WHERE条件减少扫描行数",
      ],
    };
  }

  static recommendIndexes(queryPatterns: string[]): string[] {
    const recommendations = [];

    if (queryPatterns.includes("student_id + exam_date")) {
      recommendations.push(
        "CREATE INDEX ON grade_data(student_id, exam_date DESC)"
      );
    }

    if (queryPatterns.includes("class_name + total_score")) {
      recommendations.push(
        "CREATE INDEX ON grade_data(class_name, total_score DESC)"
      );
    }

    return recommendations;
  }
}

// 导出单例实例
let optimizedQueryInstance: OptimizedQueryBuilder | null = null;

export const getOptimizedQuery = (
  supabase: SupabaseClient
): OptimizedQueryBuilder => {
  if (!optimizedQueryInstance) {
    optimizedQueryInstance = new OptimizedQueryBuilder(supabase);
  }
  return optimizedQueryInstance;
};
