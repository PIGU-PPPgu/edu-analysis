/**
 * 预警引擎服务
 * 调用 Edge Functions 执行服务端预警规则
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 执行结果接口
export interface WarningEngineResult {
  executionId: string;
  results: Array<{
    ruleId: string;
    matchedStudents: string[];
    generatedWarnings: number;
    executionTimeMs: number;
    error?: string;
  }>;
  summary: {
    totalRules: number;
    matchedStudents: number;
    generatedWarnings: number;
    totalExecutionTime: number;
  };
}

// 执行状态接口
export interface ExecutionStatus {
  isRunning: boolean;
  lastExecution?: {
    id: string;
    execution_type: string;
    status: string;
    created_at: string;
    completed_at?: string;
    new_warnings_count: number;
  };
  todayStats?: {
    executionsCount: number;
    warningsGenerated: number;
    avgDuration: number;
    successRate: number;
  };
}

/**
 * 执行所有预警规则
 */
export async function executeWarningRules(
  trigger?: string
): Promise<WarningEngineResult | null> {
  try {
    // 调用 Edge Function
    const { data, error } = await supabase.functions.invoke("warning-engine", {
      body: {
        action: "execute_all",
        trigger: trigger || "manual",
      },
    });

    if (error) {
      console.error("调用预警引擎失败:", error);
      toast.error("预警引擎执行失败", {
        description: error.message || "请稍后重试",
      });
      return null;
    }

    if (!data.success) {
      console.error("预警引擎执行失败:", data.error);
      toast.error("预警引擎执行失败", {
        description: data.error || "未知错误",
      });
      return null;
    }

    const result = data.data as WarningEngineResult;

    // 显示执行结果
    toast.success("预警规则执行完成", {
      description: `共执行 ${result.summary.totalRules} 个规则，生成 ${result.summary.generatedWarnings} 个新预警`,
    });

    return result;
  } catch (error) {
    console.error("执行预警规则失败:", error);
    toast.error("执行预警规则失败", {
      description: error instanceof Error ? error.message : "未知错误",
    });
    return null;
  }
}

/**
 * 获取预警引擎执行状态
 */
export async function getWarningEngineStatus(): Promise<ExecutionStatus> {
  try {
    // 获取最近执行记录 - 添加兼容性处理
    let recentExecution = null;
    try {
      const { data, error } = await supabase
        .from("warning_executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116" && error.code !== "42P01") {
        console.warn(
          "[WarningEngineService] 查询warning_executions失败:",
          error.message
        );
      } else {
        recentExecution = data;
      }
    } catch (tableError: any) {
      console.warn(
        "[WarningEngineService] warning_executions表不存在，跳过查询"
      );
    }

    // 获取今日统计 - 添加兼容性处理
    let todayStats = null;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("warning_engine_stats")
        .select("*")
        .eq("date", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116" && error.code !== "42P01") {
        console.warn(
          "[WarningEngineService] 查询warning_engine_stats失败:",
          error.message
        );
      } else {
        todayStats = data;
      }
    } catch (tableError: any) {
      console.warn(
        "[WarningEngineService] warning_engine_stats表不存在，跳过查询"
      );
    }

    // 检查是否有运行中的执行（容错处理）
    let runningExecutions = [];
    try {
      const { data, error } = await supabase
        .from("warning_executions")
        .select("id")
        .eq("status", "running");

      if (error && error.code !== "PGRST116" && error.code !== "42P01") {
        console.warn(
          "[WarningEngineService] 查询running executions失败:",
          error.message
        );
      } else {
        runningExecutions = data || [];
      }
    } catch (tableError: any) {
      console.warn(
        "[WarningEngineService] warning_executions表不存在，跳过运行状态检查"
      );
    }

    return {
      isRunning: (runningExecutions || []).length > 0,
      lastExecution: recentExecution || undefined,
      todayStats: todayStats
        ? {
            executionsCount: todayStats.executions_count,
            warningsGenerated: todayStats.warnings_generated_count,
            avgDuration: todayStats.avg_execution_time_ms,
            successRate: todayStats.success_rate,
          }
        : undefined,
    };
  } catch (error) {
    console.error("[WarningEngineService] 获取执行状态失败:", error);
    return {
      isRunning: false,
    };
  }
}

/**
 * 获取执行历史记录
 */
export async function getWarningExecutionHistory(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from("warning_execution_summary")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // 如果表不存在，返回空数组而不报错
      if (error.code === "PGRST116" || error.code === "42P01") {
        console.warn(
          "[WarningEngineService] warning_execution_summary表不存在，返回空历史记录"
        );
        return [];
      }
      console.error("[WarningEngineService] 获取执行历史失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[WarningEngineService] 获取执行历史失败:", error);
    return [];
  }
}

/**
 * 获取预警引擎性能统计
 */
export async function getWarningEngineStats(days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("warning_engine_stats")
      .select("*")
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (error) {
      // 如果表不存在，返回空数组而不报错
      if (error.code === "PGRST116" || error.code === "42P01") {
        console.warn(
          "[WarningEngineService] warning_engine_stats表不存在，返回空统计数据"
        );
        return [];
      }
      console.error("[WarningEngineService] 获取引擎统计失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[WarningEngineService] 获取引擎统计失败:", error);
    return [];
  }
}

/**
 * 取消运行中的执行
 */
export async function cancelWarningExecution(
  executionId: string,
  reason?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_executions")
      .update({
        status: "cancelled",
        error_message: reason,
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId)
      .eq("status", "running");

    if (error) {
      // 如果表不存在，直接返回成功（因为没有运行中的任务）
      if (error.code === "PGRST116" || error.code === "42P01") {
        console.warn(
          "[WarningEngineService] warning_executions表不存在，取消操作跳过"
        );
        toast.info("无运行中的执行任务需要取消");
        return true;
      }
      console.error("[WarningEngineService] 取消执行失败:", error);
      toast.error("取消执行失败");
      return false;
    }

    toast.success("执行已取消");
    return true;
  } catch (error) {
    console.error("[WarningEngineService] 取消执行失败:", error);
    toast.error("取消执行失败");
    return false;
  }
}

/**
 * 手动触发预警检查（用于成绩导入后）
 */
export async function triggerWarningCheck(trigger: string): Promise<boolean> {
  try {
    const result = await executeWarningRules(trigger);
    return result !== null;
  } catch (error) {
    console.error("触发预警检查失败:", error);
    return false;
  }
}

/**
 * 获取特定执行的详细信息
 */
export async function getExecutionDetails(executionId: string) {
  try {
    const results = await Promise.allSettled([
      supabase
        .from("warning_executions")
        .select("*")
        .eq("id", executionId)
        .single(),
      supabase
        .from("warning_rule_executions")
        .select(
          `
          *,
          warning_rules(name, severity, category)
        `
        )
        .eq("execution_id", executionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("warning_execution_results")
        .select(
          `
          *,
          warning_rule_executions!inner(execution_id)
        `
        )
        .eq("warning_rule_executions.execution_id", executionId),
    ]);

    // 处理执行记录
    let execution = null;
    if (results[0].status === "fulfilled" && !results[0].value.error) {
      execution = results[0].value.data;
    } else if (results[0].status === "fulfilled" && results[0].value.error) {
      const error = results[0].value.error;
      if (error.code !== "PGRST116" && error.code !== "42P01") {
        console.error("[WarningEngineService] 获取执行记录失败:", error);
      } else {
        console.warn("[WarningEngineService] warning_executions表不存在");
      }
    }

    // 处理规则执行记录
    let ruleExecutions = [];
    if (results[1].status === "fulfilled" && !results[1].value.error) {
      ruleExecutions = results[1].value.data || [];
    } else if (results[1].status === "fulfilled" && results[1].value.error) {
      const error = results[1].value.error;
      if (error.code !== "PGRST116" && error.code !== "42P01") {
        console.error("[WarningEngineService] 获取规则执行记录失败:", error);
      } else {
        console.warn("[WarningEngineService] warning_rule_executions表不存在");
      }
    }

    // 处理执行结果记录
    let executionResults = [];
    if (results[2].status === "fulfilled" && !results[2].value.error) {
      executionResults = results[2].value.data || [];
    } else if (results[2].status === "fulfilled" && results[2].value.error) {
      const error = results[2].value.error;
      if (error.code !== "PGRST116" && error.code !== "42P01") {
        console.error("[WarningEngineService] 获取执行结果失败:", error);
      } else {
        console.warn(
          "[WarningEngineService] warning_execution_results表不存在"
        );
      }
    }

    return {
      execution,
      ruleExecutions,
      results: executionResults,
    };
  } catch (error) {
    console.error("[WarningEngineService] 获取执行详情失败:", error);
    return null;
  }
}

/**
 * 检查预警引擎是否可用
 */
export async function checkWarningEngineHealth(): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    // 尝试调用一个简单的健康检查
    const { error } = await supabase.functions.invoke("warning-engine", {
      body: { action: "health_check" },
    });

    if (error) {
      return {
        available: false,
        error: error.message,
      };
    }

    return {
      available: true,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
