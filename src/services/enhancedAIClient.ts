// 增强版AI客户端

import axios from 'axios';
import { ProviderConfig } from '@/types/ai';
import { getProviderConfig } from './aiProviderManager';

/**
 * 增强版AI客户端
 * 支持多种提供商和模型
 */
export class EnhancedAIClient {
  private apiKey: string;
  private provider: ProviderConfig;
  private model: string;
  private debugMode: boolean;

  /**
   * 构造函数
   * @param apiKey API密钥
   * @param providerId 提供商ID
   * @param modelId 模型ID（可选）
   * @param debugMode 是否启用调试模式
   */
  constructor(apiKey: string, providerId: string, modelId?: string, debugMode = false) {
    this.apiKey = apiKey;
    this.debugMode = debugMode;
    
    // 获取提供商配置
    const providerConfig = getProviderConfig(providerId);
    if (!providerConfig) {
      throw new Error(`未找到提供商配置: ${providerId}`);
    }
    
    this.provider = providerConfig;
    
    // 选择模型，如果未指定则使用第一个
    this.model = modelId || (this.provider.models[0]?.id || '');
    
    if (this.debugMode) {
      console.log(`创建AI客户端: ${this.provider.name}, 模型: ${this.model}`);
    }
  }

  /**
   * 模拟OpenAI客户端的chat接口
   */
  get chat() {
    return {
      completions: {
        create: async (params: any) => {
          try {
            // 获取正确的端点URL
            const endpointUrl = this.getEndpointUrl();
            
            // 格式化请求
            const requestData = this.provider.requestFormat(params, this.model);
            
            if (this.debugMode) {
              console.log(`正在发送请求到 ${endpointUrl}`);
              console.log('请求数据:', JSON.stringify(requestData, null, 2));
              console.log('使用模型:', this.model);
            }
            
            // 构建请求头
            const headers: Record<string, string> = {
              'Content-Type': 'application/json'
            };
            
            // 根据认证类型设置认证信息
            if (this.provider.authType === 'bearer') {
              headers['Authorization'] = `Bearer ${this.apiKey}`;
            } else if (this.provider.authType === 'header' && this.provider.authKey) {
              headers[this.provider.authKey] = this.apiKey;
            }
            
            // 配置请求参数
            const requestConfig: any = {
              headers,
              timeout: 60000
            };
            
            // 处理URL参数认证
            if (this.provider.authType === 'param' && this.provider.authKey) {
              requestConfig.params = { [this.provider.authKey]: this.apiKey };
            }
            
            // 发送请求
            const response = await axios.post(
              endpointUrl, 
              requestData,
              requestConfig
            );
            
            if (this.debugMode) {
              console.log('API响应:', JSON.stringify(response.data, null, 2));
            }
            
            // 格式化响应
            return this.provider.responseFormat(response.data);
          } catch (error: any) {
            this.handleError(error);
            throw error;
          }
        }
      }
    };
  }
  
  /**
   * 增强错误处理
   * @param error 错误对象
   */
  private handleError(error: any) {
    console.error(`${this.provider.name} API调用失败:`, error);
    
    // 错误诊断
    if (error.response) {
      console.error('错误详情:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data, null, 2)
      });
      
      // 获取详细错误信息
      let errorMessage = '';
      try {
        if (typeof error.response.data === 'string') {
          const errorData = JSON.parse(error.response.data);
          errorMessage = errorData.error?.message || '';
        } else if (error.response.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }
      } catch (e) {
        errorMessage = '';
      }
      
      // 提供商特定错误处理
      if (this.provider.id === 'deepseek') {
        if (errorMessage === 'Model Not Exist') {
          const availableModels = this.provider.models.map(m => m.id).join(', ');
          console.error(`DeepSeek API错误: 模型 "${this.model}" 不存在。请尝试以下模型: ${availableModels}`);
          console.error('提示: 最新的DeepSeek模型ID可能使用 deepseek-chat-v1 或 deepseek-coder-v1 格式');
        } else if (error.response.status === 400) {
          console.error('DeepSeek API错误: 请检查模型名称和参数格式。确保stream参数是布尔值而非字符串。');
          console.error('当前使用的模型:', this.model);
          console.error('可能的原因: 1) 模型ID不正确 2) API密钥无效 3) 请求格式错误');
        }
      }
    } else if (error.request) {
      console.error('未收到响应:', error.request);
    } else {
      console.error('请求错误:', error.message);
    }
  }
  
  /**
   * 获取当前提供商信息
   */
  getProviderInfo() {
    return {
      provider: this.provider.id,
      model: this.model,
      name: this.provider.name,
      modelName: this.provider.models.find(m => m.id === this.model)?.name || this.model
    };
  }
  
  /**
   * 获取提供商支持的模型列表
   */
  getAvailableModels() {
    return this.provider.models;
  }

  /**
   * 获取正确的API端点URL
   * 支持模型特定的端点路径（如豆包的不同端点）
   */
  private getEndpointUrl(): string {
    // 查找当前模型的配置
    const modelInfo = this.provider.models.find(m => m.id === this.model);
    
    // 如果模型有特定的端点路径，使用它
    if (modelInfo?.endpointPath) {
      const fullUrl = `${this.provider.baseUrl}${modelInfo.endpointPath}`;
      if (this.debugMode) {
        console.log(`使用模型特定端点: ${fullUrl}`);
      }
      return fullUrl;
    }
    
    // 否则使用默认的chat/completions端点
    const defaultUrl = `${this.provider.baseUrl}/chat/completions`;
    if (this.debugMode) {
      console.log(`使用默认端点: ${defaultUrl}`);
    }
    return defaultUrl;
  }
} 