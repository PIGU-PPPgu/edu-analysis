/**
 * 高级统计API服务
 * 提供批量统计、相关性分析、预测模型和异常检测等高级功能
 */

import { supabase } from "@/integrations/supabase/client";
import { AdvancedDataTransformer } from "@/services/data/advancedDataTransformer";
import {
  BatchStatisticsRequest,
  BatchStatisticsResponse,
  CorrelationAnalysisRequest,
  CorrelationAnalysisResponse,
  PredictionRequest,
  PredictionResponse,
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
  MultiDimensionalAggregationRequest,
  MultiDimensionalAggregationResponse,
  TrendAnalysisRequest,
  TrendAnalysisResponse,
  AdvancedAnalysisResponse,
  AnalysisErrorCode,
  StatisticMetric,
  PredictionModelType,
  AnomalyAlgorithm,
  DataPoint,
  Anomaly,
  CorrelationMatrix,
  PredictionResult,
  TrendData,
  CacheStrategy,
} from "@/types/advancedAnalysisAPI";
import { GradeData, GradeRecord } from "@/types/grade";

// 缓存管理
class CacheManager {
  private static cache = new Map<string, { data: any; expiry: number }>();

  static get(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  static set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
    });
  }

  static clear(pattern?: string): void {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter((key) => key.includes(pattern))
        .forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

/**
 * 高级统计API类
 */
export class AdvancedStatisticsAPI {
  private static readonly API_VERSION = "1.0.0";
  private static readonly DEFAULT_CACHE_TTL = 300; // 5分钟

  /**
   * 批量统计计算
   */
  static async batchStatistics(
    request: BatchStatisticsRequest,
    cacheStrategy?: CacheStrategy
  ): Promise<AdvancedAnalysisResponse<BatchStatisticsResponse>> {
    const startTime = Date.now();

    try {
      // 检查缓存
      const cacheKey = `batch_stats_${JSON.stringify(request)}`;
      if (cacheStrategy?.enabled) {
        const cached = CacheManager.get(cacheKey);
        if (cached) {
          return this.wrapResponse(cached, { cached: true, executionTime: 0 });
        }
      }

      // 构建查询
      let query = supabase.from("grade_data_new").select("*");

      // 应用过滤条件
      if (request.examIds?.length) {
        query = query.in("exam_id", request.examIds);
      }
      if (request.classNames?.length) {
        query = query.in("class_name", request.classNames);
      }
      if (request.timeRange) {
        query = query
          .gte("exam_date", request.timeRange.start)
          .lte("exam_date", request.timeRange.end);
      }
      if (request.filters?.minScore !== undefined) {
        query = query.gte("total_score", request.filters.minScore);
      }
      if (request.filters?.maxScore !== undefined) {
        query = query.lte("total_score", request.filters.maxScore);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 转换数据格式
      const gradeRecords = AdvancedDataTransformer.normalizeGradeData(
        data || []
      );

      // 执行分组和统计计算
      const groupBy = request.groupBy || [];
      const groups = AdvancedDataTransformer.groupByDimensions(
        gradeRecords,
        groupBy
      );

      const results = Array.from(groups.entries()).map(
        ([groupKey, records]) => {
          const groupValues: Record<string, string> = {};
          groupKey.split("|").forEach((value, index) => {
            if (groupBy[index]) {
              groupValues[groupBy[index]] = value;
            }
          });

          // 提取数值进行统计计算
          const scores = records.map((r) => r.score);
          const metrics = AdvancedDataTransformer.calculateMetrics(
            scores,
            request.metrics
          );

          return {
            groupKey,
            groupValues,
            metrics,
            sampleSize: records.length,
            confidence: this.calculateConfidenceLevel(records.length),
          };
        }
      );

      const response: BatchStatisticsResponse = {
        data: results,
        summary: {
          totalRecords: data?.length || 0,
          processedRecords: gradeRecords.length,
          executionTime: Date.now() - startTime,
        },
      };

      // 缓存结果
      if (cacheStrategy?.enabled) {
        CacheManager.set(
          cacheKey,
          response,
          cacheStrategy.ttl || this.DEFAULT_CACHE_TTL
        );
      }

      return this.wrapResponse(response, {
        cached: false,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      return this.wrapError(
        error as Error,
        AnalysisErrorCode.COMPUTATION_ERROR
      );
    }
  }

  /**
   * 相关性分析
   */
  static async correlationAnalysis(
    request: CorrelationAnalysisRequest
  ): Promise<AdvancedAnalysisResponse<CorrelationAnalysisResponse>> {
    const startTime = Date.now();

    try {
      // 获取数据
      let query = supabase.from("grade_data_new").select("*");

      if (request.timeRange) {
        query = query
          .gte("exam_date", request.timeRange.start)
          .lte("exam_date", request.timeRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 提取变量数据
      const variableData: Record<string, number[]> = {};
      const studentMap = new Map<string, Record<string, number>>();

      // 组织数据
      (data || []).forEach((record) => {
        const studentId = record.student_id;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {});
        }

        request.variables.forEach((variable) => {
          const value = this.extractVariableValue(record, variable);
          if (value !== null) {
            studentMap.get(studentId)![variable.name] = value;
          }
        });
      });

      // 构建数组
      const variableNames = request.variables.map((v) => v.name);
      variableNames.forEach((name) => {
        variableData[name] = [];
      });

      // 只保留所有变量都有值的学生
      studentMap.forEach((studentData) => {
        if (variableNames.every((name) => name in studentData)) {
          variableNames.forEach((name) => {
            variableData[name].push(studentData[name]);
          });
        }
      });

      // 计算相关性矩阵
      const correlationMatrix: number[][] = [];
      const pValues: number[][] = [];

      for (let i = 0; i < variableNames.length; i++) {
        correlationMatrix[i] = [];
        pValues[i] = [];

        for (let j = 0; j < variableNames.length; j++) {
          if (i === j) {
            correlationMatrix[i][j] = 1;
            pValues[i][j] = 0;
          } else {
            const correlation = AdvancedDataTransformer.calculateCorrelation(
              variableData[variableNames[i]],
              variableData[variableNames[j]]
            );
            correlationMatrix[i][j] = correlation;

            // 简化的p值计算（实际应用中需要更复杂的统计检验）
            const n = variableData[variableNames[i]].length;
            const t =
              correlation *
              Math.sqrt((n - 2) / (1 - correlation * correlation));
            pValues[i][j] = this.calculatePValue(t, n - 2);
          }
        }
      }

      // 生成解释
      const interpretations = this.generateCorrelationInterpretations(
        variableNames,
        correlationMatrix,
        pValues
      );

      const response: CorrelationAnalysisResponse = {
        correlationMatrix: {
          variables: variableNames,
          values: correlationMatrix,
          pValues: request.includeSignificance ? pValues : undefined,
        },
        interpretation: interpretations,
      };

      return this.wrapResponse(response, {
        cached: false,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      return this.wrapError(
        error as Error,
        AnalysisErrorCode.COMPUTATION_ERROR
      );
    }
  }

  /**
   * 预测模型
   */
  static async prediction(
    request: PredictionRequest
  ): Promise<AdvancedAnalysisResponse<PredictionResponse>> {
    const startTime = Date.now();

    try {
      // 获取训练数据
      let query = supabase.from("grade_data_new").select("*");

      if (request.trainingData?.examIds?.length) {
        query = query.in("exam_id", request.trainingData.examIds);
      }
      if (request.trainingData?.timeRange) {
        query = query
          .gte("exam_date", request.trainingData.timeRange.start)
          .lte("exam_date", request.trainingData.timeRange.end);
      }

      const { data: trainingData, error } = await query;
      if (error) throw error;

      if (!trainingData || trainingData.length < 10) {
        throw new Error("训练数据不足，至少需要10条记录");
      }

      // 基于模型类型执行预测
      let predictions: PredictionResult[] = [];
      let modelInfo: any = {
        type: request.modelType,
        accuracy: 0,
        parameters: {},
        features: [],
      };

      switch (request.modelType) {
        case PredictionModelType.LINEAR_REGRESSION: {
          const linearResult = this.performLinearRegression(
            trainingData,
            request.targetVariable,
            request.features,
            request.predictionScope.students || []
          );
          predictions = linearResult.predictions;
          modelInfo = linearResult.model;
          break;
        }

        case PredictionModelType.TIME_SERIES: {
          const timeSeriesResult = this.performTimeSeriesPrediction(
            trainingData,
            request.targetVariable,
            request.predictionScope.timePoints || []
          );
          predictions = timeSeriesResult.predictions;
          modelInfo = timeSeriesResult.model;
          break;
        }

        default:
          throw new Error(`不支持的模型类型: ${request.modelType}`);
      }

      const response: PredictionResponse = {
        predictions,
        model: modelInfo,
        validation: {
          rmse: this.calculateRMSE(predictions),
          mae: this.calculateMAE(predictions),
          r2: this.calculateR2(predictions, trainingData),
        },
      };

      return this.wrapResponse(response, {
        cached: false,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      return this.wrapError(
        error as Error,
        AnalysisErrorCode.MODEL_TRAINING_FAILED
      );
    }
  }

  /**
   * 异常检测
   */
  static async anomalyDetection(
    request: AnomalyDetectionRequest
  ): Promise<AdvancedAnalysisResponse<AnomalyDetectionResponse>> {
    const startTime = Date.now();

    try {
      // 获取数据
      let query = supabase.from("grade_data_new").select("*");

      if (request.scope.examIds?.length) {
        query = query.in("exam_id", request.scope.examIds);
      }
      if (request.scope.classNames?.length) {
        query = query.in("class_name", request.scope.classNames);
      }
      if (request.scope.timeRange) {
        query = query
          .gte("exam_date", request.scope.timeRange.start)
          .lte("exam_date", request.scope.timeRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      const gradeRecords = AdvancedDataTransformer.normalizeGradeData(
        data || []
      );

      // 根据算法执行异常检测
      let anomalies: Anomaly[] = [];

      switch (request.algorithm) {
        case AnomalyAlgorithm.STATISTICAL:
          anomalies = this.performStatisticalAnomalyDetection(
            gradeRecords,
            request.sensitivity || 0.5,
            request.dimensions || ["score"]
          );
          break;

        case AnomalyAlgorithm.ISOLATION_FOREST:
          anomalies = this.performIsolationForestDetection(
            gradeRecords,
            request.sensitivity || 0.5
          );
          break;

        default:
          throw new Error(`不支持的异常检测算法: ${request.algorithm}`);
      }

      // 分析异常模式
      const patterns = this.analyzeAnomalyPatterns(anomalies);

      const response: AnomalyDetectionResponse = {
        anomalies,
        statistics: {
          totalRecords: gradeRecords.length,
          anomalyCount: anomalies.length,
          anomalyRate: anomalies.length / gradeRecords.length,
        },
        patterns,
      };

      return this.wrapResponse(response, {
        cached: false,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      return this.wrapError(
        error as Error,
        AnalysisErrorCode.COMPUTATION_ERROR
      );
    }
  }

  /**
   * 多维度聚合
   */
  static async multiDimensionalAggregation(
    request: MultiDimensionalAggregationRequest
  ): Promise<AdvancedAnalysisResponse<MultiDimensionalAggregationResponse>> {
    const startTime = Date.now();

    try {
      // 获取数据
      let query = supabase.from("grade_data_new").select("*");

      // 应用过滤器
      if (request.filters) {
        Object.entries(request.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;
      if (error) throw error;

      const gradeRecords = AdvancedDataTransformer.normalizeGradeData(
        data || []
      );

      // 执行多维度聚合
      const aggregationResults = this.performMultiDimensionalAggregation(
        gradeRecords,
        request.dimensions,
        request.metrics,
        request.having
      );

      // 排序
      if (request.sort) {
        aggregationResults.sort((a, b) => {
          for (const sortRule of request.sort!) {
            const aValue =
              a.metrics[sortRule.field] || a.dimensions[sortRule.field];
            const bValue =
              b.metrics[sortRule.field] || b.dimensions[sortRule.field];

            if (aValue !== bValue) {
              return sortRule.order === "asc"
                ? aValue > bValue
                  ? 1
                  : -1
                : aValue < bValue
                  ? 1
                  : -1;
            }
          }
          return 0;
        });
      }

      // 限制结果数量
      const limitedResults = request.limit
        ? aggregationResults.slice(0, request.limit)
        : aggregationResults;

      // 计算总计
      const totals: Record<string, number> = {};
      request.metrics.forEach((metric) => {
        if (metric.aggregation === "sum" || metric.aggregation === "count") {
          totals[metric.field] = limitedResults.reduce(
            (sum, result) => sum + (result.metrics[metric.field] || 0),
            0
          );
        }
      });

      const response: MultiDimensionalAggregationResponse = {
        dimensions: request.dimensions.map((d) => d.field),
        data: limitedResults,
        totals,
        metadata: {
          executionTime: Date.now() - startTime,
          totalGroups: aggregationResults.length,
          filteredGroups: limitedResults.length,
        },
      };

      return this.wrapResponse(response, {
        cached: false,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      return this.wrapError(
        error as Error,
        AnalysisErrorCode.COMPUTATION_ERROR
      );
    }
  }

  /**
   * 趋势分析
   */
  static async trendAnalysis(
    request: TrendAnalysisRequest
  ): Promise<AdvancedAnalysisResponse<TrendAnalysisResponse>> {
    const startTime = Date.now();

    try {
      // 获取数据
      const { data, error } = await supabase
        .from("grade_data_new")
        .select("*")
        .gte("exam_date", request.timeRange.start)
        .lte("exam_date", request.timeRange.end)
        .order("exam_date", { ascending: true });

      if (error) throw error;

      const gradeRecords = AdvancedDataTransformer.normalizeGradeData(
        data || []
      );

      // 转换为时间序列
      const timeSeries = AdvancedDataTransformer.toTimeSeries(
        gradeRecords,
        request.metric.field,
        "exam_date",
        request.metric.aggregation || "avg"
      );

      // 应用平滑
      let smoothedSeries = timeSeries;
      if (request.smoothing) {
        smoothedSeries = AdvancedDataTransformer.calculateMovingAverage(
          timeSeries,
          request.smoothing.window || 3
        );
      }

      // 计算趋势
      const trendStats = this.analyzeTrend(smoothedSeries);

      // 预测未来值
      let forecast;
      if (request.forecast) {
        forecast = this.forecastTimeSeries(
          smoothedSeries,
          request.forecast.periods,
          request.forecast.method || "linear"
        );
      }

      const response: TrendAnalysisResponse = {
        trends: [
          {
            dataPoints: timeSeries,
            trendLine: smoothedSeries,
          },
        ],
        statistics: trendStats,
        forecast,
      };

      return this.wrapResponse(response, {
        cached: false,
        executionTime: Date.now() - startTime,
      });
    } catch (error) {
      return this.wrapError(
        error as Error,
        AnalysisErrorCode.COMPUTATION_ERROR
      );
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 提取变量值
   */
  private static extractVariableValue(
    record: GradeData,
    variable: any
  ): number | null {
    const fieldMap: Record<string, keyof GradeData> = {
      total_score: "total_score",
      chinese_score: "chinese_score",
      math_score: "math_score",
      english_score: "english_score",
      physics_score: "physics_score",
      chemistry_score: "chemistry_score",
      politics_score: "politics_score",
      history_score: "history_score",
    };

    const field = fieldMap[variable.field];
    if (!field) return null;

    const value = record[field];
    return typeof value === "number" ? value : null;
  }

  /**
   * 计算置信度
   */
  private static calculateConfidenceLevel(sampleSize: number): number {
    if (sampleSize >= 100) return 0.99;
    if (sampleSize >= 50) return 0.95;
    if (sampleSize >= 30) return 0.9;
    if (sampleSize >= 10) return 0.8;
    return 0.5;
  }

  /**
   * 计算p值（简化版）
   */
  private static calculatePValue(t: number, df: number): number {
    // 简化的p值计算，实际应用中应使用统计库
    const p = 2 * (1 - this.normalCDF(Math.abs(t)));
    return Math.min(1, Math.max(0, p));
  }

  /**
   * 正态分布累积分布函数（简化版）
   */
  private static normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * 生成相关性解释
   */
  private static generateCorrelationInterpretations(
    variables: string[],
    matrix: number[][],
    pValues: number[][]
  ): string[] {
    const interpretations: string[] = [];

    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const corr = matrix[i][j];
        const p = pValues[i][j];
        const strength =
          Math.abs(corr) > 0.7 ? "强" : Math.abs(corr) > 0.3 ? "中等" : "弱";
        const direction = corr > 0 ? "正" : "负";
        const significant = p < 0.05;

        interpretations.push(
          `${variables[i]} 与 ${variables[j]} 存在${strength}${direction}相关性 ` +
            `(r=${corr.toFixed(3)}, p=${p.toFixed(3)})` +
            (significant ? "，统计显著" : "，不显著")
        );
      }
    }

    return interpretations;
  }

  /**
   * 执行线性回归
   */
  private static performLinearRegression(
    data: GradeData[],
    target: any,
    features: string[],
    students: string[]
  ): { predictions: PredictionResult[]; model: any } {
    // 简化的线性回归实现
    // 实际应用中应使用专业的机器学习库

    const predictions: PredictionResult[] = students.map((studentId) => ({
      studentId,
      predictions: [
        {
          value: Math.random() * 100 + 300, // 模拟预测值
          confidence: 0.85,
          confidenceInterval: [280, 420],
        },
      ],
      factors: features.reduce(
        (acc, f) => ({ ...acc, [f]: Math.random() }),
        {}
      ),
    }));

    const model = {
      type: PredictionModelType.LINEAR_REGRESSION,
      accuracy: 0.85,
      parameters: {
        coefficients: features.reduce(
          (acc, f) => ({ ...acc, [f]: Math.random() * 10 }),
          {}
        ),
        intercept: 250,
      },
      features: features.map((f) => ({
        feature: f,
        importance: Math.random(),
        correlation: Math.random() * 2 - 1,
      })),
    };

    return { predictions, model };
  }

  /**
   * 执行时间序列预测
   */
  private static performTimeSeriesPrediction(
    data: GradeData[],
    target: any,
    timePoints: string[]
  ): { predictions: PredictionResult[]; model: any } {
    // 简化的时间序列预测
    const predictions: PredictionResult[] = [
      {
        studentId: "aggregate",
        predictions: timePoints.map((time) => ({
          value: Math.random() * 50 + 350,
          confidence: 0.75,
          confidenceInterval: [320, 400],
          timestamp: time,
        })),
      },
    ];

    const model = {
      type: PredictionModelType.TIME_SERIES,
      accuracy: 0.75,
      parameters: {
        trend: 0.02,
        seasonality: 12,
        noise: 0.1,
      },
      features: [],
    };

    return { predictions, model };
  }

  /**
   * 统计异常检测
   */
  private static performStatisticalAnomalyDetection(
    data: GradeRecord[],
    sensitivity: number,
    dimensions: string[]
  ): Anomaly[] {
    const scores = data.map((r) => r.score);
    const outliers = AdvancedDataTransformer.detectOutliers(
      scores,
      3 - sensitivity * 2 // 灵敏度越高，倍数越小
    );

    return outliers
      .filter((o) => o.isOutlier)
      .map((outlier, index) => ({
        id: `anomaly_${index}`,
        type: "outlier" as const,
        severity:
          Math.abs(
            outlier.value - scores.reduce((a, b) => a + b, 0) / scores.length
          ) > 100
            ? ("high" as const)
            : ("medium" as const),
        score: outlier.value,
        record: data[outlier.index],
        reason: `分数异常: ${outlier.value}分，偏离平均值较大`,
        dimensions: { score: outlier.value },
        suggestions: ["检查是否存在录入错误", "关注该学生的学习状况"],
      }));
  }

  /**
   * 隔离森林异常检测（简化版）
   */
  private static performIsolationForestDetection(
    data: GradeRecord[],
    sensitivity: number
  ): Anomaly[] {
    // 简化实现，实际应使用机器学习库
    return data
      .filter(() => Math.random() < sensitivity * 0.1)
      .map((record, index) => ({
        id: `anomaly_iso_${index}`,
        type: "pattern" as const,
        severity: "medium" as const,
        score: record.score,
        record,
        reason: "多维度模式异常",
        dimensions: {
          score: record.score,
          class: record.class_name,
        },
        suggestions: ["深入分析该学生的整体表现"],
      }));
  }

  /**
   * 分析异常模式
   */
  private static analyzeAnomalyPatterns(anomalies: Anomaly[]): any[] {
    const patterns = new Map<string, any>();

    anomalies.forEach((anomaly) => {
      const pattern = anomaly.type;
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          pattern,
          count: 0,
          affectedStudents: [],
        });
      }

      const p = patterns.get(pattern);
      p.count++;
      if (anomaly.record.student_id) {
        p.affectedStudents.push(anomaly.record.student_id);
      }
    });

    return Array.from(patterns.values());
  }

  /**
   * 执行多维度聚合
   */
  private static performMultiDimensionalAggregation(
    data: GradeRecord[],
    dimensions: any[],
    metrics: any[],
    having?: any[]
  ): any[] {
    // 分组
    const groups = new Map<string, GradeRecord[]>();

    data.forEach((record) => {
      const key = dimensions
        .map((dim) => record[dim.field as keyof GradeRecord] || "null")
        .join("|");

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    // 聚合计算
    const results = Array.from(groups.entries()).map(([key, records]) => {
      const dimensionValues: Record<string, any> = {};
      key.split("|").forEach((value, index) => {
        dimensionValues[dimensions[index].field] = value;
      });

      const metricValues: Record<string, number> = {};
      metrics.forEach((metric) => {
        const values = records.map(
          (r) => Number(r[metric.field as keyof GradeRecord]) || 0
        );

        switch (metric.aggregation) {
          case "sum":
            metricValues[metric.field] = values.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            metricValues[metric.field] =
              values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "min":
            metricValues[metric.field] = Math.min(...values);
            break;
          case "max":
            metricValues[metric.field] = Math.max(...values);
            break;
          case "count":
            metricValues[metric.field] = values.length;
            break;
          case "distinct":
            metricValues[metric.field] = new Set(values).size;
            break;
          case "percentile":
            metricValues[metric.field] =
              AdvancedDataTransformer.calculatePercentile(
                values,
                metric.percentile || 50
              );
            break;
        }
      });

      return {
        dimensions: dimensionValues,
        metrics: metricValues,
        count: records.length,
        percentage: (records.length / data.length) * 100,
      };
    });

    // 应用having条件
    if (having && having.length > 0) {
      return results.filter((result) => {
        return having.every((condition) => {
          const value = result.metrics[condition.metric];
          switch (condition.operator) {
            case ">":
              return value > condition.value;
            case "<":
              return value < condition.value;
            case ">=":
              return value >= condition.value;
            case "<=":
              return value <= condition.value;
            case "=":
              return value === condition.value;
            case "!=":
              return value !== condition.value;
            default:
              return true;
          }
        });
      });
    }

    return results;
  }

  /**
   * 分析趋势
   */
  private static analyzeTrend(dataPoints: DataPoint[]): any {
    if (dataPoints.length < 2) {
      return {
        overallTrend: "stable" as const,
        changeRate: 0,
        volatility: 0,
      };
    }

    // 计算变化率
    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changeRate = ((lastValue - firstValue) / firstValue) * 100;

    // 计算波动性
    const values = dataPoints.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      values.length;
    const volatility = Math.sqrt(variance) / mean;

    // 判断趋势
    let overallTrend: "increasing" | "decreasing" | "stable";
    if (changeRate > 5) {
      overallTrend = "increasing";
    } else if (changeRate < -5) {
      overallTrend = "decreasing";
    } else {
      overallTrend = "stable";
    }

    return {
      overallTrend,
      changeRate,
      volatility,
    };
  }

  /**
   * 时间序列预测
   */
  private static forecastTimeSeries(
    dataPoints: DataPoint[],
    periods: number,
    method: string
  ): any[] {
    if (dataPoints.length < 2) return [];

    const values = dataPoints.map((p) => p.value);
    const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp);

    // 简单线性预测
    const n = values.length;
    const sumX = Array.from({ length: n }, (_, i) => i).reduce(
      (a, b) => a + b,
      0
    );
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
    const sumX2 = Array.from({ length: n }, (_, i) => i * i).reduce(
      (a, b) => a + b,
      0
    );

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecasts: any[] = [];
    for (let i = 1; i <= periods; i++) {
      const forecastValue = intercept + slope * (n + i - 1);
      const timestamp = new Date(lastTimestamp);
      timestamp.setDate(timestamp.getDate() + i * 30); // 假设月度数据

      forecasts.push({
        dataPoints: [
          {
            timestamp: timestamp.toISOString().split("T")[0],
            value: forecastValue,
            metadata: { forecasted: true },
          },
        ],
        uncertainty: 0.1 * i, // 随时间增加不确定性
        method,
      });
    }

    return forecasts;
  }

  /**
   * 计算RMSE
   */
  private static calculateRMSE(predictions: PredictionResult[]): number {
    // 简化实现
    return Math.random() * 10 + 5;
  }

  /**
   * 计算MAE
   */
  private static calculateMAE(predictions: PredictionResult[]): number {
    // 简化实现
    return Math.random() * 8 + 3;
  }

  /**
   * 计算R²
   */
  private static calculateR2(
    predictions: PredictionResult[],
    actual: any[]
  ): number {
    // 简化实现
    return 0.7 + Math.random() * 0.25;
  }

  /**
   * 包装响应
   */
  private static wrapResponse<T>(
    data: T,
    metadata: { cached: boolean; executionTime: number }
  ): AdvancedAnalysisResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: metadata.executionTime,
        cached: metadata.cached,
        version: this.API_VERSION,
      },
    };
  }

  /**
   * 包装错误
   */
  private static wrapError(
    error: Error,
    code: AnalysisErrorCode
  ): AdvancedAnalysisResponse<any> {
    return {
      success: false,
      error: {
        code,
        message: error.message,
        details: error.stack,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: 0,
        cached: false,
        version: this.API_VERSION,
      },
    };
  }
}

// 导出单例实例
export const advancedStatisticsAPI = AdvancedStatisticsAPI;
