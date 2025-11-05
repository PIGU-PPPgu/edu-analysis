import { supabase } from "@/integrations/supabase/client";
import { deleteAllKnowledgePoints } from "./knowledgePointService";

/**
 * 控制台命令：清除特定作业的AI创建的知识点
 *
 * 使用方法：
 * 1. 在浏览器控制台运行 clearAIKnowledgePoints('<作业ID>')
 * 2. 确认操作后，所有与该作业相关的知识点将被删除
 *
 * @param homeworkId 作业ID
 * @returns 处理结果
 */
export async function clearAIKnowledgePoints(homeworkId: string) {
  if (!homeworkId) {
    console.error("作业ID不能为空");
    return { success: false, message: "作业ID不能为空" };
  }

  // 要求用户确认操作
  const confirmed = confirm(
    `确定要删除作业ID "${homeworkId}" 的所有知识点吗？此操作不可撤销！`
  );
  if (!confirmed) {
    console.log("操作已取消");
    return { success: false, message: "操作已取消", cancelled: true };
  }

  console.log(`正在清除作业ID "${homeworkId}" 的知识点...`);
  try {
    // 使用服务方法删除知识点
    const result = await deleteAllKnowledgePoints(homeworkId);

    if (result.success) {
      console.log(`成功清除知识点: ${result.message}`);
    } else {
      console.error(`清除知识点失败: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error("清除知识点时发生错误:", error);
    return { success: false, message: error.message || "未知错误" };
  }
}

/**
 * 控制台命令：获取某个作业的所有知识点列表
 *
 * 使用方法：
 * 在浏览器控制台运行 listHomeworkKnowledgePoints('<作业ID>')
 *
 * @param homeworkId 作业ID
 * @returns 知识点列表
 */
export async function listHomeworkKnowledgePoints(homeworkId: string) {
  if (!homeworkId) {
    console.error("作业ID不能为空");
    return [];
  }

  console.log(`正在获取作业ID "${homeworkId}" 的知识点...`);
  try {
    const { data, error } = await supabase
      .from("knowledge_points")
      .select("*")
      .eq("homework_id", homeworkId);

    if (error) {
      console.error("获取知识点失败:", error);
      return [];
    }

    console.log(`找到 ${data.length} 个知识点:`, data);
    return data;
  } catch (error) {
    console.error("获取知识点时发生错误:", error);
    return [];
  }
}

// 将命令函数挂载到window对象，使其可在控制台访问
if (typeof window !== "undefined") {
  (window as any).clearAIKnowledgePoints = clearAIKnowledgePoints;
  (window as any).listHomeworkKnowledgePoints = listHomeworkKnowledgePoints;

  console.log("知识点管理命令已加载。可使用以下命令:");
  console.log('clearAIKnowledgePoints("<作业ID>") - 清除指定作业的所有知识点');
  console.log(
    'listHomeworkKnowledgePoints("<作业ID>") - 列出指定作业的所有知识点'
  );
}
