/**
 * 核心基础设施服务 - 统一导出
 *
 * 模块：
 * - API客户端：统一的HTTP请求处理
 * - 数据库管理：表结构检查和健康监控
 * - 缓存管理：高效的数据缓存策略
 * - 日志系统：结构化日志记录（复用现有）
 * - 性能监控：系统性能追踪（复用现有）
 * - 数据验证：输入数据校验（复用现有）
 * - 错误处理：统一的错误处理策略（复用现有）
 */

// API客户端
export {
  APIClient,
  apiClient,
  handleApiError,
  type APIRequestConfig,
  type APIResponse,
} from "./api";

// 数据库管理
export {
  DatabaseManager,
  databaseManager,
  checkTableExists,
  checkViewExists,
  type DatabaseConfig,
} from "./database";

// 缓存管理
export {
  CacheManager,
  globalCache,
  requestCache,
  userCache,
  dataCache,
  type CacheItem,
  type CacheConfig,
} from "./cache";

// 复用现有的工具模块
export { logError, logInfo, logWarn } from "@/utils/logger";
export {
  initializePerformanceOptimizer,
  PerformanceMonitor,
} from "@/utils/performanceOptimizer";
export {
  initGlobalErrorHandlers,
  reduceBrowserWorkload,
  checkBrowserResources,
} from "@/utils/errorHandlers";

// 核心服务初始化函数
export async function initializeCoreServices(): Promise<{
  success: boolean;
  services: {
    database: boolean;
    cache: boolean;
    api: boolean;
    logging: boolean;
  };
  errors: string[];
}> {
  const services = {
    database: false,
    cache: false,
    api: false,
    logging: false,
  };
  const errors: string[] = [];

  try {
    // 初始化日志系统
    try {
      logInfo("初始化核心服务");
      services.logging = true;
    } catch (error) {
      errors.push(`日志系统初始化失败: ${error.message}`);
    }

    // 检查数据库健康状态
    try {
      const healthCheck = await databaseManager.healthCheck();
      services.database = healthCheck.status !== "unhealthy";

      if (!services.database) {
        errors.push(`数据库不健康: ${healthCheck.details.errors.join(", ")}`);
      }
    } catch (error) {
      errors.push(`数据库检查失败: ${error.message}`);
    }

    // 初始化缓存系统
    try {
      // 缓存系统自动初始化，只需要验证可用性
      globalCache.set("test", "test", 1000);
      const testResult = globalCache.get("test");
      services.cache = testResult === "test";
      globalCache.delete("test");

      if (!services.cache) {
        errors.push("缓存系统测试失败");
      }
    } catch (error) {
      errors.push(`缓存系统初始化失败: ${error.message}`);
    }

    // 初始化API客户端
    try {
      // API客户端自动初始化，只需要验证可用性
      const testResponse = await apiClient.query("user_profiles", { limit: 1 });
      services.api =
        testResponse.success || testResponse.code !== "UNKNOWN_ERROR";

      if (!services.api) {
        errors.push(`API客户端测试失败: ${testResponse.error}`);
      }
    } catch (error) {
      errors.push(`API客户端初始化失败: ${error.message}`);
    }

    const success = Object.values(services).every((status) => status);

    if (success) {
      logInfo("核心服务初始化完成", services);
    } else {
      logError("核心服务初始化部分失败", { services, errors });
    }

    return { success, services, errors };
  } catch (error) {
    const criticalError = `核心服务初始化严重失败: ${error.message}`;
    errors.push(criticalError);

    try {
      logError(criticalError, error);
    } catch {
      console.error(criticalError, error);
    }

    return {
      success: false,
      services,
      errors,
    };
  }
}

// 核心服务健康检查
export async function checkCoreServicesHealth(): Promise<{
  overall: "healthy" | "degraded" | "unhealthy";
  services: {
    database: "healthy" | "degraded" | "unhealthy";
    cache: "healthy" | "degraded" | "unhealthy";
    api: "healthy" | "degraded" | "unhealthy";
  };
  details: any;
}> {
  const services = {
    database: "unhealthy" as const,
    cache: "unhealthy" as const,
    api: "unhealthy" as const,
  };

  const details: any = {};

  // 检查数据库
  try {
    const dbHealth = await databaseManager.healthCheck();
    services.database = dbHealth.status;
    details.database = dbHealth.details;
  } catch (error) {
    details.database = { error: error.message };
  }

  // 检查缓存
  try {
    const cacheStats = globalCache.getStats();
    services.cache = cacheStats.hitRate >= 0 ? "healthy" : "degraded";
    details.cache = cacheStats;
  } catch (error) {
    details.cache = { error: error.message };
  }

  // 检查API客户端
  try {
    const apiTest = await apiClient.query("user_profiles", { limit: 1 });
    services.api = apiTest.success ? "healthy" : "degraded";
    details.api = { success: apiTest.success, error: apiTest.error };
  } catch (error) {
    details.api = { error: error.message };
  }

  // 计算整体健康状态
  const healthyCount = Object.values(services).filter(
    (status) => status === "healthy"
  ).length;
  const degradedCount = Object.values(services).filter(
    (status) => status === "degraded"
  ).length;

  let overall: "healthy" | "degraded" | "unhealthy";
  if (healthyCount === 3) {
    overall = "healthy";
  } else if (healthyCount + degradedCount >= 2) {
    overall = "degraded";
  } else {
    overall = "unhealthy";
  }

  return { overall, services, details };
}
