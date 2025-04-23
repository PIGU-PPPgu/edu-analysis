
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
  headers: string[];
  data: any[];
  detectedFormat: string;
  confidence: number;
  fieldMappings: Record<string, string>;
}

export interface FileProcessingProps {
  onFileProcessed: (data: ParsedData) => void;
  isAIEnhanced: boolean;
}

export interface IntelligentFileParserProps {
  onDataParsed?: (data: any[]) => void;
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
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'boxplot';
  dataFields: {
    xAxis?: string;
    yAxis?: string[];
    groupBy?: string;
  };
  options?: Record<string, any>;
}
