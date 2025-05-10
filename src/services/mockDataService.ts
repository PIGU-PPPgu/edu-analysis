/**
 * 模拟数据生成服务
 * 提供测试用的随机学生数据
 */
import { StudentData } from './warningAnalytics';

// 班级名称列表
const CLASS_NAMES = [
  '高一(1)班', '高一(2)班', '高一(3)班', 
  '高二(1)班', '高二(2)班', '高二(3)班',
  '高三(1)班', '高三(2)班', '高三(3)班'
];

// 学科列表
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];

/**
 * 生成随机浮点数
 * @param min 最小值
 * @param max 最大值
 * @param decimals 小数位数
 */
function randomFloat(min: number, max: number, decimals = 2): number {
  const rand = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(rand * factor) / factor;
}

/**
 * 生成随机整数
 * @param min 最小值
 * @param max 最大值
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 带偏差的随机数生成
 * 生成围绕基准值波动的随机数
 */
function randomWithBias(baseValue: number, maxDeviation: number): number {
  const deviation = randomFloat(-maxDeviation, maxDeviation);
  return Math.max(0, Math.min(100, baseValue + deviation));
}

/**
 * 生成一个日期字符串
 * @param startDate 起始日期
 * @param endDate 结束日期
 */
function randomDate(startDate: Date, endDate: Date): string {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const date = new Date(start + Math.random() * (end - start));
  return date.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
}

/**
 * 生成近期日期序列
 * @param count 需要生成的日期数量
 * @param interval 日期间隔天数
 */
function generateDateSeries(count: number, interval = 30): string[] {
  const endDate = new Date();
  const dates: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(endDate.getDate() - i * interval);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates.reverse(); // 按时间顺序排序
}

/**
 * 生成学生历史数据
 * @param baseExamScore 基础考试分数
 * @param baseHomeworkScore 基础作业分数
 * @param baseParticipationScore 基础参与度分数
 * @param trend 趋势类型 (-1: 下降, 0: 稳定, 1: 上升)
 * @param volatility 波动性 (0-1)
 */
function generateHistoricalData(
  baseExamScore: number,
  baseHomeworkScore: number,
  baseParticipationScore: number,
  trend: -1 | 0 | 1 = 0,
  volatility = 0.3
): {
  examScores: { date: string; score: number }[];
  homeworkScores: { date: string; score: number }[];
  participationScores: { date: string; score: number }[];
} {
  // 生成时间点
  const dates = generateDateSeries(5, 30);
  
  // 定义趋势斜率
  const trendFactor = trend * 3; // 每次变化的平均分数
  
  // 生成考试成绩历史
  const examScores = dates.map((date, index) => {
    // 应用趋势和波动
    const deviation = randomFloat(-volatility * 15, volatility * 15);
    const trendImpact = trendFactor * index;
    const score = Math.max(0, Math.min(100, baseExamScore + trendImpact + deviation));
    
    return { date, score };
  });
  
  // 生成作业完成历史
  const homeworkScores = dates.map((date, index) => {
    // 作业完成率波动较小
    const deviation = randomFloat(-volatility * 10, volatility * 10);
    const trendImpact = trendFactor * index * 0.7; // 作业变化幅度较小
    const score = Math.max(0, Math.min(100, baseHomeworkScore + trendImpact + deviation));
    
    return { date, score };
  });
  
  // 生成参与度历史
  const participationScores = dates.map((date, index) => {
    const deviation = randomFloat(-volatility * 12, volatility * 12);
    const trendImpact = trendFactor * index * 0.8;
    const score = Math.max(0, Math.min(100, baseParticipationScore + trendImpact + deviation));
    
    return { date, score };
  });
  
  return {
    examScores,
    homeworkScores,
    participationScores
  };
}

/**
 * 生成一个模拟学生数据
 * @param id 学生ID
 * @param riskProfile 风险配置 (-1: 高风险, 0: 中等风险, 1: 低风险, 2: 无风险)
 */
export function generateStudent(id: string, riskProfile: -1 | 0 | 1 | 2 = 0): StudentData {
  // 基于风险配置设定基础分数
  let baseExamScore: number;
  let baseHomeworkRate: number;
  let baseParticipation: number;
  let baseTeacherRating: number;
  let trend: -1 | 0 | 1 = 0;
  
  switch (riskProfile) {
    case -1: // 高风险
      baseExamScore = randomFloat(40, 65);
      baseHomeworkRate = randomFloat(0.4, 0.7);
      baseParticipation = randomFloat(30, 60);
      baseTeacherRating = randomFloat(1.5, 3.0);
      trend = Math.random() < 0.7 ? -1 : 0; // 高概率下降趋势
      break;
    case 0: // 中等风险
      baseExamScore = randomFloat(55, 75);
      baseHomeworkRate = randomFloat(0.6, 0.85);
      baseParticipation = randomFloat(50, 75);
      baseTeacherRating = randomFloat(2.5, 3.5);
      trend = Math.random() < 0.5 ? -1 : 0; // 50%概率下降
      break;
    case 1: // 低风险
      baseExamScore = randomFloat(65, 85);
      baseHomeworkRate = randomFloat(0.75, 0.95);
      baseParticipation = randomFloat(70, 90);
      baseTeacherRating = randomFloat(3.0, 4.5);
      trend = Math.random() < 0.3 ? -1 : (Math.random() < 0.5 ? 0 : 1); // 30%下降，35%稳定，35%上升
      break;
    default: // 无风险
      baseExamScore = randomFloat(75, 95);
      baseHomeworkRate = randomFloat(0.85, 1.0);
      baseParticipation = randomFloat(80, 100);
      baseTeacherRating = randomFloat(4.0, 5.0);
      trend = Math.random() < 0.2 ? 0 : 1; // 80%概率上升趋势
      break;
  }
  
  // 生成前一次考试成绩 (如果是下降趋势，则前一次成绩更高)
  const previousExamScore = trend === -1
    ? baseExamScore + randomFloat(5, 15)
    : (trend === 1
      ? baseExamScore - randomFloat(5, 15)
      : baseExamScore + randomFloat(-5, 5));
  
  // 生成学科成绩
  const subjectScores: Record<string, number> = {};
  SUBJECTS.forEach(subject => {
    subjectScores[subject] = randomWithBias(baseExamScore, 15);
  });
  
  // 随机选择班级
  const classIndex = randomInt(0, CLASS_NAMES.length - 1);
  
  // 生成学生数据
  const student: StudentData = {
    id,
    name: `学生${id}`,
    class: CLASS_NAMES[classIndex],
    examAverage: baseExamScore,
    previousExamAverage: previousExamScore,
    homeworkCompletionRate: baseHomeworkRate,
    participationScore: baseParticipation,
    teacherRating: baseTeacherRating,
    subjectScores,
    historicalData: generateHistoricalData(
      baseExamScore,
      baseHomeworkRate * 100,
      baseParticipation,
      trend,
      0.4
    )
  };
  
  return student;
}

/**
 * 生成模拟学生数据集
 * @param count 学生数量
 * @param highRiskRatio 高风险学生比例
 * @param medRiskRatio 中等风险学生比例
 * @param lowRiskRatio 低风险学生比例
 */
export function generateStudentDataset(
  count: number,
  highRiskRatio = 0.15,
  medRiskRatio = 0.25,
  lowRiskRatio = 0.30
): StudentData[] {
  const students: StudentData[] = [];
  
  // 计算每种风险类型的学生数量
  const highRiskCount = Math.round(count * highRiskRatio);
  const medRiskCount = Math.round(count * medRiskRatio);
  const lowRiskCount = Math.round(count * lowRiskRatio);
  const noRiskCount = count - highRiskCount - medRiskCount - lowRiskCount;
  
  // 生成高风险学生
  for (let i = 0; i < highRiskCount; i++) {
    students.push(generateStudent(`H${i+1}`, -1));
  }
  
  // 生成中等风险学生
  for (let i = 0; i < medRiskCount; i++) {
    students.push(generateStudent(`M${i+1}`, 0));
  }
  
  // 生成低风险学生
  for (let i = 0; i < lowRiskCount; i++) {
    students.push(generateStudent(`L${i+1}`, 1));
  }
  
  // 生成无风险学生
  for (let i = 0; i < noRiskCount; i++) {
    students.push(generateStudent(`N${i+1}`, 2));
  }
  
  return students;
}

/**
 * 获取模拟的预警系统初始数据
 */
export function getMockWarningSystemData() {
  // 生成150名学生的数据集
  const students = generateStudentDataset(150);
  
  // 返回预警系统所需的基础数据
  return {
    students,
    totalStudents: students.length,
    // 假设我们已经用预警算法计算了风险学生数
    atRiskStudents: Math.round(students.length * 0.4), // 约40%的学生有风险
    highRiskStudents: Math.round(students.length * 0.15), // 约15%是高风险
    // 预警类型分布
    warningsByType: [
      { type: "成绩", count: 32, percentage: 42 },
      { type: "作业", count: 24, percentage: 32 },
      { type: "参与度", count: 18, percentage: 24 },
      { type: "综合", count: 2, percentage: 2 }
    ],
    // 班级风险分布
    riskByClass: CLASS_NAMES.map(className => ({
      className,
      studentCount: randomInt(30, 60),
      atRiskCount: randomInt(10, 25)
    })),
    // 常见风险因素
    commonRiskFactors: [
      { factor: "期中考试成绩下降", count: 27, percentage: 35 },
      { factor: "作业完成率低", count: 24, percentage: 31 },
      { factor: "课堂参与度不足", count: 18, percentage: 23 },
      { factor: "缺交作业次数增加", count: 12, percentage: 15 },
      { factor: "考试科目成绩不均衡", count: 8, percentage: 10 }
    ]
  };
} 