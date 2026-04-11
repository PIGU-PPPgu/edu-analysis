/**
 * 考试数据业务服务
 * 基于统一DataGateway的考试相关业务逻辑
 */

import { getDataGateway } from "@/services/data";
import { toast } from "sonner";

// 导入现有的类型定义
import type {
  Exam,
  ExamType,
  ExamFilter as BaseExamFilter,
  ExamStatistics,
  CreateExamInput,
  UpdateExamInput,
  ExamSubjectScore,
  AcademicTerm,
} from "@/services/examService";

// 扩展筛选条件以兼容DataGateway
interface ExamFilter extends BaseExamFilter {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export class ExamDataService {
  private static instance: ExamDataService;

  // 单例模式
  public static getInstance(): ExamDataService {
    if (!ExamDataService.instance) {
      ExamDataService.instance = new ExamDataService();
    }
    return ExamDataService.instance;
  }

  private constructor() {}

  /**
   * 获取考试列表
   */
  async getExams(filter?: ExamFilter): Promise<Exam[]> {
    try {
      // 转换筛选条件格式
      const dataFilter = {
        ...filter,
        dateRange:
          filter?.dateFrom && filter?.dateTo
            ? {
                from: filter.dateFrom,
                to: filter.dateTo,
              }
            : undefined,
        title: filter?.searchTerm,
        termId: filter?.termId || "all",
      };

      // 通过DataGateway获取数据
      const response = await getDataGateway().getExams(dataFilter);

      if (response.error) {
        toast.error("获取考试列表失败");
        return [];
      }

      return response.data;
    } catch (error) {
      toast.error("获取考试列表失败");
      return [];
    }
  }

  /**
   * 根据ID获取考试详情
   */
  async getExamById(examId: string): Promise<Exam | null> {
    try {
      const response = await getDataGateway().getExams({ examId, limit: 1 });

      if (response.error) {
        toast.error("获取考试详情失败");
        return null;
      }

      return response.data[0] || null;
    } catch (error) {
      toast.error("获取考试详情失败");
      return null;
    }
  }

  /**
   * 创建考试
   */
  async createExam(
    examData: CreateExamInput,
    silent = false
  ): Promise<Exam | null> {
    try {
      const newExam = await getDataGateway().createExam({
        title: examData.title,
        type: examData.type,
        date: examData.date,
        subject: examData.subject,
        description: examData.description,
        start_time: examData.start_time,
        end_time: examData.end_time,
        total_score: examData.total_score,
        passing_score: examData.passing_score,
        classes: examData.classes,
        status: examData.status || "draft",
        tags: examData.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (!silent) toast.success("考试创建成功");

      return newExam;
    } catch (error) {
      toast.error("创建考试失败");
      return null;
    }
  }

  /**
   * 更新考试
   */
  async updateExam(
    examId: string,
    examData: UpdateExamInput
  ): Promise<Exam | null> {
    try {
      const updatedExam = await getDataGateway().updateExam(examId, {
        ...examData,
        updated_at: new Date().toISOString(),
      });

      toast.success("考试更新成功");

      return updatedExam;
    } catch (error) {
      toast.error("更新考试失败");
      return null;
    }
  }

  /**
   * 删除考试
   */
  async deleteExam(examId: string): Promise<boolean> {
    try {
      const success = await getDataGateway().deleteExam(examId);

      if (success) {
        toast.success("考试删除成功");
      } else {
        toast.error("删除考试失败");
      }

      return success;
    } catch (error) {
      toast.error("删除考试失败");
      return false;
    }
  }

  /**
   * 批量删除考试
   */
  async deleteExams(examIds: string[]): Promise<boolean> {
    try {
      // 使用批量操作
      await getDataGateway().batchOperation(
        "delete",
        examIds.map((id) => ({ id }))
      );

      toast.success(`成功删除${examIds.length}个考试`);

      return true;
    } catch (error) {
      toast.error("批量删除考试失败");
      return false;
    }
  }

  /**
   * 复制考试
   */
  async duplicateExam(examId: string): Promise<Exam | null> {
    try {
      // 先获取原考试数据
      const originalExam = await this.getExamById(examId);
      if (!originalExam) {
        toast.error("原考试不存在");
        return null;
      }

      // 创建副本
      const duplicatedExam = await this.createExam(
        {
          title: `${originalExam.title} (副本)`,
          type: originalExam.type,
          date: originalExam.date,
          subject: originalExam.subject,
          description: originalExam.description,
          start_time: originalExam.start_time,
          end_time: originalExam.end_time,
          total_score: originalExam.total_score,
          passing_score: originalExam.passing_score,
          classes: originalExam.classes,
          status: "draft",
          tags: originalExam.tags,
        },
        true
      ); // silent=true: suppress "创建成功" toast, show "复制成功" below

      if (duplicatedExam) {
        toast.success("考试复制成功");
      }

      return duplicatedExam;
    } catch (error) {
      toast.error("复制考试失败");
      return null;
    }
  }

  /**
   * 获取考试统计信息
   */
  async getExamStatistics(examId: string): Promise<ExamStatistics | null> {
    try {
      const stats = await getDataGateway().getStatistics("exam", examId);

      if (!stats || !stats.exam) {
        return null;
      }

      // 格式化统计数据
      const examStats: ExamStatistics = {
        examId: stats.exam.id,
        examTitle: stats.exam.title,
        examDate: stats.exam.date,
        participantCount: stats.participantCount || 0,
        averageScore: stats.averageScore || 0,
        maxScore: stats.maxScore || 0,
        minScore: stats.minScore || 0,
        passRate: this.calculatePassRate(
          stats.grades,
          stats.exam.passing_score || 60
        ),
        excellentRate: this.calculateExcellentRate(
          stats.grades,
          stats.exam.excellent_score || 90
        ),
        scoreDistribution: this.calculateScoreDistribution(stats.grades),
        totalScore: stats.exam.total_score || 100,
      };

      return examStats;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取考试参与人数
   */
  async getExamParticipantCount(examId: string): Promise<number> {
    try {
      const stats = await getDataGateway().getStatistics("exam", examId);
      return stats?.participantCount || 0;
    } catch (error) {
      return 0;
    }
  }

  // 私有辅助方法
  private calculatePassRate(grades: any[], passingScore: number): number {
    if (!grades || grades.length === 0) return 0;

    const passCount = grades.filter(
      (g) => (g.total_score || 0) >= passingScore
    ).length;
    return Math.round((passCount / grades.length) * 100 * 100) / 100;
  }

  private calculateExcellentRate(
    grades: any[],
    excellentScore: number
  ): number {
    if (!grades || grades.length === 0) return 0;

    const excellentCount = grades.filter(
      (g) => (g.total_score || 0) >= excellentScore
    ).length;
    return Math.round((excellentCount / grades.length) * 100 * 100) / 100;
  }

  private calculateScoreDistribution(grades: any[]): any[] {
    if (!grades || grades.length === 0) return [];

    // 这里可以实现更复杂的分数段分布计算
    // 暂时返回简单的统计
    const scores = grades
      .map((g) => g.total_score)
      .filter((s) => s !== null && s !== undefined);

    return [
      { range: "90-100", count: scores.filter((s) => s >= 90).length },
      { range: "80-89", count: scores.filter((s) => s >= 80 && s < 90).length },
      { range: "70-79", count: scores.filter((s) => s >= 70 && s < 80).length },
      { range: "60-69", count: scores.filter((s) => s >= 60 && s < 70).length },
      { range: "<60", count: scores.filter((s) => s < 60).length },
    ].filter((item) => item.count > 0);
  }
}

// 导出单例实例
export const examDataService = ExamDataService.getInstance();
