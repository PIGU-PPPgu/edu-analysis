/**
 * 统一数据源配置
 * 支持多数据源切换和环境配置
 */

import { DataConfig } from "@/services/data/types";

// 从环境变量读取配置（Vite环境）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const apiKey = import.meta.env.VITE_API_KEY || "";

export const dataConfig: DataConfig = {
  // 当前使用的数据源
  current: "supabase", // 'supabase' | 'self-hosted'

  // Supabase配置
  supabase: {
    url: supabaseUrl || "",
    key: supabaseKey || "",
  },

  // 自建服务器配置（预留）
  selfHosted: {
    baseURL: apiBaseUrl || "",
    apiKey: apiKey || "",
  },
};

// 验证配置完整性
export const validateDataConfig = (config: DataConfig): void => {
  if (config.current === "supabase") {
    if (!config.supabase?.url || !config.supabase?.key) {
      throw new Error("Supabase配置不完整：缺少URL或API Key");
    }
  } else if (config.current === "self-hosted") {
    if (!config.selfHosted?.baseURL) {
      throw new Error("自建服务器配置不完整：缺少Base URL");
    }
  }
};

// 获取当前配置
export const getCurrentDataConfig = (): DataConfig => {
  validateDataConfig(dataConfig);
  return dataConfig;
};

// 切换数据源（用于A/B测试或迁移）
export const switchDataSource = (
  newSource: "supabase" | "self-hosted"
): void => {
  console.log(
    `[DataConfig] 切换数据源从 ${dataConfig.current} 到 ${newSource}`
  );
  dataConfig.current = newSource;
  validateDataConfig(dataConfig);
};

// 开发环境配置检查
export const checkDevConfig = (): void => {
  if (import.meta.env.DEV) {
    console.log("[DataConfig] 当前数据源配置:", {
      current: dataConfig.current,
      supabaseConfigured: !!(
        dataConfig.supabase?.url && dataConfig.supabase?.key
      ),
      selfHostedConfigured: !!dataConfig.selfHosted?.baseURL,
    });
  }
};
