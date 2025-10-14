/**
 * 数据自动修复服务
 *
 * 功能:
 * - 检测数据异常和不一致
 * - 生成修复建议
 * - 自动应用修复方案
 */

import { supabase } from "@/integrations/supabase/client";
import { NotificationManager } from "./NotificationManager";

export interface DataIssue {
  id: string;
  type:
    | "missing_field"
    | "invalid_format"
    | "duplicate"
    | "orphaned"
    | "inconsistent";
  severity: "low" | "medium" | "high";
  table: string;
  recordId: string;
  field?: string;
  description: string;
  currentValue?: any;
  suggestedValue?: any;
  autoFixable: boolean;
}

export interface FixResult {
  issueId: string;
  success: boolean;
  error?: string;
  appliedFix?: any;
}

export interface DiagnosticReport {
  timestamp: string;
  totalIssues: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  autoFixableCount: number;
  issues: DataIssue[];
}

class DataFixService {
  /**
   * 诊断数据质量问题
   */
  async diagnoseDataQuality(): Promise<DiagnosticReport> {
    console.log("[DataFixService] 开始诊断数据质量...");

    const issues: DataIssue[] = [];

    // 1. 检查学生数据完整性
    await this.checkStudentData(issues);

    // 2. 检查成绩数据一致性
    await this.checkGradeData(issues);

    // 3. 检查孤立记录
    await this.checkOrphanedRecords(issues);

    // 4. 检查重复数据
    await this.checkDuplicates(issues);

    // 统计
    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};
    let autoFixableCount = 0;

    issues.forEach((issue) => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      issuesBySeverity[issue.severity] =
        (issuesBySeverity[issue.severity] || 0) + 1;
      if (issue.autoFixable) autoFixableCount++;
    });

    return {
      timestamp: new Date().toISOString(),
      totalIssues: issues.length,
      issuesByType,
      issuesBySeverity,
      autoFixableCount,
      issues,
    };
  }

  /**
   * 应用修复方案
   */
  async applyFixes(
    issueIds: string[],
    report: DiagnosticReport
  ): Promise<FixResult[]> {
    console.log(`[DataFixService] 开始修复 ${issueIds.length} 个问题...`);

    const results: FixResult[] = [];
    const issuesToFix = report.issues.filter((issue) =>
      issueIds.includes(issue.id)
    );

    for (const issue of issuesToFix) {
      try {
        const result = await this.applyFixForIssue(issue);
        results.push(result);

        if (result.success) {
          console.log(`[DataFixService] ✓ 修复成功: ${issue.description}`);
        } else {
          console.error(
            `[DataFixService] ✗ 修复失败: ${issue.description}`,
            result.error
          );
        }
      } catch (error) {
        console.error(`[DataFixService] 修复异常: ${issue.description}`, error);
        results.push({
          issueId: issue.id,
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    if (successCount > 0) {
      NotificationManager.success(`成功修复 ${successCount} 个问题`, {
        description:
          failedCount > 0 ? `${failedCount} 个问题修复失败` : undefined,
      });
    }

    if (failedCount > 0) {
      NotificationManager.warning(`${failedCount} 个问题修复失败`, {
        description: "请查看详细日志",
      });
    }

    return results;
  }

  /**
   * 一键修复所有可自动修复的问题
   */
  async autoFixAll(report: DiagnosticReport): Promise<FixResult[]> {
    const autoFixableIds = report.issues
      .filter((issue) => issue.autoFixable)
      .map((issue) => issue.id);

    if (autoFixableIds.length === 0) {
      NotificationManager.info("没有可自动修复的问题");
      return [];
    }

    NotificationManager.info(`正在自动修复 ${autoFixableIds.length} 个问题...`);

    return this.applyFixes(autoFixableIds, report);
  }

  // ==================== 私有诊断方法 ====================

  /**
   * 检查学生数据完整性
   */
  private async checkStudentData(issues: DataIssue[]): Promise<void> {
    const { data: students, error } = await supabase
      .from("students")
      .select("id, student_id, name, class_name");

    if (error || !students) return;

    students.forEach((student) => {
      // 缺少学号
      if (!student.student_id) {
        issues.push({
          id: `student_missing_id_${student.id}`,
          type: "missing_field",
          severity: "high",
          table: "students",
          recordId: student.id,
          field: "student_id",
          description: `学生 "${student.name}" 缺少学号`,
          autoFixable: false,
        });
      }

      // 缺少姓名
      if (!student.name) {
        issues.push({
          id: `student_missing_name_${student.id}`,
          type: "missing_field",
          severity: "high",
          table: "students",
          recordId: student.id,
          field: "name",
          description: `学生 (ID: ${student.student_id}) 缺少姓名`,
          autoFixable: false,
        });
      }

      // 缺少班级
      if (!student.class_name) {
        issues.push({
          id: `student_missing_class_${student.id}`,
          type: "missing_field",
          severity: "medium",
          table: "students",
          recordId: student.id,
          field: "class_name",
          description: `学生 "${student.name}" 未分配班级`,
          suggestedValue: "待分配",
          autoFixable: true,
        });
      }
    });
  }

  /**
   * 检查成绩数据一致性
   */
  private async checkGradeData(issues: DataIssue[]): Promise<void> {
    const { data: grades, error } = await supabase
      .from("grade_data")
      .select("id, student_id, total_score, total_max_score, exam_title")
      .limit(1000);

    if (error || !grades) return;

    grades.forEach((grade) => {
      // 总分超过满分
      if (
        grade.total_score &&
        grade.total_max_score &&
        grade.total_score > grade.total_max_score
      ) {
        issues.push({
          id: `grade_invalid_score_${grade.id}`,
          type: "invalid_format",
          severity: "high",
          table: "grade_data",
          recordId: grade.id,
          field: "total_score",
          description: `成绩异常: 总分(${grade.total_score})超过满分(${grade.total_max_score})`,
          currentValue: grade.total_score,
          suggestedValue: grade.total_max_score,
          autoFixable: true,
        });
      }

      // 总分为负数
      if (grade.total_score && grade.total_score < 0) {
        issues.push({
          id: `grade_negative_score_${grade.id}`,
          type: "invalid_format",
          severity: "high",
          table: "grade_data",
          recordId: grade.id,
          field: "total_score",
          description: `成绩异常: 总分为负数(${grade.total_score})`,
          currentValue: grade.total_score,
          suggestedValue: 0,
          autoFixable: true,
        });
      }

      // 缺少考试标题
      if (!grade.exam_title) {
        issues.push({
          id: `grade_missing_exam_${grade.id}`,
          type: "missing_field",
          severity: "medium",
          table: "grade_data",
          recordId: grade.id,
          field: "exam_title",
          description: `成绩记录缺少考试标题`,
          suggestedValue: "未命名考试",
          autoFixable: true,
        });
      }
    });
  }

  /**
   * 检查孤立记录
   */
  private async checkOrphanedRecords(issues: DataIssue[]): Promise<void> {
    // 检查成绩记录中不存在的学生
    const { data: grades, error: gradeError } = await supabase
      .from("grade_data")
      .select("id, student_id, exam_title")
      .limit(500);

    if (!gradeError && grades) {
      const studentIds = new Set(grades.map((g) => g.student_id));
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("student_id")
        .in("student_id", Array.from(studentIds));

      if (!studentError && students) {
        const existingIds = new Set(students.map((s) => s.student_id));

        grades.forEach((grade) => {
          if (!existingIds.has(grade.student_id)) {
            issues.push({
              id: `orphaned_grade_${grade.id}`,
              type: "orphaned",
              severity: "medium",
              table: "grade_data",
              recordId: grade.id,
              description: `成绩记录关联的学生(${grade.student_id})不存在`,
              autoFixable: false,
            });
          }
        });
      }
    }
  }

  /**
   * 检查重复数据
   */
  private async checkDuplicates(issues: DataIssue[]): Promise<void> {
    // 检查重复的学生记录 (相同学号)
    const { data: students, error } = await supabase
      .from("students")
      .select("student_id, name")
      .order("student_id");

    if (!error && students) {
      const studentIdMap = new Map<string, number>();

      students.forEach((student) => {
        if (student.student_id) {
          studentIdMap.set(
            student.student_id,
            (studentIdMap.get(student.student_id) || 0) + 1
          );
        }
      });

      studentIdMap.forEach((count, studentId) => {
        if (count > 1) {
          issues.push({
            id: `duplicate_student_${studentId}`,
            type: "duplicate",
            severity: "high",
            table: "students",
            recordId: studentId,
            field: "student_id",
            description: `学号 "${studentId}" 存在 ${count} 条重复记录`,
            autoFixable: false, // 需要人工判断保留哪条
          });
        }
      });
    }
  }

  // ==================== 私有修复方法 ====================

  /**
   * 应用单个问题的修复
   */
  private async applyFixForIssue(issue: DataIssue): Promise<FixResult> {
    if (!issue.autoFixable) {
      return {
        issueId: issue.id,
        success: false,
        error: "该问题不支持自动修复",
      };
    }

    try {
      switch (issue.type) {
        case "missing_field":
          return await this.fixMissingField(issue);

        case "invalid_format":
          return await this.fixInvalidFormat(issue);

        default:
          return {
            issueId: issue.id,
            success: false,
            error: `不支持的问题类型: ${issue.type}`,
          };
      }
    } catch (error) {
      return {
        issueId: issue.id,
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 修复缺失字段
   */
  private async fixMissingField(issue: DataIssue): Promise<FixResult> {
    if (!issue.field || !issue.suggestedValue) {
      return {
        issueId: issue.id,
        success: false,
        error: "缺少修复所需的字段或建议值",
      };
    }

    const { error } = await supabase
      .from(issue.table)
      .update({ [issue.field]: issue.suggestedValue })
      .eq("id", issue.recordId);

    if (error) {
      return {
        issueId: issue.id,
        success: false,
        error: error.message,
      };
    }

    return {
      issueId: issue.id,
      success: true,
      appliedFix: {
        field: issue.field,
        value: issue.suggestedValue,
      },
    };
  }

  /**
   * 修复无效格式
   */
  private async fixInvalidFormat(issue: DataIssue): Promise<FixResult> {
    if (!issue.field || issue.suggestedValue === undefined) {
      return {
        issueId: issue.id,
        success: false,
        error: "缺少修复所需的字段或建议值",
      };
    }

    const { error } = await supabase
      .from(issue.table)
      .update({ [issue.field]: issue.suggestedValue })
      .eq("id", issue.recordId);

    if (error) {
      return {
        issueId: issue.id,
        success: false,
        error: error.message,
      };
    }

    return {
      issueId: issue.id,
      success: true,
      appliedFix: {
        field: issue.field,
        oldValue: issue.currentValue,
        newValue: issue.suggestedValue,
      },
    };
  }
}

// 导出单例
export const dataFixService = new DataFixService();
