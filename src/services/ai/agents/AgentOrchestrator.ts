/**
 * Agent调度器 - 统一管理和调度所有Agent
 *
 * 功能：
 * - Agent注册和发现
 * - 任务队列管理
 * - 负载均衡和故障恢复
 * - 健康监控和性能统计
 * - 优先级调度和资源管理
 */

import { logError, logInfo, logWarn } from "@/utils/logger";
import { dataCache } from "../core/cache";
import { DataProcessorAgent } from "./DataProcessorAgent";
import type {
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
} from "./types";

export interface OrchestratorConfig {
  max_agents: number;
  health_check_interval_ms: number;
  task_timeout_ms: number;
  max_queue_size: number;
  retry_failed_tasks: boolean;
  load_balancing_strategy: "round_robin" | "least_busy" | "capability_based";
  metrics_retention_hours: number;
}

export interface TaskSubmissionRequest {
  type: TaskType;
  priority: TaskPriority;
  input_data: Record<string, any>;
  metadata?: {
    source: string;
    user_id?: string;
    timeout_ms?: number;
    retry_count?: number;
  };
  requirements?: {
    agent_capabilities: string[];
    resource_constraints?: {
      max_memory_mb: number;
      max_cpu_percent: number;
    };
  };
}

export interface OrchestratorMetrics {
  total_agents: number;
  healthy_agents: number;
  total_tasks_processed: number;
  successful_tasks: number;
  failed_tasks: number;
  average_task_duration_ms: number;
  current_queue_size: number;
  system_load: {
    cpu_percent: number;
    memory_mb: number;
    active_tasks: number;
  };
}

export class AgentOrchestrator {
  private agents = new Map<string, BaseAgent>();
  private agentConfigs = new Map<string, AgentConfig>();
  private taskQueues = new Map<string, TaskQueue>();
  private activeTasks = new Map<string, AgentTask>();
  private healthStatuses = new Map<string, AgentHealthStatus>();
  private executionHistory: AgentExecutionResult[] = [];
  private orchestratorLog: AgentLogEntry[] = [];

  private config: OrchestratorConfig = {
    max_agents: 10,
    health_check_interval_ms: 30000, // 30秒
    task_timeout_ms: 300000, // 5分钟
    max_queue_size: 1000,
    retry_failed_tasks: true,
    load_balancing_strategy: "least_busy",
    metrics_retention_hours: 24,
  };

  private healthCheckTimer?: NodeJS.Timeout;
  private isRunning = false;
  private startTime = new Date();

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...this.config, ...config };
    this.log("info", "Agent Orchestrator initialized", this.config);

    // 自动注册内置Agent
    this.initializeBuiltinAgents();
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log("warn", "Orchestrator already running");
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();

    // 启动健康检查
    this.startHealthChecks();

    // 创建默认任务队列
    this.createDefaultQueues();

    this.log("info", "Agent Orchestrator started successfully");
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // 等待所有活跃任务完成
    await this.waitForActiveTasks();

    this.log("info", "Agent Orchestrator stopped");
  }

  /**
   * 注册Agent
   */
  async registerAgent(registration: AgentRegistration): Promise<void> {
    const { agent, config } = registration;

    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already registered`);
    }

    if (this.agents.size >= this.config.max_agents) {
      throw new Error(`Maximum agent limit reached: ${this.config.max_agents}`);
    }

    // 注册Agent
    this.agents.set(agent.id, agent);
    this.agentConfigs.set(agent.id, config);

    // 初始化健康状态
    this.healthStatuses.set(agent.id, {
      agent_id: agent.id,
      is_healthy: true,
      last_check: new Date(),
      response_time_ms: 0,
      resource_usage: { memory_mb: 0, cpu_percent: 0 },
      error_rate: 0,
    });

    this.log("info", `Agent registered: ${agent.name} (${agent.id})`);
  }

  /**
   * 注销Agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 等待Agent完成当前任务
    await this.waitForAgentTasks(agentId);

    // 移除Agent
    this.agents.delete(agentId);
    this.agentConfigs.delete(agentId);
    this.healthStatuses.delete(agentId);

    this.log("info", `Agent unregistered: ${agentId}`);
  }

  /**
   * 提交任务
   */
  async submitTask(request: TaskSubmissionRequest): Promise<string> {
    if (!this.isRunning) {
      throw new Error("Orchestrator is not running");
    }

    // 创建任务
    const task: AgentTask = {
      id: this.generateTaskId(),
      agent_id: "", // 将在调度时分配
      type: request.type,
      priority: request.priority,
      input_data: request.input_data,
      status: "queued",
      progress: 0,
      metadata: {
        created_at: new Date(),
        timeout_ms: request.metadata?.timeout_ms || this.config.task_timeout_ms,
        retry_count: 0,
        max_retries: 3,
        ...request.metadata,
      },
    };

    // 选择合适的Agent
    const selectedAgent = await this.selectAgent(task, request.requirements);
    if (!selectedAgent) {
      throw new Error("No suitable agent available for this task");
    }

    task.agent_id = selectedAgent.id;

    // 将任务加入队列
    await this.enqueueTask(task);

    this.log(
      "info",
      `Task submitted: ${task.id} -> Agent: ${selectedAgent.name}`
    );

    // 异步执行任务
    this.executeTaskAsync(task);

    return task.id;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<{
    status: TaskStatus;
    progress: number;
    result?: any;
    error?: string;
    agent_id?: string;
  }> {
    // 检查活跃任务
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      return {
        status: activeTask.status,
        progress: activeTask.progress,
        agent_id: activeTask.agent_id,
      };
    }

    // 检查执行历史
    const historicalResult = this.executionHistory.find(
      (r) => r.task_id === taskId
    );
    if (historicalResult) {
      return {
        status: historicalResult.status,
        progress: 100,
        result: historicalResult.result,
        error: historicalResult.error?.message,
        agent_id: historicalResult.agent_id,
      };
    }

    throw new Error(`Task ${taskId} not found`);
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found or already completed`);
    }

    task.status = "cancelled";
    this.activeTasks.delete(taskId);

    this.log("info", `Task cancelled: ${taskId}`);
  }

  /**
   * 获取Agent状态
   */
  getAgentStatus(agentId: string): AgentHealthStatus | undefined {
    return this.healthStatuses.get(agentId);
  }

  /**
   * 获取所有Agent状态
   */
  getAllAgentStatuses(): AgentHealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  /**
   * 获取系统指标
   */
  getMetrics(): OrchestratorMetrics {
    const healthyAgents = Array.from(this.healthStatuses.values()).filter(
      (status) => status.is_healthy
    ).length;

    const completedTasks = this.executionHistory.length;
    const successfulTasks = this.executionHistory.filter(
      (result) => result.status === "completed"
    ).length;

    const avgDuration =
      this.executionHistory.length > 0
        ? this.executionHistory.reduce(
            (sum, result) =>
              sum + (result.result?.metrics.processing_time || 0),
            0
          ) / this.executionHistory.length
        : 0;

    return {
      total_agents: this.agents.size,
      healthy_agents: healthyAgents,
      total_tasks_processed: completedTasks,
      successful_tasks: successfulTasks,
      failed_tasks: completedTasks - successfulTasks,
      average_task_duration_ms: avgDuration,
      current_queue_size: this.activeTasks.size,
      system_load: {
        cpu_percent: this.calculateAverageCpu(),
        memory_mb: this.calculateTotalMemory(),
        active_tasks: this.activeTasks.size,
      },
    };
  }

  /**
   * 获取任务队列状态
   */
  getQueueStatus(): Array<{
    queue_id: string;
    name: string;
    size: number;
    processing: number;
    agents: string[];
  }> {
    return Array.from(this.taskQueues.values()).map((queue) => ({
      queue_id: queue.id,
      name: queue.name,
      size: queue.current_size,
      processing: queue.tasks.filter((t) => t.status === "running").length,
      agents: queue.agent_ids,
    }));
  }

  // 私有方法

  private async initializeBuiltinAgents(): Promise<void> {
    try {
      // 注册DataProcessor Agent
      const dataProcessor = new DataProcessorAgent();
      await this.registerAgent({
        agent: dataProcessor,
        config: {
          max_concurrent_tasks: 3,
          timeout_ms: 300000,
          retry_strategy: {
            max_retries: 3,
            backoff_strategy: "exponential",
            base_delay_ms: 1000,
            max_delay_ms: 10000,
          },
          resource_limits: {
            memory_mb: 1024,
            cpu_percent: 70,
          },
          monitoring: {
            metrics_enabled: true,
            log_level: "info",
            performance_tracking: true,
          },
        },
      });

      this.log("info", "Built-in agents initialized successfully");
    } catch (error) {
      this.log("error", "Failed to initialize built-in agents", error);
    }
  }

  private createDefaultQueues(): void {
    // 高优先级队列
    this.taskQueues.set("high-priority", {
      id: "high-priority",
      name: "High Priority Tasks",
      agent_ids: Array.from(this.agents.keys()),
      max_size: 100,
      current_size: 0,
      processing_strategy: "priority",
      tasks: [],
    });

    // 标准队列
    this.taskQueues.set("standard", {
      id: "standard",
      name: "Standard Tasks",
      agent_ids: Array.from(this.agents.keys()),
      max_size: 500,
      current_size: 0,
      processing_strategy: "fifo",
      tasks: [],
    });

    // 低优先级队列
    this.taskQueues.set("low-priority", {
      id: "low-priority",
      name: "Low Priority Tasks",
      agent_ids: Array.from(this.agents.keys()),
      max_size: 300,
      current_size: 0,
      processing_strategy: "fifo",
      tasks: [],
    });
  }

  private async selectAgent(
    task: AgentTask,
    requirements?: TaskSubmissionRequest["requirements"]
  ): Promise<BaseAgent | null> {
    const availableAgents = Array.from(this.agents.values()).filter((agent) =>
      this.isAgentSuitable(agent, task, requirements)
    );

    if (availableAgents.length === 0) {
      return null;
    }

    switch (this.config.load_balancing_strategy) {
      case "round_robin":
        return this.selectRoundRobin(availableAgents);
      case "least_busy":
        return this.selectLeastBusy(availableAgents);
      case "capability_based":
        return this.selectByCapability(availableAgents, task);
      default:
        return availableAgents[0];
    }
  }

  private isAgentSuitable(
    agent: BaseAgent,
    task: AgentTask,
    requirements?: TaskSubmissionRequest["requirements"]
  ): boolean {
    // 检查Agent健康状态
    const health = this.healthStatuses.get(agent.id);
    if (!health?.is_healthy) {
      return false;
    }

    // 检查能力要求
    if (requirements?.agent_capabilities) {
      const agentCapTypes = agent.capabilities.map((cap) => cap.type);
      const hasRequiredCaps = requirements.agent_capabilities.every((req) =>
        agentCapTypes.includes(req as any)
      );
      if (!hasRequiredCaps) {
        return false;
      }
    }

    // 检查资源限制
    if (requirements?.resource_constraints) {
      const config = this.agentConfigs.get(agent.id);
      if (config) {
        if (
          requirements.resource_constraints.max_memory_mb <
            config.resource_limits.memory_mb ||
          requirements.resource_constraints.max_cpu_percent <
            config.resource_limits.cpu_percent
        ) {
          return false;
        }
      }
    }

    return true;
  }

  private selectRoundRobin(agents: BaseAgent[]): BaseAgent {
    // 简化的轮询实现
    const timestamp = Date.now();
    const index = timestamp % agents.length;
    return agents[index];
  }

  private selectLeastBusy(agents: BaseAgent[]): BaseAgent {
    let leastBusyAgent = agents[0];
    let minTasks = this.getAgentActiveTasks(agents[0].id);

    for (const agent of agents.slice(1)) {
      const tasks = this.getAgentActiveTasks(agent.id);
      if (tasks < minTasks) {
        minTasks = tasks;
        leastBusyAgent = agent;
      }
    }

    return leastBusyAgent;
  }

  private selectByCapability(agents: BaseAgent[], task: AgentTask): BaseAgent {
    // 根据任务类型选择最合适的Agent
    for (const agent of agents) {
      const hasMatchingCapability = agent.capabilities.some((cap) => {
        // 简化的能力匹配逻辑
        return this.isCapabilityMatching(cap.type, task.type);
      });

      if (hasMatchingCapability) {
        return agent;
      }
    }

    return agents[0]; // 回退到第一个可用Agent
  }

  private isCapabilityMatching(
    capabilityType: string,
    taskType: TaskType
  ): boolean {
    const mappings: Record<string, TaskType[]> = {
      data_processing: ["data_import", "data_export", "batch_processing"],
      data_validation: ["data_cleaning"],
      data_transformation: ["data_enrichment"],
      pattern_recognition: ["real_time_processing"],
    };

    return mappings[capabilityType]?.includes(taskType) || false;
  }

  private getAgentActiveTasks(agentId: string): number {
    return Array.from(this.activeTasks.values()).filter(
      (task) => task.agent_id === agentId
    ).length;
  }

  private async enqueueTask(task: AgentTask): Promise<void> {
    // 根据优先级选择队列
    let queueId: string;
    switch (task.priority) {
      case "urgent":
      case "high":
        queueId = "high-priority";
        break;
      case "low":
        queueId = "low-priority";
        break;
      default:
        queueId = "standard";
    }

    const queue = this.taskQueues.get(queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }

    if (queue.current_size >= queue.max_size) {
      throw new Error(`Queue ${queueId} is full`);
    }

    queue.tasks.push(task);
    queue.current_size++;
    this.activeTasks.set(task.id, task);
  }

  private async executeTaskAsync(task: AgentTask): Promise<void> {
    try {
      const agent = this.agents.get(task.agent_id);
      if (!agent) {
        throw new Error(`Agent ${task.agent_id} not found`);
      }

      // 检查Agent是否有executeTask方法
      if (typeof (agent as any).executeTask !== "function") {
        throw new Error(
          `Agent ${task.agent_id} does not support task execution`
        );
      }

      // 执行任务
      const result = await (agent as any).executeTask(task);

      // 记录执行结果
      this.executionHistory.push(result);

      // 清理活跃任务
      this.activeTasks.delete(task.id);

      // 清理历史记录（保留最近的记录）
      this.cleanupHistory();

      this.log("info", `Task completed: ${task.id}`, {
        status: result.status,
        processing_time: result.result?.metrics.processing_time,
      });
    } catch (error) {
      this.log("error", `Task execution failed: ${task.id}`, error);

      // 记录失败结果
      const failureResult: AgentExecutionResult = {
        task_id: task.id,
        agent_id: task.agent_id,
        status: "failed",
        error: {
          code: "EXECUTION_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
        execution_log: [],
      };

      this.executionHistory.push(failureResult);
      this.activeTasks.delete(task.id);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.health_check_interval_ms);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        const startTime = Date.now();

        // 简化的健康检查 - 检查Agent状态
        const isHealthy =
          agent.status !== "error" && agent.status !== "maintenance";
        const responseTime = Date.now() - startTime;

        // 更新健康状态
        this.healthStatuses.set(agentId, {
          agent_id: agentId,
          is_healthy: isHealthy,
          last_check: new Date(),
          response_time_ms: responseTime,
          resource_usage: { memory_mb: 0, cpu_percent: 0 }, // 简化实现
          error_rate: 0, // 简化实现
        });
      } catch (error) {
        this.log("warn", `Health check failed for agent: ${agentId}`, error);

        // 标记为不健康
        this.healthStatuses.set(agentId, {
          agent_id: agentId,
          is_healthy: false,
          last_check: new Date(),
          response_time_ms: -1,
          resource_usage: { memory_mb: 0, cpu_percent: 0 },
          error_rate: 1,
          issues: ["health_check_failed"],
        });
      }
    }
  }

  private async waitForActiveTasks(): Promise<void> {
    const maxWait = 30000; // 30秒
    const startTime = Date.now();

    while (this.activeTasks.size > 0 && Date.now() - startTime < maxWait) {
      await this.delay(1000);
    }
  }

  private async waitForAgentTasks(agentId: string): Promise<void> {
    const maxWait = 15000; // 15秒
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const agentTasks = Array.from(this.activeTasks.values()).filter(
        (task) => task.agent_id === agentId
      );

      if (agentTasks.length === 0) {
        break;
      }

      await this.delay(1000);
    }
  }

  private cleanupHistory(): void {
    const maxHistory = 1000;
    if (this.executionHistory.length > maxHistory) {
      this.executionHistory = this.executionHistory.slice(-maxHistory);
    }
  }

  private calculateAverageCpu(): number {
    const healthStatuses = Array.from(this.healthStatuses.values());
    if (healthStatuses.length === 0) return 0;

    const totalCpu = healthStatuses.reduce(
      (sum, status) => sum + status.resource_usage.cpu_percent,
      0
    );
    return Math.round(totalCpu / healthStatuses.length);
  }

  private calculateTotalMemory(): number {
    const healthStatuses = Array.from(this.healthStatuses.values());
    return healthStatuses.reduce(
      (sum, status) => sum + status.resource_usage.memory_mb,
      0
    );
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any
  ): void {
    const entry: AgentLogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.orchestratorLog.push(entry);

    // 只保留最近1000条日志
    if (this.orchestratorLog.length > 1000) {
      this.orchestratorLog = this.orchestratorLog.slice(-1000);
    }

    const logFn =
      level === "error" ? logError : level === "warn" ? logWarn : logInfo;
    logFn(`[AgentOrchestrator] ${message}`, data);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取调度器运行状态
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      start_time: this.startTime,
      uptime_ms: Date.now() - this.startTime.getTime(),
      registered_agents: this.agents.size,
      active_tasks: this.activeTasks.size,
      queue_count: this.taskQueues.size,
      total_processed: this.executionHistory.length,
      config: this.config,
    };
  }
}
