import { NextApiRequest, NextApiResponse } from "next";
import { analyzeWithModel } from "@/services/aiService";
import { logError, logInfo } from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 只允许POST请求
  if (req.method !== "POST") {
    return res.status(405).json({ error: "只支持POST请求" });
  }

  try {
    const { content, existingPoints = [], modelId } = req.body;

    if (!content) {
      return res.status(400).json({ error: "需要提供content参数" });
    }
    if (!modelId) {
      return res.status(400).json({ error: "需要提供modelId参数" });
    }

    logInfo("开始单模型分析测试", {
      modelId,
      contentLength: content.length,
      isImageUrl:
        content.startsWith("data:image/") ||
        (content.startsWith("http") &&
          /\.(jpg|jpeg|png|gif|webp)$/i.test(content)),
      existingPointsCount: existingPoints.length,
    });

    const result = await analyzeWithModel(modelId, content, existingPoints);

    return res.status(200).json({
      success: true,
      result,
      meta: {
        analysisTime: result.analysisTime,
        knowledgePointsCount: result.knowledgePoints.length,
        provider: result.providerInfo?.provider,
        model: result.providerInfo?.model,
      },
    });
  } catch (error) {
    logError("单模型分析测试失败:", error);
    return res.status(500).json({
      error: "分析过程出错",
      message: error instanceof Error ? error.message : "未知错误",
    });
  }
}
