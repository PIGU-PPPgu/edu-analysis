/**
 * 简化版预警规则构建器类型定义
 * 针对教师用户优化，降低使用复杂度
 */

// 预警场景类型
export interface RuleScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "grade" | "homework" | "attendance" | "behavior" | "progress";
  difficulty: "easy" | "medium";
  parameters: RuleParameter[];
  template: RuleTemplate;
}

// 规则参数定义
export interface RuleParameter {
  id: string;
  name: string;
  label: string;
  description: string;
  type: "number" | "select" | "multiselect" | "range" | "boolean";
  required: boolean;
  defaultValue?: any;
  options?: Array<{
    value: any;
    label: string;
    description?: string;
  }>;
  min?: number;
  max?: number;
  unit?: string;
  validation?: {
    pattern?: string;
    message?: string;
  };
}

// 规则模板
export interface RuleTemplate {
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
  conditionTemplate: string; // 用于生成自然语言描述的模板
  sqlTemplate: string; // 用于生成SQL的模板
}

// 规则配置状态
export interface RuleConfiguration {
  scenarioId: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
  metadata: {
    estimatedAffectedStudents?: number;
    confidence?: number;
  };
}

// 向导步骤
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  canSkip: boolean;
}

// 规则预览数据
export interface RulePreview {
  naturalLanguage: string;
  sqlQuery: string;
  estimatedMatches: number;
  sampleStudents: Array<{
    studentId: string;
    studentName: string;
    className: string;
    matchReason: string;
  }>;
  potentialIssues: string[];
}

// 简化版导出规则
export interface SimpleExportedRule {
  name: string;
  description: string;
  scenario: string;
  parameters: Record<string, any>;
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
    naturalLanguage: string;
    sql: string;
    parameters: Record<string, any>;
  };
  metadata: {
    createdBy: string;
    createdWith: "simple_rule_builder";
    scenario: string;
    version: string;
  };
}
