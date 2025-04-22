
export interface ParsedData {
  headers: string[];
  data: any[];
  detectedFormat: string;
  confidence: number;
  fieldMappings?: Record<string, string>;
}

export interface CustomField {
  originalField: string;
  mappedField: string;
  dataType: string;
}

export interface StandardFields {
  [key: string]: string[];
}

export interface FileProcessingProps {
  onFileProcessed: (data: ParsedData) => void;
  isAIEnhanced?: boolean;
}

export interface DataPreviewProps {
  data: any[];
  headers: string[];
  mappings: Record<string, string>;
  onShowMapping: () => void;
  onReupload: () => void;
}

export interface HeaderMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  mappings: Record<string, string>;
  onUpdateMapping: (header: string, value: string) => void;
  onConfirm: () => void;
}

export interface MappedField {
  originalHeader: string;
  mappedField: string;
  dataType: string;
}
