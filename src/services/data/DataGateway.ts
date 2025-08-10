/**
 * 统一数据网关
 * 提供统一的数据访问接口，支持缓存和多数据源
 */

import {
  DataAdapter,
  DataResponse,
  GradeFilter,
  ExamFilter,
  StudentFilter,
  DataConfig,
} from "./types";
import { SupabaseAdapter } from "./SupabaseAdapter";
import { DataCache } from "./DataCache";

export class DataGateway {
  private adapter: DataAdapter;
  private cache: DataCache;

  constructor(config: DataConfig) {
    // 根据配置选择数据适配器
    switch (config.current) {
      case "supabase":
        if (!config.supabase) {
          throw new Error("Supabase配置缺失");
        }
        this.adapter = new SupabaseAdapter(config.supabase);
        break;
      case "self-hosted":
        if (!config.selfHosted) {
          throw new Error("自建服务器配置缺失");
        }
        // TODO: 实现自建服务器适配器
        throw new Error("自建服务器适配器尚未实现");
      default:
        throw new Error(`不支持的数据源类型: ${config.current}`);
    }

    // 初始化缓存
    this.cache = new DataCache({
      enabled: true,
      ttl: 300, // 5分钟缓存
      maxSize: 1000,
      storage: "memory", // 默认使用内存缓存
    });

    console.log(`[DataGateway] 已初始化，使用数据源: ${config.current}`);
  }

  // 成绩数据相关方法（带缓存）
  async getGrades(filter: GradeFilter): Promise<DataResponse<any>> {
    const cacheKey = "getGrades";

    // 尝试从缓存获取
    const cached = await this.cache.get<DataResponse<any>>(cacheKey, filter);
    if (cached) {
      return cached;
    }

    // 从数据源获取
    console.log("[DataGateway] 从数据源获取成绩数据");
    const result = await this.adapter.getGrades(filter);

    // 缓存结果（只缓存成功的结果）
    if (!result.error && result.data.length > 0) {
      await this.cache.set(cacheKey, filter, result, 300); // 5分钟缓存
    }

    return result;
  }

  async createGrade(data: any): Promise<any> {
    console.log("[DataGateway] 创建成绩记录");
    const result = await this.adapter.createGrade(data);

    // 清理相关缓存
    await this.cache.invalidate("getGrades");
    await this.cache.invalidate("getStatistics");

    return result;
  }

  async updateGrade(id: string, data: any): Promise<any> {
    console.log("[DataGateway] 更新成绩记录:", id);
    const result = await this.adapter.updateGrade(id, data);

    // 清理相关缓存
    await this.cache.invalidate("getGrades");
    await this.cache.invalidate("getStatistics");

    return result;
  }

  async deleteGrade(id: string): Promise<boolean> {
    console.log("[DataGateway] 删除成绩记录:", id);
    const result = await this.adapter.deleteGrade(id);

    if (result) {
      // 清理相关缓存
      await this.cache.invalidate("getGrades");
      await this.cache.invalidate("getStatistics");
    }

    return result;
  }

  // 考试数据相关方法（带缓存）
  async getExams(filter: ExamFilter): Promise<DataResponse<any>> {
    const cacheKey = "getExams";

    // 尝试从缓存获取
    const cached = await this.cache.get<DataResponse<any>>(cacheKey, filter);
    if (cached) {
      return cached;
    }

    // 从数据源获取
    console.log("[DataGateway] 从数据源获取考试数据");
    const result = await this.adapter.getExams(filter);

    // 缓存结果
    if (!result.error && result.data.length > 0) {
      await this.cache.set(cacheKey, filter, result, 600); // 10分钟缓存
    }

    return result;
  }

  async createExam(data: any): Promise<any> {
    console.log("[DataGateway] 创建考试");
    const result = await this.adapter.createExam(data);

    // 清理相关缓存
    await this.cache.invalidate("getExams");
    await this.cache.invalidate("getStatistics");

    return result;
  }

  async updateExam(id: string, data: any): Promise<any> {
    console.log("[DataGateway] 更新考试:", id);
    const result = await this.adapter.updateExam(id, data);

    // 清理相关缓存
    await this.cache.invalidate("getExams");
    await this.cache.invalidate("getStatistics");

    return result;
  }

  async deleteExam(id: string): Promise<boolean> {
    console.log("[DataGateway] 删除考试:", id);
    const result = await this.adapter.deleteExam(id);

    if (result) {
      // 清理相关缓存
      await this.cache.invalidate("getExams");
      await this.cache.invalidate("getGrades");
      await this.cache.invalidate("getStatistics");
    }

    return result;
  }

  // 学生数据相关方法（带缓存）
  async getStudents(filter: StudentFilter): Promise<DataResponse<any>> {
    const cacheKey = "getStudents";

    // 尝试从缓存获取
    const cached = await this.cache.get<DataResponse<any>>(cacheKey, filter);
    if (cached) {
      return cached;
    }

    // 从数据源获取
    console.log("[DataGateway] 从数据源获取学生数据");
    const result = await this.adapter.getStudents(filter);

    // 缓存结果
    if (!result.error && result.data.length > 0) {
      await this.cache.set(cacheKey, filter, result, 1800); // 30分钟缓存
    }

    return result;
  }

  async createStudent(data: any): Promise<any> {
    console.log("[DataGateway] 创建学生");
    const result = await this.adapter.createStudent(data);

    // 清理相关缓存
    await this.cache.invalidate("getStudents");
    await this.cache.invalidate("getStatistics");

    return result;
  }

  async updateStudent(id: string, data: any): Promise<any> {
    console.log("[DataGateway] 更新学生:", id);
    const result = await this.adapter.updateStudent(id, data);

    // 清理相关缓存
    await this.cache.invalidate("getStudents");
    await this.cache.invalidate("getStatistics");

    return result;
  }

  async deleteStudent(id: string): Promise<boolean> {
    console.log("[DataGateway] 删除学生:", id);
    const result = await this.adapter.deleteStudent(id);

    if (result) {
      // 清理相关缓存
      await this.cache.invalidate("getStudents");
      await this.cache.invalidate("getGrades");
      await this.cache.invalidate("getStatistics");
    }

    return result;
  }

  // 统计数据方法（带缓存）
  async getStatistics(
    type: "exam" | "grade" | "student",
    id?: string
  ): Promise<any> {
    const cacheKey = "getStatistics";
    const params = { type, id };

    // 尝试从缓存获取
    const cached = await this.cache.get<any>(cacheKey, params);
    if (cached) {
      return cached;
    }

    // 从数据源获取
    console.log(`[DataGateway] 从数据源获取${type}统计数据`);
    const result = await this.adapter.getStatistics(type, id);

    // 缓存结果
    await this.cache.set(cacheKey, params, result, 180); // 3分钟缓存

    return result;
  }

  // 批量操作方法
  async batchOperation(
    operation: "create" | "update" | "delete",
    data: any[]
  ): Promise<any[]> {
    console.log(`[DataGateway] 批量${operation}操作，数据量:`, data.length);
    const result = await this.adapter.batchOperation(operation, data);

    // 清理所有相关缓存
    await this.cache.clear();

    return result;
  }

  // 缓存管理方法
  async clearCache(): Promise<void> {
    console.log("[DataGateway] 清理所有缓存");
    await this.cache.clear();
  }

  async invalidateCache(operation: string, params?: any): Promise<void> {
    console.log(`[DataGateway] 清理${operation}相关缓存`);
    await this.cache.invalidate(operation, params);
  }

  getCacheStats(): any {
    return this.cache.getStats();
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    adapter: string;
    cache: any;
    timestamp: number;
  }> {
    try {
      // 尝试获取一条测试数据
      await this.adapter.getExams({ limit: 1 });

      return {
        status: "healthy",
        adapter: this.adapter.constructor.name,
        cache: this.getCacheStats(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[DataGateway] 健康检查失败:", error);

      return {
        status: "unhealthy",
        adapter: this.adapter.constructor.name,
        cache: this.getCacheStats(),
        timestamp: Date.now(),
      };
    }
  }
}
