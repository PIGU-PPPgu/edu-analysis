/**
 * 业务领域层统一入口
 * 导出所有业务服务的单例实例
 */

// 导入服务实例
import { examDataService } from "./ExamDataService";
import { gradeDataService } from "./GradeDataService";
import { studentDataService } from "./StudentDataService";
import { analysisDataService } from "./AnalysisDataService";

// 导出业务服务实例
export {
  examDataService,
  gradeDataService,
  studentDataService,
  analysisDataService,
};

// 导出业务服务类（用于类型推断和扩展）
export { ExamDataService } from "./ExamDataService";
export { GradeDataService } from "./GradeDataService";
export { StudentDataService } from "./StudentDataService";
export { AnalysisDataService } from "./AnalysisDataService";

// 统一的业务服务管理器
export class DomainServiceManager {
  private static instance: DomainServiceManager;

  public static getInstance(): DomainServiceManager {
    if (!DomainServiceManager.instance) {
      DomainServiceManager.instance = new DomainServiceManager();
    }
    return DomainServiceManager.instance;
  }

  private constructor() {
    console.log("[DomainServiceManager] 业务服务管理器初始化");
  }

  // 获取考试服务
  get exam() {
    return examDataService;
  }

  // 获取成绩服务
  get grade() {
    return gradeDataService;
  }

  // 获取学生服务
  get student() {
    return studentDataService;
  }

  // 获取分析服务
  get analysis() {
    return analysisDataService;
  }

  // 健康检查所有服务
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: Record<string, boolean>;
    timestamp: number;
  }> {
    try {
      const services = {
        exam: true,
        grade: true,
        student: true,
        analysis: true,
      };

      // 这里可以添加实际的服务健康检查逻辑
      // 例如：检查每个服务是否能正常响应

      const allHealthy = Object.values(services).every((healthy) => healthy);

      return {
        status: allHealthy ? "healthy" : "degraded",
        services,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[DomainServiceManager] 健康检查失败:", error);
      return {
        status: "unhealthy",
        services: {
          exam: false,
          grade: false,
          student: false,
          analysis: false,
        },
        timestamp: Date.now(),
      };
    }
  }

  // 清理所有服务的缓存
  async clearAllCaches(): Promise<void> {
    console.log("[DomainServiceManager] 清理所有服务缓存");

    try {
      // 通过DataGateway清理缓存（所有服务共享同一个DataGateway）
      const { getDataGateway } = await import("@/services/data");
      const gateway = getDataGateway();
      await gateway.clearCache();

      console.log("[DomainServiceManager] 所有缓存已清理");
    } catch (error) {
      console.error("[DomainServiceManager] 清理缓存失败:", error);
    }
  }

  // 获取所有服务的统计信息
  async getServicesStats(): Promise<{
    totalCalls: number;
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    try {
      // 通过DataGateway获取统计信息
      const { getDataGateway } = await import("@/services/data");
      const gateway = getDataGateway();
      const cacheStats = gateway.getCacheStats();

      return {
        totalCalls: cacheStats.totalRequests || 0,
        cacheHitRate: cacheStats.hitRate || 0,
        averageResponseTime: cacheStats.averageResponseTime || 0,
        errorRate: cacheStats.errorRate || 0,
      };
    } catch (error) {
      console.error("[DomainServiceManager] 获取服务统计失败:", error);
      return {
        totalCalls: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
      };
    }
  }
}

// 导出单例实例
export const domainServices = DomainServiceManager.getInstance();

// 便捷的导出方式
export default {
  exam: examDataService,
  grade: gradeDataService,
  student: studentDataService,
  analysis: analysisDataService,
  manager: domainServices,
};
