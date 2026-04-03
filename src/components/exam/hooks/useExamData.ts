/**
 * useExamData — 封装考试模块所有数据访问
 * 内部通过 ExamDataService（DataGateway 路径）和 examService.enhanced.ts 访问数据
 * 组件层不直接调用 examService 或 supabase
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { examDataService } from "@/services/domains/ExamDataService";
import {
  getExamTypes,
  getExamOverviewStatistics,
  getAcademicTerms,
  getCurrentAcademicTerm,
  getExamSubjectScores,
  saveExamSubjectScores,
} from "@/services/examService.enhanced";
import { buildDerivedExams } from "@/contexts/ModernGradeAnalysisContext";
import { supabase } from "@/integrations/supabase/client";
import type {
  Exam as DBExam,
  ExamType as DBExamType,
  CreateExamInput,
  UpdateExamInput,
  AcademicTerm,
  ExamSubjectScore,
} from "@/services/examService";

// ---- 本地 UI 类型（与 ExamManagementCenter 保持一致） ----

export interface UIExam extends Omit<DBExam, "subject" | "status"> {
  description?: string;
  typeInfo?: UIExamType;
  subjects: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  classes: string[];
  status: "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
  completionRate?: number;
  averageScore?: number;
  tags?: string[];
}

export interface UIExamType {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  isDefault: boolean;
}

export interface UIExamStatistics {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  averageParticipation: number;
  averageScore: number;
  improvementRate: number;
  riskExams: number;
}

// ---- 映射工具（纯函数，不依赖 state） ----

const TYPE_MAP: Record<string, { color: string; emoji: string }> = {
  期中考试: { color: "#3B82F6", emoji: "📝" },
  期末考试: { color: "#EF4444", emoji: "🎯" },
  月考: { color: "#10B981", emoji: "📊" },
  小测: { color: "#F59E0B", emoji: "📋" },
  模拟考试: { color: "#8B5CF6", emoji: "🎪" },
  随堂测验: { color: "#06B6D4", emoji: "⚡" },
};

export function mapExamType(dbType: DBExamType): UIExamType {
  const info = TYPE_MAP[dbType.type_name] ?? { color: "#6B7280", emoji: "📄" };
  return {
    id: dbType.id,
    name: dbType.type_name,
    description: dbType.description ?? "",
    color: info.color,
    emoji: info.emoji,
    isDefault: dbType.is_system,
  };
}

export function mapExam(dbExam: DBExam, examTypes: UIExamType[] = []): UIExam {
  return {
    ...dbExam,
    subjects: dbExam.subject ? [dbExam.subject] : [],
    status: "scheduled" as const,
    createdBy: dbExam.created_by ?? "系统",
    createdAt: dbExam.created_at,
    updatedAt: dbExam.updated_at,
    classes: [],
    tags: [],
    participantCount: 0,
    typeInfo: examTypes.find((t) => t.name === dbExam.type),
  };
}

// ---- 从 grade_data 派生考试列表（兜底，封装 supabase 直查） ----

async function loadDerivedExamsFromGrades(
  examTypes: UIExamType[]
): Promise<UIExam[]> {
  try {
    const { data, error } = await supabase
      .from("grade_data")
      .select(
        "exam_id, exam_title, exam_type, exam_date, created_at, updated_at"
      )
      .limit(500);

    if (error) {
      console.warn("[useExamData] 派生考试列表失败:", error);
      return [];
    }

    const derived = buildDerivedExams(data ?? []);
    return derived.map((e) => mapExam(e, examTypes));
  } catch (err) {
    console.warn("[useExamData] 派生考试列表异常:", err);
    return [];
  }
}

// ---- Hook 返回类型 ----

export interface UseExamDataReturn {
  exams: UIExam[];
  examTypes: UIExamType[];
  statistics: UIExamStatistics;
  academicTerms: AcademicTerm[];
  currentTerm: AcademicTerm | null;
  isLoading: boolean;

  // 数据操作
  reload: () => Promise<void>;
  createExam: (data: CreateExamInput) => Promise<UIExam | null>;
  updateExam: (id: string, data: UpdateExamInput) => Promise<UIExam | null>;
  deleteExam: (id: string) => Promise<boolean>;
  duplicateExam: (id: string) => Promise<UIExam | null>;
  reloadAfterDelete: () => Promise<void>;

  // 科目总分配置
  fetchSubjectScores: (examId: string) => Promise<ExamSubjectScore[]>;
  saveSubjectScores: (
    examId: string,
    scores: Omit<ExamSubjectScore, "id" | "created_at" | "updated_at">[]
  ) => Promise<boolean>;

  // 本地 state 更新（供组件直接操作 exams/statistics）
  setExams: React.Dispatch<React.SetStateAction<UIExam[]>>;
  setStatistics: React.Dispatch<React.SetStateAction<UIExamStatistics>>;
}

// ---- 默认统计值 ----

const DEFAULT_STATISTICS: UIExamStatistics = {
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

// ---- Hook 实现 ----

export function useExamData(): UseExamDataReturn {
  const [exams, setExams] = useState<UIExam[]>([]);
  const [examTypes, setExamTypes] = useState<UIExamType[]>([]);
  const [statistics, setStatistics] =
    useState<UIExamStatistics>(DEFAULT_STATISTICS);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dbExamTypes, dbExams, overviewStats, terms, currentTermData] =
        await Promise.all([
          getExamTypes(),
          examDataService.getExams(),
          getExamOverviewStatistics(),
          getAcademicTerms(),
          getCurrentAcademicTerm(),
        ]);

      const mappedTypes = dbExamTypes.map(mapExamType);
      setExamTypes(mappedTypes);

      let mappedExams = dbExams
        .map((e) => mapExam(e, mappedTypes))
        .sort((a, b) => {
          const aDate = a.date ? new Date(a.date).getTime() : 0;
          const bDate = b.date ? new Date(b.date).getTime() : 0;
          if (bDate !== aDate) return bDate - aDate;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

      // exams 表为空时从 grade_data 派生
      if (mappedExams.length === 0) {
        const derived = await loadDerivedExamsFromGrades(mappedTypes);
        const mergedMap = new Map(mappedExams.map((e) => [e.id, e]));
        derived.forEach((e) => {
          if (!mergedMap.has(e.id)) mergedMap.set(e.id, e);
        });
        mappedExams = Array.from(mergedMap.values());
        if (derived.length > 0) {
          toast.info("已从成绩数据推断考试列表（exams 表为空）");
        }
      }

      // 异步补充参与人数
      const examsWithParticipants = await Promise.all(
        mappedExams.map(async (exam) => {
          const participantCount =
            await examDataService.getExamParticipantCount(exam.id);
          return { ...exam, participantCount };
        })
      );

      setExams(examsWithParticipants);
      setAcademicTerms(terms);
      setCurrentTerm(currentTermData);
      if (overviewStats) setStatistics(overviewStats);
    } catch (error) {
      console.error("[useExamData] 加载数据失败:", error);
      toast.error("加载数据失败，请重试");

      setExamTypes([]);
      setAcademicTerms([]);
      setCurrentTerm(null);
      setStatistics(DEFAULT_STATISTICS);

      // 兜底：尝试从 grade_data 派生
      try {
        const derived = await loadDerivedExamsFromGrades([]);
        if (derived.length > 0) {
          setExams(derived);
          toast.info("已从成绩数据推断考试列表（exams 表不可用）");
        }
      } catch {
        // 忽略派生失败
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 删除后重新加载（含 examTypes 和 statistics）
  const reloadAfterDelete = useCallback(async () => {
    const [dbExamTypes, dbExams, overviewStats] = await Promise.all([
      getExamTypes(),
      examDataService.getExams(),
      getExamOverviewStatistics(),
    ]);
    const mappedTypes = dbExamTypes.map(mapExamType);
    setExamTypes(mappedTypes);
    setExams(dbExams.map((e) => mapExam(e, mappedTypes)));
    if (overviewStats) setStatistics(overviewStats);
  }, []);

  const createExamFn = useCallback(
    async (data: CreateExamInput): Promise<UIExam | null> => {
      const result = await examDataService.createExam(data);
      if (!result) return null;
      return mapExam(result, examTypes);
    },
    [examTypes]
  );

  const updateExamFn = useCallback(
    async (id: string, data: UpdateExamInput): Promise<UIExam | null> => {
      const result = await examDataService.updateExam(id, data);
      if (!result) return null;
      return mapExam(result, examTypes);
    },
    [examTypes]
  );

  const deleteExamFn = useCallback(
    (id: string) => examDataService.deleteExam(id),
    []
  );

  const duplicateExamFn = useCallback(
    async (id: string): Promise<UIExam | null> => {
      const result = await examDataService.duplicateExam(id);
      if (!result) return null;
      return mapExam(result, examTypes);
    },
    [examTypes]
  );

  const fetchSubjectScores = useCallback(
    (examId: string) => getExamSubjectScores(examId),
    []
  );

  const saveSubjectScoresFn = useCallback(
    (
      examId: string,
      scores: Omit<ExamSubjectScore, "id" | "created_at" | "updated_at">[]
    ) => saveExamSubjectScores(examId, scores),
    []
  );

  return {
    exams,
    examTypes,
    statistics,
    academicTerms,
    currentTerm,
    isLoading,
    reload: loadData,
    createExam: createExamFn,
    updateExam: updateExamFn,
    deleteExam: deleteExamFn,
    duplicateExam: duplicateExamFn,
    reloadAfterDelete,
    fetchSubjectScores,
    saveSubjectScores: saveSubjectScoresFn,
    setExams,
    setStatistics,
  };
}
