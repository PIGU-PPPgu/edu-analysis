/**
 * API 类型修复
 * 解决 exactOptionalPropertyTypes 配置引起的类型错误
 */

// 修复 Supabase 响应类型的可选属性问题
export type SupabaseResponse<T> = {
  data: T[] | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  count?: number | null;
  status: number;
  statusText: string;
};

// 修复 API 响应中的可选字段类型
export type APIResponseData<T> = T & {
  // 确保所有可能为 undefined 的字段都明确标记
  id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

// 修复成绩记录中的可选字段
export interface FixedGradeRecord {
  id?: string;
  student_id: string;
  student_name: string;
  class_name: string;
  subject?: string;
  score?: number;
  total_score?: number;
  chinese_score?: number;
  math_score?: number;
  english_score?: number;
  physics_score?: number;
  chemistry_score?: number;
  grade_level?: string;
  exam_id?: string;
  exam_name?: string;
  exam_date?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// 修复学生记录中的可选字段
export interface FixedStudent {
  id: string;
  student_id: string;
  name: string;
  class_id?: string;
  class_name?: string;
  user_id?: string;
  admission_year?: string;
  gender?: "男" | "女" | "其他";
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  // 动态添加的字段（来自 enrichStudentsWithPerformance）
  latest_score?: number;
  class_rank?: number;
}

// 修复查询过滤器中的可选字段
export interface FixedQueryFilters {
  [key: string]: any;
  // 常用过滤器
  id?: string | { eq?: string; neq?: string; in?: string[] };
  student_id?: string | { eq?: string; neq?: string; in?: string[] };
  class_name?: string | { eq?: string; neq?: string };
  exam_id?: string | { eq?: string; neq?: string };
  name?: { ilike?: string };
}

// 修复 Supabase 查询参数
export interface FixedQueryParams {
  filters?: FixedQueryFilters;
  select?: string[];
  orderBy?: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  offset?: number;
}

// 工具类型：将所有属性标记为可选但保持类型安全
export type PartialRequired<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// 工具类型：处理 Supabase 可能返回 null 的情况
export type NullableResponse<T> = T | null;

// 修复函数返回类型
export type FixedAPIResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 批量操作结果类型
export interface BatchOperationResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// 导出合并的类型，确保向后兼容
export type SafeGradeRecord = FixedGradeRecord;
export type SafeStudent = FixedStudent;
export type SafeAPIResponse<T> = FixedAPIResponse<T>;
