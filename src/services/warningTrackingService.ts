/**
 * 预警追踪服务
 * 提供详细的执行日志、错误处理和追踪功能
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 执行记录接口
export interface WarningExecution {
  id: string;
  trigger_type: "manual" | "auto" | "scheduled" | "import" | "webhook";
  trigger_source?: string;
  execution_status: "pending" | "running" | "completed" | "failed" | "partial";
  start_time: string;
  end_time?: string;
  total_rules: number;
  executed_rules: number;
  matched_students: number;
  generated_warnings: number;
  execution_time_ms: number;
  success_rate: number;
  error_count: number;
  summary: any;
  metadata: any;
  created_by?: string;
}

// 执行步骤记录接口
export interface ExecutionStep {
  id: string;
  execution_id: string;
  step_type:
    | "rule_validation"
    | "student_query"
    | "condition_check"
    | "warning_creation"
    | "notification_send";
  step_name: string;
  step_status: "pending" | "running" | "completed" | "failed" | "skipped";
  start_time: string;
  end_time?: string;
  execution_time_ms?: number;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  stack_trace?: string;
  rule_id?: string;
  student_id?: string;
  metadata?: any;
}

// 错误记录接口
export interface ExecutionError {
  id: string;
  execution_id: string;
  step_id?: string;
  error_type:
    | "validation"
    | "database"
    | "network"
    | "timeout"
    | "logic"
    | "system";
  error_code: string;
  error_message: string;
  stack_trace?: string;
  error_context: any;
  severity: "low" | "medium" | "high" | "critical";
  is_recoverable: boolean;
  recovery_attempted: boolean;
  recovery_success?: boolean;
  created_at: string;
}

// 性能指标接口
export interface PerformanceMetrics {
  execution_id: string;
  total_execution_time: number;
  rule_processing_time: number;
  database_query_time: number;
  warning_creation_time: number;
  notification_time: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  database_connections: number;
  cache_hit_rate: number;
  throughput_per_second: number;
}

/**
 * 创建新的执行记录
 */
export async function createExecution(
  triggerType: string,
  triggerSource?: string,
  metadata?: any
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("warning_executions")
      .insert({
        trigger_type: triggerType,
        trigger_source: triggerSource,
        execution_status: "pending",
        start_time: new Date().toISOString(),
        total_rules: 0,
        executed_rules: 0,
        matched_students: 0,
        generated_warnings: 0,
        execution_time_ms: 0,
        success_rate: 0,
        error_count: 0,
        summary: {},
        metadata: metadata || {},
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("创建执行记录失败:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("创建执行记录失败:", error);
    return null;
  }
}

/**
 * 更新执行记录状态
 */
export async function updateExecutionStatus(
  executionId: string,
  status: string,
  summary?: any,
  errorCount?: number
): Promise<boolean> {
  try {
    const updateData: any = {
      execution_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed" || status === "failed") {
      updateData.end_time = new Date().toISOString();
    }

    if (summary) {
      updateData.summary = summary;
      updateData.total_rules = summary.totalRules || 0;
      updateData.executed_rules = summary.executedRules || 0;
      updateData.matched_students = summary.matchedStudents || 0;
      updateData.generated_warnings = summary.generatedWarnings || 0;
      updateData.execution_time_ms = summary.executionTime || 0;
      updateData.success_rate = summary.successRate || 0;
    }

    if (errorCount !== undefined) {
      updateData.error_count = errorCount;
    }

    const { error } = await supabase
      .from("warning_executions")
      .update(updateData)
      .eq("id", executionId);

    if (error) {
      console.error("更新执行状态失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("更新执行状态失败:", error);
    return false;
  }
}

/**
 * 创建执行步骤记录
 */
export async function createExecutionStep(
  executionId: string,
  stepType: string,
  stepName: string,
  ruleId?: string,
  studentId?: string,
  inputData?: any
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("warning_execution_steps")
      .insert({
        execution_id: executionId,
        step_type: stepType,
        step_name: stepName,
        step_status: "pending",
        start_time: new Date().toISOString(),
        rule_id: ruleId,
        student_id: studentId,
        input_data: inputData,
      })
      .select("id")
      .single();

    if (error) {
      console.error("创建执行步骤失败:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("创建执行步骤失败:", error);
    return null;
  }
}

/**
 * 更新执行步骤状态
 */
export async function updateExecutionStep(
  stepId: string,
  status: string,
  outputData?: any,
  errorMessage?: string,
  stackTrace?: string
): Promise<boolean> {
  try {
    const updateData: any = {
      step_status: status,
      end_time: new Date().toISOString(),
    };

    if (outputData) {
      updateData.output_data = outputData;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (stackTrace) {
      updateData.stack_trace = stackTrace;
    }

    // 计算执行时间
    const { data: stepData } = await supabase
      .from("warning_execution_steps")
      .select("start_time")
      .eq("id", stepId)
      .single();

    if (stepData) {
      const startTime = new Date(stepData.start_time);
      const endTime = new Date();
      updateData.execution_time_ms = endTime.getTime() - startTime.getTime();
    }

    const { error } = await supabase
      .from("warning_execution_steps")
      .update(updateData)
      .eq("id", stepId);

    if (error) {
      console.error("更新执行步骤失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("更新执行步骤失败:", error);
    return false;
  }
}

/**
 * 记录错误信息
 */
export async function logExecutionError(
  executionId: string,
  errorType: string,
  errorCode: string,
  errorMessage: string,
  errorContext: any,
  severity: string = "medium",
  stepId?: string,
  stackTrace?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("warning_execution_errors").insert({
      execution_id: executionId,
      step_id: stepId,
      error_type: errorType,
      error_code: errorCode,
      error_message: errorMessage,
      stack_trace: stackTrace,
      error_context: errorContext,
      severity: severity,
      is_recoverable: severity !== "critical",
      recovery_attempted: false,
    });

    if (error) {
      console.error("记录错误信息失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("记录错误信息失败:", error);
    return false;
  }
}

/**
 * 记录性能指标
 */
export async function recordPerformanceMetrics(
  executionId: string,
  metrics: Partial<PerformanceMetrics>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("warning_execution_performance")
      .insert({
        execution_id: executionId,
        ...metrics,
        recorded_at: new Date().toISOString(),
      });

    if (error) {
      console.error("记录性能指标失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("记录性能指标失败:", error);
    return false;
  }
}

/**
 * 获取执行历史
 */
export async function getExecutionHistory(
  limit: number = 20,
  offset: number = 0,
  status?: string,
  triggerType?: string
): Promise<WarningExecution[]> {
  try {
    let query = supabase
      .from("warning_executions")
      .select("*")
      .order("start_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("execution_status", status);
    }

    if (triggerType) {
      query = query.eq("trigger_type", triggerType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取执行历史失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取执行历史失败:", error);
    return [];
  }
}

/**
 * 获取执行详情
 */
export async function getExecutionDetails(executionId: string): Promise<{
  execution: WarningExecution | null;
  steps: ExecutionStep[];
  errors: ExecutionError[];
  performance: PerformanceMetrics | null;
}> {
  try {
    const [executionResult, stepsResult, errorsResult, performanceResult] =
      await Promise.all([
        supabase
          .from("warning_executions")
          .select("*")
          .eq("id", executionId)
          .single(),
        supabase
          .from("warning_execution_steps")
          .select("*")
          .eq("execution_id", executionId)
          .order("start_time", { ascending: true }),
        supabase
          .from("warning_execution_errors")
          .select("*")
          .eq("execution_id", executionId)
          .order("created_at", { ascending: false }),
        supabase
          .from("warning_execution_performance")
          .select("*")
          .eq("execution_id", executionId)
          .single(),
      ]);

    return {
      execution: executionResult.data || null,
      steps: stepsResult.data || [],
      errors: errorsResult.data || [],
      performance: performanceResult.data || null,
    };
  } catch (error) {
    console.error("获取执行详情失败:", error);
    return {
      execution: null,
      steps: [],
      errors: [],
      performance: null,
    };
  }
}

/**
 * 获取执行统计
 */
export async function getExecutionStatistics(days: number = 30): Promise<{
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageSuccessRate: number;
  totalWarningsGenerated: number;
  totalErrorCount: number;
  errorsByType: Array<{ type: string; count: number }>;
  executionsByTrigger: Array<{ trigger: string; count: number }>;
  dailyStats: Array<{ date: string; executions: number; success_rate: number }>;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase.rpc("get_execution_statistics", {
      p_start_date: startDate.toISOString(),
      p_end_date: new Date().toISOString(),
    });

    if (error) {
      console.error("获取执行统计失败:", error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        averageSuccessRate: 0,
        totalWarningsGenerated: 0,
        totalErrorCount: 0,
        errorsByType: [],
        executionsByTrigger: [],
        dailyStats: [],
      };
    }

    return (
      data || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        averageSuccessRate: 0,
        totalWarningsGenerated: 0,
        totalErrorCount: 0,
        errorsByType: [],
        executionsByTrigger: [],
        dailyStats: [],
      }
    );
  } catch (error) {
    console.error("获取执行统计失败:", error);
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageSuccessRate: 0,
      totalWarningsGenerated: 0,
      totalErrorCount: 0,
      errorsByType: [],
      executionsByTrigger: [],
      dailyStats: [],
    };
  }
}

/**
 * 尝试错误恢复
 */
export async function attemptErrorRecovery(
  errorId: string,
  recoveryAction: "retry" | "skip" | "manual"
): Promise<boolean> {
  try {
    // 标记恢复尝试
    const { error: updateError } = await supabase
      .from("warning_execution_errors")
      .update({
        recovery_attempted: true,
        recovery_action: recoveryAction,
        recovery_attempted_at: new Date().toISOString(),
      })
      .eq("id", errorId);

    if (updateError) {
      console.error("更新恢复状态失败:", updateError);
      return false;
    }

    // 根据恢复动作执行相应逻辑
    switch (recoveryAction) {
      case "retry":
        // 这里可以添加重试逻辑
        toast.info("正在尝试重新执行...");
        break;
      case "skip":
        // 跳过错误步骤
        toast.info("已跳过错误步骤");
        break;
      case "manual":
        // 需要手动干预
        toast.warning("需要手动处理此错误");
        break;
    }

    return true;
  } catch (error) {
    console.error("错误恢复失败:", error);
    return false;
  }
}

/**
 * 清理历史执行记录
 */
export async function cleanupExecutionHistory(
  olderThanDays: number = 90,
  keepMinimum: number = 100
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("cleanup_execution_history", {
      p_older_than_days: olderThanDays,
      p_keep_minimum: keepMinimum,
    });

    if (error) {
      console.error("清理执行历史失败:", error);
      return false;
    }

    const deletedCount = data as number;
    if (deletedCount > 0) {
      toast.success(`已清理 ${deletedCount} 条历史执行记录`);
    } else {
      toast.info("没有需要清理的历史记录");
    }

    return true;
  } catch (error) {
    console.error("清理执行历史失败:", error);
    return false;
  }
}

/**
 * 导出执行报告
 */
export async function exportExecutionReport(
  startDate: string,
  endDate: string,
  format: "json" | "csv" = "json"
): Promise<any> {
  try {
    const executions = await getExecutionHistory(1000, 0);
    const filteredExecutions = executions.filter(
      (exec) => exec.start_time >= startDate && exec.start_time <= endDate
    );

    if (format === "csv") {
      // 转换为CSV格式
      const csvHeaders = [
        "ID",
        "触发类型",
        "执行状态",
        "开始时间",
        "结束时间",
        "执行时间(ms)",
        "成功率(%)",
        "处理规则数",
        "匹配学生数",
        "生成预警数",
        "错误数量",
      ];

      const csvRows = filteredExecutions.map((exec) => [
        exec.id,
        exec.trigger_type,
        exec.execution_status,
        exec.start_time,
        exec.end_time || "",
        exec.execution_time_ms,
        exec.success_rate,
        exec.total_rules,
        exec.matched_students,
        exec.generated_warnings,
        exec.error_count,
      ]);

      return {
        headers: csvHeaders,
        rows: csvRows,
        filename: `warning_execution_report_${startDate}_${endDate}.csv`,
      };
    }

    return {
      executions: filteredExecutions,
      summary: {
        totalExecutions: filteredExecutions.length,
        successfulExecutions: filteredExecutions.filter(
          (e) => e.execution_status === "completed"
        ).length,
        averageExecutionTime:
          filteredExecutions.reduce((sum, e) => sum + e.execution_time_ms, 0) /
            filteredExecutions.length || 0,
        totalWarningsGenerated: filteredExecutions.reduce(
          (sum, e) => sum + e.generated_warnings,
          0
        ),
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("导出执行报告失败:", error);
    throw error;
  }
}
