import { AIProvider } from '../types/ai';

// OpenAI提供商配置
export const openAIProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  requiresApiKey: true,
  models: [
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      maxTokens: 4096,
      contextWindow: 16385,
      supportStream: true,
      description: '具有良好性价比的通用模型'
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      maxTokens: 8192,
      contextWindow: 8192,
      supportStream: true,
      description: '更强大、精确的大型语言模型'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      maxTokens: 4096,
      contextWindow: 128000,
      supportStream: true,
      description: '更快速的GPT-4版本，具有更大的上下文窗口'
    }
  ]
};

// DeepSeek提供商配置
export const deepSeekProvider: AIProvider = {
  id: 'deepseek',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com/v1/chat/completions',
  requiresApiKey: true,
  models: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: 'DeepSeek基础聊天模型'
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '针对代码生成和理解进行优化的模型'
    },
    {
      id: 'deepseek-llm-67b-chat',
      name: 'DeepSeek LLM 67B',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: 'DeepSeek大规模语言模型'
    }
  ]
};

// 硅基流动提供商配置 (使用DeepSeek API)
export const sbjtProvider: AIProvider = {
  id: 'sbjt',
  name: '硅基流动',
  baseUrl: 'https://api.deepseek.com/v1/chat/completions', // 使用DeepSeek的API
  requiresApiKey: true,
  models: [
    {
      id: 'sbjt-base',
      name: '硅基基础',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '硅基流动基础模型'
    },
    {
      id: 'sbjt-edu',
      name: '硅基教育',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '针对教育场景优化的模型'
    },
    {
      id: 'sbjt-code',
      name: '硅基代码',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '针对代码生成优化的模型'
    },
    {
      id: 'sbjt-knowledge',
      name: '硅基知识',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '针对知识处理优化的模型'
    },
    {
      id: 'Pro/deepseek-ai/DeepSeek-V3',
      name: 'DeepSeek-V3 (硅基流动专业版)',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '硅基流动提供的DeepSeek-V3专业版'
    },
    {
      id: 'deepseek-ai/DeepSeek-R1',
      name: 'DeepSeek-R1 (硅基流动版)',
      maxTokens: 8192,
      contextWindow: 16384,
      supportStream: true,
      description: '硅基流动提供的DeepSeek-R1版本'
    },
    {
      id: 'Qwen/Qwen2.5-VL-72B-Instruct',
      name: '千问视觉 (硅基流动版)',
      maxTokens: 4096,
      contextWindow: 32768,
      supportStream: true,
      description: '硅基流动提供的千问多模态视觉大模型，支持图像理解'
    },
    {
      id: 'deepseek-ai/deepseek-vl2',
      name: 'DeepSeek视觉VL2 (硅基流动版)',
      maxTokens: 2048,
      contextWindow: 4096,
      supportStream: true,
      description: '硅基流动提供的DeepSeek VL2多模态视觉模型'
    }
  ]
};

// 豆包 (火山方舟) 提供商配置
export const doubaoProvider: AIProvider = {
  id: 'doubao',
  name: '豆包视觉 (火山方舟)',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', // 基础 URL
  requiresApiKey: true,
  models: [
    {
      id: 'doubao-lite-128k', // 一个常见的文本模型示例
      name: '豆包 Lite (128k)',
      maxTokens: 4096, // 假设值
      contextWindow: 131072, // 128k
      supportStream: true,
      description: '豆包轻量版文本模型'
    },
    {
      id: 'doubao-vision-model', // 视觉模型的占位符 ID
      name: '豆包视觉模型',
      maxTokens: 2048, // 视觉模型通常响应较短
      contextWindow: 8192, // 假设值
      supportStream: false, // 视觉模型可能不支持流式
      description: '豆包多模态视觉模型 (需要确认具体模型ID或Endpoint ID)'
    }
    // 注意：实际使用可能需要填写真实的模型ID或Endpoint ID
  ]
};

// 百川提供商配置
export const baichuanProvider: AIProvider = {
  id: 'baichuan',
  name: '百川',
  baseUrl: 'https://api.baichuan-ai.com/v1/chat/completions',
  requiresApiKey: true,
  models: [
    {
      id: 'Baichuan2-Turbo',
      name: '百川2-Turbo',
      maxTokens: 4096,
      contextWindow: 8192,
      supportStream: true,
      description: '百川AI的中文优化模型'
    }
  ]
};

// 通义千问提供商配置
export const qwenProvider: AIProvider = {
  id: 'qwen',
  name: '通义千问',
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  requiresApiKey: true,
  models: [
    {
      id: 'qwen-turbo',
      name: '千问-Turbo',
      maxTokens: 2000,
      contextWindow: 8192,
      supportStream: true,
      description: '阿里云推出的通义千问系列模型'
    },
    {
      id: 'qwen-plus',
      name: '千问-Plus',
      maxTokens: 2000,
      contextWindow: 32768,
      supportStream: true,
      description: '通义千问增强版，具有更大的上下文窗口'
    }
  ]
};

// 自定义提供商适配
export const createCustomProvider = (id: string, name: string, endpoint: string): AIProvider => {
  return {
    id,
    name,
    baseUrl: endpoint,
    requiresApiKey: true,
    models: [
      {
        id: 'default-model',
        name: '默认模型',
        maxTokens: 4096,
        contextWindow: 8192,
        supportStream: true,
        description: '自定义API提供商默认模型'
      }
    ]
  };
};

// 所有提供商列表
export const allProviders: AIProvider[] = [
  openAIProvider,
  deepSeekProvider,
  sbjtProvider,
  doubaoProvider,
  baichuanProvider,
  qwenProvider
];

// 根据ID获取提供商
export const getProviderById = (id: string): AIProvider | undefined => {
  // 首先查找内置提供商
  const provider = allProviders.find(provider => provider.id === id);
  if (provider) return provider;
  
  // 如果是自定义提供商，创建一个临时提供商
  if (id === 'generic' || id.startsWith('custom-')) {
    return createCustomProvider(
      id, 
      id === 'generic' ? '通用API' : `自定义(${id})`,
      'https://api.example.com/v1/chat/completions' // 这只是一个占位符，会在实际请求中被替换
    );
  }
  
  return undefined;
};

// 获取提供商的模型
export const getModelsByProviderId = (providerId: string): Array<{id: string, name: string}> => {
  const provider = getProviderById(providerId);
  if (!provider) return [];
  return provider.models.map(model => ({
    id: model.id,
    name: model.name
  }));
};

// 根据提供商ID和模型ID获取模型信息
export const getModelInfo = (providerId: string, modelId: string) => {
  const provider = getProviderById(providerId);
  if (!provider) return null;
  
  // 先尝试精确匹配
  const exactMatch = provider.models.find(model => model.id === modelId);
  if (exactMatch) return exactMatch;
  
  // 如果没有找到且是自定义提供商，返回默认模型
  if (providerId === 'generic' || providerId.startsWith('custom-')) {
    return provider.models[0];
  }
  
  return null;
};

// 可用于测试的视觉模型列表
export const VISION_MODELS_FOR_TEST = [
  { id: 'Qwen/Qwen2.5-VL-72B-Instruct', name: '千问视觉 (Qwen VL)', provider: 'sbjt' },
  { id: 'deepseek-ai/deepseek-vl2', name: 'DeepSeek视觉 (VL2)', provider: 'sbjt' },
  { id: 'doubao-1-5-vision-pro-32k-250115', name: '豆包视觉 (Doubao Pro 32k)', provider: 'doubao' },
]; 