/**
 * 预警分析服务
 * 提供各种预警算法和工具函数
 */

// 学生数据接口
export interface StudentData {
  id: string;
  name: string;
  class: string;
  examAverage: number;
  previousExamAverage?: number;
  homeworkCompletionRate: number;
  participationScore: number;
  teacherRating: number;
  subjectScores: Record<string, number>;
  historicalData?: {
    examScores: { date: string; score: number }[];
    homeworkScores: { date: string; score: number }[];
    participationScores: { date: string; score: number }[];
  };
}

// 预警级别
export type RiskLevel = "high" | "medium" | "low" | "none";

// 预警结果接口
export interface WarningResult {
  studentId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  warningDate: string;
}

/**
 * 1. 加权多因素评分算法
 * 根据学生的多种维度指标，计算加权风险评分
 */
export function calculateRiskScore(student: StudentData): {
  score: number;
  level: RiskLevel;
  factors: string[];
} {
  // 定义各维度权重
  const weights = {
    examScore: 0.4,
    homeworkCompletion: 0.3,
    participationScore: 0.2,
    teacherRating: 0.1,
  };

  // 初始化风险因素数组
  const riskFactors: string[] = [];

  // 计算并归一化考试成绩指标 (0-100)
  const examScore = student.examAverage;
  // 考试成绩低于60分视为风险因素
  if (examScore < 60) {
    riskFactors.push("考试成绩不及格");
  } else if (examScore < 70) {
    riskFactors.push("考试成绩较低");
  }

  // 如果有先前的考试成绩，计算变化
  if (student.previousExamAverage && student.previousExamAverage > 0) {
    const examChange = student.examAverage - student.previousExamAverage;
    if (examChange < -10) {
      riskFactors.push(`考试成绩下降显著 (${examChange.toFixed(1)}分)`);
    }
  }

  // 归一化作业完成率 (0-100)
  const homeworkScore = student.homeworkCompletionRate * 100;
  if (homeworkScore < 70) {
    riskFactors.push(`作业完成率低 (${homeworkScore.toFixed(1)}%)`);
  }

  // 归一化参与度分数 (0-100)
  const participationScore = student.participationScore;
  if (participationScore < 60) {
    riskFactors.push("课堂参与度不足");
  }

  // 归一化教师评分 (0-100)
  const teacherScore = student.teacherRating * 20; // 假设教师评分为1-5分
  if (teacherScore < 60) {
    riskFactors.push("教师评价较差");
  }

  // 计算加权风险分数 (风险分数越高表示风险越大，与正常分数相反)
  let riskScore = 0;
  riskScore += (100 - examScore) * weights.examScore;
  riskScore += (100 - homeworkScore) * weights.homeworkCompletion;
  riskScore += (100 - participationScore) * weights.participationScore;
  riskScore += (100 - teacherScore) * weights.teacherRating;

  // 确定风险级别
  let riskLevel: RiskLevel = "none";
  if (riskScore >= 70) {
    riskLevel = "high";
  } else if (riskScore >= 50) {
    riskLevel = "medium";
  } else if (riskScore >= 30) {
    riskLevel = "low";
  }

  return {
    score: riskScore,
    level: riskLevel,
    factors: riskFactors,
  };
}

/**
 * 2. 分类模型预警算法
 * 使用简化的决策树逻辑对学生进行风险分类
 */
export function classifyStudentRisk(student: StudentData): {
  riskLevel: RiskLevel;
  confidence: number;
  factors: string[];
} {
  const factors: string[] = [];

  // 决策树逻辑 - 简化版
  // 规则1: 考试成绩低于60且作业完成率低于70%
  if (student.examAverage < 60 && student.homeworkCompletionRate < 0.7) {
    factors.push("学业成绩差且作业完成率低");
    return { riskLevel: "high", confidence: 0.9, factors };
  }

  // 规则2: 考试成绩与先前相比下降超过15分
  if (
    student.previousExamAverage &&
    student.previousExamAverage - student.examAverage > 15
  ) {
    factors.push("考试成绩大幅下滑");
    return { riskLevel: "high", confidence: 0.85, factors };
  }

  // 规则3: 考试成绩低于60或作业完成率低于60%
  if (student.examAverage < 60 || student.homeworkCompletionRate < 0.6) {
    factors.push(
      student.examAverage < 60 ? "考试成绩不及格" : "作业完成率很低"
    );
    return { riskLevel: "medium", confidence: 0.75, factors };
  }

  // 规则4: 参与度低于50且教师评分低于3
  if (student.participationScore < 50 && student.teacherRating < 3) {
    factors.push("课堂参与度不足且教师评价较差");
    return { riskLevel: "medium", confidence: 0.7, factors };
  }

  // 规则5: 部分指标较差
  if (
    student.examAverage < 70 ||
    student.homeworkCompletionRate < 0.8 ||
    student.participationScore < 60
  ) {
    if (student.examAverage < 70) factors.push("考试成绩较低");
    if (student.homeworkCompletionRate < 0.8) factors.push("作业完成不够理想");
    if (student.participationScore < 60) factors.push("课堂参与度较低");

    return { riskLevel: "low", confidence: 0.65, factors };
  }

  // 无风险
  return { riskLevel: "none", confidence: 0.8, factors: ["所有指标正常"] };
}

/**
 * 3. 趋势分析预警算法
 * 分析学生历史数据的变化趋势
 */
export function analyzeTrend(student: StudentData): {
  hasTrend: boolean;
  trendDirection: "improving" | "declining" | "stable";
  trendStrength: number; // 0-1 值，表示趋势的强度
  riskLevel: RiskLevel;
  factors: string[];
} {
  const factors: string[] = [];

  // 如果没有历史数据，无法进行趋势分析
  if (
    !student.historicalData ||
    !student.historicalData.examScores ||
    student.historicalData.examScores.length < 3
  ) {
    return {
      hasTrend: false,
      trendDirection: "stable",
      trendStrength: 0,
      riskLevel: "none",
      factors: ["数据不足，无法进行趋势分析"],
    };
  }

  // 计算考试成绩趋势
  const examScores = student.historicalData.examScores
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item) => item.score);

  const examTrend = calculateLinearRegression(examScores);

  // 如果作业数据可用，计算作业完成趋势
  let homeworkTrend = { slope: 0, correlation: 0 };
  if (
    student.historicalData.homeworkScores &&
    student.historicalData.homeworkScores.length >= 3
  ) {
    const homeworkScores = student.historicalData.homeworkScores
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => item.score);

    homeworkTrend = calculateLinearRegression(homeworkScores);
  }

  // 如果参与度数据可用，计算参与度趋势
  let participationTrend = { slope: 0, correlation: 0 };
  if (
    student.historicalData.participationScores &&
    student.historicalData.participationScores.length >= 3
  ) {
    const participationScores = student.historicalData.participationScores
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => item.score);

    participationTrend = calculateLinearRegression(participationScores);
  }

  // 合并所有趋势，计算整体趋势
  // 给不同指标分配权重
  const weightedSlope =
    examTrend.slope * 0.5 +
    homeworkTrend.slope * 0.3 +
    participationTrend.slope * 0.2;

  // 判断趋势方向和强度
  const trendDirection =
    weightedSlope > 0.1
      ? "improving"
      : weightedSlope < -0.1
        ? "declining"
        : "stable";

  // 计算趋势强度 (0-1)
  const trendStrength = Math.min(1, Math.abs(weightedSlope) / 2);

  // 添加趋势因素
  if (examTrend.slope < -1) {
    factors.push(`考试成绩呈下降趋势 (${examTrend.slope.toFixed(2)}分/次)`);
  }

  if (homeworkTrend.slope < -0.05) {
    factors.push("作业完成情况逐渐变差");
  }

  if (participationTrend.slope < -1) {
    factors.push("课堂参与度持续下降");
  }

  // 确定风险级别
  let riskLevel: RiskLevel = "none";

  // 严重下降趋势表示高风险
  if (trendDirection === "declining" && trendStrength > 0.7) {
    riskLevel = "high";
  }
  // 中等下降趋势表示中等风险
  else if (trendDirection === "declining" && trendStrength > 0.4) {
    riskLevel = "medium";
  }
  // 轻微下降趋势表示低风险
  else if (trendDirection === "declining" && trendStrength > 0.2) {
    riskLevel = "low";
  }

  return {
    hasTrend: true,
    trendDirection,
    trendStrength,
    riskLevel,
    factors,
  };
}

/**
 * 计算线性回归
 * 用于趋势分析
 */
export function calculateLinearRegression(values: number[]): {
  slope: number; // 斜率
  correlation: number; // 相关系数
} {
  const n = values.length;

  // 如果数据点少于2个，无法计算趋势
  if (n < 2) {
    return { slope: 0, correlation: 0 };
  }

  // 创建X值（时间序列）
  const x = Array.from({ length: n }, (_, i) => i);

  // 计算平均值
  const avgX = x.reduce((sum, val) => sum + val, 0) / n;
  const avgY = values.reduce((sum, val) => sum + val, 0) / n;

  // 计算方差和协方差
  let varX = 0;
  let varY = 0;
  let covXY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - avgX;
    const dy = values[i] - avgY;

    varX += dx * dx;
    varY += dy * dy;
    covXY += dx * dy;
  }

  // 计算斜率和相关系数
  const slope = covXY / varX;
  const correlation = covXY / Math.sqrt(varX * varY);

  return { slope, correlation };
}

/**
 * 综合预警算法
 * 结合多种算法，生成最终的预警结果
 */
export function generateWarning(student: StudentData): WarningResult {
  // 1. 计算加权风险评分
  const riskScore = calculateRiskScore(student);

  // 2. 使用分类模型进行预警
  const classification = classifyStudentRisk(student);

  // 3. 分析趋势
  const trend = analyzeTrend(student);

  // 综合所有算法结果，确定最终风险级别
  let finalRiskLevel: RiskLevel = "none";

  // 如果任一算法返回高风险，则最终结果为高风险
  if (
    riskScore.level === "high" ||
    classification.riskLevel === "high" ||
    trend.riskLevel === "high"
  ) {
    finalRiskLevel = "high";
  }
  // 如果有两个或以上算法返回中等风险，则最终结果为中等风险
  else if (
    [riskScore.level, classification.riskLevel, trend.riskLevel].filter(
      (level) => level === "medium"
    ).length >= 2
  ) {
    finalRiskLevel = "medium";
  }
  // 如果只有一个算法返回中等风险，或至少有两个算法返回低风险，则最终结果为低风险
  else if (
    riskScore.level === "medium" ||
    classification.riskLevel === "medium" ||
    trend.riskLevel === "medium" ||
    [riskScore.level, classification.riskLevel, trend.riskLevel].filter(
      (level) => level === "low"
    ).length >= 2
  ) {
    finalRiskLevel = "low";
  }

  // 合并所有风险因素
  const allFactors = [
    ...riskScore.factors,
    ...classification.factors,
    ...trend.factors,
  ];

  // 去除重复因素
  const uniqueFactors = Array.from(new Set(allFactors));

  return {
    studentId: student.id,
    riskLevel: finalRiskLevel,
    riskScore: riskScore.score,
    riskFactors: uniqueFactors,
    warningDate: new Date().toISOString(),
  };
}

/**
 * 批量生成学生预警
 */
export function generateBatchWarnings(
  students: StudentData[]
): WarningResult[] {
  return students.map((student) => generateWarning(student));
}

/**
 * 风险因素聚合统计
 * 统计所有预警中的风险因素出现频率
 */
export function aggregateRiskFactors(warnings: WarningResult[]): {
  factor: string;
  count: number;
  percentage: number;
}[] {
  // 创建因素计数映射
  const factorCounts: Record<string, number> = {};

  // 计算每个因素出现的次数
  warnings.forEach((warning) => {
    warning.riskFactors.forEach((factor) => {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1;
    });
  });

  // 转换为数组并计算百分比
  const total = warnings.length;
  const factorStats = Object.entries(factorCounts).map(([factor, count]) => ({
    factor,
    count,
    percentage: (count / total) * 100,
  }));

  // 按出现次数排序
  return factorStats.sort((a, b) => b.count - a.count);
}

/**
 * 风险级别分布统计
 */
export function aggregateRiskLevels(warnings: WarningResult[]): {
  level: RiskLevel;
  count: number;
  percentage: number;
}[] {
  // 创建级别计数映射
  const levelCounts: Record<RiskLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  };

  // 计算每个级别的学生数量
  warnings.forEach((warning) => {
    levelCounts[warning.riskLevel]++;
  });

  // 转换为数组并计算百分比
  const total = warnings.length;
  return Object.entries(levelCounts).map(([level, count]) => ({
    level: level as RiskLevel,
    count,
    percentage: (count / total) * 100,
  }));
}
