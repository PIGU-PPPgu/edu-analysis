/**
 * 统一数据层入口
 * 导出单例的DataGateway实例和相关类型
 */

import { DataGateway } from "./DataGateway";
import { getCurrentDataConfig, checkDevConfig } from "@/config/dataConfig";

// 导出类型
export * from "./types";
export { DataCache } from "./DataCache";
export { SupabaseAdapter } from "./SupabaseAdapter";
export { DataGateway } from "./DataGateway";

// 创建全局单例实例
let dataGatewayInstance: DataGateway | null = null;

// 获取DataGateway单例实例
export const getDataGateway = (): DataGateway => {
  if (!dataGatewayInstance) {
    try {
      // 开发环境检查配置
      checkDevConfig();

      // 获取当前数据配置
      const config = getCurrentDataConfig();

      // 创建DataGateway实例
      dataGatewayInstance = new DataGateway(config);

      console.log("[DataGateway] 全局实例已创建");
    } catch (error) {
      console.error("[DataGateway] 创建实例失败:", error);
      throw error;
    }
  }

  return dataGatewayInstance;
};

// 重置DataGateway实例（主要用于测试或配置更改）
export const resetDataGateway = (): void => {
  if (dataGatewayInstance) {
    console.log("[DataGateway] 重置全局实例");
    dataGatewayInstance = null;
  }
};

// 数据网关健康检查
export const checkDataGatewayHealth = async (): Promise<any> => {
  try {
    const gateway = getDataGateway();
    return await gateway.healthCheck();
  } catch (error) {
    console.error("[DataGateway] 健康检查失败:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "未知错误",
      timestamp: Date.now(),
    };
  }
};

// 便捷的数据访问方法（直接使用全局实例）
export const dataGateway = {
  // 成绩数据
  getGrades: async (filter: any) => {
    const gateway = getDataGateway();
    return gateway.getGrades(filter);
  },

  createGrade: async (data: any) => {
    const gateway = getDataGateway();
    return gateway.createGrade(data);
  },

  updateGrade: async (id: string, data: any) => {
    const gateway = getDataGateway();
    return gateway.updateGrade(id, data);
  },

  deleteGrade: async (id: string) => {
    const gateway = getDataGateway();
    return gateway.deleteGrade(id);
  },

  // 考试数据
  getExams: async (filter: any) => {
    const gateway = getDataGateway();
    return gateway.getExams(filter);
  },

  createExam: async (data: any) => {
    const gateway = getDataGateway();
    return gateway.createExam(data);
  },

  updateExam: async (id: string, data: any) => {
    const gateway = getDataGateway();
    return gateway.updateExam(id, data);
  },

  deleteExam: async (id: string) => {
    const gateway = getDataGateway();
    return gateway.deleteExam(id);
  },

  // 学生数据
  getStudents: async (filter: any) => {
    const gateway = getDataGateway();
    return gateway.getStudents(filter);
  },

  createStudent: async (data: any) => {
    const gateway = getDataGateway();
    return gateway.createStudent(data);
  },

  updateStudent: async (id: string, data: any) => {
    const gateway = getDataGateway();
    return gateway.updateStudent(id, data);
  },

  deleteStudent: async (id: string) => {
    const gateway = getDataGateway();
    return gateway.deleteStudent(id);
  },

  // 统计数据
  getStatistics: async (type: "exam" | "grade" | "student", id?: string) => {
    const gateway = getDataGateway();
    return gateway.getStatistics(type, id);
  },

  // 批量操作
  batchOperation: async (
    operation: "create" | "update" | "delete",
    data: any[]
  ) => {
    const gateway = getDataGateway();
    return gateway.batchOperation(operation, data);
  },

  // 缓存管理
  clearCache: async () => {
    const gateway = getDataGateway();
    return gateway.clearCache();
  },

  invalidateCache: async (operation: string, params?: any) => {
    const gateway = getDataGateway();
    return gateway.invalidateCache(operation, params);
  },

  getCacheStats: () => {
    const gateway = getDataGateway();
    return gateway.getCacheStats();
  },

  // 健康检查
  healthCheck: async () => {
    const gateway = getDataGateway();
    return gateway.healthCheck();
  },
};

// 默认导出便捷访问对象
export default dataGateway;
