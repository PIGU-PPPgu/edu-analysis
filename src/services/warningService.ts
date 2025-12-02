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
    console.log("🔍 getStudentsWithWarnings - 筛选条件:", filter);

    // 构建查询条件
    let statusFilter = ["active", "resolved", "dismissed"];
    if (filter?.warningStatus && filter.warningStatus.length > 0) {
      statusFilter = filter.warningStatus;
    }

    // 如果有班级筛选，需要关联students表
    let query = supabase
      .from("warning_records")
      .select(
        `
      student_id,
      students!inner(
        student_id,
        name,
        class_name
      )
    `
      )
      .in("status", statusFilter);

    // 应用班级筛选
    if (filter?.classNames && filter.classNames.length > 0) {
      console.log("📚 应用班级筛选:", filter.classNames);
      query = query.in("students.class_name", filter.classNames);
    }

    // 如果有考试筛选，需要额外查询grade_data表来过滤
    if (filter?.examTitles && filter.examTitles.length > 0) {
      console.log("📊 应用考试筛选:", filter.examTitles);
      // 先从grade_data表获取符合考试条件的学生ID
      const { data: gradeData, error: gradeError } = await supabase
        .from("grade_data")
        .select("student_id")
        .in("exam_title", filter.examTitles);

      if (!gradeError && gradeData && gradeData.length > 0) {
        const studentIdsFromGrades = [
          ...new Set(gradeData.map((g) => g.student_id)),
        ];
        console.log(
          "📊 从考试筛选获得的学生ID:",
          studentIdsFromGrades.length,
          "个"
        );
        query = query.in("student_id", studentIdsFromGrades);
      } else {
        console.warn("⚠️ 考试筛选未找到匹配学生，返回空结果");
        return [];
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取预警学生失败:", error);
      return [];
    }

    console.log(
      "✅ getStudentsWithWarnings - 查询结果:",
      data?.length,
      "条记录"
    );

    // 去重并返回学生信息
    const uniqueStudents = [];
    const seenIds = new Set();

    if (data) {
      for (const record of data) {
        if (!seenIds.has(record.student_id)) {
          seenIds.add(record.student_id);
          uniqueStudents.push({
            student_id: record.student_id,
            student_info: record.students,
          });
        }
      }
    }

    console.log(
      "✅ getStudentsWithWarnings - 最终返回:",
      uniqueStudents.length,
      "个唯一学生"
    );
    return uniqueStudents;
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
  classNames?: string[]; // 新增：班级筛选
  examTitles?: string[]; // 新增：具体考试筛选
  mixedAnalysis?: boolean;
  analysisMode?: "student" | "exam" | "subject";
  startDate?: string;
  endDate?: string;
  severityLevels?: ("high" | "medium" | "low")[];
  warningStatus?: ("active" | "resolved" | "dismissed")[];
}

// 🔄 架构切换开关 - 设为true使用基于原始数据的实时计算
const USE_REALTIME_CALCULATION = true;

// 获取预警统计 - 支持两种架构
export async function getWarningStatistics(
  filter?: WarningFilter
): Promise<WarningStatistics> {
  if (USE_REALTIME_CALCULATION) {
    // 新架构：基于原始数据实时计算
    return getWarningStatisticsRealtime(filter);
  } else {
    // 旧架构：基于预警记录表
    return getWarningStatisticsLegacy(filter);
  }
}

// 🚀 新架构：基于原始数据实时计算预警统计
async function getWarningStatisticsRealtime(
  filter?: WarningFilter
): Promise<WarningStatistics> {
  console.log("🚀 [新架构] 基于原始数据实时计算预警统计", filter);

  try {
    // 1. 构建成绩数据查询 - 使用grade_data表（宽表格式）
    let gradesQuery = supabase.from("grade_data").select(`
        student_id,
        name,
        class_name,
        exam_title,
        exam_date,
        exam_type,
        total_score,
        chinese_score,
        math_score,
        english_score,
        physics_score,
        chemistry_score,
        biology_score,
        geography_score,
        history_score,
        politics_score
      `);

    // 2. 应用筛选条件到原始数据（这是关键优势）
    if (filter?.classNames && filter.classNames.length > 0) {
      console.log("📚 [新架构] 筛选班级:", filter.classNames);
      gradesQuery = gradesQuery.in("class_name", filter.classNames);
    }

    if (filter?.examTitles && filter.examTitles.length > 0) {
      console.log("📊 [新架构] 筛选考试:", filter.examTitles);
      gradesQuery = gradesQuery.in("exam_title", filter.examTitles);
    }

    // 时间范围筛选
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
            gradesQuery = gradesQuery.gte(
              "exam_date",
              startDate.toISOString().split("T")[0]
            );
          }
          if (filter.endDate) {
            const endDate = new Date(filter.endDate);
            gradesQuery = gradesQuery.lte(
              "exam_date",
              endDate.toISOString().split("T")[0]
            );
          }
          break;
        default:
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      }

      if (filter.timeRange !== "custom" && startDate) {
        gradesQuery = gradesQuery.gte(
          "exam_date",
          startDate.toISOString().split("T")[0]
        );
      }
    }

    const { data: gradesData, error: gradesError } = await gradesQuery;

    if (gradesError) {
      console.error("❌ [新架构] 获取成绩数据失败:", gradesError);
      throw gradesError;
    }

    console.log(
      "✅ [新架构] 获取到成绩数据:",
      gradesData?.length || 0,
      "条记录"
    );

    // 3. 基于真实数据实时计算预警指标
    const result = analyzeWarningsFromGrades(gradesData || []);

    console.log("🎯 [新架构] 预警统计完成:", {
      totalStudents: result.totalStudents,
      warningStudents: result.warningStudents,
      warningRatio: result.warningRatio,
    });

    return result;
  } catch (error) {
    console.error("❌ [新架构] 实时预警计算失败，回退到旧架构:", error);
    // 出错时自动回退到旧架构
    return getWarningStatisticsLegacy(filter);
  }
}

// 📊 基于成绩数据实时分析预警情况（宽表格式）
function analyzeWarningsFromGrades(gradesData: any[]): WarningStatistics {
  console.log(
    "🔍 [新架构] 开始分析预警情况...",
    gradesData.length,
    "条考试记录"
  );

  // 按学生分组数据（一个学生可能有多次考试记录）
  const studentData = new Map<
    string,
    {
      studentInfo: any;
      examRecords: any[];
    }
  >();

  // 增强的数据分组逻辑，支持容错处理
  gradesData.forEach((record) => {
    // 优先使用student_id，如果没有则使用name+class_name组合作为fallback
    let studentKey = record.student_id;
    if (!studentKey || studentKey.trim() === "") {
      // 构建备用键：姓名+班级
      if (record.name && record.class_name) {
        studentKey = `${record.name}_${record.class_name}`;
        console.log(`⚠️ [新架构] 使用备用键分组学生: ${studentKey}`);
      } else {
        console.warn(`⚠️ [新架构] 跳过无效记录，缺少关键信息:`, {
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
        });
        return; // 跳过无效记录
      }
    }

    if (!studentData.has(studentKey)) {
      studentData.set(studentKey, {
        studentInfo: {
          name: record.name,
          class_name: record.class_name,
          student_id: record.student_id || null, // 保留原始ID信息
        },
        examRecords: [],
      });
    }
    studentData.get(studentKey)!.examRecords.push(record);
  });

  const students = Array.from(studentData.values());
  console.log("👥 [新架构] 分析学生数:", students.length);

  // 统计数据质量
  const studentsWithId = students.filter((s) => s.studentInfo.student_id);
  const studentsWithoutId = students.length - studentsWithId.length;
  if (studentsWithoutId > 0) {
    console.warn(
      `⚠️ [新架构] 发现 ${studentsWithoutId} 名学生缺少student_id，使用姓名+班级分组`
    );
  }

  // 计算各种预警指标
  let warningStudents = 0;
  let highRiskStudents = 0;
  let totalWarnings = 0;

  const riskDistribution = { low: 0, medium: 0, high: 0 };
  const categoryDistribution = {
    grade: 0,
    attendance: 0,
    behavior: 0,
    progress: 0,
    homework: 0,
    composite: 0,
  };

  // 按班级统计风险学生
  const riskByClass = new Map<
    string,
    {
      className: string;
      atRiskCount: number;
      studentCount: number;
    }
  >();
  const riskFactorCounts = new Map<string, number>();

  students.forEach((student) => {
    let studentWarningCount = 0;
    let studentRiskLevel = "low";

    // 定义科目列表
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "geography",
      "history",
      "politics",
    ];

    // 收集所有科目成绩（从多次考试记录中）
    const allSubjectScores: number[] = [];
    let totalScores: number[] = [];
    let failingSubjectCount = 0;
    let severeFailingSubjectCount = 0;

    student.examRecords.forEach((record) => {
      // 收集总分
      if (record.total_score) {
        totalScores.push(record.total_score);
      }

      // 收集各科成绩
      subjects.forEach((subject) => {
        const score = record[`${subject}_score`];
        if (score !== null && score !== undefined) {
          allSubjectScores.push(score);

          // 统计不及格科目
          if (score < 60) failingSubjectCount++;
          if (score < 40) severeFailingSubjectCount++;
        }
      });
    });

    // 1. 分析总分情况
    if (totalScores.length > 0) {
      const avgTotalScore =
        totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
      const minTotalScore = Math.min(...totalScores);

      if (minTotalScore < 300) {
        // 假设满分是500+
        studentWarningCount++;
        categoryDistribution.grade++;
        studentRiskLevel = "high";
        riskFactorCounts.set(
          "总分过低",
          (riskFactorCounts.get("总分过低") || 0) + 1
        );
      } else if (avgTotalScore < 400) {
        studentWarningCount++;
        categoryDistribution.progress++;
        if (studentRiskLevel === "low") studentRiskLevel = "medium";
        riskFactorCounts.set(
          "总分平均偏低",
          (riskFactorCounts.get("总分平均偏低") || 0) + 1
        );
      }
    }

    // 2. 分析不及格科目情况
    if (failingSubjectCount >= 3) {
      studentWarningCount++;
      categoryDistribution.grade++;
      studentRiskLevel = "high";
      riskFactorCounts.set(
        "多科目不及格",
        (riskFactorCounts.get("多科目不及格") || 0) + 1
      );
    }

    // 3. 分析严重不及格情况
    if (severeFailingSubjectCount > 0) {
      studentWarningCount++;
      categoryDistribution.grade++;
      studentRiskLevel = "high";
      riskFactorCounts.set(
        "严重不及格",
        (riskFactorCounts.get("严重不及格") || 0) + 1
      );
    }

    // 更新学生统计
    if (studentWarningCount > 0) {
      warningStudents++;
      totalWarnings += studentWarningCount;

      // 统计风险等级
      if (studentRiskLevel === "high") {
        highRiskStudents++;
        riskDistribution.high++;
      } else if (studentRiskLevel === "medium") {
        riskDistribution.medium++;
      } else {
        riskDistribution.low++;
      }
    }

    // 按班级统计
    const className = student.studentInfo?.class_name || "未知班级";
    if (!riskByClass.has(className)) {
      riskByClass.set(className, {
        className,
        atRiskCount: 0,
        studentCount: 0,
      });
    }
    const classData = riskByClass.get(className)!;
    classData.studentCount++;
    if (studentWarningCount > 0) {
      classData.atRiskCount++;
    }
  });

  // 构建预警类型分布
  const totalWarningCount = totalWarnings || 1;
  const warningsByType = [
    {
      type: "学业预警",
      count: categoryDistribution.grade,
      percentage: Math.round(
        (categoryDistribution.grade / totalWarningCount) * 100
      ),
      trend: "up" as const,
    },
    {
      type: "进步预警",
      count: categoryDistribution.progress,
      percentage: Math.round(
        (categoryDistribution.progress / totalWarningCount) * 100
      ),
      trend: "down" as const,
    },
    {
      type: "综合预警",
      count: categoryDistribution.composite,
      percentage: Math.round(
        (categoryDistribution.composite / totalWarningCount) * 100
      ),
      trend: "unchanged" as const,
    },
  ];

  // 构建班级风险分布
  const riskByClassArray = Array.from(riskByClass.values())
    .map((classData) => ({
      className: classData.className,
      count: classData.atRiskCount,
      atRiskCount: classData.atRiskCount,
      studentCount: classData.studentCount,
      percentage:
        classData.studentCount > 0
          ? Math.round((classData.atRiskCount / classData.studentCount) * 100)
          : 0,
    }))
    .sort((a, b) => b.atRiskCount - a.atRiskCount)
    .slice(0, 5);

  // 构建风险因素分布
  const commonRiskFactors = Array.from(riskFactorCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([factor, count]) => ({
      factor,
      count,
      percentage:
        warningStudents > 0 ? Math.round((count / warningStudents) * 100) : 0,
      trend: "unchanged" as const,
    }));

  const result: WarningStatistics = {
    totalStudents: students.length,
    warningStudents,
    atRiskStudents: warningStudents,
    warningRatio:
      students.length > 0
        ? parseFloat(((warningStudents / students.length) * 100).toFixed(1))
        : 0,
    highRiskStudents,
    totalWarnings,
    activeWarnings: totalWarnings, // 实时计算都是活跃的
    riskDistribution,
    categoryDistribution,
    scopeDistribution: {
      global: totalWarnings,
      exam: 0,
      class: 0,
      student: 0,
    },
    warningsByType,
    riskByClass: riskByClassArray,
    commonRiskFactors,
  };

  console.log("✅ [新架构] 预警分析完成:", {
    students: result.totalStudents,
    warnings: result.warningStudents,
    ratio: result.warningRatio + "%",
  });

  return result;
}

// 📚 旧架构：基于预警记录表（备份用）
async function getWarningStatisticsLegacy(
  filter?: WarningFilter
): Promise<WarningStatistics> {
  console.log("📚 [旧架构] 使用预警记录表计算统计");

  return warningAnalysisCache.getWarningStats(async () => {
    try {
      // 获取带有完整关联数据的预警记录
      const [studentsWithWarnings, activeRules, recentIssuesData] =
        await Promise.all([
          getStudentsWithWarnings(filter),
          getActiveRules(),
          getRecentIssues(),
        ]);

      // 获取详细的预警问题数据（包含规则和学生信息）
      let statusFilter = ["active", "resolved", "dismissed"];
      if (filter?.warningStatus && filter.warningStatus.length > 0) {
        statusFilter = filter.warningStatus;
      }

      let query = supabase
        .from("warning_records")
        .select(
          `
          *,
          warning_rules(name, severity, category, scope),
          students(class_name)
        `
        )
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
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        }

        if (filter.timeRange !== "custom" && startDate) {
          query = query.gte("created_at", startDate.toISOString());
        }
      }

      // 应用班级筛选
      if (filter?.classNames && filter.classNames.length > 0) {
        console.log("📚 主查询应用班级筛选:", filter.classNames);
        query = query.in("students.class_name", filter.classNames);
      }

      // 如果有考试筛选，需要额外查询grade_data表来过滤学生ID
      if (filter?.examTitles && filter.examTitles.length > 0) {
        console.log("📊 主查询应用考试筛选:", filter.examTitles);
        // 先从grade_data表获取符合考试条件的学生ID
        const { data: gradeData, error: gradeError } = await supabase
          .from("grade_data")
          .select("student_id")
          .in("exam_title", filter.examTitles);

        if (!gradeError && gradeData && gradeData.length > 0) {
          const studentIdsFromGrades = [
            ...new Set(gradeData.map((g) => g.student_id)),
          ];
          console.log(
            "📊 主查询从考试筛选获得的学生ID:",
            studentIdsFromGrades.length,
            "个"
          );
          query = query.in("student_id", studentIdsFromGrades);
        } else {
          console.warn("⚠️ 主查询考试筛选未找到匹配学生，返回空结果");
          // 如果没有找到匹配的学生，设置一个不可能存在的条件，返回空结果
          query = query.eq(
            "student_id",
            "00000000-0000-0000-0000-000000000000"
          );
        }
      }

      const { data: pendingIssues, error } = await query;

      if (error) {
        console.error("获取预警记录失败:", error);
        throw error;
      }

      const totalStudents = await getTotalStudents();
      const studentAtRisk = studentsWithWarnings.length;
      const atRiskRate =
        totalStudents > 0 ? (studentAtRisk / totalStudents) * 100 : 0;

      // 计算真实的类型分布数据
      const categoryStats = (pendingIssues || []).reduce((acc, issue) => {
        // 从规则中获取分类信息
        let category = "other";
        if (issue.warning_rules?.category) {
          category = issue.warning_rules.category;
        }

        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const totalIssues = (pendingIssues || []).length || 1;
      const warningsByType = [
        {
          type: "学业预警",
          count: categoryStats.grade || 0,
          percentage: Math.round(
            ((categoryStats.grade || 0) / totalIssues) * 100
          ),
          trend: "up", // 可以后续实现趋势计算
        },
        {
          type: "行为预警",
          count: categoryStats.behavior || 0,
          percentage: Math.round(
            ((categoryStats.behavior || 0) / totalIssues) * 100
          ),
          trend: "down",
        },
        {
          type: "出勤预警",
          count: categoryStats.attendance || 0,
          percentage: Math.round(
            ((categoryStats.attendance || 0) / totalIssues) * 100
          ),
          trend: "unchanged",
        },
        {
          type: "作业预警",
          count: categoryStats.homework || 0,
          percentage: Math.round(
            ((categoryStats.homework || 0) / totalIssues) * 100
          ),
          trend: "up",
        },
      ];

      // 从已获取的预警记录中计算班级分布
      const classStats = (pendingIssues || []).reduce((acc, issue) => {
        const className = issue.students?.class_name || "未知班级";
        acc[className] = (acc[className] || 0) + 1;
        return acc;
      }, {});

      // 查询每个班级的学生总数
      const classNames = Object.keys(classStats);
      let classStudentCounts = {};

      // 如果有班级数据，查询每个班级的学生总数
      if (classNames.length > 0) {
        try {
          const { data: studentCounts } = await supabase
            .from("students")
            .select("class_name")
            .in("class_name", classNames);

          // 统计每个班级的学生数量
          classStudentCounts = (studentCounts || []).reduce((acc, student) => {
            acc[student.class_name] = (acc[student.class_name] || 0) + 1;
            return acc;
          }, {});
        } catch (error) {
          console.warn("获取班级学生数量失败，使用估算值:", error);
        }
      }

      // 转换为数组格式并计算百分比
      const riskByClass = Object.entries(classStats)
        .map(([className, count]) => {
          const atRiskCount = Number(count);
          const studentCount = classStudentCounts[className] || atRiskCount + 5; // 如果没有数据，估算总数

          return {
            className: className,
            atRiskCount: atRiskCount,
            studentCount: studentCount,
            count: atRiskCount, // 保留兼容性
            percentage:
              studentAtRisk > 0
                ? Math.round((atRiskCount / studentAtRisk) * 100)
                : 0,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // 只显示前5个班级

      // 基于预警规则分析真实风险因素
      const ruleStats = (pendingIssues || []).reduce((acc, issue) => {
        const ruleName = issue.warning_rules?.name || "未知规则";
        acc[ruleName] = (acc[ruleName] || 0) + 1;
        return acc;
      }, {});

      // 转换为标准化的风险因素名称
      const commonRiskFactors = Object.entries(ruleStats)
        .map(([ruleName, count]) => {
          // 将规则名称映射为用户友好的风险因素名称
          let factorName = ruleName;
          if (ruleName.includes("不及格") || ruleName.includes("成绩")) {
            factorName = "成绩问题";
          } else if (ruleName.includes("作业")) {
            factorName = "作业完成率低";
          } else if (ruleName.includes("出勤") || ruleName.includes("缺勤")) {
            factorName = "出勤问题";
          } else if (ruleName.includes("行为") || ruleName.includes("纪律")) {
            factorName = "行为问题";
          } else if (ruleName.includes("下降") || ruleName.includes("退步")) {
            factorName = "成绩下滑";
          }

          return {
            factor: factorName,
            count: Number(count),
            percentage:
              studentAtRisk > 0
                ? Math.round((Number(count) / studentAtRisk) * 100)
                : 0,
            trend: "unchanged", // 趋势分析需要历史数据，暂时设为不变
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // 只显示前5个风险因素

      return {
        totalStudents,
        warningStudents: studentAtRisk,
        atRiskStudents: studentAtRisk, // 别名字段
        warningRatio: parseFloat(atRiskRate.toFixed(1)),
        // 计算高风险学生数量（基于severity为high的预警记录）
        highRiskStudents: (pendingIssues || []).filter(
          (issue) => issue.warning_rules?.severity === "high"
        ).length,
        totalWarnings: (pendingIssues || []).length,
        activeWarnings: (pendingIssues || []).filter(
          (issue) => issue.status === "active"
        ).length,

        // 基于真实数据计算严重程度分布
        riskDistribution: {
          low: (pendingIssues || []).filter(
            (issue) => issue.warning_rules?.severity === "low"
          ).length,
          medium: (pendingIssues || []).filter(
            (issue) => issue.warning_rules?.severity === "medium"
          ).length,
          high: (pendingIssues || []).filter(
            (issue) => issue.warning_rules?.severity === "high"
          ).length,
        },

        // 基于真实数据计算类别分布
        categoryDistribution: {
          grade: categoryStats.grade || 0,
          attendance: categoryStats.attendance || 0,
          behavior: categoryStats.behavior || 0,
          progress: categoryStats.progress || 0,
          homework: categoryStats.homework || 0,
          composite: categoryStats.composite || 0,
        },

        // 基于真实数据计算范围分布
        scopeDistribution: (pendingIssues || []).reduce(
          (acc, issue) => {
            const scope = issue.warning_rules?.scope || "student";
            acc[scope] = (acc[scope] || 0) + 1;
            return acc;
          },
          {
            global: 0,
            exam: 0,
            class: 0,
            student: 0,
          }
        ),
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
      .update({ ...updates })
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
      .update({ is_active: isActive })
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
    // ML增强预警规则
    {
      name: "AI风险预测预警",
      description: "基于机器学习算法预测学生学业风险",
      conditions: {
        type: "ml_risk_prediction",
        threshold: 70,
        sensitivity: 0.8,
        min_data_points: 2,
      },
      severity: "high",
      scope: "global",
      category: "composite",
      priority: 10,
    },
    {
      name: "AI异常检测预警",
      description: "使用统计异常检测识别成绩突然变化的学生",
      conditions: {
        type: "ml_anomaly_detection",
        z_threshold: 2.0,
        sensitivity: 0.8,
        min_data_points: 3,
      },
      severity: "medium",
      scope: "global",
      category: "progress",
      priority: 8,
    },
    {
      name: "AI趋势分析预警",
      description: "基于线性回归分析成绩下降趋势",
      conditions: {
        type: "ml_trend_analysis",
        decline_rate: -2.0,
        confidence_threshold: 0.7,
        min_data_points: 3,
      },
      severity: "medium",
      scope: "global",
      category: "progress",
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
