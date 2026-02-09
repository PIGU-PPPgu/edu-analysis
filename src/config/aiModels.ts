/**
 * AI模型配置中心
 * 统一管理所有AI提供商和模型配置
 * 支持动态添加自定义模型
 */

// AI提供商信息
export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  apiKeyFormat?: string; // API Key格式说明
  apiKeyPrefix?: string; // API Key前缀
  baseURL?: string; // API基础URL
  docURL?: string; // 文档链接
  requiresCustomEndpoint?: boolean; // 是否需要自定义端点
}

// AI模型信息
export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  provider: string; // 提供商ID
  contextWindow: number; // 上下文窗口
  maxOutputTokens: number; // 最大输出token
  pricing?: {
    input: number; // 每1M tokens价格 (USD)
    output: number;
  };
  capabilities?: string[]; // 能力标签
  deprecated?: boolean; // 是否已弃用
  releaseDate?: string; // 发布日期
  description?: string;
}

// 完整的AI配置
export interface AIProviderConfig {
  apiKey: string;
  baseURL?: string;
  orgId?: string; // 组织ID (某些提供商需要)
  projectId?: string; // 项目ID (某些提供商需要)
  region?: string; // 区域 (Azure等)
  customHeaders?: Record<string, string>;
}

// ==================== AI提供商定义 ====================

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    id: "openai",
    name: "openai",
    displayName: "OpenAI",
    apiKeyFormat: "sk-proj-...",
    apiKeyPrefix: "sk-",
    baseURL: "https://api.openai.com/v1",
    docURL: "https://platform.openai.com/docs",
  },
  anthropic: {
    id: "anthropic",
    name: "anthropic",
    displayName: "Anthropic (Claude)",
    apiKeyFormat: "sk-ant-...",
    apiKeyPrefix: "sk-ant-",
    baseURL: "https://api.anthropic.com/v1",
    docURL: "https://docs.anthropic.com",
  },
  google: {
    id: "google",
    name: "google",
    displayName: "Google (Gemini)",
    apiKeyFormat: "AIza...",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    docURL: "https://ai.google.dev/docs",
  },
  azure: {
    id: "azure",
    name: "azure",
    displayName: "Azure OpenAI",
    requiresCustomEndpoint: true,
    docURL: "https://learn.microsoft.com/azure/ai-services/openai",
  },
  openrouter: {
    id: "openrouter",
    name: "openrouter",
    displayName: "OpenRouter",
    apiKeyFormat: "sk-or-v1-...",
    baseURL: "https://openrouter.ai/api/v1",
    docURL: "https://openrouter.ai/docs",
  },
  deepseek: {
    id: "deepseek",
    name: "deepseek",
    displayName: "DeepSeek",
    apiKeyFormat: "sk-...",
    baseURL: "https://api.deepseek.com/v1",
    docURL: "https://platform.deepseek.com/docs",
  },
  xai: {
    id: "xai",
    name: "xai",
    displayName: "xAI (Grok)",
    apiKeyFormat: "xai-...",
    baseURL: "https://api.x.ai/v1",
    docURL: "https://docs.x.ai",
  },
  doubao: {
    id: "doubao",
    name: "doubao",
    displayName: "豆包 (火山引擎)",
    apiKeyFormat: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    docURL: "https://www.volcengine.com/docs/82379",
  },
  moonshot: {
    id: "moonshot",
    name: "moonshot",
    displayName: "月之暗面 (Kimi)",
    apiKeyFormat: "sk-...",
    apiKeyPrefix: "sk-",
    baseURL: "https://api.moonshot.cn/v1",
    docURL: "https://platform.moonshot.cn/docs",
  },
  baidu: {
    id: "baidu",
    name: "baidu",
    displayName: "百度 (文心一言)",
    apiKeyFormat: "需要API Key和Secret Key",
    baseURL: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
    docURL: "https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html",
  },
  zhipu: {
    id: "zhipu",
    name: "zhipu",
    displayName: "智谱AI (ChatGLM)",
    apiKeyFormat: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxx",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    docURL: "https://open.bigmodel.cn/dev/api",
  },
  custom: {
    id: "custom",
    name: "custom",
    displayName: "自定义提供商",
    requiresCustomEndpoint: true,
    docURL: "",
  },
};

// ==================== AI模型定义 ====================

export const AI_MODELS: Record<string, AIModel> = {
  // OpenAI GPT系列
  "gpt-4o": {
    id: "gpt-4o",
    name: "gpt-4o",
    displayName: "GPT-4o (最新多模态)",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { input: 2.5, output: 10 },
    capabilities: ["vision", "function-calling", "json-mode"],
    releaseDate: "2024-11",
    description: "最新的GPT-4o模型，支持视觉和多模态",
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    displayName: "GPT-4o Mini (高性价比)",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ["vision", "function-calling", "json-mode"],
    releaseDate: "2024-07",
    description: "性价比极高的小模型",
  },
  "gpt-4-turbo": {
    id: "gpt-4-turbo",
    name: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 10, output: 30 },
    capabilities: ["vision", "function-calling", "json-mode"],
    releaseDate: "2024-04",
  },
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    name: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    provider: "openai",
    contextWindow: 16385,
    maxOutputTokens: 4096,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["function-calling", "json-mode"],
    releaseDate: "2023-03",
  },

  // Anthropic Claude系列
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet (最新)",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { input: 3, output: 15 },
    capabilities: ["vision", "extended-context", "thinking"],
    releaseDate: "2024-10",
    description: "最新的Claude 3.5 Sonnet，支持扩展思考",
  },
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    name: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku (快速)",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { input: 0.8, output: 4 },
    capabilities: ["vision", "extended-context"],
    releaseDate: "2024-10",
    description: "最快速的Claude模型",
  },
  "claude-3-opus-20240229": {
    id: "claude-3-opus-20240229",
    name: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus (最强)",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { input: 15, output: 75 },
    capabilities: ["vision", "extended-context"],
    releaseDate: "2024-02",
    description: "最强大的Claude模型，适合复杂任务",
  },

  // Google Gemini系列
  "gemini-2.0-flash-exp": {
    id: "gemini-2.0-flash-exp",
    name: "gemini-2.0-flash-exp",
    displayName: "Gemini 2.0 Flash (实验版)",
    provider: "google",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: { input: 0, output: 0 }, // 实验版免费
    capabilities: ["vision", "multimodal", "long-context"],
    releaseDate: "2024-12",
    description: "最新的Gemini 2.0 Flash实验版，百万token上下文",
  },
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    name: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    provider: "google",
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    pricing: { input: 1.25, output: 5 },
    capabilities: ["vision", "multimodal", "long-context"],
    releaseDate: "2024-05",
    description: "超长上下文的Gemini模型，支持200万token",
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    name: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    provider: "google",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: { input: 0.075, output: 0.3 },
    capabilities: ["vision", "multimodal", "long-context"],
    releaseDate: "2024-05",
    description: "快速且高性价比的Gemini模型",
  },

  // DeepSeek系列
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "deepseek-chat",
    displayName: "DeepSeek Chat",
    provider: "deepseek",
    contextWindow: 64000,
    maxOutputTokens: 4096,
    pricing: { input: 0.14, output: 0.28 },
    capabilities: ["function-calling", "long-context"],
    releaseDate: "2024-01",
    description: "DeepSeek的对话模型，性价比极高",
  },
  "deepseek-coder": {
    id: "deepseek-coder",
    name: "deepseek-coder",
    displayName: "DeepSeek Coder",
    provider: "deepseek",
    contextWindow: 64000,
    maxOutputTokens: 4096,
    pricing: { input: 0.14, output: 0.28 },
    capabilities: ["coding", "function-calling"],
    releaseDate: "2024-01",
    description: "专注于代码生成的DeepSeek模型",
  },

  // xAI Grok系列
  "grok-beta": {
    id: "grok-beta",
    name: "grok-beta",
    displayName: "Grok Beta",
    provider: "xai",
    contextWindow: 131072,
    maxOutputTokens: 4096,
    pricing: { input: 5, output: 15 },
    capabilities: ["real-time-data", "vision"],
    releaseDate: "2024-11",
    description: "xAI的Grok模型，可访问实时数据",
  },

  // 豆包(火山引擎)系列
  "doubao-seed-1-8-251228": {
    id: "doubao-seed-1-8-251228",
    name: "doubao-seed-1-8-251228",
    displayName: "豆包 Seed 1.8 (最新)",
    provider: "doubao",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 0.3, output: 0.6 },
    capabilities: ["long-context", "chinese-optimized", "reasoning"],
    releaseDate: "2024-12-28",
    description: "火山引擎豆包最新版本，针对中文优化，增强推理能力",
  },
  "doubao-seed-1-6-251015": {
    id: "doubao-seed-1-6-251015",
    name: "doubao-seed-1-6-251015",
    displayName: "豆包 Seed 1.6",
    provider: "doubao",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 0.3, output: 0.6 },
    capabilities: ["long-context", "chinese-optimized"],
    releaseDate: "2024-10-15",
    description: "火山引擎豆包1.6版本，针对中文优化",
  },
  "doubao-pro-32k": {
    id: "doubao-pro-32k",
    name: "doubao-pro-32k",
    displayName: "豆包 Pro 32K",
    provider: "doubao",
    contextWindow: 32000,
    maxOutputTokens: 4096,
    pricing: { input: 0.5, output: 1.0 },
    capabilities: ["long-context", "chinese-optimized"],
    releaseDate: "2024-08",
    description: "豆包专业版，32K上下文",
  },

  // 月之暗面Kimi系列
  "moonshot-v1-8k": {
    id: "moonshot-v1-8k",
    name: "moonshot-v1-8k",
    displayName: "Kimi 8K",
    provider: "moonshot",
    contextWindow: 8000,
    maxOutputTokens: 4096,
    pricing: { input: 0.12, output: 0.12 },
    capabilities: ["chinese-optimized"],
    releaseDate: "2024-03",
    description: "Kimi标准版，8K上下文",
  },
  "moonshot-v1-32k": {
    id: "moonshot-v1-32k",
    name: "moonshot-v1-32k",
    displayName: "Kimi 32K",
    provider: "moonshot",
    contextWindow: 32000,
    maxOutputTokens: 4096,
    pricing: { input: 0.24, output: 0.24 },
    capabilities: ["long-context", "chinese-optimized"],
    releaseDate: "2024-03",
    description: "Kimi长文本版，32K上下文",
  },
  "moonshot-v1-128k": {
    id: "moonshot-v1-128k",
    name: "moonshot-v1-128k",
    displayName: "Kimi 128K",
    provider: "moonshot",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 0.6, output: 0.6 },
    capabilities: ["long-context", "chinese-optimized"],
    releaseDate: "2024-03",
    description: "Kimi超长文本版，128K上下文",
  },

  // 百度文心一言系列
  "ernie-4.0-8k": {
    id: "ernie-4.0-8k",
    name: "ernie-4.0-8k",
    displayName: "文心一言 4.0",
    provider: "baidu",
    contextWindow: 8000,
    maxOutputTokens: 2048,
    pricing: { input: 1.2, output: 1.2 },
    capabilities: ["chinese-optimized", "function-calling"],
    releaseDate: "2024-01",
    description: "百度文心一言4.0，中文理解能力强",
  },
  "ernie-3.5-8k": {
    id: "ernie-3.5-8k",
    name: "ernie-3.5-8k",
    displayName: "文心一言 3.5",
    provider: "baidu",
    contextWindow: 8000,
    maxOutputTokens: 2048,
    pricing: { input: 0.12, output: 0.12 },
    capabilities: ["chinese-optimized"],
    releaseDate: "2023-08",
    description: "文心一言3.5，性价比高",
  },

  // 智谱ChatGLM系列
  "glm-4": {
    id: "glm-4",
    name: "glm-4",
    displayName: "ChatGLM-4",
    provider: "zhipu",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 1.0, output: 1.0 },
    capabilities: ["long-context", "chinese-optimized", "vision"],
    releaseDate: "2024-06",
    description: "智谱最新旗舰模型，支持128K上下文",
  },
  "glm-4-air": {
    id: "glm-4-air",
    name: "glm-4-air",
    displayName: "ChatGLM-4 Air",
    provider: "zhipu",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 0.1, output: 0.1 },
    capabilities: ["long-context", "chinese-optimized"],
    releaseDate: "2024-06",
    description: "GLM-4轻量版，性价比极高",
  },
  "glm-4-flash": {
    id: "glm-4-flash",
    name: "glm-4-flash",
    displayName: "ChatGLM-4 Flash",
    provider: "zhipu",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 0.01, output: 0.01 },
    capabilities: ["long-context", "chinese-optimized"],
    releaseDate: "2024-06",
    description: "GLM-4闪电版，免费使用",
  },
};

// ==================== 按提供商分组的模型 ====================

export function getModelsByProvider(providerId: string): AIModel[] {
  return Object.values(AI_MODELS).filter(
    (model) => model.provider === providerId && !model.deprecated
  );
}

export function getAllProviders(): AIProvider[] {
  return Object.values(AI_PROVIDERS);
}

export function getProvider(providerId: string): AIProvider | undefined {
  return AI_PROVIDERS[providerId];
}

export function getModel(modelId: string): AIModel | undefined {
  return AI_MODELS[modelId];
}

// ==================== 推荐模型 ====================

export const RECOMMENDED_MODELS = {
  高性价比: [
    "gpt-4o-mini",
    "claude-3-5-haiku-20241022",
    "gemini-1.5-flash",
    "deepseek-chat",
    "glm-4-flash",
    "glm-4-air",
  ],
  最强性能: ["claude-3-opus-20240229", "gpt-4o", "gemini-1.5-pro", "glm-4"],
  超长上下文: [
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "claude-3-5-sonnet-20241022",
    "moonshot-v1-128k",
    "glm-4",
  ],
  视觉理解: [
    "gpt-4o",
    "claude-3-5-sonnet-20241022",
    "gemini-2.0-flash-exp",
    "glm-4",
  ],
  代码生成: ["deepseek-coder", "gpt-4o", "claude-3-5-sonnet-20241022"],
  中文优化: [
    "doubao-seed-1-8-251228",
    "doubao-seed-1-6-251015",
    "moonshot-v1-128k",
    "glm-4",
    "ernie-4.0-8k",
  ],
};

// ==================== 默认配置 ====================

export const DEFAULT_MODEL_CONFIG = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// ==================== 自定义模型存储 ====================

const CUSTOM_MODELS_KEY = "custom_ai_models";

export function saveCustomModel(model: AIModel): void {
  const customModels = getCustomModels();
  const index = customModels.findIndex((m) => m.id === model.id);

  if (index >= 0) {
    customModels[index] = model;
  } else {
    customModels.push(model);
  }

  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(customModels));
}

export function getCustomModels(): AIModel[] {
  const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as AIModel[];
  } catch {
    return [];
  }
}

export function deleteCustomModel(modelId: string): void {
  const customModels = getCustomModels();
  const filtered = customModels.filter((m) => m.id !== modelId);
  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(filtered));
}

export function getAllModels(): AIModel[] {
  return [...Object.values(AI_MODELS), ...getCustomModels()];
}

/**
 * 获取特定提供商的自定义模型
 */
export function getCustomModelsByProvider(providerId: string): AIModel[] {
  return getCustomModels().filter((m) => m.provider === providerId);
}

/**
 * 获取提供商的所有模型（内置+自定义）
 */
export function getAllProviderModels(providerId: string): AIModel[] {
  const builtInModels = getModelsByProvider(providerId);
  const customModels = getCustomModelsByProvider(providerId);
  return [...builtInModels, ...customModels];
}
