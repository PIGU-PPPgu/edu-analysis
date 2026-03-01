/**
 * 教师增值评价计算服务
 * 优先级 P0 - 核心功能
 */

import type {
  TeacherValueAdded,
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
  calculateOLSBeta,
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
  teacher_id: string;
  teacher_name: string;
  subject: string;
  entry_score: number;
  exit_score: number;
  _entryZ?: number;
  _exitZ?: number;
}

/** 教师增值计算参数 */
interface TeacherValueAddedParams {
  /** 学生成绩数据（已包含教师信息） */
  studentGrades: StudentGradeData[];

  /** 科目 */
  subject: string;

  /** 等级划分配置 */
  levelDefinitions: GradeLevelDefinition[];

  /** 全学科的学生数据（用于计算贡献率） */
  allSubjectStudents?: StudentGradeData[];
}

// ============================================
// 核心计算函数
// ============================================

/**
 * 计算教师增值评价
 */
export async function calculateTeacherValueAdded(
  params: TeacherValueAddedParams
): Promise<TeacherValueAdded[]> {
  const { studentGrades, subject, levelDefinitions, allSubjectStudents } =
    params;

  // ✅ 修复：先计算全年级Z分数（不是按教师分组后再算）
  const allEntryScores = studentGrades.map((s) => s.entry_score);
  const allExitScores = studentGrades.map((s) => s.exit_score);
  const globalEntryZScores = calculateZScores(allEntryScores);
  const globalExitZScores = calculateZScores(allExitScores);
  const regressionBeta = calculateOLSBeta(
    globalEntryZScores,
    globalExitZScores
  );

  // 将全局Z分数绑定到每个学生
  const gradesWithGlobalZ = studentGrades.map((s, i) => ({
    ...s,
    _entryZ: globalEntryZScores[i],
    _exitZ: globalExitZScores[i],
  }));

  // 1. 按教师分组
  const teacherGroups = groupBy(gradesWithGlobalZ, (s) => s.teacher_id);

  // 2. 计算全学科的优秀人数变化（用于贡献率）
  let subjectExcellentGain = 0;
  if (allSubjectStudents) {
    const entryLevels = calculateStudentLevels(
      allSubjectStudents,
      "entry",
      levelDefinitions
    );
    const exitLevels = calculateStudentLevels(
      allSubjectStudents,
      "exit",
      levelDefinitions
    );
    subjectExcellentGain = calculateExcellentGain(entryLevels, exitLevels);
  }

  // 3. 计算每个教师的增值数据
  const results: TeacherValueAdded[] = [];

  for (const [teacherId, students] of Object.entries(teacherGroups)) {
    const teacherResult = await calculateSingleTeacherValueAdded({
      teacherId,
      teacherName: students[0].teacher_name,
      className: students[0].class_name,
      students,
      subject,
      levelDefinitions,
      subjectExcellentGain,
      regressionBeta,
    });

    results.push(teacherResult);
  }

  // 4. 添加排名信息
  addRankings(results);

  return results;
}

/**
 * 计算单个教师的增值评价
 */
async function calculateSingleTeacherValueAdded(params: {
  teacherId: string;
  teacherName: string;
  className: string;
  students: (StudentGradeData & { _entryZ?: number; _exitZ?: number })[];
  subject: string;
  levelDefinitions: GradeLevelDefinition[];
  subjectExcellentGain: number;
  regressionBeta: number;
}): Promise<TeacherValueAdded> {
  const {
    teacherId,
    teacherName,
    className,
    students,
    subject,
    levelDefinitions,
    subjectExcellentGain,
    regressionBeta,
  } = params;

  // 1. 提取分数数据
  const entryScores = students.map((s) => s.entry_score);
  const exitScores = students.map((s) => s.exit_score);

  // 2. ✅ 使用全年级预计算的Z分数（不再本地归一化）
  const entryZScores = students.map((s) => s._entryZ ?? 0);
  const exitZScores = students.map((s) => s._exitZ ?? 0);

  // 3. 计算分数增值指标
  const scoreValueAddedRates = entryZScores.map((entryZ, i) =>
    calculateScoreValueAddedRate(entryZ, exitZScores[i], regressionBeta)
  );

  const avgScoreValueAddedRate =
    scoreValueAddedRates.reduce((sum, rate) => sum + rate, 0) /
    scoreValueAddedRates.length;

  const avgZScoreChange = safeDivide(
    exitZScores.reduce((sum, z) => sum + z, 0) -
      entryZScores.reduce((sum, z) => sum + z, 0),
    students.length
  );

  // 4. 计算进步学生统计
  const progressStudentCount = students.filter(
    (s, i) => exitScores[i] > entryScores[i]
  ).length;
  const progressStudentRatio = safeDivide(
    progressStudentCount,
    students.length
  );

  // 5. 计算能力等级
  const entryLevels = calculateStudentLevels(
    students,
    "entry",
    levelDefinitions
  );
  const exitLevels = calculateStudentLevels(students, "exit", levelDefinitions);

  // 6. 计算能力增值指标
  const studentsWithLevels = students.map((s, i) => ({
    entryLevel: entryLevels[i],
    exitLevel: exitLevels[i],
  }));

  const consolidationRate = calculateConsolidationRate(studentsWithLevels);
  const transformationRate = calculateTransformationRate(studentsWithLevels);

  // 7. 计算优秀人数变化
  const entryExcellentCount = entryLevels.filter(
    (level) => level === "A+" || level === "A"
  ).length;
  const exitExcellentCount = exitLevels.filter(
    (level) => level === "A+" || level === "A"
  ).length;
  const excellentGain = exitExcellentCount - entryExcellentCount;

  // 8. 计算贡献率
  const contributionRate =
    subjectExcellentGain !== 0
      ? calculateContributionRate(excellentGain, subjectExcellentGain)
      : 0;

  return {
    teacher_id: teacherId,
    teacher_name: teacherName,
    class_name: className,
    subject,

    // 分数增值
    avg_score_value_added_rate: avgScoreValueAddedRate,
    progress_student_count: progressStudentCount,
    progress_student_ratio: progressStudentRatio,
    avg_z_score_change: avgZScoreChange,

    // 能力增值
    consolidation_rate: consolidationRate,
    transformation_rate: transformationRate,
    contribution_rate: contributionRate,
    excellent_gain: excellentGain,

    // 学生统计
    total_students: students.length,
    entry_excellent_count: entryExcellentCount,
    exit_excellent_count: exitExcellentCount,
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
function addRankings(results: TeacherValueAdded[]): void {
  // 按分数增值率降序排序
  const sorted = [...results].sort(
    (a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate
  );

  // 添加排名
  sorted.forEach((result, index) => {
    result.rank_in_subject = index + 1;
    result.total_teachers = results.length;
  });
}

// ============================================
// 辅助函数
// ============================================

/**
 * 按科目分组计算教师增值
 */
export async function calculateTeacherValueAddedBySubject(
  allStudentGrades: StudentGradeData[],
  levelDefinitions: GradeLevelDefinition[]
): Promise<Record<string, TeacherValueAdded[]>> {
  const gradesBySubject = groupBy(allStudentGrades, (s) => s.subject);

  const results: Record<string, TeacherValueAdded[]> = {};

  for (const [subject, grades] of Object.entries(gradesBySubject)) {
    results[subject] = await calculateTeacherValueAdded({
      studentGrades: grades,
      subject,
      levelDefinitions,
      allSubjectStudents: grades, // 使用该科目的所有学生作为全学科数据
    });
  }

  return results;
}

/**
 * 获取教师的学生详细增值数据
 */
export async function getTeacherStudentDetails(
  teacherId: string,
  params: TeacherValueAddedParams
): Promise<StudentValueAdded[]> {
  const { studentGrades, subject, levelDefinitions } = params;

  // ✅ 使用全年级数据计算全局Z和OLS beta
  const allEntryScores = studentGrades.map((s) => s.entry_score);
  const allExitScores = studentGrades.map((s) => s.exit_score);

  const allEntryZScores = calculateZScores(allEntryScores);
  const allExitZScores = calculateZScores(allExitScores);
  const regressionBeta = calculateOLSBeta(allEntryZScores, allExitZScores);

  // 筛选该教师的学生（保留在全年级数组中的索引）
  const teacherStudentsWithIndex = studentGrades
    .map((student, index) => ({ student, index }))
    .filter(({ student }) => student.teacher_id === teacherId);

  if (teacherStudentsWithIndex.length === 0) {
    return [];
  }

  // 计算每个学生的增值数据
  const results: StudentValueAdded[] = teacherStudentsWithIndex.map(
    ({ student, index }) => {
      const entryScore = student.entry_score;
      const exitScore = student.exit_score;
      const entryZScore = allEntryZScores[index];
      const exitZScore = allExitZScores[index];

      const scoreValueAdded = exitScore - entryScore;
      const scoreValueAddedRate = calculateScoreValueAddedRate(
        entryZScore,
        exitZScore,
        regressionBeta
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
    }
  );

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
