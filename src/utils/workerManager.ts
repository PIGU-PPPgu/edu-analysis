// Web Worker管理器 - 处理大文件解析的性能优化
// 提供简单的API来使用Web Worker，避免UI卡顿

import type { 
  WorkerMessage, 
  ParseFileRequest, 
  ParseProgress, 
  ParseResult 
} from '../workers/fileProcessor.worker';

export interface WorkerManagerOptions {
  maxWorkers?: number;
  workerTimeout?: number; // 毫秒
  retryAttempts?: number;
}

export interface FileProcessorConfig {
  file: File;
  options?: {
    sheetName?: string;
    encoding?: string;
    delimiter?: string;
    chunkSize?: number;
  };
  onProgress?: (progress: ParseProgress) => void;
  onComplete?: (result: ParseResult) => void;
  onError?: (error: string) => void;
}

export class WorkerManager {
  private workers: Worker[] = [];
  private activeJobs = new Map<number, {
    worker: Worker;
    resolve: (result: ParseResult) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
    onProgress?: (progress: ParseProgress) => void;
  }>();
  private jobIdCounter = 0;
  private options: Required<WorkerManagerOptions>;

  constructor(options: WorkerManagerOptions = {}) {
    this.options = {
      maxWorkers: options.maxWorkers || Math.min(4, navigator.hardwareConcurrency || 2),
      workerTimeout: options.workerTimeout || 300000, // 5分钟
      retryAttempts: options.retryAttempts || 3
    };
  }

  /**
   * 处理文件解析任务
   */
  async processFile(config: FileProcessorConfig): Promise<ParseResult> {
    const { file, options = {}, onProgress, onComplete, onError } = config;

    return new Promise((resolve, reject) => {
      this.createJob({
        file,
        options,
        onProgress,
        onComplete: (result) => {
          onComplete?.(result);
          resolve(result);
        },
        onError: (error) => {
          onError?.(error);
          reject(new Error(error));
        }
      });
    });
  }

  /**
   * 批量处理多个文件
   */
  async processFiles(configs: FileProcessorConfig[]): Promise<ParseResult[]> {
    const promises = configs.map(config => this.processFile(config));
    return Promise.all(promises);
  }

  /**
   * 获取可用的Worker或创建新的
   */
  private getAvailableWorker(): Worker {
    // 查找空闲的Worker
    for (const worker of this.workers) {
      const isActive = Array.from(this.activeJobs.values()).some(job => job.worker === worker);
      if (!isActive) {
        return worker;
      }
    }

    // 如果没有空闲Worker且未达到最大数量，创建新的
    if (this.workers.length < this.options.maxWorkers) {
      const worker = this.createWorker();
      this.workers.push(worker);
      return worker;
    }

    // 等待第一个完成的Worker
    throw new Error('所有Worker都在忙碌中，请稍后重试');
  }

  /**
   * 创建新的Worker实例
   */
  private createWorker(): Worker {
    try {
      // 尝试使用模块化Worker
      const worker = new Worker(
        new URL('../workers/fileProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // 添加错误处理
      worker.onerror = (error) => {
        console.error('Worker错误:', error);
        this.handleWorkerError(worker, error.message || 'Worker执行错误');
      };

      worker.onmessageerror = (error) => {
        console.error('Worker消息错误:', error);
        this.handleWorkerError(worker, 'Worker消息传递错误');
      };

      return worker;
    } catch (error) {
      // 降级处理：创建内联Worker
      console.warn('无法创建模块化Worker，使用降级方案');
      return this.createInlineWorker();
    }
  }

  /**
   * 创建内联Worker（降级方案）
   */
  private createInlineWorker(): Worker {
    // 创建一个简单的内联Worker作为降级方案
    const workerCode = `
      self.onmessage = function(e) {
        const { type, payload } = e.data;
        
        if (type === 'PARSE_FILE') {
          // 简化的同步处理逻辑
          try {
            self.postMessage({
              type: 'PARSE_PROGRESS',
              payload: { phase: 'parsing', progress: 50, message: '正在处理文件...' }
            });
            
            // 这里应该是实际的解析逻辑
            // 为了降级兼容，返回基本结果
            setTimeout(() => {
              self.postMessage({
                type: 'PARSE_COMPLETE',
                payload: {
                  success: false,
                  data: [],
                  headers: [],
                  metadata: {
                    fileName: payload.fileName,
                    fileSize: 0,
                    totalRows: 0,
                    totalColumns: 0,
                    parseTime: 0
                  },
                  errors: ['Worker降级模式：请使用现代浏览器获得最佳性能'],
                  warnings: []
                }
              });
            }, 1000);
          } catch (error) {
            self.postMessage({
              type: 'PARSE_ERROR',
              payload: { error: error.message }
            });
          }
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  /**
   * 创建处理任务
   */
  private createJob(config: FileProcessorConfig): void {
    const jobId = ++this.jobIdCounter;
    
    try {
      const worker = this.getAvailableWorker();
      
      const job = {
        worker,
        resolve: config.onComplete!,
        reject: (error: Error) => config.onError?.(error.message),
        onProgress: config.onProgress,
        timeout: setTimeout(() => {
          this.handleJobTimeout(jobId);
        }, this.options.workerTimeout)
      };

      this.activeJobs.set(jobId, job);

      // 设置消息处理
      const messageHandler = (e: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(jobId, e.data);
      };

      worker.addEventListener('message', messageHandler);

      // 准备文件数据
      this.prepareFileData(config.file).then(buffer => {
        const request: ParseFileRequest = {
          file: buffer,
          fileName: config.file.name,
          fileType: this.detectFileType(config.file),
          options: config.options
        };

        worker.postMessage({
          type: 'PARSE_FILE',
          payload: request
        } as WorkerMessage);
      }).catch(error => {
        this.handleJobError(jobId, error.message);
      });

    } catch (error) {
      config.onError?.(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(jobId: number, message: WorkerMessage): void {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    switch (message.type) {
      case 'PARSE_PROGRESS':
        job.onProgress?.(message.payload as ParseProgress);
        break;

      case 'PARSE_COMPLETE':
        this.completeJob(jobId, message.payload as ParseResult);
        break;

      case 'PARSE_ERROR':
        this.handleJobError(jobId, message.payload.error);
        break;
    }
  }

  /**
   * 完成任务
   */
  private completeJob(jobId: number, result: ParseResult): void {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    // 清理
    if (job.timeout) {
      clearTimeout(job.timeout);
    }
    this.activeJobs.delete(jobId);

    // 移除事件监听器
    job.worker.removeEventListener('message', this.handleWorkerMessage.bind(this, jobId));

    // 完成回调
    job.resolve(result);
  }

  /**
   * 处理任务错误
   */
  private handleJobError(jobId: number, error: string): void {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    // 清理
    if (job.timeout) {
      clearTimeout(job.timeout);
    }
    this.activeJobs.delete(jobId);

    // 错误回调
    job.reject(new Error(error));
  }

  /**
   * 处理任务超时
   */
  private handleJobTimeout(jobId: number): void {
    this.handleJobError(jobId, `任务超时 (${this.options.workerTimeout}ms)`);
  }

  /**
   * 处理Worker错误
   */
  private handleWorkerError(worker: Worker, error: string): void {
    // 找到使用此Worker的所有任务并标记为失败
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.worker === worker) {
        this.handleJobError(jobId, `Worker错误: ${error}`);
      }
    }

    // 移除损坏的Worker
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      worker.terminate();
    }
  }

  /**
   * 将文件转换为ArrayBuffer
   */
  private async prepareFileData(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 检测文件类型
   */
  private detectFileType(file: File): 'excel' | 'csv' {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return 'excel';
    }
    return 'csv';
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    // 终止所有正在进行的任务
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.timeout) {
        clearTimeout(job.timeout);
      }
      job.reject(new Error('WorkerManager被销毁'));
    }
    this.activeJobs.clear();

    // 终止所有Worker
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    totalWorkers: number;
    activeJobs: number;
    maxWorkers: number;
  } {
    return {
      totalWorkers: this.workers.length,
      activeJobs: this.activeJobs.size,
      maxWorkers: this.options.maxWorkers
    };
  }
}

// 全局实例
let globalWorkerManager: WorkerManager | null = null;

/**
 * 获取全局WorkerManager实例
 */
export function getWorkerManager(): WorkerManager {
  if (!globalWorkerManager) {
    globalWorkerManager = new WorkerManager({
      maxWorkers: Math.min(4, navigator.hardwareConcurrency || 2),
      workerTimeout: 300000, // 5分钟
      retryAttempts: 3
    });
  }
  return globalWorkerManager;
}

/**
 * 简化的文件处理函数
 */
export async function processFileWithWorker(
  file: File,
  options: {
    onProgress?: (progress: ParseProgress) => void;
    sheetName?: string;
    encoding?: string;
  } = {}
): Promise<ParseResult> {
  const manager = getWorkerManager();
  return manager.processFile({
    file,
    options,
    onProgress: options.onProgress
  });
}

/**
 * 检查浏览器是否支持Web Workers
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * 检查文件是否适合Worker处理
 */
export function shouldUseWorker(file: File): boolean {
  // 大于1MB的文件建议使用Worker
  return file.size > 1024 * 1024 && isWorkerSupported();
}