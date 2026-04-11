import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { warningAnalysisCache } from "../utils/performanceCache";
import { retryableSelect, retryableWrite } from "@/utils/apiRetry";

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
  academic_term_id?: string;
}

// 考试科目总分配置接口
export interface ExamSubjectScore {
  id?: string;
  exam_id: string;
  subject_code: string;
  subject_name: string;
  total_score: number;
  passing_score: number;
  excellent_score: number;
  is_required: boolean;
  weight: number;
  created_at?: string;
  updated_at?: string;
}

// 学期管理接口
export interface AcademicTerm {
  id: string;
  academic_year: string;
  semester: string;
  semester_code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
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
  const deriveExamsFromGrades = async (): Promise<Exam[]> => {
    try {
      const { data, error } = await supabase
        .from("grade_data")
        .select(
          "exam_id, exam_title, exam_type, exam_date, created_at, updated_at"
        )
        .limit(500);

      if (error) {
        console.warn("[ExamService] 派生考试列表失败:", error);
        return [];
      }

      const map = new Map<string, Exam>();
      (data || []).forEach((g) => {
        const id =
          g.exam_id ||
          (g.exam_title
            ? `${g.exam_title}-${g.exam_date || "unknown"}`
            : undefined);
        if (!id) return;
        if (!map.has(id)) {
          map.set(id, {
            id,
            title: g.exam_title || "未命名考试",
            type: g.exam_type || "",
            date: g.exam_date || "",
            subject: "", // grade_data 无 subject 列，留空
            created_at: g.created_at || new Date().toISOString(),
            updated_at: g.updated_at || new Date().toISOString(),
          } as Exam);
        }
      });

      return Array.from(map.values());
    } catch (err) {
      console.warn("[ExamService] 派生考试列表异常:", err);
      return [];
    }
  };

  try {
    let query = supabase
      .from("exams")
      .select(
        `
      id,
      title,
      date,
      type,
      subject,
      created_at,
      updated_at
    `
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

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

    if (!data || data.length === 0) {
      const derived = await deriveExamsFromGrades();
      if (derived.length > 0) {
        toast.info("已从成绩数据推断考试列表（exams 表为空）");
        return derived;
      }
    }

    const sorted = (data || []).sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      if (bDate !== aDate) return bDate - aDate;
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });

    return sorted;
  } catch (err) {
    console.error("[ExamService] 获取考试列表失败，尝试派生:", err);
    const derived = await deriveExamsFromGrades();
    if (derived.length > 0) {
      toast.info("已从成绩数据推断考试列表（exams 查询失败）");
      return derived;
    }
    toast.error("获取考试列表失败");
    return [];
  }
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
      .from("grade_data")
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

    // 使用新的数据库驱动计算服务
    try {
      const { examScoreCalculationService } = await import(
        "./examScoreCalculationService"
      );

      const stats = await examScoreCalculationService.calculateExamStatistics(
        examId,
        grades || []
      );

      const scores =
        grades
          ?.map((g) => g.total_score)
          .filter((s) => s !== null && s !== undefined) || [];

      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;

      // 计算分数段分布
      const scoreDistribution = calculateScoreDistribution(grades || []);

      return {
        examId,
        examTitle: exam?.title || examId,
        examDate: exam?.date || new Date().toISOString().split("T")[0],
        participantCount: stats.totalParticipants,
        averageScore: stats.averageScore,
        maxScore,
        minScore,
        passRate: stats.passRate,
        excellentRate: stats.excellentRate,
        scoreDistribution,
        totalScore: 100, // 可以从科目配置中计算最大总分
      };
    } catch (error) {
      console.warn(`[ExamService] 数据库计算服务失败，使用回退逻辑:`, error);

      // 回退到原有逻辑
      const scores =
        grades
          ?.map((g) => g.total_score)
          .filter((s) => s !== null && s !== undefined) || [];
      const participantCount = grades?.length || 0;

      const averageScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      // 使用默认阈值作为回退
      let defaultTotalScore = 100;
      let passThreshold = 60;
      let excellentThreshold = 90;

      try {
        // 尝试从 exam_subject_scores 表获取配置
        const { data: subjectScores } = await supabase
          .from("exam_subject_scores")
          .select("total_score, passing_score, excellent_score")
          .eq("exam_id", examId);

        if (subjectScores && subjectScores.length > 0) {
          const configuredTotalScores = subjectScores.map((s) => s.total_score);
          defaultTotalScore = Math.max(...configuredTotalScores);

          const passingScores = subjectScores
            .map((s) => s.passing_score)
            .filter((s) => s != null);
          const excellentScores = subjectScores
            .map((s) => s.excellent_score)
            .filter((s) => s != null);

          if (passingScores.length > 0) {
            passThreshold =
              passingScores.reduce((a, b) => a + b, 0) / passingScores.length;
          }
          if (excellentScores.length > 0) {
            excellentThreshold =
              excellentScores.reduce((a, b) => a + b, 0) /
              excellentScores.length;
          }
        } else {
          passThreshold = defaultTotalScore * 0.6;
          excellentThreshold = defaultTotalScore * 0.9;
        }
      } catch (innerError) {
        console.warn("获取科目配置失败，使用硬编码默认值:", innerError);
        passThreshold = 60;
        excellentThreshold = 90;
      }

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
    }
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
      .from("grade_data")
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
    const { data, error } = (await retryableWrite(
      async () =>
        await supabase
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
          .single(),
      "创建考试"
    )) as any;

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
    const { data, error } = (await retryableWrite(
      async () =>
        await supabase
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
          .single(),
      "更新考试"
    )) as any;

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
    const { error, data } = await supabase
      .from("exams")
      .delete()
      .eq("id", examId)
      .select(); // 添加select以获取删除的数据确认

    if (error) {
      console.error("🗑️ 删除失败，错误详情:", error);
      throw error;
    }

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

/**
 * 获取学期列表
 */
export const getAcademicTerms = async (): Promise<AcademicTerm[]> => {
  try {
    const { data, error } = await supabase
      .from("academic_terms")
      .select("*")
      .eq("is_current", true)
      .order("academic_year", { ascending: false })
      .order("semester");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("获取学期列表失败:", error);
    toast.error("获取学期列表失败");
    return [];
  }
};

/**
 * 获取当前学期
 */
export const getCurrentAcademicTerm =
  async (): Promise<AcademicTerm | null> => {
    try {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("is_current", true)
        .single();

      if (error && error.code !== "PGRST116" && error.code !== "PGRST106")
        throw error;
      return data;
    } catch (error) {
      console.error("获取当前学期失败:", error);
      return null;
    }
  };

/**
 * 获取考试的科目总分配置
 */
export const getExamSubjectScores = async (
  examId: string
): Promise<ExamSubjectScore[]> => {
  try {
    const { data, error } = await supabase
      .from("exam_subject_scores")
      .select("*")
      .eq("exam_id", examId)
      .order("subject_code");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("获取考试科目总分配置失败:", error);
    toast.error("获取考试科目总分配置失败");
    return [];
  }
};

/**
 * 保存考试的科目总分配置
 */
export const saveExamSubjectScores = async (
  examId: string,
  scores: Omit<ExamSubjectScore, "id" | "created_at" | "updated_at">[]
): Promise<boolean> => {
  try {
    // 先删除现有配置
    const { error: deleteError } = await supabase
      .from("exam_subject_scores")
      .delete()
      .eq("exam_id", examId);

    if (deleteError) throw deleteError;

    // 插入新配置
    const { error: insertError } = await supabase
      .from("exam_subject_scores")
      .insert(
        scores.map((score) => ({
          exam_id: examId,
          subject_code: score.subject_code,
          subject_name: score.subject_name,
          total_score: score.total_score,
          passing_score: score.passing_score,
          excellent_score: score.excellent_score,
          is_required: score.is_required,
          weight: score.weight,
        }))
      );

    if (insertError) throw insertError;

    toast.success("科目总分配置保存成功");
    return true;
  } catch (error) {
    console.error("保存考试科目总分配置失败:", error);
    toast.error("保存科目总分配置失败");
    return false;
  }
};

/**
 * 获取考试实际成绩数据中存在的科目
 * @param examId 考试ID
 * @returns 实际存在成绩数据的科目列表
 */
const getActualExamSubjects = async (
  examId: string
): Promise<{ code: string; name: string }[]> => {
  try {
    // 首先获取考试信息，因为可能需要使用exam_title而不是exam_id
    const { data: examInfo } = await supabase
      .from("exams")
      .select("id, title")
      .eq("id", examId)
      .single();

    let gradeData = null;

    // 尝试使用exam_id查询
    const { data: gradeDataById, error: gradeErrorById } = await supabase
      .from("grade_data")
      .select(
        `
        chinese_score, math_score, english_score, physics_score, 
        chemistry_score, politics_score, history_score, biology_score, geography_score
      `
      )
      .eq("exam_id", examId)
      .limit(1);

    if (!gradeErrorById && gradeDataById && gradeDataById.length > 0) {
      gradeData = gradeDataById;
    } else if (examInfo && examInfo.title) {
      // 如果exam_id查询失败，尝试使用exam_title查询
      const { data: gradeDataByTitle, error: gradeErrorByTitle } =
        await supabase
          .from("grade_data")
          .select(
            `
          chinese_score, math_score, english_score, physics_score, 
          chemistry_score, politics_score, history_score, biology_score, geography_score
        `
          )
          .eq("exam_title", examInfo.title)
          .limit(1);

      if (
        !gradeErrorByTitle &&
        gradeDataByTitle &&
        gradeDataByTitle.length > 0
      ) {
        gradeData = gradeDataByTitle;
      }
    }

    if (!gradeData?.length) {
      return [];
    }

    // 分析实际有数据的科目
    const record = gradeData[0];
    const subjectMapping = {
      chinese_score: { code: "chinese", name: "语文" },
      math_score: { code: "math", name: "数学" },
      english_score: { code: "english", name: "英语" },
      physics_score: { code: "physics", name: "物理" },
      chemistry_score: { code: "chemistry", name: "化学" },
      biology_score: { code: "biology", name: "生物" },
      politics_score: { code: "politics", name: "政治" },
      history_score: { code: "history", name: "历史" },
      geography_score: { code: "geography", name: "地理" },
    };

    const activeSubjects = Object.entries(subjectMapping)
      .filter(([scoreField]) => {
        const hasScore =
          record[scoreField] !== null && record[scoreField] !== undefined;
        return hasScore;
      })
      .map(([, subject]) => subject);

    return activeSubjects;
  } catch (error) {
    console.error("获取实际考试科目失败:", error);
    return [];
  }
};

/**
 * 动态获取考试实际涉及的科目
 */
export const getExamActiveSubjects = async (
  examId: string
): Promise<{
  configuredSubjects: { code: string; name: string; configured: boolean }[];
  hasData: boolean;
}> => {
  try {
    // 1. 首先获取实际成绩数据中的科目
    const actualSubjects = await getActualExamSubjects(examId);
    console.log(
      `[getExamActiveSubjects] 🎯 实际成绩数据中的科目:`,
      actualSubjects.map((s) => s.name).join(", ")
    );

    // 2. 然后尝试从配置表获取
    const { data: configuredData, error: configError } = await supabase
      .from("exam_subject_scores")
      .select("subject_code, subject_name")
      .eq("exam_id", examId)
      .order("subject_code");

    if (!configError && configuredData && configuredData.length > 0) {
      console.log(
        `[getExamActiveSubjects] 📋 配置表中的科目:`,
        configuredData.map((item) => item.subject_name).join(", ")
      );

      // 3. 交叉验证：只返回既有配置又有实际数据的科目
      const validatedSubjects = configuredData
        .filter((configItem) =>
          actualSubjects.some(
            (actualItem) => actualItem.code === configItem.subject_code
          )
        )
        .map((item) => ({
          code: item.subject_code,
          name: item.subject_name,
          configured: true,
        }));

      console.log(
        `[getExamActiveSubjects] ✅ 验证后的有效科目:`,
        validatedSubjects.map((s) => s.name).join(", ")
      );

      if (validatedSubjects.length > 0) {
        return {
          configuredSubjects: validatedSubjects,
          hasData: true,
        };
      }
    }

    // 4. 如果配置验证失败，直接使用实际数据中的科目
    if (actualSubjects.length > 0) {
      return {
        configuredSubjects: actualSubjects.map((subject) => ({
          ...subject,
          configured: false,
        })),
        hasData: true,
      };
    }

    // 5. 如果都没有数据，返回默认科目
    return {
      configuredSubjects: [
        { code: "chinese", name: "语文", configured: false },
        { code: "math", name: "数学", configured: false },
        { code: "english", name: "英语", configured: false },
      ],
      hasData: false,
    };
  } catch (error) {
    console.error("获取考试科目失败:", error);
    // 返回默认科目
    return {
      configuredSubjects: [
        { code: "chinese", name: "语文", configured: false },
        { code: "math", name: "数学", configured: false },
        { code: "english", name: "英语", configured: false },
      ],
      hasData: false,
    };
  }
};

/**
 * 获取考试参与人数
 */
export const getExamParticipantCount = async (
  examId: string
): Promise<number> => {
  try {
    // 首先尝试直接使用exam_id查询
    const {
      data: gradeData,
      error,
      count,
    } = await supabase
      .from("grade_data")
      .select("student_id", { count: "exact" })
      .eq("exam_id", examId);

    if (!error && count !== null && count > 0) {
      return count;
    }

    // 如果exam_id查询失败，尝试使用exam_title
    const { data: examInfo } = await supabase
      .from("exams")
      .select("title")
      .eq("id", examId)
      .single();

    if (examInfo && examInfo.title) {
      const {
        data: gradeDataByTitle,
        error: titleError,
        count: titleCount,
      } = await supabase
        .from("grade_data")
        .select("student_id", { count: "exact" })
        .eq("exam_title", examInfo.title);

      if (!titleError && titleCount !== null && titleCount > 0) {
        return titleCount;
      }
    }

    return 0;
  } catch (error) {
    console.error("获取考试参与人数失败:", error);
    return 0;
  }
};

/**
 * 根据学期筛选考试
 */
export const getExamsByTerm = async (
  termId?: string,
  filter?: ExamFilter
): Promise<Exam[]> => {
  try {
    let query = supabase
      .from("exams")
      .select(
        `
        id,
        title,
        date,
        type,
        subject,
        academic_term_id,
        created_at
      `
      )
      .order("date", { ascending: false });

    // 应用学期筛选
    if (termId && termId !== "all") {
      query = query.eq("academic_term_id", termId);
    }

    // 应用其他过滤器
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

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("根据学期筛选考试失败:", error);
    toast.error("筛选考试失败");
    return [];
  }
};
