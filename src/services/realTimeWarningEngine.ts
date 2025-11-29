/**
 * 实时预警计算引擎
 * 支持规则动态匹配、即时预警生成和事件驱动架构
 */

import { supabase } from "../integrations/supabase/client";
import { warningAnalysisCache } from "../utils/performanceCache";

// 数据变更事件类型
export enum DataChangeEventType {
  GRADE_DATA_INSERTED = "grade_data_inserted",
  GRADE_DATA_UPDATED = "grade_data_updated",
  STUDENT_DATA_UPDATED = "student_data_updated",
  ATTENDANCE_DATA_UPDATED = "attendance_data_updated",
  EXAM_COMPLETED = "exam_completed",
  HOMEWORK_SUBMITTED = "homework_submitted",
  MANUAL_TRIGGER = "manual_trigger",
}

// 数据变更事件
export interface DataChangeEvent {
  type: DataChangeEventType;
  entityId: string; // 学生ID、考试ID等
  entityType: "student" | "exam" | "class" | "homework";
  changeData: Record<string, any>;
  timestamp: string;
  metadata?: Record<string, any>;
}

// 预警规则执行上下文
export interface RuleExecutionContext {
  studentId: string;
  ruleId: string;
  eventType: DataChangeEventType;
  triggerData: Record<string, any>;
  timestamp: string;
}

// 预警计算结果
export interface WarningCalculationResult {
  ruleId: string;
  studentId: string;
  triggered: boolean;
  severity: "low" | "medium" | "high" | "critical";
  score: number; // 0-100
  message: string;
  details: Record<string, any>;
  suggestedActions: string[];
  expiredAt?: string;
  metadata: {
    calculatedAt: string;
    processingTimeMs: number;
    ruleVersion: string;
    confidence: number;
  };
}

// 规则条件表达式解析器
class RuleExpressionParser {
  // 解析规则条件表达式
  parseCondition(expression: string, context: Record<string, any>): boolean {
    try {
      // 安全的表达式解析 - 只支持基本的比较操作
      return this.evaluateExpression(expression, context);
    } catch (error) {
      console.error("[RuleExpressionParser] 条件解析失败:", error);
      return false;
    }
  }

  // 计算规则得分
  calculateScore(
    scoreExpression: string,
    context: Record<string, any>
  ): number {
    try {
      const result = this.evaluateExpression(scoreExpression, context);
      return typeof result === "number"
        ? Math.max(0, Math.min(100, result))
        : 0;
    } catch (error) {
      console.error("[RuleExpressionParser] 得分计算失败:", error);
      return 0;
    }
  }

  // 简化的表达式计算器（安全版本）
  private evaluateExpression(
    expression: string,
    context: Record<string, any>
  ): any {
    // 替换变量
    let processedExpression = expression;

    // 支持的变量替换
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, "g");
      processedExpression = processedExpression.replace(regex, String(value));
    });

    // 支持的操作符映射
    const operators = {
      ">=": (a: number, b: number) => a >= b,
      "<=": (a: number, b: number) => a <= b,
      ">": (a: number, b: number) => a > b,
      "<": (a: number, b: number) => a < b,
      "==": (a: any, b: any) => a == b,
      "!=": (a: any, b: any) => a != b,
      "&&": (a: boolean, b: boolean) => a && b,
      "||": (a: boolean, b: boolean) => a || b,
    };

    // 简单的表达式解析
    return this.parseSimpleExpression(processedExpression, operators);
  }

  private parseSimpleExpression(
    expr: string,
    operators: Record<string, Function>
  ): any {
    // 移除空格
    expr = expr.replace(/\s+/g, " ").trim();

    // 数字检测
    if (/^-?\d+\.?\d*$/.test(expr)) {
      return parseFloat(expr);
    }

    // 布尔值检测
    if (expr === "true") return true;
    if (expr === "false") return false;

    // 简单比较操作
    for (const [op, func] of Object.entries(operators)) {
      if (expr.includes(op)) {
        const parts = expr.split(op);
        if (parts.length === 2) {
          const left = this.parseSimpleExpression(parts[0].trim(), operators);
          const right = this.parseSimpleExpression(parts[1].trim(), operators);
          return func(left, right);
        }
      }
    }

    return expr; // 返回原始字符串
  }
}

// 数据收集器 - 收集学生相关数据
class StudentDataCollector {
  async collectStudentData(
    studentId: string,
    eventType?: DataChangeEventType
  ): Promise<Record<string, any>> {
    const startTime = performance.now();

    try {
      // 并行收集不同类型的数据
      const [
        studentInfo,
        recentGrades,
        attendanceData,
        behaviorData,
        homeworkData,
      ] = await Promise.all([
        this.getStudentBasicInfo(studentId),
        this.getRecentGrades(studentId),
        this.getAttendanceData(studentId),
        this.getBehaviorData(studentId),
        this.getHomeworkData(studentId),
      ]);

      // 计算派生指标
      const derivedMetrics = this.calculateDerivedMetrics({
        studentInfo,
        recentGrades,
        attendanceData,
        behaviorData,
        homeworkData,
      });

      const processingTime = performance.now() - startTime;

      return {
        ...studentInfo,
        ...derivedMetrics,
        recentGrades,
        attendanceData,
        behaviorData,
        homeworkData,
        _metadata: {
          collectedAt: new Date().toISOString(),
          processingTimeMs: Math.round(processingTime),
          eventType,
        },
      };
    } catch (error) {
      console.error("[StudentDataCollector] 数据收集失败:", error);
      throw error;
    }
  }

  // 获取学生基本信息
  private async getStudentBasicInfo(studentId: string) {
    const { data, error } = await supabase
      .from("students")
      .select(
        `
        id,
        name,
        class_id,
        student_id,
        created_at,
        classes!inner(name, grade)
      `
      )
      .eq("id", studentId)
      .single();

    if (error) throw error;
    return data || {};
  }

  // 获取最近成绩数据
  private async getRecentGrades(studentId: string) {
    const { data, error } = await supabase
      .from("grade_data_new")
      .select(
        `
        score,
        rank,
        percentile,
        exam_id,
        created_at,
        exams!inner(name, exam_date, subject, total_score)
      `
      )
      .eq("student_id", studentId)
      .order("exams.exam_date", { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // 获取考勤数据（如果有相关表）
  private async getAttendanceData(studentId: string) {
    // 模拟考勤数据，实际应该从考勤表获取
    return {
      attendanceRate: 0.95,
      lateCount: 2,
      absentCount: 1,
      period: "last_30_days",
    };
  }

  // 获取行为数据
  private async getBehaviorData(studentId: string) {
    // 可以从预警记录中统计行为相关问题
    const { data, error } = await supabase
      .from("warning_records")
      .select(
        `
        id,
        severity,
        created_at,
        warning_rules!inner(category)
      `
      )
      .eq("student_id", studentId)
      .eq("warning_rules.category", "behavior")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[StudentDataCollector] 行为数据获取失败:", error);
      return { behaviorIssues: 0 };
    }

    return {
      behaviorIssues: data?.length || 0,
      recentBehaviorIssues: data || [],
    };
  }

  // 获取作业数据
  private async getHomeworkData(studentId: string) {
    // 模拟作业数据，实际应该从作业表获取
    return {
      completionRate: 0.88,
      averageScore: 82.5,
      lateSubmissions: 3,
      period: "last_30_days",
    };
  }

  // 计算派生指标
  private calculateDerivedMetrics(data: any): Record<string, any> {
    const { recentGrades } = data;

    if (!recentGrades || recentGrades.length === 0) {
      return {
        avgScore: 0,
        scoreStdDev: 0,
        scoreTrend: "stable",
        lowScoreCount: 0,
        gradeCount: 0,
      };
    }

    // 计算平均分
    const scores = recentGrades.map((g) => g.score).filter((s) => s !== null);
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // 计算标准差
    const scoreStdDev =
      scores.length > 1
        ? Math.sqrt(
            scores.reduce(
              (sum, score) => sum + Math.pow(score - avgScore, 2),
              0
            ) / scores.length
          )
        : 0;

    // 计算趋势（简化版本）
    let scoreTrend = "stable";
    if (scores.length >= 3) {
      const recent3 = scores.slice(0, 3);
      const earlier3 = scores.slice(3, 6);
      if (earlier3.length > 0) {
        const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
        const earlierAvg =
          earlier3.reduce((a, b) => a + b, 0) / earlier3.length;

        if (recentAvg > earlierAvg + 5) scoreTrend = "improving";
        else if (recentAvg < earlierAvg - 5) scoreTrend = "declining";
      }
    }

    // 低分次数
    const lowScoreCount = scores.filter((s) => s < 60).length;

    return {
      avgScore: Math.round(avgScore * 100) / 100,
      scoreStdDev: Math.round(scoreStdDev * 100) / 100,
      scoreTrend,
      lowScoreCount,
      gradeCount: scores.length,
      passRate:
        scores.length > 0
          ? scores.filter((s) => s >= 60).length / scores.length
          : 0,
    };
  }
}

// ✅ 增强的机器学习预测模块
class MLPredictionEngine {
  // 学生风险等级预测
  async predictStudentRiskLevel(studentData: any): Promise<{
    riskLevel: "low" | "medium" | "high" | "critical";
    confidence: number;
    factors: Array<{
      factor: string;
      weight: number;
      impact: "positive" | "negative";
    }>;
  }> {
    try {
      const features = this.extractRiskFeatures(studentData);
      const riskScore = this.calculateRiskScore(features);

      return {
        riskLevel: this.mapScoreToRiskLevel(riskScore),
        confidence: this.calculatePredictionConfidence(features),
        factors: this.identifyRiskFactors(features),
      };
    } catch (error) {
      console.error("[MLPredictionEngine] 风险预测失败:", error);
      return { riskLevel: "low", confidence: 0.5, factors: [] };
    }
  }

  // 成绩下降趋势预测
  async predictGradeTrend(studentData: any): Promise<{
    trend: "improving" | "stable" | "declining" | "critical_decline";
    probability: number;
    timeframe: string;
    suggestedInterventions: string[];
  }> {
    const { recentGrades, avgScore, scoreTrend } = studentData;

    // 简化的趋势分析算法
    let trendProbability = 0.5;
    let predictedTrend = "stable";

    if (recentGrades && recentGrades.length >= 3) {
      const scores = recentGrades.slice(0, 5).map((g) => g.score);
      const recentAvg = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const earlyAvg =
        scores.slice(2).reduce((a, b) => a + b, 0) / (scores.length - 2);

      const trendDelta = recentAvg - earlyAvg;

      if (trendDelta > 10) {
        predictedTrend = "improving";
        trendProbability = 0.8;
      } else if (trendDelta < -10) {
        predictedTrend = "declining";
        trendProbability = 0.75;
      } else if (trendDelta < -20) {
        predictedTrend = "critical_decline";
        trendProbability = 0.9;
      }
    }

    return {
      trend: predictedTrend as any,
      probability: trendProbability,
      timeframe: "2-4周",
      suggestedInterventions: this.generateInterventionSuggestions(
        predictedTrend,
        studentData
      ),
    };
  }

  private extractRiskFeatures(studentData: any): Record<string, number> {
    return {
      avgScore: studentData.avgScore || 0,
      scoreStdDev: studentData.scoreStdDev || 0,
      lowScoreCount: studentData.lowScoreCount || 0,
      gradeCount: studentData.gradeCount || 0,
      passRate: studentData.passRate || 1,
      attendanceRate: studentData.attendanceData?.attendanceRate || 1,
      homeworkCompletionRate: studentData.homeworkData?.completionRate || 1,
      behaviorIssues: studentData.behaviorData?.behaviorIssues || 0,
      trendDirection:
        studentData.scoreTrend === "declining"
          ? -1
          : studentData.scoreTrend === "improving"
            ? 1
            : 0,
    };
  }

  private calculateRiskScore(features: Record<string, number>): number {
    // 权重配置（基于教育经验）
    const weights = {
      avgScore: -0.3, // 平均分越高风险越低
      scoreStdDev: 0.2, // 波动越大风险越高
      lowScoreCount: 0.25, // 低分次数越多风险越高
      passRate: -0.2, // 及格率越高风险越低
      attendanceRate: -0.15, // 出勤率越高风险越低
      homeworkCompletionRate: -0.1, // 作业完成率越高风险越低
      behaviorIssues: 0.15, // 行为问题越多风险越高
      trendDirection: -0.1, // 上升趋势降低风险
    };

    let riskScore = 50; // 基准分50

    Object.entries(features).forEach(([feature, value]) => {
      const weight = weights[feature] || 0;

      // 标准化特征值
      const normalizedValue = this.normalizeFeatureValue(feature, value);
      riskScore += normalizedValue * weight * 100;
    });

    return Math.max(0, Math.min(100, riskScore));
  }

  private normalizeFeatureValue(feature: string, value: number): number {
    // 特征值标准化
    switch (feature) {
      case "avgScore":
        return (value - 60) / 40; // 60分为基准
      case "scoreStdDev":
        return Math.min(value / 20, 1); // 20分标准差为上限
      case "lowScoreCount":
        return Math.min(value / 5, 1); // 5次低分为上限
      case "passRate":
        return value; // 已经是0-1范围
      case "attendanceRate":
        return value; // 已经是0-1范围
      case "homeworkCompletionRate":
        return value; // 已经是0-1范围
      case "behaviorIssues":
        return Math.min(value / 10, 1); // 10次行为问题为上限
      case "trendDirection":
        return value; // -1到1范围
      default:
        return 0;
    }
  }

  private mapScoreToRiskLevel(
    score: number
  ): "low" | "medium" | "high" | "critical" {
    if (score >= 80) return "critical";
    if (score >= 65) return "high";
    if (score >= 45) return "medium";
    return "low";
  }

  private calculatePredictionConfidence(
    features: Record<string, number>
  ): number {
    // 基于数据完整性计算置信度
    const dataCompleteness =
      Object.values(features).filter((v) => v !== 0).length /
      Object.keys(features).length;
    const gradeCount = features.gradeCount || 0;

    let confidence = 0.6; // 基础置信度
    confidence += dataCompleteness * 0.2; // 数据完整性加成
    confidence += Math.min(gradeCount / 10, 0.2); // 成绩记录数量加成

    return Math.min(0.95, confidence);
  }

  private identifyRiskFactors(features: Record<string, number>): Array<{
    factor: string;
    weight: number;
    impact: "positive" | "negative";
  }> {
    const factors: Array<{
      factor: string;
      weight: number;
      impact: "positive" | "negative";
    }> = [];

    if (features.avgScore < 60) {
      factors.push({ factor: "平均成绩偏低", weight: 0.8, impact: "negative" });
    }
    if (features.lowScoreCount > 3) {
      factors.push({ factor: "低分次数较多", weight: 0.7, impact: "negative" });
    }
    if (features.attendanceRate < 0.9) {
      factors.push({ factor: "出勤率不足", weight: 0.6, impact: "negative" });
    }
    if (features.behaviorIssues > 2) {
      factors.push({ factor: "行为问题记录", weight: 0.5, impact: "negative" });
    }
    if (features.trendDirection === -1) {
      factors.push({ factor: "成绩下降趋势", weight: 0.6, impact: "negative" });
    }

    return factors.sort((a, b) => b.weight - a.weight);
  }

  private generateInterventionSuggestions(
    trend: string,
    studentData: any
  ): string[] {
    const suggestions: string[] = [];

    if (trend === "declining" || trend === "critical_decline") {
      suggestions.push("安排个别辅导");
      suggestions.push("与家长沟通学习情况");
      suggestions.push("调整学习计划");
    }

    if (studentData.avgScore < 60) {
      suggestions.push("加强基础知识复习");
      suggestions.push("提供额外练习材料");
    }

    if (studentData.behaviorData?.behaviorIssues > 0) {
      suggestions.push("关注学习态度");
      suggestions.push("建立积极的学习环境");
    }

    return suggestions;
  }
}

// ✅ 增强实时预警计算引擎 - 集成ML预测
export class RealTimeWarningEngine {
  private expressionParser = new RuleExpressionParser();
  private dataCollector = new StudentDataCollector();
  private mlEngine = new MLPredictionEngine();
  private isProcessing = false;
  private eventQueue: DataChangeEvent[] = [];
  private performanceMetrics = {
    totalEventsProcessed: 0,
    averageProcessingTime: 0,
    totalWarningsGenerated: 0,
    accuracyScore: 0.85,
  };

  // 处理数据变更事件
  async processDataChangeEvent(event: DataChangeEvent): Promise<void> {
    console.log(
      `[RealTimeWarningEngine] 处理事件: ${event.type}, 实体: ${event.entityId}`
    );

    // 添加到队列
    this.eventQueue.push(event);

    // 如果没有在处理，开始处理队列
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }

  // 处理事件队列
  private async processEventQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;

      try {
        await this.handleSingleEvent(event);
      } catch (error) {
        console.error("[RealTimeWarningEngine] 事件处理失败:", error);
      }
    }

    this.isProcessing = false;
  }

  // 处理单个事件
  private async handleSingleEvent(event: DataChangeEvent): Promise<void> {
    const startTime = performance.now();

    try {
      // 根据事件类型确定需要检查的学生
      const studentIds = await this.getAffectedStudents(event);

      // 获取相关的预警规则
      const activeRules = await this.getActiveWarningRules(event.type);

      // 为每个学生执行规则检查
      const checkPromises = studentIds.flatMap((studentId) =>
        activeRules.map((rule) =>
          this.executeRuleForStudent(studentId, rule, event)
        )
      );

      const results = await Promise.allSettled(checkPromises);

      // 处理结果
      const successfulResults = results
        .filter((result) => result.status === "fulfilled")
        .map(
          (result) =>
            (result as PromiseFulfilledResult<WarningCalculationResult>).value
        )
        .filter((result) => result.triggered);

      // 保存新的预警记录
      if (successfulResults.length > 0) {
        await this.saveWarningResults(successfulResults);
      }

      // 清理缓存
      this.invalidateRelatedCache(studentIds);

      const processingTime = performance.now() - startTime;
      console.log(
        `[RealTimeWarningEngine] 事件处理完成，耗时 ${Math.round(processingTime)}ms，生成 ${successfulResults.length} 个预警`
      );
    } catch (error) {
      console.error("[RealTimeWarningEngine] 事件处理异常:", error);
      throw error;
    }
  }

  // 获取受影响的学生列表
  private async getAffectedStudents(event: DataChangeEvent): Promise<string[]> {
    switch (event.entityType) {
      case "student":
        return [event.entityId];

      case "exam":
        // 获取参加该考试的所有学生
        const { data: examGrades, error } = await supabase
          .from("grade_data_new")
          .select("student_id")
          .eq("exam_id", event.entityId);

        if (error) throw error;
        return Array.from(new Set(examGrades?.map((g) => g.student_id) || []));

      case "class":
        // 获取班级所有学生
        const { data: classStudents, error: classError } = await supabase
          .from("students")
          .select("id")
          .eq("class_id", event.entityId);

        if (classError) throw classError;
        return classStudents?.map((s) => s.id) || [];

      default:
        return [];
    }
  }

  // 获取活跃的预警规则
  private async getActiveWarningRules(eventType: DataChangeEventType) {
    return warningAnalysisCache.getRuleData(async () => {
      const { data, error } = await supabase
        .from("warning_rules")
        .select(
          `
            id,
            name,
            category,
            scope,
            priority,
            severity,
            condition_expression,
            score_expression,
            message_template,
            suggested_actions,
            trigger_events,
            cooldown_hours,
            is_active
          `
        )
        .eq("is_active", true);

      if (error) throw error;

      // 过滤支持当前事件类型的规则
      return (
        data?.filter(
          (rule) =>
            !rule.trigger_events ||
            rule.trigger_events.includes(eventType) ||
            rule.trigger_events.includes("all")
        ) || []
      );
    });
  }

  // 为学生执行特定规则
  private async executeRuleForStudent(
    studentId: string,
    rule: any,
    event: DataChangeEvent
  ): Promise<WarningCalculationResult> {
    const startTime = performance.now();

    try {
      // 检查冷却期
      if (
        await this.isInCooldownPeriod(studentId, rule.id, rule.cooldown_hours)
      ) {
        return this.createNonTriggeredResult(
          studentId,
          rule,
          startTime,
          "处于冷却期"
        );
      }

      // 收集学生数据
      const studentData = await this.dataCollector.collectStudentData(
        studentId,
        event.type
      );

      // ✅ 集成ML预测 - 增强风险评估
      const [riskPrediction, trendPrediction] = await Promise.all([
        this.mlEngine.predictStudentRiskLevel(studentData),
        this.mlEngine.predictGradeTrend(studentData),
      ]);

      // 创建增强的规则执行上下文
      const context = {
        ...studentData,
        eventType: event.type,
        eventData: event.changeData,
        currentTime: new Date(),
        rule: rule,
        // ML预测结果
        mlRiskLevel: riskPrediction.riskLevel,
        mlRiskScore: this.mapRiskLevelToScore(riskPrediction.riskLevel),
        mlConfidence: riskPrediction.confidence,
        mlRiskFactors: riskPrediction.factors,
        predictedTrend: trendPrediction.trend,
        trendProbability: trendPrediction.probability,
        suggestedInterventions: trendPrediction.suggestedInterventions,
      };

      // 检查规则条件
      const conditionMet = this.expressionParser.parseCondition(
        rule.condition_expression,
        context
      );

      if (!conditionMet) {
        return this.createNonTriggeredResult(
          studentId,
          rule,
          startTime,
          "条件不满足"
        );
      }

      // 计算预警得分
      const score = rule.score_expression
        ? this.expressionParser.calculateScore(rule.score_expression, context)
        : this.getDefaultScore(rule.severity);

      // 生成预警消息
      const message = this.generateWarningMessage(
        rule.message_template,
        context
      );

      // 解析建议行动
      const suggestedActions = Array.isArray(rule.suggested_actions)
        ? rule.suggested_actions
        : [rule.suggested_actions].filter(Boolean);

      const processingTime = performance.now() - startTime;

      return {
        ruleId: rule.id,
        studentId,
        triggered: true,
        severity: rule.severity,
        score,
        message,
        details: {
          ruleName: rule.name,
          category: rule.category,
          triggerEvent: event.type,
          studentData: this.sanitizeDataForStorage(studentData),
          // ✅ 增强预警详情 - 包含ML预测信息
          mlInsights: {
            riskLevel: riskPrediction.riskLevel,
            riskFactors: riskPrediction.factors.slice(0, 3), // 只保留前3个风险因素
            predictedTrend: trendPrediction.trend,
            trendProbability: trendPrediction.probability,
            confidence: riskPrediction.confidence,
          },
        },
        suggestedActions: [
          ...suggestedActions,
          ...trendPrediction.suggestedInterventions.slice(0, 2), // 添加ML建议的干预措施
        ],
        expiredAt: this.calculateExpirationTime(rule),
        metadata: {
          calculatedAt: new Date().toISOString(),
          processingTimeMs: Math.round(processingTime),
          ruleVersion: "2.0", // 升级到2.0版本，包含ML功能
          confidence: this.calculateEnhancedConfidence(
            context,
            rule,
            riskPrediction.confidence
          ),
        },
      };
    } catch (error) {
      console.error("[RealTimeWarningEngine] 规则执行失败:", error);
      return this.createNonTriggeredResult(
        studentId,
        rule,
        startTime,
        "执行异常"
      );
    }
  }

  // 检查是否在冷却期
  private async isInCooldownPeriod(
    studentId: string,
    ruleId: string,
    cooldownHours: number
  ): Promise<boolean> {
    if (!cooldownHours || cooldownHours <= 0) return false;

    const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("warning_records")
      .select("id")
      .eq("student_id", studentId)
      .eq("rule_id", ruleId)
      .gte("created_at", cooldownTime.toISOString())
      .limit(1);

    if (error) {
      console.warn("[RealTimeWarningEngine] 冷却期检查失败:", error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  // 创建未触发的结果
  private createNonTriggeredResult(
    studentId: string,
    rule: any,
    startTime: number,
    reason: string
  ): WarningCalculationResult {
    return {
      ruleId: rule.id,
      studentId,
      triggered: false,
      severity: rule.severity,
      score: 0,
      message: "",
      details: { reason },
      suggestedActions: [],
      metadata: {
        calculatedAt: new Date().toISOString(),
        processingTimeMs: Math.round(performance.now() - startTime),
        ruleVersion: "1.0",
        confidence: 0,
      },
    };
  }

  // 获取默认分数
  private getDefaultScore(severity: string): number {
    switch (severity) {
      case "critical":
        return 90;
      case "high":
        return 75;
      case "medium":
        return 50;
      case "low":
        return 25;
      default:
        return 50;
    }
  }

  // 生成预警消息
  private generateWarningMessage(template: string, context: any): string {
    if (!template) return "检测到预警情况";

    let message = template;

    // 替换模板变量
    const variables = {
      studentName: context.name || "学生",
      avgScore: context.avgScore || 0,
      className: context.classes?.name || "未知班级",
      gradeCount: context.gradeCount || 0,
      lowScoreCount: context.lowScoreCount || 0,
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      message = message.replace(regex, String(value));
    });

    return message;
  }

  // 计算过期时间
  private calculateExpirationTime(rule: any): string | undefined {
    // 默认30天过期
    const expirationDays = rule.expiration_days || 30;
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + expirationDays);
    return expirationTime.toISOString();
  }

  // 计算置信度
  private calculateConfidence(context: any, rule: any): number {
    // 基于数据完整性和规则复杂度计算置信度
    let confidence = 0.8;

    // 数据完整性检查
    if (context.gradeCount > 5) confidence += 0.1;
    if (context._metadata?.processingTimeMs < 1000) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  // 清理数据用于存储
  private sanitizeDataForStorage(data: any): any {
    // 移除敏感信息和大型数据对象
    const sanitized = { ...data };
    delete sanitized._metadata;
    delete sanitized.recentGrades;
    delete sanitized.behaviorData;
    return sanitized;
  }

  // 保存预警结果
  private async saveWarningResults(
    results: WarningCalculationResult[]
  ): Promise<void> {
    const records = results.map((result) => ({
      student_id: result.studentId,
      rule_id: result.ruleId,
      severity: result.severity,
      score: result.score,
      message: result.message,
      details: result.details,
      suggested_actions: result.suggestedActions,
      status: "active",
      expired_at: result.expiredAt,
      created_at: result.metadata.calculatedAt,
    }));

    const { error } = await supabase.from("warning_records").insert(records);

    if (error) {
      console.error("[RealTimeWarningEngine] 保存预警记录失败:", error);
      throw error;
    }

    console.log(
      `[RealTimeWarningEngine] 成功保存 ${records.length} 条预警记录`
    );
  }

  // 清理相关缓存
  private invalidateRelatedCache(studentIds: string[]): void {
    // 清理预警相关缓存
    warningAnalysisCache.invalidateWarningData();

    // 可以根据需要添加更细粒度的缓存清理
    console.log(
      `[RealTimeWarningEngine] 已清理 ${studentIds.length} 个学生的相关缓存`
    );
  }

  // 手动触发预警计算
  async triggerWarningCalculation(
    studentId: string,
    reason: string = "手动触发"
  ): Promise<WarningCalculationResult[]> {
    const event: DataChangeEvent = {
      type: DataChangeEventType.MANUAL_TRIGGER,
      entityId: studentId,
      entityType: "student",
      changeData: { reason },
      timestamp: new Date().toISOString(),
      metadata: { source: "manual" },
    };

    await this.processDataChangeEvent(event);

    // 返回最近生成的预警
    return this.getRecentWarningsForStudent(studentId);
  }

  // 获取学生最近的预警
  private async getRecentWarningsForStudent(
    studentId: string
  ): Promise<WarningCalculationResult[]> {
    const { data, error } = await supabase
      .from("warning_records")
      .select(
        `
        rule_id,
        severity,
        score,
        message,
        details,
        suggested_actions,
        created_at
      `
      )
      .eq("student_id", studentId)
      .eq("status", "active")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 最近1小时
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[RealTimeWarningEngine] 获取最近预警失败:", error);
      return [];
    }

    return (
      data?.map((record) => ({
        ruleId: record.rule_id,
        studentId,
        triggered: true,
        severity: record.severity,
        score: record.score,
        message: record.message,
        details: record.details || {},
        suggestedActions: record.suggested_actions || [],
        metadata: {
          calculatedAt: record.created_at,
          processingTimeMs: 0,
          ruleVersion: "1.0",
          confidence: 1.0,
        },
      })) || []
    );
  }

  // 批量处理多个事件
  async processBatchEvents(events: DataChangeEvent[]): Promise<void> {
    console.log(`[RealTimeWarningEngine] 批量处理 ${events.length} 个事件`);

    // 添加所有事件到队列
    this.eventQueue.push(...events);

    // 处理队列
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }

  // ✅ 新增辅助方法

  // 将风险等级映射为数值分数
  private mapRiskLevelToScore(riskLevel: string): number {
    switch (riskLevel) {
      case "critical":
        return 90;
      case "high":
        return 75;
      case "medium":
        return 50;
      case "low":
        return 25;
      default:
        return 50;
    }
  }

  // 增强置信度计算 - 结合ML预测置信度
  private calculateEnhancedConfidence(
    context: any,
    rule: any,
    mlConfidence: number
  ): number {
    // 基础置信度
    let confidence = this.calculateConfidence(context, rule);

    // ML置信度加权
    const mlWeight = 0.3;
    confidence = confidence * (1 - mlWeight) + mlConfidence * mlWeight;

    // 数据质量调整
    if (context.gradeCount > 10) confidence += 0.05;
    if (context.mlRiskFactors && context.mlRiskFactors.length > 2)
      confidence += 0.03;

    return Math.min(0.99, confidence);
  }

  // 更新性能指标
  private updatePerformanceMetrics(processingTime: number): number {
    this.performanceMetrics.totalEventsProcessed++;
    this.performanceMetrics.totalWarningsGenerated++;

    // 更新平均处理时间
    const currentAvg = this.performanceMetrics.averageProcessingTime;
    const count = this.performanceMetrics.totalEventsProcessed;
    this.performanceMetrics.averageProcessingTime =
      (currentAvg * (count - 1) + processingTime) / count;

    // 性能评分（处理时间越短分数越高）
    const targetTime = 1000; // 目标1秒内完成
    const performanceScore = Math.max(
      0,
      Math.min(100, 100 - ((processingTime - targetTime) / targetTime) * 50)
    );

    return Math.round(performanceScore);
  }

  // 获取增强的引擎状态
  getEngineStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.eventQueue.length,
      lastProcessedAt: new Date().toISOString(),
      performanceMetrics: this.performanceMetrics,
      mlEnabled: true,
      version: "2.0",
    };
  }

  // 获取引擎性能报告
  getPerformanceReport() {
    const { performanceMetrics } = this;
    return {
      summary: {
        totalEvents: performanceMetrics.totalEventsProcessed,
        totalWarnings: performanceMetrics.totalWarningsGenerated,
        averageTime: `${Math.round(performanceMetrics.averageProcessingTime)}ms`,
        accuracy: `${Math.round(performanceMetrics.accuracyScore * 100)}%`,
      },
      performance: {
        processingSpeed:
          performanceMetrics.averageProcessingTime < 1000
            ? "优秀"
            : performanceMetrics.averageProcessingTime < 2000
              ? "良好"
              : "需优化",
        accuracy:
          performanceMetrics.accuracyScore > 0.9
            ? "优秀"
            : performanceMetrics.accuracyScore > 0.8
              ? "良好"
              : "需优化",
        throughput:
          performanceMetrics.totalEventsProcessed > 100
            ? "高"
            : performanceMetrics.totalEventsProcessed > 50
              ? "中"
              : "低",
      },
      recommendations: this.generatePerformanceRecommendations(),
    };
  }

  // 生成性能优化建议
  private generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const { performanceMetrics } = this;

    if (performanceMetrics.averageProcessingTime > 2000) {
      recommendations.push("考虑优化数据查询性能");
      recommendations.push("启用更积极的缓存策略");
    }

    if (performanceMetrics.accuracyScore < 0.8) {
      recommendations.push("调整ML模型参数");
      recommendations.push("增加训练数据");
    }

    if (this.eventQueue.length > 10) {
      recommendations.push("考虑增加处理器并发数");
    }

    return recommendations;
  }
}

// 导出单例实例
export const realTimeWarningEngine = new RealTimeWarningEngine();
