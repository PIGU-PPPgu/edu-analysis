/**
 * 📊 AI服务监控和健康检查系统
 * 监控AI服务性能、健康状态和使用情况
 */

import { aiRouter } from "../core/aiRouter";
import { aiGateway } from "./AIGateway";
import { getAllProviders } from "../../aiProviderManager";
import { logInfo, logError } from "../../../utils/logger";

/**
 * 监控指标接口
 */
export interface AIMetrics {
  timestamp: Date;
  provider: string;
  model: string;
  requestType: string;
  responseTime: number;
  success: boolean;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  error?: string;
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  provider: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  errorRate: number;
  lastError?: string;
  checkedAt: Date;
}

/**
 * 性能统计接口
 */
export interface PerformanceStats {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  errorRate: number;
  uptime: number;
}

/**
 * AI监控系统类
 */
export class AIMonitoring {
  private static instance: AIMonitoring;
  private metrics: AIMetrics[] = [];
  private healthCheckResults: Map<string, HealthCheckResult> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // 配置参数
  private readonly CONFIG = {
    METRICS_RETENTION_HOURS: 24, // 指标保留24小时
    HEALTH_CHECK_INTERVAL: 5 * 60 * 1000, // 5分钟检查一次
    MAX_METRICS_COUNT: 10000, // 最大指标数量
    ERROR_RATE_THRESHOLD: 0.1, // 错误率阈值10%
    RESPONSE_TIME_THRESHOLD: 10000, // 响应时间阈值10秒
  };

  private constructor() {
    this.startMonitoring();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AIMonitoring {
    if (!AIMonitoring.instance) {
      AIMonitoring.instance = new AIMonitoring();
    }
    return AIMonitoring.instance;
  }

  /**
   * 📈 记录AI请求指标
   */
  recordMetrics(metrics: AIMetrics): void {
    try {
      // 添加时间戳
      metrics.timestamp = new Date();

      // 添加到指标列表
      this.metrics.push(metrics);

      // 清理过期指标
      this.cleanupOldMetrics();

      // 更新路由器健康状态
      aiRouter.updateProviderHealth(metrics.provider, {
        success: metrics.success,
        latency: metrics.responseTime,
        error: metrics.error,
      });

      logInfo("📊 记录AI指标", {
        provider: metrics.provider,
        success: metrics.success,
        responseTime: metrics.responseTime,
      });
    } catch (error) {
      logError("记录AI指标失败:", error);
    }
  }

  /**
   * 🏥 执行健康检查
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    try {
      logInfo("🏥 开始AI服务健康检查");

      const providers = Object.keys(getAllProviders());
      const results: HealthCheckResult[] = [];

      for (const providerId of providers) {
        try {
          const startTime = Date.now();

          // 发送简单的健康检查请求
          const testRequest = {
            content: "健康检查",
            requestType: "chat" as const,
            options: {
              maxTokens: 10,
              priority: "low" as const,
            },
          };

          const response = await aiGateway.processRequest(testRequest);
          const responseTime = Date.now() - startTime;

          const result: HealthCheckResult = {
            provider: providerId,
            status: response.success ? "healthy" : "degraded",
            responseTime,
            errorRate: this.calculateErrorRate(providerId),
            lastError: response.error,
            checkedAt: new Date(),
          };

          // 根据性能指标调整状态
          if (result.errorRate > this.CONFIG.ERROR_RATE_THRESHOLD) {
            result.status = "degraded";
          }

          if (responseTime > this.CONFIG.RESPONSE_TIME_THRESHOLD) {
            result.status = "degraded";
          }

          if (!response.success) {
            result.status = "unhealthy";
          }

          this.healthCheckResults.set(providerId, result);
          results.push(result);

          logInfo(`✅ ${providerId} 健康检查完成`, {
            status: result.status,
            responseTime: result.responseTime,
          });
        } catch (error) {
          const result: HealthCheckResult = {
            provider: providerId,
            status: "unhealthy",
            responseTime: 0,
            errorRate: 1.0,
            lastError: error.message,
            checkedAt: new Date(),
          };

          this.healthCheckResults.set(providerId, result);
          results.push(result);

          logError(`❌ ${providerId} 健康检查失败:`, error);
        }
      }

      logInfo("🏥 AI服务健康检查完成", {
        total: results.length,
        healthy: results.filter((r) => r.status === "healthy").length,
        degraded: results.filter((r) => r.status === "degraded").length,
        unhealthy: results.filter((r) => r.status === "unhealthy").length,
      });

      return results;
    } catch (error) {
      logError("健康检查执行失败:", error);
      return [];
    }
  }

  /**
   * 📊 获取性能统计
   */
  getPerformanceStats(providerId?: string): PerformanceStats[] {
    try {
      const providers = providerId
        ? [providerId]
        : Object.keys(getAllProviders());
      const stats: PerformanceStats[] = [];

      for (const provider of providers) {
        const providerMetrics = this.metrics.filter(
          (m) => m.provider === provider
        );

        if (providerMetrics.length === 0) {
          continue;
        }

        const successfulRequests = providerMetrics.filter(
          (m) => m.success
        ).length;
        const failedRequests = providerMetrics.length - successfulRequests;
        const averageResponseTime =
          providerMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
          providerMetrics.length;
        const totalCost = providerMetrics.reduce(
          (sum, m) => sum + (m.cost || 0),
          0
        );

        // 计算运行时间（从第一个请求开始）
        const firstRequest = Math.min(
          ...providerMetrics.map((m) => m.timestamp.getTime())
        );
        const uptime = (Date.now() - firstRequest) / 1000 / 60 / 60; // 小时

        const stat: PerformanceStats = {
          provider,
          totalRequests: providerMetrics.length,
          successfulRequests,
          failedRequests,
          averageResponseTime: Math.round(averageResponseTime),
          totalCost: Math.round(totalCost * 100) / 100,
          errorRate: failedRequests / providerMetrics.length,
          uptime: Math.round(uptime * 100) / 100,
        };

        stats.push(stat);
      }

      return stats.sort((a, b) => b.totalRequests - a.totalRequests);
    } catch (error) {
      logError("获取性能统计失败:", error);
      return [];
    }
  }

  /**
   * 🎯 获取实时监控面板数据
   */
  getMonitoringDashboard() {
    try {
      const healthResults = Array.from(this.healthCheckResults.values());
      const performanceStats = this.getPerformanceStats();
      const recentMetrics = this.metrics.slice(-100); // 最近100条指标

      // 统计请求类型分布
      const requestTypeStats = this.getRequestTypeDistribution();

      // 统计响应时间分布
      const responseTimeDistribution = this.getResponseTimeDistribution();

      // 获取AI网关状态
      const gatewayStatus = aiGateway.getStatus();

      return {
        overview: {
          totalProviders: Object.keys(getAllProviders()).length,
          healthyProviders: healthResults.filter((r) => r.status === "healthy")
            .length,
          totalRequests: this.metrics.length,
          averageResponseTime: this.calculateOverallAverageResponseTime(),
          overallErrorRate: this.calculateOverallErrorRate(),
          totalCost: this.calculateTotalCost(),
        },
        healthStatus: healthResults,
        performanceStats,
        recentMetrics: recentMetrics.slice(-10), // 最近10条
        requestTypeStats,
        responseTimeDistribution,
        gatewayStatus,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logError("获取监控面板数据失败:", error);
      return null;
    }
  }

  /**
   * 🔧 启动监控服务
   */
  private startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // 定期执行健康检查
    this.monitoringInterval = setInterval(
      () => this.performHealthCheck(),
      this.CONFIG.HEALTH_CHECK_INTERVAL
    );

    // 执行初始健康检查
    setTimeout(() => this.performHealthCheck(), 5000);

    logInfo("📊 AI监控服务已启动");
  }

  /**
   * 🛑 停止监控服务
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    logInfo("📊 AI监控服务已停止");
  }

  /**
   * 🧹 清理过期指标
   */
  private cleanupOldMetrics(): void {
    const cutoffTime =
      Date.now() - this.CONFIG.METRICS_RETENTION_HOURS * 60 * 60 * 1000;

    this.metrics = this.metrics.filter(
      (metric) => metric.timestamp.getTime() > cutoffTime
    );

    // 如果仍然超过最大数量，删除最旧的
    if (this.metrics.length > this.CONFIG.MAX_METRICS_COUNT) {
      this.metrics = this.metrics.slice(-this.CONFIG.MAX_METRICS_COUNT);
    }
  }

  /**
   * 📈 计算错误率
   */
  private calculateErrorRate(providerId: string): number {
    const recentMetrics = this.metrics
      .filter((m) => m.provider === providerId)
      .slice(-100); // 最近100次请求

    if (recentMetrics.length === 0) return 0;

    const failedRequests = recentMetrics.filter((m) => !m.success).length;
    return failedRequests / recentMetrics.length;
  }

  /**
   * 📊 获取请求类型分布
   */
  private getRequestTypeDistribution() {
    const distribution = new Map<string, number>();

    this.metrics.forEach((metric) => {
      const count = distribution.get(metric.requestType) || 0;
      distribution.set(metric.requestType, count + 1);
    });

    return Array.from(distribution.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / this.metrics.length) * 100),
    }));
  }

  /**
   * ⏱️ 获取响应时间分布
   */
  private getResponseTimeDistribution() {
    const buckets = [
      { label: "< 1s", min: 0, max: 1000, count: 0 },
      { label: "1-3s", min: 1000, max: 3000, count: 0 },
      { label: "3-5s", min: 3000, max: 5000, count: 0 },
      { label: "5-10s", min: 5000, max: 10000, count: 0 },
      { label: "> 10s", min: 10000, max: Infinity, count: 0 },
    ];

    this.metrics.forEach((metric) => {
      const bucket = buckets.find(
        (b) => metric.responseTime >= b.min && metric.responseTime < b.max
      );
      if (bucket) {
        bucket.count++;
      }
    });

    return buckets.map((bucket) => ({
      ...bucket,
      percentage:
        this.metrics.length > 0
          ? Math.round((bucket.count / this.metrics.length) * 100)
          : 0,
    }));
  }

  /**
   * 📊 计算总体平均响应时间
   */
  private calculateOverallAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;

    const totalTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return Math.round(totalTime / this.metrics.length);
  }

  /**
   * 📊 计算总体错误率
   */
  private calculateOverallErrorRate(): number {
    if (this.metrics.length === 0) return 0;

    const failedRequests = this.metrics.filter((m) => !m.success).length;
    return Math.round((failedRequests / this.metrics.length) * 100) / 100;
  }

  /**
   * 💰 计算总成本
   */
  private calculateTotalCost(): number {
    const totalCost = this.metrics.reduce((sum, m) => sum + (m.cost || 0), 0);
    return Math.round(totalCost * 100) / 100;
  }

  /**
   * 🗑️ 清理所有数据
   */
  clearAllData(): void {
    this.metrics = [];
    this.healthCheckResults.clear();
    logInfo("📊 AI监控数据已清理");
  }

  /**
   * 📤 导出监控数据
   */
  exportData() {
    return {
      metrics: this.metrics,
      healthResults: Array.from(this.healthCheckResults.entries()),
      exportedAt: new Date(),
      config: this.CONFIG,
    };
  }

  /**
   * 📥 导入监控数据
   */
  importData(data: any): void {
    try {
      if (data.metrics && Array.isArray(data.metrics)) {
        this.metrics = data.metrics.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }

      if (data.healthResults && Array.isArray(data.healthResults)) {
        this.healthCheckResults = new Map(data.healthResults);
      }

      logInfo("📥 AI监控数据导入成功", {
        metricsCount: this.metrics.length,
        healthResultsCount: this.healthCheckResults.size,
      });
    } catch (error) {
      logError("导入监控数据失败:", error);
    }
  }
}

// 导出全局监控实例
export const aiMonitoring = AIMonitoring.getInstance();
