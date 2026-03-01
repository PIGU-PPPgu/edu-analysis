/**
 * 增值评价系统 - 完整TypeScript类型定义
 * 参照汇优评系统设计
 */

// ============================================
// 基础类型
// ============================================

/** 能力等级 (A+/A/B+/B/C+/C) */
export type AbilityLevel = "A+" | "A" | "B+" | "B" | "C+" | "C";

/** 增值活动状态 */
export type ActivityStatus = "pending" | "analyzing" | "completed" | "failed";

/** 班级类型 */
export type ClassType = "administrative" | "teaching";

/** 报告类型 */
export type ReportType =
  | "teacher_score" // 教师分数增值
  | "teacher_ability" // 教师能力增值
  | "class_score" // 班级分数增值
  | "class_ability" // 班级能力增值
  | "subject_balance" // 学科发展均衡
  | "student_detail" // 学生增值明细
  | "historical_trend"; // 历次追踪

/** 报告维度 */
export type ReportDimension = "teacher" | "class" | "student" | "subject";

// ============================================
// 数据库表类型
// ============================================

/** 等级划分配置 */
export interface GradeLevelConfig {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  levels: GradeLevelDefinition[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

/** 等级定义 */
export interface GradeLevelDefinition {
  level: AbilityLevel;
  label: string;
  percentile: {
    min: number; // 0.00 - 1.00
    max: number;
  };
  color: string;
  description: string;
}

/** 教师-学生-科目关联 */
export interface TeacherStudentSubject {
  id: string;
  teacher_id: string;
  teacher_name: string;
  student_id: string;
  student_name: string;
  subject: string;
  class_name: string;
  class_type: ClassType;
  academic_year: string;
  semester: string;
  is_elective: boolean;
  school_id?: string; // 学校ID（多学校支持）
  created_at: Date;
  updated_at: Date;
}

/** 增值活动 */
export interface ValueAddedActivity {
  id: string;
  name: string;
  description?: string;
  entry_exam_id: string;
  entry_exam_title: string;
  exit_exam_id: string;
  exit_exam_title: string;
  grade_level: string;
  student_year: string;
  academic_year: string;
  semester: string;
  status: ActivityStatus;
  error_message?: string;
  grade_level_config_id?: string;
  created_by?: string;
  created_at: Date;
  completed_at?: Date;
  updated_at: Date;
}

/** 计算结果缓存 */
export interface ValueAddedCache {
  id: string;
  activity_id: string;
  report_type: ReportType;
  dimension: ReportDimension;
  target_id: string;
  target_name?: string;
  result: any; // JSONB
  school_id?: string; // 学校ID（多学校支持）
  created_at: Date;
  expires_at: Date;
}

/** 考试序列 */
export interface ExamSeries {
  id: string;
  name: string;
  description?: string;
  grade_level: string;
  student_year: string;
  academic_year: string;
  exams: ExamInSeries[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

/** 序列中的考试 */
export interface ExamInSeries {
  exam_id: string;
  exam_title: string;
  exam_date: string;
  sequence: number;
}

// ============================================
// 业务数据类型
// ============================================

/** 学生增值数据 */
export interface StudentValueAdded {
  student_id: string;
  student_name: string;
  class_name: string;
  subject: string;
  school_id?: string; // 学校ID（多学校支持）

  // 分数数据
  entry_score: number;
  exit_score: number;
  entry_z_score: number;
  exit_z_score: number;
  score_value_added: number;
  score_value_added_rate: number;

  // 能力数据
  entry_level: AbilityLevel;
  exit_level: AbilityLevel;
  level_change: number;
  is_consolidated: boolean;
  is_transformed: boolean;

  // 排名数据
  entry_rank_in_class?: number;
  exit_rank_in_class?: number;
  rank_change?: number;
}

/** 增值评价指标数据（用于趋势预测和分析） */
export interface ValueAddedMetrics {
  studentId: string;
  studentName: string;
  className: string;
  subject?: string;

  // 基准考试（入口）
  baselineExam?: {
    examId: string;
    examTitle: string;
    examDate?: string;
    score: number;
    rank?: number;
    level?: AbilityLevel;
  };

  // 目标考试（出口）
  targetExam?: {
    examId: string;
    examTitle: string;
    examDate?: string;
    score: number;
    rank?: number;
    level?: AbilityLevel;
  };

  // 增值指标
  scoreChange?: number;
  scoreChangeRate?: number;
  zScoreChange?: number;
  levelChange?: number;
  // 扩展字段（valueAddedUtils 计算结果）
  improvementScore?: number;
  improvementRate?: number;
  rankChange?: number;
  status?: "ok" | "insufficient" | "missing";
  level?: number;
  levelLabel?: string;
  levelDescription?: string;
}

/** 考试快照（增值计算用） */
export interface ExamSnapshot {
  examId: string;
  examTitle: string;
  examDate: string;
  score: number;
  rank?: number;
}

/** 增值计算的对比范围 */
export type ComparisonScope = "class" | "grade" | "school";

/** 段位评价配置 */
export interface LevelEvaluationConfig {
  levelCount: number;
  method: "percentile" | "fixed" | "stddev";
  percentileThresholds?: number[];
  fixedThresholds?: number[];
  labels?: string[];
  descriptions?: string[];
}

/** 增值统计摘要 */
export interface ValueAddedSummary {
  totalStudents: number;
  validStudents: number;
  avgImprovement: number;
  avgImprovementRate: number;
  improvedCount: number;
  improvedRate: number;
  regressionCount: number;
  regressionRate: number;
  stableCount: number;
  topImprover?: ValueAddedMetrics;
  topRegressor?: ValueAddedMetrics;
  levelDistribution?: Record<number, number>;
}

/** 通用计算结果包装 */
export interface CalculationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/** 考试基本信息（用于下拉选择） */
export interface ExamInfo {
  examId: string;
  examTitle: string;
  examDate?: string;
  examType?: string;
  // 字段别名（向后兼容）
  id?: string;
  title?: string;
  date?: string;
  type?: string;
  exam_title?: string;
}

/** 考试选择状态 */
export interface ExamSelectionState {
  baselineExamId?: string;
  targetExamId?: string;
  scope?: ComparisonScope;
  comparisonScope?: ComparisonScope;
  className?: string;
}

/** 教师增值评价 */
export interface TeacherValueAdded {
  teacher_id: string;
  teacher_name: string;
  subject: string;
  class_name: string; // 所教班级（细粒度存储：每个教师-班级-科目组合一条记录）
  school_id?: string; // 学校ID（多学校支持）

  // 分数增值
  avg_score_value_added_rate: number;
  progress_student_count: number;
  progress_student_ratio: number;
  avg_z_score_change: number;

  // 能力增值
  consolidation_rate: number;
  transformation_rate: number;
  contribution_rate: number;
  excellent_gain: number;

  // 学生统计
  total_students: number;
  entry_excellent_count: number;
  exit_excellent_count: number;

  // 统计有效性（新增）
  warnings?: string[]; // 统计警告信息
  is_statistically_significant?: boolean; // 是否统计显著

  // 排名
  rank_in_subject?: number;
  total_teachers?: number;

  // 班级明细（聚合后填充）
  class_details?: Array<{
    class_name: string;
    avg_rate: number;
    student_count: number;
  }>;

  // 向后兼容字段
  avg_score_exit?: number;
  exit_excellent_rate?: number;
}

/** 班级增值评价 */
export interface ClassValueAdded {
  class_id?: string;
  class_name: string;
  subject: string;
  school_id?: string; // 学校ID（多学校支持）

  // 原始分数（参照汇优评）
  avg_score_entry?: number; // 入口平均分
  avg_score_exit?: number; // 出口平均分
  avg_score_standard_entry?: number; // 入口标准分（500 + 100*Z）
  avg_score_standard_exit?: number; // 出口标准分（500 + 100*Z）

  // 分数增值
  avg_score_value_added_rate: number;
  progress_student_ratio: number;
  avg_z_score_change: number;

  // 能力增值
  consolidation_rate: number;
  transformation_rate: number;
  contribution_rate: number;

  // 学生统计
  total_students: number;
  entry_excellent_count: number;
  exit_excellent_count: number;
  excellent_gain: number;

  // 统计有效性（新增）
  warnings?: string[]; // 统计警告信息
  is_statistically_significant?: boolean; // 是否统计显著（无警告）
  valid_sample_count?: number; // 有效样本数（过滤缺考后）

  // 排名
  rank_in_grade?: number;
  total_classes?: number;
}

/** 学科均衡分析 */
export interface SubjectBalanceAnalysis {
  class_name: string;

  // 总体增值
  total_score_value_added_rate: number;
  total_rank?: number;

  // 学科偏离度
  subject_deviation: number;
  deviation_score: number;

  // 各科目数据
  subjects: SubjectValueAddedDetail[];

  // 综合评分
  balance_score: number;
}

/** 科目增值详情 */
export interface SubjectValueAddedDetail {
  subject: string;
  value_added_rate: number;
  deviation_from_avg: number;
  rank?: number;
}

/** 历次追踪数据 */
export interface HistoricalTracking {
  target_id: string;
  target_name: string;
  target_type: "teacher" | "class" | "student";
  subject?: string;

  exam_series: ExamInSeries[];

  score_trend: ScoreTrendPoint[];
  ability_trend: AbilityTrendPoint[];
}

/** 分数趋势点 */
export interface ScoreTrendPoint {
  exam_id: string;
  exam_title: string;
  exam_date: string;
  avg_score: number;
  z_score: number;
  value_added_rate?: number;
  rank?: number;
}

/** 能力趋势点 */
export interface AbilityTrendPoint {
  exam_id: string;
  exam_title: string;
  exam_date: string;
  excellent_rate: number;
  consolidation_rate?: number;
  transformation_rate?: number;
  contribution_rate?: number;
}

// ============================================
// 数据导入类型
// ============================================

/** 学生信息（Excel导入） */
export interface StudentInfo {
  school_name: string;
  school_code: string;
  student_id: string;
  student_name: string; // Excel中的字段名
  name: string; // 数据库字段名（与student_name相同值）
  class_name: string;
  class_code: string;
  gender?: "男" | "女" | "其他";
  enrollment_year?: string; // 对应数据库的 admission_year
}

/** 教学编排（Excel导入）
 * 注意: 此表实际是 teacher-student-subject 三方关联
 * 需要在导入时展开为每个学生的记录
 */
export interface TeachingArrangement {
  school_name: string;
  school_code: string;
  class_name: string;
  class_code: string;
  teacher_id: string; // 必填，对应数据库 UUID
  teacher_name: string;
  subject: string;
  is_elective: boolean;

  // 数据库必填字段（导入时需补充）
  student_id?: string; // 在处理时按学生展开
  student_name?: string; // 在处理时按学生展开
  academic_year?: string; // 默认当前学年
  semester?: string; // 默认当前学期
  class_type?: ClassType; // 默认 'administrative'
}

/** 学生走班信息（Excel导入） */
export interface ElectiveCourse {
  school_name: string;
  school_code: string;
  student_id: string;
  student_name: string;
  subject: string;
  class_name: string;
  class_code: string;
}

/** 成绩数据（Excel导入） */
export interface GradeScores {
  school_name: string;
  school_code: string;
  student_id: string;
  student_name: string;
  class_name?: string; // 数据库需要

  // 原始scores字段（解析阶段使用）
  scores: Record<string, number | string>; // 科目 -> 分数/Q/N

  // 展开后的扁平字段（存储阶段使用）
  total_score?: number;
  chinese_score?: number | string;
  math_score?: number | string;
  english_score?: number | string;
  physics_score?: number | string;
  chemistry_score?: number | string;
  biology_score?: number | string;
  politics_score?: number | string;
  history_score?: number | string;
  geography_score?: number | string;

  // ✅ Task #21: 等级字段（可选，从Excel导入）
  chinese_grade?: string;
  math_grade?: string;
  english_grade?: string;
  physics_grade?: string;
  chemistry_grade?: string;
  biology_grade?: string;
  politics_grade?: string;
  history_grade?: string;
  geography_grade?: string;
}

/** 数据校验结果 */
/** 详细错误信息 */
export interface DetailedError {
  row: number; // 行号（从1开始）
  field: string; // 字段名
  message: string; // 错误描述
  currentValue: string | number | null; // 当前值
  suggestion?: string; // 修复建议
}

export interface ValidationResult {
  rule: string;
  status: "passed" | "failed" | "warning";
  errors: string[]; // 保留向后兼容
  error_count: number;
  warnings?: string[];
  detailedErrors?: DetailedError[]; // 新增详细错误
}

// ============================================
// 计算参数类型
// ============================================

/** 分析参数配置 */
export interface AnalysisParams {
  // 单科目满分值
  subject_max_scores: Record<string, number>;

  // 分数转换规则
  score_conversion_rules?: Record<string, ScoreConversionRule>;

  // 总分合成规则
  total_score_composition?: TotalScoreComposition;

  // 有效口径设置
  valid_scope?: ValidScopeConfig;

  // 等级划分配置ID
  grade_level_config_id: string;
}

/** 分数转换规则 */
export interface ScoreConversionRule {
  source_max: number;
  target_max: number;
  formula: "linear" | "custom";
  custom_formula?: string;
}

/** 总分合成规则 */
export interface TotalScoreComposition {
  method: "sum" | "weighted";
  weights?: Record<string, number>;
  included_subjects: string[];
}

/** 有效口径配置 */
export interface ValidScopeConfig {
  min_valid_subjects?: number;
  exclude_absent?: boolean;
  exclude_not_participate?: boolean;
}

// ============================================
// UI组件Props类型
// ============================================

/** 文件上传状态 */
export interface FileUploadStatus {
  status: "idle" | "uploading" | "success" | "error";
  progress?: number;
  error?: string;
  file_name?: string;
  row_count?: number;
}

/** 数据导入工作流状态 */
export interface ImportWorkflowState {
  current_step: 1 | 2 | 3;
  exam_info: {
    exam_title: string;
    exam_date: Date;
    grade_level: string;
    student_year: string;
  };
  uploaded_files: {
    student_info?: File;
    teaching_arrangement?: File;
    elective_course?: File;
    grade_scores?: File;
  };
  uploaded_data: {
    student_info: StudentInfo[];
    teaching_arrangement: TeachingArrangement[];
    elective_course: ElectiveCourse[];
    grade_scores: GradeScores[];
  };
  validation_results: ValidationResult[];
  analysis_params: Partial<AnalysisParams>;
}

// ============================================
// 工具类型
// ============================================

/** 统计数据 */
export interface Statistics {
  count: number;
  sum: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
  q1?: number; // 第一四分位数
  q3?: number; // 第三四分位数
}

/** 百分位数据 */
export interface PercentileData {
  value: number;
  percentile: number; // 0-1
  rank: number;
  total: number;
}

// ============================================
// 导入配置相关类型
// ============================================

/** 导入配置 */
export interface ImportConfiguration {
  id: string;
  name: string;
  description?: string;
  academic_year?: string;
  semester?: string;
  grade_levels?: string[];
  student_count: number;
  class_count: number;
  teacher_count: number;
  subject_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  is_active: boolean;
}

/** 创建配置参数 */
export interface CreateConfigurationParams {
  name: string;
  description?: string;
  academic_year?: string;
  semester?: string;
  studentInfo: StudentInfo[];
  teachingArrangement: TeachingArrangement[];
}

/** 配置详情（包含关联数据统计） */
export interface ConfigurationDetail extends ImportConfiguration {
  classes: Array<{
    class_name: string;
    student_count: number;
  }>;
  teachers: Array<{
    teacher_name: string;
    subjects: string[];
    email?: string;
    teacher_id: string;
  }>;
  subjects: string[];
}

/** 配置选择模式 */
export type ConfigurationMode = "existing" | "new";

/** 配置导入结果 */
export interface ConfigurationImportResult {
  success: boolean;
  config_id: string;
  students_created: number;
  teachers_created: number;
  errors?: string[];
}
