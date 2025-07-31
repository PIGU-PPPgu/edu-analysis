/**
 * 高级分析性能优化服务
 * 专门针对大数据集、复杂计算和多图表渲染的优化
 */

import { useState, useEffect } from "react";
import { memoize, debounce, throttle } from "lodash-es";

/**
 * 性能优化配置
 */
export interface PerformanceConfig {
  // 虚拟化配置
  virtualization: {
    enabled: boolean;
    itemHeight: number;
    overscan: number;
    bufferSize: number;
    scrollDebounceMs: number;
  };
  // 计算缓存配置
  cache: {
    enabled: boolean;
    maxSize: number; // MB
    ttl: number; // 毫秒
    strategy: "lru" | "lfu" | "ttl";
  };
  // 渲染优化配置
  rendering: {
    batchSize: number;
    frameDelay: number;
    priorityThreshold: number;
    useCanvas: boolean;
  };
  // Worker配置
  worker: {
    enabled: boolean;
    maxWorkers: number;
    taskTimeout: number;
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PerformanceConfig = {
  virtualization: {
    enabled: true,
    itemHeight: 60,
    overscan: 5,
    bufferSize: 100,
    scrollDebounceMs: 16,
  },
  cache: {
    enabled: true,
    maxSize: 50, // 50MB
    ttl: 5 * 60 * 1000, // 5分钟
    strategy: "lru",
  },
  rendering: {
    batchSize: 20,
    frameDelay: 16, // 60fps
    priorityThreshold: 0.7,
    useCanvas: false,
  },
  worker: {
    enabled: true,
    maxWorkers: navigator.hardwareConcurrency || 4,
    taskTimeout: 30000,
  },
};

/**
 * 计算任务接口
 */
export interface ComputeTask<T = any, R = any> {
  id: string;
  type: "statistics" | "correlation" | "regression" | "clustering" | "custom";
  data: T;
  priority: number;
  callback?: (result: R) => void;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  renderTime: number;
  computeTime: number;
  memoryUsage: number;
  fps: number;
  cacheHitRate: number;
  workerUtilization: number;
}

/**
 * 高级分析性能优化器
 */
export class AdvancedAnalysisOptimizer {
  private config: PerformanceConfig;
  private cache: Map<string, any>;
  private cacheMetadata: Map<
    string,
    { size: number; timestamp: number; hits: number }
  >;
  private workers: Worker[];
  private taskQueue: ComputeTask[];
  private performanceObserver?: PerformanceObserver;
  private rafHandle?: number;
  private metrics: PerformanceMetrics;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.cacheMetadata = new Map();
    this.workers = [];
    this.taskQueue = [];
    this.metrics = {
      renderTime: 0,
      computeTime: 0,
      memoryUsage: 0,
      fps: 60,
      cacheHitRate: 0,
      workerUtilization: 0,
    };

    this.initializeWorkers();
    this.setupPerformanceMonitoring();
  }

  /**
   * 初始化Web Workers
   */
  private initializeWorkers(): void {
    if (!this.config.worker.enabled) return;

    const workerCount = Math.min(
      this.config.worker.maxWorkers,
      this.taskQueue.length
    );

    for (let i = 0; i < workerCount; i++) {
      const worker = this.createAnalysisWorker();
      this.workers.push(worker);
    }
  }

  /**
   * 创建分析专用Worker
   */
  private createAnalysisWorker(): Worker {
    const workerCode = `
      // 统计计算函数
      function calculateStatistics(data) {
        const numbers = data.filter(d => typeof d === 'number' && !isNaN(d));
        const n = numbers.length;
        
        if (n === 0) return null;
        
        // 排序用于计算中位数和四分位数
        const sorted = [...numbers].sort((a, b) => a - b);
        
        // 基础统计
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        // 标准差
        const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        // 中位数
        const median = n % 2 === 0 
          ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
          : sorted[Math.floor(n/2)];
        
        // 四分位数
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        const iqr = q3 - q1;
        
        // 异常值
        const outliers = numbers.filter(x => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr);
        
        return {
          count: n,
          sum,
          mean,
          median,
          stdDev,
          variance,
          min: sorted[0],
          max: sorted[n - 1],
          q1,
          q3,
          iqr,
          outliers,
          skewness: calculateSkewness(numbers, mean, stdDev),
          kurtosis: calculateKurtosis(numbers, mean, stdDev),
        };
      }
      
      function calculateSkewness(data, mean, stdDev) {
        if (stdDev === 0) return 0;
        const n = data.length;
        const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
        return (n / ((n - 1) * (n - 2))) * sum;
      }
      
      function calculateKurtosis(data, mean, stdDev) {
        if (stdDev === 0) return 0;
        const n = data.length;
        const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
        return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
               (3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)));
      }
      
      // 相关性计算
      function calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return null;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
        const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
        const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
      }
      
      // 消息处理
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          const startTime = performance.now();
          
          switch (type) {
            case 'statistics':
              result = calculateStatistics(data);
              break;
              
            case 'correlation':
              result = calculateCorrelation(data.x, data.y);
              break;
              
            case 'custom':
              // 执行自定义计算
              result = new Function('data', data.code)(data.input);
              break;
              
            default:
              throw new Error('Unknown computation type: ' + type);
          }
          
          const computeTime = performance.now() - startTime;
          
          self.postMessage({
            id,
            type: 'success',
            result,
            computeTime,
          });
        } catch (error) {
          self.postMessage({
            id,
            type: 'error',
            error: error.message,
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    if (typeof PerformanceObserver === "undefined") return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "measure") {
            this.updateMetrics(entry);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ["measure"] });
    } catch (error) {
      console.warn("Performance monitoring setup failed:", error);
    }

    // FPS监控
    this.monitorFPS();
  }

  /**
   * FPS监控
   */
  private monitorFPS(): void {
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        this.metrics.fps = Math.round(
          (frames * 1000) / (currentTime - lastTime)
        );
        frames = 0;
        lastTime = currentTime;
      }

      this.rafHandle = requestAnimationFrame(measureFPS);
    };

    measureFPS();
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(entry: PerformanceEntry): void {
    if (entry.name.includes("render")) {
      this.metrics.renderTime = entry.duration;
    } else if (entry.name.includes("compute")) {
      this.metrics.computeTime = entry.duration;
    }

    // 更新内存使用
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    // 更新缓存命中率
    const totalRequests = Array.from(this.cacheMetadata.values()).reduce(
      (sum, meta) => sum + meta.hits + 1,
      0
    );
    const cacheHits = Array.from(this.cacheMetadata.values()).reduce(
      (sum, meta) => sum + meta.hits,
      0
    );
    this.metrics.cacheHitRate =
      totalRequests > 0 ? cacheHits / totalRequests : 0;

    // Worker利用率
    this.metrics.workerUtilization =
      this.taskQueue.length / Math.max(1, this.workers.length);
  }

  /**
   * 虚拟化大数据集
   */
  public virtualize<T>(
    data: T[],
    visibleRange: { start: number; end: number }
  ): {
    virtualData: T[];
    totalHeight: number;
    offsetY: number;
  } {
    if (
      !this.config.virtualization.enabled ||
      data.length < this.config.virtualization.bufferSize
    ) {
      return {
        virtualData: data,
        totalHeight: data.length * this.config.virtualization.itemHeight,
        offsetY: 0,
      };
    }

    const { itemHeight, overscan } = this.config.virtualization;
    const start = Math.max(0, visibleRange.start - overscan);
    const end = Math.min(data.length, visibleRange.end + overscan);

    return {
      virtualData: data.slice(start, end),
      totalHeight: data.length * itemHeight,
      offsetY: start * itemHeight,
    };
  }

  /**
   * 缓存计算结果
   */
  private getCacheKey(type: string, data: any): string {
    // 简单的哈希函数
    const str = JSON.stringify({ type, data });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${type}_${hash}`;
  }

  /**
   * 获取缓存的计算结果
   */
  private getCachedResult<T>(key: string): T | null {
    if (!this.config.cache.enabled) return null;

    const cached = this.cache.get(key);
    const metadata = this.cacheMetadata.get(key);

    if (cached && metadata) {
      const now = Date.now();
      if (now - metadata.timestamp < this.config.cache.ttl) {
        metadata.hits++;
        return cached;
      } else {
        // 过期清理
        this.cache.delete(key);
        this.cacheMetadata.delete(key);
      }
    }

    return null;
  }

  /**
   * 设置缓存
   */
  private setCachedResult(key: string, value: any, size: number = 1): void {
    if (!this.config.cache.enabled) return;

    // 检查缓存大小限制
    const currentSize = Array.from(this.cacheMetadata.values()).reduce(
      (sum, meta) => sum + meta.size,
      0
    );
    if (currentSize + size > this.config.cache.maxSize * 1024 * 1024) {
      // LRU淘汰策略
      this.evictCache();
    }

    this.cache.set(key, value);
    this.cacheMetadata.set(key, {
      size,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * 缓存淘汰
   */
  private evictCache(): void {
    if (this.config.cache.strategy === "lru") {
      // 找到最少使用的项
      let lruKey = "";
      let minHits = Infinity;

      for (const [key, meta] of this.cacheMetadata.entries()) {
        if (meta.hits < minHits) {
          minHits = meta.hits;
          lruKey = key;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
        this.cacheMetadata.delete(lruKey);
      }
    }
  }

  /**
   * 执行计算任务（带缓存和Worker支持）
   */
  public async compute<T, R>(task: ComputeTask<T, R>): Promise<R> {
    performance.mark("compute-start");

    // 检查缓存
    const cacheKey = this.getCacheKey(task.type, task.data);
    const cached = this.getCachedResult<R>(cacheKey);
    if (cached !== null) {
      performance.mark("compute-end");
      performance.measure("compute", "compute-start", "compute-end");
      return cached;
    }

    // 使用Worker执行计算
    if (this.config.worker.enabled && this.workers.length > 0) {
      const result = await this.executeInWorker<T, R>(task);
      this.setCachedResult(cacheKey, result);
      performance.mark("compute-end");
      performance.measure("compute", "compute-start", "compute-end");
      return result;
    }

    // 降级到主线程执行
    const result = await this.executeInMainThread<T, R>(task);
    this.setCachedResult(cacheKey, result);
    performance.mark("compute-end");
    performance.measure("compute", "compute-start", "compute-end");
    return result;
  }

  /**
   * 在Worker中执行任务
   */
  private executeInWorker<T, R>(task: ComputeTask<T, R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      const timeout = setTimeout(() => {
        reject(new Error("Worker timeout"));
      }, this.config.worker.taskTimeout);

      const handler = (e: MessageEvent) => {
        if (e.data.id === task.id) {
          clearTimeout(timeout);
          worker.removeEventListener("message", handler);

          if (e.data.type === "success") {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      worker.addEventListener("message", handler);
      worker.postMessage(task);
    });
  }

  /**
   * 获取可用的Worker
   */
  private getAvailableWorker(): Worker {
    // 简单的轮询策略
    return this.workers[Math.floor(Math.random() * this.workers.length)];
  }

  /**
   * 在主线程执行任务
   */
  private async executeInMainThread<T, R>(task: ComputeTask<T, R>): Promise<R> {
    // 这里应该实现具体的计算逻辑
    // 为了示例，返回一个占位结果
    return {} as R;
  }

  /**
   * 批量渲染优化
   */
  public batchRender<T>(
    items: T[],
    renderFn: (item: T, index: number) => void,
    options: {
      batchSize?: number;
      priority?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const {
        batchSize = this.config.rendering.batchSize,
        priority = 0.5,
        onProgress,
      } = options;
      let currentIndex = 0;

      const renderBatch = () => {
        performance.mark("render-batch-start");

        const endIndex = Math.min(currentIndex + batchSize, items.length);

        for (let i = currentIndex; i < endIndex; i++) {
          renderFn(items[i], i);
        }

        currentIndex = endIndex;

        if (onProgress) {
          onProgress(currentIndex / items.length);
        }

        performance.mark("render-batch-end");
        performance.measure("render", "render-batch-start", "render-batch-end");

        if (currentIndex < items.length) {
          // 根据优先级调整延迟
          const delay =
            priority > this.config.rendering.priorityThreshold
              ? 0
              : this.config.rendering.frameDelay;

          if (delay > 0) {
            setTimeout(renderBatch, delay);
          } else {
            requestAnimationFrame(renderBatch);
          }
        } else {
          resolve();
        }
      };

      renderBatch();
    });
  }

  /**
   * 创建防抖函数
   */
  public createDebouncedFn<T extends (...args: any[]) => any>(
    fn: T,
    wait: number = 300
  ): T & { cancel: () => void } {
    return debounce(fn, wait);
  }

  /**
   * 创建节流函数
   */
  public createThrottledFn<T extends (...args: any[]) => any>(
    fn: T,
    wait: number = 100
  ): T & { cancel: () => void } {
    return throttle(fn, wait);
  }

  /**
   * 创建记忆化函数
   */
  public createMemoizedFn<T extends (...args: any[]) => any>(
    fn: T,
    resolver?: (...args: Parameters<T>) => any
  ): T & { cache: Map<any, any> } {
    return memoize(fn, resolver);
  }

  /**
   * 数据采样（用于图表优化）
   */
  public sampleData<T>(
    data: T[],
    maxPoints: number,
    strategy: "uniform" | "random" | "lttb" = "uniform"
  ): T[] {
    if (data.length <= maxPoints) return data;

    switch (strategy) {
      case "random":
        return this.randomSample(data, maxPoints);

      case "lttb":
        return this.lttbSample(data, maxPoints);

      case "uniform":
      default:
        return this.uniformSample(data, maxPoints);
    }
  }

  /**
   * 均匀采样
   */
  private uniformSample<T>(data: T[], maxPoints: number): T[] {
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }

  /**
   * 随机采样
   */
  private randomSample<T>(data: T[], maxPoints: number): T[] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxPoints);
  }

  /**
   * LTTB采样算法（Largest Triangle Three Buckets）
   */
  private lttbSample<T extends { x: number; y: number }>(
    data: T[],
    maxPoints: number
  ): T[] {
    if (data.length <= maxPoints) return data;

    const bucketSize = (data.length - 2) / (maxPoints - 2);
    const sampled: T[] = [data[0]]; // 始终包含第一个点

    let a = 0; // 前一个选中点的索引

    for (let i = 0; i < maxPoints - 2; i++) {
      // 计算平均点
      const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
      const avgRangeLength = avgRangeEnd - avgRangeStart;

      let avgX = 0;
      let avgY = 0;

      for (let j = avgRangeStart; j < avgRangeEnd && j < data.length; j++) {
        avgX += data[j].x;
        avgY += data[j].y;
      }

      avgX /= avgRangeLength;
      avgY /= avgRangeLength;

      // 找到构成最大三角形的点
      const rangeStart = Math.floor(i * bucketSize) + 1;
      const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;

      const pointA = data[a];
      let maxArea = -1;
      let maxAreaPointIndex = rangeStart;

      for (let j = rangeStart; j < rangeEnd && j < data.length; j++) {
        const area =
          Math.abs(
            (pointA.x - avgX) * (data[j].y - pointA.y) -
              (pointA.x - data[j].x) * (avgY - pointA.y)
          ) * 0.5;

        if (area > maxArea) {
          maxArea = area;
          maxAreaPointIndex = j;
        }
      }

      sampled.push(data[maxAreaPointIndex]);
      a = maxAreaPointIndex;
    }

    sampled.push(data[data.length - 1]); // 始终包含最后一个点
    return sampled;
  }

  /**
   * 预加载数据
   */
  public async preload<T>(
    loader: () => Promise<T>,
    key: string,
    options: {
      priority?: "high" | "medium" | "low";
      retry?: number;
    } = {}
  ): Promise<void> {
    const { priority = "medium", retry = 3 } = options;

    // 检查是否已缓存
    if (this.cache.has(key)) return;

    let attempts = 0;
    while (attempts < retry) {
      try {
        const data = await loader();
        this.setCachedResult(key, data);
        return;
      } catch (error) {
        attempts++;
        if (attempts >= retry) {
          console.error(
            `Failed to preload ${key} after ${retry} attempts:`,
            error
          );
        }
      }
    }
  }

  /**
   * 获取性能指标
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能报告
   */
  public generatePerformanceReport(): {
    metrics: PerformanceMetrics;
    recommendations: string[];
    cacheStats: {
      size: number;
      hitRate: number;
      itemCount: number;
    };
  } {
    const recommendations: string[] = [];

    // 性能建议
    if (this.metrics.fps < 30) {
      recommendations.push("FPS较低，建议减少渲染复杂度或启用Canvas渲染");
    }

    if (this.metrics.renderTime > 100) {
      recommendations.push("渲染时间过长，建议使用虚拟化或分批渲染");
    }

    if (this.metrics.memoryUsage > 100) {
      recommendations.push("内存使用较高，建议清理缓存或减少数据量");
    }

    if (this.metrics.cacheHitRate < 0.5) {
      recommendations.push("缓存命中率较低，建议调整缓存策略");
    }

    if (this.metrics.workerUtilization > 0.8) {
      recommendations.push("Worker负载较高，建议增加Worker数量或优化计算逻辑");
    }

    // 缓存统计
    const cacheSize = Array.from(this.cacheMetadata.values()).reduce(
      (sum, meta) => sum + meta.size,
      0
    );

    return {
      metrics: this.getMetrics(),
      recommendations,
      cacheStats: {
        size: cacheSize / (1024 * 1024), // MB
        hitRate: this.metrics.cacheHitRate,
        itemCount: this.cache.size,
      },
    };
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 停止性能监控
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // 停止FPS监控
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
    }

    // 终止Workers
    for (const worker of this.workers) {
      worker.terminate();
    }

    // 清理缓存
    this.cache.clear();
    this.cacheMetadata.clear();

    // 清空任务队列
    this.taskQueue.length = 0;
  }
}

/**
 * 创建优化器实例的工厂函数
 */
export function createAdvancedAnalysisOptimizer(
  config?: Partial<PerformanceConfig>
): AdvancedAnalysisOptimizer {
  return new AdvancedAnalysisOptimizer(config);
}

/**
 * React Hook: 使用性能优化器
 */
export function usePerformanceOptimizer(
  config?: Partial<PerformanceConfig>
): AdvancedAnalysisOptimizer {
  const [optimizer] = useState(() => createAdvancedAnalysisOptimizer(config));

  useEffect(() => {
    return () => {
      optimizer.dispose();
    };
  }, [optimizer]);

  return optimizer;
}
