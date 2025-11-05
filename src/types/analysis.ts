import { KnowledgePoint } from "./homework";

/**
 * AI分析结果接口
 */
export interface AIAnalysisResult {
  knowledgePoints: KnowledgePoint[];
  analysisTime?: number;
  confidence?: number;
  providerInfo?: {
    provider: string;
    model: string;
    name?: string;
    modelName?: string;
  };
}

/**
 * 分析任务状态
 */
export enum AnalysisTaskStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * 分析任务接口
 */
export interface AnalysisTask {
  id: string;
  status: AnalysisTaskStatus;
  contentId: string;
  contentType: string;
  result?: AIAnalysisResult;
  error?: string;
  startTime: number;
  endTime?: number;
  progressPercent?: number;
}

/**
 * 分析配置选项
 */
export interface AnalysisOptions {
  withRecommendations?: boolean;
  detailLevel?: "basic" | "detailed" | "comprehensive";
  includeExamples?: boolean;
  language?: string;
}
