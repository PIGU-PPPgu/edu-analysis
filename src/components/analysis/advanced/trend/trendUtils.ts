// 趋势分析共享类型和工具函数
export interface WideGradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  chinese_score?: number;
  chinese_grade?: string;
  math_score?: number;
  math_grade?: string;
  english_score?: number;
  english_grade?: string;
  physics_score?: number;
  physics_grade?: string;
  chemistry_score?: number;
  chemistry_grade?: string;
  biology_score?: number;
  biology_grade?: string;
  history_score?: number;
  history_grade?: string;
  geography_score?: number;
  geography_grade?: string;
  politics_score?: number;
  politics_grade?: string;
  total_score?: number;
  class_rank?: number;
  grade_rank?: number;
  school_rank?: number;
  exam_id?: string;
  exam_title?: string;
  exam_date?: string;
}

export interface StudentTrendData {
  examTitle: string;
  examDate: string;
  totalScore: number;
  classRank: number;
  gradeRank: number;
  chinese: number;
  math: number;
  english: number;
  physics?: number;
  chemistry?: number;
  biology?: number;
  history?: number;
  geography?: number;
  politics?: number;
}

export interface TrendAnalysisResult {
  subject: string;
  trend: "improving" | "declining" | "stable";
  slope: number;
  correlation: number;
  averageScore: number;
  latestScore: number;
  bestScore: number;
  worstScore: number;
  improvement: number;
  volatility: number;
}

export const SUBJECT_CONFIG = {
  语文: { field: "chinese", color: "#6B7280", fullScore: 100 },
  数学: { field: "math", color: "#000000", fullScore: 100 },
  英语: { field: "english", color: "#6B7280", fullScore: 100 },
  物理: { field: "physics", color: "#191A23", fullScore: 100 },
  化学: { field: "chemistry", color: "#B9FF66", fullScore: 100 },
  生物: { field: "biology", color: "#000000", fullScore: 100 },
  历史: { field: "history", color: "#6B7280", fullScore: 100 },
  地理: { field: "geography", color: "#191A23", fullScore: 100 },
  政治: { field: "politics", color: "#6B7280", fullScore: 100 },
} as const;

export const calculateTrendAnalysis = (
  scores: number[]
): { slope: number; correlation: number; volatility: number } => {
  if (scores.length < 2) return { slope: 0, correlation: 0, volatility: 0 };
  const n = scores.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = scores;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );
  const correlation = denominator === 0 ? 0 : numerator / denominator;
  const meanY = sumY / n;
  const variance =
    y.reduce((sum, score) => sum + Math.pow(score - meanY, 2), 0) / n;
  return { slope, correlation, volatility: Math.sqrt(variance) };
};

export const processStudentTrendData = (
  gradeData: WideGradeRecord[],
  studentId: string
): StudentTrendData[] => {
  return gradeData
    .filter((record) => record.student_id === studentId)
    .sort(
      (a, b) =>
        new Date(a.exam_date || "").getTime() -
        new Date(b.exam_date || "").getTime()
    )
    .map((record) => ({
      examTitle: record.exam_title || "未知考试",
      examDate: record.exam_date || "",
      totalScore: record.total_score || 0,
      classRank: record.class_rank || 0,
      gradeRank: record.grade_rank || 0,
      chinese: record.chinese_score || 0,
      math: record.math_score || 0,
      english: record.english_score || 0,
      physics: record.physics_score,
      chemistry: record.chemistry_score,
      biology: record.biology_score,
      history: record.history_score,
      geography: record.geography_score,
      politics: record.politics_score,
    }));
};

export const analyzeAllSubjectTrends = (
  trendData: StudentTrendData[]
): TrendAnalysisResult[] => {
  if (trendData.length < 2) return [];
  const results: TrendAnalysisResult[] = [];
  Object.entries(SUBJECT_CONFIG).forEach(([subject, config]) => {
    const scores = trendData
      .map((data) => data[config.field as keyof StudentTrendData] as number)
      .filter((score) => score > 0);
    if (scores.length < 2) return;
    const { slope, correlation, volatility } = calculateTrendAnalysis(scores);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const latestScore = scores[scores.length - 1];
    let trend: "improving" | "declining" | "stable" = "stable";
    if (slope > 1 && correlation > 0.3) trend = "improving";
    else if (slope < -1 && correlation < -0.3) trend = "declining";
    results.push({
      subject,
      trend,
      slope,
      correlation,
      averageScore,
      latestScore,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      improvement: latestScore - scores[0],
      volatility,
    });
  });
  return results.sort((a, b) => Math.abs(b.slope) - Math.abs(a.slope));
};
