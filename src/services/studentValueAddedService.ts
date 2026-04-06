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
  determineLevelByZScore,
  isZScoreBasedConfig,
  calculateScoreValueAddedRate,
  calculateOLSBeta,
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

  // 当相关性过低时，限制beta最小值为0.8，与classValueAddedService保持一致
  const regressionBeta = Math.max(
    calculateOLSBeta(entryZScores, exitZScores),
    0.8
  );

  // 2. 计算百分位和等级（支持六段和九段）
  const useZScore = isZScoreBasedConfig(levelDefinitions);

  const entryLevels = useZScore
    ? entryZScores.map((z) => determineLevelByZScore(z, levelDefinitions))
    : allEntryScores.map((score) =>
        determineLevel(
          calculatePercentile(score, allEntryScores),
          levelDefinitions
        )
      );

  const exitLevels = useZScore
    ? exitZScores.map((z) => determineLevelByZScore(z, levelDefinitions))
    : allExitScores.map((score) =>
        determineLevel(
          calculatePercentile(score, allExitScores),
          levelDefinitions
        )
      );

  // 3. 为每个学生计算增值数据
  const results: StudentValueAdded[] = allStudents.map((student, index) => {
    const entryZScore = entryZScores[index];
    const exitZScore = exitZScores[index];

    // 确定等级（已在上方按配置类型预计算）
    const entryLevel = entryLevels[index];
    const exitLevel = exitLevels[index];

    // 计算标准分（500 + 100 * Z）
    const entryStandardScore = 500 + 100 * entryZScore;
    const exitStandardScore = 500 + 100 * exitZScore;

    // 计算增值率
    const scoreValueAddedRate = calculateScoreValueAddedRate(
      entryZScore,
      exitZScore,
      regressionBeta
    );

    // 计算等级变化
    const levelChange = calculateLevelChange(entryLevel, exitLevel);

    // 判断是否巩固/转化
    // 九段评价：顶级是"1段"；六段评价：顶级是"A+"
    const topLevel = useZScore ? "1段" : "A+";
    const isConsolidated = entryLevel === topLevel && exitLevel === topLevel;
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
    "1段": 9,
    "2段": 8,
    "3段": 7,
    "4段": 6,
    "5段": 5,
    "6段": 4,
    "7段": 3,
    "8段": 2,
    "9段": 1,
  };

  return (levelOrder[exitLevel] ?? 0) - (levelOrder[entryLevel] ?? 0);
}
