/**
 * 🎯 UnifiedAppContext 统一类型定义
 * 为现代化Context架构提供完整的TypeScript支持
 */

import { User, Session } from "@supabase/supabase-js";
import { GradeRecord, ExamInfo, GradeStatistics } from "@/types/grade";

// ==================== 基础状态类型 ====================

export interface AppError {
  id: string;
  message: string;
  code?: string;
  timestamp: number;
  module: string;
  recoverable?: boolean;
  retryCount?: number;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
  message?: string;
}

export interface NotificationState {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
}

// ==================== 认证模块类型 ====================

export interface AuthModuleState {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAuthReady: boolean;
  loading: LoadingState;
  error: AppError | null;
}

export interface AuthModuleActions {
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

// ==================== 成绩分析模块类型 ====================

export interface GradeFilterConfig {
  examIds?: string[];
  subjects?: string[];
  classNames?: string[];
  grades?: string[];
  scoreRange?: { min?: number; max?: number };
  rankRange?: { min?: number; max?: number };
  searchKeyword?: string;
  dateRange?: { start?: Date; end?: Date };
}

export interface GradeModuleState {
  // 数据状态
  allGradeData: GradeRecord[];
  wideGradeData: any[];
  filteredGradeData: GradeRecord[];
  examList: ExamInfo[];
  statistics: GradeStatistics | null;

  // 筛选状态
  filter: GradeFilterConfig;

  // 系统状态
  loading: LoadingState;
  error: AppError | null;
  lastUpdated: number | null;

  // 可用选项
  availableSubjects: string[];
  availableClasses: string[];
  availableGrades: string[];
  availableExamTypes: string[];
}

export interface GradeModuleActions {
  // 数据操作
  loadAllData: () => Promise<void>;
  loadExamData: (examId: string) => Promise<void>;
  refreshData: () => Promise<void>;

  // 筛选操作
  setFilter: (filter: GradeFilterConfig) => void;
  updateFilter: (updates: Partial<GradeFilterConfig>) => void;
  clearFilter: () => void;

  // 查询方法
  getStudentGrades: (studentId: string) => GradeRecord[];
  getSubjectGrades: (subject: string) => GradeRecord[];
  getClassGrades: (className: string) => GradeRecord[];

  // 错误处理
  clearError: () => void;
  retry: () => Promise<void>;
}

// ==================== 筛选模块类型 ====================

export interface FilterModuleState {
  mode: "grade" | "single-class" | "multi-class";
  selectedClasses: string[];
  selectedSubjects: string[];
  selectedExam: string;
  searchTerm?: string;
  dateRange?: [Date, Date];
  isFiltered: boolean;
}

export interface FilterModuleActions {
  updateFilter: (newState: Partial<FilterModuleState>) => void;
  resetFilter: () => void;
  setMode: (mode: FilterModuleState["mode"]) => void;
  addClassFilter: (className: string) => void;
  removeClassFilter: (className: string) => void;
  toggleSubjectFilter: (subject: string) => void;
}

// ==================== UI模块类型 ====================

export interface UIModuleState {
  // 主题和布局
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  compactMode: boolean;

  // 响应式状态
  isMobile: boolean;
  viewport: {
    width: number;
    height: number;
  };

  // 通知系统
  notifications: NotificationState[];

  // 全局加载状态
  globalLoading: LoadingState;

  // 性能模式
  performanceMode: "high" | "balanced" | "low";
}

export interface UIModuleActions {
  // 主题控制
  setTheme: (theme: UIModuleState["theme"]) => void;
  toggleSidebar: () => void;
  setCompactMode: (compact: boolean) => void;

  // 通知管理
  addNotification: (
    notification: Omit<NotificationState, "id" | "timestamp">
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // 全局状态
  setGlobalLoading: (loading: Partial<LoadingState>) => void;
  clearGlobalLoading: () => void;

  // 性能优化
  setPerformanceMode: (mode: UIModuleState["performanceMode"]) => void;
}

// ==================== 统一Context类型 ====================

export interface UnifiedAppState {
  auth: AuthModuleState;
  grade: GradeModuleState;
  filter: FilterModuleState;
  ui: UIModuleState;

  // 全局状态
  initialized: boolean;
  version: string;
  buildTime: string;
}

export interface UnifiedAppActions {
  auth: AuthModuleActions;
  grade: GradeModuleActions;
  filter: FilterModuleActions;
  ui: UIModuleActions;

  // 全局操作
  initialize: () => Promise<void>;
  reset: () => void;
  getModuleState: <T extends keyof UnifiedAppState>(
    module: T
  ) => UnifiedAppState[T];
}

export interface UnifiedAppContextType {
  state: UnifiedAppState;
  actions: UnifiedAppActions;

  // 便捷访问器
  auth: AuthModuleState & AuthModuleActions;
  grade: GradeModuleState & GradeModuleActions;
  filter: FilterModuleState & FilterModuleActions;
  ui: UIModuleState & UIModuleActions;

  // 开发工具
  debug: {
    logState: () => void;
    exportState: () => string;
    importState: (state: string) => void;
  };
}

// ==================== 模块配置类型 ====================

export interface ModuleConfig {
  enabled: boolean;
  lazy?: boolean;
  dependencies?: string[];
  initializationOrder?: number;
}

export interface UnifiedAppConfig {
  modules: {
    auth: ModuleConfig;
    grade: ModuleConfig;
    filter: ModuleConfig;
    ui: ModuleConfig;
  };

  // 全局配置
  enableDevTools: boolean;
  performanceLogging: boolean;
  errorBoundary: boolean;
  persistState: boolean;

  // 兼容性设置
  legacyContextSupport: boolean;
  migrationMode: boolean;
}

// ==================== Hook类型 ====================

export interface UseInitializeAppOptions {
  skipAuthInit?: boolean;
  preloadGradeData?: boolean;
  enablePerformanceMode?: boolean;
  onInitComplete?: () => void;
  onError?: (error: AppError) => void;
}

export interface UseInitializeAppReturn {
  initialized: boolean;
  loading: boolean;
  error: AppError | null;
  progress: number;
  retry: () => Promise<void>;
}

// ==================== 性能优化类型 ====================

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
}

export interface ModulePerformance {
  [moduleName: string]: PerformanceMetrics;
}

// ==================== 错误类型 ====================

export type AppErrorCode =
  | "AUTH_ERROR"
  | "DATA_LOAD_ERROR"
  | "NETWORK_ERROR"
  | "PERMISSION_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export interface ErrorContext {
  module: string;
  operation: string;
  userId?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  additionalInfo?: Record<string, any>;
}

// ==================== 导出所有类型 ====================

export type {
  // 重新导出外部类型
  User,
  Session,
  GradeRecord,
  ExamInfo,
  GradeStatistics,
};
