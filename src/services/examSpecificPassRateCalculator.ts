/**
 * 考试特定的及格率计算服务
 * 支持为每次考试设置不同的科目满分和及格线
 */

import { SUBJECT_MAX_SCORES } from '@/utils/gradeUtils';
import { Subject } from '@/types/grade';

// 科目配置接口
interface SubjectConfig {
  name: string;
  displayName: string;
  maxScore: number;
  passScore: number;
  excellentScore: number;
  isCustom: boolean;
}

// 考试配置接口
interface ExamConfig {
  examId: string;
  examName: string;
  subjects: Map<string, SubjectConfig>;
  createdAt: Date;
  updatedAt: Date;
}

// 考试特定的及格率计算器
export class ExamSpecificPassRateCalculator {
  private static instance: ExamSpecificPassRateCalculator;
  private examConfigs: Map<string, ExamConfig> = new Map();
  private globalConfig: Map<string, SubjectConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
    this.loadConfigsFromStorage();
  }

  public static getInstance(): ExamSpecificPassRateCalculator {
    if (!ExamSpecificPassRateCalculator.instance) {
      ExamSpecificPassRateCalculator.instance = new ExamSpecificPassRateCalculator();
    }
    return ExamSpecificPassRateCalculator.instance;
  }

  // 初始化默认全局配置
  private initializeDefaultConfigs() {
    const defaultSubjects = [
      { key: Subject.TOTAL, name: '总分', maxScore: 523 },
      { key: Subject.CHINESE, name: '语文', maxScore: 120 },
      { key: Subject.MATH, name: '数学', maxScore: 100 },
      { key: Subject.ENGLISH, name: '英语', maxScore: 75 },
      { key: Subject.PHYSICS, name: '物理', maxScore: 63 },
      { key: Subject.CHEMISTRY, name: '化学', maxScore: 45 },
      { key: Subject.POLITICS, name: '道法', maxScore: 50 },
      { key: Subject.HISTORY, name: '历史', maxScore: 70 }
    ];

    defaultSubjects.forEach(subject => {
      const config: SubjectConfig = {
        name: subject.key,
        displayName: subject.name,
        maxScore: subject.maxScore,
        passScore: Math.round(subject.maxScore * 0.6),
        excellentScore: Math.round(subject.maxScore * 0.85),
        isCustom: false
      };
      this.globalConfig.set(subject.key, config);
    });
  }

  /**
   * 为特定考试设置科目配置
   * @param examId 考试ID
   * @param examName 考试名称
   * @param subjectConfigs 科目配置数组
   */
  public setExamConfig(examId: string, examName: string, subjectConfigs: SubjectConfig[]): void {
    const subjects = new Map<string, SubjectConfig>();
    subjectConfigs.forEach(config => {
      subjects.set(config.name, config);
    });

    const examConfig: ExamConfig = {
      examId,
      examName,
      subjects,
      createdAt: this.examConfigs.get(examId)?.createdAt || new Date(),
      updatedAt: new Date()
    };

    this.examConfigs.set(examId, examConfig);
    this.saveConfigsToStorage();
  }

  /**
   * 获取考试特定的及格分数线
   * @param subject 科目名称
   * @param examId 考试ID（可选，不提供则使用全局配置）
   * @returns 及格分数线
   */
  public getPassScore(subject: string, examId?: string): number {
    // 优先使用考试特定配置
    if (examId) {
      const examConfig = this.examConfigs.get(examId);
      if (examConfig) {
        const subjectConfig = examConfig.subjects.get(subject);
        if (subjectConfig) {
          return subjectConfig.passScore;
        }
      }
    }

    // 使用全局配置
    const globalConfig = this.globalConfig.get(subject);
    if (globalConfig) {
      return globalConfig.passScore;
    }

    // 默认计算
    for (const [key, value] of Object.entries(Subject)) {
      if (value === subject || key.toLowerCase() === subject.toLowerCase()) {
        const maxScore = SUBJECT_MAX_SCORES[value] || 100;
        return Math.round(maxScore * 0.6);
      }
    }

    return 60;
  }

  /**
   * 获取考试特定的优秀分数线
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 优秀分数线
   */
  public getExcellentScore(subject: string, examId?: string): number {
    // 优先使用考试特定配置
    if (examId) {
      const examConfig = this.examConfigs.get(examId);
      if (examConfig) {
        const subjectConfig = examConfig.subjects.get(subject);
        if (subjectConfig) {
          return subjectConfig.excellentScore;
        }
      }
    }

    // 使用全局配置
    const globalConfig = this.globalConfig.get(subject);
    if (globalConfig) {
      return globalConfig.excellentScore;
    }

    // 默认计算
    for (const [key, value] of Object.entries(Subject)) {
      if (value === subject || key.toLowerCase() === subject.toLowerCase()) {
        const maxScore = SUBJECT_MAX_SCORES[value] || 100;
        return Math.round(maxScore * 0.85);
      }
    }

    return 85;
  }

  /**
   * 获取考试特定的满分
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 满分
   */
  public getMaxScore(subject: string, examId?: string): number {
    // 优先使用考试特定配置
    if (examId) {
      const examConfig = this.examConfigs.get(examId);
      if (examConfig) {
        const subjectConfig = examConfig.subjects.get(subject);
        if (subjectConfig) {
          return subjectConfig.maxScore;
        }
      }
    }

    // 使用全局配置
    const globalConfig = this.globalConfig.get(subject);
    if (globalConfig) {
      return globalConfig.maxScore;
    }

    // 默认值
    return SUBJECT_MAX_SCORES[subject as Subject] || 100;
  }

  /**
   * 计算考试特定的及格率
   * @param scores 分数数组
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 及格率（0-100）
   */
  public calculatePassRate(scores: number[], subject: string, examId?: string): number {
    if (scores.length === 0) return 0;
    
    const passScore = this.getPassScore(subject, examId);
    const passCount = scores.filter(score => score >= passScore).length;
    return Math.round((passCount / scores.length) * 100);
  }

  /**
   * 计算考试特定的优秀率
   * @param scores 分数数组
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 优秀率（0-100）
   */
  public calculateExcellentRate(scores: number[], subject: string, examId?: string): number {
    if (scores.length === 0) return 0;
    
    const excellentScore = this.getExcellentScore(subject, examId);
    const excellentCount = scores.filter(score => score >= excellentScore).length;
    return Math.round((excellentCount / scores.length) * 100);
  }

  /**
   * 判断是否及格
   * @param score 分数
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 是否及格
   */
  public isPass(score: number, subject: string, examId?: string): boolean {
    return score >= this.getPassScore(subject, examId);
  }

  /**
   * 判断是否优秀
   * @param score 分数
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 是否优秀
   */
  public isExcellent(score: number, subject: string, examId?: string): boolean {
    return score >= this.getExcellentScore(subject, examId);
  }

  /**
   * 获取成绩等级
   * @param score 分数
   * @param subject 科目名称
   * @param examId 考试ID（可选）
   * @returns 成绩等级
   */
  public getGradeLevel(score: number, subject: string, examId?: string): string {
    const passScore = this.getPassScore(subject, examId);
    const excellentScore = this.getExcellentScore(subject, examId);
    
    if (score >= excellentScore) return '优秀';
    if (score >= passScore) return '及格';
    return '不及格';
  }

  /**
   * 获取所有考试配置列表
   * @returns 考试配置数组
   */
  public getAllExamConfigs(): ExamConfig[] {
    return Array.from(this.examConfigs.values());
  }

  /**
   * 获取特定考试的配置
   * @param examId 考试ID
   * @returns 考试配置或undefined
   */
  public getExamConfig(examId: string): ExamConfig | undefined {
    return this.examConfigs.get(examId);
  }

  /**
   * 获取全局配置
   * @returns 全局配置数组
   */
  public getGlobalConfigs(): SubjectConfig[] {
    return Array.from(this.globalConfig.values());
  }

  /**
   * 删除考试配置
   * @param examId 考试ID
   */
  public deleteExamConfig(examId: string): boolean {
    const deleted = this.examConfigs.delete(examId);
    if (deleted) {
      this.saveConfigsToStorage();
    }
    return deleted;
  }

  /**
   * 复制考试配置
   * @param sourceExamId 源考试ID
   * @param targetExamId 目标考试ID
   * @param targetExamName 目标考试名称
   */
  public copyExamConfig(sourceExamId: string, targetExamId: string, targetExamName: string): boolean {
    const sourceConfig = this.examConfigs.get(sourceExamId);
    if (!sourceConfig) return false;

    const targetConfig: ExamConfig = {
      examId: targetExamId,
      examName: targetExamName,
      subjects: new Map(sourceConfig.subjects),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.examConfigs.set(targetExamId, targetConfig);
    this.saveConfigsToStorage();
    return true;
  }

  /**
   * 更新全局默认配置
   * @param subjectConfigs 科目配置数组
   */
  public updateGlobalConfig(subjectConfigs: SubjectConfig[]): void {
    subjectConfigs.forEach(config => {
      this.globalConfig.set(config.name, config);
    });
    this.saveConfigsToStorage();
  }

  /**
   * 从本地存储加载配置
   */
  private loadConfigsFromStorage(): void {
    try {
      // 加载全局配置
      const globalStored = localStorage.getItem('globalSubjectConfigs');
      if (globalStored) {
        const configs: SubjectConfig[] = JSON.parse(globalStored);
        configs.forEach(config => {
          this.globalConfig.set(config.name, config);
        });
      }

      // 加载考试特定配置
      const examStored = localStorage.getItem('examSpecificConfigs');
      if (examStored) {
        const examConfigs: any[] = JSON.parse(examStored);
        examConfigs.forEach(config => {
          const subjects = new Map<string, SubjectConfig>();
          if (config.subjects) {
            Object.entries(config.subjects).forEach(([key, value]) => {
              subjects.set(key, value as SubjectConfig);
            });
          }
          
          this.examConfigs.set(config.examId, {
            ...config,
            subjects,
            createdAt: new Date(config.createdAt),
            updatedAt: new Date(config.updatedAt)
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load exam specific configs from storage:', error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveConfigsToStorage(): void {
    try {
      // 保存全局配置
      const globalConfigs = Array.from(this.globalConfig.values());
      localStorage.setItem('globalSubjectConfigs', JSON.stringify(globalConfigs));

      // 保存考试特定配置
      const examConfigs = Array.from(this.examConfigs.values()).map(config => ({
        ...config,
        subjects: Object.fromEntries(config.subjects)
      }));
      localStorage.setItem('examSpecificConfigs', JSON.stringify(examConfigs));
    } catch (error) {
      console.warn('Failed to save exam specific configs to storage:', error);
    }
  }
}

// 导出单例实例
export const examSpecificPassRateCalculator = ExamSpecificPassRateCalculator.getInstance();

// 便捷函数
export const getPassScore = (subject: string, examId?: string): number => 
  examSpecificPassRateCalculator.getPassScore(subject, examId);

export const getExcellentScore = (subject: string, examId?: string): number => 
  examSpecificPassRateCalculator.getExcellentScore(subject, examId);

export const getMaxScore = (subject: string, examId?: string): number => 
  examSpecificPassRateCalculator.getMaxScore(subject, examId);

export const calculatePassRate = (scores: number[], subject: string, examId?: string): number => 
  examSpecificPassRateCalculator.calculatePassRate(scores, subject, examId);

export const calculateExcellentRate = (scores: number[], subject: string, examId?: string): number => 
  examSpecificPassRateCalculator.calculateExcellentRate(scores, subject, examId);

export const isPass = (score: number, subject: string, examId?: string): boolean => 
  examSpecificPassRateCalculator.isPass(score, subject, examId);

export const isExcellent = (score: number, subject: string, examId?: string): boolean => 
  examSpecificPassRateCalculator.isExcellent(score, subject, examId);

export const getGradeLevel = (score: number, subject: string, examId?: string): string => 
  examSpecificPassRateCalculator.getGradeLevel(score, subject, examId);

// 初始化时从本地存储加载配置
examSpecificPassRateCalculator.loadConfigsFromStorage(); 