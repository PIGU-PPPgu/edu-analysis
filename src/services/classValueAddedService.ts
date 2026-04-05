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
  calculateZScores,
  calculatePercentile,
  determineLevel,
  determineLevelByZScore,
  isZScoreBasedConfig,
  calculateScoreValueAddedRate,
  shrinkValueAddedRate,
  calculateOLSBeta,
  calculateConsolidationRate,
  calculateTransformationRate,
  calculateContributionRate,
  calculateExcellentGain,
  safeDivide,
  groupBy,
  calculateStandardError,
  calculateConfidenceInterval,
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

function isValidFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeText(value: string | undefined | null, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

  const sanitizedStudentGrades = studentGrades
    .map((student) => ({
      ...student,
      class_name: normalizeText(student.class_name, "未知班级"),
      subject: normalizeText(student.subject, subject || "未分类科目"),
    }))
    .filter(
      (student) =>
        isValidFiniteNumber(student.entry_score) &&
        isValidFiniteNumber(student.exit_score)
    );

  if (sanitizedStudentGrades.length === 0) {
    return [];
  }

  // 1. 按班级分组
  const classesByName = groupBy(sanitizedStudentGrades, (s) => s.class_name);

  // 2. ✅ 计算全年级的Z分数（关键修复）
  const allEntryScores = sanitizedStudentGrades.map((s) => s.entry_score);
  const allExitScores = sanitizedStudentGrades.map((s) => s.exit_score);
  const gradeEntryZScores = calculateZScores(allEntryScores);
  const gradeExitZScores = calculateZScores(allExitScores);

  // 计算OLS回归斜率（用于均值回归修正）
  // 当相关性过低（跨量纲考试，如中考→高中期末）时，限制beta最小值为0.8
  // 防止低相关性导致的过度均值回归修正，产生极端TVA
  const rawBeta = calculateOLSBeta(gradeEntryZScores, gradeExitZScores);
  const regressionBeta = Math.max(rawBeta, 0.8);
  const lowCorrelationWarning = rawBeta < 0.7;

  // 3. 为每个学生分配Z分数
  const studentsWithZScores = sanitizedStudentGrades.map((student, index) => ({
    ...student,
    entry_z_score: gradeEntryZScores[index],
    exit_z_score: gradeExitZScores[index],
  }));

  // 4. 计算全年级的优秀人数变化（用于贡献率）
  let gradeExcellentGain = 0;
  if (gradeStudents) {
    const sanitizedGradeStudents = gradeStudents.filter(
      (student) =>
        isValidFiniteNumber(student.entry_score) &&
        isValidFiniteNumber(student.exit_score)
    );
    const gradeEntryLevels = calculateStudentLevels(
      sanitizedGradeStudents,
      "entry",
      levelDefinitions
    );
    const gradeExitLevels = calculateStudentLevels(
      sanitizedGradeStudents,
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
      regressionBeta,
      lowCorrelationWarning,
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
  regressionBeta: number;
  lowCorrelationWarning?: boolean;
}): Promise<ClassValueAdded> {
  const {
    className,
    students,
    subject,
    levelDefinitions,
    gradeExcellentGain,
    regressionBeta,
    lowCorrelationWarning,
  } = params;

  // 1. 提取分数数据
  const entryScores = students.map((s) => s.entry_score);
  const exitScores = students.map((s) => s.exit_score);

  // 2. ✅ 使用全年级Z分数（已在上层计算）
  const entryZScores = students.map((s) => s.entry_z_score || 0);
  const exitZScores = students.map((s) => s.exit_z_score || 0);

  // 3. ✅ 计算班级平均原始分和标准分
  const avgEntryScore = average(entryScores);
  const avgExitScore = average(exitScores);
  const avgEntryZScore = average(entryZScores);
  const avgExitZScore = average(exitZScores);

  // 标准分 = 500 + 100 * Z分数（参照汇优评公式）
  const avgStandardEntryScore = 500 + 100 * avgEntryZScore;
  const avgStandardExitScore = 500 + 100 * avgExitZScore;

  // 4. 计算分数增值指标
  const scoreValueAddedRates = entryZScores.map((entryZ, i) =>
    calculateScoreValueAddedRate(entryZ, exitZScores[i], regressionBeta)
  );

  const avgScoreValueAddedRate = average(
    scoreValueAddedRates.filter((rate) => Number.isFinite(rate))
  );

  // 小样本收缩（高中选科班级保护）
  const shrunkAvgScoreValueAddedRate = shrinkValueAddedRate(
    avgScoreValueAddedRate,
    students.length
  );

  const avgZScoreChange = avgExitZScore - avgEntryZScore;

  // 5. 计算进步学生比例
  const progressStudentCount = scoreValueAddedRates.filter(
    (rate) => Number.isFinite(rate) && rate > 0
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

  // 10. 薄弱学生关注度（BQAI）：后25%学生的平均增值率
  const sortedByEntry = [...students].sort(
    (a, b) => a.entry_score - b.entry_score
  );
  const bottomQuartileCount = Math.max(
    1,
    Math.floor(sortedByEntry.length * 0.25)
  );
  const bottomQuartileStudents = sortedByEntry.slice(0, bottomQuartileCount);
  const bottomQuartileRates = bottomQuartileStudents.map((s) => {
    const idx = students.indexOf(s);
    return calculateScoreValueAddedRate(
      entryZScores[idx],
      exitZScores[idx],
      regressionBeta
    );
  });
  const bottomQuartileValueAddedRate =
    bottomQuartileRates.filter(Number.isFinite).length > 0
      ? average(bottomQuartileRates.filter(Number.isFinite))
      : undefined;

  // 11. 置信区间（基于增值率残差的标准误）
  const validRates = scoreValueAddedRates.filter(Number.isFinite);
  const se = calculateStandardError(validRates);
  const ci80 = calculateConfidenceInterval(
    shrunkAvgScoreValueAddedRate,
    se,
    0.8
  );
  const ci95 = calculateConfidenceInterval(
    shrunkAvgScoreValueAddedRate,
    se,
    0.95
  );

  return {
    class_name: className,
    subject,

    // ✅ 新增：原始分和标准分
    avg_score_entry: avgEntryScore,
    avg_score_exit: avgExitScore,
    avg_score_standard_entry: avgStandardEntryScore,
    avg_score_standard_exit: avgStandardExitScore,

    // 分数增值（已收缩）
    avg_score_value_added_rate: shrunkAvgScoreValueAddedRate,
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

    // 统计有效性
    is_statistically_significant: students.length >= 15,
    warnings: [
      ...(students.length < 15 ? ["样本量不足15人，结果仅供参考"] : []),
      ...(lowCorrelationWarning
        ? ["入口与出口考试相关性较低（跨量纲），增值结果仅供参考"]
        : []),
    ],

    // 公平性指标
    bottom_quartile_value_added_rate: bottomQuartileValueAddedRate,

    // 置信区间
    value_added_rate_se: se,
    ci_lower_80: ci80.lower,
    ci_upper_80: ci80.upper,
    ci_lower_95: ci95.lower,
    ci_upper_95: ci95.upper,
  };
}

/**
 * 计算学生的能力等级
 * 若配置含 z_score 区间（九段），则用 Z 分判断；否则用百分位（六段）
 */
function calculateStudentLevels(
  students: StudentGradeData[],
  type: "entry" | "exit",
  levelDefinitions: GradeLevelDefinition[]
): AbilityLevel[] {
  const useZScore = isZScoreBasedConfig(levelDefinitions);

  if (useZScore) {
    // 九段：用全年级 Z 分（已在上层计算并挂到 student 上）
    return students.map((s) => {
      const z =
        type === "entry" ? (s.entry_z_score ?? 0) : (s.exit_z_score ?? 0);
      return determineLevelByZScore(z, levelDefinitions);
    });
  }

  // 六段：用百分位
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

    // 计算等级（九段用Z分，六段用百分位）
    const useZScore = isZScoreBasedConfig(levelDefinitions);
    const entryLevel = useZScore
      ? determineLevelByZScore(entryZScore, levelDefinitions)
      : determineLevel(
          calculatePercentile(entryScore, allEntryScores),
          levelDefinitions
        );
    const exitLevel = useZScore
      ? determineLevelByZScore(exitZScore, levelDefinitions)
      : determineLevel(
          calculatePercentile(exitScore, allExitScores),
          levelDefinitions
        );

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
