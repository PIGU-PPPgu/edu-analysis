/**
 * 安全工具函数 - 输入验证、XSS防护和安全检查
 *
 * 功能：
 * - 输入验证和清理
 * - XSS防护
 * - SQL注入防护
 * - 文件上传安全检查
 * - 密码强度验证
 */

import { logWarn } from "@/utils/logger";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  mimeType?: string;
  size?: number;
}

/**
 * 输入验证和清理工具类
 */
export class SecurityUtils {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
  ];

  private static readonly SQL_PATTERNS = [
    /(\b(select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\bunion\b.*\bselect\b)/gi,
    /(;.*--)/gi,
    /(\b(or|and)\b.*=.*)/gi,
    /('.*;\s*(drop|delete|update|insert).*)/gi,
  ];

  private static readonly ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  };

  /**
   * 验证和清理字符串输入
   */
  static validateAndSanitizeInput(
    input: string,
    options: {
      maxLength?: number;
      minLength?: number;
      allowHtml?: boolean;
      allowSpecialChars?: boolean;
      pattern?: RegExp;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    let sanitized = input?.toString().trim() || '';

    // 长度检查
    if (options.minLength && sanitized.length < options.minLength) {
      errors.push(`输入长度不能少于${options.minLength}字符`);
    }

    if (options.maxLength && sanitized.length > options.maxLength) {
      errors.push(`输入长度不能超过${options.maxLength}字符`);
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // XSS检查和清理
    if (!options.allowHtml) {
      const hasXSS = this.XSS_PATTERNS.some(pattern => pattern.test(sanitized));
      if (hasXSS) {
        errors.push('输入包含不安全的HTML代码');
        logWarn('检测到潜在XSS攻击', { input: sanitized.substring(0, 100) });
      }
      // 转义HTML字符
      sanitized = this.escapeHtml(sanitized);
    }

    // SQL注入检查
    const hasSQLInjection = this.SQL_PATTERNS.some(pattern => pattern.test(sanitized));
    if (hasSQLInjection) {
      errors.push('输入包含潜在的危险字符');
      logWarn('检测到潜在SQL注入', { input: sanitized.substring(0, 100) });
    }

    // 特殊字符检查
    if (!options.allowSpecialChars) {
      const specialChars = /[<>\"'&%\x00-\x1f\x7f-\x9f]/;
      if (specialChars.test(sanitized)) {
        errors.push('输入包含不允许的特殊字符');
        sanitized = sanitized.replace(specialChars, '');
      }
    }

    // 自定义模式验证
    if (options.pattern && !options.pattern.test(sanitized)) {
      errors.push('输入格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * 转义HTML字符
   */
  static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * 验证邮箱格式
   */
  static validateEmail(email: string): ValidationResult {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: string[] = [];

    const baseValidation = this.validateAndSanitizeInput(email, {
      maxLength: 254,
      minLength: 5,
      allowSpecialChars: true,
      pattern: emailPattern,
    });

    if (!baseValidation.isValid) {
      errors.push(...baseValidation.errors);
    }

    // 额外的邮箱安全检查
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      errors.push('邮箱格式不正确');
    }

    // 检查常见的恶意邮箱模式
    const suspiciousPatterns = [
      /admin@/i,
      /noreply@/i,
      /test@/i,
      /.*\+.*@.*/, // 可能的邮箱绕过
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(email));
    if (isSuspicious) {
      logWarn('可疑邮箱地址', { email });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: baseValidation.sanitized,
    };
  }

  /**
   * 验证手机号格式
   */
  static validatePhone(phone: string): ValidationResult {
    const phonePattern = /^1[3-9]\d{9}$/;
    const errors: string[] = [];

    const sanitized = phone.replace(/\D/g, ''); // 移除所有非数字字符

    if (!phonePattern.test(sanitized)) {
      errors.push('手机号格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * 验证密码强度
   */
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    const minLength = 8;

    if (password.length < minLength) {
      errors.push(`密码长度不能少于${minLength}位`);
    }

    if (password.length > 128) {
      errors.push('密码长度不能超过128位');
    }

    // 密码强度检查
    const patterns = {
      lowercase: /[a-z]/,
      uppercase: /[A-Z]/,
      number: /\d/,
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    };

    const patternCount = Object.values(patterns).reduce(
      (count, pattern) => count + (pattern.test(password) ? 1 : 0),
      0
    );

    if (patternCount < 3) {
      errors.push('密码应包含大小写字母、数字和特殊字符中的至少3种');
    }

    // 检查常见弱密码
    const weakPasswords = [
      '12345678',
      'password',
      'qwerty123',
      '11111111',
      'abc123456',
      '88888888',
      'password123',
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('不能使用常见弱密码');
    }

    // 检查重复字符
    const repeatingPattern = /(.)\1{3,}/;
    if (repeatingPattern.test(password)) {
      errors.push('密码不能包含连续重复的字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证文件上传安全性
   */
  static validateFile(
    file: File,
    options: {
      allowedTypes?: keyof typeof SecurityUtils.ALLOWED_FILE_TYPES | 'all';
      maxSize?: number; // bytes
      minSize?: number; // bytes
    } = {}
  ): FileValidationResult {
    const errors: string[] = [];
    const { allowedTypes = 'all', maxSize = 10 * 1024 * 1024, minSize = 0 } = options;

    // 文件大小检查
    if (file.size > maxSize) {
      errors.push(`文件大小不能超过${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    if (file.size < minSize) {
      errors.push(`文件大小不能少于${minSize}字节`);
    }

    // 文件类型检查
    if (allowedTypes !== 'all') {
      const allowedMimes = this.ALLOWED_FILE_TYPES[allowedTypes];
      if (!allowedMimes.includes(file.type)) {
        errors.push(`不支持的文件类型: ${file.type}`);
      }
    }

    // 文件名安全检查
    const fileNameValidation = this.validateAndSanitizeInput(file.name, {
      maxLength: 255,
      allowSpecialChars: false,
    });

    if (!fileNameValidation.isValid) {
      errors.push('文件名包含不安全字符');
    }

    // 检查危险文件扩展名
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.jsp', '.sh', '.pl', '.py', '.rb',
    ];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push('不允许上传可执行文件');
      logWarn('尝试上传危险文件', { filename: file.name, type: file.type });
    }

    return {
      isValid: errors.length === 0,
      errors,
      mimeType: file.type,
      size: file.size,
    };
  }

  /**
   * 生成安全的随机字符串
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // 使用Web Crypto API (浏览器环境)
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // 降级到Math.random (不够安全，仅用于开发)
      console.warn('使用不安全的随机数生成器，请在生产环境中使用Web Crypto API');
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  /**
   * 验证URL安全性
   */
  static validateUrl(url: string): ValidationResult {
    const errors: string[] = [];

    try {
      const parsedUrl = new URL(url);
      
      // 协议检查
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        errors.push('不支持的URL协议');
      }

      // 域名检查
      const suspiciousDomains = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
      ];

      if (suspiciousDomains.some(domain => parsedUrl.hostname.includes(domain))) {
        errors.push('不允许访问本地地址');
      }

      // IP地址检查
      const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (ipPattern.test(parsedUrl.hostname)) {
        const parts = parsedUrl.hostname.split('.').map(Number);
        // 检查私有IP范围
        if (
          (parts[0] === 10) ||
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168)
        ) {
          errors.push('不允许访问私有IP地址');
        }
      }

    } catch (error) {
      errors.push('URL格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: url,
    };
  }

  /**
   * 安全的JSON解析
   */
  static safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
      // 检查JSON字符串是否包含潜在危险内容
      if (jsonString.includes('__proto__') || jsonString.includes('constructor')) {
        logWarn('检测到可能的原型污染攻击', { jsonString: jsonString.substring(0, 100) });
        return fallback;
      }

      const parsed = JSON.parse(jsonString);
      
      // 验证解析结果
      if (typeof parsed === 'object' && parsed !== null) {
        this.sanitizeObject(parsed);
      }

      return parsed;
    } catch (error) {
      logWarn('JSON解析失败', { error, jsonString: jsonString.substring(0, 100) });
      return fallback;
    }
  }

  /**
   * 清理对象中的危险属性
   */
  private static sanitizeObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    
    for (const key of dangerousKeys) {
      if (key in obj) {
        delete obj[key];
        logWarn('删除危险属性', { key });
      }
    }

    // 递归清理子对象
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        this.sanitizeObject(obj[key]);
      }
    }
  }
}

// 便捷的导出函数
export const {
  validateAndSanitizeInput,
  escapeHtml,
  validateEmail,
  validatePhone,
  validatePassword,
  validateFile,
  generateSecureToken,
  validateUrl,
  safeJsonParse,
} = SecurityUtils;