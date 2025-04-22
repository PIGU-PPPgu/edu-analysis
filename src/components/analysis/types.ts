
export interface ParsedData {
  headers: string[];
  data: Record<string, any>[];
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
