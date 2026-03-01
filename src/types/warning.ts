/**
 * 统一的预警系统类型定义
 * 集中管理所有预警相关的接口和类型
 */

// 基础严重程度类型
export type SeverityLevel = "low" | "medium" | "high";

// 预警规则范围
export type WarningScope = "global" | "exam" | "class" | "student";

// 预警分类
export type WarningCategory =
  | "grade"
  | "attendance"
  | "behavior"
  | "progress"
  | "homework"
  | "composite";

// 预警记录状态
export type WarningStatus = "active" | "resolved" | "dismissed";

// 规则执行状态
export type RuleExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timeout";

// 执行类型
export type ExecutionType = "manual" | "auto" | "scheduled" | "data_change";

/**
 * 预警规则接口
 */
export interface WarningRule {
  id: string;
  name: string;
  description: string;
  conditions: Record<string, any>;
  severity: SeverityLevel;
  scope: WarningScope;
  category: WarningCategory;
  is_active: boolean;
  is_system?: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * 预警记录接口
 */
export interface WarningRecord {
  id: string;
  student_id: string;
  rule_id: string;
  status: WarningStatus;
  details: Record<string, any>;
  severity: SeverityLevel;
  scope: WarningScope;
  category: WarningCategory;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  trigger_data?: Record<string, any>;
  // JOIN 结果字段（Supabase 关联查询）
  students?: any;
  warning_rules?: any;
}

/**
 * 预警统计接口
 */
export interface WarningStatistics {
  totalStudents: number;
  warningStudents: number;
  atRiskStudents: number;
  warningRatio: number;
  highRiskStudents: number;
  totalWarnings: number;
  activeWarnings: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  categoryDistribution: {
    grade: number;
    attendance: number;
    behavior: number;
    progress: number;
    homework: number;
    composite: number;
  };
  scopeDistribution: {
    global: number;
    exam: number;
    class: number;
    student: number;
  };
  warningsByType: Array<{
    type: string;
    count: number;
    percentage: number;
    trend?: "up" | "down" | "unchanged";
  }>;
  riskByClass: Array<{
    className: string;
    studentCount: number;
    atRiskCount: number;
    highRiskCount: number;
  }>;
  commonRiskFactors: Array<{
    factor: string;
    count: number;
    percentage: number;
    frequency: number;
    trend?: number[];
    category?: string;
    severity?: SeverityLevel;
  }>;
}

/**
 * 预警筛选接口 - 兼容现有代码的扩展版本
 */
export interface WarningFilter {
  // 时间范围
  timeRange?: "month" | "quarter" | "semester" | "year" | "custom" | string;
  startDate?: string;
  endDate?: string;

  // 基础筛选
  severity?: SeverityLevel[];
  severityLevels?: SeverityLevel[]; // 向后兼容
  category?: WarningCategory[];
  scope?: WarningScope[];
  status?: WarningStatus[];
  warningStatus?: WarningStatus[]; // 向后兼容

  // 考试相关
  examTypes?: string[];
  mixedAnalysis?: boolean;
  analysisMode?: "student" | "exam" | "subject";

  // 对象筛选
  classId?: string;
  studentId?: string;
  ruleId?: string;

  // 搜索
  search?: string;
}

/**
 * 规则执行结果接口
 */
export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  matchedStudents: string[];
  generatedWarnings: number;
  executionTimeMs: number;
  status: RuleExecutionStatus;
  error?: string;
  affectedClasses?: string[];
}

/**
 * 预警引擎执行结果接口
 */
export interface WarningEngineResult {
  executionId: string;
  executionType: ExecutionType;
  triggerEvent?: string;
  startTime: string;
  endTime?: string;
  totalExecutionTime: number;
  status: RuleExecutionStatus;
  results: RuleExecutionResult[];
  summary: {
    totalRules: number;
    successfulRules: number;
    failedRules: number;
    matchedStudents: number;
    generatedWarnings: number;
    affectedClasses: number;
  };
  errorSummary?: {
    totalErrors: number;
    errors: string[];
  };
}

/**
 * 引擎状态接口
 */
export interface EngineStatus {
  isRunning: boolean;
  currentExecutionId?: string;
  lastExecution?: {
    id: string;
    startTime: string;
    endTime?: string;
    status: RuleExecutionStatus;
    summary: any;
  };
  todayStats?: {
    executionsCount: number;
    warningsGenerated: number;
    successRate: number;
    avgExecutionTime: number;
  };
}

/**
 * 预警趋势数据接口
 */
export interface WarningTrendData {
  period: string;
  total: number;
  new: number;
  resolved: number;
  active: number;
  byCategory?: Record<WarningCategory, number>;
  bySeverity?: Record<SeverityLevel, number>;
}

/**
 * 预警建议接口
 */
export interface WarningRecommendation {
  type: "intervention" | "monitoring" | "escalation" | "prevention";
  description: string;
  priority: number;
  actions: string[];
  targetStudents?: string[];
  estimatedImpact?: number;
  timeFrame?: string;
}

/**
 * 监控配置接口
 */
export interface MonitorConfig {
  autoExecuteEnabled: boolean;
  executeInterval: number; // 分钟
  dataChangeMonitoring: boolean;
  realTimeUpdates: boolean;
  notificationEnabled: boolean;
  alertThresholds?: {
    highRiskStudentCount?: number;
    warningRatioIncrease?: number;
  };
}

/**
 * 监控状态接口
 */
export interface MonitorStatus {
  isActive: boolean;
  lastExecution: string | null;
  nextExecution: string | null;
  totalExecutions: number;
  errorCount: number;
  lastError: string | null;
  uptime?: number;
}

/**
 * 干预工作流接口
 */
export interface InterventionWorkflow {
  id: string;
  warningId: string;
  studentId: string;
  teacherId: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  interventionType: string;
  plannedActions: string[];
  completedActions: string[];
  notes?: string;
  startDate: string;
  targetDate?: string;
  completionDate?: string;
  effectiveness?: number; // 1-10 评分
}

/**
 * 学生预警档案接口
 */
export interface StudentWarningProfile {
  studentId: string;
  studentName: string;
  className: string;
  currentRiskLevel: SeverityLevel;
  activeWarnings: number;
  historicalWarnings: number;
  interventions: number;
  lastWarningDate?: string;
  riskFactors: Array<{
    factor: string;
    severity: SeverityLevel;
    frequency: number;
    lastOccurrence: string;
  }>;
  improvementTrends: Array<{
    metric: string;
    trend: "improving" | "declining" | "stable";
    value: number;
    period: string;
  }>;
}
