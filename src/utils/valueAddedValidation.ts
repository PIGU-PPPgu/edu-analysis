/**
 * 增值评价统计有效性验证模块
 * 用于检测样本量、异常值和增值率合理性
 */

import type {
  ClassValueAdded,
  TeacherValueAdded,
} from "@/types/valueAddedTypes";

// ============================================
// 配置常量
// ============================================

/** 统计有效性阈值配置 */
export const VALIDATION_THRESHOLDS = {
  /** 最小样本量（小于此值显示置信度不足警告） */
  minSampleSize: 30,

  /** Z-score异常值阈值（超过此值标记为统计异常） */
  zScoreOutlierThreshold: 3,

  /** 正常增值率范围 */
  normalValueAddedRange: {
    min: -0.15, // -15%
    max: 0.15, // +15%
  },

  /** 增值率警告阈值 */
  warningThreshold: {
    moderate: 0.2, // 20%：偏高警告
    severe: 0.3, // 30%：严重异常警告
  },
} as const;

// ============================================
// 验证函数
// ============================================

/**
 * 验证班级增值结果的统计有效性
 */
export function validateClassValueAdded(result: ClassValueAdded): string[] {
  const warnings: string[] = [];

  // 1. 样本量检查
  if (result.total_students < VALIDATION_THRESHOLDS.minSampleSize) {
    warnings.push(
      `样本量不足（n=${result.total_students}），置信度较低，建议谨慎解读`
    );
  }

  // 2. 增值率合理性检查
  const rate = result.avg_score_value_added_rate;
  const { normalValueAddedRange, warningThreshold } = VALIDATION_THRESHOLDS;

  if (Math.abs(rate) > warningThreshold.severe) {
    warnings.push(
      `增值率异常高（${(rate * 100).toFixed(1)}%），疑似数据异常或样本偏差，请检查原始数据`
    );
  } else if (Math.abs(rate) > warningThreshold.moderate) {
    warnings.push(
      `增值率偏高（${(rate * 100).toFixed(1)}%），超出常见范围，建议进一步分析`
    );
  } else if (
    rate < normalValueAddedRange.min ||
    rate > normalValueAddedRange.max
  ) {
    warnings.push(
      `增值率（${(rate * 100).toFixed(1)}%）超出正常范围（±15%），属于显著变化`
    );
  }

  // 3. Z分数变化检查
  if (
    result.avg_z_score_change &&
    Math.abs(result.avg_z_score_change) >
      VALIDATION_THRESHOLDS.zScoreOutlierThreshold
  ) {
    warnings.push(
      `平均Z分数变化过大（${result.avg_z_score_change.toFixed(2)}），可能存在异常值`
    );
  }

  return warnings;
}

/**
 * 验证教师增值结果的统计有效性
 */
export function validateTeacherValueAdded(result: TeacherValueAdded): string[] {
  const warnings: string[] = [];

  // 1. 样本量检查
  if (result.total_students < VALIDATION_THRESHOLDS.minSampleSize) {
    warnings.push(`样本量不足（n=${result.total_students}），置信度较低`);
  }

  // 2. 增值率合理性检查
  const rate = result.avg_score_value_added_rate;
  const { warningThreshold } = VALIDATION_THRESHOLDS;

  if (Math.abs(rate) > warningThreshold.severe) {
    warnings.push(`增值率异常（${(rate * 100).toFixed(1)}%），建议检查数据`);
  } else if (Math.abs(rate) > warningThreshold.moderate) {
    warnings.push(`增值率偏高（${(rate * 100).toFixed(1)}%），超出常见范围`);
  }

  return warnings;
}

/**
 * 检查Z分数数组中的异常值
 * @returns 异常值的索引数组
 */
export function detectZScoreOutliers(
  zScores: number[],
  threshold: number = VALIDATION_THRESHOLDS.zScoreOutlierThreshold
): number[] {
  return zScores
    .map((z, index) => ({ z, index }))
    .filter(({ z }) => Math.abs(z) > threshold)
    .map(({ index }) => index);
}

/**
 * 判断样本量是否充足
 */
export function isSampleSizeSufficient(sampleSize: number): boolean {
  return sampleSize >= VALIDATION_THRESHOLDS.minSampleSize;
}

/**
 * 判断增值率是否在正常范围内
 */
export function isValueAddedRateNormal(rate: number): boolean {
  const { min, max } = VALIDATION_THRESHOLDS.normalValueAddedRange;
  return rate >= min && rate <= max;
}

/**
 * 获取增值率的描述性标签
 */
export function getValueAddedRateLabel(rate: number): string {
  const { normalValueAddedRange, warningThreshold } = VALIDATION_THRESHOLDS;

  if (Math.abs(rate) > warningThreshold.severe) {
    return "严重异常";
  } else if (Math.abs(rate) > warningThreshold.moderate) {
    return "偏高";
  } else if (
    rate < normalValueAddedRange.min ||
    rate > normalValueAddedRange.max
  ) {
    return rate > 0 ? "显著提升" : "显著下降";
  } else {
    return "正常波动";
  }
}

// ============================================
// 批量验证
// ============================================

/**
 * 批量验证班级增值结果，返回带警告的结果
 */
export function validateClassValueAddedBatch(results: ClassValueAdded[]): Array<
  ClassValueAdded & {
    warnings: string[];
    is_statistically_significant: boolean;
  }
> {
  return results.map((result) => {
    const warnings = validateClassValueAdded(result);
    return {
      ...result,
      warnings,
      is_statistically_significant: warnings.length === 0,
    };
  });
}

/**
 * 批量验证教师增值结果
 */
export function validateTeacherValueAddedBatch(
  results: TeacherValueAdded[]
): Array<
  TeacherValueAdded & {
    warnings: string[];
    is_statistically_significant: boolean;
  }
> {
  return results.map((result) => {
    const warnings = validateTeacherValueAdded(result);
    return {
      ...result,
      warnings,
      is_statistically_significant: warnings.length === 0,
    };
  });
}
