/**
 * AI服务统一模块 - 统一导出
 *
 * 架构：
 * - 🚀 UnifiedAI：新的统一AI网关（推荐）
 * - AIOrchestrator：AI请求调度和路由
 * - AnalysisService：内容分析和知识点提取
 * - ChatService：AI对话和问答
 * - ProvidersService：AI提供商管理（复用现有）
 *
 * 向后兼容性：
 * - 保持现有API接口不变
 * - 提供新的统一接口
 * - 渐进式迁移支持
 */

// 🚀 新的统一AI网关（推荐使用）
export {
  unifiedAIService,
  AI,
  aiGateway,
  aiMonitoring,
  aiServiceAdapters,
  type UnifiedAIRequest,
  type UnifiedAIResponse,
  type AIMetrics,
  type HealthCheckResult,
  type PerformanceStats,
} from "./unified";

// 核心AI服务（现有架构）
export {
  AIOrchestrator,
  aiOrchestrator,
  type AIRequest,
  type AIResponse,
  type ProviderStatus,
} from "./orchestrator";

export {
  AIAnalysisService,
  analysisService,
  type AnalysisRequest,
  type AnalysisResult,
} from "./analysis";

export {
  AIChatService,
  chatService,
  type ChatRequest,
  type ChatResult,
} from "./chat";

// 复用现有的提供商管理
export {
  getAllProviders,
  getProviderConfig,
  getProviderEndpoint,
  getProviderById,
  getModelInfo,
  getModelsByProviderId,
} from "../aiProviderManager";

export { VISION_MODELS_FOR_TEST, TEXT_MODELS_FOR_TEST } from "../providers";

// 统一的AI服务接口
import type { KnowledgePoint } from "@/types/homework";
import type { AIAnalysisResult } from "@/types/analysis";
import { aiOrchestrator } from "./orchestrator";

/**
 * 统一AI分析接口 - 向后兼容
 */
export async function analyzeWithAI(
  content: string,
  existingPoints: KnowledgePoint[] = [],
  options: {
    providerId?: string;
    modelId?: string;
    subject?: string;
    enableCache?: boolean;
  } = {}
): Promise<AIAnalysisResult> {
  const request = {
    type: "analysis" as const,
    content,
    context: {
      existingPoints,
      subject: options.subject,
    },
    options: {
      providerId: options.providerId,
      modelId: options.modelId,
      enableCache: options.enableCache !== false,
    },
  };

  const response = await aiOrchestrator.process<AIAnalysisResult>(request);

  if (!response.success) {
    throw new Error(response.error || "AI分析失败");
  }

  return response.data!;
}

/**
 * 统一AI对话接口
 */
export async function chatWithAI(
  message: string,
  options: {
    providerId?: string;
    modelId?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    subject?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const request = {
    type: "chat" as const,
    content: message,
    context: {
      conversationHistory: options.conversationHistory,
      systemPrompt: options.systemPrompt,
      subject: options.subject,
    },
    options: {
      providerId: options.providerId,
      modelId: options.modelId,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    },
  };

  const response = await aiOrchestrator.process(request);

  if (!response.success) {
    throw new Error(response.error || "AI对话失败");
  }

  return response.data?.response || "AI响应为空";
}

/**
 * 批量AI分析接口
 */
export async function batchAnalyzeWithAI(
  contents: Array<{
    content: string;
    existingPoints?: KnowledgePoint[];
    subject?: string;
  }>,
  options: {
    providerId?: string;
    modelId?: string;
    enableCache?: boolean;
  } = {}
): Promise<AIAnalysisResult[]> {
  const requests = contents.map((item) => ({
    type: "analysis" as const,
    content: item.content,
    context: {
      existingPoints: item.existingPoints || [],
      subject: item.subject,
    },
    options: {
      providerId: options.providerId,
      modelId: options.modelId,
      enableCache: options.enableCache !== false,
    },
  }));

  const responses =
    await aiOrchestrator.processBatch<AIAnalysisResult>(requests);

  return responses.map((response) => {
    if (!response.success) {
      throw new Error(response.error || "批量AI分析失败");
    }
    return response.data!;
  });
}

// 向后兼容的函数导出（保持现有代码正常工作）
export {
  // 从现有aiService.ts导入的向后兼容函数
  analyzeWithModel,
  cascadeAnalyzeContent,
  analyzeHomeworkContentWithAI,
  analyzeHomeworkImage,
  analyzeHomeworkContentWithParams,
  getAIClient,
  testProviderConnection,
  getAvailableModels,
  chatWithModel,
  getConfiguredChineseAIModels,
  aiService,
} from "../aiService";

// 适配层导出（兼容旧的apiService）
export {
  performSingleModelAnalysis,
  handleApiError,
  cascadeAnalyzeContent as legacyCascadeAnalyzeContent,
  analyzeWithModel as legacyAnalyzeWithModel,
} from "./legacy-adapter";

// AI服务状态监控
export function getAIServiceStatus(): {
  orchestrator: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
  providers: Array<{
    id: string;
    name: string;
    available: boolean;
    responseTime: number;
    errorRate: number;
  }>;
} {
  const orchestratorStats = aiOrchestrator.getStats();
  const providers = aiOrchestrator.getProviderStatus();

  return {
    orchestrator: {
      totalRequests: orchestratorStats.totalRequests,
      successRate:
        orchestratorStats.totalRequests > 0
          ? (orchestratorStats.successfulRequests /
              orchestratorStats.totalRequests) *
            100
          : 0,
      averageResponseTime: orchestratorStats.averageResponseTime,
      cacheHitRate:
        orchestratorStats.totalRequests > 0
          ? (orchestratorStats.cacheHits / orchestratorStats.totalRequests) *
            100
          : 0,
    },
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      available: provider.available,
      responseTime: provider.responseTime,
      errorRate: provider.errorRate * 100,
    })),
  };
}

// AI服务初始化
export async function initializeAIServices(): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // 检查AI服务可用性
    const status = getAIServiceStatus();
    const availableProviders = status.providers.filter((p) => p.available);

    if (availableProviders.length === 0) {
      errors.push("没有可用的AI提供商");
    }

    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`AI服务初始化失败: ${error.message}`);
    return {
      success: false,
      errors,
    };
  }
}

// 重置AI服务状态
export function resetAIServices(): void {
  aiOrchestrator.resetProviderStatus();
}
