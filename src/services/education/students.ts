/**
 * 学生管理服务 - 统一学生数据管理
 *
 * 功能：
 * - 学生信息管理
 * - 学生画像生成
 * - 学习行为分析
 * - 学生分组管理
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import type { APIResponse } from "../core/api";
import { getClassNameByUUID } from "@/utils/classIdAdapter";

export interface Student {
  id: string;
  student_id: string;
  name: string;
  class_id?: string;
  class_name?: string;
  user_id?: string;
  admission_year?: string;
  gender?: "男" | "女" | "其他";
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
}

export interface StudentProfile {
  student: Student;
  academic_performance: {
    overall_rank: number;
    average_score: number;
    trend: "improving" | "stable" | "declining";
    strengths: string[];
    weaknesses: string[];
  };
  learning_behavior: {
    attendance_rate: number;
    homework_completion_rate: number;
    participation_level: "high" | "medium" | "low";
    learning_style: string[];
  };
  ai_tags: string[];
  custom_tags: string[];
  last_updated: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  description?: string;
  student_ids: string[];
  created_by: string;
  group_type: "academic" | "behavioral" | "custom";
  criteria: any;
  created_at: string;
}

export interface ClassSummary {
  class_name: string; // 主键：使用 class_name (TEXT) 替代 class_id (UUID)
  total_students: number;
  performance_stats: {
    average_score: number;
    top_performers: number;
    needs_attention: number;
  };
  recent_activity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

/**
 * 学生管理服务类
 */
export class StudentService {
  private readonly cachePrefix = "students_";
  private readonly cacheTTL = 20 * 60 * 1000; // 20分钟

  /**
   * 获取学生信息
   */
  async getStudent(studentId: string): Promise<APIResponse<Student>> {
    try {
      logInfo("获取学生信息", { studentId });

      const cacheKey = `${this.cachePrefix}info_${studentId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 优先从 student_id 字段查询
      let response = await apiClient.query<Student>("students", {
        filters: { student_id: studentId },
        limit: 1,
      });

      // 如果没找到，尝试用 id 查询
      if (!response.success || !response.data?.length) {
        response = await apiClient.query<Student>("students", {
          filters: { id: studentId },
          limit: 1,
        });
      }

      if (response.success && response.data?.length) {
        const student = response.data[0];

        // 补充班级信息：优先使用 class_name，如果只有 class_id 则转换
        if (!student.class_name && student.class_id) {
          // 使用 classIdAdapter 转换 UUID → TEXT
          const className = await getClassNameByUUID(student.class_id);
          if (className) {
            student.class_name = className;
          }
        }

        dataCache.set(cacheKey, student, this.cacheTTL);
        return { success: true, data: student };
      }

      return {
        success: false,
        error: "未找到学生信息",
      };
    } catch (error) {
      logError("获取学生信息失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取学生信息失败",
      };
    }
  }

  /**
   * 获取班级学生列表
   */
  async getClassStudents(
    classId: string,
    options: {
      includePerformance?: boolean;
      orderBy?: "name" | "student_id" | "performance";
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<APIResponse<Student[]>> {
    try {
      logInfo("获取班级学生列表", { classId, options });

      const cacheKey = `${this.cachePrefix}class_${classId}_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 构建查询条件
      let orderBy: Array<{ column: string; ascending: boolean }> = [];

      switch (options.orderBy) {
        case "student_id":
          orderBy = [{ column: "student_id", ascending: true }];
          break;
        case "name":
          orderBy = [{ column: "name", ascending: true }];
          break;
        default:
          orderBy = [{ column: "created_at", ascending: false }];
      }

      // 查询学生列表 - 支持 class_name (TEXT) 和 class_id (UUID) 双字段
      const response = await apiClient.query<Student>("students", {
        filters: {
          or: [
            { class_name: classId }, // 优先使用新字段
            { class_id: classId }, // 回退到旧字段
          ],
        } as any,
        orderBy,
        limit: options.limit || 50,
        offset: options.offset || 0,
      });

      if (response.success && response.data) {
        // 如果需要包含成绩信息，获取学生的基本成绩数据
        if (options.includePerformance) {
          await this.enrichStudentsWithPerformance(response.data);
        }

        dataCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取班级学生列表失败", { classId, error });
      return {
        success: false,
        error: error.message || "获取学生列表失败",
      };
    }
  }

  /**
   * 获取学生详细画像
   */
  async getStudentProfile(
    studentId: string
  ): Promise<APIResponse<StudentProfile>> {
    try {
      logInfo("获取学生详细画像", { studentId });

      const cacheKey = `${this.cachePrefix}profile_${studentId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取学生基本信息
      const studentResponse = await this.getStudent(studentId);
      if (!studentResponse.success || !studentResponse.data) {
        return {
          success: false,
          error: "未找到学生信息",
        };
      }

      const student = studentResponse.data;

      // 获取学术表现
      const academicPerformance =
        await this.getStudentAcademicPerformance(studentId);

      // 获取学习行为数据
      const learningBehavior = await this.getStudentLearningBehavior(studentId);

      // 获取AI标签和自定义标签
      const tagsResponse = await apiClient.query("student_portraits", {
        filters: { student_id: student.id },
        limit: 1,
      });

      let ai_tags: string[] = [];
      let custom_tags: string[] = [];
      let last_updated = new Date().toISOString();

      if (tagsResponse.success && tagsResponse.data?.length) {
        const portrait = tagsResponse.data[0];
        ai_tags = portrait.ai_tags || [];
        custom_tags = portrait.custom_tags || [];
        last_updated = portrait.last_updated || last_updated;
      }

      const profile: StudentProfile = {
        student,
        academic_performance: academicPerformance,
        learning_behavior: learningBehavior,
        ai_tags,
        custom_tags,
        last_updated,
      };

      dataCache.set(cacheKey, profile, this.cacheTTL);
      return { success: true, data: profile };
    } catch (error) {
      logError("获取学生详细画像失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取学生画像失败",
      };
    }
  }

  /**
   * 创建学生
   */
  async createStudent(
    studentData: Omit<Student, "id" | "created_at">
  ): Promise<APIResponse<Student>> {
    try {
      logInfo("创建学生", {
        student_id: studentData.student_id,
        name: studentData.name,
      });

      // 验证数据
      const validation = this.validateStudentData(studentData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 检查学号是否重复
      const existingResponse = await apiClient.query("students", {
        filters: { student_id: studentData.student_id },
        limit: 1,
      });

      if (existingResponse.success && existingResponse.data?.length) {
        return {
          success: false,
          error: "学号已存在",
        };
      }

      // 创建学生记录
      const response = await apiClient.insert<Student>("students", {
        ...studentData,
        created_at: new Date().toISOString(),
      });

      if (response.success) {
        const student = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        // 清除相关缓存
        this.clearStudentCache(studentData.class_id);

        return { success: true, data: student };
      }

      return {
        success: false,
        error: response.error || "创建学生失败",
      };
    } catch (error) {
      logError("创建学生失败", error);
      return {
        success: false,
        error: error.message || "创建学生失败",
      };
    }
  }

  /**
   * 更新学生信息
   */
  async updateStudent(
    studentId: string,
    updateData: Partial<Omit<Student, "id" | "created_at">>
  ): Promise<APIResponse<Student>> {
    try {
      logInfo("更新学生信息", { studentId });

      // 如果更新学号，检查重复
      if (updateData.student_id) {
        const existingResponse = await apiClient.query("students", {
          filters: {
            student_id: updateData.student_id,
            id: { neq: studentId } as any,
          },
          limit: 1,
        });

        if (existingResponse.success && existingResponse.data?.length) {
          return {
            success: false,
            error: "学号已存在",
          };
        }
      }

      const response = await apiClient.update<Student>(
        "students",
        studentId,
        updateData
      );

      if (response.success) {
        // 清除相关缓存
        dataCache.delete(`${this.cachePrefix}info_${studentId}`);
        dataCache.delete(`${this.cachePrefix}profile_${studentId}`);

        if (updateData.class_id) {
          this.clearStudentCache(updateData.class_id);
        }

        return response;
      }

      return {
        success: false,
        error: response.error || "更新学生信息失败",
      };
    } catch (error) {
      logError("更新学生信息失败", { studentId, error });
      return {
        success: false,
        error: error.message || "更新学生信息失败",
      };
    }
  }

  /**
   * 批量导入学生
   */
  async importStudents(
    studentsData: Omit<Student, "id" | "created_at">[],
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<
    APIResponse<{
      imported: number;
      updated: number;
      skipped: number;
      errors: string[];
    }>
  > {
    try {
      logInfo("批量导入学生", { count: studentsData.length, options });

      const { skipDuplicates = true, updateExisting = false } = options;
      const errors: string[] = [];
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      // 获取现有学生的学号
      const existingStudentIds = new Set<string>();
      if (skipDuplicates || updateExisting) {
        const existingResponse = await apiClient.query("students", {
          select: ["student_id"],
        });

        if (existingResponse.success && existingResponse.data) {
          existingResponse.data.forEach((s) =>
            existingStudentIds.add(s.student_id)
          );
        }
      }

      const studentsToCreate: typeof studentsData = [];
      const studentsToUpdate: Array<{
        student_id: string;
        data: (typeof studentsData)[0];
      }> = [];

      // 分类处理
      for (const studentData of studentsData) {
        // 验证数据
        const validation = this.validateStudentData(studentData);
        if (!validation.valid) {
          errors.push(
            `学生${studentData.student_id}: ${validation.errors.join(", ")}`
          );
          continue;
        }

        if (existingStudentIds.has(studentData.student_id)) {
          if (updateExisting) {
            studentsToUpdate.push({
              student_id: studentData.student_id,
              data: studentData,
            });
          } else if (skipDuplicates) {
            skipped++;
          }
        } else {
          studentsToCreate.push(studentData);
        }
      }

      // 批量创建新学生
      if (studentsToCreate.length > 0) {
        const createData = studentsToCreate.map((data) => ({
          ...data,
          created_at: new Date().toISOString(),
        }));

        const createResponse = await apiClient.insert("students", createData);
        if (createResponse.success) {
          imported = studentsToCreate.length;
        } else {
          errors.push(`批量创建失败: ${createResponse.error}`);
        }
      }

      // 批量更新现有学生
      for (const { student_id, data } of studentsToUpdate) {
        try {
          const updateResponse = await apiClient.query("students", {
            filters: { student_id },
            limit: 1,
          });

          if (updateResponse.success && updateResponse.data?.length) {
            const studentId = updateResponse.data[0].id;
            const result = await apiClient.update("students", studentId, data);

            if (result.success) {
              updated++;
            } else {
              errors.push(`更新学生${student_id}失败: ${result.error}`);
            }
          }
        } catch (error) {
          errors.push(`更新学生${student_id}失败: ${error.message}`);
        }
      }

      // 清除缓存
      const classIds = [
        ...new Set(studentsData.map((s) => s.class_id).filter(Boolean)),
      ];
      classIds.forEach((classId) => this.clearStudentCache(classId));

      return {
        success: errors.length === 0,
        data: { imported, updated, skipped, errors },
        error:
          errors.length > 0
            ? `导入完成，但有${errors.length}个错误`
            : undefined,
      };
    } catch (error) {
      logError("批量导入学生失败", error);
      return {
        success: false,
        error: error.message || "批量导入失败",
        data: { imported: 0, updated: 0, skipped: 0, errors: [error.message] },
      };
    }
  }

  /**
   * 搜索学生
   */
  async searchStudents(
    query: string,
    options: {
      classId?: string;
      limit?: number;
    } = {}
  ): Promise<APIResponse<Student[]>> {
    try {
      logInfo("搜索学生", { query, options });

      const filters: any = {};

      // 班级过滤 - 支持 class_name (TEXT) 和 class_id (UUID) 双字段
      if (options.classId) {
        filters.or = [
          { class_name: options.classId },
          { class_id: options.classId },
        ];
      }

      // 构建搜索条件（姓名或学号模糊匹配）
      const searchFilters = [
        { ...filters, name: { ilike: `%${query}%` } },
        { ...filters, student_id: { ilike: `%${query}%` } },
      ];

      const promises = searchFilters.map((filter) =>
        apiClient.query<Student>("students", {
          filters: filter,
          limit: Math.floor((options.limit || 20) / 2),
        })
      );

      const responses = await Promise.all(promises);

      // 合并结果并去重
      const allStudents: Student[] = [];
      const seenIds = new Set<string>();

      responses.forEach((response) => {
        if (response.success && response.data) {
          response.data.forEach((student) => {
            if (!seenIds.has(student.id)) {
              seenIds.add(student.id);
              allStudents.push(student);
            }
          });
        }
      });

      // 按相关性排序（姓名匹配优先）
      allStudents.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
        const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        data: allStudents.slice(0, options.limit || 20),
      };
    } catch (error) {
      logError("搜索学生失败", { query, error });
      return {
        success: false,
        error: error.message || "搜索失败",
      };
    }
  }

  /**
   * 获取班级概览
   */
  async getClassSummary(classId: string): Promise<APIResponse<ClassSummary>> {
    try {
      logInfo("获取班级概览", { classId });

      const cacheKey = `${this.cachePrefix}class_summary_${classId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取班级基本信息
      const classResponse = await apiClient.query("class_info", {
        filters: { class_name: classId },
        limit: 1,
      });

      const class_name =
        classResponse.success && classResponse.data?.length
          ? classResponse.data[0].class_name
          : classId;

      // 获取学生总数
      const studentsResponse = await this.getClassStudents(classId);
      const total_students = studentsResponse.success
        ? studentsResponse.data?.length || 0
        : 0;

      // 获取成绩表现统计
      const performanceStats = await this.getClassPerformanceStats(classId);

      // 获取最近活动（暂时返回空数组，后续可以添加具体实现）
      const recent_activity: Array<{
        type: string;
        description: string;
        timestamp: string;
      }> = [];

      const summary: ClassSummary = {
        class_name, // 使用 class_name 作为主键
        total_students,
        performance_stats: performanceStats,
        recent_activity,
      };

      dataCache.set(cacheKey, summary, this.cacheTTL);
      return { success: true, data: summary };
    } catch (error) {
      logError("获取班级概览失败", { classId, error });
      return {
        success: false,
        error: error.message || "获取班级概览失败",
      };
    }
  }

  /**
   * 获取学生学术表现
   */
  private async getStudentAcademicPerformance(
    studentId: string
  ): Promise<StudentProfile["academic_performance"]> {
    try {
      // 获取最近的成绩记录
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { student_id: studentId },
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: 10,
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return {
          overall_rank: 0,
          average_score: 0,
          trend: "stable",
          strengths: [],
          weaknesses: [],
        };
      }

      const grades = gradesResponse.data;

      // 计算平均分
      const validScores = grades
        .map((g) => g.total_score)
        .filter((score) => typeof score === "number" && score > 0);

      const average_score =
        validScores.length > 0
          ? validScores.reduce((sum, score) => sum + score, 0) /
            validScores.length
          : 0;

      // 计算趋势
      const trend = this.calculateTrend(validScores);

      // 分析优势劣势科目
      const { strengths, weaknesses } = this.analyzeSubjectPerformance(grades);

      return {
        overall_rank: grades[0]?.total_rank_in_class || 0,
        average_score: Math.round(average_score * 100) / 100,
        trend,
        strengths,
        weaknesses,
      };
    } catch (error) {
      logError("获取学生学术表现失败", { studentId, error });
      return {
        overall_rank: 0,
        average_score: 0,
        trend: "stable",
        strengths: [],
        weaknesses: [],
      };
    }
  }

  /**
   * 获取学生学习行为
   */
  private async getStudentLearningBehavior(
    studentId: string
  ): Promise<StudentProfile["learning_behavior"]> {
    try {
      // 获取作业完成率
      const homeworkResponse = await apiClient.query("homework_submissions", {
        filters: { student_id: studentId },
        select: ["status"],
      });

      let homework_completion_rate = 0;
      if (homeworkResponse.success && homeworkResponse.data?.length) {
        const submissions = homeworkResponse.data;
        const completed = submissions.filter(
          (s) => s.status !== "missing"
        ).length;
        homework_completion_rate = (completed / submissions.length) * 100;
      }

      return {
        attendance_rate: 95, // 暂时使用固定值，后续可以从考勤系统获取
        homework_completion_rate:
          Math.round(homework_completion_rate * 100) / 100,
        participation_level:
          homework_completion_rate >= 80
            ? "high"
            : homework_completion_rate >= 60
              ? "medium"
              : "low",
        learning_style: ["视觉学习者"], // 暂时使用固定值，后续可以通过AI分析得出
      };
    } catch (error) {
      logError("获取学生学习行为失败", { studentId, error });
      return {
        attendance_rate: 0,
        homework_completion_rate: 0,
        participation_level: "low",
        learning_style: [],
      };
    }
  }

  /**
   * 获取班级成绩表现统计
   */
  private async getClassPerformanceStats(
    classId: string
  ): Promise<ClassSummary["performance_stats"]> {
    try {
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { class_name: classId },
        select: ["total_score"],
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: 100,
      });

      if (!gradesResponse.success || !gradesResponse.data?.length) {
        return {
          average_score: 0,
          top_performers: 0,
          needs_attention: 0,
        };
      }

      const scores = gradesResponse.data
        .map((g) => g.total_score)
        .filter((score) => typeof score === "number" && score > 0);

      if (scores.length === 0) {
        return {
          average_score: 0,
          top_performers: 0,
          needs_attention: 0,
        };
      }

      const average_score =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const top_performers = scores.filter(
        (score) => score >= average_score + 20
      ).length;
      const needs_attention = scores.filter(
        (score) => score < average_score - 20
      ).length;

      return {
        average_score: Math.round(average_score * 100) / 100,
        top_performers,
        needs_attention,
      };
    } catch (error) {
      logError("获取班级成绩表现统计失败", { classId, error });
      return {
        average_score: 0,
        top_performers: 0,
        needs_attention: 0,
      };
    }
  }

  /**
   * 为学生列表添加成绩信息
   */
  private async enrichStudentsWithPerformance(
    students: Student[]
  ): Promise<void> {
    try {
      if (students.length === 0) return;

      const studentIds = students.map((s) => s.student_id);

      // 批量获取最新成绩
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { student_id: { in: studentIds } as any },
        select: ["student_id", "total_score", "total_rank_in_class"],
        orderBy: [{ column: "exam_date", ascending: false }],
      });

      if (gradesResponse.success && gradesResponse.data) {
        const gradesMap = new Map();

        // 为每个学生保留最新的成绩记录
        gradesResponse.data.forEach((grade) => {
          if (!gradesMap.has(grade.student_id)) {
            gradesMap.set(grade.student_id, grade);
          }
        });

        // 将成绩信息添加到学生对象
        students.forEach((student) => {
          const grade = gradesMap.get(student.student_id);
          if (grade) {
            (student as any).latest_score = grade.total_score;
            (student as any).class_rank = grade.total_rank_in_class;
          }
        });
      }
    } catch (error) {
      logError("为学生添加成绩信息失败", error);
    }
  }

  /**
   * 验证学生数据（宽松模式：支持智能匹配和自动创建）
   */
  private validateStudentData(data: Omit<Student, "id" | "created_at">): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 🔄 宽松验证：至少有姓名或学号其中之一即可
    if (!data.student_id?.trim() && !data.name?.trim()) {
      errors.push("至少需要提供姓名或学号其中之一");
    }

    if (
      data.contact_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)
    ) {
      errors.push("邮箱格式不正确");
    }

    if (data.contact_phone && !/^1[3-9]\d{9}$/.test(data.contact_phone)) {
      errors.push("手机号格式不正确");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 计算成绩趋势
   */
  private calculateTrend(
    scores: number[]
  ): "improving" | "stable" | "declining" {
    if (scores.length < 2) return "stable";

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
  private analyzeSubjectPerformance(grades: any[]): {
    strengths: string[];
    weaknesses: string[];
  } {
    const subjects = [
      { name: "语文", key: "chinese_score" },
      { name: "数学", key: "math_score" },
      { name: "英语", key: "english_score" },
      { name: "物理", key: "physics_score" },
      { name: "化学", key: "chemistry_score" },
    ];

    const subjectAvgs = subjects
      .map((subject) => {
        const scores = grades
          .map((record) => record[subject.key])
          .filter((score) => typeof score === "number" && score > 0);

        if (scores.length === 0) return { name: subject.name, avg: 0 };

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return { name: subject.name, avg };
      })
      .filter((s) => s.avg > 0);

    if (subjectAvgs.length === 0) {
      return { strengths: [], weaknesses: [] };
    }

    subjectAvgs.sort((a, b) => b.avg - a.avg);

    const strengths = subjectAvgs.slice(0, 2).map((s) => s.name);
    const weaknesses = subjectAvgs.slice(-2).map((s) => s.name);

    return { strengths, weaknesses };
  }

  /**
   * 清除学生相关缓存
   */
  private clearStudentCache(classId?: string): void {
    const patterns = [
      `${this.cachePrefix}info_`,
      `${this.cachePrefix}profile_`,
    ];

    if (classId) {
      patterns.push(`${this.cachePrefix}class_${classId}`);
      patterns.push(`${this.cachePrefix}class_summary_${classId}`);
    }

    patterns.forEach((pattern) => {
      dataCache.getKeys().forEach((key) => {
        if (key.startsWith(pattern)) {
          dataCache.delete(key);
        }
      });
    });

    logInfo("清除学生相关缓存", { classId });
  }
}

// 导出服务实例
export const studentService = new StudentService();
