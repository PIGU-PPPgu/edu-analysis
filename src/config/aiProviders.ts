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
        id: "doubao-seed-1-6-251015",
        name: "豆包 Seed 1.6",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 128000,
        endpointPath: "/chat/completions",
      },
      {
        id: "doubao-lite-128k",
        name: "豆包 Lite (128k)",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 131072,
        endpointPath: "/chat/completions",
      },
      {
        id: "doubao-pro-32k",
        name: "豆包 Pro 32K",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 32000,
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
  moonshot: {
    id: "moonshot",
    name: "月之暗面 (Kimi)",
    baseUrl: "https://api.moonshot.cn/v1",
    authType: "bearer",
    models: [
      {
        id: "moonshot-v1-8k",
        name: "Kimi 8K",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 8000,
      },
      {
        id: "moonshot-v1-32k",
        name: "Kimi 32K",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 32000,
      },
      {
        id: "moonshot-v1-128k",
        name: "Kimi 128K",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 128000,
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 2048,
      stream: Boolean(params.stream),
    }),
    responseFormat: (response) => ({
      choices: response.choices || [],
    }),
  },
  baidu: {
    id: "baidu",
    name: "百度 (文心一言)",
    baseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
    authType: "param",
    authKey: "access_token",
    models: [
      {
        id: "ernie-4.0-8k",
        name: "文心一言 4.0",
        maxTokens: 2048,
        supportStream: false,
        contextWindow: 8000,
      },
      {
        id: "ernie-3.5-8k",
        name: "文心一言 3.5",
        maxTokens: 2048,
        supportStream: false,
        contextWindow: 8000,
      },
    ],
    requestFormat: (params, model) => ({
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_output_tokens: params.max_tokens || 2048,
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
  },
  zhipu: {
    id: "zhipu",
    name: "智谱AI (ChatGLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authType: "bearer",
    models: [
      {
        id: "glm-4",
        name: "ChatGLM-4",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 128000,
      },
      {
        id: "glm-4-air",
        name: "ChatGLM-4 Air",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 128000,
      },
      {
        id: "glm-4-flash",
        name: "ChatGLM-4 Flash",
        maxTokens: 4096,
        supportStream: true,
        contextWindow: 128000,
      },
    ],
    requestFormat: (params, model) => ({
      model: model,
      messages: params.messages,
      temperature: params.temperature || 0.7,
      max_tokens: params.max_tokens || 2048,
      stream: Boolean(params.stream),
      top_p: params.top_p || 0.7,
    }),
    responseFormat: (response) => ({
      choices: response.choices || [],
    }),
  },
};
