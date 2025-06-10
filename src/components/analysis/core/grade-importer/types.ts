/**
 * 🔧 GradeImporter 重构 - 类型定义
 * 
 * 将原GradeImporter组件中的所有类型定义提取到独立文件
 * 以便各个子组件共享使用
 */

import { z } from 'zod';
import { AIAnalysisResult } from '@/services/aiEnhancedFileParser';

// ==================== 基础数据类型 ====================

// 成绩数据导入组件的属性
export interface GradeImporterProps {
  onDataImported: (data: any[]) => void;
}

// 考试信息接口
export interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject: string;
  scope?: 'class' | 'grade' | 'school';
}

// 解析后的数据结构
export interface ParsedData {
  headers: string[];
  data: any[][];
  preview: any[];
  totalRows: number;
  fileName: string;
  fileSize: number;
}

// 文件数据预览结构
export interface FileDataForReview {
  headers: string[];
  data: any[][];
  preview: any[];
  totalRows: number;
  fileName: string;
  fileSize: number;
  examInfo?: ExamInfo;
}

// 自定义字段类型
export interface CustomField {
  id: string;
  name: string;
  key: string;
  description?: string;
  field_type?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// ==================== 状态类型 ====================

// AI解析状态
export interface AIParsingStatus {
  isActive: boolean;
  status: 'idle' | 'parsing' | 'analyzing' | 'success' | 'error';
  message: string;
  confidence?: number;
  aiResult?: AIAnalysisResult;
}

// 分析日志状态
export interface AnalysisLogState {
  status: 'idle' | 'analyzing' | 'success' | 'error';
  message: string;
  autoAnalysisResult?: any;
}

// 导入配置状态
export interface ImportConfigState {
  examScope: 'class' | 'grade' | 'school';
  newStudentStrategy: 'create' | 'ignore';
  mergeStrategy: 'skip' | 'update' | 'replace';
  enableDuplicateCheck: boolean;
  enableDataValidation: boolean;
  enableAIEnhancement: boolean;
}

// ==================== 表单验证 ====================

// 成绩信息验证schema
export const gradeSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "学生姓名不能为空"),
  class_name: z.string().min(1, "班级不能为空"),
  subject: z.string().min(1, "考试科目不能为空"),
  score: z.number().min(0, "分数不能为负数"),
  exam_title: z.string().min(1, "考试标题不能为空"),
  exam_type: z.string().min(1, "考试类型不能为空"),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
});

export type GradeFormValues = z.infer<typeof gradeSchema>;

// 考试信息验证schema
export const examInfoSchema = z.object({
  title: z.string().min(1, "考试标题不能为空"),
  type: z.string().min(1, "考试类型不能为空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
  subject: z.string().optional(),
  scope: z.enum(['class', 'grade', 'school']).optional()
});

export type ExamInfoFormValues = z.infer<typeof examInfoSchema>;

// ==================== 字段映射 ====================

// 系统字段映射 - 支持新的等级和总分字段结构
export const SYSTEM_FIELDS: Record<string, string> = {
  // 基本信息字段
  'student_id': '学号',
  'name': '姓名',
  'class_name': '班级',
  'grade_level': '年级',
  
  // 考试信息字段
  'subject': '科目',
  'exam_date': '考试日期',
  'exam_type': '考试类型',
  'exam_title': '考试标题',
  'exam_scope': '考试范围',
  
  // 分数字段（重新设计）
  'score': '分数/成绩',
  'total_score': '总分',
  'subject_total_score': '满分/科目满分',
  
  // 等级字段（重新设计，支持优先级）
  'original_grade': '等级/评级',
  'computed_grade': '计算等级',
  'grade': '旧等级', // 向后兼容
  
  // 排名字段
  'rank_in_class': '班级排名',
  'rank_in_grade': '年级排名/校排名',
  
  // 统计字段
  'percentile': '百分位数',
  'z_score': '标准分'
};

// 字段映射类型
export interface FieldMapping {
  [csvHeader: string]: string; // 映射到系统字段key
}

// 字段分析结果
export interface FieldAnalysisResult {
  header: string;
  suggestedMapping: string;
  confidence: number;
  reasoning: string;
  samples: any[];
}

// ==================== 处理结果类型 ====================

// 文件上传结果
export interface FileUploadResult {
  success: boolean;
  data?: ParsedData;
  error?: string;
  aiAnalysis?: AIAnalysisResult;
}

// 数据验证结果
export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: ValidationStatistics;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  row: number;
  field: string;
  value: any;
  message: string;
  suggestion?: string;
}

export interface ValidationStatistics {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  duplicateRows: number;
}

// 导入处理结果
export interface ImportProcessResult {
  success: boolean;
  message: string;
  importedCount: number;
  errorCount: number;
  duplicateCount: number;
  details?: {
    createdStudents: number;
    updatedGrades: number;
    skippedRows: number;
  };
}

// ==================== 事件处理类型 ====================

// 文件上传事件
export type FileUploadHandler = (files: File[]) => Promise<void>;

// 数据映射事件
export type DataMappingHandler = (mappings: FieldMapping) => void;

// 数据验证事件
export type DataValidationHandler = (data: any[]) => Promise<DataValidationResult>;

// 导入处理事件
export type ImportProcessHandler = (
  examInfo: ExamInfo,
  mappings: FieldMapping,
  data: any[],
  config: ImportConfigState
) => Promise<ImportProcessResult>;

// 取消导入事件
export type CancelImportHandler = () => void;

// ==================== 常量定义 ====================

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/csv': '.csv',
  'text/plain': '.txt'
} as const;

// 最大文件大小 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 默认导入配置
export const DEFAULT_IMPORT_CONFIG: ImportConfigState = {
  examScope: 'class',
  newStudentStrategy: 'ignore',
  mergeStrategy: 'skip',
  enableDuplicateCheck: true,
  enableDataValidation: true,
  enableAIEnhancement: true
};

// 默认考试信息
export const DEFAULT_EXAM_INFO: ExamInfo = {
  title: '',
  type: '',
  date: new Date().toISOString().split('T')[0],
  subject: '',
  scope: 'class'
}; 