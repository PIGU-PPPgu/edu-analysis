// 统一的等级计算工具函数

import {
  GradeRecord,
  Subject,
  GradeLevel,
  GradeLevelInfo,
  GradeLevelDistribution,
} from "@/types/grade";
import {
  getSubjectScore,
  getSubjectGrade,
  normalizeGradeLevel,
} from "@/utils/gradeFieldUtils";

// ============================================
// 重新导出类型，便于其他模块使用
// ============================================
export { GradeLevel, type GradeLevelInfo } from "@/types/grade";

// 学科满分配置 - 根据用户反馈修正
export const SUBJECT_MAX_SCORES: Record<Subject | string, number> = {
  [Subject.TOTAL]: 660,
  [Subject.CHINESE]: 120,
  [Subject.MATH]: 100,
  [Subject.ENGLISH]: 100,
  [Subject.PHYSICS]: 70,
  [Subject.CHEMISTRY]: 50,
  [Subject.POLITICS]: 50, // 道法
  [Subject.HISTORY]: 70,
  [Subject.BIOLOGY]: 50,
  [Subject.GEOGRAPHY]: 50,
};

// 等级配置 - 基于排名百分位（修正：不再使用分数百分比）
// ⚠️ 重要：minRankPercentile 和 maxRankPercentile 表示排名百分位
// 例如：A+ 是前5%，即 rankPercentile <= 5
export const GRADE_LEVELS: Record<GradeLevel | string, GradeLevelInfo> = {
  [GradeLevel.A_PLUS]: {
    level: GradeLevel.A_PLUS,
    displayName: "A+（前5%）",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: "🏆",
    description: "优秀（前5%）",
    minPercentage: 0, // 排名：0%
    maxPercentage: 5, // 排名：5%
  },
  [GradeLevel.A]: {
    level: GradeLevel.A,
    displayName: "A（5-25%）",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    icon: "🥇",
    description: "良好（5-25%）",
    minPercentage: 5, // 排名：5%
    maxPercentage: 25, // 排名：25%
  },
  [GradeLevel.B_PLUS]: {
    level: GradeLevel.B_PLUS,
    displayName: "B+（25-50%）",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: "🥈",
    description: "中上（25-50%）",
    minPercentage: 25, // 排名：25%
    maxPercentage: 50, // 排名：50%
  },
  [GradeLevel.B]: {
    level: GradeLevel.B,
    displayName: "B（50-75%）",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: "📈",
    description: "中等（50-75%）",
    minPercentage: 50, // 排名：50%
    maxPercentage: 75, // 排名：75%
  },
  [GradeLevel.C_PLUS]: {
    level: GradeLevel.C_PLUS,
    displayName: "C+（75-95%）",
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
    icon: "✅",
    description: "及格（75-95%）",
    minPercentage: 75, // 排名：75%
    maxPercentage: 95, // 排名：95%
  },
  [GradeLevel.C]: {
    level: GradeLevel.C,
    displayName: "C（后5%）",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    icon: "⚠️",
    description: "待提高（后5%）",
    minPercentage: 95, // 排名：95%
    maxPercentage: 100, // 排名：100%
  },
};

/**
 * 🚨 新增：基于排名百分位计算等级
 * 这是正确的等级计算方法！
 * @param rank 学生排名（1开始）
 * @param totalStudents 总学生数
 * @returns 等级信息
 */
export function calculateGradeByRank(
  rank: number,
  totalStudents: number
): GradeLevelInfo {
  if (totalStudents <= 0 || rank <= 0) {
    return GRADE_LEVELS[GradeLevel.C];
  }

  // 计算排名百分位：排名越小，百分位越小（越靠前）
  const rankPercentile = (rank / totalStudents) * 100;

  // 根据排名百分位确定等级
  if (rankPercentile <= 5) {
    return GRADE_LEVELS[GradeLevel.A_PLUS];
  } else if (rankPercentile <= 25) {
    return GRADE_LEVELS[GradeLevel.A];
  } else if (rankPercentile <= 50) {
    return GRADE_LEVELS[GradeLevel.B_PLUS];
  } else if (rankPercentile <= 75) {
    return GRADE_LEVELS[GradeLevel.B];
  } else if (rankPercentile <= 95) {
    return GRADE_LEVELS[GradeLevel.C_PLUS];
  } else {
    return GRADE_LEVELS[GradeLevel.C];
  }
}

/**
 * 获取等级信息 - 优先使用原始等级数据，如果没有才计算
 * ⚠️ 注意：此函数仍保留基于分数百分比的逻辑，用于向后兼容
 * ✅ 推荐使用 calculateGradeByRank 进行新的等级计算
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
  let gradeLevel: string = "";

  // 处理不同的输入类型
  if (typeof record === "object") {
    score = getSubjectScore(record, subject);
    gradeLevel = originalGrade || getSubjectGrade(record, subject);
  } else {
    score = typeof record === "string" ? parseFloat(record) : record;
    gradeLevel = originalGrade || "";
  }

  // 如果有原始等级数据且格式正确，优先使用
  if (gradeLevel && gradeLevel.trim() !== "") {
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
        maxPercentage: gradeInfo.maxPercentage,
      };
    }
  }

  // 如果没有原始等级数据，根据分数计算
  // ⚠️ 弃用警告：这是旧的基于分数百分比的计算方法
  // ✅ 新代码应使用 calculateGradeByRank(rank, totalStudents)
  const maxScore = SUBJECT_MAX_SCORES[subject] || 100;
  const percentage = (score / maxScore) * 100;

  // 根据百分比确定等级（旧逻辑，保留向后兼容）
  for (const gradeInfo of Object.values(GRADE_LEVELS)) {
    if (
      percentage >= gradeInfo.minPercentage &&
      percentage <= gradeInfo.maxPercentage
    ) {
      return {
        level: gradeInfo.level,
        displayName: gradeInfo.displayName,
        color: gradeInfo.color,
        icon: gradeInfo.icon,
        description: gradeInfo.description,
        minPercentage: gradeInfo.minPercentage,
        maxPercentage: gradeInfo.maxPercentage,
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
    maxPercentage: defaultGrade.maxPercentage,
  };
}

/**
 * 🚨 新增：批量为成绩记录分配基于排名的等级
 * 推荐使用此函数替代旧的基于分数的等级计算
 * @param records 成绩记录数组（必须包含分数）
 * @param subject 科目
 * @param scoreField 分数字段名（如 'total_score'）
 * @returns 带等级信息的成绩记录数组
 */
export function assignGradesByRank<T extends { [key: string]: any }>(
  records: T[],
  subject: Subject | string,
  scoreField: string = "total_score"
): Array<T & { calculatedGrade: GradeLevelInfo; rank: number }> {
  if (records.length === 0) {
    return [];
  }

  // 1. 按分数降序排序并分配排名
  const sortedWithRank = [...records]
    .sort((a, b) => {
      const scoreA = Number(a[scoreField]) || 0;
      const scoreB = Number(b[scoreField]) || 0;
      return scoreB - scoreA; // 降序
    })
    .map((record, index) => ({
      ...record,
      rank: index + 1, // 排名从1开始
    }));

  // 2. 为每条记录计算等级
  const totalStudents = sortedWithRank.length;
  return sortedWithRank.map((record) => ({
    ...record,
    calculatedGrade: calculateGradeByRank(record.rank, totalStudents),
  }));
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
    GradeLevel.C,
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

  gradeData.forEach((grade) => {
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

  return allLevels
    .map((level) => {
      const gradeInfo = GRADE_LEVELS[level];
      return {
        level,
        name: gradeInfo?.displayName || `📊 ${level}`,
        count: distribution[level] || 0,
        percentage:
          totalCount > 0 ? ((distribution[level] || 0) / totalCount) * 100 : 0,
        color: gradeInfo?.color || "#6b7280",
        icon: gradeInfo?.icon || "📊",
      };
    })
    .sort((a, b) => {
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
export function getGradeThresholds(
  subject: Subject | string
): Record<GradeLevel, number> {
  const maxScore = getMaxScore(subject);

  return {
    [GradeLevel.A_PLUS]: maxScore * 0.9,
    [GradeLevel.A]: maxScore * 0.8,
    [GradeLevel.B_PLUS]: maxScore * 0.7,
    [GradeLevel.B]: maxScore * 0.6,
    [GradeLevel.C_PLUS]: maxScore * 0.5,
    [GradeLevel.C]: 0,
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

// ============================================
// ✨ Task #20: 灵活等级来源策略
// 优先级：导入等级 > 排名计算 > 默认等级
// ============================================

/**
 * 标准化等级格式
 * 将各种等级表示法统一为GradeLevel枚举
 *
 * @param grade - 输入的等级字符串
 * @returns 标准化后的GradeLevel，无法识别时返回null
 *
 * @example
 * normalizeGradeLevel("A+") => GradeLevel.A_PLUS
 * normalizeGradeLevel("优秀") => GradeLevel.A_PLUS
 * normalizeGradeLevel("甲") => GradeLevel.A_PLUS
 */
export function normalizeGradeLevel(
  grade: string | null | undefined
): GradeLevel | null {
  if (!grade) return null;

  const normalized = grade.trim().toUpperCase();

  // 标准等级格式映射
  const gradeMap: Record<string, GradeLevel> = {
    // 标准字母等级
    "A+": GradeLevel.A_PLUS,
    A: GradeLevel.A,
    "B+": GradeLevel.B_PLUS,
    B: GradeLevel.B,
    "C+": GradeLevel.C_PLUS,
    C: GradeLevel.C,

    // 中文等级
    优秀: GradeLevel.A_PLUS,
    优: GradeLevel.A_PLUS,
    良好: GradeLevel.A,
    良: GradeLevel.A,
    中等: GradeLevel.B,
    中: GradeLevel.B,
    及格: GradeLevel.C_PLUS,
    不及格: GradeLevel.C,
    差: GradeLevel.C,

    // 传统等第
    甲: GradeLevel.A_PLUS,
    乙: GradeLevel.A,
    丙: GradeLevel.B,
    丁: GradeLevel.C,
  };

  return gradeMap[normalized] || null;
}

/**
 * 灵活等级分配策略
 *
 * 优先级顺序：
 * 1. 使用导入的等级（如果存在且有效）
 * 2. 根据排名计算等级（如果排名存在）
 * 3. 返回默认等级C
 *
 * @param records - 成绩记录数组
 * @param subject - 科目名称
 * @param scoreField - 分数字段名（用于排序）
 * @param gradeField - 等级字段名（可选）
 * @returns 带有解析等级的记录数组
 *
 * @example
 * // 场景1：使用导入等级
 * const records = [{ student_id: "001", total_score: 650, total_grade: "A+" }];
 * const result = assignGradesWithFallback(records, "总分", "total_score", "total_grade");
 * // result[0].resolvedGrade.level === "A+"
 * // result[0].gradeSource === "imported"
 *
 * @example
 * // 场景2：等级缺失，基于排名计算
 * const records = [
 *   { student_id: "001", total_score: 650, total_rank: 1 },
 *   { student_id: "002", total_score: 600, total_rank: 50 }
 * ];
 * const result = assignGradesWithFallback(records, "总分", "total_score");
 * // result[0].gradeSource === "calculated"
 */
export function assignGradesWithFallback<T extends { [key: string]: any }>(
  records: T[],
  subject: string,
  scoreField: string = "total_score",
  gradeField?: string
): Array<
  T & {
    resolvedGrade: GradeLevelInfo;
    gradeSource: "imported" | "calculated" | "default";
  }
> {
  if (records.length === 0) {
    return [];
  }

  // 推断排名字段名（尝试多种可能的格式）
  // 例如：total_score → total_rank 或 total_rank_in_class
  const baseFieldName = scoreField.replace("_score", "");
  const possibleRankFields = [
    `${baseFieldName}_rank`, // total_rank
    `${baseFieldName}_rank_in_class`, // total_rank_in_class
    `${baseFieldName}_rank_in_grade`, // total_rank_in_grade
    `${baseFieldName}_rank_in_school`, // total_rank_in_school
  ];

  // 找到第一个存在的排名字段
  const firstRecord = records[0];
  const rankField = possibleRankFields.find(
    (field) => firstRecord && firstRecord[field] !== undefined
  );

  const totalStudents = records.length;

  return records.map((record) => {
    let resolvedGrade: GradeLevelInfo;
    let gradeSource: "imported" | "calculated" | "default";

    // 优先级1：使用导入的等级
    if (gradeField && record[gradeField]) {
      const importedGrade = normalizeGradeLevel(record[gradeField]);
      if (importedGrade) {
        resolvedGrade = GRADE_LEVELS[importedGrade];
        gradeSource = "imported";
        return { ...record, resolvedGrade, gradeSource };
      }
    }

    // 优先级2：根据排名计算等级
    if (rankField) {
      const rank = record[rankField];
      if (rank && typeof rank === "number" && rank > 0) {
        resolvedGrade = calculateGradeByRank(rank, totalStudents);
        gradeSource = "calculated";
        return { ...record, resolvedGrade, gradeSource };
      }
    }

    // 优先级3：默认等级C
    resolvedGrade = GRADE_LEVELS[GradeLevel.C];
    gradeSource = "default";
    return { ...record, resolvedGrade, gradeSource };
  });
}
