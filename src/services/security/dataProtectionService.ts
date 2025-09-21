/**
 * 数据保护服务 - 数据加密、脱敏和安全存储
 *
 * 功能：
 * - 敏感数据加密/解密
 * - 数据脱敏处理
 * - 安全日志记录
 * - 数据访问审计
 */

import { logError, logInfo } from "@/utils/logger";
import CryptoJS from 'crypto-js';

export interface SensitiveDataConfig {
  field: string;
  type: 'phone' | 'email' | 'idCard' | 'name' | 'address' | 'custom';
  maskingRule?: string;
  encryptionLevel: 'none' | 'basic' | 'strong';
}

export interface DataAccessContext {
  userId: string;
  userRoles: string[];
  resource: string;
  action: string;
  sensitiveFields: string[];
  requestIp?: string;
  userAgent?: string;
}

export interface MaskedData {
  [key: string]: any;
  __masked_fields?: string[];
}

/**
 * 数据保护服务类
 */
export class DataProtectionService {
  private readonly encryptionKey: string;
  private readonly auditLog: Array<{
    timestamp: string;
    userId: string;
    resource: string;
    action: string;
    sensitiveFields: string[];
    success: boolean;
    ip?: string;
  }> = [];

  // 敏感数据配置
  private readonly sensitiveFieldConfigs: Record<string, SensitiveDataConfig> = {
    phone: {
      field: 'phone',
      type: 'phone',
      maskingRule: '${first3}****${last4}',
      encryptionLevel: 'basic',
    },
    contact_phone: {
      field: 'contact_phone',
      type: 'phone',
      maskingRule: '${first3}****${last4}',
      encryptionLevel: 'basic',
    },
    email: {
      field: 'email',
      type: 'email',
      maskingRule: '${first3}****@${domain}',
      encryptionLevel: 'basic',
    },
    contact_email: {
      field: 'contact_email',
      type: 'email',
      maskingRule: '${first3}****@${domain}',
      encryptionLevel: 'basic',
    },
    student_id: {
      field: 'student_id',
      type: 'idCard',
      maskingRule: '${first4}****${last2}',
      encryptionLevel: 'none',
    },
    name: {
      field: 'name',
      type: 'name',
      maskingRule: '${first1}**',
      encryptionLevel: 'none',
    },
    full_name: {
      field: 'full_name',
      type: 'name',
      maskingRule: '${first1}**',
      encryptionLevel: 'none',
    },
  };

  constructor() {
    // 在生产环境中，这应该从环境变量或安全配置中获取
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    if (this.encryptionKey === 'default-key-change-in-production') {
      console.warn('⚠️ 使用默认加密密钥，生产环境中请设置 DATA_ENCRYPTION_KEY 环境变量');
    }
  }

  /**
   * 根据用户权限处理敏感数据
   */
  async processDataByPermissions(
    data: any[] | any,
    context: DataAccessContext
  ): Promise<MaskedData[] | MaskedData> {
    try {
      logInfo("处理敏感数据", {
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        dataCount: Array.isArray(data) ? data.length : 1,
      });

      const isArray = Array.isArray(data);
      const dataArray = isArray ? data : [data];
      const processedData: MaskedData[] = [];

      for (const item of dataArray) {
        const processedItem = await this.processDataItem(item, context);
        processedData.push(processedItem);
      }

      // 记录访问审计
      this.recordDataAccess(context, true);

      return isArray ? processedData : processedData[0];
    } catch (error) {
      logError("敏感数据处理失败", { context, error });
      this.recordDataAccess(context, false);
      throw error;
    }
  }

  /**
   * 处理单个数据项
   */
  private async processDataItem(
    item: any,
    context: DataAccessContext
  ): Promise<MaskedData> {
    const processedItem: MaskedData = { ...item };
    const maskedFields: string[] = [];

    // 检查是否需要脱敏处理
    const needsMasking = await this.shouldMaskData(context);

    for (const [fieldName, fieldConfig] of Object.entries(this.sensitiveFieldConfigs)) {
      if (item.hasOwnProperty(fieldName) && item[fieldName] != null) {
        if (needsMasking && this.shouldMaskField(fieldName, context)) {
          // 需要脱敏
          processedItem[fieldName] = this.maskField(item[fieldName], fieldConfig);
          maskedFields.push(fieldName);
        } else if (fieldConfig.encryptionLevel !== 'none') {
          // 需要解密（如果数据是加密存储的）
          try {
            const decrypted = this.decryptData(item[fieldName]);
            if (decrypted !== item[fieldName]) {
              processedItem[fieldName] = decrypted;
            }
          } catch (error) {
            // 解密失败，可能数据未加密，保持原样
            logError("解密数据失败", { fieldName, error });
          }
        }
      }
    }

    if (maskedFields.length > 0) {
      processedItem.__masked_fields = maskedFields;
    }

    return processedItem;
  }

  /**
   * 判断是否应该对数据进行脱敏
   */
  private async shouldMaskData(context: DataAccessContext): Promise<boolean> {
    const { userRoles, resource, action } = context;

    // 管理员不需要脱敏
    if (userRoles.includes('admin')) {
      return false;
    }

    // 教师查看自己班级的学生数据不需要脱敏
    if (userRoles.includes('teacher') && resource === 'students' && action === 'read') {
      // TODO: 这里应该验证教师是否有权限访问特定班级
      return false;
    }

    // 用户查看自己的数据不需要脱敏
    if (action === 'read_own') {
      return false;
    }

    // 其他情况需要脱敏
    return true;
  }

  /**
   * 判断特定字段是否需要脱敏
   */
  private shouldMaskField(fieldName: string, context: DataAccessContext): boolean {
    // 如果明确指定了需要访问的敏感字段，则不脱敏
    if (context.sensitiveFields.includes(fieldName)) {
      return false;
    }

    return true;
  }

  /**
   * 对字段进行脱敏处理
   */
  private maskField(value: string, config: SensitiveDataConfig): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    switch (config.type) {
      case 'phone':
        return this.maskPhone(value);
      case 'email':
        return this.maskEmail(value);
      case 'idCard':
        return this.maskIdCard(value);
      case 'name':
        return this.maskName(value);
      default:
        return this.maskGeneric(value);
    }
  }

  /**
   * 手机号脱敏
   */
  private maskPhone(phone: string): string {
    if (phone.length < 7) return phone;
    const first3 = phone.substring(0, 3);
    const last4 = phone.substring(phone.length - 4);
    return `${first3}****${last4}`;
  }

  /**
   * 邮箱脱敏
   */
  private maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex < 0 || atIndex < 3) return email;
    
    const first3 = email.substring(0, 3);
    const domain = email.substring(atIndex);
    return `${first3}****${domain}`;
  }

  /**
   * 身份证/学号脱敏
   */
  private maskIdCard(idCard: string): string {
    if (idCard.length < 6) return idCard;
    const first4 = idCard.substring(0, 4);
    const last2 = idCard.substring(idCard.length - 2);
    return `${first4}****${last2}`;
  }

  /**
   * 姓名脱敏
   */
  private maskName(name: string): string {
    if (name.length <= 1) return name;
    const first = name.substring(0, 1);
    const masked = '*'.repeat(name.length - 1);
    return `${first}${masked}`;
  }

  /**
   * 通用脱敏
   */
  private maskGeneric(value: string): string {
    if (value.length <= 3) return value;
    const first = value.substring(0, 1);
    const last = value.substring(value.length - 1);
    const middle = '*'.repeat(Math.max(0, value.length - 2));
    return `${first}${middle}${last}`;
  }

  /**
   * 加密数据
   */
  encryptData(plainText: string, level: 'basic' | 'strong' = 'basic'): string {
    try {
      if (level === 'strong') {
        // 使用更强的加密算法
        return CryptoJS.AES.encrypt(plainText, this.encryptionKey).toString();
      } else {
        // 基本加密
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(plainText));
      }
    } catch (error) {
      logError("数据加密失败", { error });
      return plainText;
    }
  }

  /**
   * 解密数据
   */
  decryptData(encryptedText: string, level: 'basic' | 'strong' = 'basic'): string {
    try {
      if (level === 'strong') {
        // 解密强加密数据
        const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8);
      } else {
        // 解密基本加密数据
        return CryptoJS.enc.Base64.parse(encryptedText).toString(CryptoJS.enc.Utf8);
      }
    } catch (error) {
      // 解密失败，可能数据未加密，返回原文
      return encryptedText;
    }
  }

  /**
   * 批量加密敏感字段
   */
  async encryptSensitiveFields(data: Record<string, any>): Promise<Record<string, any>> {
    const encryptedData = { ...data };

    for (const [fieldName, fieldConfig] of Object.entries(this.sensitiveFieldConfigs)) {
      if (data.hasOwnProperty(fieldName) && data[fieldName] != null && fieldConfig.encryptionLevel !== 'none') {
        try {
          encryptedData[fieldName] = this.encryptData(
            data[fieldName].toString(),
            fieldConfig.encryptionLevel as 'basic' | 'strong'
          );
        } catch (error) {
          logError("字段加密失败", { fieldName, error });
        }
      }
    }

    return encryptedData;
  }

  /**
   * 批量解密敏感字段
   */
  async decryptSensitiveFields(data: Record<string, any>): Promise<Record<string, any>> {
    const decryptedData = { ...data };

    for (const [fieldName, fieldConfig] of Object.entries(this.sensitiveFieldConfigs)) {
      if (data.hasOwnProperty(fieldName) && data[fieldName] != null && fieldConfig.encryptionLevel !== 'none') {
        try {
          decryptedData[fieldName] = this.decryptData(
            data[fieldName],
            fieldConfig.encryptionLevel as 'basic' | 'strong'
          );
        } catch (error) {
          logError("字段解密失败", { fieldName, error });
        }
      }
    }

    return decryptedData;
  }

  /**
   * 记录数据访问审计
   */
  private recordDataAccess(context: DataAccessContext, success: boolean): void {
    const auditRecord = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      resource: context.resource,
      action: context.action,
      sensitiveFields: context.sensitiveFields,
      success,
      ip: context.requestIp,
    };

    this.auditLog.push(auditRecord);

    // 记录到日志系统
    logInfo("数据访问审计", auditRecord);

    // 保持审计日志大小在合理范围内
    if (this.auditLog.length > 10000) {
      this.auditLog.splice(0, 1000); // 删除最旧的1000条记录
    }
  }

  /**
   * 获取数据访问审计日志
   */
  getAuditLog(userId?: string, resource?: string): typeof this.auditLog {
    let filteredLog = this.auditLog;

    if (userId) {
      filteredLog = filteredLog.filter(log => log.userId === userId);
    }

    if (resource) {
      filteredLog = filteredLog.filter(log => log.resource === resource);
    }

    return filteredLog.slice(-1000); // 返回最近1000条记录
  }

  /**
   * 清理敏感数据（用于日志等）
   */
  sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const [fieldName, fieldConfig] of Object.entries(this.sensitiveFieldConfigs)) {
      if (sanitized.hasOwnProperty(fieldName)) {
        sanitized[fieldName] = this.maskField(sanitized[fieldName], fieldConfig);
      }
    }

    return sanitized;
  }

  /**
   * 检查数据完整性
   */
  verifyDataIntegrity(originalData: any, processedData: any): boolean {
    try {
      // 简单的完整性检查：比较非敏感字段
      const nonSensitiveFields = Object.keys(originalData).filter(
        key => !this.sensitiveFieldConfigs.hasOwnProperty(key)
      );

      for (const field of nonSensitiveFields) {
        if (originalData[field] !== processedData[field]) {
          logError("数据完整性检查失败", { field });
          return false;
        }
      }

      return true;
    } catch (error) {
      logError("数据完整性检查异常", { error });
      return false;
    }
  }

  /**
   * 添加自定义敏感字段配置
   */
  addSensitiveFieldConfig(fieldName: string, config: SensitiveDataConfig): void {
    this.sensitiveFieldConfigs[fieldName] = {
      ...config,
      field: fieldName,
    };

    logInfo("添加敏感字段配置", { fieldName, config });
  }

  /**
   * 获取当前敏感字段配置
   */
  getSensitiveFieldConfigs(): Record<string, SensitiveDataConfig> {
    return { ...this.sensitiveFieldConfigs };
  }
}

// 导出服务实例
export const dataProtectionService = new DataProtectionService();