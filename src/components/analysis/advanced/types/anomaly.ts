export interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  exam_title?: string;
  exam_date?: string;
}

export interface AnomalyData {
  student_id: string;
  name: string;
  class_name?: string;
  subject: string;
  score: number;
  expected_score: number;
  deviation: number;
  z_score: number;
  anomaly_type:
    | "outlier_high"
    | "outlier_low"
    | "sudden_drop"
    | "sudden_rise"
    | "missing_pattern";
  severity: "high" | "medium" | "low";
  description: string;
}

export interface AnomalyStats {
  totalStudents: number;
  affectedStudents: number;
  affectedRate: number;
  highRiskCount: number;
  mediumRiskCount: number;
  totalAnomalies: number;
}

export interface SubjectAnomalyStats {
  subject: string;
  anomalies: number;
  students: number;
  rate: number;
}
