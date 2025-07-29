/**
 * 遗留服务适配器 - 总的向后兼容层
 *
 * 这个文件提供所有旧服务API的重定向，确保现有代码能正常工作
 * 而不需要立即重写所有调用代码
 */

// API 服务适配器
export {
  performSingleModelAnalysis,
  handleApiError,
} from "./core/legacy-api-adapter";

// 班级服务适配器
export {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  type ClassStatistics,
} from "./education/legacy-class-adapter";

// AI 服务适配器
export {
  performSingleModelAnalysis as legacyPerformSingleModelAnalysis,
  handleApiError as legacyHandleApiError,
  cascadeAnalyzeContent as legacyCascadeAnalyzeContent,
  analyzeWithModel as legacyAnalyzeWithModel,
} from "./ai/legacy-adapter";

// 从现有服务直接导出（这些需要保持兼容）
export {
  // AI相关服务
  analyzeWithModel,
  cascadeAnalyzeContent,
  analyzeHomeworkContentWithAI,
  analyzeHomeworkImage,
  analyzeHomeworkContentWithParams,
  getAIClient,
  testProviderConnection,
  getAvailableModels,
  chatWithModel,
  getConfiguredChineseAIModels,
  aiService,
} from "./aiService";

export {
  getAllProviders,
  getProviderConfig,
  getProviderEndpoint,
  getProviderById,
  getModelInfo,
  getModelsByProviderId,
} from "./aiProviderManager";

export { VISION_MODELS_FOR_TEST, TEXT_MODELS_FOR_TEST } from "./providers";

// 作业相关服务
export {
  HomeworkService,
  // 其他需要兼容的作业服务
} from "./homeworkService";

export {
  KnowledgePointService,
  // 其他需要兼容的知识点服务
} from "./knowledgePointService";

// 成绩相关服务
export {
  GradingService,
  // 其他需要兼容的评分服务
} from "./gradingService";

// 提交相关服务
export {
  SubmissionService,
  // 其他需要兼容的提交服务
} from "./submissionService";

// 预警相关服务
export {
  WarningService,
  // 其他需要兼容的预警服务
} from "./warningService";

export {
  InterventionService,
  // 其他需要兼容的干预服务
} from "./interventionService";

// 在这里可以继续添加其他需要向后兼容的服务...

/**
 * 服务迁移状态映射
 * 帮助开发者了解哪些服务已经迁移到新架构
 */
export const SERVICE_MIGRATION_STATUS = {
  // 已迁移服务
  migrated: {
    apiService: "core/legacy-api-adapter",
    classService: "education/legacy-class-adapter",
    // 可以继续添加已迁移的服务
  },

  // 部分迁移服务
  partial: {
    aiService: "ai/legacy-adapter",
    // AI服务部分功能已迁移，但完整迁移需要更多工作
  },

  // 待迁移服务
  pending: [
    "homeworkService",
    "knowledgePointService",
    "gradingService",
    "submissionService",
    "warningService",
    "interventionService",
    "gradeAnalysisService",
    "homeworkAnalysisService",
    "examService",
    "reportService",
    // 添加其他待迁移的服务
  ],
};

/**
 * 获取服务迁移建议
 * @param serviceName 服务名称
 * @returns 迁移建议信息
 */
export function getServiceMigrationAdvice(serviceName: string): {
  status: "migrated" | "partial" | "pending" | "unknown";
  newPath?: string;
  recommendation: string;
} {
  if (SERVICE_MIGRATION_STATUS.migrated[serviceName]) {
    return {
      status: "migrated",
      newPath: SERVICE_MIGRATION_STATUS.migrated[serviceName],
      recommendation: `服务已完全迁移，建议使用新的模块化API: ${SERVICE_MIGRATION_STATUS.migrated[serviceName]}`,
    };
  }

  if (SERVICE_MIGRATION_STATUS.partial[serviceName]) {
    return {
      status: "partial",
      newPath: SERVICE_MIGRATION_STATUS.partial[serviceName],
      recommendation: `服务部分迁移，可以开始使用新API，但保留向后兼容性: ${SERVICE_MIGRATION_STATUS.partial[serviceName]}`,
    };
  }

  if (SERVICE_MIGRATION_STATUS.pending.includes(serviceName)) {
    return {
      status: "pending",
      recommendation: `服务尚未迁移，继续使用现有API，等待后续迁移。`,
    };
  }

  return {
    status: "unknown",
    recommendation: `未知服务，请检查服务名称是否正确。`,
  };
}

/**
 * 记录旧API使用情况（用于后续优化）
 */
export function logLegacyAPIUsage(apiName: string, context?: any): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`⚠️ 使用了旧API: ${apiName}`, context);
    console.info(`💡 迁移建议:`, getServiceMigrationAdvice(apiName));
  }
}
