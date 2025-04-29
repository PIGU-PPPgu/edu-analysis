// AI模型和提供商配置的类型定义

/**
 * AI模型信息接口
 */
export interface ModelInfo {
  id: string;                     // 模型ID
  name: string;                   // 显示名称
  maxTokens: number;              // 最大token数量
  contextWindow?: number;          // 上下文窗口大小
  supportStream: boolean;          // 是否支持流式输出
  description?: string;           // 描述
}

/**
 * AI提供商配置接口
 */
export interface AIProvider {
  id: string;                     // 提供商ID
  name: string;                   // 显示名称
  logoUrl?: string;               // 标志URL
  baseUrl: string;                // API基础URL
  models: ModelInfo[];            // 支持的模型列表
  requiresApiKey: boolean;         // 是否需要API密钥
  description?: string;           // 描述
}

/**
 * 用户AI配置接口
 */
export interface UserAIConfig {
  provider: string;               // 选择的提供商
  version?: string;               // 选择的模型版本
  enabled: boolean;               // 是否启用AI
  customSettings?: Record<string, any>; // 自定义设置
  customProviders?: string;        // 自定义提供商列表（JSON字符串）
  lastUpdated?: string;           // 最后更新时间
}

export interface AIProviderConfig {
  providerId: string;             // 提供商ID
  apiKey?: string;                // API密钥
  modelId: string;                 // 模型ID
  baseUrl?: string;                // API基础URL
}

export interface AIRequestOptions {
  temperature?: number;           // 温度
  maxTokens?: number;             // 最大token数量
  stream?: boolean;               // 是否流式输出
  topP?: number;                   // 顶部概率
  frequencyPenalty?: number;       // 频率惩罚
  presencePenalty?: number;         // 存在惩罚
}

/**
 * 提供商配置接口
 * 用于配置不同AI提供商的API接口
 */
export interface ProviderConfig {
  id: string;                      // 提供商ID
  name: string;                    // 提供商名称
  baseUrl: string;                 // API基础URL
  authType?: 'bearer' | 'header' | 'param'; // 认证类型
  authKey?: string;                // 认证键名
  models: Array<{
    id: string;
    name: string;
    maxTokens?: number;
    contextWindow?: number;
    supportStream?: boolean;
    endpointPath?: string; // 添加可选的特定端点路径
  }>;
  // 请求格式化函数
  requestFormat: (params: any, model: string) => any;
  // 响应格式化函数
  responseFormat: (response: any) => any;
} 