import { supabase } from "@/integrations/supabase/client";
import { validateData } from "./validation";
import { toast } from "sonner";
import { UserAIConfig } from "@/types/ai";

// 用户注册
export async function registerUser({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    await validateData.validateUserAuth({ email, password });

    console.log("开始注册用户:", email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: "student",
        },
      },
    });

    if (error) {
      console.error("注册失败:", error);
      toast.error(`注册失败: ${error.message || "未知错误"}`);
      throw error;
    }

    console.log("注册成功:", data);
    return data;
  } catch (error) {
    console.error("注册失败:", error);
    toast.error(`注册失败: ${error.message || "请检查您的输入"}`);
    throw error;
  }
}

// 用户登录
export async function loginUser({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    await validateData.validateUserAuth({ email, password });

    console.log("开始登录用户:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("登录失败:", error);
      toast.error(`登录失败: ${error.message || "请检查您的邮箱和密码"}`);
      throw error;
    }

    console.log("登录成功，用户信息:", data.user);
    console.log("登录成功，会话信息:", data.session);
    return data;
  } catch (error) {
    console.error("登录失败:", error);
    toast.error(`登录失败: ${error.message || "请检查您的邮箱和密码"}`);
    throw error;
  }
}

// 加密API密钥（实际环境应使用更安全的加密方法）
function encryptApiKey(apiKey: string): string {
  // 这里仅作为示例，实际应使用更强的加密算法
  // 在生产环境中，应该使用服务端加密或更安全的方法
  try {
    return btoa(apiKey);
  } catch (e) {
    console.error("Error encrypting API key (possibly invalid characters):", e);
    return apiKey; // Fallback for environments without btoa or invalid chars
  }
}

// 解密API密钥
function decryptApiKey(encryptedKey: string): string {
  // 对应encryptApiKey的解密
  try {
    return atob(encryptedKey);
  } catch (e) {
    console.error("Error decrypting API key (possibly invalid base64):", e);
    return encryptedKey; // Fallback
  }
}

// 存储密钥和配置的键名
// const API_KEY_STORAGE_KEY = 'user_api_key'; // 不再使用单一密钥存储
const PROVIDER_API_KEYS_STORAGE_KEY = "provider_api_keys"; // 新键名，存储对象
const AI_CONFIG_STORAGE_KEY = "user_ai_config";

/**
 * 获取指定提供商的API密钥
 * @param providerId 提供商ID (e.g., 'openai', 'doubao')
 * @returns API密钥或null
 */
export async function getUserAPIKey(
  providerId: string
): Promise<string | null> {
  try {
    // 从localStorage获取存储密钥的对象
    const keysJson = localStorage.getItem(PROVIDER_API_KEYS_STORAGE_KEY);
    if (!keysJson) {
      console.log(
        `No API keys found in localStorage for key: ${PROVIDER_API_KEYS_STORAGE_KEY}`
      );

      // 提供默认密钥作为备用
      if (providerId === "openai") {
        console.log("返回默认的OpenAI测试密钥");
        return "sk-sample-test-key-for-openai"; // 这是示例密钥，实际使用时应替换为有效密钥
      } else if (providerId === "doubao") {
        console.log("返回默认的豆包测试密钥");
        return "8bba56fe-3e9f-41b9-a9db-5ca3cb8c4ba2"; // 示例密钥
      } else if (providerId === "sbjt") {
        console.log("返回默认的硅基流动测试密钥");
        return "sk-kpibphayuoyyzkkrhnljayyjbrgkazwfrzonqxegfghntxzb"; // 示例密钥
      }

      return null;
    }

    const keys = JSON.parse(keysJson);
    const encryptedKey = keys[providerId];

    if (!encryptedKey) {
      console.log(
        `API key for provider '${providerId}' not found in stored keys.`
      );

      // 提供默认密钥作为备用
      if (providerId === "openai") {
        console.log("返回默认的OpenAI测试密钥");
        return "sk-sample-test-key-for-openai"; // 这是示例密钥，实际使用时应替换为有效密钥
      } else if (providerId === "doubao") {
        console.log("返回默认的豆包测试密钥");
        return "8bba56fe-3e9f-41b9-a9db-5ca3cb8c4ba2"; // 示例密钥
      } else if (providerId === "sbjt") {
        console.log("返回默认的硅基流动测试密钥");
        return "sk-kpibphayuoyyzkkrhnljayyjbrgkazwfrzonqxegfghntxzb"; // 示例密钥
      }

      return null;
    }

    // 解密密钥 (如果存储时加密了)
    // return decryptApiKey(encryptedKey);
    return encryptedKey; // 暂时不加密/解密，直接返回
  } catch (error) {
    console.error(`获取 provider '${providerId}' 的API密钥失败:`, error);
    return null;
  }
}

/**
 * 保存指定提供商的API密钥
 * @param providerId 提供商ID
 * @param apiKey API密钥
 */
export async function saveUserAPIKey(
  providerId: string,
  apiKey: string
): Promise<void> {
  try {
    // 获取当前存储的所有密钥
    const keysJson = localStorage.getItem(PROVIDER_API_KEYS_STORAGE_KEY);
    let keys = {};
    if (keysJson) {
      try {
        keys = JSON.parse(keysJson);
      } catch (parseError) {
        console.error("Error parsing stored API keys, resetting.", parseError);
        keys = {}; // 如果解析失败，重置为空对象
      }
    }

    // 加密密钥 (如果需要)
    // const encryptedKey = encryptApiKey(apiKey);
    const encryptedKey = apiKey; // 暂时不加密

    // 更新或添加指定提供商的密钥
    keys[providerId] = encryptedKey;

    // 保存回localStorage
    localStorage.setItem(PROVIDER_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    console.log(`API key for provider '${providerId}' saved.`);
  } catch (error) {
    console.error(`保存 provider '${providerId}' 的API密钥失败:`, error);
    throw error;
  }
}

/**
 * 获取用户AI配置
 * @returns AI配置
 */
export async function getUserAIConfig(): Promise<UserAIConfig | null> {
  try {
    const configJson = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!configJson) return null;

    return JSON.parse(configJson);
  } catch (error) {
    console.error("获取AI配置失败:", error);
    return null;
  }
}

/**
 * 保存用户AI配置
 * @param config AI配置
 */
export async function saveUserAIConfig(config: UserAIConfig): Promise<void> {
  try {
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("保存AI配置失败:", error);
    throw error;
  }
}

/**
 * 初始化默认AI配置（如果不存在或强制更新）
 * 默认使用豆包API
 * @param forceReset 是否强制重置配置
 */
export async function initDefaultAIConfig(
  forceReset: boolean = false
): Promise<void> {
  try {
    // 检查是否已存在配置
    const existingConfig = await getUserAIConfig();
    if (existingConfig && !forceReset) {
      console.log("已存在AI配置，不需要初始化");
      return;
    }

    // 创建默认配置
    const defaultConfig: UserAIConfig = {
      provider: "doubao",
      version: "doubao-1-5-vision-pro-32k-250115", // 使用与测试组件相同的豆包视觉模型ID
      enabled: true,
      customSettings: {
        debugMode: false,
      },
      lastUpdated: new Date().toISOString(),
    };

    // 保存默认配置
    await saveUserAIConfig(defaultConfig);
    console.log("已初始化默认AI配置（豆包API）");

    // 设置默认密钥（如果需要）
    const keysJson = localStorage.getItem(PROVIDER_API_KEYS_STORAGE_KEY);
    let keys = {};
    if (keysJson) {
      try {
        keys = JSON.parse(keysJson);
      } catch (error) {
        console.error("解析存储的API密钥时出错，重置为空对象", error);
        keys = {};
      }
    }

    // 如果没有豆包API密钥，使用临时测试密钥（仅开发环境使用）
    if (!keys["doubao"]) {
      console.log("设置豆包API临时测试密钥");
      keys["doubao"] = "8bba56fe-3e9f-41b9-a9db-5ca3cb8c4ba2"; // 用户提供的豆包API密钥
      localStorage.setItem(PROVIDER_API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    }
  } catch (error) {
    console.error("初始化默认AI配置失败:", error);
  }
}

/**
 * 清除用户AI配置和所有API密钥
 */
export async function clearUserAISettings(): Promise<void> {
  try {
    // localStorage.removeItem(API_KEY_STORAGE_KEY); // 移除旧键名
    localStorage.removeItem(PROVIDER_API_KEYS_STORAGE_KEY); // 移除新键名
    localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
    console.log("User AI settings and API keys cleared.");
  } catch (error) {
    console.error("清除AI设置失败:", error);
    throw error;
  }
}

/**
 * AI模型配置
 */
export interface AIModelConfig {
  version: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 获取用户AI配置
 * @returns AI配置对象
 */
export function getUserAIModelConfig(): AIModelConfig | null {
  try {
    const configStr = localStorage.getItem("aiModelConfig");
    if (!configStr) return null;

    const config = JSON.parse(configStr);
    return {
      version: config.version || "gpt-3.5-turbo",
      temperature: parseFloat(config.temperature) || 0.7,
      maxTokens: parseInt(config.maxTokens) || 1500,
    };
  } catch (error) {
    console.error("获取AI配置失败:", error);
    return null;
  }
}

/**
 * 保存用户AI配置
 * @param config AI配置对象
 */
export function saveUserAIModelConfig(config: AIModelConfig): void {
  try {
    localStorage.setItem("aiModelConfig", JSON.stringify(config));
  } catch (error) {
    console.error("保存AI配置失败:", error);
  }
}

/**
 * 获取用户API密钥
 * @returns API密钥
 */
export function getUserSimpleAPIKey(): string | null {
  try {
    // 使用会话存储而非本地存储，增强安全性
    return sessionStorage.getItem("userApiKey");
  } catch (error) {
    console.error("获取API密钥失败:", error);
    return null;
  }
}

/**
 * 保存用户API密钥
 * @param apiKey API密钥
 */
export function saveUserSimpleAPIKey(apiKey: string): void {
  try {
    // 使用会话存储而非本地存储，增强安全性
    sessionStorage.setItem("userApiKey", apiKey);
  } catch (error) {
    console.error("保存API密钥失败:", error);
  }
}

/**
 * 清除用户API密钥
 */
export function clearUserSimpleAPIKey(): void {
  try {
    sessionStorage.removeItem("userApiKey");
  } catch (error) {
    console.error("清除API密钥失败:", error);
  }
}
