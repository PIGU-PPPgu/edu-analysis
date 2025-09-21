/**
 * 🎯 成绩数据校验服务 (GradeDataValidator)
 * 
 * 核心功能：
 * 1. 多层级数据校验（格式、逻辑、业务规则）
 * 2. 数据清洗和自动修复
 * 3. 详细错误报告和修复建议
 * 4. 数据质量评估和统计
 */

import { 
  VALIDATION_RULES, 
  DATA_CLEANING_RULES, 
  ValidationRule, 
  ValidationRuleType, 
  ValidationSeverity,
  getValidationRules,
  getValidationSummary,
  calculateDataQualityScore,
  SUBJECT_CONFIGS,
  QUALITY_THRESHOLDS
} from '@/utils/dataValidationRules';
import { errorHandler, createErrorResponse, createSuccessResponse } from './errorHandler';
import { toast } from 'sonner';

// 校验结果接口
export interface ValidationResult {
  id: string;
  ruleId: string;
  ruleName: string;
  field?: string;
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  recordIndex: number;
  record: any;
  value: any;
  canAutoFix: boolean;
  fixed?: boolean;
}

// 校验报告接口
export interface ValidationReport {
  success: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: ValidationResult[];
  summary: {
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    total: number;
  };
  dataQuality: {
    score: number;
    level: string;
    color: string;
    label: string;
  };
  fieldStatistics: Record<string, {
    total: number;
    valid: number;
    invalid: number;
    missing: number;
    validationRate: number;
  }>;
  cleanedData?: any[];
  recommendations: string[];
  executionTime: number;
}

// 校验选项接口
export interface ValidationOptions {
  enableAutoFix: boolean;
  skipWarnings: boolean;
  skipInfo: boolean;
  customRules?: ValidationRule[];
  enableDataCleaning: boolean;
  strictMode: boolean;
  maxErrors: number;
  fieldWhitelist?: string[];
  fieldBlacklist?: string[];
}

export class GradeDataValidator {
  private defaultOptions: ValidationOptions = {
    enableAutoFix: true,
    skipWarnings: false,
    skipInfo: false,
    enableDataCleaning: true,
    strictMode: false,
    maxErrors: 1000,
  };

  /**
   * 主要校验方法：对成绩数据进行全面校验
   */
  async validateGradeData(
    data: any[], 
    options: Partial<ValidationOptions> = {}
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    console.log('🔍 [GradeDataValidator] 开始校验成绩数据:', data.length, '条记录');

    try {
      const report: ValidationReport = {
        success: true,
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: 0,
        results: [],
        summary: { critical: 0, errors: 0, warnings: 0, info: 0, total: 0 },
        dataQuality: { score: 100, level: 'excellent', color: '#22c55e', label: '优秀' },
        fieldStatistics: {},
        recommendations: [],
        executionTime: 0
      };

      // 预处理：数据清洗
      let cleanedData = data;
      if (opts.enableDataCleaning) {
        console.log('🧹 [GradeDataValidator] 执行数据清洗...');
        cleanedData = await this.cleanData(data);
        report.cleanedData = cleanedData;
      }

      // 获取校验规则
      const rules = this.getActiveRules(opts);
      console.log('📋 [GradeDataValidator] 应用校验规则:', rules.length, '条');

      // 字段统计初始化
      report.fieldStatistics = this.initializeFieldStatistics(cleanedData);

      // 执行校验
      const validationResults = await this.executeValidation(cleanedData, rules, opts);
      report.results = validationResults;

      // 自动修复（如果启用）
      if (opts.enableAutoFix) {
        console.log('🔧 [GradeDataValidator] 执行自动修复...');
        const fixedData = await this.autoFixErrors(cleanedData, validationResults);
        report.cleanedData = fixedData;
        
        // 重新校验修复后的数据
        const revalidationResults = await this.executeValidation(fixedData, rules, opts);
        report.results = revalidationResults;
      }

      // 计算统计信息
      report.summary = getValidationSummary(report.results);
      report.dataQuality = calculateDataQualityScore(report.totalRecords, report.results);
      
      // 更新字段统计
      this.updateFieldStatistics(report.fieldStatistics, report.results);

      // 计算有效/无效记录数
      const recordValidation = this.calculateRecordValidation(cleanedData, report.results);
      report.validRecords = recordValidation.valid;
      report.invalidRecords = recordValidation.invalid;

      // 生成建议
      report.recommendations = this.generateRecommendations(report);

      // 判断整体成功状态
      report.success = report.summary.critical === 0 && (opts.strictMode ? report.summary.errors === 0 : true);

      report.executionTime = Date.now() - startTime;

      console.log('✅ [GradeDataValidator] 校验完成:', {
        totalRecords: report.totalRecords,
        validRecords: report.validRecords,
        dataQuality: report.dataQuality.score,
        executionTime: report.executionTime
      });

      return report;

    } catch (error) {
      console.error('❌ [GradeDataValidator] 校验失败:', error);
      
      const executionTime = Date.now() - startTime;
      const errorReport: ValidationReport = {
        success: false,
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: data.length,
        results: [{
          id: `error_${Date.now()}`,
          ruleId: 'system_error',
          ruleName: '系统错误',
          severity: ValidationSeverity.CRITICAL,
          message: '校验过程中发生系统错误',
          suggestion: '请检查数据格式或联系技术支持',
          recordIndex: -1,
          record: {},
          value: null,
          canAutoFix: false
        }],
        summary: { critical: 1, errors: 0, warnings: 0, info: 0, total: 1 },
        dataQuality: { score: 0, level: 'critical', color: '#dc2626', label: '严重' },
        fieldStatistics: {},
        recommendations: ['发生系统错误，请检查数据格式或联系技术支持'],
        executionTime
      };

      return errorReport;
    }
  }

  /**
   * 数据清洗
   */
  private async cleanData(data: any[]): Promise<any[]> {
    return data.map(record => {
      const cleanedRecord = { ...record };

      // 应用清洗规则
      DATA_CLEANING_RULES.forEach(rule => {
        if (rule.field === 'all_text_fields') {
          // 处理所有文本字段
          Object.keys(cleanedRecord).forEach(key => {
            if (typeof cleanedRecord[key] === 'string') {
              cleanedRecord[key] = rule.rule(cleanedRecord[key]);
            }
          });
        } else if (rule.field === 'all_grade_fields') {
          // 处理所有等级字段
          Object.keys(cleanedRecord).forEach(key => {
            if (key.includes('_grade')) {
              cleanedRecord[key] = rule.rule(cleanedRecord[key]);
            }
          });
        } else if (rule.field === 'all_number_fields') {
          // 处理所有数字字段
          Object.keys(cleanedRecord).forEach(key => {
            if (key.includes('_score') || key.includes('_rank')) {
              cleanedRecord[key] = rule.rule(cleanedRecord[key]);
            }
          });
        } else if (rule.field && cleanedRecord.hasOwnProperty(rule.field)) {
          // 处理特定字段
          cleanedRecord[rule.field] = rule.rule(cleanedRecord[rule.field]);
        }
      });

      return cleanedRecord;
    });
  }

  /**
   * 获取激活的校验规则
   */
  private getActiveRules(options: ValidationOptions): ValidationRule[] {
    let rules = [...VALIDATION_RULES];
    
    // 添加自定义规则
    if (options.customRules) {
      rules = [...rules, ...options.customRules];
    }

    // 过滤规则
    rules = rules.filter(rule => {
      if (!rule.enabled) return false;
      if (options.skipWarnings && rule.severity === ValidationSeverity.WARNING) return false;
      if (options.skipInfo && rule.severity === ValidationSeverity.INFO) return false;
      if (options.fieldWhitelist && rule.field && !options.fieldWhitelist.includes(rule.field)) return false;
      if (options.fieldBlacklist && rule.field && options.fieldBlacklist.includes(rule.field)) return false;
      return true;
    });

    return rules;
  }

  /**
   * 执行校验
   */
  private async executeValidation(
    data: any[], 
    rules: ValidationRule[], 
    options: ValidationOptions
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    let errorCount = 0;

    for (let recordIndex = 0; recordIndex < data.length; recordIndex++) {
      const record = data[recordIndex];

      for (const rule of rules) {
        try {
          // 检查是否超出最大错误数
          if (errorCount >= options.maxErrors) {
            console.warn(`⚠️ [GradeDataValidator] 达到最大错误数限制: ${options.maxErrors}`);
            break;
          }

          // 获取要验证的值
          const value = rule.field ? record[rule.field] : record;

          // 执行校验
          const isValid = rule.condition(value, record, data);

          if (!isValid) {
            const result: ValidationResult = {
              id: `${rule.id}_${recordIndex}_${Date.now()}`,
              ruleId: rule.id,
              ruleName: rule.name,
              field: rule.field,
              severity: rule.severity,
              message: rule.errorMessage,
              suggestion: rule.suggestion,
              recordIndex,
              record,
              value,
              canAutoFix: !!rule.autoFix,
              fixed: false
            };

            results.push(result);
            errorCount++;
          }

        } catch (error) {
          console.error(`❌ [GradeDataValidator] 规则执行失败: ${rule.id}`, error);
          
          const result: ValidationResult = {
            id: `error_${rule.id}_${recordIndex}_${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            field: rule.field,
            severity: ValidationSeverity.CRITICAL,
            message: '校验规则执行失败',
            suggestion: '请检查数据格式或联系技术支持',
            recordIndex,
            record,
            value: rule.field ? record[rule.field] : record,
            canAutoFix: false,
            fixed: false
          };

          results.push(result);
          errorCount++;
        }
      }

      // 检查是否超出最大错误数
      if (errorCount >= options.maxErrors) {
        break;
      }
    }

    return results;
  }

  /**
   * 自动修复错误
   */
  private async autoFixErrors(data: any[], validationResults: ValidationResult[]): Promise<any[]> {
    const fixedData = JSON.parse(JSON.stringify(data)); // 深拷贝
    let fixedCount = 0;

    // 按记录索引分组错误
    const errorsByRecord = new Map<number, ValidationResult[]>();
    validationResults.forEach(result => {
      if (result.canAutoFix) {
        const recordErrors = errorsByRecord.get(result.recordIndex) || [];
        recordErrors.push(result);
        errorsByRecord.set(result.recordIndex, recordErrors);
      }
    });

    // 对每个记录应用修复
    for (const [recordIndex, errors] of errorsByRecord.entries()) {
      if (recordIndex >= 0 && recordIndex < fixedData.length) {
        const record = fixedData[recordIndex];

        for (const error of errors) {
          try {
            // 获取对应的校验规则
            const rule = VALIDATION_RULES.find(r => r.id === error.ruleId);
            if (rule && rule.autoFix && error.field) {
              const originalValue = record[error.field];
              const fixedValue = rule.autoFix(originalValue, record);
              
              if (fixedValue !== originalValue) {
                record[error.field] = fixedValue;
                error.fixed = true;
                fixedCount++;
              }
            }
          } catch (fixError) {
            console.error(`❌ [GradeDataValidator] 自动修复失败:`, fixError);
          }
        }
      }
    }

    console.log(`🔧 [GradeDataValidator] 自动修复完成: ${fixedCount} 个错误已修复`);
    return fixedData;
  }

  /**
   * 初始化字段统计
   */
  private initializeFieldStatistics(data: any[]): Record<string, any> {
    const statistics: Record<string, any> = {};
    
    if (data.length === 0) return statistics;

    // 获取所有字段
    const allFields = new Set<string>();
    data.forEach(record => {
      Object.keys(record).forEach(key => allFields.add(key));
    });

    // 初始化每个字段的统计
    allFields.forEach(field => {
      statistics[field] = {
        total: data.length,
        valid: 0,
        invalid: 0,
        missing: 0,
        validationRate: 0
      };

      // 计算缺失值数量
      data.forEach(record => {
        const value = record[field];
        if (value === null || value === undefined || value === '') {
          statistics[field].missing++;
        }
      });
    });

    return statistics;
  }

  /**
   * 更新字段统计
   */
  private updateFieldStatistics(
    statistics: Record<string, any>, 
    validationResults: ValidationResult[]
  ): void {
    // 按字段分组错误
    const errorsByField = new Map<string, ValidationResult[]>();
    validationResults.forEach(result => {
      if (result.field) {
        const fieldErrors = errorsByField.get(result.field) || [];
        fieldErrors.push(result);
        errorsByField.set(result.field, fieldErrors);
      }
    });

    // 更新统计信息
    Object.keys(statistics).forEach(field => {
      const fieldErrors = errorsByField.get(field) || [];
      const stat = statistics[field];
      
      stat.invalid = fieldErrors.length;
      stat.valid = stat.total - stat.invalid - stat.missing;
      stat.validationRate = stat.total > 0 ? (stat.valid / stat.total) * 100 : 0;
    });
  }

  /**
   * 计算记录级别的校验结果
   */
  private calculateRecordValidation(data: any[], validationResults: ValidationResult[]): {
    valid: number;
    invalid: number;
  } {
    const invalidRecords = new Set<number>();
    
    validationResults.forEach(result => {
      // 只有严重错误和错误级别的问题才算记录无效
      if (result.severity === ValidationSeverity.CRITICAL || result.severity === ValidationSeverity.ERROR) {
        invalidRecords.add(result.recordIndex);
      }
    });

    return {
      valid: data.length - invalidRecords.size,
      invalid: invalidRecords.size
    };
  }

  /**
   * 生成修复建议
   */
  private generateRecommendations(report: ValidationReport): string[] {
    const recommendations: string[] = [];

    // 基于数据质量评分的建议
    if (report.dataQuality.score < 50) {
      recommendations.push('⚠️ 数据质量较差，建议检查数据源和导入格式');
    } else if (report.dataQuality.score < 70) {
      recommendations.push('💡 数据质量有待改善，建议修复主要错误');
    } else if (report.dataQuality.score < 85) {
      recommendations.push('👍 数据质量良好，建议处理警告项目');
    }

    // 基于错误类型的建议
    if (report.summary.critical > 0) {
      recommendations.push(`🚨 发现 ${report.summary.critical} 个严重错误，必须修复后才能导入`);
    }

    if (report.summary.errors > 0) {
      recommendations.push(`❌ 发现 ${report.summary.errors} 个错误，建议修复以提高数据质量`);
    }

    if (report.summary.warnings > 0) {
      recommendations.push(`⚠️ 发现 ${report.summary.warnings} 个警告，可选择性修复`);
    }

    // 基于字段统计的建议
    const lowQualityFields = Object.entries(report.fieldStatistics)
      .filter(([_, stat]: [string, any]) => stat.validationRate < 80)
      .map(([field, _]) => field);

    if (lowQualityFields.length > 0) {
      recommendations.push(`📋 以下字段数据质量较低：${lowQualityFields.join('、')}`);
    }

    // 缺失数据建议
    const missingDataFields = Object.entries(report.fieldStatistics)
      .filter(([_, stat]: [string, any]) => stat.missing > report.totalRecords * 0.1)
      .map(([field, _]) => field);

    if (missingDataFields.length > 0) {
      recommendations.push(`📝 以下字段缺失数据较多：${missingDataFields.join('、')}`);
    }

    // 性能建议
    if (report.totalRecords > 10000 && report.executionTime > 5000) {
      recommendations.push('⚡ 数据量较大，建议分批次导入以提高性能');
    }

    return recommendations;
  }

  /**
   * 快速校验（仅执行关键规则）
   */
  async quickValidate(data: any[]): Promise<{
    isValid: boolean;
    criticalErrors: number;
    recommendations: string[];
  }> {
    console.log('🚀 [GradeDataValidator] 执行快速校验...');

    const criticalRules = VALIDATION_RULES.filter(rule => 
      rule.enabled && rule.severity === ValidationSeverity.CRITICAL
    );

    const results = await this.executeValidation(data, criticalRules, this.defaultOptions);
    const criticalErrors = results.length;

    return {
      isValid: criticalErrors === 0,
      criticalErrors,
      recommendations: criticalErrors > 0 
        ? [`发现 ${criticalErrors} 个严重错误，建议执行完整校验`]
        : ['数据基本格式正确，可以导入']
    };
  }

  /**
   * 校验单条记录
   */
  async validateSingleRecord(record: any, allRecords?: any[]): Promise<ValidationResult[]> {
    const data = allRecords || [record];
    const recordIndex = allRecords ? allRecords.indexOf(record) : 0;
    
    const rules = this.getActiveRules(this.defaultOptions);
    const results: ValidationResult[] = [];

    for (const rule of rules) {
      try {
        const value = rule.field ? record[rule.field] : record;
        const isValid = rule.condition(value, record, data);

        if (!isValid) {
          results.push({
            id: `${rule.id}_${recordIndex}_${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            field: rule.field,
            severity: rule.severity,
            message: rule.errorMessage,
            suggestion: rule.suggestion,
            recordIndex,
            record,
            value,
            canAutoFix: !!rule.autoFix,
            fixed: false
          });
        }
      } catch (error) {
        console.error(`❌ [GradeDataValidator] 单记录校验失败:`, error);
      }
    }

    return results;
  }

  /**
   * 获取校验规则列表（用于前端显示）
   */
  getAvailableRules(): ValidationRule[] {
    return VALIDATION_RULES.filter(rule => rule.enabled);
  }

  /**
   * 更新校验规则配置
   */
  updateRuleConfig(ruleId: string, enabled: boolean): boolean {
    const rule = VALIDATION_RULES.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
}

// 导出单例
export const gradeDataValidator = new GradeDataValidator();