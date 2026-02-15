/**
 * AI智能诊断引擎
 * 职责：基于增值评价统计数据，生成教学诊断建议
 * 设计原则：纯函数，不涉及数据库操作
 */

// ============================================
// 类型定义
// ============================================

/** 诊断建议类型 */
export type DiagnosticType = "success" | "warning" | "info" | "error";

/** 诊断建议优先级 */
export type DiagnosticPriority = "high" | "medium" | "low";

/** 诊断建议分类 */
export type DiagnosticCategory =
  | "teaching_strategy" // 教学策略
  | "student_support" // 学生辅导
  | "resource_allocation" // 资源配置
  | "class_management" // 班级管理
  | "subject_balance"; // 学科均衡

/** 诊断建议 */
export interface Diagnostic {
  type: DiagnosticType;
  priority: DiagnosticPriority;
  category: DiagnosticCategory;
  title: string;
  description: string;
  suggestions: string[]; // 具体可操作的建议
  affectedTarget?: {
    // 受影响的对象
    type: "class" | "subject" | "student" | "teacher";
    ids: string[];
    names: string[];
  };
}

/** 分析统计数据（输入） */
export interface AnalysisStats {
  // 基础统计
  totalStudents: number;
  avgScoreChange: number;
  progressRate: number; // 进步人数占比
  consolidationRate: number; // 优秀生巩固率
  transformationRate: number; // 能力转化率（等级提升）

  // 科目维度
  subjectStats: {
    subject: string;
    studentCount: number;
    avgScoreChange: number;
    progressRate: number;
    highAchieverRate: number; // A+/A占比
    lowAchieverRate: number; // C+/C占比
  }[];

  // 班级维度
  classStats: {
    className: string;
    studentCount: number;
    avgScoreChange: number;
    progressRate: number;
    subjectBalance: number; // 学科均衡度（标准差倒数）
  }[];

  // 异常检测
  anomalies?: {
    type: "low_progress" | "regression" | "imbalance" | "polarization";
    severity: "high" | "medium" | "low";
    description: string;
    affectedTargets: string[];
  }[];
}

/** AI分析摘要（输出，用于缓存） */
export interface AIAnalysisSummary {
  activityId: string;
  generatedAt: string;

  // 整体统计
  overallStats: {
    totalStudents: number;
    avgScoreChange: number;
    progressRate: number;
    consolidationRate: number;
    transformationRate: number;
  };

  // 科目级统计
  subjectSummaries: {
    subject: string;
    studentCount: number;
    avgScoreChange: number;
    progressRate: number;
    topClasses: string[]; // 进步最快的班级
    diagnostics: Diagnostic[];
  }[];

  // 班级级统计
  classSummaries: {
    className: string;
    studentCount: number;
    avgScoreChange: number;
    progressRate: number;
    subjectBalance: number;
    topSubjects: string[]; // 表现最好的科目
    diagnostics: Diagnostic[];
  }[];

  // 整体诊断建议
  overallDiagnostics: Diagnostic[];

  // 性能指标
  performanceMetrics: {
    calculationTime: number; // 计算耗时（毫秒）
    dataPoints: number; // 数据点数量
    cacheSize: number; // 缓存大小（字节）
  };
}

// ============================================
// 核心诊断函数
// ============================================

/**
 * 生成整体诊断建议
 */
export function generateOverallDiagnostics(stats: AnalysisStats): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (stats.totalStudents === 0) {
    return diagnostics;
  }

  // 1. 进步率诊断
  if (stats.progressRate >= 70) {
    diagnostics.push({
      type: "success",
      priority: "low",
      category: "teaching_strategy",
      title: "整体进步显著",
      description: `${stats.progressRate.toFixed(1)}%的学生实现了成绩进步，教学效果优秀。`,
      suggestions: [
        "继续保持当前教学方法和节奏",
        "总结成功经验，形成可复制的教学案例",
        "关注未进步学生的个性化辅导",
      ],
    });
  } else if (stats.progressRate < 50) {
    diagnostics.push({
      type: "warning",
      priority: "high",
      category: "teaching_strategy",
      title: "进步率偏低",
      description: `仅${stats.progressRate.toFixed(1)}%的学生实现进步，建议关注教学方法和学生差异化辅导。`,
      suggestions: [
        "分析未进步学生的共性问题（基础薄弱/学习方法/心理状态）",
        "调整教学难度和进度，增加互动和反馈频率",
        "开展分层教学，针对不同水平学生设计差异化任务",
        "加强课后辅导和答疑，建立学习小组互助机制",
      ],
    });
  }

  // 2. 转化率诊断
  if (stats.transformationRate >= 15) {
    diagnostics.push({
      type: "success",
      priority: "low",
      category: "student_support",
      title: "能力转化效果好",
      description: `${stats.transformationRate.toFixed(1)}%的学生实现了能力等级的跃升，培优工作成效明显。`,
      suggestions: [
        "总结培优经验，扩大培优范围",
        "建立优秀学生帮扶机制，发挥榜样作用",
        "设置挑战性任务，持续激发优秀学生潜力",
      ],
    });
  } else if (stats.transformationRate < 5) {
    diagnostics.push({
      type: "info",
      priority: "medium",
      category: "student_support",
      title: "转化率偏低",
      description: `仅${stats.transformationRate.toFixed(1)}%的学生实现能力突破，建议加强中等生的培优辅导。`,
      suggestions: [
        "识别潜力学生（B+/B等级且有进步趋势）",
        "设计阶梯式培优计划，帮助中等生突破瓶颈",
        "增加拓展性任务和思维训练，提升综合能力",
        "建立成长档案，跟踪培优效果并及时调整策略",
      ],
    });
  }

  // 3. 巩固率诊断（针对优秀学生）
  if (stats.consolidationRate >= 80) {
    diagnostics.push({
      type: "success",
      priority: "low",
      category: "class_management",
      title: "优秀学生保持稳定",
      description: `${stats.consolidationRate.toFixed(1)}%的优秀学生保持了原有水平，基础扎实。`,
      suggestions: [
        "继续保持对优秀学生的关注和激励",
        "提供更具挑战性的学习资源和竞赛机会",
      ],
    });
  } else if (stats.consolidationRate < 60) {
    diagnostics.push({
      type: "warning",
      priority: "high",
      category: "class_management",
      title: "优秀生巩固不足",
      description: "优秀学生中有较多未能保持原有等级，建议关注尖子生培养策略。",
      suggestions: [
        "分析优秀生退步原因（学习态度/竞争压力/知识盲区）",
        "加强基础知识的巩固和复习，防止知识遗漏",
        "提供心理辅导，帮助学生调整学习状态和应考心态",
        "设置阶段性目标，保持学习动力和竞争意识",
      ],
    });
  }

  // 4. 平均增值诊断
  if (stats.avgScoreChange > 10) {
    diagnostics.push({
      type: "success",
      priority: "low",
      category: "teaching_strategy",
      title: "平均增值突出",
      description: `学生平均增值${stats.avgScoreChange.toFixed(1)}分，整体教学质量高。`,
      suggestions: [
        "总结教学经验，形成典型案例在年级推广",
        "保持教学强度，适度增加拓展性内容",
      ],
    });
  } else if (stats.avgScoreChange < 0) {
    diagnostics.push({
      type: "error",
      priority: "high",
      category: "teaching_strategy",
      title: "平均成绩下滑",
      description: "整体平均分出现下降，需要重点分析原因并调整教学策略。",
      suggestions: [
        "紧急召开年级教学分析会，诊断教学问题",
        "检查试题难度是否异常变化，排除非教学因素",
        "分析学生普遍薄弱的知识点，安排专项复习",
        "加强集体备课，统一教学进度和质量标准",
        "增加阶段性测验频率，及时发现和纠正教学问题",
      ],
    });
  }

  // 5. 异常检测诊断
  if (stats.anomalies && stats.anomalies.length > 0) {
    stats.anomalies.forEach((anomaly) => {
      const priorityMap = {
        high: "high" as DiagnosticPriority,
        medium: "medium" as DiagnosticPriority,
        low: "low" as DiagnosticPriority,
      };

      diagnostics.push({
        type: anomaly.severity === "high" ? "warning" : "info",
        priority: priorityMap[anomaly.severity],
        category: "class_management",
        title: getAnomalyTitle(anomaly.type),
        description: anomaly.description,
        suggestions: getAnomalySuggestions(anomaly.type),
        affectedTarget: {
          type: "class",
          ids: anomaly.affectedTargets,
          names: anomaly.affectedTargets,
        },
      });
    });
  }

  return diagnostics;
}

/**
 * 生成科目维度诊断建议
 */
export function generateSubjectDiagnostics(
  subjectStats: AnalysisStats["subjectStats"][0]
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // 科目进步率分析
  if (subjectStats.progressRate < 50) {
    diagnostics.push({
      type: "warning",
      priority: "high",
      category: "teaching_strategy",
      title: `${subjectStats.subject}进步率低`,
      description: `该科目仅${subjectStats.progressRate.toFixed(1)}%的学生进步，需重点关注。`,
      suggestions: [
        `分析${subjectStats.subject}教学中的薄弱环节`,
        "调整教学方法，增加互动和实践环节",
        "加强基础知识巩固，降低学习难度梯度",
      ],
    });
  }

  // 优秀生占比分析
  if (subjectStats.highAchieverRate < 20) {
    diagnostics.push({
      type: "info",
      priority: "medium",
      category: "student_support",
      title: `${subjectStats.subject}优秀生比例偏低`,
      description: `该科目优秀生（A+/A）占比仅${subjectStats.highAchieverRate.toFixed(1)}%，建议加强培优。`,
      suggestions: [
        "识别潜力学生，开展针对性培优辅导",
        "提供拓展性学习资源和挑战性任务",
        "组织学科竞赛或兴趣小组，激发学习兴趣",
      ],
    });
  }

  // 后进生占比分析
  if (subjectStats.lowAchieverRate > 30) {
    diagnostics.push({
      type: "warning",
      priority: "high",
      category: "student_support",
      title: `${subjectStats.subject}后进生比例偏高`,
      description: `该科目后进生（C+/C）占比达${subjectStats.lowAchieverRate.toFixed(1)}%，需加强补差。`,
      suggestions: [
        "开展分层教学，对后进生降低难度要求",
        "增加课后辅导时间，强化基础知识训练",
        "建立学习小组，发挥同伴互助作用",
        "关注学生心理状态，避免自信心受挫",
      ],
    });
  }

  return diagnostics;
}

/**
 * 生成班级维度诊断建议
 */
export function generateClassDiagnostics(
  classStats: AnalysisStats["classStats"][0]
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // 班级整体进步率
  if (classStats.progressRate < 50) {
    diagnostics.push({
      type: "warning",
      priority: "high",
      category: "class_management",
      title: `${classStats.className}进步率低`,
      description: `该班级仅${classStats.progressRate.toFixed(1)}%的学生进步，需重点关注班级管理和教学质量。`,
      suggestions: [
        "召开班级教学分析会，诊断问题并制定改进计划",
        "加强班级学习氛围建设，提升学生学习积极性",
        "关注班级纪律和学习习惯，营造良好学习环境",
      ],
    });
  }

  // 学科均衡度分析
  if (classStats.subjectBalance < 0.5) {
    diagnostics.push({
      type: "warning",
      priority: "medium",
      category: "subject_balance",
      title: `${classStats.className}学科发展不均衡`,
      description: `该班级各科目发展差异较大，建议关注弱势学科。`,
      suggestions: [
        "识别班级弱势学科，分析原因（师资/学生基础/教学方法）",
        "增加弱势学科的教学投入和辅导力度",
        "加强各科教师的协作，避免学科间争夺时间",
        "引导学生合理分配各科学习时间，全面发展",
      ],
    });
  } else if (classStats.subjectBalance > 0.8) {
    diagnostics.push({
      type: "success",
      priority: "low",
      category: "subject_balance",
      title: `${classStats.className}学科发展均衡`,
      description: `该班级各科目发展较为均衡，学生全面发展良好。`,
      suggestions: ["保持各科协调发展，避免出现明显短板"],
    });
  }

  return diagnostics;
}

// ============================================
// 辅助函数
// ============================================

function getAnomalyTitle(type: string): string {
  const titles: Record<string, string> = {
    low_progress: "整体进步缓慢异常",
    regression: "成绩明显退步异常",
    imbalance: "学科发展失衡异常",
    polarization: "学生两极分化异常",
  };
  return titles[type] || "未知异常";
}

function getAnomalySuggestions(type: string): string[] {
  const suggestions: Record<string, string[]> = {
    low_progress: [
      "全面分析教学计划和进度是否合理",
      "检查学生学习状态和心理状态",
      "调整教学方法，增加互动和反馈",
    ],
    regression: [
      "紧急排查是否存在外部干扰因素（试题难度/环境变化）",
      "分析退步学生的共性问题",
      "加强基础知识复习和巩固",
    ],
    imbalance: [
      "分析各科目教学资源配置是否合理",
      "加强弱势学科的教学投入",
      "协调各科教师，避免学科间竞争",
    ],
    polarization: [
      "关注中等生群体，防止两极分化加剧",
      "开展分层教学，满足不同水平学生需求",
      "加强学习小组建设，促进学生互助",
    ],
  };
  return suggestions[type] || ["建议进一步分析具体原因"];
}

/**
 * 异常检测：识别数据中的异常模式
 */
export function detectAnomalies(
  stats: AnalysisStats
): AnalysisStats["anomalies"] {
  const anomalies: NonNullable<AnalysisStats["anomalies"]> = [];

  // 1. 检测整体进步缓慢
  if (stats.progressRate < 40 && stats.avgScoreChange < 5) {
    anomalies.push({
      type: "low_progress",
      severity: "high",
      description: `整体进步率仅${stats.progressRate.toFixed(1)}%，平均增值${stats.avgScoreChange.toFixed(1)}分，显著低于预期。`,
      affectedTargets: ["全年级"],
    });
  }

  // 2. 检测成绩明显退步
  if (stats.avgScoreChange < -5) {
    anomalies.push({
      type: "regression",
      severity: "high",
      description: `平均成绩下降${Math.abs(stats.avgScoreChange).toFixed(1)}分，需紧急排查原因。`,
      affectedTargets: ["全年级"],
    });
  }

  // 3. 检测班级间差异过大
  if (stats.classStats.length > 1) {
    const classProgressRates = stats.classStats.map((c) => c.progressRate);
    const maxProgress = Math.max(...classProgressRates);
    const minProgress = Math.min(...classProgressRates);

    if (maxProgress - minProgress > 30) {
      const weakClasses = stats.classStats
        .filter((c) => c.progressRate < 50)
        .map((c) => c.className);

      anomalies.push({
        type: "imbalance",
        severity: "medium",
        description: `班级间进步率差异达${(maxProgress - minProgress).toFixed(1)}%，部分班级明显落后。`,
        affectedTargets: weakClasses,
      });
    }
  }

  // 4. 检测学科发展失衡
  if (stats.subjectStats.length > 1) {
    const subjectProgressRates = stats.subjectStats.map((s) => s.progressRate);
    const maxSubjectProgress = Math.max(...subjectProgressRates);
    const minSubjectProgress = Math.min(...subjectProgressRates);

    if (maxSubjectProgress - minSubjectProgress > 25) {
      const weakSubjects = stats.subjectStats
        .filter((s) => s.progressRate < 50)
        .map((s) => s.subject);

      anomalies.push({
        type: "imbalance",
        severity: "medium",
        description: `学科间进步率差异达${(maxSubjectProgress - minSubjectProgress).toFixed(1)}%，部分学科表现不佳。`,
        affectedTargets: weakSubjects,
      });
    }
  }

  return anomalies;
}
