/**
 * Agent系统类型定义
 *
 * 设计原则：
 * - 与现有knowledge mastery系统完全隔离
 * - 独立的命名空间和数据结构
 * - 可扩展的Agent架构
 */

import type { AIResponse } from "../unified/types";

// Agent基础类型
export interface BaseAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  created_at: Date;
  last_active: Date;
}

// Agent状态
export type AgentStatus =
  | "idle" // 空闲
  | "processing" // 处理中
  | "busy" // 忙碌
  | "error" // 错误状态
  | "maintenance"; // 维护中

// Agent能力定义
export interface AgentCapability {
  type: CapabilityType;
  name: string;
  description: string;
  input_types: string[];
  output_types: string[];
  performance_metrics?: {
    avg_processing_time: number;
    success_rate: number;
    throughput: number;
  };
}

// 能力类型
export type CapabilityType =
  | "data_processing" // 数据处理
  | "data_analysis" // 数据分析
  | "data_transformation" // 数据转换
  | "data_validation" // 数据验证
  | "pattern_recognition" // 模式识别
  | "anomaly_detection" // 异常检测
  | "report_generation" // 报告生成
  | "workflow_automation"; // 工作流自动化

// Agent任务定义
export interface AgentTask {
  id: string;
  agent_id: string;
  type: TaskType;
  priority: TaskPriority;
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  status: TaskStatus;
  progress: number; // 0-100
  error_message?: string;
  metadata: {
    created_at: Date;
    started_at?: Date;
    completed_at?: Date;
    timeout_ms: number;
    retry_count: number;
    max_retries: number;
  };
}

// 任务类型
export type TaskType =
  | "data_import" // 数据导入
  | "data_export" // 数据导出
  | "data_cleaning" // 数据清洗
  | "data_enrichment" // 数据丰富化
  | "batch_processing" // 批量处理
  | "real_time_processing" // 实时处理
  | "scheduled_job" // 定时任务
  | "event_triggered"; // 事件触发

// 任务优先级
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// 任务状态
export type TaskStatus =
  | "queued" // 队列中
  | "running" // 运行中
  | "completed" // 已完成
  | "failed" // 失败
  | "cancelled" // 已取消
  | "timeout"; // 超时

// Agent执行结果
export interface AgentExecutionResult {
  task_id: string;
  agent_id: string;
  status: TaskStatus;
  result?: {
    data: Record<string, any>;
    summary: string;
    metrics: {
      processing_time: number;
      items_processed: number;
      success_count: number;
      error_count: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  execution_log: AgentLogEntry[];
}

// Agent日志条目
export interface AgentLogEntry {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, any>;
}

// Agent配置
export interface AgentConfig {
  max_concurrent_tasks: number;
  timeout_ms: number;
  retry_strategy: {
    max_retries: number;
    backoff_strategy: "linear" | "exponential";
    base_delay_ms: number;
    max_delay_ms: number;
  };
  resource_limits: {
    memory_mb: number;
    cpu_percent: number;
  };
  monitoring: {
    metrics_enabled: boolean;
    log_level: "debug" | "info" | "warn" | "error";
    performance_tracking: boolean;
  };
}

// Agent注册信息
export interface AgentRegistration {
  agent: BaseAgent;
  config: AgentConfig;
  health_check_url?: string;
  startup_command?: string;
  shutdown_command?: string;
}

// Agent健康状态
export interface AgentHealthStatus {
  agent_id: string;
  is_healthy: boolean;
  last_check: Date;
  response_time_ms: number;
  resource_usage: {
    memory_mb: number;
    cpu_percent: number;
  };
  error_rate: number;
  issues?: string[];
}

// Agent任务队列
export interface TaskQueue {
  id: string;
  name: string;
  agent_ids: string[];
  max_size: number;
  current_size: number;
  processing_strategy: "fifo" | "lifo" | "priority";
  tasks: AgentTask[];
}

// Agent网络通信
export interface AgentMessage {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  message_type:
    | "task_request"
    | "task_response"
    | "status_update"
    | "health_check";
  payload: Record<string, any>;
  timestamp: Date;
}

// 数据处理Agent专用类型
export interface DataProcessorCapabilities {
  supported_formats: DataFormat[];
  max_file_size_mb: number;
  streaming_support: boolean;
  parallel_processing: boolean;
  transformation_functions: string[];
}

export type DataFormat =
  | "json"
  | "csv"
  | "excel"
  | "xml"
  | "parquet"
  | "database_table"
  | "api_response";

// 数据处理任务输入
export interface DataProcessingInput {
  source: {
    type: "file" | "database" | "api" | "stream";
    location: string;
    format: DataFormat;
    metadata?: Record<string, any>;
  };
  transformations?: DataTransformation[];
  validation_rules?: ValidationRule[];
  output_config: {
    format: DataFormat;
    destination: string;
    options?: Record<string, any>;
  };
}

// 数据转换定义
export interface DataTransformation {
  type: "filter" | "map" | "aggregate" | "join" | "sort" | "custom";
  name: string;
  parameters: Record<string, any>;
  condition?: string;
}

// 数据验证规则
export interface ValidationRule {
  field: string;
  type: "required" | "type_check" | "range" | "pattern" | "custom";
  parameters: Record<string, any>;
  error_action: "fail" | "warn" | "skip" | "fix";
}
