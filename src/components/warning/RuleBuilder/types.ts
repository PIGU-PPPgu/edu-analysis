/**
 * 预警规则构建器类型定义
 */

// 指标类型定义
export interface MetricDefinition {
  id: string;
  name: string;
  displayName: string;
  type: "numeric" | "percentage" | "rank" | "boolean" | "category";
  category: "grade" | "homework" | "attendance" | "behavior" | "trend";
  dataSource: "grade_data" | "homework_submissions" | "students" | "calculated";
  field?: string; // 对应数据库字段
  range?: [number, number];
  unit?: string;
  description: string;
  icon: string;
  color: string;
  calculation?: {
    type: "direct" | "aggregate" | "comparison" | "trend";
    formula?: string;
    window?: number; // 时间窗口（用于趋势计算）
  };
}

// 操作符类型
export type OperatorType =
  | ">"
  | "<"
  | ">="
  | "<="
  | "="
  | "!="
  | "between"
  | "not_between"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "is_null"
  | "is_not_null"
  | "trend_up"
  | "trend_down"
  | "trend_stable"
  | "consecutive"
  | "within_period"
  | "above_average"
  | "below_average"
  | "top_percent"
  | "bottom_percent";

// 逻辑操作符
export type LogicOperator = "AND" | "OR" | "NOT";

// 条件节点
export interface ConditionNode {
  id: string;
  type: "condition" | "group" | "metric" | "operator" | "value";
  position: { x: number; y: number };
  data: {
    // 条件相关
    metric?: string;
    operator?: OperatorType;
    value?: any;
    values?: any[]; // 用于 in, between 等操作符

    // 时间窗口
    timeWindow?: {
      type: "consecutive" | "within_days" | "within_exams";
      value: number;
    };

    // 分组相关
    logic?: LogicOperator;

    // UI相关
    label?: string;
    color?: string;
    collapsed?: boolean;
  };
  children?: string[]; // 子节点ID列表
  parent?: string; // 父节点ID
}

// 规则构建状态
export interface RuleBuilderState {
  nodes: Record<string, ConditionNode>;
  rootNodeId: string | null;
  selectedNodeId: string | null;
  isValid: boolean;
  errors: string[];

  // 预览数据
  affectedStudentCount: number;
  sampleStudents: any[];

  // 规则元信息
  ruleName: string;
  ruleDescription: string;
  severity: "low" | "medium" | "high";
  scope: "global" | "exam" | "class" | "student";
  category:
    | "grade"
    | "attendance"
    | "behavior"
    | "progress"
    | "homework"
    | "composite";
  priority: number;
}

// 拖拽项类型
export interface DragItem {
  type: "metric" | "operator" | "condition" | "group";
  data: any;
  source?: "palette" | "canvas";
}

// 规则模板
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  structure: ConditionNode[];
  defaultValues: Record<string, any>;
  icon: string;
  color: string;
  difficulty: "beginner" | "intermediate" | "advanced";

  // 推荐配置
  recommendedFor: {
    examTypes?: string[];
    gradeRange?: string[];
    classSize?: [number, number];
  };
}

// 智能推荐
export interface SmartRecommendation {
  type: "threshold" | "operator" | "timeWindow" | "logic" | "optimization";
  title: string;
  description: string;
  confidence: number; // 0-1
  data: {
    metric?: string;
    suggestedValue?: any;
    reasoning?: string;
    expectedImpact?: {
      studentCount: number;
      accuracy: number;
    };
  };
  action?: {
    type: "replace" | "add" | "modify";
    nodeId?: string;
    newValue?: any;
  };
}

// 规则验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    nodeId?: string;
    type:
      | "missing_value"
      | "invalid_range"
      | "logical_error"
      | "performance_warning";
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  warnings: Array<{
    type: string;
    message: string;
    suggestion?: string;
  }>;
  performance: {
    estimatedQueryTime: number;
    complexity: "low" | "medium" | "high";
    optimizations?: string[];
  };
}

// 规则测试结果
export interface RuleTestResult {
  totalStudents: number;
  affectedStudents: number;
  affectedPercentage: number;
  sampleMatches: Array<{
    studentId: string;
    studentName: string;
    matchedConditions: string[];
    values: Record<string, any>;
  }>;
  historicalAnalysis?: {
    wouldHaveTriggered: number;
    accuracy: number;
    falsePositives: number;
    falseNegatives: number;
  };
}

// 导出的规则结构（保存到数据库）
export interface ExportedRule {
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  scope: "global" | "exam" | "class" | "student";
  category:
    | "grade"
    | "attendance"
    | "behavior"
    | "progress"
    | "homework"
    | "composite";
  priority: number;
  is_active: boolean;
  conditions: {
    structure: ConditionNode[];
    sql: string; // 生成的SQL查询
    parameters: Record<string, any>;
  };
  metadata: {
    createdBy: string;
    createdWith: "rule_builder";
    version: string;
    tags: string[];
  };
}
