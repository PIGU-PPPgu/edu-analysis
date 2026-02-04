/**
 * 班级增值评价计算服务
 * 优先级 P0 - 核心功能
 */

import type {
  ClassValueAdded,
  StudentValueAdded,
  AbilityLevel,
  GradeLevelDefinition,
} from "@/types/valueAddedTypes";

import {
  calculateStatistics,
  calculateZScores,
  calculatePercentile,
  determineLevel,
  calculateScoreValueAddedRate,
  calculateConsolidationRate,
  calculateTransformationRate,
  calculateContributionRate,
  calculateExcellentGain,
  safeDivide,
  groupBy,
} from "@/utils/statistics";

// ============================================
// 接口定义
// ============================================

/** 学生成绩数据（输入） */
interface StudentGradeData {
  student_id: string;
  student_name: string;
  class_name: string;
  subject: string;
  entry_score: number;
  exit_score: number;
  entry_z_score?: number; // ✅ 全年级Z分数
  exit_z_score?: number; // ✅ 全年级Z分数
}

/** 班级增值计算参数 */
interface ClassValueAddedParams {
  /** 学生成绩数据 */
  studentGrades: StudentGradeData[];

  /** 科目 */
  subject: string;

  /** 等级划分配置 */
  levelDefinitions: GradeLevelDefinition[];

  /** 全年级的学生数据（用于计算贡献率） */
  gradeStudents?: StudentGradeData[];
}

// ============================================
// 核心计算函数
// ============================================

/**
 * 计算班级增值评价
 * ✅ 修复：Z分数基于全年级计算（不是按班级）
 */
export async function calculateClassValueAdded(
  params: ClassValueAddedParams
): Promise<ClassValueAdded[]> {
  const { studentGrades, subject, levelDefinitions, gradeStudents } = params;

  // 1. 按班级分组
  const classesByName = groupBy(studentGrades, (s) => s.class_name);

  // 2. ✅ 计算全年级的Z分数（关键修复）
  const allEntryScores = studentGrades.map((s) => s.entry_score);
  const allExitScores = studentGrades.map((s) => s.exit_score);
  const gradeEntryZScores = calculateZScores(allEntryScores);
  const gradeExitZScores = calculateZScores(allExitScores);

  // 3. 为每个学生分配Z分数
  const studentsWithZScores = studentGrades.map((student, index) => ({
    ...student,
    entry_z_score: gradeEntryZScores[index],
    exit_z_score: gradeExitZScores[index],
  }));

  // 4. 计算全年级的优秀人数变化（用于贡献率）
  let gradeExcellentGain = 0;
  if (gradeStudents) {
    const gradeEntryLevels = calculateStudentLevels(
      gradeStudents,
      "entry",
      levelDefinitions
    );
    const gradeExitLevels = calculateStudentLevels(
      gradeStudents,
      "exit",
      levelDefinitions
    );
    gradeExcellentGain = calculateExcellentGain(
      gradeEntryLevels,
      gradeExitLevels
    );
  }

  // 5. 计算每个班级的增值数据
  const results: ClassValueAdded[] = [];

  for (const [className, _students] of Object.entries(classesByName)) {
    // 获取该班级学生的带Z分数数据
    const classStudentsWithZ = studentsWithZScores.filter(
      (s) => s.class_name === className
    );

    const classResult = await calculateSingleClassValueAdded({
      className,
      students: classStudentsWithZ,
      subject,
      levelDefinitions,
      gradeExcellentGain,
    });

    results.push(classResult);
  }

  // 6. 添加排名信息
  addRankings(results);

  return results;
}

/**
 * 计算单个班级的增值评价
 * ✅ 修复：使用全年级Z分数，添加原始分和标准分
 */
async function calculateSingleClassValueAdded(params: {
  className: string;
  students: StudentGradeData[];
  subject: string;
  levelDefinitions: GradeLevelDefinition[];
  gradeExcellentGain: number;
}): Promise<ClassValueAdded> {
  const { className, students, subject, levelDefinitions, gradeExcellentGain } =
    params;

  // 1. 提取分数数据
  const entryScores = students.map((s) => s.entry_score);
  const exitScores = students.map((s) => s.exit_score);

  // 2. ✅ 使用全年级Z分数（已在上层计算）
  const entryZScores = students.map((s) => s.entry_z_score || 0);
  const exitZScores = students.map((s) => s.exit_z_score || 0);

  // 3. ✅ 计算班级平均原始分和标准分
  const avgEntryScore =
    entryScores.reduce((sum, s) => sum + s, 0) / entryScores.length;
  const avgExitScore =
    exitScores.reduce((sum, s) => sum + s, 0) / exitScores.length;
  const avgEntryZScore =
    entryZScores.reduce((sum, z) => sum + z, 0) / entryZScores.length;
  const avgExitZScore =
    exitZScores.reduce((sum, z) => sum + z, 0) / exitZScores.length;

  // 标准分 = 500 + 100 * Z分数（参照汇优评公式）
  const avgStandardEntryScore = 500 + 100 * avgEntryZScore;
  const avgStandardExitScore = 500 + 100 * avgExitZScore;

  // 4. 计算分数增值指标
  const scoreValueAddedRates = entryZScores.map((entryZ, i) =>
    calculateScoreValueAddedRate(entryZ, exitZScores[i])
  );

  const avgScoreValueAddedRate =
    scoreValueAddedRates.reduce((sum, rate) => sum + rate, 0) /
    scoreValueAddedRates.length;

  const avgZScoreChange = avgExitZScore - avgEntryZScore;

  // 5. 计算进步学生比例
  const progressStudentCount = students.filter(
    (s, i) => exitScores[i] > entryScores[i]
  ).length;
  const progressStudentRatio = safeDivide(
    progressStudentCount,
    students.length
  );

  // 6. 计算能力等级
  const entryLevels = calculateStudentLevels(
    students,
    "entry",
    levelDefinitions
  );
  const exitLevels = calculateStudentLevels(students, "exit", levelDefinitions);

  // 7. 计算能力增值指标
  const studentsWithLevels = students.map((s, i) => ({
    entryLevel: entryLevels[i],
    exitLevel: exitLevels[i],
  }));

  const consolidationRate = calculateConsolidationRate(studentsWithLevels);
  const transformationRate = calculateTransformationRate(studentsWithLevels);

  // 8. 计算优秀人数变化
  const entryExcellentCount = entryLevels.filter(
    (level) => level === "A+" || level === "A"
  ).length;
  const exitExcellentCount = exitLevels.filter(
    (level) => level === "A+" || level === "A"
  ).length;
  const excellentGain = exitExcellentCount - entryExcellentCount;

  // 9. 计算贡献率
  const contributionRate =
    gradeExcellentGain !== 0
      ? calculateContributionRate(excellentGain, gradeExcellentGain)
      : 0;

  return {
    class_name: className,
    subject,

    // ✅ 新增：原始分和标准分
    avg_score_entry: avgEntryScore,
    avg_score_exit: avgExitScore,
    avg_score_standard_entry: avgStandardEntryScore,
    avg_score_standard_exit: avgStandardExitScore,

    // 分数增值
    avg_score_value_added_rate: avgScoreValueAddedRate,
    progress_student_ratio: progressStudentRatio,
    avg_z_score_change: avgZScoreChange,

    // 能力增值
    consolidation_rate: consolidationRate,
    transformation_rate: transformationRate,
    contribution_rate: contributionRate,

    // 学生统计
    total_students: students.length,
    entry_excellent_count: entryExcellentCount,
    exit_excellent_count: exitExcellentCount,
    excellent_gain: excellentGain,
  };
}

/**
 * 计算学生的能力等级
 */
function calculateStudentLevels(
  students: StudentGradeData[],
  type: "entry" | "exit",
  levelDefinitions: GradeLevelDefinition[]
): AbilityLevel[] {
  const scores = students.map((s) =>
    type === "entry" ? s.entry_score : s.exit_score
  );

  return scores.map((score) => {
    const percentile = calculatePercentile(score, scores);
    return determineLevel(percentile, levelDefinitions);
  });
}

/**
 * 添加排名信息
 */
function addRankings(results: ClassValueAdded[]): void {
  // 按分数增值率降序排序
  const sorted = [...results].sort(
    (a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate
  );

  // 添加排名
  sorted.forEach((result, index) => {
    result.rank_in_grade = index + 1;
    result.total_classes = results.length;
  });
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取学生详细增值数据
 */
export async function getStudentValueAddedDetails(
  params: ClassValueAddedParams
): Promise<StudentValueAdded[]> {
  const { studentGrades, subject, levelDefinitions } = params;

  // 1. 计算所有学生的标准分
  const allEntryScores = studentGrades.map((s) => s.entry_score);
  const allExitScores = studentGrades.map((s) => s.exit_score);

  const allEntryZScores = calculateZScores(allEntryScores);
  const allExitZScores = calculateZScores(allExitScores);

  // 2. 计算每个学生的增值数据
  const results: StudentValueAdded[] = studentGrades.map((student, index) => {
    const entryScore = student.entry_score;
    const exitScore = student.exit_score;
    const entryZScore = allEntryZScores[index];
    const exitZScore = allExitZScores[index];

    const scoreValueAdded = exitScore - entryScore;
    const scoreValueAddedRate = calculateScoreValueAddedRate(
      entryZScore,
      exitZScore
    );

    // 计算等级
    const entryPercentile = calculatePercentile(entryScore, allEntryScores);
    const exitPercentile = calculatePercentile(exitScore, allExitScores);

    const entryLevel = determineLevel(entryPercentile, levelDefinitions);
    const exitLevel = determineLevel(exitPercentile, levelDefinitions);

    const levelChange = getLevelValue(exitLevel) - getLevelValue(entryLevel);

    return {
      student_id: student.student_id,
      student_name: student.student_name,
      class_name: student.class_name,
      subject,

      entry_score: entryScore,
      exit_score: exitScore,
      entry_z_score: entryZScore,
      exit_z_score: exitZScore,
      score_value_added: scoreValueAdded,
      score_value_added_rate: scoreValueAddedRate,

      entry_level: entryLevel,
      exit_level: exitLevel,
      level_change: levelChange,
      is_consolidated: entryLevel === "A+" && exitLevel === "A+",
      is_transformed: levelChange > 0,
    };
  });

  return results;
}

/**
 * 获取等级数值
 */
function getLevelValue(level: AbilityLevel): number {
  const levelMap: Record<AbilityLevel, number> = {
    "A+": 6,
    A: 5,
    "B+": 4,
    B: 3,
    "C+": 2,
    C: 1,
  };

  return levelMap[level] || 0;
}

/**
 * 按科目分组计算班级增值
 */
export async function calculateClassValueAddedBySubject(
  allStudentGrades: StudentGradeData[],
  levelDefinitions: GradeLevelDefinition[]
): Promise<Record<string, ClassValueAdded[]>> {
  const gradesBySubject = groupBy(allStudentGrades, (s) => s.subject);

  const results: Record<string, ClassValueAdded[]> = {};

  for (const [subject, grades] of Object.entries(gradesBySubject)) {
    results[subject] = await calculateClassValueAdded({
      studentGrades: grades,
      subject,
      levelDefinitions,
      gradeStudents: grades, // 使用该科目的所有学生作为年级数据
    });
  }

  return results;
}
