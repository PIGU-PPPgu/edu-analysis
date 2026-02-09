/**
 * AI诊断规则库
 * 基于教育评价理论和最佳实践，提供精准的诊断建议
 */

export enum WeaknessType {
  LOW_ENTRY = "low_entry", // 入口薄弱
  LOW_EXIT = "low_exit", // 出口薄弱
  NEGATIVE_VALUE_ADDED = "negative_value_added", // 负增值
  LOW_CONSOLIDATION = "low_consolidation", // 巩固率低
  LOW_TRANSFORMATION = "low_transformation", // 转化率低
  UNBALANCED_SUBJECTS = "unbalanced_subjects", // 学科不平衡
  DECLINING_TREND = "declining_trend", // 下降趋势
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
 * 诊断引擎：根据数据应用规则生成诊断结果
 */
export class DiagnosticEngine {
  private rules: Map<DiagnosticLevel, DiagnosticRule[]> = new Map();

  constructor() {
    this.rules.set(DiagnosticLevel.STUDENT, studentDiagnosticRules);
    this.rules.set(DiagnosticLevel.CLASS, classDiagnosticRules);
    this.rules.set(DiagnosticLevel.TEACHER, teacherDiagnosticRules);
    this.rules.set(DiagnosticLevel.SCHOOL, subjectDiagnosticRules);
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
    if (ruleId.includes("imbalance")) return WeaknessType.UNBALANCED_SUBJECTS;
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
