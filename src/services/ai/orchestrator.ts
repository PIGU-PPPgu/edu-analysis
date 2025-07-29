/**
 * AI调度器 - 统一AI引擎核心
 *
 * 功能：
 * - AI请求路由和调度
 * - 多提供商负载均衡
 * - 故障转移和重试
 * - 性能监控和优化
 */

import { logError, logInfo } from "@/utils/logger";
import { requestCache } from "../core/cache";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import type { KnowledgePoint } from "@/types/homework";
import type { AIAnalysisResult } from "@/types/analysis";

export interface AIRequest {
  type: "analysis" | "chat" | "image" | "text";
  content: string;
  context?: {
    existingPoints?: KnowledgePoint[];
    subject?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    providerId?: string;
    modelId?: string;
    priority?: "low" | "normal" | "high";
    enableCache?: boolean;
    retries?: number;
  };
}

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    providerId: string;
    modelId: string;
    processingTime: number;
    tokensUsed?: number;
    cached: boolean;
    retries: number;
  };
}

export interface ProviderStatus {
  id: string;
  name: string;
  available: boolean;
  responseTime: number;
  errorRate: number;
  lastError?: string;
  priority: number;
}

/**
 * AI服务调度器
 */
export class AIOrchestrator {
  private providerStatus = new Map<string, ProviderStatus>();
  private requestQueue: AIRequest[] = [];
  private processingQueue = false;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
  };

  constructor() {
    this.initializeProviderStatus();
    this.startQueueProcessor();
  }

  /**
   * 处理AI请求
   */
  async process<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId(request);

    try {
      logInfo("AI请求开始处理", {
        type: request.type,
        requestId,
        priority: request.options?.priority || "normal",
      });

      this.stats.totalRequests++;

      // 检查缓存
      if (request.options?.enableCache !== false) {
        const cacheKey = this.generateCacheKey(request);
        const cached = requestCache.get(cacheKey);

        if (cached) {
          this.stats.cacheHits++;
          logInfo("AI请求命中缓存", { requestId, cacheKey });

          return {
            success: true,
            data: cached,
            metadata: {
              providerId: "cache",
              modelId: "cache",
              processingTime: Date.now() - startTime,
              cached: true,
              retries: 0,
            },
          };
        }
      }

      // 选择最佳提供商
      const provider = await this.selectProvider(request);
      if (!provider) {
        throw new Error("没有可用的AI提供商");
      }

      // 执行AI请求
      const result = await this.executeRequest(request, provider);

      // 缓存结果
      if (request.options?.enableCache !== false && result.success) {
        const cacheKey = this.generateCacheKey(request);
        const cacheTTL = this.getCacheTTL(request.type);
        requestCache.set(cacheKey, result.data, cacheTTL);
      }

      // 更新统计
      this.stats.successfulRequests++;
      this.updateProviderStatus(provider.id, true, Date.now() - startTime);

      // 更新平均响应时间
      const processingTime = Date.now() - startTime;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.totalRequests - 1) +
          processingTime) /
        this.stats.totalRequests;

      logInfo("AI请求处理完成", {
        requestId,
        providerId: provider.id,
        processingTime,
        success: result.success,
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime,
          cached: false,
          retries: 0,
        },
      };
    } catch (error) {
      this.stats.failedRequests++;
      logError("AI请求处理失败", { requestId, error });

      return {
        success: false,
        error: error.message || "AI请求处理失败",
        metadata: {
          providerId: "unknown",
          modelId: "unknown",
          processingTime: Date.now() - startTime,
          cached: false,
          retries: 0,
        },
      };
    }
  }

  /**
   * 批量处理AI请求
   */
  async processBatch<T = any>(requests: AIRequest[]): Promise<AIResponse<T>[]> {
    logInfo("批量AI请求开始处理", { count: requests.length });

    const results = await Promise.allSettled(
      requests.map((request) => this.process<T>(request))
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
            success: false,
            error: result.reason?.message || "批量请求失败",
            metadata: {
              providerId: "unknown",
              modelId: "unknown",
              processingTime: 0,
              cached: false,
              retries: 0,
            },
          }
    );
  }

  /**
   * 选择最佳AI提供商
   */
  private async selectProvider(
    request: AIRequest
  ): Promise<ProviderStatus | null> {
    // 如果指定了提供商，优先使用
    if (request.options?.providerId) {
      const specified = this.providerStatus.get(request.options.providerId);
      if (specified?.available) {
        return specified;
      }
    }

    // 获取用户配置的默认提供商
    try {
      const aiConfig = await getUserAIConfig();

      if (aiConfig?.provider && aiConfig?.enabled) {
        const configured = this.providerStatus.get(aiConfig.provider);
        if (configured?.available) {
          return configured;
        }
      }
    } catch (error) {
      logError("获取用户AI配置失败", error);
    }

    // 按优先级和性能选择可用提供商
    const availableProviders = Array.from(this.providerStatus.values())
      .filter((provider) => provider.available)
      .sort((a, b) => {
        // 按优先级排序，然后按响应时间排序
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.responseTime - b.responseTime;
      });

    return availableProviders[0] || null;
  }

  /**
   * 执行AI请求
   */
  private async executeRequest(
    request: AIRequest,
    provider: ProviderStatus
  ): Promise<AIResponse> {
    const maxRetries = request.options?.retries || 3;
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 动态导入相应的AI服务
        const aiService = await this.getAIService(request.type);

        const result = await aiService.execute(request, provider);

        if (result.success) {
          return result;
        }

        lastError = new Error(result.error || "AI服务执行失败");
      } catch (error) {
        lastError = error;
        logError(`AI请求第${attempt + 1}次重试失败`, {
          providerId: provider.id,
          error: error.message,
        });

        // 更新提供商状态
        this.updateProviderStatus(provider.id, false, 0, error.message);

        // 如果不是最后一次重试，等待一段时间
        if (attempt < maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000); // 指数退避
        }
      }
    }

    throw lastError;
  }

  /**
   * 获取AI服务实例
   */
  private async getAIService(type: AIRequest["type"]) {
    switch (type) {
      case "analysis":
        const { analysisService } = await import("./analysis");
        return analysisService;

      case "chat":
        const { chatService } = await import("./chat");
        return chatService;

      case "image":
      case "text":
        const { analysisService: textService } = await import("./analysis");
        return textService;

      default:
        throw new Error(`不支持的AI请求类型: ${type}`);
    }
  }

  /**
   * 初始化提供商状态
   */
  private initializeProviderStatus(): void {
    const providers = [
      { id: "doubao", name: "豆包", priority: 5 },
      { id: "deepseek", name: "DeepSeek", priority: 4 },
      { id: "qwen", name: "通义千问", priority: 4 },
      { id: "sbjt", name: "硅基流动", priority: 3 },
      { id: "openai", name: "OpenAI", priority: 3 },
    ];

    for (const provider of providers) {
      this.providerStatus.set(provider.id, {
        ...provider,
        available: true,
        responseTime: 1000,
        errorRate: 0,
        priority: provider.priority,
      });
    }
  }

  /**
   * 更新提供商状态
   */
  private updateProviderStatus(
    providerId: string,
    success: boolean,
    responseTime: number,
    errorMessage?: string
  ): void {
    const status = this.providerStatus.get(providerId);
    if (!status) return;

    // 更新响应时间（移动平均）
    if (success && responseTime > 0) {
      status.responseTime = status.responseTime * 0.8 + responseTime * 0.2;
    }

    // 更新错误率
    const errorWeight = success ? 0 : 1;
    status.errorRate = status.errorRate * 0.9 + errorWeight * 0.1;

    // 更新可用性
    status.available = status.errorRate < 0.5; // 错误率超过50%则标记为不可用

    if (errorMessage) {
      status.lastError = errorMessage;
    }

    this.providerStatus.set(providerId, status);
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(request: AIRequest): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(JSON.stringify(request));
    return `ai_${timestamp}_${hash}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: AIRequest): string {
    const key = {
      type: request.type,
      content: request.content.substring(0, 100), // 限制长度
      context: request.context,
      options: {
        temperature: request.options?.temperature,
        providerId: request.options?.providerId,
        modelId: request.options?.modelId,
      },
    };

    return `ai_cache_${this.simpleHash(JSON.stringify(key))}`;
  }

  /**
   * 获取缓存TTL
   */
  private getCacheTTL(type: AIRequest["type"]): number {
    switch (type) {
      case "analysis":
        return 30 * 60 * 1000; // 30分钟
      case "chat":
        return 10 * 60 * 1000; // 10分钟
      case "image":
        return 60 * 60 * 1000; // 60分钟
      case "text":
        return 20 * 60 * 1000; // 20分钟
      default:
        return 15 * 60 * 1000; // 15分钟
    }
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 启动队列处理器
   */
  private startQueueProcessor(): void {
    // 目前暂不实现队列，直接处理
    // 后续可以添加队列功能以支持限流和优先级处理
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 获取提供商状态
   */
  getProviderStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * 重置提供商状态
   */
  resetProviderStatus(providerId?: string): void {
    if (providerId) {
      const status = this.providerStatus.get(providerId);
      if (status) {
        status.available = true;
        status.errorRate = 0;
        status.responseTime = 1000;
        status.lastError = undefined;
      }
    } else {
      this.initializeProviderStatus();
    }
  }
}

// 导出单例实例
export const aiOrchestrator = new AIOrchestrator();
