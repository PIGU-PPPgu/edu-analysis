/**
 * 作业管理服务 - 统一作业业务逻辑
 *
 * 功能：
 * - 作业创建和管理
 * - 作业提交和批改
 * - 知识点分析和评估
 * - 作业统计和报告
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import { aiOrchestrator } from "../ai/orchestrator";
import type { APIResponse } from "../core/api";
import type { KnowledgePoint } from "@/types/homework";

export interface Homework {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  class_id?: string; // ⚠️ 保留为可选（过渡期兼容）
  class_name?: string; // ➕ 新增主键字段 (TEXT)
  created_by: string;
  grading_scale_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string;
  files?: any[];
  status: "submitted" | "graded" | "late" | "missing";
  score?: number;
  grade?: string;
  feedback?: string;
  teacher_feedback?: string;
  ai_analysis?: any;
  knowledge_points_assessed: boolean;
  updated_at?: string;
}

export interface HomeworkAnalytics {
  homework_id: string;
  total_students: number;
  submitted_count: number;
  graded_count: number;
  submission_rate: number;
  average_score?: number;
  grade_distribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  knowledge_point_mastery: Array<{
    name: string;
    mastery_rate: number;
    difficulty_level: "easy" | "medium" | "hard";
  }>;
}

export interface HomeworkCreationData {
  title: string;
  description?: string;
  due_date: string;
  class_id?: string; // ⚠️ 保留为可选（过渡期兼容）
  class_name?: string; // ➕ 新增主键字段 (TEXT)
  created_by: string;
  grading_scale_id?: string;
  knowledge_points?: string[];
  instructions?: string;
  attachments?: string[];
}

/**
 * 作业管理服务类
 */
export class HomeworkService {
  private readonly cachePrefix = "homework_";
  private readonly cacheTTL = 10 * 60 * 1000; // 10分钟

  /**
   * 创建作业
   */
  async createHomework(
    data: HomeworkCreationData
  ): Promise<APIResponse<Homework>> {
    try {
      logInfo("创建作业", {
        title: data.title,
        class_name: data.class_name || data.class_id, // 支持两者
      });

      // 验证数据
      const validation = this.validateHomeworkData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // 创建作业记录 - 过渡期双字段写入策略
      const classValue = data.class_name || data.class_id;
      const homeworkResponse = await apiClient.insert<Homework>("homework", {
        ...data,
        class_name: classValue, // ✅ 主字段
        class_id: classValue, // ⚠️ 过渡期兼容字段
        created_at: new Date().toISOString(),
      });

      if (!homeworkResponse.success || !homeworkResponse.data) {
        return {
          success: false,
          error: homeworkResponse.error || "作业创建失败",
        };
      }

      const homework = Array.isArray(homeworkResponse.data)
        ? homeworkResponse.data[0]
        : homeworkResponse.data;

      // 如果有知识点，创建知识点记录
      if (data.knowledge_points && data.knowledge_points.length > 0) {
        await this.createKnowledgePoints(homework.id, data.knowledge_points);
      }

      // 清除相关缓存
      this.clearHomeworkCache(data.class_name || data.class_id || "");

      logInfo("作业创建成功", { homework_id: homework.id });
      return { success: true, data: homework };
    } catch (error) {
      logError("创建作业失败", error);
      return {
        success: false,
        error: error.message || "作业创建失败",
      };
    }
  }

  /**
   * 获取班级作业列表
   */
  async getClassHomework(
    classId: string,
    options: {
      status?: "active" | "completed" | "overdue";
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<APIResponse<Homework[]>> {
    try {
      logInfo("获取班级作业列表", { classId, options });

      const cacheKey = `${this.cachePrefix}class_${classId}_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 支持 class_name (TEXT) 和 class_id (UUID) 双字段查询
      const filters: any = {
        or: [{ class_name: classId }, { class_id: classId }],
      };
      const orderBy = [{ column: "created_at", ascending: false }];

      // 根据状态过滤
      if (options.status) {
        const now = new Date().toISOString();
        switch (options.status) {
          case "active":
            filters.due_date = { gte: now };
            break;
          case "overdue":
            filters.due_date = { lt: now };
            break;
          // completed 状态需要更复杂的查询，暂时不实现
        }
      }

      const response = await apiClient.query<Homework>("homework", {
        filters,
        orderBy,
        limit: options.limit || 20,
        offset: options.offset || 0,
      });

      if (response.success && response.data) {
        dataCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取班级作业列表失败", { classId, error });
      return {
        success: false,
        error: error.message || "获取作业列表失败",
      };
    }
  }

  /**
   * 提交作业
   */
  async submitHomework(
    homeworkId: string,
    studentId: string,
    submissionData: {
      files?: any[];
      content?: string;
      note?: string;
    }
  ): Promise<APIResponse<HomeworkSubmission>> {
    try {
      logInfo("提交作业", { homeworkId, studentId });

      // 检查是否已经提交过
      const existingSubmission = await apiClient.query<HomeworkSubmission>(
        "homework_submissions",
        {
          filters: {
            homework_id: homeworkId,
            student_id: studentId,
          },
          limit: 1,
        }
      );

      let submission: HomeworkSubmission;

      if (existingSubmission.success && existingSubmission.data?.length > 0) {
        // 更新现有提交
        const updateResponse = await apiClient.update(
          "homework_submissions",
          existingSubmission.data[0].id,
          {
            files: submissionData.files,
            submitted_at: new Date().toISOString(),
            status: "submitted",
            updated_at: new Date().toISOString(),
          }
        );

        if (!updateResponse.success) {
          return {
            success: false,
            error: updateResponse.error || "更新作业提交失败",
          };
        }

        submission = { ...existingSubmission.data[0], ...updateResponse.data };
      } else {
        // 创建新提交
        const createResponse = await apiClient.insert<HomeworkSubmission>(
          "homework_submissions",
          {
            homework_id: homeworkId,
            student_id: studentId,
            submitted_at: new Date().toISOString(),
            files: submissionData.files,
            status: "submitted",
            knowledge_points_assessed: false,
          }
        );

        if (!createResponse.success || !createResponse.data) {
          return {
            success: false,
            error: createResponse.error || "创建作业提交失败",
          };
        }

        submission = Array.isArray(createResponse.data)
          ? createResponse.data[0]
          : createResponse.data;
      }

      // 触发AI分析（异步）
      this.triggerAIAnalysis(submission.id, submissionData.content);

      // 清除相关缓存
      this.clearSubmissionCache(homeworkId);

      return { success: true, data: submission };
    } catch (error) {
      logError("提交作业失败", { homeworkId, studentId, error });
      return {
        success: false,
        error: error.message || "作业提交失败",
      };
    }
  }

  /**
   * 批改作业
   */
  async gradeHomework(
    submissionId: string,
    gradeData: {
      score?: number;
      grade?: string;
      feedback?: string;
      teacher_feedback?: string;
      knowledge_point_assessments?: Array<{
        knowledge_point_id: string;
        mastery_level: number;
        comments?: string;
      }>;
    }
  ): Promise<APIResponse<HomeworkSubmission>> {
    try {
      logInfo("批改作业", { submissionId });

      // 更新提交记录
      const updateResponse = await apiClient.update<HomeworkSubmission>(
        "homework_submissions",
        submissionId,
        {
          ...gradeData,
          status: "graded",
          updated_at: new Date().toISOString(),
        }
      );

      if (!updateResponse.success) {
        return {
          success: false,
          error: updateResponse.error || "作业批改失败",
        };
      }

      // 更新知识点掌握度记录
      if (gradeData.knowledge_point_assessments) {
        await this.updateKnowledgePointMastery(
          submissionId,
          gradeData.knowledge_point_assessments
        );
      }

      // 清除相关缓存
      const submission = updateResponse.data as HomeworkSubmission;
      this.clearSubmissionCache(submission.homework_id);

      return { success: true, data: submission };
    } catch (error) {
      logError("批改作业失败", { submissionId, error });
      return {
        success: false,
        error: error.message || "作业批改失败",
      };
    }
  }

  /**
   * 获取作业统计分析
   */
  async getHomeworkAnalytics(
    homeworkId: string
  ): Promise<APIResponse<HomeworkAnalytics>> {
    try {
      logInfo("获取作业统计分析", { homeworkId });

      const cacheKey = `${this.cachePrefix}analytics_${homeworkId}`;
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取作业信息
      const homeworkResponse = await apiClient.query<Homework>("homework", {
        filters: { id: homeworkId },
        limit: 1,
      });

      if (!homeworkResponse.success || !homeworkResponse.data?.length) {
        return {
          success: false,
          error: "未找到作业信息",
        };
      }

      const homework = homeworkResponse.data[0];

      // 获取班级学生总数 - 支持 class_name (TEXT) 和 class_id (UUID) 双字段
      const classIdentifier = homework.class_name || homework.class_id;
      const studentsResponse = await apiClient.query("students", {
        filters: {
          or: [{ class_name: classIdentifier }, { class_id: classIdentifier }],
        } as any,
        select: ["id"],
      });

      const total_students = studentsResponse.data?.length || 0;

      // 获取提交统计
      const submissionsResponse = await apiClient.query<HomeworkSubmission>(
        "homework_submissions",
        {
          filters: { homework_id: homeworkId },
        }
      );

      const submissions = submissionsResponse.data || [];
      const submitted_count = submissions.length;
      const graded_count = submissions.filter(
        (s) => s.status === "graded"
      ).length;
      const submission_rate =
        total_students > 0 ? (submitted_count / total_students) * 100 : 0;

      // 计算平均分
      const gradedSubmissions = submissions.filter(
        (s) => s.score !== null && s.score !== undefined
      );
      const average_score =
        gradedSubmissions.length > 0
          ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
            gradedSubmissions.length
          : undefined;

      // 成绩分布
      const gradeDistribution = this.calculateGradeDistribution(submissions);

      // 知识点掌握度分析
      const knowledgePointMastery =
        await this.analyzeKnowledgePointMastery(homeworkId);

      const analytics: HomeworkAnalytics = {
        homework_id: homeworkId,
        total_students,
        submitted_count,
        graded_count,
        submission_rate: Math.round(submission_rate * 100) / 100,
        average_score: average_score
          ? Math.round(average_score * 100) / 100
          : undefined,
        grade_distribution: gradeDistribution,
        knowledge_point_mastery: knowledgePointMastery,
      };

      dataCache.set(cacheKey, analytics, this.cacheTTL);
      return { success: true, data: analytics };
    } catch (error) {
      logError("获取作业统计分析失败", { homeworkId, error });
      return {
        success: false,
        error: error.message || "获取统计分析失败",
      };
    }
  }

  /**
   * 获取学生作业提交记录
   */
  async getStudentSubmissions(
    studentId: string,
    options: {
      homeworkId?: string;
      status?: string;
      limit?: number;
    } = {}
  ): Promise<APIResponse<HomeworkSubmission[]>> {
    try {
      logInfo("获取学生作业提交记录", { studentId, options });

      const filters: any = { student_id: studentId };
      if (options.homeworkId) filters.homework_id = options.homeworkId;
      if (options.status) filters.status = options.status;

      const response = await apiClient.query<HomeworkSubmission>(
        "homework_submissions",
        {
          filters,
          orderBy: [{ column: "submitted_at", ascending: false }],
          limit: options.limit || 20,
        }
      );

      return response;
    } catch (error) {
      logError("获取学生作业提交记录失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取提交记录失败",
      };
    }
  }

  /**
   * 触发AI分析（异步）
   */
  private async triggerAIAnalysis(
    submissionId: string,
    content?: string
  ): Promise<void> {
    try {
      if (!content) return;

      logInfo("触发作业AI分析", { submissionId });

      // 异步执行AI分析
      setTimeout(async () => {
        try {
          const analysisRequest = {
            type: "analysis" as const,
            content,
            context: {
              homeworkId: submissionId,
            },
            options: {
              enableCache: true,
            },
          };

          const response = await aiOrchestrator.process(analysisRequest);

          if (response.success) {
            // 更新提交记录的AI分析结果
            await apiClient.update("homework_submissions", submissionId, {
              ai_analysis: response.data,
              updated_at: new Date().toISOString(),
            });

            logInfo("作业AI分析完成", { submissionId });
          }
        } catch (error) {
          logError("作业AI分析失败", { submissionId, error });
        }
      }, 1000); // 延迟1秒执行
    } catch (error) {
      logError("触发AI分析失败", { submissionId, error });
    }
  }

  /**
   * 创建知识点记录
   */
  private async createKnowledgePoints(
    homeworkId: string,
    knowledgePoints: string[]
  ): Promise<void> {
    try {
      const knowledgePointRecords = knowledgePoints.map((name) => ({
        homework_id: homeworkId,
        name: name.trim(),
        description: "",
        created_at: new Date().toISOString(),
      }));

      await apiClient.insert("knowledge_points", knowledgePointRecords);
      logInfo("知识点创建成功", { homeworkId, count: knowledgePoints.length });
    } catch (error) {
      logError("创建知识点失败", { homeworkId, error });
    }
  }

  /**
   * 更新知识点掌握度
   */
  private async updateKnowledgePointMastery(
    submissionId: string,
    assessments: Array<{
      knowledge_point_id: string;
      mastery_level: number;
      comments?: string;
    }>
  ): Promise<void> {
    try {
      // 获取提交信息
      const submissionResponse = await apiClient.query<HomeworkSubmission>(
        "homework_submissions",
        {
          filters: { id: submissionId },
          limit: 1,
        }
      );

      if (!submissionResponse.success || !submissionResponse.data?.length) {
        throw new Error("未找到提交记录");
      }

      const submission = submissionResponse.data[0];

      // 创建或更新掌握度记录
      for (const assessment of assessments) {
        const masteryRecord = {
          student_id: submission.student_id,
          knowledge_point_id: assessment.knowledge_point_id,
          homework_id: submission.homework_id,
          submission_id: submissionId,
          mastery_level: assessment.mastery_level,
          mastery_grade: this.levelToGrade(assessment.mastery_level),
          comments: assessment.comments,
        };

        // 检查是否已存在记录
        const existingResponse = await apiClient.query(
          "student_knowledge_mastery",
          {
            filters: {
              student_id: submission.student_id,
              knowledge_point_id: assessment.knowledge_point_id,
              homework_id: submission.homework_id,
            },
            limit: 1,
          }
        );

        if (existingResponse.success && existingResponse.data?.length > 0) {
          // 更新现有记录
          await apiClient.update(
            "student_knowledge_mastery",
            existingResponse.data[0].id,
            masteryRecord
          );
        } else {
          // 创建新记录
          await apiClient.insert("student_knowledge_mastery", masteryRecord);
        }
      }

      // 标记知识点已评估
      await apiClient.update("homework_submissions", submissionId, {
        knowledge_points_assessed: true,
      });

      logInfo("知识点掌握度更新成功", {
        submissionId,
        count: assessments.length,
      });
    } catch (error) {
      logError("更新知识点掌握度失败", { submissionId, error });
    }
  }

  /**
   * 验证作业数据
   */
  private validateHomeworkData(data: HomeworkCreationData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.title?.trim()) {
      errors.push("作业标题不能为空");
    }

    if (!data.due_date) {
      errors.push("截止日期不能为空");
    } else {
      const dueDate = new Date(data.due_date);
      if (isNaN(dueDate.getTime())) {
        errors.push("截止日期格式无效");
      } else if (dueDate < new Date()) {
        errors.push("截止日期不能早于当前时间");
      }
    }

    if (!data.class_name?.trim() && !data.class_id?.trim()) {
      errors.push("班级标识不能为空（class_name 或 class_id 必填其一）");
    }

    if (!data.created_by?.trim()) {
      errors.push("创建者ID不能为空");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 计算成绩分布
   */
  private calculateGradeDistribution(submissions: HomeworkSubmission[]): Array<{
    grade: string;
    count: number;
    percentage: number;
  }> {
    const gradeCounts = new Map<string, number>();
    const gradedSubmissions = submissions.filter((s) => s.grade);

    gradedSubmissions.forEach((submission) => {
      const grade = submission.grade || "N/A";
      gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
    });

    const total = gradedSubmissions.length;
    const distribution = Array.from(gradeCounts.entries()).map(
      ([grade, count]) => ({
        grade,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      })
    );

    return distribution.sort((a, b) => b.count - a.count);
  }

  /**
   * 分析知识点掌握度
   */
  private async analyzeKnowledgePointMastery(homeworkId: string): Promise<
    Array<{
      name: string;
      mastery_rate: number;
      difficulty_level: "easy" | "medium" | "hard";
    }>
  > {
    try {
      // 获取作业的知识点
      const knowledgePointsResponse = await apiClient.query(
        "knowledge_points",
        {
          filters: { homework_id: homeworkId },
        }
      );

      if (
        !knowledgePointsResponse.success ||
        !knowledgePointsResponse.data?.length
      ) {
        return [];
      }

      const knowledgePoints = knowledgePointsResponse.data;
      const masteries = [];

      for (const kp of knowledgePoints) {
        // 获取该知识点的掌握度记录
        const masteryResponse = await apiClient.query(
          "student_knowledge_mastery",
          {
            filters: {
              knowledge_point_id: kp.id,
              homework_id: homeworkId,
            },
          }
        );

        if (masteryResponse.success && masteryResponse.data?.length) {
          const records = masteryResponse.data;
          const totalStudents = records.length;
          const masteredStudents = records.filter(
            (r) => r.mastery_level >= 70
          ).length; // 70分以上算掌握
          const mastery_rate =
            totalStudents > 0 ? (masteredStudents / totalStudents) * 100 : 0;

          // 根据掌握率判断难度
          let difficulty_level: "easy" | "medium" | "hard";
          if (mastery_rate >= 80) difficulty_level = "easy";
          else if (mastery_rate >= 50) difficulty_level = "medium";
          else difficulty_level = "hard";

          masteries.push({
            name: kp.name,
            mastery_rate: Math.round(mastery_rate * 100) / 100,
            difficulty_level,
          });
        }
      }

      return masteries;
    } catch (error) {
      logError("分析知识点掌握度失败", { homeworkId, error });
      return [];
    }
  }

  /**
   * 掌握度等级转换为字母等级
   */
  private levelToGrade(level: number): string {
    if (level >= 90) return "A";
    if (level >= 80) return "B";
    if (level >= 70) return "C";
    if (level >= 60) return "D";
    return "E";
  }

  /**
   * 清除作业相关缓存
   */
  private clearHomeworkCache(classId: string): void {
    const patterns = [
      `${this.cachePrefix}class_${classId}`,
      `${this.cachePrefix}analytics_`,
    ];

    patterns.forEach((pattern) => {
      dataCache.getKeys().forEach((key) => {
        if (key.startsWith(pattern)) {
          dataCache.delete(key);
        }
      });
    });

    logInfo("清除作业相关缓存", { classId });
  }

  /**
   * 清除提交相关缓存
   */
  private clearSubmissionCache(homeworkId: string): void {
    const patterns = [
      `${this.cachePrefix}analytics_${homeworkId}`,
      `${this.cachePrefix}submissions_`,
    ];

    patterns.forEach((pattern) => {
      dataCache.getKeys().forEach((key) => {
        if (key.includes(pattern)) {
          dataCache.delete(key);
        }
      });
    });

    logInfo("清除提交相关缓存", { homeworkId });
  }
}

// 导出服务实例
export const homeworkService = new HomeworkService();
