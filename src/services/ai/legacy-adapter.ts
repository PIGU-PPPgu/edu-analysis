/**
 * AI服务适配器 - 旧API到新架构的适配层
 *
 * 功能：
 * - 兼容现有的API调用
 * - 将旧的AI服务调用适配到新的AI编排器
 * - 保持向后兼容性
 */

import { logError, logInfo } from "@/utils/logger";
import { aiOrchestrator } from "./orchestrator";
import { KnowledgePoint } from "@/types/homework";
import { VISION_MODELS_FOR_TEST } from "../providers";

/**
 * 执行单模型分析 (兼容旧的 apiService)
 */
export async function performSingleModelAnalysis(
  content: string,
  existingPoints: KnowledgePoint[] = [],
  modelId: string
) {
  try {
    // 根据 modelId 找到 providerId
    const model = VISION_MODELS_FOR_TEST.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`无法找到模型 ${modelId} 对应的提供商`);
    }

    logInfo("开始单模型分析", {
      providerId: model.provider,
      modelId,
      contentLength: content.length,
      isImageUrl:
        (content.startsWith("http") &&
          /\.(jpg|jpeg|png|gif|webp)$/i.test(content)) ||
        content.startsWith("data:image/"),
      existingPointsCount: existingPoints.length,
    });

    // 使用新的AI编排器处理请求
    const result = await aiOrchestrator.process({
      type: "analysis",
      content,
      context: {
        existingPoints,
      },
      options: {
        providerId: model.provider,
        modelId: modelId,
        enableCache: true,
      },
    });

    if (result.success) {
      return {
        success: true,
        result: {
          knowledgePoints: result.data?.knowledge_points || [],
          analysisTime: result.metadata.processingTime,
          providerInfo: {
            provider: result.metadata.providerId,
            model: result.metadata.modelId,
          },
        },
        meta: {
          analysisTime: result.metadata.processingTime,
          knowledgePointsCount: result.data?.knowledge_points?.length || 0,
          provider: result.metadata.providerId,
          model: result.metadata.modelId,
        },
      };
    } else {
      throw new Error(result.error || "分析失败");
    }
  } catch (error) {
    logError("单模型分析失败:", error);
    throw new Error(
      `分析过程出错: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

/**
 * 通用错误处理函数 (兼容旧的 apiService)
 */
export const handleApiError = (error: any) => {
  // 检查网络错误
  if (!navigator.onLine) {
    return {
      success: false,
      error: "网络连接已断开，请检查您的网络并重试",
    };
  }

  // 处理超时错误
  if (error.message && error.message.includes("timeout")) {
    return {
      success: false,
      error: "请求超时，请稍后重试",
    };
  }

  // 处理服务器错误
  if (error.response) {
    const status = error.response.status;

    // 处理常见HTTP状态码
    if (status === 401) {
      return {
        success: false,
        error: "未授权，请重新登录",
        unauthorized: true,
      };
    } else if (status === 403) {
      return {
        success: false,
        error: "权限不足，无法执行此操作",
      };
    } else if (status === 404) {
      return {
        success: false,
        error: "请求的资源不存在",
      };
    } else if (status === 500) {
      return {
        success: false,
        error: "服务器错误，请稍后重试",
      };
    }
  }

  // 默认错误信息
  return {
    success: false,
    error: error.message || "操作失败，请稍后重试",
  };
};

/**
 * 级联分析内容 (兼容旧的 aiService)
 */
export async function cascadeAnalyzeContent(
  content: string,
  existingPoints: KnowledgePoint[] = [],
  options: {
    maxModels?: number;
    timeoutMs?: number;
  } = {}
) {
  try {
    logInfo("开始级联分析", {
      contentLength: content.length,
      existingPointsCount: existingPoints.length,
      maxModels: options.maxModels || 3,
    });

    // 使用AI编排器的批量分析功能
    const result = await aiOrchestrator.process({
      type: "analysis",
      content,
      context: {
        existingPoints,
      },
      options: {
        enableCache: true,
        priority: "normal",
        retries: 2,
      },
    });

    if (result.success) {
      return {
        success: true,
        results: [
          {
            knowledgePoints: result.data?.knowledge_points || [],
            analysisTime: result.metadata.processingTime,
            providerInfo: {
              provider: result.metadata.providerId,
              model: result.metadata.modelId,
            },
          },
        ],
        aggregatedResults: {
          knowledgePoints: result.data?.knowledge_points || [],
          confidence: result.data?.analysis_confidence || 0.8,
          totalAnalysisTime: result.metadata.processingTime,
        },
      };
    } else {
      throw new Error(result.error || "级联分析失败");
    }
  } catch (error) {
    logError("级联分析失败:", error);
    throw new Error(
      `级联分析过程出错: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

/**
 * 使用指定模型分析 (兼容旧的 aiService)
 */
export async function analyzeWithModel(
  providerId: string,
  modelId: string,
  content: string,
  existingPoints: KnowledgePoint[] = []
) {
  try {
    logInfo("使用指定模型分析", { providerId, modelId });

    const result = await aiOrchestrator.process({
      type: "analysis",
      content,
      context: {
        existingPoints,
      },
      options: {
        providerId,
        modelId,
        enableCache: true,
      },
    });

    if (result.success) {
      return {
        knowledgePoints: result.data?.knowledge_points || [],
        analysisTime: result.metadata.processingTime,
        providerInfo: {
          provider: result.metadata.providerId,
          model: result.metadata.modelId,
        },
      };
    } else {
      throw new Error(result.error || "模型分析失败");
    }
  } catch (error) {
    logError("模型分析失败:", error);
    throw new Error(
      `模型分析过程出错: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}
