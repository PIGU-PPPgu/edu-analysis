/**
 * 统一错误处理机制
 * 提供标准化的错误处理、日志记录和用户友好的错误消息
 */

import { toast } from "sonner";
import {
  NotificationManager,
  NotificationPriority,
} from "./NotificationManager";

// 错误类型枚举
export enum ErrorType {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  SERVER = "server",
  CLIENT = "client",
  TIMEOUT = "timeout",
  NOT_FOUND = "not_found",
  CONFLICT = "conflict",
  RATE_LIMIT = "rate_limit",
  UNKNOWN = "unknown",
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// 标准化错误接口
export interface StandardError {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  context?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
  httpStatus?: number;
  originalError?: any;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: StandardError;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

// HTTP状态码错误映射
const HTTP_ERROR_MAPPINGS: Record<
  number,
  { type: ErrorType; severity: ErrorSeverity; userMessage: string }
> = {
  400: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "请求参数有误，请检查输入",
  },
  401: {
    type: ErrorType.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    userMessage: "请先登录账户",
  },
  403: {
    type: ErrorType.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    userMessage: "权限不足，无法执行此操作",
  },
  404: {
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "请求的资源不存在",
  },
  409: {
    type: ErrorType.CONFLICT,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "数据冲突，请刷新后重试",
  },
  429: {
    type: ErrorType.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "操作过于频繁，请稍后重试",
  },
  500: {
    type: ErrorType.SERVER,
    severity: ErrorSeverity.HIGH,
    userMessage: "服务器错误，请联系管理员",
  },
  502: {
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.HIGH,
    userMessage: "网络连接异常，请稍后重试",
  },
  503: {
    type: ErrorType.SERVER,
    severity: ErrorSeverity.HIGH,
    userMessage: "服务暂时不可用，请稍后重试",
  },
  504: {
    type: ErrorType.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "请求超时，请稍后重试",
  },
};

// Supabase和业务错误映射
const BUSINESS_ERROR_MAPPINGS: Record<
  string,
  {
    type: ErrorType;
    severity: ErrorSeverity;
    userMessage: string;
    suggestions?: string[];
  }
> = {
  // Supabase相关错误
  PGRST301: {
    type: ErrorType.SERVER,
    severity: ErrorSeverity.HIGH,
    userMessage: "数据库连接异常，请检查网络连接后重试",
    suggestions: ["检查网络连接", "刷新页面重试", "联系技术支持"],
  },
  PGRST116: {
    type: ErrorType.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "数据访问权限不足，请联系管理员",
    suggestions: ["联系系统管理员获取权限", "确认登录状态"],
  },
  "23505": {
    type: ErrorType.CONFLICT,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "数据重复，请检查是否已存在相同记录",
    suggestions: ["检查重复数据", "修改后重试", "联系管理员"],
  },
  "23503": {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "数据关联检查失败，请确认相关数据是否存在",
    suggestions: ["检查关联数据是否存在", "先创建依赖数据", "联系管理员"],
  },
  "23502": {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "缺少必填信息",
    suggestions: ["检查必填字段", "补充缺失信息", "重新提交"],
  },

  // 文件处理相关错误
  FILE_TOO_LARGE: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: "文件过大，请选择小于10MB的文件",
    suggestions: ["选择更小的文件", "压缩文件后重试"],
  },
  FILE_FORMAT_INVALID: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: "文件格式不支持，请选择Excel或CSV文件",
    suggestions: [
      "使用Excel(.xlsx/.xls)文件",
      "使用CSV文件",
      "检查文件是否损坏",
    ],
  },

  // 导入相关错误
  IMPORT_DUPLICATE: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: "数据中存在重复记录",
    suggestions: ["检查并删除重复记录", "使用数据清理工具"],
  },
  IMPORT_MISSING_FIELDS: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "缺少必需的数据字段",
    suggestions: ["确保包含姓名和成绩字段", "检查字段映射是否正确"],
  },

  // 业务逻辑错误
  CLASS_NOT_FOUND: {
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "找不到指定的班级",
    suggestions: ["检查班级名称是否正确", "刷新页面重试"],
  },
  STUDENT_NOT_FOUND: {
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "找不到指定的学生",
    suggestions: ["检查学生信息是否正确", "确认学生是否已注册"],
  },
  GRADE_DATA_INVALID: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: "成绩数据格式不正确",
    suggestions: ["检查成绩格式", "确保数据为数字类型", "参考数据模板"],
  },
};

// 默认错误信息
const DEFAULT_ERROR_INFO = {
  type: ErrorType.UNKNOWN,
  severity: ErrorSeverity.MEDIUM,
  userMessage: "操作失败，请稍后重试",
};

class ErrorHandler {
  private requestIdCounter = 0;

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * 处理错误并返回标准化错误对象
   */
  handle(error: any, context?: Record<string, any>): StandardError {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    // 如果已经是标准化错误，直接返回
    if (this.isStandardError(error)) {
      return error;
    }

    let standardError: StandardError;

    try {
      if (error?.response) {
        // HTTP响应错误
        const status = error.response.status;
        const errorInfo = HTTP_ERROR_MAPPINGS[status] || DEFAULT_ERROR_INFO;

        standardError = {
          type: errorInfo.type,
          severity: errorInfo.severity,
          code: `HTTP_${status}`,
          message:
            error.response.data?.message ||
            error.message ||
            `HTTP ${status} Error`,
          userMessage: errorInfo.userMessage,
          context: {
            ...context,
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
            headers: error.response.headers,
          },
          timestamp,
          requestId,
          retryable: this.isRetryable(status),
          httpStatus: status,
          originalError: error,
        };
      } else if (error?.code && BUSINESS_ERROR_MAPPINGS[error.code]) {
        // Supabase和业务错误
        const errorInfo = BUSINESS_ERROR_MAPPINGS[error.code];

        standardError = {
          type: errorInfo.type,
          severity: errorInfo.severity,
          code: error.code,
          message:
            error.message || error.details || `Business error: ${error.code}`,
          userMessage: errorInfo.userMessage,
          context: {
            ...context,
            details: error.details,
            hint: error.hint,
            suggestions: errorInfo.suggestions,
          },
          timestamp,
          requestId,
          retryable: this.isRetryableBusinessError(error.code),
          originalError: error,
        };
      } else if (
        error?.name === "NetworkError" ||
        error?.code === "NETWORK_ERROR"
      ) {
        // 网络错误
        standardError = {
          type: ErrorType.NETWORK,
          severity: ErrorSeverity.HIGH,
          code: "NETWORK_ERROR",
          message: error.message || "Network error occurred",
          userMessage: "网络连接失败，请检查网络状态",
          context,
          timestamp,
          requestId,
          retryable: true,
          originalError: error,
        };
      } else if (
        error?.name === "TimeoutError" ||
        error?.code === "ECONNABORTED"
      ) {
        // 超时错误
        standardError = {
          type: ErrorType.TIMEOUT,
          severity: ErrorSeverity.MEDIUM,
          code: "TIMEOUT_ERROR",
          message: error.message || "Request timeout",
          userMessage: "请求超时，请稍后重试",
          context,
          timestamp,
          requestId,
          retryable: true,
          originalError: error,
        };
      } else if (typeof error === "string") {
        // 字符串错误
        standardError = {
          type: ErrorType.CLIENT,
          severity: ErrorSeverity.MEDIUM,
          code: "STRING_ERROR",
          message: error,
          userMessage: error,
          context,
          timestamp,
          requestId,
          retryable: false,
          originalError: error,
        };
      } else if (error instanceof Error) {
        // 普通Error对象
        standardError = {
          type: ErrorType.CLIENT,
          severity: ErrorSeverity.MEDIUM,
          code: error.name || "UNKNOWN_ERROR",
          message: error.message,
          userMessage: "操作过程中发生错误",
          context: {
            ...context,
            stack: error.stack,
          },
          timestamp,
          requestId,
          retryable: false,
          originalError: error,
        };
      } else {
        // 未知错误
        standardError = {
          type: ErrorType.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          code: "UNKNOWN_ERROR",
          message: JSON.stringify(error) || "Unknown error occurred",
          userMessage: "发生未知错误，请联系技术支持",
          context,
          timestamp,
          requestId,
          retryable: false,
          originalError: error,
        };
      }
    } catch (processingError) {
      // 处理错误时发生的错误
      console.error("Error processing error:", processingError);
      standardError = {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.CRITICAL,
        code: "ERROR_PROCESSING_ERROR",
        message: "Failed to process error",
        userMessage: "系统错误处理异常，请联系技术支持",
        context,
        timestamp,
        requestId,
        retryable: false,
        originalError: error,
      };
    }

    // 记录错误日志
    this.logError(standardError);

    return standardError;
  }

  /**
   * 检查是否为标准化错误
   */
  private isStandardError(error: any): error is StandardError {
    return (
      error &&
      typeof error.type === "string" &&
      typeof error.severity === "string" &&
      typeof error.code === "string" &&
      typeof error.message === "string" &&
      typeof error.userMessage === "string" &&
      typeof error.timestamp === "string" &&
      typeof error.retryable === "boolean"
    );
  }

  /**
   * 判断HTTP错误是否可重试
   */
  private isRetryable(status?: number): boolean {
    if (!status) return false;

    // 网络错误、服务器错误、超时等可重试
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * 判断业务错误是否可重试
   */
  private isRetryableBusinessError(errorCode: string): boolean {
    // 网络和服务器相关错误可重试
    const retryableCodes = ["PGRST301", "NETWORK_ERROR", "TIMEOUT_ERROR"];
    return retryableCodes.includes(errorCode);
  }

  /**
   * 记录错误日志
   */
  private logError(error: StandardError): void {
    const logData = {
      ...error,
      // 移除原始错误对象避免循环引用
      originalError: error.originalError
        ? {
            name: error.originalError.name,
            message: error.originalError.message,
            stack: error.originalError.stack,
          }
        : undefined,
    };

    // 根据严重程度选择日志级别
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error("[CRITICAL ERROR]", logData);
        break;
      case ErrorSeverity.HIGH:
        console.error("[HIGH ERROR]", logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn("[MEDIUM ERROR]", logData);
        break;
      case ErrorSeverity.LOW:
        console.info("[LOW ERROR]", logData);
        break;
      default:
        console.log("[ERROR]", logData);
    }

    // 在生产环境可以发送到错误监控服务
    // 例如: Sentry, LogRocket, etc.
    if (
      process.env.NODE_ENV === "production" &&
      error.severity === ErrorSeverity.CRITICAL
    ) {
      // this.sendToMonitoringService(error);
    }
  }

  /**
   * 显示用户友好的错误提示
   */
  showUserError(error: StandardError): void {
    const suggestions = error.context?.suggestions as string[] | undefined;
    const details = error.context?.details;

    const options: any = {
      description: details || undefined,
      duration:
        error.severity === ErrorSeverity.CRITICAL
          ? 0
          : this.getToastDuration(error.severity),
      action: this.createToastAction(error, suggestions),
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        toast.error(error.userMessage, options);
        break;
      case ErrorSeverity.HIGH:
        toast.error(error.userMessage, options);
        break;
      case ErrorSeverity.MEDIUM:
        toast.warning(error.userMessage, options);
        break;
      case ErrorSeverity.LOW:
        toast.info(error.userMessage, options);
        break;
    }
  }

  /**
   * 使用 NotificationManager 显示错误提示 (推荐方法)
   * 自动去重和优先级管理
   */
  showUserErrorWithManager(
    error: StandardError,
    options?: { silent?: boolean }
  ): void {
    const suggestions = error.context?.suggestions as string[] | undefined;
    const details = error.context?.details;

    const priority = this.mapSeverityToPriority(error.severity);

    const notificationOptions = {
      priority,
      duration: this.getToastDuration(error.severity),
      description: details || undefined,
      action: this.createToastAction(error, suggestions),
      silent: options?.silent,
      deduplicate: true,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        NotificationManager.critical(error.userMessage, notificationOptions);
        break;
      case ErrorSeverity.HIGH:
        NotificationManager.error(error.userMessage, notificationOptions);
        break;
      case ErrorSeverity.MEDIUM:
        NotificationManager.warning(error.userMessage, notificationOptions);
        break;
      case ErrorSeverity.LOW:
        NotificationManager.info(error.userMessage, notificationOptions);
        break;
    }
  }

  /**
   * 映射错误严重程度到通知优先级
   */
  private mapSeverityToPriority(severity: ErrorSeverity): NotificationPriority {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return NotificationPriority.CRITICAL;
      case ErrorSeverity.HIGH:
        return NotificationPriority.ERROR;
      case ErrorSeverity.MEDIUM:
        return NotificationPriority.WARNING;
      case ErrorSeverity.LOW:
        return NotificationPriority.INFO;
      default:
        return NotificationPriority.INFO;
    }
  }

  /**
   * 获取Toast持续时间
   */
  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 0; // 不自动关闭
      case ErrorSeverity.HIGH:
        return 8000;
      case ErrorSeverity.MEDIUM:
        return 6000;
      case ErrorSeverity.LOW:
        return 4000;
      default:
        return 5000;
    }
  }

  /**
   * 创建Toast操作按钮
   */
  private createToastAction(error: StandardError, suggestions?: string[]): any {
    if (error.severity === ErrorSeverity.CRITICAL) {
      return {
        label: "联系支持",
        onClick: () => this.contactSupport(error),
      };
    }

    if (suggestions && suggestions.length > 0) {
      return {
        label: "解决建议",
        onClick: () => this.showSuggestions(suggestions, error.userMessage),
      };
    }

    if (error.retryable) {
      return {
        label: "重试",
        onClick: () => this.showRetryInfo(error),
      };
    }

    return undefined;
  }

  /**
   * 显示解决建议
   */
  private showSuggestions(suggestions: string[], title: string): void {
    const suggestionText = suggestions
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");

    toast.info("💡 解决建议", {
      description: suggestionText,
      duration: 10000,
    });
  }

  /**
   * 显示重试信息
   */
  private showRetryInfo(error: StandardError): void {
    toast.info("🔄 重试提示", {
      description: "这个错误通常是临时的，您可以稍后重试相同的操作",
      duration: 5000,
    });
  }

  /**
   * 联系技术支持
   */
  private contactSupport(error: StandardError): void {
    // 实现联系支持的逻辑
    const mailto = `mailto:support@example.com?subject=错误报告&body=错误ID: ${error.requestId}%0A错误时间: ${error.timestamp}%0A错误详情: ${error.message}`;
    window.open(mailto);
  }

  /**
   * 创建成功响应
   */
  createSuccessResponse<T>(
    data: T,
    message?: string,
    meta?: Record<string, any>
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message: message || "Operation completed successfully",
      meta,
    };
  }

  /**
   * 创建错误响应
   */
  createErrorResponse(error: StandardError): ApiResponse {
    return {
      success: false,
      error,
    };
  }
}

// 导出单例
export const errorHandler = new ErrorHandler();

// 导出便捷函数
export const handleError = (
  error: any,
  context?: Record<string, any>
): StandardError => {
  return errorHandler.handle(error, context);
};

export const showError = (error: any, context?: Record<string, any>): void => {
  const standardError = errorHandler.handle(error, context);
  errorHandler.showUserError(standardError);
};

// 使用 NotificationManager 显示错误 (推荐)
export const showErrorSmart = (
  error: any,
  context?: Record<string, any>,
  options?: { silent?: boolean }
): void => {
  const standardError = errorHandler.handle(error, context);
  errorHandler.showUserErrorWithManager(standardError, options);
};

export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): ApiResponse<T> => {
  return errorHandler.createSuccessResponse(data, message, meta);
};

export const createErrorResponse = (
  error: any,
  context?: Record<string, any>
): ApiResponse => {
  const standardError = errorHandler.handle(error, context);
  return errorHandler.createErrorResponse(standardError);
};
