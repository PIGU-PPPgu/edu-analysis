// AI提供商管理器

import { ProviderConfig } from '@/types/ai';
import { DEFAULT_PROVIDERS } from '@/config/aiProviders';

const STORAGE_KEY = 'custom_ai_providers';

/**
 * 获取自定义提供商配置
 * @returns 自定义提供商配置
 */
export function getCustomProviders(): Record<string, ProviderConfig> {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return {};
    
    // 获取存储的基本配置
    const storedProviders = JSON.parse(savedData);
    
    // 注意：存储在localStorage中的函数被序列化为null，需要重新添加
    Object.keys(storedProviders).forEach(providerId => {
      const provider = storedProviders[providerId];
      
      // 添加通用请求格式化函数
      provider.requestFormat = (params: any, model: string) => ({
        model: model,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 1000,
        stream: Boolean(params.stream)
      });
      
      // 添加通用响应格式化函数
      provider.responseFormat = (response: any) => {
        try {
          // 通用响应处理
          return {
            choices: [
              {
                message: {
                  content: response.choices?.[0]?.message?.content || 
                           response.choices?.[0]?.text ||
                           response.output?.text ||
                           response.output?.message?.content ||
                           response.response ||
                           response.data?.response ||
                           '',
                  role: 'assistant'
                }
              }
            ]
          };
        } catch (error) {
          console.error('响应格式化失败:', error);
          return { choices: [] };
        }
      };
    });
    
    return storedProviders;
  } catch (error) {
    console.error('获取自定义AI提供商失败:', error);
    return {};
  }
}

/**
 * 获取所有提供商(内置+自定义)
 * @returns 所有提供商配置
 */
export function getAllProviders(): Record<string, ProviderConfig> {
  return { ...DEFAULT_PROVIDERS, ...getCustomProviders() };
}

/**
 * 添加或更新自定义提供商
 * @param config 提供商配置
 * @returns 是否保存成功
 */
export function saveCustomProvider(config: ProviderConfig): boolean {
  try {
    // 验证必要字段
    if (!config.id || !config.name || !config.baseUrl || !config.models || config.models.length === 0) {
      throw new Error('无效的提供商配置');
    }
    
    // 获取现有配置
    const providers = getCustomProviders();
    
    // 创建可存储版本的配置（移除函数）
    const storableConfig = {
      ...config,
      requestFormat: undefined,
      responseFormat: undefined
    };
    
    // 更新提供商
    providers[config.id] = config;
    
    // 保存到本地存储 (函数会被JSON.stringify省略)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers, (key, value) => {
      if (typeof value === 'function') return undefined;
      return value;
    }));
    
    return true;
  } catch (error) {
    console.error('保存自定义AI提供商失败:', error);
    return false;
  }
}

/**
 * 删除自定义提供商
 * @param providerId 提供商ID
 * @returns 是否删除成功
 */
export function deleteCustomProvider(providerId: string): boolean {
  try {
    const providers = getCustomProviders();
    if (!providers[providerId]) return false;
    
    delete providers[providerId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers, (key, value) => {
      if (typeof value === 'function') return undefined;
      return value;
    }));
    
    return true;
  } catch (error) {
    console.error('删除自定义AI提供商失败:', error);
    return false;
  }
}

/**
 * 获取指定提供商配置
 * @param providerId 提供商ID
 * @returns 提供商配置或undefined
 */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  const allProviders = getAllProviders();
  return allProviders[providerId];
}

/**
 * 测试AI提供商连接
 * @param config 提供商配置
 * @param apiKey API密钥
 * @returns 测试结果
 */
export async function testProviderConnection(
  config: ProviderConfig, 
  apiKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { EnhancedAIClient } = await import('./enhancedAIClient');
    const client = new EnhancedAIClient(apiKey, config.id, config.models[0]?.id, true);
    
    // 发送简单测试请求
    await client.chat.completions.create({
      messages: [{ role: 'user', content: '你好' }],
      max_tokens: 10
    });
    
    return { success: true, message: '连接成功' };
  } catch (error: any) {
    console.error('测试连接失败:', error);
    return { 
      success: false, 
      message: `连接失败: ${error.message || '未知错误'}` 
    };
  }
}

/**
 * 获取提供商完整API端点
 * @param providerId 提供商ID
 * @param baseUrl 基础URL
 * @returns 完整的API端点URL
 */
export function getProviderEndpoint(providerId: string, baseUrl: string): string {
  // 确保baseUrl不为空
  if (!baseUrl) {
    throw new Error(`提供商 ${providerId} 的baseUrl为空`);
  }
  
  // 如果baseUrl已经包含完整路径，直接返回
  if (baseUrl.includes('/chat/completions') || 
      baseUrl.includes('/services/aigc/text-generation/generation')) {
    return baseUrl;
  }
  
  // 补全各提供商的端点
  switch (providerId.toLowerCase()) {
    case 'openai':
      return baseUrl.endsWith('/v1') 
        ? `${baseUrl}/chat/completions` 
        : `${baseUrl}/v1/chat/completions`;
    case 'deepseek':
      return baseUrl.endsWith('/v1') 
        ? `${baseUrl}/chat/completions` 
        : `${baseUrl}/v1/chat/completions`;
    case 'baichuan':
      return baseUrl.endsWith('/v1') 
        ? `${baseUrl}/chat/completions` 
        : `${baseUrl}/v1/chat/completions`;
    case 'qwen':
      return baseUrl.endsWith('/v1') 
        ? `${baseUrl}/services/aigc/text-generation/generation` 
        : `${baseUrl}/api/v1/services/aigc/text-generation/generation`;
    default:
      // 默认尝试补全为OpenAI格式
      return baseUrl.endsWith('/v1') 
        ? `${baseUrl}/chat/completions` 
        : `${baseUrl}/v1/chat/completions`;
  }
} 