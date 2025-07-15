/**
 * 计算工具库 - 统一的成绩分析计算函数
 * 
 * 提供成绩分析系统所需的各种统计计算功能
 * 包括基础统计、排名计算、分数段分析、趋势分析等
 */

// ============================================================================
// 基础统计计算
// ============================================================================

export interface BasicStatistics {
  count: number;
  average: number;
  max: number;
  min: number;
  median: number;
  standardDeviation: number;
  variance: number;
  sum: number;
}

/**
 * 计算基础统计指标
 */
export function calculateBasicStatistics(scores: number[]): BasicStatistics {
  if (!scores || scores.length === 0) {
    return {
      count: 0,
      average: 0,
      max: 0,
      min: 0,
      median: 0,
      standardDeviation: 0,
      variance: 0,
      sum: 0
    };
  }

  const validScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
  const count = validScores.length;
  
  if (count === 0) {
    return {
      count: 0,
      average: 0,
      max: 0,
      min: 0,
      median: 0,
      standardDeviation: 0,
      variance: 0,
      sum: 0
    };
  }

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / count;
  const max = Math.max(...validScores);
  const min = Math.min(...validScores);
  
  // 计算中位数
  const sortedScores = [...validScores].sort((a, b) => a - b);
  const median = count % 2 === 0
    ? (sortedScores[count / 2 - 1] + sortedScores[count / 2]) / 2
    : sortedScores[Math.floor(count / 2)];

  // 计算方差和标准差
  const variance = validScores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  return {
    count,
    average: Number(average.toFixed(2)),
    max,
    min,
    median: Number(median.toFixed(2)),
    standardDeviation: Number(standardDeviation.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    sum
  };
}

// ============================================================================
// 分数段分析
// ============================================================================

export interface ScoreRangeAnalysis {
  range: string;
  count: number;
  percentage: number;
  scoreStart: number;
  scoreEnd: number;
}

export interface ScoreRangeConfig {
  excellent: number;  // 优秀分数线，如90
  good: number;       // 良好分数线，如80
  pass: number;       // 及格分数线，如60
}

/**
 * 计算分数段分布
 */
export function analyzeScoreRanges(
  scores: number[], 
  config: ScoreRangeConfig = { excellent: 90, good: 80, pass: 60 },
  customRanges?: { name: string; min: number; max: number }[]
): ScoreRangeAnalysis[] {
  if (!scores || scores.length === 0) return [];

  const validScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
  const totalCount = validScores.length;

  if (customRanges) {
    return customRanges.map(range => {
      const count = validScores.filter(score => score >= range.min && score <= range.max).length;
      return {
        range: range.name,
        count,
        percentage: totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0,
        scoreStart: range.min,
        scoreEnd: range.max
      };
    });
  }

  // 默认分数段
  const ranges = [
    { name: '优秀', min: config.excellent, max: 100 },
    { name: '良好', min: config.good, max: config.excellent - 1 },
    { name: '及格', min: config.pass, max: config.good - 1 },
    { name: '不及格', min: 0, max: config.pass - 1 }
  ];

  return ranges.map(range => {
    const count = validScores.filter(score => score >= range.min && score <= range.max).length;
    return {
      range: range.name,
      count,
      percentage: totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0,
      scoreStart: range.min,
      scoreEnd: range.max
    };
  });
}

/**
 * 计算各类率
 */
export function calculateRates(
  scores: number[], 
  config: ScoreRangeConfig = { excellent: 90, good: 80, pass: 60 },
  subject?: string
) {
  if (!scores || scores.length === 0) {
    return {
      passRate: 0,
      goodRate: 0,
      excellentRate: 0
    };
  }

  const validScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
  const totalCount = validScores.length;

  if (totalCount === 0) {
    return {
      passRate: 0,
      goodRate: 0,
      excellentRate: 0
    };
  }

  // 如果指定了科目，尝试使用动态及格线
  let passScore = config.pass;
  let excellentScore = config.excellent;
  
  if (subject) {
    try {
      // 动态导入以避免循环依赖
      const { getPassScore, getExcellentScore } = require('@/services/passRateCalculator');
      passScore = getPassScore(subject);
      excellentScore = getExcellentScore(subject);
    } catch (error) {
      console.warn('Failed to load dynamic pass rate calculator, using default values:', error);
    }
  }

  const passCount = validScores.filter(score => score >= passScore).length;
  const goodCount = validScores.filter(score => score >= config.good).length;
  const excellentCount = validScores.filter(score => score >= excellentScore).length;

  return {
    passRate: Number(((passCount / totalCount) * 100).toFixed(1)),
    goodRate: Number(((goodCount / totalCount) * 100).toFixed(1)),
    excellentRate: Number(((excellentCount / totalCount) * 100).toFixed(1))
  };
}

// ============================================================================
// 排名计算
// ============================================================================

export interface RankingItem {
  id: string;
  score: number;
  rank: number;
  percentile: number;
}

/**
 * 计算排名（支持并列排名）
 */
export function calculateRankings(
  items: { id: string; score: number }[],
  descending: boolean = true
): RankingItem[] {
  if (!items || items.length === 0) return [];

  // 排序
  const sortedItems = [...items].sort((a, b) => 
    descending ? b.score - a.score : a.score - b.score
  );

  const rankings: RankingItem[] = [];
  let currentRank = 1;
  let previousScore: number | null = null;

  sortedItems.forEach((item, index) => {
    // 如果分数与上一个不同，更新排名
    if (previousScore !== null && item.score !== previousScore) {
      currentRank = index + 1;
    }

    const percentile = ((sortedItems.length - index) / sortedItems.length) * 100;

    rankings.push({
      id: item.id,
      score: item.score,
      rank: currentRank,
      percentile: Number(percentile.toFixed(1))
    });

    previousScore = item.score;
  });

  return rankings;
}

// ============================================================================
// 箱线图数据计算
// ============================================================================

export interface BoxPlotData {
  subject: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  mean: number;
}

/**
 * 计算箱线图数据
 */
export function calculateBoxPlotData(scores: number[], subject: string = ''): BoxPlotData {
  if (!scores || scores.length === 0) {
    return {
      subject,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      outliers: [],
      mean: 0
    };
  }

  const validScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
  
  if (validScores.length === 0) {
    return {
      subject,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      outliers: [],
      mean: 0
    };
  }

  const sortedScores = [...validScores].sort((a, b) => a - b);
  const n = sortedScores.length;

  // 计算四分位数
  const q1Index = Math.floor(n * 0.25);
  const medianIndex = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sortedScores[q1Index];
  const median = n % 2 === 0
    ? (sortedScores[medianIndex - 1] + sortedScores[medianIndex]) / 2
    : sortedScores[medianIndex];
  const q3 = sortedScores[q3Index];

  // 计算IQR和异常值
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = validScores.filter(score => score < lowerBound || score > upperBound);
  const nonOutliers = validScores.filter(score => score >= lowerBound && score <= upperBound);

  const min = nonOutliers.length > 0 ? Math.min(...nonOutliers) : sortedScores[0];
  const max = nonOutliers.length > 0 ? Math.max(...nonOutliers) : sortedScores[n - 1];
  const mean = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;

  return {
    subject,
    min: Number(min.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    median: Number(median.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    max: Number(max.toFixed(2)),
    outliers: outliers.map(score => Number(score.toFixed(2))),
    mean: Number(mean.toFixed(2))
  };
}

// ============================================================================
// 趋势分析
// ============================================================================

export interface TrendPoint {
  period: string;
  value: number;
  change?: number;
  changePercent?: number;
}

/**
 * 计算趋势数据
 */
export function calculateTrend(data: { period: string; value: number }[]): TrendPoint[] {
  if (!data || data.length === 0) return [];

  const sortedData = [...data].sort((a, b) => a.period.localeCompare(b.period));
  
  return sortedData.map((point, index) => {
    let change = 0;
    let changePercent = 0;

    if (index > 0) {
      const previousValue = sortedData[index - 1].value;
      change = point.value - previousValue;
      changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
    }

    return {
      period: point.period,
      value: Number(point.value.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(1))
    };
  });
}

// ============================================================================
// 异常检测
// ============================================================================

export interface AnomalyItem {
  id: string;
  value: number;
  zScore: number;
  isAnomaly: boolean;
  anomalyType: 'high' | 'low' | 'normal';
  severity: 'mild' | 'moderate' | 'severe';
}

/**
 * 基于Z-Score的异常检测
 */
export function detectAnomalies(
  data: { id: string; value: number }[],
  threshold: number = 2
): AnomalyItem[] {
  if (!data || data.length === 0) return [];

  const values = data.map(item => item.value);
  const stats = calculateBasicStatistics(values);

  if (stats.standardDeviation === 0) {
    return data.map(item => ({
      id: item.id,
      value: item.value,
      zScore: 0,
      isAnomaly: false,
      anomalyType: 'normal' as const,
      severity: 'mild' as const
    }));
  }

  return data.map(item => {
    const zScore = (item.value - stats.average) / stats.standardDeviation;
    const absZScore = Math.abs(zScore);
    const isAnomaly = absZScore > threshold;
    
    let anomalyType: 'high' | 'low' | 'normal' = 'normal';
    if (isAnomaly) {
      anomalyType = zScore > 0 ? 'high' : 'low';
    }

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (absZScore > threshold * 2) {
      severity = 'severe';
    } else if (absZScore > threshold * 1.5) {
      severity = 'moderate';
    }

    return {
      id: item.id,
      value: item.value,
      zScore: Number(zScore.toFixed(2)),
      isAnomaly,
      anomalyType,
      severity
    };
  });
}

// ============================================================================
// 相关性分析
// ============================================================================

/**
 * 计算皮尔逊相关系数
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (!x || !y || x.length === 0 || y.length === 0 || x.length !== y.length) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return Number((numerator / denominator).toFixed(3));
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 数据验证
 */
export function validateNumericData(data: any[]): number[] {
  return data
    .filter(item => item !== null && item !== undefined)
    .map(item => typeof item === 'number' ? item : parseFloat(item))
    .filter(item => !isNaN(item));
}

/**
 * 分组计算
 */
export function groupBy<T>(
  array: T[], 
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 百分位数计算
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (!values || values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (index % 1 === 0) {
    return sorted[index];
  }
  
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  return lower + (upper - lower) * (index % 1);
} 