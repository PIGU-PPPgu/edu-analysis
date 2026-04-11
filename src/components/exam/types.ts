/**
 * 考试管理相关的类型定义
 */

// 导入基础类型
import {
  Exam as DBExam,
  ExamType as DBExamType,
  AcademicTerm,
  ExamSubjectScore,
} from "@/services/examService";

// 扩展的考试接口，用于UI展示
export interface Exam extends Omit<DBExam, "subject" | "status"> {
  subjects: string[];
  status: "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";
  createdBy: string;
  classes: string[];
  tags: string[];
  participantCount: number;
  typeInfo?: ExamType;
}

// 考试类型接口，用于UI展示
export interface ExamType {
  id: string;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
}

// 考试统计接口
export interface ExamStatistics {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  averageParticipation: number;
  averageScore: number;
  improvementRate: number;
  riskExams: number;
}

// 筛选条件接口
export interface ExamFilters {
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  selectedTermId: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

// 考试表单接口
export interface ExamFormData extends Partial<Exam> {
  title: string;
  description: string;
  type: string;
  subjects: string[];
  date: string;
  startTime: string;
  endTime: string;
  totalScore: number;
  passingScore: number;
  classes: string[];
  status: Exam["status"];
}

// 对话框状态接口
export interface DialogStates {
  isCreateDialogOpen: boolean;
  editingExamId: string | null;
  isSubjectScoreDialogOpen: boolean;
  selectedExamForScoreConfig: Exam | null;
}

// 导出基础类型
export type { DBExam, DBExamType, AcademicTerm, ExamSubjectScore };

// 考试状态选项
export const EXAM_STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "scheduled", label: "已安排" },
  { value: "ongoing", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
] as const;

// 科目选项
export const SUBJECT_OPTIONS = [
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "政治",
  "体育",
  "音乐",
  "美术",
  "信息技术",
] as const;

// ⚠️ DEPRECATED: 不要使用此常量！
// 硬编码的班级列表会导致数据泄露，让不同用户看到彼此的数据
// 应该从数据库动态加载班级列表，使用 RLS 确保数据隔离
// 示例：await supabase.from("class_info").select("class_name")
// @deprecated 此常量已弃用，仅保留以防向后兼容，不应在新代码中使用
export const CLASS_OPTIONS = [] as const;

// 考试类型映射
export const EXAM_TYPE_MAP: Record<string, { color: string }> = {
  期中考试: { color: "#3B82F6" },
  期末考试: { color: "#EF4444" },
  月考: { color: "#10B981" },
  小测: { color: "#F59E0B" },
  模拟考试: { color: "#8B5CF6" },
  随堂测验: { color: "#06B6D4" },
};

// 状态颜色映射
export const STATUS_COLOR_MAP: Record<string, string> = {
  draft: "#6B7280",
  scheduled: "#3B82F6",
  ongoing: "#10B981",
  completed: "#059669",
  cancelled: "#EF4444",
};

// 状态标签映射
export const STATUS_LABEL_MAP: Record<string, string> = {
  draft: "草稿",
  scheduled: "已安排",
  ongoing: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};
