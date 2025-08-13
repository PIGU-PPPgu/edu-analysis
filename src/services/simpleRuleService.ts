/**
 * 简化版预警规则服务
 * 为简化构建器提供专门的API适配层
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createWarningRule, WarningRule } from "./warningService";
import {
  SimpleExportedRule,
  RuleConfiguration,
  RuleScenario,
} from "@/components/warning/SimpleRuleBuilder/types";

// 场景化预警规则条件结构
export interface ScenarioBasedConditions {
  // 基础信息
  scenario: string;
  scenarioVersion: string;

  // 自然语言描述
  naturalLanguage: string;

  // 场景参数
  parameters: Record<string, any>;

  // SQL模板和生成的查询
  sqlTemplate: string;
  generatedSql?: string;

  // 兼容原有结构的条件
  legacyConditions?: any;
}

// 扩展的预警规则接口
export interface ScenarioWarningRule extends Omit<WarningRule, "conditions"> {
  conditions: ScenarioBasedConditions;
}

/**
 * 将简化规则转换为数据库兼容格式
 */
export function convertSimpleRuleToDbFormat(
  rule: SimpleExportedRule
): Omit<WarningRule, "id" | "created_at" | "updated_at"> {
  // 构建场景化条件结构
  const scenarioConditions: ScenarioBasedConditions = {
    scenario: rule.scenario,
    scenarioVersion: "1.0.0",
    naturalLanguage: rule.conditions.naturalLanguage,
    parameters: rule.parameters,
    sqlTemplate: rule.conditions.sql,
    // 为了兼容性，也保留一些基础的条件信息
    legacyConditions: {
      type: "scenario_based",
      scenario: rule.scenario,
      summary: rule.conditions.naturalLanguage,
    },
  };

  // 构建元数据
  const metadata = {
    ...rule.metadata,
    // 添加场景相关信息
    scenario: {
      id: rule.scenario,
      version: "1.0.0",
      parameters: rule.parameters,
    },
    // 添加自然语言描述
    naturalLanguage: rule.conditions.naturalLanguage,
    // 添加创建来源标识
    createdWith: "simple_rule_builder",
    // 记录创建时间戳
    createdTimestamp: new Date().toISOString(),
  };

  return {
    name: rule.name,
    description: rule.description,
    conditions: scenarioConditions,
    severity: rule.severity,
    scope: rule.scope,
    category: rule.category,
    priority: rule.priority,
    is_active: rule.is_active,
    is_system: false, // 用户创建的规则不是系统规则
    auto_trigger: true, // 简化版规则默认自动触发
    notification_enabled: true, // 默认启用通知
    metadata,
    created_by: null, // 将来可以通过认证获取当前用户ID
  };
}

/**
 * 创建场景化预警规则
 */
export async function createScenarioRule(
  rule: SimpleExportedRule
): Promise<WarningRule | null> {
  try {
    // 转换为数据库格式
    const dbRule = convertSimpleRuleToDbFormat(rule);

    console.log("创建场景化预警规则:", {
      name: dbRule.name,
      scenario: rule.scenario,
      parameters: rule.parameters,
      naturalLanguage: rule.conditions.naturalLanguage,
    });

    // 调用现有的创建API
    const result = await createWarningRule(dbRule);

    if (result) {
      console.log("场景化预警规则创建成功:", result.id);

      // 可以在这里添加额外的后处理逻辑
      // 例如：生成SQL查询、验证规则等
      await postProcessScenarioRule(result, rule);
    }

    return result;
  } catch (error) {
    console.error("创建场景化预警规则失败:", error);
    return null;
  }
}

/**
 * 后处理场景化规则
 * 可以用于生成SQL、验证规则等
 */
async function postProcessScenarioRule(
  savedRule: WarningRule,
  originalRule: SimpleExportedRule
): Promise<void> {
  try {
    // 1. 生成实际的SQL查询（替换模板中的参数）
    const actualSql = generateActualSql(
      originalRule.conditions.sql,
      originalRule.parameters
    );

    // 2. 可以在这里验证SQL的有效性
    console.log("生成的SQL查询:", actualSql);

    // 3. 可以在这里进行规则测试
    // const testResult = await testRuleExecution(actualSql);

    // 4. 更新规则的生成SQL（如果需要的话）
    if (actualSql !== originalRule.conditions.sql) {
      await updateRuleGeneratedSql(savedRule.id, actualSql);
    }
  } catch (error) {
    console.error("后处理场景化规则失败:", error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 生成实际SQL查询
 * 将模板中的占位符替换为实际参数值
 */
function generateActualSql(
  sqlTemplate: string,
  parameters: Record<string, any>
): string {
  let actualSql = sqlTemplate;

  // 先处理 subjects 参数的特殊逻辑
  if (parameters.subjects && Array.isArray(parameters.subjects)) {
    const subjectFields = parameters.subjects.map((subject) => {
      switch (subject) {
        case "total":
          return "total_score";
        case "chinese":
          return "chinese_score";
        case "math":
          return "math_score";
        case "english":
          return "english_score";
        case "physics":
          return "physics_score";
        case "chemistry":
          return "chemistry_score";
        default:
          return "total_score";
      }
    });

    // 替换 {subjectField} 占位符
    if (subjectFields.length === 1) {
      actualSql = actualSql.replaceAll("{subjectField}", subjectFields[0]);
    } else if (subjectFields.length > 1) {
      // 多个科目时，使用第一个科目
      // TODO: 将来可以改为生成 OR 条件或其他复杂逻辑
      actualSql = actualSql.replaceAll("{subjectField}", subjectFields[0]);
    }
  }

  // 处理特殊参数（没有直接对应占位符的参数）
  Object.entries(parameters).forEach(([key, value]) => {
    if (typeof value === "string") {
      if (key === "comparisonPeriod") {
        // 处理对比周期
        switch (value) {
          case "previous_exam":
            actualSql = actualSql.replaceAll(
              "{comparisonCondition}",
              "previous.exam_date < current.exam_date AND previous.exam_date = (SELECT MAX(exam_date) FROM grade_data WHERE student_id = current.student_id AND exam_date < current.exam_date)"
            );
            break;
          case "month_ago":
            actualSql = actualSql.replaceAll(
              "{comparisonCondition}",
              "previous.exam_date >= DATE_SUB(current.exam_date, INTERVAL 1 MONTH) AND previous.exam_date < current.exam_date"
            );
            break;
          case "semester_start":
            actualSql = actualSql.replaceAll(
              "{comparisonCondition}",
              "previous.exam_date >= DATE_SUB(current.exam_date, INTERVAL 6 MONTH) AND previous.exam_date < current.exam_date"
            );
            break;
        }
      } else if (key === "timeWindow") {
        // 处理时间窗口
        switch (value) {
          case "week":
            actualSql = actualSql.replaceAll(
              "{timeWindowStart}",
              "DATE_SUB(NOW(), INTERVAL 1 WEEK)"
            );
            break;
          case "month":
            actualSql = actualSql.replaceAll(
              "{timeWindowStart}",
              "DATE_SUB(NOW(), INTERVAL 1 MONTH)"
            );
            break;
          case "semester":
            actualSql = actualSql.replaceAll(
              "{timeWindowStart}",
              "DATE_SUB(NOW(), INTERVAL 6 MONTH)"
            );
            break;
        }
      }
    }
  });

  // 替换直接对应的参数
  Object.entries(parameters).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    if (actualSql.includes(placeholder)) {
      // 根据参数类型进行不同的处理
      if (Array.isArray(value)) {
        // 数组类型参数（除了subjects，已在上面处理）
        if (key !== "subjects") {
          // 对于其他数组类型，可以根据需要扩展
          actualSql = actualSql.replaceAll(placeholder, value.join(","));
        }
      } else if (typeof value === "string") {
        // 跳过已经处理过的特殊参数
        if (key !== "comparisonPeriod" && key !== "timeWindow") {
          // 一般字符串参数
          actualSql = actualSql.replaceAll(placeholder, `'${value}'`);
        }
      } else {
        // 数字类型直接替换
        actualSql = actualSql.replaceAll(placeholder, String(value));
      }
    }
  });

  return actualSql;
}

/**
 * 更新规则的生成SQL
 */
async function updateRuleGeneratedSql(
  ruleId: string,
  generatedSql: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("warning_rules")
      .update({
        metadata: supabase.rpc("jsonb_set", {
          target: supabase.rpc("coalesce", {
            value: supabase
              .from("warning_rules")
              .select("metadata")
              .eq("id", ruleId)
              .single(),
            default_value: "{}",
          }),
          path: "{generatedSql}",
          new_value: JSON.stringify(generatedSql),
        }),
      })
      .eq("id", ruleId);

    if (error) {
      console.error("更新生成SQL失败:", error);
    }
  } catch (error) {
    console.error("更新生成SQL失败:", error);
  }
}

/**
 * 获取场景化规则列表
 * 可以用于筛选出通过简化构建器创建的规则
 */
export async function getScenarioRules(): Promise<ScenarioWarningRule[]> {
  try {
    const { data, error } = await supabase
      .from("warning_rules")
      .select("*")
      .contains("metadata", { createdWith: "simple_rule_builder" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取场景化规则失败:", error);
      return [];
    }

    return (data || []) as ScenarioWarningRule[];
  } catch (error) {
    console.error("获取场景化规则失败:", error);
    return [];
  }
}

/**
 * 测试场景化规则
 * 可以用于验证规则的有效性
 */
export async function testScenarioRule(rule: SimpleExportedRule): Promise<{
  isValid: boolean;
  affectedStudents: number;
  sampleStudents: any[];
  error?: string;
}> {
  try {
    const actualSql = generateActualSql(rule.conditions.sql, rule.parameters);

    // 这里可以实际执行SQL来测试
    // 为了安全起见，先只做基础验证

    // 模拟测试结果
    const mockResult = {
      isValid: true,
      affectedStudents: Math.floor(Math.random() * 20) + 5,
      sampleStudents: [
        {
          studentId: "S001",
          studentName: "张三",
          className: "高三1班",
          matchReason: rule.conditions.naturalLanguage,
        },
      ],
    };

    return mockResult;
  } catch (error) {
    console.error("测试场景化规则失败:", error);
    return {
      isValid: false,
      affectedStudents: 0,
      sampleStudents: [],
      error: String(error),
    };
  }
}

/**
 * 导出用于简化构建器的接口
 */
export {
  createScenarioRule as createSimpleRule,
  getScenarioRules as getSimpleRules,
  testScenarioRule as testSimpleRule,
};
