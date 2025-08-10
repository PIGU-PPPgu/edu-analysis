/**
 * 考试分数计算服务 - 集成数据库与计算器
 * 确保科目总分修改后的系统联动逻辑一致性
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ExamSubjectScore } from "./examService";

// 科目配置接口
export interface SubjectScoreConfig {
  subject_code: string;
  subject_name: string;
  total_score: number;
  passing_score: number;
  excellent_score: number;
  is_required: boolean;
  weight: number;
}

// 计算结果接口
export interface ScoreCalculationResult {
  passRate: number;
  excellentRate: number;
  averageScore: number;
  totalParticipants: number;
  passCount: number;
  excellentCount: number;
}

/**
 * 考试分数计算服务类
 * 从exam_subject_scores表获取配置，确保计算一致性
 */
export class ExamScoreCalculationService {
  private static instance: ExamScoreCalculationService;
  private configCache: Map<string, SubjectScoreConfig[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  private lastCacheUpdate: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): ExamScoreCalculationService {
    if (!ExamScoreCalculationService.instance) {
      ExamScoreCalculationService.instance = new ExamScoreCalculationService();
    }
    return ExamScoreCalculationService.instance;
  }

  /**
   * 从数据库获取考试科目配置
   */
  private async loadExamSubjectConfig(
    examId: string
  ): Promise<SubjectScoreConfig[]> {
    try {
      console.log(`[ExamScoreCalculation] 加载考试 ${examId} 的科目配置`);

      const { data, error } = await supabase
        .from("exam_subject_scores")
        .select("*")
        .eq("exam_id", examId)
        .order("subject_code");

      if (error) {
        console.error(`[ExamScoreCalculation] 获取考试科目配置失败:`, error);
        throw error;
      }

      const configs: SubjectScoreConfig[] = (data || []).map((item) => ({
        subject_code: item.subject_code,
        subject_name: item.subject_name,
        total_score: Number(item.total_score),
        passing_score: Number(item.passing_score || item.total_score * 0.6),
        excellent_score: Number(item.excellent_score || item.total_score * 0.9),
        is_required: Boolean(item.is_required),
        weight: Number(item.weight || 1.0),
      }));

      console.log(
        `[ExamScoreCalculation] 成功加载 ${configs.length} 个科目配置`
      );

      // 更新缓存
      this.configCache.set(examId, configs);
      this.lastCacheUpdate.set(examId, Date.now());

      return configs;
    } catch (error) {
      console.error(`[ExamScoreCalculation] 加载考试科目配置失败:`, error);
      return this.getDefaultConfigs();
    }
  }

  /**
   * 获取默认科目配置（回退方案）
   */
  private getDefaultConfigs(): SubjectScoreConfig[] {
    const defaultSubjects = [
      { code: "chinese", name: "语文", totalScore: 100 },
      { code: "math", name: "数学", totalScore: 100 },
      { code: "english", name: "英语", totalScore: 100 },
      { code: "physics", name: "物理", totalScore: 100 },
      { code: "chemistry", name: "化学", totalScore: 100 },
      { code: "biology", name: "生物", totalScore: 100 },
      { code: "politics", name: "政治", totalScore: 100 },
      { code: "history", name: "历史", totalScore: 100 },
      { code: "geography", name: "地理", totalScore: 100 },
    ];

    return defaultSubjects.map((subject) => ({
      subject_code: subject.code,
      subject_name: subject.name,
      total_score: subject.totalScore,
      passing_score: subject.totalScore * 0.6,
      excellent_score: subject.totalScore * 0.9,
      is_required: ["chinese", "math", "english"].includes(subject.code),
      weight: 1.0,
    }));
  }

  /**
   * 获取考试科目配置（带缓存）
   */
  public async getExamSubjectConfig(
    examId: string
  ): Promise<SubjectScoreConfig[]> {
    // 检查缓存
    const lastUpdate = this.lastCacheUpdate.get(examId);
    const cached = this.configCache.get(examId);

    if (cached && lastUpdate && Date.now() - lastUpdate < this.cacheTimeout) {
      console.log(`[ExamScoreCalculation] 使用缓存的配置 (examId: ${examId})`);
      return cached;
    }

    // 从数据库加载
    return await this.loadExamSubjectConfig(examId);
  }

  /**
   * 获取特定科目的配置
   */
  public async getSubjectConfig(
    examId: string,
    subjectCode: string
  ): Promise<SubjectScoreConfig | null> {
    const configs = await this.getExamSubjectConfig(examId);
    return (
      configs.find((config) => config.subject_code === subjectCode) || null
    );
  }

  /**
   * 获取科目的及格分数线
   */
  public async getPassingScore(
    examId: string,
    subjectCode: string
  ): Promise<number> {
    const config = await this.getSubjectConfig(examId, subjectCode);
    return config?.passing_score || 60;
  }

  /**
   * 获取科目的优秀分数线
   */
  public async getExcellentScore(
    examId: string,
    subjectCode: string
  ): Promise<number> {
    const config = await this.getSubjectConfig(examId, subjectCode);
    return config?.excellent_score || 90;
  }

  /**
   * 获取科目的总分
   */
  public async getTotalScore(
    examId: string,
    subjectCode: string
  ): Promise<number> {
    const config = await this.getSubjectConfig(examId, subjectCode);
    return config?.total_score || 100;
  }

  /**
   * 计算考试统计信息（使用数据库配置）
   */
  public async calculateExamStatistics(
    examId: string,
    grades: any[]
  ): Promise<{
    passRate: number;
    excellentRate: number;
    averageScore: number;
    totalParticipants: number;
    passCount: number;
    excellentCount: number;
    subjectStats: { [subject: string]: ScoreCalculationResult };
  }> {
    try {
      console.log(`[ExamScoreCalculation] 计算考试 ${examId} 的统计信息`);

      // 获取考试科目配置
      const subjectConfigs = await this.getExamSubjectConfig(examId);
      const configMap = new Map(
        subjectConfigs.map((config) => [config.subject_code, config])
      );

      if (subjectConfigs.length === 0) {
        console.warn(
          `[ExamScoreCalculation] 考试 ${examId} 没有科目配置，使用默认设置`
        );
      }

      // 计算总分统计
      const totalScores = grades
        .map((g) => g.total_score)
        .filter((s) => s !== null && s !== undefined && !isNaN(s))
        .map((s) => Number(s));

      const totalParticipants = totalScores.length;
      const averageScore =
        totalParticipants > 0
          ? totalScores.reduce((sum, score) => sum + score, 0) /
            totalParticipants
          : 0;

      // 计算总分的及格率和优秀率
      let totalPassThreshold = 60;
      let totalExcellentThreshold = 90;

      // 如果有科目配置，使用配置的阈值
      if (subjectConfigs.length > 0) {
        const totalPassScores = subjectConfigs
          .filter((config) => config.is_required)
          .map((config) => config.passing_score);
        const totalExcellentScores = subjectConfigs
          .filter((config) => config.is_required)
          .map((config) => config.excellent_score);

        if (totalPassScores.length > 0) {
          totalPassThreshold =
            totalPassScores.reduce((sum, score) => sum + score, 0) /
            totalPassScores.length;
        }
        if (totalExcellentScores.length > 0) {
          totalExcellentThreshold =
            totalExcellentScores.reduce((sum, score) => sum + score, 0) /
            totalExcellentScores.length;
        }
      }

      const passCount = totalScores.filter(
        (score) => score >= totalPassThreshold
      ).length;
      const excellentCount = totalScores.filter(
        (score) => score >= totalExcellentThreshold
      ).length;

      const passRate =
        totalParticipants > 0 ? (passCount / totalParticipants) * 100 : 0;
      const excellentRate =
        totalParticipants > 0 ? (excellentCount / totalParticipants) * 100 : 0;

      // 计算各科目统计
      const subjectStats: { [subject: string]: ScoreCalculationResult } = {};

      // 标准科目列表
      const subjects = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "biology",
        "politics",
        "history",
        "geography",
      ];

      for (const subject of subjects) {
        const scores = grades
          .map((g) => g[`${subject}_score`])
          .filter((s) => s !== null && s !== undefined && !isNaN(s))
          .map((s) => Number(s));

        if (scores.length === 0) {
          subjectStats[subject] = {
            passRate: 0,
            excellentRate: 0,
            averageScore: 0,
            totalParticipants: 0,
            passCount: 0,
            excellentCount: 0,
          };
          continue;
        }

        const config = configMap.get(subject);
        const subjectPassThreshold = config?.passing_score || 60;
        const subjectExcellentThreshold = config?.excellent_score || 90;

        const subjectPassCount = scores.filter(
          (score) => score >= subjectPassThreshold
        ).length;
        const subjectExcellentCount = scores.filter(
          (score) => score >= subjectExcellentThreshold
        ).length;
        const subjectAverage =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;

        subjectStats[subject] = {
          passRate: (subjectPassCount / scores.length) * 100,
          excellentRate: (subjectExcellentCount / scores.length) * 100,
          averageScore: subjectAverage,
          totalParticipants: scores.length,
          passCount: subjectPassCount,
          excellentCount: subjectExcellentCount,
        };
      }

      console.log(
        `[ExamScoreCalculation] 计算完成 - 及格率: ${passRate.toFixed(1)}%, 优秀率: ${excellentRate.toFixed(1)}%`
      );

      return {
        passRate: Math.round(passRate * 100) / 100,
        excellentRate: Math.round(excellentRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
        totalParticipants,
        passCount,
        excellentCount,
        subjectStats,
      };
    } catch (error) {
      console.error(`[ExamScoreCalculation] 计算统计信息失败:`, error);
      throw error;
    }
  }

  /**
   * 判断分数是否及格
   */
  public async isPass(
    examId: string,
    subjectCode: string,
    score: number
  ): Promise<boolean> {
    const passingScore = await this.getPassingScore(examId, subjectCode);
    return score >= passingScore;
  }

  /**
   * 判断分数是否优秀
   */
  public async isExcellent(
    examId: string,
    subjectCode: string,
    score: number
  ): Promise<boolean> {
    const excellentScore = await this.getExcellentScore(examId, subjectCode);
    return score >= excellentScore;
  }

  /**
   * 获取分数等级
   */
  public async getGradeLevel(
    examId: string,
    subjectCode: string,
    score: number
  ): Promise<string> {
    const isExcellentResult = await this.isExcellent(
      examId,
      subjectCode,
      score
    );
    const isPassResult = await this.isPass(examId, subjectCode, score);

    if (isExcellentResult) return "优秀";
    if (isPassResult) return "及格";
    return "不及格";
  }

  /**
   * 清除缓存
   */
  public clearCache(examId?: string): void {
    if (examId) {
      this.configCache.delete(examId);
      this.lastCacheUpdate.delete(examId);
      console.log(`[ExamScoreCalculation] 清除考试 ${examId} 的缓存`);
    } else {
      this.configCache.clear();
      this.lastCacheUpdate.clear();
      console.log(`[ExamScoreCalculation] 清除所有缓存`);
    }
  }

  /**
   * 预热缓存（可选，用于性能优化）
   */
  public async preloadConfigs(examIds: string[]): Promise<void> {
    console.log(
      `[ExamScoreCalculation] 预热 ${examIds.length} 个考试的配置缓存`
    );

    const promises = examIds.map((examId) =>
      this.loadExamSubjectConfig(examId).catch((error) => {
        console.error(
          `[ExamScoreCalculation] 预热考试 ${examId} 配置失败:`,
          error
        );
        return [];
      })
    );

    await Promise.all(promises);
    console.log(`[ExamScoreCalculation] 缓存预热完成`);
  }
}

// 导出单例实例
export const examScoreCalculationService =
  ExamScoreCalculationService.getInstance();

// 便捷函数
export const getExamPassingScore = (
  examId: string,
  subjectCode: string
): Promise<number> =>
  examScoreCalculationService.getPassingScore(examId, subjectCode);

export const getExamExcellentScore = (
  examId: string,
  subjectCode: string
): Promise<number> =>
  examScoreCalculationService.getExcellentScore(examId, subjectCode);

export const getExamTotalScore = (
  examId: string,
  subjectCode: string
): Promise<number> =>
  examScoreCalculationService.getTotalScore(examId, subjectCode);

export const calculateExamStatistics = (examId: string, grades: any[]) =>
  examScoreCalculationService.calculateExamStatistics(examId, grades);

export const isExamPass = (
  examId: string,
  subjectCode: string,
  score: number
): Promise<boolean> =>
  examScoreCalculationService.isPass(examId, subjectCode, score);

export const isExamExcellent = (
  examId: string,
  subjectCode: string,
  score: number
): Promise<boolean> =>
  examScoreCalculationService.isExcellent(examId, subjectCode, score);

export const getExamGradeLevel = (
  examId: string,
  subjectCode: string,
  score: number
): Promise<string> =>
  examScoreCalculationService.getGradeLevel(examId, subjectCode, score);
