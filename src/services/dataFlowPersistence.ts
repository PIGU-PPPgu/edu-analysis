/**
 * 数据流持久化服务
 *
 * 使用IndexedDB存储任务状态,支持断点续传
 *
 * 设计原则:
 * - 简洁: 单一职责,只负责存储和读取
 * - 高效: 批量操作,索引优化
 * - 可靠: 完善的错误处理和降级方案
 */

import { DataFlowTask, Checkpoint } from "@/types/dataFlow";

/**
 * 数据库配置
 */
const DB_NAME = "DataFlowDB";
const DB_VERSION = 1;
const STORE_TASKS = "tasks";
const STORE_CHECKPOINTS = "checkpoints";

/**
 * 持久化服务类
 */
export class DataFlowPersistence {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    // 避免重复初始化
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[Persistence] 打开数据库失败:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("[Persistence] 数据库初始化成功");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建任务存储
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
          const taskStore = db.createObjectStore(STORE_TASKS, {
            keyPath: "id",
          });
          taskStore.createIndex("state", "state", { unique: false });
          taskStore.createIndex("type", "type", { unique: false });
          taskStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // 创建检查点存储
        if (!db.objectStoreNames.contains(STORE_CHECKPOINTS)) {
          const checkpointStore = db.createObjectStore(STORE_CHECKPOINTS, {
            keyPath: "id",
          });
          checkpointStore.createIndex("taskId", "taskId", { unique: false });
          checkpointStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
        }

        console.log("[Persistence] 数据库结构创建成功");
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("数据库初始化失败");
    }
    return this.db;
  }

  /**
   * 保存任务
   */
  async saveTask(task: DataFlowTask): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_TASKS], "readwrite");
      const store = transaction.objectStore(STORE_TASKS);
      const request = store.put(task);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 批量保存任务 (性能优化)
   */
  async saveTasks(tasks: DataFlowTask[]): Promise<void> {
    if (tasks.length === 0) return;

    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_TASKS], "readwrite");
      const store = transaction.objectStore(STORE_TASKS);

      // 批量添加
      tasks.forEach((task) => {
        store.put(task);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 加载任务
   */
  async loadTask(taskId: string): Promise<DataFlowTask | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_TASKS], "readonly");
      const store = transaction.objectStore(STORE_TASKS);
      const request = store.get(taskId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 加载所有任务
   */
  async loadAllTasks(): Promise<DataFlowTask[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_TASKS], "readonly");
      const store = transaction.objectStore(STORE_TASKS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_TASKS], "readwrite");
      const store = transaction.objectStore(STORE_TASKS);
      const request = store.delete(taskId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存检查点
   */
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHECKPOINTS], "readwrite");
      const store = transaction.objectStore(STORE_CHECKPOINTS);
      const request = store.put(checkpoint);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取任务的所有检查点
   */
  async getCheckpoints(taskId: string): Promise<Checkpoint[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHECKPOINTS], "readonly");
      const store = transaction.objectStore(STORE_CHECKPOINTS);
      const index = store.index("taskId");
      const request = index.getAll(taskId);

      request.onsuccess = () => {
        // 按时间戳排序
        const checkpoints = request.result.sort(
          (a, b) => a.timestamp - b.timestamp
        );
        resolve(checkpoints);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清理过期数据
   */
  async cleanup(olderThan: Date): Promise<number> {
    const db = await this.ensureDB();
    const timestamp = olderThan.getTime();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_TASKS, STORE_CHECKPOINTS],
        "readwrite"
      );

      // 清理任务
      const taskStore = transaction.objectStore(STORE_TASKS);
      const taskRequest = taskStore.openCursor();

      taskRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const task = cursor.value as DataFlowTask;
          // 只删除已完成且过期的任务
          if (
            task.completedAt &&
            task.completedAt < timestamp &&
            (task.state === "completed" ||
              task.state === "failed" ||
              task.state === "cancelled")
          ) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };

      // 清理检查点 (关联的任务被删除时)
      const checkpointStore = transaction.objectStore(STORE_CHECKPOINTS);
      const checkpointRequest = checkpointStore.openCursor();

      checkpointRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const checkpoint = cursor.value as Checkpoint;
          if (checkpoint.timestamp < timestamp) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`[Persistence] 清理了 ${deletedCount} 个过期任务`);
        resolve(deletedCount);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 获取数据库统计
   */
  async getStats(): Promise<{
    totalTasks: number;
    totalCheckpoints: number;
    dbSize?: number;
  }> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_TASKS, STORE_CHECKPOINTS],
        "readonly"
      );

      let totalTasks = 0;
      let totalCheckpoints = 0;

      const taskStore = transaction.objectStore(STORE_TASKS);
      const taskCountRequest = taskStore.count();

      taskCountRequest.onsuccess = () => {
        totalTasks = taskCountRequest.result;
      };

      const checkpointStore = transaction.objectStore(STORE_CHECKPOINTS);
      const checkpointCountRequest = checkpointStore.count();

      checkpointCountRequest.onsuccess = () => {
        totalCheckpoints = checkpointCountRequest.result;
      };

      transaction.oncomplete = () => {
        resolve({ totalTasks, totalCheckpoints });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 导出所有数据 (用于备份)
   */
  async exportData(): Promise<{
    tasks: DataFlowTask[];
    checkpoints: Checkpoint[];
  }> {
    const tasks = await this.loadAllTasks();
    const db = await this.ensureDB();

    const checkpoints = await new Promise<Checkpoint[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_CHECKPOINTS], "readonly");
      const store = transaction.objectStore(STORE_CHECKPOINTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return { tasks, checkpoints };
  }

  /**
   * 导入数据 (用于恢复)
   */
  async importData(data: {
    tasks: DataFlowTask[];
    checkpoints: Checkpoint[];
  }): Promise<void> {
    await this.saveTasks(data.tasks);

    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHECKPOINTS], "readwrite");
      const store = transaction.objectStore(STORE_CHECKPOINTS);

      data.checkpoints.forEach((checkpoint) => {
        store.put(checkpoint);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log("[Persistence] 数据库连接已关闭");
    }
  }
}

/**
 * 单例实例
 */
export const dataFlowPersistence = new DataFlowPersistence();
