import { supabase } from "../integrations/supabase/client";
import { warningAnalysisCache } from "../utils/performanceCache";
import { generateAIAnalysis } from "./aiService";

// AI分析基础数据接口
export interface BasicAIAnalysis {
  analysisId: string;
  dataType:
    | "warning_overview"
    | "exam_analysis"
    | "student_risk"
    | "trend_analysis";
  scope: "global" | "class" | "student" | "exam";

  // 核心分析结果
  riskSummary: {
    overallRisk: "low" | "medium" | "high" | "critical";
    riskScore: number; // 0-100
    primaryConcerns: string[];
    improvementAreas: string[];
  };

  // 关键模式识别
  patterns: {
    trendDirection: "improving" | "stable" | "declining";
    anomalies: Array<{
      type: string;
      description: string;
      severity: "low" | "medium" | "high";
      affectedCount: number;
    }>;
    correlations: Array<{
      factor1: string;
      factor2: string;
      strength: number; // -1 to 1
      description: string;
    }>;
  };

  // 智能建议
  recommendations: {
    immediate: Array<{
      action: string;
      priority: "high" | "medium" | "low";
      expectedImpact: string;
      timeframe: string;
    }>;
    strategic: Array<{
      action: string;
      rationale: string;
      expectedOutcome: string;
      resources: string[];
    }>;
  };

  // 元数据
  metadata: {
    generatedAt: string;
    dataVersion: string;
    confidence: number; // 0-1
    processingTime: number; // ms
    dataPoints: number;
  };
}

// AI分析请求参数
export interface AIAnalysisRequest {
  dataType: BasicAIAnalysis["dataType"];
  scope: BasicAIAnalysis["scope"];
  targetId?: string; // 班级ID、学生ID或考试ID
  timeRange?: string; // '7d', '30d', '90d', '180d', '1y'
  includeHistorical?: boolean;
  analysisDepth?: "basic" | "detailed";
}

// 数据聚合器 - 收集分析所需的数据
class AnalysisDataAggregator {
  // 获取预警概览数据
  async getWarningOverviewData(scope: string, targetId?: string): Promise<any> {
    // 先检查表是否存在和字段是否存在
    const { data: tableCheck } = await supabase
      .from("warning_records")
      .select("id")
      .limit(1);

    // 如果表不存在或查询失败，返回空数据
    if (!tableCheck && tableCheck !== null) {
      console.warn("warning_records表不存在或无法访问");
      return [];
    }

    let query = supabase
      .from("warning_records")
      .select(
        `
        id,
        status,
        created_at,
        resolved_at,
        student_id,
        warning_rules!inner(name, description, severity),
        students!inner(name, class_id, classes!inner(grade))
      `
      )
      .in("status", ["active", "resolved", "dismissed"]); // 包含所有状态来显示更完整的数据

    // 根据范围过滤
    if (scope === "class" && targetId) {
      query = query.eq("students.class_id", targetId);
    } else if (scope === "student" && targetId) {
      query = query.eq("student_id", targetId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  // 获取考试分析数据
  async getExamAnalysisData(examId: string): Promise<any> {
    // 先获取考试信息
    const examData = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examData.error) throw examData.error;

    // 使用考试标题获取成绩数据
    const gradeData = await supabase
      .from("grade_data_new")
      .select(
        `
        total_score,
        student_id,
        name,
        class_name
      `
      )
      .eq("exam_title", examData.data?.title || "");

    if (gradeData.error) {
      console.warn("获取成绩数据失败:", gradeData.error);
      return {
        exam: examData.data,
        grades: [],
      };
    }

    return {
      exam: examData.data,
      grades: gradeData.data || [],
    };
  }

  // 获取学生风险数据
  async getStudentRiskData(studentId: string, timeRange: string = "90d"): Promise<any> {
    // 计算时间范围
    const endDate = new Date();
    const startDate = new Date();
    const days = parseInt(timeRange) || 90;
    startDate.setDate(endDate.getDate() - days);

    const [warningData, gradeData, attendanceData] = await Promise.all([
      supabase
        .from("warning_records")
        .select(
          `
          id,
          status,
          severity,
          created_at,
          warning_rules!inner(name, description)
        `
        )
        .eq("student_id", studentId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("grade_data")
        .select("*")
        .eq("student_id", studentId)
        .gte("exam_date", startDate.toISOString().split("T")[0])
        .order("exam_date", { ascending: true })
        .limit(50),

      // 如果有考勤数据表的话
      Promise.resolve(null),
    ]);

    return {
      warnings: warningData.data || [],
      grades: gradeData.data || [],
      attendance: attendanceData || [],
    };
  }

  // 获取趋势分析数据
  async getTrendData(
    scope: string,
    targetId?: string,
    timeRange: string = "180d"
  ): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();

    // 根据时间范围计算开始日期
    const days = parseInt(timeRange) || 180;
    startDate.setDate(endDate.getDate() - days);

    try {
      // 根据scope获取不同的数据
      if (scope === "student" && targetId) {
        // 学生成绩趋势
        const { data, error } = await supabase
          .from("grade_data")
          .select("total_score, exam_date, exam_title")
          .eq("student_id", targetId)
          .gte("exam_date", startDate.toISOString().split("T")[0])
          .order("exam_date", { ascending: true });

        if (error) throw error;

        return {
          dataPoints: (data || []).map((d: any) => ({
            date: d.exam_date,
            value: d.total_score || 0,
            label: d.exam_title,
          })),
        };
      } else if (scope === "class" && targetId) {
        // 班级平均分趋势
        const { data, error } = await supabase
          .from("grade_data")
          .select("total_score, exam_date, exam_title")
          .eq("class_name", targetId)
          .gte("exam_date", startDate.toISOString().split("T")[0])
          .order("exam_date", { ascending: true });

        if (error) throw error;

        // 按考试分组计算平均分
        const examMap = new Map();
        (data || []).forEach((d: any) => {
          const key = d.exam_title;
          if (!examMap.has(key)) {
            examMap.set(key, { date: d.exam_date, scores: [], label: d.exam_title });
          }
          examMap.get(key).scores.push(d.total_score || 0);
        });

        const dataPoints = Array.from(examMap.values()).map((exam: any) => ({
          date: exam.date,
          value: exam.scores.reduce((a: number, b: number) => a + b, 0) / exam.scores.length,
          label: exam.label,
        }));

        return { dataPoints };
      } else {
        // 全局预警趋势
        const { data, error } = await supabase
          .from("warning_records")
          .select("created_at, status")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        // 按周聚合数据
        const weeklyMap = new Map();
        (data || []).forEach((d: any) => {
          const date = new Date(d.created_at);
          const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
          weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
        });

        const dataPoints = Array.from(weeklyMap.entries()).map(([week, count]) => ({
          date: week,
          value: count,
          label: week,
        }));

        return { dataPoints };
      }
    } catch (error) {
      console.error("[getTrendData] 获取趋势数据失败:", error);
      return { dataPoints: [] };
    }
  }
}

// AI分析处理器 - 核心分析逻辑
class AIAnalysisProcessor {
  private dataAggregator = new AnalysisDataAggregator();

  // 处理预警概览分析
  async processWarningOverview(
    scope: string,
    targetId?: string
  ): Promise<BasicAIAnalysis> {
    const startTime = performance.now();

    try {
      const warningData = await this.dataAggregator.getWarningOverviewData(
        scope,
        targetId
      );

      // 计算风险评分
      const riskScore = this.calculateRiskScore(warningData);
      const overallRisk = this.determineRiskLevel(riskScore);

      // 识别主要问题和改进领域
      const primaryConcerns = this.identifyPrimaryConcerns(warningData);
      const improvementAreas = this.identifyImprovementAreas(warningData);

      // 模式识别
      const patterns = this.identifyPatterns(warningData);

      // 生成建议
      const recommendations = await this.generateRecommendations(
        warningData,
        riskScore
      );

      const processingTime = performance.now() - startTime;

      return {
        analysisId: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dataType: "warning_overview",
        scope: scope as any,
        riskSummary: {
          overallRisk,
          riskScore,
          primaryConcerns,
          improvementAreas,
        },
        patterns,
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: "1.0",
          confidence: this.calculateConfidence(warningData.length),
          processingTime: Math.round(processingTime),
          dataPoints: warningData.length,
        },
      };
    } catch (error) {
      console.error("[AIAnalysisProcessor] 预警概览分析失败:", error);
      throw error;
    }
  }

  // 处理考试分析
  async processExamAnalysis(examId: string): Promise<BasicAIAnalysis> {
    const startTime = performance.now();

    try {
      const { exam, grades } =
        await this.dataAggregator.getExamAnalysisData(examId);

      // 计算考试表现指标
      const scores = grades
        .map((g) => g.total_score)
        .filter((s) => s !== null && s !== undefined);
      const avgScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      // 使用动态及格线，默认60分
      const passingThreshold = (await this.getPassingThreshold(examId)) || 60;
      const passRate =
        scores.length > 0
          ? scores.filter((s) => s >= passingThreshold).length / scores.length
          : 0;

      // 风险评估
      const riskScore = this.calculateExamRiskScore(avgScore, passRate, scores);
      const overallRisk = this.determineRiskLevel(riskScore);

      // 识别异常和模式
      const patterns = this.identifyExamPatterns(grades, exam);

      // 生成针对性建议
      const recommendations = await this.generateExamRecommendations(
        exam,
        grades,
        riskScore
      );

      const processingTime = performance.now() - startTime;

      return {
        analysisId: `ea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dataType: "exam_analysis",
        scope: "exam",
        riskSummary: {
          overallRisk,
          riskScore,
          primaryConcerns: this.identifyExamConcerns(
            grades,
            avgScore,
            passRate
          ),
          improvementAreas: this.identifyExamImprovements(grades, exam),
        },
        patterns,
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: "1.0",
          confidence: this.calculateConfidence(grades.length),
          processingTime: Math.round(processingTime),
          dataPoints: grades.length,
        },
      };
    } catch (error) {
      console.error("[AIAnalysisProcessor] 考试分析失败:", error);
      throw error;
    }
  }

  // 计算风险评分 (0-100)
  private calculateRiskScore(warningData: any[]): number {
    const weights = { low: 1, medium: 3, high: 5, critical: 10 };
    let score = 0;

    warningData.forEach((warning) => {
      const severity = warning.warning_rules?.severity || "low";
      score += weights[severity as keyof typeof weights] || 1;
    });

    // 归一化到0-100
    const maxPossibleScore = warningData.length * 10;
    return Math.min(100, (score / maxPossibleScore) * 100);
  }

  // 确定风险等级
  private determineRiskLevel(
    score: number
  ): "low" | "medium" | "high" | "critical" {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 30) return "medium";
    return "low";
  }

  // 识别主要关注点
  private identifyPrimaryConcerns(warningData: any[]): string[] {
    const categoryCounts = new Map<string, number>();
    warningData.forEach((w) => {
      const category = w.warning_rules?.name;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });

    if (categoryCounts.size === 0) return ["暂无明显问题"];

    const sortedCategories = [...categoryCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    );

    return sortedCategories
      .slice(0, 3)
      .map(
        ([category]) =>
          `主要问题集中在 "${this.getCategoryDisplayName(category)}"`
      );
  }

  // 识别改进领域
  private identifyImprovementAreas(warningData: any[]): string[] {
    const categoryCounts = new Map<
      string,
      { total: number; highSeverity: number }
    >();

    warningData.forEach((w) => {
      const category = w.warning_rules?.name;
      const severity = w.warning_rules?.severity || "low";
      if (category) {
        if (!categoryCounts.has(category)) {
          categoryCounts.set(category, { total: 0, highSeverity: 0 });
        }
        const counts = categoryCounts.get(category)!;
        counts.total++;
        if (severity === "high" || severity === "critical") {
          counts.highSeverity++;
        }
      }
    });

    if (categoryCounts.size === 0) return ["整体情况良好，继续保持"];

    const sortedCategories = [...categoryCounts.entries()].sort((a, b) => {
      // 优先看高风险数量，其次看总数
      if (b[1].highSeverity !== a[1].highSeverity) {
        return b[1].highSeverity - a[1].highSeverity;
      }
      return b[1].total - a[1].total;
    });

    return sortedCategories
      .slice(0, 3)
      .map(
        ([category, counts]) =>
          `需关注 "${this.getCategoryDisplayName(category)}" 方面 (高风险: ${counts.highSeverity}, 总数: ${counts.total})`
      );
  }

  // 识别模式
  private identifyPatterns(warningData: any[]): BasicAIAnalysis["patterns"] {
    return {
      trendDirection: this.analyzeTrendDirection(warningData),
      anomalies: this.identifyAnomalies(warningData),
      correlations: this.identifyCorrelations(warningData),
    };
  }

  // 生成建议
  private async generateRecommendations(
    warningData: any[],
    riskScore: number
  ): Promise<BasicAIAnalysis["recommendations"]> {
    const immediate = [];
    const strategic = [];

    if (riskScore > 70) {
      immediate.push({
        action: "立即关注高风险学生",
        priority: "high" as const,
        expectedImpact: "快速降低严重风险",
        timeframe: "1-3天",
      });
    }

    if (riskScore > 40) {
      strategic.push({
        action: "制定系统性预警干预计划",
        rationale: "多个领域出现问题，需要综合干预",
        expectedOutcome: "全面改善学生表现",
        resources: ["班主任", "学科老师", "家长配合"],
      });
    }

    return { immediate, strategic };
  }

  // 计算考试风险评分
  private calculateExamRiskScore(
    avgScore: number,
    passRate: number,
    scores: number[]
  ): number {
    let riskScore = 0;

    // 平均分因子 (40% 权重)
    if (avgScore < 50) riskScore += 40;
    else if (avgScore < 70) riskScore += 20;
    else if (avgScore < 80) riskScore += 10;

    // 及格率因子 (35% 权重)
    if (passRate < 0.5) riskScore += 35;
    else if (passRate < 0.7) riskScore += 20;
    else if (passRate < 0.8) riskScore += 10;

    // 分数分布因子 (25% 权重)
    const std = this.calculateStandardDeviation(scores);
    if (std > 25)
      riskScore += 25; // 分化严重
    else if (std > 15) riskScore += 15;
    else if (std > 10) riskScore += 5;

    return Math.min(100, riskScore);
  }

  // 识别考试模式
  private identifyExamPatterns(
    grades: any[],
    exam: any
  ): BasicAIAnalysis["patterns"] {
    const scores = grades
      .map((g) => g.total_score)
      .filter((s) => s !== null && s !== undefined);

    return {
      trendDirection: "stable", // 需要历史数据对比
      anomalies: this.identifyScoreAnomalies(scores),
      correlations: this.identifyGradeCorrelations(grades),
    };
  }

  // 生成考试建议
  private async generateExamRecommendations(
    exam: any,
    grades: any[],
    riskScore: number
  ): Promise<BasicAIAnalysis["recommendations"]> {
    const immediate = [];
    const strategic = [];

    const scores = grades
      .map((g) => g.total_score)
      .filter((s) => s !== null && s !== undefined);
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    // 注意：这里无法获取考试ID，使用默认60分阈值
    // 在有考试上下文的地方应该使用 examScoreCalculationService
    const passRate =
      scores.length > 0
        ? scores.filter((s) => s >= 60).length / scores.length
        : 0;

    if (passRate < 0.6) {
      immediate.push({
        action: "组织补救教学",
        priority: "high" as const,
        expectedImpact: "提升不及格学生成绩",
        timeframe: "1-2周",
      });
    }

    if (avgScore < 70) {
      strategic.push({
        action: "调整教学策略和难度",
        rationale: "整体成绩偏低，需要检视教学方法",
        expectedOutcome: "提升整体教学效果",
        resources: ["教研组", "教学资源", "额外辅导时间"],
      });
    }

    return { immediate, strategic };
  }

  // 获取及格阈值
  private async getPassingThreshold(examId: string): Promise<number | null> {
    try {
      // 尝试从 examScoreCalculationService 获取配置的阈值
      const { examScoreCalculationService } = await import(
        "./examScoreCalculationService"
      );
      const config =
        await examScoreCalculationService.getSubjectScoreConfig(examId);

      if (config && config.length > 0) {
        // 使用主科目的平均及格分数
        const passingScores = config
          .map((c) => c.passing_score)
          .filter((s) => s != null);
        if (passingScores.length > 0) {
          return (
            passingScores.reduce((a, b) => a + b, 0) / passingScores.length
          );
        }
      }

      return null; // 返回null表示使用默认值
    } catch (error) {
      console.warn("获取及格阈值失败，使用默认值:", error);
      return null;
    }
  }

  // 辅助方法
  private getCategoryDisplayName(category: string): string {
    const map = {
      grade: "成绩相关",
      attendance: "出勤问题",
      behavior: "行为表现",
      homework: "作业完成",
      progress: "学习进度",
      composite: "综合表现",
    };
    return map[category] || category;
  }

  private analyzeTrendDirection(
    warningData: any[]
  ): "improving" | "stable" | "declining" {
    // 简化版本：根据最近的创建时间分布判断
    if (warningData.length === 0) return "stable";

    const now = new Date();
    const recentWarnings = warningData.filter((w) => {
      const createdAt = new Date(w.created_at);
      const daysDiff =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    const recentRatio = recentWarnings.length / warningData.length;

    if (recentRatio > 0.6) return "declining";
    if (recentRatio < 0.3) return "improving";
    return "stable";
  }

  private identifyAnomalies(
    warningData: any[]
  ): BasicAIAnalysis["patterns"]["anomalies"] {
    const anomalies = [];

    // 检查严重程度异常集中
    const severityCounts = {};
    warningData.forEach((w) => {
      const severity = w.warning_rules?.severity || "low";
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });

    if (severityCounts["high"] > 5) {
      anomalies.push({
        type: "high_severity_cluster",
        description: "高严重程度预警集中出现",
        severity: "high" as const,
        affectedCount: severityCounts["high"],
      });
    }

    return anomalies;
  }

  private identifyCorrelations(
    warningData: any[]
  ): BasicAIAnalysis["patterns"]["correlations"] {
    // 简化版本的相关性分析
    return [];
  }

  private identifyScoreAnomalies(
    scores: number[]
  ): BasicAIAnalysis["patterns"]["anomalies"] {
    const anomalies = [];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const std = this.calculateStandardDeviation(scores);

    // 检查极端低分
    const lowScores = scores.filter((s) => s < avg - 2 * std);
    if (lowScores.length > scores.length * 0.1) {
      anomalies.push({
        type: "extreme_low_scores",
        description: "存在异常低分群体",
        severity: "medium" as const,
        affectedCount: lowScores.length,
      });
    }

    return anomalies;
  }

  private identifyGradeCorrelations(
    grades: any[]
  ): BasicAIAnalysis["patterns"]["correlations"] {
    // 简化版本
    return [];
  }

  private identifyExamConcerns(
    grades: any[],
    avgScore: number,
    passRate: number
  ): string[] {
    const concerns = [];

    if (avgScore < 60) concerns.push("整体成绩偏低");
    if (passRate < 0.6) concerns.push("及格率不达标");

    const scores = grades.map((g) => g.score).filter((s) => s !== null);
    const std = this.calculateStandardDeviation(scores);
    if (std > 20) concerns.push("成绩分化严重");

    return concerns;
  }

  private identifyExamImprovements(grades: any[], exam: any): string[] {
    const improvements = [];

    const scores = grades.map((g) => g.score).filter((s) => s !== null);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore < 70) improvements.push("提升整体教学质量");

    const lowScoreCount = scores.filter((s) => s < 40).length;
    if (lowScoreCount > 0) improvements.push("加强后进生辅导");

    return improvements;
  }

  private calculateStandardDeviation(numbers: number[]): number {
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map((num) => Math.pow(num - avg, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateConfidence(dataPoints: number): number {
    // 基于数据点数量计算置信度
    if (dataPoints >= 100) return 0.95;
    if (dataPoints >= 50) return 0.85;
    if (dataPoints >= 20) return 0.75;
    if (dataPoints >= 10) return 0.65;
    return 0.5;
  }

  // 学生风险分析
  async processStudentRiskAnalysis(
    studentId: string,
    timeRange: string
  ): Promise<BasicAIAnalysis> {
    const startTime = Date.now();

    // 获取学生数据
    const aggregator = new AnalysisDataAggregator();
    const studentData = await aggregator.getStudentRiskData(studentId, timeRange);

    if (!studentData || studentData.grades.length === 0) {
      // 无数据返回默认低风险
      return {
        analysisId: `student_risk_${studentId}_${Date.now()}`,
        dataType: "student_risk",
        scope: "student",
        riskSummary: {
          overallRisk: "low",
          riskScore: 0,
          primaryConcerns: ["暂无足够数据进行评估"],
          improvementAreas: ["建议尽快导入学生成绩数据"],
        },
        patterns: {
          trendDirection: "stable",
          anomalies: [],
          correlations: [],
        },
        recommendations: {
          immediate: [{
            action: "导入学生成绩数据",
            priority: "high",
            expectedImpact: "建立学生学习档案",
            timeframe: "立即",
          }],
          strategic: [],
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: "1.0",
          confidence: 0,
          processingTime: Date.now() - startTime,
          dataPoints: 0,
        },
      };
    }

    // 计算风险因子
    const riskFactors = this.calculateStudentRiskFactors(studentData);
    const riskScore = riskFactors.totalScore;
    const overallRisk = this.mapRiskScoreToLevel(riskScore);

    // 识别关注点
    const primaryConcerns = this.identifyStudentConcerns(riskFactors, studentData);
    const improvementAreas = this.identifyStudentImprovements(riskFactors, studentData);

    // 分析模式
    const patterns = {
      trendDirection: this.analyzeStudentTrend(studentData.grades),
      anomalies: this.identifyStudentAnomalies(studentData),
      correlations: this.identifyStudentCorrelations(studentData),
    };

    // 生成建议
    const recommendations = this.generateStudentRecommendations(riskFactors, patterns);

    return {
      analysisId: `student_risk_${studentId}_${Date.now()}`,
      dataType: "student_risk",
      scope: "student",
      riskSummary: {
        overallRisk,
        riskScore: Math.round(riskScore),
        primaryConcerns,
        improvementAreas,
      },
      patterns,
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataVersion: "1.0",
        confidence: this.calculateConfidence(studentData.grades.length),
        processingTime: Date.now() - startTime,
        dataPoints: studentData.grades.length + (studentData.warnings?.length || 0),
      },
    };
  }

  // 趋势分析
  async processTrendAnalysis(
    scope: string,
    targetId?: string,
    timeRange: string = "180d"
  ): Promise<BasicAIAnalysis> {
    const startTime = Date.now();

    // 获取趋势数据
    const aggregator = new AnalysisDataAggregator();
    const trendData = await aggregator.getTrendData(scope, targetId, timeRange);

    if (!trendData || trendData.dataPoints.length < 2) {
      // 数据不足
      return {
        analysisId: `trend_${scope}_${Date.now()}`,
        dataType: "trend_analysis",
        scope: scope as any,
        riskSummary: {
          overallRisk: "low",
          riskScore: 0,
          primaryConcerns: ["数据不足，无法进行趋势分析"],
          improvementAreas: ["需要至少2个时间点的数据"],
        },
        patterns: {
          trendDirection: "stable",
          anomalies: [],
          correlations: [],
        },
        recommendations: {
          immediate: [],
          strategic: [],
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: "1.0",
          confidence: 0,
          processingTime: Date.now() - startTime,
          dataPoints: trendData.dataPoints.length,
        },
      };
    }

    // 分析趋势
    const trendDirection = this.analyzeTrendDirection(trendData.dataPoints);
    const trendStrength = this.calculateTrendStrength(trendData.dataPoints);
    const anomalies = this.identifyTrendAnomalies(trendData.dataPoints);
    const forecast = this.generateTrendForecast(trendData.dataPoints);

    // 计算风险评分
    const riskScore = this.calculateTrendRiskScore(trendDirection, trendStrength, anomalies);
    const overallRisk = this.mapRiskScoreToLevel(riskScore);

    // 识别关注点
    const primaryConcerns = this.identifyTrendConcerns(trendDirection, trendStrength, anomalies);
    const improvementAreas = this.identifyTrendImprovements(trendDirection, forecast);

    // 生成建议
    const recommendations = this.generateTrendRecommendations(trendDirection, trendStrength, forecast);

    return {
      analysisId: `trend_${scope}_${Date.now()}`,
      dataType: "trend_analysis",
      scope: scope as any,
      riskSummary: {
        overallRisk,
        riskScore: Math.round(riskScore),
        primaryConcerns,
        improvementAreas,
      },
      patterns: {
        trendDirection,
        anomalies,
        correlations: [],
      },
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataVersion: "1.0",
        confidence: this.calculateConfidence(trendData.dataPoints.length),
        processingTime: Date.now() - startTime,
        dataPoints: trendData.dataPoints.length,
      },
    };
  }

  // ==================== 学生风险分析辅助方法 ====================

  private calculateStudentRiskFactors(studentData: any): {
    gradeRisk: number;
    trendRisk: number;
    warningRisk: number;
    totalScore: number;
  } {
    const grades = studentData.grades || [];
    const warnings = studentData.warnings || [];

    // 成绩风险 (40%权重)
    let gradeRisk = 0;
    if (grades.length > 0) {
      const avgScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / grades.length;
      if (avgScore < 40) gradeRisk = 40;
      else if (avgScore < 60) gradeRisk = 25;
      else if (avgScore < 75) gradeRisk = 10;
    }

    // 趋势风险 (30%权重)
    let trendRisk = 0;
    const trend = this.analyzeStudentTrend(grades);
    if (trend === "declining") trendRisk = 30;
    else if (trend === "stable" && grades.length > 0) {
      const avgScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / grades.length;
      if (avgScore < 70) trendRisk = 15;
    }

    // 预警风险 (30%权重)
    const warningRisk = Math.min(warnings.length * 6, 30);

    const totalScore = gradeRisk + trendRisk + warningRisk;

    return { gradeRisk, trendRisk, warningRisk, totalScore };
  }

  private analyzeStudentTrend(grades: any[]): "improving" | "stable" | "declining" {
    if (grades.length < 2) return "stable";

    // 按日期排序
    const sorted = [...grades].sort((a, b) =>
      new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
    );

    // 简单线性回归
    const scores = sorted.map(g => g.score || 0);
    const n = scores.length;
    const indices = scores.map((_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 2) return "improving";
    if (slope < -2) return "declining";
    return "stable";
  }

  private identifyStudentConcerns(riskFactors: any, studentData: any): string[] {
    const concerns = [];

    if (riskFactors.gradeRisk > 20) {
      concerns.push("整体成绩偏低，需要加强基础学习");
    }

    if (riskFactors.trendRisk > 15) {
      concerns.push("成绩呈下降趋势，需要及时干预");
    }

    if (riskFactors.warningRisk > 15) {
      concerns.push(`存在${studentData.warnings?.length || 0}个活跃预警，需要重点关注`);
    }

    if (concerns.length === 0) {
      concerns.push("学习状态良好");
    }

    return concerns;
  }

  private identifyStudentImprovements(riskFactors: any, studentData: any): string[] {
    const improvements = [];

    if (riskFactors.gradeRisk > 0) {
      improvements.push("提升学科薄弱环节");
    }

    if (riskFactors.trendRisk > 0) {
      improvements.push("稳定成绩表现");
    }

    if (riskFactors.warningRisk > 0) {
      improvements.push("解决现有预警问题");
    }

    if (improvements.length === 0) {
      improvements.push("保持当前学习状态");
    }

    return improvements;
  }

  private identifyStudentAnomalies(studentData: any): BasicAIAnalysis["patterns"]["anomalies"] {
    const anomalies: BasicAIAnalysis["patterns"]["anomalies"] = [];
    const grades = studentData.grades || [];

    if (grades.length < 3) return anomalies;

    // 检测成绩突变
    for (let i = 1; i < grades.length; i++) {
      const current = grades[i].score || 0;
      const previous = grades[i - 1].score || 0;
      const diff = Math.abs(current - previous);

      if (diff > 20) {
        anomalies.push({
          type: "grade_spike",
          description: `成绩波动较大: ${previous} → ${current}`,
          severity: diff > 30 ? "high" : "medium",
          affectedCount: 1,
        });
      }
    }

    return anomalies;
  }

  private identifyStudentCorrelations(studentData: any): BasicAIAnalysis["patterns"]["correlations"] {
    // 简化版本，实际可以分析科目间相关性
    return [];
  }

  private generateStudentRecommendations(riskFactors: any, patterns: any): BasicAIAnalysis["recommendations"] {
    const immediate = [];
    const strategic = [];

    if (riskFactors.totalScore > 50) {
      immediate.push({
        action: "安排一对一辅导",
        priority: "high" as const,
        expectedImpact: "快速提升学习效果",
        timeframe: "本周内",
      });
    }

    if (patterns.trendDirection === "declining") {
      immediate.push({
        action: "分析成绩下降原因",
        priority: "high" as const,
        expectedImpact: "找到问题根源",
        timeframe: "3天内",
      });
    }

    if (riskFactors.gradeRisk > 20) {
      strategic.push({
        action: "制定个性化学习计划",
        rationale: "针对薄弱科目进行专项提升",
        expectedOutcome: "全面提高学科成绩",
        resources: ["学科教师", "学习资料", "课后辅导"],
      });
    }

    return { immediate, strategic };
  }

  // ==================== 趋势分析辅助方法 ====================

  private calculateTrendStrength(dataPoints: any[]): number {
    if (dataPoints.length < 2) return 0;

    const values = dataPoints.map(d => d.value || 0);
    const n = values.length;
    const indices = values.map((_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return Math.abs(slope);
  }

  private identifyTrendAnomalies(dataPoints: any[]): BasicAIAnalysis["patterns"]["anomalies"] {
    const anomalies: BasicAIAnalysis["patterns"]["anomalies"] = [];

    if (dataPoints.length < 3) return anomalies;

    const values = dataPoints.map(d => d.value || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);

    dataPoints.forEach((point, index) => {
      const value = point.value || 0;
      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > 2) {
        anomalies.push({
          type: "outlier",
          description: `${point.label || point.date} 数据异常: ${value}`,
          severity: zScore > 3 ? "high" : "medium",
          affectedCount: 1,
        });
      }
    });

    return anomalies;
  }

  private generateTrendForecast(dataPoints: any[]): { value: number; confidence: number } {
    if (dataPoints.length < 2) return { value: 0, confidence: 0 };

    const values = dataPoints.map(d => d.value || 0);
    const n = values.length;
    const indices = values.map((_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecastValue = slope * n + intercept;
    const confidence = Math.min(n / 10, 1); // 数据点越多，置信度越高

    return { value: forecastValue, confidence };
  }

  private calculateTrendRiskScore(direction: string, strength: number, anomalies: any[]): number {
    let riskScore = 0;

    if (direction === "declining") {
      riskScore += 40;
      riskScore += Math.min(strength * 5, 20);
    }

    riskScore += Math.min(anomalies.length * 10, 30);

    return Math.min(riskScore, 100);
  }

  private identifyTrendConcerns(direction: string, strength: number, anomalies: any[]): string[] {
    const concerns = [];

    if (direction === "declining") {
      concerns.push("整体趋势呈下降态势");
    }

    if (strength > 5) {
      concerns.push(`变化幅度较大 (斜率: ${strength.toFixed(2)})`);
    }

    if (anomalies.length > 0) {
      concerns.push(`检测到 ${anomalies.length} 个数据异常点`);
    }

    if (concerns.length === 0) {
      concerns.push("趋势平稳，表现良好");
    }

    return concerns;
  }

  private identifyTrendImprovements(direction: string, forecast: any): string[] {
    const improvements = [];

    if (direction === "declining") {
      improvements.push("扭转下降趋势");
    }

    if (forecast.value < 70) {
      improvements.push("提升整体水平");
    }

    if (improvements.length === 0) {
      improvements.push("保持当前发展趋势");
    }

    return improvements;
  }

  private generateTrendRecommendations(direction: string, strength: number, forecast: any): BasicAIAnalysis["recommendations"] {
    const immediate = [];
    const strategic = [];

    if (direction === "declining" && strength > 3) {
      immediate.push({
        action: "分析下降原因并制定干预措施",
        priority: "high" as const,
        expectedImpact: "阻止进一步下滑",
        timeframe: "本周内",
      });
    }

    if (forecast.value < 60 && forecast.confidence > 0.6) {
      strategic.push({
        action: "制定长期提升计划",
        rationale: "预测未来表现可能不理想",
        expectedOutcome: "逐步改善整体水平",
        resources: ["教学资源", "专项培训", "过程监控"],
      });
    }

    return { immediate, strategic };
  }
}

// 导出的主要服务类
export class AIAnalysisService {
  private processor = new AIAnalysisProcessor();

  // 获取AI分析结果
  async getAIAnalysis(request: AIAnalysisRequest): Promise<BasicAIAnalysis> {
    const cacheKey = this.generateCacheKey(request);

    return warningAnalysisCache.getAIAnalysis(
      async () => {
        console.log(`[AIAnalysisService] 生成AI分析: ${request.dataType}`);

        switch (request.dataType) {
          case "warning_overview":
            return this.processor.processWarningOverview(
              request.scope,
              request.targetId
            );

          case "exam_analysis":
            if (!request.targetId) {
              throw new Error("考试分析需要提供考试ID");
            }
            return this.processor.processExamAnalysis(request.targetId);

          case "student_risk":
            if (!request.targetId) {
              throw new Error("学生风险分析需要提供学生ID");
            }
            return this.processor.processStudentRiskAnalysis(
              request.targetId,
              request.timeRange || "90d"
            );

          case "trend_analysis":
            return this.processor.processTrendAnalysis(
              request.scope,
              request.targetId,
              request.timeRange || "180d"
            );

          default:
            throw new Error(`不支持的分析类型: ${request.dataType}`);
        }
      },
      request.dataType,
      cacheKey
    );
  }

  // 生成缓存键
  private generateCacheKey(request: AIAnalysisRequest): string {
    const parts = [
      request.dataType,
      request.scope,
      request.targetId || "global",
      request.timeRange || "30d",
    ];
    return btoa(JSON.stringify(parts)).replace(/[^a-zA-Z0-9]/g, "_");
  }

  // 批量预热分析缓存
  async preloadAnalysisCache(): Promise<void> {
    const commonRequests: AIAnalysisRequest[] = [
      { dataType: "warning_overview", scope: "global" },
      { dataType: "warning_overview", scope: "global", timeRange: "7d" },
      { dataType: "warning_overview", scope: "global", timeRange: "30d" },
    ];

    await Promise.allSettled(
      commonRequests.map((request) => this.getAIAnalysis(request))
    );
  }
}

// 导出单例实例
export const aiAnalysisService = new AIAnalysisService();
