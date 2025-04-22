
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
