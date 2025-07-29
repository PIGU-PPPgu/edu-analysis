/**
 * 🚪 统一AI网关 - 整合所有AI服务的统一入口
 * 基于现有aiRouter架构，提供统一的AI服务访问接口
 */

import { aiRouter } from "../core/aiRouter";
import { EnhancedAIClient } from "../../enhancedAIClient";
import { getAllProviders, getProviderConfig } from "../../aiProviderManager";
import {
  AIRequestParams,
  AIAnalysisResult,
  ProviderConfig,
  AIRequestOptions,
} from "../../../types/ai";
import { getUserAIConfig, getUserAPIKey } from "../../../utils/userAuth";
import { logInfo, logError } from "../../../utils/logger";
import { toast } from "sonner";
import { aiCache } from "./AICache";
import { aiPerformanceMonitor } from "./AIPerformanceMonitor";

/**
 * 统一AI请求接口
 */
export interface UnifiedAIRequest {
  content: string;
  requestType:
    | "analysis"
    | "chat"
    | "image_analysis"
    | "grade_analysis"
    | "homework_analysis";
  context?: {
    subject?: string;
    homeworkId?: string;
    existingKnowledgePoints?: any[];
    conversationHistory?: { role: string; content: string }[];
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    priority?: "low" | "normal" | "high" | "critical";
    preferredProviders?: string[];
    excludedProviders?: string[];
  };
}

/**
 * 统一AI响应接口
 */
export interface UnifiedAIResponse {
  success: boolean;
  content: string;
  metadata?: {
    provider: string;
    model: string;
    tokensUsed?: number;
    responseTime: number;
    confidence: number;
    cost?: number;
    cached?: boolean;
    cacheHit?: boolean;
  };
  knowledgePoints?: any[];
  error?: string;
}

/**
 * 统一AI网关类
 */
export class AIGateway {
  private static instance: AIGateway;
  private initialized = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  /**
   * 初始化网关
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logInfo("🚪 正在初始化AI网关...");

      // 验证aiRouter可用性
      const healthStats = aiRouter.getHealthStats();
      logInfo(`📊 AI路由器状态: ${healthStats.length}个提供商`);

      // 验证提供商配置
      const providers = getAllProviders();
      const providerCount = Object.keys(providers).length;
      logInfo(`⚙️ 可用提供商: ${providerCount}个`);

      this.initialized = true;
      logInfo("✅ AI网关初始化完成");
    } catch (error) {
      logError("❌ AI网关初始化失败:", error);
      throw new Error(`AI网关初始化失败: ${error.message}`);
    }
  }

  /**
   * 🎯 统一AI请求处理入口
   */
  async processRequest(request: UnifiedAIRequest): Promise<UnifiedAIResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      logInfo("🎯 开始处理AI请求", {
        type: request.requestType,
        contentLength: request.content.length,
        priority: request.options?.priority || "normal",
      });

      // 🗄️ 首先检查缓存
      const cachedResponse = aiCache.get(request);
      if (cachedResponse) {
        logInfo("🎯 缓存命中，直接返回结果", {
          type: request.requestType,
          responseTime: Date.now() - startTime,
        });
        return cachedResponse;
      }

      // 使用AI路由器选择最佳提供商
      const routeRequest = {
        modelId: this.getModelForRequestType(request.requestType),
        estimatedTokens: this.estimateTokens(request.content),
        priority: request.options?.priority || "normal",
        context: JSON.stringify(request.context || {}),
        requirements: {
          maxLatency: this.getMaxLatencyForType(request.requestType),
          preferredProviders: request.options?.preferredProviders,
          excludedProviders: request.options?.excludedProviders,
        },
      };

      const routeResult = await aiRouter.route(routeRequest);

      logInfo("📍 路由选择结果", {
        provider: routeResult.selectedProvider,
        model: routeResult.selectedModel,
        confidence: routeResult.confidence,
      });

      // 创建AI客户端
      const client = await this.createClient(
        routeResult.selectedProvider,
        routeResult.selectedModel
      );

      // 根据请求类型处理
      let result: UnifiedAIResponse;

      switch (request.requestType) {
        case "analysis":
          result = await this.handleAnalysisRequest(
            client,
            request,
            routeResult
          );
          break;
        case "chat":
          result = await this.handleChatRequest(client, request, routeResult);
          break;
        case "image_analysis":
          result = await this.handleImageAnalysisRequest(
            client,
            request,
            routeResult
          );
          break;
        case "grade_analysis":
          result = await this.handleGradeAnalysisRequest(
            client,
            request,
            routeResult
          );
          break;
        case "homework_analysis":
          result = await this.handleHomeworkAnalysisRequest(
            client,
            request,
            routeResult
          );
          break;
        default:
          throw new Error(`不支持的请求类型: ${request.requestType}`);
      }

      // 更新提供商健康状态
      const responseTime = Date.now() - startTime;
      await aiRouter.updateProviderHealth(routeResult.selectedProvider, {
        success: result.success,
        latency: responseTime,
        error: result.error,
      });

      // 设置响应元数据
      result.metadata = {
        provider: routeResult.selectedProvider,
        model: routeResult.selectedModel,
        responseTime,
        confidence: routeResult.confidence * 100,
        cost: routeResult.estimatedCost,
        cached: false,
        cacheHit: false,
        ...result.metadata,
      };

      // 🗄️ 如果请求成功，存储到缓存
      if (result.success) {
        aiCache.set(request, result);
        logInfo("🗄️ 响应已存储到缓存", {
          type: request.requestType,
          contentLength: result.content.length,
        });
      }

      logInfo("✅ AI请求处理完成", {
        success: result.success,
        responseTime,
        provider: routeResult.selectedProvider,
      });

      // 📊 记录性能指标
      aiPerformanceMonitor.recordRequest(request, result, startTime);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logError("❌ AI请求处理失败:", error);

      const errorResult = {
        success: false,
        content: "",
        error: error.message || "未知错误",
        metadata: {
          provider: "unknown",
          model: "unknown",
          responseTime,
          confidence: 0,
          cached: false,
          cacheHit: false,
        },
      };

      // 📊 记录错误的性能指标
      aiPerformanceMonitor.recordRequest(request, errorResult, startTime);

      return errorResult;
    }
  }

  /**
   * 📝 处理文本分析请求
   */
  private async handleAnalysisRequest(
    client: EnhancedAIClient,
    request: UnifiedAIRequest,
    routeResult: any
  ): Promise<UnifiedAIResponse> {
    try {
      const systemPrompt = `你是一位专业的教育内容分析专家，擅长识别学习内容中的关键信息和知识点。
请分析以下内容并提供有价值的洞察。`;

      const response = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.content },
        ],
        temperature: request.options?.temperature || 0.3,
        max_tokens: request.options?.maxTokens || 2000,
      });

      const content = response.choices[0]?.message?.content || "";

      return {
        success: true,
        content,
        metadata: {
          tokensUsed: this.estimateTokens(content),
        },
      };
    } catch (error) {
      throw new Error(`文本分析失败: ${error.message}`);
    }
  }

  /**
   * 💬 处理聊天对话请求
   */
  private async handleChatRequest(
    client: EnhancedAIClient,
    request: UnifiedAIRequest,
    routeResult: any
  ): Promise<UnifiedAIResponse> {
    try {
      const messages = [];

      // 添加系统提示
      messages.push({
        role: "system",
        content:
          "你是一个教育AI助手，专门帮助教师分析学生数据和提供教学建议。请用简洁专业的语言回答。",
      });

      // 添加对话历史
      if (request.context?.conversationHistory) {
        messages.push(...request.context.conversationHistory);
      }

      // 添加当前消息
      messages.push({ role: "user", content: request.content });

      const response = await client.chat.completions.create({
        messages,
        temperature: request.options?.temperature || 0.7,
        max_tokens: request.options?.maxTokens || 1000,
      });

      const content = response.choices[0]?.message?.content || "";

      return {
        success: true,
        content,
        metadata: {
          tokensUsed: this.estimateTokens(content),
        },
      };
    } catch (error) {
      throw new Error(`聊天对话失败: ${error.message}`);
    }
  }

  /**
   * 🖼️ 处理图像分析请求
   */
  private async handleImageAnalysisRequest(
    client: EnhancedAIClient,
    request: UnifiedAIRequest,
    routeResult: any
  ): Promise<UnifiedAIResponse> {
    try {
      const systemPrompt = `你是一位教育专家，擅长分析教育图片内容并提取知识点。
请分析图片中的作业内容，识别出包含的知识点。

科目: ${request.context?.subject || "未指定"}

以JSON格式返回分析结果:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点描述",
      "importance": 1-5,
      "confidence": 0-100
    }
  ]
}`;

      // 构建多模态消息
      const messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "请分析这张图片中的教育内容" },
            { type: "image_url", image_url: { url: request.content } },
          ],
        },
      ];

      const response = await client.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";

      // 尝试解析JSON格式的知识点
      let knowledgePoints = [];
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          knowledgePoints = parsed.knowledgePoints || [];
        }
      } catch (parseError) {
        logError("解析知识点JSON失败:", parseError);
      }

      return {
        success: true,
        content,
        knowledgePoints,
        metadata: {
          tokensUsed: this.estimateTokens(content),
        },
      };
    } catch (error) {
      throw new Error(`图像分析失败: ${error.message}`);
    }
  }

  /**
   * 📊 处理成绩分析请求
   */
  private async handleGradeAnalysisRequest(
    client: EnhancedAIClient,
    request: UnifiedAIRequest,
    routeResult: any
  ): Promise<UnifiedAIResponse> {
    try {
      const systemPrompt = `你是一位教育数据分析专家，擅长分析学生成绩数据并提供教学洞察。
请分析以下成绩数据，提供有价值的分析结果和建议。

请关注以下方面：
1. 成绩分布情况
2. 学科强弱项分析
3. 学习趋势识别
4. 改进建议`;

      const response = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.content },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const content = response.choices[0]?.message?.content || "";

      return {
        success: true,
        content,
        metadata: {
          tokensUsed: this.estimateTokens(content),
        },
      };
    } catch (error) {
      throw new Error(`成绩分析失败: ${error.message}`);
    }
  }

  /**
   * 📝 处理作业分析请求
   */
  private async handleHomeworkAnalysisRequest(
    client: EnhancedAIClient,
    request: UnifiedAIRequest,
    routeResult: any
  ): Promise<UnifiedAIResponse> {
    try {
      const existingPoints = request.context?.existingKnowledgePoints || [];
      const existingPointsText =
        existingPoints.length > 0
          ? existingPoints.map((p) => `- ${p.name}`).join("\n")
          : "(无)";

      const systemPrompt = `你是一位教育专家，擅长分析作业内容并识别知识点。

科目: ${request.context?.subject || "未指定"}
已有知识点:
${existingPointsText}

请分析作业内容，识别新的知识点。以JSON格式返回:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点描述",
      "importance": 1-5,
      "masteryLevel": 1-5,
      "confidence": 0-100,
      "isNew": true
    }
  ]
}`;

      const response = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.content },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";

      // 解析知识点
      let knowledgePoints = [];
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          knowledgePoints = parsed.knowledgePoints || [];
        }
      } catch (parseError) {
        logError("解析作业知识点JSON失败:", parseError);
      }

      return {
        success: true,
        content,
        knowledgePoints,
        metadata: {
          tokensUsed: this.estimateTokens(content),
        },
      };
    } catch (error) {
      throw new Error(`作业分析失败: ${error.message}`);
    }
  }

  /**
   * 🔧 创建AI客户端
   */
  private async createClient(
    providerId: string,
    modelId: string
  ): Promise<EnhancedAIClient> {
    try {
      // 获取API密钥
      const apiKey = await getUserAPIKey(providerId);
      if (!apiKey) {
        throw new Error(`未找到${providerId}的API密钥`);
      }

      // 创建增强客户端
      const client = new EnhancedAIClient(
        apiKey,
        providerId,
        modelId,
        true // 启用调试模式
      );

      return client;
    } catch (error) {
      throw new Error(`创建AI客户端失败: ${error.message}`);
    }
  }

  /**
   * 📏 估算token数量
   */
  private estimateTokens(text: string): number {
    // 简单估算：中文按字符数，英文按单词数*1.3
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, "")
      .split(/\s+/)
      .filter(Boolean).length;

    return Math.ceil(chineseChars + englishWords * 1.3);
  }

  /**
   * 🎯 根据请求类型获取推荐模型
   */
  private getModelForRequestType(requestType: string): string {
    const modelMap = {
      analysis: "gpt-4",
      chat: "gpt-3.5",
      image_analysis: "gpt-4-vision",
      grade_analysis: "gpt-4",
      homework_analysis: "gpt-4",
    };

    return modelMap[requestType] || "gpt-3.5";
  }

  /**
   * ⏱️ 根据请求类型获取最大延迟
   */
  private getMaxLatencyForType(requestType: string): number {
    const latencyMap = {
      analysis: 10000, // 10秒
      chat: 5000, // 5秒
      image_analysis: 15000, // 15秒
      grade_analysis: 12000, // 12秒
      homework_analysis: 10000, // 10秒
    };

    return latencyMap[requestType] || 8000;
  }

  /**
   * 📊 获取网关状态
   */
  getStatus() {
    return {
      initialized: this.initialized,
      routerStats: aiRouter.getHealthStats(),
      currentStrategy: aiRouter.getCurrentStrategy(),
      availableProviders: Object.keys(getAllProviders()).length,
      cacheStats: aiCache.getStats(),
      cacheInfo: aiCache.getInfo(),
      performanceMetrics: aiPerformanceMonitor.getMetrics(),
    };
  }

  /**
   * 🗄️ 获取缓存性能报告
   */
  getCacheReport() {
    return aiCache.getPerformanceReport();
  }

  /**
   * 🧹 清理缓存
   */
  clearCache(requestType?: string) {
    if (requestType) {
      aiCache.clearByType(requestType);
      logInfo("🧹 已清理特定类型缓存", { requestType });
    } else {
      aiCache.clear();
      logInfo("🧹 已清理全部缓存");
    }
  }

  /**
   * ⚡ 预热缓存
   */
  async warmupCache(commonRequests: UnifiedAIRequest[]): Promise<void> {
    await aiCache.warmup(commonRequests);
    logInfo("⚡ 缓存预热完成", { requestCount: commonRequests.length });
  }

  /**
   * 📈 获取性能指标
   */
  getPerformanceMetrics(timeRangeMs?: number) {
    return aiPerformanceMonitor.getMetrics(timeRangeMs);
  }

  /**
   * 📊 获取性能趋势数据
   */
  getPerformanceTrends(intervalMs?: number) {
    return aiPerformanceMonitor.getTrendData(intervalMs);
  }

  /**
   * ⚠️ 获取最近错误
   */
  getRecentErrors(limit?: number) {
    return aiPerformanceMonitor.getRecentErrors(limit);
  }

  /**
   * 💡 获取性能建议
   */
  getPerformanceRecommendations() {
    return aiPerformanceMonitor.getPerformanceRecommendations();
  }

  /**
   * 🧹 清理性能数据
   */
  cleanupPerformanceData(olderThanMs?: number) {
    aiPerformanceMonitor.cleanup(olderThanMs);
    logInfo("🧹 性能数据清理完成");
  }

  /**
   * 🔄 重新初始化网关
   */
  async reinitialize(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }
}

// 导出单例实例
export const aiGateway = AIGateway.getInstance();
