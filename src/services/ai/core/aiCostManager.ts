/**
 * 🤖 AI成本管理器
 * 实现AI API调用的成本追踪、预算管理和使用量监控
 */

import { toast } from "sonner";

// 成本配置接口
export interface CostConfig {
  providerId: string;
  modelId: string;
  inputTokenCost: number; // 每1K输入token的成本 (USD)
  outputTokenCost: number; // 每1K输出token的成本 (USD)
  requestCost?: number; // 每次请求固定成本 (USD)
  currency: "USD" | "CNY";
}

// 使用量记录接口
export interface UsageRecord {
  id: string;
  providerId: string;
  modelId: string;
  timestamp: Date;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  actualCost?: number;
  requestLatency: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// 预算配置接口
export interface BudgetConfig {
  id: string;
  name: string;
  type: "daily" | "weekly" | "monthly" | "yearly";
  limit: number; // 预算限额 (USD)
  alertThresholds: number[]; // 告警阈值 [50%, 80%, 90%]
  providersIncluded: string[]; // 包含的提供商
  autoStop: boolean; // 超限时自动停止
  resetDate?: Date; // 预算重置日期
}

// 成本统计接口
export interface CostStatistics {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  avgCostPerRequest: number;
  avgCostPerToken: number;
  successRate: number;
  topProviders: Array<{
    providerId: string;
    cost: number;
    percentage: number;
  }>;
  topModels: Array<{
    modelId: string;
    cost: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
}

// 告警记录接口
export interface CostAlert {
  id: string;
  budgetId: string;
  type: "threshold" | "exceeded" | "anomaly";
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  currentUsage: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

// 📊 预定义的成本配置
export const DEFAULT_COST_CONFIGS: CostConfig[] = [
  // OpenAI
  {
    providerId: "openai",
    modelId: "gpt-4",
    inputTokenCost: 0.03, // $30/1M tokens
    outputTokenCost: 0.06, // $60/1M tokens
    currency: "USD",
  },
  {
    providerId: "openai",
    modelId: "gpt-4-turbo",
    inputTokenCost: 0.01, // $10/1M tokens
    outputTokenCost: 0.03, // $30/1M tokens
    currency: "USD",
  },
  {
    providerId: "openai",
    modelId: "gpt-3.5-turbo",
    inputTokenCost: 0.0005, // $0.5/1M tokens
    outputTokenCost: 0.0015, // $1.5/1M tokens
    currency: "USD",
  },

  // Anthropic Claude
  {
    providerId: "anthropic",
    modelId: "claude-3-5-sonnet",
    inputTokenCost: 0.003, // $3/1M tokens
    outputTokenCost: 0.015, // $15/1M tokens
    currency: "USD",
  },
  {
    providerId: "anthropic",
    modelId: "claude-3-haiku",
    inputTokenCost: 0.00025, // $0.25/1M tokens
    outputTokenCost: 0.00125, // $1.25/1M tokens
    currency: "USD",
  },

  // DeepSeek (更便宜的中国模型)
  {
    providerId: "deepseek",
    modelId: "deepseek-v3",
    inputTokenCost: 0.0001, // 估算成本
    outputTokenCost: 0.0002,
    currency: "USD",
  },

  // 百川 (中国模型)
  {
    providerId: "baichuan",
    modelId: "baichuan4",
    inputTokenCost: 0.0001, // 估算成本
    outputTokenCost: 0.0002,
    currency: "USD",
  },
];

/**
 * AI成本管理器类
 */
export class AICostManager {
  private usageRecords: UsageRecord[] = [];
  private budgetConfigs: BudgetConfig[] = [];
  private costConfigs: CostConfig[] = [...DEFAULT_COST_CONFIGS];
  private alerts: CostAlert[] = [];

  // 存储键
  private readonly STORAGE_KEYS = {
    USAGE_RECORDS: "ai_usage_records",
    BUDGET_CONFIGS: "ai_budget_configs",
    COST_CONFIGS: "ai_cost_configs",
    ALERTS: "ai_cost_alerts",
  };

  constructor() {
    this.loadFromStorage();
    this.startPeriodicCleanup();
  }

  /**
   * 📊 记录API使用情况
   */
  async recordUsage(params: {
    providerId: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    requestLatency: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
  }): Promise<UsageRecord> {
    const record: UsageRecord = {
      id: this.generateId(),
      providerId: params.providerId,
      modelId: params.modelId,
      timestamp: new Date(),
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      estimatedCost: this.calculateCost(
        params.providerId,
        params.modelId,
        params.inputTokens,
        params.outputTokens
      ),
      requestLatency: params.requestLatency,
      success: params.success,
      error: params.error,
      metadata: params.metadata,
    };

    this.usageRecords.push(record);
    this.saveToStorage();

    // 检查预算告警
    await this.checkBudgetAlerts();

    console.log(
      `💰 AI成本记录: ${params.providerId}/${params.modelId} - $${record.estimatedCost.toFixed(4)}`
    );

    return record;
  }

  /**
   * 💰 计算成本
   */
  private calculateCost(
    providerId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costConfig = this.costConfigs.find(
      (config) => config.providerId === providerId && config.modelId === modelId
    );

    if (!costConfig) {
      console.warn(`⚠️ 未找到成本配置: ${providerId}/${modelId}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * costConfig.inputTokenCost;
    const outputCost = (outputTokens / 1000) * costConfig.outputTokenCost;
    const requestCost = costConfig.requestCost || 0;

    return inputCost + outputCost + requestCost;
  }

  /**
   * 📋 创建预算配置
   */
  createBudget(config: Omit<BudgetConfig, "id">): BudgetConfig {
    const budget: BudgetConfig = {
      ...config,
      id: this.generateId(),
    };

    this.budgetConfigs.push(budget);
    this.saveToStorage();

    toast.success(`预算"${budget.name}"已创建，限额 $${budget.limit}`);

    return budget;
  }

  /**
   * 📊 获取成本统计
   */
  getStatistics(timeRange?: { start: Date; end: Date }): CostStatistics {
    let records = this.usageRecords;

    // 时间范围过滤
    if (timeRange) {
      records = records.filter(
        (record) =>
          record.timestamp >= timeRange.start &&
          record.timestamp <= timeRange.end
      );
    }

    const totalCost = records.reduce(
      (sum, record) => sum + record.estimatedCost,
      0
    );
    const totalRequests = records.length;
    const totalTokens = records.reduce(
      (sum, record) => sum + record.inputTokens + record.outputTokens,
      0
    );
    const successfulRequests = records.filter(
      (record) => record.success
    ).length;

    // 提供商成本排名
    const providerCosts = new Map<string, number>();
    records.forEach((record) => {
      const current = providerCosts.get(record.providerId) || 0;
      providerCosts.set(record.providerId, current + record.estimatedCost);
    });

    const topProviders = Array.from(providerCosts.entries())
      .map(([providerId, cost]) => ({
        providerId,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // 模型成本排名
    const modelCosts = new Map<string, number>();
    records.forEach((record) => {
      const current = modelCosts.get(record.modelId) || 0;
      modelCosts.set(record.modelId, current + record.estimatedCost);
    });

    const topModels = Array.from(modelCosts.entries())
      .map(([modelId, cost]) => ({
        modelId,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // 时间序列数据（最近7天）
    const timeSeriesData = this.generateTimeSeriesData(records, 7);

    return {
      totalCost,
      totalRequests,
      totalTokens,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      avgCostPerToken: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0, // 每1K token成本
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      topProviders,
      topModels,
      timeSeriesData,
    };
  }

  /**
   * 🚨 检查预算告警
   */
  private async checkBudgetAlerts(): Promise<void> {
    for (const budget of this.budgetConfigs) {
      const currentUsage = this.calculateBudgetUsage(budget);
      const usagePercentage = (currentUsage / budget.limit) * 100;

      // 检查阈值告警
      for (const threshold of budget.alertThresholds) {
        if (usagePercentage >= threshold) {
          const existingAlert = this.alerts.find(
            (alert) =>
              alert.budgetId === budget.id &&
              alert.threshold === threshold &&
              !alert.acknowledged
          );

          if (!existingAlert) {
            const alert = this.createAlert({
              budgetId: budget.id,
              type: usagePercentage >= 100 ? "exceeded" : "threshold",
              severity:
                usagePercentage >= 100
                  ? "critical"
                  : usagePercentage >= 90
                    ? "error"
                    : usagePercentage >= 80
                      ? "warning"
                      : "info",
              message:
                usagePercentage >= 100
                  ? `预算"${budget.name}"已超限! 当前使用: $${currentUsage.toFixed(2)}`
                  : `预算"${budget.name}"使用率已达${usagePercentage.toFixed(1)}%`,
              currentUsage,
              threshold: budget.limit * (threshold / 100),
            });

            // 显示告警通知
            this.showAlert(alert);
          }
        }
      }
    }
  }

  /**
   * 📈 生成时间序列数据
   */
  private generateTimeSeriesData(
    records: UsageRecord[],
    days: number
  ): Array<{
    date: string;
    cost: number;
    requests: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000
    );

    const dataMap = new Map<string, { cost: number; requests: number }>();

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dataMap.set(dateStr, { cost: 0, requests: 0 });
    }

    // 聚合数据
    records.forEach((record) => {
      const dateStr = record.timestamp.toISOString().split("T")[0];
      const existing = dataMap.get(dateStr);
      if (existing) {
        existing.cost += record.estimatedCost;
        existing.requests += 1;
      }
    });

    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      cost: data.cost,
      requests: data.requests,
    }));
  }

  /**
   * 📊 计算预算使用量
   */
  private calculateBudgetUsage(budget: BudgetConfig): number {
    const now = new Date();
    let startDate: Date;

    switch (budget.type) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const relevantRecords = this.usageRecords.filter(
      (record) =>
        record.timestamp >= startDate &&
        budget.providersIncluded.includes(record.providerId)
    );

    return relevantRecords.reduce(
      (sum, record) => sum + record.estimatedCost,
      0
    );
  }

  /**
   * 🚨 创建告警
   */
  private createAlert(
    params: Omit<CostAlert, "id" | "timestamp" | "acknowledged">
  ): CostAlert {
    const alert: CostAlert = {
      ...params,
      id: this.generateId(),
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.saveToStorage();

    return alert;
  }

  /**
   * 📢 显示告警通知
   */
  private showAlert(alert: CostAlert): void {
    switch (alert.severity) {
      case "critical":
        toast.error(alert.message, { duration: 10000 });
        break;
      case "error":
        toast.error(alert.message, { duration: 5000 });
        break;
      case "warning":
        toast.warning(alert.message);
        break;
      case "info":
        toast.info(alert.message);
        break;
    }
  }

  /**
   * 🔄 数据持久化
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.USAGE_RECORDS,
        JSON.stringify(this.usageRecords)
      );
      localStorage.setItem(
        this.STORAGE_KEYS.BUDGET_CONFIGS,
        JSON.stringify(this.budgetConfigs)
      );
      localStorage.setItem(
        this.STORAGE_KEYS.COST_CONFIGS,
        JSON.stringify(this.costConfigs)
      );
      localStorage.setItem(
        this.STORAGE_KEYS.ALERTS,
        JSON.stringify(this.alerts)
      );
    } catch (error) {
      console.error("❌ 保存AI成本数据失败:", error);
    }
  }

  /**
   * 📥 从存储加载数据
   */
  private loadFromStorage(): void {
    try {
      const usageData = localStorage.getItem(this.STORAGE_KEYS.USAGE_RECORDS);
      if (usageData) {
        this.usageRecords = JSON.parse(usageData);
        // 转换时间字符串为Date对象
        this.usageRecords.forEach((record) => {
          record.timestamp = new Date(record.timestamp);
        });
      }

      const budgetData = localStorage.getItem(this.STORAGE_KEYS.BUDGET_CONFIGS);
      if (budgetData) {
        this.budgetConfigs = JSON.parse(budgetData);
      }

      const costData = localStorage.getItem(this.STORAGE_KEYS.COST_CONFIGS);
      if (costData) {
        this.costConfigs = JSON.parse(costData);
      }

      const alertData = localStorage.getItem(this.STORAGE_KEYS.ALERTS);
      if (alertData) {
        this.alerts = JSON.parse(alertData);
        this.alerts.forEach((alert) => {
          alert.timestamp = new Date(alert.timestamp);
        });
      }
    } catch (error) {
      console.error("❌ 加载AI成本数据失败:", error);
    }
  }

  /**
   * 🧹 定期清理旧数据
   */
  private startPeriodicCleanup(): void {
    setInterval(
      () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // 清理30天前的使用记录
        this.usageRecords = this.usageRecords.filter(
          (record) => record.timestamp > thirtyDaysAgo
        );

        // 清理已确认的告警
        this.alerts = this.alerts.filter(
          (alert) => !alert.acknowledged || alert.timestamp > thirtyDaysAgo
        );

        this.saveToStorage();
      },
      24 * 60 * 60 * 1000
    ); // 每24小时执行一次
  }

  /**
   * 🔧 工具方法
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 🔍 公开方法
  getBudgets(): BudgetConfig[] {
    return [...this.budgetConfigs];
  }

  getRecentUsage(limit: number = 100): UsageRecord[] {
    return this.usageRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getActiveAlerts(): CostAlert[] {
    return this.alerts.filter((alert) => !alert.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveToStorage();
    }
  }

  updateCostConfig(config: CostConfig): void {
    const index = this.costConfigs.findIndex(
      (c) => c.providerId === config.providerId && c.modelId === config.modelId
    );

    if (index >= 0) {
      this.costConfigs[index] = config;
    } else {
      this.costConfigs.push(config);
    }

    this.saveToStorage();
  }

  getCostConfigs(): CostConfig[] {
    return [...this.costConfigs];
  }
}

// 🌍 全局实例
export const aiCostManager = new AICostManager();

// 🎯 快捷方法
export const recordAIUsage = aiCostManager.recordUsage.bind(aiCostManager);
export const getAIStatistics = aiCostManager.getStatistics.bind(aiCostManager);
