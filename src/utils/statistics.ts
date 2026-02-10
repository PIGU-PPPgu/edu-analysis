/**
 * 统计计算工具函数
 * 用于增值评价的核心统计计算
 */

import type {
  Statistics,
  PercentileData,
  AbilityLevel,
  GradeLevelDefinition,
} from "@/types/valueAddedTypes";

// ============================================
// 基础统计函数
// ============================================

/**
 * 计算标准差
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * 计算Z-Score（标准分）
 */
export function calculateZScore(
  value: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * 计算所有值的Z-Score
 */
export function calculateZScores(values: number[]): number[] {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);

  return values.map((val) => calculateZScore(val, mean, stdDev));
}

/**
 * 计算中位数
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * 计算四分位数
 */
export function calculateQuartiles(values: number[]): {
  q1: number;
  q2: number;
  q3: number;
} {
  if (values.length === 0) return { q1: 0, q2: 0, q3: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const q2 = calculateMedian(sorted);

  const mid = Math.floor(sorted.length / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf =
    sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  const q1 = calculateMedian(lowerHalf);
  const q3 = calculateMedian(upperHalf);

  return { q1, q2, q3 };
}

/**
 * 计算完整统计数据
 */
export function calculateStatistics(values: number[]): Statistics {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      std_dev: 0,
      min: 0,
      max: 0,
    };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const std_dev = calculateStandardDeviation(values);
  const median = calculateMedian(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const { q1, q3 } = calculateQuartiles(values);

  return {
    count: values.length,
    sum,
    mean,
    median,
    std_dev,
    min,
    max,
    q1,
    q3,
  };
}

// ============================================
// 百分位和排名计算
// ============================================

/**
 * 计算百分位
 * @param value 目标值
 * @param allValues 所有值的数组
 * @returns 百分位（0-1）
 */
export function calculatePercentile(
  value: number,
  allValues: number[]
): number {
  if (allValues.length === 0) return 0;

  const sortedValues = [...allValues].sort((a, b) => b - a); // 降序
  const rank = sortedValues.findIndex((v) => v <= value) + 1;

  return (rank - 1) / allValues.length;
}

/**
 * 根据百分位获取值
 * @param percentile 百分位（0-1）
 * @param allValues 所有值的数组
 */
export function getValueAtPercentile(
  percentile: number,
  allValues: number[]
): number {
  if (allValues.length === 0) return 0;

  const sortedValues = [...allValues].sort((a, b) => b - a); // 降序
  const index = Math.floor(percentile * allValues.length);

  return sortedValues[Math.min(index, sortedValues.length - 1)];
}

/**
 * 计算排名
 * @param value 目标值
 * @param allValues 所有值的数组
 * @param descending 是否降序（true=分数越高排名越前）
 */
export function calculateRank(
  value: number,
  allValues: number[],
  descending: boolean = true
): number {
  if (allValues.length === 0) return 0;

  const sortedValues = [...allValues].sort((a, b) =>
    descending ? b - a : a - b
  );
  const rank = sortedValues.findIndex((v) => v === value) + 1;

  return rank;
}

/**
 * 获取百分位数据（包括值、百分位、排名）
 */
export function getPercentileData(
  value: number,
  allValues: number[]
): PercentileData {
  const percentile = calculatePercentile(value, allValues);
  const rank = calculateRank(value, allValues);

  return {
    value,
    percentile,
    rank,
    total: allValues.length,
  };
}

// ============================================
// 等级判定函数
// ============================================

/**
 * 根据百分位判定等级
 * @param percentile 百分位（0-1）
 * @param levelDefinitions 等级定义数组
 */
export function determineLevel(
  percentile: number,
  levelDefinitions: GradeLevelDefinition[]
): AbilityLevel {
  for (const def of levelDefinitions) {
    if (percentile >= def.percentile.min && percentile < def.percentile.max) {
      return def.level;
    }
  }

  // 默认返回最低等级
  return "C";
}

/**
 * 批量判定等级
 */
export function determineLevels(
  values: number[],
  levelDefinitions: GradeLevelDefinition[]
): AbilityLevel[] {
  return values.map((value) => {
    const percentile = calculatePercentile(value, values);
    return determineLevel(percentile, levelDefinitions);
  });
}

/**
 * 获取等级值（用于比较）
 */
export function getLevelValue(level: AbilityLevel): number {
  const levelMap: Record<AbilityLevel, number> = {
    "A+": 6,
    A: 5,
    "B+": 4,
    B: 3,
    "C+": 2,
    C: 1,
  };

  return levelMap[level] || 0;
}

/**
 * 比较两个等级
 * @returns 正数表示level1 > level2，负数表示level1 < level2
 */
export function compareLevels(
  level1: AbilityLevel,
  level2: AbilityLevel
): number {
  return getLevelValue(level1) - getLevelValue(level2);
}

/**
 * 计算等级变化
 * @returns 正数表示提升，负数表示降低
 */
export function calculateLevelChange(
  entryLevel: AbilityLevel,
  exitLevel: AbilityLevel
): number {
  return getLevelValue(exitLevel) - getLevelValue(entryLevel);
}

// ============================================
// 增值计算函数
// ============================================

/**
 * 计算分数增值率（参照汇优评公式）
 * 公式：(出口标准分 - 入口标准分) / 入口标准分
 * 标准分 = 500 + 100 * Z分数
 * @param entryZScore 入口Z分数
 * @param exitZScore 出口Z分数
 */
export function calculateScoreValueAddedRate(
  entryZScore: number,
  exitZScore: number
): number {
  const entryStandardScore = 500 + 100 * entryZScore;
  const exitStandardScore = 500 + 100 * exitZScore;
  return safeDivide(exitStandardScore - entryStandardScore, entryStandardScore);
}

/**
 * 计算进步人数占比
 */
export function calculateProgressRatio(
  entryScores: number[],
  exitScores: number[]
): number {
  if (entryScores.length === 0 || entryScores.length !== exitScores.length) {
    return 0;
  }

  let progressCount = 0;
  for (let i = 0; i < entryScores.length; i++) {
    if (exitScores[i] > entryScores[i]) {
      progressCount++;
    }
  }

  return progressCount / entryScores.length;
}

/**
 * 判断是否巩固（保持最高等级）
 */
export function isConsolidated(
  entryLevel: AbilityLevel,
  exitLevel: AbilityLevel,
  highestLevel: AbilityLevel = "A+"
): boolean {
  return entryLevel === highestLevel && exitLevel === highestLevel;
}

/**
 * 判断是否转化（等级提升）
 */
export function isTransformed(
  entryLevel: AbilityLevel,
  exitLevel: AbilityLevel
): boolean {
  return calculateLevelChange(entryLevel, exitLevel) > 0;
}

/**
 * 计算巩固率
 * @param students 学生数据数组，每个元素包含入口和出口等级
 */
export function calculateConsolidationRate(
  students: Array<{ entryLevel: AbilityLevel; exitLevel: AbilityLevel }>
): number {
  const highestLevelStudents = students.filter((s) => s.entryLevel === "A+");

  if (highestLevelStudents.length === 0) return 0;

  const consolidatedCount = highestLevelStudents.filter(
    (s) => s.exitLevel === "A+"
  ).length;

  return consolidatedCount / highestLevelStudents.length;
}

/**
 * 计算转化率
 * @param students 学生数据数组
 */
export function calculateTransformationRate(
  students: Array<{ entryLevel: AbilityLevel; exitLevel: AbilityLevel }>
): number {
  // 可提升学生：入口不是最高等级的学生
  const improvableStudents = students.filter((s) => s.entryLevel !== "A+");

  if (improvableStudents.length === 0) return 0;

  const transformedCount = improvableStudents.filter((s) =>
    isTransformed(s.entryLevel, s.exitLevel)
  ).length;

  return transformedCount / improvableStudents.length;
}

/**
 * 计算贡献率
 * @param teacherExcellentGain 该教师的优秀人数净增加
 * @param gradeExcellentGain 全年级的优秀人数净增加
 */
export function calculateContributionRate(
  teacherExcellentGain: number,
  gradeExcellentGain: number
): number {
  if (gradeExcellentGain === 0) return 0;

  return teacherExcellentGain / gradeExcellentGain;
}

/**
 * 计算优秀人数净增加
 */
export function calculateExcellentGain(
  entryLevels: AbilityLevel[],
  exitLevels: AbilityLevel[],
  excellentLevels: AbilityLevel[] = ["A+", "A"]
): number {
  const entryExcellentCount = entryLevels.filter((level) =>
    excellentLevels.includes(level)
  ).length;

  const exitExcellentCount = exitLevels.filter((level) =>
    excellentLevels.includes(level)
  ).length;

  return exitExcellentCount - entryExcellentCount;
}

// ============================================
// 学科偏离度计算
// ============================================

/**
 * 计算学科偏离度（使用标准差）
 * @param subjectValueAddedRates 各科目的增值率数组
 */
export function calculateSubjectDeviation(
  subjectValueAddedRates: number[]
): number {
  return calculateStandardDeviation(subjectValueAddedRates);
}

/**
 * 计算学科偏离得分
 * @param totalValueAdded 总分增值率
 * @param subjectDeviation 学科偏离度
 * @param w1 总分增值权重（默认0.6）
 * @param w2 偏离度权重（默认0.4）
 */
export function calculateSubjectBalanceScore(
  totalValueAdded: number,
  subjectDeviation: number,
  w1: number = 0.6,
  w2: number = 0.4
): number {
  // 偏离度越小越好，所以用负数
  return w1 * totalValueAdded - w2 * subjectDeviation;
}

// ============================================
// 工具函数
// ============================================

/**
 * 安全除法（避免除以0）
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue: number = 0
): number {
  if (denominator === 0) return defaultValue;
  return numerator / denominator;
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化小数
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * 对数组进行分组
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
}

// ============================================
// 异常值检测
// ============================================

/**
 * 检测Z分数异常值
 * @param zScores Z分数数组
 * @param threshold 异常值阈值（默认3，表示3倍标准差）
 * @returns 异常值的索引数组
 */
export function detectOutliers(
  zScores: number[],
  threshold: number = 3
): number[] {
  return zScores
    .map((z, index) => ({ z, index }))
    .filter(({ z }) => Math.abs(z) > threshold)
    .map(({ index }) => index);
}

/**
 * 过滤掉Z分数异常值
 * @param values 原始数值数组
 * @param threshold 异常值阈值（默认3）
 * @returns 过滤后的数值数组
 */
export function filterOutliers(
  values: number[],
  threshold: number = 3
): number[] {
  if (values.length === 0) return [];

  const zScores = calculateZScores(values);
  const outlierIndices = new Set(detectOutliers(zScores, threshold));

  return values.filter((_, index) => !outlierIndices.has(index));
}

/**
 * 获取异常值信息
 * @param values 原始数值数组
 * @param threshold 异常值阈值
 * @returns 异常值及其索引
 */
export function getOutlierInfo(
  values: number[],
  threshold: number = 3
): Array<{ index: number; value: number; zScore: number }> {
  if (values.length === 0) return [];

  const zScores = calculateZScores(values);
  const outlierIndices = detectOutliers(zScores, threshold);

  return outlierIndices.map((index) => ({
    index,
    value: values[index],
    zScore: zScores[index],
  }));
}
