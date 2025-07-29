/**
 * Agent系统统一入口
 *
 * 提供：
 * - Agent系统的统一导出
 * - 便捷的Agent调用接口
 * - 系统初始化和配置
 * - Agent类型和接口定义
 */

// 核心Agent类型和接口
export type {
  BaseAgent,
  AgentTask,
  AgentExecutionResult,
  AgentConfig,
  AgentRegistration,
  AgentHealthStatus,
  TaskQueue,
  TaskStatus,
  TaskPriority,
  TaskType,
  AgentMessage,
  AgentLogEntry,
  AgentStatus,
  AgentCapability,
  CapabilityType,
  DataProcessingInput,
  DataTransformation,
  ValidationRule,
  DataFormat,
  DataProcessorCapabilities,
} from "./types";

// Agent实现
export { DataProcessorAgent } from "./DataProcessorAgent";

// Agent调度器
export {
  AgentOrchestrator,
  type OrchestratorConfig,
  type TaskSubmissionRequest,
  type OrchestratorMetrics,
} from "./AgentOrchestrator";

// 创建全局Agent调度器实例
import { AgentOrchestrator } from "./AgentOrchestrator";

/**
 * 全局Agent调度器实例
 *
 * 使用示例：
 * ```typescript
 * import { agentOrchestrator } from '@/services/ai/agents';
 *
 * // 启动调度器
 * await agentOrchestrator.start();
 *
 * // 提交任务
 * const taskId = await agentOrchestrator.submitTask({
 *   type: 'data_import',
 *   priority: 'high',
 *   input_data: { source: { location: 'data.csv', format: 'csv' } }
 * });
 *
 * // 检查任务状态
 * const status = await agentOrchestrator.getTaskStatus(taskId);
 * ```
 */
export const agentOrchestrator = new AgentOrchestrator({
  max_agents: 10,
  health_check_interval_ms: 30000,
  task_timeout_ms: 300000,
  max_queue_size: 1000,
  retry_failed_tasks: true,
  load_balancing_strategy: "least_busy",
  metrics_retention_hours: 24,
});

/**
 * 便捷的Agent系统API
 */
export const AgentAPI = {
  /**
   * 启动Agent系统
   */
  async initialize(): Promise<void> {
    await agentOrchestrator.start();
  },

  /**
   * 停止Agent系统
   */
  async shutdown(): Promise<void> {
    await agentOrchestrator.stop();
  },

  /**
   * 数据处理快捷方法
   */
  async processData(config: {
    type:
      | "import"
      | "export"
      | "cleaning"
      | "enrichment"
      | "batch"
      | "realtime";
    source?: {
      location: string;
      format: "json" | "csv" | "excel" | "xml";
    };
    destination?: {
      location: string;
      format: "json" | "csv" | "excel";
    };
    transformations?: Array<{
      type: "filter" | "map" | "aggregate" | "sort";
      name: string;
      parameters: Record<string, any>;
    }>;
    validation_rules?: Array<{
      field: string;
      type: "required" | "type_check" | "range";
      parameters: Record<string, any>;
    }>;
    priority?: "low" | "medium" | "high" | "urgent";
  }): Promise<string> {
    const taskTypeMap = {
      import: "data_import",
      export: "data_export",
      cleaning: "data_cleaning",
      enrichment: "data_enrichment",
      batch: "batch_processing",
      realtime: "real_time_processing",
    } as const;

    return await agentOrchestrator.submitTask({
      type: taskTypeMap[config.type],
      priority: config.priority || "medium",
      input_data: {
        source: config.source,
        output_config: config.destination,
        transformations: config.transformations,
        validation_rules: config.validation_rules,
      },
    });
  },

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string) {
    return await agentOrchestrator.getTaskStatus(taskId);
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId: string) {
    return await agentOrchestrator.cancelTask(taskId);
  },

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      orchestrator: agentOrchestrator.getStatus(),
      metrics: agentOrchestrator.getMetrics(),
      agents: agentOrchestrator.getAllAgentStatuses(),
      queues: agentOrchestrator.getQueueStatus(),
    };
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    agents: Array<{
      id: string;
      name: string;
      status: string;
      healthy: boolean;
    }>;
    issues: string[];
  }> {
    const agentStatuses = agentOrchestrator.getAllAgentStatuses();
    const healthyAgents = agentStatuses.filter((agent) => agent.is_healthy);
    const issues: string[] = [];

    // 检查Agent健康状况
    agentStatuses.forEach((agent) => {
      if (!agent.is_healthy) {
        issues.push(`Agent ${agent.agent_id} 不健康`);
        if (agent.issues) {
          issues.push(...agent.issues);
        }
      }
    });

    // 判断整体状态
    let status: "healthy" | "degraded" | "unhealthy";
    const healthyRatio = healthyAgents.length / agentStatuses.length;

    if (healthyRatio >= 0.8) {
      status = "healthy";
    } else if (healthyRatio >= 0.5) {
      status = "degraded";
      issues.push("部分Agent不可用，系统性能降级");
    } else {
      status = "unhealthy";
      issues.push("大量Agent不可用，系统功能受限");
    }

    return {
      status,
      agents: agentStatuses.map((agent) => ({
        id: agent.agent_id,
        name: agent.agent_id, // 简化实现
        status: agent.is_healthy ? "healthy" : "unhealthy",
        healthy: agent.is_healthy,
      })),
      issues,
    };
  },
};

/**
 * Claude Code对话快捷指令映射
 *
 * 这些常量可以在Claude Code对话中直接使用
 */
export const AgentCommands = {
  // 系统管理
  INITIALIZE: "AgentAPI.initialize()",
  SHUTDOWN: "AgentAPI.shutdown()",
  HEALTH_CHECK: "AgentAPI.healthCheck()",
  SYSTEM_STATUS: "AgentAPI.getSystemStatus()",

  // 数据处理
  PROCESS_CSV: (file: string) =>
    `AgentAPI.processData({ type: 'import', source: { location: '${file}', format: 'csv' } })`,
  PROCESS_JSON: (file: string) =>
    `AgentAPI.processData({ type: 'import', source: { location: '${file}', format: 'json' } })`,
  CLEAN_DATA: (source: string) =>
    `AgentAPI.processData({ type: 'cleaning', source: { location: '${source}', format: 'csv' } })`,
  EXPORT_DATA: (destination: string) =>
    `AgentAPI.processData({ type: 'export', destination: { location: '${destination}', format: 'json' } })`,

  // 任务管理
  CHECK_TASK: (taskId: string) => `AgentAPI.getTaskStatus('${taskId}')`,
  CANCEL_TASK: (taskId: string) => `AgentAPI.cancelTask('${taskId}')`,
};

/**
 * 默认配置
 */
export const AgentDefaults = {
  config: {
    max_agents: 10,
    health_check_interval_ms: 30000,
    task_timeout_ms: 300000,
    max_queue_size: 1000,
    retry_failed_tasks: true,
    load_balancing_strategy: "least_busy" as const,
    metrics_retention_hours: 24,
  },

  dataProcessor: {
    max_concurrent_tasks: 5,
    timeout_ms: 300000,
    retry_strategy: {
      max_retries: 3,
      backoff_strategy: "exponential" as const,
      base_delay_ms: 1000,
      max_delay_ms: 10000,
    },
    resource_limits: {
      memory_mb: 1024,
      cpu_percent: 80,
    },
    monitoring: {
      metrics_enabled: true,
      log_level: "info" as const,
      performance_tracking: true,
    },
  },
};

/**
 * Agent系统工具函数
 */
export const AgentUtils = {
  /**
   * 创建任务配置
   */
  createTaskConfig(
    type: TaskType,
    inputData: Record<string, any>,
    options: {
      priority?: TaskPriority;
      timeout?: number;
      retries?: number;
    } = {}
  ) {
    return {
      type,
      priority: options.priority || "medium",
      input_data: inputData,
      metadata: {
        timeout_ms: options.timeout || 300000,
        retry_count: 0,
        max_retries: options.retries || 3,
      },
    };
  },

  /**
   * 格式化任务结果
   */
  formatTaskResult(result: AgentExecutionResult) {
    return {
      taskId: result.task_id,
      agentId: result.agent_id,
      status: result.status,
      success: result.status === "completed",
      data: result.result?.data,
      summary: result.result?.summary,
      processingTime: result.result?.metrics.processing_time,
      itemsProcessed: result.result?.metrics.items_processed,
      error: result.error?.message,
      logs: result.execution_log.slice(-5), // 只显示最近5条日志
    };
  },

  /**
   * 生成任务报告
   */
  generateTaskReport(results: AgentExecutionResult[]) {
    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const totalProcessed = results.reduce(
      (sum, r) => sum + (r.result?.metrics.items_processed || 0),
      0
    );
    const avgTime =
      results.reduce(
        (sum, r) => sum + (r.result?.metrics.processing_time || 0),
        0
      ) / results.length;

    return {
      summary: {
        total_tasks: results.length,
        completed_tasks: completed,
        failed_tasks: failed,
        success_rate: Math.round((completed / results.length) * 10000) / 100,
        total_items_processed: totalProcessed,
        average_processing_time: Math.round(avgTime),
      },
      details: results.map(this.formatTaskResult),
    };
  },
};

// 默认导出Agent系统的主要接口
export default {
  orchestrator: agentOrchestrator,
  API: AgentAPI,
  Commands: AgentCommands,
  Utils: AgentUtils,
  Defaults: AgentDefaults,
};
