/**
 * Python数据预处理服务客户端
 * 与Python Flask服务通信，处理Excel/CSV文件
 * 支持用户认证和数据隔离
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProcessedDataRecord {
  student_id?: string;
  name?: string;
  class_name?: string;
  grade_level?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  rank_in_class?: number;
  rank_in_grade?: number;
  user_id?: string;  // 添加用户ID字段
}

export interface ProcessingReport {
  file_info: {
    filename: string;
    size_bytes: number;
    rows: number;
    columns: number;
  };
  field_mapping: Record<string, string>;
  data_structure: 'wide' | 'long';
  processing_stats: {
    total_records: number;
    unique_students: number;
    subjects_detected: number;
  };
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    total_records: number;
    unique_students: number;
  };
  timestamp: string;
}

export interface ProcessingResult {
  success: boolean;
  data?: ProcessedDataRecord[];
  report?: ProcessingReport;
  error?: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: {
    file_info: {
      filename: string;
      rows: number;
      columns: number;
    };
    columns: string[];
    field_mapping: Record<string, string>;
    data_structure: 'wide' | 'long';
    preview: Record<string, any>[];
    recommendations: {
      processing_type: string;
      mapped_fields: number;
      total_fields: number;
      mapping_coverage: string;
    };
  };
  error?: string;
}

class PythonDataProcessor {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取认证headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      return headers;
    } catch (error) {
      console.error('获取认证信息失败:', error);
      return {};
    }
  }

  /**
   * 检查Python服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Python服务健康检查失败:', error);
      return false;
    }
  }

  /**
   * 分析文件结构，不进行实际处理
   */
  async analyzeFile(file: File): Promise<AnalysisResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('用户未认证或认证已过期，请重新登录');
        }
        throw new Error(result.error || '分析文件失败');
      }

      return result;
    } catch (error) {
      console.error('分析文件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '分析文件时发生未知错误'
      };
    }
  }

  /**
   * 处理文件并返回标准化数据
   */
  async processFile(file: File): Promise<ProcessingResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('用户未认证或认证已过期，请重新登录');
        }
        throw new Error(result.error || '处理文件失败');
      }

      return result;
    } catch (error) {
      console.error('处理文件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理文件时发生未知错误'
      };
    }
  }

  /**
   * 将处理后的数据转换为系统所需格式
   */
  convertToSystemFormat(
    processedData: ProcessedDataRecord[], 
    examInfo: { title: string; type: string; date: string; subject?: string }
  ): any[] {
    return processedData.map(record => ({
      student_id: record.student_id,
      name: record.name,
      class_name: record.class_name,
      grade_level: record.grade_level,
      subject: record.subject,
      score: record.score,
      total_score: record.total_score || 100, // 默认总分
      original_grade: this.scoreToGrade(record.score),
      rank_in_class: record.rank_in_class,
      rank_in_grade: record.rank_in_grade,
      // 考试信息
      exam_title: examInfo.title,
      exam_type: examInfo.type,
      exam_date: examInfo.date,
      // 元数据
      metadata: {
        processed_by: 'python-service',
        processing_timestamp: new Date().toISOString(),
        original_subject: record.subject
      }
    }));
  }

  /**
   * 根据分数计算等级
   */
  private scoreToGrade(score?: number): string {
    if (!score) return '';
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  }

  /**
   * 验证处理结果
   */
  validateProcessingResult(result: ProcessingResult): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!result.success) {
      errors.push(result.error || '处理失败');
      return { isValid: false, errors, warnings };
    }

    if (!result.data || result.data.length === 0) {
      errors.push('处理后的数据为空');
      return { isValid: false, errors, warnings };
    }

    // 检查必需字段
    const requiredFields = ['student_id', 'name'];
    for (const [index, record] of result.data.entries()) {
      for (const field of requiredFields) {
        if (!record[field as keyof ProcessedDataRecord]) {
          errors.push(`记录 ${index + 1}: 缺少必需字段 '${field}'`);
        }
      }
    }

    // 检查数据质量
    if (result.report?.validation) {
      errors.push(...result.report.validation.errors);
      warnings.push(...result.report.validation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 生成处理摘要
   */
  generateProcessingSummary(result: ProcessingResult): string {
    if (!result.success || !result.report) {
      return '处理失败';
    }

    const { report } = result;
    const coverage = report.field_mapping ? 
      `${Object.keys(report.field_mapping).length}/${report.file_info.columns}` : '0/0';

    return `
处理完成！
- 文件: ${report.file_info.filename}
- 数据结构: ${report.data_structure === 'wide' ? '宽格式' : '长格式'}
- 字段映射: ${coverage} 个字段识别成功
- 处理记录: ${report.processing_stats.total_records} 条
- 涉及学生: ${report.processing_stats.unique_students} 人
- 涉及科目: ${report.processing_stats.subjects_detected} 个
    `.trim();
  }
}

// 默认实例
export const pythonDataProcessor = new PythonDataProcessor();

// 导出类供自定义使用
export { PythonDataProcessor }; 