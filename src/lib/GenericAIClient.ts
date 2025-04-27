// 从aiService重新导出GenericAIClient类
import { GenericAIClient as OriginalGenericAIClient } from '@/services/aiService';
import { AIRequestOptions } from '@/types/ai';
import axios from 'axios';

// 导出原始类
export { OriginalGenericAIClient };

// 创建一个简化版本的类，提供兼容AIConnector组件的接口
export class SimplifiedAIClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor({ apiKey, baseURL, model }: { apiKey: string; baseURL: string; model: string }) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
  }

  // 发送请求
  async sendRequest(options: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }) {
    try {
      console.log(`发送请求到: ${this.baseURL}，模型: ${this.model}`);
      
      // 检查是否是直接调用自定义端点
      if (this.baseURL.includes('/chat/completions') || 
          this.baseURL.includes('/completions') ||
          this.baseURL.includes('/generation')) {
        // 直接使用axios发送请求
        const requestData = {
          model: this.model,
          messages: options.messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: options.stream || false
        };
        
        const response = await axios.post(this.baseURL, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        // 简单处理响应
        return {
          choices: [{
            message: {
              content: response.data.choices?.[0]?.message?.content || 
                      response.data.choices?.[0]?.text ||
                      response.data.output?.text ||
                      response.data.output?.message?.content ||
                      response.data.response ||
                      response.data.data?.response ||
                      '响应成功',
              role: 'assistant'
            }
          }]
        };
      }
      
      // 如果是硅基流动模型，设置providerId为deepseek (它们共用API)
      let providerId = 'generic';
      if (this.model.startsWith('sbjt-') || 
          this.model.includes('DeepSeek-V3') || 
          this.model.includes('DeepSeek-R1')) {
        providerId = 'deepseek';
      } else if (this.baseURL.includes('api.openai.com')) {
        providerId = 'openai';
      } else if (this.baseURL.includes('api.deepseek.com')) {
        providerId = 'deepseek';
      } else if (this.baseURL.includes('api.anthropic.com')) {
        providerId = 'anthropic';
      } else if (this.baseURL.includes('api.baichuan-ai.com')) {
        providerId = 'baichuan';
      } else if (this.baseURL.includes('dashscope.aliyuncs.com')) {
        providerId = 'qwen';
      } else if (this.model.startsWith('custom-')) {
        providerId = 'custom';
      }
      
      // 创建原始客户端实例
      const client = new OriginalGenericAIClient({
        providerId,
        apiKey: this.apiKey,
        baseUrl: this.baseURL,
        modelId: this.model
      });

      // 格式化请求选项
      const requestOptions: AIRequestOptions = {
        temperature: options.temperature,
        maxTokens: options.max_tokens,
        stream: options.stream
      };

      // 发送请求
      return await client.sendRequest(options.messages, requestOptions);
    } catch (error) {
      console.error('发送AI请求失败:', error);
      // 如果是直接请求错误而不是原始客户端的错误，尝试格式化
      if (axios.isAxiosError(error) && error.response) {
        console.error('API响应错误:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }
}

// 为了保持兼容性，导出SimplifiedAIClient作为默认类
export default SimplifiedAIClient; 