/**
 * 🚀 统一AI服务入口 - 整合所有AI功能的统一导出
 * 提供简洁、统一的AI服务访问接口
 */

import { aiGateway, UnifiedAIRequest, UnifiedAIResponse } from "./AIGateway";
import { aiServiceAdapters } from "./AIServiceAdapter";
import { aiMonitoring, AIMetrics } from "./AIMonitoring";
import { KnowledgePoint } from "../../../types/homework";
import { AIAnalysisResult } from "../../../types/analysis";
import { logInfo, logError } from "../../../utils/logger";

/**
 * 🎯 统一AI服务类
 * 提供所有AI功能的统一访问接口
 */
export class UnifiedAIService {
  private static instance: UnifiedAIService;
  private initialized = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService();
    }
    return UnifiedAIService.instance;
  }

  /**
   * 初始化统一AI服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logInfo("🚀 初始化统一AI服务...");

      // 初始化AI网关
      await aiGateway.initialize();

      // 启动监控服务（已在构造函数中自动启动）

      this.initialized = true;
      logInfo("✅ 统一AI服务初始化完成");
    } catch (error) {
      logError("❌ 统一AI服务初始化失败:", error);
      throw error;
    }
  }

  /**
   * 🖼️ 分析作业图片
   */
  async analyzeHomeworkImage(
    imageUrl: string,
    params: {
      homeworkId: string;
      subject?: string;
    }
  ): Promise<{
    success: boolean;
    knowledgePoints: any[];
    error?: string;
    metadata?: any;
  }> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const response = await aiServiceAdapters.homeworkImage.analyze(
        imageUrl,
        params
      );

      // 记录监控指标
      this.recordMetrics({
        provider: response.metadata?.provider || "unknown",
        model: response.metadata?.model || "unknown",
        requestType: "image_analysis",
        responseTime: Date.now() - startTime,
        success: response.success,
        cost: response.metadata?.cost,
        error: response.error,
      });

      return {
        success: response.success,
        knowledgePoints: response.knowledgePoints || [],
        error: response.error,
        metadata: response.metadata,
      };
    } catch (error) {
      this.recordMetrics({
        provider: "unknown",
        model: "unknown",
        requestType: "image_analysis",
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      logError("作业图片分析失败:", error);
      return {
        success: false,
        knowledgePoints: [],
        error: error.message || "图片分析失败",
      };
    }
  }

  /**
   * 📝 分析作业内容
   */
  async analyzeHomeworkContent(params: {
    content: string;
    imageUrls?: string[];
    homeworkId: string;
    subject?: string;
    existingKnowledgePoints?: KnowledgePoint[];
  }): Promise<{
    success: boolean;
    knowledgePoints: any[];
    error?: string;
    metadata?: any;
  }> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const response = await aiServiceAdapters.homeworkContent.analyze(params);

      this.recordMetrics({
        provider: response.metadata?.provider || "unknown",
        model: response.metadata?.model || "unknown",
        requestType: "homework_analysis",
        responseTime: Date.now() - startTime,
        success: response.success,
        cost: response.metadata?.cost,
        error: response.error,
      });

      return {
        success: response.success,
        knowledgePoints: response.knowledgePoints || [],
        error: response.error,
        metadata: response.metadata,
      };
    } catch (error) {
      this.recordMetrics({
        provider: "unknown",
        model: "unknown",
        requestType: "homework_analysis",
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      logError("作业内容分析失败:", error);
      return {
        success: false,
        knowledgePoints: [],
        error: error.message || "内容分析失败",
      };
    }
  }

  /**
   * 💬 AI聊天对话
   */
  async chat(
    message: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      conversationHistory?: { role: string; content: string }[];
    } = {}
  ): Promise<{
    success: boolean;
    content: string;
    error?: string;
    metadata?: any;
  }> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const response = await aiServiceAdapters.chat.chat(message, options);

      this.recordMetrics({
        provider: response.metadata?.provider || "unknown",
        model: response.metadata?.model || "unknown",
        requestType: "chat",
        responseTime: Date.now() - startTime,
        success: response.success,
        cost: response.metadata?.cost,
        error: response.error,
      });

      return {
        success: response.success,
        content: response.content,
        error: response.error,
        metadata: response.metadata,
      };
    } catch (error) {
      this.recordMetrics({
        provider: "unknown",
        model: "unknown",
        requestType: "chat",
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      logError("AI聊天失败:", error);
      return {
        success: false,
        content: "",
        error: error.message || "AI对话失败",
      };
    }
  }

  /**
   * 🔍 通用内容分析
   */
  async analyzeContent(
    content: string,
    existingPoints: KnowledgePoint[] = []
  ): Promise<AIAnalysisResult> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const result = await aiServiceAdapters.analysis.analyze(
        content,
        existingPoints
      );

      this.recordMetrics({
        provider: result.providerInfo?.provider || "unknown",
        model: result.providerInfo?.model || "unknown",
        requestType: "analysis",
        responseTime: Date.now() - startTime,
        success: true,
        cost: 0, // TODO: 从result中获取成本信息
      });

      return result;
    } catch (error) {
      this.recordMetrics({
        provider: "unknown",
        model: "unknown",
        requestType: "analysis",
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      logError("内容分析失败:", error);
      throw error;
    }
  }

  /**
   * 🔄 级联分析
   */
  async cascadeAnalyze(
    content: string,
    existingPoints: KnowledgePoint[] = []
  ): Promise<AIAnalysisResult> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const result = await aiServiceAdapters.analysis.cascadeAnalyze(
        content,
        existingPoints
      );

      this.recordMetrics({
        provider: result.providerInfo?.provider || "unknown",
        model: result.providerInfo?.model || "unknown",
        requestType: "cascade_analysis",
        responseTime: Date.now() - startTime,
        success: true,
        cost: 0,
      });

      return result;
    } catch (error) {
      this.recordMetrics({
        provider: "unknown",
        model: "unknown",
        requestType: "cascade_analysis",
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      logError("级联分析失败:", error);
      throw error;
    }
  }

  /**
   * 📊 分析成绩数据
   */
  async analyzeGrades(
    gradeData: any[],
    analysisType: "student" | "class" | "subject" | "trend" = "student"
  ): Promise<{
    success: boolean;
    content: string;
    error?: string;
    metadata?: any;
  }> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const response = await aiServiceAdapters.grade.analyze(
        gradeData,
        analysisType
      );

      this.recordMetrics({
        provider: response.metadata?.provider || "unknown",
        model: response.metadata?.model || "unknown",
        requestType: "grade_analysis",
        responseTime: Date.now() - startTime,
        success: response.success,
        cost: response.metadata?.cost,
        error: response.error,
      });

      return {
        success: response.success,
        content: response.content,
        error: response.error,
        metadata: response.metadata,
      };
    } catch (error) {
      this.recordMetrics({
        provider: "unknown",
        model: "unknown",
        requestType: "grade_analysis",
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      logError("成绩分析失败:", error);
      return {
        success: false,
        content: "",
        error: error.message || "成绩分析失败",
      };
    }
  }

  /**
   * 📊 获取监控数据
   */
  getMonitoringDashboard() {
    return aiMonitoring.getMonitoringDashboard();
  }

  /**
   * 🏥 执行健康检查
   */
  async performHealthCheck() {
    return await aiMonitoring.performHealthCheck();
  }

  /**
   * 📈 获取性能统计
   */
  getPerformanceStats(providerId?: string) {
    return aiMonitoring.getPerformanceStats(providerId);
  }

  /**
   * 🎛️ 获取服务状态
   */
  getServiceStatus() {
    const gatewayStatus = aiGateway.getStatus();
    const monitoringData = aiMonitoring.getMonitoringDashboard();

    return {
      initialized: this.initialized,
      gateway: gatewayStatus,
      monitoring: monitoringData?.overview,
      lastUpdated: new Date(),
    };
  }

  /**
   * 🔄 重新初始化服务
   */
  async reinitialize(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  /**
   * 🛠️ 私有方法：确保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 📊 私有方法：记录监控指标
   */
  private recordMetrics(metrics: Omit<AIMetrics, "timestamp">): void {
    try {
      aiMonitoring.recordMetrics({
        ...metrics,
        timestamp: new Date(),
      });
    } catch (error) {
      logError("记录监控指标失败:", error);
    }
  }
}

// 创建并导出全局统一AI服务实例
export const unifiedAIService = UnifiedAIService.getInstance();

// 导出所有相关的类型和接口
export type { UnifiedAIRequest, UnifiedAIResponse } from "./AIGateway";

export type {
  AIMetrics,
  HealthCheckResult,
  PerformanceStats,
} from "./AIMonitoring";

// 导出个别组件（用于高级用法）
export { aiGateway, aiServiceAdapters, aiMonitoring };

// 提供简洁的函数式API（推荐使用）
export const AI = {
  /**
   * 初始化AI服务
   */
  init: () => unifiedAIService.initialize(),

  /**
   * 分析作业图片
   */
  analyzeImage: (
    imageUrl: string,
    params: { homeworkId: string; subject?: string }
  ) => unifiedAIService.analyzeHomeworkImage(imageUrl, params),

  /**
   * 分析作业内容
   */
  analyzeContent: (params: {
    content: string;
    imageUrls?: string[];
    homeworkId: string;
    subject?: string;
    existingKnowledgePoints?: KnowledgePoint[];
  }) => unifiedAIService.analyzeHomeworkContent(params),

  /**
   * AI聊天对话
   */
  chat: (
    message: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      conversationHistory?: { role: string; content: string }[];
    }
  ) => unifiedAIService.chat(message, options),

  /**
   * 通用分析
   */
  analyze: (content: string, existingPoints?: KnowledgePoint[]) =>
    unifiedAIService.analyzeContent(content, existingPoints),

  /**
   * 级联分析
   */
  cascadeAnalyze: (content: string, existingPoints?: KnowledgePoint[]) =>
    unifiedAIService.cascadeAnalyze(content, existingPoints),

  /**
   * 成绩分析
   */
  analyzeGrades: (
    gradeData: any[],
    analysisType?: "student" | "class" | "subject" | "trend"
  ) => unifiedAIService.analyzeGrades(gradeData, analysisType),

  /**
   * 获取监控数据
   */
  getMonitoring: () => unifiedAIService.getMonitoringDashboard(),

  /**
   * 健康检查
   */
  healthCheck: () => unifiedAIService.performHealthCheck(),

  /**
   * 获取服务状态
   */
  getStatus: () => unifiedAIService.getServiceStatus(),
};

// 默认导出统一AI服务实例
export default unifiedAIService;
