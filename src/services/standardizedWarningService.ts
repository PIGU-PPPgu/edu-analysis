/**
 * 标准化预警服务
 * 展示如何使用统一错误处理机制的服务层实现
 */

import { supabase } from "@/integrations/supabase/client";
import {
  createSuccessResponse,
  createErrorResponse,
  errorHandler,
  type ApiResponse,
  type StandardError,
} from "./errorHandler";

// 基础类型定义
interface WarningRule {
  id: string;
  name: string;
  description: string;
  conditions: Record<string, any>;
  severity: "low" | "medium" | "high";
  is_active: boolean;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

interface WarningRecord {
  id: string;
  student_id: string;
  rule_id: string;
  status: "active" | "resolved" | "dismissed";
  details: Record<string, any>;
  created_at: string;
}

interface WarningStatistics {
  totalStudents: number;
  warningStudents: number;
  atRiskStudents: number;
  warningRatio: number;
  highRiskStudents: number;
  totalWarnings: number;
  activeWarnings: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  categoryDistribution: {
    grade: number;
    attendance: number;
    behavior: number;
    progress: number;
    homework: number;
    composite: number;
  };
  scopeDistribution: {
    global: number;
    exam: number;
    class: number;
    student: number;
  };
  warningsByType: any[];
  riskByClass: any[];
  commonRiskFactors: any[];
}

interface RuleFilter {
  search?: string;
  severity?: string;
  is_active?: boolean;
  scope?: string;
  category?: string;
}

// 工具函数
const createValidationError = (
  message: string,
  context?: Record<string, any>
): Error => {
  return new Error(message);
};

const createBusinessError = (
  message: string,
  userMessage: string,
  context?: Record<string, any>
): Error => {
  return new Error(userMessage || message);
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delay: number;
    retryCondition?: (error: any) => boolean;
  }
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i <= options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === options.maxRetries) break;
      if (options.retryCondition && !options.retryCondition(error)) break;
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  }

  throw lastError;
};

/**
 * 标准化获取预警规则
 */
export const getWarningRulesStandardized = async (
  filter?: RuleFilter
): Promise<ApiResponse<WarningRule[]>> => {
  try {
    // 输入验证
    if (filter?.search && filter.search.length < 2) {
      throw createValidationError("搜索关键词至少需要2个字符");
    }

    let query = supabase
      .from("warning_rules")
      .select("*")
      .order("created_at", { ascending: false });

    // 应用筛选条件
    if (filter?.severity) {
      query = query.eq("severity", filter.severity);
    }
    if (filter?.is_active !== undefined) {
      query = query.eq("is_active", filter.is_active);
    }
    if (filter?.search) {
      query = query.or(
        `name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`
      );
    }
    if (filter?.scope) {
      query = query.eq("scope", filter.scope);
    }
    if (filter?.category) {
      query = query.eq("category", filter.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`获取预警规则失败: ${error.message}`);
    }

    return createSuccessResponse(data || [], "预警规则获取成功");
  } catch (error) {
    return createErrorResponse(error, {
      service: "warningService",
      action: "getWarningRules",
    });
  }
};

/**
 * 标准化创建预警规则（带重试机制）
 */
export const createWarningRuleStandardized = async (
  rule: Omit<WarningRule, "id" | "created_at" | "updated_at">
): Promise<ApiResponse<WarningRule>> => {
  try {
    const result = await withRetry(
      async (): Promise<WarningRule> => {
        // 业务逻辑验证
        if (!rule.name || rule.name.trim().length === 0) {
          throw createValidationError("规则名称不能为空");
        }

        if (!rule.conditions || Object.keys(rule.conditions).length === 0) {
          throw createValidationError("规则条件不能为空");
        }

        // 检查重名
        const { data: existing } = await supabase
          .from("warning_rules")
          .select("id")
          .eq("name", rule.name.trim())
          .single();

        if (existing) {
          throw createBusinessError(
            `规则名称 "${rule.name}" 已存在`,
            "规则名称已存在，请使用其他名称"
          );
        }

        const { data, error } = await supabase
          .from("warning_rules")
          .insert(rule)
          .select()
          .single();

        if (error) {
          throw new Error(`创建预警规则失败: ${error.message}`);
        }

        if (!data) {
          throw new Error("创建预警规则返回空数据");
        }

        return data;
      },
      {
        maxRetries: 2,
        delay: 1000,
        retryCondition: (error: any) => error?.retryable,
      }
    );

    return createSuccessResponse(result, "预警规则创建成功");
  } catch (error) {
    return createErrorResponse(error, {
      service: "warningService",
      action: "createWarningRule",
    });
  }
};

/**
 * 标准化更新预警规则
 */
export const updateWarningRuleStandardized = async (
  id: string,
  updates: Partial<WarningRule>
): Promise<ApiResponse<WarningRule>> => {
  try {
    // 输入验证
    if (!id || id.trim().length === 0) {
      throw createValidationError("规则ID不能为空");
    }

    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw createValidationError("规则名称不能为空");
    }

    const result = await withRetry(
      async (): Promise<WarningRule> => {
        // 检查规则是否存在
        const { data: existing, error: fetchError } = await supabase
          .from("warning_rules")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw createBusinessError(
              `规则 ${id} 不存在`,
              "要更新的规则不存在"
            );
          }
          throw new Error(`查询规则失败: ${fetchError.message}`);
        }

        // 检查是否为系统规则
        if (existing.is_system && updates.name) {
          throw createBusinessError(
            "不能修改系统规则的名称",
            "系统规则名称不可修改"
          );
        }

        // 如果更新名称，检查重名
        if (updates.name && updates.name !== existing.name) {
          const { data: nameConflict } = await supabase
            .from("warning_rules")
            .select("id")
            .eq("name", updates.name.trim())
            .neq("id", id)
            .single();

          if (nameConflict) {
            throw createBusinessError(
              `规则名称 "${updates.name}" 已存在`,
              "规则名称已存在，请使用其他名称"
            );
          }
        }

        const { data, error } = await supabase
          .from("warning_rules")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw new Error(`更新预警规则失败: ${error.message}`);
        }

        if (!data) {
          throw new Error("更新预警规则返回空数据");
        }

        return data;
      },
      {
        maxRetries: 2,
        delay: 1000,
      }
    );

    return createSuccessResponse(result, "预警规则更新成功");
  } catch (error) {
    return createErrorResponse(error, {
      service: "warningService",
      action: "updateWarningRule",
      input: { ruleId: id, updates },
    });
  }
};

/**
 * 标准化删除预警规则
 */
export const deleteWarningRuleStandardized = async (
  id: string
): Promise<ApiResponse<boolean>> => {
  try {
    // 输入验证
    if (!id || id.trim().length === 0) {
      throw createValidationError("规则ID不能为空");
    }

    const result = await withRetry(
      async (): Promise<boolean> => {
        // 检查规则是否存在且不是系统规则
        const { data: existing, error: fetchError } = await supabase
          .from("warning_rules")
          .select("id, name, is_system")
          .eq("id", id)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw createBusinessError(
              `规则 ${id} 不存在`,
              "要删除的规则不存在"
            );
          }
          throw new Error(`查询规则失败: ${fetchError.message}`);
        }

        if (existing.is_system) {
          throw createBusinessError("不能删除系统规则", "系统规则不可删除");
        }

        // 检查是否有相关的预警记录
        const { data: relatedWarnings, error: warningError } = await supabase
          .from("warning_records")
          .select("id")
          .eq("rule_id", id)
          .eq("status", "active")
          .limit(1);

        if (warningError) {
          throw new Error(`检查相关预警记录失败: ${warningError.message}`);
        }

        if (relatedWarnings && relatedWarnings.length > 0) {
          throw createBusinessError(
            "该规则有活跃的预警记录，不能删除",
            "该规则还有未处理的预警，请先处理相关预警后再删除"
          );
        }

        const { error } = await supabase
          .from("warning_rules")
          .delete()
          .eq("id", id);

        if (error) {
          throw new Error(`删除预警规则失败: ${error.message}`);
        }

        return true;
      },
      {
        maxRetries: 1, // 删除操作通常不需要重试
        delay: 1000,
      }
    );

    return createSuccessResponse(result, "预警规则删除成功");
  } catch (error) {
    return createErrorResponse(error, {
      service: "warningService",
      action: "deleteWarningRule",
    });
  }
};

/**
 * 标准化获取预警统计（带缓存）
 */
export const getWarningStatisticsStandardized = async (
  options: {
    forceRefresh?: boolean;
    includeDetails?: boolean;
  } = {}
): Promise<ApiResponse<WarningStatistics>> => {
  try {
    const { forceRefresh = false, includeDetails = false } = options;

    const result = await withRetry(
      async (): Promise<WarningStatistics> => {
        // 这里可以加入缓存逻辑
        const cacheKey = `warning_stats_${includeDetails}`;

        if (!forceRefresh) {
          // 检查缓存（示例代码）
          // const cached = await getCachedData(cacheKey);
          // if (cached) return cached;
        }

        // 并行查询多个统计数据
        const [studentsResult, warningsResult, rulesResult] = await Promise.all(
          [
            supabase.from("students").select("id", { count: "exact" }),

            supabase
              .from("warning_records")
              .select("status, student_id", { count: "exact" })
              .eq("status", "active"),

            supabase
              .from("warning_rules")
              .select("severity, is_active", { count: "exact" })
              .eq("is_active", true),
          ]
        );

        // 检查查询错误
        if (studentsResult.error) {
          throw new Error(`查询学生数据失败: ${studentsResult.error.message}`);
        }
        if (warningsResult.error) {
          throw new Error(`查询预警数据失败: ${warningsResult.error.message}`);
        }
        if (rulesResult.error) {
          throw new Error(`查询规则数据失败: ${rulesResult.error.message}`);
        }

        const totalStudents = studentsResult.count || 0;
        const activeWarnings = warningsResult.count || 0;
        const activeRules = rulesResult.count || 0;

        // 计算预警学生数（去重）
        const uniqueWarningStudents = new Set(
          warningsResult.data?.map((w) => w.student_id) || []
        ).size;

        const statistics: WarningStatistics = {
          totalStudents,
          warningStudents: uniqueWarningStudents,
          atRiskStudents: uniqueWarningStudents,
          warningRatio:
            totalStudents > 0 ? uniqueWarningStudents / totalStudents : 0,
          highRiskStudents: 0, // 需要根据具体业务逻辑计算
          totalWarnings: activeWarnings,
          activeWarnings,
          riskDistribution: {
            low: 0,
            medium: 0,
            high: 0,
          },
          categoryDistribution: {
            grade: 0,
            attendance: 0,
            behavior: 0,
            progress: 0,
            homework: 0,
            composite: 0,
          },
          scopeDistribution: {
            global: 0,
            exam: 0,
            class: 0,
            student: 0,
          },
          warningsByType: [],
          riskByClass: [],
          commonRiskFactors: [],
        };

        // 缓存结果（示例代码）
        // await setCachedData(cacheKey, statistics, 300); // 5分钟缓存

        return statistics;
      },
      {
        maxRetries: 2,
        delay: 1000,
      }
    );

    return createSuccessResponse(result, "预警统计获取成功");
  } catch (error) {
    return createErrorResponse(error, {
      service: "warningService",
      action: "getWarningStatistics",
    });
  }
};

/**
 * 批量操作示例：批量更新规则状态
 */
export const batchUpdateRuleStatusStandardized = async (
  ruleIds: string[],
  isActive: boolean
): Promise<ApiResponse<{ updatedCount: number; errors: string[] }>> => {
  try {
    // 输入验证
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      throw createValidationError("规则ID列表不能为空");
    }

    if (ruleIds.length > 50) {
      throw createValidationError("批量操作最多支持50条记录");
    }

    const errors: string[] = [];
    let updatedCount = 0;

    // 串行处理每个规则，避免并发问题
    for (const ruleId of ruleIds) {
      try {
        const result = await updateWarningRuleStandardized(ruleId, {
          is_active: isActive,
        });
        if (result.success) {
          updatedCount++;
        } else {
          errors.push(
            `规则 ${ruleId}: ${result.error?.userMessage || "更新失败"}`
          );
        }
      } catch (error) {
        errors.push(
          `规则 ${ruleId}: ${error instanceof Error ? error.message : "未知错误"}`
        );
      }
    }

    const result = { updatedCount, errors };

    return createSuccessResponse(result, "批量更新完成");
  } catch (error) {
    return createErrorResponse(error, {
      service: "warningService",
      action: "batchUpdateRuleStatus",
      input: { ruleIds, isActive },
    });
  }
};

// 导出错误处理工具，供其他服务使用
export {
  errorHandler,
  createValidationError,
  createBusinessError,
  withRetry,
  type ApiResponse,
  type StandardError,
};
