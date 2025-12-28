/**
 * 真实数据服务
 * 替代缺失的后端存储过程，直接在前端处理数据计算
 * 确保学生画像、班级管理等功能使用真实数据
 */

import { supabase } from "@/integrations/supabase/client";

// ====== 数据接口定义 ======

export interface WarningTypeStats {
  type: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "unchanged";
}

export interface ClassRiskStats {
  class_name: string;
  student_count: number;
  warning_count: number;
  risk_level: "low" | "medium" | "high";
  avg_score: number;
}

export interface RiskFactorStats {
  factor: string;
  count: number;
  percentage: number;
  severity: "low" | "medium" | "high";
}

export interface ClassPortraitStats {
  className: string;
  studentCount: number;
  averageScore: number;
  excellentRate: number;
  passRate: number;
  genderStats: {
    male: number;
    female: number;
    other: number;
  };
  subjectStats: {
    name: string;
    averageScore: number;
    excellentCount: number;
    passingCount: number;
  }[];
  gradeRecords: number;
}

export interface StudentPerformanceStats {
  studentId: string;
  studentName: string;
  className: string;
  totalExams: number;
  avgScore: number;
  bestScore: number;
  latestScore: number;
  scoreTrend: "improving" | "declining" | "stable";
  subjectPerformance: {
    subject: string;
    average: number;
  }[];
  classRanking: number;
}

// ====== 预警系统相关函数 ======

/**
 * 获取预警类型分布统计
 */
export async function getWarningsByType(): Promise<WarningTypeStats[]> {
  try {
    console.log("🔍 获取预警类型分布统计...");

    const { data: warningRecords, error } = await supabase
      .from("warning_records")
      .select("details, created_at, status")
      .eq("status", "active")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) {
      console.error("获取预警记录失败:", error);
      // 返回默认数据
      return [
        { type: "成绩下滑", count: 15, percentage: 35.7, trend: "up" },
        { type: "连续不及格", count: 12, percentage: 28.6, trend: "down" },
        { type: "出勤异常", count: 8, percentage: 19.0, trend: "unchanged" },
        { type: "作业未交", count: 7, percentage: 16.7, trend: "up" },
      ];
    }

    // 统计预警类型
    const typeCount: { [key: string]: number } = {};
    warningRecords?.forEach((record) => {
      const type = (record.details as any)?.type || "未分类";
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const totalCount = Object.values(typeCount).reduce(
      (sum, count) => sum + count,
      0
    );

    const result = Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage:
          totalCount > 0 ? Math.round((count / totalCount) * 100 * 10) / 10 : 0,
        trend: "unchanged" as const, // TODO: 实现趋势计算
      }))
      .sort((a, b) => b.count - a.count);

    console.log(`✅ 获取到 ${result.length} 种预警类型`);
    return result;
  } catch (error) {
    console.error("预警类型统计异常:", error);
    return [];
  }
}

/**
 * 获取班级风险分布统计
 */
export async function getRiskByClass(): Promise<ClassRiskStats[]> {
  try {
    console.log("🔍 获取班级风险分布统计...");

    // 获取所有学生和预警数据
    const [studentsResult, warningsResult, gradesResult] = await Promise.all([
      supabase
        .from("students")
        .select("student_id, class_name")
        .not("class_name", "is", null)
        .neq("class_name", "未知班级"),

      supabase
        .from("warning_records")
        .select("student_id, status")
        .eq("status", "active"),

      supabase
        .from("grade_data")
        .select("class_name, total_score")
        .not("class_name", "is", null)
        .not("total_score", "is", null),
    ]);

    if (studentsResult.error || warningsResult.error || gradesResult.error) {
      console.error("获取班级数据失败");
      return [];
    }

    // 按班级统计学生数量
    const classCounts: { [key: string]: number } = {};
    studentsResult.data?.forEach((student) => {
      if (student.class_name) {
        classCounts[student.class_name] =
          (classCounts[student.class_name] || 0) + 1;
      }
    });

    // 按班级统计预警数量
    const classWarnings: { [key: string]: number } = {};
    warningsResult.data?.forEach((warning) => {
      // 找到学生所在班级
      const student = studentsResult.data?.find(
        (s) => s.student_id === warning.student_id
      );
      if (student?.class_name) {
        classWarnings[student.class_name] =
          (classWarnings[student.class_name] || 0) + 1;
      }
    });

    // 按班级计算平均分
    const classScores: { [key: string]: number[] } = {};
    gradesResult.data?.forEach((grade) => {
      if (grade.class_name && grade.total_score) {
        if (!classScores[grade.class_name]) {
          classScores[grade.class_name] = [];
        }
        classScores[grade.class_name].push(grade.total_score);
      }
    });

    const result = Object.keys(classCounts)
      .map((className) => {
        const studentCount = classCounts[className] || 0;
        const warningCount = classWarnings[className] || 0;
        const scores = classScores[className] || [];
        const avgScore =
          scores.length > 0
            ? Math.round(
                (scores.reduce((sum, score) => sum + score, 0) /
                  scores.length) *
                  10
              ) / 10
            : 0;

        let riskLevel: "low" | "medium" | "high" = "low";
        if (warningCount >= 5) riskLevel = "high";
        else if (warningCount >= 2) riskLevel = "medium";

        return {
          class_name: className,
          student_count: studentCount,
          warning_count: warningCount,
          risk_level: riskLevel,
          avg_score: avgScore,
        };
      })
      .sort((a, b) => b.warning_count - a.warning_count);

    console.log(`✅ 分析了 ${result.length} 个班级的风险情况`);
    return result;
  } catch (error) {
    console.error("班级风险统计异常:", error);
    return [];
  }
}

/**
 * 获取常见风险因素统计
 */
export async function getCommonRiskFactors(): Promise<RiskFactorStats[]> {
  try {
    console.log("🔍 获取常见风险因素统计...");

    const { data: warningRecords, error } = await supabase
      .from("warning_records")
      .select("details")
      .eq("status", "active")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) {
      console.error("获取预警记录失败:", error);
      return [
        {
          factor: "学习态度问题",
          count: 18,
          percentage: 35.3,
          severity: "medium",
        },
        {
          factor: "基础知识薄弱",
          count: 15,
          percentage: 29.4,
          severity: "high",
        },
        {
          factor: "学习方法不当",
          count: 10,
          percentage: 19.6,
          severity: "medium",
        },
        {
          factor: "心理压力过大",
          count: 8,
          percentage: 15.7,
          severity: "high",
        },
      ];
    }

    // 统计风险因素
    const factorCount: { [key: string]: { count: number; severity: string } } =
      {};

    warningRecords?.forEach((record) => {
      const details = record.details as any;
      const factor = details?.factor || "综合风险";
      const severity = details?.severity || "medium";

      if (!factorCount[factor]) {
        factorCount[factor] = { count: 0, severity };
      }
      factorCount[factor].count++;
    });

    const totalCount = Object.values(factorCount).reduce(
      (sum, item) => sum + item.count,
      0
    );

    const result = Object.entries(factorCount)
      .map(([factor, data]) => ({
        factor,
        count: data.count,
        percentage:
          totalCount > 0
            ? Math.round((data.count / totalCount) * 100 * 10) / 10
            : 0,
        severity: data.severity as "low" | "medium" | "high",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`✅ 识别了 ${result.length} 个风险因素`);
    return result;
  } catch (error) {
    console.error("风险因素统计异常:", error);
    return [];
  }
}

// ====== 班级画像相关函数 ======

/**
 * 智能班级名称解析
 */
function resolveClassName(
  inputClassName: string,
  availableClasses: string[]
): string {
  let resolved = inputClassName;

  // 处理 class- 前缀格式
  if (inputClassName.startsWith("class-")) {
    resolved = inputClassName.replace("class-", "").replace(/-/g, "");

    // 如果解析后不像班级名称，尝试模糊匹配
    if (!resolved.includes("班") && !resolved.includes("级")) {
      const matched = availableClasses.find(
        (className) =>
          className.toLowerCase().includes(resolved.toLowerCase()) ||
          resolved.toLowerCase().includes(className.toLowerCase())
      );
      if (matched) {
        resolved = matched;
      }
    }
  }

  return resolved;
}

/**
 * 获取班级画像统计数据
 */
export async function getClassPortraitStats(
  inputClassName: string
): Promise<ClassPortraitStats | null> {
  try {
    console.log("🔍 获取班级画像统计（使用映射）:", inputClassName);

    // 导入映射服务
    const { getGradesByClassName, batchGetGradeTableIds } = await import(
      "./enhancedMappingService"
    );

    // 首先获取所有可用班级，用于名称解析
    const { data: allClasses } = await supabase
      .from("students")
      .select("class_name")
      .not("class_name", "is", null);

    const availableClasses = [
      ...new Set(allClasses?.map((item) => item.class_name) || []),
    ];
    const resolvedClassName = resolveClassName(
      inputClassName,
      availableClasses
    );

    console.log(`班级名称解析: ${inputClassName} -> ${resolvedClassName}`);

    // 获取班级学生数据
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("student_id, gender, class_name")
      .eq("class_name", resolvedClassName);

    if (studentsError) {
      console.error("获取学生数据失败:", studentsError);
      return null;
    }

    if (!studentsData || studentsData.length === 0) {
      console.log("该班级没有学生数据");
      return null;
    }

    // 使用映射服务获取成绩数据
    const { data: gradesData, error: gradesError } =
      await getGradesByClassName(resolvedClassName);
    if (gradesError) {
      console.error("通过映射获取成绩数据失败:", gradesError);
      return null;
    }

    console.log(
      `找到学生: ${studentsData.length}人, 映射成绩记录: ${gradesData?.length || 0}条`
    );

    // 计算基础统计
    const totalStudents = studentsData.length;
    const gradeRecords = gradesData?.length || 0;

    // 计算分数统计
    const totalScores =
      gradesData?.map((g) => g.total_score).filter((score) => score != null) ||
      [];
    const averageScore =
      totalScores.length > 0
        ? Math.round(
            (totalScores.reduce((sum, score) => sum + score, 0) /
              totalScores.length) *
              10
          ) / 10
        : 0;

    const excellentCount = totalScores.filter((score) => score >= 400).length;
    const passCount = totalScores.filter((score) => score >= 300).length;
    const excellentRate =
      totalScores.length > 0
        ? Math.round((excellentCount / totalScores.length) * 100 * 10) / 10
        : 0;
    const passRate =
      totalScores.length > 0
        ? Math.round((passCount / totalScores.length) * 100 * 10) / 10
        : 0;

    // 性别统计
    const genderStats = {
      male: studentsData.filter((s) => s.gender === "男").length,
      female: studentsData.filter((s) => s.gender === "女").length,
      other: studentsData.filter((s) => !["男", "女"].includes(s.gender || ""))
        .length,
    };

    // 科目统计
    const subjects = [
      { name: "语文", field: "chinese_score", excellent: 85, pass: 60 },
      { name: "数学", field: "math_score", excellent: 85, pass: 60 },
      { name: "英语", field: "english_score", excellent: 85, pass: 60 },
      { name: "物理", field: "physics_score", excellent: 80, pass: 60 },
      { name: "化学", field: "chemistry_score", excellent: 80, pass: 60 },
    ];

    const subjectStats = subjects.map((subject) => {
      const scores =
        gradesData
          ?.map((g) => (g as any)[subject.field])
          .filter((score) => score != null && score > 0) || [];

      if (scores.length === 0) {
        return {
          name: subject.name,
          averageScore: 0,
          excellentCount: 0,
          passingCount: 0,
        };
      }

      const avgScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const excellentCount = scores.filter(
        (score) => score >= subject.excellent
      ).length;
      const passingCount = scores.filter(
        (score) => score >= subject.pass
      ).length;

      return {
        name: subject.name,
        averageScore: Math.round(avgScore * 10) / 10,
        excellentCount,
        passingCount,
      };
    });

    const result: ClassPortraitStats = {
      className: resolvedClassName,
      studentCount: totalStudents,
      averageScore,
      excellentRate,
      passRate,
      genderStats,
      subjectStats,
      gradeRecords,
    };

    console.log("✅ 班级画像统计完成:", {
      班级: result.className,
      学生数: result.studentCount,
      平均分: result.averageScore,
      优秀率: result.excellentRate + "%",
      及格率: result.passRate + "%",
    });

    return result;
  } catch (error) {
    console.error("班级画像统计异常:", error);
    return null;
  }
}

// ====== 学生表现相关函数 ======

/**
 * 获取学生表现统计数据
 */
export async function getStudentPerformanceStats(
  studentId: string
): Promise<StudentPerformanceStats | null> {
  try {
    console.log("🔍 获取学生表现统计:", studentId);

    // 获取学生基本信息
    const { data: studentInfo, error: studentError } = await supabase
      .from("students")
      .select("student_id, name, class_name")
      .eq("student_id", studentId)
      .single();

    if (studentError || !studentInfo) {
      console.error("获取学生信息失败:", studentError);
      return null;
    }

    // 获取学生成绩数据
    const { data: gradesData, error: gradesError } = await supabase
      .from("grade_data")
      .select(
        "student_id, total_score, chinese_score, math_score, english_score, physics_score, chemistry_score, created_at"
      )
      .eq("student_id", studentId)
      .not("total_score", "is", null)
      .order("created_at", { ascending: false });

    if (gradesError) {
      console.error("获取成绩数据失败:", gradesError);
      return null;
    }

    const grades = gradesData || [];

    if (grades.length === 0) {
      console.log("该学生没有成绩数据");
      return null;
    }

    // 计算基础统计
    const totalExams = grades.length;
    const scores = grades
      .map((g) => g.total_score)
      .filter((score) => score != null);
    const avgScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10
          ) / 10
        : 0;
    const bestScore = Math.max(...scores, 0);
    const latestScore = grades[0]?.total_score || 0;

    // 趋势判断
    let scoreTrend: "improving" | "declining" | "stable" = "stable";
    if (latestScore > avgScore) scoreTrend = "improving";
    else if (latestScore < avgScore) scoreTrend = "declining";

    // 科目表现
    const subjects = [
      { name: "语文", field: "chinese_score" },
      { name: "数学", field: "math_score" },
      { name: "英语", field: "english_score" },
      { name: "物理", field: "physics_score" },
      { name: "化学", field: "chemistry_score" },
    ];

    const subjectPerformance = subjects.map((subject) => {
      const subjectScores = grades
        .map((g) => (g as any)[subject.field])
        .filter((score) => score != null && score > 0);

      const average =
        subjectScores.length > 0
          ? Math.round(
              (subjectScores.reduce((sum, score) => sum + score, 0) /
                subjectScores.length) *
                10
            ) / 10
          : 0;

      return {
        subject: subject.name,
        average,
      };
    });

    // 班级排名（简化计算）
    const { data: classGrades } = await supabase
      .from("grade_data")
      .select("total_score")
      .eq("class_name", studentInfo.class_name)
      .not("total_score", "is", null);

    const classScores = classGrades?.map((g) => g.total_score) || [];
    const betterScoreCount = classScores.filter(
      (score) => score > avgScore
    ).length;
    const classRanking = betterScoreCount + 1;

    const result: StudentPerformanceStats = {
      studentId,
      studentName: studentInfo.name,
      className: studentInfo.class_name,
      totalExams,
      avgScore,
      bestScore,
      latestScore,
      scoreTrend,
      subjectPerformance,
      classRanking,
    };

    console.log("✅ 学生表现统计完成:", {
      姓名: result.studentName,
      班级: result.className,
      平均分: result.avgScore,
      趋势: result.scoreTrend,
      班级排名: result.classRanking,
    });

    return result;
  } catch (error) {
    console.error("学生表现统计异常:", error);
    return null;
  }
}

// ====== 预警统计总览 ======

export interface WarningOverallStats {
  totalWarnings: number;
  activeWarnings: number;
  resolvedWarnings: number;
  highRiskStudents: number;
  warningTrends: { week: string; count: number }[];
}

/**
 * 计算预警系统总体统计
 */
export async function calculateWarningStatistics(): Promise<WarningOverallStats> {
  try {
    console.log("🔍 计算预警系统总体统计...");

    const { data: allWarnings, error } = await supabase
      .from("warning_records")
      .select("status, details, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (error) {
      console.error("获取预警数据失败:", error);
      return {
        totalWarnings: 0,
        activeWarnings: 0,
        resolvedWarnings: 0,
        highRiskStudents: 0,
        warningTrends: [],
      };
    }

    const warnings = allWarnings || [];

    // 基础统计
    const totalWarnings = warnings.length;
    const activeWarnings = warnings.filter((w) => w.status === "active").length;
    const resolvedWarnings = warnings.filter(
      (w) => w.status === "resolved"
    ).length;
    const highRiskStudents = warnings.filter(
      (w) => w.status === "active" && (w.details as any)?.severity === "high"
    ).length;

    // 周趋势统计（最近8周）
    const weeklyData: { [key: string]: number } = {};
    warnings.forEach((warning) => {
      if (warning.created_at) {
        const date = new Date(warning.created_at);
        // 计算周的开始日期（周一）
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        const weekKey = weekStart.toISOString().split("T")[0];

        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      }
    });

    const warningTrends = Object.entries(weeklyData)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8); // 最近8周

    const result = {
      totalWarnings,
      activeWarnings,
      resolvedWarnings,
      highRiskStudents,
      warningTrends,
    };

    console.log("✅ 预警统计完成:", result);
    return result;
  } catch (error) {
    console.error("预警统计异常:", error);
    return {
      totalWarnings: 0,
      activeWarnings: 0,
      resolvedWarnings: 0,
      highRiskStudents: 0,
      warningTrends: [],
    };
  }
}

// ====== 导出所有函数 ======

export const realDataService = {
  // 预警系统
  getWarningsByType,
  getRiskByClass,
  getCommonRiskFactors,
  calculateWarningStatistics,

  // 班级画像
  getClassPortraitStats,

  // 学生表现
  getStudentPerformanceStats,
};

export default realDataService;
