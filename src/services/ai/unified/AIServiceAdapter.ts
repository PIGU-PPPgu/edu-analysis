/**
 * 🔌 AI服务适配器 - 整合现有AI服务到统一网关
 * 将现有的各种AI服务适配到统一接口
 */

import { aiGateway, UnifiedAIRequest, UnifiedAIResponse } from "./AIGateway";
import {
  analyzeHomeworkImage,
  analyzeHomeworkContentWithParams,
  analyzeWithModel,
  cascadeAnalyzeContent,
  analyzeHomeworkContentWithAI,
  chatWithModel,
  getConfiguredChineseAIModels,
} from "../../aiService";
import { KnowledgePoint } from "../../../types/homework";
import { AIAnalysisResult } from "../../../types/analysis";
import { logInfo, logError } from "../../../utils/logger";

/**
 * 作业图片分析适配器
 */
export class HomeworkImageAnalysisAdapter {
  /**
   * 适配现有的图片分析接口到统一网关
   */
  static async analyze(
    imageUrl: string,
    params: {
      homeworkId: string;
      subject?: string;
    }
  ): Promise<UnifiedAIResponse> {
    try {
      logInfo("🖼️ 使用统一网关分析作业图片", {
        imageUrl: imageUrl.substring(0, 50),
      });

      const request: UnifiedAIRequest = {
        content: imageUrl,
        requestType: "image_analysis",
        context: {
          homeworkId: params.homeworkId,
          subject: params.subject,
        },
        options: {
          temperature: 0.3,
          maxTokens: 2000,
          priority: "normal",
        },
      };

      const response = await aiGateway.processRequest(request);

      // 格式化知识点数据以兼容现有接口
      if (response.knowledgePoints) {
        response.knowledgePoints = response.knowledgePoints.map(
          (kp, index) => ({
            id: `kp-${Date.now()}-${index}`,
            name: kp.name,
            description: kp.description || "",
            homework_id: params.homeworkId,
            created_at: new Date().toISOString(),
            isNew: true,
            ...kp,
          })
        );
      }

      return response;
    } catch (error) {
      logError("作业图片分析适配失败:", error);

      // 降级到原有服务
      try {
        logInfo("降级使用原有图片分析服务");
        const result = await analyzeHomeworkImage(imageUrl, params);

        return {
          success: result.success || true,
          content: "图片分析完成",
          knowledgePoints: result.knowledgePoints,
          metadata: {
            provider: "fallback",
            model: "legacy",
            responseTime: 0,
            confidence: 85,
          },
        };
      } catch (fallbackError) {
        logError("降级分析也失败:", fallbackError);
        return {
          success: false,
          content: "",
          error: fallbackError.message || "图片分析失败",
          metadata: {
            provider: "unknown",
            model: "unknown",
            responseTime: 0,
            confidence: 0,
          },
        };
      }
    }
  }
}

/**
 * 作业内容分析适配器
 */
export class HomeworkContentAnalysisAdapter {
  /**
   * 适配作业内容分析到统一网关
   */
  static async analyze(params: {
    content: string;
    imageUrls?: string[];
    homeworkId: string;
    subject?: string;
    existingKnowledgePoints?: KnowledgePoint[];
  }): Promise<UnifiedAIResponse> {
    try {
      logInfo("📝 使用统一网关分析作业内容", {
        contentLength: params.content.length,
        imageCount: params.imageUrls?.length || 0,
      });

      const request: UnifiedAIRequest = {
        content: params.content,
        requestType: "homework_analysis",
        context: {
          homeworkId: params.homeworkId,
          subject: params.subject,
          existingKnowledgePoints: params.existingKnowledgePoints,
        },
        options: {
          temperature: 0.3,
          maxTokens: 2000,
          priority: "normal",
        },
      };

      const response = await aiGateway.processRequest(request);

      // 格式化知识点数据
      if (response.knowledgePoints) {
        response.knowledgePoints = response.knowledgePoints.map(
          (kp, index) => ({
            id: `kp-${Date.now()}-${index}`,
            name: kp.name,
            description: kp.description || "",
            homework_id: params.homeworkId,
            created_at: new Date().toISOString(),
            ...kp,
          })
        );
      }

      return response;
    } catch (error) {
      logError("作业内容分析适配失败:", error);

      // 降级到原有服务
      try {
        logInfo("降级使用原有内容分析服务");
        const result = await analyzeHomeworkContentWithParams(params);

        return {
          success: true,
          content: "内容分析完成",
          knowledgePoints: result.knowledgePoints,
          metadata: {
            provider: "fallback",
            model: "legacy",
            responseTime: 0,
            confidence: 85,
          },
        };
      } catch (fallbackError) {
        logError("降级分析也失败:", fallbackError);
        return {
          success: false,
          content: "",
          error: fallbackError.message || "内容分析失败",
          metadata: {
            provider: "unknown",
            model: "unknown",
            responseTime: 0,
            confidence: 0,
          },
        };
      }
    }
  }
}

/**
 * AI聊天对话适配器
 */
export class AIChatAdapter {
  /**
   * 适配AI聊天到统一网关
   */
  static async chat(
    message: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      conversationHistory?: { role: string; content: string }[];
    } = {}
  ): Promise<UnifiedAIResponse> {
    try {
      logInfo("💬 使用统一网关进行AI对话", { messageLength: message.length });

      const request: UnifiedAIRequest = {
        content: message,
        requestType: "chat",
        context: {
          conversationHistory: options.conversationHistory,
        },
        options: {
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 1000,
          priority: "normal",
        },
      };

      const response = await aiGateway.processRequest(request);
      return response;
    } catch (error) {
      logError("AI聊天适配失败:", error);

      // 降级到原有服务
      try {
        logInfo("降级使用原有聊天服务");

        // 获取用户配置的中文AI模型
        const models = await getConfiguredChineseAIModels();
        if (models.length === 0) {
          throw new Error("未配置中文AI模型");
        }

        const firstModel = models[0];
        const result = await chatWithModel(
          firstModel.providerId,
          firstModel.modelId,
          message,
          options
        );

        return {
          success: true,
          content: result,
          metadata: {
            provider: firstModel.providerId,
            model: firstModel.modelId,
            responseTime: 0,
            confidence: 85,
          },
        };
      } catch (fallbackError) {
        logError("降级聊天也失败:", fallbackError);
        return {
          success: false,
          content: "",
          error: fallbackError.message || "AI对话失败",
          metadata: {
            provider: "unknown",
            model: "unknown",
            responseTime: 0,
            confidence: 0,
          },
        };
      }
    }
  }
}

/**
 * 通用分析适配器
 */
export class GeneralAnalysisAdapter {
  /**
   * 适配通用分析到统一网关
   */
  static async analyze(
    content: string,
    existingPoints: KnowledgePoint[] = []
  ): Promise<AIAnalysisResult> {
    try {
      logInfo("🔍 使用统一网关进行通用分析", { contentLength: content.length });

      const request: UnifiedAIRequest = {
        content,
        requestType: "analysis",
        context: {
          existingKnowledgePoints: existingPoints,
        },
        options: {
          temperature: 0.3,
          maxTokens: 2000,
          priority: "normal",
        },
      };

      const response = await aiGateway.processRequest(request);

      // 转换为AIAnalysisResult格式
      const result: AIAnalysisResult = {
        knowledgePoints: (response.knowledgePoints || []).map((kp) => ({
          name: kp.name,
          description: kp.description || "",
          importance: kp.importance || 3,
          masteryLevel: kp.masteryLevel || 3,
          confidence: kp.confidence || 90,
          isNew: kp.isNew !== false,
        })),
        analysisTime: response.metadata?.responseTime || 0,
        confidence: response.metadata?.confidence || 85,
        providerInfo: {
          provider: response.metadata?.provider || "unknown",
          model: response.metadata?.model || "unknown",
        },
      };

      return result;
    } catch (error) {
      logError("通用分析适配失败:", error);

      // 降级到原有服务
      try {
        logInfo("降级使用原有分析服务");
        const result = await analyzeHomeworkContentWithAI(
          content,
          existingPoints
        );
        return result;
      } catch (fallbackError) {
        logError("降级分析也失败:", fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * 级联分析适配
   */
  static async cascadeAnalyze(
    content: string,
    existingPoints: KnowledgePoint[] = []
  ): Promise<AIAnalysisResult> {
    try {
      logInfo("🔄 使用统一网关进行级联分析");

      // 对于级联分析，我们使用更高的优先级
      const request: UnifiedAIRequest = {
        content,
        requestType: "analysis",
        context: {
          existingKnowledgePoints: existingPoints,
        },
        options: {
          temperature: 0.2,
          maxTokens: 2500,
          priority: "high", // 级联分析使用高优先级
          preferredProviders: ["openai", "deepseek"], // 优先使用高质量模型
        },
      };

      const response = await aiGateway.processRequest(request);

      // 转换格式
      const result: AIAnalysisResult = {
        knowledgePoints: (response.knowledgePoints || []).map((kp) => ({
          name: kp.name,
          description: kp.description || "",
          importance: kp.importance || 3,
          masteryLevel: kp.masteryLevel || 3,
          confidence: kp.confidence || 90,
          isNew: kp.isNew !== false,
        })),
        analysisTime: response.metadata?.responseTime || 0,
        confidence: response.metadata?.confidence || 85,
        providerInfo: {
          provider: response.metadata?.provider || "unknown",
          model: response.metadata?.model || "unknown",
        },
      };

      return result;
    } catch (error) {
      logError("级联分析适配失败:", error);

      // 降级到原有级联分析
      try {
        logInfo("降级使用原有级联分析服务");
        const result = await cascadeAnalyzeContent(content, existingPoints);
        return result;
      } catch (fallbackError) {
        logError("降级级联分析也失败:", fallbackError);
        throw fallbackError;
      }
    }
  }
}

/**
 * 成绩分析适配器
 */
export class GradeAnalysisAdapter {
  /**
   * 适配成绩分析到统一网关
   */
  static async analyze(
    gradeData: any[],
    analysisType: "student" | "class" | "subject" | "trend" = "student"
  ): Promise<UnifiedAIResponse> {
    try {
      logInfo("📊 使用统一网关分析成绩数据", {
        dataCount: gradeData.length,
        analysisType,
      });

      const content = JSON.stringify({
        analysisType,
        data: gradeData.slice(0, 100), // 限制数据量避免token过多
        summary: {
          totalRecords: gradeData.length,
          dateRange: this.getDateRange(gradeData),
          subjects: this.getUniqueSubjects(gradeData),
        },
      });

      const request: UnifiedAIRequest = {
        content,
        requestType: "grade_analysis",
        context: {
          subject: analysisType,
        },
        options: {
          temperature: 0.2,
          maxTokens: 2500,
          priority: "normal",
        },
      };

      const response = await aiGateway.processRequest(request);
      return response;
    } catch (error) {
      logError("成绩分析适配失败:", error);
      return {
        success: false,
        content: "",
        error: error.message || "成绩分析失败",
        metadata: {
          provider: "unknown",
          model: "unknown",
          responseTime: 0,
          confidence: 0,
        },
      };
    }
  }

  /**
   * 获取数据日期范围
   */
  private static getDateRange(data: any[]): { start?: string; end?: string } {
    const dates = data
      .map((item) => item.exam_date || item.created_at)
      .filter(Boolean)
      .sort();

    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  /**
   * 获取唯一科目列表
   */
  private static getUniqueSubjects(data: any[]): string[] {
    const subjects = new Set<string>();
    data.forEach((item) => {
      // 检查各种可能的科目字段
      [
        "chinese_score",
        "math_score",
        "english_score",
        "physics_score",
        "chemistry_score",
        "politics_score",
        "history_score",
        "biology_score",
        "geography_score",
      ].forEach((field) => {
        if (item[field] !== null && item[field] !== undefined) {
          subjects.add(field.replace("_score", ""));
        }
      });
    });
    return Array.from(subjects);
  }
}

/**
 * 统一适配器导出
 */
export const aiServiceAdapters = {
  homeworkImage: HomeworkImageAnalysisAdapter,
  homeworkContent: HomeworkContentAnalysisAdapter,
  chat: AIChatAdapter,
  analysis: GeneralAnalysisAdapter,
  grade: GradeAnalysisAdapter,
};
