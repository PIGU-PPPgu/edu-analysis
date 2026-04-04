/**
 * useAnalysisData — 封装分析模块所有数据访问
 * 统一数据操作接口，替换组件中直接调用 ModernGradeAnalysisContext
 * 为未来迁移到 React Query 做准备
 */

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useModernGradeAnalysis,
  type GradeRecord,
  type GradeStatistics,
  type ExamInfo,
} from "@/contexts/ModernGradeAnalysisContext";
import type { GradeFilterConfig } from "@/components/analysis/filters/ModernGradeFilters";

// ---- 异常检测数据类型 ----
export interface AnomalyData {
  studentId: string;
  studentName: string;
  subject: string;
  score: number;
  avgScore: number;
  deviation: number;
  severity: "low" | "medium" | "high";
  type: "outlier" | "sudden_drop" | "sudden_rise";
}

// ---- 趋势分析数据类型 ----
export interface TrendData {
  examId: string;
  examTitle: string;
  examDate: string;
  avgScore: number;
  passRate: number;
  excellentRate: number;
  studentCount: number;
}

// ---- 对比分析数据类型 ----
export interface ComparisonData {
  className: string;
  avgScore: number;
  passRate: number;
  excellentRate: number;
  studentCount: number;
  rank: number;
}

// ---- Hook 返回类型 ----
export interface UseAnalysisDataReturn {
  // 原始数据
  allGradeData: GradeRecord[];
  wideGradeData: any[];
  filteredGradeData: GradeRecord[];
  examList: ExamInfo[];
  statistics: GradeStatistics | null;

  // 筛选状态
  filter: GradeFilterConfig;
  setFilter: (filter: GradeFilterConfig) => void;
  clearFilter: () => void;

  // 加载状态
  loading: boolean;
  error: string | null;

  // 可用选项
  availableSubjects: string[];
  availableClasses: string[];
  availableGrades: string[];
  availableExamTypes: string[];

  // 数据操作
  loadAllData: () => Promise<void>;
  loadExamData: (examId: string) => Promise<void>;
  refreshData: () => Promise<void>;

  // 数据查询
  getStudentGrades: (studentId: string) => GradeRecord[];
  getSubjectGrades: (subject: string) => GradeRecord[];
  getClassGrades: (className: string) => GradeRecord[];

  // 高级分析数据
  fetchAnomalyData: () => AnomalyData[];
  fetchTrendData: (examIds?: string[]) => TrendData[];
  fetchComparisonData: (subject?: string) => ComparisonData[];
}

// ---- Hook 实现 ----
export function useAnalysisData(): UseAnalysisDataReturn {
  const context = useModernGradeAnalysis();

  // 异常检测数据计算
  const fetchAnomalyData = useCallback((): AnomalyData[] => {
    const { filteredGradeData, statistics } = context;

    if (!statistics || filteredGradeData.length === 0) {
      return [];
    }

    const anomalies: AnomalyData[] = [];

    // 按科目分组计算异常
    const subjectGroups = new Map<string, GradeRecord[]>();
    filteredGradeData.forEach((record) => {
      if (!record.subject || record.subject === "总分") return;
      if (!subjectGroups.has(record.subject)) {
        subjectGroups.set(record.subject, []);
      }
      subjectGroups.get(record.subject)!.push(record);
    });

    subjectGroups.forEach((records, subject) => {
      const scores = records
        .map((r) => r.score)
        .filter((s): s is number => s !== null && s !== undefined);

      if (scores.length === 0) return;

      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const variance =
        scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) /
        scores.length;
      const stdDev = Math.sqrt(variance);

      records.forEach((record) => {
        if (!record.score) return;

        const deviation = Math.abs(record.score - avg);
        const zScore = stdDev > 0 ? deviation / stdDev : 0;

        // 检测异常值（z-score > 2）
        if (zScore > 2) {
          let severity: "low" | "medium" | "high" = "low";
          if (zScore > 3) severity = "high";
          else if (zScore > 2.5) severity = "medium";

          let type: "outlier" | "sudden_drop" | "sudden_rise" = "outlier";
          if (record.score < avg - stdDev * 2) type = "sudden_drop";
          else if (record.score > avg + stdDev * 2) type = "sudden_rise";

          anomalies.push({
            studentId: record.student_id,
            studentName: record.name || "未知",
            subject,
            score: record.score,
            avgScore: avg,
            deviation,
            severity,
            type,
          });
        }
      });
    });

    return anomalies.sort((a, b) => b.deviation - a.deviation);
  }, [context]);

  // 趋势分析数据计算
  const fetchTrendData = useCallback(
    (examIds?: string[]): TrendData[] => {
      const { filteredGradeData, examList } = context;

      if (filteredGradeData.length === 0) {
        return [];
      }

      // 按考试分组
      const examGroups = new Map<
        string,
        { records: GradeRecord[]; examInfo: ExamInfo | undefined }
      >();

      filteredGradeData.forEach((record) => {
        const examId = record.exam_id;
        if (!examId) return;

        // 如果指定了考试ID列表，只处理这些考试
        if (examIds && examIds.length > 0 && !examIds.includes(examId)) {
          return;
        }

        if (!examGroups.has(examId)) {
          examGroups.set(examId, {
            records: [],
            examInfo: examList.find((e) => e.id === examId),
          });
        }
        examGroups.get(examId)!.records.push(record);
      });

      const trends: TrendData[] = [];

      examGroups.forEach((group, examId) => {
        const { records, examInfo } = group;

        // 只统计总分记录
        const totalScoreRecords = records.filter(
          (r) => r.subject === "总分" && r.score && r.score > 0
        );

        if (totalScoreRecords.length === 0) return;

        const scores = totalScoreRecords.map((r) => r.score!);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

        // 计算及格率和优秀率（动态满分）
        const passingCount = totalScoreRecords.filter((r) => {
          const maxScore = r.max_score || 100;
          return r.score! >= maxScore * 0.6;
        }).length;

        const excellentCount = totalScoreRecords.filter((r) => {
          const maxScore = r.max_score || 100;
          return r.score! >= maxScore * 0.9;
        }).length;

        const passRate = (passingCount / totalScoreRecords.length) * 100;
        const excellentRate = (excellentCount / totalScoreRecords.length) * 100;

        trends.push({
          examId,
          examTitle: examInfo?.title || records[0]?.exam_title || "未命名考试",
          examDate: examInfo?.date || records[0]?.exam_date || "",
          avgScore,
          passRate,
          excellentRate,
          studentCount: totalScoreRecords.length,
        });
      });

      // 按日期排序
      return trends.sort((a, b) => {
        const aDate = a.examDate ? new Date(a.examDate).getTime() : 0;
        const bDate = b.examDate ? new Date(b.examDate).getTime() : 0;
        return aDate - bDate;
      });
    },
    [context]
  );

  // 对比分析数据计算
  const fetchComparisonData = useCallback(
    (subject?: string): ComparisonData[] => {
      const { filteredGradeData, availableClasses } = context;

      if (filteredGradeData.length === 0) {
        return [];
      }

      const comparisons: ComparisonData[] = [];

      availableClasses.forEach((className) => {
        const classRecords = filteredGradeData.filter(
          (r) => r.class_name === className
        );

        if (classRecords.length === 0) return;

        // 如果指定了科目，只统计该科目
        let targetRecords = classRecords;
        if (subject) {
          targetRecords = classRecords.filter((r) => r.subject === subject);
        } else {
          // 默认统计总分
          targetRecords = classRecords.filter((r) => r.subject === "总分");
        }

        if (targetRecords.length === 0) return;

        const scores = targetRecords
          .map((r) => r.score)
          .filter((s): s is number => s !== null && s !== undefined);

        if (scores.length === 0) return;

        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

        // 计算及格率和优秀率（动态满分）
        const passingCount = targetRecords.filter((r) => {
          if (!r.score) return false;
          const maxScore = r.max_score || 100;
          return r.score >= maxScore * 0.6;
        }).length;

        const excellentCount = targetRecords.filter((r) => {
          if (!r.score) return false;
          const maxScore = r.max_score || 100;
          return r.score >= maxScore * 0.9;
        }).length;

        const passRate = (passingCount / targetRecords.length) * 100;
        const excellentRate = (excellentCount / targetRecords.length) * 100;

        // 统计学生数（去重）
        const uniqueStudents = new Set(targetRecords.map((r) => r.student_id));

        comparisons.push({
          className,
          avgScore,
          passRate,
          excellentRate,
          studentCount: uniqueStudents.size,
          rank: 0, // 稍后计算
        });
      });

      // 按平均分排序并计算排名
      comparisons.sort((a, b) => b.avgScore - a.avgScore);
      comparisons.forEach((item, index) => {
        item.rank = index + 1;
      });

      return comparisons;
    },
    [context]
  );

  return {
    // 原始数据
    allGradeData: context.allGradeData,
    wideGradeData: context.wideGradeData,
    filteredGradeData: context.filteredGradeData,
    examList: context.examList,
    statistics: context.statistics,

    // 筛选状态
    filter: context.filter,
    setFilter: context.setFilter,
    clearFilter: context.clearFilter,

    // 加载状态
    loading: context.loading,
    error: context.error,

    // 可用选项
    availableSubjects: context.availableSubjects,
    availableClasses: context.availableClasses,
    availableGrades: context.availableGrades,
    availableExamTypes: context.availableExamTypes,

    // 数据操作
    loadAllData: context.loadAllData,
    loadExamData: context.loadExamData,
    refreshData: context.refreshData,

    // 数据查询
    getStudentGrades: context.getStudentGrades,
    getSubjectGrades: context.getSubjectGrades,
    getClassGrades: context.getClassGrades,

    // 高级分析数据
    fetchAnomalyData,
    fetchTrendData,
    fetchComparisonData,
  };
}
