/**
 * 安全API客户端 - 集成安全中间件的API调用
 *
 * 功能：
 * - 自动令牌管理
 * - 请求/响应加密
 * - 速率限制
 * - 审计日志
 * - 自动重试和错误处理
 */

import { supabase } from "@/integrations/supabase/client";
import { securityMiddleware, type SecurityMiddlewareOptions } from "@/middleware/securityMiddleware";
import { dataProtectionService } from "@/services/security/dataProtectionService";
import { logError, logInfo, logWarn } from "@/utils/logger";
import { SecurityUtils } from "@/utils/securityUtils";

export interface SecureApiOptions {
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  encryptRequest?: boolean;
  encryptResponse?: boolean;
  auditLog?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  requestId?: string;
  cached?: boolean;
}

export interface RequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  requestId: string;
}

/**
 * 安全API客户端类
 */
export class SecureApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private requestCache = new Map<string, { response: ApiResponse; expires: number }>();
  private pendingRequests = new Map<string, Promise<ApiResponse>>();

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Request-Source': 'web-app',
    };
  }

  /**
   * 安全的GET请求
   */
  async get<T>(
    endpoint: string,
    options: SecureApiOptions = {},
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, options, { params });
  }

  /**
   * 安全的POST请求
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: SecureApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, options, { data });
  }

  /**
   * 安全的PUT请求
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: SecureApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, options, { data });
  }

  /**
   * 安全的DELETE请求
   */
  async delete<T>(
    endpoint: string,
    options: SecureApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }

  /**
   * 安全的PATCH请求
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: SecureApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, options, { data });
  }

  /**
   * 核心请求方法
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: SecureApiOptions,
    requestData?: { data?: any; params?: Record<string, any> }
  ): Promise<ApiResponse<T>> {
    const requestId = SecurityUtils.generateSecureToken(16);
    const startTime = Date.now();

    try {
      // 1. 构建请求上下文
      const context = await this.buildRequestContext(method, endpoint, requestData, requestId);
      
      // 2. 检查缓存
      if (method === 'GET') {
        const cached = this.getFromCache(context.url);
        if (cached) {
          logInfo("返回缓存响应", { endpoint, requestId });
          return { ...cached, cached: true };
        }
      }

      // 3. 检查重复请求
      const requestKey = `${method}:${endpoint}:${JSON.stringify(requestData)}`;
      if (this.pendingRequests.has(requestKey)) {
        logInfo("等待重复请求完成", { endpoint, requestId });
        return await this.pendingRequests.get(requestKey)!;
      }

      // 4. 执行请求
      const requestPromise = this.executeRequest<T>(context, options);
      this.pendingRequests.set(requestKey, requestPromise);

      try {
        const response = await requestPromise;
        
        // 5. 缓存GET请求的成功响应
        if (method === 'GET' && response.success) {
          this.cacheResponse(context.url, response, 5 * 60 * 1000); // 5分钟缓存
        }

        // 6. 审计日志
        if (options.auditLog !== false) {
          this.logApiCall(context, response, Date.now() - startTime);
        }

        return response;
      } finally {
        this.pendingRequests.delete(requestKey);
      }

    } catch (error) {
      logError("API请求失败", { method, endpoint, error, requestId });
      return {
        success: false,
        error: error instanceof Error ? error.message : "请求失败",
        requestId,
      };
    }
  }

  /**
   * 构建请求上下文
   */
  private async buildRequestContext(
    method: string,
    endpoint: string,
    requestData?: { data?: any; params?: Record<string, any> },
    requestId?: string
  ): Promise<RequestContext> {
    // 获取当前用户token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // 构建headers
    const headers = {
      ...this.defaultHeaders,
      'X-Request-ID': requestId || SecurityUtils.generateSecureToken(16),
      'X-Timestamp': Date.now().toString(),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 构建URL
    let url = `${this.baseUrl}${endpoint}`;
    if (requestData?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(requestData.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    return {
      method,
      url,
      headers,
      body: requestData?.data,
      timestamp: Date.now(),
      requestId: requestId || SecurityUtils.generateSecureToken(16),
    };
  }

  /**
   * 执行实际请求
   */
  private async executeRequest<T>(
    context: RequestContext,
    options: SecureApiOptions
  ): Promise<ApiResponse<T>> {
    // 1. 安全验证
    const securityResult = await this.performSecurityChecks(context, options);
    if (!securityResult.success) {
      return {
        success: false,
        error: securityResult.error,
        requestId: context.requestId,
      };
    }

    // 2. 请求加密
    let body = context.body;
    if (options.encryptRequest && body) {
      try {
        const encryptedBody = dataProtectionService.encryptData(JSON.stringify(body), 'strong');
        body = { encrypted: encryptedBody };
        context.headers['Content-Encoding'] = 'encrypted';
      } catch (error) {
        logError("请求加密失败", { error, requestId: context.requestId });
        return {
          success: false,
          error: "请求加密失败",
          requestId: context.requestId,
        };
      }
    }

    // 3. 执行HTTP请求
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, options.timeout || 30000);

      const response = await fetch(context.url, {
        method: context.method,
        headers: context.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 4. 处理响应
      return await this.processResponse<T>(response, options, context);

    } catch (error) {
      // 5. 重试机制
      if (options.retryOnFailure && this.shouldRetry(error)) {
        const maxRetries = options.maxRetries || 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          logWarn("重试API请求", { 
            attempt, 
            maxRetries, 
            error: error.message,
            requestId: context.requestId 
          });

          await this.delay(Math.pow(2, attempt) * 1000); // 指数退避

          try {
            const response = await fetch(context.url, {
              method: context.method,
              headers: context.headers,
              body: body ? JSON.stringify(body) : undefined,
            });

            return await this.processResponse<T>(response, options, context);
          } catch (retryError) {
            if (attempt === maxRetries) {
              throw retryError;
            }
          }
        }
      }

      throw error;
    }
  }

  /**
   * 执行安全检查
   */
  private async performSecurityChecks(
    context: RequestContext,
    options: SecureApiOptions
  ): Promise<{ success: boolean; error?: string }> {
    // 获取token
    const authHeader = context.headers['Authorization'];
    const token = authHeader?.replace('Bearer ', '');

    // 构建中间件选项
    const middlewareOptions = {
      enforceAuth: options.requireAuth !== false,
      requiredRoles: options.requiredRoles,
      requiredPermissions: options.requiredPermissions,
      rateLimit: options.rateLimit,
    };

    // 请求信息
    const requestInfo = {
      path: context.url,
      method: context.method,
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    // 执行安全验证
    const result = await securityMiddleware.validateRequest(
      token || null,
      middlewareOptions,
      requestInfo
    );

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * 处理响应
   */
  private async processResponse<T>(
    response: Response,
    options: SecureApiOptions,
    context: RequestContext
  ): Promise<ApiResponse<T>> {
    let data: any;

    try {
      const textResponse = await response.text();
      data = textResponse ? JSON.parse(textResponse) : null;
    } catch (error) {
      logError("响应解析失败", { error, requestId: context.requestId });
      return {
        success: false,
        error: "响应格式错误",
        statusCode: response.status,
        requestId: context.requestId,
      };
    }

    // 响应解密
    if (options.encryptResponse && data?.encrypted) {
      try {
        const decryptedData = dataProtectionService.decryptData(data.encrypted, 'strong');
        data = JSON.parse(decryptedData);
      } catch (error) {
        logError("响应解密失败", { error, requestId: context.requestId });
        return {
          success: false,
          error: "响应解密失败",
          statusCode: response.status,
          requestId: context.requestId,
        };
      }
    }

    return {
      success: response.ok,
      data: data,
      error: !response.ok ? data?.message || `请求失败 (${response.status})` : undefined,
      statusCode: response.status,
      requestId: context.requestId,
    };
  }

  /**
   * 缓存响应
   */
  private cacheResponse(url: string, response: ApiResponse, ttl: number): void {
    this.requestCache.set(url, {
      response: { ...response },
      expires: Date.now() + ttl,
    });
  }

  /**
   * 从缓存获取响应
   */
  private getFromCache(url: string): ApiResponse | null {
    const cached = this.requestCache.get(url);
    if (!cached || cached.expires <= Date.now()) {
      this.requestCache.delete(url);
      return null;
    }
    return cached.response;
  }

  /**
   * 记录API调用日志
   */
  private logApiCall(context: RequestContext, response: ApiResponse, duration: number): void {
    logInfo("API调用完成", {
      method: context.method,
      url: context.url,
      statusCode: response.statusCode,
      duration,
      success: response.success,
      requestId: context.requestId,
    });
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误或服务器错误可以重试
    return error.name === 'AbortError' || 
           error.message?.includes('fetch') ||
           error.message?.includes('network');
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取客户端IP（简化版）
   */
  private getClientIP(): string {
    // 在实际应用中，这通常由服务器端提供
    return 'unknown';
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.requestCache.clear();
    logInfo("API缓存已清理");
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.requestCache.size,
      entries: Array.from(this.requestCache.keys()),
    };
  }
}

// 导出默认实例
export const secureApiClient = new SecureApiClient();

// Supabase集成的安全客户端
export class SupabaseSecureClient extends SecureApiClient {
  constructor() {
    super(''); // Supabase使用自己的URL
  }

  /**
   * 安全的Supabase查询
   */
  async queryTable<T>(
    tableName: string,
    query: {
      select?: string;
      filters?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    } = {},
    options: SecureApiOptions = {}
  ): Promise<ApiResponse<T[]>> {
    try {
      // 构建查询
      let supabaseQuery = supabase
        .from(tableName)
        .select(query.select || '*');

      // 应用过滤器
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            supabaseQuery = supabaseQuery.eq(key, value);
          }
        });
      }

      // 应用排序
      if (query.order) {
        supabaseQuery = supabaseQuery.order(query.order.column, {
          ascending: query.order.ascending !== false,
        });
      }

      // 应用分页
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 10) - 1);
      }

      // 执行安全检查
      const requestId = SecurityUtils.generateSecureToken(16);
      const context = {
        method: 'GET',
        url: `supabase:${tableName}`,
        headers: {},
        timestamp: Date.now(),
        requestId,
      };

      const securityResult = await this.performSecurityChecks(context, options);
      if (!securityResult.success) {
        return {
          success: false,
          error: securityResult.error,
          requestId,
        };
      }

      // 执行查询
      const { data, error } = await supabaseQuery;

      if (error) {
        return {
          success: false,
          error: error.message,
          requestId,
        };
      }

      return {
        success: true,
        data: data as T[],
        requestId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "查询失败",
      };
    }
  }

  /**
   * 安全的数据插入
   */
  async insertData<T>(
    tableName: string,
    data: Partial<T> | Partial<T>[],
    options: SecureApiOptions = {}
  ): Promise<ApiResponse<T[]>> {
    try {
      const requestId = SecurityUtils.generateSecureToken(16);
      
      // 数据验证
      const dataArray = Array.isArray(data) ? data : [data];
      for (const item of dataArray) {
        if (typeof item === 'object') {
          // 清理危险属性
          const cleaned = SecurityUtils.safeJsonParse(JSON.stringify(item), item);
          Object.assign(item, cleaned);
        }
      }

      // 执行安全检查
      const context = {
        method: 'POST',
        url: `supabase:${tableName}`,
        headers: {},
        body: data,
        timestamp: Date.now(),
        requestId,
      };

      const securityResult = await this.performSecurityChecks(context, {
        ...options,
        requireAuth: options.requireAuth !== false,
      });

      if (!securityResult.success) {
        return {
          success: false,
          error: securityResult.error,
          requestId,
        };
      }

      // 执行插入
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select();

      if (error) {
        return {
          success: false,
          error: error.message,
          requestId,
        };
      }

      return {
        success: true,
        data: result as T[],
        requestId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "插入失败",
      };
    }
  }
}

export const supabaseSecureClient = new SupabaseSecureClient();