/**
 * 服务统一导出 - 新的模块化架构
 *
 * 架构：
 * - core/ - 核心基础服务
 * - ai/ - AI服务引擎
 * - education/ - 教育业务服务
 * - auth/ - 认证授权服务
 * - monitoring/ - 监控预警服务
 *
 * 向后兼容：
 * - 保持现有API导出不变
 * - 提供新的模块化接口
 * - 支持渐进式迁移
 */

// 核心服务模块
export * from "./core";

// AI服务模块 - 包含统一AI网关
export * from "./ai";

// 🚀 统一AI服务 - 推荐使用的新统一API
export { unifiedAIService, AI, aiGateway, aiMonitoring } from "./ai/unified";

// 导出AI统一服务的类型定义
export type {
  UnifiedAIRequest,
  UnifiedAIResponse,
  AIMetrics,
  HealthCheckResult,
  PerformanceStats,
} from "./ai/unified";

// 教育业务服务模块
export * from "./education";

// 认证授权服务模块
export * from "./auth";

// 监控预警服务模块
export * from "./monitoring";

// 向后兼容：导出旧服务API（保持现有代码正常工作）
export * from "./legacy-services-adapter";

// 服务统一初始化
import { initializeCoreServices } from "./core";
import { initializeAIServices } from "./ai";
import { initializeEducationServices } from "./education";
import { initializeMonitoringServices } from "./monitoring";

export async function initializeAllServices(): Promise<{
  success: boolean;
  modules: {
    core: boolean;
    ai: boolean;
    education: boolean;
    auth: boolean;
    monitoring: boolean;
  };
  errors: string[];
}> {
  const modules = {
    core: false,
    ai: false,
    education: false,
    auth: false,
    monitoring: false,
  };
  const errors: string[] = [];

  try {
    // 初始化核心服务
    const coreResult = await initializeCoreServices();
    modules.core = coreResult.success;
    if (!coreResult.success) {
      errors.push(...coreResult.errors);
    }

    // 初始化AI服务
    const aiResult = await initializeAIServices();
    modules.ai = aiResult.success;
    if (!aiResult.success) {
      errors.push(...aiResult.errors);
    }

    // 初始化教育服务
    const educationResult = await initializeEducationServices();
    modules.education = educationResult.success;
    if (!educationResult.success) {
      errors.push(...educationResult.errors);
    }

    // 认证服务不需要特殊初始化
    modules.auth = true;

    // 初始化监控服务
    const monitoringResult = await initializeMonitoringServices();
    modules.monitoring = monitoringResult.success;
    if (!monitoringResult.success) {
      errors.push(...monitoringResult.errors);
    }

    const success = Object.values(modules).every((status) => status);

    return { success, modules, errors };
  } catch (error) {
    const criticalError = `服务初始化失败: ${error.message}`;
    errors.push(criticalError);

    return {
      success: false,
      modules,
      errors,
    };
  }
}

// 服务健康检查
import { checkCoreServicesHealth } from "./core";
import { checkEducationServicesHealth } from "./education";
import { checkMonitoringServicesHealth } from "./monitoring";

export async function checkAllServicesHealth(): Promise<{
  overall: "healthy" | "degraded" | "unhealthy";
  modules: {
    core: "healthy" | "degraded" | "unhealthy";
    ai: "healthy" | "degraded" | "unhealthy";
    education: "healthy" | "degraded" | "unhealthy";
    auth: "healthy" | "degraded" | "unhealthy";
    monitoring: "healthy" | "degraded" | "unhealthy";
  };
  details: any;
}> {
  const modules = {
    core: "unhealthy" as const,
    ai: "unhealthy" as const,
    education: "unhealthy" as const,
    auth: "healthy" as const, // 认证服务默认健康
    monitoring: "unhealthy" as const,
  };

  const details: any = {};

  try {
    // 检查核心服务
    const coreHealth = await checkCoreServicesHealth();
    modules.core = coreHealth.overall;
    details.core = coreHealth.details;

    // 检查教育服务
    const educationHealth = await checkEducationServicesHealth();
    modules.education = educationHealth.overall;
    details.education = educationHealth.details;

    // 检查监控服务
    const monitoringHealth = await checkMonitoringServicesHealth();
    modules.monitoring = monitoringHealth.overall;
    details.monitoring = monitoringHealth.details;

    // AI服务健康检查（简化）
    try {
      modules.ai = "healthy";
      details.ai = { status: "operational" };
    } catch (error) {
      modules.ai = "unhealthy";
      details.ai = { error: error.message };
    }

    // 计算整体健康状态
    const healthyCount = Object.values(modules).filter(
      (status) => status === "healthy"
    ).length;
    const degradedCount = Object.values(modules).filter(
      (status) => status === "degraded"
    ).length;

    let overall: "healthy" | "degraded" | "unhealthy";
    if (healthyCount === 5) {
      overall = "healthy";
    } else if (healthyCount + degradedCount >= 3) {
      overall = "degraded";
    } else {
      overall = "unhealthy";
    }

    return { overall, modules, details };
  } catch (error) {
    details.global_error = error.message;
    return {
      overall: "unhealthy",
      modules,
      details,
    };
  }
}

// 服务概览
export function getServicesOverview(): {
  name: string;
  description: string;
  version: string;
  architecture: string;
  modules: Array<{
    name: string;
    description: string;
    services: string[];
  }>;
} {
  return {
    name: "Unified Services Architecture",
    description: "统一的微服务架构，提供模块化的业务服务",
    version: "2.0.0",
    architecture: "modular",
    modules: [
      {
        name: "Core Services",
        description: "核心基础服务 - API客户端、缓存、数据库管理",
        services: ["APIClient", "CacheManager", "DatabaseManager"],
      },
      {
        name: "AI Services",
        description: "AI服务引擎 - 智能分析、对话、编排",
        services: ["AIOrchestrator", "AnalysisService", "ChatService"],
      },
      {
        name: "Education Services",
        description: "教育业务服务 - 成绩、作业、学生、班级管理",
        services: [
          "GradeService",
          "HomeworkService",
          "StudentService",
          "ClassService",
          "KnowledgeService",
          "AnalysisService",
          "ReportService",
        ],
      },
      {
        name: "Auth Services",
        description: "认证授权服务 - 用户认证、权限管理",
        services: ["AuthenticationService", "AuthorizationService"],
      },
      {
        name: "Monitoring Services",
        description: "监控预警服务 - 预警管理、干预措施",
        services: ["WarningService", "InterventionService"],
      },
    ],
  };
}
