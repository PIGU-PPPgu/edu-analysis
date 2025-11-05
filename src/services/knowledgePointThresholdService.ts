import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface KnowledgePointThreshold {
  id?: string;
  user_id?: string;
  level: string;
  threshold: number;
  color: string;
  position: number;
}

/**
 * 获取用户的知识点阈值设置
 */
export async function getUserThresholds(userId?: string) {
  try {
    const user_id = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!user_id) {
      console.error("获取用户ID失败");
      return [];
    }

    const { data, error } = await supabase
      .from("knowledge_point_thresholds")
      .select("*")
      .eq("user_id", user_id)
      .order("position", { ascending: true });

    if (error) {
      console.error("获取知识点阈值失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取知识点阈值异常:", error);
    return [];
  }
}

/**
 * 保存用户的知识点阈值设置
 * 如果设置不存在，则创建；如果已存在，则更新
 */
export async function saveUserThresholds(
  thresholds: KnowledgePointThreshold[],
  userId?: string
) {
  try {
    const user_id = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!user_id) {
      console.error("获取用户ID失败");
      toast.error("获取用户信息失败，无法保存设置");
      return false;
    }

    // 先删除用户之前的所有阈值设置
    const { error: deleteError } = await supabase
      .from("knowledge_point_thresholds")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      console.error("删除旧阈值设置失败:", deleteError);
      toast.error(`删除旧设置失败: ${deleteError.message}`);
      return false;
    }

    // 准备要插入的数据
    const thresholdsToInsert = thresholds.map((threshold, index) => ({
      user_id,
      level: threshold.level,
      threshold: threshold.threshold,
      color: threshold.color,
      position: index,
    }));

    // 插入新的阈值设置
    const { error: insertError } = await supabase
      .from("knowledge_point_thresholds")
      .insert(thresholdsToInsert);

    if (insertError) {
      console.error("保存知识点阈值失败:", insertError);
      toast.error(`保存设置失败: ${insertError.message}`);
      return false;
    }

    toast.success("知识点阈值设置已保存");
    return true;
  } catch (error) {
    console.error("保存知识点阈值异常:", error);
    toast.error(`保存设置失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取系统默认的知识点阈值设置
 */
export function getDefaultThresholds(): KnowledgePointThreshold[] {
  return [
    { level: "精通", threshold: 90, color: "bg-green-500", position: 0 },
    { level: "熟练", threshold: 75, color: "bg-blue-500", position: 1 },
    { level: "掌握", threshold: 60, color: "bg-yellow-500", position: 2 },
    { level: "不熟", threshold: 0, color: "bg-red-500", position: 3 },
  ];
}
