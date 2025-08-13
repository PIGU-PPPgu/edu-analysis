/**
 * 预警规则构建器 - 指标定义
 * 基于现有数据源(grade_data, homework_submissions等)定义可拖拽的指标
 */

import { MetricDefinition } from "./types";

// 成绩类指标 - 基于 grade_data 表
export const gradeMetrics: MetricDefinition[] = [
  // 总分相关
  {
    id: "total_score",
    name: "total_score",
    displayName: "考试总分",
    type: "numeric",
    category: "grade",
    dataSource: "grade_data",
    field: "total_score",
    range: [0, 523], // 基于total_max_score
    unit: "分",
    description: "学生考试总分",
    icon: "📊",
    color: "#3B82F6",
    calculation: {
      type: "direct",
    },
  },
  {
    id: "total_score_percentage",
    name: "total_score_percentage",
    displayName: "总分百分比",
    type: "percentage",
    category: "grade",
    dataSource: "calculated",
    range: [0, 100],
    unit: "%",
    description: "总分相对于满分的百分比",
    icon: "📈",
    color: "#10B981",
    calculation: {
      type: "direct",
      formula: "(total_score / total_max_score) * 100",
    },
  },
  {
    id: "total_rank_in_class",
    name: "total_rank_in_class",
    displayName: "班级排名",
    type: "rank",
    category: "grade",
    dataSource: "grade_data",
    field: "total_rank_in_class",
    range: [1, 50], // 假设班级最大50人
    unit: "名",
    description: "学生在班级中的总分排名",
    icon: "🏆",
    color: "#F59E0B",
    calculation: {
      type: "direct",
    },
  },
  {
    id: "total_rank_in_grade",
    name: "total_rank_in_grade",
    displayName: "年级排名",
    type: "rank",
    category: "grade",
    dataSource: "grade_data",
    field: "total_rank_in_grade",
    range: [1, 500], // 假设年级最大500人
    unit: "名",
    description: "学生在年级中的总分排名",
    icon: "🎯",
    color: "#8B5CF6",
    calculation: {
      type: "direct",
    },
  },

  // 单科成绩指标
  {
    id: "chinese_score",
    name: "chinese_score",
    displayName: "语文成绩",
    type: "numeric",
    category: "grade",
    dataSource: "grade_data",
    field: "chinese_score",
    range: [0, 150],
    unit: "分",
    description: "语文科目成绩",
    icon: "📚",
    color: "#DC2626",
    calculation: {
      type: "direct",
    },
  },
  {
    id: "math_score",
    name: "math_score",
    displayName: "数学成绩",
    type: "numeric",
    category: "grade",
    dataSource: "grade_data",
    field: "math_score",
    range: [0, 150],
    unit: "分",
    description: "数学科目成绩",
    icon: "🔢",
    color: "#2563EB",
    calculation: {
      type: "direct",
    },
  },
  {
    id: "english_score",
    name: "english_score",
    displayName: "英语成绩",
    type: "numeric",
    category: "grade",
    dataSource: "grade_data",
    field: "english_score",
    range: [0, 150],
    unit: "分",
    description: "英语科目成绩",
    icon: "🌍",
    color: "#059669",
    calculation: {
      type: "direct",
    },
  },
  {
    id: "physics_score",
    name: "physics_score",
    displayName: "物理成绩",
    type: "numeric",
    category: "grade",
    dataSource: "grade_data",
    field: "physics_score",
    range: [0, 100],
    unit: "分",
    description: "物理科目成绩",
    icon: "⚛️",
    color: "#7C2D12",
    calculation: {
      type: "direct",
    },
  },
  {
    id: "chemistry_score",
    name: "chemistry_score",
    displayName: "化学成绩",
    type: "numeric",
    category: "grade",
    dataSource: "grade_data",
    field: "chemistry_score",
    range: [0, 100],
    unit: "分",
    description: "化学科目成绩",
    icon: "🧪",
    color: "#1D4ED8",
    calculation: {
      type: "direct",
    },
  },
];

// 趋势分析指标 - 基于计算
export const trendMetrics: MetricDefinition[] = [
  {
    id: "score_decline",
    name: "score_decline",
    displayName: "成绩下降幅度",
    type: "numeric",
    category: "trend",
    dataSource: "calculated",
    range: [-100, 100],
    unit: "分",
    description: "相比上次考试的成绩变化",
    icon: "📉",
    color: "#DC2626",
    calculation: {
      type: "comparison",
      formula: "current_total_score - previous_total_score",
      window: 2,
    },
  },
  {
    id: "consecutive_fails",
    name: "consecutive_fails",
    displayName: "连续不及格次数",
    type: "numeric",
    category: "trend",
    dataSource: "calculated",
    range: [0, 10],
    unit: "次",
    description: "连续考试不及格的次数",
    icon: "⛔",
    color: "#EF4444",
    calculation: {
      type: "aggregate",
      formula: "count_consecutive_scores_below_threshold",
      window: 10,
    },
  },
  {
    id: "rank_change",
    name: "rank_change",
    displayName: "排名变化",
    type: "numeric",
    category: "trend",
    dataSource: "calculated",
    range: [-100, 100],
    unit: "名",
    description: "相比上次考试的排名变化",
    icon: "📊",
    color: "#F59E0B",
    calculation: {
      type: "comparison",
      formula: "previous_rank - current_rank", // 正数表示进步
      window: 2,
    },
  },
];

// 作业相关指标 - 基于 homework_submissions 表
export const homeworkMetrics: MetricDefinition[] = [
  {
    id: "homework_completion_rate",
    name: "homework_completion_rate",
    displayName: "作业完成率",
    type: "percentage",
    category: "homework",
    dataSource: "homework_submissions",
    range: [0, 100],
    unit: "%",
    description: "最近一段时间的作业完成率",
    icon: "📝",
    color: "#10B981",
    calculation: {
      type: "aggregate",
      formula: "(submitted_count / total_assigned_count) * 100",
      window: 30, // 最近30天
    },
  },
  {
    id: "homework_avg_score",
    name: "homework_avg_score",
    displayName: "作业平均分",
    type: "numeric",
    category: "homework",
    dataSource: "homework_submissions",
    range: [0, 100],
    unit: "分",
    description: "最近作业的平均得分",
    icon: "📋",
    color: "#3B82F6",
    calculation: {
      type: "aggregate",
      formula: "avg(score)",
      window: 10, // 最近10次作业
    },
  },
  {
    id: "late_submission_count",
    name: "late_submission_count",
    displayName: "迟交作业次数",
    type: "numeric",
    category: "homework",
    dataSource: "homework_submissions",
    range: [0, 20],
    unit: "次",
    description: "最近迟交作业的次数",
    icon: "⏰",
    color: "#F59E0B",
    calculation: {
      type: "aggregate",
      formula: "count_late_submissions",
      window: 30,
    },
  },
];

// 行为相关指标 - 基于学生基础信息
export const behaviorMetrics: MetricDefinition[] = [
  {
    id: "class_participation",
    name: "class_participation",
    displayName: "课堂参与度",
    type: "percentage",
    category: "behavior",
    dataSource: "calculated",
    range: [0, 100],
    unit: "%",
    description: "课堂活跃度和参与度评分",
    icon: "🙋",
    color: "#8B5CF6",
    calculation: {
      type: "aggregate",
      formula: "weighted_participation_score",
      window: 14, // 最近两周
    },
  },
  {
    id: "discipline_issues",
    name: "discipline_issues",
    displayName: "纪律问题次数",
    type: "numeric",
    category: "behavior",
    dataSource: "calculated",
    range: [0, 10],
    unit: "次",
    description: "最近发生的纪律问题次数",
    icon: "⚠️",
    color: "#DC2626",
    calculation: {
      type: "aggregate",
      formula: "count_discipline_records",
      window: 30,
    },
  },
];

// 统计类指标 - 班级和年级水平
export const statisticalMetrics: MetricDefinition[] = [
  {
    id: "class_pass_rate",
    name: "class_pass_rate",
    displayName: "班级及格率",
    type: "percentage",
    category: "grade",
    dataSource: "calculated",
    range: [0, 100],
    unit: "%",
    description: "班级整体及格率",
    icon: "👥",
    color: "#059669",
    calculation: {
      type: "aggregate",
      formula: "(pass_count / total_students) * 100",
    },
  },
  {
    id: "percentile_rank",
    name: "percentile_rank",
    displayName: "百分位排名",
    type: "percentage",
    category: "grade",
    dataSource: "calculated",
    range: [0, 100],
    unit: "%",
    description: "学生成绩在年级中的百分位",
    icon: "📊",
    color: "#7C2D12",
    calculation: {
      type: "aggregate",
      formula: "calculate_percentile_rank",
    },
  },
];

// 导出所有指标定义
export const allMetrics: MetricDefinition[] = [
  ...gradeMetrics,
  ...trendMetrics,
  ...homeworkMetrics,
  ...behaviorMetrics,
  ...statisticalMetrics,
];

// 按类别分组的指标
export const metricsByCategory = {
  grade: gradeMetrics,
  trend: trendMetrics,
  homework: homeworkMetrics,
  behavior: behaviorMetrics,
  statistical: statisticalMetrics,
};

// 根据ID获取指标定义
export const getMetricById = (id: string): MetricDefinition | undefined => {
  return allMetrics.find((metric) => metric.id === id);
};

// 根据类别获取指标
export const getMetricsByCategory = (category: string): MetricDefinition[] => {
  return allMetrics.filter((metric) => metric.category === category);
};

// 根据数据源获取指标
export const getMetricsByDataSource = (
  dataSource: string
): MetricDefinition[] => {
  return allMetrics.filter((metric) => metric.dataSource === dataSource);
};
