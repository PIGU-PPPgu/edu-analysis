/**
 * 成绩管理服务 - 统一成绩数据处理
 *
 * 功能：
 * - 成绩数据查询和分析
 * - 多维度成绩统计
 * - 排名计算和趋势分析
 * - 成绩导入和验证
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import type { APIResponse } from "../core/api";

export interface GradeRecord {
  id: string;
  student_id: string;
  exam_id: string;
  subject: string;
  score: number;
  max_score: number;
  grade: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  exam_date: string;
  exam_type: string;
  class_name: string;
}

export interface GradeStatistics {
  average: number;
  median: number;
  max: number;
  min: number;
  stddev: number;
  passRate: number;
  distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export interface StudentGradeAnalysis {
  student_id: string;
  student_name: string;
  total_score: number;
  subject_scores: Array<{
    subject: string;
    score: number;
    max_score: number;
    grade: string;
    rank: number;
  }>;
  trend: "improving" | "stable" | "declining";
  strengths: string[];
  weaknesses: string[];
}

/**
 * 成绩管理服务类
 */
export class GradeService {
  private readonly cachePrefix = "grades_";
  private readonly cacheTTL = 15 * 60 * 1000; // 15分钟

  /**
   * 获取学生成绩记录
   */
  async getStudentGrades(
    studentId: string,
    options: {
      examId?: string;
      subject?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<APIResponse<GradeRecord[]>> {
    try {
      logInfo("获取学生成绩记录", { studentId, options });

      const cacheKey = `${this.cachePrefix}student_${studentId}_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 构建查询条件
      const filters: any = { student_id: studentId };
      if (options.examId) filters.exam_id = options.examId;
      if (options.subject) filters.subject = options.subject;
      if (options.startDate) filters.exam_date = { gte: options.startDate };
      if (options.endDate) {
        filters.exam_date = { ...filters.exam_date, lte: options.endDate };
      }

      // 从 grade_data 表查询（优先）
      let response = await apiClient.query<GradeRecord>("grade_data", {
        filters,
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: options.limit || 50,
      });

      // 如果 grade_data 没有数据，回退到 grades 表
      if (!response.success || !response.data?.length) {
        response = await apiClient.query<GradeRecord>("grades", {
          filters,
          orderBy: [{ column: "exam_date", ascending: false }],
          limit: options.limit || 50,
        });
      }

      if (response.success && response.data) {
        dataCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取学生成绩记录失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取成绩记录失败",
      };
    }
  }

  /**
   * 获取班级成绩统计
   */
  async getClassGradeStatistics(
    className: string,
    examId: string,
    subject?: string
  ): Promise<APIResponse<GradeStatistics>> {
    try {
      logInfo("获取班级成绩统计", { className, examId, subject });

      const cacheKey = `${this.cachePrefix}class_stats_${className}_${examId}_${subject || "all"}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const filters: any = {
        class_name: className,
        exam_id: examId,
      };
      if (subject) filters.subject = subject;

      // 查询成绩数据
      const response = await apiClient.query<GradeRecord>("grade_data", {
        filters,
        select: subject ? [`${subject}_score`] : ["total_score"],
      });

      if (!response.success || !response.data?.length) {
        return {
          success: false,
          error: "未找到成绩数据",
        };
      }

      // 计算统计数据
      const scores = response.data
        .map((record) =>
          subject
            ? record[`${subject}_score` as keyof GradeRecord]
            : record.total_score
        )
        .filter((score) => typeof score === "number" && score > 0)
        .sort((a, b) => a - b);

      if (scores.length === 0) {
        return {
          success: false,
          error: "没有有效的成绩数据",
        };
      }

      const statistics = this.calculateStatistics(scores);
      dataCache.set(cacheKey, statistics, this.cacheTTL);

      return { success: true, data: statistics };
    } catch (error) {
      logError("获取班级成绩统计失败", { className, examId, error });
      return {
        success: false,
        error: error.message || "获取统计数据失败",
      };
    }
  }

  /**
   * 分析学生成绩趋势
   */
  async analyzeStudentGradeTrend(
    studentId: string,
    subject?: string,
    examCount: number = 5
  ): Promise<APIResponse<StudentGradeAnalysis>> {
    try {
      logInfo("分析学生成绩趋势", { studentId, subject, examCount });

      // 获取最近的成绩记录
      const gradesResponse = await this.getStudentGrades(studentId, {
        subject,
        limit: examCount,
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return {
          success: false,
          error: "未找到足够的成绩数据进行趋势分析",
        };
      }

      const grades = gradesResponse.data;

      // 获取学生信息
      const studentResponse = await apiClient.query("students", {
        filters: { student_id: studentId },
        select: ["name"],
        limit: 1,
      });

      const studentName = studentResponse.data?.[0]?.name || "未知学生";

      // 计算趋势
      const trend = this.calculateTrend(grades.map((g) => g.score));

      // 分析优势劣势科目
      const subjectAnalysis = await this.analyzeSubjectPerformance(studentId);

      const analysis: StudentGradeAnalysis = {
        student_id: studentId,
        student_name: studentName,
        total_score: grades[0]?.score || 0,
        subject_scores: grades.map((g) => ({
          subject: g.subject,
          score: g.score,
          max_score: g.max_score,
          grade: g.grade,
          rank: g.rank_in_class || 0,
        })),
        trend,
        strengths: subjectAnalysis.strengths,
        weaknesses: subjectAnalysis.weaknesses,
      };

      return { success: true, data: analysis };
    } catch (error) {
      logError("分析学生成绩趋势失败", { studentId, error });
      return {
        success: false,
        error: error.message || "成绩趋势分析失败",
      };
    }
  }

  /**
   * 批量导入成绩数据
   */
  async importGrades(
    grades: Omit<GradeRecord, "id">[],
    options: {
      validateData?: boolean;
      skipDuplicates?: boolean;
      calculateRanks?: boolean;
    } = {}
  ): Promise<
    APIResponse<{ imported: number; skipped: number; errors: string[] }>
  > {
    try {
      logInfo("批量导入成绩数据", { count: grades.length, options });

      const {
        validateData = true,
        skipDuplicates = true,
        calculateRanks = true,
      } = options;
      const errors: string[] = [];
      let imported = 0;
      let skipped = 0;

      // 数据验证
      if (validateData) {
        for (const grade of grades) {
          const validation = this.validateGradeRecord(grade);
          if (!validation.valid) {
            errors.push(
              `学生${grade.student_id}: ${validation.errors.join(", ")}`
            );
            continue;
          }
        }
      }

      // 检查重复数据
      if (skipDuplicates) {
        const existingGrades = await apiClient.query("grade_data", {
          filters: {
            exam_id: { in: [...new Set(grades.map((g) => g.exam_id))] },
          },
        });

        if (existingGrades.success && existingGrades.data) {
          const existingKeys = new Set(
            existingGrades.data.map(
              (g) => `${g.student_id}_${g.exam_id}_${g.subject}`
            )
          );

          const newGrades = grades.filter((g) => {
            const key = `${g.student_id}_${g.exam_id}_${g.subject}`;
            if (existingKeys.has(key)) {
              skipped++;
              return false;
            }
            return true;
          });

          grades = newGrades;
        }
      }

      // 批量插入
      if (grades.length > 0) {
        const insertResponse = await apiClient.insert("grade_data", grades);

        if (insertResponse.success) {
          imported = grades.length;

          // 计算排名
          if (calculateRanks) {
            await this.recalculateRanks(grades.map((g) => g.exam_id));
          }

          // 清除相关缓存
          this.clearRelatedCache(grades);
        } else {
          errors.push(insertResponse.error || "数据插入失败");
        }
      }

      return {
        success: errors.length === 0,
        data: { imported, skipped, errors },
        error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    } catch (error) {
      logError("批量导入成绩数据失败", error);
      return {
        success: false,
        error: error.message || "导入失败",
        data: { imported: 0, skipped: 0, errors: [error.message] },
      };
    }
  }

  /**
   * 重新计算排名
   */
  private async recalculateRanks(examIds: string[]): Promise<void> {
    try {
      logInfo("重新计算排名", { examIds });

      for (const examId of [...new Set(examIds)]) {
        // 这里可以调用数据库函数或者实现排名计算逻辑
        // 暂时跳过，后续可以添加具体实现
        logInfo(`排名计算: ${examId}`);
      }
    } catch (error) {
      logError("排名计算失败", error);
    }
  }

  /**
   * 验证成绩记录
   */
  private validateGradeRecord(grade: Omit<GradeRecord, "id">): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!grade.student_id?.trim()) {
      errors.push("学生ID不能为空");
    }

    if (!grade.exam_id?.trim()) {
      errors.push("考试ID不能为空");
    }

    if (!grade.subject?.trim()) {
      errors.push("科目不能为空");
    }

    if (typeof grade.score !== "number" || grade.score < 0) {
      errors.push("成绩必须是非负数");
    }

    if (typeof grade.max_score !== "number" || grade.max_score <= 0) {
      errors.push("满分必须是正数");
    }

    if (grade.score > grade.max_score) {
      errors.push("成绩不能超过满分");
    }

    if (!grade.exam_date?.trim()) {
      errors.push("考试日期不能为空");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 计算统计数据
   */
  private calculateStatistics(scores: number[]): GradeStatistics {
    const sorted = [...scores].sort((a, b) => a - b);
    const length = sorted.length;

    // 基本统计
    const sum = sorted.reduce((a, b) => a + b, 0);
    const average = sum / length;
    const median =
      length % 2 === 0
        ? (sorted[length / 2 - 1] + sorted[length / 2]) / 2
        : sorted[Math.floor(length / 2)];
    const max = sorted[length - 1];
    const min = sorted[0];

    // 标准差
    const variance =
      sorted.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) /
      length;
    const stddev = Math.sqrt(variance);

    // 及格率（使用配置的及格分数，默认为总分的60%）
    const passThreshold = this.getPassingThreshold(max);
    const passCount = sorted.filter((score) => score >= passThreshold).length;
    const passRate = (passCount / length) * 100;

    // 分数段分布
    const ranges = [
      { range: "90-100", min: 90, max: 100 },
      { range: "80-89", min: 80, max: 89 },
      { range: "70-79", min: 70, max: 79 },
      { range: "60-69", min: 60, max: 69 },
      { range: "0-59", min: 0, max: 59 },
    ];

    const distribution = ranges.map((range) => {
      const count = sorted.filter(
        (score) => score >= range.min && score <= range.max
      ).length;
      return {
        range: range.range,
        count,
        percentage: (count / length) * 100,
      };
    });

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      max,
      min,
      stddev: Math.round(stddev * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      distribution,
    };
  }

  /**
   * 计算成绩趋势
   */
  private calculateTrend(
    scores: number[]
  ): "improving" | "stable" | "declining" {
    if (scores.length < 2) return "stable";

    // 简单的趋势计算：比较最近几次考试的平均分
    const recent = scores.slice(0, Math.min(3, scores.length));
    const earlier = scores.slice(Math.min(3, scores.length));

    if (earlier.length === 0) return "stable";

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const diff = recentAvg - earlierAvg;

    if (diff > 5) return "improving";
    if (diff < -5) return "declining";
    return "stable";
  }

  /**
   * 分析科目表现
   */
  private async analyzeSubjectPerformance(studentId: string): Promise<{
    strengths: string[];
    weaknesses: string[];
  }> {
    try {
      // 获取各科目平均成绩
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { student_id: studentId },
        select: [
          "chinese_score",
          "math_score",
          "english_score",
          "physics_score",
          "chemistry_score",
        ],
        limit: 10,
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return { strengths: [], weaknesses: [] };
      }

      const subjects = [
        { name: "语文", key: "chinese_score" },
        { name: "数学", key: "math_score" },
        { name: "英语", key: "english_score" },
        { name: "物理", key: "physics_score" },
        { name: "化学", key: "chemistry_score" },
      ];

      const subjectAvgs = subjects
        .map((subject) => {
          const scores = gradesResponse.data
            .map((record) => record[subject.key as keyof typeof record])
            .filter(
              (score) => typeof score === "number" && score > 0
            ) as number[];

          if (scores.length === 0) return { name: subject.name, avg: 0 };

          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return { name: subject.name, avg };
        })
        .filter((s) => s.avg > 0);

      if (subjectAvgs.length === 0) {
        return { strengths: [], weaknesses: [] };
      }

      // 排序找出优势和劣势科目
      subjectAvgs.sort((a, b) => b.avg - a.avg);

      const strengths = subjectAvgs.slice(0, 2).map((s) => s.name);
      const weaknesses = subjectAvgs.slice(-2).map((s) => s.name);

      return { strengths, weaknesses };
    } catch (error) {
      logError("分析科目表现失败", error);
      return { strengths: [], weaknesses: [] };
    }
  }

  /**
   * 获取及格阈值
   * 尝试从考试配置中获取，如果没有则使用默认值（总分的60%）
   */
  private getPassingThreshold(totalScore: number): number {
    // 对于通用统计，使用默认的60%作为及格线
    // 在具体的考试分析中，应该通过 examScoreCalculationService 获取配置的阈值
    return Math.round(totalScore * 0.6);
  }

  /**
   * 清除相关缓存
   */
  private clearRelatedCache(grades: Omit<GradeRecord, "id">[]): void {
    const cacheKeysToDelete: string[] = [];

    // 收集需要清除的缓存键
    const studentIds = [...new Set(grades.map((g) => g.student_id))];
    const classNames = [...new Set(grades.map((g) => g.class_name))];
    const examIds = [...new Set(grades.map((g) => g.exam_id))];

    studentIds.forEach((studentId) => {
      cacheKeysToDelete.push(`${this.cachePrefix}student_${studentId}`);
    });

    classNames.forEach((className) => {
      examIds.forEach((examId) => {
        cacheKeysToDelete.push(
          `${this.cachePrefix}class_stats_${className}_${examId}`
        );
      });
    });

    // 清除缓存
    cacheKeysToDelete.forEach((key) => {
      dataCache.delete(key);
    });

    logInfo("清除成绩相关缓存", { count: cacheKeysToDelete.length });
  }
}

// 导出服务实例
export const gradeService = new GradeService();
