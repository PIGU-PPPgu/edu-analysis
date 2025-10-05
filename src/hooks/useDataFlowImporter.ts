/**
 * useDataFlowImporter Hook
 *
 * 将DataFlowContext集成到导入组件的专用Hook
 * 提供简化的API,隐藏底层复杂性
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDataFlow } from "@/contexts/DataFlowContext";
import { TaskType, DataFlowState } from "@/types/dataFlow";
import type {
  ImportOptions,
  ImportProgress,
  ExamInfo,
  ValidationResult
} from "@/components/analysis/core/grade-importer/types";

/**
 * 导入任务配置
 */
export interface ImportTaskConfig {
  type: TaskType;
  data: any[];
  examInfo?: ExamInfo;
  validationResult?: ValidationResult;
  options: ImportOptions;
  fileName?: string;
  fileSize?: number;
}

/**
 * 导入Hook返回类型
 */
export interface DataFlowImporterHook {
  // 任务管理
  taskId: string | null;
  isActive: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;

  // 状态
  state: DataFlowState | undefined;
  progress: ImportProgress | null;

  // 操作
  createImportTask: (config: ImportTaskConfig) => string;
  startImport: () => void;
  pauseImport: () => void;
  resumeImport: () => void;
  cancelImport: () => void;
  updateProgress: (update: Partial<ImportProgress>) => void;

  // 检查点
  saveCheckpoint: (batchIndex: number, data?: any) => void;
  getLastCheckpoint: () => any | undefined;

  // 断点续传
  hasResumableCheckpoint: () => boolean;
  getResumeInfo: () => {
    batchIndex: number;
    processed: number;
    successful: number;
    failed: number;
  } | null;
  resumeFromCheckpoint: () => { startBatch: number; skipCount: number } | null;

  // 错误处理
  addError: (error: { message: string; code?: string; data?: any }) => void;
  addWarning: (message: string) => void;
}

/**
 * 将ImportProgress转换为TaskProgress
 */
const convertToTaskProgress = (importProgress: ImportProgress) => ({
  total: importProgress.total,
  processed: importProgress.processed,
  successful: importProgress.successful,
  failed: importProgress.failed,
  skipped: importProgress.skipped || 0,
  percentage: 0, // 会自动计算
  processingRate: importProgress.processingRate,
  estimatedTimeRemaining: importProgress.estimatedTimeRemaining,
});

/**
 * DataFlow导入Hook
 */
export const useDataFlowImporter = (): DataFlowImporterHook => {
  const {
    createTask,
    startTask,
    pauseTask,
    resumeTask,
    cancelTask,
    getTask,
    getTaskState,
    updateTaskProgress,
    saveCheckpoint: saveTaskCheckpoint,
    getLatestCheckpoint,
    addError: addTaskError,
    addWarning: addTaskWarning,
  } = useDataFlow();

  // 当前任务ID
  const taskIdRef = useRef<string | null>(null);

  /**
   * 创建导入任务
   */
  const createImportTask = useCallback(
    (config: ImportTaskConfig): string => {
      const taskId = createTask({
        type: config.type,
        data: config.data,
        context: {
          fileName: config.fileName || "unknown.xlsx",
          fileSize: config.fileSize || 0,
          examInfo: config.examInfo,
          validationResult: config.validationResult,
          config: {
            batchSize: config.options.batchSize || 50,
            createMissingRecords: config.options.createMissingStudents ?? true,
            updateExistingData: config.options.updateExisting ?? true,
            skipDuplicates: config.options.skipDuplicates ?? false,
            enableBackup: true,
            enableRollback: true,
            parallelImport: config.options.parallelImport ?? false,
            strictMode: config.options.strictMode ?? false,
          },
        },
        autoStart: false, // 手动控制启动
      });

      taskIdRef.current = taskId;
      console.log(`[DataFlowImporter] 创建导入任务: ${taskId}`);

      return taskId;
    },
    [createTask]
  );

  /**
   * 启动导入
   */
  const startImport = useCallback(() => {
    if (!taskIdRef.current) {
      console.warn("[DataFlowImporter] 无活跃任务,无法启动");
      return;
    }
    startTask(taskIdRef.current);
  }, [startTask]);

  /**
   * 暂停导入
   */
  const pauseImport = useCallback(() => {
    if (!taskIdRef.current) return;
    pauseTask(taskIdRef.current);
  }, [pauseTask]);

  /**
   * 恢复导入
   */
  const resumeImport = useCallback(() => {
    if (!taskIdRef.current) return;
    resumeTask(taskIdRef.current);
  }, [resumeTask]);

  /**
   * 取消导入
   */
  const cancelImport = useCallback(() => {
    if (!taskIdRef.current) return;
    cancelTask(taskIdRef.current);
  }, [cancelTask]);

  /**
   * 更新进度
   */
  const updateProgress = useCallback(
    (update: Partial<ImportProgress>) => {
      if (!taskIdRef.current) return;

      const taskProgress = {
        total: update.total,
        processed: update.processed,
        successful: update.successful,
        failed: update.failed,
        skipped: update.skipped || 0,
      };

      updateTaskProgress(taskIdRef.current, taskProgress);
    },
    [updateTaskProgress]
  );

  /**
   * 保存检查点
   */
  const saveCheckpoint = useCallback(
    (batchIndex: number, data?: any) => {
      if (!taskIdRef.current) return;

      const checkpoint = {
        id: `${taskIdRef.current}-checkpoint-${batchIndex}`,
        taskId: taskIdRef.current,
        timestamp: Date.now(),
        batchIndex,
        data: data || {},
      };

      saveTaskCheckpoint(taskIdRef.current, checkpoint);
    },
    [saveTaskCheckpoint]
  );

  /**
   * 获取最新检查点
   */
  const getLastCheckpoint = useCallback(() => {
    if (!taskIdRef.current) return undefined;
    return getLatestCheckpoint(taskIdRef.current);
  }, [getLatestCheckpoint, taskIdRef.current]);

  /**
   * 添加错误
   */
  const addError = useCallback(
    (error: { message: string; code?: string; data?: any }) => {
      if (!taskIdRef.current) return;

      addTaskError(taskIdRef.current, {
        message: error.message,
        code: error.code || "IMPORT_ERROR",
        timestamp: Date.now(),
        data: error.data,
      });
    },
    [addTaskError]
  );

  /**
   * 添加警告
   */
  const addWarning = useCallback(
    (message: string) => {
      if (!taskIdRef.current) return;
      addTaskWarning(taskIdRef.current, message);
    },
    [addTaskWarning]
  );

  // 获取当前任务
  const currentTask = taskIdRef.current ? getTask(taskIdRef.current) : null;
  const currentState = taskIdRef.current ? getTaskState(taskIdRef.current) : undefined;

  // 计算状态标志
  const isActive = useMemo(() => {
    return (
      currentState === DataFlowState.PROCESSING ||
      currentState === DataFlowState.VALIDATING ||
      currentState === DataFlowState.PREPARING ||
      currentState === DataFlowState.RESUMING
    );
  }, [currentState]);

  const canPause = useMemo(() => {
    return currentState === DataFlowState.PROCESSING && currentTask?.resumable === true;
  }, [currentState, currentTask]);

  const canResume = useMemo(() => {
    return currentState === DataFlowState.PAUSED;
  }, [currentState]);

  const canCancel = useMemo(() => {
    return (
      currentState !== DataFlowState.COMPLETED &&
      currentState !== DataFlowState.FAILED &&
      currentState !== DataFlowState.CANCELLED
    );
  }, [currentState]);

  // 转换进度为ImportProgress格式
  const progress = useMemo<ImportProgress | null>(() => {
    if (!currentTask) return null;

    return {
      total: currentTask.progress.total,
      processed: currentTask.progress.processed,
      successful: currentTask.progress.successful,
      failed: currentTask.progress.failed,
      skipped: currentTask.progress.skipped || 0,
      percentage: currentTask.progress.percentage,
      processingRate: currentTask.progress.processingRate,
      estimatedTimeRemaining: currentTask.progress.estimatedTimeRemaining,
      currentBatch: 0, // 可从检查点获取
      totalBatches: Math.ceil(currentTask.progress.total / (currentTask.context.config?.batchSize || 50)),
    };
  }, [currentTask]);

  /**
   * 检查是否有可恢复的检查点
   */
  const hasResumableCheckpoint = useCallback(() => {
    if (!taskIdRef.current) return false;
    const checkpoint = getLatestCheckpoint(taskIdRef.current);
    if (!checkpoint) return false;

    const task = getTask(taskIdRef.current);
    if (!task) return false;

    // 只有暂停或失败的任务且有检查点才可恢复
    return (
      (task.state === DataFlowState.PAUSED || task.state === DataFlowState.FAILED) &&
      checkpoint.batchIndex > 0 &&
      checkpoint.batchIndex < task.progress.total
    );
  }, [getLatestCheckpoint, getTask, taskIdRef.current]);

  /**
   * 获取恢复信息
   */
  const getResumeInfo = useCallback(() => {
    if (!taskIdRef.current) return null;
    const checkpoint = getLatestCheckpoint(taskIdRef.current);
    if (!checkpoint) return null;

    return {
      batchIndex: checkpoint.batchIndex,
      processed: checkpoint.lastProcessedIndex || 0,
      successful: checkpoint.successCount || 0,
      failed: checkpoint.failedCount || 0,
    };
  }, [getLatestCheckpoint, taskIdRef.current]);

  /**
   * 从检查点恢复
   * 返回恢复的起始位置信息
   */
  const resumeFromCheckpoint = useCallback(() => {
    if (!taskIdRef.current) {
      console.warn("[DataFlowImporter] 无任务ID,无法恢复");
      return null;
    }

    const checkpoint = getLatestCheckpoint(taskIdRef.current);
    if (!checkpoint) {
      console.warn("[DataFlowImporter] 无检查点数据,无法恢复");
      return null;
    }

    const task = getTask(taskIdRef.current);
    if (!task) {
      console.warn("[DataFlowImporter] 任务不存在");
      return null;
    }

    const batchSize = task.context.config?.batchSize || 50;
    const startBatch = checkpoint.batchIndex; // 从检查点批次继续
    const skipCount = checkpoint.lastProcessedIndex || 0; // 跳过已处理记录

    console.log(`[DataFlowImporter] 从检查点恢复: 批次=${startBatch}, 跳过=${skipCount}`);

    // 更新任务进度为检查点状态
    updateProgress({
      processed: checkpoint.lastProcessedIndex || 0,
      successful: checkpoint.successCount || 0,
      failed: checkpoint.failedCount || 0,
    });

    return {
      startBatch,
      skipCount,
    };
  }, [getLatestCheckpoint, getTask, taskIdRef.current, updateProgress]);

  return {
    taskId: taskIdRef.current,
    isActive,
    canPause,
    canResume,
    canCancel,
    state: currentState,
    progress,
    createImportTask,
    startImport,
    pauseImport,
    resumeImport,
    cancelImport,
    updateProgress,
    saveCheckpoint,
    getLastCheckpoint,
    hasResumableCheckpoint,
    getResumeInfo,
    resumeFromCheckpoint,
    addError,
    addWarning,
  };
};
