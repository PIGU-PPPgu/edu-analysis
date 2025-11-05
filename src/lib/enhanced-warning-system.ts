// 增强预警系统
// 提供智能预警规则、自动触发机制、多级预警和预警分析功能

import { supabase } from "@/integrations/supabase/client";

export interface EnhancedWarningRule {
  id: string;
  name: string;
  description: string;
  category: "academic" | "behavioral" | "attendance" | "comprehensive";
  severity: "low" | "medium" | "high" | "critical";
  conditions: WarningCondition[];
  triggers: WarningTrigger[];
  actions: WarningAction[];
  isActive: boolean;
  priority: number;
  autoResolve: boolean;
  escalationRules?: EscalationRule[];
}

export interface WarningCondition {
  type:
    | "score_threshold"
    | "score_trend"
    | "attendance_rate"
    | "behavioral_score"
    | "custom";
  field: string;
  operator:
    | "lt"
    | "lte"
    | "gt"
    | "gte"
    | "eq"
    | "neq"
    | "between"
    | "consecutive";
  value: number | string | [number, number];
  timeWindow?: string; // '1w', '1m', '3m' 等
  consecutiveCount?: number;
}

export interface WarningTrigger {
  type: "immediate" | "scheduled" | "batch";
  frequency?: "daily" | "weekly" | "monthly";
  time?: string; // HH:MM 格式
  conditions: "all" | "any";
}

export interface WarningAction {
  type:
    | "notify_teacher"
    | "notify_parent"
    | "create_task"
    | "send_email"
    | "log_event";
  recipients?: string[];
  template?: string;
  data?: Record<string, any>;
}

export interface EscalationRule {
  afterDays: number;
  newSeverity: "medium" | "high" | "critical";
  additionalActions: WarningAction[];
}

export interface WarningAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  studentId: string;
  studentName: string;
  className: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  triggerData: Record<string, any>;
  status: "active" | "acknowledged" | "resolved" | "escalated";
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
  notes?: string[];
}

export interface WarningAnalytics {
  totalWarnings: number;
  warningsByCategory: Record<string, number>;
  warningsBySeverity: Record<string, number>;
  warningsByStatus: Record<string, number>;
  trendAnalysis: {
    thisWeek: number;
    lastWeek: number;
    changeRate: number;
  };
  topRiskyStudents: Array<{
    studentId: string;
    studentName: string;
    className: string;
    warningCount: number;
    highestSeverity: string;
  }>;
  resolutionStats: {
    averageResolutionTime: number; // 小时
    resolutionRate: number; // 百分比
  };
}

// 预警系统管理器
export class EnhancedWarningSystem {
  // 预设预警规则模板
  static getDefaultRules(): Partial<EnhancedWarningRule>[] {
    return [
      {
        name: "连续低分预警",
        description: "学生连续多次考试成绩低于60分",
        category: "academic",
        severity: "high",
        conditions: [
          {
            type: "score_threshold",
            field: "score",
            operator: "lt",
            value: 60,
            consecutiveCount: 2,
          },
        ],
        triggers: [
          {
            type: "immediate",
            conditions: "all",
          },
        ],
        actions: [
          {
            type: "notify_teacher",
            template: "consecutive_low_score",
          },
          {
            type: "create_task",
            data: { taskType: "academic_support" },
          },
        ],
        isActive: true,
        priority: 1,
        autoResolve: false,
      },
      {
        name: "成绩急剧下降",
        description: "学生成绩相比之前下降超过20分",
        category: "academic",
        severity: "medium",
        conditions: [
          {
            type: "score_trend",
            field: "score_change",
            operator: "lt",
            value: -20,
            timeWindow: "1m",
          },
        ],
        triggers: [
          {
            type: "immediate",
            conditions: "all",
          },
        ],
        actions: [
          {
            type: "notify_teacher",
            template: "score_decline",
          },
        ],
        isActive: true,
        priority: 2,
        autoResolve: true,
      },
      {
        name: "整体成绩不佳",
        description: "学生整体平均分低于班级平均分15分以上",
        category: "academic",
        severity: "medium",
        conditions: [
          {
            type: "custom",
            field: "avg_score_gap",
            operator: "lt",
            value: -15,
            timeWindow: "1m",
          },
        ],
        triggers: [
          {
            type: "scheduled",
            frequency: "weekly",
            time: "09:00",
            conditions: "all",
          },
        ],
        actions: [
          {
            type: "notify_teacher",
            template: "below_average_performance",
          },
        ],
        isActive: true,
        priority: 3,
        autoResolve: false,
      },
      {
        name: "科目严重偏科",
        description: "单科成绩与其他科目平均分差距超过30分",
        category: "academic",
        severity: "high",
        conditions: [
          {
            type: "custom",
            field: "subject_score_gap",
            operator: "gt",
            value: 30,
            timeWindow: "1m",
          },
        ],
        triggers: [
          {
            type: "scheduled",
            frequency: "monthly",
            time: "10:00",
            conditions: "all",
          },
        ],
        actions: [
          {
            type: "notify_teacher",
            template: "subject_imbalance",
          },
          {
            type: "create_task",
            data: { taskType: "subject_support" },
          },
        ],
        isActive: true,
        priority: 2,
        autoResolve: false,
        escalationRules: [
          {
            afterDays: 30,
            newSeverity: "critical",
            additionalActions: [
              {
                type: "notify_parent",
                template: "escalated_subject_issue",
              },
            ],
          },
        ],
      },
    ];
  }

  // 评估学生是否触发预警
  static async evaluateStudent(
    studentId: string,
    rules: EnhancedWarningRule[]
  ): Promise<WarningAlert[]> {
    const alerts: WarningAlert[] = [];

    try {
      // 获取学生基本信息
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("student_id", studentId)
        .single();

      if (!student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      // 获取学生成绩数据
      const { data: grades } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);

      // 获取班级平均分数据（用于对比）
      const { data: classGrades } = await supabase
        .from("grade_data_new")
        .select("score, subject")
        .eq("class_name", student.class_name);

      // 评估每个规则
      for (const rule of rules.filter((r) => r.isActive)) {
        const evaluation = await this.evaluateRule(
          rule,
          student,
          grades || [],
          classGrades || []
        );

        if (evaluation.triggered) {
          const alert: WarningAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            ruleName: rule.name,
            studentId: student.student_id,
            studentName: student.name,
            className: student.class_name,
            severity: rule.severity,
            category: rule.category,
            title: rule.name,
            description: evaluation.description,
            triggerData: evaluation.data,
            status: "active",
            createdAt: new Date().toISOString(),
          };

          alerts.push(alert);
        }
      }
    } catch (error) {
      console.error("Error evaluating student warnings:", error);
    }

    return alerts;
  }

  // 评估单个规则
  private static async evaluateRule(
    rule: EnhancedWarningRule,
    student: any,
    grades: any[],
    classGrades: any[]
  ): Promise<{
    triggered: boolean;
    description: string;
    data: Record<string, any>;
  }> {
    let triggered = false;
    let description = "";
    const data: Record<string, any> = {};

    try {
      // 根据条件类型进行不同的评估
      for (const condition of rule.conditions) {
        const conditionResult = await this.evaluateCondition(
          condition,
          student,
          grades,
          classGrades
        );

        if (rule.triggers[0]?.conditions === "all") {
          triggered =
            triggered === false
              ? conditionResult.met
              : triggered && conditionResult.met;
        } else {
          triggered = triggered || conditionResult.met;
        }

        if (conditionResult.met) {
          description += conditionResult.description + " ";
          Object.assign(data, conditionResult.data);
        }
      }
    } catch (error) {
      console.error("Error evaluating rule:", error);
      return { triggered: false, description: "规则评估失败", data: {} };
    }

    return {
      triggered,
      description: description.trim() || rule.description,
      data,
    };
  }

  // 评估单个条件
  private static async evaluateCondition(
    condition: WarningCondition,
    student: any,
    grades: any[],
    classGrades: any[]
  ): Promise<{ met: boolean; description: string; data: Record<string, any> }> {
    const data: Record<string, any> = {};
    let met = false;
    let description = "";

    switch (condition.type) {
      case "score_threshold":
        const recentScores = grades.slice(0, condition.consecutiveCount || 1);
        const belowThreshold = recentScores.filter(
          (g) => g.score < (condition.value as number)
        );

        if (
          condition.operator === "consecutive" &&
          condition.consecutiveCount
        ) {
          met = belowThreshold.length >= condition.consecutiveCount;
          if (met) {
            description = `连续${condition.consecutiveCount}次成绩低于${condition.value}分`;
            data.consecutiveFailures = belowThreshold.length;
            data.scores = recentScores.map((g) => g.score);
          }
        } else {
          const latestScore = grades[0]?.score || 0;
          met = this.compareValues(
            latestScore,
            condition.operator,
            condition.value as number
          );
          if (met) {
            description = `最近成绩${latestScore}分${this.getOperatorText(condition.operator)}${condition.value}分`;
            data.latestScore = latestScore;
          }
        }
        break;

      case "score_trend":
        if (grades.length >= 2) {
          const recentScore = grades[0].score;
          const previousScore = grades[1].score;
          const change = recentScore - previousScore;

          met = this.compareValues(
            change,
            condition.operator,
            condition.value as number
          );
          if (met) {
            description = `成绩变化${change > 0 ? "+" : ""}${change.toFixed(1)}分，${this.getOperatorText(condition.operator)}${condition.value}分`;
            data.scoreChange = change;
            data.recentScore = recentScore;
            data.previousScore = previousScore;
          }
        }
        break;

      case "custom":
        if (condition.field === "avg_score_gap") {
          // 计算学生平均分与班级平均分的差距
          const studentAvg =
            grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
          const classAvgBySubject = this.calculateClassAverages(classGrades);
          const classOverallAvg =
            Object.values(classAvgBySubject).reduce(
              (sum: number, avg: any) => sum + avg,
              0
            ) / Object.keys(classAvgBySubject).length;
          const gap = studentAvg - classOverallAvg;

          met = this.compareValues(
            gap,
            condition.operator,
            condition.value as number
          );
          if (met) {
            description = `学生平均分${studentAvg.toFixed(1)}分，班级平均分${classOverallAvg.toFixed(1)}分，差距${Math.abs(gap).toFixed(1)}分`;
            data.studentAverage = studentAvg;
            data.classAverage = classOverallAvg;
            data.gap = gap;
          }
        } else if (condition.field === "subject_score_gap") {
          // 计算科目间分数差距
          const subjectScores = this.groupScoresBySubject(grades);
          const maxGap = this.calculateMaxSubjectGap(subjectScores);

          met = this.compareValues(
            maxGap.gap,
            condition.operator,
            condition.value as number
          );
          if (met) {
            description = `${maxGap.highSubject}(${maxGap.highScore}分)与${maxGap.lowSubject}(${maxGap.lowScore}分)差距${maxGap.gap}分`;
            data.subjectGap = maxGap;
          }
        }
        break;
    }

    return { met, description, data };
  }

  // 工具方法：比较值
  private static compareValues(
    actual: number,
    operator: string,
    expected: number | [number, number]
  ): boolean {
    switch (operator) {
      case "lt":
        return actual < (expected as number);
      case "lte":
        return actual <= (expected as number);
      case "gt":
        return actual > (expected as number);
      case "gte":
        return actual >= (expected as number);
      case "eq":
        return actual === (expected as number);
      case "neq":
        return actual !== (expected as number);
      case "between":
        const [min, max] = expected as [number, number];
        return actual >= min && actual <= max;
      default:
        return false;
    }
  }

  // 工具方法：获取操作符文本描述
  private static getOperatorText(operator: string): string {
    const texts: Record<string, string> = {
      lt: "低于",
      lte: "不高于",
      gt: "高于",
      gte: "不低于",
      eq: "等于",
      neq: "不等于",
    };
    return texts[operator] || operator;
  }

  // 工具方法：计算班级各科目平均分
  private static calculateClassAverages(
    classGrades: any[]
  ): Record<string, number> {
    const subjectGroups = classGrades.reduce(
      (groups, grade) => {
        if (!groups[grade.subject]) {
          groups[grade.subject] = [];
        }
        groups[grade.subject].push(grade.score);
        return groups;
      },
      {} as Record<string, number[]>
    );

    const averages: Record<string, number> = {};
    Object.entries(subjectGroups).forEach(([subject, scores]) => {
      averages[subject] =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return averages;
  }

  // 工具方法：按科目分组成绩
  private static groupScoresBySubject(grades: any[]): Record<string, number[]> {
    return grades.reduce(
      (groups, grade) => {
        if (!groups[grade.subject]) {
          groups[grade.subject] = [];
        }
        groups[grade.subject].push(grade.score);
        return groups;
      },
      {} as Record<string, number[]>
    );
  }

  // 工具方法：计算科目间最大差距
  private static calculateMaxSubjectGap(
    subjectScores: Record<string, number[]>
  ): {
    gap: number;
    highSubject: string;
    lowSubject: string;
    highScore: number;
    lowScore: number;
  } {
    const subjectAverages = Object.entries(subjectScores).map(
      ([subject, scores]) => ({
        subject,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      })
    );

    subjectAverages.sort((a, b) => b.average - a.average);

    const highest = subjectAverages[0];
    const lowest = subjectAverages[subjectAverages.length - 1];

    return {
      gap: highest.average - lowest.average,
      highSubject: highest.subject,
      lowSubject: lowest.subject,
      highScore: Math.round(highest.average * 10) / 10,
      lowScore: Math.round(lowest.average * 10) / 10,
    };
  }

  // 批量评估所有学生
  static async evaluateAllStudents(
    rules: EnhancedWarningRule[]
  ): Promise<WarningAlert[]> {
    try {
      // 获取所有学生
      const { data: students } = await supabase
        .from("students")
        .select("student_id");

      if (!students || students.length === 0) {
        return [];
      }

      const allAlerts: WarningAlert[] = [];

      // 分批处理，避免并发过多
      const batchSize = 10;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const batchPromises = batch.map((student) =>
          this.evaluateStudent(student.student_id, rules)
        );

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((alerts) => allAlerts.push(...alerts));
      }

      return allAlerts;
    } catch (error) {
      console.error("Error evaluating all students:", error);
      return [];
    }
  }

  // 保存预警记录到数据库
  static async saveWarningAlert(alert: WarningAlert): Promise<boolean> {
    try {
      const { error } = await supabase.from("warning_records").insert({
        student_id: alert.studentId,
        rule_id: alert.ruleId,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        description: alert.description,
        trigger_data: alert.triggerData,
        status: alert.status,
        created_at: alert.createdAt,
      });

      if (error) {
        console.error("Error saving warning alert:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error saving warning alert:", error);
      return false;
    }
  }

  // 获取预警分析数据
  static async getWarningAnalytics(
    timeRange: "week" | "month" | "quarter" = "month"
  ): Promise<WarningAnalytics> {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(now.getMonth() - 3);
          break;
      }

      // 获取预警记录
      const { data: warnings } = await supabase
        .from("warning_records")
        .select(
          `
          *,
          students:student_id (name, class_name)
        `
        )
        .gte("created_at", startDate.toISOString());

      if (!warnings) {
        return this.getEmptyAnalytics();
      }

      // 统计分析
      const analytics: WarningAnalytics = {
        totalWarnings: warnings.length,
        warningsByCategory: {},
        warningsBySeverity: {},
        warningsByStatus: {},
        trendAnalysis: {
          thisWeek: 0,
          lastWeek: 0,
          changeRate: 0,
        },
        topRiskyStudents: [],
        resolutionStats: {
          averageResolutionTime: 0,
          resolutionRate: 0,
        },
      };

      // 按类别统计
      warnings.forEach((warning) => {
        analytics.warningsByCategory[warning.category] =
          (analytics.warningsByCategory[warning.category] || 0) + 1;
        analytics.warningsBySeverity[warning.severity] =
          (analytics.warningsBySeverity[warning.severity] || 0) + 1;
        analytics.warningsByStatus[warning.status] =
          (analytics.warningsByStatus[warning.status] || 0) + 1;
      });

      // 趋势分析
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(now.getDate() - 14);

      analytics.trendAnalysis.thisWeek = warnings.filter(
        (w) => new Date(w.created_at) >= oneWeekAgo
      ).length;

      analytics.trendAnalysis.lastWeek = warnings.filter(
        (w) =>
          new Date(w.created_at) >= twoWeeksAgo &&
          new Date(w.created_at) < oneWeekAgo
      ).length;

      analytics.trendAnalysis.changeRate =
        analytics.trendAnalysis.lastWeek > 0
          ? ((analytics.trendAnalysis.thisWeek -
              analytics.trendAnalysis.lastWeek) /
              analytics.trendAnalysis.lastWeek) *
            100
          : 0;

      // 高风险学生统计
      const studentWarningCounts = warnings.reduce(
        (counts, warning) => {
          const key = warning.student_id;
          if (!counts[key]) {
            counts[key] = {
              studentId: warning.student_id,
              studentName: (warning as any).students?.name || "Unknown",
              className: (warning as any).students?.class_name || "Unknown",
              warningCount: 0,
              highestSeverity: "low",
            };
          }
          counts[key].warningCount++;

          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          if (
            severityOrder[warning.severity as keyof typeof severityOrder] >
            severityOrder[
              counts[key].highestSeverity as keyof typeof severityOrder
            ]
          ) {
            counts[key].highestSeverity = warning.severity;
          }

          return counts;
        },
        {} as Record<string, any>
      );

      analytics.topRiskyStudents = Object.values(studentWarningCounts)
        .sort((a: any, b: any) => b.warningCount - a.warningCount)
        .slice(0, 10);

      // 解决统计
      const resolvedWarnings = warnings.filter((w) => w.status === "resolved");
      analytics.resolutionStats.resolutionRate =
        (resolvedWarnings.length / warnings.length) * 100;

      if (resolvedWarnings.length > 0) {
        const totalResolutionTime = resolvedWarnings.reduce(
          (total, warning) => {
            if (warning.resolved_at) {
              const created = new Date(warning.created_at);
              const resolved = new Date(warning.resolved_at);
              return total + (resolved.getTime() - created.getTime());
            }
            return total;
          },
          0
        );

        analytics.resolutionStats.averageResolutionTime =
          totalResolutionTime / resolvedWarnings.length / (1000 * 60 * 60); // 转换为小时
      }

      return analytics;
    } catch (error) {
      console.error("Error getting warning analytics:", error);
      return this.getEmptyAnalytics();
    }
  }

  // 空分析数据
  private static getEmptyAnalytics(): WarningAnalytics {
    return {
      totalWarnings: 0,
      warningsByCategory: {},
      warningsBySeverity: {},
      warningsByStatus: {},
      trendAnalysis: {
        thisWeek: 0,
        lastWeek: 0,
        changeRate: 0,
      },
      topRiskyStudents: [],
      resolutionStats: {
        averageResolutionTime: 0,
        resolutionRate: 0,
      },
    };
  }
}
