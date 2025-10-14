/**
 * 成绩数据同步服务
 * 负责将作业评分和考试数据同步到grades表，为预警系统提供真实数据
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncStats {
  homeworkGradesSynced: number;
  examGradesSynced: number;
  studentsProcessed: number;
  errors: string[];
  syncDuration: number;
}

interface HomeworkGradeData {
  student_id: string;
  student_name?: string;
  homework_id: string;
  homework_title?: string;
  subject: string;
  score: number;
  max_score: number;
  submitted_at: string;
}

interface ExamGradeData {
  student_id: string;
  exam_id: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  subject: string;
  score: number;
  max_score: number;
}

export class GradeDataSyncService {
  /**
   * 执行完整的成绩数据同步
   */
  async syncAllGradeData(): Promise<SyncStats> {
    const startTime = Date.now();

    const stats: SyncStats = {
      homeworkGradesSynced: 0,
      examGradesSynced: 0,
      studentsProcessed: 0,
      errors: [],
      syncDuration: 0,
    };

    try {
      // 1. 同步作业成绩
      const homeworkStats = await this.syncHomeworkGrades();
      stats.homeworkGradesSynced = homeworkStats.synced;
      stats.errors.push(...homeworkStats.errors);

      // 2. 同步考试成绩 (如果有实际考试成绩数据)
      const examStats = await this.syncExamGrades();
      stats.examGradesSynced = examStats.synced;
      stats.errors.push(...examStats.errors);

      // 3. 统计处理的学生数
      stats.studentsProcessed = await this.getProcessedStudentsCount();

      stats.syncDuration = Date.now() - startTime;

      console.log(
        `✅ 成绩同步完成: 作业${stats.homeworkGradesSynced}条, 考试${stats.examGradesSynced}条, 学生${stats.studentsProcessed}人, 耗时${stats.syncDuration}ms`
      );
      if (stats.errors.length > 0) {
        console.warn(
          `⚠️ 同步过程中出现${stats.errors.length}个错误:`,
          stats.errors
        );
      }

      return stats;
    } catch (error) {
      const errorMessage = `同步失败: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error("❌ 成绩数据同步失败:", error);
      stats.errors.push(errorMessage);
      stats.syncDuration = Date.now() - startTime;
      throw new Error(errorMessage);
    }
  }

  /**
   * 同步作业成绩到grades表
   */
  private async syncHomeworkGrades(): Promise<{
    synced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // 获取有评分的作业提交数据
      const { data: homeworkSubmissions, error: fetchError } = await supabase
        .from("homework_submissions")
        .select(
          `
          id,
          homework_id,
          student_id,
          score,
          submitted_at,
          homework:homework_id (
            id,
            title,
            subject
          ),
          students:student_id (
            id,
            student_id,
            name
          )
        `
        )
        .not("score", "is", null);

      if (fetchError) {
        throw new Error(`获取作业提交数据失败: ${fetchError.message}`);
      }

      if (!homeworkSubmissions || homeworkSubmissions.length === 0) {
        return { synced: 0, errors };
      }

      // 转换为成绩记录格式
      const gradeRecords = homeworkSubmissions
        .map((submission) => {
          const homework = submission.homework as any;
          const student = submission.students as any;

          return {
            student_id: submission.student_id,
            subject: homework?.title || "作业", // 使用作业标题作为科目
            score: Number(submission.score),
            max_score: 100, // 默认满分100
            exam_date: new Date(submission.submitted_at)
              .toISOString()
              .split("T")[0],
            exam_type: "作业",
            exam_title: homework?.title || "未知作业",
            grade_level: this.calculateGradeLevel(
              Number(submission.score),
              100
            ),
            created_at: new Date().toISOString(),
          };
        })
        .filter((record) => record.score > 0); // 过滤掉无效分数

      if (gradeRecords.length === 0) {
        return { synced: 0, errors };
      }

      // 批量插入，使用冲突忽略策略避免重复
      const { data: insertedGrades, error: insertError } = await supabase
        .from("grades")
        .upsert(gradeRecords, {
          onConflict: "student_id,subject,exam_date,exam_type",
          ignoreDuplicates: true,
        })
        .select();

      if (insertError) {
        throw new Error(`插入作业成绩失败: ${insertError.message}`);
      }

      synced = insertedGrades?.length || gradeRecords.length;
      console.log(`✅ 成功同步 ${synced} 条作业成绩记录`);
    } catch (error) {
      const errorMessage = `作业成绩同步失败: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error("❌ 作业成绩同步失败:", error);
      errors.push(errorMessage);
    }

    return { synced, errors };
  }

  /**
   * 同步考试成绩到grades表
   * 注意：当前考试数据可能没有实际成绩，需要生成模拟数据或等待真实数据
   */
  private async syncExamGrades(): Promise<{
    synced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // 获取考试数据
      const { data: exams, error: examError } = await supabase
        .from("exams")
        .select("*");

      if (examError) {
        throw new Error(`获取考试数据失败: ${examError.message}`);
      }

      if (!exams || exams.length === 0) {
        return { synced: 0, errors };
      }

      // 由于考试表中没有实际成绩数据，我们可以：
      // 1. 等待真实考试成绩数据的导入
      // 2. 基于作业成绩生成模拟考试成绩用于测试

      // 这里先创建基础框架，等待真实数据

      // TODO: 实现真实考试成绩数据导入逻辑
      // 可能需要从外部文件（Excel/CSV）导入或从其他系统API获取
    } catch (error) {
      const errorMessage = `考试成绩同步失败: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error("❌ 考试成绩同步失败:", error);
      errors.push(errorMessage);
    }

    return { synced, errors };
  }

  /**
   * 生成模拟考试成绩用于测试预警系统
   */
  async generateMockExamGrades(
    examId: string,
    studentCount: number = 50
  ): Promise<void> {
    try {
      // 获取考试信息
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (examError || !exam) {
        throw new Error("考试不存在");
      }

      // 获取部分学生数据
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, student_id, name")
        .limit(studentCount);

      if (studentsError || !students) {
        throw new Error("获取学生数据失败");
      }

      // 生成模拟成绩
      const subjects = ["语文", "数学", "英语", "物理", "化学"];
      const gradeRecords = [];

      for (const student of students) {
        for (const subject of subjects) {
          // 生成正态分布的随机成绩 (平均75分，标准差15)
          const score = Math.max(
            0,
            Math.min(
              100,
              75 + (Math.random() - 0.5) * 30 + (Math.random() - 0.5) * 30
            )
          );

          gradeRecords.push({
            student_id: student.id,
            subject: subject,
            score: Math.round(score),
            max_score: 100,
            exam_date: exam.date,
            exam_type: exam.type,
            exam_title: exam.title,
            grade_level: this.calculateGradeLevel(score, 100),
          });
        }
      }

      // 批量插入模拟成绩
      const { error: insertError } = await supabase
        .from("grades")
        .upsert(gradeRecords, {
          onConflict: "student_id,subject,exam_date,exam_type",
          ignoreDuplicates: false,
        });

      if (insertError) {
        throw new Error(`插入模拟成绩失败: ${insertError.message}`);
      }

      console.log(`✅ 成功生成 ${gradeRecords.length} 条模拟考试成绩`);
    } catch (error) {
      console.error("❌ 生成模拟考试成绩失败:", error);
      throw error;
    }
  }

  /**
   * 计算等级
   */
  private calculateGradeLevel(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    return "E";
  }

  /**
   * 获取处理的学生数量
   */
  private async getProcessedStudentsCount(): Promise<number> {
    const { data, error } = await supabase
      .from("grades")
      .select("student_id", { count: "exact" })
      .not("student_id", "is", null);

    if (error) {
      console.warn("获取学生数量失败:", error);
      return 0;
    }

    // 获取唯一学生数量
    const { data: uniqueStudents } = await supabase
      .from("grades")
      .select("student_id")
      .not("student_id", "is", null);

    if (uniqueStudents) {
      const uniqueStudentIds = new Set(uniqueStudents.map((g) => g.student_id));
      return uniqueStudentIds.size;
    }

    return 0;
  }

  /**
   * 清理现有成绩数据（用于重新同步）
   */
  async clearGradeData(): Promise<void> {
    const { error } = await supabase
      .from("grades")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // 删除所有记录

    if (error) {
      throw new Error(`清理成绩数据失败: ${error.message}`);
    }

    console.log("✅ 成绩数据清理完成");
  }

  /**
   * 获取成绩数据统计
   */
  async getGradeDataStats(): Promise<{
    totalGrades: number;
    uniqueStudents: number;
    subjects: string[];
    examTypes: string[];
    dateRange: { earliest: string; latest: string };
  }> {
    const { data: grades, error } = await supabase.from("grades").select("*");

    if (error || !grades) {
      return {
        totalGrades: 0,
        uniqueStudents: 0,
        subjects: [],
        examTypes: [],
        dateRange: { earliest: "", latest: "" },
      };
    }

    const uniqueStudents = new Set(grades.map((g) => g.student_id)).size;
    const subjects = [...new Set(grades.map((g) => g.subject))];
    const examTypes = [...new Set(grades.map((g) => g.exam_type))];

    const dates = grades
      .map((g) => g.exam_date)
      .filter((date) => date)
      .sort();

    return {
      totalGrades: grades.length,
      uniqueStudents,
      subjects,
      examTypes,
      dateRange: {
        earliest: dates[0] || "",
        latest: dates[dates.length - 1] || "",
      },
    };
  }
}

// 导出服务实例
export const gradeDataSyncService = new GradeDataSyncService();
