/**
 * 关联分析服务
 * 提供关联分析和数据挖掘功能
 */
import { StudentData, WarningResult } from "./warningAnalytics";

/**
 * 关联规则接口
 */
export interface AssociationRule {
  antecedent: string[]; // 前件（条件）
  consequent: string[]; // 后件（结果）
  support: number; // 支持度
  confidence: number; // 置信度
  lift?: number; // 提升度（可选）
}

/**
 * 计算两个指标之间的关联强度（相关系数）
 * @param data 学生数据数组
 * @param metricA 第一个度量指标名称
 * @param metricB 第二个度量指标名称
 * @returns 相关系数（-1到1之间）
 */
export function calculateCorrelation(
  data: any[],
  metricA: string,
  metricB: string
): number {
  // 提取两个指标的数据
  const valuesA = data
    .map((item) => getNestedProperty(item, metricA))
    .filter((v) => v !== undefined && v !== null);
  const valuesB = data
    .map((item) => getNestedProperty(item, metricB))
    .filter((v) => v !== undefined && v !== null);

  // 确保数据长度一致
  const length = Math.min(valuesA.length, valuesB.length);

  if (length < 2) {
    return 0; // 数据不足，无法计算相关性
  }

  // 计算平均值
  const avgA =
    valuesA.slice(0, length).reduce((sum, val) => sum + val, 0) / length;
  const avgB =
    valuesB.slice(0, length).reduce((sum, val) => sum + val, 0) / length;

  // 计算协方差和标准差
  let covariance = 0;
  let stdDevA = 0;
  let stdDevB = 0;

  for (let i = 0; i < length; i++) {
    const diffA = valuesA[i] - avgA;
    const diffB = valuesB[i] - avgB;
    covariance += diffA * diffB;
    stdDevA += diffA * diffA;
    stdDevB += diffB * diffB;
  }

  // 避免除以零
  if (stdDevA === 0 || stdDevB === 0) {
    return 0;
  }

  // 计算相关系数（皮尔逊相关系数）
  return covariance / (Math.sqrt(stdDevA) * Math.sqrt(stdDevB));
}

/**
 * 获取对象的嵌套属性
 * 支持使用点号访问嵌套属性，如 "historicalData.examScores"
 */
function getNestedProperty(obj: any, path: string): any {
  return path
    .split(".")
    .reduce(
      (current, key) =>
        current && current[key] !== undefined ? current[key] : undefined,
      obj
    );
}

/**
 * 查找与特定指标强相关的其他指标
 * @param data 学生数据
 * @param targetMetric 目标度量指标
 * @param threshold 关联强度阈值（默认0.6）
 * @returns 关联指标及强度
 */
export function findStrongAssociations(
  data: any[],
  targetMetric: string,
  threshold = 0.6
): Array<{ metric: string; correlation: number }> {
  // 获取所有可能的度量指标
  const sampleStudent = data[0] || {};
  const possibleMetrics = getAllNumericProperties(sampleStudent);

  // 计算每个指标与目标指标的关联强度
  const associations = possibleMetrics
    .filter((metric) => metric !== targetMetric)
    .map((metric) => ({
      metric,
      correlation: calculateCorrelation(data, targetMetric, metric),
    }))
    .filter((item) => !isNaN(item.correlation));

  // 返回强关联的指标
  return associations
    .filter((item) => Math.abs(item.correlation) >= threshold)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * 递归获取对象中所有的数值类型属性路径
 * @param obj 要分析的对象
 * @param prefix 当前路径前缀
 * @returns 数值类型属性路径数组
 */
function getAllNumericProperties(obj: any, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];

  const result: string[] = [];

  for (const key in obj) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === "number") {
      result.push(path);
    } else if (Array.isArray(obj[key]) && obj[key].length > 0) {
      // 对于数组，我们不递归进入，但如果数组元素有score属性，也纳入考虑
      if (obj[key][0] && typeof obj[key][0].score === "number") {
        result.push(`${path}.score`);
      }
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      result.push(...getAllNumericProperties(obj[key], path));
    }
  }

  return result;
}

/**
 * 生成学生特征交易记录
 * 将数值型特征离散化为事件项，用于关联规则挖掘
 * @param students 学生数据
 * @returns 交易记录（每个学生的特征事件集合）
 */
export function generateTransactions(students: StudentData[]): string[][] {
  return students.map((student) => {
    const events: string[] = [];

    // 基于考试成绩添加事件
    if (student.examAverage < 60) {
      events.push("low_exam_score");
    } else if (student.examAverage >= 90) {
      events.push("high_exam_score");
    } else if (student.examAverage >= 75) {
      events.push("good_exam_score");
    }

    // 基于作业完成率添加事件
    if (student.homeworkCompletionRate < 0.7) {
      events.push("low_homework_completion");
    } else if (student.homeworkCompletionRate > 0.9) {
      events.push("high_homework_completion");
    }

    // 基于参与度添加事件
    if (student.participationScore < 60) {
      events.push("low_participation");
    } else if (student.participationScore > 85) {
      events.push("high_participation");
    }

    // 基于教师评价添加事件
    if (student.teacherRating < 3) {
      events.push("negative_feedback");
    } else if (student.teacherRating >= 4.5) {
      events.push("positive_feedback");
    }

    // 检查成绩变化（如果有历史数据）
    if (student.previousExamAverage && student.previousExamAverage > 0) {
      const change = student.examAverage - student.previousExamAverage;
      if (change <= -15) {
        events.push("significant_grade_drop");
      } else if (change <= -5) {
        events.push("grade_drop");
      } else if (change >= 10) {
        events.push("grade_improvement");
      }
    }

    return events;
  });
}

/**
 * 生成关联规则，发现频繁共现的事件
 * @param transactions 交易记录数组
 * @param minSupport 最小支持度
 * @param minConfidence 最小置信度
 * @returns 关联规则
 */
export function generateAssociationRules(
  transactions: string[][],
  minSupport = 0.1,
  minConfidence = 0.5
): AssociationRule[] {
  // 1. 计算项集支持度
  const itemsets = findFrequentItemsets(transactions, minSupport);

  // 2. 生成关联规则
  const rules: AssociationRule[] = [];

  for (const itemset of itemsets) {
    if (itemset.items.length < 2) continue;

    // 生成该项集的所有可能规则
    const subsets = generateSubsets(itemset.items);

    for (const subset of subsets) {
      if (subset.length === 0 || subset.length === itemset.items.length)
        continue;

      // 计算剩余项
      const remaining = itemset.items.filter((item) => !subset.includes(item));

      // 计算置信度
      const subsetSupport = calculateSupport(transactions, subset);
      const confidence = itemset.support / subsetSupport;

      // 计算提升度
      const remainingSupport = calculateSupport(transactions, remaining);
      const lift = confidence / remainingSupport;

      if (confidence >= minConfidence) {
        rules.push({
          antecedent: subset,
          consequent: remaining,
          support: itemset.support,
          confidence: confidence,
          lift: lift,
        });
      }
    }
  }

  return rules.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 查找频繁项集
 * 使用Apriori算法查找频繁项集
 * @param transactions 交易记录
 * @param minSupport 最小支持度
 * @returns 频繁项集及其支持度
 */
function findFrequentItemsets(
  transactions: string[][],
  minSupport: number
): Array<{ items: string[]; support: number }> {
  // 收集所有唯一项
  const uniqueItems = new Set<string>();
  transactions.forEach((transaction) => {
    transaction.forEach((item) => uniqueItems.add(item));
  });

  // 生成所有1项集
  let currentLevelItemsets = Array.from(uniqueItems).map((item) => [item]);
  const frequentItemsets: Array<{ items: string[]; support: number }> = [];

  // 逐级生成频繁项集，直到没有更多频繁项集可生成
  while (currentLevelItemsets.length > 0) {
    // 计算当前级别项集的支持度
    const currentLevelFrequent = currentLevelItemsets
      .map((itemset) => ({
        items: itemset,
        support: calculateSupport(transactions, itemset),
      }))
      .filter((item) => item.support >= minSupport);

    // 添加到频繁项集列表中
    frequentItemsets.push(...currentLevelFrequent);

    // 如果没有频繁项集，中止循环
    if (currentLevelFrequent.length === 0) break;

    // 生成下一级候选项集
    currentLevelItemsets = generateCandidates(
      currentLevelFrequent.map((item) => item.items),
      currentLevelItemsets[0].length + 1
    );
  }

  return frequentItemsets;
}

/**
 * 生成候选项集
 * @param frequentItemsets 当前级别的频繁项集
 * @param k 下一级项集的大小
 * @returns 候选项集
 */
function generateCandidates(
  frequentItemsets: string[][],
  k: number
): string[][] {
  const candidates: string[][] = [];

  // 只处理非空的频繁项集列表
  if (frequentItemsets.length === 0 || k < 2) return candidates;

  // 生成候选项集
  for (let i = 0; i < frequentItemsets.length; i++) {
    for (let j = i + 1; j < frequentItemsets.length; j++) {
      // 比较前k-2个元素是否相同
      const itemset1 = [...frequentItemsets[i]].sort();
      const itemset2 = [...frequentItemsets[j]].sort();

      let canMerge = true;
      for (let l = 0; l < k - 2; l++) {
        if (itemset1[l] !== itemset2[l]) {
          canMerge = false;
          break;
        }
      }

      if (canMerge && itemset1[k - 2] !== itemset2[k - 2]) {
        // 合并项集
        const candidate = [...itemset1.slice(0, k - 1), itemset2[k - 2]].sort();

        // 检查所有k-1项子集是否都是频繁项集
        const isValid = getAllSubsets(candidate, k - 1).every((subset) =>
          frequentItemsets.some((itemset) =>
            arraysEqual(itemset.sort(), subset.sort())
          )
        );

        if (isValid) {
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}

/**
 * 获取项集的所有特定大小的子集
 * @param itemset 项集
 * @param size 子集大小
 * @returns 特定大小的所有子集
 */
function getAllSubsets(itemset: string[], size: number): string[][] {
  if (size > itemset.length) return [];
  if (size === 0) return [[]];
  if (size === itemset.length) return [itemset];

  const result: string[][] = [];

  // 递归生成子集
  function backtrack(start: number, current: string[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < itemset.length; i++) {
      current.push(itemset[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

/**
 * 检查两个数组是否相等
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 计算项集支持度
 * @param transactions 交易记录
 * @param itemset 项集
 * @returns 支持度（0-1之间）
 */
function calculateSupport(transactions: string[][], itemset: string[]): number {
  if (itemset.length === 0) return 1.0; // 空集支持度为1

  let count = 0;
  const total = transactions.length;

  for (const transaction of transactions) {
    if (itemset.every((item) => transaction.includes(item))) {
      count++;
    }
  }

  return count / total;
}

/**
 * 生成项集的所有非空真子集
 * @param items 项集
 * @returns 所有非空真子集
 */
function generateSubsets(items: string[]): string[][] {
  const subsets: string[][] = [];

  // 位掩码方法生成所有子集
  const n = items.length;
  // 从1开始，跳过空集；到2^n - 1结束，跳过原集合
  for (let i = 1; i < (1 << n) - 1; i++) {
    const subset: string[] = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        subset.push(items[j]);
      }
    }
    subsets.push(subset);
  }

  return subsets;
}

/**
 * 将学生数据转换为风险事件交易记录
 * 用于挖掘风险因素之间的关联规则
 * @param warnings 已生成的预警结果
 * @returns 交易记录数组
 */
export function convertWarningsToTransactions(
  warnings: WarningResult[]
): string[][] {
  return warnings
    .filter((warning) => warning.riskFactors.length > 0)
    .map((warning) => {
      // 规范化风险因素名称，转换为事件代码
      return warning.riskFactors.map((factor) =>
        factor
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, "_")
      );
    });
}

/**
 * 将挖掘出的关联规则转换为可读的警示性规则
 * @param rules 关联规则数组
 * @returns 格式化后的警示性规则
 */
export function formatRulesAsWarnings(rules: AssociationRule[]): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  confidence: number;
  support: number;
  lift: number;
  riskLevel: string;
}> {
  // 风险事件代码到可读名称的映射
  const eventNameMap: Record<string, string> = {
    low_exam_score: "考试成绩不及格",
    low_homework_completion: "作业完成率低",
    low_participation: "课堂参与度不足",
    negative_feedback: "教师评价差",
    significant_grade_drop: "成绩大幅下滑",
    grade_drop: "成绩有所下降",
    high_exam_score: "考试成绩优秀",
    high_homework_completion: "作业完成率高",
    high_participation: "课堂参与度高",
    positive_feedback: "教师评价好",
    grade_improvement: "成绩有所提升",
  };

  return rules.map((rule, index) => {
    // 获取可读的条件和结果描述
    const conditions = rule.antecedent.map(
      (code) => eventNameMap[code] || formatEventCode(code)
    );

    const results = rule.consequent.map(
      (code) => eventNameMap[code] || formatEventCode(code)
    );

    // 确定风险级别
    let riskLevel = "low";
    if (rule.confidence > 0.8 && rule.lift > 1.5) {
      riskLevel = "high";
    } else if (rule.confidence > 0.6 && rule.lift > 1.2) {
      riskLevel = "medium";
    }

    // 构建规则名称和描述
    const name = `${conditions.join("且")} => ${results.join("且")}`;
    const description = `当学生${conditions.join("且")}时，有${(rule.confidence * 100).toFixed(1)}%的可能${results.join("且")}`;

    return {
      id: `rule_${index}_${Date.now().toString(36)}`,
      name,
      description,
      category: "关联规则",
      confidence: rule.confidence,
      support: rule.support,
      lift: rule.lift || 1.0,
      riskLevel,
    };
  });
}

/**
 * 将事件代码格式化为可读文本
 */
function formatEventCode(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * 分析多个指标之间的相关性矩阵
 * @param data 数据数组
 * @param metrics 要分析的指标名称数组
 * @returns 相关性矩阵
 */
export function createCorrelationMatrix(
  data: any[],
  metrics: string[]
): Array<Array<number>> {
  const matrix: number[][] = [];

  // 为每对指标计算相关性
  for (let i = 0; i < metrics.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < metrics.length; j++) {
      if (i === j) {
        matrix[i][j] = 1; // 自相关为1
      } else {
        matrix[i][j] = calculateCorrelation(data, metrics[i], metrics[j]);
      }
    }
  }

  return matrix;
}
