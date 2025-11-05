import { analyzeWithModel, cascadeAnalyzeContent } from "./aiService";
import { KnowledgePoint } from "@/types/homework";
import { logError, logInfo } from "@/utils/logger";
import { VISION_MODELS_FOR_TEST } from "./providers";

/**
 * 执行单模型分析
 * @param content 要分析的内容（文本或图片URL）
 * @param existingPoints 已有的知识点（可选）
 * @param modelId 要使用的模型ID
 * @returns 分析结果
 */
export async function performSingleModelAnalysis(
  content: string,
  existingPoints: KnowledgePoint[] = [],
  modelId: string
) {
  try {
    // 根据 modelId 找到 providerId
    const providerId = VISION_MODELS_FOR_TEST.find(
      (m) => m.id === modelId
    )?.provider;
    if (!providerId) {
      throw new Error(`无法找到模型 ${modelId} 对应的提供商`);
    }

    logInfo("开始单模型分析", {
      providerId, // 记录 providerId
      modelId,
      contentLength: content.length,
      isImageUrl:
        (content.startsWith("http") &&
          /\.(jpg|jpeg|png|gif|webp)$/i.test(content)) ||
        content.startsWith("data:image/"),
      existingPointsCount: existingPoints.length,
    });

    // 调用 analyzeWithModel 时传入 providerId 和 modelId
    const result = await analyzeWithModel(
      providerId,
      modelId,
      content,
      existingPoints
    );

    return {
      success: true,
      result,
      meta: {
        analysisTime: result.analysisTime,
        knowledgePointsCount: result.knowledgePoints.length,
        provider: result.providerInfo?.provider,
        model: result.providerInfo?.model,
      },
    };
  } catch (error) {
    logError("单模型分析失败:", error);
    throw new Error(
      `分析过程出错: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
}

// 通用错误处理函数
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
