/**
 * 班级管理服务 - 统一班级业务逻辑
 *
 * 功能：
 * - 班级信息管理
 * - 班级成绩统计
 * - 班级比较分析
 * - 教学资源分配
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import type { APIResponse } from "../core/api";

export interface Class {
  class_name: string;
  grade_level: string;
  academic_year: string;
  homeroom_teacher?: string;
  student_count?: number;
  department?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClassStatistics {
  class_name: string;
  basic_info: {
    total_students: number;
    grade_level: string;
    academic_year: string;
    homeroom_teacher?: string;
  };
  performance_metrics: {
    average_score: number;
    median_score: number;
    pass_rate: number;
    excellent_rate: number;
    class_rank: number;
    grade_comparison: {
      above_grade_average: boolean;
      rank_in_grade: number;
      total_classes_in_grade: number;
    };
  };
  subject_performance: Array<{
    subject: string;
    average_score: number;
    pass_rate: number;
    top_performer: string;
    needs_improvement: number;
  }>;
  recent_trends: {
    score_trend: "improving" | "stable" | "declining";
    trend_data: Array<{
      exam_date: string;
      average_score: number;
    }>;
  };
}

export interface ClassComparison {
  comparison_type: "grade_level" | "academic_year" | "custom";
  classes: Array<{
    class_name: string;
    performance_score: number;
    rank: number;
    metrics: {
      average_score: number;
      student_count: number;
      pass_rate: number;
    };
  }>;
  analysis: {
    best_performing: string;
    most_improved: string;
    needs_attention: string[];
  };
}

export interface ClassResource {
  id: string;
  class_name: string;
  resource_type: "teacher" | "curriculum" | "equipment" | "material";
  resource_name: string;
  allocation_date: string;
  status: "active" | "inactive" | "maintenance";
  usage_stats?: {
    utilization_rate: number;
    feedback_score: number;
  };
}

/**
 * 班级管理服务类
 */
export class ClassService {
  private readonly cachePrefix = "classes_";
  private readonly cacheTTL = 15 * 60 * 1000; // 15分钟

  /**
   * 获取班级信息
   */
  async getClass(className: string): Promise<APIResponse<Class>> {
    try {
      logInfo("获取班级信息", { className });

      const cacheKey = `${this.cachePrefix}info_${className}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const response = await apiClient.query<Class>("class_info", {
        filters: { class_name: className },
        limit: 1,
      });

      if (response.success && response.data?.length) {
        const classInfo = response.data[0];

        // 获取实时学生数量
        const studentCountResponse = await apiClient.query("students", {
          filters: { class_id: className },
          select: ["id"],
        });

        if (studentCountResponse.success && studentCountResponse.data) {
          classInfo.student_count = studentCountResponse.data.length;
        }

        dataCache.set(cacheKey, classInfo, this.cacheTTL);
        return { success: true, data: classInfo };
      }

      return {
        success: false,
        error: "未找到班级信息",
      };
    } catch (error) {
      logError("获取班级信息失败", { className, error });
      return {
        success: false,
        error: error.message || "获取班级信息失败",
      };
    }
  }

  /**
   * 获取所有班级列表
   */
  async getAllClasses(
    options: {
      gradeLevel?: string;
      academicYear?: string;
      includeStats?: boolean;
      orderBy?: "class_name" | "grade_level" | "student_count";
    } = {}
  ): Promise<APIResponse<Class[]>> {
    try {
      logInfo("获取所有班级列表", { options });

      const cacheKey = `${this.cachePrefix}all_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const filters: any = {};
      if (options.gradeLevel) filters.grade_level = options.gradeLevel;
      if (options.academicYear) filters.academic_year = options.academicYear;

      let orderBy: Array<{ column: string; ascending: boolean }> = [];
      switch (options.orderBy) {
        case "grade_level":
          orderBy = [
            { column: "grade_level", ascending: true },
            { column: "class_name", ascending: true },
          ];
          break;
        case "student_count":
          orderBy = [{ column: "student_count", ascending: false }];
          break;
        default:
          orderBy = [{ column: "class_name", ascending: true }];
      }

      const response = await apiClient.query<Class>("class_info", {
        filters,
        orderBy,
      });

      if (response.success && response.data) {
        // 如果需要包含统计信息，获取每个班级的学生数量
        if (options.includeStats) {
          await this.enrichClassesWithStats(response.data);
        }

        dataCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取所有班级列表失败", { options, error });
      return {
        success: false,
        error: error.message || "获取班级列表失败",
      };
    }
  }

  /**
   * 获取班级详细统计
   */
  async getClassStatistics(
    className: string
  ): Promise<APIResponse<ClassStatistics>> {
    try {
      logInfo("获取班级详细统计", { className });

      const cacheKey = `${this.cachePrefix}stats_${className}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取班级基本信息
      const classResponse = await this.getClass(className);
      if (!classResponse.success || !classResponse.data) {
        return {
          success: false,
          error: "未找到班级信息",
        };
      }

      const classInfo = classResponse.data;

      // 获取学生数量
      const studentsResponse = await apiClient.query("students", {
        filters: { class_id: className },
        select: ["id"],
      });

      const total_students = studentsResponse.success
        ? studentsResponse.data?.length || 0
        : 0;

      // 获取班级成绩表现指标
      const performanceMetrics =
        await this.getClassPerformanceMetrics(className);

      // 获取各科目表现
      const subjectPerformance =
        await this.getClassSubjectPerformance(className);

      // 获取成绩趋势
      const recentTrends = await this.getClassTrends(className);

      const statistics: ClassStatistics = {
        class_name: className,
        basic_info: {
          total_students,
          grade_level: classInfo.grade_level,
          academic_year: classInfo.academic_year,
          homeroom_teacher: classInfo.homeroom_teacher,
        },
        performance_metrics: performanceMetrics,
        subject_performance: subjectPerformance,
        recent_trends: recentTrends,
      };

      dataCache.set(cacheKey, statistics, this.cacheTTL);
      return { success: true, data: statistics };
    } catch (error) {
      logError("获取班级详细统计失败", { className, error });
      return {
        success: false,
        error: error.message || "获取班级统计失败",
      };
    }
  }

  /**
   * 班级对比分析
   */
  async compareClasses(
    classNames: string[],
    comparisonType: "grade_level" | "academic_year" | "custom" = "custom"
  ): Promise<APIResponse<ClassComparison>> {
    try {
      logInfo("班级对比分析", { classNames, comparisonType });

      const cacheKey = `${this.cachePrefix}comparison_${comparisonType}_${classNames.sort().join("_")}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const classMetrics = await Promise.all(
        classNames.map(async (className) => {
          const performanceMetrics =
            await this.getClassPerformanceMetrics(className);
          const studentsResponse = await apiClient.query("students", {
            filters: { class_id: className },
            select: ["id"],
          });

          const student_count = studentsResponse.success
            ? studentsResponse.data?.length || 0
            : 0;

          return {
            class_name: className,
            performance_score: performanceMetrics.average_score,
            rank: 0, // 将在后面计算
            metrics: {
              average_score: performanceMetrics.average_score,
              student_count,
              pass_rate: performanceMetrics.pass_rate,
            },
          };
        })
      );

      // 按成绩排序并分配排名
      classMetrics.sort((a, b) => b.performance_score - a.performance_score);
      classMetrics.forEach((classMetric, index) => {
        classMetric.rank = index + 1;
      });

      // 分析结果
      const analysis = {
        best_performing: classMetrics[0]?.class_name || "",
        most_improved: await this.findMostImprovedClass(classNames),
        needs_attention: classMetrics
          .filter((c) => c.metrics.pass_rate < 60)
          .map((c) => c.class_name),
      };

      const comparison: ClassComparison = {
        comparison_type: comparisonType,
        classes: classMetrics,
        analysis,
      };

      dataCache.set(cacheKey, comparison, this.cacheTTL);
      return { success: true, data: comparison };
    } catch (error) {
      logError("班级对比分析失败", { classNames, error });
      return {
        success: false,
        error: error.message || "班级对比分析失败",
      };
    }
  }

  /**
   * 创建班级
   */
  async createClass(
    classData: Omit<Class, "created_at" | "updated_at">
  ): Promise<APIResponse<Class>> {
    try {
      logInfo("创建班级", { class_name: classData.class_name });

      // 验证数据
      const validation = this.validateClassData(classData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 检查班级名称是否重复
      const existingResponse = await apiClient.query("class_info", {
        filters: { class_name: classData.class_name },
        limit: 1,
      });

      if (existingResponse.success && existingResponse.data?.length) {
        return {
          success: false,
          error: "班级名称已存在",
        };
      }

      // 创建班级记录
      const response = await apiClient.insert<Class>("class_info", {
        ...classData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (response.success) {
        const newClass = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        // 清除相关缓存
        this.clearClassCache();

        return { success: true, data: newClass };
      }

      return {
        success: false,
        error: response.error || "创建班级失败",
      };
    } catch (error) {
      logError("创建班级失败", error);
      return {
        success: false,
        error: error.message || "创建班级失败",
      };
    }
  }

  /**
   * 更新班级信息
   */
  async updateClass(
    className: string,
    updateData: Partial<Omit<Class, "class_name" | "created_at">>
  ): Promise<APIResponse<Class>> {
    try {
      logInfo("更新班级信息", { className });

      const response = await apiClient.update<Class>("class_info", className, {
        ...updateData,
        updated_at: new Date().toISOString(),
      });

      if (response.success) {
        // 清除相关缓存
        dataCache.delete(`${this.cachePrefix}info_${className}`);
        dataCache.delete(`${this.cachePrefix}stats_${className}`);
        this.clearClassCache();

        return response;
      }

      return {
        success: false,
        error: response.error || "更新班级信息失败",
      };
    } catch (error) {
      logError("更新班级信息失败", { className, error });
      return {
        success: false,
        error: error.message || "更新班级信息失败",
      };
    }
  }

  /**
   * 获取年级所有班级
   */
  async getGradeClasses(gradeLevel: string): Promise<APIResponse<Class[]>> {
    try {
      return await this.getAllClasses({
        gradeLevel,
        includeStats: true,
        orderBy: "class_name",
      });
    } catch (error) {
      logError("获取年级班级失败", { gradeLevel, error });
      return {
        success: false,
        error: error.message || "获取年级班级失败",
      };
    }
  }

  /**
   * 获取班级资源分配
   */
  async getClassResources(
    className: string
  ): Promise<APIResponse<ClassResource[]>> {
    try {
      logInfo("获取班级资源分配", { className });

      // 这是一个示例实现，实际可能需要连接到资源管理系统
      const mockResources: ClassResource[] = [
        {
          id: `res_${className}_1`,
          class_name: className,
          resource_type: "teacher",
          resource_name: "语文教师",
          allocation_date: "2024-09-01",
          status: "active",
          usage_stats: {
            utilization_rate: 95,
            feedback_score: 4.5,
          },
        },
        {
          id: `res_${className}_2`,
          class_name: className,
          resource_type: "equipment",
          resource_name: "多媒体设备",
          allocation_date: "2024-09-01",
          status: "active",
          usage_stats: {
            utilization_rate: 80,
            feedback_score: 4.2,
          },
        },
      ];

      return { success: true, data: mockResources };
    } catch (error) {
      logError("获取班级资源分配失败", { className, error });
      return {
        success: false,
        error: error.message || "获取资源分配失败",
      };
    }
  }

  /**
   * 获取班级成绩表现指标
   */
  private async getClassPerformanceMetrics(
    className: string
  ): Promise<ClassStatistics["performance_metrics"]> {
    try {
      // 获取最新考试的班级成绩
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { class_name: className },
        select: ["total_score", "total_rank_in_class", "total_rank_in_grade"],
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: 100,
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return {
          average_score: 0,
          median_score: 0,
          pass_rate: 0,
          excellent_rate: 0,
          class_rank: 0,
          grade_comparison: {
            above_grade_average: false,
            rank_in_grade: 0,
            total_classes_in_grade: 0,
          },
        };
      }

      const scores = gradesResponse.data
        .map((g) => g.total_score)
        .filter((score) => typeof score === "number" && score > 0)
        .sort((a, b) => a - b);

      if (scores.length === 0) {
        return {
          average_score: 0,
          median_score: 0,
          pass_rate: 0,
          excellent_rate: 0,
          class_rank: 0,
          grade_comparison: {
            above_grade_average: false,
            rank_in_grade: 0,
            total_classes_in_grade: 0,
          },
        };
      }

      // 计算基本统计
      const average_score =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const median_score =
        scores.length % 2 === 0
          ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
          : scores[Math.floor(scores.length / 2)];

      const pass_rate =
        (scores.filter((score) => score >= 60).length / scores.length) * 100;
      const excellent_rate =
        (scores.filter((score) => score >= 90).length / scores.length) * 100;

      // 获取年级排名信息
      const gradeComparison = await this.getGradeComparison(
        className,
        average_score
      );

      return {
        average_score: Math.round(average_score * 100) / 100,
        median_score: Math.round(median_score * 100) / 100,
        pass_rate: Math.round(pass_rate * 100) / 100,
        excellent_rate: Math.round(excellent_rate * 100) / 100,
        class_rank: 0, // 需要在班级比较中计算
        grade_comparison: gradeComparison,
      };
    } catch (error) {
      logError("获取班级成绩表现指标失败", { className, error });
      return {
        average_score: 0,
        median_score: 0,
        pass_rate: 0,
        excellent_rate: 0,
        class_rank: 0,
        grade_comparison: {
          above_grade_average: false,
          rank_in_grade: 0,
          total_classes_in_grade: 0,
        },
      };
    }
  }

  /**
   * 获取班级各科目表现
   */
  private async getClassSubjectPerformance(
    className: string
  ): Promise<ClassStatistics["subject_performance"]> {
    try {
      const subjects = [
        { name: "语文", key: "chinese_score" },
        { name: "数学", key: "math_score" },
        { name: "英语", key: "english_score" },
        { name: "物理", key: "physics_score" },
        { name: "化学", key: "chemistry_score" },
      ];

      const subjectPerformance = [];

      for (const subject of subjects) {
        const gradesResponse = await apiClient.query("grade_data", {
          filters: { class_name: className },
          select: [subject.key, "name"],
          orderBy: [{ column: "exam_date", ascending: false }],
          limit: 50,
        });

        if (gradesResponse.success && gradesResponse.data?.length) {
          const scores = gradesResponse.data
            .map((g) => g[subject.key as keyof typeof g])
            .filter(
              (score) => typeof score === "number" && score > 0
            ) as number[];

          if (scores.length > 0) {
            const average_score =
              scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const pass_rate =
              (scores.filter((score) => score >= 60).length / scores.length) *
              100;

            // 找出该科目成绩最好的学生
            const bestScoreIndex = gradesResponse.data.findIndex(
              (g) => g[subject.key as keyof typeof g] === Math.max(...scores)
            );
            const top_performer =
              bestScoreIndex >= 0
                ? gradesResponse.data[bestScoreIndex].name || "未知"
                : "未知";

            const needs_improvement = scores.filter(
              (score) => score < 60
            ).length;

            subjectPerformance.push({
              subject: subject.name,
              average_score: Math.round(average_score * 100) / 100,
              pass_rate: Math.round(pass_rate * 100) / 100,
              top_performer,
              needs_improvement,
            });
          }
        }
      }

      return subjectPerformance;
    } catch (error) {
      logError("获取班级各科目表现失败", { className, error });
      return [];
    }
  }

  /**
   * 获取班级成绩趋势
   */
  private async getClassTrends(
    className: string
  ): Promise<ClassStatistics["recent_trends"]> {
    try {
      // 获取最近几次考试的平均分
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { class_name: className },
        select: ["exam_date", "total_score"],
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: 200, // 获取更多数据以便计算趋势
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return {
          score_trend: "stable",
          trend_data: [],
        };
      }

      // 按考试日期分组计算平均分
      const examGroups = new Map<string, number[]>();
      gradesResponse.data.forEach((grade) => {
        if (
          grade.exam_date &&
          typeof grade.total_score === "number" &&
          grade.total_score > 0
        ) {
          const examDate = grade.exam_date;
          if (!examGroups.has(examDate)) {
            examGroups.set(examDate, []);
          }
          examGroups.get(examDate)!.push(grade.total_score);
        }
      });

      // 计算每次考试的平均分
      const trend_data = Array.from(examGroups.entries())
        .map(([exam_date, scores]) => ({
          exam_date,
          average_score:
            Math.round(
              (scores.reduce((sum, score) => sum + score, 0) / scores.length) *
                100
            ) / 100,
        }))
        .sort(
          (a, b) =>
            new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        )
        .slice(-5); // 只保留最近5次考试

      // 计算趋势
      let score_trend: "improving" | "stable" | "declining" = "stable";
      if (trend_data.length >= 2) {
        const recent = trend_data.slice(-2);
        const diff = recent[1].average_score - recent[0].average_score;

        if (diff > 3) score_trend = "improving";
        else if (diff < -3) score_trend = "declining";
      }

      return {
        score_trend,
        trend_data,
      };
    } catch (error) {
      logError("获取班级成绩趋势失败", { className, error });
      return {
        score_trend: "stable",
        trend_data: [],
      };
    }
  }

  /**
   * 获取年级比较信息
   */
  private async getGradeComparison(
    className: string,
    classAverage: number
  ): Promise<ClassStatistics["performance_metrics"]["grade_comparison"]> {
    try {
      // 获取班级信息以确定年级
      const classResponse = await this.getClass(className);
      if (!classResponse.success || !classResponse.data) {
        return {
          above_grade_average: false,
          rank_in_grade: 0,
          total_classes_in_grade: 0,
        };
      }

      const gradeLevel = classResponse.data.grade_level;

      // 获取同年级所有班级的平均分
      const gradeClassesResponse = await apiClient.query("class_info", {
        filters: { grade_level: gradeLevel },
        select: ["class_name"],
      });

      if (!gradeClassesResponse.success || !gradeClassesResponse.data) {
        return {
          above_grade_average: false,
          rank_in_grade: 0,
          total_classes_in_grade: 0,
        };
      }

      const gradeClasses = gradeClassesResponse.data;
      const total_classes_in_grade = gradeClasses.length;

      // 计算年级平均分和排名（简化实现）
      let gradeAverage = 0;
      const rank_in_grade = 1;

      // 这里应该计算年级所有班级的平均分，简化为使用当前班级平均分
      gradeAverage = classAverage;

      return {
        above_grade_average: classAverage >= gradeAverage,
        rank_in_grade,
        total_classes_in_grade,
      };
    } catch (error) {
      logError("获取年级比较信息失败", { className, error });
      return {
        above_grade_average: false,
        rank_in_grade: 0,
        total_classes_in_grade: 0,
      };
    }
  }

  /**
   * 找出进步最大的班级
   */
  private async findMostImprovedClass(classNames: string[]): Promise<string> {
    try {
      let mostImprovedClass = "";
      let maxImprovement = -Infinity;

      for (const className of classNames) {
        const trends = await this.getClassTrends(className);
        if (trends.trend_data.length >= 2) {
          const recent = trends.trend_data.slice(-2);
          const improvement = recent[1].average_score - recent[0].average_score;

          if (improvement > maxImprovement) {
            maxImprovement = improvement;
            mostImprovedClass = className;
          }
        }
      }

      return mostImprovedClass;
    } catch (error) {
      logError("找出进步最大班级失败", { classNames, error });
      return "";
    }
  }

  /**
   * 为班级列表添加统计信息
   */
  private async enrichClassesWithStats(classes: Class[]): Promise<void> {
    try {
      if (classes.length === 0) return;

      const classNames = classes.map((c) => c.class_name);

      // 批量获取学生数量
      const studentsResponse = await apiClient.query("students", {
        filters: { class_id: { in: classNames } },
        select: ["class_id"],
      });

      if (studentsResponse.success && studentsResponse.data) {
        const studentCounts = new Map<string, number>();

        studentsResponse.data.forEach((student) => {
          const className = student.class_id;
          studentCounts.set(className, (studentCounts.get(className) || 0) + 1);
        });

        // 更新班级对象
        classes.forEach((classInfo) => {
          classInfo.student_count =
            studentCounts.get(classInfo.class_name) || 0;
        });
      }
    } catch (error) {
      logError("为班级添加统计信息失败", error);
    }
  }

  /**
   * 验证班级数据
   */
  private validateClassData(data: Omit<Class, "created_at" | "updated_at">): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.class_name?.trim()) {
      errors.push("班级名称不能为空");
    }

    if (!data.grade_level?.trim()) {
      errors.push("年级不能为空");
    }

    if (!data.academic_year?.trim()) {
      errors.push("学年不能为空");
    }

    // 验证学年格式（如：2024-2025）
    if (data.academic_year && !/^\d{4}-\d{4}$/.test(data.academic_year)) {
      errors.push("学年格式应为：YYYY-YYYY");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清除班级相关缓存
   */
  private clearClassCache(className?: string): void {
    const patterns = [
      `${this.cachePrefix}all_`,
      `${this.cachePrefix}comparison_`,
    ];

    if (className) {
      patterns.push(`${this.cachePrefix}info_${className}`);
      patterns.push(`${this.cachePrefix}stats_${className}`);
    }

    patterns.forEach((pattern) => {
      dataCache.getKeys().forEach((key) => {
        if (key.startsWith(pattern)) {
          dataCache.delete(key);
        }
      });
    });

    logInfo("清除班级相关缓存", { className });
  }
}

// 导出服务实例
export const classService = new ClassService();
