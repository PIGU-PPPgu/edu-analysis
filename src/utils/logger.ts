/**
 * 日志工具
 * 提供统一的日志记录功能
 */

// 是否启用调试模式
let debugMode = false;

/**
 * 设置调试模式
 * @param enable 是否启用
 */
export function setDebugMode(enable: boolean) {
  debugMode = enable;
}

/**
 * 记录信息日志
 * @param message 日志消息
 * @param data 附加数据
 */
export function logInfo(message: string, data?: any) {
  if (!debugMode) return;

  console.log(`[INFO] ${message}`);
  if (data !== undefined) {
    console.log(
      typeof data === "string" ? data : JSON.stringify(data, null, 2)
    );
  }
}

/**
 * 记录错误日志
 * @param message 错误消息
 * @param error 错误对象或数据
 */
export function logError(message: string, error?: any) {
  console.error(`[ERROR] ${message}`);

  if (error) {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(
        typeof error === "string" ? error : JSON.stringify(error, null, 2)
      );
    }
  }
}

/**
 * 记录警告日志
 * @param message 警告消息
 * @param data 附加数据
 */
export function logWarn(message: string, data?: any) {
  console.warn(`[WARN] ${message}`);
  if (data !== undefined) {
    console.warn(
      typeof data === "string" ? data : JSON.stringify(data, null, 2)
    );
  }
}

/**
 * 记录警告日志
 * @param message 警告消息
 * @param data 附加数据
 */
export function logWarning(message: string, data?: any) {
  console.warn(`[WARNING] ${message}`);

  if (data !== undefined) {
    console.warn(
      typeof data === "string" ? data : JSON.stringify(data, null, 2)
    );
  }
}

/**
 * 记录API请求日志
 * @param url API地址
 * @param method 请求方法
 * @param data 请求数据
 */
export function logApiRequest(url: string, method: string, data?: any) {
  if (!debugMode) return;

  console.log(`[API请求] ${method} ${url}`);
  if (data) {
    // 过滤敏感信息
    const sanitizedData = typeof data === "object" ? sanitizeData(data) : data;
    console.log(
      typeof sanitizedData === "string"
        ? sanitizedData
        : JSON.stringify(sanitizedData, null, 2)
    );
  }
}

/**
 * 记录API响应日志
 * @param url API地址
 * @param status 状态码
 * @param data 响应数据
 */
export function logApiResponse(url: string, status: number, data?: any) {
  if (!debugMode) return;

  console.log(`[API响应] ${status} ${url}`);
  if (data) {
    console.log(
      typeof data === "string" ? data : JSON.stringify(data, null, 2)
    );
  }
}

/**
 * 过滤敏感信息
 * @param data 原始数据
 * @returns 过滤后的数据
 */
function sanitizeData(data: Record<string, any>) {
  const result = { ...data };

  const sensitiveKeys = [
    "apiKey",
    "api_key",
    "key",
    "password",
    "token",
    "authorization",
    "Authorization",
  ];

  for (const key of Object.keys(result)) {
    if (sensitiveKeys.includes(key)) {
      result[key] = "******";
    } else if (typeof result[key] === "object" && result[key] !== null) {
      result[key] = sanitizeData(result[key]);
    }
  }

  return result;
}
