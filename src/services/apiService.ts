import { analyzeWithModel, cascadeAnalyzeContent } from './aiService';
import { KnowledgePoint } from '@/types/homework';
import { logError, logInfo } from '@/utils/logger';
import { VISION_MODELS_FOR_TEST } from './providers';

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
    const providerId = VISION_MODELS_FOR_TEST.find(m => m.id === modelId)?.provider;
    if (!providerId) {
      throw new Error(`无法找到模型 ${modelId} 对应的提供商`);
    }
  
    logInfo('开始单模型分析', {
      providerId, // 记录 providerId
      modelId,
      contentLength: content.length,
      isImageUrl: (content.startsWith('http') && /\.(jpg|jpeg|png|gif|webp)$/i.test(content)) || content.startsWith('data:image/'),
      existingPointsCount: existingPoints.length
    });

    // 调用 analyzeWithModel 时传入 providerId 和 modelId
    const result = await analyzeWithModel(providerId, modelId, content, existingPoints);

    return {
      success: true,
      result,
      meta: {
        analysisTime: result.analysisTime,
        knowledgePointsCount: result.knowledgePoints.length,
        provider: result.providerInfo?.provider,
        model: result.providerInfo?.model
      }
    };
  } catch (error) {
    logError('单模型分析失败:', error);
    throw new Error(`分析过程出错: ${error instanceof Error ? error.message : '未知错误'}`);
  }
} 