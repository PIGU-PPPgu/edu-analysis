/**
 * 增强版API密钥管理工具
 * 支持多提供商、多API密钥、全局配置管理
 * 提供localStorage持久化 + sessionStorage临时存储的混合方案
 */

import { AIProviderConfig } from "@/config/aiModels";

// 密钥存储在sessionStorage中的键名
const API_KEY_STORAGE_KEY = "userApiKey"; // 兼容旧版
const API_KEYS_STORAGE_KEY = "user_api_keys"; // 多提供商API密钥
const API_CONFIG_STORAGE_KEY = "userApiConfig"; // 兼容旧版
const GLOBAL_AI_CONFIG_KEY = "global_ai_config"; // 全局AI配置
const PREFERRED_PROVIDER_KEY = "preferred_ai_provider"; // 首选提供商
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

// ==================== 多提供商API密钥管理 ====================

export interface ProviderApiKeys {
  [providerId: string]: {
    apiKey: string;
    baseURL?: string;
    orgId?: string;
    projectId?: string;
    region?: string;
    lastUsed?: string;
    isDefault?: boolean;
  };
}

/**
 * 保存特定提供商的API密钥
 */
export function saveProviderApiKey(
  providerId: string,
  config: AIProviderConfig,
  persist: boolean = true
): void {
  const storage = persist ? localStorage : sessionStorage;
  const allKeys = getAllProviderApiKeys(persist);

  allKeys[providerId] = {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    orgId: config.orgId,
    projectId: config.projectId,
    region: config.region,
    lastUsed: new Date().toISOString(),
    isDefault: false,
  };

  // 加密后存储
  const encrypted: Record<string, any> = {};
  Object.entries(allKeys).forEach(([key, value]) => {
    encrypted[key] = {
      ...value,
      apiKey: encryptApiKey(value.apiKey),
    };
  });

  storage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(encrypted));
}

/**
 * 获取特定提供商的API密钥
 */
export function getProviderApiKey(
  providerId: string,
  checkBoth: boolean = true
): AIProviderConfig | null {
  let allKeys = getAllProviderApiKeys(false);

  if (checkBoth && !allKeys[providerId]) {
    allKeys = getAllProviderApiKeys(true);
  }

  const config = allKeys[providerId];
  if (!config) {
    return getProviderConfigFromEnv(providerId);
  }

  return {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    orgId: config.orgId,
    projectId: config.projectId,
    region: config.region,
  };
}

/**
 * 获取所有提供商的API密钥
 */
function getAllProviderApiKeys(fromPersistent: boolean): ProviderApiKeys {
  const storage = fromPersistent ? localStorage : sessionStorage;
  const stored = storage.getItem(API_KEYS_STORAGE_KEY);

  if (!stored) return {};

  try {
    const encrypted = JSON.parse(stored);
    const decrypted: ProviderApiKeys = {};

    Object.entries(encrypted).forEach(([key, value]: [string, any]) => {
      decrypted[key] = {
        ...value,
        apiKey: decryptApiKey(value.apiKey),
      };
    });

    return decrypted;
  } catch {
    return {};
  }
}

/**
 * 从环境变量获取提供商配置
 */
function getProviderConfigFromEnv(providerId: string): AIProviderConfig | null {
  const envKeyMap: Record<string, string> = {
    openai: "VITE_OPENAI_API_KEY",
    anthropic: "VITE_ANTHROPIC_API_KEY",
    google: "VITE_GOOGLE_API_KEY",
    azure: "VITE_AZURE_OPENAI_API_KEY",
    deepseek: "VITE_DEEPSEEK_API_KEY",
    xai: "VITE_XAI_API_KEY",
    doubao: "VITE_DOUBAO_API_KEY",
    moonshot: "VITE_MOONSHOT_API_KEY",
    baidu: "VITE_BAIDU_API_KEY",
    zhipu: "VITE_ZHIPU_API_KEY",
  };

  const envKey = envKeyMap[providerId];
  if (!envKey) return null;

  const apiKey = import.meta.env[envKey];
  if (!apiKey) return null;

  return { apiKey };
}

/**
 * 删除特定提供商的API密钥
 */
export function clearProviderApiKey(
  providerId: string,
  fromBoth: boolean = true
): void {
  if (fromBoth) {
    clearProviderApiKeyFromStorage(providerId, localStorage);
    clearProviderApiKeyFromStorage(providerId, sessionStorage);
  } else {
    clearProviderApiKeyFromStorage(providerId, sessionStorage);
  }
}

function clearProviderApiKeyFromStorage(
  providerId: string,
  storage: Storage
): void {
  const allKeys = getAllProviderApiKeys(storage === localStorage);
  delete allKeys[providerId];

  const encrypted: Record<string, any> = {};
  Object.entries(allKeys).forEach(([key, value]) => {
    encrypted[key] = {
      ...value,
      apiKey: encryptApiKey(value.apiKey),
    };
  });

  storage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(encrypted));
}

/**
 * 检查是否有特定提供商的API密钥
 */
export function hasProviderApiKey(providerId: string): boolean {
  const config = getProviderApiKey(providerId);
  return !!config && !!config.apiKey && config.apiKey.length > 0;
}

/**
 * 获取所有已配置的提供商列表
 */
export function getConfiguredProviders(): string[] {
  const persistent = getAllProviderApiKeys(true);
  const session = getAllProviderApiKeys(false);
  const allProviders = new Set([
    ...Object.keys(persistent),
    ...Object.keys(session),
  ]);
  return Array.from(allProviders);
}

// ==================== 首选提供商管理 ====================

export function setPreferredProvider(providerId: string): void {
  localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
}

export function getPreferredProvider(): string | null {
  return localStorage.getItem(PREFERRED_PROVIDER_KEY);
}

// ==================== 全局AI配置管理 ====================

export interface GlobalAIConfig {
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  fallbackProviders: string[];
  enableCache: boolean;
  enableCostTracking: boolean;
  modelPreferences: {
    [scenario: string]: {
      provider: string;
      model: string;
    };
  };
}

const DEFAULT_GLOBAL_CONFIG: GlobalAIConfig = {
  defaultProvider: "openai",
  defaultModel: "gpt-4o-mini",
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  fallbackProviders: [],
  enableCache: true,
  enableCostTracking: true,
  modelPreferences: {},
};

export function saveGlobalAIConfig(config: Partial<GlobalAIConfig>): void {
  const current = getGlobalAIConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(GLOBAL_AI_CONFIG_KEY, JSON.stringify(updated));
}

export function getGlobalAIConfig(): GlobalAIConfig {
  const stored = localStorage.getItem(GLOBAL_AI_CONFIG_KEY);
  if (!stored) return DEFAULT_GLOBAL_CONFIG;

  try {
    return { ...DEFAULT_GLOBAL_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_GLOBAL_CONFIG;
  }
}

export function clearGlobalAIConfig(): void {
  localStorage.removeItem(GLOBAL_AI_CONFIG_KEY);
}

/**
 * 获取API基础URL
 */
export function getApiBaseURL(providerId: string): string {
  const config = getProviderApiKey(providerId);

  if (config?.baseURL) {
    return config.baseURL;
  }

  const defaultURLs: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    google: "https://generativelanguage.googleapis.com/v1beta",
    openrouter: "https://openrouter.ai/api/v1",
    deepseek: "https://api.deepseek.com/v1",
    xai: "https://api.x.ai/v1",
    doubao: "https://ark.cn-beijing.volces.com/api/v3",
    moonshot: "https://api.moonshot.cn/v1",
    baidu: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
    zhipu: "https://open.bigmodel.cn/api/paas/v4",
  };

  return defaultURLs[providerId] || "";
}

export default {
  // 旧版兼容
  saveApiKey,
  getApiKey,
  clearApiKey,
  hasApiKey,
  saveApiConfig,
  getApiConfig,
  clearApiConfig,
  isApiConfigValid,
  getSecureApiHeaders,
  // 新版方法
  saveProviderApiKey,
  getProviderApiKey,
  clearProviderApiKey,
  hasProviderApiKey,
  getConfiguredProviders,
  setPreferredProvider,
  getPreferredProvider,
  saveGlobalAIConfig,
  getGlobalAIConfig,
  clearGlobalAIConfig,
  getApiBaseURL,
};
