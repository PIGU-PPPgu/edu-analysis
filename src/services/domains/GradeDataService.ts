/**
 * 成绩数据业务服务
 * 基于统一DataGateway的成绩相关业务逻辑
 */

import { getDataGateway } from "@/services/data";
import { toast } from "sonner";

// 导入现有的类型定义（需要从实际的成绩服务中导入）
interface Grade {
  id: string;
  student_id: string;
  exam_id: string;
  subject_code: string;
  score: number;
  grade_level: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  created_at: string;
  updated_at: string;
}

interface GradeFilter {
  studentId?: string;
  examId?: string;
  subjectCode?: string;
  classId?: string;
  termId?: string;
  scoreRange?: { min: number; max: number };
  dateRange?: { from: string; to: string };
  limit?: number;
  offset?: number;
}

interface CreateGradeInput {
  student_id: string;
  exam_id: string;
  subject_code: string;
  score: number;
  grade_level?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
}

interface UpdateGradeInput {
  score?: number;
  grade_level?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
}

interface GradeStatistics {
  totalCount: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  passRate: number;
  excellentRate: number;
  scoreDistribution: Array<{ range: string; count: number }>;
  subjectStats: Array<{
    subject: string;
    averageScore: number;
    passRate: number;
  }>;
}

export class GradeDataService {
  private static instance: GradeDataService;

  // 单例模式
  public static getInstance(): GradeDataService {
    if (!GradeDataService.instance) {
      GradeDataService.instance = new GradeDataService();
    }
    return GradeDataService.instance;
  }

  private constructor() {
    console.log("[GradeDataService] 服务初始化");
  }

  /**
   * 获取成绩列表
   */
  async getGrades(filter?: GradeFilter): Promise<Grade[]> {
    try {
      console.log("[GradeDataService] 获取成绩列表，筛选条件:", filter);

      // 转换筛选条件格式
      const dataFilter = {
        studentId: filter?.studentId,
        examId: filter?.examId,
        subjectCode: filter?.subjectCode,
        classId: filter?.classId,
        termId: filter?.termId || "all",
        scoreRange: filter?.scoreRange,
        dateRange: filter?.dateRange,
        limit: filter?.limit || 100,
        offset: filter?.offset || 0,
      };

      // 通过DataGateway获取数据
      const response = await getDataGateway().getGrades(dataFilter);

      if (response.error) {
        console.error("[GradeDataService] 获取成绩列表失败:", response.error);
        toast.error("获取成绩列表失败");
        return [];
      }

      console.log(
        `[GradeDataService] 获取到 ${response.data.length} 条成绩记录`
      );
      return response.data;
    } catch (error) {
      console.error("[GradeDataService] getGrades 异常:", error);
      toast.error("获取成绩列表失败");
      return [];
    }
  }

  /**
   * 根据ID获取成绩详情
   */
  async getGradeById(gradeId: string): Promise<Grade | null> {
    try {
      console.log("[GradeDataService] 获取成绩详情:", gradeId);

      const response = await getDataGateway().getGrades({ gradeId, limit: 1 });

      if (response.error) {
        console.error("[GradeDataService] 获取成绩详情失败:", response.error);
        toast.error("获取成绩详情失败");
        return null;
      }

      return response.data[0] || null;
    } catch (error) {
      console.error("[GradeDataService] getGradeById 异常:", error);
      toast.error("获取成绩详情失败");
      return null;
    }
  }

  /**
   * 创建成绩记录
   */
  async createGrade(gradeData: CreateGradeInput): Promise<Grade | null> {
    try {
      console.log("[GradeDataService] 创建成绩记录:", gradeData.student_id);

      const newGrade = await getDataGateway().createGrade({
        student_id: gradeData.student_id,
        exam_id: gradeData.exam_id,
        subject_code: gradeData.subject_code,
        score: gradeData.score,
        grade_level:
          gradeData.grade_level || this.calculateGradeLevel(gradeData.score),
        rank_in_class: gradeData.rank_in_class,
        rank_in_grade: gradeData.rank_in_grade,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success("成绩记录创建成功");
      console.log("[GradeDataService] 成绩记录创建成功:", newGrade.id);

      return newGrade;
    } catch (error) {
      console.error("[GradeDataService] 创建成绩记录失败:", error);
      toast.error("创建成绩记录失败");
      return null;
    }
  }

  /**
   * 更新成绩记录
   */
  async updateGrade(
    gradeId: string,
    gradeData: UpdateGradeInput
  ): Promise<Grade | null> {
    try {
      console.log("[GradeDataService] 更新成绩记录:", gradeId);

      const updatedGrade = await getDataGateway().updateGrade(gradeId, {
        ...gradeData,
        grade_level: gradeData.score
          ? this.calculateGradeLevel(gradeData.score)
          : gradeData.grade_level,
        updated_at: new Date().toISOString(),
      });

      toast.success("成绩记录更新成功");
      console.log("[GradeDataService] 成绩记录更新成功:", gradeId);

      return updatedGrade;
    } catch (error) {
      console.error("[GradeDataService] 更新成绩记录失败:", error);
      toast.error("更新成绩记录失败");
      return null;
    }
  }

  /**
   * 删除成绩记录
   */
  async deleteGrade(gradeId: string): Promise<boolean> {
    try {
      console.log("[GradeDataService] 删除成绩记录:", gradeId);

      const success = await getDataGateway().deleteGrade(gradeId);

      if (success) {
        toast.success("成绩记录删除成功");
        console.log("[GradeDataService] 成绩记录删除成功:", gradeId);
      } else {
        toast.error("删除成绩记录失败");
      }

      return success;
    } catch (error) {
      console.error("[GradeDataService] 删除成绩记录失败:", error);
      toast.error("删除成绩记录失败");
      return false;
    }
  }

  /**
   * 批量创建成绩记录
   */
  async batchCreateGrades(grades: CreateGradeInput[]): Promise<Grade[]> {
    try {
      console.log("[GradeDataService] 批量创建成绩记录:", grades.length);

      const enrichedGrades = grades.map((grade) => ({
        ...grade,
        grade_level: grade.grade_level || this.calculateGradeLevel(grade.score),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const results = await getDataGateway().batchOperation(
        "create",
        enrichedGrades
      );

      toast.success(`成功创建${results.length}条成绩记录`);
      console.log("[GradeDataService] 批量创建成功");

      return results;
    } catch (error) {
      console.error("[GradeDataService] 批量创建成绩记录失败:", error);
      toast.error("批量创建成绩记录失败");
      return [];
    }
  }

  /**
   * 获取成绩统计信息
   */
  async getGradeStatistics(
    filter?: GradeFilter
  ): Promise<GradeStatistics | null> {
    try {
      console.log("[GradeDataService] 获取成绩统计");

      // 获取成绩数据
      const grades = await this.getGrades(filter);
      if (grades.length === 0) {
        return null;
      }

      // 计算统计信息
      const scores = grades.map((g) => g.score);
      const totalCount = grades.length;
      const averageScore =
        scores.reduce((sum, score) => sum + score, 0) / totalCount;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      // 计算及格率和优秀率
      const passRate = this.calculatePassRate(scores, 60);
      const excellentRate = this.calculateExcellentRate(scores, 90);

      // 分数段分布
      const scoreDistribution = this.calculateScoreDistribution(scores);

      // 科目统计
      const subjectStats = this.calculateSubjectStatistics(grades);

      const statistics: GradeStatistics = {
        totalCount,
        averageScore: Math.round(averageScore * 100) / 100,
        maxScore,
        minScore,
        passRate,
        excellentRate,
        scoreDistribution,
        subjectStats,
      };

      console.log("[GradeDataService] 统计数据计算完成");
      return statistics;
    } catch (error) {
      console.error("[GradeDataService] 获取成绩统计失败:", error);
      return null;
    }
  }

  /**
   * 获取学生成绩趋势
   */
  async getStudentGradeTrend(
    studentId: string,
    subjectCode?: string
  ): Promise<
    Array<{
      examId: string;
      examTitle: string;
      examDate: string;
      score: number;
      rank: number;
    }>
  > {
    try {
      console.log("[GradeDataService] 获取学生成绩趋势:", studentId);

      const grades = await this.getGrades({
        studentId,
        subjectCode,
      });

      // 按考试分组并排序
      const trendData = grades
        .map((grade) => ({
          examId: grade.exam_id,
          examTitle: "", // 需要从考试数据中获取
          examDate: grade.created_at,
          score: grade.score,
          rank: grade.rank_in_class || 0,
        }))
        .sort(
          (a, b) =>
            new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
        );

      console.log(`[GradeDataService] 获取到${trendData.length}个趋势数据点`);
      return trendData;
    } catch (error) {
      console.error("[GradeDataService] 获取成绩趋势失败:", error);
      return [];
    }
  }

  // 私有辅助方法
  private calculateGradeLevel(score: number): string {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "E";
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

  private calculateScoreDistribution(
    scores: number[]
  ): Array<{ range: string; count: number }> {
    return [
      { range: "90-100", count: scores.filter((s) => s >= 90).length },
      { range: "80-89", count: scores.filter((s) => s >= 80 && s < 90).length },
      { range: "70-79", count: scores.filter((s) => s >= 70 && s < 80).length },
      { range: "60-69", count: scores.filter((s) => s >= 60 && s < 70).length },
      { range: "<60", count: scores.filter((s) => s < 60).length },
    ].filter((item) => item.count > 0);
  }

  private calculateSubjectStatistics(grades: Grade[]): Array<{
    subject: string;
    averageScore: number;
    passRate: number;
  }> {
    const subjectGroups = grades.reduce(
      (acc, grade) => {
        if (!acc[grade.subject_code]) {
          acc[grade.subject_code] = [];
        }
        acc[grade.subject_code].push(grade.score);
        return acc;
      },
      {} as Record<string, number[]>
    );

    return Object.entries(subjectGroups).map(([subject, scores]) => ({
      subject,
      averageScore:
        Math.round(
          (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100
        ) / 100,
      passRate: this.calculatePassRate(scores, 60),
    }));
  }

  /**
   * 获取平均分数
   */
  async getAverageScore(): Promise<number> {
    try {
      console.log("[GradeDataService] 计算平均分数");

      // 获取所有成绩数据
      const grades = await this.getGrades({});

      if (grades.length === 0) {
        return 0;
      }

      // 计算总分的平均值
      const totalScores = grades
        .map((grade) => grade.totalScore)
        .filter(
          (score) => score !== undefined && score !== null && !isNaN(score)
        ) as number[];

      if (totalScores.length === 0) {
        return 0;
      }

      const average =
        totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;

      console.log("[GradeDataService] 平均分数计算完成:", average.toFixed(2));
      return average;
    } catch (error) {
      console.error("[GradeDataService] 计算平均分数失败:", error);
      return 0;
    }
  }
}

// 导出单例实例
export const gradeDataService = GradeDataService.getInstance();
