/**
 * 统一测试框架 - 提供全面的测试工具和断言
 *
 * 功能特性：
 * - 统一的测试API接口
 * - 高级断言和匹配器
 * - 自动模拟和存根
 * - 性能测试工具
 * - 异步测试支持
 * - 错误边界测试
 */

import { logError, logInfo, logWarn } from "@/utils/logger";

// 基础测试类型
export interface TestCase {
  name: string;
  description?: string;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
  tags?: string[];
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
  test: () => Promise<void> | void;
}

export interface TestSuite {
  name: string;
  description?: string;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
  beforeEach?: () => Promise<void> | void;
  afterEach?: () => Promise<void> | void;
  tests: TestCase[];
}

export interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped" | "timeout";
  duration: number;
  error?: Error;
  assertions: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  results: TestResult[];
}

/**
 * 高级断言框架
 */
export class Assertions {
  private static assertionCount = 0;

  static getAssertionCount(): number {
    return this.assertionCount;
  }

  static resetAssertionCount(): void {
    this.assertionCount = 0;
  }

  private static incrementAssertions(): void {
    this.assertionCount++;
  }

  // 基础断言
  static expect<T>(actual: T): ExpectAPI<T> {
    this.incrementAssertions();
    return new ExpectAPI(actual);
  }

  // 异步断言
  static async expectAsync<T>(promise: Promise<T>): Promise<ExpectAPI<T>> {
    this.incrementAssertions();
    try {
      const result = await promise;
      return new ExpectAPI(result);
    } catch (error) {
      return new ExpectAPI<T>(error as T);
    }
  }

  // 异常断言
  static expectThrows(
    fn: () => void,
    expectedError?: string | RegExp | Function
  ): void {
    this.incrementAssertions();
    try {
      fn();
      throw new Error("Expected function to throw, but it did not");
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === "string") {
          if (!error.message.includes(expectedError)) {
            throw new Error(
              `Expected error message to contain "${expectedError}", but got: ${error.message}`
            );
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(error.message)) {
            throw new Error(
              `Expected error message to match ${expectedError}, but got: ${error.message}`
            );
          }
        } else if (typeof expectedError === "function") {
          if (!(error instanceof expectedError)) {
            throw new Error(
              `Expected error to be instance of ${expectedError.name}, but got: ${error.constructor.name}`
            );
          }
        }
      }
    }
  }

  // 异步异常断言
  static async expectAsyncThrows(
    asyncFn: () => Promise<any>,
    expectedError?: string | RegExp | Function
  ): Promise<void> {
    this.incrementAssertions();
    try {
      await asyncFn();
      throw new Error("Expected async function to throw, but it did not");
    } catch (error) {
      if (expectedError) {
        if (typeof expectedError === "string") {
          if (!error.message.includes(expectedError)) {
            throw new Error(
              `Expected error message to contain "${expectedError}", but got: ${error.message}`
            );
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(error.message)) {
            throw new Error(
              `Expected error message to match ${expectedError}, but got: ${error.message}`
            );
          }
        } else if (typeof expectedError === "function") {
          if (!(error instanceof expectedError)) {
            throw new Error(
              `Expected error to be instance of ${expectedError.name}, but got: ${error.constructor.name}`
            );
          }
        }
      }
    }
  }

  // 性能断言
  static expectPerformance(
    fn: () => void | Promise<void>,
    maxTimeMs: number
  ): Promise<void> {
    this.incrementAssertions();
    return new Promise((resolve, reject) => {
      const startTime = performance.now();

      const checkTime = () => {
        const duration = performance.now() - startTime;
        if (duration > maxTimeMs) {
          reject(
            new Error(
              `Expected function to complete within ${maxTimeMs}ms, but took ${duration.toFixed(2)}ms`
            )
          );
        } else {
          resolve();
        }
      };

      try {
        const result = fn();
        if (result instanceof Promise) {
          result.then(checkTime).catch(reject);
        } else {
          checkTime();
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

/**
 * 期望API类
 */
class ExpectAPI<T> {
  constructor(private actual: T) {}

  // 相等性断言
  toBe(expected: T): ExpectAPI<T> {
    if (this.actual !== expected) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be ${this.stringify(expected)}`
      );
    }
    return this;
  }

  toEqual(expected: T): ExpectAPI<T> {
    if (!this.deepEqual(this.actual, expected)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to equal ${this.stringify(expected)}`
      );
    }
    return this;
  }

  toStrictEqual(expected: T): ExpectAPI<T> {
    if (this.actual !== expected || !this.deepEqual(this.actual, expected)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to strictly equal ${this.stringify(expected)}`
      );
    }
    return this;
  }

  // 类型断言
  toBeTypeOf(expectedType: string): ExpectAPI<T> {
    if (typeof this.actual !== expectedType) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be of type ${expectedType}, but got ${typeof this.actual}`
      );
    }
    return this;
  }

  toBeInstanceOf(expectedClass: Function): ExpectAPI<T> {
    if (!(this.actual instanceof expectedClass)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be instance of ${expectedClass.name}`
      );
    }
    return this;
  }

  // 存在性断言
  toBeDefined(): ExpectAPI<T> {
    if (this.actual === undefined) {
      throw new Error("Expected value to be defined, but got undefined");
    }
    return this;
  }

  toBeUndefined(): ExpectAPI<T> {
    if (this.actual !== undefined) {
      throw new Error(
        `Expected value to be undefined, but got ${this.stringify(this.actual)}`
      );
    }
    return this;
  }

  toBeNull(): ExpectAPI<T> {
    if (this.actual !== null) {
      throw new Error(
        `Expected value to be null, but got ${this.stringify(this.actual)}`
      );
    }
    return this;
  }

  toBeTruthy(): ExpectAPI<T> {
    if (!this.actual) {
      throw new Error(`Expected ${this.stringify(this.actual)} to be truthy`);
    }
    return this;
  }

  toBeFalsy(): ExpectAPI<T> {
    if (this.actual) {
      throw new Error(`Expected ${this.stringify(this.actual)} to be falsy`);
    }
    return this;
  }

  // 数值断言
  toBeGreaterThan(expected: number): ExpectAPI<T> {
    if (typeof this.actual !== "number" || this.actual <= expected) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be greater than ${expected}`
      );
    }
    return this;
  }

  toBeGreaterThanOrEqual(expected: number): ExpectAPI<T> {
    if (typeof this.actual !== "number" || this.actual < expected) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be greater than or equal to ${expected}`
      );
    }
    return this;
  }

  toBeLessThan(expected: number): ExpectAPI<T> {
    if (typeof this.actual !== "number" || this.actual >= expected) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be less than ${expected}`
      );
    }
    return this;
  }

  toBeLessThanOrEqual(expected: number): ExpectAPI<T> {
    if (typeof this.actual !== "number" || this.actual > expected) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to be less than or equal to ${expected}`
      );
    }
    return this;
  }

  toBeCloseTo(expected: number, precision: number = 2): ExpectAPI<T> {
    if (typeof this.actual !== "number") {
      throw new Error(`Expected ${this.stringify(this.actual)} to be a number`);
    }
    const delta = Math.abs(this.actual - expected);
    const tolerance = Math.pow(10, -precision) / 2;
    if (delta > tolerance) {
      throw new Error(
        `Expected ${this.actual} to be close to ${expected} (precision: ${precision}), but difference was ${delta}`
      );
    }
    return this;
  }

  // 字符串断言
  toContain(expected: string): ExpectAPI<T> {
    if (typeof this.actual !== "string" || !this.actual.includes(expected)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to contain "${expected}"`
      );
    }
    return this;
  }

  toMatch(pattern: RegExp): ExpectAPI<T> {
    if (typeof this.actual !== "string" || !pattern.test(this.actual)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to match ${pattern}`
      );
    }
    return this;
  }

  toStartWith(expected: string): ExpectAPI<T> {
    if (typeof this.actual !== "string" || !this.actual.startsWith(expected)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to start with "${expected}"`
      );
    }
    return this;
  }

  toEndWith(expected: string): ExpectAPI<T> {
    if (typeof this.actual !== "string" || !this.actual.endsWith(expected)) {
      throw new Error(
        `Expected ${this.stringify(this.actual)} to end with "${expected}"`
      );
    }
    return this;
  }

  // 数组断言
  toHaveLength(expected: number): ExpectAPI<T> {
    if (!Array.isArray(this.actual) || this.actual.length !== expected) {
      throw new Error(
        `Expected array to have length ${expected}, but got ${Array.isArray(this.actual) ? this.actual.length : "non-array"}`
      );
    }
    return this;
  }

  toContainItem(expected: any): ExpectAPI<T> {
    if (!Array.isArray(this.actual) || !this.actual.includes(expected)) {
      throw new Error(
        `Expected array ${this.stringify(this.actual)} to contain ${this.stringify(expected)}`
      );
    }
    return this;
  }

  toContainAllItems(expected: any[]): ExpectAPI<T> {
    if (!Array.isArray(this.actual)) {
      throw new Error(
        `Expected value to be an array, but got ${typeof this.actual}`
      );
    }
    const missing = expected.filter((item) => !this.actual.includes(item));
    if (missing.length > 0) {
      throw new Error(
        `Expected array to contain all items ${this.stringify(expected)}, but missing: ${this.stringify(missing)}`
      );
    }
    return this;
  }

  // 对象断言
  toHaveProperty(property: string, value?: any): ExpectAPI<T> {
    if (typeof this.actual !== "object" || this.actual === null) {
      throw new Error(
        `Expected value to be an object, but got ${typeof this.actual}`
      );
    }

    const keys = property.split(".");
    let current: any = this.actual;

    for (const key of keys) {
      if (!(key in current)) {
        throw new Error(`Expected object to have property "${property}"`);
      }
      current = current[key];
    }

    if (value !== undefined && !this.deepEqual(current, value)) {
      throw new Error(
        `Expected property "${property}" to equal ${this.stringify(value)}, but got ${this.stringify(current)}`
      );
    }

    return this;
  }

  toMatchObject(expected: Partial<any>): ExpectAPI<T> {
    if (typeof this.actual !== "object" || this.actual === null) {
      throw new Error(
        `Expected value to be an object, but got ${typeof this.actual}`
      );
    }

    for (const [key, value] of Object.entries(expected)) {
      if (!(key in (this.actual as any))) {
        throw new Error(`Expected object to have property "${key}"`);
      }
      if (!this.deepEqual((this.actual as any)[key], value)) {
        throw new Error(
          `Expected property "${key}" to equal ${this.stringify(value)}, but got ${this.stringify((this.actual as any)[key])}`
        );
      }
    }

    return this;
  }

  // 取反
  get not(): NotExpectAPI<T> {
    return new NotExpectAPI(this.actual);
  }

  // 工具方法
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }
    if (typeof a === "object" && typeof b === "object") {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((key) => this.deepEqual(a[key], b[key]));
    }
    return false;
  }

  private stringify(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "function") return value.name || "function";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}

/**
 * 取反期望API类
 */
class NotExpectAPI<T> extends ExpectAPI<T> {
  constructor(actual: T) {
    super(actual);
  }

  toBe(expected: T): NotExpectAPI<T> {
    try {
      super.toBe(expected);
      throw new Error(
        `Expected ${this.stringify(this.actual)} not to be ${this.stringify(expected)}`
      );
    } catch (error) {
      if (error.message.includes("not to be")) throw error;
      return this;
    }
  }

  toEqual(expected: T): NotExpectAPI<T> {
    try {
      super.toEqual(expected);
      throw new Error(
        `Expected ${this.stringify(this.actual)} not to equal ${this.stringify(expected)}`
      );
    } catch (error) {
      if (error.message.includes("not to equal")) throw error;
      return this;
    }
  }

  // 其他取反方法类似实现...
}

/**
 * 模拟和存根工具
 */
export class MockingTools {
  private static mocks = new Map<string, any>();
  private static spies = new Map<string, any>();

  // 创建模拟函数
  static mockFunction<T extends (...args: any[]) => any>(
    implementation?: T
  ): MockFunction<T> {
    return new MockFunction(implementation);
  }

  // 创建模拟对象
  static mockObject<T extends object>(blueprint?: Partial<T>): T {
    const mock = { ...blueprint } as T;

    return new Proxy(mock, {
      get(target, prop) {
        if (prop in target) {
          return target[prop as keyof T];
        }
        // 自动创建模拟函数
        if (typeof prop === "string") {
          target[prop as keyof T] = this.mockFunction() as any;
          return target[prop as keyof T];
        }
        return undefined;
      },
    });
  }

  // 监听函数调用
  static spyOn<T extends object, K extends keyof T>(
    object: T,
    method: K
  ): SpyFunction<T[K]> {
    const original = object[method];
    const spy = new SpyFunction(original as any);
    object[method] = spy as any;

    const spyKey = `${object.constructor.name}.${String(method)}`;
    this.spies.set(spyKey, { object, method, original, spy });

    return spy;
  }

  // 恢复所有模拟
  static restoreAll(): void {
    for (const [key, { object, method, original }] of this.spies) {
      object[method] = original;
    }
    this.spies.clear();
    this.mocks.clear();
  }

  // 清除所有模拟
  static clearAll(): void {
    for (const [key, mock] of this.mocks) {
      if (mock.clear) mock.clear();
    }
    for (const [key, { spy }] of this.spies) {
      if (spy.clear) spy.clear();
    }
  }
}

/**
 * 模拟函数类
 */
class MockFunction<T extends (...args: any[]) => any> {
  private calls: Array<{
    args: Parameters<T>;
    result?: ReturnType<T>;
    error?: Error;
  }> = [];
  private implementation?: T;
  private returnValues: ReturnType<T>[] = [];
  private returnValueIndex = 0;

  constructor(implementation?: T) {
    this.implementation = implementation;
  }

  // 模拟函数调用
  call(...args: Parameters<T>): ReturnType<T> {
    const call = { args } as any;

    try {
      let result: ReturnType<T>;

      if (this.returnValues.length > 0) {
        result = this.returnValues[this.returnValueIndex];
        this.returnValueIndex =
          (this.returnValueIndex + 1) % this.returnValues.length;
      } else if (this.implementation) {
        result = this.implementation(...args);
      } else {
        result = undefined as ReturnType<T>;
      }

      call.result = result;
      this.calls.push(call);
      return result;
    } catch (error) {
      call.error = error;
      this.calls.push(call);
      throw error;
    }
  }

  // 设置实现
  mockImplementation(implementation: T): this {
    this.implementation = implementation;
    return this;
  }

  // 设置返回值
  mockReturnValue(value: ReturnType<T>): this {
    this.returnValues = [value];
    this.returnValueIndex = 0;
    return this;
  }

  // 设置多个返回值
  mockReturnValues(...values: ReturnType<T>[]): this {
    this.returnValues = values;
    this.returnValueIndex = 0;
    return this;
  }

  // 获取调用信息
  get calls() {
    return this.calls.slice();
  }

  get callCount() {
    return this.calls.length;
  }

  // 断言方法
  toHaveBeenCalled(): this {
    if (this.calls.length === 0) {
      throw new Error("Expected function to have been called, but it was not");
    }
    return this;
  }

  toHaveBeenCalledTimes(expectedCount: number): this {
    if (this.calls.length !== expectedCount) {
      throw new Error(
        `Expected function to have been called ${expectedCount} times, but was called ${this.calls.length} times`
      );
    }
    return this;
  }

  toHaveBeenCalledWith(...expectedArgs: Parameters<T>): this {
    const matching = this.calls.find(
      (call) =>
        call.args.length === expectedArgs.length &&
        call.args.every((arg, index) =>
          this.deepEqual(arg, expectedArgs[index])
        )
    );

    if (!matching) {
      throw new Error(
        `Expected function to have been called with [${expectedArgs.join(", ")}], but it was not`
      );
    }
    return this;
  }

  // 清除调用历史
  clear(): void {
    this.calls.length = 0;
    this.returnValueIndex = 0;
  }

  private deepEqual(a: any, b: any): boolean {
    // 简化的深度比较实现
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

/**
 * 监听函数类
 */
class SpyFunction<T> extends MockFunction<T> {
  constructor(private originalFunction: T) {
    super(originalFunction as any);
  }

  // 恢复原始函数
  restore(): void {
    // 由 MockingTools.restoreAll() 处理
  }
}

/**
 * 测试运行器
 */
export class TestRunner {
  private suites: TestSuite[] = [];
  private globalSetup?: () => Promise<void> | void;
  private globalTeardown?: () => Promise<void> | void;

  // 注册测试套件
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  // 设置全局钩子
  setGlobalSetup(setup: () => Promise<void> | void): void {
    this.globalSetup = setup;
  }

  setGlobalTeardown(teardown: () => Promise<void> | void): void {
    this.globalTeardown = teardown;
  }

  // 运行所有测试
  async runAll(
    options: {
      filter?: string;
      tags?: string[];
      parallel?: boolean;
      timeout?: number;
    } = {}
  ): Promise<TestSuiteResult[]> {
    const results: TestSuiteResult[] = [];

    try {
      // 全局设置
      if (this.globalSetup) {
        await this.globalSetup();
      }

      // 过滤测试套件
      const suitesToRun = this.suites.filter((suite) => {
        if (options.filter && !suite.name.includes(options.filter)) {
          return false;
        }
        return true;
      });

      // 运行测试套件
      if (options.parallel) {
        const suiteResults = await Promise.all(
          suitesToRun.map((suite) => this.runSuite(suite, options))
        );
        results.push(...suiteResults);
      } else {
        for (const suite of suitesToRun) {
          const result = await this.runSuite(suite, options);
          results.push(result);
        }
      }
    } finally {
      // 全局清理
      if (this.globalTeardown) {
        await this.globalTeardown();
      }

      // 清理所有模拟
      MockingTools.restoreAll();
      MockingTools.clearAll();
    }

    return results;
  }

  // 运行单个测试套件
  private async runSuite(
    suite: TestSuite,
    options: any
  ): Promise<TestSuiteResult> {
    const startTime = performance.now();
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // 套件设置
      if (suite.setup) {
        await suite.setup();
      }

      // 过滤测试用例
      const testsToRun = suite.tests.filter((test) => {
        if (test.skip) return false;
        if (
          options.tags &&
          test.tags &&
          !test.tags.some((tag) => options.tags.includes(tag))
        ) {
          return false;
        }
        return true;
      });

      // 运行测试用例
      for (const test of testsToRun) {
        if (test.skip) {
          results.push({
            name: test.name,
            status: "skipped",
            duration: 0,
            assertions: 0,
          });
          skipped++;
          continue;
        }

        const result = await this.runTest(test, suite, options.timeout);
        results.push(result);

        if (result.status === "passed") passed++;
        else if (result.status === "failed") failed++;
        else skipped++;
      }
    } catch (error) {
      logError("测试套件运行失败", { suite: suite.name, error });
    } finally {
      // 套件清理
      if (suite.teardown) {
        try {
          await suite.teardown();
        } catch (error) {
          logWarn("测试套件清理失败", { suite: suite.name, error });
        }
      }
    }

    const endTime = performance.now();
    return {
      suiteName: suite.name,
      totalTests: results.length,
      passed,
      failed,
      skipped,
      duration: endTime - startTime,
      results,
    };
  }

  // 运行单个测试
  private async runTest(
    test: TestCase,
    suite: TestSuite,
    globalTimeout?: number
  ): Promise<TestResult> {
    const startTime = performance.now();
    Assertions.resetAssertionCount();

    try {
      // 测试前置操作
      if (suite.beforeEach) {
        await suite.beforeEach();
      }
      if (test.setup) {
        await test.setup();
      }

      // 设置超时
      const timeout = test.timeout || globalTimeout || 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Test timeout")), timeout);
      });

      // 运行测试
      await Promise.race([Promise.resolve(test.test()), timeoutPromise]);

      const endTime = performance.now();
      return {
        name: test.name,
        status: "passed",
        duration: endTime - startTime,
        assertions: Assertions.getAssertionCount(),
        memoryUsage: this.getMemoryUsage(),
      };
    } catch (error) {
      const endTime = performance.now();
      const isTimeout = error.message === "Test timeout";

      return {
        name: test.name,
        status: isTimeout ? "timeout" : "failed",
        duration: endTime - startTime,
        assertions: Assertions.getAssertionCount(),
        error: error as Error,
        memoryUsage: this.getMemoryUsage(),
      };
    } finally {
      // 测试后置操作
      try {
        if (test.teardown) {
          await test.teardown();
        }
        if (suite.afterEach) {
          await suite.afterEach();
        }
      } catch (error) {
        logWarn("测试清理失败", { test: test.name, error });
      }
    }
  }

  // 获取内存使用情况
  private getMemoryUsage() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage();
    }
    return undefined;
  }

  // 生成测试报告
  generateReport(results: TestSuiteResult[]): string {
    const totalSuites = results.length;
    const totalTests = results.reduce(
      (sum, suite) => sum + suite.totalTests,
      0
    );
    const totalPassed = results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = results.reduce((sum, suite) => sum + suite.failed, 0);
    const totalSkipped = results.reduce((sum, suite) => sum + suite.skipped, 0);
    const totalDuration = results.reduce(
      (sum, suite) => sum + suite.duration,
      0
    );

    let report = `
📊 测试执行报告
================

总体统计:
- 测试套件: ${totalSuites}
- 测试用例: ${totalTests}
- 通过: ${totalPassed} ✅
- 失败: ${totalFailed} ❌
- 跳过: ${totalSkipped} ⏭️
- 总耗时: ${(totalDuration / 1000).toFixed(2)}s

`;

    // 详细结果
    results.forEach((suite) => {
      const passRate =
        suite.totalTests > 0
          ? ((suite.passed / suite.totalTests) * 100).toFixed(1)
          : "0";
      report += `\n📋 ${suite.suiteName}\n`;
      report += `   通过率: ${passRate}% (${suite.passed}/${suite.totalTests})\n`;
      report += `   耗时: ${(suite.duration / 1000).toFixed(2)}s\n`;

      // 失败的测试
      const failedTests = suite.results.filter((r) => r.status === "failed");
      if (failedTests.length > 0) {
        report += `   ❌ 失败的测试:\n`;
        failedTests.forEach((test) => {
          report += `      - ${test.name}: ${test.error?.message || "未知错误"}\n`;
        });
      }
    });

    return report;
  }
}

// 便捷函数
export const {
  expect,
  expectAsync,
  expectThrows,
  expectAsyncThrows,
  expectPerformance,
} = Assertions;
export const { mockFunction, mockObject, spyOn, restoreAll, clearAll } =
  MockingTools;

// 创建全局测试运行器实例
export const testRunner = new TestRunner();

// 便捷的测试定义函数
export function describe(name: string, suiteFn: () => void): void {
  const suite: TestSuite = { name, tests: [] };

  // 全局测试上下文
  (globalThis as any).currentSuite = suite;

  try {
    suiteFn();
  } finally {
    delete (globalThis as any).currentSuite;
    testRunner.addSuite(suite);
  }
}

export function it(name: string, testFn: () => void | Promise<void>): void {
  const currentSuite = (globalThis as any).currentSuite as TestSuite;
  if (!currentSuite) {
    throw new Error("it() must be called within describe()");
  }

  currentSuite.tests.push({
    name,
    test: testFn,
  });
}

export function beforeAll(setupFn: () => void | Promise<void>): void {
  const currentSuite = (globalThis as any).currentSuite as TestSuite;
  if (!currentSuite) {
    throw new Error("beforeAll() must be called within describe()");
  }
  currentSuite.setup = setupFn;
}

export function afterAll(teardownFn: () => void | Promise<void>): void {
  const currentSuite = (globalThis as any).currentSuite as TestSuite;
  if (!currentSuite) {
    throw new Error("afterAll() must be called within describe()");
  }
  currentSuite.teardown = teardownFn;
}

export function beforeEach(setupFn: () => void | Promise<void>): void {
  const currentSuite = (globalThis as any).currentSuite as TestSuite;
  if (!currentSuite) {
    throw new Error("beforeEach() must be called within describe()");
  }
  currentSuite.beforeEach = setupFn;
}

export function afterEach(teardownFn: () => void | Promise<void>): void {
  const currentSuite = (globalThis as any).currentSuite as TestSuite;
  if (!currentSuite) {
    throw new Error("afterEach() must be called within describe()");
  }
  currentSuite.afterEach = teardownFn;
}

// 性能测试工具
export class PerformanceTest {
  static async benchmark(
    name: string,
    fn: () => void | Promise<void>,
    options: {
      iterations?: number;
      warmup?: number;
      timeout?: number;
    } = {}
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    opsPerSecond: number;
  }> {
    const iterations = options.iterations || 1000;
    const warmup = options.warmup || 100;
    const timeout = options.timeout || 30000;

    // 预热
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // 基准测试
    const times: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await fn();
      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);

      // 检查超时
      if (performance.now() - startTime > timeout) {
        break;
      }
    }

    const totalTime = performance.now() - startTime;
    const averageTime =
      times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = (times.length / totalTime) * 1000;

    return {
      name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      opsPerSecond,
    };
  }

  static async profile<T>(fn: () => T | Promise<T>): Promise<{
    result: T;
    metrics: {
      executionTime: number;
      memoryBefore?: NodeJS.MemoryUsage;
      memoryAfter?: NodeJS.MemoryUsage;
      memoryDelta?: {
        heapUsed: number;
        heapTotal: number;
        external: number;
      };
    };
  }> {
    const memoryBefore =
      typeof process !== "undefined" && process.memoryUsage
        ? process.memoryUsage()
        : undefined;
    const startTime = performance.now();

    const result = await fn();

    const endTime = performance.now();
    const memoryAfter =
      typeof process !== "undefined" && process.memoryUsage
        ? process.memoryUsage()
        : undefined;

    let memoryDelta;
    if (memoryBefore && memoryAfter) {
      memoryDelta = {
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        external: memoryAfter.external - memoryBefore.external,
      };
    }

    return {
      result,
      metrics: {
        executionTime: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryDelta,
      },
    };
  }
}

export default {
  TestRunner,
  Assertions,
  MockingTools,
  PerformanceTest,
  testRunner,
  expect,
  expectAsync,
  expectThrows,
  expectAsyncThrows,
  expectPerformance,
  mockFunction,
  mockObject,
  spyOn,
  restoreAll,
  clearAll,
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
};
