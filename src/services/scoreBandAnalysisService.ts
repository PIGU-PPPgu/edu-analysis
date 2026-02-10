/**
 * 分数段对比分析服务
 * Task #22: 计算入口/出口考试的等级分布对比
 */

import { supabase } from "@/lib/supabase";
import {
  assignGradesWithFallback,
  GradeLevel,
  type GradeLevelInfo,
} from "@/utils/gradeUtils";
import type {
  ScoreBandSnapshot,
  ScoreBandAnalysisResult,
  GradeChangeStats,
  GradeRecord,
} from "@/types/scoreBandTypes";

// ============================================
// 科目字段映射
// ============================================
const SUBJECT_FIELD_MAP: Record<
  string,
  { scoreField: string; gradeField: string }
> = {
  总分: { scoreField: "total_score", gradeField: "total_grade" },
  语文: { scoreField: "chinese_score", gradeField: "chinese_grade" },
  数学: { scoreField: "math_score", gradeField: "math_grade" },
  英语: { scoreField: "english_score", gradeField: "english_grade" },
  物理: { scoreField: "physics_score", gradeField: "physics_grade" },
  化学: { scoreField: "chemistry_score", gradeField: "chemistry_grade" },
  生物: { scoreField: "biology_score", gradeField: "biology_grade" },
  政治: { scoreField: "politics_score", gradeField: "politics_grade" },
  道法: { scoreField: "politics_score", gradeField: "politics_grade" }, // 别名
  历史: { scoreField: "history_score", gradeField: "history_grade" },
  地理: { scoreField: "geography_score", gradeField: "geography_grade" },
};

// ============================================
// 辅助函数
// ============================================

/**
 * 统计各等级人数
 */
function countGrades(
  recordsWithGrades: Array<{
    resolvedGrade: GradeLevelInfo;
    gradeSource: string;
  }>
): Record<GradeLevel, number> {
  const counts: Record<string, number> = {
    [GradeLevel.A_PLUS]: 0,
    [GradeLevel.A]: 0,
    [GradeLevel.B_PLUS]: 0,
    [GradeLevel.B]: 0,
    [GradeLevel.C_PLUS]: 0,
    [GradeLevel.C]: 0,
  };

  recordsWithGrades.forEach((record) => {
    const level = record.resolvedGrade.level;
    counts[level] = (counts[level] || 0) + 1;
  });

  return counts as Record<GradeLevel, number>;
}

/**
 * 计算累计分布
 */
function calculateCumulativeDistribution(
  gradeCounts: Record<GradeLevel, number>,
  totalStudents: number
): {
  aPlusAbove: { count: number; rate: number };
  aAbove: { count: number; rate: number };
  bPlusAbove: { count: number; rate: number };
  bAbove: { count: number; rate: number };
  cPlusAbove: { count: number; rate: number };
} {
  const aPlusCount = gradeCounts[GradeLevel.A_PLUS] || 0;
  const aCount = gradeCounts[GradeLevel.A] || 0;
  const bPlusCount = gradeCounts[GradeLevel.B_PLUS] || 0;
  const bCount = gradeCounts[GradeLevel.B] || 0;
  const cPlusCount = gradeCounts[GradeLevel.C_PLUS] || 0;

  const aPlusAboveCount = aPlusCount;
  const aAboveCount = aPlusCount + aCount;
  const bPlusAboveCount = aPlusCount + aCount + bPlusCount;
  const bAboveCount = aPlusCount + aCount + bPlusCount + bCount;
  const cPlusAboveCount =
    aPlusCount + aCount + bPlusCount + bCount + cPlusCount;

  const toRate = (count: number) =>
    totalStudents > 0 ? Number(((count / totalStudents) * 100).toFixed(2)) : 0;

  return {
    aPlusAbove: { count: aPlusAboveCount, rate: toRate(aPlusAboveCount) },
    aAbove: { count: aAboveCount, rate: toRate(aAboveCount) },
    bPlusAbove: { count: bPlusAboveCount, rate: toRate(bPlusAboveCount) },
    bAbove: { count: bAboveCount, rate: toRate(bAboveCount) },
    cPlusAbove: { count: cPlusAboveCount, rate: toRate(cPlusAboveCount) },
  };
}

/**
 * 计算平均分
 */
function calculateAverageScore(
  records: GradeRecord[],
  scoreField: string
): number {
  const validScores = records
    .map((r) => Number(r[scoreField]))
    .filter((s) => !isNaN(s) && s > 0);

  if (validScores.length === 0) return 0;

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Number((sum / validScores.length).toFixed(2));
}

// ============================================
// 核心计算函数
// ============================================

/**
 * 计算单次考试的分数段快照
 *
 * @param records - 成绩记录数组
 * @param subject - 科目名称
 * @returns 分数段快照（扁平结构）
 */
export function calculateScoreBandSnapshot(
  records: GradeRecord[],
  subject: string
): ScoreBandSnapshot {
  // 1. 获取科目字段映射
  const fieldMap = SUBJECT_FIELD_MAP[subject];
  if (!fieldMap) {
    throw new Error(`不支持的科目: ${subject}`);
  }

  const { scoreField, gradeField } = fieldMap;

  // 2. 过滤有效记录（有分数的记录）
  const validRecords = records.filter(
    (r) => r[scoreField] !== undefined && r[scoreField] !== null
  );

  const totalStudents = validRecords.length;

  // 边界情况：无有效数据
  if (totalStudents === 0) {
    return {
      subject,
      totalStudents: 0,
      avgScore: 0,
      aPlusCount: 0,
      aPlusRate: 0,
      aCount: 0,
      aRate: 0,
      bPlusCount: 0,
      bPlusRate: 0,
      bCount: 0,
      bRate: 0,
      cPlusCount: 0,
      cPlusRate: 0,
      cCount: 0,
      cRate: 0,
      aPlusAboveCount: 0,
      aPlusAboveRate: 0,
      aAboveCount: 0,
      aAboveRate: 0,
      bPlusAboveCount: 0,
      bPlusAboveRate: 0,
      bAboveCount: 0,
      bAboveRate: 0,
      cPlusAboveCount: 0,
      cPlusAboveRate: 0,
    };
  }

  // 3. 使用 assignGradesWithFallback 分配等级
  const recordsWithGrades = assignGradesWithFallback(
    validRecords,
    subject,
    scoreField,
    gradeField
  );

  // 4. 统计各等级人数
  const gradeCounts = countGrades(recordsWithGrades);

  // 5. 计算累计分布
  const cumulative = calculateCumulativeDistribution(
    gradeCounts,
    totalStudents
  );

  // 6. 计算平均分
  const avgScore = calculateAverageScore(validRecords, scoreField);

  // 7. 计算比例
  const toRate = (count: number) =>
    totalStudents > 0 ? Number(((count / totalStudents) * 100).toFixed(2)) : 0;

  // 8. 构造扁平结构返回
  return {
    subject,
    totalStudents,
    avgScore,
    // 各等级统计
    aPlusCount: gradeCounts[GradeLevel.A_PLUS] || 0,
    aPlusRate: toRate(gradeCounts[GradeLevel.A_PLUS] || 0),
    aCount: gradeCounts[GradeLevel.A] || 0,
    aRate: toRate(gradeCounts[GradeLevel.A] || 0),
    bPlusCount: gradeCounts[GradeLevel.B_PLUS] || 0,
    bPlusRate: toRate(gradeCounts[GradeLevel.B_PLUS] || 0),
    bCount: gradeCounts[GradeLevel.B] || 0,
    bRate: toRate(gradeCounts[GradeLevel.B] || 0),
    cPlusCount: gradeCounts[GradeLevel.C_PLUS] || 0,
    cPlusRate: toRate(gradeCounts[GradeLevel.C_PLUS] || 0),
    cCount: gradeCounts[GradeLevel.C] || 0,
    cRate: toRate(gradeCounts[GradeLevel.C] || 0),
    // 累计统计
    aPlusAboveCount: cumulative.aPlusAbove.count,
    aPlusAboveRate: cumulative.aPlusAbove.rate,
    aAboveCount: cumulative.aAbove.count,
    aAboveRate: cumulative.aAbove.rate,
    bPlusAboveCount: cumulative.bPlusAbove.count,
    bPlusAboveRate: cumulative.bPlusAbove.rate,
    bAboveCount: cumulative.bAbove.count,
    bAboveRate: cumulative.bAbove.rate,
    cPlusAboveCount: cumulative.cPlusAbove.count,
    cPlusAboveRate: cumulative.cPlusAbove.rate,
  };
}

/**
 * 计算变化统计
 *
 * @param entrySnapshot - 入口考试快照
 * @param exitSnapshot - 出口考试快照
 * @returns 变化统计
 */
function calculateChanges(
  entrySnapshot: ScoreBandSnapshot,
  exitSnapshot: ScoreBandSnapshot
): Record<string, GradeChangeStats> {
  const changes: Record<string, GradeChangeStats> = {};

  // 各等级变化
  const gradeKeys = [
    {
      key: "A+",
      countKey: "aPlusCount" as keyof ScoreBandSnapshot,
      rateKey: "aPlusRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "A",
      countKey: "aCount" as keyof ScoreBandSnapshot,
      rateKey: "aRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "B+",
      countKey: "bPlusCount" as keyof ScoreBandSnapshot,
      rateKey: "bPlusRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "B",
      countKey: "bCount" as keyof ScoreBandSnapshot,
      rateKey: "bRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "C+",
      countKey: "cPlusCount" as keyof ScoreBandSnapshot,
      rateKey: "cPlusRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "C",
      countKey: "cCount" as keyof ScoreBandSnapshot,
      rateKey: "cRate" as keyof ScoreBandSnapshot,
    },
  ];

  gradeKeys.forEach(({ key, countKey, rateKey }) => {
    changes[key] = {
      countChange:
        (exitSnapshot[countKey] as number) -
        (entrySnapshot[countKey] as number),
      rateChange:
        (exitSnapshot[rateKey] as number) - (entrySnapshot[rateKey] as number),
    };
  });

  // 累计项变化
  const cumulativeKeys = [
    {
      key: "A+以上",
      countKey: "aPlusAboveCount" as keyof ScoreBandSnapshot,
      rateKey: "aPlusAboveRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "A以上",
      countKey: "aAboveCount" as keyof ScoreBandSnapshot,
      rateKey: "aAboveRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "B+以上",
      countKey: "bPlusAboveCount" as keyof ScoreBandSnapshot,
      rateKey: "bPlusAboveRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "B以上",
      countKey: "bAboveCount" as keyof ScoreBandSnapshot,
      rateKey: "bAboveRate" as keyof ScoreBandSnapshot,
    },
    {
      key: "C+以上",
      countKey: "cPlusAboveCount" as keyof ScoreBandSnapshot,
      rateKey: "cPlusAboveRate" as keyof ScoreBandSnapshot,
    },
  ];

  cumulativeKeys.forEach(({ key, countKey, rateKey }) => {
    changes[key] = {
      countChange:
        (exitSnapshot[countKey] as number) -
        (entrySnapshot[countKey] as number),
      rateChange:
        (exitSnapshot[rateKey] as number) - (entrySnapshot[rateKey] as number),
    };
  });

  return changes;
}

/**
 * 计算分数段对比分析（完整API）
 *
 * @param activityId - 增值评价活动ID
 * @returns 分数段分析结果（入口/出口/变化）
 */
export async function calculateScoreBandAnalysis(
  activityId: string
): Promise<ScoreBandAnalysisResult> {
  // 1. 从 value_added_cache 表读取入口/出口考试数据
  const { data: cacheData, error: cacheError } = await supabase
    .from("value_added_cache")
    .select("entry_exam_data, exit_exam_data, subjects")
    .eq("activity_id", activityId)
    .single();

  if (cacheError || !cacheData) {
    throw new Error(
      `读取增值评价缓存失败: ${cacheError?.message || "数据不存在"}`
    );
  }

  const { entry_exam_data, exit_exam_data, subjects } = cacheData;

  if (!entry_exam_data || !exit_exam_data) {
    throw new Error("缺少入口或出口考试数据");
  }

  // 2. 解析科目列表
  const subjectList = subjects || ["总分"];

  // 3. 计算各科目的快照
  const entrySnapshots: ScoreBandSnapshot[] = [];
  const exitSnapshots: ScoreBandSnapshot[] = [];

  for (const subject of subjectList) {
    const entrySnapshot = calculateScoreBandSnapshot(entry_exam_data, subject);
    const exitSnapshot = calculateScoreBandSnapshot(exit_exam_data, subject);

    entrySnapshots.push(entrySnapshot);
    exitSnapshots.push(exitSnapshot);
  }

  // 4. 计算变化统计
  const changes: Record<string, Record<string, GradeChangeStats>> = {};

  entrySnapshots.forEach((entrySnapshot, index) => {
    const exitSnapshot = exitSnapshots[index];
    changes[entrySnapshot.subject] = calculateChanges(
      entrySnapshot,
      exitSnapshot
    );
  });

  // 5. 返回完整结果
  return {
    entryExam: entrySnapshots,
    exitExam: exitSnapshots,
    changes,
  };
}

/**
 * 便捷函数：直接从 grade_data 表计算（不依赖 value_added_cache）
 *
 * @param entryExamTitle - 入口考试标题
 * @param exitExamTitle - 出口考试标题
 * @param subjects - 科目列表
 * @param filters - 可选过滤条件（如班级、学校）
 * @returns 分数段分析结果
 */
export async function calculateScoreBandAnalysisFromGradeData(
  entryExamTitle: string,
  exitExamTitle: string,
  subjects: string[],
  filters?: { class_name?: string; school_name?: string }
): Promise<ScoreBandAnalysisResult> {
  // 1. 构建查询条件
  let entryQuery = supabase
    .from("grade_data")
    .select("*")
    .eq("exam_title", entryExamTitle);

  let exitQuery = supabase
    .from("grade_data")
    .select("*")
    .eq("exam_title", exitExamTitle);

  if (filters?.class_name) {
    entryQuery = entryQuery.eq("class_name", filters.class_name);
    exitQuery = exitQuery.eq("class_name", filters.class_name);
  }

  if (filters?.school_name) {
    entryQuery = entryQuery.eq("school_name", filters.school_name);
    exitQuery = exitQuery.eq("school_name", filters.school_name);
  }

  // 2. 读取数据
  const [
    { data: entryData, error: entryError },
    { data: exitData, error: exitError },
  ] = await Promise.all([entryQuery, exitQuery]);

  if (entryError || !entryData) {
    throw new Error(`读取入口考试数据失败: ${entryError?.message}`);
  }

  if (exitError || !exitData) {
    throw new Error(`读取出口考试数据失败: ${exitError?.message}`);
  }

  // 3. 计算快照
  const entrySnapshots: ScoreBandSnapshot[] = [];
  const exitSnapshots: ScoreBandSnapshot[] = [];

  for (const subject of subjects) {
    const entrySnapshot = calculateScoreBandSnapshot(entryData, subject);
    const exitSnapshot = calculateScoreBandSnapshot(exitData, subject);

    entrySnapshots.push(entrySnapshot);
    exitSnapshots.push(exitSnapshot);
  }

  // 4. 计算变化
  const changes: Record<string, Record<string, GradeChangeStats>> = {};

  entrySnapshots.forEach((entrySnapshot, index) => {
    const exitSnapshot = exitSnapshots[index];
    changes[entrySnapshot.subject] = calculateChanges(
      entrySnapshot,
      exitSnapshot
    );
  });

  return {
    entryExam: entrySnapshots,
    exitExam: exitSnapshots,
    changes,
  };
}
