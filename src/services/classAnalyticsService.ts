/**
 * 班级成绩分析服务 (ClassAnalyticsService)
 *
 * 核心功能：
 * 1. 班级整体表现分析
 * 2. 科目横向对比分析
 * 3. 学生排名变化追踪
 * 4. 成绩分布统计
 * 5. 趋势分析和预测
 * 6. 可视化数据准备
 */

import { supabase } from "@/integrations/supabase/client";

// 班级基本信息接口
export interface ClassBasicInfo {
  className: string;
  gradeLevel: string;
  studentCount: number;
  activeStudents: number;
  examCount: number;
  subjectCount: number;
  dataTimeSpan: string;
}

// 班级成绩概览接口
export interface ClassGradeOverview {
  className: string;
  examTitle: string;
  examDate: string;
  examType: string;

  // 总分统计
  totalScore: {
    average: number;
    median: number;
    highest: number;
    lowest: number;
    standardDeviation: number;
    passRate: number; // 及格率
    excellenceRate: number; // 优秀率
  };

  // 科目统计
  subjectStats: Array<{
    subject: string;
    subjectName: string;
    average: number;
    passRate: number;
    excellenceRate: number;
    difficulty: "easy" | "medium" | "hard"; // 基于平均分判断难度
  }>;

  // 排名分布
  rankDistribution: Array<{
    rankRange: string; // "1-5", "6-10", etc.
    count: number;
    percentage: number;
  }>;

  studentCount: number;
  generatedAt: string;
}

// 科目对比分析接口
export interface SubjectComparisonAnalysis {
  className: string;
  examTitle: string;

  // 科目横向对比
  subjectComparison: Array<{
    subject: string;
    subjectName: string;
    average: number;
    rank: number; // 在所有科目中的排名
    strengthLevel: "strong" | "average" | "weak";

    // 成绩分布
    distribution: {
      excellent: number; // 90+
      good: number; // 80-89
      pass: number; // 60-79
      fail: number; // <60
    };

    // 班级内排名分布
    topPerformers: Array<{
      // 前5名学生
      studentName: string;
      score: number;
      rank: number;
    }>;

    needsAttention: Array<{
      // 后5名学生
      studentName: string;
      score: number;
      rank: number;
    }>;
  }>;

  // 科目间相关性分析
  subjectCorrelations: Array<{
    subject1: string;
    subject2: string;
    correlation: number; // 相关系数 -1 到 1
    strength: "strong" | "medium" | "weak";
  }>;
}

// 学生表现追踪接口
export interface StudentPerformanceTracking {
  className: string;

  // 学生表现变化
  studentProgress: Array<{
    studentName: string;
    studentId: string;

    // 排名变化趋势
    rankingTrend: Array<{
      examTitle: string;
      examDate: string;
      rank: number;
      totalScore: number;
    }>;

    // 进步分析
    progressAnalysis: {
      trend: "improving" | "stable" | "declining";
      trendStrength: "strong" | "moderate" | "slight";
      avgRankChange: number; // 平均排名变化
      scoreImprovement: number; // 分数改进幅度
    };

    // 风险评估
    riskAssessment: {
      riskLevel: "low" | "medium" | "high";
      riskFactors: string[];
      recommendations: string[];
    };
  }>;
}

// 成绩分布分析接口
export interface GradeDistributionAnalysis {
  className: string;
  examTitle: string;

  // 总分分布
  scoreDistribution: Array<{
    scoreRange: string; // "500-450", "449-400", etc.
    count: number;
    percentage: number;
    students: Array<{
      name: string;
      score: number;
      rank: number;
    }>;
  }>;

  // 各科目分布对比
  subjectDistributions: Array<{
    subject: string;
    subjectName: string;
    distribution: Array<{
      grade: string; // "A", "B", "C", "D", "F"
      scoreRange: string;
      count: number;
      percentage: number;
    }>;
  }>;

  // 分布形态分析
  distributionShape: {
    type: "normal" | "skewed_left" | "skewed_right" | "bimodal" | "uniform";
    description: string;
    implications: string[];
  };
}

// 班级对比分析接口
export interface ClassComparisonAnalysis {
  examTitle: string;
  examDate: string;

  // 班级间对比
  classComparison: Array<{
    className: string;
    studentCount: number;
    averageScore: number;
    rank: number; // 在年级中的排名

    // 表现指标
    performanceMetrics: {
      passRate: number;
      excellenceRate: number;
      topPerformersCount: number; // 年级前10%学生数量
      improvementRate: number; // 相比上次考试的改进率
    };

    // 科目强势分析
    strongSubjects: string[];
    weakSubjects: string[];

    // 年级排名分布
    gradeRankDistribution: {
      top10Percent: number;
      top25Percent: number;
      top50Percent: number;
      bottom25Percent: number;
    };
  }>;
}

export class ClassAnalyticsService {
  /**
   * 获取班级基本信息
   */
  async getClassBasicInfo(className: string): Promise<ClassBasicInfo | null> {
    try {
      console.log("📊 [班级分析] 获取班级基本信息:", className);

      // 获取班级成绩数据概览
      const { data: gradeData, error } = await supabase
        .from("grade_data_new")
        .select("student_id, name, exam_title, exam_date, exam_type")
        .eq("class_name", className);

      if (error) throw error;

      if (!gradeData || gradeData.length === 0) {
        console.warn("⚠️ [班级分析] 未找到班级成绩数据:", className);
        return null;
      }

      // 统计基本信息
      const uniqueStudents = new Set(
        gradeData.map((record) => record.student_id || record.name)
      );
      const uniqueExams = new Set(gradeData.map((record) => record.exam_title));
      const dates = gradeData
        .map((record) => record.exam_date)
        .filter((date) => date)
        .sort();

      // 计算科目数量（从数据结构推断）
      const subjectCount = this.calculateSubjectCount(gradeData[0]);

      const timeSpan =
        dates.length >= 2
          ? `${dates[0]} 至 ${dates[dates.length - 1]}`
          : dates.length === 1
            ? dates[0]
            : "无数据";

      return {
        className,
        gradeLevel: this.extractGradeLevel(className),
        studentCount: uniqueStudents.size,
        activeStudents: uniqueStudents.size,
        examCount: uniqueExams.size,
        subjectCount,
        dataTimeSpan: timeSpan,
      };
    } catch (error) {
      console.error("❌ [班级分析] 获取基本信息失败:", error);
      return null;
    }
  }

  /**
   * 获取班级成绩概览
   */
  async getClassGradeOverview(
    className: string,
    examTitle?: string
  ): Promise<ClassGradeOverview | null> {
    try {
      console.log("📈 [班级分析] 获取成绩概览:", { className, examTitle });

      // 构建查询
      let query = supabase
        .from("grade_data_new")
        .select(
          `
          student_id,
          name,
          exam_title,
          exam_date,
          exam_type,
          total_score,
          chinese_score, math_score, english_score, physics_score,
          chemistry_score, biology_score, politics_score, history_score, geography_score,
          total_rank_in_class
        `
        )
        .eq("class_name", className)
        .order("exam_date", { ascending: false });

      if (examTitle) {
        query = query.eq("exam_title", examTitle);
      }

      const { data: gradeData, error } = await query;

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) return null;

      // 如果没有指定考试，取最新的考试
      const latestExam = examTitle || gradeData[0]?.exam_title;
      const examRecords = gradeData.filter(
        (record) => record.exam_title === latestExam
      );

      if (examRecords.length === 0) return null;

      // 计算总分统计
      const totalScores = examRecords
        .map((record) => record.total_score)
        .filter((score) => score !== null && score !== undefined)
        .sort((a, b) => b - a);

      const totalScoreStats = {
        average: this.calculateAverage(totalScores),
        median: this.calculateMedian(totalScores),
        highest: Math.max(...totalScores),
        lowest: Math.min(...totalScores),
        standardDeviation: this.calculateStandardDeviation(totalScores),
        passRate: this.calculatePassRate(totalScores, 300), // 假设及格线是300
        excellenceRate: this.calculateExcellenceRate(totalScores, 450), // 假设优秀线是450
      };

      // 计算各科目统计
      const subjects = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "biology",
        "politics",
        "history",
        "geography",
      ];
      const subjectStats = subjects
        .map((subject) => {
          const scores = examRecords
            .map((record) => record[`${subject}_score`])
            .filter((score) => score !== null && score !== undefined);

          if (scores.length === 0) return null;

          return {
            subject,
            subjectName: this.getSubjectDisplayName(subject),
            average: this.calculateAverage(scores),
            passRate: this.calculatePassRate(scores, 60),
            excellenceRate: this.calculateExcellenceRate(scores, 90),
            difficulty: this.assessSubjectDifficulty(
              this.calculateAverage(scores)
            ),
          };
        })
        .filter((stat) => stat !== null);

      // 计算排名分布
      const ranks = examRecords
        .map((record) => record.total_rank_in_class)
        .filter((rank) => rank !== null && rank !== undefined);

      const rankDistribution = this.calculateRankDistribution(ranks);

      return {
        className,
        examTitle: latestExam,
        examDate: examRecords[0]?.exam_date || "",
        examType: examRecords[0]?.exam_type || "",
        totalScore: totalScoreStats,
        subjectStats,
        rankDistribution,
        studentCount: examRecords.length,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ [班级分析] 获取成绩概览失败:", error);
      return null;
    }
  }

  /**
   * 获取科目对比分析
   */
  async getSubjectComparisonAnalysis(
    className: string,
    examTitle: string
  ): Promise<SubjectComparisonAnalysis | null> {
    try {
      console.log("🔍 [班级分析] 科目对比分析:", { className, examTitle });

      const { data: gradeData, error } = await supabase
        .from("grade_data_new")
        .select(
          `
          student_id, name,
          chinese_score, chinese_rank_in_class,
          math_score, math_rank_in_class,
          english_score, english_rank_in_class,
          physics_score, physics_rank_in_class,
          chemistry_score, chemistry_rank_in_class,
          biology_score, biology_rank_in_class,
          politics_score, politics_rank_in_class,
          history_score, history_rank_in_class,
          geography_score, geography_rank_in_class
        `
        )
        .eq("class_name", className)
        .eq("exam_title", examTitle);

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) return null;

      const subjects = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "biology",
        "politics",
        "history",
        "geography",
      ];

      // 分析各科目
      const subjectComparison = subjects
        .map((subject) => {
          const scores = gradeData
            .map((record) => ({
              name: record.name,
              score: record[`${subject}_score`],
              rank: record[`${subject}_rank_in_class`],
            }))
            .filter((item) => item.score !== null && item.score !== undefined);

          if (scores.length === 0) return null;

          const average = this.calculateAverage(scores.map((s) => s.score));

          // 成绩分布统计
          const distribution = {
            excellent: scores.filter((s) => s.score >= 90).length,
            good: scores.filter((s) => s.score >= 80 && s.score < 90).length,
            pass: scores.filter((s) => s.score >= 60 && s.score < 80).length,
            fail: scores.filter((s) => s.score < 60).length,
          };

          // 排序获取顶尖和需要关注的学生
          const sortedByScore = scores.sort((a, b) => b.score - a.score);
          const topPerformers = sortedByScore.slice(0, 5);
          const needsAttention = sortedByScore.slice(-5).reverse();

          return {
            subject,
            subjectName: this.getSubjectDisplayName(subject),
            average,
            rank: 0, // 将在后续排序中设置
            strengthLevel: "average" as const, // 将在后续计算中设置
            distribution,
            topPerformers,
            needsAttention,
          };
        })
        .filter((item) => item !== null);

      // 设置科目排名和强度等级
      subjectComparison.sort((a, b) => b.average - a.average);
      subjectComparison.forEach((subject, index) => {
        subject.rank = index + 1;
        if (index < subjectComparison.length * 0.3) {
          subject.strengthLevel = "strong";
        } else if (index > subjectComparison.length * 0.7) {
          subject.strengthLevel = "weak";
        }
      });

      // 计算科目间相关性（简化版）
      const subjectCorrelations = this.calculateSubjectCorrelations(
        gradeData,
        subjects
      );

      return {
        className,
        examTitle,
        subjectComparison,
        subjectCorrelations,
      };
    } catch (error) {
      console.error("❌ [班级分析] 科目对比分析失败:", error);
      return null;
    }
  }

  /**
   * 获取学生表现追踪
   */
  async getStudentPerformanceTracking(
    className: string,
    limit: number = 50
  ): Promise<StudentPerformanceTracking | null> {
    try {
      console.log("👥 [班级分析] 学生表现追踪:", { className, limit });

      const { data: gradeData, error } = await supabase
        .from("grade_data_new")
        .select(
          `
          student_id,
          name,
          exam_title,
          exam_date,
          total_score,
          total_rank_in_class
        `
        )
        .eq("class_name", className)
        .order("exam_date", { ascending: true });

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) return null;

      // 按学生分组数据
      const studentDataMap = new Map<string, any[]>();
      gradeData.forEach((record) => {
        const key = record.student_id || record.name;
        if (!studentDataMap.has(key)) {
          studentDataMap.set(key, []);
        }
        studentDataMap.get(key)!.push(record);
      });

      // 分析每个学生的表现变化
      const studentProgress = Array.from(studentDataMap.entries())
        .slice(0, limit)
        .map(([studentKey, records]) => {
          const sortedRecords = records.sort(
            (a, b) =>
              new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
          );

          const rankingTrend = sortedRecords.map((record) => ({
            examTitle: record.exam_title,
            examDate: record.exam_date,
            rank: record.total_rank_in_class || 999,
            totalScore: record.total_score || 0,
          }));

          // 进步分析
          const progressAnalysis = this.analyzeStudentProgress(rankingTrend);

          // 风险评估
          const riskAssessment = this.assessStudentRisk(
            rankingTrend,
            progressAnalysis
          );

          return {
            studentName: sortedRecords[0].name,
            studentId: studentKey,
            rankingTrend,
            progressAnalysis,
            riskAssessment,
          };
        });

      return {
        className,
        studentProgress,
      };
    } catch (error) {
      console.error("❌ [班级分析] 学生表现追踪失败:", error);
      return null;
    }
  }

  /**
   * 获取成绩分布分析
   */
  async getGradeDistributionAnalysis(
    className: string,
    examTitle: string
  ): Promise<GradeDistributionAnalysis | null> {
    try {
      console.log("📊 [班级分析] 成绩分布分析:", { className, examTitle });

      const { data: gradeData, error } = await supabase
        .from("grade_data_new")
        .select(
          `
          student_id, name, total_score, total_rank_in_class,
          chinese_score, math_score, english_score, physics_score,
          chemistry_score, biology_score, politics_score, history_score, geography_score
        `
        )
        .eq("class_name", className)
        .eq("exam_title", examTitle);

      if (error) throw error;
      if (!gradeData || gradeData.length === 0) return null;

      // 计算总分分布
      const scoreDistribution = this.calculateScoreDistribution(gradeData);

      // 计算各科目分布
      const subjects = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "biology",
        "politics",
        "history",
        "geography",
      ];
      const subjectDistributions = subjects
        .map((subject) => {
          const scores = gradeData
            .map((record) => record[`${subject}_score`])
            .filter((score) => score !== null && score !== undefined);

          if (scores.length === 0) return null;

          return {
            subject,
            subjectName: this.getSubjectDisplayName(subject),
            distribution: this.calculateGradeDistribution(scores),
          };
        })
        .filter((item) => item !== null);

      // 分析分布形态
      const totalScores = gradeData
        .map((record) => record.total_score)
        .filter((score) => score !== null && score !== undefined);

      const distributionShape = this.analyzeDistributionShape(totalScores);

      return {
        className,
        examTitle,
        scoreDistribution,
        subjectDistributions,
        distributionShape,
      };
    } catch (error) {
      console.error("❌ [班级分析] 成绩分布分析失败:", error);
      return null;
    }
  }

  // 辅助方法
  private calculateSubjectCount(sampleRecord: any): number {
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "politics",
      "history",
      "geography",
    ];
    return subjects.filter(
      (subject) => sampleRecord[`${subject}_score`] !== null
    ).length;
  }

  private extractGradeLevel(className: string): string {
    if (className.includes("初一") || className.includes("七年级"))
      return "初一";
    if (className.includes("初二") || className.includes("八年级"))
      return "初二";
    if (className.includes("初三") || className.includes("九年级"))
      return "初三";
    if (className.includes("高一")) return "高一";
    if (className.includes("高二")) return "高二";
    if (className.includes("高三")) return "高三";
    return "未知";
  }

  private getSubjectDisplayName(subject: string): string {
    const nameMap: Record<string, string> = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      biology: "生物",
      politics: "政治",
      history: "历史",
      geography: "地理",
    };
    return nameMap[subject] || subject;
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return (
      Math.round(
        (numbers.reduce((sum, num) => sum + num, 0) / numbers.length) * 100
      ) / 100
    );
  }

  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateStandardDeviation(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = this.calculateAverage(numbers);
    const variance =
      numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) /
      numbers.length;
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  private calculatePassRate(scores: number[], threshold: number): number {
    if (scores.length === 0) return 0;
    const passCount = scores.filter((score) => score >= threshold).length;
    return Math.round((passCount / scores.length) * 100);
  }

  private calculateExcellenceRate(scores: number[], threshold: number): number {
    return this.calculatePassRate(scores, threshold);
  }

  private assessSubjectDifficulty(
    averageScore: number
  ): "easy" | "medium" | "hard" {
    if (averageScore >= 80) return "easy";
    if (averageScore >= 65) return "medium";
    return "hard";
  }

  private calculateRankDistribution(
    ranks: number[]
  ): Array<{ rankRange: string; count: number; percentage: number }> {
    const ranges = [
      { range: "1-5", min: 1, max: 5 },
      { range: "6-10", min: 6, max: 10 },
      { range: "11-15", min: 11, max: 15 },
      { range: "16-20", min: 16, max: 20 },
      { range: "21-30", min: 21, max: 30 },
      { range: "31+", min: 31, max: 999 },
    ];

    return ranges.map(({ range, min, max }) => {
      const count = ranks.filter((rank) => rank >= min && rank <= max).length;
      const percentage =
        ranks.length > 0 ? Math.round((count / ranks.length) * 100) : 0;
      return { rankRange: range, count, percentage };
    });
  }

  private calculateSubjectCorrelations(
    gradeData: any[],
    subjects: string[]
  ): Array<{
    subject1: string;
    subject2: string;
    correlation: number;
    strength: "strong" | "medium" | "weak";
  }> {
    const correlations: Array<{
      subject1: string;
      subject2: string;
      correlation: number;
      strength: "strong" | "medium" | "weak";
    }> = [];

    // 简化的相关性计算（只计算部分主要科目组合）
    const mainSubjects = ["chinese", "math", "english"];

    for (let i = 0; i < mainSubjects.length; i++) {
      for (let j = i + 1; j < mainSubjects.length; j++) {
        const subject1 = mainSubjects[i];
        const subject2 = mainSubjects[j];

        const pairs = gradeData
          .map((record) => ({
            score1: record[`${subject1}_score`],
            score2: record[`${subject2}_score`],
          }))
          .filter((pair) => pair.score1 !== null && pair.score2 !== null);

        if (pairs.length >= 10) {
          // 需要足够的数据点
          const correlation = this.calculatePearsonCorrelation(
            pairs.map((p) => p.score1),
            pairs.map((p) => p.score2)
          );

          let strength: "strong" | "medium" | "weak" = "weak";
          if (Math.abs(correlation) > 0.7) strength = "strong";
          else if (Math.abs(correlation) > 0.4) strength = "medium";

          correlations.push({
            subject1: this.getSubjectDisplayName(subject1),
            subject2: this.getSubjectDisplayName(subject2),
            correlation: Math.round(correlation * 100) / 100,
            strength,
          });
        }
      }
    }

    return correlations;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private analyzeStudentProgress(rankingTrend: any[]): {
    trend: "improving" | "stable" | "declining";
    trendStrength: "strong" | "moderate" | "slight";
    avgRankChange: number;
    scoreImprovement: number;
  } {
    if (rankingTrend.length < 2) {
      return {
        trend: "stable",
        trendStrength: "slight",
        avgRankChange: 0,
        scoreImprovement: 0,
      };
    }

    // 计算排名变化趋势
    const rankChanges = [];
    const scoreChanges = [];

    for (let i = 1; i < rankingTrend.length; i++) {
      const rankChange = rankingTrend[i - 1].rank - rankingTrend[i].rank; // 排名上升为正
      const scoreChange =
        rankingTrend[i].totalScore - rankingTrend[i - 1].totalScore;

      rankChanges.push(rankChange);
      scoreChanges.push(scoreChange);
    }

    const avgRankChange = this.calculateAverage(rankChanges);
    const scoreImprovement = this.calculateAverage(scoreChanges);

    // 判断趋势
    let trend: "improving" | "stable" | "declining" = "stable";
    let trendStrength: "strong" | "moderate" | "slight" = "slight";

    if (avgRankChange > 0.5) {
      trend = "improving";
      if (avgRankChange > 2) trendStrength = "strong";
      else if (avgRankChange > 1) trendStrength = "moderate";
    } else if (avgRankChange < -0.5) {
      trend = "declining";
      if (avgRankChange < -2) trendStrength = "strong";
      else if (avgRankChange < -1) trendStrength = "moderate";
    }

    return {
      trend,
      trendStrength,
      avgRankChange: Math.round(avgRankChange * 100) / 100,
      scoreImprovement: Math.round(scoreImprovement * 100) / 100,
    };
  }

  private assessStudentRisk(
    rankingTrend: any[],
    progressAnalysis: any
  ): {
    riskLevel: "low" | "medium" | "high";
    riskFactors: string[];
    recommendations: string[];
  } {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // 基于排名和趋势评估风险
    const latestRank = rankingTrend[rankingTrend.length - 1]?.rank || 999;
    const latestScore = rankingTrend[rankingTrend.length - 1]?.totalScore || 0;

    if (latestRank > 30) {
      riskFactors.push("排名较后");
      recommendations.push("加强基础知识学习");
    }

    if (
      progressAnalysis.trend === "declining" &&
      progressAnalysis.trendStrength !== "slight"
    ) {
      riskFactors.push("成绩下滑");
      recommendations.push("分析下滑原因，调整学习方法");
    }

    if (latestScore < 300) {
      riskFactors.push("总分偏低");
      recommendations.push("重点关注薄弱科目");
    }

    // 确定风险等级
    let riskLevel: "low" | "medium" | "high" = "low";
    if (riskFactors.length >= 2) riskLevel = "high";
    else if (riskFactors.length === 1) riskLevel = "medium";

    if (riskFactors.length === 0) {
      recommendations.push("保持现有学习状态");
    }

    return { riskLevel, riskFactors, recommendations };
  }

  private calculateScoreDistribution(gradeData: any[]): Array<{
    scoreRange: string;
    count: number;
    percentage: number;
    students: Array<{ name: string; score: number; rank: number }>;
  }> {
    const ranges = [
      { range: "500-450", min: 450, max: 500 },
      { range: "449-400", min: 400, max: 449 },
      { range: "399-350", min: 350, max: 399 },
      { range: "349-300", min: 300, max: 349 },
      { range: "299-250", min: 250, max: 299 },
      { range: "249-200", min: 200, max: 249 },
      { range: "199以下", min: 0, max: 199 },
    ];

    return ranges.map(({ range, min, max }) => {
      const students = gradeData
        .filter(
          (record) => record.total_score >= min && record.total_score <= max
        )
        .map((record) => ({
          name: record.name,
          score: record.total_score,
          rank: record.total_rank_in_class || 999,
        }))
        .sort((a, b) => b.score - a.score);

      const percentage =
        gradeData.length > 0
          ? Math.round((students.length / gradeData.length) * 100)
          : 0;

      return {
        scoreRange: range,
        count: students.length,
        percentage,
        students,
      };
    });
  }

  private calculateGradeDistribution(scores: number[]): Array<{
    grade: string;
    scoreRange: string;
    count: number;
    percentage: number;
  }> {
    const gradeRanges = [
      { grade: "A", scoreRange: "90-100", min: 90, max: 100 },
      { grade: "B", scoreRange: "80-89", min: 80, max: 89 },
      { grade: "C", scoreRange: "70-79", min: 70, max: 79 },
      { grade: "D", scoreRange: "60-69", min: 60, max: 69 },
      { grade: "F", scoreRange: "0-59", min: 0, max: 59 },
    ];

    return gradeRanges.map(({ grade, scoreRange, min, max }) => {
      const count = scores.filter(
        (score) => score >= min && score <= max
      ).length;
      const percentage =
        scores.length > 0 ? Math.round((count / scores.length) * 100) : 0;

      return { grade, scoreRange, count, percentage };
    });
  }

  private analyzeDistributionShape(scores: number[]): {
    type: "normal" | "skewed_left" | "skewed_right" | "bimodal" | "uniform";
    description: string;
    implications: string[];
  } {
    if (scores.length < 10) {
      return {
        type: "uniform",
        description: "数据点不足，无法判断分布形态",
        implications: ["需要更多数据进行有效分析"],
      };
    }

    const mean = this.calculateAverage(scores);
    const median = this.calculateMedian(scores);
    const stdDev = this.calculateStandardDeviation(scores);

    // 简化的偏度分析
    const skewness = (mean - median) / stdDev;

    let type:
      | "normal"
      | "skewed_left"
      | "skewed_right"
      | "bimodal"
      | "uniform" = "normal";
    let description = "正态分布";
    let implications = ["班级整体表现均衡"];

    if (Math.abs(skewness) > 0.5) {
      if (skewness > 0) {
        type = "skewed_right";
        description = "右偏分布（多数学生分数较低）";
        implications = ["需要提高整体教学水平", "关注后进生辅导"];
      } else {
        type = "skewed_left";
        description = "左偏分布（多数学生分数较高）";
        implications = ["整体表现良好", "可适当增加挑战性内容"];
      }
    }

    return { type, description, implications };
  }
}

// 导出单例实例
export const classAnalyticsService = new ClassAnalyticsService();
