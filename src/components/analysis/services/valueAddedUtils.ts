/**
 * 增值评价计算工具函数
 * 提供增值指标计算、段位评价、统计分析等功能
 */

import type {
  ValueAddedMetrics,
  ExamSnapshot,
  LevelEvaluationConfig,
  ValueAddedSummary,
  ComparisonScope,
  CalculationResult,
} from "@/types/valueAddedTypes";
import { calculateBasicStatistics } from "./calculationUtils";

// ==================== 数据完整性过滤 ====================

/**
 * 过滤增值计算的完整记录
 * 规则：
 * 1. 必须有姓名
 * 2. 必须有至少一门科目成绩
 */
export function filterCompleteRecordsForValueAdded(records: any[]): {
  validRecords: any[];
  filteredCount: number;
  filteredReasons: { name: number; scores: number };
} {
  const filteredReasons = { name: 0, scores: 0 };

  const validRecords = records.filter((record) => {
    // 检查姓名
    if (!record.name || String(record.name).trim() === "") {
      filteredReasons.name++;
      return false;
    }

    // 检查是否有至少一门有效科目成绩
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

    const hasValidScore = subjects.some((subject) => {
      const score = record[`${subject}_score`];
      return (
        score !== null &&
        score !== undefined &&
        score !== "" &&
        !isNaN(Number(score))
      );
    });

    if (!hasValidScore) {
      filteredReasons.scores++;
      return false;
    }

    return true;
  });

  return {
    validRecords,
    filteredCount: records.length - validRecords.length,
    filteredReasons,
  };
}

// ==================== WideGradeRecord类型（从Context引入） ====================
interface WideGradeRecord {
  id?: string;
  student_id: string;
  name?: string;
  class_name?: string;
  exam_id?: string;
  exam_title?: string;
  exam_date?: string;
  exam_type?: string;
  total_score?: number;
  total_rank_in_class?: number;
  total_rank_in_school?: number;
  total_rank_in_grade?: number;
  [key: string]: any; // 支持各科目分数字段
}

// ==================== 默认配置 ====================

/**
 * 获取默认9段评价配置
 */
export function getDefaultLevelConfig(): LevelEvaluationConfig {
  return {
    levelCount: 9,
    method: "percentile",
    percentileThresholds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    labels: [
      "第一段",
      "第二段",
      "第三段",
      "第四段",
      "第五段",
      "第六段",
      "第七段",
      "第八段",
      "第九段",
    ],
    descriptions: [
      "需重点关注（后10%）",
      "有待提升（10-20%）",
      "稳步前进（20-30%）",
      "中等水平（30-40%）",
      "稳中有升（40-50%）",
      "良好进步（50-60%）",
      "显著提升（60-70%）",
      "优秀表现（70-80%）",
      "卓越进步（前10%）",
    ],
  };
}

// ==================== 核心计算函数 ====================

/**
 * 计算增值指标
 * @param baselineData 基准考试数据
 * @param targetData 目标考试数据
 * @param scope 对比范围
 * @param className 班级名称（scope='class'时必需）
 * @returns 增值指标数组
 */
export function calculateValueAddedMetrics(
  baselineData: WideGradeRecord[],
  targetData: WideGradeRecord[],
  scope: ComparisonScope,
  className?: string
): CalculationResult<ValueAddedMetrics[]> {
  // 参数验证
  if (
    !baselineData ||
    !targetData ||
    baselineData.length === 0 ||
    targetData.length === 0
  ) {
    return {
      success: false,
      error: "数据不足：需要至少两次考试的成绩数据",
    };
  }

  if (scope === "class" && !className) {
    return {
      success: false,
      error: "班级范围对比需要指定班级名称",
    };
  }

  // 根据scope筛选数据
  let filteredBaseline = baselineData;
  let filteredTarget = targetData;

  if (scope === "class" && className) {
    filteredBaseline = baselineData.filter((r) => r.class_name === className);
    filteredTarget = targetData.filter((r) => r.class_name === className);
  }
  // 'grade' 和 'school' 暂时不做筛选，使用全部数据

  // 建立学生ID到数据的映射
  const baselineMap = new Map<string, WideGradeRecord>();
  filteredBaseline.forEach((record) => {
    if (record.student_id) {
      baselineMap.set(record.student_id, record);
    }
  });

  const targetMap = new Map<string, WideGradeRecord>();
  filteredTarget.forEach((record) => {
    if (record.student_id) {
      targetMap.set(record.student_id, record);
    }
  });

  // 找出两次考试都参加的学生
  const commonStudentIds = Array.from(baselineMap.keys()).filter((id) =>
    targetMap.has(id)
  );

  if (commonStudentIds.length === 0) {
    return {
      success: false,
      error: "没有找到同时参加两次考试的学生",
    };
  }

  // 计算每个学生的增值指标
  const metrics: ValueAddedMetrics[] = commonStudentIds.map((studentId) => {
    const baselineRecord = baselineMap.get(studentId)!;
    const targetRecord = targetMap.get(studentId)!;

    const baselineScore = baselineRecord.total_score ?? 0;
    const targetScore = targetRecord.total_score ?? 0;

    // 判断数据有效性
    let status: "ok" | "insufficient" | "missing" = "ok";
    if (
      baselineRecord.total_score == null ||
      targetRecord.total_score == null
    ) {
      status = "missing"; // 分数缺失
    } else if (baselineScore <= 0 || targetScore <= 0) {
      status = "insufficient"; // 分数无效（0分或负分）
    }

    const improvementScore = targetScore - baselineScore;
    const improvementRate =
      baselineScore > 0 ? (improvementScore / baselineScore) * 100 : 0;

    // 排名变化（注意：排名数字越小越好，所以是baseline - target）
    const baselineRank =
      baselineRecord.total_rank_in_class ??
      baselineRecord.total_rank_in_grade ??
      baselineRecord.total_rank_in_school;
    const targetRank =
      targetRecord.total_rank_in_class ??
      targetRecord.total_rank_in_grade ??
      targetRecord.total_rank_in_school;

    const rankChange =
      baselineRank && targetRank ? baselineRank - targetRank : undefined;

    const baselineExam: ExamSnapshot = {
      examId: baselineRecord.exam_id || "",
      examTitle: baselineRecord.exam_title || "",
      examDate: baselineRecord.exam_date || "",
      score: baselineScore,
      rank: baselineRank,
    };

    const targetExam: ExamSnapshot = {
      examId: targetRecord.exam_id || "",
      examTitle: targetRecord.exam_title || "",
      examDate: targetRecord.exam_date || "",
      score: targetScore,
      rank: targetRank,
    };

    return {
      studentId,
      studentName: targetRecord.name || baselineRecord.name || studentId,
      className: targetRecord.class_name || baselineRecord.class_name || "",
      baselineExam,
      targetExam,
      improvementScore,
      improvementRate,
      rankChange,
      status,
    };
  });

  return {
    success: true,
    data: metrics,
    warnings:
      commonStudentIds.length < Math.max(baselineData.length, targetData.length)
        ? ["部分学生数据不完整，已自动过滤"]
        : undefined,
  };
}

/**
 * 分配段位评价
 * @param metrics 增值指标数组
 * @param config 段位配置
 * @returns 带段位信息的增值指标数组
 */
export function calculateLevelEvaluation(
  metrics: ValueAddedMetrics[],
  config: LevelEvaluationConfig
): ValueAddedMetrics[] {
  if (metrics.length === 0) {
    return [];
  }

  const { levelCount, method, percentileThresholds, labels, descriptions } =
    config;

  // 按进步分排序（降序）
  const sortedMetrics = [...metrics].sort(
    (a, b) => b.improvementScore - a.improvementScore
  );

  // 根据不同方法分配段位
  if (method === "percentile" && percentileThresholds) {
    const totalCount = sortedMetrics.length;

    sortedMetrics.forEach((metric, index) => {
      // 计算当前学生的百分位（0-1）
      const percentile = index / totalCount;

      // 找到对应的段位（从高到低）
      // percentile 越小，排名越前，段位越高
      let level = levelCount; // 默认最高段
      for (let i = 0; i < percentileThresholds.length; i++) {
        if (percentile < percentileThresholds[i]) {
          level = levelCount - i; // 从最高段开始递减
          break;
        }
      }
      // 如果 percentile >= 最后一个阈值，则为第1段（最低段）
      if (percentile >= percentileThresholds[percentileThresholds.length - 1]) {
        level = 1;
      }

      metric.level = level;
      metric.levelLabel = labels?.[level - 1] || `第${level}段`;
      metric.levelDescription = descriptions?.[level - 1];
    });
  } else if (method === "fixed") {
    // 固定分数阈值方法（待实现）
    console.warn("固定分数阈值方法暂未实现，使用默认段位");
  } else if (method === "stddev") {
    // 标准差方法（待实现）
    console.warn("标准差方法暂未实现，使用默认段位");
  }

  // 按原顺序返回（根据studentId排序）
  return metrics.map((original) => {
    const withLevel = sortedMetrics.find(
      (m) => m.studentId === original.studentId
    );
    return withLevel || original;
  });
}

/**
 * 计算增值评价统计摘要
 * @param metrics 增值指标数组
 * @returns 统计摘要
 */
export function calculateValueAddedSummary(
  metrics: ValueAddedMetrics[]
): ValueAddedSummary {
  if (metrics.length === 0) {
    return {
      totalStudents: 0,
      validStudents: 0,
      avgImprovement: 0,
      avgImprovementRate: 0,
      improvedCount: 0,
      improvedRate: 0,
      regressionCount: 0,
      regressionRate: 0,
      stableCount: 0,
    };
  }

  const validMetrics = metrics.filter((m) => m.status === "ok");
  const validCount = validMetrics.length;

  // 计算平均值
  const stats = calculateBasicStatistics(
    validMetrics.map((m) => m.improvementScore)
  );

  // 分类统计
  const improvedCount = validMetrics.filter(
    (m) => m.improvementScore > 0
  ).length;
  const regressionCount = validMetrics.filter(
    (m) => m.improvementScore < 0
  ).length;
  const stableCount = validMetrics.filter(
    (m) => m.improvementScore === 0
  ).length;

  // 找出最大进步和最大退步（需要保护空数组情况）
  const topImprover =
    validCount > 0
      ? validMetrics.reduce((max, m) =>
          m.improvementScore > max.improvementScore ? m : max
        )
      : undefined;
  const topRegressor =
    validCount > 0
      ? validMetrics.reduce((min, m) =>
          m.improvementScore < min.improvementScore ? m : min
        )
      : undefined;

  // 段位分布
  const levelDistribution: Record<number, number> = {};
  validMetrics.forEach((m) => {
    if (m.level) {
      levelDistribution[m.level] = (levelDistribution[m.level] || 0) + 1;
    }
  });

  return {
    totalStudents: metrics.length,
    validStudents: validCount,
    avgImprovement: stats.average,
    avgImprovementRate:
      validCount > 0
        ? validMetrics.reduce((sum, m) => sum + m.improvementRate, 0) /
          validCount
        : 0,
    improvedCount,
    improvedRate: validCount > 0 ? (improvedCount / validCount) * 100 : 0,
    regressionCount,
    regressionRate: validCount > 0 ? (regressionCount / validCount) * 100 : 0,
    stableCount,
    topImprover: improvedCount > 0 ? topImprover : undefined,
    topRegressor: regressionCount > 0 ? topRegressor : undefined,
    levelDistribution,
  };
}

/**
 * 获取进步榜单
 * @param metrics 增值指标数组
 * @param topN 返回前N名
 * @returns 进步最大的N个学生
 */
export function getTopImprovers(
  metrics: ValueAddedMetrics[],
  topN: number = 10
): ValueAddedMetrics[] {
  return [...metrics]
    .sort((a, b) => b.improvementScore - a.improvementScore)
    .slice(0, topN);
}

/**
 * 获取退步榜单
 * @param metrics 增值指标数组
 * @param bottomN 返回后N名
 * @returns 退步最大的N个学生
 */
export function getBottomImprovers(
  metrics: ValueAddedMetrics[],
  bottomN: number = 10
): ValueAddedMetrics[] {
  return [...metrics]
    .sort((a, b) => a.improvementScore - b.improvementScore)
    .slice(0, bottomN);
}

// ==================== 科目维度分析 ====================

/**
 * 科目增值指标
 */
export interface SubjectValueAddedMetrics {
  subject: string;
  subjectName: string;
  baselineAvg: number;
  targetAvg: number;
  avgImprovement: number;
  avgImprovementRate: number;
  improvedCount: number;
  improvedRate: number;
  studentCount: number;
}

/**
 * 科目字段映射（从wide格式提取科目分数）
 */
const SUBJECT_FIELDS: Record<string, string> = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  politics: "政治",
  history: "历史",
  geography: "地理",
};

/**
 * 计算各科目增值指标
 */
export function calculateSubjectValueAdded(
  baselineData: WideGradeRecord[],
  targetData: WideGradeRecord[],
  scope: ComparisonScope,
  className?: string
): SubjectValueAddedMetrics[] {
  // 根据scope筛选数据
  let filteredBaseline = baselineData;
  let filteredTarget = targetData;

  if (scope === "class" && className) {
    filteredBaseline = baselineData.filter((r) => r.class_name === className);
    filteredTarget = targetData.filter((r) => r.class_name === className);
  }

  const results: SubjectValueAddedMetrics[] = [];

  // 遍历每个科目
  Object.entries(SUBJECT_FIELDS).forEach(([fieldKey, subjectName]) => {
    const baselineScoreKey = `${fieldKey}_score`;
    const targetScoreKey = `${fieldKey}_score`;

    // 建立学生映射
    const baselineMap = new Map<string, number>();
    filteredBaseline.forEach((record) => {
      if (record.student_id && record[baselineScoreKey] != null) {
        baselineMap.set(record.student_id, Number(record[baselineScoreKey]));
      }
    });

    const targetMap = new Map<string, number>();
    filteredTarget.forEach((record) => {
      if (record.student_id && record[targetScoreKey] != null) {
        targetMap.set(record.student_id, Number(record[targetScoreKey]));
      }
    });

    // 找出同时有两次成绩的学生
    const commonStudents = Array.from(baselineMap.keys()).filter((id) =>
      targetMap.has(id)
    );

    if (commonStudents.length === 0) return;

    // 计算统计指标
    const improvements = commonStudents.map((studentId) => {
      const baseline = baselineMap.get(studentId)!;
      const target = targetMap.get(studentId)!;
      return target - baseline;
    });

    const baselineScores = commonStudents.map((id) => baselineMap.get(id)!);
    const targetScores = commonStudents.map((id) => targetMap.get(id)!);

    const baselineAvg =
      baselineScores.reduce((sum, s) => sum + s, 0) / baselineScores.length;
    const targetAvg =
      targetScores.reduce((sum, s) => sum + s, 0) / targetScores.length;
    const avgImprovement = targetAvg - baselineAvg;
    const avgImprovementRate =
      baselineAvg > 0 ? (avgImprovement / baselineAvg) * 100 : 0;

    const improvedCount = improvements.filter((imp) => imp > 0).length;
    const improvedRate = (improvedCount / improvements.length) * 100;

    results.push({
      subject: fieldKey,
      subjectName,
      baselineAvg: Number(baselineAvg.toFixed(2)),
      targetAvg: Number(targetAvg.toFixed(2)),
      avgImprovement: Number(avgImprovement.toFixed(2)),
      avgImprovementRate: Number(avgImprovementRate.toFixed(2)),
      improvedCount,
      improvedRate: Number(improvedRate.toFixed(1)),
      studentCount: commonStudents.length,
    });
  });

  return results.filter((r) => r.studentCount > 0);
}

/**
 * 识别优势科目和薄弱科目
 */
export function identifySubjectStrengths(
  subjectMetrics: SubjectValueAddedMetrics[]
): {
  strengths: SubjectValueAddedMetrics[];
  weaknesses: SubjectValueAddedMetrics[];
} {
  if (subjectMetrics.length === 0) {
    return { strengths: [], weaknesses: [] };
  }

  // 按进步幅度排序
  const sorted = [...subjectMetrics].sort(
    (a, b) => b.avgImprovement - a.avgImprovement
  );

  // 取前30%为优势，后30%为薄弱
  const strengthCount = Math.max(1, Math.ceil(sorted.length * 0.3));
  const weaknessCount = Math.max(1, Math.ceil(sorted.length * 0.3));

  return {
    strengths: sorted.slice(0, strengthCount),
    weaknesses: sorted.slice(-weaknessCount).reverse(),
  };
}

// ==================== 科目组合分析 ====================

/**
 * 科目组合定义
 */
export interface SubjectGroup {
  name: string;
  subjects: string[];
  description?: string;
}

/**
 * 预定义科目组合
 */
export const PREDEFINED_GROUPS: SubjectGroup[] = [
  {
    name: "文科综合",
    subjects: ["chinese", "politics", "history", "geography"],
    description: "语文、政治、历史、地理",
  },
  {
    name: "理科综合",
    subjects: ["math", "physics", "chemistry", "biology"],
    description: "数学、物理、化学、生物",
  },
  {
    name: "主科",
    subjects: ["chinese", "math", "english"],
    description: "语文、数学、英语",
  },
];

/**
 * 计算科目组合的增值指标
 */
export function calculateGroupValueAdded(
  subjectMetrics: SubjectValueAddedMetrics[],
  group: SubjectGroup
): SubjectValueAddedMetrics | null {
  // 筛选出组内科目
  const groupSubjects = subjectMetrics.filter((m) =>
    group.subjects.includes(m.subject)
  );

  if (groupSubjects.length === 0) return null;

  // 计算加权平均值（按学生人数加权）
  const totalStudents = groupSubjects.reduce(
    (sum, m) => sum + m.studentCount,
    0
  );

  if (totalStudents === 0) return null;

  // 加权平均分数
  const baselineAvg =
    groupSubjects.reduce((sum, m) => sum + m.baselineAvg * m.studentCount, 0) /
    totalStudents;

  const targetAvg =
    groupSubjects.reduce((sum, m) => sum + m.targetAvg * m.studentCount, 0) /
    totalStudents;

  const avgImprovement =
    groupSubjects.reduce(
      (sum, m) => sum + m.avgImprovement * m.studentCount,
      0
    ) / totalStudents;

  const avgImprovementRate =
    groupSubjects.reduce(
      (sum, m) => sum + m.avgImprovementRate * m.studentCount,
      0
    ) / totalStudents;

  // 进步人数和比例（加权计算）
  const totalImprovedCount = groupSubjects.reduce(
    (sum, m) => sum + m.improvedCount,
    0
  );
  const improvedRate = (totalImprovedCount / totalStudents) * 100;

  return {
    subject: group.name,
    subjectName: group.name,
    baselineAvg: Number(baselineAvg.toFixed(2)),
    targetAvg: Number(targetAvg.toFixed(2)),
    avgImprovement: Number(avgImprovement.toFixed(2)),
    avgImprovementRate: Number(avgImprovementRate.toFixed(2)),
    improvedCount: totalImprovedCount,
    improvedRate: Number(improvedRate.toFixed(1)),
    studentCount: totalStudents,
  };
}

// ==================== 趋势预测 ====================

/**
 * 线性回归结果
 */
export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  correlation: number;
}

/**
 * 趋势预测结果
 */
export interface TrendForecast {
  predictedScore: number;
  confidence: number;
  trend: "improving" | "declining" | "stable";
  trendStrength: "strong" | "moderate" | "weak";
}

/**
 * 简单线性回归
 */
function calculateLinearRegression(
  xValues: number[],
  yValues: number[]
): LinearRegressionResult {
  const n = xValues.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0, correlation: 0 };
  }

  // 计算均值
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

  // 计算斜率和截距
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // 计算R²和相关系数
  let ssTotal = 0;
  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssTotal += (yValues[i] - yMean) ** 2;
    ssResidual += (yValues[i] - predicted) ** 2;
  }

  const rSquared = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;
  const correlation = Math.sqrt(Math.abs(rSquared)) * (slope >= 0 ? 1 : -1);

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(2)),
    rSquared: Number(Math.max(0, rSquared).toFixed(4)),
    correlation: Number(correlation.toFixed(4)),
  };
}

/**
 * 预测学生下次考试分数
 */
export function forecastStudentScore(
  studentMetrics: ValueAddedMetrics
): TrendForecast {
  // 使用两次考试的数据进行预测
  const xValues = [0, 1]; // 考试序号
  const yValues = [
    studentMetrics.baselineExam.score,
    studentMetrics.targetExam.score,
  ];

  const regression = calculateLinearRegression(xValues, yValues);

  // 预测下一次（x=2）的分数
  const predictedScore = regression.slope * 2 + regression.intercept;

  // 判断趋势
  let trend: "improving" | "declining" | "stable" = "stable";
  if (regression.slope > 5) {
    trend = "improving";
  } else if (regression.slope < -5) {
    trend = "declining";
  }

  // 趋势强度（基于相关系数）
  let trendStrength: "strong" | "moderate" | "weak" = "weak";
  const absCorrelation = Math.abs(regression.correlation);
  if (absCorrelation > 0.8) {
    trendStrength = "strong";
  } else if (absCorrelation > 0.5) {
    trendStrength = "moderate";
  }

  // 置信度计算：两点回归时R²恒为1，需要调整置信度
  // 基于两点的预测可靠性较低，设置较保守的置信度
  let confidence: number;
  if (xValues.length === 2) {
    // 两点预测：根据分数变化幅度和稳定性给出保守估计
    const improvementAbs = Math.abs(regression.slope);
    if (improvementAbs < 3) {
      confidence = 40; // 变化小，趋势不明显
    } else if (improvementAbs < 10) {
      confidence = 55; // 中等变化
    } else {
      confidence = 70; // 大幅变化，趋势明显
    }
  } else {
    // 多点预测：使用R²值
    confidence = Number((regression.rSquared * 100).toFixed(1));
  }

  return {
    predictedScore: Number(Math.max(0, predictedScore).toFixed(1)),
    confidence,
    trend,
    trendStrength,
  };
}
