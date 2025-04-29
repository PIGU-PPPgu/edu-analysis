import { KnowledgePoint } from "@/types/homework";
import { env } from "@/env";
import OpenAI from 'openai';
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import axios, { AxiosRequestConfig } from 'axios'; // 引入axios用于通用API调用
import { EnhancedAIClient } from './enhancedAIClient';
import { getAllProviders, getProviderConfig, getProviderEndpoint } from './aiProviderManager';
import { AIProviderConfig, AIRequestOptions } from '../types/ai';
import { getProviderById, getModelInfo, getModelsByProviderId } from './providers';
import { AIAnalysisResult } from '../types/analysis';
import { logError, logInfo } from '../utils/logger';
import { supabase } from '@/integrations/supabase/client';

// 根据环境变量决定是否使用模拟AI
const USE_MOCK_AI = env.NEXT_PUBLIC_USE_MOCK_AI === 'true';

// 使用Supabase代理请求的开关
const USE_SUPABASE_PROXY = false; // 设置为false直接发送请求，设置为true通过Supabase代理

// 使用硅基流动API，添加硬编码的API密钥（通常应该通过环境变量或安全方式存储）
const SBJT_API_KEY = 'sk-kpibphayuoyyzkkrhnljayyjbrgkazwfrzonqxegfghntxzb';
// 直接使用硅基流动
const FORCE_USE_SBJT = false;

/**
 * 多模态消息内容项类型 (Consider moving to types.ts)
 */
interface ContentItem extends LocalContentItem {}

/**
 * 消息类型，可以是字符串或内容项数组 (Consider moving to types.ts)
 */
interface Message extends LocalMessage {}

// 通用AI客户端类 - 移除了OpenAI & Doubao 特定逻辑
export class GenericAIClient implements LocalIAiClient { // Implement the shared interface
  private baseUrl: string;
  private apiKey: string;
  private modelId: string;
  private providerId: string;
  private providerConfig: AIProviderConfig; // Store the full config

  constructor(config: AIProviderConfig & { apiKey: string }) { // Ensure apiKey is always passed
    // Validate required config properties
    if (!config.providerId || !config.modelId || !config.apiKey) {
       throw new Error(`GenericAIClient requires providerId, modelId, and apiKey.`);
     }
    this.providerConfig = config;
    this.baseUrl = config.baseUrl || '';
    this.apiKey = config.apiKey; // Use passed apiKey
    this.modelId = config.modelId;
    this.providerId = config.providerId;
    logInfo('GenericAIClient initialized', { providerId: this.providerId, modelId: this.modelId, baseUrl: this.baseUrl || 'N/A' });
  }

  // 格式化请求，根据不同提供商调整 - 移除了 OpenAI & Doubao case
  private formatRequestByProvider(messages: Message[], options: AIRequestOptions = {}) {
    const provider = getProviderById(this.providerId);
    if (!provider) {
      throw new Error(`未找到提供商: ${this.providerId}`);
    }

    const modelInfo = getModelInfo(this.providerId, this.modelId);
    if (!modelInfo) {
      throw new Error(`未找到模型: ${this.modelId} (提供商: ${this.providerId})`);
    }

    // 默认请求选项
    const defaultOptions: AIRequestOptions = {
      temperature: 0.7,
      maxTokens: modelInfo.maxTokens || 2000,
      stream: false,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0
    };
    const mergedOptions = { ...defaultOptions, ...options };

    const hasMultimodalContent = messages.some(msg =>
      typeof msg.content !== 'string' && Array.isArray(msg.content)
    );
    if (hasMultimodalContent) {
      logInfo('发送包含多模态内容的消息', { providerId: this.providerId, modelId: this.modelId });
    }

    // 根据提供商格式化请求
    switch (this.providerId) {
      case 'sbjt':
        logInfo('使用硅基流动API格式化请求', {
          modelId: this.modelId,
          hasMultimodal: hasMultimodalContent
        });
        const isVisionModel = this.modelId.includes('VL') ||
                              this.modelId.includes('vl') ||
                              this.modelId.includes('deepseek-vl');
        if (isVisionModel) {
          logInfo('使用硅基流动视觉模型', { modelId: this.modelId });
          return { model: this.modelId, messages, stream: Boolean(mergedOptions.stream), max_tokens: mergedOptions.maxTokens || 512, temperature: mergedOptions.temperature || 0.7, top_p: 0.7, top_k: 50, frequency_penalty: 0.5, n: 1 };
        } else {
          return { model: this.modelId, messages, stream: Boolean(mergedOptions.stream), max_tokens: mergedOptions.maxTokens || 512, temperature: mergedOptions.temperature || 0.7, top_p: 0.7, top_k: 50, frequency_penalty: 0.5, n: 1, stop: [] };
        }
      case 'deepseek':
        return { model: this.modelId, messages, temperature: mergedOptions.temperature, max_tokens: mergedOptions.maxTokens, stream: mergedOptions.stream, top_p: mergedOptions.topP };
      case 'baichuan':
        if (hasMultimodalContent) throw new Error('百川API不支持多模态内容');
        return { model: this.modelId, messages, temperature: mergedOptions.temperature, max_tokens: mergedOptions.maxTokens, stream: mergedOptions.stream, top_p: mergedOptions.topP };
      case 'qwen':
        if (hasMultimodalContent) throw new Error('千问API需要特殊格式处理多模态内容，当前未实现');
        return { model: this.modelId, input: { messages }, parameters: { temperature: mergedOptions.temperature, max_tokens: mergedOptions.maxTokens, top_p: mergedOptions.topP, result_format: 'message' } };
      default:
        logError('Unsupported provider in GenericAIClient formatRequestByProvider', { providerId: this.providerId });
        console.warn(`Provider ${this.providerId} not explicitly handled in formatRequestByProvider. Using basic structure.`);
         return {
           model: this.modelId,
           messages,
           temperature: mergedOptions.temperature,
           max_tokens: mergedOptions.maxTokens,
           stream: mergedOptions.stream,
         };
    }
  }

  // 将各种API响应格式转换为OpenAI兼容格式 - 移除了 OpenAI & Doubao case
  private formatResponseToOpenAI(response: any) {
    try {
      logInfo('原始API响应:', JSON.stringify(response.data, null, 2));
      switch (this.providerId) {
        case 'sbjt':
          if (response.data && response.data.choices) { return response.data; }
          else if (response.data && response.data.response) { return { choices: [{ message: { content: response.data.response, role: 'assistant' }, finish_reason: 'stop' }] }; }
          throw new Error('无效的硅基流动API响应格式');
        case 'deepseek':
          return response.data;
        case 'baichuan':
          if (response.data && response.data.choices && response.data.choices[0]) { return response.data; }
          throw new Error('无效的百川API响应格式');
        case 'qwen':
          if (response.data && response.data.output && response.data.output.choices) {
            return { ...response.data, choices: response.data.output.choices };
          }
          throw new Error('无效的千问API响应格式');
        default:
          logError('Unsupported provider in formatResponseToOpenAI', { providerId: this.providerId });
          if (response.data && response.data.choices) {
            console.warn(`Provider ${this.providerId} not explicitly handled in formatResponseToOpenAI. Passing through response data.`);
            return response.data;
          }
          throw new Error(`无法格式化未知提供商 ${this.providerId} 的响应`);
      }
    } catch (error: any) {
      logError('格式化API响应时出错', { providerId: this.providerId, error: error.message });
      throw error;
    }
  }

  // 发送通用请求 - 无需修改，因为它依赖于 formatRequest 和 formatResponse
  async sendRequest(messages: Message[], options: AIRequestOptions = {}): Promise<any> {
    const endpoint = getProviderEndpoint(this.providerId, this.baseUrl);
    if (!endpoint) {
      throw new Error(`无法确定提供商 ${this.providerId} 的 API 端点`);
    }

    const requestData = this.formatRequestByProvider(messages, options);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
    };

    if (this.providerId === 'sbjt') {
       headers['Authorization'] = `Bearer ${SBJT_API_KEY}`;
       logInfo('Using hardcoded SBJT API Key for request.');
     }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: endpoint,
      headers: headers,
      data: requestData,
    };

    logInfo('发送通用 API 请求', { endpoint, providerId: this.providerId, modelId: this.modelId });

    try {
      const response = await axios(config);
      logInfo('收到通用 API 响应', { providerId: this.providerId, status: response.status });
      return this.formatResponseToOpenAI(response);
    } catch (error: any) {
      logError('通用 API 请求失败', {
        providerId: this.providerId,
        modelId: this.modelId,
        endpoint: endpoint,
        status: error.response?.status,
        error: error.message,
        responseData: error.response?.data
      });
      const errorMsg = error.response?.data?.error?.message || error.message || '未知 API 错误';
       const statusCode = error.response?.status;
       throw new Error(`API 请求失败 (${this.providerId} - ${statusCode || 'N/A'}): ${errorMsg}`);
    }
  }

   // Analyze content using the generic sendRequest method
   async analyzeContent(content: string, existingPoints?: KnowledgePoint[]): Promise<AIAnalysisResult> {
     logInfo(`Starting generic content analysis with ${this.providerId}`, { model: this.modelId });
     const systemPrompt = `Analyze the provided content and identify key knowledge points. Output JSON: { "knowledgePoints": [{ "name": "...", "description": "..." }], "analysisTime": "...", "confidence": "..." }`;
     const userMessages: Message[] = [{
       role: 'user',
       content: [{ type: 'text', text: `Content to analyze: ${content}` }]
     }];
      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        ...userMessages
      ];

     if (content.startsWith('data:image') || content.startsWith('http')) {
        logInfo('Image content detected for generic analysis.', { providerId: this.providerId });
         messages[1] = {
             role: 'user',
             content: [
                 { type: 'image_url', image_url: { url: content } },
                 { type: 'text', text: 'Analyze the key knowledge points in this image.' }
             ]
         };
         logInfo('Formatted generic request for potential vision analysis.', { providerId: this.providerId });
     }

     try {
       const response = await this.sendRequest(messages, { maxTokens: 1500 });
       const analysisResultText = response.choices?.[0]?.message?.content;
       if (!analysisResultText) {
         throw new Error(`Generic AI response for ${this.providerId} did not contain expected content.`);
       }
       logInfo(`Received raw analysis from ${this.providerId}`, { text: analysisResultText });
       try {
         const parsedResult = JSON.parse(analysisResultText);
         if (!parsedResult.knowledgePoints || !Array.isArray(parsedResult.knowledgePoints)) {
           throw new Error("Invalid JSON structure: missing 'knowledgePoints' array.");
         }
         const finalResult: AIAnalysisResult = {
           knowledgePoints: parsedResult.knowledgePoints.map((kp: any) => ({
             name: kp.name || 'Unknown Point',
             description: kp.description || 'No description provided.'
           })),
           analysisTime: parsedResult.analysisTime || new Date().toISOString(),
           confidence: parsedResult.confidence || 'medium',
         };
         logInfo(`Successfully parsed ${this.providerId} analysis result`, { finalResult });
         return finalResult;
       } catch (parseError: any) {
         logError(`Failed to parse JSON response from ${this.providerId}`, { error: parseError.message, rawResponse: analysisResultText });
         return {
           knowledgePoints: [{ name: "Parsing Error", description: `Could not parse response: ${analysisResultText}` }],
           analysisTime: new Date().toISOString(),
           confidence: 'low',
         };
       }
     } catch (error: any) {
       logError(`Error during generic content analysis with ${this.providerId}`, { error: error.message });
       return {
         knowledgePoints: [],
         analysisTime: new Date().toISOString(),
         confidence: 'low',
         error: `Analysis failed: ${error.message}`,
       };
     }
   }

   // Placeholder for chat method if needed in generic client
    async chat?(messages: Message[], options?: AIRequestOptions): Promise<string> {
        logInfo(`GenericAIClient chat called for ${this.providerId}`);
         const response = await this.sendRequest(messages, options);
         const content = response.choices?.[0]?.message?.content;
         if (typeof content !== 'string') {
             throw new Error('Expected string content from chat response');
         }
         return content;
     }
}

// Updated getAIClient function
export async function getAIClient(provider?: string, modelId?: string, debugMode = false): Promise<LocalIAiClient> {
  logInfo('Getting AI Client...', { provider, modelId, debugMode });

  const aiConfig = await getUserAIConfig();
  const effectiveProviderId = provider || aiConfig?.provider || 'openai';
  const effectiveModelId = modelId || aiConfig?.version || getDefaultModelForProvider(effectiveProviderId);

  logInfo('Effective AI Client params', { effectiveProviderId, effectiveModelId });


  if (!aiConfig?.enabled && !debugMode) {
    logError('AI Service is not enabled and not in debug mode.', { provider: effectiveProviderId });
    throw new Error('AI 服务未启用。请在设置中启用。');
  }

   const apiKey = await getUserAPIKey(effectiveProviderId);
   if (!apiKey && effectiveProviderId !== 'sbjt') {
       logError('API key not found for provider', { provider: effectiveProviderId });
       throw new Error(`未找到 ${effectiveProviderId} 的 API 密钥。请先配置。`);
     }

   const providerConfig = getProviderConfig(effectiveProviderId);
   if (!providerConfig) {
       logError('Could not find provider configuration', { providerId: effectiveProviderId });
       throw new Error(`未找到提供商 ${effectiveProviderId} 的配置信息。`);
     }


  // --- Refactoring Step: Use specific client factories ---
  if (effectiveProviderId === 'openai') {
    logInfo('Creating OpenAIClient via factory');
    try {
         return await createOpenAIClient(effectiveModelId, providerConfig.baseUrl);
    } catch (error) {
         logError('Failed to create OpenAIClient', { error });
         throw error;
       }
  }
  else if (effectiveProviderId === 'doubao') { // Added Doubao check
     logInfo('Creating DoubaoClient via factory');
     try {
       // Doubao factory only needs modelId, baseUrl comes from its own config lookup
       return await createDoubaoClient(effectiveModelId);
     } catch (error) {
       logError('Failed to create DoubaoClient', { error });
       throw error;
     }
   }
  // --- End Refactoring Step ---

  // For other providers, use GenericAIClient
  logInfo(`Creating GenericAIClient for provider: ${effectiveProviderId}`);
   if (!apiKey) {
       throw new Error(`API key for ${effectiveProviderId} is missing for GenericAIClient initialization.`);
   }
  const clientConfig: AIProviderConfig & { apiKey: string } = {
    ...providerConfig,
    providerId: effectiveProviderId,
    modelId: effectiveModelId,
    apiKey: apiKey,
  };

  try {
     const genericClient = new GenericAIClient(clientConfig);
     return genericClient;
  } catch (error: any) {
     logError('Failed to create GenericAIClient', { provider: effectiveProviderId, error: error.message });
     throw new Error(`创建 ${effectiveProviderId} 客户端时出错: ${error.message}`);
   }
}

// Helper to get a default model if none is specified
function getDefaultModelForProvider(providerId: string): string {
    const models = getModelsByProviderId(providerId);
    // Prefer vision models if available, otherwise take the first one
    const visionModel = models.find(m => m.id.includes('vision') || m.id.includes('vl') || m.id.includes('gpt-4o'));
    if (visionModel) return visionModel.id;
    return models[0]?.id || 'default-model'; // Fallback
}

/**
 * 检查内容是否为图片URL或base64图片
 * @param content 要检查的内容
 * @returns 是否为图片URL或base64图片
 */
function isImageUrl(content: string): boolean {
  // 检查是否为URL格式且包含常见图片扩展名
  const isHttpUrl = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(content);
  
  // 检查是否为base64编码的图片
  const isBase64Image = content.startsWith('data:image/');
  
  return isHttpUrl || isBase64Image;
}

/**
 * 使用指定模型分析作业内容
 * @param providerId 提供商ID
 * @param modelId 模型ID
 * @param content 作业内容
 * @param existingPoints 已有知识点
 * @returns 分析结果
 */
export async function analyzeWithModel(
  providerId: string,
  modelId: string,
  content: string,
  existingPoints: KnowledgePoint[] = []
): Promise<AIAnalysisResult> {
  logInfo('Initiating single model analysis', { providerId, modelId });

  // Validate if provider and model exist (optional, getAIClient might handle this)
   const providerInfo = getProviderById(providerId);
   const modelInfo = getModelInfo(providerId, modelId);
   if (!providerInfo || !modelInfo) {
     logError('Invalid provider or model ID for analysis', { providerId, modelId });
     throw new Error(`无效的提供商 (${providerId}) 或模型 (${modelId})`);
   }

  try {
    // Get the appropriate client (OpenAIClient or GenericAIClient)
    const client = await getAIClient(providerId, modelId, true); // Use debugMode=true if needed for testing

    // Call the analyzeContent method on the client instance
    // This method is now part of the IAiClient interface
    const result = await client.analyzeContent(content, existingPoints);

    logInfo('Analysis completed successfully', { providerId, modelId });
    return result;

  } catch (error: any) {
    logError('Analysis with model failed', {
      providerId,
      modelId,
      error: error.message,
      // stack: error.stack // Optional: include stack trace for debugging
    });
    // Return a structured error response
    return {
      knowledgePoints: [],
      analysisTime: new Date().toISOString(),
      confidence: 'low',
      error: `模型分析失败 (${providerId} - ${modelId}): ${error.message}`,
    };
  }
}

/**
 * 级联分析作业内容，先用千问处理图片，再用DeepSeek深入分析
 * @param content 作业内容
 * @param existingPoints 已有知识点
 * @returns 分析结果
 */
export async function cascadeAnalyzeContent(
  content: string,
  existingPoints: KnowledgePoint[] = []
): Promise<AIAnalysisResult> {
  try {
    // 检查内容是否为图片
    const isImage = isImageUrl(content);
    if (!isImage) {
      // 如果不是图片，直接使用DeepSeek分析
      logInfo('内容非图片，直接使用DeepSeek分析');
      return analyzeWithModel('Pro/deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-V3', content, existingPoints);
    }
    
    // 使用模拟AI时直接返回模拟结果
    if (USE_MOCK_AI) {
      logInfo('使用模拟AI分析');
      return getMockAnalysisResult(content, existingPoints);
    }
    
    // 第一步：使用千问分析图片
    logInfo('开始第一步：使用千问模型处理图片内容');
    const qwenResult = await analyzeWithModel('Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen/Qwen2.5-VL-72B-Instruct', content, existingPoints);
    
    // 提取千问的分析结果
    const extractedText = qwenResult.knowledgePoints
      .map(kp => `- ${kp.name}：${kp.description}（重要性：${kp.importance}，掌握程度：${kp.masteryLevel}）`)
      .join('\n');
    
    // 第二步：将千问结果传给DeepSeek进行深入分析
    logInfo('开始第二步：将千问结果传递给DeepSeek进行深入分析');
    const deepseekPrompt = `
千问模型从图片中提取的信息：

${extractedText}

请基于上述千问模型提取的信息，进行更深入的知识点分析，补充完善知识点描述，并对重要性和掌握程度进行更准确的评估。
`;
    
    return analyzeWithModel('Pro/deepseek-ai/DeepSeek-V3', 'Pro/deepseek-ai/DeepSeek-V3', deepseekPrompt, existingPoints);
  } catch (error) {
    logError('级联分析过程出错:', error);
    
    // 如果是开发环境，返回模拟数据
    if (process.env.NODE_ENV === 'development') {
      logInfo('级联分析错误，返回模拟结果');
      return getMockAnalysisResult(content, existingPoints);
    }
    
    throw error;
  }
}

/**
 * 分析作业内容，识别知识点
 * @param content 作业内容
 * @param existingPoints 已有的知识点（可选）
 * @returns 分析结果
 */
export async function analyzeHomeworkContent(
  content: string,
  existingPoints: KnowledgePoint[] = []
): Promise<AIAnalysisResult> {
  try {
    // 使用模拟AI时直接返回模拟结果
    if (USE_MOCK_AI) {
      logInfo('使用模拟AI分析');
      return getMockAnalysisResult(content, existingPoints);
    }
    
    // 使用级联分析方法
    logInfo('使用级联分析方法');
    return cascadeAnalyzeContent(content, existingPoints);
  } catch (error) {
    logError('知识点分析出错:', error);
    
    // 如果是开发环境，返回模拟数据
    if (process.env.NODE_ENV === 'development') {
      logInfo('因错误返回模拟结果');
      return getMockAnalysisResult(content, existingPoints);
    }
    
    throw error; // 将错误向上传递
  }
}

/**
 * 生成模拟的AI分析结果
 * @param content 作业内容
 * @param existingPoints 已有的知识点
 * @returns 模拟的分析结果
 */
function getMockAnalysisResult(content: string, existingPoints: KnowledgePoint[] = []): AIAnalysisResult {
  // 创建一些模拟知识点
  const baseKnowledgePoints = [
    {
      name: "数学公式应用",
      description: "在实际问题中应用数学公式进行计算",
      importance: 4,
      masteryLevel: 3,
      confidence: 95,
      isNew: true
    },
    {
      name: "逻辑推理能力",
      description: "使用逻辑思维分析问题并得出结论",
      importance: 5,
      masteryLevel: 4,
      confidence: 92,
      isNew: true
    },
    {
      name: "英语语法规则",
      description: "正确使用英语语法结构和时态",
      importance: 4,
      masteryLevel: 3,
      confidence: 90,
      isNew: true
    },
    {
      name: "科学概念理解",
      description: "理解和应用基本科学概念解释现象",
      importance: 3,
      masteryLevel: 3,
      confidence: 88,
      isNew: true
    },
    {
      name: "历史事件分析",
      description: "分析历史事件及其影响和意义",
      importance: 3,
      masteryLevel: 2,
      confidence: 85,
      isNew: true
    }
  ];
  
  // 根据输入内容添加一些更相关的模拟知识点
  const contentBasedPoints = [];
  
  if (content.includes("数学") || content.includes("计算") || content.includes("函数")) {
    contentBasedPoints.push({
      name: "数学函数应用",
      description: "理解并正确应用数学函数解题",
      importance: 5,
      masteryLevel: 4,
      confidence: 96,
      isNew: true
    });
  }
  
  if (content.includes("英语") || content.includes("语法") || content.includes("单词")) {
    contentBasedPoints.push({
      name: "英语词汇量",
      description: "掌握并正确使用英语词汇",
      importance: 4,
      masteryLevel: 3,
      confidence: 93,
      isNew: true
    });
  }
  
  if (content.includes("物理") || content.includes("化学") || content.includes("实验")) {
    contentBasedPoints.push({
      name: "科学实验分析",
      description: "设计和分析科学实验过程与结果",
      importance: 4,
      masteryLevel: 3,
      confidence: 91,
      isNew: true
    });
  }
  
  if (content.includes("历史") || content.includes("政治") || content.includes("社会")) {
    contentBasedPoints.push({
      name: "史料解读能力",
      description: "解读历史文献和资料，理解背景与意义",
      importance: 4,
      masteryLevel: 3,
      confidence: 89,
      isNew: true
    });
  }
  
  // 将现有知识点标记为非新知识点
  const existingKnowledgePoints = existingPoints.map(point => ({
    name: point.name,
    description: point.description || `关于${point.name}的知识点`,
    importance: Math.floor(Math.random() * 3) + 3, // 随机 3-5
    masteryLevel: Math.floor(Math.random() * 3) + 2, // 随机 2-4
    confidence: Math.floor(Math.random() * 10) + 85, // 随机 85-95%
    isNew: false
  }));
  
  // 合并所有知识点，优先使用内容相关的，然后是现有的，最后是基础的
  // 限制总数为10个以内
  const allPoints = [
    ...contentBasedPoints,
    ...existingKnowledgePoints,
    ...baseKnowledgePoints
  ].slice(0, 10);
  
  // 返回模拟结果
  return {
    knowledgePoints: allPoints,
    analysisTime: 1234, // 模拟分析时间(毫秒)
    confidence: 85,
    providerInfo: {
      provider: 'mock',
      model: 'mock-model-v1'
    }
  };
}

/**
 * 获取可用的AI模型列表
 * @param providerId 提供商ID
 * @returns 模型列表
 */
export function getAvailableModels(providerId?: string) {
  try {
    if (!providerId) return [];
    
    // 获取所有提供商
    const allProviders = getAllProviders();
    const provider = allProviders[providerId];
    
    if (!provider || !provider.models || !Array.isArray(provider.models)) {
      return [];
    }
    
    // 安全地返回模型列表
    return provider.models.map(model => ({
      id: model.id || '',
      name: model.name || '未命名模型'
    }));
  } catch (error) {
    logError('获取模型列表出错:', error);
    return [];
  }
} 