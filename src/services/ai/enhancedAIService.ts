/**
 * 🤖 增强版AI服务
 * 集成成本管理、智能路由和缓存优化的统一AI服务接口
 */

import { toast } from "sonner";
import { EnhancedAIClient } from "../enhancedAIClient";
import { aiCostManager, recordAIUsage } from "./core/aiCostManager";
import { aiRouter, RouteRequest } from "./core/aiRouter";
import { aiCacheManager } from "./core/aiCache";
import { getAPIKey } from "@/utils/apiKeyManager";

// AI请求接口
export interface AIRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  model?: string; // 请求的模型 (可选，会被路由器优化)
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  priority?: "low" | "normal" | "high" | "critical";
  context?: string; // 用于缓存优化
  cacheable?: boolean; // 是否允许缓存
  requirements?: {
    maxLatency?: number; // 最大延迟要求
    maxCost?: number; // 最大成本要求
    preferredProviders?: string[];
    excludedProviders?: string[];
  };
}

// AI响应接口
export interface AIResponse {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    providerId: string;
    modelId: string;
    estimatedCost: number;
    actualLatency: number;
    fromCache: boolean;
    routingReasoning: string;
  };
}

// 错误重试配置
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // 基础延迟 (ms)
  maxDelay: number; // 最大延迟 (ms)
  backoffFactor: number; // 退避因子
}

/**
 * 增强版AI服务类
 */
export class EnhancedAIService {
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  /**
   * 🎯 统一AI调用接口
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now();
    const context =
      request.context || this.generateContextKey(request.messages);

    console.log(
      `🤖 AI请求开始: ${request.model || "自动选择"} (优先级: ${request.priority || "normal"})`
    );

    try {
      // 1. 缓存检查
      if (request.cacheable !== false) {
        const cachedResponse = await this.checkCache(context, request);
        if (cachedResponse) {
          console.log(`⚡ 缓存命中，跳过AI调用`);
          return cachedResponse;
        }
      }

      // 2. 智能路由
      const routeRequest: RouteRequest = {
        modelId: request.model || "gpt-3.5",
        estimatedTokens: this.estimateTokens(request.messages),
        priority: request.priority || "normal",
        context,
        requirements: request.requirements,
      };

      const routeResult = await aiRouter.route(routeRequest);
      console.log(
        `🎯 路由选择: ${routeResult.selectedProvider} - ${routeResult.reasoning}`
      );

      // 3. 执行AI调用（带重试）
      const response = await this.executeWithRetry(
        request,
        routeResult,
        startTime
      );

      // 4. 缓存结果
      if (request.cacheable !== false) {
        await this.cacheResponse(context, response, routeResult);
      }

      return response;
    } catch (error) {
      console.error(`❌ AI调用失败:`, error);

      // 记录失败
      await this.recordFailure(
        request,
        error as Error,
        performance.now() - startTime
      );

      throw error;
    }
  }

  /**
   * 🔄 带重试的AI调用执行
   */
  private async executeWithRetry(
    request: AIRequest,
    routeResult: any,
    startTime: number,
    retryCount: number = 0
  ): Promise<AIResponse> {
    try {
      const response = await this.executeAICall(
        request,
        routeResult,
        startTime
      );

      // 更新提供商健康状态
      await aiRouter.updateProviderHealth(routeResult.selectedProvider, {
        success: true,
        latency: performance.now() - startTime,
      });

      return response;
    } catch (error) {
      const isRetryable = this.isRetryableError(error as Error);
      const shouldRetry =
        retryCount < this.defaultRetryConfig.maxRetries && isRetryable;

      // 更新提供商健康状态
      await aiRouter.updateProviderHealth(routeResult.selectedProvider, {
        success: false,
        latency: performance.now() - startTime,
        error: (error as Error).message,
      });

      if (shouldRetry) {
        const delay = Math.min(
          this.defaultRetryConfig.baseDelay *
            Math.pow(this.defaultRetryConfig.backoffFactor, retryCount),
          this.defaultRetryConfig.maxDelay
        );

        console.log(
          `🔄 重试AI调用 (${retryCount + 1}/${this.defaultRetryConfig.maxRetries}) 延迟: ${delay}ms`
        );

        await this.sleep(delay);

        // 尝试故障转移
        if (
          routeResult.fallbackProviders &&
          routeResult.fallbackProviders.length > retryCount
        ) {
          routeResult.selectedProvider =
            routeResult.fallbackProviders[retryCount];
          console.log(`🔀 故障转移到: ${routeResult.selectedProvider}`);
        }

        return this.executeWithRetry(
          request,
          routeResult,
          startTime,
          retryCount + 1
        );
      }

      throw error;
    }
  }

  /**
   * ⚡ 执行实际的AI调用
   */
  private async executeAICall(
    request: AIRequest,
    routeResult: any,
    startTime: number
  ): Promise<AIResponse> {
    // 获取API密钥
    const apiKey = getAPIKey(routeResult.selectedProvider);
    if (!apiKey) {
      throw new Error(`未找到 ${routeResult.selectedProvider} 的API密钥`);
    }

    // 创建AI客户端
    const client = new EnhancedAIClient(
      apiKey,
      routeResult.selectedProvider,
      routeResult.selectedModel
    );

    // 准备请求参数
    const params = {
      messages: request.messages,
      model: routeResult.selectedModel,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      stream: request.stream || false,
    };

    // 调用AI服务
    const result = await client.chat.completions.create(params);
    const endTime = performance.now();
    const latency = endTime - startTime;

    // 提取响应数据
    const content = result.choices[0]?.message?.content || "";
    const usage = result.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    // 记录使用情况
    await recordAIUsage({
      providerId: routeResult.selectedProvider,
      modelId: routeResult.selectedModel,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      requestLatency: latency,
      success: true,
      metadata: {
        priority: request.priority,
        context: request.context,
        estimatedCost: routeResult.estimatedCost,
      },
    });

    // 构建响应
    const response: AIResponse = {
      content,
      finishReason: result.choices[0]?.finish_reason || "stop",
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      metadata: {
        providerId: routeResult.selectedProvider,
        modelId: routeResult.selectedModel,
        estimatedCost: routeResult.estimatedCost,
        actualLatency: latency,
        fromCache: false,
        routingReasoning: routeResult.reasoning,
      },
    };

    console.log(
      `✅ AI调用成功: ${routeResult.selectedProvider} (${latency.toFixed(0)}ms, $${routeResult.estimatedCost.toFixed(4)})`
    );

    return response;
  }

  /**
   * 🔍 检查缓存
   */
  private async checkCache(
    context: string,
    request: AIRequest
  ): Promise<AIResponse | null> {
    const cacheKey = this.generateCacheKey(context, request);
    const cached = await aiCacheManager.get(cacheKey, ["ai-response"]);

    if (cached) {
      // 构建缓存响应
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          fromCache: true,
        },
      };
    }

    return null;
  }

  /**
   * 💾 缓存响应
   */
  private async cacheResponse(
    context: string,
    response: AIResponse,
    routeResult: any
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(context, null);

    await aiCacheManager.set(cacheKey, response, {
      ttl: this.getCacheTTL(response),
      tags: ["ai-response", routeResult.selectedProvider],
      metadata: {
        providerId: routeResult.selectedProvider,
        modelId: routeResult.selectedModel,
        tokenCount: response.usage.totalTokens,
        cost: response.metadata.estimatedCost,
      },
    });
  }

  /**
   * 📝 记录失败情况
   */
  private async recordFailure(
    request: AIRequest,
    error: Error,
    latency: number
  ): Promise<void> {
    await recordAIUsage({
      providerId: "unknown",
      modelId: request.model || "unknown",
      inputTokens: this.estimateTokens(request.messages),
      outputTokens: 0,
      requestLatency: latency,
      success: false,
      error: error.message,
      metadata: {
        priority: request.priority,
        context: request.context,
      },
    });
  }

  /**
   * 🔧 工具方法
   */
  private generateContextKey(
    messages: Array<{ role: string; content: string }>
  ): string {
    return messages.map((m) => `${m.role}:${m.content}`).join("|");
  }

  private generateCacheKey(context: string, request: AIRequest | null): string {
    const baseKey = context;
    if (!request) return baseKey;

    const additionalInfo = [
      request.model || "",
      request.maxTokens || "",
      request.temperature || "",
      JSON.stringify(request.requirements || {}),
    ].join("|");

    return `${baseKey}|${additionalInfo}`;
  }

  private estimateTokens(
    messages: Array<{ role: string; content: string }>
  ): number {
    const text = messages.map((m) => m.content).join(" ");
    return Math.ceil(text.length / 4); // 粗略估算：4字符 ≈ 1 token
  }

  private getCacheTTL(response: AIResponse): number {
    // 根据响应类型和内容动态调整TTL
    if (response.content.length > 1000) {
      return 60 * 60 * 1000; // 长内容缓存1小时
    } else {
      return 30 * 60 * 1000; // 短内容缓存30分钟
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      "timeout",
      "network",
      "rate limit",
      "server error",
      "503",
      "502",
      "500",
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some((keyword) => errorMessage.includes(keyword));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 📊 获取服务统计信息
   */
  async getServiceStatistics() {
    const costStats = aiCostManager.getStatistics();
    const cacheStats = aiCacheManager.getStatistics();
    const routerStats = aiRouter.getHealthStats();

    return {
      cost: costStats,
      cache: cacheStats,
      providers: routerStats,
      summary: {
        totalRequests: costStats.totalRequests,
        totalCost: costStats.totalCost,
        avgLatency:
          routerStats.reduce((sum, p) => sum + p.latency, 0) /
          routerStats.length,
        cacheHitRate: cacheStats.hitRate,
        costSavings: cacheStats.costSavings,
      },
    };
  }

  /**
   * 🔧 批量处理支持
   */
  async batchChat(requests: AIRequest[]): Promise<AIResponse[]> {
    console.log(`📦 批量处理 ${requests.length} 个AI请求`);

    return aiCacheManager.batchProcess(
      requests,
      async (batchRequests: AIRequest[]) => {
        // 并行处理批量请求
        const promises = batchRequests.map((request) => this.chat(request));
        return Promise.all(promises);
      }
    );
  }

  /**
   * 🎛️ 配置管理
   */
  setRouterStrategy(strategyType: string): void {
    const strategies = aiRouter.getAvailableStrategies();
    const strategy = strategies.find((s) => s.type === strategyType);

    if (strategy) {
      aiRouter.setStrategy(strategy);
      toast.success(`AI路由策略已切换: ${strategy.name}`);
    } else {
      toast.error(`未找到路由策略: ${strategyType}`);
    }
  }

  setCachePolicy(policyName: string): void {
    const policies = aiCacheManager.getAvailablePolicies();
    const policy = policies.find((p) => p.name === policyName);

    if (policy) {
      aiCacheManager.setPolicy(policy);
      toast.success(`AI缓存策略已切换: ${policy.name}`);
    } else {
      toast.error(`未找到缓存策略: ${policyName}`);
    }
  }

  /**
   * 🧹 维护方法
   */
  async clearCache(tags?: string[]): Promise<void> {
    await aiCacheManager.clear(tags);
    toast.success("AI缓存已清空");
  }

  async exportStatistics(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      statistics: await this.getServiceStatistics(),
      configuration: {
        routerStrategy: aiRouter.getCurrentStrategy(),
        cachePolicy: aiCacheManager.getCurrentPolicy(),
        budgets: aiCostManager.getBudgets(),
      },
    };
  }
}

// 🌍 全局实例
export const enhancedAIService = new EnhancedAIService();

// 🎯 快捷方法
export const aiChat = enhancedAIService.chat.bind(enhancedAIService);
export const aiBatchChat = enhancedAIService.batchChat.bind(enhancedAIService);
export const getAIStatistics =
  enhancedAIService.getServiceStatistics.bind(enhancedAIService);
