/**
 * 性能测试框架 - 全面的性能测试和基准测试工具
 *
 * 功能特性：
 * - 函数执行性能测试
 * - API响应时间测试
 * - 前端渲染性能测试
 * - 内存使用监控
 * - 负载测试和压力测试
 * - 性能回归检测
 * - 自动化基准测试
 */

import { expect } from "./index";
import { logError, logInfo, logWarn } from "@/utils/logger";

// 性能测试类型定义
export interface PerformanceTestConfig {
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
  minSampleSize?: number;
  maxSampleSize?: number;
  targetMarginOfError?: number;
  confidenceLevel?: number;
  memoryMonitoring?: boolean;
  cpuProfiling?: boolean;
}

export interface PerformanceResult {
  name: string;
  iterations: number;
  samples: number[];
  statistics: {
    mean: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
    variance: number;
    p95: number;
    p99: number;
  };
  throughput: {
    operationsPerSecond: number;
    operationsPerMinute: number;
  };
  memoryUsage?: {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
  cpuProfile?: any;
  timestamp: string;
  environment: {
    platform: string;
    nodeVersion?: string;
    userAgent?: string;
  };
}

export interface LoadTestConfig {
  concurrency: number;
  duration: number;
  rampUpTime?: number;
  rampDownTime?: number;
  requestsPerSecond?: number;
  maxRequests?: number;
  timeout?: number;
}

export interface LoadTestResult {
  config: LoadTestConfig;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  timeline: Array<{
    timestamp: number;
    activeConnections: number;
    completedRequests: number;
    responseTime: number;
  }>;
}

export interface BenchmarkSuite {
  name: string;
  tests: BenchmarkTest[];
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

export interface BenchmarkTest {
  name: string;
  fn: () => Promise<any> | any;
  config?: PerformanceTestConfig;
  baseline?: number;
  threshold?: {
    max?: number;
    min?: number;
    regression?: number;
  };
}

export interface BenchmarkReport {
  suiteName: string;
  results: PerformanceResult[];
  comparisons: Array<{
    testName: string;
    current: number;
    baseline?: number;
    improvement?: number;
    regression?: number;
    status: "improved" | "regressed" | "stable" | "unknown";
  }>;
  summary: {
    totalTests: number;
    improved: number;
    regressed: number;
    stable: number;
    fastest: string;
    slowest: string;
  };
}

/**
 * 性能测试引擎
 */
export class PerformanceTester {
  private config: PerformanceTestConfig;
  private results: PerformanceResult[] = [];

  constructor(config: PerformanceTestConfig = {}) {
    this.config = {
      iterations: 1000,
      warmupIterations: 100,
      timeout: 30000,
      minSampleSize: 10,
      maxSampleSize: 10000,
      targetMarginOfError: 0.05,
      confidenceLevel: 0.95,
      memoryMonitoring: true,
      cpuProfiling: false,
      ...config,
    };
  }

  /**
   * 运行性能测试
   */
  async runTest<T>(
    name: string,
    testFn: () => T | Promise<T>,
    config?: Partial<PerformanceTestConfig>
  ): Promise<PerformanceResult> {
    const testConfig = { ...this.config, ...config };

    logInfo(`开始性能测试: ${name}`, testConfig);

    try {
      // 预热
      await this.warmup(testFn, testConfig.warmupIterations!);

      // 获取初始内存使用
      const initialMemory = testConfig.memoryMonitoring
        ? this.getMemoryUsage()
        : undefined;
      let peakMemory = initialMemory;

      // 运行测试样本
      const samples: number[] = [];
      const startTime = Date.now();

      for (let i = 0; i < testConfig.iterations!; i++) {
        // 检查超时
        if (Date.now() - startTime > testConfig.timeout!) {
          logWarn(`性能测试超时: ${name}`);
          break;
        }

        // 执行单次测试
        const sampleStart = performance.now();
        await testFn();
        const sampleEnd = performance.now();

        const sampleTime = sampleEnd - sampleStart;
        samples.push(sampleTime);

        // 监控内存使用
        if (testConfig.memoryMonitoring && peakMemory) {
          const currentMemory = this.getMemoryUsage();
          if (currentMemory && currentMemory.heapUsed > peakMemory.heapUsed) {
            peakMemory = currentMemory;
          }
        }

        // 动态调整样本大小
        if (
          i >= testConfig.minSampleSize! &&
          i < testConfig.maxSampleSize! &&
          this.shouldStopSampling(samples, testConfig)
        ) {
          break;
        }
      }

      // 获取最终内存使用
      const finalMemory = testConfig.memoryMonitoring
        ? this.getMemoryUsage()
        : undefined;

      // 计算统计数据
      const statistics = this.calculateStatistics(samples);
      const throughput = this.calculateThroughput(samples);

      // 构建结果
      const result: PerformanceResult = {
        name,
        iterations: samples.length,
        samples,
        statistics,
        throughput,
        memoryUsage: this.calculateMemoryDelta(
          initialMemory,
          peakMemory,
          finalMemory
        ),
        timestamp: new Date().toISOString(),
        environment: this.getEnvironmentInfo(),
      };

      this.results.push(result);

      logInfo(`性能测试完成: ${name}`, {
        iterations: result.iterations,
        meanTime: result.statistics.mean.toFixed(2),
        opsPerSec: result.throughput.operationsPerSecond.toFixed(2),
      });

      return result;
    } catch (error) {
      logError(`性能测试失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 批量运行性能测试
   */
  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkReport> {
    logInfo(`开始性能测试套件: ${suite.name}`);

    try {
      // 套件设置
      if (suite.setup) {
        await suite.setup();
      }

      const results: PerformanceResult[] = [];

      // 运行所有测试
      for (const test of suite.tests) {
        const result = await this.runTest(test.name, test.fn, test.config);
        results.push(result);

        // 检查阈值
        if (test.threshold) {
          this.checkThresholds(result, test.threshold);
        }
      }

      // 生成报告
      const report = this.generateBenchmarkReport(
        suite.name,
        results,
        suite.tests
      );

      return report;
    } finally {
      // 套件清理
      if (suite.teardown) {
        await suite.teardown();
      }
    }
  }

  /**
   * 比较性能结果
   */
  compareResults(
    current: PerformanceResult,
    baseline: PerformanceResult
  ): {
    improvement: number;
    regression: number;
    status: "improved" | "regressed" | "stable";
  } {
    const currentMean = current.statistics.mean;
    const baselineMean = baseline.statistics.mean;

    const improvement = ((baselineMean - currentMean) / baselineMean) * 100;
    const regression = ((currentMean - baselineMean) / baselineMean) * 100;

    let status: "improved" | "regressed" | "stable";
    if (improvement > 5) {
      status = "improved";
    } else if (regression > 5) {
      status = "regressed";
    } else {
      status = "stable";
    }

    return { improvement, regression, status };
  }

  /**
   * 获取所有测试结果
   */
  getResults(): PerformanceResult[] {
    return [...this.results];
  }

  /**
   * 清除测试结果
   */
  clearResults(): void {
    this.results = [];
  }

  // 私有方法

  private async warmup<T>(
    testFn: () => T | Promise<T>,
    iterations: number
  ): Promise<void> {
    logInfo(`预热测试函数 (${iterations} 次)`);

    for (let i = 0; i < iterations; i++) {
      await testFn();
    }
  }

  private shouldStopSampling(
    samples: number[],
    config: PerformanceTestConfig
  ): boolean {
    if (samples.length < config.minSampleSize!) return false;

    // 计算当前的置信区间
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance =
      samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (samples.length - 1);
    const standardError = Math.sqrt(variance / samples.length);

    // t值 (简化实现，使用近似值)
    const tValue = 1.96; // 对应95%置信度
    const marginOfError = (tValue * standardError) / mean;

    return marginOfError <= config.targetMarginOfError!;
  }

  private calculateStatistics(
    samples: number[]
  ): PerformanceResult["statistics"] {
    if (samples.length === 0) {
      throw new Error("没有有效的样本数据");
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const median = this.getPercentile(sorted, 50);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const variance =
      samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      samples.length;
    const standardDeviation = Math.sqrt(variance);

    const p95 = this.getPercentile(sorted, 95);
    const p99 = this.getPercentile(sorted, 99);

    return {
      mean,
      median,
      min,
      max,
      standardDeviation,
      variance,
      p95,
      p99,
    };
  }

  private calculateThroughput(
    samples: number[]
  ): PerformanceResult["throughput"] {
    const meanTimeMs =
      samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const operationsPerSecond = 1000 / meanTimeMs;
    const operationsPerMinute = operationsPerSecond * 60;

    return {
      operationsPerSecond,
      operationsPerMinute,
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);

    if (Number.isInteger(index)) {
      return sortedArray[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
  }

  private getMemoryUsage(): NodeJS.MemoryUsage | undefined {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage();
    }
    return undefined;
  }

  private calculateMemoryDelta(
    initial?: NodeJS.MemoryUsage,
    peak?: NodeJS.MemoryUsage,
    final?: NodeJS.MemoryUsage
  ): PerformanceResult["memoryUsage"] {
    if (!initial || !final) return undefined;

    return {
      initial,
      peak: peak || final,
      final,
      delta: {
        heapUsed: final.heapUsed - initial.heapUsed,
        heapTotal: final.heapTotal - initial.heapTotal,
        external: final.external - initial.external,
        rss: final.rss - initial.rss,
      },
    };
  }

  private getEnvironmentInfo(): PerformanceResult["environment"] {
    return {
      platform: typeof process !== "undefined" ? process.platform : "browser",
      nodeVersion: typeof process !== "undefined" ? process.version : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  }

  private checkThresholds(
    result: PerformanceResult,
    threshold: BenchmarkTest["threshold"]
  ): void {
    const meanTime = result.statistics.mean;

    if (threshold!.max && meanTime > threshold!.max) {
      throw new Error(
        `性能测试超出最大阈值: ${meanTime.toFixed(2)}ms > ${threshold!.max}ms`
      );
    }

    if (threshold!.min && meanTime < threshold!.min) {
      throw new Error(
        `性能测试低于最小阈值: ${meanTime.toFixed(2)}ms < ${threshold!.min}ms`
      );
    }
  }

  private generateBenchmarkReport(
    suiteName: string,
    results: PerformanceResult[],
    tests: BenchmarkTest[]
  ): BenchmarkReport {
    const comparisons = results.map((result, index) => {
      const test = tests[index];
      const current = result.statistics.mean;
      const baseline = test.baseline;

      let improvement = 0;
      let regression = 0;
      let status: "improved" | "regressed" | "stable" | "unknown" = "unknown";

      if (baseline !== undefined) {
        improvement = ((baseline - current) / baseline) * 100;
        regression = ((current - baseline) / baseline) * 100;

        if (improvement > 5) {
          status = "improved";
        } else if (regression > 5) {
          status = "regressed";
        } else {
          status = "stable";
        }
      }

      return {
        testName: result.name,
        current,
        baseline,
        improvement: improvement > 0 ? improvement : undefined,
        regression: regression > 0 ? regression : undefined,
        status,
      };
    });

    const summary = {
      totalTests: results.length,
      improved: comparisons.filter((c) => c.status === "improved").length,
      regressed: comparisons.filter((c) => c.status === "regressed").length,
      stable: comparisons.filter((c) => c.status === "stable").length,
      fastest: results.reduce((fastest, current) =>
        current.statistics.mean < fastest.statistics.mean ? current : fastest
      ).name,
      slowest: results.reduce((slowest, current) =>
        current.statistics.mean > slowest.statistics.mean ? current : slowest
      ).name,
    };

    return {
      suiteName,
      results,
      comparisons,
      summary,
    };
  }
}

/**
 * 负载测试引擎
 */
export class LoadTester {
  /**
   * 运行负载测试
   */
  async runLoadTest(
    name: string,
    testFn: () => Promise<any>,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    logInfo(`开始负载测试: ${name}`, config);

    const startTime = Date.now();
    const endTime = startTime + config.duration;

    const responseTimes: number[] = [];
    const errors: Map<string, number> = new Map();
    const timeline: LoadTestResult["timeline"] = [];

    let totalRequests = 0;
    let completedRequests = 0;
    let failedRequests = 0;
    let activeConnections = 0;

    // 并发执行器
    const workers: Promise<void>[] = [];

    for (let i = 0; i < config.concurrency; i++) {
      workers.push(
        this.createWorker(
          testFn,
          config,
          startTime,
          endTime,
          responseTimes,
          errors,
          () => totalRequests++,
          () => completedRequests++,
          () => failedRequests++,
          () => activeConnections++,
          () => activeConnections--
        )
      );
    }

    // 监控时间线
    const timelineInterval = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(timelineInterval);
        return;
      }

      timeline.push({
        timestamp: Date.now() - startTime,
        activeConnections,
        completedRequests,
        responseTime:
          responseTimes.length > 0
            ? responseTimes[responseTimes.length - 1]
            : 0,
      });
    }, 1000);

    // 等待所有工作线程完成
    await Promise.all(workers);
    clearInterval(timelineInterval);

    // 计算统计数据
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);

    const result: LoadTestResult = {
      config,
      totalRequests,
      completedRequests,
      failedRequests,
      averageResponseTime:
        responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length || 0,
      minResponseTime: sortedResponseTimes[0] || 0,
      maxResponseTime: sortedResponseTimes[sortedResponseTimes.length - 1] || 0,
      p50ResponseTime: this.getPercentile(sortedResponseTimes, 50),
      p90ResponseTime: this.getPercentile(sortedResponseTimes, 90),
      p95ResponseTime: this.getPercentile(sortedResponseTimes, 95),
      p99ResponseTime: this.getPercentile(sortedResponseTimes, 99),
      requestsPerSecond: completedRequests / (config.duration / 1000),
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      errors: Array.from(errors.entries()).map(([error, count]) => ({
        error,
        count,
        percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0,
      })),
      timeline,
    };

    logInfo(`负载测试完成: ${name}`, {
      totalRequests: result.totalRequests,
      completedRequests: result.completedRequests,
      failedRequests: result.failedRequests,
      averageResponseTime: result.averageResponseTime.toFixed(2),
      requestsPerSecond: result.requestsPerSecond.toFixed(2),
    });

    return result;
  }

  private async createWorker(
    testFn: () => Promise<any>,
    config: LoadTestConfig,
    startTime: number,
    endTime: number,
    responseTimes: number[],
    errors: Map<string, number>,
    incrementTotal: () => void,
    incrementCompleted: () => void,
    incrementFailed: () => void,
    incrementActive: () => void,
    decrementActive: () => void
  ): Promise<void> {
    while (Date.now() < endTime) {
      // 检查请求限制
      if (config.maxRequests && responseTimes.length >= config.maxRequests) {
        break;
      }

      // 请求速率控制
      if (config.requestsPerSecond) {
        const elapsed = Date.now() - startTime;
        const expectedRequests = (elapsed / 1000) * config.requestsPerSecond;
        if (responseTimes.length >= expectedRequests) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          continue;
        }
      }

      incrementTotal();
      incrementActive();

      const requestStart = performance.now();

      try {
        await Promise.race([
          testFn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Request timeout")),
              config.timeout || 30000
            )
          ),
        ]);

        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;

        responseTimes.push(responseTime);
        incrementCompleted();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.set(errorMessage, (errors.get(errorMessage) || 0) + 1);
        incrementFailed();
      } finally {
        decrementActive();
      }

      // 防止过度占用CPU
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);

    if (Number.isInteger(index)) {
      return sortedArray[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
  }
}

/**
 * 性能断言
 */
export class PerformanceAssertions {
  /**
   * 断言执行时间
   */
  static expectExecutionTime(result: PerformanceResult, maxTime: number): void {
    expect(result.statistics.mean).toBeLessThanOrEqual(maxTime);
  }

  /**
   * 断言吞吐量
   */
  static expectThroughput(
    result: PerformanceResult,
    minOpsPerSec: number
  ): void {
    expect(result.throughput.operationsPerSecond).toBeGreaterThanOrEqual(
      minOpsPerSec
    );
  }

  /**
   * 断言内存使用
   */
  static expectMemoryUsage(
    result: PerformanceResult,
    maxMemoryMB: number
  ): void {
    if (!result.memoryUsage) {
      throw new Error("内存使用数据不可用");
    }

    const memoryUsedMB = result.memoryUsage.delta.heapUsed / (1024 * 1024);
    expect(memoryUsedMB).toBeLessThanOrEqual(maxMemoryMB);
  }

  /**
   * 断言性能回归
   */
  static expectNoRegression(
    current: PerformanceResult,
    baseline: PerformanceResult,
    maxRegressionPercent: number = 10
  ): void {
    const currentMean = current.statistics.mean;
    const baselineMean = baseline.statistics.mean;
    const regression = ((currentMean - baselineMean) / baselineMean) * 100;

    expect(regression).toBeLessThanOrEqual(maxRegressionPercent);
  }

  /**
   * 断言负载测试错误率
   */
  static expectErrorRate(result: LoadTestResult, maxErrorRate: number): void {
    expect(result.errorRate).toBeLessThanOrEqual(maxErrorRate);
  }

  /**
   * 断言负载测试响应时间
   */
  static expectLoadTestResponseTime(
    result: LoadTestResult,
    maxP95ResponseTime: number
  ): void {
    expect(result.p95ResponseTime).toBeLessThanOrEqual(maxP95ResponseTime);
  }
}

// 便捷函数
export function createPerformanceTester(
  config?: PerformanceTestConfig
): PerformanceTester {
  return new PerformanceTester(config);
}

export function createLoadTester(): LoadTester {
  return new LoadTester();
}

export async function benchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  config?: PerformanceTestConfig
): Promise<PerformanceResult> {
  const tester = new PerformanceTester(config);
  return await tester.runTest(name, fn, config);
}

export async function loadTest(
  name: string,
  fn: () => Promise<any>,
  config: LoadTestConfig
): Promise<LoadTestResult> {
  const tester = new LoadTester();
  return await tester.runLoadTest(name, fn, config);
}

export default {
  PerformanceTester,
  LoadTester,
  PerformanceAssertions,
  createPerformanceTester,
  createLoadTester,
  benchmark,
  loadTest,
};
