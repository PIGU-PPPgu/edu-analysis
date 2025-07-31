/**
 * 高级分析API类型定义
 * 提供统计分析、预测和相关性分析的接口规范
 */

import { GradeRecord, Subject, GradeStatistics } from "./grade";

// ==================== 基础类型定义 ====================

/**
 * 时间范围类型
 */
export interface TimeRange {
  start: Date | string;
  end: Date | string;
  granularity?: "day" | "week" | "month" | "term" | "year";
}

/**
 * 数据点类型（用于趋势分析）
 */
export interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * 统计指标类型
 */
export enum StatisticMetric {
  MEAN = "mean",
  MEDIAN = "median",
  MODE = "mode",
  VARIANCE = "variance",
  STD_DEV = "std_dev",
  MIN = "min",
  MAX = "max",
  SUM = "sum",
  COUNT = "count",
  PERCENTILE = "percentile",
}

// ==================== 高级统计分析 ====================

/**
 * 批量统计请求参数
 */
export interface BatchStatisticsRequest {
  examIds?: string[];
  classNames?: string[];
  subjects?: (Subject | string)[];
  timeRange?: TimeRange;
  metrics: StatisticMetric[];
  groupBy?: ("exam" | "class" | "subject" | "time")[];
  filters?: {
    minScore?: number;
    maxScore?: number;
    gradeLevel?: string[];
  };
}

/**
 * 批量统计响应结果
 */
export interface BatchStatisticsResponse {
  data: StatisticsResult[];
  summary: {
    totalRecords: number;
    processedRecords: number;
    executionTime: number;
  };
  error?: string;
}

/**
 * 统计结果项
 */
export interface StatisticsResult {
  groupKey: string;
  groupValues: Record<string, string>;
  metrics: Record<StatisticMetric, number>;
  sampleSize: number;
  confidence?: number;
}

// ==================== 相关性分析 ====================

/**
 * 相关性分析请求
 */
export interface CorrelationAnalysisRequest {
  variables: CorrelationVariable[];
  method?: "pearson" | "spearman" | "kendall";
  timeRange?: TimeRange;
  filters?: Record<string, any>;
  includeSignificance?: boolean;
}

/**
 * 相关性变量定义
 */
export interface CorrelationVariable {
  name: string;
  source: "grade" | "attendance" | "homework" | "behavior";
  field: string;
  subject?: Subject | string;
  transformation?: "none" | "log" | "sqrt" | "rank";
}

/**
 * 相关性分析结果
 */
export interface CorrelationAnalysisResponse {
  correlationMatrix: CorrelationMatrix;
  significanceTests?: SignificanceTest[];
  interpretation?: string[];
  visualizationData?: any;
}

/**
 * 相关性矩阵
 */
export interface CorrelationMatrix {
  variables: string[];
  values: number[][];
  pValues?: number[][];
}

/**
 * 显著性检验结果
 */
export interface SignificanceTest {
  variable1: string;
  variable2: string;
  correlation: number;
  pValue: number;
  significant: boolean;
  confidenceLevel: number;
}

// ==================== 预测模型 ====================

/**
 * 预测模型类型
 */
export enum PredictionModelType {
  LINEAR_REGRESSION = "linear_regression",
  POLYNOMIAL_REGRESSION = "polynomial_regression",
  TIME_SERIES = "time_series",
  NEURAL_NETWORK = "neural_network",
  RANDOM_FOREST = "random_forest",
}

/**
 * 预测请求参数
 */
export interface PredictionRequest {
  modelType: PredictionModelType;
  targetVariable: {
    field: string;
    subject?: Subject | string;
  };
  features: string[];
  trainingData?: {
    examIds?: string[];
    timeRange?: TimeRange;
  };
  predictionScope: {
    students?: string[];
    timePoints?: string[];
  };
  confidence?: number;
}

/**
 * 预测响应结果
 */
export interface PredictionResponse {
  predictions: PredictionResult[];
  model: {
    type: PredictionModelType;
    accuracy: number;
    parameters: Record<string, any>;
    features: FeatureImportance[];
  };
  validation?: {
    rmse: number;
    mae: number;
    r2: number;
  };
}

/**
 * 单个预测结果
 */
export interface PredictionResult {
  studentId: string;
  predictions: {
    value: number;
    confidence: number;
    confidenceInterval: [number, number];
    timestamp?: string;
  }[];
  factors?: Record<string, number>;
}

/**
 * 特征重要性
 */
export interface FeatureImportance {
  feature: string;
  importance: number;
  correlation: number;
}

// ==================== 异常检测 ====================

/**
 * 异常检测算法
 */
export enum AnomalyAlgorithm {
  ISOLATION_FOREST = "isolation_forest",
  LOF = "local_outlier_factor",
  STATISTICAL = "statistical",
  CLUSTERING = "clustering",
  NEURAL = "neural",
}

/**
 * 异常检测请求
 */
export interface AnomalyDetectionRequest {
  algorithm: AnomalyAlgorithm;
  scope: {
    examIds?: string[];
    subjects?: (Subject | string)[];
    classNames?: string[];
    timeRange?: TimeRange;
  };
  sensitivity?: number; // 0-1, 越高越敏感
  dimensions?: string[]; // 检测维度
  contextual?: boolean; // 是否考虑上下文
}

/**
 * 异常检测响应
 */
export interface AnomalyDetectionResponse {
  anomalies: Anomaly[];
  statistics: {
    totalRecords: number;
    anomalyCount: number;
    anomalyRate: number;
  };
  patterns?: AnomalyPattern[];
}

/**
 * 异常记录
 */
export interface Anomaly {
  id: string;
  type: "outlier" | "trend" | "pattern" | "contextual";
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  record: Partial<GradeRecord>;
  reason: string;
  dimensions: Record<string, any>;
  suggestions?: string[];
}

/**
 * 异常模式
 */
export interface AnomalyPattern {
  pattern: string;
  count: number;
  affectedStudents: string[];
  commonFactors: Record<string, any>;
}

// ==================== 多维度聚合 ====================

/**
 * 聚合维度定义
 */
export interface AggregationDimension {
  field: string;
  type: "categorical" | "numerical" | "temporal";
  binning?: {
    method: "equal_width" | "equal_frequency" | "custom";
    bins?: number | number[];
  };
  timeGranularity?: "hour" | "day" | "week" | "month" | "quarter" | "year";
}

/**
 * 多维度聚合请求
 */
export interface MultiDimensionalAggregationRequest {
  dimensions: AggregationDimension[];
  metrics: {
    field: string;
    aggregation:
      | "sum"
      | "avg"
      | "min"
      | "max"
      | "count"
      | "distinct"
      | "percentile";
    percentile?: number;
  }[];
  filters?: Record<string, any>;
  having?: {
    metric: string;
    operator: ">" | "<" | ">=" | "<=" | "=" | "!=";
    value: number;
  }[];
  sort?: {
    field: string;
    order: "asc" | "desc";
  }[];
  limit?: number;
}

/**
 * 多维度聚合响应
 */
export interface MultiDimensionalAggregationResponse {
  dimensions: string[];
  data: AggregationResult[];
  totals?: Record<string, number>;
  metadata: {
    executionTime: number;
    totalGroups: number;
    filteredGroups: number;
  };
}

/**
 * 聚合结果项
 */
export interface AggregationResult {
  dimensions: Record<string, any>;
  metrics: Record<string, number>;
  count: number;
  percentage?: number;
}

// ==================== 趋势分析 ====================

/**
 * 趋势分析请求
 */
export interface TrendAnalysisRequest {
  metric: {
    field: string;
    subject?: Subject | string;
    aggregation?: "avg" | "sum" | "min" | "max";
  };
  timeRange: TimeRange;
  groupBy?: string[];
  smoothing?: {
    method: "moving_average" | "exponential" | "loess";
    window?: number;
    alpha?: number;
  };
  forecast?: {
    periods: number;
    method?: "linear" | "exponential" | "arima" | "prophet";
  };
}

/**
 * 趋势分析响应
 */
export interface TrendAnalysisResponse {
  trends: TrendData[];
  statistics: {
    overallTrend: "increasing" | "decreasing" | "stable";
    changeRate: number;
    volatility: number;
  };
  forecast?: ForecastData[];
  seasonality?: SeasonalityInfo;
}

/**
 * 趋势数据
 */
export interface TrendData {
  group?: string;
  dataPoints: DataPoint[];
  trendLine?: DataPoint[];
  confidence?: [DataPoint[], DataPoint[]]; // 置信区间
}

/**
 * 预测数据
 */
export interface ForecastData extends TrendData {
  uncertainty: number;
  method: string;
}

/**
 * 季节性信息
 */
export interface SeasonalityInfo {
  period: number;
  strength: number;
  peaks: string[];
  troughs: string[];
}

// ==================== 缓存配置 ====================

/**
 * 缓存策略
 */
export interface CacheStrategy {
  enabled: boolean;
  ttl: number; // 秒
  key?: string;
  invalidateOn?: string[]; // 触发缓存失效的事件
}

// ==================== API 响应包装 ====================

/**
 * 统一的API响应格式
 */
export interface AdvancedAnalysisResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    executionTime: number;
    cached: boolean;
    version: string;
  };
}

// ==================== 错误类型 ====================

/**
 * API错误代码
 */
export enum AnalysisErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  MODEL_TRAINING_FAILED = "MODEL_TRAINING_FAILED",
  COMPUTATION_ERROR = "COMPUTATION_ERROR",
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT = "RATE_LIMIT",
  UNAUTHORIZED = "UNAUTHORIZED",
}
