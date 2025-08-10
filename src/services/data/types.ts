/**
 * 统一数据层类型定义
 * 为数据访问层提供标准化的接口和类型
 */

// 数据配置类型
export interface DataConfig {
  current: "supabase" | "self-hosted";
  supabase?: {
    url: string;
    key: string;
  };
  selfHosted?: {
    baseURL: string;
    apiKey: string;
  };
}

// 通用筛选接口
export interface BaseFilter {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

// 成绩数据筛选
export interface GradeFilter extends BaseFilter {
  studentId?: string;
  examId?: string;
  examTitle?: string;
  className?: string;
  subject?: string;
  scoreRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    from?: string;
    to?: string;
  };
}

// 考试数据筛选
export interface ExamFilter extends BaseFilter {
  examId?: string;
  title?: string;
  type?: string;
  subject?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
  status?: string;
  termId?: string;
}

// 学生数据筛选
export interface StudentFilter extends BaseFilter {
  studentId?: string;
  name?: string;
  className?: string;
  grade?: string;
}

// 统一的数据响应格式
export interface DataResponse<T> {
  data: T[];
  total?: number;
  hasMore?: boolean;
  error?: string;
}

// 数据适配器接口
export interface DataAdapter {
  // 成绩数据
  getGrades(filter: GradeFilter): Promise<DataResponse<any>>;
  createGrade(data: any): Promise<any>;
  updateGrade(id: string, data: any): Promise<any>;
  deleteGrade(id: string): Promise<boolean>;

  // 考试数据
  getExams(filter: ExamFilter): Promise<DataResponse<any>>;
  createExam(data: any): Promise<any>;
  updateExam(id: string, data: any): Promise<any>;
  deleteExam(id: string): Promise<boolean>;

  // 学生数据
  getStudents(filter: StudentFilter): Promise<DataResponse<any>>;
  createStudent(data: any): Promise<any>;
  updateStudent(id: string, data: any): Promise<any>;
  deleteStudent(id: string): Promise<boolean>;

  // 统计数据
  getStatistics(type: "exam" | "grade" | "student", id?: string): Promise<any>;

  // 批量操作
  batchOperation(
    operation: "create" | "update" | "delete",
    data: any[]
  ): Promise<any[]>;
}

// 缓存配置
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // 缓存时间（秒）
  maxSize: number; // 最大缓存条目数
  storage: "memory" | "localStorage" | "sessionStorage";
}

// 缓存键生成器类型
export type CacheKeyGenerator = (operation: string, params: any) => string;

// 数据转换器接口
export interface DataTransformer {
  // 将数据库格式转换为前端格式
  fromDatabase(data: any, type: string): any;
  // 将前端格式转换为数据库格式
  toDatabase(data: any, type: string): any;
}
