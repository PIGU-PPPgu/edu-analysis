/**
 * 演示数据生成器
 * 用于快速生成真实感的测试数据，适合录制视频和展示 Demo
 */

import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Insert"];
type GradeData = Database["public"]["Tables"]["grade_data"]["Insert"];
type WarningRecord = Database["public"]["Tables"]["warning_records"]["Insert"];

// 真实中文姓氏和名字库
const surnames = [
  "王",
  "李",
  "张",
  "刘",
  "陈",
  "杨",
  "黄",
  "赵",
  "吴",
  "周",
  "徐",
  "孙",
  "马",
  "朱",
  "胡",
  "郭",
  "何",
  "林",
  "高",
  "梁",
];

const givenNames = [
  "浩然",
  "子轩",
  "宇轩",
  "浩宇",
  "子涵",
  "雨泽",
  "子豪",
  "梓涵",
  "宇航",
  "子睿",
  "思远",
  "明轩",
  "宇晨",
  "梓豪",
  "子墨",
  "雨辰",
  "志豪",
  "宇泽",
  "子睿",
  "浩然",
  "欣怡",
  "雨萱",
  "诗涵",
  "欣妍",
  "雨欣",
  "可欣",
  "梓萱",
  "雨桐",
  "诗琪",
  "心怡",
  "思琪",
  "雨婷",
  "梦琪",
  "欣悦",
  "诗雅",
  "雨涵",
  "静怡",
  "梦瑶",
  "思雨",
  "欣然",
];

// 班级配置
const classes = [
  { name: "高一(1)班", grade: "高一", level: "top" }, // 尖子班
  { name: "高一(2)班", grade: "高一", level: "middle" }, // 普通班
  { name: "高一(3)班", grade: "高一", level: "middle" }, // 普通班
];

// 考试配置
const exams = [
  { title: "第一次月考", date: "2024-10-15", type: "月考" },
  { title: "期中考试", date: "2024-11-20", type: "期中" },
  { title: "第二次月考", date: "2024-12-10", type: "月考" },
];

/**
 * 生成正态分布的随机数
 */
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.round(z0 * stdDev + mean);
}

/**
 * 生成学生姓名
 */
function generateName(): string {
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  return surname + givenName;
}

/**
 * 生成学号
 */
function generateStudentId(classIndex: number, studentIndex: number): string {
  const year = "2024";
  const classNum = (classIndex + 1).toString().padStart(2, "0");
  const num = (studentIndex + 1).toString().padStart(3, "0");
  return `${year}${classNum}${num}`;
}

/**
 * 根据班级水平生成成绩
 */
function generateScore(
  subject: string,
  classLevel: string,
  fullScore: number
): number {
  let mean: number;
  let stdDev: number;

  // 根据班级水平设置平均分和标准差
  if (classLevel === "top") {
    mean = fullScore * 0.82; // 尖子班平均 82%
    stdDev = fullScore * 0.08; // 标准差 8%
  } else {
    mean = fullScore * 0.72; // 普通班平均 72%
    stdDev = fullScore * 0.12; // 标准差 12%
  }

  // 某些科目可能更难
  if (subject === "数学" || subject === "物理") {
    mean -= fullScore * 0.05;
  }

  const score = normalRandom(mean, stdDev);
  return Math.max(0, Math.min(fullScore, score));
}

/**
 * 计算等级
 */
function calculateGrade(score: number, fullScore: number): string {
  const percentage = (score / fullScore) * 100;
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "E";
}

/**
 * 生成学生数据
 */
export function generateStudents(studentsPerClass: number = 35): Student[] {
  const students: Student[] = [];

  classes.forEach((classInfo, classIndex) => {
    for (let i = 0; i < studentsPerClass; i++) {
      students.push({
        student_id: generateStudentId(classIndex, i),
        name: generateName(),
        class_name: classInfo.name,
        gender: Math.random() > 0.5 ? "男" : "女",
        admission_year: "2024",
        contact_phone: `138${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
      });
    }
  });

  return students;
}

/**
 * 生成成绩数据
 */
export function generateGradeData(students: Student[]): GradeData[] {
  const gradeData: GradeData[] = [];

  // 科目配置
  const subjects = [
    { name: "chinese", label: "语文", fullScore: 150 },
    { name: "math", label: "数学", fullScore: 150 },
    { name: "english", label: "英语", fullScore: 150 },
    { name: "physics", label: "物理", fullScore: 100 },
    { name: "chemistry", label: "化学", fullScore: 100 },
    { name: "biology", label: "生物", fullScore: 100 },
    { name: "politics", label: "政治", fullScore: 100 },
    { name: "history", label: "历史", fullScore: 100 },
    { name: "geography", label: "地理", fullScore: 100 },
  ];

  const totalMaxScore = 750; // 总分

  students.forEach((student) => {
    const classLevel =
      classes.find((c) => c.name === student.class_name)?.level || "middle";

    exams.forEach((exam) => {
      const gradeRecord: any = {
        exam_id: `${exam.type}-${exam.date}`,
        student_id: student.student_id,
        name: student.name,
        class_name: student.class_name,
        exam_title: exam.title,
        exam_type: exam.type,
        exam_date: exam.date,
        total_max_score: totalMaxScore,
      };

      // 生成各科成绩
      let totalScore = 0;
      subjects.forEach((subject) => {
        const score = generateScore(
          subject.label,
          classLevel,
          subject.fullScore
        );
        const grade = calculateGrade(score, subject.fullScore);

        gradeRecord[`${subject.name}_score`] = score;
        gradeRecord[`${subject.name}_grade`] = grade;
        totalScore += score;
      });

      gradeRecord.total_score = totalScore;
      gradeRecord.total_grade = calculateGrade(totalScore, totalMaxScore);

      gradeData.push(gradeRecord);
    });
  });

  // 计算排名
  exams.forEach((exam) => {
    const examRecords = gradeData.filter((g) => g.exam_title === exam.title);

    // 班级内排名
    classes.forEach((classInfo) => {
      const classRecords = examRecords
        .filter((g) => g.class_name === classInfo.name)
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

      classRecords.forEach((record, index) => {
        record.total_rank_in_class = index + 1;
      });
    });

    // 年级排名
    const sortedRecords = examRecords.sort(
      (a, b) => (b.total_score || 0) - (a.total_score || 0)
    );
    sortedRecords.forEach((record, index) => {
      record.total_rank_in_grade = index + 1;
    });
  });

  return gradeData;
}

/**
 * 生成预警数据
 */
export function generateWarningRecords(
  gradeData: GradeData[]
): Partial<WarningRecord>[] {
  const warnings: Partial<WarningRecord>[] = [];

  // 找出需要预警的学生（成绩下降、低分）
  const studentScores = new Map<string, GradeData[]>();

  gradeData.forEach((record) => {
    const studentId = record.student_id as string;
    if (!studentScores.has(studentId)) {
      studentScores.set(studentId, []);
    }
    studentScores.get(studentId)!.push(record);
  });

  studentScores.forEach((records, studentId) => {
    // 按日期排序
    records.sort(
      (a, b) =>
        new Date(a.exam_date!).getTime() - new Date(b.exam_date!).getTime()
    );

    // 检查成绩下降
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];

      const scoreDrop =
        ((prev.total_score || 0) - (curr.total_score || 0)) /
        (prev.total_score || 1);

      if (scoreDrop > 0.1) {
        // 成绩下降超过 10%
        warnings.push({
          student_id: studentId,
          details: {
            type: "成绩下降",
            previous_score: prev.total_score,
            current_score: curr.total_score,
            drop_percentage: (scoreDrop * 100).toFixed(1),
            exam: curr.exam_title,
          },
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
    }

    // 检查低分预警
    const latestRecord = records[records.length - 1];
    if (
      latestRecord.total_score &&
      latestRecord.total_score < (latestRecord.total_max_score || 750) * 0.6
    ) {
      warnings.push({
        student_id: studentId,
        details: {
          type: "成绩过低",
          score: latestRecord.total_score,
          max_score: latestRecord.total_max_score,
          percentage: (
            (latestRecord.total_score / (latestRecord.total_max_score || 750)) *
            100
          ).toFixed(1),
          exam: latestRecord.exam_title,
        },
        status: "active",
        created_at: new Date().toISOString(),
      });
    }
  });

  return warnings.slice(0, 20); // 只返回前 20 条预警
}

/**
 * 生成完整的演示数据
 */
export function generateDemoData() {
  console.log("🎬 开始生成演示数据...");

  const students = generateStudents(35);
  console.log(`✅ 生成 ${students.length} 名学生`);

  const gradeData = generateGradeData(students);
  console.log(`✅ 生成 ${gradeData.length} 条成绩记录`);

  const warnings = generateWarningRecords(gradeData);
  console.log(`✅ 生成 ${warnings.length} 条预警记录`);

  return {
    students,
    gradeData,
    warnings,
    summary: {
      studentsCount: students.length,
      classesCount: classes.length,
      examsCount: exams.length,
      gradeRecordsCount: gradeData.length,
      warningsCount: warnings.length,
    },
  };
}

/**
 * 导出为 JSON 文件（用于备份或离线导入）
 */
export function exportDemoDataToJSON() {
  const data = generateDemoData();

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `demo-data-${new Date().toISOString().split("T")[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);

  console.log("✅ 演示数据已导出为 JSON 文件");
  return data;
}
