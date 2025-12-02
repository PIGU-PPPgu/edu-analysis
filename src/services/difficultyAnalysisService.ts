/**
 * 考试难度分析服务
 * 基于正态分布和统计学原理分析考试难度
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 难度等级定义
export type DifficultyLevel =
  | "very_easy"
  | "easy"
  | "moderate"
  | "hard"
  | "very_hard";

// 难度分析结果
export interface DifficultyAnalysisResult {
  examId: string;
  examTitle: string;
  overallDifficulty: DifficultyLevel;
  difficultyScore: number; // 0-100,数值越高越难
  analysis: {
    mean: number; // 平均分
    median: number; // 中位数
    mode: number; // 众数
    standardDeviation: number; // 标准差
    variance: number; // 方差
    skewness: number; // 偏度
    kurtosis: number; // 峰度
    passRate: number; // 及格率
    excellentRate: number; // 优秀率
    failRate: number; // 不及格率
  };
  distribution: {
    normalDistributionFit: number; // 正态分布拟合度 0-1
    distributionType: "normal" | "left_skewed" | "right_skewed" | "bimodal";
    zScores: number[]; // Z分数分布
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  };
  subjectDifficulty?: Record<
    string,
    {
      difficulty: DifficultyLevel;
      score: number;
      mean: number;
      standardDeviation: number;
    }
  >;
  recommendations: string[];
  insights: string[];
}

/**
 * 分析考试难度
 */
export const analyzeExamDifficulty = async (
  examId: string
): Promise<DifficultyAnalysisResult | null> => {
  try {
    console.log(`[DifficultyAnalysis] 开始分析考试难度: ${examId}`);

    // 获取考试信息
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError) throw examError;

    // 获取成绩数据
    const { data: grades, error: gradesError } = await supabase
      .from("grade_data")
      .select("*")
      .eq("exam_id", examId);

    if (gradesError) throw gradesError;

    if (!grades || grades.length === 0) {
      toast.error("暂无成绩数据,无法分析难度");
      return null;
    }

    // 提取总分数据
    const scores = grades
      .map((g) => g.total_score)
      .filter((s) => s !== null && s !== undefined)
      .map(Number);

    if (scores.length === 0) {
      toast.error("成绩数据不完整");
      return null;
    }

    // 基础统计分析
    const analysis = calculateBasicStatistics(scores);

    // 分布分析
    const distribution = analyzeDistribution(
      scores,
      analysis.mean,
      analysis.standardDeviation
    );

    // 计算难度分数 (基于多个指标的加权平均)
    const difficultyScore = calculateDifficultyScore(analysis, distribution);

    // 确定难度等级
    const overallDifficulty = getDifficultyLevel(difficultyScore);

    // 科目难度分析
    const subjectDifficulty = await analyzeSubjectDifficulty(examId, grades);

    // 生成建议和洞察
    const recommendations = generateRecommendations(
      analysis,
      distribution,
      difficultyScore
    );
    const insights = generateInsights(
      analysis,
      distribution,
      overallDifficulty
    );

    console.log(
      `[DifficultyAnalysis] 分析完成 - 难度: ${overallDifficulty}, 分数: ${difficultyScore}`
    );

    return {
      examId,
      examTitle: exam.title,
      overallDifficulty,
      difficultyScore,
      analysis,
      distribution,
      subjectDifficulty,
      recommendations,
      insights,
    };
  } catch (error) {
    console.error("分析考试难度失败:", error);
    toast.error("分析考试难度失败");
    return null;
  }
};

/**
 * 计算基础统计量
 */
function calculateBasicStatistics(scores: number[]) {
  const n = scores.length;
  const sortedScores = [...scores].sort((a, b) => a - b);

  // 平均分
  const mean = scores.reduce((sum, s) => sum + s, 0) / n;

  // 中位数
  const median =
    n % 2 === 0
      ? (sortedScores[n / 2 - 1] + sortedScores[n / 2]) / 2
      : sortedScores[Math.floor(n / 2)];

  // 众数
  const frequencyMap = new Map<number, number>();
  scores.forEach((score) => {
    frequencyMap.set(score, (frequencyMap.get(score) || 0) + 1);
  });
  const mode = Array.from(frequencyMap.entries()).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  // 方差和标准差
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);

  // 偏度 (Skewness)
  const skewness =
    scores.reduce(
      (sum, s) => sum + Math.pow((s - mean) / standardDeviation, 3),
      0
    ) / n;

  // 峰度 (Kurtosis)
  const kurtosis =
    scores.reduce(
      (sum, s) => sum + Math.pow((s - mean) / standardDeviation, 4),
      0
    ) /
      n -
    3;

  // 及格率、优秀率、不及格率
  const passRate = (scores.filter((s) => s >= 60).length / n) * 100;
  const excellentRate = (scores.filter((s) => s >= 85).length / n) * 100;
  const failRate = (scores.filter((s) => s < 60).length / n) * 100;

  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    mode: Math.round(mode * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    skewness: Math.round(skewness * 100) / 100,
    kurtosis: Math.round(kurtosis * 100) / 100,
    passRate: Math.round(passRate * 100) / 100,
    excellentRate: Math.round(excellentRate * 100) / 100,
    failRate: Math.round(failRate * 100) / 100,
  };
}

/**
 * 分析分数分布
 */
function analyzeDistribution(scores: number[], mean: number, std: number) {
  const n = scores.length;
  const sortedScores = [...scores].sort((a, b) => a - b);

  // 计算Z分数
  const zScores = scores.map((s) => (s - mean) / std);

  // 计算百分位数
  const percentiles = {
    p10: sortedScores[Math.floor(n * 0.1)],
    p25: sortedScores[Math.floor(n * 0.25)],
    p50: sortedScores[Math.floor(n * 0.5)],
    p75: sortedScores[Math.floor(n * 0.75)],
    p90: sortedScores[Math.floor(n * 0.9)],
  };

  // 正态分布拟合度检验 (简化版卡方检验)
  const normalDistributionFit = calculateNormalityFit(zScores);

  // 判断分布类型
  const skewness =
    scores.reduce((sum, s) => sum + Math.pow((s - mean) / std, 3), 0) / n;

  let distributionType: "normal" | "left_skewed" | "right_skewed" | "bimodal" =
    "normal";
  if (Math.abs(skewness) < 0.5) {
    distributionType = "normal";
  } else if (skewness > 0.5) {
    distributionType = "right_skewed"; // 右偏(负偏),简单题目多
  } else {
    distributionType = "left_skewed"; // 左偏(正偏),难题多
  }

  // 检测双峰分布
  if (detectBimodal(scores)) {
    distributionType = "bimodal";
  }

  return {
    normalDistributionFit: Math.round(normalDistributionFit * 100) / 100,
    distributionType,
    zScores,
    percentiles,
  };
}

/**
 * 计算正态分布拟合度 (0-1)
 */
function calculateNormalityFit(zScores: number[]): number {
  // 简化版: 检查Z分数在±1, ±2, ±3标准差内的比例
  const within1Std =
    zScores.filter((z) => Math.abs(z) <= 1).length / zScores.length;
  const within2Std =
    zScores.filter((z) => Math.abs(z) <= 2).length / zScores.length;
  const within3Std =
    zScores.filter((z) => Math.abs(z) <= 3).length / zScores.length;

  // 理论正态分布: 68%, 95%, 99.7%
  const deviation1 = Math.abs(within1Std - 0.68);
  const deviation2 = Math.abs(within2Std - 0.95);
  const deviation3 = Math.abs(within3Std - 0.997);

  const avgDeviation = (deviation1 + deviation2 + deviation3) / 3;
  return Math.max(0, 1 - avgDeviation);
}

/**
 * 检测双峰分布
 */
function detectBimodal(scores: number[]): boolean {
  // 简化检测: 统计分数分段的频次
  const bins = 10;
  const binSize = 100 / bins;
  const histogram = new Array(bins).fill(0);

  scores.forEach((score) => {
    const binIndex = Math.min(Math.floor(score / binSize), bins - 1);
    histogram[binIndex]++;
  });

  // 寻找峰值
  const peaks: number[] = [];
  for (let i = 1; i < histogram.length - 1; i++) {
    if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1]) {
      peaks.push(i);
    }
  }

  return peaks.length >= 2;
}

/**
 * 计算难度分数 (0-100)
 * 分数越高表示越难
 */
function calculateDifficultyScore(analysis: any, distribution: any): number {
  // 多个指标加权计算
  const weights = {
    meanScore: 0.25, // 平均分权重
    passRate: 0.2, // 及格率权重
    excellentRate: 0.15, // 优秀率权重
    standardDeviation: 0.2, // 标准差权重
    distributionFit: 0.2, // 分布拟合度权重
  };

  // 平均分指标 (分数越低,难度越高)
  const meanScoreDifficulty = (100 - analysis.mean) / 100;

  // 及格率指标 (及格率越低,难度越高)
  const passRateDifficulty = (100 - analysis.passRate) / 100;

  // 优秀率指标 (优秀率越低,难度越高)
  const excellentRateDifficulty = (100 - analysis.excellentRate) / 100;

  // 标准差指标 (标准差越大,区分度越好,难度适中)
  // 理想标准差约为15-20分
  const stdDifficulty = Math.abs(analysis.standardDeviation - 17.5) / 20;

  // 分布拟合度 (偏离正态分布越多,难度可能不合理)
  const distributionDifficulty = 1 - distribution.normalDistributionFit;

  // 加权计算
  const difficultyScore =
    (meanScoreDifficulty * weights.meanScore +
      passRateDifficulty * weights.passRate +
      excellentRateDifficulty * weights.excellentRate +
      stdDifficulty * weights.standardDeviation +
      distributionDifficulty * weights.distributionFit) *
    100;

  return Math.round(difficultyScore * 100) / 100;
}

/**
 * 根据难度分数确定难度等级
 */
function getDifficultyLevel(score: number): DifficultyLevel {
  if (score < 20) return "very_easy";
  if (score < 40) return "easy";
  if (score < 60) return "moderate";
  if (score < 80) return "hard";
  return "very_hard";
}

/**
 * 分析各科目难度
 */
async function analyzeSubjectDifficulty(
  examId: string,
  grades: any[]
): Promise<Record<string, any>> {
  const subjectDifficulty: Record<string, any> = {};

  // 按科目分组
  const subjectScores = new Map<string, number[]>();

  grades.forEach((grade) => {
    if (grade.subject && grade.score) {
      if (!subjectScores.has(grade.subject)) {
        subjectScores.set(grade.subject, []);
      }
      subjectScores.get(grade.subject)!.push(grade.score);
    }
  });

  // 分析每个科目
  subjectScores.forEach((scores, subject) => {
    if (scores.length === 0) return;

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);

    // 简化的科目难度评分
    const subjectDifficultyScore = (100 - mean) / 100;
    const difficulty = getDifficultyLevel(subjectDifficultyScore * 100);

    subjectDifficulty[subject] = {
      difficulty,
      score: Math.round(subjectDifficultyScore * 100 * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(std * 100) / 100,
    };
  });

  return subjectDifficulty;
}

/**
 * 生成建议
 */
function generateRecommendations(
  analysis: any,
  distribution: any,
  difficultyScore: number
): string[] {
  const recommendations: string[] = [];

  // 基于难度等级
  if (difficultyScore < 20) {
    recommendations.push("考试偏简单,建议适当增加难题比例");
  } else if (difficultyScore > 80) {
    recommendations.push("考试偏难,建议增加基础题目和中等难度题目");
  }

  // 基于及格率
  if (analysis.passRate < 50) {
    recommendations.push("及格率较低,建议降低题目难度或加强学生辅导");
  } else if (analysis.passRate > 95) {
    recommendations.push("及格率过高,考试区分度不足");
  }

  // 基于标准差
  if (analysis.standardDeviation < 10) {
    recommendations.push("标准差较小,学生水平相近,可适当增加难题拉开差距");
  } else if (analysis.standardDeviation > 25) {
    recommendations.push("标准差较大,学生水平差异明显,建议分层教学");
  }

  // 基于分布
  if (distribution.normalDistributionFit < 0.6) {
    recommendations.push("分数分布偏离正态分布,建议调整题目难度梯度");
  }

  if (distribution.distributionType === "bimodal") {
    recommendations.push("出现双峰分布,学生可能存在明显的两极分化");
  }

  return recommendations;
}

/**
 * 生成洞察
 */
function generateInsights(
  analysis: any,
  distribution: any,
  difficulty: DifficultyLevel
): string[] {
  const insights: string[] = [];

  const difficultyText = {
    very_easy: "非常简单",
    easy: "简单",
    moderate: "适中",
    hard: "困难",
    very_hard: "非常困难",
  };

  insights.push(`整体难度: ${difficultyText[difficulty]}`);
  insights.push(
    `平均分: ${analysis.mean}分,标准差: ${analysis.standardDeviation}分`
  );
  insights.push(
    `及格率: ${analysis.passRate}%,优秀率: ${analysis.excellentRate}%`
  );

  if (distribution.distributionType === "normal") {
    insights.push("分数呈正态分布,试题难度梯度合理");
  } else if (distribution.distributionType === "left_skewed") {
    insights.push("分数左偏,高分段学生较多");
  } else if (distribution.distributionType === "right_skewed") {
    insights.push("分数右偏,低分段学生较多");
  } else {
    insights.push("分数呈双峰分布,存在学生分层现象");
  }

  return insights;
}
