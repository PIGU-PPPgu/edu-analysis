/**
 * 统一数据服务层 - 成绩分析系统的核心数据服务
 *
 * 整合所有数据获取、处理和分析功能
 * 提供标准化的API接口，替换模拟数据调用
 * 统一错误处理和数据缓存机制
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  calculateBasicStatistics,
  analyzeScoreRanges,
  calculateRates,
  calculateRankings,
  calculateBoxPlotData,
  detectAnomalies,
  calculateCorrelation,
  groupBy,
  type BasicStatistics,
  type ScoreRangeConfig,
  type BoxPlotData,
  type AnomalyItem,
} from "./calculationUtils";
import {
  formatScoreRangeData,
  formatClassComparisonData,
  formatTrendData,
  formatBoxPlotDataForNivo,
  type ChartDataPoint,
} from "./chartUtils";

// ============================================================================
// 基础数据类型定义
// ============================================================================

export interface StudentInfo {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  grade?: string;
  gender?: string;
  admission_year?: string;
}

export interface ExamInfo {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
  scope: "class" | "grade" | "school";
}

export interface GradeRecord {
  id: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name: string;
  subject?: string;
  score: number;
  total_score?: number;
  rank_in_class?: number;
  rank_in_grade?: number;
  grade?: string;
}

export interface ClassStatistics extends BasicStatistics {
  className: string;
  studentCount: number;
  passRate: number;
  goodRate: number;
  excellentRate: number;
}

export interface AnalysisResult {
  statistics: BasicStatistics;
  scoreRanges: { range: string; count: number; percentage: number }[];
  rankings: { id: string; score: number; rank: number }[];
  anomalies: AnomalyItem[];
  boxPlotData: BoxPlotData;
}

// ============================================================================
// 简化缓存实现
// ============================================================================

class SimpleCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const dataCache = new SimpleCache();

// ============================================================================
// 统一数据服务类
// ============================================================================

export class UnifiedDataService {
  /**
   * 获取所有学生信息
   */
  static async getStudents(options?: {
    classFilter?: string[];
    searchKeyword?: string;
  }): Promise<{ data: StudentInfo[]; error: any }> {
    try {
      const cacheKey = `students_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      let query = supabase.from("students").select("*");

      if (options?.classFilter && options.classFilter.length > 0) {
        query = query.in("class_name", options.classFilter);
      }

      if (options?.searchKeyword) {
        query = query.or(
          `name.ilike.%${options.searchKeyword}%,student_id.ilike.%${options.searchKeyword}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("获取学生数据失败:", error);
        return { data: [], error };
      }

      const result = { data: data || [], error: null };
      dataCache.set(cacheKey, result, 300000); // 5分钟缓存

      return result;
    } catch (error) {
      console.error("获取学生数据异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 获取班级列表
   */
  static async getClasses(): Promise<{ data: string[]; error: any }> {
    try {
      const cacheKey = "class_list";
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from("students")
        .select("class_name")
        .not("class_name", "is", null);

      if (error) {
        console.error("获取班级列表失败:", error);
        return { data: [], error };
      }

      const classes = [
        ...new Set(data?.map((item) => item.class_name).filter(Boolean)),
      ] as string[];
      const result = { data: classes, error: null };

      dataCache.set(cacheKey, result, 300000);
      return result;
    } catch (error) {
      console.error("获取班级列表异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 获取考试列表
   */
  static async getExams(): Promise<{ data: ExamInfo[]; error: any }> {
    try {
      const cacheKey = "exams_list";
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("获取考试列表失败:", error);
        return { data: [], error };
      }

      const result = { data: data || [], error: null };
      dataCache.set(cacheKey, result, 600000); // 10分钟缓存

      return result;
    } catch (error) {
      console.error("获取考试列表异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 获取成绩数据
   */
  static async getGrades(options: {
    examId?: string;
    classFilter?: string[];
    subjectFilter?: string[];
  }): Promise<{ data: GradeRecord[]; error: any }> {
    try {
      const cacheKey = `grades_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from("grade_data")
        .select("*")
        .order("created_at", { ascending: false });

      if (options.examId) {
        query = query.eq("exam_id", options.examId);
      }

      if (options.classFilter && options.classFilter.length > 0) {
        query = query.in("class_name", options.classFilter);
      }

      if (options.subjectFilter && options.subjectFilter.length > 0) {
        query = query.in("subject", options.subjectFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("获取成绩数据失败:", error);
        return { data: [], error };
      }

      // 数据转换和清理
      const processedData = (data || []).map((record) => ({
        ...record,
        score: record.score ? Number(record.score) : 0,
        total_score: record.total_score ? Number(record.total_score) : null,
        rank_in_class: record.rank_in_class
          ? Number(record.rank_in_class)
          : null,
        rank_in_grade: record.rank_in_grade
          ? Number(record.rank_in_grade)
          : null,
      })) as GradeRecord[];

      const result = { data: processedData, error: null };
      dataCache.set(cacheKey, result, 120000); // 2分钟缓存

      return result;
    } catch (error) {
      console.error("获取成绩数据异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 分析考试成绩
   */
  static async analyzeExamGrades(
    examId: string,
    options?: {
      classFilter?: string[];
      subjectFilter?: string[];
      config?: ScoreRangeConfig;
    }
  ): Promise<{ data: AnalysisResult; error: any }> {
    try {
      const cacheKey = `analysis_${examId}_${JSON.stringify(options)}`;
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      // 获取成绩数据
      const { data: grades, error: gradesError } = await this.getGrades({
        examId,
        classFilter: options?.classFilter,
        subjectFilter: options?.subjectFilter,
      });

      if (gradesError) {
        return { data: {} as AnalysisResult, error: gradesError };
      }

      const scores = grades
        .map((g) => g.score)
        .filter((s) => typeof s === "number" && !isNaN(s));

      if (scores.length === 0) {
        return {
          data: {
            statistics: calculateBasicStatistics([]),
            scoreRanges: [],
            rankings: [],
            anomalies: [],
            boxPlotData: calculateBoxPlotData([]),
          },
          error: null,
        };
      }

      // 执行各种分析
      const statistics = calculateBasicStatistics(scores);
      const scoreRanges = analyzeScoreRanges(scores, options?.config);
      const rankings = calculateRankings(
        grades.map((g) => ({ id: g.student_id, score: g.score }))
      );
      const anomalies = detectAnomalies(
        grades.map((g) => ({ id: g.student_id, value: g.score }))
      );
      const boxPlotData = calculateBoxPlotData(scores, "整体");

      const result = {
        data: {
          statistics,
          scoreRanges,
          rankings,
          anomalies,
          boxPlotData,
        },
        error: null,
      };

      dataCache.set(cacheKey, result, 60000); // 1分钟缓存
      return result;
    } catch (error) {
      console.error("分析考试成绩异常:", error);
      return { data: {} as AnalysisResult, error };
    }
  }

  /**
   * 班级对比分析
   */
  static async analyzeClassComparison(
    examId: string,
    classNames: string[]
  ): Promise<{ data: ClassStatistics[]; error: any }> {
    try {
      const cacheKey = `class_comparison_${examId}_${classNames.join(",")}`;
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      const { data: grades, error } = await this.getGrades({
        examId,
        classFilter: classNames,
      });

      if (error) {
        return { data: [], error };
      }

      // 按班级分组
      const groupedGrades = groupBy(grades, (g) => g.class_name);

      const classStats: ClassStatistics[] = classNames.map((className) => {
        const classGrades = groupedGrades[className] || [];
        const scores = classGrades
          .map((g) => g.score)
          .filter((s) => typeof s === "number" && !isNaN(s));

        const basicStats = calculateBasicStatistics(scores);
        const rates = calculateRates(scores);

        return {
          className,
          studentCount: classGrades.length,
          ...basicStats,
          ...rates,
        };
      });

      const result = { data: classStats, error: null };
      dataCache.set(cacheKey, result, 60000);

      return result;
    } catch (error) {
      console.error("班级对比分析异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 获取成绩分布图表数据
   */
  static async getScoreDistributionChartData(
    examId: string,
    options?: { classFilter?: string[]; config?: ScoreRangeConfig }
  ): Promise<{ data: ChartDataPoint[]; error: any }> {
    try {
      const { data: analysis, error } = await this.analyzeExamGrades(
        examId,
        options
      );

      if (error) {
        return { data: [], error };
      }

      const chartData = formatScoreRangeData(analysis.scoreRanges);
      return { data: chartData, error: null };
    } catch (error) {
      console.error("获取成绩分布图表数据异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 获取班级对比图表数据
   */
  static async getClassComparisonChartData(
    examId: string,
    classNames: string[]
  ): Promise<{ data: ChartDataPoint[]; error: any }> {
    try {
      const { data: classStats, error } = await this.analyzeClassComparison(
        examId,
        classNames
      );

      if (error) {
        return { data: [], error };
      }

      const chartData = formatClassComparisonData(
        classStats.map((stat) => ({
          className: stat.className,
          averageScore: stat.average,
          studentCount: stat.studentCount,
        }))
      );

      return { data: chartData, error: null };
    } catch (error) {
      console.error("获取班级对比图表数据异常:", error);
      return { data: [], error };
    }
  }

  /**
   * 清除缓存
   */
  static clearCache(): void {
    dataCache.clear();
  }
}

export default UnifiedDataService;
