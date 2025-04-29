import { AIAnalysisResult } from '@/types/analysis';
import { KnowledgePoint } from '@/types/homework';

/**
 * 多模态消息内容项类型
 */
export interface ContentItem {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/**
 * 消息类型，可以是字符串或内容项数组
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentItem[];
}

/**
 * AI 请求的可选参数
 */
export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number; // Note: Doubao might use max_output_tokens
  stream?: boolean;
  topP?: number;
  frequencyPenalty?: number; // OpenAI specific
  presencePenalty?: number;  // OpenAI specific
  // Add other provider-specific options as needed
}

/**
 * AI 客户端通用接口
 */
export interface IAiClient {
  /**
   * 分析内容（文本或图片）并提取知识点
   * @param content 文本内容或图片的 Base64 Data URL
   * @param existingPoints 可选的、已存在的知识点列表
   * @returns 分析结果
   */
  analyzeContent(content: string, existingPoints?: KnowledgePoint[]): Promise<AIAnalysisResult>;

  /**
   * （可选）通用的聊天功能
   * @param messages 消息列表
   * @param options 请求选项
   * @returns 助手的回复文本
   */
  chat?(messages: Message[], options?: AIRequestOptions): Promise<string>;

  // 可以根据需要添加其他通用方法，例如 getEmbeddings 等
} 