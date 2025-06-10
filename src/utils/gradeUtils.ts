// 统一的等级计算工具函数

import { 
  GradeRecord, 
  Subject, 
  GradeLevel, 
  GradeLevelInfo, 
  GradeLevelDistribution 
} from '@/types/grade';
import { 
  getSubjectScore, 
  getSubjectGrade, 
  normalizeGradeLevel 
} from '@/utils/gradeFieldUtils';

// 学科满分配置 - 根据用户反馈修正
export const SUBJECT_MAX_SCORES: Record<Subject | string, number> = {
  [Subject.TOTAL]: 523,
  [Subject.CHINESE]: 120,
  [Subject.MATH]: 100,
  [Subject.ENGLISH]: 75,
  [Subject.PHYSICS]: 63,    // 用户确认：物理63分就是满分
  [Subject.CHEMISTRY]: 45,
  [Subject.POLITICS]: 50,    // 道法
  [Subject.HISTORY]: 70
};

// 等级配置 - 添加B+等级支持
export const GRADE_LEVELS: Record<GradeLevel | string, GradeLevelInfo> = {
  [GradeLevel.A_PLUS]: {
    level: GradeLevel.A_PLUS,
    displayName: '优秀',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: '🏆',
    description: '优秀',
    minPercentage: 90,
    maxPercentage: 100
  },
  [GradeLevel.A]: {
    level: GradeLevel.A,
    displayName: '良好',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: '🥇',
    description: '良好',
    minPercentage: 80,
    maxPercentage: 89.99
  },
  [GradeLevel.B_PLUS]: {
    level: GradeLevel.B_PLUS,
    displayName: '中上',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: '🥈',
    description: '中上',
    minPercentage: 70,
    maxPercentage: 79.99
  },
  [GradeLevel.B]: {
    level: GradeLevel.B,
    displayName: '中等',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: '📈',
    description: '中等',
    minPercentage: 60,
    maxPercentage: 69.99
  },
  [GradeLevel.C_PLUS]: {
    level: GradeLevel.C_PLUS,
    displayName: '及格',
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    icon: '✅',
    description: '及格',
    minPercentage: 50,
    maxPercentage: 59.99
  },
  [GradeLevel.C]: {
    level: GradeLevel.C,
    displayName: '待提高',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: '⚠️',
    description: '待提高',
    minPercentage: 0,
    maxPercentage: 49.99
  }
};

/**
 * 获取等级信息 - 优先使用原始等级数据，如果没有才计算
 * @param record 成绩记录或分数
 * @param subject 科目
 * @param originalGrade 原始等级数据（可选）
 * @returns 等级信息
 */
export function getGradeLevelInfo(
  record: GradeRecord | number | string, 
  subject: Subject | string = Subject.TOTAL,
  originalGrade?: string
): GradeLevelInfo {
  let score: number;
  let gradeLevel: string = '';
  
  // 处理不同的输入类型
  if (typeof record === 'object') {
    score = getSubjectScore(record, subject);
    gradeLevel = originalGrade || getSubjectGrade(record, subject);
  } else {
    score = typeof record === 'string' ? parseFloat(record) : record;
    gradeLevel = originalGrade || '';
  }
  
  // 如果有原始等级数据且格式正确，优先使用
  if (gradeLevel && gradeLevel.trim() !== '') {
    const normalizedGrade = normalizeGradeLevel(gradeLevel);
    const gradeInfo = GRADE_LEVELS[normalizedGrade];
    if (gradeInfo) {
      return {
        level: gradeInfo.level,
        displayName: gradeInfo.displayName,
        color: gradeInfo.color,
        icon: gradeInfo.icon,
        description: gradeInfo.description,
        minPercentage: gradeInfo.minPercentage,
        maxPercentage: gradeInfo.maxPercentage
      };
    }
  }
  
  // 如果没有原始等级数据，根据分数计算
  const maxScore = SUBJECT_MAX_SCORES[subject] || 100;
  const percentage = (score / maxScore) * 100;
  
  // 根据百分比确定等级
  for (const gradeInfo of Object.values(GRADE_LEVELS)) {
    if (percentage >= gradeInfo.minPercentage && percentage <= gradeInfo.maxPercentage) {
      return {
        level: gradeInfo.level,
        displayName: gradeInfo.displayName,
        color: gradeInfo.color,
        icon: gradeInfo.icon,
        description: gradeInfo.description,
        minPercentage: gradeInfo.minPercentage,
        maxPercentage: gradeInfo.maxPercentage
      };
    }
  }
  
  // 默认返回C等级
  const defaultGrade = GRADE_LEVELS[GradeLevel.C];
  return {
    level: defaultGrade.level,
    displayName: defaultGrade.displayName,
    color: defaultGrade.color,
    icon: defaultGrade.icon,
    description: defaultGrade.description,
    minPercentage: defaultGrade.minPercentage,
    maxPercentage: defaultGrade.maxPercentage
  };
}

/**
 * 获取所有等级列表（用于统计）
 * @returns 等级数组
 */
export const getAllLevels = (): GradeLevel[] => {
  return [
    GradeLevel.A_PLUS, 
    GradeLevel.A, 
    GradeLevel.B_PLUS, 
    GradeLevel.B, 
    GradeLevel.C_PLUS, 
    GradeLevel.C
  ];
};

/**
 * 计算等级分布
 * @param gradeData 成绩数据
 * @param subject 科目
 * @returns 等级分布数组
 */
export const calculateGradeLevelDistribution = (
  gradeData: GradeRecord[], 
  subject: Subject | string
): GradeLevelDistribution[] => {
  if (!gradeData || gradeData.length === 0) {
    return [];
  }
  
  const distribution: Record<string, number> = {};
  const totalCount = gradeData.length;
  
  gradeData.forEach(grade => {
    const gradeInfo = getGradeLevelInfo(grade, subject);
    const level = gradeInfo.level;
    
    if (level) {
      if (distribution[level] === undefined) {
        distribution[level] = 0;
      }
      distribution[level]++;
    }
  });
  
  // 确保显示所有等级（包括0人数的等级）
  const allLevels = getAllLevels();
  
  return allLevels.map(level => {
    const gradeInfo = GRADE_LEVELS[level];
    return {
      level,
      name: gradeInfo?.displayName || `📊 ${level}`,
      count: distribution[level] || 0,
      percentage: totalCount > 0 ? ((distribution[level] || 0) / totalCount) * 100 : 0,
      color: gradeInfo?.color || '#6b7280',
      icon: gradeInfo?.icon || '📊'
    };
  }).sort((a, b) => {
    const aInfo = GRADE_LEVELS[a.level];
    const bInfo = GRADE_LEVELS[b.level];
    return (bInfo?.minPercentage || 0) - (aInfo?.minPercentage || 0);
  });
};

/**
 * 根据科目获取满分
 * @param subject 科目
 * @returns 满分
 */
export function getMaxScore(subject: Subject | string): number {
  return SUBJECT_MAX_SCORES[subject] || 100;
}

/**
 * 计算等级百分比阈值
 * @param subject 科目
 * @returns 等级阈值对象
 */
export function getGradeThresholds(subject: Subject | string): Record<GradeLevel, number> {
  const maxScore = getMaxScore(subject);
  
  return {
    [GradeLevel.A_PLUS]: maxScore * 0.9,
    [GradeLevel.A]: maxScore * 0.8,
    [GradeLevel.B_PLUS]: maxScore * 0.7,
    [GradeLevel.B]: maxScore * 0.6,
    [GradeLevel.C_PLUS]: maxScore * 0.5,
    [GradeLevel.C]: 0
  };
}

/**
 * 检查分数是否达到指定等级
 * @param score 分数
 * @param targetLevel 目标等级
 * @param subject 科目
 * @returns 是否达到等级
 */
export function isScoreAtLevel(
  score: number, 
  targetLevel: GradeLevel, 
  subject: Subject | string
): boolean {
  const thresholds = getGradeThresholds(subject);
  return score >= thresholds[targetLevel];
} 