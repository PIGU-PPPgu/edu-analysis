/**
 * 高级分析引擎
 * 提供智能化的数据洞察和分析功能
 */

import {
  AIInsight,
  InsightType,
  InsightPriority,
  InsightSentiment,
  TrendPrediction,
  AnomalyDetection,
  StatisticExplanation,
  AnalysisRequest,
  AnalysisResponse,
  InsightAction,
} from "@/types/aiInsights";
import {
  calculateBasicStatistics,
  calculateRates,
  calculateScoreDistribution,
  calculateTrend,
  type BasicStatistics,
} from "@/components/analysis/services/calculationUtils";
import { v4 as uuidv4 } from "uuid";

export class AdvancedAnalysisEngine {
  private static instance: AdvancedAnalysisEngine;

  private constructor() {}

  public static getInstance(): AdvancedAnalysisEngine {
    if (!AdvancedAnalysisEngine.instance) {
      AdvancedAnalysisEngine.instance = new AdvancedAnalysisEngine();
    }
    return AdvancedAnalysisEngine.instance;
  }

  /**
   * 生成数据洞察
   */
  public async generateInsights(
    request: AnalysisRequest
  ): Promise<AnalysisResponse> {
    const startTime = Date.now();
    const insights: AIInsight[] = [];

    try {
      // 1. 基础统计分析
      const basicInsights = this.analyzeBasicStatistics(
        request.data,
        request.context
      );
      insights.push(...basicInsights);

      // 2. 趋势分析
      const trendInsights = this.analyzeTrends(request.data, request.context);
      insights.push(...trendInsights);

      // 3. 异常检测
      const anomalyInsights = this.detectAnomalies(
        request.data,
        request.context
      );
      insights.push(...anomalyInsights);

      // 4. 成就识别
      const achievementInsights = this.identifyAchievements(
        request.data,
        request.context
      );
      insights.push(...achievementInsights);

      // 5. 对比分析
      const comparisonInsights = this.performComparison(
        request.data,
        request.context
      );
      insights.push(...comparisonInsights);

      // 6. 生成建议
      const suggestions = this.generateSuggestions(
        insights,
        request.data,
        request.context
      );
      insights.push(...suggestions);

      // 排序和筛选
      const sortedInsights = this.prioritizeInsights(insights, request.options);
      const finalInsights = request.options?.maxInsights
        ? sortedInsights.slice(0, request.options.maxInsights)
        : sortedInsights.slice(0, 5);

      return {
        insights: finalInsights,
        summary: this.generateSummary(finalInsights),
        metadata: {
          analysisTime: Date.now() - startTime,
          dataPoints: request.data.length,
          confidence: this.calculateOverallConfidence(finalInsights),
        },
      };
    } catch (error) {
      console.error("分析引擎错误:", error);
      return {
        insights: [],
        summary: {
          totalInsights: 0,
          highPriorityCount: 0,
          positiveCount: 0,
          negativeCount: 0,
        },
        metadata: {
          analysisTime: Date.now() - startTime,
          dataPoints: request.data.length,
          confidence: 0,
        },
      };
    }
  }

  /**
   * 解释统计指标
   */
  public explainStatistic(
    metric: string,
    value: number,
    context?: any
  ): StatisticExplanation {
    const explanations: Record<
      string,
      (value: number) => StatisticExplanation
    > = {
      average: (val) => ({
        metric: "平均分",
        value: val.toFixed(1),
        meaning: this.getAverageMeaning(val),
        context: `班级平均分${val.toFixed(1)}分表示学生的整体学习水平`,
        significance: this.getAverageSignificance(val),
        comparison: {
          benchmark: 80,
          benchmarkLabel: "优秀线",
          difference: val - 80,
        },
      }),
      passRate: (val) => ({
        metric: "及格率",
        value: `${(val * 100).toFixed(1)}%`,
        meaning: this.getPassRateMeaning(val),
        context: `有${(val * 100).toFixed(1)}%的学生达到了及格标准`,
        significance: this.getPassRateSignificance(val),
        comparison: {
          benchmark: 0.9,
          benchmarkLabel: "目标及格率",
          difference: val - 0.9,
        },
      }),
      standardDeviation: (val) => ({
        metric: "标准差",
        value: val.toFixed(2),
        meaning:
          val < 10
            ? "成绩分布集中"
            : val < 15
              ? "成绩分布适中"
              : "成绩分布分散",
        context: `标准差${val.toFixed(2)}反映了学生成绩的离散程度`,
        significance: val < 10 ? "very_good" : val < 15 ? "good" : "concerning",
      }),
    };

    const explainer = explanations[metric];
    if (explainer) {
      return explainer(value);
    }

    // 默认解释
    return {
      metric,
      value: value.toString(),
      meaning: "该指标反映了数据的特定特征",
      context: "请参考具体的分析场景理解该指标",
      significance: "average",
    };
  }

  /**
   * 预测趋势
   */
  public predictTrends(
    historicalData: any[],
    currentData: any[]
  ): TrendPrediction[] {
    const predictions: TrendPrediction[] = [];

    // 按科目分组分析
    const subjects = ["总分", "语文", "数学", "英语", "物理", "化学"];

    for (const subject of subjects) {
      const trend = this.analyzeSubjectTrend(
        historicalData,
        currentData,
        subject
      );
      if (trend) {
        predictions.push(trend);
      }
    }

    return predictions;
  }

  /**
   * 检测异常模式
   */
  public detectAnomalies(data: any[], context?: any): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 1. 检测成绩突变
    const scoreAnomalies = this.detectScoreAnomalies(data);
    anomalies.push(...scoreAnomalies);

    // 2. 检测分布异常
    const distributionAnomalies = this.detectDistributionAnomalies(data);
    anomalies.push(...distributionAnomalies);

    // 3. 检测一致性异常
    const consistencyAnomalies = this.detectConsistencyAnomalies(data);
    anomalies.push(...consistencyAnomalies);

    return anomalies;
  }

  /**
   * 推荐行动建议
   */
  public recommendActions(
    insights: AIInsight[],
    context?: any
  ): InsightAction[] {
    const actions: InsightAction[] = [];

    for (const insight of insights) {
      switch (insight.type) {
        case InsightType.WARNING:
          actions.push(...this.generateWarningActions(insight));
          break;
        case InsightType.ANOMALY:
          actions.push(...this.generateAnomalyActions(insight));
          break;
        case InsightType.TREND:
          actions.push(...this.generateTrendActions(insight));
          break;
        case InsightType.ACHIEVEMENT:
          actions.push(...this.generateAchievementActions(insight));
          break;
      }
    }

    return actions;
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private analyzeBasicStatistics(data: any[], context: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // 计算总分统计
    const totalScores = data
      .map((d) => d.total_score || 0)
      .filter((s) => s > 0);
    const stats = calculateBasicStatistics(totalScores);

    // 平均分洞察
    if (stats.average > 0) {
      const avgInsight = this.createAverageScoreInsight(
        stats.average,
        data.length
      );
      insights.push(avgInsight);
    }

    // 分布洞察
    if (stats.standardDeviation > 0) {
      const distributionInsight = this.createDistributionInsight(stats);
      insights.push(distributionInsight);
    }

    return insights;
  }

  private analyzeTrends(data: any[], context: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // 这里需要历史数据进行趋势分析
    // 暂时返回基于当前数据的简单分析
    const classGroups = this.groupByClass(data);

    for (const [className, students] of Object.entries(classGroups)) {
      const trend = this.analyzeClassTrend(className, students);
      if (trend) {
        insights.push(trend);
      }
    }

    return insights;
  }

  private detectAnomalies(data: any[], context: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // 检测极端分数
    const extremeScores = this.findExtremeScores(data);
    insights.push(...extremeScores);

    // 检测不平衡表现
    const imbalances = this.findSubjectImbalances(data);
    insights.push(...imbalances);

    return insights;
  }

  private identifyAchievements(data: any[], context: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // 识别高分学生
    const topPerformers = this.findTopPerformers(data);
    if (topPerformers.length > 0) {
      insights.push(this.createTopPerformersInsight(topPerformers));
    }

    // 识别进步显著的模式
    const improvers = this.findSignificantImprovement(data);
    insights.push(...improvers);

    return insights;
  }

  private performComparison(data: any[], context: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // 班级间对比
    const classComparison = this.compareClasses(data);
    insights.push(...classComparison);

    // 科目间对比
    const subjectComparison = this.compareSubjects(data);
    insights.push(...subjectComparison);

    return insights;
  }

  private generateSuggestions(
    insights: AIInsight[],
    data: any[],
    context: any
  ): AIInsight[] {
    const suggestions: AIInsight[] = [];

    // 基于已有洞察生成建议
    for (const insight of insights) {
      if (
        insight.type === InsightType.WARNING ||
        insight.type === InsightType.ANOMALY
      ) {
        const suggestion = this.createSuggestionFromInsight(insight, data);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private createAverageScoreInsight(
    average: number,
    studentCount: number
  ): AIInsight {
    const sentiment =
      average >= 80
        ? InsightSentiment.POSITIVE
        : average >= 60
          ? InsightSentiment.NEUTRAL
          : InsightSentiment.NEGATIVE;

    const priority =
      average < 60 ? InsightPriority.HIGH : InsightPriority.MEDIUM;

    return {
      id: uuidv4(),
      type: InsightType.PATTERN,
      priority,
      sentiment,
      title: `整体平均分${average.toFixed(1)}分`,
      description: `${studentCount}名学生的平均成绩为${average.toFixed(1)}分，${this.getAverageMeaning(average)}`,
      detail: this.getAverageDetail(average),
      metric: {
        value: average.toFixed(1),
        unit: "分",
      },
      affectedStudents: studentCount,
      confidence: 0.95,
      timestamp: new Date(),
    };
  }

  private createDistributionInsight(stats: BasicStatistics): AIInsight {
    const cv = stats.standardDeviation / stats.average; // 变异系数
    const isConcentrated = cv < 0.15;

    return {
      id: uuidv4(),
      type: InsightType.PATTERN,
      priority: InsightPriority.MEDIUM,
      sentiment: isConcentrated
        ? InsightSentiment.POSITIVE
        : InsightSentiment.NEUTRAL,
      title: isConcentrated ? "成绩分布集中" : "成绩分布分散",
      description: `标准差为${stats.standardDeviation.toFixed(1)}，${isConcentrated ? "学生水平相对一致" : "学生水平差异较大"}`,
      detail: `最高分${stats.max}分，最低分${stats.min}分，中位数${stats.median}分`,
      metric: {
        value: stats.standardDeviation.toFixed(1),
        unit: "",
      },
      confidence: 0.9,
      timestamp: new Date(),
    };
  }

  private createTopPerformersInsight(topPerformers: any[]): AIInsight {
    return {
      id: uuidv4(),
      type: InsightType.ACHIEVEMENT,
      priority: InsightPriority.MEDIUM,
      sentiment: InsightSentiment.POSITIVE,
      title: `${topPerformers.length}名学生表现卓越`,
      description: `有${topPerformers.length}名学生总分超过90分，展现了优异的学习能力`,
      detail:
        topPerformers
          .slice(0, 3)
          .map((s) => `${s.student_name}(${s.total_score}分)`)
          .join("、") + "等",
      metric: {
        value: topPerformers.length,
        unit: "人",
      },
      affectedStudents: topPerformers.length,
      confidence: 1.0,
      timestamp: new Date(),
    };
  }

  private findExtremeScores(data: any[]): AIInsight[] {
    const insights: AIInsight[] = [];
    const scores = data.map((d) => d.total_score || 0).filter((s) => s > 0);
    const stats = calculateBasicStatistics(scores);

    // 检测异常低分
    const threshold = stats.average - 2 * stats.standardDeviation;
    const lowScorers = data.filter(
      (d) => d.total_score < threshold && d.total_score > 0
    );

    if (lowScorers.length > 0) {
      insights.push({
        id: uuidv4(),
        type: InsightType.ANOMALY,
        priority: InsightPriority.HIGH,
        sentiment: InsightSentiment.NEGATIVE,
        title: `发现${lowScorers.length}名学生成绩异常`,
        description: `这些学生的成绩显著低于平均水平，需要重点关注`,
        detail: `平均分${stats.average.toFixed(1)}分，异常阈值${threshold.toFixed(1)}分以下`,
        metric: {
          value: lowScorers.length,
          unit: "人",
        },
        affectedStudents: lowScorers.length,
        confidence: 0.85,
        actions: [
          {
            id: uuidv4(),
            label: "查看详情",
            actionType: "filter",
            actionData: { scoreRange: [0, threshold] },
          },
        ],
        timestamp: new Date(),
      });
    }

    return insights;
  }

  private findSubjectImbalances(data: any[]): AIInsight[] {
    const insights: AIInsight[] = [];

    // 分析每个学生的科目平衡性
    const imbalancedStudents = data.filter((student) => {
      const subjects = [
        student.chinese_score,
        student.math_score,
        student.english_score,
      ].filter((s) => s !== null && s !== undefined);

      if (subjects.length < 3) return false;

      const subjectStats = calculateBasicStatistics(subjects);
      const cv = subjectStats.standardDeviation / subjectStats.average;

      return cv > 0.3; // 变异系数大于30%视为不平衡
    });

    if (imbalancedStudents.length > 3) {
      insights.push({
        id: uuidv4(),
        type: InsightType.PATTERN,
        priority: InsightPriority.MEDIUM,
        sentiment: InsightSentiment.NEGATIVE,
        title: "发现偏科现象",
        description: `${imbalancedStudents.length}名学生存在明显的科目不平衡，建议加强薄弱科目`,
        metric: {
          value: imbalancedStudents.length,
          unit: "人",
        },
        affectedStudents: imbalancedStudents.length,
        confidence: 0.8,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  private compareClasses(data: any[]): AIInsight[] {
    const insights: AIInsight[] = [];
    const classGroups = this.groupByClass(data);

    if (Object.keys(classGroups).length < 2) return insights;

    const classStats = Object.entries(classGroups).map(
      ([className, students]) => {
        const scores = students
          .map((s) => s.total_score || 0)
          .filter((s) => s > 0);
        return {
          className,
          stats: calculateBasicStatistics(scores),
          count: students.length,
        };
      }
    );

    // 找出表现最好和最差的班级
    classStats.sort((a, b) => b.stats.average - a.stats.average);
    const best = classStats[0];
    const worst = classStats[classStats.length - 1];
    const diff = best.stats.average - worst.stats.average;

    if (diff > 10) {
      insights.push({
        id: uuidv4(),
        type: InsightType.COMPARISON,
        priority: InsightPriority.HIGH,
        sentiment: InsightSentiment.NEUTRAL,
        title: "班级间存在显著差异",
        description: `${best.className}平均分(${best.stats.average.toFixed(1)})比${worst.className}(${worst.stats.average.toFixed(1)})高${diff.toFixed(1)}分`,
        detail: "建议分析优秀班级的教学方法，帮助其他班级提升",
        metric: {
          value: diff.toFixed(1),
          unit: "分",
        },
        confidence: 0.9,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  private compareSubjects(data: any[]): AIInsight[] {
    const insights: AIInsight[] = [];

    // 计算各科目平均分
    const subjects = [
      { name: "语文", field: "chinese_score" },
      { name: "数学", field: "math_score" },
      { name: "英语", field: "english_score" },
    ];

    const subjectStats = subjects.map((subject) => {
      const scores = data.map((d) => d[subject.field]).filter((s) => s > 0);
      return {
        name: subject.name,
        stats: calculateBasicStatistics(scores),
      };
    });

    // 找出最强和最弱科目
    subjectStats.sort((a, b) => b.stats.average - a.stats.average);
    const strongest = subjectStats[0];
    const weakest = subjectStats[subjectStats.length - 1];

    insights.push({
      id: uuidv4(),
      type: InsightType.COMPARISON,
      priority: InsightPriority.MEDIUM,
      sentiment: InsightSentiment.NEUTRAL,
      title: `${strongest.name}是优势科目，${weakest.name}需要加强`,
      description: `${strongest.name}平均${strongest.stats.average.toFixed(1)}分，${weakest.name}平均${weakest.stats.average.toFixed(1)}分`,
      detail: "建议将优势科目的教学经验应用到薄弱科目",
      metric: {
        value: (strongest.stats.average - weakest.stats.average).toFixed(1),
        unit: "分差",
      },
      confidence: 0.85,
      timestamp: new Date(),
    });

    return insights;
  }

  private prioritizeInsights(
    insights: AIInsight[],
    options?: any
  ): AIInsight[] {
    // 优先级权重
    const priorityWeight = {
      [InsightPriority.HIGH]: 3,
      [InsightPriority.MEDIUM]: 2,
      [InsightPriority.LOW]: 1,
    };

    // 类型权重
    const typeWeight = {
      [InsightType.WARNING]: 3,
      [InsightType.ANOMALY]: 3,
      [InsightType.TREND]: 2,
      [InsightType.ACHIEVEMENT]: 2,
      [InsightType.PATTERN]: 1,
      [InsightType.COMPARISON]: 1,
      [InsightType.SUGGESTION]: 2,
    };

    return insights.sort((a, b) => {
      const scoreA =
        priorityWeight[a.priority] * typeWeight[a.type] * a.confidence;
      const scoreB =
        priorityWeight[b.priority] * typeWeight[b.type] * b.confidence;
      return scoreB - scoreA;
    });
  }

  private generateSummary(insights: AIInsight[]): any {
    return {
      totalInsights: insights.length,
      highPriorityCount: insights.filter(
        (i) => i.priority === InsightPriority.HIGH
      ).length,
      positiveCount: insights.filter(
        (i) => i.sentiment === InsightSentiment.POSITIVE
      ).length,
      negativeCount: insights.filter(
        (i) => i.sentiment === InsightSentiment.NEGATIVE
      ).length,
    };
  }

  private calculateOverallConfidence(insights: AIInsight[]): number {
    if (insights.length === 0) return 0;
    const sum = insights.reduce((acc, i) => acc + i.confidence, 0);
    return sum / insights.length;
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  private groupByClass(data: any[]): Record<string, any[]> {
    return data.reduce(
      (acc, item) => {
        const className = item.class_name || "未知班级";
        if (!acc[className]) {
          acc[className] = [];
        }
        acc[className].push(item);
        return acc;
      },
      {} as Record<string, any[]>
    );
  }

  private getAverageMeaning(average: number): string {
    if (average >= 90) return "整体表现优秀";
    if (average >= 80) return "整体表现良好";
    if (average >= 70) return "整体表现中等";
    if (average >= 60) return "整体表现及格";
    return "整体表现需要提升";
  }

  private getAverageDetail(average: number): string {
    if (average >= 90) {
      return "学生们展现了出色的学习能力和知识掌握程度，继续保持这种优秀的学习状态。";
    }
    if (average >= 80) {
      return "大部分学生掌握了核心知识点，但仍有提升空间，建议针对薄弱环节加强训练。";
    }
    if (average >= 70) {
      return "学生整体处于中等水平，需要加强基础知识的巩固和提高解题能力。";
    }
    if (average >= 60) {
      return "刚达到及格线，说明基础知识掌握不够扎实，需要系统性地查漏补缺。";
    }
    return "低于及格线，需要重点关注并采取补救措施，建议进行个性化辅导。";
  }

  private getAverageSignificance(average: number): any {
    if (average >= 90) return "very_good";
    if (average >= 80) return "good";
    if (average >= 70) return "average";
    if (average >= 60) return "concerning";
    return "critical";
  }

  private getPassRateMeaning(rate: number): string {
    if (rate >= 0.95) return "几乎所有学生都达到了及格标准";
    if (rate >= 0.9) return "绝大多数学生达到了及格标准";
    if (rate >= 0.8) return "大部分学生达到了及格标准";
    if (rate >= 0.7) return "多数学生达到了及格标准";
    return "及格率偏低，需要重点关注";
  }

  private getPassRateSignificance(rate: number): any {
    if (rate >= 0.95) return "very_good";
    if (rate >= 0.9) return "good";
    if (rate >= 0.8) return "average";
    if (rate >= 0.7) return "concerning";
    return "critical";
  }

  private analyzeSubjectTrend(
    historicalData: any[],
    currentData: any[],
    subject: string
  ): TrendPrediction | null {
    // 这里需要实际的历史数据来分析趋势
    // 暂时返回模拟数据
    return {
      subject,
      currentTrend: "stable",
      predictedChange: 2.5,
      confidence: 0.7,
      timeframe: "下次考试",
      factors: ["当前学习进度正常", "近期作业完成情况良好"],
    };
  }

  private analyzeClassTrend(
    className: string,
    students: any[]
  ): AIInsight | null {
    const avgScore =
      students.reduce((sum, s) => sum + (s.total_score || 0), 0) /
      students.length;

    // 这里需要历史数据对比
    // 暂时基于当前数据生成简单洞察
    if (avgScore > 85) {
      return {
        id: uuidv4(),
        type: InsightType.TREND,
        priority: InsightPriority.LOW,
        sentiment: InsightSentiment.POSITIVE,
        title: `${className}表现稳定优秀`,
        description: `该班级平均分${avgScore.toFixed(1)}，保持在高水平`,
        metric: {
          value: avgScore.toFixed(1),
          unit: "分",
          trend: "stable",
        },
        affectedStudents: students.length,
        confidence: 0.8,
        timestamp: new Date(),
      };
    }

    return null;
  }

  private findTopPerformers(data: any[]): any[] {
    return data
      .filter((d) => d.total_score >= 90)
      .sort((a, b) => b.total_score - a.total_score);
  }

  private findSignificantImprovement(data: any[]): AIInsight[] {
    // 需要历史数据对比
    // 暂时返回空数组
    return [];
  }

  private createSuggestionFromInsight(
    insight: AIInsight,
    data: any[]
  ): AIInsight | null {
    if (
      insight.type === InsightType.ANOMALY &&
      insight.title.includes("成绩异常")
    ) {
      return {
        id: uuidv4(),
        type: InsightType.SUGGESTION,
        priority: InsightPriority.HIGH,
        sentiment: InsightSentiment.NEUTRAL,
        title: "建议进行个性化辅导",
        description:
          "针对成绩异常的学生，建议安排一对一辅导，了解具体困难并制定改进计划",
        detail:
          "可以从以下方面入手：1) 诊断知识盲点 2) 调整学习方法 3) 增加练习时间 4) 心理疏导",
        confidence: 0.85,
        actions: [
          {
            id: uuidv4(),
            label: "生成辅导名单",
            actionType: "export",
            description: "导出需要辅导的学生名单",
          },
        ],
        timestamp: new Date(),
      };
    }

    return null;
  }

  private detectScoreAnomalies(data: any[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // 检测各科目的异常分数
    const subjects = ["语文", "数学", "英语"];

    for (const subject of subjects) {
      const fieldMap: Record<string, string> = {
        语文: "chinese_score",
        数学: "math_score",
        英语: "english_score",
      };

      const field = fieldMap[subject];
      const scores = data.map((d) => d[field]).filter((s) => s > 0);

      if (scores.length === 0) continue;

      const stats = calculateBasicStatistics(scores);
      const threshold = stats.average - 2.5 * stats.standardDeviation;

      const anomalyCount = scores.filter((s) => s < threshold).length;

      if (anomalyCount > 0) {
        anomalies.push({
          type: "score_drop",
          severity: anomalyCount > 5 ? "high" : "medium",
          description: `${subject}科目有${anomalyCount}人成绩异常偏低`,
          affectedMetric: subject,
          deviation: ((threshold - stats.average) / stats.average) * 100,
          possibleCauses: [
            "考试难度突然增加",
            "学生对该部分知识点掌握不足",
            "考试状态不佳",
          ],
          suggestedActions: [
            "检查试卷难度是否合理",
            "针对薄弱知识点进行专项训练",
            "关注学生的学习和心理状态",
          ],
        });
      }
    }

    return anomalies;
  }

  private detectDistributionAnomalies(data: any[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const scores = data.map((d) => d.total_score || 0).filter((s) => s > 0);

    if (scores.length === 0) return anomalies;

    const distribution = calculateScoreDistribution(scores);

    // 检查是否存在双峰分布
    const peaks = this.findDistributionPeaks(distribution);

    if (peaks.length > 1) {
      anomalies.push({
        type: "distribution",
        severity: "medium",
        description: "成绩呈现双峰分布，学生水平两极分化",
        affectedMetric: "总分分布",
        deviation: 0,
        possibleCauses: [
          "教学方法可能不适合部分学生",
          "学生基础差异较大",
          "存在不同的学习群体",
        ],
        suggestedActions: [
          "实施分层教学",
          "加强对后进生的辅导",
          "调整教学策略以适应不同水平的学生",
        ],
      });
    }

    return anomalies;
  }

  private detectConsistencyAnomalies(data: any[]): AnomalyDetection[] {
    // 检测学生在各科目表现的一致性
    // 这里简化实现
    return [];
  }

  private findDistributionPeaks(distribution: any): number[] {
    // 简化的峰值检测
    // 实际应该使用更复杂的算法
    return [];
  }

  private generateWarningActions(insight: AIInsight): InsightAction[] {
    return [
      {
        id: uuidv4(),
        label: "查看详细名单",
        description: "查看受影响学生的详细信息",
        actionType: "filter",
      },
      {
        id: uuidv4(),
        label: "发送预警通知",
        description: "向相关老师和家长发送预警",
        actionType: "notify",
      },
    ];
  }

  private generateAnomalyActions(insight: AIInsight): InsightAction[] {
    return [
      {
        id: uuidv4(),
        label: "深入分析",
        description: "查看异常数据的详细分析",
        actionType: "navigate",
        actionData: { view: "anomaly-analysis" },
      },
    ];
  }

  private generateTrendActions(insight: AIInsight): InsightAction[] {
    return [
      {
        id: uuidv4(),
        label: "查看趋势图",
        description: "查看详细的趋势变化图表",
        actionType: "navigate",
        actionData: { view: "trend-chart" },
      },
    ];
  }

  private generateAchievementActions(insight: AIInsight): InsightAction[] {
    return [
      {
        id: uuidv4(),
        label: "生成表彰名单",
        description: "导出优秀学生名单用于表彰",
        actionType: "export",
      },
    ];
  }
}

// 导出单例实例
export const advancedAnalysisEngine = AdvancedAnalysisEngine.getInstance();
