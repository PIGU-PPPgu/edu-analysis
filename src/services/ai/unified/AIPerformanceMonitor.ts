/**
 * 📊 AI性能监控模块 - 追踪AI服务的整体性能指标
 * 提供请求时间、成功率、缓存效率等关键指标的实时监控
 */

import { UnifiedAIRequest, UnifiedAIResponse } from "./AIGateway";
import { logInfo, logError } from "../../../utils/logger";

/**
 * 性能指标数据结构
 */
interface PerformanceMetrics {
  // 请求统计
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;

  // 响应时间统计
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;

  // 缓存统计
  cacheHitRate: number;
  cacheRequests: number;

  // 按请求类型分组的统计
  requestTypeStats: Record<
    string,
    {
      count: number;
      averageTime: number;
      successRate: number;
      cacheHitRate: number;
    }
  >;

  // 按提供商分组的统计
  providerStats: Record<
    string,
    {
      count: number;
      averageTime: number;
      successRate: number;
      averageCost: number;
    }
  >;
}

/**
 * 性能记录项
 */
interface PerformanceRecord {
  timestamp: number;
  requestType: string;
  provider: string;
  model: string;
  responseTime: number;
  success: boolean;
  cached: boolean;
  tokensUsed?: number;
  cost?: number;
  error?: string;
}

/**
 * AI性能监控器
 */
export class AIPerformanceMonitor {
  private records: PerformanceRecord[] = [];
  private maxRecords = 10000; // 最多保存10k条记录
  private metricsCache: PerformanceMetrics | null = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL = 30000; // 30秒缓存TTL

  /**
   * 记录AI请求性能
   */
  recordRequest(
    request: UnifiedAIRequest,
    response: UnifiedAIResponse,
    startTime: number
  ): void {
    const record: PerformanceRecord = {
      timestamp: Date.now(),
      requestType: request.requestType,
      provider: response.metadata?.provider || "unknown",
      model: response.metadata?.model || "unknown",
      responseTime: response.metadata?.responseTime || Date.now() - startTime,
      success: response.success,
      cached: response.metadata?.cached || false,
      tokensUsed: response.metadata?.tokensUsed,
      cost: response.metadata?.cost,
      error: response.error,
    };

    this.records.push(record);

    // 如果记录数超过限制，删除最旧的记录
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    // 清除缓存的指标
    this.metricsCache = null;

    logInfo("📊 AI请求性能已记录", {
      requestType: record.requestType,
      provider: record.provider,
      responseTime: record.responseTime,
      success: record.success,
      cached: record.cached,
    });
  }

  /**
   * 获取性能指标
   */
  getMetrics(timeRangeMs?: number): PerformanceMetrics {
    // 如果有有效的缓存，直接返回
    if (this.metricsCache && Date.now() < this.cacheExpiry) {
      return this.metricsCache;
    }

    const now = Date.now();
    const cutoffTime = timeRangeMs ? now - timeRangeMs : 0;

    const filteredRecords = this.records.filter(
      (r) => r.timestamp >= cutoffTime
    );

    if (filteredRecords.length === 0) {
      return this.getEmptyMetrics();
    }

    // 计算基础统计
    const totalRequests = filteredRecords.length;
    const successfulRequests = filteredRecords.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;

    // 计算响应时间统计
    const responseTimes = filteredRecords.map((r) => r.responseTime);
    const averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    // 计算缓存统计
    const cacheRequests = filteredRecords.filter((r) => r.cached).length;
    const cacheHitRate = (cacheRequests / totalRequests) * 100;

    // 按请求类型分组统计
    const requestTypeStats: Record<string, any> = {};
    filteredRecords.forEach((record) => {
      const type = record.requestType;
      if (!requestTypeStats[type]) {
        requestTypeStats[type] = {
          records: [],
          count: 0,
          successCount: 0,
          cacheCount: 0,
          totalTime: 0,
        };
      }

      requestTypeStats[type].records.push(record);
      requestTypeStats[type].count++;
      requestTypeStats[type].totalTime += record.responseTime;
      if (record.success) requestTypeStats[type].successCount++;
      if (record.cached) requestTypeStats[type].cacheCount++;
    });

    // 转换为最终格式
    Object.keys(requestTypeStats).forEach((type) => {
      const stats = requestTypeStats[type];
      requestTypeStats[type] = {
        count: stats.count,
        averageTime: Math.round(stats.totalTime / stats.count),
        successRate: Math.round((stats.successCount / stats.count) * 100),
        cacheHitRate: Math.round((stats.cacheCount / stats.count) * 100),
      };
    });

    // 按提供商分组统计
    const providerStats: Record<string, any> = {};
    filteredRecords.forEach((record) => {
      const provider = record.provider;
      if (!providerStats[provider]) {
        providerStats[provider] = {
          records: [],
          count: 0,
          successCount: 0,
          totalTime: 0,
          totalCost: 0,
        };
      }

      providerStats[provider].records.push(record);
      providerStats[provider].count++;
      providerStats[provider].totalTime += record.responseTime;
      if (record.success) providerStats[provider].successCount++;
      if (record.cost) providerStats[provider].totalCost += record.cost;
    });

    // 转换为最终格式
    Object.keys(providerStats).forEach((provider) => {
      const stats = providerStats[provider];
      providerStats[provider] = {
        count: stats.count,
        averageTime: Math.round(stats.totalTime / stats.count),
        successRate: Math.round((stats.successCount / stats.count) * 100),
        averageCost: stats.totalCost / stats.count || 0,
      };
    });

    const metrics: PerformanceMetrics = {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      minResponseTime,
      maxResponseTime,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheRequests,
      requestTypeStats,
      providerStats,
    };

    // 缓存结果
    this.metricsCache = metrics;
    this.cacheExpiry = now + this.CACHE_TTL;

    return metrics;
  }

  /**
   * 获取空的指标对象
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      cacheHitRate: 0,
      cacheRequests: 0,
      requestTypeStats: {},
      providerStats: {},
    };
  }

  /**
   * 获取性能趋势数据（按时间分组）
   */
  getTrendData(intervalMs = 60000): Array<{
    timestamp: number;
    requestCount: number;
    averageResponseTime: number;
    successRate: number;
    cacheHitRate: number;
  }> {
    if (this.records.length === 0) return [];

    const now = Date.now();
    const oldestRecord = Math.min(...this.records.map((r) => r.timestamp));
    const timeRange = now - oldestRecord;
    const intervals = Math.ceil(timeRange / intervalMs);

    const trendData = [];

    for (let i = 0; i < intervals; i++) {
      const startTime = oldestRecord + i * intervalMs;
      const endTime = startTime + intervalMs;

      const intervalRecords = this.records.filter(
        (r) => r.timestamp >= startTime && r.timestamp < endTime
      );

      if (intervalRecords.length === 0) continue;

      const requestCount = intervalRecords.length;
      const successCount = intervalRecords.filter((r) => r.success).length;
      const cacheCount = intervalRecords.filter((r) => r.cached).length;
      const totalTime = intervalRecords.reduce(
        (sum, r) => sum + r.responseTime,
        0
      );

      trendData.push({
        timestamp: startTime,
        requestCount,
        averageResponseTime: Math.round(totalTime / requestCount),
        successRate: Math.round((successCount / requestCount) * 100),
        cacheHitRate: Math.round((cacheCount / requestCount) * 100),
      });
    }

    return trendData;
  }

  /**
   * 获取最近的错误记录
   */
  getRecentErrors(limit = 20): Array<{
    timestamp: number;
    requestType: string;
    provider: string;
    error: string;
    responseTime: number;
  }> {
    return this.records
      .filter((r) => !r.success && r.error)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((r) => ({
        timestamp: r.timestamp,
        requestType: r.requestType,
        provider: r.provider,
        error: r.error!,
        responseTime: r.responseTime,
      }));
  }

  /**
   * 获取性能建议
   */
  getPerformanceRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.successRate < 95) {
      recommendations.push(
        `请求成功率较低 (${metrics.successRate}%)，建议检查API配置和网络连接`
      );
    }

    if (metrics.averageResponseTime > 10000) {
      recommendations.push(
        `平均响应时间过长 (${metrics.averageResponseTime}ms)，建议优化请求或增加超时设置`
      );
    }

    if (metrics.cacheHitRate < 30) {
      recommendations.push(
        `缓存命中率较低 (${metrics.cacheHitRate}%)，建议调整缓存策略或增加缓存时间`
      );
    }

    if (metrics.totalRequests > 1000 && metrics.cacheRequests === 0) {
      recommendations.push("建议启用缓存以提升性能和降低成本");
    }

    // 检查各提供商的性能
    Object.entries(metrics.providerStats).forEach(([provider, stats]) => {
      if (stats.successRate < 90) {
        recommendations.push(
          `${provider} 提供商成功率较低 (${stats.successRate}%)，建议检查配置或切换提供商`
        );
      }
      if (stats.averageTime > 15000) {
        recommendations.push(
          `${provider} 提供商响应时间过长 (${stats.averageTime}ms)，建议优化或切换到更快的提供商`
        );
      }
    });

    return recommendations;
  }

  /**
   * 清理旧记录
   */
  cleanup(olderThanMs?: number): void {
    const cutoffTime = Date.now() - (olderThanMs || 24 * 60 * 60 * 1000); // 默认清理24小时前的记录
    const originalLength = this.records.length;

    this.records = this.records.filter((r) => r.timestamp > cutoffTime);

    const cleanedCount = originalLength - this.records.length;
    if (cleanedCount > 0) {
      logInfo("📊 性能监控数据清理完成", {
        cleanedCount,
        remainingCount: this.records.length,
      });
    }

    // 清除缓存
    this.metricsCache = null;
  }

  /**
   * 重置所有数据
   */
  reset(): void {
    this.records = [];
    this.metricsCache = null;
    this.cacheExpiry = 0;
    logInfo("📊 性能监控数据已重置");
  }

  /**
   * 导出性能数据
   */
  exportData(): {
    records: PerformanceRecord[];
    metrics: PerformanceMetrics;
    exportTime: number;
  } {
    return {
      records: [...this.records],
      metrics: this.getMetrics(),
      exportTime: Date.now(),
    };
  }
}

// 全局性能监控实例
export const aiPerformanceMonitor = new AIPerformanceMonitor();

// 导出性能监控管理功能
export const performanceManager = {
  /**
   * 获取性能指标
   */
  getMetrics: (timeRangeMs?: number) =>
    aiPerformanceMonitor.getMetrics(timeRangeMs),

  /**
   * 获取趋势数据
   */
  getTrends: (intervalMs?: number) =>
    aiPerformanceMonitor.getTrendData(intervalMs),

  /**
   * 获取最近错误
   */
  getErrors: (limit?: number) => aiPerformanceMonitor.getRecentErrors(limit),

  /**
   * 获取性能建议
   */
  getRecommendations: () =>
    aiPerformanceMonitor.getPerformanceRecommendations(),

  /**
   * 清理数据
   */
  cleanup: (olderThanMs?: number) => aiPerformanceMonitor.cleanup(olderThanMs),

  /**
   * 重置数据
   */
  reset: () => aiPerformanceMonitor.reset(),

  /**
   * 导出数据
   */
  export: () => aiPerformanceMonitor.exportData(),
};
