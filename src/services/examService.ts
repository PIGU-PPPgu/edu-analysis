import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { warningAnalysisCache } from "../utils/performanceCache";

// 考试接口定义
export interface Exam {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  total_score?: number;
  passing_score?: number;
  classes?: string[];
  status?: "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";
  participant_count?: number;
  completion_rate?: number;
  average_score?: number;
  tags?: string[];
}

export interface ExamType {
  id: string;
  type_name: string;
  description?: string;
  is_system: boolean;
  created_at: string;
}

export interface ExamFilter {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  subject?: string;
  searchTerm?: string;
}

export interface ExamStatistics {
  examId: string;
  examTitle: string;
  examDate: string;
  participantCount: number;
  averageScore: number;
  passRate: number;
  excellentRate: number;
  maxScore: number;
  minScore: number;
  scoreDistribution: ScoreDistribution[];
  totalScore: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
  gradeLevel?: string;
}

// 创建考试的输入接口
export interface CreateExamInput {
  title: string;
  type: string;
  date: string;
  subject?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  total_score?: number;
  passing_score?: number;
  classes?: string[];
  status?: "draft" | "scheduled";
  tags?: string[];
}

// 更新考试的输入接口
export interface UpdateExamInput {
  title?: string;
  type?: string;
  date?: string;
  subject?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  total_score?: number;
  passing_score?: number;
  classes?: string[];
  status?: "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";
  tags?: string[];
}

/**
 * 计算分数段分布
 * 优先使用grade字段，如果没有则按排名百分比计算等级
 */
const calculateScoreDistribution = (grades: any[]): ScoreDistribution[] => {
  if (!grades || grades.length === 0) {
    return [];
  }

  // 检查是否有grade字段的数据
  const hasGradeData = grades.some((g) => g.grade && g.grade.trim() !== "");

  if (hasGradeData) {
    // 使用已有的grade字段统计
    const gradeCount: { [key: string]: number } = {};

    grades.forEach((g) => {
      const grade = g.grade?.trim() || "Unknown";
      gradeCount[grade] = (gradeCount[grade] || 0) + 1;
    });

    // 按照等级顺序排序
    const gradeOrder = ["A+", "A", "B+", "B", "C+", "C", "Unknown"];

    return gradeOrder
      .filter((grade) => gradeCount[grade] > 0)
      .map((grade) => ({
        range: grade,
        count: gradeCount[grade],
        percentage: (gradeCount[grade] / grades.length) * 100,
        gradeLevel: grade,
      }));
  } else {
    // 按排名百分比计算等级
    const validScores = grades
      .filter(
        (g) => g.score !== null && g.score !== undefined && !isNaN(g.score)
      )
      .map((g) => ({ ...g, score: Number(g.score) }))
      .sort((a, b) => b.score - a.score); // 按分数降序排列

    if (validScores.length === 0) {
      return [];
    }

    const total = validScores.length;
    const gradeRanges = [
      { grade: "A+", min: 0, max: 0.05 }, // 前5%
      { grade: "A", min: 0.05, max: 0.25 }, // 5%-25%
      { grade: "B+", min: 0.25, max: 0.5 }, // 25%-50%
      { grade: "B", min: 0.5, max: 0.75 }, // 50%-75%
      { grade: "C+", min: 0.75, max: 0.95 }, // 75%-95%
      { grade: "C", min: 0.95, max: 1.0 }, // 后5%
    ];

    const gradeCount: { [key: string]: number } = {};

    validScores.forEach((student, index) => {
      const percentile = index / total;
      const gradeRange =
        gradeRanges.find(
          (range) => percentile >= range.min && percentile < range.max
        ) || gradeRanges[gradeRanges.length - 1]; // 默认最后一个等级

      gradeCount[gradeRange.grade] = (gradeCount[gradeRange.grade] || 0) + 1;
    });

    return Object.entries(gradeCount).map(([grade, count]) => ({
      range: grade,
      count,
      percentage: (count / total) * 100,
      gradeLevel: grade,
    }));
  }
};

/**
 * 获取所有考试类型
 */
export const getExamTypes = async (): Promise<ExamType[]> => {
  try {
    const { data, error } = await supabase
      .from("exam_types")
      .select("*")
      .order("is_system", { ascending: false })
      .order("type_name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("获取考试类型失败:", error);
    toast.error("获取考试类型失败");
    return [];
  }
};

/**
 * 获取考试列表，支持筛选
 */
export const getExams = async (filter?: ExamFilter): Promise<Exam[]> => {
  // 暂时禁用缓存以确保删除后能立即看到变化
  console.log("[ExamService] 获取考试列表...");

  let query = supabase
    .from("exams")
    .select(
      `
      id,
      title,
      date,
      type,
      subject,
      created_at
    `
    )
    .order("date", { ascending: false });

  // 应用过滤器
  if (filter?.dateFrom) {
    query = query.gte("date", filter.dateFrom);
  }
  if (filter?.dateTo) {
    query = query.lte("date", filter.dateTo);
  }
  if (filter?.type) {
    query = query.eq("type", filter.type);
  }
  if (filter?.subject) {
    query = query.eq("subject", filter.subject);
  }
  if (filter?.searchTerm) {
    query = query.ilike("title", `%${filter.searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ExamService] 获取考试列表失败:", error);
    throw error;
  }

  console.log("[ExamService] 获取到考试数据:", data?.length, "条");
  return data || [];
};

/**
 * 根据考试ID获取考试详情
 */
export const getExamById = async (examId: string): Promise<Exam | null> => {
  try {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("获取考试详情失败:", error);
    toast.error("获取考试详情失败");
    return null;
  }
};

/**
 * 获取考试统计信息
 */
export const getExamStatistics = async (
  examId: string
): Promise<ExamStatistics> => {
  return warningAnalysisCache.getExamData(async () => {
    console.log(`[ExamService] 获取考试统计信息: ${examId}`);

    // 获取考试信息
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError && examError.code !== "PGRST116") {
      throw examError;
    }

    // 获取成绩数据
    const { data: grades, error: gradesError } = await supabase
      .from("grade_data_new")
      .select(
        `
          total_score,
          student_id,
          name,
          class_name,
          chinese_score,
          math_score,
          english_score,
          physics_score,
          chemistry_score,
          biology_score,
          politics_score,
          history_score,
          geography_score
        `
      )
      .eq("exam_id", examId);

    if (gradesError) {
      throw gradesError;
    }

    const scores =
      grades
        ?.map((g) => g.total_score)
        .filter((s) => s !== null && s !== undefined) || [];
    const participantCount = grades?.length || 0;

    // 计算统计指标
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // 获取总分信息 - 优先使用subject_total_score
    const totalScores =
      grades
        ?.map((g) => g.subject_total_score)
        .filter((s) => s !== null && s !== undefined) || [];
    const defaultTotalScore =
      totalScores.length > 0 ? Math.max(...totalScores) : 100;

    const passThreshold = defaultTotalScore * 0.6; // 60%及格
    const excellentThreshold = defaultTotalScore * 0.9; // 90%优秀

    const passCount = scores.filter((score) => score >= passThreshold).length;
    const passRate =
      participantCount > 0 ? (passCount / participantCount) * 100 : 0;

    const excellentCount = scores.filter(
      (score) => score >= excellentThreshold
    ).length;
    const excellentRate =
      participantCount > 0 ? (excellentCount / participantCount) * 100 : 0;

    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    // 计算分数段分布 - 使用修正后的函数
    const scoreDistribution = calculateScoreDistribution(grades || []);

    return {
      examId,
      examTitle: exam?.title || examId,
      examDate: exam?.date || new Date().toISOString().split("T")[0],
      participantCount,
      averageScore: Math.round(averageScore * 100) / 100,
      maxScore,
      minScore,
      passRate: Math.round(passRate * 100) / 100,
      excellentRate: Math.round(excellentRate * 100) / 100,
      scoreDistribution,
      totalScore: defaultTotalScore,
    };
  }, examId);
};

/**
 * 获取最近的考试列表（用于快速选择）
 */
export const getRecentExams = async (limit: number = 10): Promise<Exam[]> => {
  try {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("获取最近考试失败:", error);
    return [];
  }
};

/**
 * 根据考试获取相关的预警统计数据
 */
export const getExamWarningStatistics = async (examId: string) => {
  try {
    // 获取该考试的成绩数据 - 需要先获取考试标题
    const { data: exam } = await supabase
      .from("exams")
      .select("title")
      .eq("id", examId)
      .single();

    if (!exam) {
      throw new Error("考试不存在");
    }

    const { data: gradeData, error: gradeError } = await supabase
      .from("grade_data_new")
      .select("student_id, total_score, name, class_name")
      .eq("exam_title", exam.title);

    if (gradeError) throw gradeError;

    if (!gradeData || gradeData.length === 0) {
      return {
        totalStudents: 0,
        atRiskStudents: 0,
        warningsByType: [],
        riskByClass: [],
        commonRiskFactors: [],
      };
    }

    // 分析风险学生（成绩低于60分的学生）
    const failingStudents = gradeData.filter(
      (student) => (student.total_score || 0) < 60
    );
    const lowPerformingStudents = gradeData.filter((student) => {
      const score = student.total_score || 0;
      return score >= 60 && score < 70; // 60-70分区间的学生
    });

    // 按班级统计风险学生
    const classRiskMap: Record<string, { total: number; atRisk: number }> = {};

    gradeData.forEach((student) => {
      const className = student.class_name || "未知班级";
      if (!classRiskMap[className]) {
        classRiskMap[className] = { total: 0, atRisk: 0 };
      }
      classRiskMap[className].total++;

      if ((student.total_score || 0) < 70) {
        classRiskMap[className].atRisk++;
      }
    });

    const riskByClass = Object.entries(classRiskMap).map(
      ([className, stats]) => ({
        className,
        studentCount: stats.total,
        atRiskCount: stats.atRisk,
      })
    );

    // 生成预警类型统计
    const totalAtRisk = failingStudents.length + lowPerformingStudents.length;
    const warningsByType = [
      {
        type: "成绩预警",
        count: failingStudents.length,
        percentage:
          totalAtRisk > 0
            ? Math.round((failingStudents.length / totalAtRisk) * 100)
            : 0,
        trend: "unchanged" as const,
      },
      {
        type: "学习预警",
        count: lowPerformingStudents.length,
        percentage:
          totalAtRisk > 0
            ? Math.round((lowPerformingStudents.length / totalAtRisk) * 100)
            : 0,
        trend: "unchanged" as const,
      },
    ];

    // 生成常见风险因素
    const commonRiskFactors = [
      {
        factor: "考试成绩不及格",
        count: failingStudents.length,
        percentage:
          gradeData.length > 0
            ? Math.round((failingStudents.length / gradeData.length) * 100)
            : 0,
      },
      {
        factor: "成绩处于临界状态",
        count: lowPerformingStudents.length,
        percentage:
          gradeData.length > 0
            ? Math.round(
                (lowPerformingStudents.length / gradeData.length) * 100
              )
            : 0,
      },
    ].filter((factor) => factor.count > 0);

    return {
      totalStudents: gradeData.length,
      atRiskStudents: totalAtRisk,
      warningsByType,
      riskByClass,
      commonRiskFactors,
    };
  } catch (error) {
    console.error("获取考试预警统计失败:", error);
    toast.error("获取考试预警统计失败");
    return {
      totalStudents: 0,
      atRiskStudents: 0,
      warningsByType: [],
      riskByClass: [],
      commonRiskFactors: [],
    };
  }
};

/**
 * 创建新考试
 */
export const createExam = async (
  examData: CreateExamInput
): Promise<Exam | null> => {
  try {
    const { data, error } = await supabase
      .from("exams")
      .insert([
        {
          title: examData.title,
          type: examData.type,
          date: examData.date,
          subject: examData.subject,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    toast.success("考试创建成功");
    return data;
  } catch (error) {
    console.error("创建考试失败:", error);
    toast.error("创建考试失败");
    return null;
  }
};

/**
 * 更新考试信息
 */
export const updateExam = async (
  examId: string,
  examData: UpdateExamInput
): Promise<Exam | null> => {
  try {
    const { data, error } = await supabase
      .from("exams")
      .update({
        title: examData.title,
        type: examData.type,
        date: examData.date,
        subject: examData.subject,
        updated_at: new Date().toISOString(),
      })
      .eq("id", examId)
      .select()
      .single();

    if (error) throw error;

    toast.success("考试更新成功");
    return data;
  } catch (error) {
    console.error("更新考试失败:", error);
    toast.error("更新考试失败");
    return null;
  }
};

/**
 * 删除考试
 */
export const deleteExam = async (examId: string): Promise<boolean> => {
  try {
    console.log("🗑️ 开始删除考试:", examId);

    const { error, data } = await supabase
      .from("exams")
      .delete()
      .eq("id", examId)
      .select(); // 添加select以获取删除的数据确认

    console.log("🗑️ 删除结果:", { error, data });

    if (error) {
      console.error("🗑️ 删除失败，错误详情:", error);
      throw error;
    }

    console.log("✅ 考试删除成功，删除的数据:", data);
    toast.success("考试删除成功");
    return true;
  } catch (error) {
    console.error("删除考试失败:", error);
    toast.error(
      `删除考试失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
    return false;
  }
};

/**
 * 批量删除考试
 */
export const deleteExams = async (examIds: string[]): Promise<boolean> => {
  try {
    const { error } = await supabase.from("exams").delete().in("id", examIds);

    if (error) throw error;

    toast.success(`成功删除${examIds.length}个考试`);
    return true;
  } catch (error) {
    console.error("批量删除考试失败:", error);
    toast.error("批量删除考试失败");
    return false;
  }
};

/**
 * 复制考试
 */
export const duplicateExam = async (examId: string): Promise<Exam | null> => {
  try {
    const originalExam = await getExamById(examId);
    if (!originalExam) {
      throw new Error("原考试不存在");
    }

    const { data, error } = await supabase
      .from("exams")
      .insert([
        {
          title: `${originalExam.title} (副本)`,
          type: originalExam.type,
          date: originalExam.date,
          subject: originalExam.subject,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    toast.success("考试复制成功");
    return data;
  } catch (error) {
    console.error("复制考试失败:", error);
    toast.error("复制考试失败");
    return null;
  }
};

/**
 * 获取考试统计概览
 */
export const getExamOverviewStatistics = async (): Promise<{
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  averageParticipation: number;
  averageScore: number;
  improvementRate: number;
  riskExams: number;
} | null> => {
  try {
    // 获取所有考试
    const { data: exams, error } = await supabase.from("exams").select("*");

    if (error) throw error;

    if (!exams || exams.length === 0) {
      return {
        total: 0,
        upcoming: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        averageParticipation: 0,
        averageScore: 0,
        improvementRate: 0,
        riskExams: 0,
      };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 简单的状态判断逻辑（真实场景需要更复杂的状态管理）
    const upcoming = exams.filter((exam) => exam.date > today).length;
    const ongoing = 0; // 需要基于具体的考试时间判断
    const completed = exams.filter((exam) => exam.date < today).length;

    return {
      total: exams.length,
      upcoming,
      ongoing,
      completed,
      cancelled: 0,
      averageParticipation: 95.0, // 模拟数据，需要从实际成绩数据计算
      averageScore: 78.5, // 模拟数据，需要从实际成绩数据计算
      improvementRate: 12.5, // 模拟数据，需要历史对比计算
      riskExams: Math.floor(exams.length * 0.1), // 模拟数据，需要基于成绩分析
    };
  } catch (error) {
    console.error("获取考试概览统计失败:", error);
    toast.error("获取考试概览统计失败");
    return null;
  }
};
