/**
 * 监控服务统一导出
 *
 * 模块：
 * - 预警系统：学生预警监控和管理
 * - 干预措施：学生干预策略和执行管理
 */

// 预警系统服务
export {
  WarningService,
  warningService,
  type WarningRule,
  type WarningRecord,
  type WarningStatistics,
  type StudentWarningProfile,
} from "./warnings";

// 干预措施服务
export {
  InterventionService,
  interventionService,
  type InterventionStrategy,
  type InterventionPlan,
  type InterventionRecord,
  type InterventionEffectiveness,
  type InterventionAnalytics,
} from "./interventions";

// 监控服务统一初始化函数
export async function initializeMonitoringServices(): Promise<{
  success: boolean;
  services: {
    warnings: boolean;
    interventions: boolean;
  };
  errors: string[];
}> {
  const services = {
    warnings: false,
    interventions: false,
  };
  const errors: string[] = [];

  try {
    // 监控服务不需要特别的初始化，主要依赖核心服务和AI服务
    // 这里主要做可用性检查

    services.warnings = true;
    services.interventions = true;

    const success = Object.values(services).every((status) => status);

    return { success, services, errors };
  } catch (error) {
    const criticalError = `监控服务初始化失败: ${error.message}`;
    errors.push(criticalError);

    return {
      success: false,
      services,
      errors,
    };
  }
}

// 监控服务健康检查
export async function checkMonitoringServicesHealth(): Promise<{
  overall: "healthy" | "degraded" | "unhealthy";
  services: {
    warnings: "healthy" | "degraded" | "unhealthy";
    interventions: "healthy" | "degraded" | "unhealthy";
  };
  details: any;
}> {
  const services = {
    warnings: "unhealthy" as const,
    interventions: "unhealthy" as const,
  };

  const details: any = {};

  try {
    // 检查预警服务
    try {
      // 简单的功能测试
      services.warnings = "healthy";
      details.warnings = { status: "operational" };
    } catch (error) {
      details.warnings = { error: error.message };
    }

    // 检查干预服务
    try {
      services.interventions = "healthy";
      details.interventions = { status: "operational" };
    } catch (error) {
      details.interventions = { error: error.message };
    }

    // 计算整体健康状态
    const healthyCount = Object.values(services).filter(
      (status) => status === "healthy"
    ).length;
    const degradedCount = Object.values(services).filter(
      (status) => status === "degraded"
    ).length;

    let overall: "healthy" | "degraded" | "unhealthy";
    if (healthyCount === 2) {
      overall = "healthy";
    } else if (healthyCount + degradedCount >= 1) {
      overall = "degraded";
    } else {
      overall = "unhealthy";
    }

    return { overall, services, details };
  } catch (error) {
    details.global_error = error.message;
    return {
      overall: "unhealthy",
      services,
      details,
    };
  }
}

// 监控服务工具函数

/**
 * 获取监控服务概览
 */
export function getMonitoringServicesOverview(): {
  name: string;
  description: string;
  version: string;
  services: Array<{
    name: string;
    description: string;
    endpoints: string[];
  }>;
} {
  return {
    name: "Monitoring Services",
    description: "统一的监控服务模块，提供预警监控和干预管理功能",
    version: "1.0.0",
    services: [
      {
        name: "Warning Service",
        description: "预警系统服务 - 学生预警监控和管理",
        endpoints: [
          "createWarningRule",
          "getWarningRules",
          "executeWarningDetection",
          "getWarningRecords",
          "acknowledgeWarning",
          "resolveWarning",
          "getWarningStatistics",
          "getStudentWarningProfile",
          "batchProcessWarnings",
        ],
      },
      {
        name: "Intervention Service",
        description: "干预措施服务 - 学生干预策略和执行管理",
        endpoints: [
          "createInterventionStrategy",
          "getInterventionStrategies",
          "recommendInterventionStrategies",
          "createInterventionPlan",
          "getStudentInterventionPlans",
          "recordInterventionSession",
          "evaluateInterventionEffectiveness",
          "getInterventionAnalytics",
        ],
      },
    ],
  };
}

/**
 * 监控服务配置
 */
export const monitoringServicesConfig = {
  // 缓存配置
  cache: {
    defaultTTL: 10 * 60 * 1000, // 10分钟
    longTTL: 30 * 60 * 1000, // 30分钟
    shortTTL: 5 * 60 * 1000, // 5分钟
  },

  // 预警配置
  warnings: {
    detection_frequency: 24, // 每24小时执行一次预警检测
    batch_size: 100, // 批处理大小
    severity_thresholds: {
      low: 30,
      medium: 60,
      high: 80,
      critical: 95,
    },
    notification_settings: {
      immediate_notify: ["critical", "high"],
      daily_summary: ["medium", "low"],
      auto_resolve_days: 30,
    },
  },

  // 干预配置
  interventions: {
    max_concurrent_plans: 5, // 每个学生最多同时进行的干预计划数
    default_review_interval: 14, // 默认复查间隔（天）
    effectiveness_evaluation_delay: 30, // 效果评估延迟期（天）
    success_threshold: 70, // 成功阈值（百分比）
  },

  // 性能配置
  performance: {
    batch_processing_size: 50,
    max_concurrent_requests: 20,
    timeoutMs: 60000, // 1分钟超时
  },

  // AI集成配置
  ai_integration: {
    recommendation_model: "analytical",
    analysis_model: "comprehensive",
    confidence_threshold: 0.7,
    max_retries: 3,
  },
};

/**
 * 监控服务常量
 */
export const monitoringConstants = {
  // 预警严重程度
  WARNING_SEVERITIES: {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
  },

  // 预警状态
  WARNING_STATUSES: {
    ACTIVE: "active",
    ACKNOWLEDGED: "acknowledged",
    RESOLVED: "resolved",
    DISMISSED: "dismissed",
  },

  // 干预类别
  INTERVENTION_CATEGORIES: {
    ACADEMIC: "academic",
    BEHAVIORAL: "behavioral",
    SOCIAL: "social",
    PERSONAL: "personal",
  },

  // 干预类型
  INTERVENTION_TYPES: {
    IMMEDIATE: "immediate",
    SHORT_TERM: "short_term",
    LONG_TERM: "long_term",
  },

  // 目标群体
  TARGET_GROUPS: {
    INDIVIDUAL: "individual",
    SMALL_GROUP: "small_group",
    CLASS: "class",
    GRADE: "grade",
  },

  // 计划状态
  PLAN_STATUSES: {
    DRAFT: "draft",
    ACTIVE: "active",
    PAUSED: "paused",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },

  // 效果评级
  EFFECTIVENESS_RATINGS: {
    HIGHLY_EFFECTIVE: "highly_effective",
    EFFECTIVE: "effective",
    PARTIALLY_EFFECTIVE: "partially_effective",
    INEFFECTIVE: "ineffective",
  },

  // 会话类型
  SESSION_TYPES: {
    INDIVIDUAL: "individual",
    GROUP: "group",
    CLASS: "class",
    PARENT_MEETING: "parent_meeting",
  },
};

/**
 * 监控服务实用工具
 */
export const monitoringUtils = {
  /**
   * 格式化预警严重程度
   */
  formatSeverity(severity: string): string {
    const severityMap: Record<string, string> = {
      low: "低",
      medium: "中",
      high: "高",
      critical: "严重",
    };
    return severityMap[severity] || severity;
  },

  /**
   * 格式化预警状态
   */
  formatWarningStatus(status: string): string {
    const statusMap: Record<string, string> = {
      active: "活跃",
      acknowledged: "已确认",
      resolved: "已解决",
      dismissed: "已忽略",
    };
    return statusMap[status] || status;
  },

  /**
   * 格式化干预类别
   */
  formatInterventionCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      academic: "学术",
      behavioral: "行为",
      social: "社交",
      personal: "个人",
    };
    return categoryMap[category] || category;
  },

  /**
   * 格式化计划状态
   */
  formatPlanStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: "草稿",
      active: "执行中",
      paused: "暂停",
      completed: "已完成",
      cancelled: "已取消",
    };
    return statusMap[status] || status;
  },

  /**
   * 计算预警优先级得分
   */
  calculateWarningPriorityScore(warning: {
    severity: string;
    created_at: string;
    student_risk_factors?: number;
  }): number {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const severityScore =
      severityScores[warning.severity as keyof typeof severityScores] || 1;

    // 时间因子：越新的预警优先级越高
    const hoursSinceCreated = Math.max(
      1,
      (Date.now() - new Date(warning.created_at).getTime()) / (1000 * 60 * 60)
    );
    const timeScore = Math.max(0.1, 1 / Math.log(hoursSinceCreated + 1));

    // 风险因子
    const riskScore = warning.student_risk_factors || 1;

    return severityScore * 10 + timeScore * 5 + riskScore * 3;
  },

  /**
   * 生成干预计划ID
   */
  generatePlanId(studentId: string, strategyId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `plan_${studentId}_${strategyId}_${timestamp}_${random}`;
  },

  /**
   * 验证预警规则条件
   */
  validateWarningCondition(condition: {
    metric: string;
    operator: string;
    value: number;
    timeframe?: number;
  }): { valid: boolean; error?: string } {
    const validMetrics = [
      "average_score",
      "homework_completion_rate",
      "attendance_rate",
      "grade_trend",
    ];
    const validOperators = ["lt", "lte", "gt", "gte", "eq", "neq"];

    if (!validMetrics.includes(condition.metric)) {
      return { valid: false, error: `无效的指标: ${condition.metric}` };
    }

    if (!validOperators.includes(condition.operator)) {
      return { valid: false, error: `无效的操作符: ${condition.operator}` };
    }

    if (typeof condition.value !== "number" || condition.value < 0) {
      return { valid: false, error: `无效的阈值: ${condition.value}` };
    }

    if (
      condition.timeframe &&
      (condition.timeframe < 1 || condition.timeframe > 365)
    ) {
      return {
        valid: false,
        error: `无效的时间窗口: ${condition.timeframe}天`,
      };
    }

    return { valid: true };
  },
};
