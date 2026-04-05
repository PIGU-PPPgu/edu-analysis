/**
 * 学科均衡分析计算服务
 * 用于评估班级学科发展的均衡性
 */

import type {
  SubjectBalanceAnalysis,
  SubjectValueAddedDetail,
} from "@/types/valueAddedTypes";

import {
  calculateStandardDeviation,
  safeDivide,
  groupBy,
} from "@/utils/statistics";

// ============================================
// 接口定义
// ============================================

/** 班级科目数据（输入）— 直接传入预计算的增值率，避免用原始分重算 */
interface ClassSubjectData {
  class_name: string;
  subject: string;
  /** 已由 classValueAddedService 计算好的增值率（OLS 残差均值） */
  value_added_rate: number;
}

/** 学科均衡分析参数 */
interface SubjectBalanceParams {
  /** 班级科目数据 */
  classSubjectData: ClassSubjectData[];

  /** 权重配置 */
  weights?: {
    totalValueAdded: number; // 总分增值权重
    deviation: number; // 偏离度权重
  };
}

// ============================================
// 核心计算函数
// ============================================

/**
 * 计算学科均衡分析
 */
export async function calculateSubjectBalance(
  params: SubjectBalanceParams
): Promise<SubjectBalanceAnalysis[]> {
  const {
    classSubjectData,
    weights = { totalValueAdded: 0.6, deviation: 0.4 },
  } = params;

  // 1. 按班级分组
  const classesByName = groupBy(classSubjectData, (d) => d.class_name);

  // 2. 计算每个班级的学科均衡数据
  const results: SubjectBalanceAnalysis[] = [];

  for (const [className, subjectData] of Object.entries(classesByName)) {
    const analysis = await calculateSingleClassBalance({
      className,
      subjectData,
      weights,
    });

    results.push(analysis);
  }

  // 3. 添加排名信息
  addBalanceRankings(results);

  return results;
}

/**
 * 计算单个班级的学科均衡分析
 */
async function calculateSingleClassBalance(params: {
  className: string;
  subjectData: ClassSubjectData[];
  weights: { totalValueAdded: number; deviation: number };
}): Promise<SubjectBalanceAnalysis> {
  const { className, subjectData, weights } = params;

  // 1. 直接使用预计算的增值率构建科目详情
  const subjectDetails: SubjectValueAddedDetail[] = subjectData.map((data) => ({
    subject: data.subject,
    value_added_rate: data.value_added_rate,
    deviation_from_avg: 0, // 稍后计算
  }));

  // 2. 计算平均增值率
  const avgValueAddedRate =
    subjectDetails.reduce((sum, s) => sum + s.value_added_rate, 0) /
    subjectDetails.length;

  // 3. 计算各科目偏离度
  subjectDetails.forEach((detail) => {
    detail.deviation_from_avg = detail.value_added_rate - avgValueAddedRate;
  });

  // 4. 计算学科偏离度（标准差）
  const valueAddedRates = subjectDetails.map((s) => s.value_added_rate);
  const subjectDeviation = calculateStandardDeviation(valueAddedRates);

  // 5. 科目均衡指数 SBI = 1 - std / |mean|
  // 均值接近0时 SBI 无意义，设为 null；否则越接近1越均衡
  const subject_balance_index =
    Math.abs(avgValueAddedRate) > 0.001
      ? 1 - safeDivide(subjectDeviation, Math.abs(avgValueAddedRate))
      : undefined;

  // 6. 综合均衡得分（保留原有权重逻辑）
  const deviationScore = -subjectDeviation;
  const balanceScore =
    weights.totalValueAdded * avgValueAddedRate +
    weights.deviation * deviationScore;

  return {
    class_name: className,
    total_score_value_added_rate: avgValueAddedRate,
    subject_deviation: subjectDeviation,
    deviation_score: deviationScore,
    subjects: subjectDetails,
    balance_score: balanceScore,
    subject_balance_index,
  };
}

/**
 * 添加排名信息
 */
function addBalanceRankings(results: SubjectBalanceAnalysis[]): void {
  // 按总分增值率降序排序
  const sortedByTotal = [...results].sort(
    (a, b) => b.total_score_value_added_rate - a.total_score_value_added_rate
  );

  // 添加总分排名
  sortedByTotal.forEach((result, index) => {
    result.total_rank = index + 1;
  });

  // 为每个科目添加排名
  const allSubjects = new Set<string>();
  results.forEach((r) => r.subjects.forEach((s) => allSubjects.add(s.subject)));

  allSubjects.forEach((subject) => {
    const subjectData = results
      .map((r) => ({
        class_name: r.class_name,
        detail: r.subjects.find((s) => s.subject === subject),
      }))
      .filter((d) => d.detail !== undefined) as Array<{
      class_name: string;
      detail: SubjectValueAddedDetail;
    }>;

    // 按该科目的增值率降序排序
    const sorted = [...subjectData].sort(
      (a, b) => b.detail.value_added_rate - a.detail.value_added_rate
    );

    // 添加排名
    sorted.forEach((item, index) => {
      item.detail.rank = index + 1;
    });
  });
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取班级学科均衡评价等级
 */
export function getBalanceLevel(subjectDeviation: number): {
  level: "excellent" | "good" | "fair" | "poor";
  label: string;
  color: string;
} {
  if (subjectDeviation < 0.1) {
    return { level: "excellent", label: "优秀", color: "#10b981" };
  } else if (subjectDeviation < 0.2) {
    return { level: "good", label: "良好", color: "#3b82f6" };
  } else if (subjectDeviation < 0.3) {
    return { level: "fair", label: "一般", color: "#f59e0b" };
  } else {
    return { level: "poor", label: "需改进", color: "#ef4444" };
  }
}

/**
 * 识别优势和弱势科目
 */
export function identifyStrengthsAndWeaknesses(
  subjects: SubjectValueAddedDetail[]
): {
  strengths: SubjectValueAddedDetail[];
  weaknesses: SubjectValueAddedDetail[];
} {
  const avgRate =
    subjects.reduce((sum, s) => sum + s.value_added_rate, 0) / subjects.length;
  const stdDev = calculateStandardDeviation(
    subjects.map((s) => s.value_added_rate)
  );

  // 优势科目：增值率 > 平均值 + 0.5*标准差
  const strengths = subjects.filter(
    (s) => s.value_added_rate > avgRate + 0.5 * stdDev
  );

  // 弱势科目：增值率 < 平均值 - 0.5*标准差
  const weaknesses = subjects.filter(
    (s) => s.value_added_rate < avgRate - 0.5 * stdDev
  );

  return { strengths, weaknesses };
}

/**
 * 生成学科均衡建议
 */
export function generateBalanceSuggestions(
  analysis: SubjectBalanceAnalysis
): string[] {
  const suggestions: string[] = [];
  const balanceLevel = getBalanceLevel(analysis.subject_deviation);
  const { strengths, weaknesses } = identifyStrengthsAndWeaknesses(
    analysis.subjects
  );

  // 根据均衡度等级给出建议
  if (balanceLevel.level === "excellent") {
    suggestions.push("学科发展非常均衡，各科目表现优异，继续保持！");
  } else if (balanceLevel.level === "good") {
    suggestions.push("学科发展较为均衡，整体表现良好。");
  } else if (balanceLevel.level === "fair") {
    suggestions.push("学科发展存在一定差异，建议关注弱势科目。");
  } else {
    suggestions.push("学科发展不够均衡，需要重点改进弱势科目。");
  }

  // 优势科目建议
  if (strengths.length > 0) {
    const subjectNames = strengths.map((s) => s.subject).join("、");
    suggestions.push(`优势科目：${subjectNames}，保持教学优势，总结成功经验。`);
  }

  // 弱势科目建议
  if (weaknesses.length > 0) {
    const subjectNames = weaknesses.map((s) => s.subject).join("、");
    suggestions.push(
      `弱势科目：${subjectNames}，建议加强教学投入，借鉴优势科目经验。`
    );
  }

  // 根据总体增值情况给出建议
  if (analysis.total_score_value_added_rate > 0.1) {
    suggestions.push("总体增值表现优秀，教学效果显著。");
  } else if (analysis.total_score_value_added_rate < -0.1) {
    suggestions.push("总体增值表现需要改进，建议全面检视教学策略。");
  }

  return suggestions;
}
