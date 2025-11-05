// AI模型和提供商配置的类型定义

/**
 * AI模型信息接口
 */
export interface ModelInfo {
  id: string; // 模型ID
  name: string; // 显示名称
  maxTokens: number; // 最大token数量
  contextWindow?: number; // 上下文窗口大小
  supportStream: boolean; // 是否支持流式输出
  description?: string; // 描述
}

/**
 * AI提供商配置接口
 */
export interface AIProvider {
  id: string; // 提供商ID
  name: string; // 显示名称
  logoUrl?: string; // 标志URL
  baseUrl: string; // API基础URL
  models: ModelInfo[]; // 支持的模型列表
  requiresApiKey: boolean; // 是否需要API密钥
  description?: string; // 描述
}

/**
 * 用户AI配置接口
 */
export interface UserAIConfig {
  /**
   * AI 服务提供商，例如 "openai", "doubao", "glm" 等
   */
  provider: string;

  /**
   * 模型版本，例如 "gpt-3.5-turbo", "doubao-1-5" 等
   * @deprecated 推荐使用 model 字段
   */
  version: string;

  /**
   * 使用的模型ID，例如 "gpt-3.5-turbo"
   */
  model?: string;

  /**
   * AI 功能是否启用
   */
  enabled: boolean;

  /**
   * 自定义设置
   */
  customSettings: {
    /**
     * 调试模式
     */
    debugMode?: boolean;

    /**
     * 其他自定义设置
     */
    [key: string]: any;
  };

  /**
   * 配置最后更新时间
   */
  lastUpdated: string;
}

export interface AIProviderConfig {
  providerId: string; // 提供商ID
  apiKey?: string; // API密钥
  modelId: string; // 模型ID
  baseUrl?: string; // API基础URL
}

export interface AIRequestOptions {
  temperature?: number; // 温度
  maxTokens?: number; // 最大token数量
  stream?: boolean; // 是否流式输出
  topP?: number; // 顶部概率
  frequencyPenalty?: number; // 频率惩罚
  presencePenalty?: number; // 存在惩罚
}

/**
 * 提供商配置接口
 * 用于配置不同AI提供商的API接口
 */
export interface ProviderConfig {
  id: string; // 提供商ID
  name: string; // 提供商名称
  baseUrl: string; // API基础URL
  authType?: "bearer" | "header" | "param"; // 认证类型
  authKey?: string; // 认证键名
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

/**
 * AI 分析结果接口
 */
export interface AIAnalysisResult {
  /**
   * 分析内容
   */
  content: string;

  /**
   * 生成时间
   */
  generatedAt: string;

  /**
   * 所用模型
   */
  model: string;

  /**
   * 元数据
   */
  metadata?: {
    /**
     * 标签
     */
    tags?: string[];

    /**
     * 分析级别
     */
    level?: string;

    /**
     * 其他元数据
     */
    [key: string]: any;
  };
}

/**
 * AI 请求参数接口
 */
export interface AIRequestParams {
  /**
   * 提供商
   */
  provider: string;

  /**
   * 模型版本
   */
  model: string;

  /**
   * API 密钥
   */
  apiKey: string;

  /**
   * 系统提示语
   */
  systemPrompt?: string;

  /**
   * 用户输入
   */
  userInput: string;

  /**
   * 温度
   */
  temperature?: number;

  /**
   * 最大生成 token 数
   */
  maxTokens?: number;

  /**
   * 其他参数
   */
  [key: string]: any;
}

/**
 * AI 分析服务接口
 */
export interface AIAnalysisService {
  /**
   * 执行学生预警分析
   */
  analyzeStudentWarnings(data: any): Promise<AIAnalysisResult>;

  /**
   * 执行成绩分析
   */
  analyzeGrades(data: any): Promise<AIAnalysisResult>;

  /**
   * 执行学生画像生成
   */
  generateStudentProfile(data: any): Promise<AIAnalysisResult>;

  /**
   * 测试连接
   */
  testConnection(params: AIRequestParams): Promise<boolean>;
}
