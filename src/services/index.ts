// 导出所有服务
// 按依赖顺序导出，避免循环依赖问题

// 基础服务先导出
export * from "./apiService";
export * from "./classService";
export * from "./gradingService";
export * from "./submissionService";
export * from "./knowledgePointThresholdService";

// AI相关服务，可能存在互相依赖
export * from "./providers";
export * from "./aiProviderManager";
export * from "./enhancedAIClient";
export * from "./aiService";

// 复合服务
export * from "./homeworkService";
export * from "./knowledgePointService";
export * from "./homeworkAnalysisService";

// 不存在或不完整的服务
// export * from './studentService'; // 此模块不存在
// export * from './reportService'; // 仅有一行，可能是空文件
