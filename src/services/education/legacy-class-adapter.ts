/**
 * 班级服务适配器 - 兼容旧的classService API
 *
 * 将旧的classService调用适配到新的ClassService架构
 */

import { logError, logInfo } from "@/utils/logger";
import { classService } from "./classes";
import { apiClient } from "../core/api";
import { dataCache } from "../core/cache";
import { toast } from "sonner";

// 视图存在状态缓存，避免重复检查视图 (继承自原classService)
const viewStatusCache = {
  class_statistics: null as boolean | null,
  mv_class_subject_stats: null as boolean | null,
  mv_class_exam_trends: null as boolean | null,
  mv_class_subject_competency: null as boolean | null,
  mv_class_subject_correlation: null as boolean | null,
};

// 检查视图是否存在 (继承自原classService)
async function checkViewExists(viewName: string): Promise<boolean> {
  // 如果缓存中有结果，直接返回
  if (viewStatusCache[viewName as keyof typeof viewStatusCache] !== null) {
    return !!viewStatusCache[viewName as keyof typeof viewStatusCache];
  }

  try {
    // 使用新的API客户端检查视图
    const response = await apiClient.query(viewName, { limit: 1 });

    // 更新缓存
    const exists = response.success;
    viewStatusCache[viewName as keyof typeof viewStatusCache] = exists;

    return exists;
  } catch (e) {
    // 更新缓存
    viewStatusCache[viewName as keyof typeof viewStatusCache] = false;
    return false;
  }
}

export interface ClassStatistics {
  class_id: string;
  class_name: string;
  grade: string;
  student_count: number;
  homework_count: number;
  average_score: number;
  excellent_rate: number;
}

/**
 * 获取所有班级的统计信息（包含降级方案）- 兼容旧API
 */
export async function getAllClasses(): Promise<any[]> {
  try {
    logInfo("获取所有班级的统计信息（兼容模式）");

    // 检查视图是否存在
    const viewExists = await checkViewExists("class_statistics");

    // 视图存在，直接查询
    if (viewExists) {
      const response = await apiClient.query("class_statistics", {});

      if (response.success && response.data) {
        return response.data.map((item: any) => ({
          id: item.class_id,
          name: item.class_name,
          grade: item.grade,
          studentCount: item.student_count,
          homeworkCount: item.homework_count,
          averageScore: item.average_score,
          excellentRate: item.excellent_rate,
        }));
      }
    }

    console.warn("class_statistics视图不存在，降级为基础查询");
    toast.warning("正在使用基础班级数据，部分统计信息可能不可用");

    // 视图不存在，降级为查询原始classes表
    const classesResponse = await apiClient.query("classes", {});

    if (!classesResponse.success || !classesResponse.data) {
      console.error("获取班级列表失败:", classesResponse.error);
      toast.error(`获取班级列表失败: ${classesResponse.error}`);
      return [];
    }

    const classesData = classesResponse.data;

    // 对每个班级单独获取统计数据，并转换为与Class接口一致的格式
    const enrichedClasses = [];

    for (const cls of classesData) {
      // 获取学生数量
      const studentsResponse = await apiClient.query("students", {
        filters: { class_id: cls.id },
        select: ["id"],
      });

      // 获取作业数量
      const homeworksResponse = await apiClient.query("homework", {
        filters: { class_id: cls.id },
        select: ["id"],
      });

      // 添加带有统计数据的班级，保持原始字段名称与Class接口一致
      enrichedClasses.push({
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        created_at: cls.created_at,
        studentCount: studentsResponse.success
          ? studentsResponse.data?.length || 0
          : 0,
        homeworkCount: homeworksResponse.success
          ? homeworksResponse.data?.length || 0
          : 0,
        averageScore: 0, // 暂无法获取，设为默认值
        excellentRate: 0, // 暂无法获取，设为默认值
      });
    }

    return enrichedClasses;
  } catch (error: any) {
    console.error("获取班级列表异常:", error);
    toast.error(`获取班级列表失败: ${error?.message || "未知错误"}`);
    return [];
  }
}

/**
 * 根据ID获取班级详情 - 兼容旧API
 */
export async function getClassById(classId: string) {
  try {
    logInfo("获取班级详情（兼容模式）", { classId });

    const response = await apiClient.query("classes", {
      filters: { id: classId },
      limit: 1,
    });

    if (!response.success || !response.data?.length) {
      console.error("获取班级详情失败:", response.error);
      toast.error(`获取班级详情失败: ${response.error}`);
      return null;
    }

    return response.data[0];
  } catch (error: any) {
    console.error("获取班级详情异常:", error);
    toast.error(`获取班级详情失败: ${error.message}`);
    return null;
  }
}

/**
 * 创建新班级 - 兼容旧API
 */
export async function createClass(classData: { name: string; grade: string }) {
  try {
    logInfo("创建新班级（兼容模式）", { classData });

    const response = await apiClient.insert("classes", classData);

    if (!response.success) {
      console.error("创建班级失败:", response.error);
      toast.error(`创建班级失败: ${response.error}`);
      return null;
    }

    toast.success("班级创建成功");
    return response.data || null;
  } catch (error: any) {
    console.error("创建班级异常:", error);
    toast.error(`创建班级失败: ${error.message}`);
    return null;
  }
}

/**
 * 更新班级信息 - 兼容旧API
 */
export async function updateClass(
  classId: string,
  classData: { name?: string; grade?: string }
) {
  try {
    logInfo("更新班级信息（兼容模式）", { classId, classData });

    const response = await apiClient.update("classes", classId, classData);

    if (!response.success) {
      console.error("更新班级信息失败:", response.error);
      toast.error(`更新班级信息失败: ${response.error}`);
      return false;
    }

    toast.success("班级信息更新成功");
    return true;
  } catch (error: any) {
    console.error("更新班级信息异常:", error);
    toast.error(`更新班级信息失败: ${error.message}`);
    return false;
  }
}

/**
 * 删除班级 - 兼容旧API
 */
export async function deleteClass(classId: string) {
  try {
    logInfo("删除班级（兼容模式）", { classId });

    const response = await apiClient.delete("classes", classId);

    if (!response.success) {
      console.error("删除班级失败:", response.error);
      toast.error(`删除班级失败: ${response.error}`);
      return false;
    }

    toast.success("班级删除成功");
    return true;
  } catch (error: any) {
    console.error("删除班级异常:", error);
    toast.error(`删除班级失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取班级学生列表 - 兼容旧API
 */
export async function getClassStudents(classId: string) {
  try {
    logInfo("获取班级学生列表（兼容模式）", { classId });

    const response = await apiClient.query("students", {
      filters: { class_id: classId },
      orderBy: [{ column: "student_id", ascending: true }],
    });

    if (!response.success) {
      console.error("获取班级学生列表失败:", response.error);
      toast.error(`获取班级学生列表失败: ${response.error}`);
      return [];
    }

    return response.data || [];
  } catch (error: any) {
    console.error("获取班级学生列表异常:", error);
    toast.error(`获取班级学生列表失败: ${error.message}`);
    return [];
  }
}
