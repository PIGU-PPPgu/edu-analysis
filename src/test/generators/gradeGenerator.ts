/**
 * 📊 成绩数据生成器
 * 生成符合真实分布的测试成绩数据
 */

import { GeneratedStudent } from "./studentGenerator";

export interface GeneratedGrade {
  id?: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name: string;
  exam_title: string;
  exam_type?: string;
  exam_date?: string;

  // 总分
  total_score: number;
  total_max_score?: number;
  total_grade?: string;

  // 各科成绩
  chinese_score?: number;
  chinese_grade?: string;
  math_score?: number;
  math_grade?: string;
  english_score?: number;
  english_grade?: string;
  physics_score?: number;
  physics_grade?: string;
  chemistry_score?: number;
  chemistry_grade?: string;
  politics_score?: number;
  politics_grade?: string;
  history_score?: number;
  history_grade?: string;
  biology_score?: number;
  biology_grade?: string;
  geography_score?: number;
  geography_grade?: string;

  // 排名
  total_rank_in_class?: number;
  total_rank_in_school?: number;
  total_rank_in_grade?: number;
}

// 科目满分配置
export const SUBJECT_MAX_SCORES = {
  chinese: 150,
  math: 150,
  english: 150,
  physics: 100,
  chemistry: 100,
  politics: 100,
  history: 100,
  biology: 100,
  geography: 100,
};

// 考试类型
export const EXAM_TYPES = [
  "期中考试",
  "期末考试",
  "月考",
  "模拟考试",
  "单元测试",
  "周测",
];

/**
 * 生成正态分布的成绩
 * @param mean 平均分
 * @param stdDev 标准差
 * @param min 最低分
 * @param max 最高分
 */
export const generateNormalScore = (
  mean: number = 75,
  stdDev: number = 15,
  min: number = 0,
  max: number = 100
): number => {
  // Box-Muller变换生成正态分布
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  let score = mean + z0 * stdDev;

  // 限制在范围内
  score = Math.max(min, Math.min(max, score));

  return Math.round(score * 10) / 10; // 保留一位小数
};

/**
 * 根据分数计算等级
 */
export const calculateGrade = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;

  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "E";
};

/**
 * 生成考试ID
 */
export const generateExamId = (prefix: string = "TEST_EXAM"): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * 生成考试日期
 */
export const generateExamDate = (daysAgo: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
};

/**
 * 为单个学生生成成绩
 */
export const generateGradeForStudent = (
  student: GeneratedStudent,
  options: {
    examId: string;
    examTitle: string;
    examType?: string;
    examDate?: string;
    subjects?: string[];
    performanceLevel?: "excellent" | "good" | "average" | "poor";
  }
): GeneratedGrade => {
  const {
    examId,
    examTitle,
    examType,
    examDate,
    subjects,
    performanceLevel = "average",
  } = options;

  // 根据表现水平设置平均分和标准差
  const levelConfig = {
    excellent: { mean: 85, stdDev: 8 },
    good: { mean: 75, stdDev: 10 },
    average: { mean: 65, stdDev: 15 },
    poor: { mean: 50, stdDev: 12 },
  };

  const { mean, stdDev } = levelConfig[performanceLevel];

  const grade: GeneratedGrade = {
    exam_id: examId,
    student_id: student.student_id,
    name: student.name,
    class_name: student.class_name,
    exam_title: examTitle,
    exam_type:
      examType || EXAM_TYPES[Math.floor(Math.random() * EXAM_TYPES.length)],
    exam_date: examDate || generateExamDate(),
    total_score: 0,
    total_max_score: 0,
  };

  // 生成各科成绩
  const activeSubjects = subjects || [
    "chinese",
    "math",
    "english",
    "physics",
    "chemistry",
  ];

  activeSubjects.forEach((subject) => {
    const maxScore =
      SUBJECT_MAX_SCORES[subject as keyof typeof SUBJECT_MAX_SCORES] || 100;
    const score = generateNormalScore(
      (mean / 100) * maxScore,
      (stdDev / 100) * maxScore,
      0,
      maxScore
    );

    (grade as any)[`${subject}_score`] = score;
    (grade as any)[`${subject}_grade`] = calculateGrade(score, maxScore);

    grade.total_score += score;
    grade.total_max_score! += maxScore;
  });

  // 四舍五入总分
  grade.total_score = Math.round(grade.total_score * 10) / 10;
  grade.total_grade = calculateGrade(grade.total_score, grade.total_max_score!);

  return grade;
};

/**
 * 为多个学生生成成绩并计算排名
 */
export const generateGradesForStudents = (
  students: GeneratedStudent[],
  options: {
    examId?: string;
    examTitle: string;
    examType?: string;
    examDate?: string;
    subjects?: string[];
    performanceLevelDistribution?: {
      excellent?: number;
      good?: number;
      average?: number;
      poor?: number;
    };
  }
): GeneratedGrade[] => {
  const {
    examId = generateExamId(),
    examTitle,
    examType,
    examDate,
    subjects,
    performanceLevelDistribution = {
      excellent: 0.1,
      good: 0.3,
      average: 0.5,
      poor: 0.1,
    },
  } = options;

  // 为每个学生分配表现水平
  const gradesWithLevels = students.map((student) => {
    const rand = Math.random();
    let level: "excellent" | "good" | "average" | "poor" = "average";

    if (rand < performanceLevelDistribution.excellent!) {
      level = "excellent";
    } else if (
      rand <
      performanceLevelDistribution.excellent! +
        performanceLevelDistribution.good!
    ) {
      level = "good";
    } else if (
      rand <
      performanceLevelDistribution.excellent! +
        performanceLevelDistribution.good! +
        performanceLevelDistribution.average!
    ) {
      level = "average";
    } else {
      level = "poor";
    }

    return generateGradeForStudent(student, {
      examId,
      examTitle,
      examType,
      examDate,
      subjects,
      performanceLevel: level,
    });
  });

  // 计算排名
  return calculateRankings(gradesWithLevels);
};

/**
 * 计算成绩排名
 */
export const calculateRankings = (
  grades: GeneratedGrade[]
): GeneratedGrade[] => {
  // 按总分排序
  const sortedByTotal = [...grades].sort(
    (a, b) => b.total_score - a.total_score
  );

  // 计算年级/学校排名
  sortedByTotal.forEach((grade, index) => {
    grade.total_rank_in_school = index + 1;
    grade.total_rank_in_grade = index + 1;
  });

  // 计算班级排名
  const byClass = new Map<string, GeneratedGrade[]>();
  grades.forEach((grade) => {
    if (!byClass.has(grade.class_name)) {
      byClass.set(grade.class_name, []);
    }
    byClass.get(grade.class_name)!.push(grade);
  });

  byClass.forEach((classGrades) => {
    const sorted = classGrades.sort((a, b) => b.total_score - a.total_score);
    sorted.forEach((grade, index) => {
      grade.total_rank_in_class = index + 1;
    });
  });

  return grades;
};

/**
 * 生成多次考试的成绩数据（用于趋势分析）
 */
export const generateMultipleExams = (
  students: GeneratedStudent[],
  options: {
    examCount: number;
    startDate?: Date;
    intervalDays?: number;
    subjects?: string[];
    showProgress?: boolean; // 是否模拟成绩进步
  }
): GeneratedGrade[] => {
  const {
    examCount,
    startDate = new Date(),
    intervalDays = 30,
    subjects,
    showProgress = false,
  } = options;

  const allGrades: GeneratedGrade[] = [];

  for (let i = 0; i < examCount; i++) {
    const examDate = new Date(startDate);
    examDate.setDate(examDate.getDate() - (examCount - i - 1) * intervalDays);

    const examTitle = `第${i + 1}次月考`;
    const examId = generateExamId(`TEST_EXAM_${i + 1}`);

    // 如果显示进步，逐渐提高优秀学生比例
    let distribution = {
      excellent: 0.1,
      good: 0.3,
      average: 0.5,
      poor: 0.1,
    };

    if (showProgress) {
      const progressFactor = i / examCount;
      distribution = {
        excellent: 0.1 + progressFactor * 0.1,
        good: 0.3 + progressFactor * 0.1,
        average: 0.5 - progressFactor * 0.15,
        poor: 0.1 - progressFactor * 0.05,
      };
    }

    const grades = generateGradesForStudents(students, {
      examId,
      examTitle,
      examDate: examDate.toISOString().split("T")[0],
      subjects,
      performanceLevelDistribution: distribution,
    });

    allGrades.push(...grades);
  }

  return allGrades;
};

/**
 * 生成异常成绩数据（用于边界测试）
 */
export const generateEdgeCaseGrades = (
  students: GeneratedStudent[]
): GeneratedGrade[] => {
  const examId = generateExamId("TEST_EDGE");
  const examTitle = "边界测试考试";

  return [
    // 满分学生
    {
      ...generateGradeForStudent(students[0], {
        examId,
        examTitle,
        performanceLevel: "excellent",
      }),
      chinese_score: 150,
      math_score: 150,
      english_score: 150,
      total_score: 450,
    },
    // 零分学生
    {
      ...generateGradeForStudent(students[1], {
        examId,
        examTitle,
      }),
      chinese_score: 0,
      math_score: 0,
      english_score: 0,
      total_score: 0,
    },
    // 缺考学生（部分科目为null）
    {
      exam_id: examId,
      student_id: students[2].student_id,
      name: students[2].name,
      class_name: students[2].class_name,
      exam_title: examTitle,
      exam_date: generateExamDate(),
      total_score: 200,
      chinese_score: 100,
      math_score: 100,
      english_score: undefined, // 缺考
    } as GeneratedGrade,
  ];
};
