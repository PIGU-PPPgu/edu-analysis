/**
 * 🎯 现代化成绩分析上下文
 * 统一数据管理，确保导入到分析的数据完全一致
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const isDev = import.meta.env?.DEV ?? false;

// 数据转换函数：Wide table → Long table format
function convertWideToLongFormat(wideData: any[]): any[] {
  const longData: any[] = [];

  // 🔍 专门检查总分数据情况
  let totalScoreCount = 0;
  let missingTotalScore = 0;
  let calculatedTotalCount = 0;

  wideData.forEach((student, index) => {
    // 📊 计算动态总分（如果总分缺失）
    let effectiveTotalScore = student.total_score;
    let isCalculated = false;

    if (student.total_score === null || student.total_score === undefined) {
      // 动态计算总分：各科成绩之和
      const subjectScores = [
        student.chinese_score,
        student.math_score,
        student.english_score,
        student.physics_score,
        student.chemistry_score,
        student.politics_score,
        student.history_score,
      ].filter(
        (score) => score !== null && score !== undefined && !isNaN(score)
      );

      if (subjectScores.length > 0) {
        effectiveTotalScore = subjectScores.reduce(
          (sum, score) => sum + parseFloat(score),
          0
        );
        isCalculated = true;
        calculatedTotalCount++;
      }
      missingTotalScore++;
    } else {
      totalScoreCount++;
    }

    const baseRecord = {
      exam_id: student.exam_id,
      student_id: student.student_id,
      name: student.name,
      class_name: student.class_name,
      exam_title: student.exam_title,
      exam_type: student.exam_type,
      exam_date: student.exam_date,
      created_at: student.created_at,
      updated_at: student.updated_at,
    };

    // 为每个有分数的科目创建一条记录
    const subjects = [
      {
        name: "语文",
        scoreField: "chinese_score",
        gradeField: "chinese_grade",
        maxScoreField: "chinese_max_score",
      },
      {
        name: "数学",
        scoreField: "math_score",
        gradeField: "math_grade",
        maxScoreField: "math_max_score",
      },
      {
        name: "英语",
        scoreField: "english_score",
        gradeField: "english_grade",
        maxScoreField: "english_max_score",
      },
      {
        name: "物理",
        scoreField: "physics_score",
        gradeField: "physics_grade",
        maxScoreField: "physics_max_score",
      },
      {
        name: "化学",
        scoreField: "chemistry_score",
        gradeField: "chemistry_grade",
        maxScoreField: "chemistry_max_score",
      },
      {
        name: "道法",
        scoreField: "politics_score",
        gradeField: "politics_grade",
        maxScoreField: "politics_max_score",
      },
      {
        name: "历史",
        scoreField: "history_score",
        gradeField: "history_grade",
        maxScoreField: "history_max_score",
      },
      {
        name: "生物",
        scoreField: "biology_score",
        gradeField: "biology_grade",
        maxScoreField: "biology_max_score",
      },
      {
        name: "地理",
        scoreField: "geography_score",
        gradeField: "geography_grade",
        maxScoreField: "geography_max_score",
      },
    ];

    // 处理普通科目
    subjects.forEach((subject) => {
      const score = student[subject.scoreField];
      if (score !== null && score !== undefined) {
        const recordToAdd = {
          ...baseRecord,
          id: `${student.student_id}-${student.exam_id}-${subject.name}`,
          subject: subject.name,
          score: parseFloat(score),
          grade: student[subject.gradeField] || null,
          max_score: student[subject.maxScoreField] || 100, // 🆕 保留满分信息
          total_score: effectiveTotalScore
            ? parseFloat(effectiveTotalScore)
            : null,
        };

        // 🔍 调试：第一条记录的详细信息
        longData.push(recordToAdd);
      }
    });

    // 🎯 处理总分记录（确保所有学生都有总分记录）
    if (effectiveTotalScore !== null && effectiveTotalScore !== undefined) {
      // 生成或使用总分等级
      let totalGrade = student.total_grade;

      // 如果是计算出的总分且没有等级，可以根据分数估算等级
      if (isCalculated && !totalGrade && effectiveTotalScore) {
        // 🔧 使用动态满分计算等级（从 total_max_score 读取，默认 100）
        const maxScore = student.total_max_score || 100;
        const scorePercent = effectiveTotalScore / maxScore;
        if (scorePercent >= 0.85) totalGrade = "A+";
        else if (scorePercent >= 0.8) totalGrade = "A";
        else if (scorePercent >= 0.75) totalGrade = "B+";
        else if (scorePercent >= 0.7) totalGrade = "B";
        else if (scorePercent >= 0.65) totalGrade = "C+";
        else if (scorePercent >= 0.6) totalGrade = "C";
        else totalGrade = "D";
      }

      const totalRecord = {
        ...baseRecord,
        id: `${student.student_id}-${student.exam_id}-总分`,
        subject: "总分",
        score: parseFloat(effectiveTotalScore),
        grade: totalGrade,
        max_score: student.total_max_score || 100, // 🆕 保留总分满分信息
        total_score: parseFloat(effectiveTotalScore),
        isCalculated: isCalculated, // 标记是否为计算得出
      };

      longData.push(totalRecord);
    }
  });

  return longData;
}
import type { GradeFilterConfig } from "@/components/analysis/filters/ModernGradeFilters";

// 成绩记录接口
export interface GradeRecord {
  id: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  max_score?: number; // 🆕 该科目或总分的满分
  grade?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  rank_in_school?: number;
  grade_level?: string;
  exam_date?: string;
  exam_type?: string;
  exam_title?: string;
  exam_scope?: string;
  percentile?: number;
  z_score?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

// 考试信息接口
export interface ExamInfo {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
  created_at: string;
  updated_at: string;
}

// 从成绩数据派生考试信息的辅助方法，防止 exams 表读取失败时筛选器为空
export const buildDerivedExams = (grades: any[]): ExamInfo[] => {
  const map = new Map<string, ExamInfo>();

  grades.forEach((g) => {
    const id =
      g.exam_id ||
      (g.exam_title ? `${g.exam_title}-${g.exam_date || "unknown"}` : null);
    const title = g.exam_title || "未命名考试";
    if (!id) return;

    if (!map.has(id)) {
      map.set(id, {
        id,
        title,
        type: g.exam_type || "",
        date: g.exam_date || "",
        subject: g.subject || "",
        created_at: g.created_at || new Date().toISOString(),
        updated_at: g.updated_at || new Date().toISOString(),
      });
    }
  });

  return Array.from(map.values());
};

// 合并正式 exams 表与派生考试列表，避免重复
export const mergeExamLists = (
  remote: ExamInfo[],
  derived: ExamInfo[]
): ExamInfo[] => {
  const map = new Map<string, ExamInfo>();
  remote.forEach((exam) => map.set(exam.id, exam));
  derived.forEach((exam) => {
    if (!map.has(exam.id)) {
      map.set(exam.id, exam);
    }
  });
  return Array.from(map.values());
};

// 🔧 修正后的统计信息接口 - 分离总分与单科统计
export interface GradeStatistics {
  totalStudents: number;
  totalRecords: number;

  // 🎯 总分统计（仅使用total_score数据）
  totalScoreStats: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    excellentRate: number;
    studentCount: number;
    hasData: boolean;
  };

  // 🎯 单科统计（仅使用各科目score数据）
  subjectScoreStats: {
    avgScore: number; // 所有科目的平均分
    maxScore: number;
    minScore: number;
    passRate: number;
    excellentRate: number;
    hasData: boolean;
  };

  // 🆕 实用教学指标
  scoreComparison: number; // 与上次对比变化
  passRateComparison: number; // 及格率变化
  comparisonAvailable: boolean; // 是否有足够的考试用于对比
  atRiskStudents: number; // 学困生数量
  topSubject: string; // 表现最好的科目
  topSubjectScore: number; // 最好科目的平均分

  // 🔧 修正后的科目统计 - 每个科目独立计算
  subjectStats: Array<{
    subject: string;
    count: number;
    avgScore: number;
    passRate: number;
    excellentRate: number;
    isTotal: boolean; // 标记是否为总分统计
  }>;

  // 🔧 修正后的班级统计 - 分离总分与单科
  classStats: Array<{
    className: string;
    studentCount: number;
    totalScoreAvg: number; // 班级总分平均
    subjectScoreAvg: number; // 班级单科平均
    totalPassRate: number; // 总分及格率
    subjectPassRate: number; // 单科及格率
  }>;

  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
}

// 上下文接口
interface ModernGradeAnalysisContextType {
  // 数据状态
  allGradeData: GradeRecord[];
  wideGradeData: any[]; // Wide format data for enhanced components
  filteredGradeData: GradeRecord[];
  examList: ExamInfo[];
  statistics: GradeStatistics | null;

  // 筛选状态
  filter: GradeFilterConfig;
  setFilter: (filter: GradeFilterConfig) => void;

  // 加载状态
  loading: boolean;
  error: string | null;

  // 可用选项
  availableSubjects: string[];
  availableClasses: string[];
  availableGrades: string[];
  availableExamTypes: string[];

  // 操作方法
  loadAllData: () => Promise<void>;
  loadExamData: (examId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  clearFilter: () => void;

  // 数据查询方法
  getStudentGrades: (studentId: string) => GradeRecord[];
  getSubjectGrades: (subject: string) => GradeRecord[];
  getClassGrades: (className: string) => GradeRecord[];
}

const ModernGradeAnalysisContext = createContext<
  ModernGradeAnalysisContextType | undefined
>(undefined);

export const useModernGradeAnalysis = () => {
  const context = useContext(ModernGradeAnalysisContext);
  if (!context) {
    throw new Error(
      "useModernGradeAnalysis must be used within ModernGradeAnalysisProvider"
    );
  }
  return context;
};

interface ModernGradeAnalysisProviderProps {
  children: React.ReactNode;
  initialFilter?: GradeFilterConfig;
}

export const ModernGradeAnalysisProvider: React.FC<
  ModernGradeAnalysisProviderProps
> = ({ children, initialFilter }) => {
  // 状态管理
  const [allGradeData, setAllGradeData] = useState<GradeRecord[]>([]);
  const [wideGradeData, setWideGradeData] = useState<any[]>([]);
  const [examList, setExamList] = useState<ExamInfo[]>([]);
  const [filter, setFilter] = useState<GradeFilterConfig>(() => {
    const result = initialFilter || {};
    if (isDev) {
      Object.keys(result).forEach((key) => {});
    }
    return result;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 从 grade_data 表读取数据（默认限制1000条，防止性能问题）
  const loadAllData = useCallback(async (limit: number = 1000) => {
    setLoading(true);
    setError(null);

    try {
      // 并行加载考试信息和成绩数据
      const [examResponse, gradeResponse] = await Promise.all([
        supabase
          .from("exams")
          .select("*")
          .order("date", { ascending: false })
          .limit(100), // 限制考试数量

        supabase
          .from("grade_data")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit), // 🎯 添加数据量限制，防止全表扫描
      ]);

      if (examResponse.error) {
        throw new Error(`加载考试信息失败: ${examResponse.error.message}`);
      }

      if (gradeResponse.error) {
        throw new Error(`加载成绩数据失败: ${gradeResponse.error.message}`);
      }

      const exams = examResponse.data || [];
      const grades = gradeResponse.data || [];
      const derivedExams = buildDerivedExams(grades);
      const mergedExams = mergeExamLists(exams, derivedExams);

      if (isDev) {
        // 🔍 调试：查看原始数据样本
      }

      setExamList(mergedExams);

      // 存储原始wide格式数据供增强组件使用
      setWideGradeData(grades);

      // 转换wide table为long table格式，保持向后兼容
      const longFormatGrades = convertWideToLongFormat(grades);
      if (isDev) {
        // 🔍 调试：查看转换后数据样本
        if (longFormatGrades.length > 0) {
          const subjects = [...new Set(longFormatGrades.map((r) => r.subject))];
        }
      }

      setAllGradeData(longFormatGrades);

      // Wide table科目统计 - 基于实际有分数的科目
      const subjectCounts: Record<string, number> = {};

      grades.forEach((student) => {
        // 检查每个科目是否有分数
        if (student.chinese_score)
          subjectCounts["语文"] = (subjectCounts["语文"] || 0) + 1;
        if (student.math_score)
          subjectCounts["数学"] = (subjectCounts["数学"] || 0) + 1;
        if (student.english_score)
          subjectCounts["英语"] = (subjectCounts["英语"] || 0) + 1;
        if (student.physics_score)
          subjectCounts["物理"] = (subjectCounts["物理"] || 0) + 1;
        if (student.chemistry_score)
          subjectCounts["化学"] = (subjectCounts["化学"] || 0) + 1;
        if (student.politics_score)
          subjectCounts["道法"] = (subjectCounts["道法"] || 0) + 1;
        if (student.history_score)
          subjectCounts["历史"] = (subjectCounts["历史"] || 0) + 1;
        if (student.biology_score)
          subjectCounts["生物"] = (subjectCounts["生物"] || 0) + 1;
        if (student.geography_score)
          subjectCounts["地理"] = (subjectCounts["地理"] || 0) + 1;
        if (student.total_score)
          subjectCounts["总分"] = (subjectCounts["总分"] || 0) + 1;
      });

      // 检查是否有等级数据 - Wide table中检查各科目等级
      let gradesWithLevels = 0;
      grades.forEach((student) => {
        if (
          student.chinese_grade ||
          student.math_grade ||
          student.english_grade ||
          student.physics_grade ||
          student.chemistry_grade ||
          student.politics_grade ||
          student.history_grade ||
          student.total_grade
        ) {
          gradesWithLevels++;
        }
      });
    } catch (err) {
      console.error("❌ 加载数据失败:", err);
      const errorMessage = err instanceof Error ? err.message : "加载数据失败";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载特定考试的数据
  const loadExamData = useCallback(async (examId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("grade_data")
        .select("*")
        .eq("exam_id", examId)
        .order("student_id");

      if (error) {
        throw new Error(`加载考试数据失败: ${error.message}`);
      }

      const grades = data || [];

      // 存储原始wide格式数据供增强组件使用
      setWideGradeData(grades);

      // 转换为long格式保持兼容性
      const longFormatGrades = convertWideToLongFormat(grades);
      setAllGradeData(longFormatGrades);

      // 如果 exams 表缺少该考试，将派生信息补充进 examList
      const derivedExams = buildDerivedExams(grades);
      if (derivedExams.length > 0) {
        setExamList((prev) => mergeExamLists(prev, derivedExams));
      }
    } catch (err) {
      console.error("❌ 加载考试数据失败:", err);
      const errorMessage =
        err instanceof Error ? err.message : "加载考试数据失败";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新数据
  const refreshData = useCallback(async () => {
    // 🆕 刷新前清理旧数据，释放内存
    setAllGradeData([]);
    setWideGradeData([]);
    setExamList([]);

    await loadAllData();
  }, [loadAllData]);

  // 清除筛选
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  // 🚀 应用筛选逻辑（性能优化版）
  const filteredGradeData = useMemo(() => {
    // 🆕 大数据量时的性能提醒
    if (allGradeData.length > 10000 && isDev) {
      console.warn(
        `⚠️ 大数据量警告: ${allGradeData.length} 条记录，建议使用筛选条件`
      );
    }
    let filtered = [...allGradeData];

    // 考试筛选 - 支持按ID或标题筛选
    if (filter.examIds?.length || filter.examTitles?.length) {
      const beforeFilter = filtered.length;

      // 收集所有需要匹配的考试标题
      let examTitles: string[] = [];

      // 从examIds获取对应的考试标题
      if (filter.examIds?.length) {
        const titlesFromIds = examList
          .filter((exam) => filter.examIds!.includes(exam.id))
          .map((exam) => exam.title);
        examTitles.push(...titlesFromIds);
      }

      // 直接指定的考试标题
      if (filter.examTitles?.length) {
        examTitles.push(...filter.examTitles);
      }

      // 去重
      examTitles = [...new Set(examTitles)];

      filtered = filtered.filter((record) => {
        // 按exam_id匹配
        const matchById =
          filter.examIds?.length && filter.examIds.includes(record.exam_id);

        // 按考试标题匹配
        const matchByTitle =
          examTitles.length > 0 &&
          record.exam_title &&
          examTitles.includes(record.exam_title);

        const match = matchById || matchByTitle;

        return match;
      });
    }

    // 科目筛选
    if (filter.subjects?.length) {
      filtered = filtered.filter(
        (record) => record.subject && filter.subjects!.includes(record.subject)
      );
    }

    // 班级筛选
    if (filter.classNames?.length) {
      filtered = filtered.filter(
        (record) =>
          record.class_name && filter.classNames!.includes(record.class_name)
      );
    }

    // 等级筛选
    if (filter.grades?.length) {
      filtered = filtered.filter(
        (record) => record.grade && filter.grades!.includes(record.grade)
      );
    }

    // 分数范围筛选
    if (
      filter.scoreRange?.min !== undefined ||
      filter.scoreRange?.max !== undefined
    ) {
      filtered = filtered.filter((record) => {
        const score = record.score;
        if (score === null || score === undefined) return false;

        if (
          filter.scoreRange!.min !== undefined &&
          score < filter.scoreRange!.min
        )
          return false;
        if (
          filter.scoreRange!.max !== undefined &&
          score > filter.scoreRange!.max
        )
          return false;

        return true;
      });
    }

    // 排名范围筛选
    if (
      filter.rankRange?.min !== undefined ||
      filter.rankRange?.max !== undefined
    ) {
      filtered = filtered.filter((record) => {
        const rank = record.rank_in_class || record.rank_in_grade;
        if (rank === null || rank === undefined) return false;

        if (filter.rankRange!.min !== undefined && rank < filter.rankRange!.min)
          return false;
        if (filter.rankRange!.max !== undefined && rank > filter.rankRange!.max)
          return false;

        return true;
      });
    }

    // 搜索关键词筛选
    if (filter.searchKeyword) {
      const keyword = filter.searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.name?.toLowerCase().includes(keyword) ||
          record.student_id?.toLowerCase().includes(keyword) ||
          record.class_name?.toLowerCase().includes(keyword) ||
          record.subject?.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [allGradeData, filter]);

  // 当前选中的考试ID（单选）
  const currentExamId = filter.examIds?.[0];

  // 计算可用选项 - 当选了考试时从该考试数据中提取，否则从全量数据提取
  const examScopedData = useMemo(() => {
    if (!currentExamId) return allGradeData;
    return allGradeData.filter(
      (r) =>
        r.exam_id === currentExamId ||
        r.exam_title === examList.find((e) => e.id === currentExamId)?.title
    );
  }, [allGradeData, currentExamId, examList]);

  const availableSubjects = useMemo(() => {
    const subjects = new Set(
      examScopedData.map((record) => record.subject).filter(Boolean)
    );
    return Array.from(subjects).sort();
  }, [examScopedData]);

  const availableClasses = useMemo(() => {
    const classes = new Set(
      examScopedData.map((record) => record.class_name).filter(Boolean)
    );
    return Array.from(classes).sort();
  }, [examScopedData]);

  const availableGrades = useMemo(() => {
    const grades = new Set(
      examScopedData.map((record) => record.grade).filter(Boolean)
    );
    return Array.from(grades).sort();
  }, [examScopedData]);

  const availableExamTypes = useMemo(() => {
    const types = new Set(examList.map((exam) => exam.type).filter(Boolean));
    return Array.from(types).sort();
  }, [examList]);

  // 🔧 修正统计信息计算 - 彻底分离总分与单科统计逻辑
  const statistics = useMemo((): GradeStatistics | null => {
    if (filteredGradeData.length === 0) {
      return null;
    }

    const totalRecords = filteredGradeData.length;
    const uniqueStudents = new Set(
      filteredGradeData.map((record) => record.student_id)
    );
    const totalStudents = uniqueStudents.size;

    // 🎯 计算总分统计 - 仅使用总分数据
    const calculateTotalScoreStats = () => {
      const totalScoreRecords = filteredGradeData.filter(
        (record) =>
          record.subject === "总分" && record.score && record.score > 0
      );

      if (isDev) {
        // 调试：查看所有科目分布
        const allSubjects = [
          ...new Set(filteredGradeData.map((r) => r.subject)),
        ];
      }

      if (totalScoreRecords.length === 0) {
        return {
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          passRate: 0,
          excellentRate: 0,
          studentCount: 0,
          hasData: false,
        };
      }

      const totalScores = totalScoreRecords.map((record) => record.score!);
      const avgScore =
        totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
      const maxScore = Math.max(...totalScores);
      const minScore = Math.min(...totalScores);

      // 🔧 使用动态及格线：每条记录根据其满分计算（60% = 及格，90% = 优秀）
      const passingScores = totalScoreRecords.filter((record) => {
        const recordMaxScore = record.max_score || 100;
        return record.score! >= recordMaxScore * 0.6;
      });
      const excellentScores = totalScoreRecords.filter((record) => {
        const recordMaxScore = record.max_score || 100;
        return record.score! >= recordMaxScore * 0.9;
      });

      const passRate = (passingScores.length / totalScores.length) * 100;
      const excellentRate = (excellentScores.length / totalScores.length) * 100;

      return {
        avgScore,
        maxScore,
        minScore,
        passRate,
        excellentRate,
        studentCount: totalScores.length,
        hasData: true,
      };
    };

    // 🎯 计算单科统计 - 仅使用单科分数数据
    const calculateSubjectScoreStats = () => {
      const subjectRecords = filteredGradeData.filter(
        (record) =>
          record.subject !== "总分" && record.score && record.score > 0
      );

      if (subjectRecords.length === 0) {
        return {
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          passRate: 0,
          excellentRate: 0,
          hasData: false,
        };
      }

      const subjectScores = subjectRecords.map((record) => record.score!);
      const avgScore =
        subjectScores.reduce((sum, score) => sum + score, 0) /
        subjectScores.length;
      const maxScore = Math.max(...subjectScores);
      const minScore = Math.min(...subjectScores);

      // 🔧 使用动态及格线：每条记录根据其满分计算（60% = 及格，90% = 优秀）
      const passingScores = subjectRecords.filter((record) => {
        const recordMaxScore = record.max_score || 100;
        return record.score! >= recordMaxScore * 0.6;
      });
      const excellentScores = subjectRecords.filter((record) => {
        const recordMaxScore = record.max_score || 100;
        return record.score! >= recordMaxScore * 0.9;
      });

      const passRate = (passingScores.length / subjectScores.length) * 100;
      const excellentRate =
        (excellentScores.length / subjectScores.length) * 100;

      return {
        avgScore,
        maxScore,
        minScore,
        passRate,
        excellentRate,
        hasData: true,
      };
    };

    const totalScoreStats = calculateTotalScoreStats();
    const subjectScoreStats = calculateSubjectScoreStats();

    // 🔧 修正科目统计 - 分离总分与单科，避免混合计算
    const subjectStats = availableSubjects.map((subject) => {
      const isTotal = subject === "总分";
      const subjectRecords = filteredGradeData.filter(
        (record) => record.subject === subject
      );

      let subjectScores: number[] = [];

      // 所有科目（包括总分）都使用score字段
      subjectScores = subjectRecords
        .map((record) => record.score)
        .filter(
          (score) => score !== null && score !== undefined && score > 0
        ) as number[];

      const subjectAvg =
        subjectScores.length > 0
          ? subjectScores.reduce((sum, score) => sum + score, 0) /
            subjectScores.length
          : 0;

      // 🔧 使用动态及格线：每条记录根据其满分计算（60% = 及格，90% = 优秀）
      const subjectPassRate =
        subjectRecords.length > 0
          ? (subjectRecords.filter((record) => {
              const recordMaxScore = record.max_score || 100;
              return record.score! >= recordMaxScore * 0.6;
            }).length /
              subjectRecords.length) *
            100
          : 0;

      const excellentRate =
        subjectRecords.length > 0
          ? (subjectRecords.filter((record) => {
              const recordMaxScore = record.max_score || 100;
              return record.score! >= recordMaxScore * 0.9;
            }).length /
              subjectRecords.length) *
            100
          : 0;

      return {
        subject,
        count: subjectRecords.length,
        avgScore: subjectAvg,
        passRate: subjectPassRate,
        excellentRate,
        isTotal,
      };
    });

    // 🔧 修正班级统计 - 分离总分与单科统计
    const classStats = availableClasses.map((className) => {
      const classRecords = filteredGradeData.filter(
        (record) => record.class_name === className
      );
      const classStudents = new Set(
        classRecords.map((record) => record.student_id)
      );

      // 总分数据
      const totalScoreRecords = classRecords.filter(
        (record) =>
          record.subject === "总分" && record.score && record.score > 0
      );
      const totalScores = totalScoreRecords.map((record) => record.score!);

      // 单科数据
      const subjectRecords = classRecords.filter(
        (record) =>
          record.subject !== "总分" && record.score && record.score > 0
      );
      const subjectScores = subjectRecords.map((record) => record.score!);

      const totalScoreAvg =
        totalScores.length > 0
          ? totalScores.reduce((sum, score) => sum + score, 0) /
            totalScores.length
          : 0;
      const subjectScoreAvg =
        subjectScores.length > 0
          ? subjectScores.reduce((sum, score) => sum + score, 0) /
            subjectScores.length
          : 0;

      // 🔧 使用动态及格线：每条记录根据其满分计算（60% = 及格）
      const totalPassRate =
        totalScoreRecords.length > 0
          ? (totalScoreRecords.filter((record) => {
              const recordMaxScore = record.max_score || 100;
              return record.score! >= recordMaxScore * 0.6;
            }).length /
              totalScoreRecords.length) *
            100
          : 0;

      const subjectPassRate =
        subjectRecords.length > 0
          ? (subjectRecords.filter((record) => {
              const recordMaxScore = record.max_score || 100;
              return record.score! >= recordMaxScore * 0.6;
            }).length /
              subjectRecords.length) *
            100
          : 0;

      return {
        className,
        studentCount: classStudents.size,
        totalScoreAvg,
        subjectScoreAvg,
        totalPassRate,
        subjectPassRate,
      };
    });

    // 等级分布
    const gradeDistribution = availableGrades.map((grade) => {
      const gradeRecords = filteredGradeData.filter(
        (record) => record.grade === grade
      );
      return {
        grade,
        count: gradeRecords.length,
        percentage: (gradeRecords.length / totalRecords) * 100,
      };
    });

    // 🆕 计算实用教学指标 - 基于分离后的统计数据
    // 计算最近考试对比（基于总分记录）
    const examAggregates: Array<{
      examId: string;
      examTitle: string;
      examDate: string | null;
      avgScore: number;
      passRate: number;
    }> = [];

    const totalScoreByExam = new Map<
      string,
      {
        scores: number[];
        passCount: number;
        examTitle: string;
        examDate: string | null;
      }
    >();

    filteredGradeData
      .filter(
        (record) =>
          record.subject === "总分" && record.score && record.score > 0
      )
      .forEach((record) => {
        const examId = record.exam_id || "unknown";
        if (!totalScoreByExam.has(examId)) {
          totalScoreByExam.set(examId, {
            scores: [],
            passCount: 0,
            examTitle: record.exam_title || "未命名考试",
            examDate: record.exam_date || null,
          });
        }
        const agg = totalScoreByExam.get(examId)!;
        agg.scores.push(record.score!);

        const recordMaxScore = record.max_score || 100;
        if (record.score! >= recordMaxScore * 0.6) {
          agg.passCount += 1;
        }
      });

    totalScoreByExam.forEach((value, examId) => {
      if (value.scores.length === 0) return;
      const avg =
        value.scores.reduce((sum, score) => sum + score, 0) /
        value.scores.length;
      const passRate = (value.passCount / value.scores.length) * 100;
      examAggregates.push({
        examId,
        examTitle: value.examTitle,
        examDate: value.examDate,
        avgScore: avg,
        passRate,
      });
    });

    const sortedExamAggregates = examAggregates.sort((a, b) => {
      const aDate = a.examDate ? new Date(a.examDate).getTime() : 0;
      const bDate = b.examDate ? new Date(b.examDate).getTime() : 0;
      return bDate - aDate;
    });

    let scoreComparison = 0;
    let passRateComparison = 0;
    let comparisonAvailable = false;

    if (sortedExamAggregates.length >= 2) {
      comparisonAvailable = true;
      const latest = sortedExamAggregates[0];
      const previous = sortedExamAggregates[1];
      scoreComparison = latest.avgScore - previous.avgScore;
      passRateComparison = latest.passRate - previous.passRate;
    }

    // 学困生预警（基于总分和单科分数）
    const totalScoreAtRisk = filteredGradeData.filter(
      (record) =>
        record.subject === "总分" &&
        record.total_score &&
        record.total_score < 60
    ).length;
    const subjectScoreAtRisk = filteredGradeData.filter(
      (record) => record.subject !== "总分" && record.score && record.score < 60
    ).length;
    const atRiskStudents = Math.max(totalScoreAtRisk, subjectScoreAtRisk);

    // 找出表现最好的科目（排除总分）
    const subjectOnlyStats = subjectStats.filter((stat) => !stat.isTotal);
    const topSubjectData =
      subjectOnlyStats.length > 0
        ? subjectOnlyStats.reduce((best, current) =>
            current.avgScore > best.avgScore ? current : best
          )
        : { subject: "暂无", avgScore: 0 };

    return {
      totalStudents,
      totalRecords,

      // 🔧 新的分离式统计结构
      totalScoreStats,
      subjectScoreStats,

      // 🆕 实用教学指标
      scoreComparison,
      passRateComparison,
      comparisonAvailable,
      atRiskStudents,
      topSubject: topSubjectData.subject,
      topSubjectScore: topSubjectData.avgScore,

      subjectStats,
      classStats,
      gradeDistribution,
    };
  }, [filteredGradeData, availableSubjects, availableClasses, availableGrades]);

  // 数据查询方法
  const getStudentGrades = useCallback(
    (studentId: string) => {
      return filteredGradeData.filter(
        (record) => record.student_id === studentId
      );
    },
    [filteredGradeData]
  );

  const getSubjectGrades = useCallback(
    (subject: string) => {
      return filteredGradeData.filter((record) => record.subject === subject);
    },
    [filteredGradeData]
  );

  const getClassGrades = useCallback(
    (className: string) => {
      return filteredGradeData.filter(
        (record) => record.class_name === className
      );
    },
    [filteredGradeData]
  );

  // 根据考试筛选器决定加载策略：选了具体考试则精确加载，否则加载全量
  const loadedExamKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const examKey = currentExamId ?? "__all__";
    if (examKey === loadedExamKeyRef.current) return;
    loadedExamKeyRef.current = examKey;

    if (currentExamId) {
      loadExamData(currentExamId);
    } else {
      loadAllData();
    }
  }, [currentExamId, loadExamData, loadAllData]);

  // 调试：监控数据和筛选器的变化
  useEffect(() => {
    if (isDev) {
      if (allGradeData.length > 0 && examList.length > 0) {
        // 显示前几条数据作为样本
        if (allGradeData.length > 0) {
          allGradeData.slice(0, 3).forEach((record, index) => {});
        }

        if (examList.length > 0) {
          examList.slice(0, 3).forEach((exam, index) => {});
        }
      }
    }
  }, [allGradeData, examList, filter]);

  return (
    <ModernGradeAnalysisContext.Provider
      value={{
        allGradeData,
        wideGradeData,
        filteredGradeData,
        examList,
        statistics,
        filter,
        setFilter,
        loading,
        error,
        availableSubjects,
        availableClasses,
        availableGrades,
        availableExamTypes,
        loadAllData,
        loadExamData,
        refreshData,
        clearFilter,
        getStudentGrades,
        getSubjectGrades,
        getClassGrades,
      }}
    >
      {children}
    </ModernGradeAnalysisContext.Provider>
  );
};
