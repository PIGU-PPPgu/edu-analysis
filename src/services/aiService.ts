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

// 根据环境变量决定是否使用模拟AI
const USE_MOCK_AI = env.NEXT_PUBLIC_USE_MOCK_AI === 'true';

// 通用AI客户端类
export class GenericAIClient {
  private baseUrl: string;
  private apiKey: string;
  private modelId: string;
  private providerId: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || '';
    this.apiKey = config.apiKey || '';
    this.modelId = config.modelId || '';
    this.providerId = config.providerId || '';
  }

  // 格式化请求，根据不同提供商调整
  private formatRequestByProvider(messages: any[], options: AIRequestOptions = {}) {
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

    // 合并默认选项和传入的选项
    const mergedOptions = { ...defaultOptions, ...options };

    // 根据提供商格式化请求
    switch (this.providerId) {
      case 'openai':
        return {
          model: this.modelId,
          messages,
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          stream: mergedOptions.stream,
          top_p: mergedOptions.topP,
          frequency_penalty: mergedOptions.frequencyPenalty,
          presence_penalty: mergedOptions.presencePenalty
        };
      case 'deepseek':
        return {
          model: this.modelId,
          messages,
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          stream: mergedOptions.stream,
          top_p: mergedOptions.topP
        };
      case 'baichuan':
        return {
          model: this.modelId,
          messages,
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          stream: mergedOptions.stream,
          top_p: mergedOptions.topP
        };
      case 'qwen':
        return {
          model: this.modelId,
          input: {
            messages
          },
          parameters: {
            temperature: mergedOptions.temperature,
            max_tokens: mergedOptions.maxTokens,
            top_p: mergedOptions.topP,
            result_format: 'message'
          }
        };
      default:
        // 默认尝试OpenAI格式
        return {
          model: this.modelId,
          messages,
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          stream: mergedOptions.stream
        };
    }
  }

  // 将各种API响应格式转换为OpenAI兼容格式
  private formatResponseToOpenAI(response: any) {
    try {
      // 记录原始API响应以便调试
      logInfo('原始API响应:', JSON.stringify(response.data, null, 2));

      // 根据提供商格式化响应
      switch (this.providerId) {
        case 'openai':
          return response.data;
        case 'deepseek':
          return response.data;
        case 'baichuan':
          if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data;
          }
          throw new Error('无效的百川API响应格式');
        case 'qwen':
          if (response.data && response.data.output && response.data.output.choices) {
            // 将千问响应格式转换为OpenAI格式
            return {
              choices: [{
                message: response.data.output.choices[0].message,
                finish_reason: response.data.output.choices[0].finish_reason
              }]
            };
          }
          throw new Error('无效的千问API响应格式');
        default:
          // 尝试从多种可能的响应格式中提取内容
          if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data;
          } else if (response.data && response.data.output) {
            return {
              choices: [{
                message: { content: response.data.output },
                finish_reason: 'stop'
              }]
            };
          } else if (response.data && response.data.response) {
            return {
              choices: [{
                message: { content: response.data.response },
                finish_reason: 'stop'
              }]
            };
          }
          throw new Error('无法识别的API响应格式');
      }
    } catch (error) {
      logError('格式化API响应出错:', error);
      // 返回标准格式，表示格式化失败
      return {
        choices: [{
          message: { content: '处理API响应时出错' },
          finish_reason: 'error'
        }]
      };
    }
  }

  // 发送请求到AI服务
  async sendRequest(messages: any[], options: AIRequestOptions = {}) {
    try {
      const requestData = this.formatRequestByProvider(messages, options);
      
      const axiosConfig: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      // 根据千问的特殊需求调整授权头
      if (this.providerId === 'qwen') {
        axiosConfig.headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        };
      }

      logInfo(`发送请求到 ${this.providerId} API:`, {
        baseUrl: this.baseUrl,
        providerId: this.providerId,
        modelId: this.modelId
      });
      
      const response = await axios.post(this.baseUrl, requestData, axiosConfig);
      
      return this.formatResponseToOpenAI(response);
    } catch (error: any) {
      logError(`${this.providerId} API 请求错误:`, error);
      
      // 提取并记录详细错误信息
      if (error.response) {
        logError('API错误响应:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      throw new Error(`AI请求失败: ${error.message}`);
    }
  }
}

/**
 * 获取AI客户端
 * @param provider 提供商ID (可选)
 * @param modelId 模型ID (可选)
 * @param debugMode 是否启用调试模式
 * @returns API客户端或null
 */
export async function getAIClient(provider?: string, modelId?: string, debugMode = false) {
  try {
    // 获取用户配置和API密钥
    const aiConfig = await getUserAIConfig();
    const apiKey = await getUserAPIKey();
    
    // 日志输出配置信息
    logInfo('AI配置:', JSON.stringify({
      configExists: !!aiConfig,
      configEnabled: aiConfig?.enabled,
      provider: provider || aiConfig?.provider,
      apiKeyExists: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      debugMode: debugMode || aiConfig?.customSettings?.debugMode
    }));
    
    // 如果没有API密钥，返回null
    if (!apiKey || apiKey.trim() === '') {
      logError('AI服务缺少API密钥，无法初始化客户端', {
        aiConfig: JSON.stringify(aiConfig),
        storedApiKey: apiKey ? '已设置(长度: ' + apiKey.length + ')' : '未设置'
      });
      return null;
    }

    // 如果AI未启用，返回null
    if (aiConfig && aiConfig.enabled === false) {
      logError('AI服务已被用户禁用，使用模拟数据');
      return null;
    }
    
    // 使用指定提供商或配置中的提供商，默认为'openai'
    const providerId = provider || (aiConfig?.provider || 'openai');
    const selectedModelId = modelId || aiConfig?.version;
    
    // 使用用户设置的调试模式，如果没有指定参数
    const useDebugMode = debugMode || (aiConfig?.customSettings?.debugMode || false);
    
    // 获取提供商配置
    let providerConfig;
    
    // 处理硅基流动提供商 (使用DeepSeek的API)
    if (providerId === 'sbjt') {
      providerConfig = getProviderConfig('deepseek');
      if (!providerConfig) {
        logError('硅基流动依赖DeepSeek提供商配置，但无法找到', {
          providerId: 'sbjt',
          baseProvider: 'deepseek'
        });
        // 使用DeepSeek的配置
        providerConfig = {
          id: 'deepseek',
          name: 'DeepSeek',
          baseUrl: 'https://api.deepseek.com/v1',
          models: [{ id: selectedModelId || 'deepseek-chat' }]
        };
      }
      
      logInfo('使用硅基流动模型 (通过DeepSeek API):', {
        providerId: 'sbjt',
        modelId: selectedModelId,
        baseProvider: 'deepseek'
      });
    }
    // 处理自定义提供商
    else if (providerId.startsWith('custom-')) {
      // 从用户配置中查找自定义提供商
      const customProviders = aiConfig?.customProviders
        ? JSON.parse(aiConfig.customProviders)
        : [];
      
      const customProvider = customProviders.find((p: any) => p.id === providerId);
      if (!customProvider) {
        logError(`未找到自定义提供商配置: ${providerId}`);
        throw new Error(`未找到自定义提供商配置: ${providerId}`);
      }
      
      // 创建提供商配置
      providerConfig = {
        id: providerId,
        name: customProvider.name,
        baseUrl: customProvider.endpoint,
        models: [{ id: 'default-model' }]
      };
      
      logInfo('使用自定义提供商:', {
        providerId,
        endpoint: customProvider.endpoint
      });
    }
    // 常规提供商
    else {
      providerConfig = getProviderConfig(providerId);
      if (!providerConfig) {
        logError(`不支持的AI提供商: ${providerId}`, {
          availableProviders: Object.keys(getAllProviders())
        });
        throw new Error(`不支持的AI提供商: ${providerId}`);
      }
    }
    
    // 获取基础URL
    const baseUrl = providerConfig.baseUrl;
    
    logInfo('使用AI提供商:', {
      providerId,
      baseUrl,
      selectedModelId
    });
    
    // 对于OpenAI使用原生客户端
    if (providerId.toLowerCase() === 'openai') {
      logInfo('使用OpenAI原生客户端');
      const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl || 'https://api.openai.com/v1'
      });
      
      // 测试连接是否可用
      try {
        // 非常简短的测试请求
        const testResponse = await client.chat.completions.create({
          model: selectedModelId || 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: 'Hello' }],
          max_tokens: 5
        });
        
        if (testResponse) {
          logInfo('OpenAI连接测试成功');
        }
      } catch (testError) {
        logError('OpenAI连接测试失败:', testError);
        // 不抛出错误，继续使用此客户端
      }
      
      return client;
    }
    
    // 对于其他提供商，使用通用客户端
    // 使用getProviderEndpoint获取完整的API端点
    const apiEndpoint = getProviderEndpoint(
      // 对于硅基流动，使用deepseek端点处理
      providerId === 'sbjt' ? 'deepseek' : providerId, 
      baseUrl
    );
    logInfo(`${providerId} API endpoint: ${apiEndpoint}`);
    
    // 获取模型ID
    let modelToUse;
    if (providerId === 'sbjt') {
      // 硅基流动模型使用原始模型ID
      modelToUse = selectedModelId || 'sbjt-base';
    } else if (providerId.startsWith('custom-')) {
      // 自定义模型使用默认模型
      modelToUse = selectedModelId || 'default-model';
    } else {
      // 常规模型
      modelToUse = selectedModelId || providerConfig.models[0]?.id || '';
    }
    
    if (!modelToUse) {
      logError(`提供商 ${providerId} 没有可用的模型`);
      throw new Error(`提供商 ${providerId} 没有可用的模型`);
    }
    
    logInfo(`创建通用AI客户端: ${providerId}, 模型: ${modelToUse}, URL: ${apiEndpoint}`);
    
    const client = new GenericAIClient({
      providerId: providerId,
      apiKey: apiKey,
      modelId: modelToUse,
      baseUrl: apiEndpoint
    });
    
    logInfo('成功创建AI客户端');
    return client;
  } catch (error) {
    logError('获取AI客户端出错:', error);
    throw new Error(`无法获取AI客户端: ${error instanceof Error ? error.message : '未知错误'}`);
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
    // 记录函数开始调用
    logInfo('开始分析作业内容，长度:', content.length);
    logInfo('已有知识点数量:', existingPoints.length);
    
    // 如果开启了模拟AI，返回模拟数据
    if (USE_MOCK_AI) {
      logInfo('使用模拟AI分析');
      return getMockAnalysisResult(content, existingPoints);
    }
    
    // 获取AI客户端
    let client;
    try {
      client = await getAIClient();
    } catch (error) {
      logError('获取AI客户端失败:', error);
      throw new Error('无法获取AI客户端，请检查API密钥和AI配置');
    }
    
    if (!client) {
      logError('无法获取AI客户端，请检查API密钥和AI配置');
      // 在开发环境中返回模拟数据，生产环境抛出错误
      if (process.env.NODE_ENV === 'development') {
        logInfo('开发环境：返回模拟分析结果');
        return getMockAnalysisResult(content, existingPoints);
      }
      throw new Error('无法获取AI客户端，请检查API密钥和AI配置');
    }
    
    // 准备提示词
    const existingPointsText = existingPoints.length > 0
      ? existingPoints.map(p => `- ${p.name}`).join('\n')
      : '(无)';
    
    // 构造AI提示词
    const prompt = `
分析以下作业内容，识别出其中包含的知识点，并评估学生对这些知识点的掌握程度。

已知知识点列表（如果有）：
${existingPointsText}

作业内容：
${content}

请以JSON格式返回分析结果，包含以下字段：
- knowledgePoints: 知识点数组，每个知识点包含：
  - name: 知识点名称
  - description: 知识点描述（简要解释该知识点）
  - importance: 重要性(1-5，5表示最重要)
  - masteryLevel: 掌握程度(1-5，5表示完全掌握)
  - confidence: 识别置信度(0-100)
  - isNew: 是否为新发现的知识点(相对于已知知识点)

请对importance和masteryLevel使用1-5的评分标准：
1 = 非常低/基础/不熟练
2 = 低/初级/了解基础
3 = 中等/必要/基本掌握
4 = 高/重要/熟练
5 = 非常高/核心/精通

响应格式示例：
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点描述",
      "importance": 4,
      "masteryLevel": 3,
      "confidence": 95,
      "isNew": false
    }
  ]
}
    `;
    
    // 记录开始时间
    const startTime = Date.now();
    logInfo('开始发送AI请求...');
    
    // 发送请求给AI
    let response: any;
    
    try {
      if ('sendRequest' in client) {
        // 使用GenericAIClient
        const messages = [
          { role: 'system', content: '你是一个教育内容分析助手，擅长识别学习内容中的知识点并评估掌握情况。' },
          { role: 'user', content: prompt }
        ];
        response = await client.sendRequest(messages, {
          temperature: 0.5,
          maxTokens: 1500
        });
      } else {
        // 使用OpenAI客户端
        response = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '你是一个教育内容分析助手，擅长识别学习内容中的知识点并评估掌握情况。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 1500
        });
      }
      
      logInfo('AI响应成功，开始解析结果');
    } catch (error) {
      logError('AI请求失败:', error);
      throw new Error(`AI分析请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    // 计算分析时间
    const analysisTime = Date.now() - startTime;
    
    // 解析AI响应
    const responseText = response.choices[0]?.message?.content || '';
    
    try {
      // 提取JSON部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logError('无法从AI响应中提取JSON:', responseText);
        throw new Error('AI返回的结果格式无效（无法提取JSON）');
      }
      
      const jsonStr = jsonMatch[0];
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (jsonError) {
        logError('JSON解析失败:', jsonError);
        logError('原始JSON字符串:', jsonStr);
        throw new Error('无法解析AI返回的JSON数据');
      }
      
      // 验证并处理结果
      if (!parsed.knowledgePoints || !Array.isArray(parsed.knowledgePoints)) {
        logError('AI返回的结果格式无效，没有包含知识点数组:', parsed);
        throw new Error('AI返回的结果格式无效（缺少知识点数组）');
      }
      
      // 构建结果
      const result = {
        knowledgePoints: parsed.knowledgePoints.map((kp: any) => ({
          name: kp.name,
          description: kp.description || '',
          importance: typeof kp.importance === 'number' ? kp.importance : 3,
          masteryLevel: typeof kp.masteryLevel === 'number' ? kp.masteryLevel : 3,
          confidence: typeof kp.confidence === 'number' ? kp.confidence : 90,
          isNew: kp.isNew === true
        })),
        analysisTime,
        confidence: 85,
        providerInfo: ('getProviderInfo' in client) ? client.getProviderInfo() : {
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        }
      };
      
      logInfo('分析完成，识别到知识点数量:', result.knowledgePoints.length);
      return result;
      
    } catch (error) {
      logError('解析AI响应出错:', error);
      logError('原始响应:', responseText);
      
      // 开发环境下返回模拟数据，生产环境抛出错误
      if (process.env.NODE_ENV === 'development') {
        logInfo('解析错误，返回模拟分析结果');
        return getMockAnalysisResult(content, existingPoints);
      }
      throw new Error(`解析AI响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
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