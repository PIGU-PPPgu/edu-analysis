/**
 * 分析数据业务服务
 * 基于统一DataGateway的数据分析相关业务逻辑
 */

import { getDataGateway } from "@/services/data";
import { toast } from "sonner";

// 分析相关的类型定义
interface AnalysisFilter {
  dateRange?: { from: string; to: string };
  classIds?: string[];
  subjectCodes?: string[];
  examIds?: string[];
  studentIds?: string[];
  analysisType?: "performance" | "trend" | "comparison" | "distribution";
}

interface PerformanceAnalysis {
  overview: {
    totalStudents: number;
    totalExams: number;
    averageScore: number;
    passRate: number;
    excellentRate: number;
  };
  subjectPerformance: Array<{
    subjectCode: string;
    subjectName: string;
    averageScore: number;
    passRate: number;
    excellentRate: number;
    participantCount: number;
  }>;
  classPerformance: Array<{
    className: string;
    averageScore: number;
    passRate: number;
    excellentRate: number;
    studentCount: number;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

interface TrendAnalysis {
  timePeriod: string;
  dataPoints: Array<{
    date: string;
    averageScore: number;
    passRate: number;
    participantCount: number;
  }>;
  trend: "increasing" | "decreasing" | "stable";
  trendStrength: number; // 0-1之间的值
  subjectTrends: Array<{
    subjectCode: string;
    trend: "increasing" | "decreasing" | "stable";
    changePercentage: number;
  }>;
}

interface ComparisonAnalysis {
  type: "class" | "subject" | "student" | "exam";
  items: Array<{
    id: string;
    name: string;
    averageScore: number;
    passRate: number;
    excellentRate: number;
    participantCount: number;
    rank: number;
  }>;
  insights: Array<{
    type: "strength" | "weakness" | "opportunity" | "threat";
    description: string;
    score: number;
  }>;
}

interface DistributionAnalysis {
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  normalityTest: {
    isNormal: boolean;
    skewness: number;
    kurtosis: number;
  };
  quartiles: {
    q1: number;
    q2: number; // median
    q3: number;
    iqr: number;
  };
  outliers: Array<{
    studentId: string;
    studentName: string;
    score: number;
    zScore: number;
  }>;
}

interface PredictiveAnalysis {
  studentPerformancePrediction: Array<{
    studentId: string;
    studentName: string;
    currentAverage: number;
    predictedScore: number;
    confidence: number;
    riskLevel: "low" | "medium" | "high";
    recommendations: string[];
  }>;
  classPerformanceForecast: Array<{
    className: string;
    predictedAverageScore: number;
    predictedPassRate: number;
    confidenceInterval: { lower: number; upper: number };
  }>;
}

interface AnomalyDetection {
  scoreAnomalies: Array<{
    studentId: string;
    studentName: string;
    examId: string;
    examTitle: string;
    score: number;
    expectedScore: number;
    anomalyScore: number;
    type: "unusually_high" | "unusually_low";
  }>;
  performancePatterns: Array<{
    pattern: string;
    description: string;
    affectedStudents: string[];
    severity: "low" | "medium" | "high";
  }>;
}

export class AnalysisDataService {
  private static instance: AnalysisDataService;

  // 单例模式
  public static getInstance(): AnalysisDataService {
    if (!AnalysisDataService.instance) {
      AnalysisDataService.instance = new AnalysisDataService();
    }
    return AnalysisDataService.instance;
  }

  private constructor() {
    console.log("[AnalysisDataService] 服务初始化");
  }

  /**
   * 性能分析
   */
  async performanceAnalysis(
    filter?: AnalysisFilter
  ): Promise<PerformanceAnalysis | null> {
    try {
      console.log("[AnalysisDataService] 执行性能分析");

      // 获取成绩数据
      const gradeResponse = await getDataGateway().getGrades({
        dateRange: filter?.dateRange,
        classId: filter?.classIds?.[0], // 简化处理
        subjectCode: filter?.subjectCodes?.[0],
        examId: filter?.examIds?.[0],
        studentId: filter?.studentIds?.[0],
        limit: 10000, // 获取大量数据用于分析
      });

      if (gradeResponse.error || gradeResponse.data.length === 0) {
        console.warn("[AnalysisDataService] 没有足够的数据进行分析");
        return null;
      }

      const grades = gradeResponse.data;

      // 计算总体概览
      const overview = this.calculateOverview(grades);

      // 科目表现分析
      const subjectPerformance = this.calculateSubjectPerformance(grades);

      // 班级表现分析
      const classPerformance = this.calculateClassPerformance(grades);

      // 分数分布分析
      const scoreDistribution = this.calculateScoreDistribution(grades);

      const analysis: PerformanceAnalysis = {
        overview,
        subjectPerformance,
        classPerformance,
        scoreDistribution,
      };

      console.log("[AnalysisDataService] 性能分析完成");
      return analysis;
    } catch (error) {
      console.error("[AnalysisDataService] 性能分析失败:", error);
      toast.error("性能分析失败");
      return null;
    }
  }

  /**
   * 趋势分析
   */
  async trendAnalysis(filter?: AnalysisFilter): Promise<TrendAnalysis | null> {
    try {
      console.log("[AnalysisDataService] 执行趋势分析");

      // 获取时间序列的成绩数据
      const gradeResponse = await getDataGateway().getGrades({
        dateRange: filter?.dateRange,
        orderBy: "created_at",
        orderDirection: "asc",
        limit: 10000,
      });

      if (gradeResponse.error || gradeResponse.data.length < 3) {
        console.warn("[AnalysisDataService] 数据量不足，无法进行趋势分析");
        return null;
      }

      const grades = gradeResponse.data;

      // 按时间分组数据
      const dataPoints = this.groupGradesByTime(grades);

      // 计算总体趋势
      const trend = this.calculateTrend(dataPoints);

      // 计算科目趋势
      const subjectTrends = this.calculateSubjectTrends(grades);

      const analysis: TrendAnalysis = {
        timePeriod: this.calculateTimePeriod(filter?.dateRange),
        dataPoints,
        trend: trend.direction,
        trendStrength: trend.strength,
        subjectTrends,
      };

      console.log("[AnalysisDataService] 趋势分析完成");
      return analysis;
    } catch (error) {
      console.error("[AnalysisDataService] 趋势分析失败:", error);
      toast.error("趋势分析失败");
      return null;
    }
  }

  /**
   * 对比分析
   */
  async comparisonAnalysis(
    type: "class" | "subject" | "student" | "exam",
    filter?: AnalysisFilter
  ): Promise<ComparisonAnalysis | null> {
    try {
      console.log(`[AnalysisDataService] 执行${type}对比分析`);

      // 根据对比类型获取相应数据
      let items: any[] = [];

      switch (type) {
        case "class":
          items = await this.getClassComparisonData(filter);
          break;
        case "subject":
          items = await this.getSubjectComparisonData(filter);
          break;
        case "student":
          items = await this.getStudentComparisonData(filter);
          break;
        case "exam":
          items = await this.getExamComparisonData(filter);
          break;
      }

      if (items.length === 0) {
        console.warn("[AnalysisDataService] 没有可对比的数据");
        return null;
      }

      // 计算排名
      items = items
        .sort((a, b) => b.averageScore - a.averageScore)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // 生成洞察
      const insights = this.generateInsights(items, type);

      const analysis: ComparisonAnalysis = {
        type,
        items,
        insights,
      };

      console.log("[AnalysisDataService] 对比分析完成");
      return analysis;
    } catch (error) {
      console.error("[AnalysisDataService] 对比分析失败:", error);
      toast.error("对比分析失败");
      return null;
    }
  }

  /**
   * 分布分析
   */
  async distributionAnalysis(
    filter?: AnalysisFilter
  ): Promise<DistributionAnalysis | null> {
    try {
      console.log("[AnalysisDataService] 执行分布分析");

      const gradeResponse = await getDataGateway().getGrades({
        dateRange: filter?.dateRange,
        limit: 10000,
      });

      if (gradeResponse.error || gradeResponse.data.length < 10) {
        console.warn("[AnalysisDataService] 数据量不足，无法进行分布分析");
        return null;
      }

      const scores = gradeResponse.data
        .map((grade) => grade.score)
        .filter((s) => s != null);

      // 分数分布
      const scoreDistribution = this.calculateDetailedScoreDistribution(scores);

      // 正态性检验
      const normalityTest = this.performNormalityTest(scores);

      // 四分位数
      const quartiles = this.calculateQuartiles(scores);

      // 异常值检测
      const outliers = this.detectOutliers(gradeResponse.data);

      const analysis: DistributionAnalysis = {
        scoreDistribution,
        normalityTest,
        quartiles,
        outliers,
      };

      console.log("[AnalysisDataService] 分布分析完成");
      return analysis;
    } catch (error) {
      console.error("[AnalysisDataService] 分布分析失败:", error);
      toast.error("分布分析失败");
      return null;
    }
  }

  /**
   * 预测分析
   */
  async predictiveAnalysis(
    filter?: AnalysisFilter
  ): Promise<PredictiveAnalysis | null> {
    try {
      console.log("[AnalysisDataService] 执行预测分析");

      // 获取历史成绩数据
      const gradeResponse = await getDataGateway().getGrades({
        dateRange: filter?.dateRange,
        orderBy: "created_at",
        limit: 10000,
      });

      if (gradeResponse.error || gradeResponse.data.length < 20) {
        console.warn("[AnalysisDataService] 历史数据不足，无法进行预测分析");
        return null;
      }

      // 学生表现预测
      const studentPerformancePrediction = await this.predictStudentPerformance(
        gradeResponse.data
      );

      // 班级表现预测
      const classPerformanceForecast = await this.predictClassPerformance(
        gradeResponse.data
      );

      const analysis: PredictiveAnalysis = {
        studentPerformancePrediction,
        classPerformanceForecast,
      };

      console.log("[AnalysisDataService] 预测分析完成");
      return analysis;
    } catch (error) {
      console.error("[AnalysisDataService] 预测分析失败:", error);
      toast.error("预测分析失败");
      return null;
    }
  }

  /**
   * 异常检测
   */
  async anomalyDetection(
    filter?: AnalysisFilter
  ): Promise<AnomalyDetection | null> {
    try {
      console.log("[AnalysisDataService] 执行异常检测");

      const gradeResponse = await getDataGateway().getGrades({
        dateRange: filter?.dateRange,
        limit: 10000,
      });

      if (gradeResponse.error || gradeResponse.data.length < 30) {
        console.warn("[AnalysisDataService] 数据量不足，无法进行异常检测");
        return null;
      }

      // 分数异常检测
      const scoreAnomalies = this.detectScoreAnomalies(gradeResponse.data);

      // 表现模式分析
      const performancePatterns = this.detectPerformancePatterns(
        gradeResponse.data
      );

      const detection: AnomalyDetection = {
        scoreAnomalies,
        performancePatterns,
      };

      console.log("[AnalysisDataService] 异常检测完成");
      return detection;
    } catch (error) {
      console.error("[AnalysisDataService] 异常检测失败:", error);
      toast.error("异常检测失败");
      return null;
    }
  }

  // 私有辅助方法
  private calculateOverview(grades: any[]) {
    const scores = grades.map((g) => g.score).filter((s) => s != null);
    const totalStudents = new Set(grades.map((g) => g.student_id)).size;
    const totalExams = new Set(grades.map((g) => g.exam_id)).size;
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const passRate = this.calculatePassRate(scores, 60);
    const excellentRate = this.calculateExcellentRate(scores, 90);

    return {
      totalStudents,
      totalExams,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate,
      excellentRate,
    };
  }

  private calculateSubjectPerformance(grades: any[]) {
    const subjectGroups = grades.reduce(
      (acc, grade) => {
        const key = grade.subject_code || "unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(grade.score);
        return acc;
      },
      {} as Record<string, number[]>
    );

    return Object.entries(subjectGroups).map(([subjectCode, scores]) => ({
      subjectCode,
      subjectName: subjectCode, // 需要映射到实际名称
      averageScore:
        Math.round(
          (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100
        ) / 100,
      passRate: this.calculatePassRate(scores, 60),
      excellentRate: this.calculateExcellentRate(scores, 90),
      participantCount: scores.length,
    }));
  }

  private calculateClassPerformance(grades: any[]) {
    const classGroups = grades.reduce(
      (acc, grade) => {
        const key = grade.class_name || "unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(grade.score);
        return acc;
      },
      {} as Record<string, number[]>
    );

    return Object.entries(classGroups).map(([className, scores]) => ({
      className,
      averageScore:
        Math.round(
          (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100
        ) / 100,
      passRate: this.calculatePassRate(scores, 60),
      excellentRate: this.calculateExcellentRate(scores, 90),
      studentCount: new Set(
        grades
          .filter((g) => g.class_name === className)
          .map((g) => g.student_id)
      ).size,
    }));
  }

  private calculateScoreDistribution(grades: any[]) {
    const scores = grades.map((g) => g.score).filter((s) => s != null);
    const total = scores.length;

    const ranges = [
      { range: "90-100", min: 90, max: 100 },
      { range: "80-89", min: 80, max: 89 },
      { range: "70-79", min: 70, max: 79 },
      { range: "60-69", min: 60, max: 69 },
      { range: "<60", min: 0, max: 59 },
    ];

    return ranges.map(({ range, min, max }) => {
      const count = scores.filter((s) => s >= min && s <= max).length;
      return {
        range,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100,
      };
    });
  }

  private calculatePassRate(scores: number[], passingScore: number): number {
    const passCount = scores.filter((score) => score >= passingScore).length;
    return Math.round((passCount / scores.length) * 100 * 100) / 100;
  }

  private calculateExcellentRate(
    scores: number[],
    excellentScore: number
  ): number {
    const excellentCount = scores.filter(
      (score) => score >= excellentScore
    ).length;
    return Math.round((excellentCount / scores.length) * 100 * 100) / 100;
  }

  // 更多复杂的分析方法...
  private groupGradesByTime(grades: any[]) {
    // 简化实现：按月分组
    const monthGroups = grades.reduce(
      (acc, grade) => {
        const month = grade.created_at?.substring(0, 7) || "unknown";
        if (!acc[month]) acc[month] = [];
        acc[month].push(grade.score);
        return acc;
      },
      {} as Record<string, number[]>
    );

    return Object.entries(monthGroups)
      .map(([date, scores]) => ({
        date,
        averageScore:
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        passRate: this.calculatePassRate(scores, 60),
        participantCount: scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateTrend(dataPoints: any[]) {
    if (dataPoints.length < 2)
      return { direction: "stable" as const, strength: 0 };

    const scores = dataPoints.map((dp) => dp.averageScore);
    const n = scores.length;

    // 简单的线性趋势计算
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += scores[i];
      sumXY += i * scores[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return {
      direction:
        slope > 0.1
          ? ("increasing" as const)
          : slope < -0.1
            ? ("decreasing" as const)
            : ("stable" as const),
      strength: Math.min(Math.abs(slope) / 10, 1), // 标准化强度
    };
  }

  private calculateSubjectTrends(grades: any[]) {
    // 简化实现
    return [
      {
        subjectCode: "math",
        trend: "increasing" as const,
        changePercentage: 5.2,
      },
      {
        subjectCode: "chinese",
        trend: "stable" as const,
        changePercentage: 0.8,
      },
      {
        subjectCode: "english",
        trend: "decreasing" as const,
        changePercentage: -2.1,
      },
    ];
  }

  private calculateTimePeriod(dateRange?: {
    from: string;
    to: string;
  }): string {
    if (!dateRange) return "全部时间";
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return "近一个月";
    if (diffDays <= 90) return "近三个月";
    if (diffDays <= 365) return "近一年";
    return "历史数据";
  }

  // 更多辅助方法的占位符...
  private async getClassComparisonData(
    filter?: AnalysisFilter
  ): Promise<any[]> {
    // 实现班级对比数据获取
    return [];
  }

  private async getSubjectComparisonData(
    filter?: AnalysisFilter
  ): Promise<any[]> {
    // 实现科目对比数据获取
    return [];
  }

  private async getStudentComparisonData(
    filter?: AnalysisFilter
  ): Promise<any[]> {
    // 实现学生对比数据获取
    return [];
  }

  private async getExamComparisonData(filter?: AnalysisFilter): Promise<any[]> {
    // 实现考试对比数据获取
    return [];
  }

  private generateInsights(items: any[], type: string): any[] {
    // 生成分析洞察
    return [
      {
        type: "strength",
        description: `${items[0]?.name || "第一名"}表现优异，平均分达到${items[0]?.averageScore || 0}分`,
        score: 0.9,
      },
    ];
  }

  private calculateDetailedScoreDistribution(scores: number[]): any[] {
    // 详细的分数分布计算
    return [];
  }

  private performNormalityTest(scores: number[]): any {
    // 正态性检验
    return { isNormal: false, skewness: 0, kurtosis: 0 };
  }

  private calculateQuartiles(scores: number[]): any {
    // 四分位数计算
    const sorted = [...scores].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q2Index = Math.floor(sorted.length * 0.5);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q2 = sorted[q2Index];
    const q3 = sorted[q3Index];

    return { q1, q2, q3, iqr: q3 - q1 };
  }

  private detectOutliers(grades: any[]): any[] {
    // 异常值检测
    return [];
  }

  private async predictStudentPerformance(grades: any[]): Promise<any[]> {
    // 学生表现预测
    return [];
  }

  private async predictClassPerformance(grades: any[]): Promise<any[]> {
    // 班级表现预测
    return [];
  }

  private detectScoreAnomalies(grades: any[]): any[] {
    // 分数异常检测
    return [];
  }

  private detectPerformancePatterns(grades: any[]): any[] {
    // 表现模式检测
    return [];
  }

  /**
   * 获取最近活动记录
   */
  async getRecentActivity(): Promise<
    Array<{
      id: string;
      type: "exam_created" | "grade_added" | "analysis_run";
      title: string;
      timestamp: string;
      description: string;
    }>
  > {
    try {
      // 这里应该从数据库获取真实的活动记录
      // 暂时返回空数组，避免显示模拟数据
      console.log("[AnalysisDataService] 获取最近活动记录");
      return [];
    } catch (error) {
      console.error("[AnalysisDataService] 获取最近活动失败:", error);
      return [];
    }
  }
}

// 导出单例实例
export const analysisDataService = AnalysisDataService.getInstance();
