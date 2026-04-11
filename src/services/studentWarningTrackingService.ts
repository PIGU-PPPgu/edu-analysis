/**
 * 学生预警追踪和管理服务
 * 管理预警记录、学生档案、干预措施和跟踪笔记
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 预警记录接口
export interface WarningRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  status: "active" | "resolved" | "dismissed";
  details: {
    ruleName?: string;
    ruleDescription?: string;
    severity: "low" | "medium" | "high";
    riskLevel?: string;
    riskScore?: number;
    riskFactors?: string[];
    generatedBy?: string;
    analysisDate?: string;
  };
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

// 学生预警档案接口
export interface StudentWarningProfile {
  studentId: string;
  studentName: string;
  className: string;
  totalWarnings: number;
  activeWarnings: number;
  resolvedWarnings: number;
  lastWarningDate: string;
  riskLevel: "low" | "medium" | "high";
  interventions: InterventionRecord[];
  trackingNotes: TrackingNote[];
}

// 干预记录接口
export interface InterventionRecord {
  id: string;
  studentId: string;
  interventionType:
    | "meeting"
    | "phone_call"
    | "counseling"
    | "tutoring"
    | "family_contact"
    | "other";
  description: string;
  result: string;
  followUpRequired: boolean;
  createdAt: string;
  createdBy: string;
}

// 追踪笔记接口
export interface TrackingNote {
  id: string;
  studentId: string;
  noteType: "observation" | "progress" | "concern" | "improvement" | "other";
  content: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: string;
}

// 过滤条件接口
export interface WarningListFilter {
  status?: "active" | "resolved" | "dismissed";
  severity?: "low" | "medium" | "high";
  classNames?: string[]; // 支持多班级筛选
  examTitles?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchTerm?: string;
}

/**
 * 获取预警记录列表
 */
export async function getWarningRecords(
  filter?: WarningListFilter,
  limit: number = 50,
  offset: number = 0
): Promise<{
  records: WarningRecord[];
  total: number;
  hasMore: boolean;
}> {
  try {
    let query = supabase.from("warning_records").select(`
        *,
        students:student_id (
          name,
          class_name
        )
      `);

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }

    // 班级筛选：通过 grade_data 找到对应班级的学生 ID
    if (filter?.classNames && filter.classNames.length > 0) {
      const { data: classStudents } = await supabase
        .from("grade_data")
        .select("student_id")
        .in("class_name", filter.classNames);
      if (classStudents && classStudents.length > 0) {
        const ids = [...new Set(classStudents.map((s) => s.student_id))];
        query = query.in("student_id", ids);
      } else {
        return { records: [], total: 0, hasMore: false };
      }
    }

    // 考试筛选：只返回参与了指定考试的学生的预警记录
    if (filter?.examTitles && filter.examTitles.length > 0) {
      const { data: examStudents, error: examError } = await supabase
        .from("grade_data")
        .select("student_id")
        .in("exam_title", filter.examTitles);

      if (examError) {
        console.error("查询考试学生失败:", examError);
      } else if (examStudents && examStudents.length > 0) {
        const participantStudentIds = [
          ...new Set(examStudents.map((s) => s.student_id)),
        ];
        query = query.in("student_id", participantStudentIds);
      } else {
        return { records: [], total: 0, hasMore: false };
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("数据库查询失败:", error);
      return { records: [], total: 0, hasMore: false };
    }

    if (!data || data.length === 0) {
      return { records: [], total: 0, hasMore: false };
    }

    // 转换数据格式
    const records: WarningRecord[] = data.map((record) => ({
      id: record.id,
      studentId: record.student_id,
      studentName: record.students?.name || `学生${record.student_id}`,
      className: record.students?.class_name || "未知班级",
      status: record.status,
      details: record.details || {
        severity: "medium",
        ruleName: "系统预警",
      },
      createdAt: record.created_at,
      resolvedAt: record.resolved_at,
      resolvedBy: record.resolved_by,
      resolutionNotes: record.resolution_notes,
    }));

    return {
      records,
      total: count || records.length,
      hasMore: (count || 0) > offset + limit,
    };
  } catch (error) {
    console.error("获取预警记录失败:", error);
    return { records: [], total: 0, hasMore: false };
  }
}

/**
 * 获取学生预警档案
 */
export async function getStudentWarningProfile(
  studentId: string
): Promise<StudentWarningProfile | null> {
  try {
    // 尝试从数据库获取数据
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("name, class_name")
      .eq("student_id", studentId)
      .single();

    if (studentError || !student) {
      console.error("学生信息查询失败:", studentError);
      return null;
    }

    const { data: warnings, error: warningsError } = await supabase
      .from("warning_records")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (warningsError) {
      console.error("预警记录查询失败:", warningsError);
      // 即使预警记录查询失败，也返回基本的学生档案信息
    }

    // 计算统计数据
    const totalWarnings = warnings?.length || 0;
    const activeWarnings =
      warnings?.filter((w) => w.status === "active").length || 0;
    const resolvedWarnings =
      warnings?.filter((w) => w.status === "resolved").length || 0;
    const lastWarning = warnings?.[0];

    const profile: StudentWarningProfile = {
      studentId,
      studentName: student.name,
      className: student.class_name,
      totalWarnings,
      activeWarnings,
      resolvedWarnings,
      lastWarningDate: lastWarning?.created_at || "",
      riskLevel:
        activeWarnings >= 3 ? "high" : activeWarnings >= 1 ? "medium" : "low",
      interventions: [], // 这里应该从intervention表查询
      trackingNotes: [], // 这里应该从tracking_notes表查询
    };

    return profile;
  } catch (error) {
    console.error("获取学生档案失败:", error);
    return null;
  }
}

/**
 * 解决单个预警
 */
export async function resolveWarning(
  warningId: string,
  action: "resolved" | "dismissed",
  notes: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_records")
      .update({
        status: action,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq("id", warningId);

    if (error) {
      console.error(`${action}预警失败:`, error);
      toast.error(`${action === "resolved" ? "解决" : "忽略"}预警失败`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`${action}预警异常:`, error);
    return false;
  }
}

/**
 * 撤销预警操作（重新激活）
 */
export async function undoWarningAction(
  warningId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_records")
      .update({
        status: "active",
        resolved_at: null,
        resolution_notes: null,
      })
      .eq("id", warningId);

    if (error) {
      console.error("撤销预警失败:", error);
      toast.error("撤销预警失败");
      return false;
    }

    return true;
  } catch (error) {
    console.error("撤销预警异常:", error);
    return false;
  }
}

/**
 * 批量撤销预警操作
 */
export async function batchUndoWarnings(
  warningIds: string[],
  userId: string
): Promise<Array<{ warningId: string; success: boolean }>> {
  const results = [];

  for (const warningId of warningIds) {
    const success = await undoWarningAction(warningId, userId);
    results.push({ warningId, success });
  }

  return results;
}

/**
 * 批量解决预警
 */
export async function batchResolveWarnings(
  warningIds: string[],
  action: "resolved" | "dismissed",
  notes: string,
  userId: string
): Promise<Array<{ warningId: string; success: boolean }>> {
  const results = [];

  for (const warningId of warningIds) {
    const success = await resolveWarning(warningId, action, notes, userId);
    results.push({ warningId, success });
  }

  return results;
}

/**
 * 添加干预记录
 */
export async function addIntervention(
  intervention: Omit<InterventionRecord, "id" | "createdAt">
): Promise<boolean> {
  try {
    const { error } = await supabase.from("interventions").insert({
      student_id: intervention.studentId,
      intervention_type: intervention.interventionType,
      description: intervention.description,
      result: intervention.result,
      follow_up_required: intervention.followUpRequired,
      created_by: intervention.createdBy,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("添加干预记录失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("添加干预记录异常:", error);
    return false;
  }
}

/**
 * 添加追踪笔记
 */
export async function addTrackingNote(
  note: Omit<TrackingNote, "id" | "createdAt">
): Promise<boolean> {
  try {
    const { error } = await supabase.from("tracking_notes").insert({
      student_id: note.studentId,
      note_type: note.noteType,
      content: note.content,
      is_private: note.isPrivate,
      created_by: note.createdBy,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("添加追踪笔记失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("添加追踪笔记异常:", error);
    return false;
  }
}

/**
 * 获取学生跟进优先级列表
 */
export async function getStudentFollowUpPriority(
  limit: number = 20
): Promise<any[]> {
  try {
    // 基于真实数据计算学生跟进优先级
    const { data: riskTrends, error: riskError } = await supabase
      .from("student_risk_trends")
      .select("*")
      .order("risk_level", { ascending: false }) // high > medium > low
      .order("active_warnings_count", { ascending: false })
      .limit(limit * 2); // 获取更多数据以便筛选

    if (riskError) {
      console.warn("获取风险趋势数据失败，尝试使用基础查询:", riskError);
      return await getFallbackPriorityStudents(limit);
    }

    if (!riskTrends || riskTrends.length === 0) {
      return await getFallbackPriorityStudents(limit);
    }

    // 计算每个学生的优先级评分和详细信息
    const priorityStudents = await Promise.all(
      riskTrends.map(async (student) => {
        // 获取干预记录数量
        const { data: interventions } = await supabase
          .from("warning_tracking_records")
          .select("id")
          .eq("student_id", student.student_id)
          .eq("status", "completed");

        // 获取最近预警日期
        const { data: recentWarning } = await supabase
          .from("warning_records")
          .select("created_at")
          .eq("student_id", student.student_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // 计算风险评分 (0-100)
        let riskScore = 50; // 基础分

        // 风险级别评分
        if (student.risk_level === "critical") riskScore += 40;
        else if (student.risk_level === "high") riskScore += 30;
        else if (student.risk_level === "medium") riskScore += 20;
        else if (student.risk_level === "low") riskScore += 10;

        // 活跃预警数量评分
        riskScore += Math.min(student.active_warnings_count * 5, 25);

        // 趋势评分
        if (student.performance_trend === "declining") riskScore += 15;
        else if (student.performance_trend === "stable") riskScore += 5;

        // 趋势置信度评分
        riskScore += (student.trend_confidence || 0.5) * 10;

        // 确定优先级
        let priority: "high" | "medium" | "low";
        if (riskScore >= 80) priority = "high";
        else if (riskScore >= 60) priority = "medium";
        else priority = "low";

        // 格式化最后预警日期
        let lastWarningDate = "无预警";
        if (recentWarning) {
          const warningDate = new Date(recentWarning.created_at);
          const daysDiff = Math.floor(
            (Date.now() - warningDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff === 0) lastWarningDate = "今天";
          else if (daysDiff === 1) lastWarningDate = "1天前";
          else if (daysDiff < 7) lastWarningDate = `${daysDiff}天前`;
          else lastWarningDate = `${Math.floor(daysDiff / 7)}周前`;
        }

        return {
          studentId: student.student_id,
          name: student.student_name,
          className: student.class_name,
          priority,
          activeWarnings: student.active_warnings_count || 0,
          lastWarningDate,
          interventionCount: interventions?.length || 0,
          riskScore: Math.round(riskScore),
          performanceTrend: student.performance_trend,
          riskLevel: student.risk_level,
          lastAssessmentDate: student.last_assessment_date,
        };
      })
    );

    // 按风险评分排序并限制数量
    const sortedStudents = priorityStudents
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);

    return sortedStudents;
  } catch (error) {
    console.error("获取优先级学生列表失败:", error);
    return await getFallbackPriorityStudents(limit);
  }
}

/**
 * 备用查询方案：当视图不可用时使用基础表查询
 */
async function getFallbackPriorityStudents(limit: number): Promise<any[]> {
  try {
    // 查询有活跃预警的学生
    const { data: warnings, error } = await supabase
      .from("warning_records")
      .select(
        `
        student_id,
        created_at,
        details,
        students!inner(student_id, name, class_name)
      `
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("备用查询失败:", error);
      return [];
    }

    if (!warnings || warnings.length === 0) {
      return [];
    }

    // 按学生分组统计
    const studentStats = warnings.reduce((acc, warning) => {
      const studentId = warning.student_id;
      if (!acc[studentId]) {
        acc[studentId] = {
          studentId,
          name: warning.students.name,
          className: warning.students.class_name,
          activeWarnings: 0,
          latestWarning: warning.created_at,
          highSeverityCount: 0,
        };
      }

      acc[studentId].activeWarnings++;

      // 统计高严重度预警
      if (warning.details?.severity === "high") {
        acc[studentId].highSeverityCount++;
      }

      // 更新最新预警时间
      if (
        new Date(warning.created_at) > new Date(acc[studentId].latestWarning)
      ) {
        acc[studentId].latestWarning = warning.created_at;
      }

      return acc;
    }, {});

    // 转换为数组并计算优先级
    const priorityStudents = Object.values(studentStats).map((student: any) => {
      // 计算风险评分
      let riskScore = student.activeWarnings * 15; // 每个预警15分
      riskScore += student.highSeverityCount * 20; // 高严重度预警额外20分

      // 时间因子：最近的预警权重更高
      const daysSinceLatest = Math.floor(
        (Date.now() - new Date(student.latestWarning).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSinceLatest <= 1) riskScore += 20;
      else if (daysSinceLatest <= 3) riskScore += 15;
      else if (daysSinceLatest <= 7) riskScore += 10;

      // 确定优先级
      let priority: "high" | "medium" | "low";
      if (riskScore >= 70 || student.highSeverityCount >= 2) priority = "high";
      else if (riskScore >= 40 || student.activeWarnings >= 3)
        priority = "medium";
      else priority = "low";

      // 格式化最后预警日期
      let lastWarningDate: string;
      if (daysSinceLatest === 0) lastWarningDate = "今天";
      else if (daysSinceLatest === 1) lastWarningDate = "1天前";
      else if (daysSinceLatest < 7) lastWarningDate = `${daysSinceLatest}天前`;
      else lastWarningDate = `${Math.floor(daysSinceLatest / 7)}周前`;

      return {
        studentId: student.studentId,
        name: student.name,
        className: student.className,
        priority,
        activeWarnings: student.activeWarnings,
        lastWarningDate,
        interventionCount: 0, // 备用查询暂不统计干预次数
        riskScore: Math.round(riskScore),
      };
    });

    // 排序并限制数量
    const result = priorityStudents
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);

    return result;
  } catch (error) {
    console.error("备用查询失败:", error);
    return [];
  }
}
