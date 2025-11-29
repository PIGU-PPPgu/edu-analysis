/**
 * 📊 报告系统类型定义
 * 用于自动生成成绩分析报告
 */

/**
 * 报告类型
 */
export type ReportType = "basic" | "advanced" | "complete";

/**
 * 严重程度
 */
export type Severity = "high" | "medium" | "low";

/**
 * 发现类别
 */
export type FindingCategory =
  | "performance"
  | "trend"
  | "warning"
  | "excellence"
  | "comparison";

/**
 * 行动项优先级
 */
export type ActionPriority = "immediate" | "short-term" | "long-term";

/**
 * 报告元数据
 */
export interface ReportMetadata {
  reportId: string;
  examId: string;
  examTitle: string;
  generatedAt: Date;
  generatedBy: string; // 用户ID
  reportType: ReportType;
  dataSnapshot: {
    totalStudents: number;
    totalClasses: number;
    examDate?: string;
  };
}

/**
 * 重点标记
 */
export interface Highlight {
  text: string;
  type: "warning" | "success" | "info";
  relatedData?: any;
}

/**
 * 报告章节
 */
export interface ReportSection {
  id: string;
  title: string;
  order: number;
  chartComponent?: string; // 关联的图表组件名称（如 'ScoreDistributionChart'）
  chartData?: any; // 图表数据
  insights: string[]; // 文字分析（3-5条）
  highlights: Highlight[]; // 重点标记
  aiGenerated: boolean; // 是否AI生成
  rawData?: any; // 原始数据（用于详细查看）
  // 扩展字段：详细统计数据
  detailedStats?: any[]; // 详细统计表格数据（如各科目的平均分、及格率等）
  scoreDistributionBySubject?: any[]; // 各科目分数段分布数据
  typicalStudents?: any[]; // 典型学生数据（优秀、中等、后进）
}

/**
 * 核心发现
 */
export interface KeyFinding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  message: string; // 主要信息（简短）
  details?: string; // 详细信息（可选）
  data: any; // 相关数据
  relatedCharts: string[]; // 关联的图表组件名称
  actionRequired: boolean; // 是否需要采取行动
}

/**
 * 教学建议
 */
export interface Recommendation {
  id: string;
  category: string; // 如 "教学方法"、"学生辅导"、"课程调整"
  title: string;
  description: string;
  targetGroup?: string; // 目标群体（如 "全体学生"、"XX班"、"学困生"）
  priority?: ActionPriority; // 优先级：immediate/short-term/long-term
  expectedOutcome?: string; // 预期效果
  aiGenerated: boolean;
}

/**
 * 行动项
 */
export interface ActionItem {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  targetStudents?: string[]; // 学生ID列表
  targetClasses?: string[]; // 班级名称列表
  deadline?: Date; // 建议完成时间
  completed: boolean;
  completedAt?: Date;
  completedBy?: string; // 完成人用户ID
  notes?: string; // 备注
}

/**
 * 预警信息
 */
export interface Warning {
  id: string;
  severity: Severity;
  message: string;
  affectedStudents: number;
  affectedClasses?: string[];
  suggestedAction?: string; // 建议的解决措施
  relatedMetrics: {
    metric: string;
    value: number;
    threshold: number;
  }[];
}

/**
 * AI生成的洞察
 */
export interface AIInsights {
  keyFindings: KeyFinding[]; // 核心发现（5-10条）
  recommendations: Recommendation[]; // 教学建议（5-10条）
  warnings: Warning[]; // 预警信息
  summary: string; // 总体概述（不超过500字）
  confidence: number; // AI分析的置信度（0-1）
  generatedAt: Date;
  modelUsed: string; // 使用的AI模型
}

/**
 * 基础分析部分
 */
export interface BasicAnalysis {
  summary: ReportSection; // 考试概览
  scoreDistribution: ReportSection; // 成绩分布
  classComparison: ReportSection; // 班级对比
  subjectAnalysis: ReportSection; // 科目分析
}

/**
 * 高级分析部分
 */
export interface AdvancedAnalysis {
  gradeFlow?: ReportSection; // 🆕 等级流动分析（桑基图）
  trends: ReportSection; // 趋势分析
  correlations: ReportSection; // 学科关联
  rankings: ReportSection; // 多维排名
  predictions?: ReportSection; // 预测分析（可选）
}

/**
 * 完整分析报告
 */
export interface AnalysisReport {
  metadata: ReportMetadata;
  basicAnalysis: BasicAnalysis;
  advancedAnalysis?: AdvancedAnalysis;
  aiInsights?: AIInsights;
  actionItems: ActionItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 数据库存储的报告记录
 */
export interface StoredAnalysisReport {
  id: string;
  exam_id: string;
  exam_title: string;
  report_type: ReportType;
  report_data: AnalysisReport; // JSONB字段
  generated_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * 报告生成选项
 */
export interface ReportGenerationOptions {
  includeAIAnalysis: boolean; // 是否包含AI分析
  includeAdvancedAnalysis: boolean; // 是否包含高级分析
  maxInsightsPerSection: number; // 每个章节最多洞察数
  aiMaxTokens: number; // AI分析的最大token数
  language: "zh-CN" | "en-US"; // 报告语言
}

/**
 * 报告导出选项
 */
export interface ReportExportOptions {
  format: "pdf" | "html" | "json";
  includeCharts: boolean;
  includeRawData: boolean;
  filename?: string;
}
