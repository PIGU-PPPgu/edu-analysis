/**
 * 预警场景定义
 * 基于教师常见需求设计的预设场景
 */

import { RuleScenario } from "./types";

// 成绩类预警场景
export const gradeScenarios: RuleScenario[] = [
  {
    id: "consecutive_fail",
    name: "连续不及格预警",
    description: "学生连续多次考试不及格时自动预警",
    icon: "🔴",
    category: "grade",
    difficulty: "easy",
    parameters: [
      {
        id: "consecutiveCount",
        name: "consecutiveCount",
        label: "连续次数",
        description: "连续多少次考试不及格",
        type: "number",
        required: true,
        defaultValue: 2,
        min: 1,
        max: 5,
        unit: "次",
      },
      {
        id: "failThreshold",
        name: "failThreshold",
        label: "不及格分数线",
        description: "低于此分数视为不及格",
        type: "number",
        required: true,
        defaultValue: 60,
        min: 0,
        max: 100,
        unit: "分",
      },
      {
        id: "subjects",
        name: "subjects",
        label: "监控科目",
        description: "选择要监控的科目",
        type: "multiselect",
        required: true,
        defaultValue: ["total"],
        options: [
          { value: "total", label: "总分", description: "监控考试总分" },
          { value: "chinese", label: "语文" },
          { value: "math", label: "数学" },
          { value: "english", label: "英语" },
          { value: "physics", label: "物理" },
          { value: "chemistry", label: "化学" },
        ],
      },
    ],
    template: {
      severity: "medium",
      scope: "global",
      category: "grade",
      priority: 7,
      conditionTemplate:
        "当学生连续 {consecutiveCount} 次考试 {subjects} 低于 {failThreshold} 分时触发预警",
      sqlTemplate: `
        SELECT DISTINCT s.student_id, s.name, s.class_name
        FROM students s
        JOIN grade_data gd ON s.student_id = gd.student_id
        WHERE gd.{subjectField} < {failThreshold}
        AND EXISTS (
          SELECT 1 FROM grade_data gd2 
          WHERE gd2.student_id = s.student_id 
          AND gd2.{subjectField} < {failThreshold}
          AND gd2.exam_date >= gd.exam_date
          ORDER BY gd2.exam_date DESC 
          LIMIT {consecutiveCount}
          HAVING COUNT(*) = {consecutiveCount}
        )
      `,
    },
  },
  {
    id: "score_decline",
    name: "成绩下降预警",
    description: "学生成绩相比之前明显下降时预警",
    icon: "📉",
    category: "grade",
    difficulty: "easy",
    parameters: [
      {
        id: "declineThreshold",
        name: "declineThreshold",
        label: "下降幅度",
        description: "成绩下降超过多少分触发预警",
        type: "number",
        required: true,
        defaultValue: 20,
        min: 5,
        max: 100,
        unit: "分",
      },
      {
        id: "comparisonPeriod",
        name: "comparisonPeriod",
        label: "对比周期",
        description: "与多久前的成绩对比",
        type: "select",
        required: true,
        defaultValue: "previous_exam",
        options: [
          {
            value: "previous_exam",
            label: "上次考试",
            description: "与上一次考试成绩对比",
          },
          {
            value: "month_ago",
            label: "一个月前",
            description: "与一个月前成绩对比",
          },
          {
            value: "semester_start",
            label: "学期初",
            description: "与学期初成绩对比",
          },
        ],
      },
      {
        id: "subjects",
        name: "subjects",
        label: "监控科目",
        description: "选择要监控的科目",
        type: "multiselect",
        required: true,
        defaultValue: ["total"],
        options: [
          { value: "total", label: "总分" },
          { value: "chinese", label: "语文" },
          { value: "math", label: "数学" },
          { value: "english", label: "英语" },
        ],
      },
    ],
    template: {
      severity: "medium",
      scope: "global",
      category: "progress",
      priority: 8,
      conditionTemplate:
        "当学生 {subjects} 相比 {comparisonPeriod} 下降超过 {declineThreshold} 分时触发预警",
      sqlTemplate: `
        SELECT s.student_id, s.name, s.class_name,
               current.{subjectField} as current_score,
               previous.{subjectField} as previous_score,
               (previous.{subjectField} - current.{subjectField}) as decline
        FROM students s
        JOIN grade_data current ON s.student_id = current.student_id
        JOIN grade_data previous ON s.student_id = previous.student_id
        WHERE (previous.{subjectField} - current.{subjectField}) > {declineThreshold}
        AND {comparisonCondition}
      `,
    },
  },
  {
    id: "low_score_alert",
    name: "低分预警",
    description: "学生单次考试分数过低时预警",
    icon: "⚠️",
    category: "grade",
    difficulty: "easy",
    parameters: [
      {
        id: "scoreThreshold",
        name: "scoreThreshold",
        label: "分数线",
        description: "低于此分数时触发预警",
        type: "number",
        required: true,
        defaultValue: 50,
        min: 0,
        max: 100,
        unit: "分",
      },
      {
        id: "subjects",
        name: "subjects",
        label: "监控科目",
        description: "选择要监控的科目",
        type: "multiselect",
        required: true,
        defaultValue: ["total"],
        options: [
          { value: "total", label: "总分" },
          { value: "chinese", label: "语文" },
          { value: "math", label: "数学" },
          { value: "english", label: "英语" },
          { value: "physics", label: "物理" },
          { value: "chemistry", label: "化学" },
        ],
      },
      {
        id: "severity",
        name: "severity",
        label: "预警级别",
        description: "根据分数的严重程度设置预警级别",
        type: "select",
        required: true,
        defaultValue: "medium",
        options: [
          {
            value: "low",
            label: "低级预警",
            description: "适用于轻微的分数问题",
          },
          {
            value: "medium",
            label: "中级预警",
            description: "适用于需要关注的分数问题",
          },
          {
            value: "high",
            label: "高级预警",
            description: "适用于严重的分数问题",
          },
        ],
      },
    ],
    template: {
      severity: "medium",
      scope: "exam",
      category: "grade",
      priority: 5,
      conditionTemplate:
        "当学生 {subjects} 低于 {scoreThreshold} 分时触发 {severity} 预警",
      sqlTemplate: `
        SELECT s.student_id, s.name, s.class_name, gd.{subjectField} as score
        FROM students s
        JOIN grade_data gd ON s.student_id = gd.student_id
        WHERE gd.{subjectField} < {scoreThreshold}
        AND gd.exam_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
      `,
    },
  },
];

// 作业类预警场景
export const homeworkScenarios: RuleScenario[] = [
  {
    id: "homework_missing",
    name: "作业缺交预警",
    description: "学生连续多次未提交作业时预警",
    icon: "📝",
    category: "homework",
    difficulty: "easy",
    parameters: [
      {
        id: "missingCount",
        name: "missingCount",
        label: "缺交次数",
        description: "连续多少次未提交作业",
        type: "number",
        required: true,
        defaultValue: 3,
        min: 1,
        max: 10,
        unit: "次",
      },
      {
        id: "timeWindow",
        name: "timeWindow",
        label: "时间范围",
        description: "在多长时间内统计",
        type: "select",
        required: true,
        defaultValue: "week",
        options: [
          { value: "week", label: "一周内" },
          { value: "month", label: "一个月内" },
          { value: "semester", label: "本学期内" },
        ],
      },
      {
        id: "includePartial",
        name: "includePartial",
        label: "包含部分完成",
        description: "是否将部分完成的作业也算作缺交",
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    ],
    template: {
      severity: "medium",
      scope: "global",
      category: "homework",
      priority: 6,
      conditionTemplate:
        "当学生在 {timeWindow} 连续 {missingCount} 次未提交作业时触发预警",
      sqlTemplate: `
        SELECT s.student_id, s.name, s.class_name, COUNT(*) as missing_count
        FROM students s
        JOIN homework h ON (s.class_name = h.class_name OR s.class_id = h.class_id)
        LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND s.id = hs.student_id
        WHERE hs.id IS NULL
        AND h.due_date >= {timeWindowStart}
        GROUP BY s.student_id, s.name, s.class_name
        HAVING COUNT(*) >= {missingCount}
      `,
    },
  },
  {
    id: "homework_quality",
    name: "作业质量预警",
    description: "学生作业质量持续较差时预警",
    icon: "📊",
    category: "homework",
    difficulty: "medium",
    parameters: [
      {
        id: "qualityThreshold",
        name: "qualityThreshold",
        label: "质量分数线",
        description: "作业得分低于此分数视为质量差",
        type: "number",
        required: true,
        defaultValue: 70,
        min: 0,
        max: 100,
        unit: "分",
      },
      {
        id: "consecutiveCount",
        name: "consecutiveCount",
        label: "连续次数",
        description: "连续多少次作业质量差",
        type: "number",
        required: true,
        defaultValue: 3,
        min: 2,
        max: 8,
        unit: "次",
      },
    ],
    template: {
      severity: "medium",
      scope: "global",
      category: "homework",
      priority: 6,
      conditionTemplate:
        "当学生连续 {consecutiveCount} 次作业得分低于 {qualityThreshold} 分时触发预警",
      sqlTemplate: `
        SELECT s.student_id, s.name, s.class_name, AVG(hs.score) as avg_score
        FROM students s
        JOIN homework_submissions hs ON s.id = hs.student_id
        WHERE hs.score < {qualityThreshold}
        AND hs.submitted_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        GROUP BY s.student_id, s.name, s.class_name
        HAVING COUNT(*) >= {consecutiveCount}
      `,
    },
  },
];

// 综合场景
export const compositeScenarios: RuleScenario[] = [
  {
    id: "comprehensive_risk",
    name: "综合风险预警",
    description: "综合考虑成绩、作业等多个因素的风险评估",
    icon: "🎯",
    category: "progress",
    difficulty: "medium",
    parameters: [
      {
        id: "gradeWeight",
        name: "gradeWeight",
        label: "成绩权重",
        description: "成绩在综合评估中的权重",
        type: "range",
        required: true,
        defaultValue: 60,
        min: 0,
        max: 100,
        unit: "%",
      },
      {
        id: "homeworkWeight",
        name: "homeworkWeight",
        label: "作业权重",
        description: "作业在综合评估中的权重",
        type: "range",
        required: true,
        defaultValue: 30,
        min: 0,
        max: 100,
        unit: "%",
      },
      {
        id: "riskThreshold",
        name: "riskThreshold",
        label: "风险阈值",
        description: "综合评分低于此值时触发预警",
        type: "number",
        required: true,
        defaultValue: 70,
        min: 0,
        max: 100,
        unit: "分",
      },
    ],
    template: {
      severity: "high",
      scope: "global",
      category: "composite",
      priority: 9,
      conditionTemplate:
        "当学生综合风险评分（成绩权重{gradeWeight}%，作业权重{homeworkWeight}%）低于 {riskThreshold} 分时触发预警",
      sqlTemplate: `
        SELECT s.student_id, s.name, s.class_name,
               ({gradeWeight}/100 * grade_score + {homeworkWeight}/100 * homework_score) as risk_score
        FROM students s
        JOIN (SELECT student_id, AVG(total_score) as grade_score FROM grade_data GROUP BY student_id) g ON s.student_id = g.student_id
        JOIN (SELECT student_id, AVG(score) as homework_score FROM homework_submissions GROUP BY student_id) h ON s.student_id = h.student_id
        WHERE ({gradeWeight}/100 * grade_score + {homeworkWeight}/100 * homework_score) < {riskThreshold}
      `,
    },
  },
];

// 导出所有场景
export const allScenarios: RuleScenario[] = [
  ...gradeScenarios,
  ...homeworkScenarios,
  ...compositeScenarios,
];

// 按类别分组
export const scenariosByCategory = {
  grade: gradeScenarios,
  homework: homeworkScenarios,
  composite: compositeScenarios,
};

// 根据ID获取场景
export const getScenarioById = (id: string): RuleScenario | undefined => {
  return allScenarios.find((scenario) => scenario.id === id);
};

// 根据难度获取场景
export const getScenariosByDifficulty = (
  difficulty: "easy" | "medium"
): RuleScenario[] => {
  return allScenarios.filter((scenario) => scenario.difficulty === difficulty);
};
