import type {
  FileDataForReview,
  ExamInfo,
} from "@/components/analysis/core/grade-importer/types";

export interface PredefinedProvider {
  id: string;
  name: string;
  versions: string[];
}

export interface CustomProvider {
  id: string;
  name: string;
  endpoint: string;
}

export interface ParsedData {
  fileName?: string;
  headers: string[];
  data: any[];
  detectedFormat: string;
  confidence: number;
  fieldMappings: Record<string, string>;
  intelligentParseResult?: {
    success: boolean;
    data: any[];
    metadata: {
      originalHeaders: string[];
      detectedStructure: "wide" | "long" | "mixed";
      confidence: number;
      suggestedMappings: Record<string, string>;
      detectedSubjects: string[];
      examInfo?: {
        title?: string;
        type?: string;
        date?: string;
        grade?: string;
      };
      totalRows: number;
      autoProcessed?: boolean; // 标记是否自动处理
      unknownFields?: Array<{ name: string; sampleValues: string[] }>; // 未识别的字段
      needsFieldInquiry?: boolean; // 是否需要字段询问
    };
  } | null;
}

export interface FileProcessingProps {
  onFileProcessed: (data: ParsedData) => void;
  isAIEnhanced: boolean;
  isProcessing?: boolean;
  onFileSelected?: (file: File) => void;
}

export interface IntelligentFileParserProps {
  onFileParsedForReview: (
    fileData: FileDataForReview,
    initialMappings: Record<string, string>,
    examInfo: ExamInfo
  ) => void;
  onImportIntent?: (fileName: string, fileSize: number) => void;
}

export interface AIModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface AIAnalysisRequest {
  data: any[];
  config: AIModelConfig;
  prompt?: string;
  language?: string;
}

export interface AIAnalysisResponse {
  overview: string;
  insights: string[];
  recommendations: string[];
  error?: string;
}

export interface ChartGenerationConfig {
  chartType: "bar" | "line" | "pie" | "scatter" | "area" | "boxplot";
  dataFields: {
    xAxis?: string;
    yAxis?: string[];
    groupBy?: string;
  };
  options?: Record<string, any>;
}

export interface WarningCondition {
  type: "score" | "attendance" | "homework" | "participation" | "trend";
  subject?: string;
  operator: "less_than" | "greater_than" | "equal_to";
  threshold: number;
  description: string;
}

export interface WarningRule {
  id?: string;
  name: string;
  description?: string;
  conditions: WarningCondition[];
  severity: "low" | "medium" | "high";
  is_system?: boolean;
  is_active?: boolean;
}
