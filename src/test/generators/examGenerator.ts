/**
 * 📝 考试数据生成器
 * 生成测试用考试记录
 */

export interface GeneratedExam {
  id: string;
  title: string;
  exam_type: string;
  exam_date: string;
  created_at?: string;
  total_max_score?: number;
  description?: string;
  subjects?: string[];
  grade_level?: string;
}

// 考试类型
const EXAM_TYPES = [
  "期中考试",
  "期末考试",
  "月考",
  "模拟考试",
  "单元测试",
  "周测",
];

// 年级
const GRADE_LEVELS = ["高一", "高二", "高三"];

/**
 * 生成考试ID
 */
export const generateExamId = (prefix: string = "TEST_EXAM"): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * 生成考试标题
 */
export const generateExamTitle = (options?: {
  examType?: string;
  gradeLevel?: string;
  semester?: string;
  year?: number;
}): string => {
  const year = options?.year || new Date().getFullYear();
  const semester =
    options?.semester || (new Date().getMonth() < 6 ? "上学期" : "下学期");
  const gradeLevel =
    options?.gradeLevel ||
    GRADE_LEVELS[Math.floor(Math.random() * GRADE_LEVELS.length)];
  const examType =
    options?.examType ||
    EXAM_TYPES[Math.floor(Math.random() * EXAM_TYPES.length)];

  return `${year}学年${semester}${gradeLevel}${examType}`;
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
 * 生成单个考试数据
 */
export const generateExam = (options?: {
  id?: string;
  title?: string;
  examType?: string;
  examDate?: string;
  gradeLevel?: string;
  subjects?: string[];
  description?: string;
}): GeneratedExam => {
  const examType =
    options?.examType ||
    EXAM_TYPES[Math.floor(Math.random() * EXAM_TYPES.length)];
  const gradeLevel =
    options?.gradeLevel ||
    GRADE_LEVELS[Math.floor(Math.random() * GRADE_LEVELS.length)];

  return {
    id: options?.id || generateExamId(),
    title: options?.title || generateExamTitle({ examType, gradeLevel }),
    exam_type: examType,
    exam_date: options?.examDate || generateExamDate(),
    created_at: new Date().toISOString(),
    subjects: options?.subjects || ["语文", "数学", "英语", "物理", "化学"],
    grade_level: gradeLevel,
    description: options?.description,
  };
};

/**
 * 生成学期考试系列
 */
export const generateSemesterExams = (options: {
  gradeLevel: string;
  year?: number;
  semester?: string;
  includeMonthlyExams?: boolean;
  includeWeeklyTests?: boolean;
}): GeneratedExam[] => {
  const {
    gradeLevel,
    year,
    semester,
    includeMonthlyExams = true,
    includeWeeklyTests = false,
  } = options;

  const exams: GeneratedExam[] = [];
  const currentYear = year || new Date().getFullYear();
  const currentSemester = semester || "上学期";

  // 期中考试
  exams.push(
    generateExam({
      title: `${currentYear}学年${currentSemester}${gradeLevel}期中考试`,
      examType: "期中考试",
      examDate: generateExamDate(60),
      gradeLevel,
    })
  );

  // 期末考试
  exams.push(
    generateExam({
      title: `${currentYear}学年${currentSemester}${gradeLevel}期末考试`,
      examType: "期末考试",
      examDate: generateExamDate(10),
      gradeLevel,
    })
  );

  // 月考
  if (includeMonthlyExams) {
    for (let month = 1; month <= 4; month++) {
      exams.push(
        generateExam({
          title: `${currentYear}学年${currentSemester}${gradeLevel}第${month}次月考`,
          examType: "月考",
          examDate: generateExamDate(90 - month * 20),
          gradeLevel,
        })
      );
    }
  }

  // 周测
  if (includeWeeklyTests) {
    for (let week = 1; week <= 8; week++) {
      exams.push(
        generateExam({
          title: `${currentYear}学年${currentSemester}${gradeLevel}第${week}周测`,
          examType: "周测",
          examDate: generateExamDate(100 - week * 12),
          gradeLevel,
        })
      );
    }
  }

  return exams;
};

/**
 * 生成多个年级的考试数据
 */
export const generateMultiGradeExams = (options: {
  gradeLevels?: string[];
  year?: number;
  semester?: string;
  includeMonthlyExams?: boolean;
}): GeneratedExam[] => {
  const {
    gradeLevels = GRADE_LEVELS,
    year,
    semester,
    includeMonthlyExams = true,
  } = options;

  const allExams: GeneratedExam[] = [];

  gradeLevels.forEach((gradeLevel) => {
    const exams = generateSemesterExams({
      gradeLevel,
      year,
      semester,
      includeMonthlyExams,
      includeWeeklyTests: false,
    });
    allExams.push(...exams);
  });

  return allExams;
};

/**
 * 生成时间序列考试数据（用于趋势分析）
 */
export const generateTimeSeriesExams = (options: {
  count: number;
  startDate?: Date;
  intervalDays?: number;
  examType?: string;
  gradeLevel?: string;
}): GeneratedExam[] => {
  const {
    count,
    startDate = new Date(),
    intervalDays = 30,
    examType = "月考",
    gradeLevel = "高一",
  } = options;

  const exams: GeneratedExam[] = [];

  for (let i = 0; i < count; i++) {
    const examDate = new Date(startDate);
    examDate.setDate(examDate.getDate() - (count - i - 1) * intervalDays);

    exams.push(
      generateExam({
        title: `${gradeLevel}第${i + 1}次${examType}`,
        examType,
        examDate: examDate.toISOString().split("T")[0],
        gradeLevel,
      })
    );
  }

  return exams;
};

/**
 * 生成特殊场景考试数据
 */
export const generateEdgeCaseExams = (): GeneratedExam[] => {
  return [
    // 当天考试
    {
      id: "TEST_EXAM_TODAY",
      title: "今日测验",
      exam_type: "周测",
      exam_date: new Date().toISOString().split("T")[0],
      grade_level: "高一",
    },
    // 未来考试
    {
      id: "TEST_EXAM_FUTURE",
      title: "即将进行的考试",
      exam_type: "期末考试",
      exam_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      grade_level: "高二",
    },
    // 历史考试（很久之前）
    {
      id: "TEST_EXAM_HISTORICAL",
      title: "2020学年上学期期末考试",
      exam_type: "期末考试",
      exam_date: "2020-01-15",
      grade_level: "高三",
    },
    // 特殊科目组合
    {
      id: "TEST_EXAM_SPECIAL",
      title: "理科综合测试",
      exam_type: "模拟考试",
      exam_date: generateExamDate(30),
      subjects: ["物理", "化学", "生物"],
      grade_level: "高三",
    },
  ];
};
