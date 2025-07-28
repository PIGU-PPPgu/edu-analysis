/**
 * 统一的成绩数据类型定义
 * 为整个系统提供标准的数据接口规范
 */

// 科目枚举
export enum Subject {
  TOTAL = "总分",
  CHINESE = "语文",
  MATH = "数学",
  ENGLISH = "英语",
  PHYSICS = "物理",
  CHEMISTRY = "化学",
  POLITICS = "政治",
  HISTORY = "历史",
}

// 等级枚举
export enum GradeLevel {
  A_PLUS = "A+",
  A = "A",
  B_PLUS = "B+",
  B = "B",
  C_PLUS = "C+",
  C = "C",
}

// 基础成绩记录接口
export interface BaseGradeRecord {
  id?: string;
  student_id: string;
  student_name: string;
  class_name: string;
  subject: Subject | string;
  score: number;
  grade_level?: GradeLevel | string;
  exam_id?: string;
  exam_name?: string;
  exam_date?: string;
  created_at?: string;
  updated_at?: string;
}

// CSV数据记录接口（对应原始CSV格式）
export interface CSVGradeRecord {
  姓名: string;
  班级: string;
  总分分数: number;
  总分等级: string;
  总分班名: number;
  总分校名: number;
  总分级名: number;
  语文分数: number;
  语文等级: string;
  语文班名: number;
  语文校名: number;
  语文级名: number;
  数学分数: number;
  数学等级: string;
  数学班名: number;
  数学校名: number;
  数学级名: number;
  英语分数: number;
  英语等级: string;
  英语班名: number;
  英语校名: number;
  英语级名: number;
  物理分数: number;
  物理等级: string;
  物理班名: number;
  物理校名: number;
  物理级名: number;
  化学分数: number;
  化学等级: string;
  化学班名: number;
  化学校名: number;
  化学级名: number;
  道法分数: number;
  道法等级: string;
  道法班名: number;
  道法校名: number;
  道法级名: number;
  历史分数: number;
  历史等级: string;
  历史班名: number;
  历史校名: number;
  历史级名: number;
}

// 数据库存储的成绩记录接口
export interface DatabaseGradeRecord extends BaseGradeRecord {
  // 兼容性字段（用于数据库存储）
  total_grade?: string;
  chinese_grade?: string;
  math_grade?: string;
  english_grade?: string;
  physics_grade?: string;
  chemistry_grade?: string;
  politics_grade?: string;
  history_grade?: string;

  // 排名相关字段
  rank_in_class?: number;
  rank_in_school?: number;
  rank_in_grade?: number;
}

// 统一的成绩记录接口（推荐使用）
export interface GradeRecord extends BaseGradeRecord {
  // CSV原始字段（可选，用于兼容）
  总分分数?: number;
  总分等级?: string;
  语文分数?: number;
  语文等级?: string;
  数学分数?: number;
  数学等级?: string;
  英语分数?: number;
  英语等级?: string;
  物理分数?: number;
  物理等级?: string;
  化学分数?: number;
  化学等级?: string;
  道法分数?: number;
  道法等级?: string;
  历史分数?: number;
  历史等级?: string;

  // 排名字段
  总分班名?: number;
  总分校名?: number;
  总分级名?: number;
  语文班名?: number;
  语文校名?: number;
  语文级名?: number;
  数学班名?: number;
  数学校名?: number;
  数学级名?: number;
  英语班名?: number;
  英语校名?: number;
  英语级名?: number;
  物理班名?: number;
  物理校名?: number;
  物理级名?: number;
  化学班名?: number;
  化学校名?: number;
  化学级名?: number;
  道法班名?: number;
  道法校名?: number;
  道法级名?: number;
  历史班名?: number;
  历史校名?: number;
  历史级名?: number;

  // 扩展字段（用于灵活性）
  [key: string]: any;
}

// 等级信息接口
export interface GradeLevelInfo {
  level: GradeLevel | string;
  displayName: string;
  color: string;
  icon: string;
  description: string;
  minPercentage: number;
  maxPercentage: number;
}

// 等级分布统计接口
export interface GradeLevelDistribution {
  level: GradeLevel | string;
  name: string;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

// 成绩统计接口
export interface GradeStatistics {
  total: number;
  average: number;
  max: number;
  min: number;
  median: number;
  standardDeviation: number;
  passRate: number;
  excellentRate: number;
  distribution: GradeLevelDistribution[];
}

// 科目配置接口
export interface SubjectConfig {
  name: Subject | string;
  displayName: string;
  maxScore: number;
  passScore: number;
  excellentScore: number;
}

// 考试信息接口
export interface ExamInfo {
  id: string;
  name: string;
  type: string;
  date: string;
  subjects: Subject[];
  totalStudents?: number;
  statistics?: {
    [subject: string]: GradeStatistics;
  };
}

// 筛选条件接口
export interface GradeFilter {
  subject?: Subject | string;
  class?: string;
  examId?: string;
  gradeLevel?: GradeLevel | string;
  scoreRange?: {
    min: number;
    max: number;
  };
}

// API响应接口
export interface GradeDataResponse<T = GradeRecord> {
  data: T[];
  total: number;
  statistics?: GradeStatistics;
  error?: string;
}

// 班级统计数据类型
export interface ClassStatistics {
  className: string;
  studentCount: number;
  statistics: {
    [subject: string]: GradeStatistics;
  };
  gradeLevelDistribution: {
    [subject: string]: GradeLevelDistribution[];
  };
  classRank?: number; // 在年级中的排名
}

// 班级对比数据
export interface ClassComparison {
  classes: ClassStatistics[];
  gradeOverall: GradeStatistics; // 年级整体统计
  comparisonMetrics: {
    subject: Subject;
    classRankings: Array<{
      className: string;
      average: number;
      rank: number;
    }>;
    gradeAverage: number;
    bestClass: string;
    worstClass: string;
  }[];
}

// 班级筛选状态
export interface ClassFilterState {
  selectedClasses: string[]; // 选中的班级
  viewMode: "all" | "selected" | "comparison"; // 视图模式
  comparisonTarget?: "grade" | "classes"; // 对比目标
}

// 班级分析配置
export interface ClassAnalysisConfig {
  includeGradeComparison: boolean; // 是否包含年级对比
  showClassRankings: boolean; // 是否显示班级排名
  enableMultiSelect: boolean; // 是否启用多选
  defaultView: "all" | "individual"; // 默认视图
}

// 班级数据聚合结果
export interface ClassDataAggregation {
  byClass: Map<string, GradeRecord[]>;
  classNames: string[];
  totalStudents: number;
  classStudentCounts: Map<string, number>;
}
