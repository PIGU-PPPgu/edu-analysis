/**
 * 统计分析工具库
 * 提供专业的统计学方法用于异常检测和数据分析
 */

export interface AnomalyResult {
  value: number;
  zScore: number;
  isAnomaly: boolean;
  severity: "mild" | "moderate" | "severe";
  percentile: number;
}

export interface OutlierDetectionResult {
  lowerBound: number;
  upperBound: number;
  outliers: number[];
  outlierIndices: number[];
  method: "iqr" | "zscore";
}

/**
 * 计算均值
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 计算标准差（P0修复：使用样本标准差公式）
 *
 * 样本标准差公式：σ = sqrt(Σ(x-μ)² / (n-1))
 * 使用n-1而非n，提供无偏估计
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0; // 单个样本标准差为0

  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const sumSquaredDiffs = squaredDiffs.reduce((sum, val) => sum + val, 0);

  // P0修复：使用样本标准差公式（除以n-1而非n）
  const variance = sumSquaredDiffs / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * 计算Z-score（标准分数）
 * Z-score = (X - μ) / σ
 */
export function calculateZScore(value: number, values: number[]): number {
  const mean = calculateMean(values);
  const std = calculateStandardDeviation(values);
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * 使用Z-score方法检测异常值
 * @param values 数据数组
 * @param threshold Z-score阈值（默认2，即±2σ）
 * @returns 异常检测结果数组
 */
export function detectAnomaliesZScore(
  values: number[],
  threshold: number = 2
): AnomalyResult[] {
  if (values.length === 0) return [];

  const mean = calculateMean(values);
  const std = calculateStandardDeviation(values);

  return values.map((value) => {
    const zScore = std === 0 ? 0 : (value - mean) / std;
    const absZScore = Math.abs(zScore);
    const isAnomaly = absZScore > threshold;

    let severity: "mild" | "moderate" | "severe";
    if (absZScore > 3) {
      severity = "severe"; // >3σ 严重异常
    } else if (absZScore > 2.5) {
      severity = "moderate"; // 2.5σ-3σ 中度异常
    } else {
      severity = "mild"; // 2σ-2.5σ 轻微异常
    }

    // 计算百分位数
    const sortedValues = [...values].sort((a, b) => a - b);
    const rank = sortedValues.filter((v) => v < value).length;
    const percentile = (rank / values.length) * 100;

    return {
      value,
      zScore,
      isAnomaly,
      severity,
      percentile,
    };
  });
}

/**
 * 使用IQR（四分位距）方法检测离群值
 * 离群值定义：< Q1 - 1.5*IQR 或 > Q3 + 1.5*IQR
 */
export function detectOutliersIQR(values: number[]): OutlierDetectionResult {
  if (values.length === 0) {
    return {
      lowerBound: 0,
      upperBound: 0,
      outliers: [],
      outlierIndices: [],
      method: "iqr",
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // 计算四分位数
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];

  // 计算IQR
  const iqr = q3 - q1;

  // 计算边界
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // 找出离群值
  const outliers: number[] = [];
  const outlierIndices: number[] = [];

  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      outliers.push(value);
      outlierIndices.push(index);
    }
  });

  return {
    lowerBound,
    upperBound,
    outliers,
    outlierIndices,
    method: "iqr",
  };
}

/**
 * 计算百分位数
 */
export function calculatePercentile(
  values: number[],
  percentile: number
): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * 计算数据的五数概括
 * 最小值、Q1、中位数、Q3、最大值
 */
export function calculateFiveNumberSummary(values: number[]): {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
} {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return { min, q1, median, q3, max, iqr };
}

/**
 * 分析数据分布的偏度和峰度
 */
export function analyzeDistribution(values: number[]): {
  mean: number;
  median: number;
  mode: number | null;
  std: number;
  skewness: number;
  isNormal: boolean;
} {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: null,
      std: 0,
      skewness: 0,
      isNormal: false,
    };
  }

  const mean = calculateMean(values);
  const std = calculateStandardDeviation(values);
  const summary = calculateFiveNumberSummary(values);

  // 计算偏度（简化版）
  const skewness = (mean - summary.median) / (std || 1);

  // 判断是否近似正态分布（|偏度| < 0.5）
  const isNormal = Math.abs(skewness) < 0.5;

  // 计算众数（出现次数最多的值）
  const frequency: Record<number, number> = {};
  values.forEach((val) => {
    frequency[val] = (frequency[val] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(frequency));
  const modes = Object.keys(frequency)
    .filter((key) => frequency[Number(key)] === maxFreq)
    .map(Number);
  const mode = modes.length === values.length ? null : modes[0];

  return {
    mean,
    median: summary.median,
    mode,
    std,
    skewness,
    isNormal,
  };
}

/**
 * 检测趋势方向（上升/下降/稳定）
 */
export function detectTrend(values: number[]): {
  direction: "up" | "down" | "stable";
  slope: number;
  confidence: number;
} {
  if (values.length < 2) {
    return { direction: "stable", slope: 0, confidence: 0 };
  }

  // 简单线性回归
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // 计算R²（决定系数）作为置信度
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = yMean + slope * (xValues[i] - xMean);
    ssTotal += Math.pow(values[i] - yMean, 2);
    ssResidual += Math.pow(values[i] - predicted, 2);
  }

  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
  const confidence = Math.max(0, Math.min(1, rSquared));

  // 判断趋势方向
  let direction: "up" | "down" | "stable";
  if (Math.abs(slope) < 0.01) {
    direction = "stable";
  } else if (slope > 0) {
    direction = "up";
  } else {
    direction = "down";
  }

  return { direction, slope, confidence };
}
