export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  fileName?: string;
  includeHeaders?: boolean;
  customTemplate?: string;
  fields?: ExportField[];
  filters?: ExportFilter[];
  grouping?: ExportGrouping;
  styling?: ExportStyling;
}

export interface ExportField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  format?: string;
  width?: number;
  selected: boolean;
  description?: string;
}

export interface ExportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: any;
  values?: any[];
}

export interface ExportGrouping {
  field: string;
  type: 'none' | 'group' | 'pivot';
  aggregations?: {
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }[];
}

export interface ExportStyling {
  headerStyle?: CellStyle;
  dataStyle?: CellStyle;
  alternateRowColor?: boolean;
  borders?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface CellStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  backgroundColor?: string;
  textColor?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface ExportProgress {
  phase: 'preparing' | 'processing' | 'formatting' | 'generating' | 'complete';
  percentage: number;
  message: string;
  processedRecords?: number;
  totalRecords?: number;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  success: boolean;
  fileName?: string;
  filePath?: string;
  downloadUrl?: string;
  recordCount?: number;
  fileSize?: number;
  processingTime?: number;
  error?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'student' | 'class' | 'grade' | 'exam' | 'custom';
  sections: ReportSection[];
  styling: ReportStyling;
  isDefault?: boolean;
  createdBy?: string;
  createdAt?: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'header' | 'table' | 'chart' | 'text' | 'summary' | 'image';
  content: any;
  order: number;
  visible: boolean;
  pageBreakAfter?: boolean;
}

export interface ReportStyling {
  theme: 'professional' | 'academic' | 'minimal' | 'colorful';
  primaryColor: string;
  secondaryColor: string;
  headerFont: string;
  bodyFont: string;
  logoUrl?: string;
  watermark?: string;
}

export interface StudentReportData {
  studentId: string;
  name: string;
  className: string;
  grades: GradeRecord[];
  summary: StudentSummary;
  trends: TrendData[];
  recommendations?: string[];
  customData?: Record<string, any>;
}

export interface GradeRecord {
  subject: string;
  score: number;
  maxScore?: number;
  grade?: string;
  examDate: string;
  examType: string;
  rankInClass?: number;
  rankInGrade?: number;
}

export interface StudentSummary {
  totalExams: number;
  averageScore: number;
  bestSubject: string;
  improvementNeeded: string;
  attendanceRate?: number;
  behaviorScore?: number;
}

export interface TrendData {
  subject: string;
  data: {
    date: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface BatchExportJob {
  id: string;
  name: string;
  type: 'student_reports' | 'class_reports' | 'grade_analysis' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  processedItems: number;
  options: ExportOptions;
  results: ExportResult[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ExportSchedule {
  id: string;
  name: string;
  description?: string;
  template: string;
  recipients: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customSchedule?: string; // cron expression
  options: ExportOptions;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdBy: string;
}