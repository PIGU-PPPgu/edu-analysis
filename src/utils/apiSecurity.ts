/**
 * API安全工具类
 * 提供统一的API安全验证和处理机制
 */

import { env } from "../env";

// 服务器代理端点配置
const API_PROXY_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-api-server.com"
    : "http://localhost:3001";

/**
 * API请求安全配置
 */
export interface SecureApiConfig {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

/**
 * API响应类型
 */
export interface SecureApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

/**
 * 安全的API请求包装器
 * 所有敏感API调用都应通过服务器代理
 */
export class ApiSecurity {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30秒
  private static readonly DEFAULT_RETRIES = 3;

  /**
   * 创建安全的API请求
   */
  static async secureRequest<T = any>(
    config: SecureApiConfig
  ): Promise<SecureApiResponse<T>> {
    const {
      endpoint,
      method,
      headers = {},
      body,
      timeout = ApiSecurity.DEFAULT_TIMEOUT,
      retries = ApiSecurity.DEFAULT_RETRIES,
    } = config;

    // 验证端点安全性
    if (!ApiSecurity.isSecureEndpoint(endpoint)) {
      return {
        success: false,
        error: "不安全的API端点",
        message: "请求被安全策略阻止",
      };
    }

    let lastError: Error | null = null;

    // 重试机制
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `[API-SECURITY] 请求尝试 ${attempt}/${retries}: ${method} ${endpoint}`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "FigmaFrameFaithful/2.0",
            ...ApiSecurity.sanitizeHeaders(headers),
          },
          body: body
            ? JSON.stringify(ApiSecurity.sanitizeRequestBody(body))
            : undefined,
          signal: controller.signal,
          credentials: "omit", // 不发送cookies
          cache: "no-cache",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`[API-SECURITY] 请求成功: ${method} ${endpoint}`);

        return {
          success: true,
          data: ApiSecurity.sanitizeResponseData(data),
          status: response.status,
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[API-SECURITY] 请求失败 (尝试 ${attempt}/${retries}):`,
          error
        );

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retries) {
          await ApiSecurity.delay(Math.pow(2, attempt) * 1000); // 指数退避
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "未知错误",
      message: "请求失败，请稍后重试",
    };
  }

  /**
   * 通过安全代理发送AI API请求
   */
  static async secureAiRequest<T = any>(
    provider: "openai" | "doubao" | "generic",
    payload: any,
    apiKey: string
  ): Promise<SecureApiResponse<T>> {
    // 验证API密钥格式
    if (!ApiSecurity.isValidApiKey(apiKey)) {
      return {
        success: false,
        error: "API密钥格式无效",
        message: "请检查API密钥格式",
      };
    }

    let endpoint: string;
    let requestBody: any;

    switch (provider) {
      case "openai":
        endpoint = `${API_PROXY_BASE_URL}/api/analyze-image`;
        requestBody = {
          ...payload,
          apiKey,
          provider: "openai",
        };
        break;

      case "doubao":
        endpoint = `${API_PROXY_BASE_URL}/api/proxy/doubao`;
        requestBody = {
          ...payload,
          apiKey,
        };
        break;

      case "generic":
        endpoint = `${API_PROXY_BASE_URL}/api/proxy/${payload.provider}`;
        requestBody = {
          url: payload.url,
          data: payload.data,
          headers: { Authorization: `Bearer ${apiKey}` },
        };
        break;

      default:
        return {
          success: false,
          error: "不支持的AI提供商",
          message: `未知的提供商: ${provider}`,
        };
    }

    return ApiSecurity.secureRequest<T>({
      endpoint,
      method: "POST",
      body: requestBody,
      timeout: 60000, // AI请求需要更长时间
    });
  }

  /**
   * 验证端点是否安全
   */
  private static isSecureEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);

      // 只允许HTTPS协议（开发环境除外）
      if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
        return false;
      }

      // 允许的域名白名单
      const allowedDomains = [
        "localhost",
        "127.0.0.1",
        "your-api-server.com", // 生产环境域名
        env.SUPABASE_URL.replace(/^https?:\/\//, ""), // Supabase域名
      ];

      return allowedDomains.some(
        (domain) =>
          url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * 验证API密钥有效性
   */
  private static isValidApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }

    // 基本格式验证
    if (apiKey.length < 20) {
      return false;
    }

    // 检查是否包含明显的恶意内容
    const maliciousPatterns = [
      /javascript:/i,
      /<script/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i,
    ];

    return !maliciousPatterns.some((pattern) => pattern.test(apiKey));
  }

  /**
   * 清理请求头
   */
  private static sanitizeHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const allowedHeaders = [
      "content-type",
      "authorization",
      "x-api-key",
      "user-agent",
    ];

    const sanitized: Record<string, string> = {};

    Object.entries(headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey) && typeof value === "string") {
        sanitized[key] = value.substring(0, 1000); // 限制长度
      }
    });

    return sanitized;
  }

  /**
   * 清理请求体
   */
  private static sanitizeRequestBody(body: any): any {
    if (typeof body !== "object" || body === null) {
      return body;
    }

    const sanitized = { ...body };

    // 移除潜在的恶意字段
    delete sanitized.__proto__;
    delete sanitized.constructor;
    delete sanitized.prototype;

    // 清理字符串字段
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === "string") {
        sanitized[key] = ApiSecurity.sanitizeString(sanitized[key]);
      } else if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) =>
          typeof item === "string" ? ApiSecurity.sanitizeString(item) : item
        );
      }
    });

    return sanitized;
  }

  /**
   * 清理响应数据
   */
  private static sanitizeResponseData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    // 移除可能包含敏感信息的字段
    const sensitiveFields = [
      "apiKey",
      "password",
      "token",
      "secret",
      "private",
    ];
    const sanitized = { ...data };

    sensitiveFields.forEach((field) => {
      delete sanitized[field];
    });

    return sanitized;
  }

  /**
   * 清理字符串内容
   */
  private static sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .substring(0, 10000); // 限制最大长度
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 创建安全的请求URL
   */
  static createSecureUrl(
    baseUrl: string,
    path: string,
    params?: Record<string, string>
  ): string {
    try {
      const url = new URL(path, baseUrl);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (typeof value === "string" && value.length < 1000) {
            url.searchParams.append(key, encodeURIComponent(value));
          }
        });
      }

      return url.toString();
    } catch {
      throw new Error("无法创建安全的URL");
    }
  }

  /**
   * 检查网络连接状态
   */
  static isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  /**
   * 监听网络状态变化
   */
  static onNetworkChange(callback: (online: boolean) => void): () => void {
    if (typeof window === "undefined") {
      return () => {}; // 服务端环境返回空函数
    }

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 返回清理函数
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }
}

/**
 * 便捷的API安全调用函数
 */
export const secureApiCall = ApiSecurity.secureRequest;
export const secureAiApiCall = ApiSecurity.secureAiRequest;

/**
 * 错误处理工具
 */
export class ApiErrorHandler {
  static handleError(error: any, context: string = "API调用"): string {
    console.error(`[API-ERROR] ${context}:`, error);

    if (error?.name === "AbortError") {
      return "请求超时，请稍后重试";
    }

    if (error?.message?.includes("NetworkError")) {
      return "网络连接异常，请检查网络设置";
    }

    if (error?.status === 401) {
      return "API密钥无效或已过期";
    }

    if (error?.status === 429) {
      return "请求频率过高，请稍后重试";
    }

    if (error?.status >= 500) {
      return "服务器暂时不可用，请稍后重试";
    }

    return error?.message || "未知错误，请稍后重试";
  }
}

export default ApiSecurity;
