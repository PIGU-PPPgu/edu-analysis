/**
 * 学生增值评价计算服务
 * 用于计算单个学生的增值指标
 */

import type {
  StudentValueAdded,
  AbilityLevel,
  GradeLevelDefinition,
} from "@/types/valueAddedTypes";

import {
  calculateZScores,
  calculatePercentile,
  determineLevel,
  calculateScoreValueAddedRate,
} from "@/utils/statistics";

// ============================================
// 接口定义
// ============================================

/** 学生成绩数据（输入） */
export interface StudentGradeData {
  student_id: string;
  student_name: string;
  class_name: string;
  subject: string;
  entry_score: number;
  exit_score: number;
}

/** 学生增值计算参数 */
export interface StudentValueAddedParams {
  /** 所有学生成绩数据（用于计算Z分数和百分位） */
  allStudents: StudentGradeData[];

  /** 科目 */
  subject: string;

  /** 等级划分配置 */
  levelDefinitions: GradeLevelDefinition[];
}

// ============================================
// 核心计算函数
// ============================================

/**
 * 计算学生增值评价
 * ✅ 正确计算Z分数、等级和增值率
 */
export async function calculateStudentValueAdded(
  params: StudentValueAddedParams
): Promise<StudentValueAdded[]> {
  const { allStudents, subject, levelDefinitions } = params;

  if (allStudents.length === 0) {
    return [];
  }

  // 1. 计算全年级的Z分数
  const allEntryScores = allStudents.map((s) => s.entry_score);
  const allExitScores = allStudents.map((s) => s.exit_score);

  const entryZScores = calculateZScores(allEntryScores);
  const exitZScores = calculateZScores(allExitScores);

  // 2. 计算百分位（用于确定等级）
  const entryPercentiles = allEntryScores.map((score, index) =>
    calculatePercentile(score, allEntryScores)
  );
  const exitPercentiles = allExitScores.map((score, index) =>
    calculatePercentile(score, allExitScores)
  );

  // 3. 为每个学生计算增值数据
  const results: StudentValueAdded[] = allStudents.map((student, index) => {
    const entryZScore = entryZScores[index];
    const exitZScore = exitZScores[index];
    const entryPercentile = entryPercentiles[index];
    const exitPercentile = exitPercentiles[index];

    // 确定等级
    const entryLevel = determineLevel(entryPercentile, levelDefinitions);
    const exitLevel = determineLevel(exitPercentile, levelDefinitions);

    // 计算标准分（500 + 100 * Z）
    const entryStandardScore = 500 + 100 * entryZScore;
    const exitStandardScore = 500 + 100 * exitZScore;

    // 计算增值率
    const scoreValueAddedRate = calculateScoreValueAddedRate(
      entryZScore,
      exitZScore
    );

    // 计算等级变化
    const levelChange = calculateLevelChange(entryLevel, exitLevel);

    // 判断是否巩固/转化
    const isConsolidated = entryLevel === "A+" && exitLevel === "A+";
    const isTransformed = levelChange > 0;

    return {
      student_id: student.student_id,
      student_name: student.student_name,
      class_name: student.class_name,
      subject,

      // 分数数据
      entry_score: student.entry_score,
      exit_score: student.exit_score,
      entry_z_score: entryZScore,
      exit_z_score: exitZScore,
      score_value_added: exitStandardScore - entryStandardScore,
      score_value_added_rate: scoreValueAddedRate,

      // 能力数据
      entry_level: entryLevel,
      exit_level: exitLevel,
      level_change: levelChange,
      is_consolidated: isConsolidated,
      is_transformed: isTransformed,
    };
  });

  return results;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 计算等级变化
 * @returns 正数表示进步，负数表示退步，0表示保持
 */
function calculateLevelChange(
  entryLevel: AbilityLevel,
  exitLevel: AbilityLevel
): number {
  const levelOrder: Record<AbilityLevel, number> = {
    "A+": 6,
    A: 5,
    "B+": 4,
    B: 3,
    "C+": 2,
    C: 1,
  };

  return levelOrder[exitLevel] - levelOrder[entryLevel];
}
