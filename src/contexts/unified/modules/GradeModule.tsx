/**
 * 📊 成绩分析模块 - UnifiedAppContext
 * 基于ModernGradeAnalysisContext的简化和现代化版本
 * 保持向后兼容性的同时优化性能
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GradeModuleState,
  GradeModuleActions,
  GradeFilterConfig,
  AppError,
  LoadingState,
} from "../types";
import { GradeRecord, ExamInfo, GradeStatistics } from "@/types/grade";

// ==================== 状态和Action类型 ====================

interface GradeModuleContextType extends GradeModuleState, GradeModuleActions {}

type GradeAction =
  | { type: "SET_ALL_GRADE_DATA"; payload: GradeRecord[] }
  | { type: "SET_WIDE_GRADE_DATA"; payload: any[] }
  | { type: "SET_EXAM_LIST"; payload: ExamInfo[] }
  | { type: "SET_FILTER"; payload: GradeFilterConfig }
  | { type: "UPDATE_FILTER"; payload: Partial<GradeFilterConfig> }
  | { type: "CLEAR_FILTER" }
  | { type: "SET_LOADING"; payload: Partial<LoadingState> }
  | { type: "SET_ERROR"; payload: AppError | null }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LAST_UPDATED"; payload: number }
  | { type: "RESET_STATE" };

// ==================== 初始状态 ====================

const initialState: GradeModuleState = {
  allGradeData: [],
  wideGradeData: [],
  filteredGradeData: [],
  examList: [],
  statistics: null,
  filter: {},
  loading: {
    isLoading: false,
    operation: undefined,
    progress: 0,
    message: undefined,
  },
  error: null,
  lastUpdated: null,
  availableSubjects: [],
  availableClasses: [],
  availableGrades: [],
  availableExamTypes: [],
};

// ==================== 数据转换工具 ====================

// 从现有的ModernGradeAnalysisContext复用转换逻辑
function convertWideToLongFormat(wideData: any[]): GradeRecord[] {
  const longData: GradeRecord[] = [];

  wideData.forEach((student) => {
    // 计算有效总分
    let effectiveTotalScore = student.total_score;
    if (student.total_score === null || student.total_score === undefined) {
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
      }
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

    // 科目映射
    const subjects = [
      {
        name: "语文",
        scoreField: "chinese_score",
        gradeField: "chinese_grade",
      },
      { name: "数学", scoreField: "math_score", gradeField: "math_grade" },
      {
        name: "英语",
        scoreField: "english_score",
        gradeField: "english_grade",
      },
      {
        name: "物理",
        scoreField: "physics_score",
        gradeField: "physics_grade",
      },
      {
        name: "化学",
        scoreField: "chemistry_score",
        gradeField: "chemistry_grade",
      },
      {
        name: "道法",
        scoreField: "politics_score",
        gradeField: "politics_grade",
      },
      {
        name: "历史",
        scoreField: "history_score",
        gradeField: "history_grade",
      },
      {
        name: "生物",
        scoreField: "biology_score",
        gradeField: "biology_grade",
      },
      {
        name: "地理",
        scoreField: "geography_score",
        gradeField: "geography_grade",
      },
    ];

    // 处理普通科目
    subjects.forEach((subject) => {
      const score = student[subject.scoreField];
      if (score !== null && score !== undefined) {
        longData.push({
          ...baseRecord,
          id: `${student.student_id}-${student.exam_id}-${subject.name}`,
          subject: subject.name,
          score: parseFloat(score),
          grade: student[subject.gradeField] || null,
          total_score: effectiveTotalScore
            ? parseFloat(effectiveTotalScore)
            : null,
        } as GradeRecord);
      }
    });

    // 处理总分记录
    if (effectiveTotalScore !== null && effectiveTotalScore !== undefined) {
      longData.push({
        ...baseRecord,
        id: `${student.student_id}-${student.exam_id}-总分`,
        subject: "总分",
        score: parseFloat(effectiveTotalScore),
        grade: student.total_grade,
        total_score: parseFloat(effectiveTotalScore),
      } as GradeRecord);
    }
  });

  return longData;
}

// ==================== Reducer ====================

function gradeReducer(
  state: GradeModuleState,
  action: GradeAction
): GradeModuleState {
  switch (action.type) {
    case "SET_ALL_GRADE_DATA":
      return { ...state, allGradeData: action.payload };

    case "SET_WIDE_GRADE_DATA":
      return { ...state, wideGradeData: action.payload };

    case "SET_EXAM_LIST":
      return { ...state, examList: action.payload };

    case "SET_FILTER":
      return { ...state, filter: action.payload };

    case "UPDATE_FILTER":
      return { ...state, filter: { ...state.filter, ...action.payload } };

    case "CLEAR_FILTER":
      return { ...state, filter: {} };

    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, ...action.payload } };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "SET_LAST_UPDATED":
      return { ...state, lastUpdated: action.payload };

    case "RESET_STATE":
      return { ...initialState };

    default:
      return state;
  }
}

// ==================== Context ====================

const GradeModuleContext = createContext<GradeModuleContextType | undefined>(
  undefined
);

// ==================== Provider ====================

export const GradeModuleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(gradeReducer, initialState);

  // ==================== Helper Functions ====================

  const createAppError = useCallback(
    (
      message: string,
      code?: string,
      recoverable: boolean = true
    ): AppError => ({
      id: `GRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      code,
      timestamp: Date.now(),
      module: "grade",
      recoverable,
      retryCount: 0,
    }),
    []
  );

  const setLoading = useCallback((loading: Partial<LoadingState>) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setError = useCallback((error: AppError | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
    if (error) {
      toast.error(error.message, {
        description: error.recoverable
          ? "点击重试或稍后再试"
          : "请联系系统管理员",
      });
    }
  }, []);

  // ==================== 过滤逻辑 ====================

  const filteredGradeData = useMemo(() => {
    let filtered = [...state.allGradeData];

    // 考试筛选
    if (state.filter.examIds?.length) {
      filtered = filtered.filter((record) =>
        state.filter.examIds!.includes(record.exam_id)
      );
    }

    // 科目筛选
    if (state.filter.subjects?.length) {
      filtered = filtered.filter(
        (record) =>
          record.subject && state.filter.subjects!.includes(record.subject)
      );
    }

    // 班级筛选
    if (state.filter.classNames?.length) {
      filtered = filtered.filter(
        (record) =>
          record.class_name &&
          state.filter.classNames!.includes(record.class_name)
      );
    }

    // 等级筛选
    if (state.filter.grades?.length) {
      filtered = filtered.filter(
        (record) => record.grade && state.filter.grades!.includes(record.grade)
      );
    }

    // 分数范围筛选
    if (
      state.filter.scoreRange?.min !== undefined ||
      state.filter.scoreRange?.max !== undefined
    ) {
      filtered = filtered.filter((record) => {
        const score = record.score;
        if (score === null || score === undefined) return false;

        if (
          state.filter.scoreRange!.min !== undefined &&
          score < state.filter.scoreRange!.min
        )
          return false;
        if (
          state.filter.scoreRange!.max !== undefined &&
          score > state.filter.scoreRange!.max
        )
          return false;

        return true;
      });
    }

    // 搜索关键词筛选
    if (state.filter.searchKeyword) {
      const keyword = state.filter.searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.name?.toLowerCase().includes(keyword) ||
          record.student_id?.toLowerCase().includes(keyword) ||
          record.class_name?.toLowerCase().includes(keyword) ||
          record.subject?.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [state.allGradeData, state.filter]);

  // ==================== 可用选项计算 ====================

  const availableSubjects = useMemo(() => {
    const subjects = new Set(
      state.allGradeData.map((record) => record.subject).filter(Boolean)
    );
    return Array.from(subjects).sort();
  }, [state.allGradeData]);

  const availableClasses = useMemo(() => {
    const classes = new Set(
      state.allGradeData.map((record) => record.class_name).filter(Boolean)
    );
    return Array.from(classes).sort();
  }, [state.allGradeData]);

  const availableGrades = useMemo(() => {
    const grades = new Set(
      state.allGradeData.map((record) => record.grade).filter(Boolean)
    );
    return Array.from(grades).sort();
  }, [state.allGradeData]);

  const availableExamTypes = useMemo(() => {
    const types = new Set(
      state.examList.map((exam) => exam.type).filter(Boolean)
    );
    return Array.from(types).sort();
  }, [state.examList]);

  // ==================== 统计信息计算 ====================

  const statistics = useMemo((): GradeStatistics | null => {
    if (filteredGradeData.length === 0) return null;

    const totalRecords = filteredGradeData.length;
    const uniqueStudents = new Set(
      filteredGradeData.map((record) => record.student_id)
    );
    const totalStudents = uniqueStudents.size;

    // 总分统计
    const totalScoreRecords = filteredGradeData.filter(
      (record) => record.subject === "总分" && record.score && record.score > 0
    );

    const totalScoreStats =
      totalScoreRecords.length > 0
        ? {
            avgScore:
              totalScoreRecords.reduce((sum, r) => sum + r.score!, 0) /
              totalScoreRecords.length,
            maxScore: Math.max(...totalScoreRecords.map((r) => r.score!)),
            minScore: Math.min(...totalScoreRecords.map((r) => r.score!)),
            passRate:
              (totalScoreRecords.filter((r) => r.score! >= 60).length /
                totalScoreRecords.length) *
              100,
            excellentRate:
              (totalScoreRecords.filter((r) => r.score! >= 90).length /
                totalScoreRecords.length) *
              100,
            studentCount: totalScoreRecords.length,
            hasData: true,
          }
        : {
            avgScore: 0,
            maxScore: 0,
            minScore: 0,
            passRate: 0,
            excellentRate: 0,
            studentCount: 0,
            hasData: false,
          };

    // 单科统计
    const subjectRecords = filteredGradeData.filter(
      (record) => record.subject !== "总分" && record.score && record.score > 0
    );

    const subjectScoreStats =
      subjectRecords.length > 0
        ? {
            avgScore:
              subjectRecords.reduce((sum, r) => sum + r.score!, 0) /
              subjectRecords.length,
            maxScore: Math.max(...subjectRecords.map((r) => r.score!)),
            minScore: Math.min(...subjectRecords.map((r) => r.score!)),
            passRate:
              (subjectRecords.filter((r) => r.score! >= 60).length /
                subjectRecords.length) *
              100,
            excellentRate:
              (subjectRecords.filter((r) => r.score! >= 90).length /
                subjectRecords.length) *
              100,
            hasData: true,
          }
        : {
            avgScore: 0,
            maxScore: 0,
            minScore: 0,
            passRate: 0,
            excellentRate: 0,
            hasData: false,
          };

    // 科目统计
    const subjectStats = availableSubjects.map((subject) => {
      const subjectRecords = filteredGradeData.filter(
        (record) => record.subject === subject
      );
      const subjectScores = subjectRecords
        .map((record) => record.score)
        .filter(
          (score) => score !== null && score !== undefined && score > 0
        ) as number[];

      const avgScore =
        subjectScores.length > 0
          ? subjectScores.reduce((sum, score) => sum + score, 0) /
            subjectScores.length
          : 0;
      const passRate =
        subjectScores.length > 0
          ? (subjectScores.filter((score) => score >= 60).length /
              subjectScores.length) *
            100
          : 0;
      const excellentRate =
        subjectScores.length > 0
          ? (subjectScores.filter((score) => score >= 90).length /
              subjectScores.length) *
            100
          : 0;

      return {
        subject,
        count: subjectRecords.length,
        avgScore,
        passRate,
        excellentRate,
        isTotal: subject === "总分",
      };
    });

    // 班级统计
    const classStats = availableClasses.map((className) => {
      const classRecords = filteredGradeData.filter(
        (record) => record.class_name === className
      );
      const classStudents = new Set(
        classRecords.map((record) => record.student_id)
      );

      const totalScoreRecords = classRecords.filter(
        (record) =>
          record.subject === "总分" && record.score && record.score > 0
      );
      const subjectRecords = classRecords.filter(
        (record) =>
          record.subject !== "总分" && record.score && record.score > 0
      );

      const totalScores = totalScoreRecords.map((record) => record.score!);
      const subjectScores = subjectRecords.map((record) => record.score!);

      return {
        className,
        studentCount: classStudents.size,
        totalScoreAvg:
          totalScores.length > 0
            ? totalScores.reduce((sum, score) => sum + score, 0) /
              totalScores.length
            : 0,
        subjectScoreAvg:
          subjectScores.length > 0
            ? subjectScores.reduce((sum, score) => sum + score, 0) /
              subjectScores.length
            : 0,
        totalPassRate:
          totalScores.length > 0
            ? (totalScores.filter((score) => score >= 60).length /
                totalScores.length) *
              100
            : 0,
        subjectPassRate:
          subjectScores.length > 0
            ? (subjectScores.filter((score) => score >= 60).length /
                subjectScores.length) *
              100
            : 0,
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

    return {
      totalStudents,
      totalRecords,
      totalScoreStats,
      subjectScoreStats,
      scoreComparison: 0, // 可以后续实现历史对比
      passRateComparison: 0,
      atRiskStudents: filteredGradeData.filter((r) => r.score && r.score < 60)
        .length,
      topSubject:
        subjectStats.find((s) => !s.isTotal && s.avgScore > 0)?.subject ||
        "暂无",
      topSubjectScore: Math.max(
        ...subjectStats.filter((s) => !s.isTotal).map((s) => s.avgScore),
        0
      ),
      subjectStats,
      classStats,
      gradeDistribution,
    };
  }, [filteredGradeData, availableSubjects, availableClasses, availableGrades]);

  // ==================== Actions ====================

  const loadAllData = useCallback(async () => {
    setLoading({
      isLoading: true,
      operation: "loadAllData",
      message: "加载成绩数据...",
    });

    try {
      // 并行加载考试信息和成绩数据（限制1000条防止全表扫描）
      const [examResponse, gradeResponse] = await Promise.all([
        supabase.from("exams").select("*").order("date", { ascending: false }),
        supabase
          .from("grade_data")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      if (examResponse.error) {
        throw new Error(`加载考试信息失败: ${examResponse.error.message}`);
      }

      if (gradeResponse.error) {
        throw new Error(`加载成绩数据失败: ${gradeResponse.error.message}`);
      }

      const exams = examResponse.data || [];
      const grades = gradeResponse.data || [];

      dispatch({ type: "SET_EXAM_LIST", payload: exams });
      dispatch({ type: "SET_WIDE_GRADE_DATA", payload: grades });

      // 转换wide table为long table格式
      const longFormatGrades = convertWideToLongFormat(grades);
      dispatch({ type: "SET_ALL_GRADE_DATA", payload: longFormatGrades });
      dispatch({ type: "SET_LAST_UPDATED", payload: Date.now() });
    } catch (err) {
      console.error("❌ 加载数据失败:", err);
      const errorMessage = err instanceof Error ? err.message : "加载数据失败";
      const appError = createAppError(errorMessage, "LOAD_ALL_DATA_ERROR");
      setError(appError);
    } finally {
      setLoading({ isLoading: false });
    }
  }, [createAppError, setError, setLoading]);

  const loadExamData = useCallback(
    async (examId: string) => {
      setLoading({
        isLoading: true,
        operation: "loadExamData",
        message: "加载考试数据...",
      });

      try {
        const { data, error } = await supabase
          .from("grade_data")
          .select("*")
          .eq("exam_id", examId)
          .order("student_id");

        if (error) {
          throw new Error(`加载考试数据失败: ${error.message}`);
        }

        dispatch({ type: "SET_WIDE_GRADE_DATA", payload: data || [] });

        const longFormatGrades = convertWideToLongFormat(data || []);
        dispatch({ type: "SET_ALL_GRADE_DATA", payload: longFormatGrades });
        dispatch({ type: "SET_LAST_UPDATED", payload: Date.now() });
      } catch (err) {
        console.error("❌ 加载考试数据失败:", err);
        const errorMessage =
          err instanceof Error ? err.message : "加载考试数据失败";
        const appError = createAppError(errorMessage, "LOAD_EXAM_DATA_ERROR");
        setError(appError);
      } finally {
        setLoading({ isLoading: false });
      }
    },
    [createAppError, setError, setLoading]
  );

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const setFilter = useCallback((filter: GradeFilterConfig) => {
    dispatch({ type: "SET_FILTER", payload: filter });
  }, []);

  const updateFilter = useCallback((updates: Partial<GradeFilterConfig>) => {
    dispatch({ type: "UPDATE_FILTER", payload: updates });
  }, []);

  const clearFilter = useCallback(() => {
    dispatch({ type: "CLEAR_FILTER" });
  }, []);

  // ==================== 查询方法 ====================

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

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const retry = useCallback(async () => {
    if (state.error) {
      dispatch({ type: "CLEAR_ERROR" });
      await loadAllData();
    }
  }, [state.error, loadAllData]);

  // ==================== 初始化 ====================
  // 启动时只加载考试列表，成绩数据按需加载（避免全表扫描拖慢启动）
  useEffect(() => {
    const loadExamListOnly = async () => {
      try {
        const { data, error } = await supabase
          .from("exams")
          .select("*")
          .order("date", { ascending: false });
        if (!error && data) {
          dispatch({ type: "SET_EXAM_LIST", payload: data });
        }
      } catch (_) {
        // 静默失败，不影响启动
      }
    };
    loadExamListOnly();
  }, []);

  // ==================== Context Value ====================

  const contextValue: GradeModuleContextType = {
    // State
    allGradeData: state.allGradeData,
    wideGradeData: state.wideGradeData,
    filteredGradeData,
    examList: state.examList,
    statistics,
    filter: state.filter,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    availableSubjects,
    availableClasses,
    availableGrades,
    availableExamTypes,

    // Actions
    loadAllData,
    loadExamData,
    refreshData,
    setFilter,
    updateFilter,
    clearFilter,
    getStudentGrades,
    getSubjectGrades,
    getClassGrades,
    clearError,
    retry,
  };

  return (
    <GradeModuleContext.Provider value={contextValue}>
      {children}
    </GradeModuleContext.Provider>
  );
};

// ==================== Hook ====================

export const useGradeModule = (): GradeModuleContextType => {
  const context = useContext(GradeModuleContext);
  if (!context) {
    console.warn(
      "useGradeModule called outside GradeModuleProvider, returning default values"
    );
    return {
      allGradeData: [],
      wideGradeData: [],
      filteredGradeData: [],
      examList: [],
      statistics: null,
      filter: null,
      loading: {
        isLoading: false,
        operation: undefined,
        progress: 0,
        message: undefined,
      },
      error: null,
      lastUpdated: null,
      availableSubjects: [],
      availableClasses: [],
      availableGrades: [],
      availableExamTypes: [],
      loadAllData: async () => {},
      loadExamData: async () => {},
      refreshData: async () => {},
      setFilter: () => {},
      updateFilter: () => {},
      clearFilter: () => {},
      getStudentGrades: () => [],
      getSubjectGrades: () => [],
      getClassGrades: () => [],
      clearError: () => {},
      retry: async () => {},
    };
  }
  return context;
};
