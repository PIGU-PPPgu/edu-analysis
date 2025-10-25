/**
 * API格式预设
 * 定义不同AI提供商的API请求/响应格式模板
 */

export interface APIFormatPreset {
  id: string;
  name: string;
  description: string;
  authType: "bearer" | "header" | "param";
  authHeaderName?: string; // 自定义认证头名称
  authParamName?: string; // 自定义认证参数名称
  requestFormat: (params: any, model: string) => any;
  responseFormat: (response: any) => any;
  defaultEndpoint?: string; // 默认端点路径
  exampleBaseURL?: string; // 示例baseURL
}

/**
 * OpenAI兼容格式
 * 适用于：OpenAI、Azure OpenAI、DeepSeek、月之暗面、智谱等
 */
export const OPENAI_FORMAT: APIFormatPreset = {
  id: "openai",
  name: "OpenAI 标准格式",
  description: "适用于OpenAI及大部分兼容OpenAI格式的API",
  authType: "bearer",
  defaultEndpoint: "/chat/completions",
  exampleBaseURL: "https://api.openai.com/v1",
  requestFormat: (params, model) => ({
    model: model,
    messages: params.messages,
    temperature: params.temperature || 0.7,
    max_tokens: params.max_tokens || 2000,
    stream: Boolean(params.stream),
    top_p: params.top_p || 1,
    frequency_penalty: params.frequency_penalty || 0,
    presence_penalty: params.presence_penalty || 0,
  }),
  responseFormat: (response) => ({
    choices: response.choices || [],
  }),
};

/**
 * Anthropic Claude格式
 */
export const ANTHROPIC_FORMAT: APIFormatPreset = {
  id: "anthropic",
  name: "Anthropic Claude 格式",
  description: "适用于Anthropic Claude API",
  authType: "header",
  authHeaderName: "x-api-key",
  defaultEndpoint: "/messages",
  exampleBaseURL: "https://api.anthropic.com/v1",
  requestFormat: (params, model) => ({
    model: model,
    messages: params.messages,
    max_tokens: params.max_tokens || 2000,
    temperature: params.temperature || 0.7,
    top_p: params.top_p || 1,
    stream: Boolean(params.stream),
  }),
  responseFormat: (response) => {
    // Claude响应格式转换为OpenAI格式
    if (response.content && Array.isArray(response.content)) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: response.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join(""),
            },
          },
        ],
      };
    }
    return { choices: [] };
  },
};

/**
 * Google Gemini格式
 */
export const GEMINI_FORMAT: APIFormatPreset = {
  id: "gemini",
  name: "Google Gemini 格式",
  description: "适用于Google Gemini API",
  authType: "param",
  authParamName: "key",
  defaultEndpoint: "/models/{model}:generateContent",
  exampleBaseURL: "https://generativelanguage.googleapis.com/v1beta",
  requestFormat: (params, model) => ({
    contents: params.messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    generationConfig: {
      temperature: params.temperature || 0.7,
      maxOutputTokens: params.max_tokens || 2000,
      topP: params.top_p || 1,
    },
  }),
  responseFormat: (response) => {
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      const content =
        candidate.content?.parts?.map((p: any) => p.text).join("") || "";
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: content,
            },
          },
        ],
      };
    }
    return { choices: [] };
  },
};

/**
 * 百度文心一言格式
 */
export const BAIDU_FORMAT: APIFormatPreset = {
  id: "baidu",
  name: "百度文心一言格式",
  description: "适用于百度文心一言API",
  authType: "param",
  authParamName: "access_token",
  defaultEndpoint: "/chat/{model}",
  exampleBaseURL:
    "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
  requestFormat: (params, model) => ({
    messages: params.messages,
    temperature: params.temperature || 0.7,
    max_output_tokens: params.max_tokens || 2000,
    top_p: params.top_p || 0.8,
  }),
  responseFormat: (response) => ({
    choices: [
      {
        message: {
          content: response.result || "",
          role: "assistant",
        },
      },
    ],
  }),
};

/**
 * 阿里通义千问格式
 */
export const QWEN_FORMAT: APIFormatPreset = {
  id: "qwen",
  name: "阿里通义千问格式",
  description: "适用于阿里云通义千问API",
  authType: "bearer",
  defaultEndpoint: "/services/aigc/text-generation/generation",
  exampleBaseURL: "https://dashscope.aliyuncs.com/api/v1",
  requestFormat: (params, model) => ({
    model: model,
    input: {
      messages: params.messages,
    },
    parameters: {
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 2000,
      top_p: params.top_p || 0.8,
      result_format: "message",
    },
  }),
  responseFormat: (response) => ({
    choices: [
      {
        message: {
          content:
            response.output?.text || response.output?.message?.content || "",
          role: "assistant",
        },
      },
    ],
  }),
};

/**
 * 通用格式（最简单的格式，适合大部分API）
 */
export const GENERIC_FORMAT: APIFormatPreset = {
  id: "generic",
  name: "通用格式",
  description: "通用的请求/响应格式，适合大部分自定义API",
  authType: "bearer",
  defaultEndpoint: "/chat/completions",
  requestFormat: (params, model) => ({
    model: model,
    messages: params.messages,
    temperature: params.temperature || 0.7,
    max_tokens: params.max_tokens || 2000,
    stream: Boolean(params.stream),
  }),
  responseFormat: (response) => {
    // 尝试多种常见的响应格式
    if (response.choices && Array.isArray(response.choices)) {
      return { choices: response.choices };
    }
    if (response.message) {
      return { choices: [{ message: response.message }] };
    }
    if (response.response || response.text || response.content) {
      return {
        choices: [
          {
            message: {
              content: response.response || response.text || response.content,
              role: "assistant",
            },
          },
        ],
      };
    }
    return { choices: [] };
  },
};

/**
 * 所有可用的格式预设
 */
export const API_FORMAT_PRESETS: Record<string, APIFormatPreset> = {
  openai: OPENAI_FORMAT,
  anthropic: ANTHROPIC_FORMAT,
  gemini: GEMINI_FORMAT,
  baidu: BAIDU_FORMAT,
  qwen: QWEN_FORMAT,
  generic: GENERIC_FORMAT,
};

/**
 * 获取格式预设列表（用于UI选择）
 */
export function getFormatPresetOptions() {
  return Object.values(API_FORMAT_PRESETS).map((preset) => ({
    value: preset.id,
    label: preset.name,
    description: preset.description,
  }));
}

/**
 * 根据ID获取格式预设
 */
export function getFormatPreset(id: string): APIFormatPreset | null {
  return API_FORMAT_PRESETS[id] || null;
}

/**
 * 自定义提供商配置（扩展版）
 */
export interface CustomProviderConfig {
  id: string;
  name: string;
  displayName: string;
  baseURL: string;
  formatPresetId: string; // 使用的格式预设ID
  customEndpoint?: string; // 自定义端点（覆盖预设）
  apiKeyFormat?: string;
  models: Array<{
    id: string;
    name: string;
    contextWindow?: number;
    maxOutputTokens?: number;
  }>;
}

// 使用独立的存储key以避免与旧系统(aiProviderManager.ts)冲突
const CUSTOM_PROVIDERS_KEY = "custom_ai_providers_v2";

/**
 * 保存自定义提供商
 */
export function saveCustomProvider(config: CustomProviderConfig): void {
  const providers = getCustomProviders();
  const index = providers.findIndex((p) => p.id === config.id);

  if (index >= 0) {
    providers[index] = config;
  } else {
    providers.push(config);
  }

  localStorage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(providers));
}

/**
 * 获取所有自定义提供商
 */
export function getCustomProviders(): CustomProviderConfig[] {
  const stored = localStorage.getItem(CUSTOM_PROVIDERS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as CustomProviderConfig[];
  } catch {
    return [];
  }
}

/**
 * 删除自定义提供商
 */
export function deleteCustomProvider(providerId: string): void {
  const providers = getCustomProviders();
  const filtered = providers.filter((p) => p.id !== providerId);
  localStorage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(filtered));
}

/**
 * 根据自定义配置生成完整的提供商对象
 */
export function buildProviderFromConfig(config: CustomProviderConfig) {
  const formatPreset = getFormatPreset(config.formatPresetId);
  if (!formatPreset) {
    throw new Error(`未找到格式预设: ${config.formatPresetId}`);
  }

  return {
    id: config.id,
    name: config.name,
    displayName: config.displayName,
    baseURL: config.baseURL,
    apiKeyFormat: config.apiKeyFormat,
    authType: formatPreset.authType,
    authHeaderName: formatPreset.authHeaderName,
    authParamName: formatPreset.authParamName,
    requestFormat: formatPreset.requestFormat,
    responseFormat: formatPreset.responseFormat,
    models: config.models,
  };
}
