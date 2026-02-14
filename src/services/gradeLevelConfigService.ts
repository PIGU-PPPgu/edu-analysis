/**
 * 等级配置服务
 * 用于管理grade_levels_config表中的等级评价配置
 *
 * 支持两种类型：
 * 1. 六级配置（A+/A/B+/B/C+/C）- 用于初中和普通评价
 * 2. 九段配置（1-9段）- 用于高中Stanine评价
 */

import { supabase } from "@/integrations/supabase/client";
import type { GradeLevelConfig } from "@/components/value-added/activity/GradeLevelConfigDialog";

interface GradeLevelInDB {
  level: string; // "A+" 或 "1段"
  label: string; // "优秀+" 或 "顶尖生"
  percentile: {
    min: number; // 0.00-1.00
    max: number; // 0.00-1.00
  };
  color?: string; // 颜色代码
  description: string; // 描述
}

interface GradeLevelConfigInDB {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  levels: GradeLevelInDB[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 将9段配置转换为数据库格式
 */
function convertNineSegmentsToDB(config: GradeLevelConfig): GradeLevelInDB[] {
  const levels: GradeLevelInDB[] = [];
  let cumulativePercentile = 0;

  // 为9段分配颜色（从绿色到红色渐变）
  const colors = [
    "#10b981", // 1段 - 绿色
    "#22c55e", // 2段
    "#3b82f6", // 3段 - 蓝色
    "#6366f1", // 4段
    "#8b5cf6", // 5段 - 紫色
    "#f59e0b", // 6段 - 橙色
    "#ef4444", // 7段 - 红色
    "#dc2626", // 8段
    "#991b1b", // 9段 - 深红色
  ];

  for (let i = 0; i < config.segments.length; i++) {
    const seg = config.segments[i];
    const percentageDecimal = seg.percentage / 100;

    levels.push({
      level: `${seg.segment}段`,
      label: seg.label,
      percentile: {
        min: cumulativePercentile,
        max: cumulativePercentile + percentageDecimal,
      },
      color: colors[i],
      description: `前${(cumulativePercentile + percentageDecimal) * 100}%`,
    });

    cumulativePercentile += percentageDecimal;
  }

  return levels;
}

/**
 * 保存等级配置到数据库
 * @param config 前端的9段配置对象
 * @returns 数据库中的配置ID
 */
export async function saveGradeLevelConfig(
  config: GradeLevelConfig
): Promise<{ success: boolean; configId?: string; error?: string }> {
  try {
    // 转换为数据库格式
    const levelsInDB = convertNineSegmentsToDB(config);

    // 插入到grade_levels_config表
    const { data, error } = await supabase
      .from("grade_levels_config")
      .insert({
        name: config.configName,
        description: config.description,
        is_default: false,
        levels: levelsInDB,
      })
      .select("id")
      .single();

    if (error) {
      console.error("保存等级配置失败:", error);
      return {
        success: false,
        error: `保存失败: ${error.message}`,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "保存失败：未返回配置ID",
      };
    }

    return {
      success: true,
      configId: data.id,
    };
  } catch (err) {
    console.error("保存等级配置异常:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知错误",
    };
  }
}

/**
 * 获取默认的等级配置
 */
export async function getDefaultGradeLevelConfig(): Promise<{
  success: boolean;
  config?: GradeLevelConfigInDB;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("grade_levels_config")
      .select("*")
      .eq("is_default", true)
      .single();

    if (error) {
      console.error("获取默认配置失败:", error);
      return {
        success: false,
        error: `查询失败: ${error.message}`,
      };
    }

    return {
      success: true,
      config: data as GradeLevelConfigInDB,
    };
  } catch (err) {
    console.error("获取默认配置异常:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知错误",
    };
  }
}

/**
 * 根据ID获取等级配置
 */
export async function getGradeLevelConfigById(configId: string): Promise<{
  success: boolean;
  config?: GradeLevelConfigInDB;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("grade_levels_config")
      .select("*")
      .eq("id", configId)
      .single();

    if (error) {
      console.error("获取配置失败:", error);
      return {
        success: false,
        error: `查询失败: ${error.message}`,
      };
    }

    return {
      success: true,
      config: data as GradeLevelConfigInDB,
    };
  } catch (err) {
    console.error("获取配置异常:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知错误",
    };
  }
}

/**
 * 列出所有等级配置
 */
export async function listGradeLevelConfigs(): Promise<{
  success: boolean;
  configs?: GradeLevelConfigInDB[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("grade_levels_config")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("列出配置失败:", error);
      return {
        success: false,
        error: `查询失败: ${error.message}`,
      };
    }

    return {
      success: true,
      configs: data as GradeLevelConfigInDB[],
    };
  } catch (err) {
    console.error("列出配置异常:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知错误",
    };
  }
}
