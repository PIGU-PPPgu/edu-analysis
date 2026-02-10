/**
 * 及格率计算服务
 * 根据科目配置动态计算及格率，替代硬编码的60分及格线
 * ✨ 新增：支持基于等级的及格率/优秀率计算
 */

import { SUBJECT_MAX_SCORES } from "@/utils/gradeUtils";
import { Subject } from "@/types/grade";
import {
  assignGradesWithFallback,
  GradeLevel,
  type GradeLevelInfo,
} from "@/utils/gradeUtils";

// 科目配置接口
interface SubjectConfig {
  name: string;
  displayName: string;
  maxScore: number;
  passScore: number;
  excellentScore: number;
  isCustom: boolean;
}

// 及格率计算器类
export class PassRateCalculator {
  private static instance: PassRateCalculator;
  private subjectConfigs: Map<string, SubjectConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  public static getInstance(): PassRateCalculator {
    if (!PassRateCalculator.instance) {
      PassRateCalculator.instance = new PassRateCalculator();
    }
    return PassRateCalculator.instance;
  }

  // 初始化默认配置
  private initializeDefaultConfigs() {
    const defaultSubjects = [
      { key: Subject.TOTAL, name: "总分", maxScore: 660 },
      { key: Subject.CHINESE, name: "语文", maxScore: 120 },
      { key: Subject.MATH, name: "数学", maxScore: 100 },
      { key: Subject.ENGLISH, name: "英语", maxScore: 100 },
      { key: Subject.PHYSICS, name: "物理", maxScore: 70 },
      { key: Subject.CHEMISTRY, name: "化学", maxScore: 50 },
      { key: Subject.POLITICS, name: "道法", maxScore: 50 },
      { key: Subject.HISTORY, name: "历史", maxScore: 70 },
      { key: "biology", name: "生物", maxScore: 50 },
      { key: "geography", name: "地理", maxScore: 50 },
    ];

    defaultSubjects.forEach((subject) => {
      const config: SubjectConfig = {
        name: subject.key,
        displayName: subject.name,
        maxScore: subject.maxScore,
        passScore: Math.round(subject.maxScore * 0.6), // 60%及格
        excellentScore: Math.round(subject.maxScore * 0.85), // 85%优秀
        isCustom: false,
      };
      this.subjectConfigs.set(subject.key, config);
    });
  }

  /**
   * 更新科目配置
   * @param configs 科目配置数组
   */
  public updateSubjectConfigs(configs: SubjectConfig[]): void {
    this.subjectConfigs.clear();
    configs.forEach((config) => {
      this.subjectConfigs.set(config.name, config);
    });
  }

  /**
   * 获取科目的及格分数线
   * @param subject 科目名称
   * @returns 及格分数线
   */
  public getPassScore(subject: string): number {
    const config = this.subjectConfigs.get(subject);
    if (config) {
      return config.passScore;
    }

    // 如果没有配置，尝试使用枚举值
    for (const [key, value] of Object.entries(Subject)) {
      if (value === subject || key.toLowerCase() === subject.toLowerCase()) {
        const maxScore = SUBJECT_MAX_SCORES[value] || 100;
        return Math.round(maxScore * 0.6);
      }
    }

    // 默认60分及格
    return 60;
  }

  /**
   * 获取科目的优秀分数线
   * @param subject 科目名称
   * @returns 优秀分数线
   */
  public getExcellentScore(subject: string): number {
    const config = this.subjectConfigs.get(subject);
    if (config) {
      return config.excellentScore;
    }

    // 如果没有配置，尝试使用枚举值
    for (const [key, value] of Object.entries(Subject)) {
      if (value === subject || key.toLowerCase() === subject.toLowerCase()) {
        const maxScore = SUBJECT_MAX_SCORES[value] || 100;
        return Math.round(maxScore * 0.85);
      }
    }

    // 默认85分优秀
    return 85;
  }

  /**
   * 获取科目的满分
   * @param subject 科目名称
   * @returns 满分
   */
  public getMaxScore(subject: string): number {
    const config = this.subjectConfigs.get(subject);
    if (config) {
      return config.maxScore;
    }

    // 如果没有配置，尝试使用枚举值
    for (const [key, value] of Object.entries(Subject)) {
      if (value === subject || key.toLowerCase() === subject.toLowerCase()) {
        return SUBJECT_MAX_SCORES[value] || 100;
      }
    }

    // 默认100分满分
    return 100;
  }

  /**
   * 计算单个科目的及格率
   * @param scores 分数数组
   * @param subject 科目名称
   * @returns 及格率（0-100）
   */
  public calculatePassRate(scores: number[], subject: string): number {
    if (!scores.length) return 0;

    const passScore = this.getPassScore(subject);
    const passCount = scores.filter((score) => score >= passScore).length;
    return Math.round((passCount / scores.length) * 100 * 100) / 100; // 保留两位小数
  }

  /**
   * 计算单个科目的优秀率
   * @param scores 分数数组
   * @param subject 科目名称
   * @returns 优秀率（0-100）
   */
  public calculateExcellentRate(scores: number[], subject: string): number {
    if (!scores.length) return 0;

    const excellentScore = this.getExcellentScore(subject);
    const excellentCount = scores.filter(
      (score) => score >= excellentScore
    ).length;
    return Math.round((excellentCount / scores.length) * 100 * 100) / 100; // 保留两位小数
  }

  /**
   * 判断分数是否及格
   * @param score 分数
   * @param subject 科目名称
   * @returns 是否及格
   */
  public isPass(score: number, subject: string): boolean {
    return score >= this.getPassScore(subject);
  }

  /**
   * 判断分数是否优秀
   * @param score 分数
   * @param subject 科目名称
   * @returns 是否优秀
   */
  public isExcellent(score: number, subject: string): boolean {
    return score >= this.getExcellentScore(subject);
  }

  /**
   * 获取分数等级
   * @param score 分数
   * @param subject 科目名称
   * @returns 等级字符串
   */
  public getGradeLevel(score: number, subject: string): string {
    const excellentScore = this.getExcellentScore(subject);
    const passScore = this.getPassScore(subject);
    const maxScore = this.getMaxScore(subject);

    if (score >= excellentScore) return "优秀";
    if (score >= passScore) return "及格";
    return "不及格";
  }

  /**
   * 计算总分及格率（使用总分科目配置）
   * @param totalScores 总分数组
   * @returns 及格率（0-100）
   */
  public calculateTotalPassRate(totalScores: number[]): number {
    return this.calculatePassRate(totalScores, Subject.TOTAL);
  }

  /**
   * 批量计算多个科目的及格率
   * @param gradeData 成绩数据 { [subject: string]: number[] }
   * @returns 及格率统计 { [subject: string]: { passRate: number, excellentRate: number } }
   */
  public calculateBatchPassRates(gradeData: { [subject: string]: number[] }): {
    [subject: string]: { passRate: number; excellentRate: number };
  } {
    const result: {
      [subject: string]: { passRate: number; excellentRate: number };
    } = {};

    for (const [subject, scores] of Object.entries(gradeData)) {
      result[subject] = {
        passRate: this.calculatePassRate(scores, subject),
        excellentRate: this.calculateExcellentRate(scores, subject),
      };
    }

    return result;
  }

  /**
   * 获取所有科目配置
   * @returns 科目配置数组
   */
  public getAllConfigs(): SubjectConfig[] {
    return Array.from(this.subjectConfigs.values());
  }

  /**
   * 获取特定科目配置
   * @param subject 科目名称
   * @returns 科目配置或undefined
   */
  public getSubjectConfig(subject: string): SubjectConfig | undefined {
    return this.subjectConfigs.get(subject);
  }

  /**
   * 从本地存储加载配置
   */
  public loadConfigsFromStorage(): void {
    try {
      const stored = localStorage.getItem("subjectMaxScoreConfigs");
      if (stored) {
        const configs: SubjectConfig[] = JSON.parse(stored);
        this.updateSubjectConfigs(configs);
      }
    } catch (error) {
      console.warn("Failed to load subject configs from storage:", error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  public saveConfigsToStorage(): void {
    try {
      const configs = this.getAllConfigs();
      localStorage.setItem("subjectMaxScoreConfigs", JSON.stringify(configs));
    } catch (error) {
      console.warn("Failed to save subject configs to storage:", error);
    }
  }
}

// 导出单例实例
export const passRateCalculator = PassRateCalculator.getInstance();

// 便捷函数
export const getPassScore = (subject: string): number =>
  passRateCalculator.getPassScore(subject);
export const getExcellentScore = (subject: string): number =>
  passRateCalculator.getExcellentScore(subject);
export const getMaxScore = (subject: string): number =>
  passRateCalculator.getMaxScore(subject);
export const calculatePassRate = (scores: number[], subject: string): number =>
  passRateCalculator.calculatePassRate(scores, subject);
export const calculateExcellentRate = (
  scores: number[],
  subject: string
): number => passRateCalculator.calculateExcellentRate(scores, subject);
export const isPass = (score: number, subject: string): boolean =>
  passRateCalculator.isPass(score, subject);
export const isExcellent = (score: number, subject: string): boolean =>
  passRateCalculator.isExcellent(score, subject);
export const getGradeLevel = (score: number, subject: string): string =>
  passRateCalculator.getGradeLevel(score, subject);

// ============================================
// ✨ 新增：基于等级的及格率/优秀率计算
// 决策：采用等级定义方案
// - 优秀率 = A+ + A（前25%）
// - 及格率 = A+ 到 C+（前95%）
// - 不及格率 = C（后5%）
// ============================================

/**
 * 基于等级计算及格率
 * ✅ 新方法：优先使用导入等级，缺失时基于排名计算
 * @param records 成绩记录数组（需包含分数和可选的等级字段）
 * @param subject 科目
 * @param scoreField 分数字段名
 * @param gradeField 等级字段名（可选）
 * @returns 及格率（0-100）
 */
export function calculatePassRateByGrade<T extends { [key: string]: any }>(
  records: T[],
  subject: string,
  scoreField: string = "total_score",
  gradeField?: string
): number {
  if (records.length === 0) return 0;

  // 使用 assignGradesWithFallback 分配等级
  const recordsWithGrades = assignGradesWithFallback(
    records,
    subject,
    scoreField,
    gradeField
  );

  // 及格 = A+ 到 C+（前95%）
  const passGrades = [
    GradeLevel.A_PLUS,
    GradeLevel.A,
    GradeLevel.B_PLUS,
    GradeLevel.B,
    GradeLevel.C_PLUS,
  ];

  const passCount = recordsWithGrades.filter((record) =>
    passGrades.includes(record.resolvedGrade.level)
  ).length;

  return Number(((passCount / records.length) * 100).toFixed(2));
}

/**
 * 基于等级计算优秀率
 * ✅ 新方法：优秀 = A+ + A（前25%）
 * @param records 成绩记录数组
 * @param subject 科目
 * @param scoreField 分数字段名
 * @param gradeField 等级字段名（可选）
 * @returns 优秀率（0-100）
 */
export function calculateExcellentRateByGrade<T extends { [key: string]: any }>(
  records: T[],
  subject: string,
  scoreField: string = "total_score",
  gradeField?: string
): number {
  if (records.length === 0) return 0;

  // 使用 assignGradesWithFallback 分配等级
  const recordsWithGrades = assignGradesWithFallback(
    records,
    subject,
    scoreField,
    gradeField
  );

  // 优秀 = A+ + A（前25%）
  const excellentGrades = [GradeLevel.A_PLUS, GradeLevel.A];

  const excellentCount = recordsWithGrades.filter((record) =>
    excellentGrades.includes(record.resolvedGrade.level)
  ).length;

  return Number(((excellentCount / records.length) * 100).toFixed(2));
}

/**
 * 基于等级计算不及格率
 * ✅ 新方法：不及格 = C（后5%）
 * @param records 成绩记录数组
 * @param subject 科目
 * @param scoreField 分数字段名
 * @param gradeField 等级字段名（可选）
 * @returns 不及格率（0-100）
 */
export function calculateFailRateByGrade<T extends { [key: string]: any }>(
  records: T[],
  subject: string,
  scoreField: string = "total_score",
  gradeField?: string
): number {
  if (records.length === 0) return 0;

  const recordsWithGrades = assignGradesWithFallback(
    records,
    subject,
    scoreField,
    gradeField
  );

  // 不及格 = C（后5%）
  const failCount = recordsWithGrades.filter(
    (record) => record.resolvedGrade.level === GradeLevel.C
  ).length;

  return Number(((failCount / records.length) * 100).toFixed(2));
}

/**
 * 批量计算基于等级的及格率/优秀率
 * @param records 成绩记录数组
 * @param subjects 科目列表
 * @returns 各科目的及格率和优秀率
 */
export function calculateBatchRatesByGrade<T extends { [key: string]: any }>(
  records: T[],
  subjects: Array<{ name: string; scoreField: string; gradeField?: string }>
): Record<
  string,
  { passRate: number; excellentRate: number; failRate: number }
> {
  const result: Record<
    string,
    { passRate: number; excellentRate: number; failRate: number }
  > = {};

  subjects.forEach(({ name, scoreField, gradeField }) => {
    result[name] = {
      passRate: calculatePassRateByGrade(records, name, scoreField, gradeField),
      excellentRate: calculateExcellentRateByGrade(
        records,
        name,
        scoreField,
        gradeField
      ),
      failRate: calculateFailRateByGrade(records, name, scoreField, gradeField),
    };
  });

  return result;
}

// 初始化时从本地存储加载配置
passRateCalculator.loadConfigsFromStorage();
