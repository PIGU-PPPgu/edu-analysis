import { AIProvider } from '../types/ai';
import { DEFAULT_PROVIDERS } from '@/config/aiProviders'; // Import from the single source of truth

// OpenAI提供商配置
// export const openAIProvider: AIProvider = { ... };

// DeepSeek提供商配置
// export const deepSeekProvider: AIProvider = { ... };

// 硅基流动提供商配置 (使用DeepSeek API)
// export const sbjtProvider: AIProvider = { ... };

// 豆包 (火山方舟) 提供商配置
// export const doubaoProvider: AIProvider = { ... };

// 百川提供商配置
// export const baichuanProvider: AIProvider = { ... };

// 通义千问提供商配置
// export const qwenProvider: AIProvider = { ... };

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

// 所有提供商列表 (Generate from DEFAULT_PROVIDERS)
// export const allProviders: AIProvider[] = Object.values(DEFAULT_PROVIDERS);

// 根据ID获取提供商 (Use DEFAULT_PROVIDERS)
export const getProviderById = (id: string): AIProvider | undefined => {
  // Find in default providers
  const defaultConfig = DEFAULT_PROVIDERS[id];
  if (defaultConfig) {
    // Map ProviderConfig to AIProvider type if necessary, or adjust types
    // For now, assume they are compatible enough or handle mapping here.
    // This might require adjusting the AIProvider type or how DEFAULT_PROVIDERS are defined.
    // Let's try a direct return first, assuming compatibility for now.
    return defaultConfig as unknown as AIProvider; // Cast needed if types differ slightly
  }
  
  // Handle custom providers if needed (logic from previous version)
  if (id === 'generic' || id.startsWith('custom-')) {
    return createCustomProvider(
      id, 
      id === 'generic' ? '通用API' : `自定义(${id})`,
      'https://api.example.com/v1/chat/completions' // Placeholder
    );
  }
  
  return undefined;
};

// 获取提供商的模型 (Use the new getProviderById)
export const getModelsByProviderId = (providerId: string): Array<{id: string, name: string}> => {
  const provider = getProviderById(providerId);
  if (!provider || !Array.isArray(provider.models)) return [];
  return provider.models.map(model => ({
    id: model.id,
    name: model.name
  }));
};

// 根据提供商ID和模型ID获取模型信息 (Use the new getProviderById)
export const getModelInfo = (providerId: string, modelId: string) => {
  const provider = getProviderById(providerId);
  if (!provider || !Array.isArray(provider.models)) return null;
  
  const exactMatch = provider.models.find(model => model.id === modelId);
  if (exactMatch) return exactMatch;
  
  // Handle custom providers default model
  if (providerId === 'generic' || providerId.startsWith('custom-')) {
    return provider.models[0];
  }
  
  return null;
};

// 可用于测试的视觉模型列表
export const VISION_MODELS_FOR_TEST = [
  { id: 'Qwen/Qwen2.5-VL-72B-Instruct', name: '千问视觉 (Qwen VL)', provider: 'sbjt', type: 'vision' },
  { id: 'deepseek-ai/deepseek-vl2', name: 'DeepSeek视觉 (VL2)', provider: 'sbjt', type: 'vision' },
  { id: 'doubao-1-5-vision-pro-32k-250115', name: '豆包视觉 (Doubao Pro 32k)', provider: 'doubao', type: 'vision' },
]; 