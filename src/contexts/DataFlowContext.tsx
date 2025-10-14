/**
 * 全局数据流管理Context
 *
 * 提供统一的数据导入、处理任务管理
 * 支持状态持久化、断点续传、任务队列
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { toast } from "sonner";
import {
  DataFlowTask,
  DataFlowState,
  TaskType,
  TaskCreationConfig,
  TaskProgress,
  Checkpoint,
  DetailedError,
  canTransitionTo,
  TaskUpdateEvent,
} from "@/types/dataFlow";
import { dataFlowPersistence } from "@/services/dataFlowPersistence";

/**
 * Context类型定义
 */
interface DataFlowContextType {
  // 任务管理
  tasks: Map<string, DataFlowTask>;
  createTask: (config: TaskCreationConfig) => string;
  startTask: (taskId: string) => Promise<void>;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  // 状态管理
  getTask: (taskId: string) => DataFlowTask | undefined;
  getTaskState: (taskId: string) => DataFlowState | undefined;
  getTaskProgress: (taskId: string) => TaskProgress | undefined;
  updateTaskState: (taskId: string, newState: DataFlowState) => void;
  updateTaskProgress: (taskId: string, progress: Partial<TaskProgress>) => void;

  // 检查点管理
  saveCheckpoint: (taskId: string, checkpoint: Checkpoint) => void;
  getLatestCheckpoint: (taskId: string) => Checkpoint | undefined;

  // 错误管理
  addError: (taskId: string, error: DetailedError) => void;
  addWarning: (taskId: string, warning: string) => void;

  // 队列管理
  queuedTasks: string[]; // 队列中的任务ID
  activeTasks: string[]; // 正在执行的任务ID
  completedTasks: string[]; // 已完成的任务ID

  // 事件订阅
  subscribe: (callback: (event: TaskUpdateEvent) => void) => () => void;
}

/**
 * 创建Context
 */
const DataFlowContext = createContext<DataFlowContextType | undefined>(
  undefined
);

/**
 * Provider组件
 */
export const DataFlowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tasks, setTasks] = useState<Map<string, DataFlowTask>>(new Map());
  const [isHydrated, setIsHydrated] = useState(false);
  const subscribersRef = useRef<Set<(event: TaskUpdateEvent) => void>>(
    new Set()
  );
  const persistenceQueueRef = useRef<Set<string>>(new Set());

  /**
   * 发布事件给订阅者
   */
  const publishEvent = useCallback((event: TaskUpdateEvent) => {
    subscribersRef.current.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("[DataFlow] 订阅者回调错误:", error);
      }
    });
  }, []);

  /**
   * 事件订阅
   */
  const subscribe = useCallback(
    (callback: (event: TaskUpdateEvent) => void) => {
      subscribersRef.current.add(callback);
      return () => {
        subscribersRef.current.delete(callback);
      };
    },
    []
  );

  /**
   * 持久化任务 (防抖,避免频繁写入)
   */
  const persistTask = useCallback(async (taskId: string) => {
    persistenceQueueRef.current.add(taskId);
  }, []);

  /**
   * 批量持久化 (每秒执行一次)
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (persistenceQueueRef.current.size === 0) return;

      const taskIds = Array.from(persistenceQueueRef.current);
      persistenceQueueRef.current.clear();

      const tasksToSave = taskIds
        .map((id) => tasks.get(id))
        .filter((task): task is DataFlowTask => task !== undefined);

      if (tasksToSave.length > 0) {
        try {
          await dataFlowPersistence.saveTasks(tasksToSave);
        } catch (error) {
          console.error("[DataFlow] 批量持久化失败:", error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  /**
   * 初始化: 从IndexedDB加载任务
   */
  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        await dataFlowPersistence.init();
        const savedTasks = await dataFlowPersistence.loadAllTasks();

        if (!mounted) return;

        const taskMap = new Map<string, DataFlowTask>();
        savedTasks.forEach((task) => {
          taskMap.set(task.id, task);
        });

        setTasks(taskMap);
        setIsHydrated(true);

        console.log(`[DataFlow] 从持久化加载了 ${savedTasks.length} 个任务`);
      } catch (error) {
        console.error("[DataFlow] 加载任务失败:", error);
        setIsHydrated(true); // 即使失败也标记为已加载,避免阻塞
      }
    };

    loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * 生成任务ID
   */
  const generateTaskId = useCallback((): string => {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * 创建新任务
   */
  const createTask = useCallback(
    (config: TaskCreationConfig): string => {
      const taskId = generateTaskId();
      const now = Date.now();

      const newTask: DataFlowTask = {
        id: taskId,
        type: config.type,
        state: DataFlowState.IDLE,
        progress: {
          total: config.data.length,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          percentage: 0,
        },
        context: {
          config: config.context.config || {
            batchSize: 50,
            createMissingRecords: true,
            updateExistingData: true,
            skipDuplicates: true,
            enableBackup: true,
            enableRollback: true,
            parallelImport: false,
            strictMode: false,
          },
          ...config.context,
        },
        checkpoints: [],
        errors: [],
        warnings: [],
        createdAt: now,
        updatedAt: now,
        resumable: true,
        canRetry: true,
      };

      setTasks((prev) => {
        const updated = new Map(prev);
        updated.set(taskId, newTask);
        return updated;
      });

      // 持久化任务
      persistTask(taskId);

      publishEvent({
        taskId,
        type: "state",
        data: { state: DataFlowState.IDLE },
        timestamp: now,
      });

      toast.success("任务已创建", {
        description: `任务ID: ${taskId.substring(0, 12)}...`,
      });

      // 自动开始
      if (config.autoStart) {
        setTimeout(() => startTask(taskId), 100);
      }

      return taskId;
    },
    [generateTaskId, publishEvent]
  );

  /**
   * 更新任务状态
   */
  const updateTaskState = useCallback(
    (taskId: string, newState: DataFlowState) => {
      setTasks((prev) => {
        const task = prev.get(taskId);
        if (!task) {
          console.warn(`[DataFlow] 任务不存在: ${taskId}`);
          return prev;
        }

        // 验证状态转换
        if (!canTransitionTo(task.state, newState)) {
          console.error(`[DataFlow] 非法状态转换: ${task.state} → ${newState}`);
          toast.error("状态转换失败", {
            description: `无法从 ${task.state} 转换到 ${newState}`,
          });
          return prev;
        }

        const updated = new Map(prev);
        const updatedTask = {
          ...task,
          state: newState,
          updatedAt: Date.now(),
        };

        // 更新时间戳
        if (newState === DataFlowState.PROCESSING && !task.startedAt) {
          updatedTask.startedAt = Date.now();
        }
        if (newState === DataFlowState.PAUSED) {
          updatedTask.pausedAt = Date.now();
        }
        if (
          newState === DataFlowState.COMPLETED ||
          newState === DataFlowState.FAILED ||
          newState === DataFlowState.CANCELLED
        ) {
          updatedTask.completedAt = Date.now();
        }

        updated.set(taskId, updatedTask);

        // 持久化更新
        persistTask(taskId);

        publishEvent({
          taskId,
          type: "state",
          data: { state: newState },
          timestamp: Date.now(),
        });

        return updated;
      });
    },
    [publishEvent]
  );

  /**
   * 更新任务进度
   */
  const updateTaskProgress = useCallback(
    (taskId: string, progressUpdate: Partial<TaskProgress>) => {
      setTasks((prev) => {
        const task = prev.get(taskId);
        if (!task) return prev;

        const updated = new Map(prev);
        const updatedProgress = {
          ...task.progress,
          ...progressUpdate,
        };

        // 自动计算百分比
        if (updatedProgress.total > 0) {
          updatedProgress.percentage = Math.round(
            (updatedProgress.processed / updatedProgress.total) * 100
          );
        }

        // 计算处理速率
        if (task.startedAt) {
          const elapsedSeconds = (Date.now() - task.startedAt) / 1000;
          if (elapsedSeconds > 0) {
            updatedProgress.processingRate =
              updatedProgress.processed / elapsedSeconds;

            // 估算剩余时间
            if (updatedProgress.processingRate > 0) {
              const remaining =
                updatedProgress.total - updatedProgress.processed;
              updatedProgress.estimatedTimeRemaining = Math.round(
                remaining / updatedProgress.processingRate
              );
            }
          }
        }

        const updatedTask = {
          ...task,
          progress: updatedProgress,
          updatedAt: Date.now(),
        };

        updated.set(taskId, updatedTask);

        // 持久化进度更新
        persistTask(taskId);

        publishEvent({
          taskId,
          type: "progress",
          data: updatedProgress,
          timestamp: Date.now(),
        });

        return updated;
      });
    },
    [publishEvent]
  );

  /**
   * 保存检查点
   */
  const saveCheckpoint = useCallback(
    async (taskId: string, checkpoint: Checkpoint) => {
      setTasks((prev) => {
        const task = prev.get(taskId);
        if (!task) return prev;

        const updated = new Map(prev);
        const updatedTask = {
          ...task,
          checkpoints: [...task.checkpoints, checkpoint],
          updatedAt: Date.now(),
        };

        updated.set(taskId, updatedTask);

        // 持久化检查点
        dataFlowPersistence
          .saveCheckpoint(checkpoint)
          .catch((err) => console.error("[DataFlow] 检查点持久化失败:", err));

        // 持久化任务更新
        persistTask(taskId);

        publishEvent({
          taskId,
          type: "checkpoint",
          data: checkpoint,
          timestamp: Date.now(),
        });

        console.log(
          `[DataFlow] 检查点已保存: 任务${taskId}, 批次${checkpoint.batchIndex}`
        );

        return updated;
      });
    },
    [publishEvent]
  );

  /**
   * 获取最新检查点
   */
  const getLatestCheckpoint = useCallback(
    (taskId: string): Checkpoint | undefined => {
      const task = tasks.get(taskId);
      if (!task || task.checkpoints.length === 0) return undefined;
      return task.checkpoints[task.checkpoints.length - 1];
    },
    [tasks]
  );

  /**
   * 添加错误
   */
  const addError = useCallback(
    (taskId: string, error: DetailedError) => {
      setTasks((prev) => {
        const task = prev.get(taskId);
        if (!task) return prev;

        const updated = new Map(prev);
        const updatedTask = {
          ...task,
          errors: [...task.errors, error],
          updatedAt: Date.now(),
        };

        updated.set(taskId, updatedTask);

        publishEvent({
          taskId,
          type: "error",
          data: error,
          timestamp: Date.now(),
        });

        return updated;
      });
    },
    [publishEvent]
  );

  /**
   * 添加警告
   */
  const addWarning = useCallback((taskId: string, warning: string) => {
    setTasks((prev) => {
      const task = prev.get(taskId);
      if (!task) return prev;

      const updated = new Map(prev);
      const updatedTask = {
        ...task,
        warnings: [...task.warnings, warning],
        updatedAt: Date.now(),
      };

      updated.set(taskId, updatedTask);
      return updated;
    });
  }, []);

  /**
   * 开始任务 (占位实现,具体逻辑在Task执行器中)
   */
  const startTask = useCallback(
    async (taskId: string) => {
      const task = tasks.get(taskId);
      if (!task) {
        toast.error("任务不存在");
        return;
      }

      if (task.state !== DataFlowState.IDLE) {
        toast.warning("任务已在运行或已完成");
        return;
      }

      updateTaskState(taskId, DataFlowState.QUEUED);
      toast.info("任务已加入队列", {
        description: "等待执行中...",
      });

      // TODO: 实际的任务执行逻辑将在TaskExecutor中实现
    },
    [tasks, updateTaskState]
  );

  /**
   * 暂停任务
   */
  const pauseTask = useCallback(
    (taskId: string) => {
      const task = tasks.get(taskId);
      if (!task) return;

      if (task.state !== DataFlowState.PROCESSING) {
        toast.warning("只能暂停正在执行的任务");
        return;
      }

      updateTaskState(taskId, DataFlowState.PAUSED);
      toast.info("任务已暂停");
    },
    [tasks, updateTaskState]
  );

  /**
   * 恢复任务
   */
  const resumeTask = useCallback(
    async (taskId: string) => {
      const task = tasks.get(taskId);
      if (!task) return;

      if (task.state !== DataFlowState.PAUSED) {
        toast.warning("只能恢复已暂停的任务");
        return;
      }

      updateTaskState(taskId, DataFlowState.RESUMING);
      toast.info("任务恢复中...");

      // TODO: 实际恢复逻辑
    },
    [tasks, updateTaskState]
  );

  /**
   * 取消任务
   */
  const cancelTask = useCallback(
    (taskId: string) => {
      const task = tasks.get(taskId);
      if (!task) return;

      if (
        task.state === DataFlowState.COMPLETED ||
        task.state === DataFlowState.FAILED ||
        task.state === DataFlowState.CANCELLED
      ) {
        toast.warning("任务已结束,无法取消");
        return;
      }

      updateTaskState(taskId, DataFlowState.CANCELLED);
      toast.warning("任务已取消");
    },
    [tasks, updateTaskState]
  );

  /**
   * 删除任务
   */
  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => {
      const updated = new Map(prev);
      updated.delete(taskId);
      return updated;
    });

    // 从IndexedDB删除
    try {
      await dataFlowPersistence.deleteTask(taskId);
    } catch (error) {
      console.error("[DataFlow] 删除任务持久化数据失败:", error);
    }

    toast.success("任务已删除");
  }, []);

  /**
   * 获取任务
   */
  const getTask = useCallback(
    (taskId: string) => {
      return tasks.get(taskId);
    },
    [tasks]
  );

  /**
   * 获取任务状态
   */
  const getTaskState = useCallback(
    (taskId: string) => {
      return tasks.get(taskId)?.state;
    },
    [tasks]
  );

  /**
   * 获取任务进度
   */
  const getTaskProgress = useCallback(
    (taskId: string) => {
      return tasks.get(taskId)?.progress;
    },
    [tasks]
  );

  /**
   * 计算队列中的任务
   */
  const queuedTasks = Array.from(tasks.values())
    .filter((task) => task.state === DataFlowState.QUEUED)
    .map((task) => task.id);

  /**
   * 计算活跃任务
   */
  const activeTasks = Array.from(tasks.values())
    .filter(
      (task) =>
        task.state === DataFlowState.PROCESSING ||
        task.state === DataFlowState.VALIDATING ||
        task.state === DataFlowState.PREPARING ||
        task.state === DataFlowState.RESUMING
    )
    .map((task) => task.id);

  /**
   * 计算已完成任务
   */
  const completedTasks = Array.from(tasks.values())
    .filter(
      (task) =>
        task.state === DataFlowState.COMPLETED ||
        task.state === DataFlowState.FAILED ||
        task.state === DataFlowState.CANCELLED
    )
    .map((task) => task.id);

  /**
   * 清理旧任务 (保留最近7天)
   */
  useEffect(() => {
    const cleanupInterval = setInterval(
      async () => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        setTasks((prev) => {
          const updated = new Map(prev);
          let cleanedCount = 0;

          for (const [taskId, task] of updated.entries()) {
            // 只清理已完成且超过7天的任务
            if (
              (task.state === DataFlowState.COMPLETED ||
                task.state === DataFlowState.FAILED ||
                task.state === DataFlowState.CANCELLED) &&
              task.completedAt &&
              task.completedAt < sevenDaysAgo
            ) {
              updated.delete(taskId);
              cleanedCount++;
            }
          }

          if (cleanedCount > 0) {
            console.log(`[DataFlow] 清理了 ${cleanedCount} 个旧任务`);
          }

          return updated;
        });

        // 同时清理IndexedDB中的过期数据
        try {
          const deletedCount = await dataFlowPersistence.cleanup(
            new Date(sevenDaysAgo)
          );
          if (deletedCount > 0) {
            console.log(
              `[DataFlow] IndexedDB清理了 ${deletedCount} 条过期记录`
            );
          }
        } catch (error) {
          console.error("[DataFlow] IndexedDB清理失败:", error);
        }
      },
      60 * 60 * 1000
    ); // 每小时检查一次

    return () => clearInterval(cleanupInterval);
  }, []);

  const value: DataFlowContextType = {
    tasks,
    createTask,
    startTask,
    pauseTask,
    resumeTask,
    cancelTask,
    deleteTask,
    getTask,
    getTaskState,
    getTaskProgress,
    updateTaskState,
    updateTaskProgress,
    saveCheckpoint,
    getLatestCheckpoint,
    addError,
    addWarning,
    queuedTasks,
    activeTasks,
    completedTasks,
    subscribe,
  };

  return (
    <DataFlowContext.Provider value={value}>
      {children}
    </DataFlowContext.Provider>
  );
};

/**
 * Hook - 使用DataFlow Context
 */
export const useDataFlow = (): DataFlowContextType => {
  const context = useContext(DataFlowContext);
  if (!context) {
    throw new Error("useDataFlow must be used within DataFlowProvider");
  }
  return context;
};

/**
 * Hook - 获取特定任务的状态和操作
 */
export const useTask = (taskId: string | undefined) => {
  const context = useDataFlow();

  if (!taskId) {
    return {
      task: undefined,
      state: undefined,
      progress: undefined,
      start: () => {},
      pause: () => {},
      resume: () => {},
      cancel: () => {},
    };
  }

  const task = context.getTask(taskId);

  return {
    task,
    state: task?.state,
    progress: task?.progress,
    start: () => context.startTask(taskId),
    pause: () => context.pauseTask(taskId),
    resume: () => context.resumeTask(taskId),
    cancel: () => context.cancelTask(taskId),
  };
};
