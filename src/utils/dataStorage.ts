
import { db } from "@/utils/dbUtils";
import { toast } from "sonner";

/**
 * 处理并保存数据到数据库
 * @param {Array} data 要保存的数据
 * @returns {Promise<Object>} 处理结果
 */
export const processAndSaveData = async (data) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("无效的数据格式");
    }
    
    // 确保数据至少有必要的字段
    const hasRequiredFields = data.every(item => 
      item.studentId && item.name && item.subject && 
      item.score !== undefined && item.score !== null
    );
    
    if (!hasRequiredFields) {
      throw new Error("缺少必要字段，请确保数据包含学号、姓名、科目和分数");
    }
    
    console.log("准备保存数据:", data);
    
    // 调用数据库保存函数
    const results = await db.saveGradeData(data);
    
    // 显示保存结果
    if (results.success > 0) {
      toast.success(`成功保存 ${results.success} 条成绩记录`, {
        description: results.errors.length > 0 
          ? `但有 ${results.errors.length} 条记录失败` 
          : "所有记录处理成功"
      });
    } else if (results.errors.length > 0) {
      toast.error(`保存失败`, {
        description: `所有 ${results.errors.length} 条记录均未能保存`
      });
    }
    
    return results;
  } catch (error) {
    console.error("处理数据失败:", error);
    toast.error("处理数据失败", {
      description: error.message || "未知错误"
    });
    
    return {
      success: 0,
      errors: [error.message || "未知错误"]
    };
  }
};
