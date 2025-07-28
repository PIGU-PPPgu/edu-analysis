// 预定义的AI提供商配置

import { ProviderConfig } from "@/types/ai";

/**
 * 默认的AI提供商配置
 */
export const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    models: [
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        maxTokens: 4096,
        supportStream: true,
      },
      { id: "gpt-4", name: "GPT-4", maxTokens: 8192, supportStream: true },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        maxTokens: 128000,
        supportStream: true,
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 1000,
      stream: params.stream || false,
    }),
    responseFormat: (response) => ({
      choices: response.choices || [],
    }),
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    authType: "bearer",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek-V3",
        maxTokens: 8192,
        supportStream: true,
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek-R1",
        maxTokens: 8192,
        supportStream: true,
      },
      {
        id: "deepseek-coder",
        name: "DeepSeek Coder",
        maxTokens: 8192,
        supportStream: true,
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 1000,
      stream: Boolean(params.stream),
    }),
    responseFormat: (response) => {
      if (response.choices && Array.isArray(response.choices)) {
        return {
          choices: response.choices.map((choice) => ({
            message: choice.message || {
              content: choice.text || "",
              role: "assistant",
            },
          })),
        };
      }
      return { choices: [] };
    },
  },
  baichuan: {
    id: "baichuan",
    name: "百川",
    baseUrl: "https://api.baichuan-ai.com/v1",
    authType: "bearer",
    models: [
      { id: "Baichuan4", name: "百川4", maxTokens: 4096, supportStream: false },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      top_p: params.top_p || 0.8,
      max_tokens: params.max_tokens || 1000,
    }),
    responseFormat: (response) => ({
      choices: [
        {
          message: {
            content: response.response || response.data?.response || "",
            role: "assistant",
          },
        },
      ],
    }),
  },
  qwen: {
    id: "qwen",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    authType: "bearer",
    models: [
      {
        id: "qwen-max",
        name: "通义千问-Max",
        maxTokens: 6144,
        supportStream: false,
      },
      {
        id: "qwen-plus",
        name: "通义千问-Plus",
        maxTokens: 4096,
        supportStream: false,
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      input: {
        messages: params.messages,
      },
      parameters: {
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 1000,
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
  },
  sbjt: {
    id: "sbjt",
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    authType: "bearer",
    models: [
      {
        id: "deepseek-ai/DeepSeek-V3",
        name: "DeepSeek-V3",
        maxTokens: 8192,
        supportStream: true,
      },
      {
        id: "deepseek-ai/DeepSeek-Coder",
        name: "DeepSeek Coder",
        maxTokens: 8192,
        supportStream: true,
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 1000,
      stream: Boolean(params.stream),
      top_p: 0.7,
      top_k: 50,
      frequency_penalty: 0.5,
      n: 1,
      stop: [],
    }),
    responseFormat: (response) => {
      if (response.choices && Array.isArray(response.choices)) {
        return {
          choices: response.choices.map((choice) => ({
            message: choice.message || {
              content: choice.text || "",
              role: "assistant",
            },
          })),
        };
      }
      return { choices: [] };
    },
  },
  doubao: {
    id: "doubao",
    name: "豆包视觉 (火山方舟)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    authType: "bearer",
    models: [
      {
        id: "doubao-lite-128k",
        name: "豆包 Lite (128k)",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 131072,
        endpointPath: "/chat/completions",
      },
      {
        id: "doubao-1-5-vision-pro-32k-250115",
        name: "豆包视觉模型 (Pro 32k)",
        maxTokens: 2048,
        supportStream: false,
        contextWindow: 32768,
        endpointPath: "/chat/completions",
      },
      {
        id: "bot-20250429000553-tlhdg",
        name: "豆包文本Bot (示例)",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 32768,
        endpointPath: "/bots/chat/completions",
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 2048,
      stream: Boolean(params.stream),
      top_p: params.top_p || 0.9,
    }),
    responseFormat: (response) => {
      return {
        choices: response.choices || [],
      };
    },
  },
};
