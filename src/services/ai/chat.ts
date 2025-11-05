/**
 * AI对话服务 - 统一聊天功能
 *
 * 功能：
 * - 教育AI助手对话
 * - 上下文管理
 * - 多轮对话支持
 * - 专业教育领域问答
 */

import { logError, logInfo } from "@/utils/logger";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import type { AIRequest, AIResponse, ProviderStatus } from "./orchestrator";

// 复用现有的AI客户端
import { GenericAIClient } from "../aiService";
import { getProviderConfig, getProviderEndpoint } from "../aiProviderManager";

export interface ChatRequest extends AIRequest {
  type: "chat";
  content: string;
  context?: {
    conversationHistory?: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    subject?: string;
  };
}

export interface ChatResult {
  response: string;
  conversationId?: string;
  metadata: {
    tokensUsed?: number;
    modelUsed: string;
    responseTime: number;
  };
}

/**
 * AI对话服务
 */
export class AIChatService {
  private conversationHistory = new Map<
    string,
    Array<{ role: string; content: string }>
  >();

  /**
   * 执行对话请求
   */
  async execute(
    request: ChatRequest,
    provider: ProviderStatus
  ): Promise<AIResponse<ChatResult>> {
    const startTime = Date.now();

    try {
      logInfo("开始AI对话处理", {
        providerId: provider.id,
        messageLength: request.content.length,
        hasHistory: !!request.context?.conversationHistory?.length,
      });

      // 获取AI客户端
      const client = await this.createAIClient(provider, request);
      if (!client) {
        throw new Error(
          `无法创建${provider.id}的AI客户端，请检查配置和API密钥`
        );
      }

      // 构建对话消息
      const messages = this.buildChatMessages(request);

      // 发送对话请求
      const response = await this.sendChatRequest(client, messages, {
        temperature: request.options?.temperature || 0.7,
        maxTokens: request.options?.maxTokens || 1000,
      });

      // 解析响应
      const chatResult = this.parseChatResponse(
        response,
        provider,
        Date.now() - startTime
      );

      logInfo("AI对话处理完成", {
        providerId: provider.id,
        responseLength: chatResult.response.length,
        processingTime: chatResult.metadata.responseTime,
      });

      return {
        success: true,
        data: chatResult,
        metadata: {
          providerId: provider.id,
          modelId: request.options?.modelId || "default",
          processingTime: Date.now() - startTime,
          tokensUsed: chatResult.metadata.tokensUsed,
          cached: false,
          retries: 0,
        },
      };
    } catch (error) {
      logError("AI对话处理失败", {
        providerId: provider.id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || "AI对话处理失败",
        metadata: {
          providerId: provider.id,
          modelId: request.options?.modelId || "default",
          processingTime: Date.now() - startTime,
          cached: false,
          retries: 0,
        },
      };
    }
  }

  /**
   * 构建对话消息
   */
  private buildChatMessages(
    request: ChatRequest
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // 添加系统提示
    const systemPrompt =
      request.context?.systemPrompt ||
      this.getDefaultSystemPrompt(request.context?.subject);
    messages.push({ role: "system", content: systemPrompt });

    // 添加对话历史
    if (
      request.context?.conversationHistory &&
      request.context.conversationHistory.length > 0
    ) {
      // 限制历史消息数量，避免token过多
      const recentHistory = request.context.conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }

    // 添加当前用户消息
    messages.push({ role: "user", content: request.content });

    return messages;
  }

  /**
   * 获取默认系统提示
   */
  private getDefaultSystemPrompt(subject?: string): string {
    const subjectContext = subject ? `特别关注${subject}学科的相关问题。` : "";

    return `你是一个专业的教育AI助手，专门帮助教师分析学生成绩数据和提供教学建议。${subjectContext}

你的核心能力包括：
1. 学生成绩数据分析和趋势识别
2. 个性化学习建议和改进方案
3. 教学策略优化建议
4. 知识点掌握情况评估
5. 学习问题诊断和解决方案

请遵循以下原则：
- 回答简洁专业，重点突出
- 基于教育学理论和实践经验
- 提供具体可行的建议
- 关注学生的个体差异
- 控制回答长度在150字以内，除非需要详细解释

如果用户问题超出教育领域，请礼貌地引导回到教育主题。`;
  }

  /**
   * 发送对话请求
   */
  private async sendChatRequest(
    client: any,
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<any> {
    if ("sendRequest" in client) {
      // 使用GenericAIClient
      return await client.sendRequest(messages, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0,
      });
    } else if ("chat" in client) {
      // 使用OpenAI风格客户端
      return await client.chat.completions.create({
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    } else {
      throw new Error("不支持的AI客户端类型");
    }
  }

  /**
   * 解析对话响应
   */
  private parseChatResponse(
    response: any,
    provider: ProviderStatus,
    responseTime: number
  ): ChatResult {
    try {
      // 提取响应内容
      const content =
        response.choices?.[0]?.message?.content ||
        response.choices?.[0]?.text ||
        "";

      if (!content) {
        throw new Error("AI返回内容为空");
      }

      // 提取token使用信息
      const tokensUsed = response.usage?.total_tokens;

      logInfo("对话响应解析成功", {
        contentLength: content.length,
        tokensUsed,
      });

      return {
        response: content.trim(),
        metadata: {
          tokensUsed,
          modelUsed: provider.name,
          responseTime,
        },
      };
    } catch (error) {
      logError("解析对话响应失败", error);
      throw new Error(`解析对话响应失败: ${error.message}`);
    }
  }

  /**
   * 创建AI客户端
   */
  private async createAIClient(
    provider: ProviderStatus,
    request: ChatRequest
  ): Promise<any> {
    try {
      // 获取用户配置
      const aiConfig = await getUserAIConfig();
      const modelId = request.options?.modelId || aiConfig?.version;

      // 获取API密钥
      const apiKey = await getUserAPIKey(provider.id);
      if (!apiKey) {
        throw new Error(`未找到${provider.id}的API密钥`);
      }

      // 获取提供商配置
      const providerConfig = getProviderConfig(provider.id);
      if (!providerConfig) {
        throw new Error(`未找到提供商配置: ${provider.id}`);
      }

      // 创建通用AI客户端
      const client = new GenericAIClient({
        providerId: provider.id,
        apiKey: apiKey,
        modelId: modelId || providerConfig.models[0]?.id || "default",
        baseUrl: getProviderEndpoint(provider.id, providerConfig.baseUrl),
      });

      return client;
    } catch (error) {
      logError(`创建AI客户端失败: ${provider.id}`, error);
      throw error;
    }
  }

  /**
   * 管理对话历史
   */
  saveConversationHistory(
    conversationId: string,
    messages: Array<{ role: string; content: string }>
  ): void {
    // 限制历史消息数量
    const limitedMessages = messages.slice(-20);
    this.conversationHistory.set(conversationId, limitedMessages);
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(
    conversationId: string
  ): Array<{ role: string; content: string }> {
    return this.conversationHistory.get(conversationId) || [];
  }

  /**
   * 清除对话历史
   */
  clearConversationHistory(conversationId?: string): void {
    if (conversationId) {
      this.conversationHistory.delete(conversationId);
    } else {
      this.conversationHistory.clear();
    }
  }

  /**
   * 获取支持的对话场景
   */
  getSupportedScenarios(): Array<{
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
  }> {
    return [
      {
        id: "general",
        name: "通用教育助手",
        description: "提供全面的教育咨询和建议",
        systemPrompt: this.getDefaultSystemPrompt(),
      },
      {
        id: "grade-analysis",
        name: "成绩分析专家",
        description: "专注于学生成绩数据分析和趋势识别",
        systemPrompt: `你是一个成绩分析专家，专门帮助教师分析学生成绩数据。
你擅长：识别成绩趋势、发现学习问题、提供针对性改进建议、分析班级整体表现。
请提供专业的数据分析和具体的改进建议。`,
      },
      {
        id: "learning-guidance",
        name: "学习指导顾问",
        description: "提供个性化学习建议和方法指导",
        systemPrompt: `你是一个学习指导顾问，专门为学生提供个性化的学习建议。
你擅长：学习方法指导、知识点梳理、学习计划制定、问题解决策略。
请提供实用的学习建议和具体的操作方法。`,
      },
      {
        id: "teaching-strategy",
        name: "教学策略专家",
        description: "帮助教师优化教学方法和策略",
        systemPrompt: `你是一个教学策略专家，专门帮助教师优化教学方法。
你擅长：教学方法创新、课堂管理技巧、差异化教学、教学效果评估。
请提供专业的教学建议和实践指导。`,
      },
    ];
  }
}

// 导出服务实例
export const chatService = new AIChatService();
