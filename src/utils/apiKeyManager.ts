/**
 * API密钥管理工具
 * 用于安全地存储和检索API密钥，提供基本的加密和解密功能
 */

// 密钥存储在sessionStorage中的键名
const API_KEY_STORAGE_KEY = "userApiKey";
const API_CONFIG_STORAGE_KEY = "userApiConfig";
const ENC_PREFIX = "ENC_"; // 加密标识前缀

/**
 * 简单加密函数（仅做基本混淆，不是真正的安全加密）
 * 实际生产环境应使用更安全的方法，比如使用服务端加密
 */
function encryptApiKey(apiKey: string): string {
  if (!apiKey) return "";

  try {
    // 简单的Base64编码加盐混淆
    // 在实际应用中，应该使用更安全的加密方法
    const salt = Math.random().toString(36).substring(2, 15);
    const encoded = btoa(
      `${salt}_${apiKey}_${salt.split("").reverse().join("")}`
    );
    return `${ENC_PREFIX}${encoded}`;
  } catch (error) {
    console.error("加密API密钥失败:", error);
    return apiKey; // 加密失败则返回原始密钥
  }
}

/**
 * 解密函数
 */
function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) return "";
  if (!encryptedKey.startsWith(ENC_PREFIX)) return encryptedKey;

  try {
    const encoded = encryptedKey.substring(ENC_PREFIX.length);
    const decoded = atob(encoded);

    // 移除前后盐值
    const parts = decoded.split("_");
    if (parts.length < 3) return "";

    // 中间部分是真正的密钥
    return parts.slice(1, -1).join("_");
  } catch (error) {
    console.error("解密API密钥失败:", error);
    return "";
  }
}

/**
 * 保存API密钥到会话存储
 * @param apiKey API密钥
 */
export function saveApiKey(apiKey: string): void {
  if (!apiKey) {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    return;
  }

  const encryptedKey = encryptApiKey(apiKey);
  sessionStorage.setItem(API_KEY_STORAGE_KEY, encryptedKey);
}

/**
 * 获取API密钥
 * @returns 解密后的API密钥
 */
export function getApiKey(): string | null {
  const encryptedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
  if (!encryptedKey) return null;

  return decryptApiKey(encryptedKey);
}

/**
 * 清除API密钥
 */
export function clearApiKey(): void {
  sessionStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * 检查是否有可用的API密钥
 */
export function hasApiKey(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

/**
 * API配置类型
 */
export interface ApiConfig {
  provider: string; // API提供商 (如 'openai', 'azure', 'anthropic')
  model: string; // 模型名称 (如 'gpt-4', 'gpt-3.5-turbo')
  temperature: number; // 生成温度 (0.0-1.0)
  maxTokens: number; // 最大生成token数
  options?: Record<string, any>; // 其他配置选项
}

/**
 * 保存API配置
 * @param config API配置
 */
export function saveApiConfig(config: ApiConfig): void {
  sessionStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * 获取API配置
 * @returns API配置对象
 */
export function getApiConfig(): ApiConfig | null {
  const configStr = sessionStorage.getItem(API_CONFIG_STORAGE_KEY);
  if (!configStr) return null;

  try {
    return JSON.parse(configStr) as ApiConfig;
  } catch (error) {
    console.error("解析API配置失败:", error);
    return null;
  }
}

/**
 * 清除API配置
 */
export function clearApiConfig(): void {
  sessionStorage.removeItem(API_CONFIG_STORAGE_KEY);
}

/**
 * 检查API配置是否有效
 */
export function isApiConfigValid(): boolean {
  const config = getApiConfig();
  return !!config && !!config.provider && !!config.model;
}

/**
 * 获取安全的API访问头信息
 * 用于向AI服务发起请求时使用
 */
export function getSecureApiHeaders(provider?: string): Record<string, string> {
  const key = getApiKey();
  const config = getApiConfig();
  const usedProvider = provider || config?.provider || "openai";

  if (!key) {
    throw new Error("未设置API密钥");
  }

  // 不同提供商的认证头格式可能不同
  switch (usedProvider.toLowerCase()) {
    case "azure":
      return {
        "api-key": key,
        "Content-Type": "application/json",
      };
    case "anthropic":
      return {
        "x-api-key": key,
        "Content-Type": "application/json",
      };
    case "openai":
    default:
      return {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      };
  }
}

export default {
  saveApiKey,
  getApiKey,
  clearApiKey,
  hasApiKey,
  saveApiConfig,
  getApiConfig,
  clearApiConfig,
  isApiConfigValid,
  getSecureApiHeaders,
};
