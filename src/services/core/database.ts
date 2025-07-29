/**
 * 数据库操作封装 - 核心基础设施
 *
 * 功能：
 * - 数据库连接管理
 * - 表结构检查
 * - 迁移管理
 * - 性能监控
 */

import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo } from "@/utils/logger";
import { toast } from "sonner";

// 表结构缓存
const tableCache = new Map<string, boolean>();
const viewCache = new Map<string, boolean>();

export interface DatabaseConfig {
  retries?: number;
  timeout?: number;
  enableCache?: boolean;
}

/**
 * 数据库管理器
 */
export class DatabaseManager {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      retries: 3,
      timeout: 30000,
      enableCache: true,
      ...config,
    };
  }

  /**
   * 检查表是否存在
   */
  async checkTableExists(tableName: string): Promise<boolean> {
    // 从缓存中获取结果
    if (this.config.enableCache && tableCache.has(tableName)) {
      return tableCache.get(tableName)!;
    }

    try {
      logInfo(`检查表是否存在: ${tableName}`);

      // 尝试查询表结构
      const { data, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true })
        .limit(1);

      const exists = !error;

      // 缓存结果
      if (this.config.enableCache) {
        tableCache.set(tableName, exists);
      }

      logInfo(`表 ${tableName} ${exists ? "存在" : "不存在"}`);
      return exists;
    } catch (error) {
      logError(`检查表 ${tableName} 时出错:`, error);

      // 缓存失败结果
      if (this.config.enableCache) {
        tableCache.set(tableName, false);
      }

      return false;
    }
  }

  /**
   * 检查视图是否存在
   */
  async checkViewExists(viewName: string): Promise<boolean> {
    // 从缓存中获取结果
    if (this.config.enableCache && viewCache.has(viewName)) {
      return viewCache.get(viewName)!;
    }

    try {
      logInfo(`检查视图是否存在: ${viewName}`);

      // 尝试查询视图
      const { error } = await supabase.from(viewName).select("*").limit(1);

      const exists = !error;

      // 缓存结果
      if (this.config.enableCache) {
        viewCache.set(viewName, exists);
      }

      logInfo(`视图 ${viewName} ${exists ? "存在" : "不存在"}`);
      return exists;
    } catch (error) {
      logError(`检查视图 ${viewName} 时出错:`, error);

      // 缓存失败结果
      if (this.config.enableCache) {
        viewCache.set(viewName, false);
      }

      return false;
    }
  }

  /**
   * 获取表信息
   */
  async getTableInfo(tableName: string): Promise<{
    exists: boolean;
    columns?: string[];
    rowCount?: number;
  }> {
    try {
      logInfo(`获取表信息: ${tableName}`);

      // 检查表是否存在
      const exists = await this.checkTableExists(tableName);

      if (!exists) {
        return { exists: false };
      }

      // 获取列信息（通过查询一行数据推断）
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      let columns: string[] = [];
      if (!sampleError && sampleData && sampleData.length > 0) {
        columns = Object.keys(sampleData[0]);
      }

      // 获取行数
      const { count, error: countError } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      const rowCount = !countError ? count || 0 : undefined;

      return {
        exists: true,
        columns,
        rowCount,
      };
    } catch (error) {
      logError(`获取表 ${tableName} 信息时出错:`, error);
      return { exists: false };
    }
  }

  /**
   * 批量检查表存在性
   */
  async checkTablesExist(
    tableNames: string[]
  ): Promise<Record<string, boolean>> {
    logInfo("批量检查表存在性", { tables: tableNames });

    const results: Record<string, boolean> = {};

    // 并行检查所有表
    const promises = tableNames.map(async (tableName) => {
      const exists = await this.checkTableExists(tableName);
      results[tableName] = exists;
    });

    await Promise.all(promises);

    logInfo("表存在性检查完成", results);
    return results;
  }

  /**
   * 数据库健康检查
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: {
      connection: boolean;
      latency: number;
      coreTablesExist: boolean;
      errors: string[];
    };
  }> {
    const startTime = Date.now();
    const details = {
      connection: false,
      latency: 0,
      coreTablesExist: false,
      errors: [] as string[],
    };

    try {
      logInfo("开始数据库健康检查");

      // 测试连接
      const { error: connectionError } = await supabase
        .from("user_profiles")
        .select("id")
        .limit(1);

      details.connection = !connectionError;
      details.latency = Date.now() - startTime;

      if (connectionError) {
        details.errors.push(`连接失败: ${connectionError.message}`);
      }

      // 检查核心表
      const coreTables = [
        "user_profiles",
        "students",
        "grade_data",
        "homework",
      ];
      const tableStatus = await this.checkTablesExist(coreTables);

      details.coreTablesExist = Object.values(tableStatus).every(
        (exists) => exists
      );

      if (!details.coreTablesExist) {
        const missingTables = Object.entries(tableStatus)
          .filter(([, exists]) => !exists)
          .map(([table]) => table);
        details.errors.push(`缺少核心表: ${missingTables.join(", ")}`);
      }

      // 确定健康状态
      let status: "healthy" | "degraded" | "unhealthy";

      if (!details.connection) {
        status = "unhealthy";
      } else if (!details.coreTablesExist || details.latency > 5000) {
        status = "degraded";
      } else {
        status = "healthy";
      }

      logInfo("数据库健康检查完成", { status, ...details });

      return { status, details };
    } catch (error) {
      logError("数据库健康检查失败:", error);

      details.errors.push(`健康检查异常: ${error.message}`);
      details.latency = Date.now() - startTime;

      return {
        status: "unhealthy",
        details,
      };
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    tableCache.clear();
    viewCache.clear();
    logInfo("数据库缓存已清理");
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): {
    tables: number;
    views: number;
  } {
    return {
      tables: tableCache.size,
      views: viewCache.size,
    };
  }

  /**
   * 执行数据库迁移检查
   */
  async checkMigrationStatus(): Promise<{
    status: "up-to-date" | "pending" | "error";
    migrations: Array<{
      name: string;
      applied: boolean;
      error?: string;
    }>;
  }> {
    try {
      logInfo("检查数据库迁移状态");

      // 检查迁移相关的表和视图
      const migrationItems = [
        { name: "users", type: "table" },
        { name: "user_profiles", type: "table" },
        { name: "students", type: "table" },
        { name: "grade_data", type: "table" },
        { name: "homework", type: "table" },
        { name: "class_statistics", type: "view" },
      ];

      const migrations = [];
      let hasPending = false;
      let hasError = false;

      for (const item of migrationItems) {
        try {
          const exists =
            item.type === "table"
              ? await this.checkTableExists(item.name)
              : await this.checkViewExists(item.name);

          migrations.push({
            name: item.name,
            applied: exists,
          });

          if (!exists) {
            hasPending = true;
          }
        } catch (error) {
          hasError = true;
          migrations.push({
            name: item.name,
            applied: false,
            error: error.message,
          });
        }
      }

      const status = hasError ? "error" : hasPending ? "pending" : "up-to-date";

      logInfo("迁移状态检查完成", { status, migrations: migrations.length });

      return { status, migrations };
    } catch (error) {
      logError("检查迁移状态失败:", error);

      return {
        status: "error",
        migrations: [
          {
            name: "migration_check",
            applied: false,
            error: error.message,
          },
        ],
      };
    }
  }
}

// 导出单例实例
export const databaseManager = new DatabaseManager();

// 向后兼容的函数
export const checkTableExists = (tableName: string) =>
  databaseManager.checkTableExists(tableName);

export const checkViewExists = (viewName: string) =>
  databaseManager.checkViewExists(viewName);
