/**
 * 分数段对比分析类型定义
 * Task #22: 支持入口/出口考试的等级分布对比
 */

/**
 * 单次考试的分数段快照（扁平结构）
 */
export interface ScoreBandSnapshot {
  subject: string; // 科目名称
  totalStudents: number; // 分析人数
  avgScore: number; // 平均分
  avgScoreRank?: number; // 平均分排名（可选）

  // ============================================
  // 各等级统计（6个等级）
  // ============================================
  aPlusCount: number; // A+ 人数
  aPlusRate: number; // A+ 比例（0-100）
  aCount: number; // A 人数
  aRate: number; // A 比例
  bPlusCount: number; // B+ 人数
  bPlusRate: number; // B+ 比例
  bCount: number; // B 人数
  bRate: number; // B 比例
  cPlusCount: number; // C+ 人数
  cPlusRate: number; // C+ 比例
  cCount: number; // C 人数
  cRate: number; // C 比例

  // ============================================
  // 累计统计（5个累计项）
  // ============================================
  aPlusAboveCount: number; // A+以上人数（只有A+）
  aPlusAboveRate: number; // A+以上比例
  aAboveCount: number; // A以上人数（A+ + A）
  aAboveRate: number; // A以上比例
  bPlusAboveCount: number; // B+以上人数（A+ + A + B+）
  bPlusAboveRate: number; // B+以上比例
  bAboveCount: number; // B以上人数（A+ + A + B+ + B）
  bAboveRate: number; // B以上比例
  cPlusAboveCount: number; // C+以上人数（前95%，即及格线）
  cPlusAboveRate: number; // C+以上比例
}

/**
 * 等级变化统计
 */
export interface GradeChangeStats {
  countChange: number; // 人数变化（出口 - 入口）
  rateChange: number; // 比例变化（出口 - 入口）
}

/**
 * 分数段分析完整结果
 */
export interface ScoreBandAnalysisResult {
  entryExam: ScoreBandSnapshot[]; // 入口考试快照（多科目）
  exitExam: ScoreBandSnapshot[]; // 出口考试快照（多科目）

  // 变化统计：{ 科目名: { 等级/累计项名: 变化数据 } }
  changes: Record<string, Record<string, GradeChangeStats>>;
}

/**
 * 原始成绩记录（从数据库读取）
 */
export interface GradeRecord {
  student_id: string;
  name?: string;
  class_name?: string;

  // 总分数据
  total_score?: number;
  total_rank?: number;
  total_rank_in_class?: number;
  total_grade?: string;

  // 各科目数据
  chinese_score?: number;
  chinese_rank?: number;
  chinese_rank_in_class?: number;
  chinese_grade?: string;

  math_score?: number;
  math_rank?: number;
  math_rank_in_class?: number;
  math_grade?: string;

  english_score?: number;
  english_rank?: number;
  english_rank_in_class?: number;
  english_grade?: string;

  physics_score?: number;
  physics_rank?: number;
  physics_rank_in_class?: number;
  physics_grade?: string;

  chemistry_score?: number;
  chemistry_rank?: number;
  chemistry_rank_in_class?: number;
  chemistry_grade?: string;

  biology_score?: number;
  biology_rank?: number;
  biology_rank_in_class?: number;
  biology_grade?: string;

  politics_score?: number;
  politics_rank?: number;
  politics_rank_in_class?: number;
  politics_grade?: string;

  history_score?: number;
  history_rank?: number;
  history_rank_in_class?: number;
  history_grade?: string;

  geography_score?: number;
  geography_rank?: number;
  geography_rank_in_class?: number;
  geography_grade?: string;

  [key: string]: any; // 支持动态字段
}
