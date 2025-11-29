/**
 * 🗄️ 第6周数据库查询优化器
 * 智能优化数据库查询，提供缓存、索引建议和查询分析
 */

import { supabase } from "../../integrations/supabase/client";

// 查询性能指标
interface QueryMetrics {
  queryId: string;
  sql: string;
  executionTime: number;
  rows: number;
  cached: boolean;
  timestamp: number;
}

// 查询缓存配置
interface CacheConfig {
  ttl: number; // 缓存生存时间(毫秒)
  maxSize: number; // 最大缓存条目数
  enableLogging: boolean;
}

// 查询优化建议
interface QueryOptimization {
  type: "index" | "cache" | "query" | "limit";
  severity: "critical" | "warning" | "info";
  message: string;
  solution: string;
  sql?: string;
}

export class DatabaseQueryOptimizer {
  private queryCache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private queryMetrics: QueryMetrics[] = [];
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5分钟默认缓存
      maxSize: 200,
      enableLogging: process.env.NODE_ENV === "development",
      ...config,
    };
  }

  /**
   * 优化查询执行
   */
  async optimizedQuery<T = any>(
    queryId: string,
    queryFn: () => Promise<{ data: T; error: any }>,
    options: {
      cacheTtl?: number;
      forceRefresh?: boolean;
      enableCache?: boolean;
    } = {}
  ): Promise<{ data: T; error: any; fromCache?: boolean }> {
    const startTime = performance.now();
    const enableCache = options.enableCache !== false;
    const cacheKey = this.generateCacheKey(queryId);

    // 检查缓存
    if (enableCache && !options.forceRefresh) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.recordQueryMetric({
          queryId,
          sql: "CACHED",
          executionTime: performance.now() - startTime,
          rows: Array.isArray(cached.data) ? cached.data.length : 1,
          cached: true,
          timestamp: Date.now(),
        });

        return { ...cached, fromCache: true };
      }
    }

    // 执行查询
    try {
      const result = await queryFn();
      const executionTime = performance.now() - startTime;

      // 记录性能指标
      this.recordQueryMetric({
        queryId,
        sql: "EXECUTED",
        executionTime,
        rows: Array.isArray(result.data) ? result.data.length : 1,
        cached: false,
        timestamp: Date.now(),
      });

      // 缓存结果
      if (enableCache && result.data && !result.error) {
        this.setCachedResult(
          cacheKey,
          result,
          options.cacheTtl || this.config.ttl
        );
      }

      // 性能警告
      if (executionTime > 1000) {
        // 超过1秒
        this.logPerformanceWarning(queryId, executionTime);
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      this.recordQueryMetric({
        queryId,
        sql: "ERROR",
        executionTime,
        rows: 0,
        cached: false,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(queryId: string): string {
    return `query_${queryId}`;
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(cacheKey: string): any {
    const cached = this.queryCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.queryCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * 设置缓存结果
   */
  private setCachedResult(cacheKey: string, data: any, ttl: number): void {
    // 清理过期缓存
    this.cleanupExpiredCache();

    // 限制缓存大小
    if (this.queryCache.size >= this.config.maxSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 记录查询指标
   */
  private recordQueryMetric(metric: QueryMetrics): void {
    this.queryMetrics.push(metric);

    // 限制指标数组大小
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.shift();
    }

    if (this.config.enableLogging) {
      console.log(
        `🔍 [QueryOptimizer] ${metric.queryId}: ${metric.executionTime.toFixed(2)}ms ${metric.cached ? "(cached)" : ""}`
      );
    }
  }

  /**
   * 记录性能警告
   */
  private logPerformanceWarning(queryId: string, executionTime: number): void {
    if (this.config.enableLogging) {
      console.warn(
        `🐌 [QueryOptimizer] 慢查询警告: ${queryId} 耗时 ${executionTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * 获取查询性能分析
   */
  getPerformanceAnalysis(): {
    totalQueries: number;
    avgExecutionTime: number;
    slowQueries: QueryMetrics[];
    cacheHitRate: number;
    recommendations: QueryOptimization[];
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        avgExecutionTime: 0,
        slowQueries: [],
        cacheHitRate: 0,
        recommendations: [],
      };
    }

    const recentMetrics = this.queryMetrics.slice(-100); // 最近100个查询
    const executionTimes = recentMetrics.map((m) => m.executionTime);
    const avgExecutionTime =
      executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;

    const slowQueries = recentMetrics
      .filter((m) => m.executionTime > 500) // 超过500ms
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const cachedQueries = recentMetrics.filter((m) => m.cached).length;
    const cacheHitRate = (cachedQueries / recentMetrics.length) * 100;

    const recommendations = this.generateOptimizationRecommendations(
      recentMetrics,
      slowQueries,
      cacheHitRate
    );

    return {
      totalQueries: recentMetrics.length,
      avgExecutionTime,
      slowQueries,
      cacheHitRate,
      recommendations,
    };
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationRecommendations(
    metrics: QueryMetrics[],
    slowQueries: QueryMetrics[],
    cacheHitRate: number
  ): QueryOptimization[] {
    const recommendations: QueryOptimization[] = [];

    // 慢查询建议
    if (slowQueries.length > 0) {
      recommendations.push({
        type: "query",
        severity: slowQueries.length > 5 ? "critical" : "warning",
        message: `发现${slowQueries.length}个慢查询`,
        solution: "检查查询条件、添加索引、使用分页、优化JOIN操作",
      });
    }

    // 缓存命中率建议
    if (cacheHitRate < 30) {
      recommendations.push({
        type: "cache",
        severity: "warning",
        message: `缓存命中率过低: ${cacheHitRate.toFixed(2)}%`,
        solution: "增加缓存时间、优化缓存策略、使用更细粒度的缓存键",
      });
    }

    // 频繁查询建议
    const queryFrequency = new Map<string, number>();
    metrics.forEach((m) => {
      queryFrequency.set(m.queryId, (queryFrequency.get(m.queryId) || 0) + 1);
    });

    const frequentQueries = Array.from(queryFrequency.entries())
      .filter(([, count]) => count > 10)
      .sort((a, b) => b[1] - a[1]);

    if (frequentQueries.length > 0) {
      recommendations.push({
        type: "cache",
        severity: "info",
        message: `发现${frequentQueries.length}个高频查询`,
        solution: "考虑增加这些查询的缓存时间或使用物化视图",
      });
    }

    return recommendations;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.queryCache.clear();
    if (this.config.enableLogging) {
      console.log("🗑️ [QueryOptimizer] 缓存已清空");
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalEntries: number;
  } {
    const recentMetrics = this.queryMetrics.slice(-100);
    const cachedQueries = recentMetrics.filter((m) => m.cached).length;
    const hitRate =
      recentMetrics.length > 0
        ? (cachedQueries / recentMetrics.length) * 100
        : 0;

    return {
      size: this.queryCache.size,
      maxSize: this.config.maxSize,
      hitRate,
      totalEntries: recentMetrics.length,
    };
  }
}

// 全局查询优化器实例
export const queryOptimizer = new DatabaseQueryOptimizer();

// 常用查询优化封装
export const optimizedQueries = {
  /**
   * 优化的学生数据查询
   */
  async getStudents(classId?: string, limit: number = 50): Promise<any> {
    const queryId = `students_${classId || "all"}_${limit}`;

    return queryOptimizer.optimizedQuery(
      queryId,
      async () => {
        let query = supabase.from("students").select("*").limit(limit);

        if (classId) {
          query = query.eq("class_id", classId);
        }

        return query;
      },
      { cacheTtl: 10 * 60 * 1000 }
    ); // 10分钟缓存
  },

  /**
   * 优化的成绩数据查询
   */
  async getGradeData(examTitle: string, classNames?: string[]): Promise<any> {
    const queryId = `grade_data_${examTitle}_${classNames?.join(",") || "all"}`;

    return queryOptimizer.optimizedQuery(
      queryId,
      async () => {
        let query = supabase
          .from("grade_data_new")
          .select("*")
          .eq("exam_title", examTitle)
          .order("total_score", { ascending: false })
          .limit(1000);

        if (classNames && classNames.length > 0) {
          query = query.in("class_name", classNames);
        }

        return query;
      },
      { cacheTtl: 30 * 60 * 1000 }
    ); // 30分钟缓存
  },

  /**
   * 优化的班级统计查询
   */
  async getClassStats(className: string): Promise<any> {
    const queryId = `class_stats_${className}`;

    return queryOptimizer.optimizedQuery(
      queryId,
      async () => {
        return supabase.rpc("get_class_statistics", {
          class_name_param: className,
        });
      },
      { cacheTtl: 15 * 60 * 1000 }
    ); // 15分钟缓存
  },

  /**
   * 优化的作业查询
   */
  async getHomework(classId: string, limit: number = 20): Promise<any> {
    const queryId = `homework_${classId}_${limit}`;

    return queryOptimizer.optimizedQuery(
      queryId,
      async () => {
        return supabase
          .from("homework")
          .select(
            `
          *,
          homework_submissions(count)
        `
          )
          .eq("class_id", classId)
          .order("created_at", { ascending: false })
          .limit(limit);
      },
      { cacheTtl: 5 * 60 * 1000 }
    ); // 5分钟缓存
  },

  /**
   * 优化的预警查询
   */
  async getWarnings(studentId?: string, limit: number = 50): Promise<any> {
    const queryId = `warnings_${studentId || "all"}_${limit}`;

    return queryOptimizer.optimizedQuery(
      queryId,
      async () => {
        let query = supabase
          .from("warning_records")
          .select(
            `
          *,
          warning_rules(name, description)
        `
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (studentId) {
          query = query.eq("student_id", studentId);
        }

        return query;
      },
      { cacheTtl: 2 * 60 * 1000 }
    ); // 2分钟缓存
  },
};

// 数据库连接池监控
export class DatabaseConnectionMonitor {
  private connectionCount = 0;
  private maxConnections = 0;
  private errorCount = 0;

  trackConnection(): void {
    this.connectionCount++;
    this.maxConnections = Math.max(this.maxConnections, this.connectionCount);
  }

  releaseConnection(): void {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
  }

  trackError(): void {
    this.errorCount++;
  }

  getStats() {
    return {
      currentConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      errorCount: this.errorCount,
    };
  }
}

export const dbConnectionMonitor = new DatabaseConnectionMonitor();
