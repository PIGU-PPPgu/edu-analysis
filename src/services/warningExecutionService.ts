/**
 * 预警执行记录服务
 * 管理预警规则的自动执行和执行历史记录
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 执行类型
export type ExecutionType = 'manual' | 'scheduled' | 'triggered';

// 执行状态
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

// 规则执行状态
export type RuleExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// 预警执行批次记录
export interface WarningExecution {
  id: string;
  execution_type: ExecutionType;
  trigger_event?: string;
  executed_by?: string;
  rules_count: number;
  matched_students_count: number;
  new_warnings_count: number;
  status: ExecutionStatus;
  error_message?: string;
  execution_duration_ms?: number;
  metadata: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

// 规则执行详情记录
export interface WarningRuleExecution {
  id: string;
  execution_id: string;
  rule_id: string;
  rule_snapshot: Record<string, any>;
  affected_students_count: number;
  new_warnings_count: number;
  execution_sql?: string;
  execution_time_ms?: number;
  status: RuleExecutionStatus;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// 执行结果记录
export interface WarningExecutionResult {
  id: string;
  rule_execution_id: string;
  student_id: string;
  student_data?: Record<string, any>;
  rule_conditions_matched: Record<string, any>;
  warning_severity: 'low' | 'medium' | 'high';
  warning_generated: boolean;
  warning_record_id?: string;
  skip_reason?: string;
  created_at: string;
}

// 引擎性能统计
export interface WarningEngineStats {
  id: string;
  date: string;
  executions_count: number;
  total_execution_time_ms: number;
  avg_execution_time_ms: number;
  rules_executed_count: number;
  students_processed_count: number;
  warnings_generated_count: number;
  success_rate: number;
  error_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 执行摘要（带关联数据）
export interface WarningExecutionSummary {
  id: string;
  execution_type: ExecutionType;
  status: ExecutionStatus;
  rules_count: number;
  matched_students_count: number;
  new_warnings_count: number;
  execution_duration_ms?: number;
  created_at: string;
  completed_at?: string;
  rule_executions_count: number;
  successful_rules: number;
  failed_rules: number;
}

/**
 * 开始新的预警执行批次
 */
export async function startWarningExecution(
  executionType: ExecutionType,
  triggerEvent?: string,
  rulesCount?: number
): Promise<WarningExecution | null> {
  try {
    const executionData = {
      execution_type: executionType,
      trigger_event: triggerEvent,
      executed_by: null, // 将来可以从认证上下文获取
      rules_count: rulesCount || 0,
      matched_students_count: 0,
      new_warnings_count: 0,
      status: 'running' as ExecutionStatus,
      metadata: {
        started_at: new Date().toISOString(),
        trigger_event: triggerEvent,
      },
    };

    const { data, error } = await supabase
      .from('warning_executions')
      .insert(executionData)
      .select()
      .single();

    if (error) {
      console.error('创建预警执行记录失败:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('创建预警执行记录失败:', error);
    return null;
  }
}

/**
 * 完成预警执行批次
 */
export async function completeWarningExecution(
  executionId: string,
  results: {
    rulesCount?: number;
    matchedStudentsCount?: number;
    newWarningsCount?: number;
    executionDurationMs?: number;
    status: ExecutionStatus;
    errorMessage?: string;
  }
): Promise<boolean> {
  try {
    const updateData = {
      rules_count: results.rulesCount,
      matched_students_count: results.matchedStudentsCount,
      new_warnings_count: results.newWarningsCount,
      execution_duration_ms: results.executionDurationMs,
      status: results.status,
      error_message: results.errorMessage,
      completed_at: new Date().toISOString(),
      metadata: supabase.rpc('jsonb_set', {
        target: supabase.rpc('coalesce', {
          value: supabase
            .from('warning_executions')
            .select('metadata')
            .eq('id', executionId)
            .single(),
          default_value: '{}',
        }),
        path: '{completed_at}',
        new_value: JSON.stringify(new Date().toISOString()),
      }),
    };

    const { error } = await supabase
      .from('warning_executions')
      .update(updateData)
      .eq('id', executionId);

    if (error) {
      console.error('更新预警执行记录失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('更新预警执行记录失败:', error);
    return false;
  }
}

/**
 * 记录单个规则的执行
 */
export async function recordRuleExecution(
  executionId: string,
  ruleId: string,
  ruleSnapshot: Record<string, any>,
  executionResults: {
    affectedStudentsCount: number;
    newWarningsCount: number;
    executionSql?: string;
    executionTimeMs?: number;
    status: RuleExecutionStatus;
    errorMessage?: string;
  }
): Promise<string | null> {
  try {
    const ruleExecutionData = {
      execution_id: executionId,
      rule_id: ruleId,
      rule_snapshot: ruleSnapshot,
      affected_students_count: executionResults.affectedStudentsCount,
      new_warnings_count: executionResults.newWarningsCount,
      execution_sql: executionResults.executionSql,
      execution_time_ms: executionResults.executionTimeMs,
      status: executionResults.status,
      error_message: executionResults.errorMessage,
      completed_at: executionResults.status === 'completed' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('warning_rule_executions')
      .insert(ruleExecutionData)
      .select('id')
      .single();

    if (error) {
      console.error('记录规则执行失败:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('记录规则执行失败:', error);
    return null;
  }
}

/**
 * 记录执行结果（匹配的学生）
 */
export async function recordExecutionResult(
  ruleExecutionId: string,
  studentId: string,
  studentData: Record<string, any>,
  conditionsMatched: Record<string, any>,
  warningSeverity: 'low' | 'medium' | 'high',
  warningGenerated: boolean,
  warningRecordId?: string,
  skipReason?: string
): Promise<boolean> {
  try {
    const resultData = {
      rule_execution_id: ruleExecutionId,
      student_id: studentId,
      student_data: studentData,
      rule_conditions_matched: conditionsMatched,
      warning_severity: warningSeverity,
      warning_generated: warningGenerated,
      warning_record_id: warningRecordId,
      skip_reason: skipReason,
    };

    const { error } = await supabase
      .from('warning_execution_results')
      .insert(resultData);

    if (error) {
      console.error('记录执行结果失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('记录执行结果失败:', error);
    return false;
  }
}

/**
 * 获取执行历史记录
 */
export async function getWarningExecutions(
  limit: number = 20,
  executionType?: ExecutionType,
  status?: ExecutionStatus
): Promise<WarningExecutionSummary[]> {
  try {
    let query = supabase
      .from('warning_execution_summary')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (executionType) {
      query = query.eq('execution_type', executionType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取执行历史失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取执行历史失败:', error);
    return [];
  }
}

/**
 * 获取特定执行的详细信息
 */
export async function getExecutionDetails(
  executionId: string
): Promise<{
  execution: WarningExecution | null;
  ruleExecutions: WarningRuleExecution[];
  results: WarningExecutionResult[];
} | null> {
  try {
    const [executionResponse, ruleExecutionsResponse, resultsResponse] =
      await Promise.all([
        supabase
          .from('warning_executions')
          .select('*')
          .eq('id', executionId)
          .single(),
        supabase
          .from('warning_rule_executions')
          .select('*')
          .eq('execution_id', executionId)
          .order('created_at', { ascending: true }),
        supabase
          .from('warning_execution_results')
          .select(`
            *,
            warning_rule_executions!inner(execution_id)
          `)
          .eq('warning_rule_executions.execution_id', executionId),
      ]);

    if (executionResponse.error) {
      console.error('获取执行详情失败:', executionResponse.error);
      return null;
    }

    return {
      execution: executionResponse.data,
      ruleExecutions: ruleExecutionsResponse.data || [],
      results: resultsResponse.data || [],
    };
  } catch (error) {
    console.error('获取执行详情失败:', error);
    return null;
  }
}

/**
 * 获取引擎性能统计
 */
export async function getWarningEngineStats(
  days: number = 7
): Promise<WarningEngineStats[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('warning_engine_stats')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('获取引擎统计失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('获取引擎统计失败:', error);
    return [];
  }
}

/**
 * 取消执行中的任务
 */
export async function cancelWarningExecution(
  executionId: string,
  reason?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('warning_executions')
      .update({
        status: 'cancelled',
        error_message: reason,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
      .eq('status', 'running'); // 只能取消运行中的执行

    if (error) {
      console.error('取消执行失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('取消执行失败:', error);
    return false;
  }
}

/**
 * 获取最近的执行状态
 */
export async function getRecentExecutionStatus(): Promise<{
  isRunning: boolean;
  lastExecution?: WarningExecution;
  todayStats?: {
    executionsCount: number;
    warningsGenerated: number;
    avgDuration: number;
    successRate: number;
  };
}> {
  try {
    // 获取最近执行记录
    const { data: recentExecution } = await supabase
      .from('warning_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 获取今日统计
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats } = await supabase
      .from('warning_engine_stats')
      .select('*')
      .eq('date', today)
      .single();

    // 检查是否有运行中的执行
    const { data: runningExecutions } = await supabase
      .from('warning_executions')
      .select('id')
      .eq('status', 'running');

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
    console.error('获取执行状态失败:', error);
    return {
      isRunning: false,
    };
  }
}