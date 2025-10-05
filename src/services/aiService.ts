import { KnowledgePoint } from "@/types/homework";
import { env } from "@/env";
import OpenAI from "openai";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import axios, { AxiosRequestConfig } from "axios"; // 引入axios用于通用API调用
import { EnhancedAIClient } from "./enhancedAIClient";
import {
  getAllProviders,
  getProviderConfig,
  getProviderEndpoint,
} from "./aiProviderManager";
import { AIProviderConfig, AIRequestOptions } from "../types/ai";
import {
  getProviderById,
  getModelInfo,
  getModelsByProviderId,
} from "./providers";
import { AIAnalysisResult } from "../types/analysis";
import { logError, logInfo } from "../utils/logger";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // 添加toast导入

// 根据环境变量决定是否使用模拟AI
const USE_MOCK_AI = env.NEXT_PUBLIC_USE_MOCK_AI === "true";

// 使用Supabase代理请求的开关
const USE_SUPABASE_PROXY = false; // 设置为false直接发送请求，设置为true通过Supabase代理

// 使用硅基流动API，添加硬编码的API密钥（通常应该通过环境变量或安全方式存储）
const SBJT_API_KEY = "sk-kpibphayuoyyzkkrhnljayyjbrgkazwfrzonqxegfghntxzb";
// 直接使用硅基流动
const FORCE_USE_SBJT = false;

/**
 * 多模态消息内容项类型
 */
interface ContentItem {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

/**
 * 消息类型，可以是字符串或内容项数组
 */
interface Message {
  role: string;
  content: string | ContentItem[];
}

// AI客户端通用接口
interface GenericAIClientOptions {
  providerId: string;
  apiKey: string;
  modelId: string;
  baseUrl?: string;
}

// 请求选项接口
interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

// 响应接口
interface AIResponse {
  choices: {
    message?: {
      content: string;
    };
    text?: string;
  }[];
}

// 通用AI客户端类
export class GenericAIClient {
  private providerId: string;
  private apiKey: string;
  private modelId: string;
  private baseUrl: string;

  constructor(options: GenericAIClientOptions) {
    this.providerId = options.providerId;
    this.apiKey = options.apiKey;
    this.modelId = options.modelId;

    // 根据提供商设置基础URL
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    } else {
      switch (options.providerId) {
        case "openai":
          this.baseUrl = "https://api.openai.com/v1";
          break;
        case "azure":
          this.baseUrl = "https://api.cognitive.microsoft.com/sts/v1.0";
          break;
        default:
          this.baseUrl = "https://api.openai.com/v1";
      }
    }
  }

  // 发送API请求
  async sendRequest(
    messages: Message[],
    options: RequestOptions = {}
  ): Promise<AIResponse> {
    try {
      // 根据不同提供商构建不同的请求体
      let requestBody;
      let endpoint;
      // 使用Record<string, string>类型允许任意字符串键
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      switch (this.providerId) {
        case "openai":
          endpoint = `${this.baseUrl}/chat/completions`;
          requestBody = {
            model: this.modelId,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            top_p: options.topP,
            frequency_penalty: options.frequencyPenalty,
            presence_penalty: options.presencePenalty,
            stop: options.stop,
          };
          break;
        case "azure":
          // Azure特定的API格式
          endpoint = `${this.baseUrl}/chat/completions?api-version=2023-05-15`;
          requestBody = {
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            top_p: options.topP,
            frequency_penalty: options.frequencyPenalty,
            presence_penalty: options.presencePenalty,
            stop: options.stop,
          };
          break;
        case "doubao":
          // 豆包API特殊处理，使用火山引擎ARK API
          endpoint = this.baseUrl;

          // 设置特殊请求头
          headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            // 添加特殊header，使用索引签名避免TypeScript错误
            ["x-is-encrypted"]: "true", // ARK API需要的加密标志
          };

          // 检查是否包含多模态内容
          const hasMultiModalContent = messages.some(
            (msg) =>
              typeof msg.content !== "string" && Array.isArray(msg.content)
          );

          // 如果是多模态内容，需要特殊处理
          if (hasMultiModalContent) {
            console.log("检测到豆包API多模态请求");

            // 构建符合豆包API要求的多模态请求体
            requestBody = {
              model: this.modelId,
              messages,
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens || 2000,
              top_p: options.topP || 0.5,
              frequency_penalty: options.frequencyPenalty || 0,
              stream: false,
            };

            // 记录多模态请求内容用于调试
            console.log("豆包多模态请求模型:", this.modelId);
            console.log(
              "豆包多模态请求消息格式:",
              JSON.stringify(
                messages.map((m) => ({
                  role: m.role,
                  contentType:
                    typeof m.content === "string" ? "string" : "array",
                }))
              )
            );
          } else {
            // 普通文本请求
            requestBody = {
              model: this.modelId,
              messages,
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens,
              top_p: options.topP || 0.5,
              frequency_penalty: options.frequencyPenalty || 0,
              stream: false,
            };
          }
          break;
        default:
          endpoint = `${this.baseUrl}`;
          requestBody = {
            model: this.modelId,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            top_p: options.topP,
            frequency_penalty: options.frequencyPenalty,
            presence_penalty: options.presencePenalty,
            stop: options.stop,
          };
      }

      // 发送请求
      console.log(
        `发送请求到 ${endpoint}，提供商: ${this.providerId}，模型: ${this.modelId}`
      );

      // 对于多模态请求，添加更多日志
      if (
        this.providerId === "doubao" &&
        messages.some(
          (m) => typeof m.content !== "string" && Array.isArray(m.content)
        )
      ) {
        console.log(
          "多模态请求消息示例:",
          JSON.stringify(
            messages.map((m) => ({
              role: m.role,
              contentType: typeof m.content,
              contentLength:
                typeof m.content === "string"
                  ? m.content.length
                  : m.content.length,
            }))
          ).substring(0, 200)
        );
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `AI API请求失败: HTTP ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error("API错误详情:", errorData);
          errorMessage = `AI API请求失败: ${errorData.error?.message || errorData.message || response.statusText}`;
        } catch (parseError) {
          // 如果无法解析JSON，尝试读取文本
          try {
            const errorText = await response.text();
            errorMessage = `AI API请求失败: ${errorText || response.statusText}`;
          } catch (textError) {
            // 如果连文本都无法读取，使用默认错误信息
          }
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log(
        "API响应成功，响应大小约:",
        JSON.stringify(responseData).length,
        "字节"
      );
      return responseData;
    } catch (error) {
      console.error("AI请求失败:", error);
      throw error;
    }
  }

  // 兼容OpenAI的chat.completions.create接口
  chat = {
    completions: {
      create: async (params: {
        messages: { role: string; content: string }[];
        model: string;
        max_tokens?: number;
        temperature?: number;
      }) => {
        const response = await this.sendRequest(params.messages as Message[], {
          maxTokens: params.max_tokens,
          temperature: params.temperature,
        });

        return {
          choices: response.choices.map((choice) => ({
            message: {
              content: choice.message?.content || choice.text || "",
            },
          })),
        };
      },
    },
  };
}

// 接口参数定义
interface AnalyzeHomeworkImageParams {
  imageUrl: string;
  homeworkId: string;
  subject?: string;
}

interface AnalyzeHomeworkContentParams {
  content: string;
  imageUrls?: string[];
  homeworkId: string;
  subject?: string;
  existingKnowledgePoints?: KnowledgePoint[];
}

// 图片分析接口
export async function analyzeHomeworkImage(
  imageUrl: string,
  params: Omit<AnalyzeHomeworkImageParams, "imageUrl">
) {
  try {
    console.log(`分析作业图片: ${imageUrl}`);

    // 预处理图片URL，确保AI服务能够访问
    const processedImageUrl = await preprocessImageUrl(imageUrl);
    console.log("图片URL预处理完成，原URL:", imageUrl.substring(0, 50) + "...");
    if (processedImageUrl.startsWith("data:")) {
      console.log(
        "处理后URL: [base64图片数据]，长度:",
        processedImageUrl.length
      );
    } else {
      console.log("处理后URL:", processedImageUrl.substring(0, 50) + "...");
    }

    // 获取AI配置和API密钥
    const aiConfig = await getUserAIConfig();
    if (!aiConfig || !aiConfig.enabled) {
      logError("AI分析功能未启用或未配置");
      throw new Error("AI分析功能未启用，请先在AI设置中配置并启用");
    }

    // 获取配置的提供商和模型
    const configuredProvider = aiConfig.provider;
    const configuredModel = aiConfig.version;

    if (!configuredProvider || !configuredModel) {
      logError("未找到已配置的AI模型");
      throw new Error("未找到已配置的AI模型，请先在AI设置中选择模型");
    }

    // 获取API密钥
    const apiKey = await getUserAPIKey(configuredProvider);
    if (!apiKey) {
      logError("未找到API密钥");
      throw new Error(`未找到${configuredProvider}的API密钥，请在AI设置中配置`);
    }

    // 构建提示词
    const prompt = `
你是一位教育专家，请分析下面这张作业图片中包含的知识点。
作业科目: ${params.subject || "未指定"}

请识别图片中的主要知识点，为每个知识点提供简短说明。
以JSON格式输出，格式如下:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点简短说明"
    }
  ]
}
`;

    // 尝试使用主要方法分析
    try {
      logInfo("使用AI配置分析图片", {
        provider: configuredProvider,
        model: configuredModel,
      });

      // 创建AI客户端，直接使用通用客户端而不是通过API
      const client = await getAIClient(configuredProvider, configuredModel);

      if (!client) {
        throw new Error(
          `无法创建${configuredProvider}的AI客户端，请检查配置和API密钥`
        );
      }

      // 发送请求，根据客户端类型处理
      let response;

      if ("sendRequest" in client) {
        // 使用GenericAIClient处理图片
        let messageContent: Message[];

        if (
          client instanceof GenericAIClient &&
          (client as any).providerId === "doubao"
        ) {
          // 火山引擎ARK API的图片处理方式
          messageContent = [
            {
              role: "system",
              content: `你是一位教育专家，擅长分析教育内容并提取知识点。请分析图片中的作业内容，并以JSON格式返回结果。`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `请分析下面这张作业图片中包含的知识点。
作业科目: ${params.subject || "未指定"}

请识别图片中的主要知识点，为每个知识点提供简短说明。
以JSON格式输出，格式如下:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点简短说明"
    }
  ]
}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: processedImageUrl,
                  },
                },
              ],
            },
          ];

          // 记录上传的图片URL，帮助调试
          logInfo(
            "使用豆包API分析图片URL:",
            processedImageUrl.substring(0, 50) + "..."
          );
        } else {
          // 其他API的多模态处理方式
          messageContent = [
            {
              role: "system",
              content: "你是一位教育专家，擅长分析教育内容并提取知识点。",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt } as ContentItem,
                {
                  type: "image_url",
                  image_url: { url: processedImageUrl },
                } as ContentItem,
              ],
            },
          ];
        }

        response = await client.sendRequest(messageContent, {
          temperature: 0.3,
          maxTokens: 2000,
        });
      } else {
        // 使用OpenAI原生客户端
        response = await client.chat.completions.create({
          model: configuredModel,
          messages: [
            {
              role: "system",
              content: "你是一位教育专家，擅长分析教育内容并提取知识点。",
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: processedImageUrl } },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });
      }

      // 处理响应
      const content = response.choices[0]?.message?.content || "";

      if (!content) {
        throw new Error("AI返回内容为空");
      }

      // 添加调试日志
      console.log(
        "AI响应原始内容:",
        content.substring(0, 500) + (content.length > 500 ? "..." : "")
      );

      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("无法从AI响应中提取JSON数据，原始响应:", content);

        // 尝试使用启发式方法从文本中提取知识点
        try {
          console.log("尝试从文本中提取知识点");
          const lines = content.split("\n");
          const extractedPoints = [];

          for (const line of lines) {
            // 查找可能的知识点描述行
            if (
              line.includes("知识点") ||
              line.match(/^\d+\.\s+.+/) ||
              line.includes("：")
            ) {
              extractedPoints.push({
                name: line.replace(/^\d+\.\s+/, "").substring(0, 50),
                description: line,
              });
            }
          }

          if (extractedPoints.length > 0) {
            console.log("成功从文本中提取知识点:", extractedPoints.length);

            // 添加ID等信息
            const formattedKnowledgePoints = extractedPoints.map(
              (kp: any, index: number) => ({
                id: `kp-${Date.now()}-${index}`,
                name: kp.name,
                description: kp.description || "",
                homework_id: params.homeworkId,
                created_at: new Date().toISOString(),
                isNew: true, // 添加isNew标志，确保可以被创建
              })
            );

            return {
              success: true,
              knowledgePoints: formattedKnowledgePoints,
            };
          }
        } catch (extractError) {
          console.error("从文本中提取知识点失败:", extractError);
        }

        throw new Error("无法解析AI返回的JSON或提取知识点");
      }

      try {
        // 尝试解析JSON数据
        let parsedJson;

        try {
          // 标准JSON解析
          parsedJson = JSON.parse(jsonMatch[0]);
          console.log("JSON解析成功:", parsedJson);
        } catch (standardParseError) {
          // 标准解析失败，尝试修复JSON
          console.error("标准JSON解析失败，尝试修复格式:", standardParseError);
          console.log("原始JSON字符串:", jsonMatch[0]);

          // 修复可能的JSON格式问题
          let fixedJsonStr = jsonMatch[0]
            // 修复可能缺少右引号的属性值
            .replace(/"([^"]*?)(?=\n\s*")/g, '"$1"')
            // 移除尾随逗号
            .replace(/,(\s*[\]}])/g, "$1")
            // 处理可能在末尾截断的内容
            .replace(/("description"\s*:\s*"[^"]*?)$/g, '$1"')
            // 确保所有属性名有引号
            .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
            // 尝试修复截断的JSON结构
            .replace(/}\s*$/g, "}}");

          // 如果整个JSON被截断，尝试补全
          if (!fixedJsonStr.endsWith("}")) {
            fixedJsonStr += '"}]}';
          }

          console.log("修复后的JSON字符串:", fixedJsonStr);

          try {
            parsedJson = JSON.parse(fixedJsonStr);
            console.log("JSON修复成功");
          } catch (fixError) {
            console.error("JSON修复失败:", fixError);

            // 第二种尝试：提取所有可能的键值对
            console.log("尝试第二种方法提取键值对");
            const keyValueRegex = /"([^"]+)"\s*:\s*"([^"]*)"/g;
            const matches = [...jsonMatch[0].matchAll(keyValueRegex)];

            if (matches.length > 0) {
              // 从键值对构建简单对象
              const extracted = {};
              for (const match of matches) {
                const [, key, value] = match;
                extracted[key] = value;
              }

              // 手动构建知识点数组
              const knowledgePoints = [];
              let currentPoint = {};

              for (const [key, value] of Object.entries(extracted)) {
                if (key === "name") {
                  if (Object.keys(currentPoint).length > 0) {
                    knowledgePoints.push(currentPoint);
                    currentPoint = {};
                  }
                  currentPoint["name"] = value;
                } else if (key === "description") {
                  currentPoint["description"] = value;
                  knowledgePoints.push(currentPoint);
                  currentPoint = {};
                }
              }

              if (Object.keys(currentPoint).length > 0) {
                knowledgePoints.push(currentPoint);
              }

              if (knowledgePoints.length > 0) {
                parsedJson = { knowledgePoints };
                console.log(
                  "成功通过键值对提取知识点:",
                  knowledgePoints.length
                );
              } else {
                throw new Error("无法提取有效的知识点数据");
              }
            } else {
              throw new Error(`JSON修复失败: ${fixError.message}`);
            }
          }
        }

        console.log("解析的JSON数据:", parsedJson);

        // 确保有knowledgePoints字段
        if (!parsedJson.knowledgePoints && !parsedJson.knowledge_points) {
          // 兼容不同的JSON字段命名方式
          console.error(
            "JSON缺少knowledgePoints或knowledge_points字段，尝试直接使用整个对象"
          );

          // 尝试直接解析整个JSON对象
          if (Array.isArray(parsedJson)) {
            // 如果返回的是数组，直接将其视为知识点数组
            const formattedKnowledgePoints = parsedJson.map(
              (kp: any, index: number) => ({
                id: `kp-${Date.now()}-${index}`,
                name: kp.name || "未命名知识点",
                description: kp.description || "",
                homework_id: params.homeworkId,
                created_at: new Date().toISOString(),
                isNew: true, // 添加isNew标志，确保可以被创建
              })
            );

            return {
              success: true,
              knowledgePoints: formattedKnowledgePoints,
            };
          }

          // 查找可能的知识点字段名
          const possibleKnowledgePointsFields = Object.keys(parsedJson).filter(
            (key) =>
              key.toLowerCase().includes("knowledge") ||
              key.toLowerCase().includes("points") ||
              Array.isArray(parsedJson[key])
          );

          if (possibleKnowledgePointsFields.length > 0) {
            const fieldToUse = possibleKnowledgePointsFields[0];
            console.log(`使用可能的知识点字段: ${fieldToUse}`);
            parsedJson.knowledgePoints = parsedJson[fieldToUse];
          } else {
            // 如果找不到合适的字段，将整个对象视为单个知识点
            console.log("无法找到知识点数组字段，将整个对象视为知识点");
            parsedJson.knowledgePoints = [parsedJson];
          }
        }

        // 获取知识点数组（兼容不同字段名）
        const knowledgePointsArray =
          parsedJson.knowledgePoints || parsedJson.knowledge_points || [];
        console.log("提取的知识点数组:", knowledgePointsArray);

        // 格式化知识点以匹配前端期望的格式
        const formattedKnowledgePoints = knowledgePointsArray.map(
          (kp: any, index: number) => ({
            id: `kp-${Date.now()}-${index}`,
            name: kp.name || "未命名知识点",
            description: kp.description || "",
            homework_id: params.homeworkId,
            created_at: new Date().toISOString(),
            isNew: true, // 添加isNew标志，确保可以被创建
          })
        );

        return {
          success: true,
          knowledgePoints: formattedKnowledgePoints,
        };
      } catch (parseError) {
        console.error("解析JSON失败:", parseError);
        throw new Error(`解析AI返回的JSON数据失败: ${parseError.message}`);
      }
    } catch (primaryError) {
      // 如果主要分析方法失败，尝试备用方法
      console.error("主要分析方法失败，尝试备用方法:", primaryError);

      // 尝试使用硅基流动API（默认的备选提供商）
      try {
        console.log("尝试使用硅基流动API作为备用...");

        // 创建硅基流动AI客户端
        const client = new GenericAIClient({
          providerId: "sbjt",
          apiKey: SBJT_API_KEY,
          modelId: "Qwen/Qwen2.5-VL-72B-Instruct",
          baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
        });

        // 构造带图片的请求
        const messageContent = [
          {
            role: "system",
            content: "你是一位教育专家，擅长分析教育内容并提取知识点。",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt } as ContentItem,
              {
                type: "image_url",
                image_url: { url: processedImageUrl },
              } as ContentItem,
            ],
          },
        ];

        // 发送请求
        console.log("发送备用请求到硅基流动API...");
        const response = await client.sendRequest(messageContent, {
          temperature: 0.3,
          maxTokens: 2000,
        });

        // 处理响应
        const content = response.choices[0]?.message?.content || "";

        if (!content) {
          throw new Error("备用AI返回内容为空");
        }

        console.log(
          "备用AI响应原始内容:",
          content.substring(0, 500) + (content.length > 500 ? "..." : "")
        );

        // 处理可能包含在代码块中的JSON（如```json {...} ```）
        let jsonString = content;
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
          console.log("从代码块中提取JSON内容");
        }

        // 提取JSON部分
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("无法从备用AI响应中提取JSON数据", content);

          // 尝试使用启发式方法从文本中提取知识点
          try {
            console.log("尝试从备用AI文本中提取知识点");
            const lines = content.split("\n");
            const extractedPoints = [];

            for (const line of lines) {
              // 查找可能的知识点描述行
              if (
                line.includes("知识点") ||
                line.match(/^\d+\.\s+.+/) ||
                line.includes("：")
              ) {
                const match = line.match(
                  /[""「」【】：:]\s*([^""「」【】：:]+)[""「」【】：:]/
                );
                if (match) {
                  extractedPoints.push({
                    name: match[1],
                    description: line.replace(match[0], ""),
                  });
                } else {
                  extractedPoints.push({
                    name: line.replace(/^\d+\.\s+/, "").substring(0, 50),
                    description: line,
                  });
                }
              }
            }

            if (extractedPoints.length > 0) {
              console.log(
                "成功从备用AI文本中提取知识点:",
                extractedPoints.length
              );

              // 添加ID等信息
              const formattedKnowledgePoints = extractedPoints.map(
                (kp: any, index: number) => ({
                  id: `kp-backup-${Date.now()}-${index}`,
                  name: kp.name,
                  description: kp.description || "",
                  homework_id: params.homeworkId,
                  created_at: new Date().toISOString(),
                  isNew: true,
                })
              );

              return {
                success: true,
                knowledgePoints: formattedKnowledgePoints,
              };
            }
          } catch (extractError) {
            console.error("从备用AI文本中提取知识点失败:", extractError);
          }

          throw new Error("无法从备用AI响应中提取JSON数据");
        }

        try {
          // 尝试解析JSON
          let parsedData;

          try {
            parsedData = JSON.parse(jsonMatch[0]);
            console.log("备用AI JSON解析成功");
          } catch (parseError) {
            console.error("备用AI返回的JSON解析失败，尝试修复:", parseError);

            // 修复可能的JSON格式问题
            const fixedJsonStr = jsonMatch[0]
              .replace(/,(\s*[\]}])/g, "$1") // 移除尾随逗号
              .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // 确保属性名有引号
              .replace(/:\s*"?([^",{\[\]}]+)"?(\s*[,}])/g, ':"$1"$2'); // 确保属性值有引号

            try {
              parsedData = JSON.parse(fixedJsonStr);
              console.log("备用AI JSON修复成功");
            } catch (fixError) {
              console.error("备用AI JSON修复失败:", fixError);
              throw fixError;
            }
          }

          if (
            !parsedData.knowledgePoints ||
            !Array.isArray(parsedData.knowledgePoints)
          ) {
            throw new Error("备用AI返回的数据格式错误，缺少知识点数组");
          }

          // 添加ID等信息
          const formattedKnowledgePoints = parsedData.knowledgePoints.map(
            (kp: any, index: number) => ({
              id: `kp-${Date.now()}-${index}`,
              name: kp.name,
              description: kp.description || "",
              homework_id: params.homeworkId,
              created_at: new Date().toISOString(),
            })
          );

          return {
            success: true,
            knowledgePoints: formattedKnowledgePoints,
          };
        } catch (parseError) {
          console.error("解析备用AI响应失败:", parseError);
          throw new Error(`解析备用AI响应失败: ${parseError.message}`);
        }
      } catch (backupError) {
        console.error("备用分析方法也失败:", backupError);

        // 如果备用方法也失败,抛出错误让调用方处理
        // 调用方可以选择: 1) 手动输入知识点 2) 复用之前的分析 3) 重试
        throw new Error(
          `AI分析服务暂时不可用: ${backupError.message}. ` +
          `请检查API配置或稍后重试,也可以选择手动输入知识点.`
        );
      }
    }
  } catch (error) {
    console.error("分析作业图片失败:", error);

    // 网络错误: 提供明确的错误信息和重试建议
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        'AI服务连接失败,请检查网络连接或API配置. ' +
        '你可以稍后重试,或选择手动输入知识点.'
      );
    }

    // 其他错误: 直接抛出,让调用方决定如何处理
    throw error;
  }
}

// 作业内容分析接口（带参数版本）
export async function analyzeHomeworkContentWithParams(
  params: AnalyzeHomeworkContentParams
) {
  try {
    console.log(`分析作业内容，提取知识点`);

    // 获取AI配置和API密钥
    const aiConfig = await getUserAIConfig();
    if (!aiConfig || !aiConfig.enabled) {
      logError("AI分析功能未启用或未配置");
      throw new Error("AI分析功能未启用，请先在AI设置中配置并启用");
    }

    // 获取配置的提供商和模型
    const configuredProvider = aiConfig.provider;
    const configuredModel = aiConfig.version;

    if (!configuredProvider || !configuredModel) {
      logError("未找到已配置的AI模型");
      throw new Error("未找到已配置的AI模型，请先在AI设置中选择模型");
    }

    // 获取API密钥
    const apiKey = await getUserAPIKey(configuredProvider);
    if (!apiKey) {
      logError("未找到API密钥");
      throw new Error(`未找到${configuredProvider}的API密钥，请在AI设置中配置`);
    }

    // 构建提示词
    const prompt = `
你是一位教育专家，请分析以下作业内容并提取其中包含的知识点。
作业科目: ${params.subject || "未指定"}

请识别内容中的主要知识点，为每个知识点提供简短说明。

作业内容:
${params.content}

${
  params.imageUrls && params.imageUrls.length > 0
    ? `作业还包含${params.imageUrls.length}张图片，请一并考虑。`
    : ""
}

${
  params.existingKnowledgePoints && params.existingKnowledgePoints.length > 0
    ? `已有的知识点列表（请避免生成重复或极为相似的知识点）:\n${params.existingKnowledgePoints.map((kp) => `- ${kp.name}`).join("\n")}`
    : ""
}

以JSON格式输出，格式如下:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点简短说明"
    }
  ]
}
`;

    // 创建AI客户端
    const client = await getAIClient(configuredProvider, configuredModel);
    if (!client) {
      throw new Error(
        `无法创建${configuredProvider}的AI客户端，请检查配置和API密钥`
      );
    }

    logInfo("使用AI配置进行分析", {
      provider: configuredProvider,
      model: configuredModel,
    });

    // 发送请求
    let response;
    if ("sendRequest" in client) {
      // 使用GenericAIClient
      let messageContent: Message[];

      if (
        client instanceof GenericAIClient &&
        (client as any).providerId === "doubao"
      ) {
        // 火山引擎ARK API的处理方式
        let contentText = prompt;

        // 对于火山引擎特别处理，将图片URL添加到文本中
        if (params.imageUrls && params.imageUrls.length > 0) {
          contentText += "\n\n图片URL:\n" + params.imageUrls.join("\n");
        }

        messageContent = [
          {
            role: "system",
            content: `###
假如你是一位经验丰富、专业过硬的教育专家，你将根据学生提供的题目或内容，来精准分析并提炼知识点。根据以下规则一步步执行：
1. 仔细研读学生提供的内容。
2. 对内容进行精准分析。
3. 提炼出关键知识点，并为每个知识点提供简短说明。

作业科目: ${params.subject || "未指定"}

请以JSON格式输出，格式如下:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点简短说明"
    }
  ]
}
###`,
          },
          { role: "user", content: contentText },
        ];
      } else {
        // 其他API的处理方式
        messageContent = [
          {
            role: "system",
            content: "你是一位教育专家，擅长分析教育内容并提取知识点。",
          },
          { role: "user", content: prompt },
        ];
      }

      response = await client.sendRequest(messageContent, {
        temperature: 0.3,
        maxTokens: 2000,
      });
    } else {
      // 使用OpenAI原生客户端
      response = await client.chat.completions.create({
        model: configuredModel,
        messages: [
          {
            role: "system",
            content: "你是一位教育专家，擅长分析教育内容并提取知识点。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
    }

    // 处理响应
    const content = response.choices[0]?.message?.content || "";

    if (!content) {
      throw new Error("AI返回内容为空");
    }

    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("无法从AI响应中提取JSON数据");
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    if (
      !parsedData.knowledgePoints ||
      !Array.isArray(parsedData.knowledgePoints)
    ) {
      throw new Error("AI返回的数据格式错误，缺少知识点数组");
    }

    // 格式化知识点
    const formattedKnowledgePoints = parsedData.knowledgePoints.map(
      (kp: any, index: number) => ({
        id: `kp-${Date.now()}-${index}`,
        name: kp.name,
        description: kp.description || "",
        homework_id: params.homeworkId,
        created_at: new Date().toISOString(),
      })
    );

    return {
      knowledgePoints: formattedKnowledgePoints,
    };
  } catch (error) {
    console.error("分析作业内容失败:", error);

    // 如果API调用失败，尝试使用模拟数据
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn("API调用失败，使用模拟数据作为后备方案");
      return {
        success: true,
        knowledgePoints: [
          {
            id: `kp-${Date.now()}-1`,
            name: "图像识别与分析",
            description: "识别并分析图片中的主要内容",
            homework_id: params.homeworkId,
            created_at: new Date().toISOString(),
            isNew: true,
          },
          {
            id: `kp-${Date.now()}-2`,
            name: params.subject ? `${params.subject}基础知识` : "学科基础知识",
            description: "与图片内容相关的学科基础知识",
            homework_id: params.homeworkId,
            created_at: new Date().toISOString(),
            isNew: true,
          },
        ],
      };
    }

    throw error;
  }
}

/**
 * 获取AI客户端
 * @param provider 提供商ID (可选)
 * @param modelId 模型ID (可选)
 * @param debugMode 是否启用调试模式
 * @returns API客户端或null
 */
export async function getAIClient(
  provider?: string,
  modelId?: string,
  debugMode = false
) {
  try {
    // 强制使用硅基流动API
    if (FORCE_USE_SBJT) {
      logInfo("强制使用硅基流动API");
      const providerId = "sbjt";
      const apiEndpoint = "https://api.siliconflow.cn/v1/chat/completions";

      // 如果指定了模型，使用指定的模型；否则使用默认的千问视觉模型
      const modelToUse = modelId || "Qwen/Qwen2.5-VL-72B-Instruct";

      logInfo(`创建硅基流动AI客户端，模型: ${modelToUse}, URL: ${apiEndpoint}`);

      const client = new GenericAIClient({
        providerId: providerId,
        apiKey: SBJT_API_KEY,
        modelId: modelToUse,
        baseUrl: apiEndpoint,
      });

      logInfo("成功创建硅基流动AI客户端");
      return client;
    }

    // 原始获取客户端逻辑
    // 获取用户配置和API密钥
    const aiConfig = await getUserAIConfig();
    const providerId = provider || aiConfig?.provider || "openai";
    const apiKey = await getUserAPIKey(providerId);

    // 日志输出配置信息
    logInfo(
      "AI配置:",
      JSON.stringify({
        configExists: !!aiConfig,
        configEnabled: aiConfig?.enabled,
        provider: providerId,
        apiKeyExists: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        debugMode: debugMode || aiConfig?.customSettings?.debugMode,
      })
    );

    // 如果没有API密钥，返回null
    if (!apiKey || apiKey.trim() === "") {
      logError("AI服务缺少API密钥，无法初始化客户端", {
        aiConfig: JSON.stringify(aiConfig),
        storedApiKey: apiKey ? "已设置(长度: " + apiKey.length + ")" : "未设置",
      });
      return null;
    }

    // 如果AI未启用，返回null
    if (aiConfig && aiConfig.enabled === false) {
      logError("AI服务已被用户禁用，使用模拟数据");
      return null;
    }

    const selectedModelId = modelId || aiConfig?.version;

    // 使用用户设置的调试模式，如果没有指定参数
    const useDebugMode =
      debugMode || aiConfig?.customSettings?.debugMode || false;

    // 获取提供商配置
    const providerConfig = getProviderConfig(providerId);

    // --- 添加详细日志 ---
    logInfo(
      `获取 ${providerId} 的配置结果:`,
      providerConfig
        ? JSON.stringify(providerConfig.models.map((m) => m.id))
        : "未找到配置"
    );
    // --- 结束详细日志 ---

    if (!providerConfig) {
      logError(`未找到提供商配置: ${providerId}`);
      // 返回 null 而不是抛出错误，让调用者处理
      // throw new Error(`未找到提供商配置: ${providerId}`);
      return null;
    }

    // 获取基础URL
    const baseUrl = providerConfig.baseUrl;

    logInfo("使用AI提供商:", {
      providerId,
      baseUrl,
      selectedModelId,
    });

    // 对于OpenAI使用原生客户端
    if (providerId.toLowerCase() === "openai") {
      logInfo("使用OpenAI原生客户端");
      const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl || "https://api.openai.com/v1",
      });

      // 测试连接是否可用
      try {
        // 非常简短的测试请求
        const testResponse = await client.chat.completions.create({
          model: selectedModelId || "gpt-3.5-turbo",
          messages: [{ role: "system", content: "Hello" }],
          max_tokens: 5,
        });

        if (testResponse) {
          logInfo("OpenAI连接测试成功");
        }
      } catch (testError) {
        logError("OpenAI连接测试失败:", testError);
        // 不抛出错误，继续使用此客户端
      }

      return client;
    }

    // 对于豆包（doubao）使用通用客户端，但确保使用正确的端点
    if (providerId.toLowerCase() === "doubao") {
      logInfo("使用豆包API客户端");
      // 使用火山引擎ARK API而不是直接使用豆包API
      const apiEndpoint =
        "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

      // 直接使用模型名称，不再转换为推理接入点ID
      // 豆包的模型命名格式通常为: doubao-1.5-vision-pro-250328 等
      const modelToUse = selectedModelId || "doubao-1.5-vision-pro-250328";

      logInfo("使用豆包模型:", modelToUse);

      const client = new GenericAIClient({
        providerId: "doubao",
        apiKey: apiKey,
        modelId: modelToUse,
        baseUrl: apiEndpoint,
      });

      logInfo("成功创建豆包API客户端");
      return client;
    }

    // 对于其他提供商，使用通用客户端
    // 使用getProviderEndpoint获取完整的API端点
    const apiEndpoint = getProviderEndpoint(
      // 硅基流动直接使用自己的ID获取端点，不再转为deepseek
      providerId,
      baseUrl
    );
    logInfo(`${providerId} API endpoint: ${apiEndpoint}`);

    // 获取模型ID
    let modelToUse;
    if (providerId === "sbjt") {
      // 硅基流动模型使用支持图像的模型
      modelToUse = selectedModelId || "deepseek-ai/deepseek-vl-7b-chat";
    } else if (providerId.startsWith("custom-")) {
      // 自定义模型使用默认模型
      modelToUse = selectedModelId || "default-model";
    } else {
      // 常规模型
      modelToUse = selectedModelId || providerConfig.models[0]?.id || "";
    }

    if (!modelToUse) {
      logError(`提供商 ${providerId} 没有可用的模型`);
      throw new Error(`提供商 ${providerId} 没有可用的模型`);
    }

    // 创建通用客户端
    logInfo(
      `创建通用AI客户端，提供商: ${providerId}, 模型: ${modelToUse}, URL: ${apiEndpoint}`
    );

    const client = new GenericAIClient({
      providerId: providerId,
      apiKey: apiKey,
      modelId: modelToUse,
      baseUrl: apiEndpoint,
    });

    return client;
  } catch (error) {
    logError("创建AI客户端时出错:", error);
    throw error;
  }
}

/**
 * 检查内容是否为图片URL或base64图片
 * @param content 要检查的内容
 * @returns 是否为图片URL或base64图片
 */
function isImageUrl(content: string): boolean {
  // 检查是否为URL格式且包含常见图片扩展名
  const isHttpUrl = /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(
    content
  );

  // 检查是否为base64编码的图片
  const isBase64Image = content.startsWith("data:image/");

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
  try {
    // 记录函数开始调用
    const isImage = isImageUrl(content);
    const isTextBot = modelId.startsWith("bot-"); // 判断是否为文本Bot
    logInfo(
      `开始使用模型 ${providerId}/${modelId} 分析内容，类型:`,
      isTextBot ? "文本Bot" : isImage ? "图片" : "文本"
    );

    // 获取AI客户端
    let client;
    try {
      // 获取指定提供商和模型的客户端
      client = await getAIClient(providerId, modelId);
    } catch (error) {
      logError(`获取模型 ${providerId}/${modelId} 的AI客户端失败:`, error);
      throw new Error(`无法获取AI客户端，请检查API密钥和AI配置`);
    }

    if (!client) {
      logError(`无法获取模型 ${providerId}/${modelId} 的AI客户端`);
      // 根据环境决定是否返回模拟数据或抛出错误
      if (process.env.NODE_ENV === "development") {
        logInfo("开发环境：因无法获取客户端返回模拟分析结果");
        return getMockAnalysisResult(content, existingPoints);
      }
      throw new Error("无法获取AI客户端，请检查API密钥和AI配置");
    }

    // 准备提示词
    const existingPointsText =
      existingPoints.length > 0
        ? existingPoints.map((p) => `- ${p.name}`).join("\n")
        : "(无)";

    // 根据模型类型构造不同的提示词
    let systemPromptContent =
      "你是一个教育内容分析助手，擅长识别学习内容中的知识点并评估掌握情况。";
    let userPromptContent: string | ContentItem[];

    if (isTextBot) {
      systemPromptContent = "你是一个乐于助人的AI助手。"; // Bot的系统提示
      userPromptContent = content; // 直接使用文本内容
    } else if (isImage) {
      // 视觉模型的知识点分析提示
      const visionPromptText = `
请分析这张图片中的作业内容，识别出其中包含的知识点，并评估学生对这些知识点的掌握程度。

已知知识点列表（如果有）：
${existingPointsText}

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
      `;
      userPromptContent = [
        { type: "text", text: visionPromptText },
        { type: "image_url", image_url: { url: content } },
      ];
    } else {
      // 纯文本的知识点分析提示
      const textPromptText = `
分析以下作业内容，识别出其中包含的知识点，并评估学生对这些知识点的掌握程度。

已知知识点列表（如果有）：
${existingPointsText}

${content}

请以JSON格式返回分析结果...
      `; // 省略重复的JSON格式说明
      userPromptContent = textPromptText;
    }

    // 记录开始时间
    const startTime = Date.now();
    logInfo(`开始使用模型 ${providerId}/${modelId} 发送AI请求...`);

    // 发送请求给AI
    let response: any;

    try {
      if ("sendRequest" in client) {
        // 使用GenericAIClient
        const systemMessage: Message = {
          role: "system",
          content: systemPromptContent,
        };
        const userMessage: Message = {
          role: "user",
          content: userPromptContent,
        };
        const messages: Message[] = [systemMessage, userMessage];

        logInfo(`发送请求到模型 ${providerId}/${modelId}...`, {
          provider: (client as any).providerId,
          model: (client as any).modelId,
          isImageContent: isImage,
          isTextBot: isTextBot,
        });

        // 根据模型调整maxTokens
        let requestMaxTokens = 2000;
        if (modelId === "deepseek-ai/deepseek-vl2") {
          requestMaxTokens = 512; // 为DeepSeek VL2设置较小的maxTokens
        } else if (isTextBot) {
          requestMaxTokens = 1024; // 文本Bot响应可以长一些
        }

        response = await client.sendRequest(messages, {
          temperature: 0.3,
          maxTokens: requestMaxTokens,
        });

        logInfo(`模型 ${providerId}/${modelId} 响应成功`, {
          hasChoices: !!response?.choices,
          choicesLength: response?.choices?.length,
        });
      } else {
        // 使用OpenAI客户端 (需要更新以支持不同模型和提示)
        // ... (此处逻辑需要根据OpenAI客户端和模型类型适配，暂时省略)
        throw new Error("OpenAI原生客户端逻辑需要更新以支持此模型类型");
      }

      logInfo(`模型 ${providerId}/${modelId} 响应成功，开始解析结果`);
    } catch (error) {
      logError(`模型 ${providerId}/${modelId} 请求失败:`, error);
      throw new Error(
        `AI分析请求失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }

    // 计算分析时间
    const analysisTime = Date.now() - startTime;

    // 解析AI响应
    const responseContent = response.choices[0]?.message?.content || "";
    logInfo(
      `模型 ${providerId}/${modelId} 原始响应内容:`,
      responseContent.substring(0, 200) + "..."
    );

    // 如果是文本Bot，直接返回文本结果
    if (isTextBot) {
      logInfo(`文本Bot ${providerId}/${modelId} 分析完成`);
      // 构建一个简单的AIAnalysisResult结构
      return {
        knowledgePoints: [
          {
            name: "Bot响应",
            description: responseContent,
            importance: 0,
            masteryLevel: 0,
            confidence: 100,
            isNew: true,
          },
        ],
        analysisTime,
        confidence: 100,
        providerInfo: { provider: providerId, model: modelId },
      };
    }

    // --- 知识点JSON解析逻辑 (适用于视觉和文本分析模型) ---
    try {
      // 尝试提取JSON部分
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      let parsed;

      if (jsonMatch) {
        // 找到JSON格式的内容
        const jsonStr = jsonMatch[0];
        try {
          parsed = JSON.parse(jsonStr);
        } catch (jsonError) {
          logError(`模型 ${providerId}/${modelId} JSON解析失败:`, jsonError);
          logError("原始JSON字符串:", jsonStr);

          // 尝试修复常见的JSON格式问题
          logInfo("尝试修复JSON格式...");
          const fixedJson = jsonStr
            .replace(/([{,])\s*(\w+):/g, '$1"$2":') // 为没有引号的键名添加引号
            .replace(/:\s*'([^']*)'/g, ':"$1"'); // 将单引号替换为双引号

          try {
            parsed = JSON.parse(fixedJson);
            logInfo("JSON修复成功");
          } catch (fixError) {
            logError("JSON修复失败:", fixError);
            throw new Error("无法解析AI返回的JSON数据");
          }
        }
      } else {
        // 没有找到JSON格式，尝试从文本中提取知识点
        logInfo(
          `模型 ${providerId}/${modelId} 未找到JSON格式，尝试从文本中提取知识点`
        );

        // 使用简单启发式方法从文本中提取知识点
        const lines = responseContent.split("\n");
        const knowledgePoints = [];

        for (const line of lines) {
          // 查找可能的知识点描述行
          if (
            line.includes("知识点") ||
            line.includes("掌握") ||
            line.match(/^\d+\.\s+/)
          ) {
            const nameMatch = line.match(
              /[""「」【】：:]\s*([^""「」【】：:]+)[""「」【】：:]/
            );
            if (nameMatch && nameMatch[1].length < 50) {
              knowledgePoints.push({
                name: nameMatch[1].trim(),
                description: line.replace(nameMatch[0], "").trim(),
                importance: 3, // 默认重要性
                masteryLevel: 3, // 默认掌握度
                confidence: 70, // 默认置信度
                isNew: true,
              });
            }
          }
        }

        if (knowledgePoints.length > 0) {
          parsed = { knowledgePoints };
          logInfo(
            `模型 ${providerId}/${modelId} 成功从文本中提取知识点:`,
            knowledgePoints.length
          );
        } else {
          throw new Error("AI返回的结果格式无效，无法提取知识点");
        }
      }

      // 验证并处理结果
      if (!parsed.knowledgePoints || !Array.isArray(parsed.knowledgePoints)) {
        logError(
          `模型 ${providerId}/${modelId} 返回的结果格式无效，没有包含知识点数组:`,
          parsed
        );
        throw new Error("AI返回的结果格式无效（缺少知识点数组）");
      }

      // 构建结果
      const result = {
        knowledgePoints: parsed.knowledgePoints.map((kp: any) => ({
          name: kp.name,
          description: kp.description || "",
          importance: typeof kp.importance === "number" ? kp.importance : 3,
          masteryLevel:
            typeof kp.masteryLevel === "number" ? kp.masteryLevel : 3,
          confidence: typeof kp.confidence === "number" ? kp.confidence : 90,
          isNew: kp.isNew === true,
        })),
        analysisTime,
        confidence: 85,
        providerInfo:
          "getProviderInfo" in client
            ? client.getProviderInfo()
            : {
                provider: "sbjt",
                model: modelId,
              },
      };

      logInfo(
        `模型 ${providerId}/${modelId} 分析完成，识别到知识点数量:`,
        result.knowledgePoints.length
      );
      return result;
    } catch (error) {
      logError(`模型 ${providerId}/${modelId} 解析AI响应出错:`, error);
      logError("原始响应:", responseContent);
      throw new Error(
        `解析AI响应失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  } catch (error) {
    logError(`模型 ${providerId}/${modelId} 知识点分析出错:`, error);
    throw error; // 将错误向上传递
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
      logInfo("内容非图片，直接使用DeepSeek分析");
      return analyzeWithModel(
        "Pro/deepseek-ai/DeepSeek-V3",
        "deepseek-ai/DeepSeek-V3",
        content,
        existingPoints
      );
    }

    // 使用模拟AI时直接返回模拟结果
    if (USE_MOCK_AI) {
      logInfo("使用模拟AI分析");
      return getMockAnalysisResult(content, existingPoints);
    }

    // 第一步：使用千问分析图片
    logInfo("开始第一步：使用千问模型处理图片内容");
    const qwenResult = await analyzeWithModel(
      "Qwen/Qwen2.5-VL-72B-Instruct",
      "Qwen/Qwen2.5-VL-72B-Instruct",
      content,
      existingPoints
    );

    // 提取千问的分析结果
    const extractedText = qwenResult.knowledgePoints
      .map(
        (kp) =>
          `- ${kp.name}：${kp.description}（重要性：${kp.importance}，掌握程度：${kp.masteryLevel}）`
      )
      .join("\n");

    // 第二步：将千问结果传给DeepSeek进行深入分析
    logInfo("开始第二步：将千问结果传递给DeepSeek进行深入分析");
    const deepseekPrompt = `
千问模型从图片中提取的信息：

${extractedText}

请基于上述千问模型提取的信息，进行更深入的知识点分析，补充完善知识点描述，并对重要性和掌握程度进行更准确的评估。
`;

    return analyzeWithModel(
      "Pro/deepseek-ai/DeepSeek-V3",
      "Pro/deepseek-ai/DeepSeek-V3",
      deepseekPrompt,
      existingPoints
    );
  } catch (error) {
    logError("级联分析过程出错:", error);

    // 如果是开发环境，返回模拟数据
    if (process.env.NODE_ENV === "development") {
      logInfo("级联分析错误，返回模拟结果");
      return getMockAnalysisResult(content, existingPoints);
    }

    throw error;
  }
}

/**
 * 分析作业内容，识别知识点
 * @param content 作业内容
 * @param existingPoints 已有的知识点
 * @returns 分析结果
 */
export async function analyzeHomeworkContentWithAI(
  content: string,
  existingPoints: KnowledgePoint[] = []
): Promise<AIAnalysisResult> {
  try {
    // 使用模拟AI时直接返回模拟结果
    if (USE_MOCK_AI) {
      logInfo("使用模拟AI分析");
      return getMockAnalysisResult(content, existingPoints);
    }

    // 获取用户配置的AI提供商和模型
    const aiConfig = await getUserAIConfig();
    if (!aiConfig || !aiConfig.enabled) {
      logError("AI分析功能未启用或未配置");
      throw new Error("AI分析功能未启用，请先在AI设置中配置并启用");
    }

    // 获取配置的提供商和模型
    const configuredProvider = aiConfig.provider;
    const configuredModel = aiConfig.version;

    if (!configuredProvider || !configuredModel) {
      logError("未找到已配置的AI模型");
      throw new Error("未找到已配置的AI模型，请先在AI设置中选择模型");
    }

    logInfo("使用用户配置的AI进行分析", {
      provider: configuredProvider,
      model: configuredModel,
    });

    // 直接使用用户配置的提供商和模型进行分析
    try {
      const result = await analyzeWithModel(
        configuredProvider,
        configuredModel,
        content,
        existingPoints
      );

      // 确保结果中包含提供商信息
      if (!result.providerInfo) {
        result.providerInfo = {
          provider: configuredProvider,
          model: configuredModel,
        };
      }

      return result;
    } catch (error) {
      logError("使用配置的AI分析失败，尝试级联分析", error);

      // 如果分析失败，尝试使用级联分析方法
      return cascadeAnalyzeContent(content, existingPoints);
    }
  } catch (error) {
    logError("知识点分析出错:", error);

    // 如果是开发环境，返回模拟数据
    if (process.env.NODE_ENV === "development") {
      logInfo("因错误返回模拟结果");
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
function getMockAnalysisResult(
  content: string,
  existingPoints: KnowledgePoint[] = []
): AIAnalysisResult {
  // 创建一些模拟知识点
  const baseKnowledgePoints = [
    {
      name: "数学公式应用",
      description: "在实际问题中应用数学公式进行计算",
      importance: 4,
      masteryLevel: 3,
      confidence: 95,
      isNew: true,
    },
    {
      name: "逻辑推理能力",
      description: "使用逻辑思维分析问题并得出结论",
      importance: 5,
      masteryLevel: 4,
      confidence: 92,
      isNew: true,
    },
    {
      name: "英语语法规则",
      description: "正确使用英语语法结构和时态",
      importance: 4,
      masteryLevel: 3,
      confidence: 90,
      isNew: true,
    },
    {
      name: "科学概念理解",
      description: "理解和应用基本科学概念解释现象",
      importance: 3,
      masteryLevel: 3,
      confidence: 88,
      isNew: true,
    },
    {
      name: "历史事件分析",
      description: "分析历史事件及其影响和意义",
      importance: 3,
      masteryLevel: 2,
      confidence: 85,
      isNew: true,
    },
  ];

  // 根据输入内容添加一些更相关的模拟知识点
  const contentBasedPoints = [];

  if (
    content.includes("数学") ||
    content.includes("计算") ||
    content.includes("函数")
  ) {
    contentBasedPoints.push({
      name: "数学函数应用",
      description: "理解并正确应用数学函数解题",
      importance: 5,
      masteryLevel: 4,
      confidence: 96,
      isNew: true,
    });
  }

  if (
    content.includes("英语") ||
    content.includes("语法") ||
    content.includes("单词")
  ) {
    contentBasedPoints.push({
      name: "英语词汇量",
      description: "掌握并正确使用英语词汇",
      importance: 4,
      masteryLevel: 3,
      confidence: 93,
      isNew: true,
    });
  }

  if (
    content.includes("物理") ||
    content.includes("化学") ||
    content.includes("实验")
  ) {
    contentBasedPoints.push({
      name: "科学实验分析",
      description: "设计和分析科学实验过程与结果",
      importance: 4,
      masteryLevel: 3,
      confidence: 91,
      isNew: true,
    });
  }

  if (
    content.includes("历史") ||
    content.includes("政治") ||
    content.includes("社会")
  ) {
    contentBasedPoints.push({
      name: "史料解读能力",
      description: "解读历史文献和资料，理解背景与意义",
      importance: 4,
      masteryLevel: 3,
      confidence: 89,
      isNew: true,
    });
  }

  // 将现有知识点标记为非新知识点
  const existingKnowledgePoints = existingPoints.map((point) => ({
    name: point.name,
    description: point.description || `关于${point.name}的知识点`,
    importance: Math.floor(Math.random() * 3) + 3, // 随机 3-5
    masteryLevel: Math.floor(Math.random() * 3) + 2, // 随机 2-4
    confidence: Math.floor(Math.random() * 10) + 85, // 随机 85-95%
    isNew: false,
  }));

  // 合并所有知识点，优先使用内容相关的，然后是现有的，最后是基础的
  // 限制总数为10个以内
  const allPoints = [
    ...contentBasedPoints,
    ...existingKnowledgePoints,
    ...baseKnowledgePoints,
  ].slice(0, 10);

  // 返回模拟结果
  return {
    knowledgePoints: allPoints,
    analysisTime: 1234, // 模拟分析时间(毫秒)
    confidence: 85,
    providerInfo: {
      provider: "mock",
      model: "mock-model-v1",
    },
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
    return provider.models.map((model) => ({
      id: model.id || "",
      name: model.name || "未命名模型",
    }));
  } catch (error) {
    logError("获取模型列表出错:", error);
    return [];
  }
}

/**
 * 测试AI提供商的API连接
 * @param provider 提供商ID
 * @param apiKey API密钥
 * @param apiId API ID (可选，用于豆包等需要额外ID的提供商)
 * @param modelId 模型ID (可选，用于测试特定模型)
 * @returns 测试结果，成功返回true，失败返回错误信息
 */
export async function testProviderConnection(
  provider: string,
  apiKey: string,
  apiId?: string,
  modelId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    logInfo(`测试AI提供商连接: ${provider}`);

    if (!apiKey || apiKey.trim() === "") {
      return {
        success: false,
        message: "API密钥不能为空",
      };
    }

    // 获取提供商配置
    const providerConfig = getProviderConfig(provider);

    if (!providerConfig) {
      return {
        success: false,
        message: `未找到提供商配置: ${provider}`,
      };
    }

    // 获取基础URL
    const baseUrl = providerConfig.baseUrl;
    const modelToUse = modelId || providerConfig.models[0]?.id || "";

    // 构建请求体和配置
    let requestData = {};
    const axiosConfig: {
      headers: Record<string, string>;
    } = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    // 豆包API测试连接 - 直接调用API
    if (provider.toLowerCase() === "doubao") {
      try {
        logInfo("直接测试豆包API连接");

        // 使用EnhancedAIClient进行测试
        const aiClient = new EnhancedAIClient(
          apiKey,
          provider,
          modelToUse,
          true
        );

        // 发送测试请求
        const response = await aiClient.chat.completions.create({
          messages: [{ role: "user", content: "你好" }],
          max_tokens: 10,
          temperature: 0.7,
        });

        if (response && response.choices && response.choices.length > 0) {
          logInfo("豆包API测试连接成功");
          return {
            success: true,
            message: "连接测试成功",
          };
        } else {
          logError("豆包API测试连接失败:");
          return {
            success: false,
            message: "连接测试失败：无效响应",
          };
        }
      } catch (error: any) {
        logError("豆包API测试连接错误:", error);

        let errorMessage = "连接测试失败";

        // 获取详细错误信息
        if (error.response) {
          errorMessage = `连接测试失败: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        } else if (error.message) {
          errorMessage = `连接测试失败: ${error.message}`;
        }

        return {
          success: false,
          message: errorMessage,
        };
      }
    }

    // 其他API提供商的处理保持不变
    const endpoint = getProviderEndpoint(provider, baseUrl);

    // 根据不同提供商配置请求
    switch (provider.toLowerCase()) {
      case "openai":
        requestData = {
          model: modelToUse || "gpt-3.5-turbo",
          messages: [{ role: "system", content: "Hello" }],
          max_tokens: 5,
        };

        axiosConfig.headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        break;

      case "dashscope":
        requestData = {
          model: modelToUse,
          messages: [{ role: "system", content: "Hello" }],
          max_tokens: 5,
        };

        axiosConfig.headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        break;

      default:
        // 通用配置
        requestData = {
          model: modelToUse,
          messages: [{ role: "system", content: "Hello" }],
          max_tokens: 5,
        };

        axiosConfig.headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
    }

    logInfo(`发送测试请求到 ${provider} API:`, {
      endpoint,
      provider,
      model: modelToUse,
    });

    // 发送测试请求
    const response = await axios.post(endpoint, requestData, axiosConfig);

    // 如果请求成功，返回成功
    if (response.status >= 200 && response.status < 300) {
      logInfo(`${provider} API测试连接成功`);
      return {
        success: true,
        message: "连接测试成功",
      };
    } else {
      logError(`${provider} API测试连接失败:`, response.status);
      return {
        success: false,
        message: `连接测试失败: ${response.status}`,
      };
    }
  } catch (error: any) {
    logError(`${provider} API测试连接出错:`, error);

    let errorMessage = "连接测试失败";

    // 提取详细错误信息
    if (error.response) {
      errorMessage = `连接测试失败: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
      logError("API错误响应:", {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.message) {
      errorMessage = `连接测试失败: ${error.message}`;
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * 检查并预处理图片URL，确保AI服务能够访问
 * @param imageUrl 原始图片URL
 * @returns 处理后的图片URL
 */
async function preprocessImageUrl(imageUrl: string): Promise<string> {
  try {
    // 检查是否为Supabase URL
    if (imageUrl.includes("supabase.co/storage")) {
      console.log("检测到Supabase存储图片，尝试预处理...");

      // 下载图片并转换为base64
      try {
        console.log("尝试下载图片并转换为base64...");
        const response = await fetch(imageUrl);

        if (!response.ok) {
          throw new Error(
            `无法下载图片: ${response.status} ${response.statusText}`
          );
        }

        const blob = await response.blob();
        const base64Image = await blobToBase64(blob);

        console.log("成功转换图片为base64，长度:", base64Image.length);
        return base64Image;
      } catch (dlError) {
        console.error("图片下载/转换失败:", dlError);

        // 尝试使用CORS代理作为备选方案
        console.log("尝试使用CORS代理作为备选...");
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
        console.log("使用CORS代理:", proxiedUrl);
        return proxiedUrl;
      }
    }

    // 如果不是Supabase URL，直接返回原URL
    return imageUrl;
  } catch (error) {
    console.error("图片预处理失败:", error);
    // 出错时返回原URL
    return imageUrl;
  }
}

/**
 * 将Blob转换为base64字符串
 * @param blob 图片Blob
 * @returns base64字符串
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * AI分析服务 - 提供AI分析相关功能
 */
export const aiService = {
  /**
   * 分析文件结构
   * @param fileContent 文件内容
   * @param fileType 文件类型
   * @returns 分析结果
   */
  async analyzeFileStructure(fileContent: string, fileType: string) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-file-analysis",
        {
          body: {
            content: fileContent,
            type: fileType,
            action: "structure_analysis",
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("文件结构分析失败:", error);
      throw error;
    }
  },

  /**
   * 映射文件表头
   * @param headers 表头数组
   * @param sampleData 样本数据
   * @returns 映射结果
   */
  async mapFileHeaders(headers: string[], sampleData: any[]) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-file-analysis",
        {
          body: {
            headers,
            sampleData,
            action: "header_mapping",
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("表头映射失败:", error);
      throw error;
    }
  },

  /**
   * 分析成绩数据
   * @param gradeData 成绩数据
   * @param config 分析配置
   * @returns 分析结果
   */
  async analyzeGrades(
    gradeData: any[],
    config: {
      provider: string;
      model: string;
      temperature: number;
      language: string;
    }
  ) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-grades",
        {
          body: {
            grades: gradeData,
            config,
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("成绩分析失败:", error);
      throw error;
    }
  },

  /**
   * 生成学生成绩报告
   * @param studentId 学生ID
   * @param gradeData 成绩数据
   * @returns 报告内容
   */
  async generateStudentReport(studentId: string, gradeData: any[]) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-student-report",
        {
          body: {
            studentId,
            grades: gradeData,
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("学生报告生成失败:", error);
      throw error;
    }
  },

  /**
   * 使用AI增强文件解析能力
   * @param headers 表头数组
   * @param sampleData 样本数据行
   * @returns 优化后的表头映射和数据类型推断
   */
  async enhanceFileParsing(headers: string[], sampleData: any[]) {
    try {
      console.log("正在使用AI增强解析能力...");

      // 获取AI客户端（优先使用豆包AI）
      const client = await getAIClient("doubao");

      // 客户端可能为null，需要检查
      if (!client || !("sendRequest" in client)) {
        console.error("无法获取AI客户端或客户端不支持sendRequest方法");
        return {
          mappings: {},
          dataTypes: {},
          suggestions: "",
        };
      }

      // 准备要发送的样本数据（限制数量避免token过多）
      const limitedSampleData = sampleData.slice(0, 3);

      // 构建提示信息
      const systemMessage = {
        role: "system",
        content: `你是一个专业的教育数据分析助手，擅长理解和映射学生成绩数据结构。
分析以下表头和样本数据，根据教育领域的标准命名映射这些表头，并推断数据类型。
标准表头名称应该包括：student_id(学号)、name(姓名)、class_name(班级)、score(分数)、subject(科目)、
grade(等级)、rank_in_class(班级排名)、rank_in_grade(年级排名)、exam_date(考试日期)等。
对不确定的字段，请尝试最合理的猜测，注意处理别名、缩写或不标准的表达方式。`,
      };

      const userMessage = {
        role: "user",
        content: `以下是我需要解析的数据表头和样本数据：
表头: ${JSON.stringify(headers)}
样本数据: ${JSON.stringify(limitedSampleData)}

请分析这些数据并返回JSON格式的映射结果，包含以下内容：
1. 表头映射：将原始表头映射到标准字段名称
2. 数据类型推断：推断每个字段的数据类型
3. 额外建议：任何关于数据处理的建议

返回格式示例:
{
  "mappings": {
    "原表头1": "student_id",
    "原表头2": "name"
  },
  "dataTypes": {
    "原表头1": "string",
    "原表头2": "string"
  },
  "suggestions": "处理建议"
}

务必使用JSON格式返回，不要有任何额外解释。`,
      };

      // 使用类型断言确保TypeScript理解client有sendRequest方法
      const genericClient = client as GenericAIClient;

      // 发送请求
      const response = await genericClient.sendRequest(
        [systemMessage, userMessage],
        {
          temperature: 0.2,
          maxTokens: 2000,
        }
      );

      // 处理响应
      let content = "";
      if (response.choices && response.choices.length > 0) {
        if (response.choices[0].message?.content) {
          content = response.choices[0].message.content;
        } else if (response.choices[0].text) {
          content = response.choices[0].text;
        }
      }

      // 从响应中提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonContent = jsonMatch[0];
        try {
          const result = JSON.parse(jsonContent);
          console.log("AI解析结果:", result);
          return result;
        } catch (e) {
          console.error("无法解析返回的JSON:", e);
          throw new Error("AI返回的数据格式无效");
        }
      } else {
        console.error("AI返回内容中未找到JSON:", content);
        throw new Error("AI返回的内容不包含有效的JSON数据");
      }
    } catch (error) {
      console.error("AI增强解析失败:", error);
      // 出错时返回空结果，降级为普通解析
      return {
        mappings: {},
        dataTypes: {},
        suggestions: "",
      };
    }
  },
};

// 在文件适当位置添加以下代码

/**
 * 考试信息接口
 */
export interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject?: string;
}

/**
 * 使用Edge Function批量保存考试成绩数据
 * @param records 成绩记录数组
 * @param examInfo 考试信息
 * @returns 处理结果
 */
export async function saveExamData(records: any[], examInfo: ExamInfo) {
  try {
    // 构建请求数据
    const examData = {
      title: examInfo.title,
      type: examInfo.type,
      subject: examInfo.subject,
      data: records,
    };

    // 直接使用hardcoded URL和ANON_KEY避免环境变量问题
    const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
    const ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc1MDc1MzcsImV4cCI6MjAyMzA4MzUzN30.4tLi3tPSiWHcRuLcS3tN13aK6CADEr1DVPfgswQTnhA";

    // 直接使用Supabase REST API（而不是Supabase客户端）来调用Edge Function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/save-exam-data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ examData }),
      }
    );

    if (!response.ok) {
      let errorMessage = "保存数据失败";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // 如果无法解析JSON，使用状态码
        errorMessage = `保存数据失败: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("调用保存考试数据API失败:", error);
    toast.error(`保存考试数据失败: ${(error as Error).message || "未知错误"}`);
    throw error;
  }
}

/**
 * 与AI模型进行简单对话聊天
 * 专门用于AI助手对话，不同于analyzeWithModel的教育内容分析
 * @param providerId 提供商ID
 * @param modelId 模型ID
 * @param message 用户消息
 * @param options 可选参数
 * @returns AI回复内容
 */
export async function chatWithModel(
  providerId: string,
  modelId: string,
  message: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    conversationHistory?: { role: string; content: string }[];
  } = {}
): Promise<string> {
  try {
    logInfo("开始聊天对话", {
      provider: providerId,
      model: modelId,
      messageLength: message.length,
    });

    // 获取AI客户端
    const client = await getAIClient(providerId, modelId);
    if (!client) {
      throw new Error(`无法创建${providerId}的AI客户端，请检查配置和API密钥`);
    }

    // 构建消息数组
    const messages: { role: string; content: string }[] = [];

    // 添加系统提示（AI助手专用）
    const systemPrompt =
      options.systemPrompt ||
      "你是一个教育AI助手，专门帮助教师分析学生成绩数据和提供教学建议。请用简洁专业的语言回答教学相关问题，重点关注：成绩分析、学习建议、教学策略、数据洞察。回答控制在100字以内。";

    messages.push({ role: "system", content: systemPrompt });

    // 添加对话历史（如果有）
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      messages.push(...options.conversationHistory);
    }

    // 添加当前用户消息
    messages.push({ role: "user", content: message });

    // 发送聊天请求
    let response;
    if (
      "chat" in client &&
      typeof client.chat.completions.create === "function"
    ) {
      // 使用OpenAI风格的API（EnhancedAIClient）
      response = await client.chat.completions.create({
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("AI响应内容为空");
      }

      logInfo("聊天对话成功", {
        provider: providerId,
        model: modelId,
        responseLength: content.length,
      });

      return content;
    } else if ("sendRequest" in client) {
      // 使用GenericAIClient
      const requestOptions = {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1000,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

      response = await (client as GenericAIClient).sendRequest(
        messages,
        requestOptions
      );

      const content =
        response?.choices?.[0]?.message?.content ||
        response?.choices?.[0]?.text;
      if (!content) {
        throw new Error("AI响应内容为空");
      }

      logInfo("聊天对话成功", {
        provider: providerId,
        model: modelId,
        responseLength: content.length,
      });

      return content;
    } else {
      throw new Error("不支持的AI客户端类型");
    }
  } catch (error) {
    logError("聊天对话失败:", error);

    // 提供友好的错误信息
    let errorMessage = "";
    if (error.message.includes("API密钥")) {
      errorMessage = "AI服务API密钥有误，请检查AI设置";
    } else if (
      error.message.includes("网络") ||
      error.message.includes("timeout")
    ) {
      errorMessage = "网络连接失败，请检查网络状态";
    } else if (error.message.includes("配置")) {
      errorMessage = "请先在AI设置中配置AI服务";
    } else {
      errorMessage = `AI服务暂时不可用: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

/**
 * 获取用户配置的中文AI模型列表
 * 只返回用户在AI设置中配置的中文AI提供商和模型
 * @returns 配置的中文AI模型列表
 */
export async function getConfiguredChineseAIModels(): Promise<
  {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
  }[]
> {
  try {
    // 获取用户AI配置
    const aiConfig = await getUserAIConfig();
    if (!aiConfig || !aiConfig.provider || !aiConfig.version) {
      logInfo("用户未配置AI设置或配置不完整", aiConfig);
      return [];
    }

    // 中文AI提供商列表
    const chineseProviders = ["doubao", "deepseek", "qwen", "baichuan", "sbjt"];

    // 检查用户配置的提供商是否为中文AI
    if (!chineseProviders.includes(aiConfig.provider)) {
      logInfo("用户配置的AI提供商不是中文AI", { provider: aiConfig.provider });
      return [];
    }

    // 获取提供商信息 - getAllProviders()返回的是对象而不是数组
    const allProvidersObj = getAllProviders();
    const provider = allProvidersObj[aiConfig.provider];
    if (!provider) {
      logError("未找到配置的AI提供商", { provider: aiConfig.provider });
      return [];
    }

    // 获取该提供商的所有模型
    const models = getModelsByProviderId(aiConfig.provider);

    const result = models.map((model) => ({
      providerId: aiConfig.provider,
      providerName: provider.name,
      modelId: model.id,
      modelName: model.name,
    }));

    logInfo("成功获取中文AI模型列表", {
      provider: aiConfig.provider,
      modelCount: result.length,
    });

    return result;
  } catch (error) {
    logError("获取中文AI模型列表失败:", error);
    return [];
  }
}
