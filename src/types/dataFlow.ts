/**
 * 数据流状态机类型定义
 *
 * 用于管理数据导入、处理等长时任务的状态
 */

/**
 * 数据流任务状态枚举
 */
export enum DataFlowState {
  // 初始阶段
  IDLE = 'idle',                    // 空闲,未开始
  QUEUED = 'queued',                // 已加入队列,等待执行

  // 准备阶段
  VALIDATING = 'validating',        // 验证数据中
  PREPARING = 'preparing',          // 准备数据中

  // 执行阶段
  PROCESSING = 'processing',        // 正在处理

  // 暂停/恢复
  PAUSED = 'paused',                // 已暂停
  RESUMING = 'resuming',            // 恢复中

  // 终态
  COMPLETED = 'completed',          // 已完成
  FAILED = 'failed',                // 失败
  CANCELLED = 'cancelled',          // 已取消
}

/**
 * 任务类型
 */
export enum TaskType {
  STUDENT_IMPORT = 'student_import',        // 学生数据导入
  GRADE_IMPORT = 'grade_import',            // 成绩数据导入
  BATCH_UPDATE = 'batch_update',            // 批量更新
  DATA_MIGRATION = 'data_migration',        // 数据迁移
  ANALYSIS = 'analysis',                    // 数据分析
}

/**
 * 检查点数据
 */
export interface Checkpoint {
  id: string;
  taskId: string;
  batchIndex: number;                       // 批次索引
  lastProcessedIndex?: number;              // 最后处理的记录索引
  successCount?: number;                    // 成功数量
  failedCount?: number;                     // 失败数量
  timestamp: number;
  data?: any;                               // 检查点数据
  metadata?: Record<string, any>;           // 额外元数据
}

/**
 * 详细错误记录
 */
export interface DetailedError {
  index: number;                            // 记录索引
  recordId?: string;                        // 记录ID (如学号)
  error: string;                            // 错误信息
  stack?: string;                           // 错误堆栈
  recoverable: boolean;                     // 是否可恢复
  timestamp: number;
  context?: Record<string, any>;            // 错误上下文
}

/**
 * 任务进度
 */
export interface TaskProgress {
  total: number;                            // 总记录数
  processed: number;                        // 已处理
  successful: number;                       // 成功数
  failed: number;                           // 失败数
  skipped: number;                          // 跳过数
  percentage: number;                       // 百分比 (0-100)
  currentBatch?: number;                    // 当前批次
  totalBatches?: number;                    // 总批次数
  estimatedTimeRemaining?: number;          // 预计剩余时间(秒)
  processingRate?: number;                  // 处理速率(条/秒)
}

/**
 * 导入配置
 */
export interface ImportConfig {
  batchSize: number;                        // 批次大小
  createMissingRecords: boolean;            // 创建缺失记录
  updateExistingData: boolean;              // 更新现有数据
  skipDuplicates: boolean;                  // 跳过重复
  enableBackup: boolean;                    // 启用备份
  enableRollback: boolean;                  // 启用回滚
  parallelImport: boolean;                  // 并行导入
  strictMode: boolean;                      // 严格模式
  maxRetries?: number;                      // 最大重试次数
  retryDelay?: number;                      // 重试延迟(ms)
}

/**
 * 任务上下文
 */
export interface TaskContext {
  // 考试相关 (成绩导入)
  examId?: string;
  examInfo?: {
    title: string;
    type: string;
    date: string;
    subject?: string;
  };

  // 文件相关
  fileName?: string;
  fileSize?: number;
  fileType?: string;

  // 配置
  config: ImportConfig;

  // 字段映射
  fieldMapping?: Record<string, string>;

  // 其他元数据
  metadata?: Record<string, any>;
}

/**
 * 数据流任务
 */
export interface DataFlowTask {
  id: string;                               // 任务ID (UUID)
  type: TaskType;                           // 任务类型
  state: DataFlowState;                     // 当前状态

  // 进度信息
  progress: TaskProgress;

  // 上下文和配置
  context: TaskContext;

  // 检查点列表
  checkpoints: Checkpoint[];

  // 错误和警告
  errors: DetailedError[];
  warnings: string[];

  // 时间戳
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  pausedAt?: number;

  // 恢复能力
  resumable: boolean;                       // 是否可恢复
  canRetry: boolean;                        // 是否可重试

  // 结果
  result?: {
    successCount: number;
    failedCount: number;
    duration: number;                       // 执行时长(ms)
    processedIds?: string[];                // 处理的ID列表
  };
}

/**
 * 状态转换规则
 * 定义哪些状态可以转换到哪些状态
 */
export const STATE_TRANSITIONS: Record<DataFlowState, DataFlowState[]> = {
  [DataFlowState.IDLE]: [
    DataFlowState.QUEUED,
    DataFlowState.VALIDATING,
  ],

  [DataFlowState.QUEUED]: [
    DataFlowState.VALIDATING,
    DataFlowState.CANCELLED,
  ],

  [DataFlowState.VALIDATING]: [
    DataFlowState.PREPARING,
    DataFlowState.FAILED,
    DataFlowState.CANCELLED,
  ],

  [DataFlowState.PREPARING]: [
    DataFlowState.PROCESSING,
    DataFlowState.FAILED,
    DataFlowState.CANCELLED,
  ],

  [DataFlowState.PROCESSING]: [
    DataFlowState.PAUSED,
    DataFlowState.COMPLETED,
    DataFlowState.FAILED,
    DataFlowState.CANCELLED,
  ],

  [DataFlowState.PAUSED]: [
    DataFlowState.RESUMING,
    DataFlowState.CANCELLED,
  ],

  [DataFlowState.RESUMING]: [
    DataFlowState.PROCESSING,
    DataFlowState.FAILED,
  ],

  [DataFlowState.COMPLETED]: [],            // 终态,不可转换
  [DataFlowState.FAILED]: [
    DataFlowState.VALIDATING,               // 可重试
  ],
  [DataFlowState.CANCELLED]: [],            // 终态,不可转换
};

/**
 * 验证状态转换是否合法
 */
export function canTransitionTo(
  currentState: DataFlowState,
  targetState: DataFlowState
): boolean {
  const allowedTransitions = STATE_TRANSITIONS[currentState];
  return allowedTransitions.includes(targetState);
}

/**
 * 任务创建配置
 */
export interface TaskCreationConfig {
  type: TaskType;
  data: any[];                              // 待处理数据
  context: Partial<TaskContext>;            // 任务上下文
  autoStart?: boolean;                      // 是否自动开始
}

/**
 * 任务更新事件
 */
export interface TaskUpdateEvent {
  taskId: string;
  type: 'state' | 'progress' | 'error' | 'checkpoint';
  data: any;
  timestamp: number;
}
