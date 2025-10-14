import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/services/errorHandler";

export interface WarningStudentData {
  id: string;
  name: string;
  class_name?: string;
  warningCount: number;
  highestSeverity: "low" | "medium" | "high";
  latestWarning?: {
    rule_name: string;
    created_at: string;
    details: any;
  };
  averageScore?: number;
  riskLevel: "low" | "medium" | "high";
}

/**
 * 获取当前活跃预警的学生列表
 * @param limit 返回的学生数量限制
 * @returns 预警学生数据数组
 */
export const getActiveWarningStudents = async (
  limit: number = 6
): Promise<WarningStudentData[]> => {
  try {
    // 查询活跃的预警记录，包含学生信息
    const { data: warningRecords, error: warningError } = await supabase
      .from("warning_records")
      .select(
        `
        student_id,
        rule_id,
        details,
        created_at,
        warning_rules!inner(
          name,
          severity
        )
      `
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (warningError) throw warningError;

    if (!warningRecords || warningRecords.length === 0) {
      return [];
    }

    // 按学生分组统计预警信息
    const studentWarnings = warningRecords.reduce(
      (acc, record) => {
        const studentId = record.student_id;

        if (!acc[studentId]) {
          acc[studentId] = {
            student_id: studentId,
            warnings: [],
            highestSeverity: "low" as "low" | "medium" | "high",
            count: 0,
          };
        }

        acc[studentId].warnings.push(record);
        acc[studentId].count += 1;

        // 更新最高严重程度
        const currentSeverity = (record as any).warning_rules.severity;
        if (
          currentSeverity === "high" ||
          (currentSeverity === "medium" &&
            acc[studentId].highestSeverity === "low")
        ) {
          acc[studentId].highestSeverity = currentSeverity;
        }

        return acc;
      },
      {} as Record<string, any>
    );

    // 获取学生基本信息 - 修正：使用student_id关联
    const studentIds = Object.keys(studentWarnings);
    const { data: studentsData, error: studentError } = await supabase
      .from("students")
      .select(
        `
        id,
        student_id,
        name,
        class_info!inner(class_name)
      `
      )
      .in("student_id", studentIds);

    if (studentError) throw studentError;

    // 获取学生平均成绩（从grade_data表）
    const { data: gradeData, error: gradeError } = await supabase
      .from("grade_data")
      .select("student_id, total_score")
      .in("student_id", studentsData?.map((s) => s.student_id) || []);

    // 计算平均成绩
    const avgScores = (gradeData || []).reduce(
      (acc, grade) => {
        if (!acc[grade.student_id]) {
          acc[grade.student_id] = { total: 0, count: 0 };
        }
        acc[grade.student_id].total += grade.total_score || 0;
        acc[grade.student_id].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    );

    // 组合最终数据 - 修正：使用student_id作为关联键
    const warningStudents: WarningStudentData[] = (studentsData || [])
      .map((student) => {
        const studentWarning = studentWarnings[student.student_id]; // 修正：使用student_id关联
        if (!studentWarning) return null; // 如果没有预警数据则跳过

        const latestWarning = studentWarning.warnings[0]; // 已按时间排序

        const avgScoreData = avgScores[student.student_id];
        const averageScore = avgScoreData
          ? avgScoreData.total / avgScoreData.count
          : undefined;

        return {
          id: student.id,
          name: student.name,
          class_name: (student as any).class_info?.class_name,
          warningCount: studentWarning.count,
          highestSeverity: studentWarning.highestSeverity,
          latestWarning: {
            rule_name: (latestWarning as any).warning_rules.name,
            created_at: latestWarning.created_at,
            details: latestWarning.details,
          },
          averageScore,
          riskLevel: studentWarning.highestSeverity, // 使用预警严重程度作为风险等级
        };
      })
      .filter((student) => student !== null) // 过滤掉null值
      .sort((a, b) => {
        // 按风险等级和预警数量排序
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff =
          severityOrder[b.highestSeverity] - severityOrder[a.highestSeverity];
        if (severityDiff !== 0) return severityDiff;
        return b.warningCount - a.warningCount;
      })
      .slice(0, limit);

    return warningStudents;
  } catch (error) {
    showError(error, { operation: "获取预警学生列表" });
    return [];
  }
};

/**
 * 获取学生的详细预警信息
 * @param studentId 学生ID
 * @returns 学生详细预警信息
 */
export const getStudentWarningDetails = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from("warning_records")
      .select(
        `
        *,
        warning_rules(name, description, severity, category)
      `
      )
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    showError(error, { operation: "获取学生预警详情", studentId });
    return [];
  }
};
