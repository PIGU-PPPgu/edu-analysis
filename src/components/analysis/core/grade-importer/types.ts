/**
 * 🔧 GradeImporter 重构 - 类型定义
 *
 * 将原GradeImporter组件中的所有类型定义提取到独立文件
 * 以便各个子组件共享使用
 */

import { z } from "zod";
import { AIAnalysisResult } from "@/services/aiEnhancedFileParser";

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
  subject?: string;
  scope?: "class" | "grade" | "school";
}

// 解析后的数据结构
export interface ParsedData {
  headers: string[];
  data: any[][];
  preview: any[][];
  totalRows: number;
  fileName: string;
  fileSize: number;
}

// 文件数据预览结构
export interface FileDataForReview {
  headers: string[];
  data: any[];
  rawData?: any[][];
  fileName?: string;
  fileSize?: number;
  totalRows?: number;
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
  status: "idle" | "parsing" | "analyzing" | "success" | "error";
  message: string;
  confidence?: number;
  aiResult?: AIAnalysisResult;
}

// 分析日志状态
export interface AnalysisLogState {
  status: "idle" | "analyzing" | "success" | "error";
  message: string;
  autoAnalysisResult?: any;
}

// 导入配置状态
export interface ImportConfigState {
  examScope: "class" | "grade" | "school";
  newStudentStrategy: "create" | "ignore";
  mergeStrategy: "skip" | "update" | "replace";
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
  subject: z.string().min(1, "考试科目不能为空").optional(),
  score: z.number().min(0, "分数不能为负数").optional(),
  exam_title: z.string().min(1, "考试标题不能为空"),
  exam_type: z.string().min(1, "考试类型不能为空"),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
});

export type GradeFormValues = z.infer<typeof gradeSchema>;

// 考试信息验证schema
export const examSchema = z.object({
  title: z.string().min(1, "考试标题不能为空"),
  type: z.string().min(1, "考试类型不能为空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
  subject: z.string().optional(),
  scope: z.enum(["class", "grade", "school"]).default("class"),
});

export type ExamFormValues = z.infer<typeof examSchema>;

// ==================== 字段映射 ====================

// 系统字段映射 - 支持新的等级和总分字段结构
export const SYSTEM_FIELDS = {
  // 基本信息字段
  student_id: "学号",
  name: "姓名",
  class_name: "班级",
  grade_level: "年级",

  // 考试信息字段
  subject: "科目",
  exam_date: "考试日期",
  exam_type: "考试类型",
  exam_title: "考试标题",
  exam_scope: "考试范围",

  // 分数字段
  score: "分数/成绩",
  total_score: "总分",
  subject_total_score: "满分/科目满分",

  // 等级字段
  original_grade: "等级/评级",
  computed_grade: "计算等级",
  grade: "旧等级",

  // 排名字段
  rank_in_class: "班级排名",
  rank_in_grade: "年级排名/校排名",

  // 统计字段
  percentile: "百分位数",
  z_score: "标准分",
} as const;

// 字段映射类型
export interface FieldMapping {
  originalField: string;
  mappedField: string;
  isRequired: boolean;
  isCustom: boolean;
  confidence?: number;
  suggestions?: string[];
  subject?: string;
  dataType:
    | "score"
    | "grade"
    | "rank_class"
    | "rank_school"
    | "rank_grade"
    | "student_info";
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
  severity: "error" | "warning";
  error?: string; // 添加缺少的error属性
}

export interface ValidationWarning {
  row: number;
  field: string;
  value: any;
  message: string;
  suggestion?: string;
  warning?: string; // 添加缺少的warning属性
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
export type DataValidationHandler = (
  data: any[]
) => Promise<DataValidationResult>;

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
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/csv": ".csv",
  "text/plain": ".txt",
} as const;

// 最大文件大小 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 考试范围选项
export const EXAM_SCOPES = [
  { value: "class", label: "班级考试" },
  { value: "grade", label: "年级考试" },
  { value: "school", label: "全校考试" },
] as const;

// 合并策略选项
export const MERGE_STRATEGIES = [
  { value: "replace", label: "替换现有数据" },
  { value: "merge", label: "合并数据" },
  { value: "append", label: "追加数据" },
] as const;

// 新学生处理策略
export const NEW_STUDENT_STRATEGIES = [
  { value: "create", label: "自动创建新学生" },
  { value: "ignore", label: "忽略新学生数据" },
  { value: "prompt", label: "提示用户确认" },
] as const;

// ==================== 默认配置值 ====================

// 默认考试信息
export const DEFAULT_EXAM_INFO: ExamInfo = {
  title: "",
  type: "monthly",
  date: new Date().toISOString().split("T")[0], // 今天的日期
  subject: "",
  scope: "class",
};

// 默认导入配置
export const DEFAULT_IMPORT_CONFIG: ImportConfigState = {
  examScope: "class",
  newStudentStrategy: "create",
  mergeStrategy: "update",
  enableDuplicateCheck: true,
  enableDataValidation: true,
  enableAIEnhancement: true,
};

// 映射配置接口
export interface MappingConfig {
  fieldMappings: Record<string, string>;
  customFields: Record<string, string>;
  aiSuggestions?: {
    confidence: number;
    suggestions: Record<string, string>;
    issues: string[];
  };
  wideTableFormat?: {
    detected: boolean;
    subjects: string[];
    confidence: number;
  };
}

// AI分析结果接口
export interface AIAnalysisResult {
  examInfo?: {
    title: string;
    type: string;
    date: string;
    grade?: string;
    scope: "class" | "grade" | "school";
  };
  fieldMappings: Record<string, string>;
  subjects: string[];
  dataStructure: "wide" | "long" | "mixed";
  confidence: number;
  processing: {
    requiresUserInput: boolean;
    issues: string[];
    suggestions: string[];
  };
  // 新增等级和排名分析结果
  gradeRankAnalysis?: {
    gradeFields: {
      detected: string[];
      mapping: Record<string, string>;
      gradeType: "standard" | "chinese" | "numeric" | "custom";
      consistency: {
        scoreGradeMatch: number;
        issues: string[];
      };
    };
    rankFields: {
      detected: string[];
      mapping: Record<string, string>;
      consistency: {
        continuity: number;
        duplicates: number;
        issues: string[];
      };
    };
    recommendations: string[];
  };
}

// 数据验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

// 导入选项接口
export interface ImportOptions {
  batchSize: number;
  createMissingStudents: boolean;
  updateExistingData: boolean;
  skipDuplicates: boolean;
  enableBackup: boolean;
  enableRollback: boolean;
  parallelImport: boolean;
  strictMode: boolean;
  validateDuplicates: boolean;
  validateStudentMatch: boolean;
  requireScores: boolean;
  maxErrors: number;
}

// 导入进度接口
export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  status:
    | "pending"
    | "importing"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  startTime: Date | null;
  endTime: Date | null;
  errors: string[];
  warnings: string[];
}

// 导入结果接口
export interface ImportResult {
  success: boolean;
  summary: {
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errorRows: number;
    createdStudents: number;
    updatedGrades: number;
  };
  errors: ImportError[];
  warnings: ImportWarning[];
  examId?: string;
  duration: number; // 毫秒
}

// 导入错误接口
export interface ImportError {
  row: number;
  data: any;
  error: string;
  code: string;
  recoverable: boolean;
}

// 导入警告接口
export interface ImportWarning {
  row: number;
  data: any;
  warning: string;
  code: string;
  suggestion?: string;
}

// 学生匹配结果接口
export interface StudentMatchResult {
  student_id: string;
  name: string;
  class_name?: string;
  matchType: "exact" | "fuzzy" | "new" | "conflict";
  confidence: number;
  conflicts?: StudentMatchResult[];
  suggestions?: StudentMatchResult[];
}

// 文件上传配置接口
export interface FileUploadConfig {
  acceptedFormats: string[];
  maxFileSize: number; // MB
  enableAIParsing: boolean;
  enableAutoMapping: boolean;
  autoDetectWideFormat: boolean;
}

// AI解析配置接口
export interface AIParsingConfig {
  provider: "openai" | "doubao" | "deepseek" | "custom";
  model: string;
  temperature: number;
  maxTokens: number;
  enableHeaderAnalysis: boolean;
  enableDataTypeDetection: boolean;
  enableSubjectRecognition: boolean;
}

// 映射配置验证schema
export const mappingConfigSchema = z.object({
  fieldMappings: z.record(z.string(), z.string()),
  customFields: z.record(z.string(), z.string()),
  aiSuggestions: z
    .object({
      confidence: z.number().min(0).max(1),
      suggestions: z.record(z.string(), z.string()),
      issues: z.array(z.string()),
    })
    .optional(),
  wideTableFormat: z
    .object({
      detected: z.boolean(),
      subjects: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    })
    .optional(),
});

// TypeScript 类型导出
export type MappingConfigValues = z.infer<typeof mappingConfigSchema>;

// 必需字段列表
export const REQUIRED_FIELDS = ["student_id", "name", "class_name"] as const;

// 科目代码映射
export const SUBJECT_CODES = {
  语文: "chinese",
  数学: "math",
  英语: "english",
  物理: "physics",
  化学: "chemistry",
  生物: "biology",
  政治: "politics",
  历史: "history",
  地理: "geography",
  总分: "total",
} as const;

// 考试类型选项
export const EXAM_TYPES = [
  { value: "monthly", label: "月考" },
  { value: "midterm", label: "期中考试" },
  { value: "final", label: "期末考试" },
  { value: "mock", label: "模拟考试" },
  { value: "quiz", label: "随堂测试" },
  { value: "competition", label: "竞赛" },
  { value: "entrance", label: "入学考试" },
  { value: "diagnostic", label: "诊断性考试" },
  { value: "other", label: "其他" },
] as const;
