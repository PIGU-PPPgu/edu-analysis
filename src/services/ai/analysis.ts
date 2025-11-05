/**
 * AI内容分析服务 - 统一分析功能
 *
 * 功能：
 * - 图像内容分析
 * - 文本知识点提取
 * - 作业内容理解
 * - 多模态内容处理
 */

import { logError, logInfo } from "@/utils/logger";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import type { KnowledgePoint } from "@/types/homework";
import type { AIAnalysisResult } from "@/types/analysis";
import type { AIRequest, AIResponse, ProviderStatus } from "./orchestrator";

// 复用现有的AI客户端
import { GenericAIClient } from "../aiService";
import { getProviderConfig, getProviderEndpoint } from "../aiProviderManager";

export interface AnalysisRequest extends AIRequest {
  type: "analysis" | "image" | "text";
  content: string;
  context?: {
    existingPoints?: KnowledgePoint[];
    subject?: string;
    homeworkId?: string;
  };
}

export interface AnalysisResult {
  knowledgePoints: Array<{
    name: string;
    description: string;
    importance: number;
    masteryLevel: number;
    confidence: number;
    isNew: boolean;
  }>;
  analysisTime: number;
  confidence: number;
  providerInfo: {
    provider: string;
    model: string;
  };
}

/**
 * AI内容分析服务
 */
export class AIAnalysisService {
  /**
   * 执行分析请求
   */
  async execute(
    request: AnalysisRequest,
    provider: ProviderStatus
  ): Promise<AIResponse<AnalysisResult>> {
    const startTime = Date.now();

    try {
      logInfo("开始AI内容分析", {
        type: request.type,
        providerId: provider.id,
        contentLength: request.content.length,
      });

      // 获取AI客户端
      const client = await this.createAIClient(provider, request);
      if (!client) {
        throw new Error(
          `无法创建${provider.id}的AI客户端，请检查配置和API密钥`
        );
      }

      // 根据内容类型选择分析方法
      let result: AnalysisResult;

      switch (request.type) {
        case "image":
          result = await this.analyzeImage(client, request, provider);
          break;
        case "text":
          result = await this.analyzeText(client, request, provider);
          break;
        case "analysis":
          result = await this.analyzeContent(client, request, provider);
          break;
        default:
          throw new Error(`不支持的分析类型: ${request.type}`);
      }

      const processingTime = Date.now() - startTime;
      result.analysisTime = processingTime;

      logInfo("AI内容分析完成", {
        providerId: provider.id,
        processingTime,
        knowledgePointsCount: result.knowledgePoints.length,
      });

      return {
        success: true,
        data: result,
        metadata: {
          providerId: provider.id,
          modelId: request.options?.modelId || "default",
          processingTime,
          cached: false,
          retries: 0,
        },
      };
    } catch (error) {
      logError("AI内容分析失败", {
        providerId: provider.id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || "AI内容分析失败",
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
   * 分析图像内容
   */
  private async analyzeImage(
    client: any,
    request: AnalysisRequest,
    provider: ProviderStatus
  ): Promise<AnalysisResult> {
    logInfo("开始图像内容分析");

    const prompt = this.buildImageAnalysisPrompt(request);

    // 构建多模态消息
    const messages = [
      {
        role: "system",
        content:
          "你是一位教育专家，擅长分析学生作业图片中的知识点。请仔细观察图片内容，识别其中包含的学科知识点。",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: request.content } },
        ],
      },
    ];

    // 发送请求
    const response = await this.sendAIRequest(client, messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    // 解析响应
    return this.parseAnalysisResponse(response, provider);
  }

  /**
   * 分析文本内容
   */
  private async analyzeText(
    client: any,
    request: AnalysisRequest,
    provider: ProviderStatus
  ): Promise<AnalysisResult> {
    logInfo("开始文本内容分析");

    const prompt = this.buildTextAnalysisPrompt(request);

    const messages = [
      {
        role: "system",
        content:
          "你是一位教育专家，擅长从文本内容中识别和提取知识点。请分析提供的内容，识别其中的学科知识点。",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    // 发送请求
    const response = await this.sendAIRequest(client, messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    // 解析响应
    return this.parseAnalysisResponse(response, provider);
  }

  /**
   * 综合内容分析
   */
  private async analyzeContent(
    client: any,
    request: AnalysisRequest,
    provider: ProviderStatus
  ): Promise<AnalysisResult> {
    logInfo("开始综合内容分析");

    // 根据内容类型选择分析方法
    const isImage = this.isImageUrl(request.content);

    if (isImage) {
      return this.analyzeImage(client, request, provider);
    } else {
      return this.analyzeText(client, request, provider);
    }
  }

  /**
   * 构建图像分析提示词
   */
  private buildImageAnalysisPrompt(request: AnalysisRequest): string {
    const existingPoints = request.context?.existingPoints || [];
    const subject = request.context?.subject || "未指定";

    const existingPointsText =
      existingPoints.length > 0
        ? existingPoints.map((p) => `- ${p.name}`).join("\n")
        : "(无)";

    return `
请分析这张作业图片中包含的知识点，并评估学生对这些知识点的掌握程度。

作业科目: ${subject}

已知知识点列表：
${existingPointsText}

请以JSON格式返回分析结果，包含以下字段：
- knowledgePoints: 知识点数组，每个知识点包含：
  - name: 知识点名称
  - description: 知识点描述（简要解释该知识点）
  - importance: 重要性(1-5，5表示最重要)
  - masteryLevel: 掌握程度(1-5，5表示完全掌握)
  - confidence: 识别置信度(0-100)
  - isNew: 是否为新发现的知识点(相对于已知知识点)

请对importance和masteryLevel使用1-5的评分标准：
1 = 非常低/基础/不熟练
2 = 低/初级/了解基础
3 = 中等/必要/基本掌握
4 = 高/重要/熟练
5 = 非常高/核心/精通

返回格式：
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点描述",
      "importance": 4,
      "masteryLevel": 3,
      "confidence": 85,
      "isNew": true
    }
  ]
}
    `.trim();
  }

  /**
   * 构建文本分析提示词
   */
  private buildTextAnalysisPrompt(request: AnalysisRequest): string {
    const existingPoints = request.context?.existingPoints || [];
    const subject = request.context?.subject || "未指定";

    const existingPointsText =
      existingPoints.length > 0
        ? existingPoints.map((p) => `- ${p.name}`).join("\n")
        : "(无)";

    return `
分析以下作业内容，识别出其中包含的知识点，并评估学生对这些知识点的掌握程度。

作业科目: ${subject}

已知知识点列表：
${existingPointsText}

作业内容:
${request.content}

请以JSON格式返回分析结果，格式要求与图像分析相同：

{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点描述",
      "importance": 4,
      "masteryLevel": 3,
      "confidence": 85,
      "isNew": true
    }
  ]
}
    `.trim();
  }

  /**
   * 发送AI请求
   */
  private async sendAIRequest(
    client: any,
    messages: any[],
    options: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<any> {
    if ("sendRequest" in client) {
      // 使用GenericAIClient
      return await client.sendRequest(messages, {
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 2000,
      });
    } else if ("chat" in client) {
      // 使用OpenAI风格客户端
      return await client.chat.completions.create({
        messages,
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 2000,
      });
    } else {
      throw new Error("不支持的AI客户端类型");
    }
  }

  /**
   * 解析AI响应
   */
  private parseAnalysisResponse(
    response: any,
    provider: ProviderStatus
  ): AnalysisResult {
    try {
      // 提取响应内容
      const content =
        response.choices?.[0]?.message?.content ||
        response.choices?.[0]?.text ||
        "";

      if (!content) {
        throw new Error("AI返回内容为空");
      }

      logInfo("AI响应内容", {
        preview:
          content.substring(0, 200) + (content.length > 200 ? "..." : ""),
      });

      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // 如果没有找到JSON，尝试从文本中提取知识点
        return this.extractKnowledgePointsFromText(content, provider);
      }

      // 解析JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (jsonError) {
        logError("JSON解析失败，尝试修复", jsonError);

        // 尝试修复JSON格式
        const fixedJson = this.fixJSONFormat(jsonMatch[0]);
        parsed = JSON.parse(fixedJson);
      }

      // 验证数据结构
      if (!parsed.knowledgePoints || !Array.isArray(parsed.knowledgePoints)) {
        throw new Error("AI返回的数据格式无效（缺少知识点数组）");
      }

      // 格式化知识点
      const knowledgePoints = parsed.knowledgePoints.map((kp: any) => ({
        name: kp.name || "未命名知识点",
        description: kp.description || "",
        importance: typeof kp.importance === "number" ? kp.importance : 3,
        masteryLevel: typeof kp.masteryLevel === "number" ? kp.masteryLevel : 3,
        confidence: typeof kp.confidence === "number" ? kp.confidence : 90,
        isNew: kp.isNew === true,
      }));

      return {
        knowledgePoints,
        analysisTime: 0, // 将在上层设置
        confidence: 85,
        providerInfo: {
          provider: provider.id,
          model: provider.name,
        },
      };
    } catch (error) {
      logError("解析AI响应失败", error);
      throw new Error(`解析AI响应失败: ${error.message}`);
    }
  }

  /**
   * 从文本中提取知识点（启发式方法）
   */
  private extractKnowledgePointsFromText(
    content: string,
    provider: ProviderStatus
  ): AnalysisResult {
    logInfo("使用启发式方法从文本中提取知识点");

    const lines = content.split("\n");
    const knowledgePoints = [];

    for (const line of lines) {
      // 查找可能的知识点描述行
      if (
        line.includes("知识点") ||
        line.includes("掌握") ||
        line.match(/^\d+\.\s+/) ||
        line.includes("：") ||
        line.includes(":")
      ) {
        const nameMatch = line.match(
          /[""「」【】：:]\s*([^""「」【】：:]+)[""「」【】：:]/
        );
        if (nameMatch && nameMatch[1].length < 50) {
          knowledgePoints.push({
            name: nameMatch[1].trim(),
            description: line.replace(nameMatch[0], "").trim(),
            importance: 3,
            masteryLevel: 3,
            confidence: 70,
            isNew: true,
          });
        } else {
          // 如果没有找到引号包围的内容，使用整行作为知识点
          const cleanLine = line.replace(/^\d+\.\s*/, "").trim();
          if (cleanLine.length > 0 && cleanLine.length < 100) {
            knowledgePoints.push({
              name: cleanLine.substring(0, 30),
              description: cleanLine,
              importance: 3,
              masteryLevel: 3,
              confidence: 60,
              isNew: true,
            });
          }
        }
      }
    }

    if (knowledgePoints.length === 0) {
      // 如果没有提取到任何知识点，创建一个默认的
      knowledgePoints.push({
        name: "内容分析",
        description: "AI分析的教育内容",
        importance: 3,
        masteryLevel: 3,
        confidence: 50,
        isNew: true,
      });
    }

    logInfo(`启发式提取完成，提取到${knowledgePoints.length}个知识点`);

    return {
      knowledgePoints,
      analysisTime: 0,
      confidence: 70,
      providerInfo: {
        provider: provider.id,
        model: provider.name,
      },
    };
  }

  /**
   * 修复JSON格式
   */
  private fixJSONFormat(jsonStr: string): string {
    return jsonStr
      .replace(/([{,])\s*(\w+):/g, '$1"$2":') // 为没有引号的键名添加引号
      .replace(/:\s*'([^']*)'/g, ':"$1"') // 将单引号替换为双引号
      .replace(/,(\s*[\]}])/g, "$1"); // 移除尾随逗号
  }

  /**
   * 判断是否为图片URL
   */
  private isImageUrl(content: string): boolean {
    return (
      /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(content) ||
      content.startsWith("data:image/")
    );
  }

  /**
   * 创建AI客户端
   */
  private async createAIClient(
    provider: ProviderStatus,
    request: AnalysisRequest
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
}

// 导出服务实例
export const analysisService = new AIAnalysisService();
