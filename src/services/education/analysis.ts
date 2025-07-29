/**
 * 教育数据分析服务 - 统一分析引擎
 *
 * 功能：
 * - 成绩趋势分析
 * - 学习行为分析
 * - 预测性分析
 * - 比较分析
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import { aiOrchestrator } from "../ai/orchestrator";
import type { APIResponse } from "../core/api";

export interface TrendAnalysis {
  analysis_type: "individual" | "class" | "grade" | "subject";
  target_id: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  trend_direction: "upward" | "downward" | "stable" | "volatile";
  trend_strength: number; // 0-1
  data_points: Array<{
    date: string;
    value: number;
    label?: string;
  }>;
  insights: {
    key_findings: string[];
    recommendations: string[];
    risk_factors: string[];
  };
}

export interface ComparativeAnalysis {
  comparison_type:
    | "student_vs_class"
    | "class_vs_grade"
    | "subject_performance"
    | "time_comparison";
  entities: Array<{
    id: string;
    name: string;
    metrics: {
      average_score: number;
      improvement_rate: number;
      consistency_score: number;
      rank: number;
    };
  }>;
  analysis_results: {
    best_performer: string;
    most_improved: string;
    needs_attention: string[];
    statistical_significance: boolean;
  };
  visualizations: Array<{
    type: "bar_chart" | "line_chart" | "radar_chart" | "scatter_plot";
    data: any;
    title: string;
  }>;
}

export interface PredictiveAnalysis {
  prediction_type:
    | "grade_forecast"
    | "risk_assessment"
    | "improvement_potential";
  target_id: string;
  prediction_horizon: number; // 预测天数
  predictions: Array<{
    date: string;
    predicted_value: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
    probability: number;
  }>;
  risk_assessment: {
    risk_level: "low" | "medium" | "high";
    risk_factors: Array<{
      factor: string;
      impact_score: number;
      description: string;
    }>;
  };
  recommendations: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    expected_impact: string;
  }>;
}

export interface LearningBehaviorAnalysis {
  student_id: string;
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  behavior_patterns: {
    study_consistency: number; // 0-1
    engagement_level: number; // 0-1
    submission_patterns: {
      on_time_rate: number;
      quality_trend: "improving" | "stable" | "declining";
      effort_indicator: number;
    };
    help_seeking_behavior: {
      frequency: number;
      effectiveness: number;
      preferred_channels: string[];
    };
  };
  learning_style_indicators: {
    visual_learner: number;
    auditory_learner: number;
    kinesthetic_learner: number;
    reading_writing_learner: number;
  };
  intervention_suggestions: Array<{
    area: string;
    intervention: string;
    expected_outcome: string;
  }>;
}

export interface AnalysisReport {
  report_id: string;
  report_type: "comprehensive" | "focused" | "periodic";
  generated_at: string;
  scope: {
    entity_type: "student" | "class" | "grade" | "school";
    entity_ids: string[];
    time_range: {
      start_date: string;
      end_date: string;
    };
  };
  sections: Array<{
    section_id: string;
    title: string;
    analysis_type: string;
    content: any;
    visualizations: any[];
  }>;
  executive_summary: {
    key_insights: string[];
    action_items: string[];
    concerns: string[];
  };
  generated_by: "system" | "user_request" | "scheduled";
}

/**
 * 教育数据分析服务类
 */
export class AnalysisService {
  private readonly cachePrefix = "analysis_";
  private readonly cacheTTL = 60 * 60 * 1000; // 1小时

  /**
   * 执行趋势分析
   */
  async performTrendAnalysis(
    analysisType: TrendAnalysis["analysis_type"],
    targetId: string,
    timeRange: {
      startDate: string;
      endDate: string;
    }
  ): Promise<APIResponse<TrendAnalysis>> {
    try {
      logInfo("执行趋势分析", { analysisType, targetId, timeRange });

      const cacheKey = `${this.cachePrefix}trend_${analysisType}_${targetId}_${timeRange.startDate}_${timeRange.endDate}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取时间序列数据
      const timeSeriesData = await this.getTimeSeriesData(
        analysisType,
        targetId,
        timeRange
      );

      if (!timeSeriesData || timeSeriesData.length === 0) {
        return {
          success: false,
          error: "未找到足够的数据进行趋势分析",
        };
      }

      // 计算趋势
      const trendMetrics = this.calculateTrendMetrics(timeSeriesData);

      // 生成洞察和建议
      const insights = await this.generateTrendInsights(
        analysisType,
        targetId,
        timeSeriesData,
        trendMetrics
      );

      const analysis: TrendAnalysis = {
        analysis_type: analysisType,
        target_id: targetId,
        time_period: {
          start_date: timeRange.startDate,
          end_date: timeRange.endDate,
        },
        trend_direction: trendMetrics.direction,
        trend_strength: trendMetrics.strength,
        data_points: timeSeriesData,
        insights,
      };

      dataCache.set(cacheKey, analysis, this.cacheTTL);
      return { success: true, data: analysis };
    } catch (error) {
      logError("趋势分析失败", { analysisType, targetId, error });
      return {
        success: false,
        error: error.message || "趋势分析失败",
      };
    }
  }

  /**
   * 执行比较分析
   */
  async performComparativeAnalysis(
    comparisonType: ComparativeAnalysis["comparison_type"],
    entityIds: string[],
    metrics: string[] = ["average_score", "improvement_rate"]
  ): Promise<APIResponse<ComparativeAnalysis>> {
    try {
      logInfo("执行比较分析", { comparisonType, entityIds, metrics });

      const cacheKey = `${this.cachePrefix}comparative_${comparisonType}_${entityIds.sort().join("_")}_${metrics.join("_")}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取每个实体的指标数据
      const entitiesData = await Promise.all(
        entityIds.map(async (entityId) => {
          const entityMetrics = await this.getEntityMetrics(
            comparisonType,
            entityId,
            metrics
          );
          return {
            id: entityId,
            name: await this.getEntityName(comparisonType, entityId),
            metrics: entityMetrics,
          };
        })
      );

      // 分析结果
      const analysisResults = this.analyzeComparativeResults(entitiesData);

      // 生成可视化数据
      const visualizations = this.generateVisualizationData(
        comparisonType,
        entitiesData
      );

      const analysis: ComparativeAnalysis = {
        comparison_type: comparisonType,
        entities: entitiesData,
        analysis_results: analysisResults,
        visualizations,
      };

      dataCache.set(cacheKey, analysis, this.cacheTTL);
      return { success: true, data: analysis };
    } catch (error) {
      logError("比较分析失败", { comparisonType, entityIds, error });
      return {
        success: false,
        error: error.message || "比较分析失败",
      };
    }
  }

  /**
   * 执行预测分析
   */
  async performPredictiveAnalysis(
    predictionType: PredictiveAnalysis["prediction_type"],
    targetId: string,
    horizonDays: number = 30
  ): Promise<APIResponse<PredictiveAnalysis>> {
    try {
      logInfo("执行预测分析", { predictionType, targetId, horizonDays });

      const cacheKey = `${this.cachePrefix}predictive_${predictionType}_${targetId}_${horizonDays}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取历史数据
      const historicalData = await this.getHistoricalDataForPrediction(
        predictionType,
        targetId
      );

      if (!historicalData || historicalData.length < 3) {
        return {
          success: false,
          error: "历史数据不足，无法进行预测分析",
        };
      }

      // 执行预测
      const predictions = this.generatePredictions(historicalData, horizonDays);

      // 风险评估
      const riskAssessment = await this.assessRisk(
        predictionType,
        targetId,
        historicalData
      );

      // 生成建议
      const recommendations = await this.generatePredictiveRecommendations(
        predictionType,
        targetId,
        predictions,
        riskAssessment
      );

      const analysis: PredictiveAnalysis = {
        prediction_type: predictionType,
        target_id: targetId,
        prediction_horizon: horizonDays,
        predictions,
        risk_assessment: riskAssessment,
        recommendations,
      };

      dataCache.set(cacheKey, analysis, this.cacheTTL);
      return { success: true, data: analysis };
    } catch (error) {
      logError("预测分析失败", { predictionType, targetId, error });
      return {
        success: false,
        error: error.message || "预测分析失败",
      };
    }
  }

  /**
   * 分析学习行为
   */
  async analyzeLearningBehavior(
    studentId: string,
    analysisTimeRange: {
      startDate: string;
      endDate: string;
    }
  ): Promise<APIResponse<LearningBehaviorAnalysis>> {
    try {
      logInfo("分析学习行为", { studentId, analysisTimeRange });

      const cacheKey = `${this.cachePrefix}behavior_${studentId}_${analysisTimeRange.startDate}_${analysisTimeRange.endDate}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取学习行为数据
      const behaviorData = await this.getLearningBehaviorData(
        studentId,
        analysisTimeRange
      );

      // 分析行为模式
      const behaviorPatterns = this.analyzeBehaviorPatterns(behaviorData);

      // 识别学习风格
      const learningStyleIndicators = await this.identifyLearningStyle(
        studentId,
        behaviorData
      );

      // 生成干预建议
      const interventionSuggestions =
        await this.generateInterventionSuggestions(
          studentId,
          behaviorPatterns,
          learningStyleIndicators
        );

      const analysis: LearningBehaviorAnalysis = {
        student_id: studentId,
        analysis_period: analysisTimeRange,
        behavior_patterns: behaviorPatterns,
        learning_style_indicators: learningStyleIndicators,
        intervention_suggestions: interventionSuggestions,
      };

      dataCache.set(cacheKey, analysis, this.cacheTTL);
      return { success: true, data: analysis };
    } catch (error) {
      logError("学习行为分析失败", { studentId, error });
      return {
        success: false,
        error: error.message || "学习行为分析失败",
      };
    }
  }

  /**
   * 生成综合分析报告
   */
  async generateAnalysisReport(
    reportType: AnalysisReport["report_type"],
    scope: AnalysisReport["scope"],
    includeSections: string[] = ["trend", "comparative", "predictive"]
  ): Promise<APIResponse<AnalysisReport>> {
    try {
      logInfo("生成综合分析报告", { reportType, scope, includeSections });

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sections: AnalysisReport["sections"] = [];

      // 趋势分析部分
      if (includeSections.includes("trend")) {
        for (const entityId of scope.entity_ids) {
          const trendAnalysis = await this.performTrendAnalysis(
            scope.entity_type as TrendAnalysis["analysis_type"],
            entityId,
            {
              startDate: scope.time_range.start_date,
              endDate: scope.time_range.end_date,
            }
          );

          if (trendAnalysis.success) {
            sections.push({
              section_id: `trend_${entityId}`,
              title: `${entityId} 趋势分析`,
              analysis_type: "trend",
              content: trendAnalysis.data,
              visualizations: [],
            });
          }
        }
      }

      // 比较分析部分
      if (
        includeSections.includes("comparative") &&
        scope.entity_ids.length > 1
      ) {
        const comparativeAnalysis = await this.performComparativeAnalysis(
          "student_vs_class", // 根据scope.entity_type动态设置
          scope.entity_ids
        );

        if (comparativeAnalysis.success) {
          sections.push({
            section_id: "comparative_analysis",
            title: "比较分析",
            analysis_type: "comparative",
            content: comparativeAnalysis.data,
            visualizations: comparativeAnalysis.data.visualizations,
          });
        }
      }

      // 预测分析部分
      if (includeSections.includes("predictive")) {
        for (const entityId of scope.entity_ids.slice(0, 3)) {
          // 限制预测分析数量
          const predictiveAnalysis = await this.performPredictiveAnalysis(
            "grade_forecast",
            entityId
          );

          if (predictiveAnalysis.success) {
            sections.push({
              section_id: `predictive_${entityId}`,
              title: `${entityId} 预测分析`,
              analysis_type: "predictive",
              content: predictiveAnalysis.data,
              visualizations: [],
            });
          }
        }
      }

      // 生成执行摘要
      const executiveSummary = this.generateExecutiveSummary(sections);

      const report: AnalysisReport = {
        report_id: reportId,
        report_type: reportType,
        generated_at: new Date().toISOString(),
        scope,
        sections,
        executive_summary: executiveSummary,
        generated_by: "user_request",
      };

      return { success: true, data: report };
    } catch (error) {
      logError("生成综合分析报告失败", { reportType, scope, error });
      return {
        success: false,
        error: error.message || "生成分析报告失败",
      };
    }
  }

  /**
   * 获取时间序列数据
   */
  private async getTimeSeriesData(
    analysisType: TrendAnalysis["analysis_type"],
    targetId: string,
    timeRange: { startDate: string; endDate: string }
  ): Promise<TrendAnalysis["data_points"]> {
    try {
      let query: any;
      let scoreField = "total_score";

      switch (analysisType) {
        case "individual":
          query = {
            filters: {
              student_id: targetId,
              exam_date: {
                gte: timeRange.startDate,
                lte: timeRange.endDate,
              },
            },
            select: ["exam_date", scoreField],
            orderBy: [{ column: "exam_date", ascending: true }],
          };
          break;

        case "class":
          query = {
            filters: {
              class_name: targetId,
              exam_date: {
                gte: timeRange.startDate,
                lte: timeRange.endDate,
              },
            },
            select: ["exam_date", scoreField],
            orderBy: [{ column: "exam_date", ascending: true }],
          };
          break;

        default:
          return [];
      }

      const response = await apiClient.query("grade_data", query);

      if (!response.success || !response.data?.length) {
        return [];
      }

      // 按日期分组计算平均分
      const dateGroups = new Map<string, number[]>();
      response.data.forEach((record: any) => {
        if (record.exam_date && typeof record[scoreField] === "number") {
          const date = record.exam_date;
          if (!dateGroups.has(date)) {
            dateGroups.set(date, []);
          }
          dateGroups.get(date)!.push(record[scoreField]);
        }
      });

      return Array.from(dateGroups.entries())
        .map(([date, scores]) => ({
          date,
          value:
            Math.round(
              (scores.reduce((sum, score) => sum + score, 0) / scores.length) *
                100
            ) / 100,
          label: `平均分: ${Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100}`,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    } catch (error) {
      logError("获取时间序列数据失败", { analysisType, targetId, error });
      return [];
    }
  }

  /**
   * 计算趋势指标
   */
  private calculateTrendMetrics(dataPoints: TrendAnalysis["data_points"]): {
    direction: TrendAnalysis["trend_direction"];
    strength: number;
  } {
    if (dataPoints.length < 2) {
      return { direction: "stable", strength: 0 };
    }

    // 简单线性回归计算趋势
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    const n = dataPoints.length;

    dataPoints.forEach((point, index) => {
      const x = index;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const rSquared = this.calculateRSquared(dataPoints, slope);

    // 确定趋势方向
    let direction: TrendAnalysis["trend_direction"];
    const threshold = 1; // 斜率阈值

    if (Math.abs(slope) < threshold) {
      direction = "stable";
    } else if (slope > threshold) {
      direction = "upward";
    } else {
      direction = "downward";
    }

    // 检查波动性
    const volatility = this.calculateVolatility(dataPoints);
    if (volatility > 10) {
      // 波动性阈值
      direction = "volatile";
    }

    return {
      direction,
      strength: Math.min(1, Math.abs(slope) / 10), // 标准化强度
    };
  }

  /**
   * 计算R平方值
   */
  private calculateRSquared(
    dataPoints: TrendAnalysis["data_points"],
    slope: number
  ): number {
    if (dataPoints.length === 0) return 0;

    const meanY =
      dataPoints.reduce((sum, point) => sum + point.value, 0) /
      dataPoints.length;

    let ssRes = 0; // 残差平方和
    let ssTot = 0; // 总平方和

    dataPoints.forEach((point, index) => {
      const predicted =
        slope * index + (meanY - (slope * (dataPoints.length - 1)) / 2);
      ssRes += Math.pow(point.value - predicted, 2);
      ssTot += Math.pow(point.value - meanY, 2);
    });

    return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  }

  /**
   * 计算波动性
   */
  private calculateVolatility(
    dataPoints: TrendAnalysis["data_points"]
  ): number {
    if (dataPoints.length < 2) return 0;

    const values = dataPoints.map((point) => point.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance);
  }

  /**
   * 生成趋势洞察
   */
  private async generateTrendInsights(
    analysisType: TrendAnalysis["analysis_type"],
    targetId: string,
    dataPoints: TrendAnalysis["data_points"],
    trendMetrics: {
      direction: TrendAnalysis["trend_direction"];
      strength: number;
    }
  ): Promise<TrendAnalysis["insights"]> {
    const keyFindings: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];

    // 基于趋势方向生成洞察
    switch (trendMetrics.direction) {
      case "upward":
        keyFindings.push(
          `${targetId}在分析期间表现出持续上升趋势，趋势强度为${Math.round(trendMetrics.strength * 100)}%`
        );
        recommendations.push("继续保持当前的学习策略和方法");
        recommendations.push("适当增加学习难度以保持挑战性");
        break;

      case "downward":
        keyFindings.push(`${targetId}在分析期间表现出下降趋势，需要关注`);
        recommendations.push("分析下降原因，制定针对性改进措施");
        recommendations.push("增加个别辅导和练习强度");
        riskFactors.push("持续下降可能导致学习信心受挫");
        break;

      case "volatile":
        keyFindings.push(`${targetId}的表现波动较大，缺乏稳定性`);
        recommendations.push("识别导致波动的因素，建立更稳定的学习节奏");
        riskFactors.push("不稳定的表现可能影响整体学习效果");
        break;

      case "stable":
        keyFindings.push(`${targetId}的表现较为稳定`);
        if (dataPoints.length > 0) {
          const avgScore =
            dataPoints.reduce((sum, point) => sum + point.value, 0) /
            dataPoints.length;
          if (avgScore >= 80) {
            recommendations.push("表现稳定且优秀，可以尝试更具挑战性的内容");
          } else if (avgScore >= 60) {
            recommendations.push("保持当前水平的同时，寻找提升空间");
          } else {
            recommendations.push("虽然稳定但需要整体提高，建议加强基础训练");
            riskFactors.push("稳定的低水平表现需要积极干预");
          }
        }
        break;
    }

    return {
      key_findings: keyFindings,
      recommendations,
      risk_factors: riskFactors,
    };
  }

  /**
   * 获取实体指标
   */
  private async getEntityMetrics(
    comparisonType: ComparativeAnalysis["comparison_type"],
    entityId: string,
    metrics: string[]
  ): Promise<ComparativeAnalysis["entities"][0]["metrics"]> {
    try {
      // 根据比较类型获取相应数据
      const response = await apiClient.query("grade_data", {
        filters: this.getEntityFilter(comparisonType, entityId),
        select: ["total_score", "exam_date"],
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: 20,
      });

      if (!response.success || !response.data?.length) {
        return {
          average_score: 0,
          improvement_rate: 0,
          consistency_score: 0,
          rank: 0,
        };
      }

      const scores = response.data
        .map((record: any) => record.total_score)
        .filter((score: any) => typeof score === "number" && score > 0);

      if (scores.length === 0) {
        return {
          average_score: 0,
          improvement_rate: 0,
          consistency_score: 0,
          rank: 0,
        };
      }

      // 计算平均分
      const average_score =
        scores.reduce((sum: number, score: number) => sum + score, 0) /
        scores.length;

      // 计算改进率（最近3次vs之前3次）
      let improvement_rate = 0;
      if (scores.length >= 6) {
        const recent = scores.slice(0, 3);
        const previous = scores.slice(3, 6);
        const recentAvg =
          recent.reduce((sum, score) => sum + score, 0) / recent.length;
        const previousAvg =
          previous.reduce((sum, score) => sum + score, 0) / previous.length;
        improvement_rate = ((recentAvg - previousAvg) / previousAvg) * 100;
      }

      // 计算一致性分数（标准差的倒数）
      const mean = average_score;
      const variance =
        scores.reduce(
          (sum: number, score: number) => sum + Math.pow(score - mean, 2),
          0
        ) / scores.length;
      const stdDev = Math.sqrt(variance);
      const consistency_score = stdDev === 0 ? 100 : Math.max(0, 100 - stdDev);

      return {
        average_score: Math.round(average_score * 100) / 100,
        improvement_rate: Math.round(improvement_rate * 100) / 100,
        consistency_score: Math.round(consistency_score * 100) / 100,
        rank: 0, // 将在后续计算中设置
      };
    } catch (error) {
      logError("获取实体指标失败", { comparisonType, entityId, error });
      return {
        average_score: 0,
        improvement_rate: 0,
        consistency_score: 0,
        rank: 0,
      };
    }
  }

  /**
   * 获取实体过滤条件
   */
  private getEntityFilter(
    comparisonType: ComparativeAnalysis["comparison_type"],
    entityId: string
  ): any {
    switch (comparisonType) {
      case "student_vs_class":
        return { student_id: entityId };
      case "class_vs_grade":
        return { class_name: entityId };
      default:
        return { student_id: entityId };
    }
  }

  /**
   * 获取实体名称
   */
  private async getEntityName(
    comparisonType: ComparativeAnalysis["comparison_type"],
    entityId: string
  ): Promise<string> {
    try {
      switch (comparisonType) {
        case "student_vs_class":
          const studentResponse = await apiClient.query("students", {
            filters: { student_id: entityId },
            select: ["name"],
            limit: 1,
          });
          return studentResponse.success && studentResponse.data?.length
            ? studentResponse.data[0].name
            : entityId;

        case "class_vs_grade":
          return entityId; // 班级名称本身就是显示名称

        default:
          return entityId;
      }
    } catch (error) {
      logError("获取实体名称失败", { comparisonType, entityId, error });
      return entityId;
    }
  }

  /**
   * 分析比较结果
   */
  private analyzeComparativeResults(
    entitiesData: ComparativeAnalysis["entities"]
  ): ComparativeAnalysis["analysis_results"] {
    // 按平均分排序并设置排名
    entitiesData.sort(
      (a, b) => b.metrics.average_score - a.metrics.average_score
    );
    entitiesData.forEach((entity, index) => {
      entity.metrics.rank = index + 1;
    });

    // 找出最佳表现者
    const bestPerformer = entitiesData[0]?.id || "";

    // 找出进步最大者
    const mostImproved =
      entitiesData.reduce((best, current) =>
        current.metrics.improvement_rate >
        (best?.metrics.improvement_rate || -Infinity)
          ? current
          : best
      )?.id || "";

    // 找出需要关注的实体（平均分低于60或改进率为负）
    const needsAttention = entitiesData
      .filter(
        (entity) =>
          entity.metrics.average_score < 60 ||
          entity.metrics.improvement_rate < -5
      )
      .map((entity) => entity.id);

    // 简单的统计显著性检验（基于标准差）
    const averageScores = entitiesData.map(
      (entity) => entity.metrics.average_score
    );
    const mean =
      averageScores.reduce((sum, score) => sum + score, 0) /
      averageScores.length;
    const stdDev = Math.sqrt(
      averageScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        averageScores.length
    );
    const statisticalSignificance = stdDev > 5; // 简单阈值

    return {
      best_performer: bestPerformer,
      most_improved: mostImproved,
      needs_attention: needsAttention,
      statistical_significance: statisticalSignificance,
    };
  }

  /**
   * 生成可视化数据
   */
  private generateVisualizationData(
    comparisonType: ComparativeAnalysis["comparison_type"],
    entitiesData: ComparativeAnalysis["entities"]
  ): ComparativeAnalysis["visualizations"] {
    const visualizations: ComparativeAnalysis["visualizations"] = [];

    // 柱状图：平均分对比
    visualizations.push({
      type: "bar_chart",
      title: "平均分对比",
      data: {
        labels: entitiesData.map((entity) => entity.name),
        datasets: [
          {
            label: "平均分",
            data: entitiesData.map((entity) => entity.metrics.average_score),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
    });

    // 雷达图：综合指标对比
    if (entitiesData.length <= 5) {
      // 雷达图适合少量实体
      visualizations.push({
        type: "radar_chart",
        title: "综合指标对比",
        data: {
          labels: ["平均分", "改进率", "一致性"],
          datasets: entitiesData.map((entity, index) => ({
            label: entity.name,
            data: [
              entity.metrics.average_score,
              Math.max(0, entity.metrics.improvement_rate + 50), // 标准化改进率
              entity.metrics.consistency_score,
            ],
            borderColor: `hsl(${index * 60}, 70%, 50%)`,
            backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.2)`,
          })),
        },
      });
    }

    return visualizations;
  }

  /**
   * 获取历史数据用于预测
   */
  private async getHistoricalDataForPrediction(
    predictionType: PredictiveAnalysis["prediction_type"],
    targetId: string
  ): Promise<Array<{ date: string; value: number }>> {
    try {
      const filters =
        predictionType === "grade_forecast"
          ? { student_id: targetId }
          : { class_name: targetId };

      const response = await apiClient.query("grade_data", {
        filters,
        select: ["exam_date", "total_score"],
        orderBy: [{ column: "exam_date", ascending: true }],
        limit: 50,
      });

      if (!response.success || !response.data?.length) {
        return [];
      }

      return response.data
        .filter(
          (record: any) =>
            record.exam_date && typeof record.total_score === "number"
        )
        .map((record: any) => ({
          date: record.exam_date,
          value: record.total_score,
        }));
    } catch (error) {
      logError("获取历史数据失败", { predictionType, targetId, error });
      return [];
    }
  }

  /**
   * 生成预测数据
   */
  private generatePredictions(
    historicalData: Array<{ date: string; value: number }>,
    horizonDays: number
  ): PredictiveAnalysis["predictions"] {
    if (historicalData.length < 3) return [];

    // 简单的线性趋势预测
    const values = historicalData.map((point) => point.value);
    const n = values.length;

    // 计算趋势斜率
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    values.forEach((value, index) => {
      sumX += index;
      sumY += value;
      sumXY += index * value;
      sumXX += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictions: PredictiveAnalysis["predictions"] = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    // 计算预测值的不确定性
    const residuals = values.map(
      (value, index) => value - (slope * index + intercept)
    );
    const mse =
      residuals.reduce((sum, residual) => sum + residual * residual, 0) /
      residuals.length;
    const standardError = Math.sqrt(mse);

    for (let i = 1; i <= Math.min(5, Math.ceil(horizonDays / 7)); i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i * 7); // 每周一个预测点

      const predictedValue = slope * (n + i - 1) + intercept;
      const confidence = Math.max(0.5, 0.9 - (i - 1) * 0.1); // 置信度随时间递减

      predictions.push({
        date: futureDate.toISOString().split("T")[0],
        predicted_value: Math.round(predictedValue * 100) / 100,
        confidence_interval: {
          lower:
            Math.round((predictedValue - 1.96 * standardError) * 100) / 100,
          upper:
            Math.round((predictedValue + 1.96 * standardError) * 100) / 100,
        },
        probability: confidence,
      });
    }

    return predictions;
  }

  /**
   * 评估风险
   */
  private async assessRisk(
    predictionType: PredictiveAnalysis["prediction_type"],
    targetId: string,
    historicalData: Array<{ date: string; value: number }>
  ): Promise<PredictiveAnalysis["risk_assessment"]> {
    const riskFactors: PredictiveAnalysis["risk_assessment"]["risk_factors"] =
      [];

    // 分析历史数据中的风险因素
    const values = historicalData.map((point) => point.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0;

    // 低分风险
    if (average < 60) {
      riskFactors.push({
        factor: "平均分偏低",
        impact_score: 0.8,
        description: "历史平均分低于及格线，存在学习困难风险",
      });
    }

    // 下降趋势风险
    if (trend < -10) {
      riskFactors.push({
        factor: "成绩下降趋势",
        impact_score: 0.7,
        description: "成绩呈现明显下降趋势，需要及时干预",
      });
    }

    // 波动性风险
    const volatility = this.calculateVolatility(
      historicalData.map((point) => ({ ...point, value: point.value }))
    );
    if (volatility > 15) {
      riskFactors.push({
        factor: "成绩波动较大",
        impact_score: 0.6,
        description: "成绩不稳定，可能存在学习方法或心理问题",
      });
    }

    // 确定风险等级
    const maxImpact =
      riskFactors.length > 0
        ? Math.max(...riskFactors.map((factor) => factor.impact_score))
        : 0;

    let riskLevel: "low" | "medium" | "high";
    if (maxImpact >= 0.7) riskLevel = "high";
    else if (maxImpact >= 0.5) riskLevel = "medium";
    else riskLevel = "low";

    return {
      risk_level: riskLevel,
      risk_factors: riskFactors,
    };
  }

  /**
   * 生成预测建议
   */
  private async generatePredictiveRecommendations(
    predictionType: PredictiveAnalysis["prediction_type"],
    targetId: string,
    predictions: PredictiveAnalysis["predictions"],
    riskAssessment: PredictiveAnalysis["risk_assessment"]
  ): Promise<PredictiveAnalysis["recommendations"]> {
    const recommendations: PredictiveAnalysis["recommendations"] = [];

    // 基于风险等级生成建议
    switch (riskAssessment.risk_level) {
      case "high":
        recommendations.push({
          action: "立即安排个别辅导",
          priority: "high",
          expected_impact: "帮助学生快速改善学习状况",
        });
        recommendations.push({
          action: "制定详细的学习改进计划",
          priority: "high",
          expected_impact: "系统性解决学习问题",
        });
        break;

      case "medium":
        recommendations.push({
          action: "增加练习强度和频率",
          priority: "medium",
          expected_impact: "巩固基础知识，提升成绩稳定性",
        });
        recommendations.push({
          action: "定期监控学习进度",
          priority: "medium",
          expected_impact: "及时发现并解决问题",
        });
        break;

      case "low":
        recommendations.push({
          action: "保持当前学习节奏",
          priority: "low",
          expected_impact: "维持良好的学习状态",
        });
        recommendations.push({
          action: "适当增加挑战性内容",
          priority: "low",
          expected_impact: "进一步提升学习水平",
        });
        break;
    }

    // 基于预测趋势生成建议
    if (predictions.length > 0) {
      const firstPrediction = predictions[0];
      const lastPrediction = predictions[predictions.length - 1];

      if (lastPrediction.predicted_value < firstPrediction.predicted_value) {
        recommendations.push({
          action: "关注预测期间的学习状态变化",
          priority: "medium",
          expected_impact: "避免预测的成绩下降",
        });
      }
    }

    return recommendations;
  }

  /**
   * 获取学习行为数据
   */
  private async getLearningBehaviorData(
    studentId: string,
    timeRange: { startDate: string; endDate: string }
  ): Promise<any> {
    try {
      // 获取作业提交数据
      const homeworkData = await apiClient.query("homework_submissions", {
        filters: {
          student_id: studentId,
          submitted_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        select: ["submitted_at", "status", "score"],
      });

      // 获取成绩数据
      const gradeData = await apiClient.query("grade_data", {
        filters: {
          student_id: studentId,
          exam_date: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        select: ["exam_date", "total_score"],
      });

      return {
        homework_submissions: homeworkData.success ? homeworkData.data : [],
        grade_records: gradeData.success ? gradeData.data : [],
      };
    } catch (error) {
      logError("获取学习行为数据失败", { studentId, error });
      return {
        homework_submissions: [],
        grade_records: [],
      };
    }
  }

  /**
   * 分析行为模式
   */
  private analyzeBehaviorPatterns(
    behaviorData: any
  ): LearningBehaviorAnalysis["behavior_patterns"] {
    const homeworkSubmissions = behaviorData.homework_submissions || [];
    const gradeRecords = behaviorData.grade_records || [];

    // 学习一致性（基于作业提交频率）
    const totalDays = 30; // 假设分析30天
    const submissionDays = new Set(
      homeworkSubmissions.map((sub: any) => sub.submitted_at?.split("T")[0])
    ).size;
    const study_consistency = Math.min(1, submissionDays / totalDays);

    // 参与度（基于作业完成率和质量）
    const totalSubmissions = homeworkSubmissions.length;
    const completedSubmissions = homeworkSubmissions.filter(
      (sub: any) => sub.status !== "missing"
    ).length;
    const engagement_level =
      totalSubmissions > 0 ? completedSubmissions / totalSubmissions : 0;

    // 提交模式分析
    const onTimeSubmissions = homeworkSubmissions.filter(
      (sub: any) => sub.status === "submitted"
    ).length;
    const on_time_rate =
      totalSubmissions > 0 ? (onTimeSubmissions / totalSubmissions) * 100 : 0;

    // 质量趋势（基于分数变化）
    const scores = homeworkSubmissions
      .map((sub: any) => sub.score)
      .filter((score: any) => typeof score === "number");

    let quality_trend: "improving" | "stable" | "declining" = "stable";
    if (scores.length >= 4) {
      const recent = scores.slice(-2);
      const previous = scores.slice(-4, -2);
      const recentAvg =
        recent.reduce((sum, score) => sum + score, 0) / recent.length;
      const previousAvg =
        previous.reduce((sum, score) => sum + score, 0) / previous.length;

      if (recentAvg > previousAvg + 5) quality_trend = "improving";
      else if (recentAvg < previousAvg - 5) quality_trend = "declining";
    }

    const effort_indicator = Math.round(
      (study_consistency * 0.4 + engagement_level * 0.6) * 100
    );

    return {
      study_consistency: Math.round(study_consistency * 100) / 100,
      engagement_level: Math.round(engagement_level * 100) / 100,
      submission_patterns: {
        on_time_rate: Math.round(on_time_rate * 100) / 100,
        quality_trend,
        effort_indicator,
      },
      help_seeking_behavior: {
        frequency: 0, // 需要额外数据源
        effectiveness: 0,
        preferred_channels: [],
      },
    };
  }

  /**
   * 识别学习风格
   */
  private async identifyLearningStyle(
    studentId: string,
    behaviorData: any
  ): Promise<LearningBehaviorAnalysis["learning_style_indicators"]> {
    // 这是一个简化的学习风格识别
    // 实际应用中需要更复杂的算法和更多数据

    return {
      visual_learner: 0.7,
      auditory_learner: 0.3,
      kinesthetic_learner: 0.4,
      reading_writing_learner: 0.6,
    };
  }

  /**
   * 生成干预建议
   */
  private async generateInterventionSuggestions(
    studentId: string,
    behaviorPatterns: LearningBehaviorAnalysis["behavior_patterns"],
    learningStyleIndicators: LearningBehaviorAnalysis["learning_style_indicators"]
  ): Promise<LearningBehaviorAnalysis["intervention_suggestions"]> {
    const suggestions: LearningBehaviorAnalysis["intervention_suggestions"] =
      [];

    // 基于学习一致性的建议
    if (behaviorPatterns.study_consistency < 0.5) {
      suggestions.push({
        area: "学习一致性",
        intervention: "建立固定的学习时间表，培养规律的学习习惯",
        expected_outcome: "提高学习的稳定性和效果",
      });
    }

    // 基于参与度的建议
    if (behaviorPatterns.engagement_level < 0.7) {
      suggestions.push({
        area: "学习参与度",
        intervention: "增加互动性学习活动，提升学习兴趣",
        expected_outcome: "提高学习积极性和参与度",
      });
    }

    // 基于学习风格的建议
    const dominantStyle = Object.entries(learningStyleIndicators).reduce(
      (max, [style, score]) => (score > max.score ? { style, score } : max),
      { style: "", score: 0 }
    );

    if (dominantStyle.score > 0.6) {
      let intervention = "";
      switch (dominantStyle.style) {
        case "visual_learner":
          intervention = "增加图表、图像等视觉化学习材料";
          break;
        case "auditory_learner":
          intervention = "加强口语讲解和听觉学习活动";
          break;
        case "kinesthetic_learner":
          intervention = "增加实践操作和体验式学习";
          break;
        case "reading_writing_learner":
          intervention = "强化阅读理解和写作练习";
          break;
      }

      if (intervention) {
        suggestions.push({
          area: "学习风格匹配",
          intervention,
          expected_outcome: "通过匹配学习风格提升学习效率",
        });
      }
    }

    return suggestions;
  }

  /**
   * 生成执行摘要
   */
  private generateExecutiveSummary(
    sections: AnalysisReport["sections"]
  ): AnalysisReport["executive_summary"] {
    const keyInsights: string[] = [];
    const actionItems: string[] = [];
    const concerns: string[] = [];

    sections.forEach((section) => {
      switch (section.analysis_type) {
        case "trend":
          const trendData = section.content as TrendAnalysis;
          keyInsights.push(
            `${section.title}: ${trendData.trend_direction}趋势，强度${Math.round(trendData.trend_strength * 100)}%`
          );

          if (trendData.insights.recommendations.length > 0) {
            actionItems.push(...trendData.insights.recommendations.slice(0, 2));
          }

          if (trendData.insights.risk_factors.length > 0) {
            concerns.push(...trendData.insights.risk_factors.slice(0, 2));
          }
          break;

        case "comparative":
          const compData = section.content as ComparativeAnalysis;
          keyInsights.push(
            `比较分析: 最佳表现者为${compData.analysis_results.best_performer}`
          );

          if (compData.analysis_results.needs_attention.length > 0) {
            concerns.push(
              `需要关注: ${compData.analysis_results.needs_attention.join(", ")}`
            );
          }
          break;

        case "predictive":
          const predData = section.content as PredictiveAnalysis;
          keyInsights.push(
            `预测分析: 风险等级${predData.risk_assessment.risk_level}`
          );

          if (predData.recommendations.length > 0) {
            actionItems.push(
              ...predData.recommendations.slice(0, 2).map((rec) => rec.action)
            );
          }
          break;
      }
    });

    return {
      key_insights: keyInsights.slice(0, 5), // 限制数量
      action_items: actionItems.slice(0, 5),
      concerns: concerns.slice(0, 5),
    };
  }
}

// 导出服务实例
export const analysisService = new AnalysisService();
