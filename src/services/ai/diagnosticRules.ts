/**
 * AI诊断规则库
 * 基于教育评价理论和最佳实践，提供精准的诊断建议
 */

// ============================================================================
// 趋势分析辅助函数
// ============================================================================

/**
 * 趋势类型
 */
export type TrendType = "上升" | "下降" | "波动" | "停滞";

/**
 * 趋势分析结果
 */
export interface TrendAnalysisResult {
  type: TrendType;
  strength: number; // 趋势强度 0-1
  volatility: number; // 波动性 0-1
  slope: number; // 斜率
  stability: number; // 稳定性 0-1
}

/**
 * 计算历史数据趋势
 * @param values 历史数据数组（按时间顺序）
 * @returns 趋势分析结果
 */
export function calculateTrend(values: number[]): TrendAnalysisResult {
  if (values.length < 2) {
    return {
      type: "停滞",
      strength: 0,
      volatility: 0,
      slope: 0,
      stability: 1,
    };
  }

  // 1. 计算线性回归斜率
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;

  // 2. 计算标准差和变异系数（衡量波动性）
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = yMean === 0 ? 0 : stdDev / Math.abs(yMean);

  // 3. 判断趋势类型
  const slopeThreshold = yMean * 0.02; // 2%的变化才算有趋势
  let type: TrendType;
  if (Math.abs(slope) < slopeThreshold) {
    type = cv > 0.15 ? "波动" : "停滞";
  } else {
    type = slope > 0 ? "上升" : "下降";
  }

  // 4. 计算趋势强度（基于斜率和R²）
  const predictions = xValues.map((x) => yMean + slope * (x - xMean));
  const ssRes = values.reduce(
    (sum, v, i) => sum + Math.pow(v - predictions[i], 2),
    0
  );
  const ssTot = values.reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const strength = Math.min(1, Math.abs(rSquared));

  // 5. 计算稳定性（低波动 = 高稳定）
  const stability = Math.max(0, 1 - cv);

  return {
    type,
    strength,
    volatility: cv,
    slope,
    stability,
  };
}

/**
 * 简单线性预测下一个值
 * @param values 历史数据数组
 * @returns 预测的下一个值
 */
export function predictNextValue(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // 预测下一个点（x = n）
  return intercept + slope * n;
}

export enum WeaknessType {
  LOW_ENTRY = "low_entry", // 入口薄弱
  LOW_EXIT = "low_exit", // 出口薄弱
  NEGATIVE_VALUE_ADDED = "negative_value_added", // 负增值
  LOW_CONSOLIDATION = "low_consolidation", // 巩固率低
  LOW_TRANSFORMATION = "low_transformation", // 转化率低
  UNBALANCED_SUBJECTS = "unbalanced_subjects", // 学科不平衡
  DECLINING_TREND = "declining_trend", // 下降趋势
  UNSTABLE_PERFORMANCE = "unstable_performance", // 成绩波动大
  CONTINUOUS_DECLINE = "continuous_decline", // 持续下降
  STAGNANT_PROGRESS = "stagnant_progress", // 进步停滞
  HIGH_RISK_PREDICTION = "high_risk_prediction", // 高风险预测
  SUBJECT_COORDINATION = "subject_coordination", // 学科协调性问题
}

export enum DiagnosticLevel {
  STUDENT = "student",
  CLASS = "class",
  TEACHER = "teacher",
  SCHOOL = "school",
}

export interface DiagnosticRule {
  id: string;
  name: string;
  description: string;
  level: DiagnosticLevel;
  condition: (data: any) => boolean;
  severity: "critical" | "warning" | "info";
  suggestions: string[];
  strategies: TeachingStrategy[];
}

export interface TeachingStrategy {
  name: string;
  description: string;
  targetGroup: "advanced" | "intermediate" | "struggling" | "all";
  actions: string[];
  expectedOutcome: string;
  timeFrame: string;
}

export interface DiagnosticResult {
  weaknessType: WeaknessType;
  severity: "critical" | "warning" | "info";
  description: string;
  causes: string[];
  suggestions: string[];
  strategies: TeachingStrategy[];
  metrics?: {
    currentValue: number;
    targetValue: number;
    gap: number;
  };
}

/**
 * 学生层面诊断规则
 */
export const studentDiagnosticRules: DiagnosticRule[] = [
  {
    id: "student_negative_value_added",
    name: "负增值学生诊断",
    description: "识别出口分低于入口分的学生，分析原因并提供干预建议",
    level: DiagnosticLevel.STUDENT,
    condition: (student) =>
      student.avg_score_value_added_rate !== undefined &&
      student.avg_score_value_added_rate < -0.05,
    severity: "critical",
    suggestions: [
      "立即进行一对一谈话，了解学习困难和心理状态",
      "检查近期考勤记录和作业完成情况",
      "联系家长，了解家庭学习环境变化",
      "安排学科教师进行知识点诊断测试",
      "制定个性化补习计划，重点补齐知识漏洞",
    ],
    strategies: [
      {
        name: "个性化辅导",
        description: "针对性补习薄弱知识点",
        targetGroup: "struggling",
        actions: [
          "每周安排2-3次课后辅导",
          "使用错题本系统化梳理知识漏洞",
          "建立学习小组，同伴互助",
          "定期进行知识点巩固测试",
        ],
        expectedOutcome: "2-3个月内增值率提升至正值",
        timeFrame: "短期（1-3个月）",
      },
      {
        name: "心理支持",
        description: "关注学生心理健康和学习动机",
        targetGroup: "struggling",
        actions: [
          "安排心理咨询",
          "设置可达成的小目标，增强自信心",
          "正面激励，避免过度批评",
          "家校合作，营造良好学习氛围",
        ],
        expectedOutcome: "恢复学习积极性，提升学习效率",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
  {
    id: "student_low_consolidation",
    name: "巩固率不足诊断",
    description: "识别优等生保持率低的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) =>
      student.consolidation_rate !== undefined &&
      student.consolidation_rate < 0.6 &&
      (student.avg_score_entry || 0) > 80,
    severity: "warning",
    suggestions: [
      "分析优势学科是否出现下滑",
      "检查学习方法是否仍然有效",
      "评估是否存在骄傲自满情绪",
      "提供更具挑战性的学习任务",
      "培养持续进步的成长型思维",
    ],
    strategies: [
      {
        name: "挑战性任务",
        description: "提供更高难度的学习内容",
        targetGroup: "advanced",
        actions: [
          "安排竞赛题目训练",
          "鼓励参加学科竞赛",
          "设置拓展学习项目",
          "培养自主学习能力",
        ],
        expectedOutcome: "保持学习动力，巩固率提升至80%以上",
        timeFrame: "短期（1-2个月）",
      },
    ],
  },
  {
    id: "student_low_transformation",
    name: "转化率不足诊断",
    description: "识别后进生转化效果不佳的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) =>
      student.transformation_rate !== undefined &&
      student.transformation_rate < 0.3 &&
      (student.avg_score_entry || 0) < 60,
    severity: "warning",
    suggestions: [
      "分析是否存在基础知识严重欠缺",
      "评估学习态度和学习习惯",
      "检查是否存在学习障碍",
      "制定基础知识补习计划",
      "设置阶梯式学习目标",
    ],
    strategies: [
      {
        name: "基础强化",
        description: "系统补齐基础知识",
        targetGroup: "struggling",
        actions: [
          "从最基础的知识点开始补习",
          "使用可视化教学工具",
          "大量基础题目练习",
          "及时反馈和鼓励",
        ],
        expectedOutcome: "基础知识掌握率达到60%以上",
        timeFrame: "中期（3-6个月）",
      },
      {
        name: "习惯养成",
        description: "培养良好的学习习惯",
        targetGroup: "struggling",
        actions: [
          "制定学习时间表",
          "教授笔记方法",
          "培养预习复习习惯",
          "建立学习常规",
        ],
        expectedOutcome: "形成稳定的学习习惯",
        timeFrame: "长期（6-12个月）",
      },
    ],
  },
  {
    id: "student_subject_imbalance",
    name: "学科不平衡诊断",
    description: "识别各学科成绩差异过大的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      // 需要检查各科成绩的标准差
      if (!student.subjectScores || student.subjectScores.length < 3)
        return false;
      const scores = student.subjectScores.map((s: any) => s.score);
      const avg =
        scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const variance =
        scores.reduce(
          (sum: number, s: number) => sum + Math.pow(s - avg, 2),
          0
        ) / scores.length;
      const std = Math.sqrt(variance);
      return std > 15; // 标准差大于15分视为不平衡
    },
    severity: "info",
    suggestions: [
      "识别薄弱学科和优势学科",
      "分析薄弱学科的具体问题",
      "制定学科平衡发展计划",
      "适当增加薄弱学科的学习时间",
      "保持优势学科的学习投入",
    ],
    strategies: [
      {
        name: "学科平衡计划",
        description: "针对性提升薄弱学科",
        targetGroup: "all",
        actions: [
          "每周安排薄弱学科专项练习",
          "寻找学科兴趣切入点",
          "调整各学科时间分配",
          "定期评估各学科进步情况",
        ],
        expectedOutcome: "各学科成绩标准差降至10分以内",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
];

/**
 * 班级层面诊断规则
 */
export const classDiagnosticRules: DiagnosticRule[] = [
  {
    id: "class_negative_value_added",
    name: "班级负增值诊断",
    description: "识别整体增值率为负的班级",
    level: DiagnosticLevel.CLASS,
    condition: (classData) =>
      classData.avg_score_value_added_rate !== undefined &&
      classData.avg_score_value_added_rate < -0.03,
    severity: "critical",
    suggestions: [
      "召开班级教师会议，分析教学问题",
      "检查教学进度是否合理",
      "评估作业难度和作业量是否适当",
      "调查学生学习负担和心理压力",
      "检查班级管理和学习氛围",
      "对比同年级其他班级的教学方法",
    ],
    strategies: [
      {
        name: "教学方法改进",
        description: "优化整体教学策略",
        targetGroup: "all",
        actions: [
          "增加互动式教学环节",
          "引入项目式学习",
          "加强课堂参与度",
          "优化作业设计",
          "定期教学反思",
        ],
        expectedOutcome: "班级增值率提升至正值",
        timeFrame: "中期（3-6个月）",
      },
      {
        name: "分层教学",
        description: "满足不同层次学生需求",
        targetGroup: "all",
        actions: [
          "实施分层作业",
          "组织分层辅导",
          "建立学习小组",
          "差异化教学目标",
        ],
        expectedOutcome: "各层次学生都有进步",
        timeFrame: "长期（6-12个月）",
      },
    ],
  },
  {
    id: "class_low_consolidation",
    name: "班级巩固率低诊断",
    description: "识别优等生流失率高的班级",
    level: DiagnosticLevel.CLASS,
    condition: (classData) =>
      classData.consolidation_rate !== undefined &&
      classData.consolidation_rate < 0.65,
    severity: "warning",
    suggestions: [
      "分析优等生成绩下滑的共同原因",
      "检查是否教学难度不足",
      "评估是否缺乏挑战性任务",
      "关注优等生的学习动机",
      "提供拓展学习资源",
    ],
    strategies: [
      {
        name: "优生培养计划",
        description: "针对优等生的进阶培养",
        targetGroup: "advanced",
        actions: [
          "组织学科竞赛培训",
          "提供研究性学习项目",
          "安排拔尖学生互助小组",
          "定期举办学术讲座",
        ],
        expectedOutcome: "巩固率提升至75%以上",
        timeFrame: "短期（1-3个月）",
      },
    ],
  },
  {
    id: "class_low_transformation",
    name: "班级转化率低诊断",
    description: "识别后进生转化效果不佳的班级",
    level: DiagnosticLevel.CLASS,
    condition: (classData) =>
      classData.transformation_rate !== undefined &&
      classData.transformation_rate < 0.25,
    severity: "warning",
    suggestions: [
      "分析后进生学习困难的共性",
      "评估基础知识教学是否扎实",
      "检查是否存在教学盲区",
      "加强个别辅导和关怀",
      "建立后进生转化激励机制",
    ],
    strategies: [
      {
        name: "后进生转化计划",
        description: "系统化的后进生帮扶",
        targetGroup: "struggling",
        actions: [
          "建立一对一帮扶机制",
          "课后免费辅导",
          "降低作业难度，增加完成率",
          "及时表扬进步，增强信心",
        ],
        expectedOutcome: "转化率提升至35%以上",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
  {
    id: "class_wide_gap",
    name: "班级两极分化诊断",
    description: "识别成绩差距过大的班级",
    level: DiagnosticLevel.CLASS,
    condition: (classData) => {
      if (!classData.scoreDistribution) return false;
      const std = classData.scoreDistribution.standardDeviation;
      return std > 20; // 标准差大于20分
    },
    severity: "warning",
    suggestions: [
      "实施分层教学，照顾不同层次学生",
      "加强对中等生的关注",
      "缩小作业难度差异",
      "建立学生互助机制",
      "定期开展班级团队活动",
    ],
    strategies: [
      {
        name: "缩小差距计划",
        description: "整体提升班级均衡性",
        targetGroup: "all",
        actions: [
          "分层作业设计",
          "小组合作学习",
          "优生帮扶后进生",
          "针对性个别辅导",
        ],
        expectedOutcome: "成绩标准差降至15分以内",
        timeFrame: "长期（6-12个月）",
      },
    ],
  },
];

/**
 * 历次追踪趋势分析规则
 */
export const trendTrackingRules: DiagnosticRule[] = [
  {
    id: "student_continuous_decline",
    name: "学生持续下降趋势诊断",
    description: "识别连续3次或以上考试成绩持续下降的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      if (
        !student.historicalScores ||
        !Array.isArray(student.historicalScores) ||
        student.historicalScores.length < 3
      )
        return false;
      const trend = calculateTrend(student.historicalScores);
      return trend.type === "下降" && trend.strength > 0.6;
    },
    severity: "critical",
    suggestions: [
      "立即与学生进行深度谈话，了解学习困难的根源",
      "排查是否存在家庭、人际关系或心理健康问题",
      "检查学习方法是否出现问题，是否需要调整",
      "安排科任教师会诊，找出各科下滑的共性原因",
      "制定紧急干预计划，设置短期可达成的小目标",
    ],
    strategies: [
      {
        name: "紧急干预",
        description: "阻止成绩持续下滑的紧急措施",
        targetGroup: "struggling",
        actions: [
          "每周至少一次一对一谈话",
          "建立每日学习任务清单",
          "安排学习伙伴或辅导教师",
          "每周与家长沟通进展",
          "设置每周小目标并及时反馈",
        ],
        expectedOutcome: "1个月内止跌，2个月内开始回升",
        timeFrame: "紧急（1-2个月）",
      },
      {
        name: "心理疏导",
        description: "关注学生心理状态，重建学习信心",
        targetGroup: "struggling",
        actions: [
          "安排心理咨询或辅导",
          "降低学习压力，避免过度批评",
          "寻找学生的兴趣点和优势",
          "建立正面激励机制",
        ],
        expectedOutcome: "恢复学习动力和积极心态",
        timeFrame: "中期（2-3个月）",
      },
    ],
  },
  {
    id: "student_unstable_performance",
    name: "学生成绩波动大诊断",
    description: "识别成绩大幅波动、不稳定的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      if (
        !student.historicalScores ||
        !Array.isArray(student.historicalScores) ||
        student.historicalScores.length < 3
      )
        return false;
      const trend = calculateTrend(student.historicalScores);
      return trend.type === "波动" && trend.volatility > 0.2;
    },
    severity: "warning",
    suggestions: [
      "分析每次考试的备考状态和考试心态",
      "检查是否存在知识点掌握不扎实的问题",
      "评估学习习惯的稳定性和规律性",
      "关注考试期间的身体和心理状态",
      "培养稳定的学习节奏和复习习惯",
    ],
    strategies: [
      {
        name: "稳定化训练",
        description: "建立稳定的学习和考试习惯",
        targetGroup: "all",
        actions: [
          "制定固定的学习时间表",
          "加强基础知识的系统复习",
          "进行定期的模拟测试训练",
          "教授考试心理调节技巧",
          "建立错题本系统",
        ],
        expectedOutcome: "成绩波动幅度减小到10%以内",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
  {
    id: "class_declining_trend",
    name: "班级整体下滑趋势诊断",
    description: "识别班级平均分连续下降的情况",
    level: DiagnosticLevel.CLASS,
    condition: (classData) => {
      if (
        !classData.historicalAvgScores ||
        !Array.isArray(classData.historicalAvgScores) ||
        classData.historicalAvgScores.length < 3
      )
        return false;
      const trend = calculateTrend(classData.historicalAvgScores);
      return trend.type === "下降" && trend.strength > 0.5;
    },
    severity: "critical",
    suggestions: [
      "召开紧急班级教师会议，分析下滑原因",
      "检查教学进度是否过快或过慢",
      "评估作业量和难度是否合理",
      "调查学生的学习压力和心理状态",
      "对比其他班级，寻找差距原因",
      "考虑调整教学策略或方法",
    ],
    strategies: [
      {
        name: "教学改进计划",
        description: "全面优化班级教学质量",
        targetGroup: "all",
        actions: [
          "放慢教学节奏，巩固基础知识",
          "增加课堂互动和反馈环节",
          "调整作业设计，减少低效练习",
          "加强课后答疑和辅导",
          "每周进行教学效果评估",
        ],
        expectedOutcome: "2个月内止跌，3-4个月恢复正常水平",
        timeFrame: "中期（3-4个月）",
      },
    ],
  },
  {
    id: "student_stagnant_progress",
    name: "学生进步停滞诊断",
    description: "识别成绩长期停滞不前的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      if (
        !student.historicalScores ||
        !Array.isArray(student.historicalScores) ||
        student.historicalScores.length < 4
      )
        return false;
      const trend = calculateTrend(student.historicalScores);
      return trend.type === "停滞" && trend.stability > 0.8;
    },
    severity: "warning",
    suggestions: [
      "评估当前学习方法是否遇到瓶颈",
      "分析是否进入了学习舒适区",
      "检查是否缺乏学习挑战和动力",
      "寻找突破点，尝试新的学习策略",
      "设置更高的学习目标",
    ],
    strategies: [
      {
        name: "突破计划",
        description: "帮助学生突破学习瓶颈",
        targetGroup: "intermediate",
        actions: [
          "引入更有挑战性的学习内容",
          "尝试新的学习方法和技巧",
          "参加学科竞赛或拓展活动",
          "建立学习目标进阶体系",
          "寻找学习兴趣激发点",
        ],
        expectedOutcome: "2-3个月内打破停滞，开始上升",
        timeFrame: "中期（2-3个月）",
      },
    ],
  },
  {
    id: "teacher_performance_volatility",
    name: "教师教学成绩波动诊断",
    description: "识别教师所教班级成绩波动较大的情况",
    level: DiagnosticLevel.TEACHER,
    condition: (teacherData) => {
      if (
        !teacherData.historicalClassAvgScores ||
        !Array.isArray(teacherData.historicalClassAvgScores) ||
        teacherData.historicalClassAvgScores.length < 3
      )
        return false;
      const trend = calculateTrend(teacherData.historicalClassAvgScores);
      return trend.volatility > 0.15;
    },
    severity: "warning",
    suggestions: [
      "分析教学方法的稳定性和一致性",
      "检查备课质量是否稳定",
      "评估不同班级的教学投入是否均衡",
      "寻找教学质量波动的外部因素",
      "建立更稳定的教学流程和标准",
    ],
    strategies: [
      {
        name: "教学标准化",
        description: "提高教学质量的稳定性",
        targetGroup: "all",
        actions: [
          "建立标准化的教学流程",
          "定期进行教学反思和总结",
          "与优秀教师交流稳定教学的经验",
          "建立教学质量自查机制",
          "保持教学投入的均衡分配",
        ],
        expectedOutcome: "教学质量波动降低50%以上",
        timeFrame: "长期（6个月以上）",
      },
    ],
  },
];

/**
 * 教师层面诊断规则
 */
export const teacherDiagnosticRules: DiagnosticRule[] = [
  {
    id: "teacher_negative_value_added",
    name: "教师负增值诊断",
    description: "识别所教班级整体增值率为负的教师",
    level: DiagnosticLevel.TEACHER,
    condition: (teacherData) =>
      teacherData.avg_score_value_added_rate !== undefined &&
      teacherData.avg_score_value_added_rate < -0.03,
    severity: "critical",
    suggestions: [
      "参加教学方法培训",
      "观摩优秀教师课堂",
      "接受教学督导和指导",
      "反思教学设计和实施",
      "寻求同事和专家帮助",
      "调整教学节奏和难度",
    ],
    strategies: [
      {
        name: "教学能力提升",
        description: "系统化的教师专业发展",
        targetGroup: "all",
        actions: [
          "参加教研活动",
          "进行教学反思",
          "学习新教学方法",
          "接受教学指导",
          "定期教学质量评估",
        ],
        expectedOutcome: "教学增值率提升至正值",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
  {
    id: "teacher_inconsistent_results",
    name: "教师成绩波动大诊断",
    description: "识别不同班级成绩差异大的教师",
    level: DiagnosticLevel.TEACHER,
    condition: (teacherData) => {
      if (!teacherData.classesTaught || teacherData.classesTaught.length < 2)
        return false;
      const rates = teacherData.classesTaught.map(
        (c: any) => c.avg_score_value_added_rate || 0
      );
      const avg =
        rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
      const variance =
        rates.reduce(
          (sum: number, r: number) => sum + Math.pow(r - avg, 2),
          0
        ) / rates.length;
      const std = Math.sqrt(variance);
      return std > 0.1; // 增值率标准差大于10%
    },
    severity: "warning",
    suggestions: [
      "分析不同班级的教学差异",
      "评估因材施教的效果",
      "检查备课是否充分",
      "标准化教学流程",
      "加强薄弱班级的教学投入",
    ],
    strategies: [
      {
        name: "标准化教学",
        description: "确保各班级教学质量一致",
        targetGroup: "all",
        actions: [
          "统一教学计划",
          "共享教学资源",
          "定期班级对比分析",
          "针对性调整教学策略",
        ],
        expectedOutcome: "各班级增值率差异缩小至5%以内",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
];

/**
 * 预测性分析规则
 */
export const predictiveAnalysisRules: DiagnosticRule[] = [
  {
    id: "student_high_risk_prediction",
    name: "学生高风险预测",
    description: "基于历史数据预测学生未来可能出现严重下滑",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      if (
        !student.historicalScores ||
        !Array.isArray(student.historicalScores) ||
        student.historicalScores.length < 3
      )
        return false;

      const trend = calculateTrend(student.historicalScores);
      const predictedNext = predictNextValue(student.historicalScores);
      const currentAvg =
        student.historicalScores.reduce((a, b) => a + b, 0) /
        student.historicalScores.length;

      // 预测下次成绩会比平均分低15%以上
      return (
        trend.type === "下降" &&
        trend.strength > 0.4 &&
        predictedNext < currentAvg * 0.85
      );
    },
    severity: "critical",
    suggestions: [
      "立即采取预防性干预措施",
      "深入调查学习困难的具体原因",
      "建立密切跟踪机制，每周评估进展",
      "协调家校合作，共同关注学生状态",
      "必要时寻求专业心理辅导支持",
    ],
    strategies: [
      {
        name: "预防性干预",
        description: "在问题严重化前采取行动",
        targetGroup: "struggling",
        actions: [
          "建立每日学习状态监测",
          "提供额外的学习资源和辅导",
          "设置预警阈值和触发机制",
          "定期与学生及家长沟通",
          "准备应急支持方案",
        ],
        expectedOutcome: "避免严重下滑，稳定并改善成绩",
        timeFrame: "紧急（1个月）",
      },
    ],
  },
  {
    id: "class_performance_forecast",
    name: "班级成绩预测分析",
    description: "预测班级下次考试的可能表现",
    level: DiagnosticLevel.CLASS,
    condition: (classData) => {
      if (
        !classData.historicalAvgScores ||
        !Array.isArray(classData.historicalAvgScores) ||
        classData.historicalAvgScores.length < 3
      )
        return false;

      const predictedNext = predictNextValue(classData.historicalAvgScores);
      const currentAvg =
        classData.historicalAvgScores[classData.historicalAvgScores.length - 1];

      // 预测下次平均分可能下降超过5分
      return predictedNext < currentAvg - 5;
    },
    severity: "warning",
    suggestions: [
      "提前分析可能导致下降的因素",
      "调整教学策略，加强薄弱环节",
      "增加课堂互动和学生参与度",
      "安排针对性的复习和练习",
      "关注学生的学习状态和动机",
    ],
    strategies: [
      {
        name: "预防性教学调整",
        description: "提前优化教学以改善预期表现",
        targetGroup: "all",
        actions: [
          "分析历史数据找出薄弱知识点",
          "增加重点内容的教学时间",
          "组织专项练习和模拟测试",
          "加强课后答疑和辅导",
          "监测教学效果并及时调整",
        ],
        expectedOutcome: "扭转下降预期，保持或提升成绩",
        timeFrame: "短期（1-2个月）",
      },
    ],
  },
  {
    id: "student_breakthrough_potential",
    name: "学生突破潜力预测",
    description: "识别有潜力在短期内实现成绩突破的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      if (
        !student.historicalScores ||
        !Array.isArray(student.historicalScores) ||
        student.historicalScores.length < 3
      )
        return false;

      const trend = calculateTrend(student.historicalScores);
      const predictedNext = predictNextValue(student.historicalScores);
      const currentLast =
        student.historicalScores[student.historicalScores.length - 1];

      // 稳定上升趋势，且预测下次提升超过5分
      return (
        trend.type === "上升" &&
        trend.strength > 0.5 &&
        trend.stability > 0.7 &&
        predictedNext > currentLast + 5
      );
    },
    severity: "info",
    suggestions: [
      "提供更有挑战性的学习内容",
      "鼓励学生设定更高的目标",
      "给予充分的认可和激励",
      "推荐参加学科竞赛或拓展活动",
      "培养自主学习和探索能力",
    ],
    strategies: [
      {
        name: "潜力开发计划",
        description: "帮助学生实现预期突破",
        targetGroup: "advanced",
        actions: [
          "提供进阶学习资源",
          "安排导师制个性化指导",
          "创造展示和交流的机会",
          "培养学科兴趣和热情",
          "建立长期发展规划",
        ],
        expectedOutcome: "实现预期突破，进入优秀行列",
        timeFrame: "短期（1-2个月）",
      },
    ],
  },
];

/**
 * 学科层面诊断规则
 */
export const subjectDiagnosticRules: DiagnosticRule[] = [
  {
    id: "subject_widespread_decline",
    name: "学科普遍下滑诊断",
    description: "识别大面积负增值的学科",
    level: DiagnosticLevel.SCHOOL,
    condition: (subjectData) => {
      if (!subjectData.classes || subjectData.classes.length < 3) return false;
      const negativeCount = subjectData.classes.filter(
        (c: any) => (c.avg_score_value_added_rate || 0) < 0
      ).length;
      return negativeCount / subjectData.classes.length > 0.5; // 超过50%班级负增值
    },
    severity: "critical",
    suggestions: [
      "组织学科教研组会议",
      "分析学科教学中的共性问题",
      "检查教学大纲和进度安排",
      "评估考试难度是否合理",
      "加强学科教师培训",
      "引入外部专家指导",
    ],
    strategies: [
      {
        name: "学科教学改革",
        description: "整体提升学科教学质量",
        targetGroup: "all",
        actions: [
          "开展学科教学研讨",
          "共享优秀教学案例",
          "统一教学标准",
          "定期教学质量监测",
        ],
        expectedOutcome: "学科整体增值率提升",
        timeFrame: "长期（6-12个月）",
      },
    ],
  },
];

/**
 * 多维度交叉分析规则
 */
export const crossDimensionalRules: DiagnosticRule[] = [
  {
    id: "student_subject_polarization",
    name: "学生学科极端偏科诊断",
    description: "识别各学科成绩差异极大的学生",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      const subjectScores = [
        student.chinese_score,
        student.math_score,
        student.english_score,
        student.physics_score,
        student.chemistry_score,
        student.biology_score,
        student.politics_score,
        student.history_score,
        student.geography_score,
      ].filter((s) => s != null && s > 0);

      if (subjectScores.length < 3) return false;

      const avg =
        subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;
      const maxScore = Math.max(...subjectScores);
      const minScore = Math.min(...subjectScores);

      // 最高分和最低分差距超过30分，或者标准差/平均分 > 0.3
      const variance =
        subjectScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) /
        subjectScores.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg === 0 ? 0 : stdDev / avg;

      return maxScore - minScore > 30 || cv > 0.3;
    },
    severity: "warning",
    suggestions: [
      "识别优势学科和薄弱学科",
      "分析偏科的根本原因（兴趣、基础、教师等）",
      "制定学科平衡发展计划",
      "适当增加薄弱学科的学习时间",
      "寻找薄弱学科的学习兴趣切入点",
      "避免一味追求优势学科而忽视薄弱学科",
    ],
    strategies: [
      {
        name: "学科均衡发展",
        description: "缩小学科间差距，实现全面发展",
        targetGroup: "all",
        actions: [
          "每周为薄弱学科安排专项学习时间",
          "寻找该学科的优秀学生进行互助",
          "调整学习方法，找到适合的学习策略",
          "设置阶梯式小目标，逐步提升",
          "保持优势学科稳定，不能顾此失彼",
        ],
        expectedOutcome: "学科差距缩小至20分以内",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
  {
    id: "class_comprehensive_coordination",
    name: "班级综合协调性分析",
    description: "评估班级各学科发展的协调性",
    level: DiagnosticLevel.CLASS,
    condition: (classData) => {
      if (!classData.subjectAverages || classData.subjectAverages.length < 3)
        return false;

      const scores = classData.subjectAverages.map((s: any) => s.average);
      const avg =
        scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const variance =
        scores.reduce(
          (sum: number, s: number) => sum + Math.pow(s - avg, 2),
          0
        ) / scores.length;
      const stdDev = Math.sqrt(variance);

      // 各学科平均分标准差大于12分
      return stdDev > 12;
    },
    severity: "warning",
    suggestions: [
      "识别明显落后的学科",
      "分析学科间教学质量差异",
      "协调各学科教学进度和难度",
      "加强薄弱学科的师资配置",
      "建立学科间教学协调机制",
    ],
    strategies: [
      {
        name: "学科均衡提升",
        description: "整体提升班级各学科水平",
        targetGroup: "all",
        actions: [
          "召开学科教师协调会",
          "重点支持薄弱学科教学",
          "共享优秀学科的教学经验",
          "统筹安排各学科作业量",
          "定期监测各学科进展",
        ],
        expectedOutcome: "各学科发展更加均衡",
        timeFrame: "长期（6-12个月）",
      },
    ],
  },
  {
    id: "student_trend_subject_correlation",
    name: "学生趋势与学科关联分析",
    description: "分析学生成绩趋势与特定学科的关联",
    level: DiagnosticLevel.STUDENT,
    condition: (student) => {
      if (
        !student.historicalScores ||
        !Array.isArray(student.historicalScores) ||
        student.historicalScores.length < 3
      )
        return false;

      const trend = calculateTrend(student.historicalScores);

      // 如果趋势不佳，检查是否有明显拖后腿的学科
      if (trend.type === "下降" || trend.type === "停滞") {
        const subjectScores = [
          student.chinese_score,
          student.math_score,
          student.english_score,
          student.physics_score,
          student.chemistry_score,
        ].filter((s) => s != null && s > 0);

        if (subjectScores.length < 2) return false;

        const avg =
          subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;
        const minScore = Math.min(...subjectScores);

        // 存在某科目比平均分低20%以上
        return minScore < avg * 0.8;
      }

      return false;
    },
    severity: "warning",
    suggestions: [
      "识别对总成绩影响最大的薄弱学科",
      "优先解决拖后腿学科的问题",
      "分析该学科成绩不佳的具体原因",
      "制定针对性的提升计划",
      "监测该学科改善对整体成绩的影响",
    ],
    strategies: [
      {
        name: "突破瓶颈学科",
        description: "重点提升影响最大的薄弱学科",
        targetGroup: "struggling",
        actions: [
          "诊断该学科的具体知识漏洞",
          "安排该学科的专项辅导",
          "增加该学科的练习时间",
          "寻求该学科教师的帮助",
          "每周评估该学科的进展",
        ],
        expectedOutcome: "该学科提升10分以上，带动整体上升",
        timeFrame: "中期（2-3个月）",
      },
    ],
  },
  {
    id: "teacher_multi_class_disparity",
    name: "教师多班级差异分析",
    description: "分析教师所教不同班级的成绩差异及原因",
    level: DiagnosticLevel.TEACHER,
    condition: (teacherData) => {
      if (!teacherData.classesTaught || teacherData.classesTaught.length < 2)
        return false;

      const classAvgScores = teacherData.classesTaught.map(
        (c: any) => c.avg_score || 0
      );
      const maxAvg = Math.max(...classAvgScores);
      const minAvg = Math.min(...classAvgScores);

      // 不同班级平均分差距超过15分
      return maxAvg - minAvg > 15;
    },
    severity: "warning",
    suggestions: [
      "分析不同班级学生基础的差异",
      "评估各班级的教学投入是否均衡",
      "检查教学方法对不同班级的适配性",
      "关注薄弱班级的特殊问题",
      "向成绩较好的班级学习经验",
    ],
    strategies: [
      {
        name: "因材施教优化",
        description: "根据班级特点调整教学策略",
        targetGroup: "all",
        actions: [
          "分析各班级的学情特点",
          "为不同班级设计差异化教学方案",
          "增加对薄弱班级的关注和投入",
          "定期对比各班级的进展",
          "与班主任协作改善班级学风",
        ],
        expectedOutcome: "各班级差距缩小到10分以内",
        timeFrame: "中期（3-6个月）",
      },
    ],
  },
];

/**
 * 诊断引擎：根据数据应用规则生成诊断结果
 */
export class DiagnosticEngine {
  private rules: Map<DiagnosticLevel, DiagnosticRule[]> = new Map();

  constructor() {
    // 学生层面规则（包含原有+趋势+预测+交叉）
    const studentRules = [
      ...studentDiagnosticRules,
      ...trendTrackingRules.filter((r) => r.level === DiagnosticLevel.STUDENT),
      ...predictiveAnalysisRules.filter(
        (r) => r.level === DiagnosticLevel.STUDENT
      ),
      ...crossDimensionalRules.filter(
        (r) => r.level === DiagnosticLevel.STUDENT
      ),
    ];

    // 班级层面规则
    const classRules = [
      ...classDiagnosticRules,
      ...trendTrackingRules.filter((r) => r.level === DiagnosticLevel.CLASS),
      ...predictiveAnalysisRules.filter(
        (r) => r.level === DiagnosticLevel.CLASS
      ),
      ...crossDimensionalRules.filter((r) => r.level === DiagnosticLevel.CLASS),
    ];

    // 教师层面规则
    const teacherRules = [
      ...teacherDiagnosticRules,
      ...trendTrackingRules.filter((r) => r.level === DiagnosticLevel.TEACHER),
      ...predictiveAnalysisRules.filter(
        (r) => r.level === DiagnosticLevel.TEACHER
      ),
      ...crossDimensionalRules.filter(
        (r) => r.level === DiagnosticLevel.TEACHER
      ),
    ];

    // 学科/学校层面规则
    const schoolRules = [
      ...subjectDiagnosticRules,
      ...trendTrackingRules.filter((r) => r.level === DiagnosticLevel.SCHOOL),
      ...predictiveAnalysisRules.filter(
        (r) => r.level === DiagnosticLevel.SCHOOL
      ),
      ...crossDimensionalRules.filter(
        (r) => r.level === DiagnosticLevel.SCHOOL
      ),
    ];

    this.rules.set(DiagnosticLevel.STUDENT, studentRules);
    this.rules.set(DiagnosticLevel.CLASS, classRules);
    this.rules.set(DiagnosticLevel.TEACHER, teacherRules);
    this.rules.set(DiagnosticLevel.SCHOOL, schoolRules);
  }

  /**
   * 对单个实体进行诊断
   */
  diagnose(data: any, level: DiagnosticLevel): DiagnosticResult[] {
    const rules = this.rules.get(level) || [];
    const results: DiagnosticResult[] = [];

    for (const rule of rules) {
      if (rule.condition(data)) {
        results.push({
          weaknessType: this.inferWeaknessType(rule.id),
          severity: rule.severity,
          description: rule.description,
          causes: this.inferCauses(data, rule),
          suggestions: rule.suggestions,
          strategies: rule.strategies,
          metrics: this.calculateMetrics(data, rule),
        });
      }
    }

    return results;
  }

  /**
   * 批量诊断
   */
  batchDiagnose(
    dataList: any[],
    level: DiagnosticLevel
  ): Map<string, DiagnosticResult[]> {
    const results = new Map<string, DiagnosticResult[]>();

    for (const data of dataList) {
      const id = this.getEntityId(data, level);
      const diagnosis = this.diagnose(data, level);
      if (diagnosis.length > 0) {
        results.set(id, diagnosis);
      }
    }

    return results;
  }

  private inferWeaknessType(ruleId: string): WeaknessType {
    if (ruleId.includes("negative_value_added"))
      return WeaknessType.NEGATIVE_VALUE_ADDED;
    if (ruleId.includes("consolidation")) return WeaknessType.LOW_CONSOLIDATION;
    if (ruleId.includes("transformation"))
      return WeaknessType.LOW_TRANSFORMATION;
    if (ruleId.includes("imbalance") || ruleId.includes("polarization"))
      return WeaknessType.UNBALANCED_SUBJECTS;
    if (ruleId.includes("continuous_decline"))
      return WeaknessType.CONTINUOUS_DECLINE;
    if (ruleId.includes("unstable") || ruleId.includes("volatility"))
      return WeaknessType.UNSTABLE_PERFORMANCE;
    if (ruleId.includes("stagnant")) return WeaknessType.STAGNANT_PROGRESS;
    if (ruleId.includes("high_risk")) return WeaknessType.HIGH_RISK_PREDICTION;
    if (
      ruleId.includes("coordination") ||
      ruleId.includes("correlation") ||
      ruleId.includes("disparity")
    )
      return WeaknessType.SUBJECT_COORDINATION;
    return WeaknessType.DECLINING_TREND;
  }

  private inferCauses(data: any, rule: DiagnosticRule): string[] {
    const causes: string[] = [];

    // 根据数据特征推断可能的原因
    if (data.avg_score_value_added_rate < -0.1) {
      causes.push("增值率严重为负，可能存在教学方法或学习态度问题");
    }

    if (
      data.consolidation_rate !== undefined &&
      data.consolidation_rate < 0.5
    ) {
      causes.push("优等生保持率低，可能缺乏挑战性或学习动力不足");
    }

    if (
      data.transformation_rate !== undefined &&
      data.transformation_rate < 0.2
    ) {
      causes.push("后进生转化率低，可能基础薄弱或缺乏有效帮扶");
    }

    if (data.attendance !== undefined && data.attendance < 0.9) {
      causes.push("出勤率低，影响学习连续性");
    }

    // 如果没有找到特定原因，使用通用描述
    if (causes.length === 0) {
      causes.push("需要进一步调查分析具体原因");
    }

    return causes;
  }

  private calculateMetrics(
    data: any,
    rule: DiagnosticRule
  ): { currentValue: number; targetValue: number; gap: number } | undefined {
    if (rule.id.includes("value_added")) {
      const current = (data.avg_score_value_added_rate || 0) * 100;
      const target = 5; // 目标增值率5%
      return {
        currentValue: current,
        targetValue: target,
        gap: target - current,
      };
    }

    if (rule.id.includes("consolidation")) {
      const current = (data.consolidation_rate || 0) * 100;
      const target = 75; // 目标巩固率75%
      return {
        currentValue: current,
        targetValue: target,
        gap: target - current,
      };
    }

    if (rule.id.includes("transformation")) {
      const current = (data.transformation_rate || 0) * 100;
      const target = 35; // 目标转化率35%
      return {
        currentValue: current,
        targetValue: target,
        gap: target - current,
      };
    }

    return undefined;
  }

  private getEntityId(data: any, level: DiagnosticLevel): string {
    switch (level) {
      case DiagnosticLevel.STUDENT:
        return data.student_id || data.student_name || "unknown";
      case DiagnosticLevel.CLASS:
        return data.class_name || data.class_id || "unknown";
      case DiagnosticLevel.TEACHER:
        return data.teacher_name || data.teacher_id || "unknown";
      case DiagnosticLevel.SCHOOL:
        return data.subject_code || data.subject_name || "unknown";
      default:
        return "unknown";
    }
  }

  /**
   * 根据严重程度排序诊断结果
   */
  prioritize(results: DiagnosticResult[]): DiagnosticResult[] {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return results.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
  }

  /**
   * 生成综合报告
   */
  generateSummary(results: DiagnosticResult[]): string {
    if (results.length === 0) {
      return "诊断结果良好，未发现明显问题。";
    }

    const critical = results.filter((r) => r.severity === "critical").length;
    const warning = results.filter((r) => r.severity === "warning").length;

    let summary = `共发现${results.length}个问题`;
    if (critical > 0) {
      summary += `，其中${critical}个严重问题`;
    }
    if (warning > 0) {
      summary += `，${warning}个需要关注的问题`;
    }
    summary += "。建议优先处理严重问题。";

    return summary;
  }
}

/**
 * 创建默认诊断引擎实例
 */
export const diagnosticEngine = new DiagnosticEngine();
