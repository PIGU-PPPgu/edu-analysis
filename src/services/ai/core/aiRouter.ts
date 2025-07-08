/**
 * 🤖 AI智能路由器
 * 实现多提供商智能调度、负载均衡和故障转移
 */

import { toast } from 'sonner';
import { aiCostManager } from './aiCostManager';

// 提供商健康状态接口
export interface ProviderHealth {
  providerId: string;
  isAvailable: boolean;
  latency: number;          // 平均响应时间 (ms)
  successRate: number;      // 成功率 (%)
  errorRate: number;        // 错误率 (%)
  lastHealthCheck: Date;
  consecutiveFailures: number;
  costEfficiency: number;   // 成本效率评分 (0-100)
  currentLoad: number;      // 当前负载 (0-100)
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
}

// 路由策略接口
export interface RoutingStrategy {
  type: 'cost-optimized' | 'performance-first' | 'balanced' | 'failover' | 'round-robin';
  name: string;
  description: string;
  weights: {
    cost: number;           // 成本权重 (0-1)
    performance: number;    // 性能权重 (0-1)
    reliability: number;    // 可靠性权重 (0-1)
  };
  fallbackProviders: string[]; // 备用提供商列表
  maxRetries: number;
  retryDelay: number;       // 重试延迟 (ms)
}

// 提供商优先级配置
export interface ProviderPriority {
  providerId: string;
  priority: number;         // 优先级 (1-10, 10最高)
  maxDailyRequests?: number;
  maxConcurrentRequests?: number;
  enabled: boolean;
  conditions?: {
    maxCostPerRequest?: number;
    minSuccessRate?: number;
    maxLatency?: number;
  };
}

// 路由请求接口
export interface RouteRequest {
  modelId: string;
  estimatedTokens: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  context: string;          // 用于缓存和优化
  requirements?: {
    maxLatency?: number;
    maxCost?: number;
    preferredProviders?: string[];
    excludedProviders?: string[];
  };
}

// 路由结果接口
export interface RouteResult {
  selectedProvider: string;
  selectedModel: string;
  estimatedCost: number;
  estimatedLatency: number;
  confidence: number;       // 选择置信度 (0-1)
  fallbackProviders: string[];
  reasoning: string;        // 选择原因
}

// 📊 预定义的路由策略
export const DEFAULT_ROUTING_STRATEGIES: RoutingStrategy[] = [
  {
    type: 'cost-optimized',
    name: '成本优先',
    description: '优先选择成本最低的可用提供商',
    weights: { cost: 0.7, performance: 0.2, reliability: 0.1 },
    fallbackProviders: ['deepseek', 'baichuan', 'openai'],
    maxRetries: 3,
    retryDelay: 1000
  },
  {
    type: 'performance-first',
    name: '性能优先',
    description: '优先选择响应最快的提供商',
    weights: { cost: 0.1, performance: 0.7, reliability: 0.2 },
    fallbackProviders: ['openai', 'anthropic', 'deepseek'],
    maxRetries: 2,
    retryDelay: 500
  },
  {
    type: 'balanced',
    name: '均衡模式',
    description: '在成本、性能和可靠性之间保持平衡',
    weights: { cost: 0.3, performance: 0.4, reliability: 0.3 },
    fallbackProviders: ['openai', 'deepseek', 'anthropic'],
    maxRetries: 3,
    retryDelay: 1000
  },
  {
    type: 'failover',
    name: '故障转移',
    description: '主要使用指定提供商，故障时自动切换',
    weights: { cost: 0.2, performance: 0.3, reliability: 0.5 },
    fallbackProviders: ['openai', 'anthropic', 'deepseek', 'baichuan'],
    maxRetries: 5,
    retryDelay: 2000
  }
];

/**
 * AI智能路由器类
 */
export class AIRouter {
  private healthStats: Map<string, ProviderHealth> = new Map();
  private providerPriorities: ProviderPriority[] = [];
  private currentStrategy: RoutingStrategy = DEFAULT_ROUTING_STRATEGIES[2]; // 默认均衡模式
  private requestQueue: Map<string, number> = new Map(); // 提供商请求队列
  
  // 存储键
  private readonly STORAGE_KEYS = {
    HEALTH_STATS: 'ai_router_health_stats',
    PROVIDER_PRIORITIES: 'ai_router_provider_priorities',
    CURRENT_STRATEGY: 'ai_router_current_strategy'
  };

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultPriorities();
    this.startHealthMonitoring();
  }

  /**
   * 🎯 智能路由选择
   */
  async route(request: RouteRequest): Promise<RouteResult> {
    console.log(`🎯 开始路由选择: ${request.modelId}, 策略: ${this.currentStrategy.name}`);
    
    const availableProviders = this.getAvailableProviders(request);
    
    if (availableProviders.length === 0) {
      throw new Error('没有可用的AI提供商');
    }

    const scoredProviders = this.scoreProviders(availableProviders, request);
    const selectedProvider = this.selectBestProvider(scoredProviders, request);
    
    const result: RouteResult = {
      selectedProvider: selectedProvider.providerId,
      selectedModel: this.mapModelToProvider(request.modelId, selectedProvider.providerId),
      estimatedCost: this.estimateCost(selectedProvider.providerId, request.estimatedTokens),
      estimatedLatency: selectedProvider.latency,
      confidence: selectedProvider.score / 100,
      fallbackProviders: scoredProviders
        .filter(p => p.providerId !== selectedProvider.providerId)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(p => p.providerId),
      reasoning: this.generateReasoning(selectedProvider, request)
    };

    // 更新负载计数
    this.incrementLoad(selectedProvider.providerId);
    
    console.log(`✅ 路由选择完成: ${result.selectedProvider} (置信度: ${(result.confidence * 100).toFixed(1)}%)`);
    
    return result;
  }

  /**
   * 📊 获取可用提供商
   */
  private getAvailableProviders(request: RouteRequest): ProviderHealth[] {
    const enabledProviders = this.providerPriorities
      .filter(p => p.enabled)
      .map(p => p.providerId);

    return Array.from(this.healthStats.values())
      .filter(health => {
        // 基础可用性检查
        if (!health.isAvailable || !enabledProviders.includes(health.providerId)) {
          return false;
        }

        // 用户偏好检查
        if (request.requirements?.preferredProviders?.length) {
          if (!request.requirements.preferredProviders.includes(health.providerId)) {
            return false;
          }
        }

        if (request.requirements?.excludedProviders?.includes(health.providerId)) {
          return false;
        }

        // 性能要求检查
        if (request.requirements?.maxLatency && health.latency > request.requirements.maxLatency) {
          return false;
        }

        // 成功率检查
        const minSuccessRate = this.getProviderPriority(health.providerId)?.conditions?.minSuccessRate || 80;
        if (health.successRate < minSuccessRate) {
          return false;
        }

        return true;
      });
  }

  /**
   * 🏆 为提供商评分
   */
  private scoreProviders(providers: ProviderHealth[], request: RouteRequest): Array<ProviderHealth & { score: number }> {
    return providers.map(provider => {
      const priority = this.getProviderPriority(provider.providerId);
      const estimatedCost = this.estimateCost(provider.providerId, request.estimatedTokens);
      
      // 基础评分组件
      const costScore = this.calculateCostScore(estimatedCost, request);
      const performanceScore = this.calculatePerformanceScore(provider);
      const reliabilityScore = this.calculateReliabilityScore(provider);
      const priorityBonus = priority ? priority.priority * 5 : 0;
      
      // 根据策略权重计算总分
      const totalScore = (
        costScore * this.currentStrategy.weights.cost +
        performanceScore * this.currentStrategy.weights.performance +
        reliabilityScore * this.currentStrategy.weights.reliability
      ) + priorityBonus;

      return {
        ...provider,
        score: Math.min(100, Math.max(0, totalScore))
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * 💰 计算成本评分
   */
  private calculateCostScore(cost: number, request: RouteRequest): number {
    const maxAcceptableCost = request.requirements?.maxCost || 0.1; // 默认$0.1
    
    if (cost <= maxAcceptableCost * 0.3) return 100; // 非常便宜
    if (cost <= maxAcceptableCost * 0.6) return 80;  // 便宜
    if (cost <= maxAcceptableCost) return 60;        // 可接受
    if (cost <= maxAcceptableCost * 1.5) return 30;  // 有点贵
    return 10; // 太贵
  }

  /**
   * ⚡ 计算性能评分
   */
  private calculatePerformanceScore(provider: ProviderHealth): number {
    // 基于延迟的评分
    let latencyScore = 100;
    if (provider.latency > 5000) latencyScore = 20;      // >5s 很慢
    else if (provider.latency > 3000) latencyScore = 40; // >3s 慢
    else if (provider.latency > 1000) latencyScore = 70; // >1s 一般
    else if (provider.latency > 500) latencyScore = 90;  // >0.5s 快
    // <=0.5s 很快，保持100分

    // 结合当前负载
    const loadPenalty = provider.currentLoad * 0.3; // 负载越高扣分越多
    
    return Math.max(0, latencyScore - loadPenalty);
  }

  /**
   * 🛡️ 计算可靠性评分
   */
  private calculateReliabilityScore(provider: ProviderHealth): number {
    // 成功率评分
    let reliabilityScore = provider.successRate;
    
    // 连续失败惩罚
    const failurePenalty = provider.consecutiveFailures * 10;
    reliabilityScore -= failurePenalty;
    
    // 健康检查时效性
    const healthCheckAge = Date.now() - provider.lastHealthCheck.getTime();
    if (healthCheckAge > 300000) { // 5分钟前的数据
      reliabilityScore -= 10;
    }
    
    return Math.max(0, Math.min(100, reliabilityScore));
  }

  /**
   * 🎯 选择最佳提供商
   */
  private selectBestProvider(
    scoredProviders: Array<ProviderHealth & { score: number }>,
    request: RouteRequest
  ): ProviderHealth & { score: number } {
    if (this.currentStrategy.type === 'round-robin') {
      return this.selectRoundRobin(scoredProviders);
    }

    // 对于关键请求，总是选择评分最高的
    if (request.priority === 'critical') {
      return scoredProviders[0];
    }

    // 对于其他请求，在前几名中随机选择（避免负载集中）
    const topProviders = scoredProviders.slice(0, Math.min(3, scoredProviders.length));
    const weights = topProviders.map(p => p.score);
    const selectedIndex = this.weightedRandomSelect(weights);
    
    return topProviders[selectedIndex];
  }

  /**
   * 🎲 加权随机选择
   */
  private weightedRandomSelect(weights: number[]): number {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return i;
      }
    }
    
    return 0; // 默认返回第一个
  }

  /**
   * 🔄 轮询选择
   */
  private selectRoundRobin(providers: Array<ProviderHealth & { score: number }>): ProviderHealth & { score: number } {
    // 简单轮询实现
    const availableProviders = providers.filter(p => p.score > 50);
    if (availableProviders.length === 0) return providers[0];
    
    const now = Date.now();
    const index = Math.floor(now / 1000) % availableProviders.length;
    return availableProviders[index];
  }

  /**
   * 💡 生成选择原因
   */
  private generateReasoning(provider: ProviderHealth & { score: number }, request: RouteRequest): string {
    const reasons: string[] = [];
    
    if (provider.score >= 90) {
      reasons.push('综合评分优秀');
    } else if (provider.score >= 70) {
      reasons.push('综合评分良好');
    }

    if (provider.latency < 500) {
      reasons.push('响应速度快');
    }

    if (provider.successRate >= 95) {
      reasons.push('可靠性高');
    }

    if (provider.costEfficiency >= 80) {
      reasons.push('成本效率佳');
    }

    if (this.currentStrategy.type === 'cost-optimized') {
      reasons.push('符合成本优先策略');
    }

    return reasons.join(', ') || '基于当前策略选择';
  }

  /**
   * 📈 更新提供商健康状态
   */
  async updateProviderHealth(
    providerId: string,
    result: {
      success: boolean;
      latency: number;
      error?: string;
    }
  ): Promise<void> {
    let health = this.healthStats.get(providerId);
    
    if (!health) {
      health = this.createDefaultHealth(providerId);
      this.healthStats.set(providerId, health);
    }

    // 更新统计信息
    health.latency = this.calculateMovingAverage(health.latency, result.latency, 0.3);
    health.lastHealthCheck = new Date();

    if (result.success) {
      health.consecutiveFailures = 0;
      health.successRate = this.calculateMovingAverage(health.successRate, 100, 0.1);
      health.errorRate = this.calculateMovingAverage(health.errorRate, 0, 0.1);
    } else {
      health.consecutiveFailures++;
      health.successRate = this.calculateMovingAverage(health.successRate, 0, 0.1);
      health.errorRate = this.calculateMovingAverage(health.errorRate, 100, 0.1);
    }

    // 更新可用性状态
    health.isAvailable = health.consecutiveFailures < 3 && health.successRate > 50;

    // 降低当前负载
    this.decrementLoad(providerId);

    this.saveToStorage();
  }

  /**
   * 📊 计算移动平均值
   */
  private calculateMovingAverage(current: number, newValue: number, alpha: number): number {
    return current * (1 - alpha) + newValue * alpha;
  }

  /**
   * 🎛️ 设置路由策略
   */
  setStrategy(strategy: RoutingStrategy): void {
    this.currentStrategy = strategy;
    this.saveToStorage();
    toast.success(`路由策略已切换到: ${strategy.name}`);
  }

  /**
   * 📋 更新提供商优先级
   */
  updateProviderPriority(priority: ProviderPriority): void {
    const index = this.providerPriorities.findIndex(p => p.providerId === priority.providerId);
    
    if (index >= 0) {
      this.providerPriorities[index] = priority;
    } else {
      this.providerPriorities.push(priority);
    }
    
    this.saveToStorage();
  }

  /**
   * 🔧 工具方法
   */
  private getProviderPriority(providerId: string): ProviderPriority | undefined {
    return this.providerPriorities.find(p => p.providerId === providerId);
  }

  private estimateCost(providerId: string, tokens: number): number {
    const costConfigs = aiCostManager.getCostConfigs();
    const config = costConfigs.find(c => c.providerId === providerId);
    
    if (!config) return 0.01; // 默认估算成本
    
    return (tokens / 1000) * (config.inputTokenCost + config.outputTokenCost) / 2;
  }

  private mapModelToProvider(requestedModel: string, providerId: string): string {
    // 模型映射逻辑 - 根据提供商调整模型名称
    const modelMappings: Record<string, Record<string, string>> = {
      'openai': {
        'gpt-4': 'gpt-4',
        'gpt-3.5': 'gpt-3.5-turbo',
        'default': 'gpt-3.5-turbo'
      },
      'deepseek': {
        'gpt-4': 'deepseek-v3',
        'gpt-3.5': 'deepseek-v3',
        'default': 'deepseek-v3'
      },
      'anthropic': {
        'gpt-4': 'claude-3-5-sonnet',
        'gpt-3.5': 'claude-3-haiku',
        'default': 'claude-3-haiku'
      }
    };

    const providerMappings = modelMappings[providerId];
    if (!providerMappings) return requestedModel;

    return providerMappings[requestedModel] || providerMappings['default'] || requestedModel;
  }

  private incrementLoad(providerId: string): void {
    const current = this.requestQueue.get(providerId) || 0;
    this.requestQueue.set(providerId, current + 1);
    
    const health = this.healthStats.get(providerId);
    if (health) {
      health.currentLoad = Math.min(100, (current + 1) * 10); // 简化的负载计算
    }
  }

  private decrementLoad(providerId: string): void {
    const current = this.requestQueue.get(providerId) || 0;
    const newLoad = Math.max(0, current - 1);
    this.requestQueue.set(providerId, newLoad);
    
    const health = this.healthStats.get(providerId);
    if (health) {
      health.currentLoad = Math.max(0, newLoad * 10);
    }
  }

  private createDefaultHealth(providerId: string): ProviderHealth {
    return {
      providerId,
      isAvailable: true,
      latency: 1000,
      successRate: 90,
      errorRate: 10,
      lastHealthCheck: new Date(),
      consecutiveFailures: 0,
      costEfficiency: 70,
      currentLoad: 0,
      rateLimit: {
        remaining: 1000,
        resetTime: new Date(Date.now() + 60 * 60 * 1000)
      }
    };
  }

  private initializeDefaultPriorities(): void {
    if (this.providerPriorities.length === 0) {
      this.providerPriorities = [
        { providerId: 'openai', priority: 8, enabled: true },
        { providerId: 'anthropic', priority: 7, enabled: true },
        { providerId: 'deepseek', priority: 9, enabled: true }, // 高性价比
        { providerId: 'baichuan', priority: 6, enabled: true }
      ];
    }

    // 初始化健康状态
    this.providerPriorities.forEach(priority => {
      if (!this.healthStats.has(priority.providerId)) {
        this.healthStats.set(priority.providerId, this.createDefaultHealth(priority.providerId));
      }
    });
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      for (const [providerId] of this.healthStats) {
        try {
          // 这里可以添加实际的健康检查逻辑
          // 例如发送一个简单的测试请求
          await this.performHealthCheck(providerId);
        } catch (error) {
          console.warn(`❌ 提供商健康检查失败: ${providerId}`, error);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次
  }

  private async performHealthCheck(providerId: string): Promise<void> {
    // TODO: 实现实际的健康检查逻辑
    // 可以发送一个简单的测试请求来检查提供商状态
  }

  /**
   * 💾 数据持久化
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.HEALTH_STATS, JSON.stringify(Array.from(this.healthStats.entries())));
      localStorage.setItem(this.STORAGE_KEYS.PROVIDER_PRIORITIES, JSON.stringify(this.providerPriorities));
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_STRATEGY, JSON.stringify(this.currentStrategy));
    } catch (error) {
      console.error('❌ 保存路由器配置失败:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const healthData = localStorage.getItem(this.STORAGE_KEYS.HEALTH_STATS);
      if (healthData) {
        const entries = JSON.parse(healthData);
        this.healthStats = new Map(entries.map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            lastHealthCheck: new Date(value.lastHealthCheck),
            rateLimit: {
              ...value.rateLimit,
              resetTime: new Date(value.rateLimit.resetTime)
            }
          }
        ]));
      }

      const prioritiesData = localStorage.getItem(this.STORAGE_KEYS.PROVIDER_PRIORITIES);
      if (prioritiesData) {
        this.providerPriorities = JSON.parse(prioritiesData);
      }

      const strategyData = localStorage.getItem(this.STORAGE_KEYS.CURRENT_STRATEGY);
      if (strategyData) {
        this.currentStrategy = JSON.parse(strategyData);
      }
    } catch (error) {
      console.error('❌ 加载路由器配置失败:', error);
    }
  }

  // 🔍 公开方法
  getHealthStats(): ProviderHealth[] {
    return Array.from(this.healthStats.values());
  }

  getCurrentStrategy(): RoutingStrategy {
    return this.currentStrategy;
  }

  getProviderPriorities(): ProviderPriority[] {
    return [...this.providerPriorities];
  }

  getAvailableStrategies(): RoutingStrategy[] {
    return DEFAULT_ROUTING_STRATEGIES;
  }
}

// 🌍 全局实例
export const aiRouter = new AIRouter();