/**
 * Performance Test Data Generator for Grade Data
 * Generates 1000+ realistic grade records for testing virtual scrolling
 */

interface TestGradeData {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  subject: string;
  score: number;
  grade: string;
  rank_in_class: number;
  rank_in_grade: number;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  total_score: number;
  subject_total_score: number;
  students?: {
    name: string;
    student_id: string;
    class_name: string;
  };
}

// 配置常量
const SUBJECTS = [
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "政治",
];

const EXAM_TYPES = ["期中考试", "期末考试", "月考", "模拟考试"];

const CLASS_NAMES = [
  "高一(1)班",
  "高一(2)班",
  "高一(3)班",
  "高一(4)班",
  "高一(5)班",
  "高二(1)班",
  "高二(2)班",
  "高二(3)班",
  "高二(4)班",
  "高二(5)班",
  "高三(1)班",
  "高三(2)班",
  "高三(3)班",
  "高三(4)班",
  "高三(5)班",
];

const SURNAMES = [
  "王",
  "李",
  "张",
  "刘",
  "陈",
  "杨",
  "黄",
  "赵",
  "周",
  "吴",
  "徐",
  "孙",
  "马",
  "朱",
  "胡",
  "郭",
  "何",
  "高",
  "林",
  "罗",
];

const GIVEN_NAMES = [
  "伟",
  "芳",
  "娜",
  "秀英",
  "敏",
  "静",
  "丽",
  "强",
  "磊",
  "军",
  "洋",
  "勇",
  "艳",
  "杰",
  "涛",
  "明",
  "超",
  "秀兰",
  "霞",
  "平",
  "刚",
  "桂英",
  "婷",
  "欣",
  "浩",
  "宇",
  "建华",
  "文",
  "俊",
  "辉",
];

/**
 * 生成随机整数
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机浮点数
 */
function randomFloat(min: number, max: number, decimals = 1): number {
  const rand = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(rand * factor) / factor;
}

/**
 * 根据分数生成等级
 */
function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D";
  return "F";
}

/**
 * 生成随机姓名
 */
function generateName(): string {
  const surname = SURNAMES[randomInt(0, SURNAMES.length - 1)];
  const givenName = GIVEN_NAMES[randomInt(0, GIVEN_NAMES.length - 1)];
  return surname + givenName;
}

/**
 * 生成随机日期 (近6个月内)
 */
function generateRecentDate(): string {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const randomTime =
    sixMonthsAgo.getTime() +
    Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime).toISOString().split("T")[0];
}

/**
 * 生成单条成绩记录
 */
function generateGradeRecord(index: number): TestGradeData {
  const studentId = `S${String(index + 10001).padStart(6, "0")}`;
  const name = generateName();
  const className = CLASS_NAMES[randomInt(0, CLASS_NAMES.length - 1)];
  const subject = SUBJECTS[randomInt(0, SUBJECTS.length - 1)];
  const examType = EXAM_TYPES[randomInt(0, EXAM_TYPES.length - 1)];

  // 生成分数 (正态分布，均值75，标准差12)
  const mean = 75;
  const stdDev = 12;
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  let score = mean + z0 * stdDev;

  // 限制分数范围
  score = Math.max(30, Math.min(100, score));
  score = parseFloat(score.toFixed(1));

  const grade = scoreToGrade(score);

  // 根据班级生成排名
  const classSize = randomInt(40, 50);
  const rankInClass = randomInt(1, classSize);

  // 根据年级生成排名
  const gradeSize =
    classSize *
    CLASS_NAMES.filter((c) => c.startsWith(className.substring(0, 2))).length;
  const rankInGrade = randomInt(1, gradeSize);

  const examTitle = `${className.substring(0, 2)}${examType}`;
  const examDate = generateRecentDate();

  const subjectTotalScore =
    subject === "语文" || subject === "数学" || subject === "英语" ? 150 : 100;

  return {
    id: `grade_${index}_${Date.now()}`,
    student_id: studentId,
    name,
    class_name: className,
    subject,
    score,
    grade,
    rank_in_class: rankInClass,
    rank_in_grade: rankInGrade,
    exam_title: examTitle,
    exam_type: examType,
    exam_date: examDate,
    total_score: randomInt(400, 750),
    subject_total_score: subjectTotalScore,
    students: {
      name,
      student_id: studentId,
      class_name: className,
    },
  };
}

/**
 * 生成指定数量的成绩数据
 */
export function generateGradeDataset(count: number): TestGradeData[] {
  console.log(`Generating ${count} grade records...`);
  const startTime = Date.now();

  const dataset: TestGradeData[] = [];
  for (let i = 0; i < count; i++) {
    dataset.push(generateGradeRecord(i));

    // 每生成1000条记录打印一次进度
    if ((i + 1) % 1000 === 0) {
      console.log(`Generated ${i + 1} / ${count} records`);
    }
  }

  const duration = Date.now() - startTime;
  console.log(
    `✓ Generated ${count} records in ${duration}ms (${(count / duration).toFixed(2)} records/ms)`
  );

  return dataset;
}

/**
 * 主函数 - 生成测试数据
 */
export function main() {
  const counts = [100, 500, 1000, 5000, 10000];

  console.log("=== Grade Data Performance Test Generator ===\n");

  const results: Record<number, TestGradeData[]> = {};

  for (const count of counts) {
    results[count] = generateGradeDataset(count);
    console.log(
      `Dataset size: ${count}, Memory: ${JSON.stringify(results[count]).length} bytes\n`
    );
  }

  // 输出统计信息
  console.log("=== Generation Summary ===");
  for (const count of counts) {
    const dataset = results[count];
    const avgScore =
      dataset.reduce((sum, record) => sum + record.score, 0) / dataset.length;
    const uniqueStudents = new Set(dataset.map((r) => r.student_id)).size;
    const uniqueClasses = new Set(dataset.map((r) => r.class_name)).size;

    console.log(`${count} records:`);
    console.log(`  - Unique students: ${uniqueStudents}`);
    console.log(`  - Unique classes: ${uniqueClasses}`);
    console.log(`  - Average score: ${avgScore.toFixed(2)}`);
    console.log(
      `  - JSON size: ${(JSON.stringify(dataset).length / 1024).toFixed(2)} KB`
    );
  }

  return results;
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}
