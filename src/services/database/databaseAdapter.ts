/**
 * 数据库适配器 - 混合架构核心
 * 实现Supabase和自建数据库的无缝切换
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import axios, { AxiosInstance } from "axios";

// 数据源类型
export enum DataSource {
  SUPABASE = "supabase",
  SELF_HOSTED = "self_hosted",
  HYBRID = "hybrid",
}

// 数据表分配策略
export const TABLE_ROUTING = {
  // 留在Supabase的表
  supabase: [
    "auth.users",
    "storage.objects",
    "notifications",
    "user_profiles",
    "user_settings",
  ],
  // 迁移到自建数据库的表
  selfHosted: [
    "students",
    "classes",
    "teachers",
    "exams",
    "exam_scores",
    "homeworks",
    "homework_submissions",
    "knowledge_points",
    "knowledge_mastery",
    "warning_rules",
    "warning_records",
    "student_portraits",
  ],
};

/**
 * 数据库适配器接口
 */
interface IDatabaseAdapter {
  query(table: string, options?: QueryOptions): Promise<any>;
  insert(table: string, data: any): Promise<any>;
  update(table: string, id: string, data: any): Promise<any>;
  delete(table: string, id: string): Promise<any>;
  transaction(operations: TransactionOperation[]): Promise<any>;
}

/**
 * 查询选项
 */
interface QueryOptions {
  select?: string;
  where?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * 事务操作
 */
interface TransactionOperation {
  type: "insert" | "update" | "delete";
  table: string;
  data?: any;
  id?: string;
}

/**
 * Supabase适配器
 */
class SupabaseAdapter implements IDatabaseAdapter {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async query(table: string, options: QueryOptions = {}) {
    let query = this.client.from(table).select(options.select || "*");

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase查询错误: ${error.message}`);
    }

    return data;
  }

  async insert(table: string, data: any) {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();

    if (error) {
      throw new Error(`Supabase插入错误: ${error.message}`);
    }

    return result;
  }

  async update(table: string, id: string, data: any) {
    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(`Supabase更新错误: ${error.message}`);
    }

    return result;
  }

  async delete(table: string, id: string) {
    const { error } = await this.client.from(table).delete().eq("id", id);

    if (error) {
      throw new Error(`Supabase删除错误: ${error.message}`);
    }

    return { success: true };
  }

  async transaction(operations: TransactionOperation[]) {
    // Supabase不支持原生事务，模拟实现
    // 注意: 无法保证原子性，失败时不会自动回滚
    const results = [];

    for (const op of operations) {
      let result;

      switch (op.type) {
        case "insert":
          result = await this.insert(op.table, op.data);
          break;
        case "update":
          result = await this.update(op.table, op.id!, op.data);
          break;
        case "delete":
          result = await this.delete(op.table, op.id!);
          break;
      }

      results.push(result);
    }

    return results;
  }
}

/**
 * 自建数据库适配器
 */
class SelfHostedAdapter implements IDatabaseAdapter {
  private api: AxiosInstance;

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = localStorage.getItem("api_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error("API错误:", error);
        return Promise.reject(error);
      }
    );
  }

  async query(table: string, options: QueryOptions = {}) {
    const response = await this.api.post(`/api/query`, {
      table,
      ...options,
    });

    return response.data;
  }

  async insert(table: string, data: any) {
    const response = await this.api.post(`/api/${table}`, data);
    return response.data;
  }

  async update(table: string, id: string, data: any) {
    const response = await this.api.put(`/api/${table}/${id}`, data);
    return response.data;
  }

  async delete(table: string, id: string) {
    const response = await this.api.delete(`/api/${table}/${id}`);
    return response.data;
  }

  async transaction(operations: TransactionOperation[]) {
    const response = await this.api.post("/api/transaction", {
      operations,
    });

    return response.data;
  }
}

/**
 * 混合数据库适配器（核心）
 */
export class HybridDatabaseAdapter implements IDatabaseAdapter {
  private supabaseAdapter: SupabaseAdapter;
  private selfHostedAdapter: SelfHostedAdapter;
  private config: DatabaseConfig;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = config;

    this.supabaseAdapter = new SupabaseAdapter(
      config.supabase.url,
      config.supabase.anonKey
    );

    this.selfHostedAdapter = new SelfHostedAdapter(config.selfHosted.apiUrl);
  }

  /**
   * 判断表应该使用哪个数据源
   */
  private getDataSource(table: string): DataSource {
    if (TABLE_ROUTING.supabase.includes(table)) {
      return DataSource.SUPABASE;
    }

    if (TABLE_ROUTING.selfHosted.includes(table)) {
      return DataSource.SELF_HOSTED;
    }

    // 默认使用自建数据库
    return DataSource.SELF_HOSTED;
  }

  /**
   * 获取对应的适配器
   */
  private getAdapter(table: string): IDatabaseAdapter {
    const source = this.getDataSource(table);

    if (source === DataSource.SUPABASE) {
      return this.supabaseAdapter;
    }

    return this.selfHostedAdapter;
  }

  /**
   * 查询数据（带缓存）
   */
  async query(table: string, options: QueryOptions = {}) {
    // 生成缓存键
    const cacheKey = this.getCacheKey(table, options);

    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 执行查询
    const adapter = this.getAdapter(table);
    const result = await adapter.query(table, options);

    // 写入缓存
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * 插入数据（双写模式）
   */
  async insert(table: string, data: any) {
    const adapter = this.getAdapter(table);
    const result = await adapter.insert(table, data);

    // 如果启用双写模式，同时写入另一个数据库
    if (this.config.enableDualWrite && this.shouldDualWrite(table)) {
      try {
        const secondaryAdapter = this.getSecondaryAdapter(table);
        await secondaryAdapter.insert(table, data);
      } catch (error) {
        console.error("双写失败:", error);
        // 记录双写失败，但不影响主写入
        this.logDualWriteError(table, "insert", data, error);
      }
    }

    // 清除相关缓存
    this.clearTableCache(table);

    return result;
  }

  /**
   * 更新数据（双写模式）
   */
  async update(table: string, id: string, data: any) {
    const adapter = this.getAdapter(table);
    const result = await adapter.update(table, id, data);

    // 双写处理
    if (this.config.enableDualWrite && this.shouldDualWrite(table)) {
      try {
        const secondaryAdapter = this.getSecondaryAdapter(table);
        await secondaryAdapter.update(table, id, data);
      } catch (error) {
        console.error("双写失败:", error);
        this.logDualWriteError(table, "update", { id, data }, error);
      }
    }

    // 清除相关缓存
    this.clearTableCache(table);

    return result;
  }

  /**
   * 删除数据
   */
  async delete(table: string, id: string) {
    const adapter = this.getAdapter(table);
    const result = await adapter.delete(table, id);

    // 双写处理
    if (this.config.enableDualWrite && this.shouldDualWrite(table)) {
      try {
        const secondaryAdapter = this.getSecondaryAdapter(table);
        await secondaryAdapter.delete(table, id);
      } catch (error) {
        console.error("双写失败:", error);
        this.logDualWriteError(table, "delete", { id }, error);
      }
    }

    // 清除相关缓存
    this.clearTableCache(table);

    return result;
  }

  /**
   * 事务处理
   */
  async transaction(operations: TransactionOperation[]) {
    // 按数据源分组操作
    const supabaseOps: TransactionOperation[] = [];
    const selfHostedOps: TransactionOperation[] = [];

    operations.forEach((op) => {
      const source = this.getDataSource(op.table);

      if (source === DataSource.SUPABASE) {
        supabaseOps.push(op);
      } else {
        selfHostedOps.push(op);
      }
    });

    const results = [];

    // 执行Supabase事务
    if (supabaseOps.length > 0) {
      const supabaseResults =
        await this.supabaseAdapter.transaction(supabaseOps);
      results.push(...supabaseResults);
    }

    // 执行自建数据库事务
    if (selfHostedOps.length > 0) {
      const selfHostedResults =
        await this.selfHostedAdapter.transaction(selfHostedOps);
      results.push(...selfHostedResults);
    }

    // 清除缓存
    operations.forEach((op) => this.clearTableCache(op.table));

    return results;
  }

  // ========== 辅助方法 ==========

  /**
   * 获取辅助适配器（用于双写）
   */
  private getSecondaryAdapter(table: string): IDatabaseAdapter {
    const primary = this.getDataSource(table);

    if (primary === DataSource.SUPABASE) {
      return this.selfHostedAdapter;
    }

    return this.supabaseAdapter;
  }

  /**
   * 判断是否需要双写
   */
  private shouldDualWrite(table: string): boolean {
    // 在迁移期间，这些表需要双写
    const dualWriteTables = [
      "students",
      "classes",
      "exam_scores",
      "warning_records",
    ];

    return dualWriteTables.includes(table);
  }

  /**
   * 记录双写错误
   */
  private logDualWriteError(
    table: string,
    operation: string,
    data: any,
    error: any
  ) {
    // 发送到错误追踪系统
    console.error("双写错误记录:", {
      table,
      operation,
      data,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // TODO: 存储到错误队列，后续重试
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(table: string, options: QueryOptions): string {
    return `${table}:${JSON.stringify(options)}`;
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): any {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 写入缓存
   */
  private setCache(key: string, data: any, ttl: number = 60000) {
    this.cache.set(key, {
      data,
      expireAt: Date.now() + ttl,
    });
  }

  /**
   * 清除表相关缓存
   */
  private clearTableCache(table: string) {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(`${table}:`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// ========== 类型定义 ==========

interface DatabaseConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  selfHosted: {
    apiUrl: string;
  };
  enableDualWrite: boolean;
  cacheEnabled: boolean;
}

interface CacheEntry {
  data: any;
  expireAt: number;
}

// ========== 单例实例 ==========

let dbAdapter: HybridDatabaseAdapter | null = null;

export function initDatabaseAdapter(config: DatabaseConfig) {
  dbAdapter = new HybridDatabaseAdapter(config);
  return dbAdapter;
}

export function getDatabaseAdapter(): HybridDatabaseAdapter {
  if (!dbAdapter) {
    throw new Error("数据库适配器未初始化，请先调用initDatabaseAdapter");
  }

  return dbAdapter;
}

// ========== 导出便捷方法 ==========

export const db = {
  query: (table: string, options?: QueryOptions) => {
    return getDatabaseAdapter().query(table, options);
  },

  insert: (table: string, data: any) => {
    return getDatabaseAdapter().insert(table, data);
  },

  update: (table: string, id: string, data: any) => {
    return getDatabaseAdapter().update(table, id, data);
  },

  delete: (table: string, id: string) => {
    return getDatabaseAdapter().delete(table, id);
  },

  transaction: (operations: TransactionOperation[]) => {
    return getDatabaseAdapter().transaction(operations);
  },
};
