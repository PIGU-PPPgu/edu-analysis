import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleApiError } from "./apiService";
import { formatNumber } from "@/utils/formatUtils";
import { requestCache } from "@/utils/cacheUtils";
import { warningAnalysisCache } from "../utils/performanceCache";

// 预警规则接口（增强版）
export interface WarningRule {
  id: string;
  name: string;
  description?: string;
  conditions: any;
  severity: "low" | "medium" | "high";
  scope: "global" | "exam" | "class" | "student";
  category:
    | "grade"
    | "attendance"
    | "behavior"
    | "progress"
    | "homework"
    | "composite";
  priority: number;
  is_active: boolean;
  is_system: boolean;
  auto_trigger: boolean;
  notification_enabled: boolean;
  metadata?: any;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// 预警记录接口
export interface WarningRecord {
  id: string;
  student_id: string;
  rule_id: string;
  details: any;
  status: "active" | "resolved" | "dismissed";
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

// 预警统计接口
export interface WarningStatistics {
  totalStudents: number;
  warningStudents: number;
  atRiskStudents: number; // 添加别名字段
  warningRatio: number;
  highRiskStudents: number;
  totalWarnings: number;
  activeWarnings: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  categoryDistribution: {
    grade: number;
    attendance: number;
    behavior: number;
    progress: number;
    homework: number;
    composite: number;
  };
  scopeDistribution: {
    global: number;
    exam: number;
    class: number;
    student: number;
  };
  // 添加WarningDashboard期望的字段
  warningsByType: Array<{
    type: string;
    count: number;
    percentage: number;
    trend?: string;
  }>;
  riskByClass: Array<{
    class: string;
    count: number;
    percentage: number;
  }>;
  commonRiskFactors: Array<{
    factor: string;
    count: number;
    percentage: number;
    trend?: string;
  }>;
}

// 规则筛选选项
export interface RuleFilter {
  scope?: string;
  category?: string;
  severity?: string;
  is_active?: boolean;
  search?: string;
}

// 预警规则模板
export interface RuleTemplate {
  name: string;
  description: string;
  conditions: any;
  severity: "low" | "medium" | "high";
  scope: "global" | "exam" | "class" | "student";
  category:
    | "grade"
    | "attendance"
    | "behavior"
    | "progress"
    | "homework"
    | "composite";
  priority: number;
}

// 辅助函数：获取总学生数
async function getTotalStudents(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("获取学生总数失败:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("获取学生总数失败:", error);
    return 0;
  }
}

// 辅助函数：获取有预警的学生
async function getStudentsWithWarnings(filter?: WarningFilter): Promise<any[]> {
  try {
    // 构建查询条件
    let statusFilter = ["active", "resolved", "dismissed"];
    if (filter?.warningStatus && filter.warningStatus.length > 0) {
      statusFilter = filter.warningStatus;
    }

    const { data, error } = await supabase
      .from("warning_records")
      .select("student_id")
      .in("status", statusFilter);

    if (error) {
      console.error("获取预警学生失败:", error);
      return [];
    }

    // 去重
    const uniqueStudents = [
      ...new Set(data.map((record) => record.student_id)),
    ];
    return uniqueStudents.map((id) => ({ student_id: id }));
  } catch (error) {
    console.error("获取预警学生失败:", error);
    return [];
  }
}

// 辅助函数：获取待处理问题
async function getPendingIssues(filter?: WarningFilter): Promise<any[]> {
  try {
    // 构建查询条件
    let statusFilter = ["active", "resolved", "dismissed"];
    if (filter?.warningStatus && filter.warningStatus.length > 0) {
      statusFilter = filter.warningStatus;
    }

    let query = supabase
      .from("warning_records")
      .select("*")
      .in("status", statusFilter)
      .order("created_at", { ascending: false });

    // 应用时间范围筛选
    if (filter?.timeRange && filter.timeRange !== "semester") {
      const now = new Date();
      let startDate: Date;

      switch (filter.timeRange) {
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case "custom":
          if (filter.startDate) {
            startDate = new Date(filter.startDate);
            query = query.gte("created_at", startDate.toISOString());
          }
          if (filter.endDate) {
            const endDate = new Date(filter.endDate);
            query = query.lte("created_at", endDate.toISOString());
          }
          break;
        default:
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 默认半年
      }

      if (filter.timeRange !== "custom" && startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取待处理问题失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取待处理问题失败:", error);
    return [];
  }
}

// 辅助函数：获取活跃规则
async function getActiveRules(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("warning_rules")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("获取活跃规则失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取活跃规则失败:", error);
    return [];
  }
}

// 辅助函数：获取最近问题
async function getRecentIssues(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("warning_records")
      .select(
        `
        *,
        students(name)
      `
      )
      .in("status", ["active", "resolved", "dismissed"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("获取最近问题失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取最近问题失败:", error);
    return [];
  }
}

// 辅助函数：获取本周已解决的预警数量
async function getResolvedThisWeek(): Promise<number> {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count, error } = await supabase
      .from("warning_records")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("resolved_at", weekAgo.toISOString());

    if (error) {
      console.error("获取本周已解决预警数量失败:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("获取本周已解决预警数量失败:", error);
    return 0;
  }
}

// 筛选条件接口
export interface WarningFilter {
  timeRange?: "month" | "quarter" | "semester" | "year" | "custom";
  examTypes?: string[];
  mixedAnalysis?: boolean;
  analysisMode?: "student" | "exam" | "subject";
  startDate?: string;
  endDate?: string;
  severityLevels?: ("high" | "medium" | "low")[];
  warningStatus?: ("active" | "resolved" | "dismissed")[];
}

// 获取预警统计 - 使用分层缓存优化
export async function getWarningStatistics(
  filter?: WarningFilter
): Promise<WarningStatistics> {
  return warningAnalysisCache.getWarningStats(async () => {
    console.log("[WarningService] 获取预警统计数据...");

    try {
      const [
        studentsWithWarnings,
        pendingIssues,
        activeRules,
        recentIssuesData,
      ] = await Promise.all([
        getStudentsWithWarnings(filter),
        getPendingIssues(filter),
        getActiveRules(),
        getRecentIssues(),
      ]);

      const totalStudents = await getTotalStudents();
      const studentAtRisk = studentsWithWarnings.length;
      const atRiskRate =
        totalStudents > 0 ? (studentAtRisk / totalStudents) * 100 : 0;

      // 生成类型分布数据
      const warningsByType = [
        {
          type: "学业预警",
          count: Math.floor(pendingIssues.length * 0.4),
          percentage: 40,
          trend: "up",
        },
        {
          type: "行为预警",
          count: Math.floor(pendingIssues.length * 0.25),
          percentage: 25,
          trend: "down",
        },
        {
          type: "出勤预警",
          count: Math.floor(pendingIssues.length * 0.2),
          percentage: 20,
          trend: "unchanged",
        },
        {
          type: "作业预警",
          count: Math.floor(pendingIssues.length * 0.15),
          percentage: 15,
          trend: "up",
        },
      ];

      // 生成班级风险分布（模拟数据）
      const riskByClass = [
        {
          class: "高三1班",
          count: Math.floor(studentAtRisk * 0.2),
          percentage: 20,
        },
        {
          class: "高三2班",
          count: Math.floor(studentAtRisk * 0.18),
          percentage: 18,
        },
        {
          class: "高三3班",
          count: Math.floor(studentAtRisk * 0.15),
          percentage: 15,
        },
        {
          class: "高三4班",
          count: Math.floor(studentAtRisk * 0.12),
          percentage: 12,
        },
        {
          class: "其他班级",
          count: Math.floor(studentAtRisk * 0.35),
          percentage: 35,
        },
      ];

      // 生成常见风险因素
      const commonRiskFactors = [
        {
          factor: "缺勤率高",
          count: Math.floor(studentAtRisk * 0.6),
          percentage: 60,
          trend: "up",
        },
        {
          factor: "作业完成率低",
          count: Math.floor(studentAtRisk * 0.5),
          percentage: 50,
          trend: "unchanged",
        },
        {
          factor: "考试成绩下滑",
          count: Math.floor(studentAtRisk * 0.45),
          percentage: 45,
          trend: "down",
        },
        {
          factor: "课堂参与度低",
          count: Math.floor(studentAtRisk * 0.35),
          percentage: 35,
          trend: "down",
        },
        {
          factor: "纪律问题",
          count: Math.floor(studentAtRisk * 0.2),
          percentage: 20,
          trend: "unchanged",
        },
      ];

      return {
        totalStudents,
        warningStudents: studentAtRisk,
        atRiskStudents: studentAtRisk, // 别名字段
        warningRatio: parseFloat(atRiskRate.toFixed(1)),
        highRiskStudents: Math.floor(studentAtRisk * 0.3), // 假设30%为高风险
        totalWarnings: studentAtRisk + pendingIssues.length,
        activeWarnings: pendingIssues.length,
        riskDistribution: {
          low: Math.floor(pendingIssues.length * 0.5),
          medium: Math.floor(pendingIssues.length * 0.3),
          high: Math.floor(pendingIssues.length * 0.2),
        },
        categoryDistribution: {
          grade: Math.floor(pendingIssues.length * 0.4),
          attendance: Math.floor(pendingIssues.length * 0.2),
          behavior: Math.floor(pendingIssues.length * 0.15),
          progress: Math.floor(pendingIssues.length * 0.15),
          homework: Math.floor(pendingIssues.length * 0.1),
          composite: 0,
        },
        scopeDistribution: {
          global: Math.floor(pendingIssues.length * 0.6),
          exam: Math.floor(pendingIssues.length * 0.2),
          class: Math.floor(pendingIssues.length * 0.15),
          student: Math.floor(pendingIssues.length * 0.05),
        },
        // 新增的字段
        warningsByType,
        riskByClass,
        commonRiskFactors,
      };
    } catch (error) {
      console.error("[WarningService] 获取预警统计失败:", error);
      throw error;
    }
  });
}

// 获取预警规则列表
export async function getWarningRules(
  filter?: RuleFilter
): Promise<WarningRule[]> {
  try {
    let query = supabase
      .from("warning_rules")
      .select("*")
      .order("created_at", { ascending: false });

    // 应用筛选条件
    if (filter?.severity) {
      query = query.eq("severity", filter.severity);
    }
    if (filter?.is_active !== undefined) {
      query = query.eq("is_active", filter.is_active);
    }
    if (filter?.search) {
      query = query.or(
        `name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取预警规则失败:", error);
      return [];
    }

    // 为数据添加默认值，确保兼容性
    const rulesWithDefaults = (data || []).map((rule) => ({
      ...rule,
      scope: rule.scope || "global",
      category: rule.category || "grade",
      priority: rule.priority || 5,
      auto_trigger: rule.auto_trigger || false,
      notification_enabled: rule.notification_enabled || true,
      metadata: rule.metadata || {},
    }));

    return rulesWithDefaults;
  } catch (error) {
    console.error("获取预警规则失败:", error);
    return [];
  }
}

// 创建预警规则
export async function createWarningRule(
  rule: Omit<WarningRule, "id" | "created_at" | "updated_at">
): Promise<WarningRule | null> {
  try {
    const { data, error } = await supabase
      .from("warning_rules")
      .insert(rule)
      .select()
      .single();

    if (error) {
      console.error("创建预警规则失败:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("创建预警规则失败:", error);
    return null;
  }
}

// 更新预警规则
export async function updateWarningRule(
  id: string,
  updates: Partial<WarningRule>
): Promise<WarningRule | null> {
  try {
    const { data, error } = await supabase
      .from("warning_rules")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("更新预警规则失败:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("更新预警规则失败:", error);
    return null;
  }
}

// 删除预警规则
export async function deleteWarningRule(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_rules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("删除预警规则失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("删除预警规则失败:", error);
    return false;
  }
}

// 切换规则状态
export async function toggleRuleStatus(
  id: string,
  isActive: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_rules")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("切换规则状态失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("切换规则状态失败:", error);
    return false;
  }
}

// 获取预警规则模板
export function getWarningRuleTemplates(): RuleTemplate[] {
  return [
    {
      name: "连续不及格预警",
      description: "学生连续多次考试不及格时触发预警",
      conditions: {
        type: "consecutive_fails",
        count: 2,
        threshold: 60,
        subject: "all",
      },
      severity: "medium",
      scope: "global",
      category: "grade",
      priority: 7,
    },
    {
      name: "成绩下降预警",
      description: "学生成绩连续下降超过阈值时触发预警",
      conditions: {
        type: "grade_decline",
        decline_threshold: 15,
        consecutive_count: 2,
        subject: "all",
      },
      severity: "high",
      scope: "global",
      category: "progress",
      priority: 8,
    },
    {
      name: "考试不及格预警",
      description: "单次考试成绩不及格时触发预警",
      conditions: {
        type: "exam_fail",
        threshold: 60,
        subject: "all",
      },
      severity: "medium",
      scope: "exam",
      category: "grade",
      priority: 5,
    },
    {
      name: "考试退步预警",
      description: "本次考试相比上次考试成绩下降超过阈值时触发预警",
      conditions: {
        type: "exam_regression",
        decline_threshold: 10,
        comparison: "previous_exam",
        subject: "all",
      },
      severity: "medium",
      scope: "exam",
      category: "progress",
      priority: 6,
    },
    {
      name: "作业拖欠预警",
      description: "连续多次作业未提交或迟交时触发预警",
      conditions: {
        type: "homework_default",
        count: 3,
        include_late: true,
      },
      severity: "medium",
      scope: "global",
      category: "homework",
      priority: 6,
    },
    {
      name: "班级及格率预警",
      description: "班级及格率低于阈值时触发预警",
      conditions: {
        type: "class_pass_rate",
        threshold: 0.6,
      },
      severity: "medium",
      scope: "class",
      category: "grade",
      priority: 7,
    },
    {
      name: "综合风险预警",
      description: "多个风险因素综合评估达到高风险时触发预警",
      conditions: {
        type: "composite_risk",
        factors: ["grade", "homework", "attendance"],
        risk_threshold: 0.7,
      },
      severity: "high",
      scope: "global",
      category: "composite",
      priority: 9,
    },
  ];
}

// 根据范围获取适用的预警规则
export async function getApplicableRules(
  scope: string,
  category?: string
): Promise<WarningRule[]> {
  try {
    const { data, error } = await supabase.rpc("get_applicable_warning_rules", {
      rule_scope: scope,
      rule_category: category,
      active_only: true,
    });

    if (error) {
      console.error("获取适用规则失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取适用规则失败:", error);
    return [];
  }
}

// 获取预警记录
export async function getWarningRecords(
  studentId?: string,
  status?: string,
  filter?: WarningFilter
): Promise<WarningRecord[]> {
  try {
    let query = supabase
      .from("warning_records")
      .select(
        `
        *,
        warning_rules(name, severity, description),
        students(name, student_id, class_name)
      `
      )
      .order("created_at", { ascending: false });

    // 修复错误的查询条件
    if (studentId && studentId !== "true" && studentId !== "") {
      query = query.eq("student_id", studentId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    // 应用筛选条件
    if (filter?.warningStatus && filter.warningStatus.length > 0 && !status) {
      query = query.in("status", filter.warningStatus);
    }

    // 应用时间范围筛选
    if (filter?.timeRange && filter.timeRange !== "semester") {
      const now = new Date();
      let startDate: Date;

      switch (filter.timeRange) {
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case "custom":
          if (filter.startDate) {
            startDate = new Date(filter.startDate);
            query = query.gte("created_at", startDate.toISOString());
          }
          if (filter.endDate) {
            const endDate = new Date(filter.endDate);
            query = query.lte("created_at", endDate.toISOString());
          }
          break;
        default:
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      }

      if (filter.timeRange !== "custom" && startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取预警记录失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取预警记录失败:", error);
    return [];
  }
}

// 解决预警记录
export async function resolveWarningRecord(
  id: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_records")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq("id", id);

    if (error) {
      console.error("解决预警记录失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("解决预警记录失败:", error);
    return false;
  }
}

// 获取特定预警记录
export async function getWarningRecord(
  warningId: string
): Promise<WarningRecord | null> {
  try {
    const { data, error } = await supabase
      .from("warning_records")
      .select(
        `
        *,
        warning_rules(name, severity, description),
        students(name, student_id, class_name)
      `
      )
      .eq("id", warningId)
      .single();

    if (error) {
      console.error("获取预警记录失败:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("获取预警记录失败:", error);
    return null;
  }
}

// 更新预警状态
export async function updateWarningStatus(
  warningId: string,
  newStatus: "active" | "resolved" | "dismissed"
): Promise<WarningRecord | null> {
  try {
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("warning_records")
      .update(updates)
      .eq("id", warningId)
      .select()
      .single();

    if (error) {
      console.error("更新预警状态失败:", error);
      throw error;
    }

    const statusText =
      newStatus === "resolved"
        ? "已解决"
        : newStatus === "dismissed"
          ? "已忽略"
          : "已激活";

    toast.success(`预警状态${statusText}`);
    return data as WarningRecord;
  } catch (error) {
    console.error("更新预警状态失败:", error);
    toast.error("更新预警状态失败");
    return null;
  }
}
