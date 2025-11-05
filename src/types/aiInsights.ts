/**
 * AI洞察相关类型定义
 * 用于智能分析引擎的数据结构
 */

// 洞察类型枚举
export enum InsightType {
  TREND = "trend", // 趋势发现
  ANOMALY = "anomaly", // 异常检测
  PATTERN = "pattern", // 模式识别
  ACHIEVEMENT = "achievement", // 成就亮点
  WARNING = "warning", // 预警提示
  SUGGESTION = "suggestion", // 改进建议
  COMPARISON = "comparison", // 对比分析
}

// 洞察重要性级别
export enum InsightPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

// 洞察情感倾向
export enum InsightSentiment {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
}

// 单个洞察项
export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  sentiment: InsightSentiment;
  title: string;
  description: string;
  detail?: string;
  metric?: {
    value: number | string;
    unit?: string;
    trend?: "up" | "down" | "stable";
    changePercent?: number;
  };
  affectedStudents?: number;
  confidence: number; // 0-1之间的置信度
  actions?: InsightAction[];
  relatedData?: any;
  timestamp: Date;
}

// 可执行的建议动作
export interface InsightAction {
  id: string;
  label: string;
  description?: string;
  actionType: "navigate" | "filter" | "export" | "notify" | "custom";
  actionData?: any;
}

// 趋势预测数据
export interface TrendPrediction {
  subject: string;
  currentTrend: "improving" | "declining" | "stable";
  predictedChange: number; // 预测的百分比变化
  confidence: number;
  timeframe: string; // 如 "下次考试", "本学期末"
  factors: string[]; // 影响因素
}

// 异常检测结果
export interface AnomalyDetection {
  type: "score_drop" | "score_surge" | "consistency" | "distribution";
  severity: "high" | "medium" | "low";
  description: string;
  affectedMetric: string;
  deviation: number; // 偏离程度
  possibleCauses: string[];
  suggestedActions: string[];
}

// 统计指标解释
export interface StatisticExplanation {
  metric: string;
  value: number | string;
  meaning: string;
  context: string;
  significance: "very_good" | "good" | "average" | "concerning" | "critical";
  comparison?: {
    benchmark: number;
    benchmarkLabel: string;
    difference: number;
  };
}

// 分析请求参数
export interface AnalysisRequest {
  data: any[]; // 原始数据
  context: {
    examId?: string;
    className?: string;
    subject?: string;
    timeRange?: {
      start: Date;
      end: Date;
    };
  };
  options?: {
    maxInsights?: number;
    focusAreas?: InsightType[];
    includeActions?: boolean;
    language?: "simple" | "technical";
  };
}

// 分析响应结果
export interface AnalysisResponse {
  insights: AIInsight[];
  summary: {
    totalInsights: number;
    highPriorityCount: number;
    positiveCount: number;
    negativeCount: number;
  };
  metadata: {
    analysisTime: number; // 分析耗时（毫秒）
    dataPoints: number; // 分析的数据点数量
    confidence: number; // 整体置信度
  };
}
