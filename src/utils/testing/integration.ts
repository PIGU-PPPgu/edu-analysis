/**
 * 集成测试框架 - 用于测试系统各组件间的交互
 *
 * 功能特性：
 * - API端到端测试
 * - 数据库集成测试
 * - 服务间通信测试
 * - 工作流集成测试
 * - 环境模拟和隔离
 * - 数据种子和清理
 */

import { expect, mockFunction, spyOn } from "./index";
import { logError, logInfo, logWarn } from "@/utils/logger";

// 集成测试类型定义
export interface IntegrationTestConfig {
  environment: "test" | "staging" | "local";
  database?: {
    url: string;
    migrations?: boolean;
    seedData?: boolean;
    cleanup?: boolean;
  };
  services?: {
    [serviceName: string]: {
      url: string;
      timeout?: number;
      retry?: number;
    };
  };
  mocks?: {
    [serviceName: string]: any;
  };
}

export interface TestDataSeeder {
  seed(): Promise<void>;
  cleanup(): Promise<void>;
  generateTestData<T>(count: number, factory: () => T): T[];
}

export interface APITestClient {
  get(url: string, options?: RequestOptions): Promise<TestResponse>;
  post(
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<TestResponse>;
  put(url: string, data?: any, options?: RequestOptions): Promise<TestResponse>;
  delete(url: string, options?: RequestOptions): Promise<TestResponse>;
  patch(
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<TestResponse>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
  query?: Record<string, any>;
}

export interface TestResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  time: number;
}

export interface DatabaseTestHelper {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  migrate(): Promise<void>;
  rollback(): Promise<void>;
  seed(): Promise<void>;
  cleanup(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}

export interface ServiceTestHelper {
  startService(name: string): Promise<void>;
  stopService(name: string): Promise<void>;
  restartService(name: string): Promise<void>;
  isServiceRunning(name: string): Promise<boolean>;
  waitForService(name: string, timeout?: number): Promise<void>;
  getServiceLogs(name: string, lines?: number): Promise<string[]>;
}

/**
 * 集成测试运行器
 */
export class IntegrationTestRunner {
  private config: IntegrationTestConfig;
  private apiClient: APITestClient;
  private dbHelper: DatabaseTestHelper;
  private serviceHelper: ServiceTestHelper;
  private dataSeeder: TestDataSeeder;
  private testData: Map<string, any> = new Map();

  constructor(config: IntegrationTestConfig) {
    this.config = config;
    this.apiClient = new MockAPITestClient(config);
    this.dbHelper = new MockDatabaseTestHelper(config.database);
    this.serviceHelper = new MockServiceTestHelper(config.services);
    this.dataSeeder = new MockTestDataSeeder();
  }

  /**
   * 初始化测试环境
   */
  async setup(): Promise<void> {
    try {
      logInfo("初始化集成测试环境", { environment: this.config.environment });

      // 数据库连接和迁移
      if (this.config.database) {
        await this.dbHelper.connect();

        if (this.config.database.migrations) {
          await this.dbHelper.migrate();
        }

        if (this.config.database.seedData) {
          await this.dataSeeder.seed();
        }
      }

      // 启动服务
      if (this.config.services) {
        for (const serviceName of Object.keys(this.config.services)) {
          await this.serviceHelper.startService(serviceName);
          await this.serviceHelper.waitForService(serviceName, 30000);
        }
      }

      logInfo("集成测试环境初始化完成");
    } catch (error) {
      logError("集成测试环境初始化失败", error);
      throw error;
    }
  }

  /**
   * 清理测试环境
   */
  async teardown(): Promise<void> {
    try {
      logInfo("清理集成测试环境");

      // 清理测试数据
      if (this.config.database?.cleanup) {
        await this.dataSeeder.cleanup();
      }

      // 停止服务
      if (this.config.services) {
        for (const serviceName of Object.keys(this.config.services)) {
          await this.serviceHelper.stopService(serviceName);
        }
      }

      // 断开数据库连接
      if (this.config.database) {
        await this.dbHelper.disconnect();
      }

      // 清理测试数据
      this.testData.clear();

      logInfo("集成测试环境清理完成");
    } catch (error) {
      logWarn("集成测试环境清理失败", error);
    }
  }

  /**
   * 获取API测试客户端
   */
  getAPIClient(): APITestClient {
    return this.apiClient;
  }

  /**
   * 获取数据库测试助手
   */
  getDatabaseHelper(): DatabaseTestHelper {
    return this.dbHelper;
  }

  /**
   * 获取服务测试助手
   */
  getServiceHelper(): ServiceTestHelper {
    return this.serviceHelper;
  }

  /**
   * 获取数据种子器
   */
  getDataSeeder(): TestDataSeeder {
    return this.dataSeeder;
  }

  /**
   * 存储测试数据
   */
  setTestData(key: string, value: any): void {
    this.testData.set(key, value);
  }

  /**
   * 获取测试数据
   */
  getTestData<T = any>(key: string): T | undefined {
    return this.testData.get(key);
  }

  /**
   * 等待条件满足
   */
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 30000,
    interval: number = 500
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        // 继续等待
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`条件等待超时: ${timeout}ms`);
  }

  /**
   * 验证服务健康状态
   */
  async verifyServicesHealth(): Promise<void> {
    if (!this.config.services) return;

    for (const [serviceName, serviceConfig] of Object.entries(
      this.config.services
    )) {
      const isRunning = await this.serviceHelper.isServiceRunning(serviceName);
      if (!isRunning) {
        throw new Error(`服务 ${serviceName} 未运行`);
      }

      // 健康检查
      try {
        await this.apiClient.get(`${serviceConfig.url}/health`, {
          timeout: serviceConfig.timeout || 5000,
        });
      } catch (error) {
        throw new Error(`服务 ${serviceName} 健康检查失败: ${error.message}`);
      }
    }
  }
}

/**
 * 模拟API测试客户端
 */
class MockAPITestClient implements APITestClient {
  private config: IntegrationTestConfig;
  private defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Integration-Test-Client/1.0",
  };

  constructor(config: IntegrationTestConfig) {
    this.config = config;
  }

  async get(url: string, options?: RequestOptions): Promise<TestResponse> {
    return this.makeRequest("GET", url, undefined, options);
  }

  async post(
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<TestResponse> {
    return this.makeRequest("POST", url, data, options);
  }

  async put(
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<TestResponse> {
    return this.makeRequest("PUT", url, data, options);
  }

  async delete(url: string, options?: RequestOptions): Promise<TestResponse> {
    return this.makeRequest("DELETE", url, undefined, options);
  }

  async patch(
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<TestResponse> {
    return this.makeRequest("PATCH", url, data, options);
  }

  private async makeRequest(
    method: string,
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<TestResponse> {
    const startTime = Date.now();

    try {
      // 构建完整URL
      const fullUrl = this.buildFullUrl(url, options?.query);

      // 构建请求头
      const headers = {
        ...this.defaultHeaders,
        ...options?.headers,
      };

      // 添加认证
      if (options?.auth) {
        if (options.auth.token) {
          headers["Authorization"] = `Bearer ${options.auth.token}`;
        } else if (options.auth.username && options.auth.password) {
          const credentials = btoa(
            `${options.auth.username}:${options.auth.password}`
          );
          headers["Authorization"] = `Basic ${credentials}`;
        }
      }

      // 模拟HTTP请求
      const response = await this.simulateRequest(
        method,
        fullUrl,
        data,
        headers,
        options?.timeout
      );

      const endTime = Date.now();

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        time: endTime - startTime,
      };
    } catch (error) {
      const endTime = Date.now();

      return {
        status: 500,
        data: { error: error.message },
        headers: {},
        time: endTime - startTime,
      };
    }
  }

  private buildFullUrl(url: string, query?: Record<string, any>): string {
    let fullUrl = url;

    // 添加查询参数
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        params.append(key, String(value));
      }
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + params.toString();
    }

    return fullUrl;
  }

  private async simulateRequest(
    method: string,
    url: string,
    data: any,
    headers: Record<string, string>,
    timeout?: number
  ): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    // 模拟网络延迟
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 检查超时
    if (timeout && delay > timeout) {
      throw new Error("Request timeout");
    }

    // 模拟不同的响应
    if (url.includes("/health")) {
      return {
        status: 200,
        data: { status: "healthy", timestamp: new Date().toISOString() },
        headers: { "Content-Type": "application/json" },
      };
    }

    if (url.includes("/api/")) {
      return {
        status: 200,
        data: {
          method,
          url,
          data,
          headers,
          timestamp: new Date().toISOString(),
        },
        headers: { "Content-Type": "application/json" },
      };
    }

    // 默认响应
    return {
      status: 404,
      data: { error: "Not found" },
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * 模拟数据库测试助手
 */
class MockDatabaseTestHelper implements DatabaseTestHelper {
  private config?: IntegrationTestConfig["database"];
  private connected = false;
  private mockData: Map<string, any[]> = new Map();

  constructor(config?: IntegrationTestConfig["database"]) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error("数据库配置未提供");
    }

    logInfo("连接测试数据库", { url: this.config.url });

    // 模拟连接延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.connected = true;
    logInfo("数据库连接成功");
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      logInfo("断开数据库连接");
      this.connected = false;
      this.mockData.clear();
    }
  }

  async migrate(): Promise<void> {
    this.ensureConnected();

    logInfo("执行数据库迁移");

    // 模拟迁移过程
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 创建模拟表结构
    this.mockData.set("users", []);
    this.mockData.set("homework", []);
    this.mockData.set("grades", []);
    this.mockData.set("knowledge_points", []);

    logInfo("数据库迁移完成");
  }

  async rollback(): Promise<void> {
    this.ensureConnected();

    logInfo("回滚数据库迁移");

    // 模拟回滚过程
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.mockData.clear();

    logInfo("数据库回滚完成");
  }

  async seed(): Promise<void> {
    this.ensureConnected();

    logInfo("播种测试数据");

    // 模拟种子数据
    await this.insertMockData("users", [
      { id: "1", name: "测试用户1", email: "test1@example.com" },
      { id: "2", name: "测试用户2", email: "test2@example.com" },
    ]);

    await this.insertMockData("homework", [
      { id: "1", title: "测试作业1", created_by: "1" },
      { id: "2", title: "测试作业2", created_by: "2" },
    ]);

    logInfo("测试数据播种完成");
  }

  async cleanup(): Promise<void> {
    this.ensureConnected();

    logInfo("清理测试数据");

    // 清理所有表数据
    for (const tableName of this.mockData.keys()) {
      this.mockData.set(tableName, []);
    }

    logInfo("测试数据清理完成");
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    this.ensureConnected();

    logInfo("执行数据库查询", { sql, params });

    // 模拟查询延迟
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 简化的SQL解析和执行
    const result = this.executeMockQuery<T>(sql, params);

    logInfo("查询执行完成", { resultCount: result.length });

    return result;
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    this.ensureConnected();

    logInfo("开始事务");

    try {
      // 创建模拟事务对象
      const mockTransaction = {
        query: this.query.bind(this),
        commit: async () => logInfo("事务提交"),
        rollback: async () => logInfo("事务回滚"),
      };

      const result = await callback(mockTransaction);
      await mockTransaction.commit();

      return result;
    } catch (error) {
      logError("事务执行失败", error);
      throw error;
    }
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error("数据库未连接");
    }
  }

  private async insertMockData(tableName: string, data: any[]): Promise<void> {
    const table = this.mockData.get(tableName) || [];
    table.push(...data);
    this.mockData.set(tableName, table);
  }

  private executeMockQuery<T>(sql: string, params?: any[]): T[] {
    // 简化的SQL解析
    const lowerSql = sql.toLowerCase().trim();

    if (lowerSql.startsWith("select")) {
      return this.executeMockSelect<T>(sql, params);
    } else if (lowerSql.startsWith("insert")) {
      return this.executeMockInsert<T>(sql, params);
    } else if (lowerSql.startsWith("update")) {
      return this.executeMockUpdate<T>(sql, params);
    } else if (lowerSql.startsWith("delete")) {
      return this.executeMockDelete<T>(sql, params);
    }

    return [] as T[];
  }

  private executeMockSelect<T>(sql: string, params?: any[]): T[] {
    // 提取表名（简化实现）
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const table = this.mockData.get(tableName);

    if (!table) return [];

    // 返回模拟数据
    return table.slice() as T[];
  }

  private executeMockInsert<T>(sql: string, params?: any[]): T[] {
    // 简化实现：返回插入的ID
    return [{ id: Date.now().toString() }] as T[];
  }

  private executeMockUpdate<T>(sql: string, params?: any[]): T[] {
    // 简化实现：返回受影响的行数
    return [{ affected_rows: 1 }] as T[];
  }

  private executeMockDelete<T>(sql: string, params?: any[]): T[] {
    // 简化实现：返回删除的行数
    return [{ deleted_rows: 1 }] as T[];
  }
}

/**
 * 模拟服务测试助手
 */
class MockServiceTestHelper implements ServiceTestHelper {
  private services: Record<string, any>;
  private runningServices = new Set<string>();

  constructor(services?: Record<string, any>) {
    this.services = services || {};
  }

  async startService(name: string): Promise<void> {
    if (!this.services[name]) {
      throw new Error(`服务配置未找到: ${name}`);
    }

    logInfo(`启动服务: ${name}`);

    // 模拟启动延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.runningServices.add(name);

    logInfo(`服务启动成功: ${name}`);
  }

  async stopService(name: string): Promise<void> {
    if (!this.runningServices.has(name)) {
      logWarn(`服务未运行: ${name}`);
      return;
    }

    logInfo(`停止服务: ${name}`);

    // 模拟停止延迟
    await new Promise((resolve) => setTimeout(resolve, 200));

    this.runningServices.delete(name);

    logInfo(`服务停止成功: ${name}`);
  }

  async restartService(name: string): Promise<void> {
    await this.stopService(name);
    await this.startService(name);
  }

  async isServiceRunning(name: string): Promise<boolean> {
    return this.runningServices.has(name);
  }

  async waitForService(name: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.isServiceRunning(name)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`等待服务启动超时: ${name} (${timeout}ms)`);
  }

  async getServiceLogs(name: string, lines: number = 50): Promise<string[]> {
    if (!this.runningServices.has(name)) {
      return [`Service ${name} is not running`];
    }

    // 模拟日志
    const logs: string[] = [];
    for (let i = 0; i < Math.min(lines, 10); i++) {
      logs.push(
        `[${new Date().toISOString()}] ${name}: Mock log entry ${i + 1}`
      );
    }

    return logs;
  }
}

/**
 * 模拟测试数据种子器
 */
class MockTestDataSeeder implements TestDataSeeder {
  private seededData: any[] = [];

  async seed(): Promise<void> {
    logInfo("开始播种测试数据");

    // 模拟数据播种过程
    await new Promise((resolve) => setTimeout(resolve, 300));

    this.seededData = [
      { type: "user", id: "1", name: "测试用户1" },
      { type: "user", id: "2", name: "测试用户2" },
      { type: "homework", id: "1", title: "测试作业1" },
      { type: "homework", id: "2", title: "测试作业2" },
    ];

    logInfo("测试数据播种完成", { count: this.seededData.length });
  }

  async cleanup(): Promise<void> {
    logInfo("开始清理测试数据");

    // 模拟数据清理过程
    await new Promise((resolve) => setTimeout(resolve, 200));

    this.seededData = [];

    logInfo("测试数据清理完成");
  }

  generateTestData<T>(count: number, factory: () => T): T[] {
    const data: T[] = [];

    for (let i = 0; i < count; i++) {
      data.push(factory());
    }

    return data;
  }
}

/**
 * 集成测试断言扩展
 */
export class IntegrationAssertions {
  /**
   * 断言API响应状态
   */
  static expectAPIResponseStatus(
    response: TestResponse,
    expectedStatus: number
  ): void {
    expect(response.status).toBe(expectedStatus);
  }

  /**
   * 断言API响应时间
   */
  static expectAPIResponseTime(response: TestResponse, maxTime: number): void {
    expect(response.time).toBeLessThanOrEqual(maxTime);
  }

  /**
   * 断言API响应数据结构
   */
  static expectAPIResponseStructure(
    response: TestResponse,
    structure: Record<string, any>
  ): void {
    expect(response.data).toMatchObject(structure);
  }

  /**
   * 断言数据库记录存在
   */
  static async expectDatabaseRecordExists(
    dbHelper: DatabaseTestHelper,
    table: string,
    conditions: Record<string, any>
  ): Promise<void> {
    const whereClause = Object.entries(conditions)
      .map(([key, value]) => `${key} = '${value}'`)
      .join(" AND ");

    const results = await dbHelper.query(
      `SELECT * FROM ${table} WHERE ${whereClause}`
    );
    expect(results.length).toBeGreaterThan(0);
  }

  /**
   * 断言服务健康状态
   */
  static async expectServiceHealthy(
    apiClient: APITestClient,
    serviceUrl: string
  ): Promise<void> {
    const response = await apiClient.get(`${serviceUrl}/health`);
    IntegrationAssertions.expectAPIResponseStatus(response, 200);
    expect(response.data.status).toBe("healthy");
  }

  /**
   * 断言工作流完成
   */
  static async expectWorkflowCompleted(
    condition: () => Promise<boolean>,
    timeout: number = 30000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`工作流未在预期时间内完成: ${timeout}ms`);
  }
}

// 便捷函数
export function createIntegrationTestRunner(
  config: IntegrationTestConfig
): IntegrationTestRunner {
  return new IntegrationTestRunner(config);
}

export function createTestConfig(
  overrides: Partial<IntegrationTestConfig> = {}
): IntegrationTestConfig {
  return {
    environment: "test",
    database: {
      url: "postgresql://test:test@localhost:5432/test_db",
      migrations: true,
      seedData: true,
      cleanup: true,
    },
    services: {
      api: {
        url: "http://localhost:3001",
        timeout: 5000,
        retry: 3,
      },
    },
    ...overrides,
  };
}

export default {
  IntegrationTestRunner,
  IntegrationAssertions,
  createIntegrationTestRunner,
  createTestConfig,
};
