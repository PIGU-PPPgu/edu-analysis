/**
 * 增强版考试服务 - 基于统一数据网关
 * 提供向后兼容的API，同时使用新的DataGateway架构
 */

import { examDataService } from "./domains/ExamDataService";
import { dataGateway } from "./data";

// 重新导出所有现有类型以保持兼容性
export * from "./examService";

// 导入现有的接口和类型
import type {
  Exam,
  ExamType,
  ExamFilter,
  ExamStatistics,
  CreateExamInput,
  UpdateExamInput,
  ExamSubjectScore,
  AcademicTerm,
} from "./examService";

/**
 * 增强版考试API - 使用统一数据网关
 * 保持与原examService完全相同的接口
 */

/**
 * 获取考试列表，支持筛选
 */
export const getExams = async (filter?: ExamFilter): Promise<Exam[]> => {
  console.log("[examService.enhanced] 调用增强版getExams");
  return examDataService.getExams(filter);
};

/**
 * 根据考试ID获取考试详情
 */
export const getExamById = async (examId: string): Promise<Exam | null> => {
  console.log("[examService.enhanced] 调用增强版getExamById");
  return examDataService.getExamById(examId);
};

/**
 * 创建新考试
 */
export const createExam = async (
  examData: CreateExamInput
): Promise<Exam | null> => {
  console.log("[examService.enhanced] 调用增强版createExam");
  return examDataService.createExam(examData);
};

/**
 * 更新考试信息
 */
export const updateExam = async (
  examId: string,
  examData: UpdateExamInput
): Promise<Exam | null> => {
  console.log("[examService.enhanced] 调用增强版updateExam");
  return examDataService.updateExam(examId, examData);
};

/**
 * 删除考试
 */
export const deleteExam = async (examId: string): Promise<boolean> => {
  console.log("[examService.enhanced] 调用增强版deleteExam");
  return examDataService.deleteExam(examId);
};

/**
 * 批量删除考试
 */
export const deleteExams = async (examIds: string[]): Promise<boolean> => {
  console.log("[examService.enhanced] 调用增强版deleteExams");
  return examDataService.deleteExams(examIds);
};

/**
 * 复制考试
 */
export const duplicateExam = async (examId: string): Promise<Exam | null> => {
  console.log("[examService.enhanced] 调用增强版duplicateExam");
  return examDataService.duplicateExam(examId);
};

/**
 * 获取考试统计信息
 */
export const getExamStatistics = async (
  examId: string
): Promise<ExamStatistics | null> => {
  console.log("[examService.enhanced] 调用增强版getExamStatistics");
  const stats = await examDataService.getExamStatistics(examId);
  return stats as ExamStatistics; // 类型断言，因为结构可能略有不同
};

/**
 * 获取考试参与人数
 */
export const getExamParticipantCount = async (
  examId: string
): Promise<number> => {
  console.log("[examService.enhanced] 调用增强版getExamParticipantCount");
  return examDataService.getExamParticipantCount(examId);
};

/**
 * 以下方法暂时保持原有实现，逐步迁移
 */

// 重新导入原有的实现
import {
  getExamTypes as originalGetExamTypes,
  getRecentExams as originalGetRecentExams,
  getExamWarningStatistics as originalGetExamWarningStatistics,
  getExamOverviewStatistics as originalGetExamOverviewStatistics,
  getAcademicTerms as originalGetAcademicTerms,
  getCurrentAcademicTerm as originalGetCurrentAcademicTerm,
  getExamsByTerm as originalGetExamsByTerm,
  getExamSubjectScores as originalGetExamSubjectScores,
  saveExamSubjectScores as originalSaveExamSubjectScores,
  getExamActiveSubjects as originalGetExamActiveSubjects,
} from "./examService";

// 暂时保持原有实现的方法
export const getExamTypes = originalGetExamTypes;
export const getRecentExams = originalGetRecentExams;
export const getExamWarningStatistics = originalGetExamWarningStatistics;
export const getExamOverviewStatistics = originalGetExamOverviewStatistics;
export const getAcademicTerms = originalGetAcademicTerms;
export const getCurrentAcademicTerm = originalGetCurrentAcademicTerm;
export const getExamsByTerm = originalGetExamsByTerm;
export const getExamSubjectScores = originalGetExamSubjectScores;
export const saveExamSubjectScores = originalSaveExamSubjectScores;
export const getExamActiveSubjects = originalGetExamActiveSubjects;

/**
 * 数据网关工具方法 - 新增功能
 */

/**
 * 清理考试相关缓存
 */
export const clearExamCache = async (): Promise<void> => {
  console.log("[examService.enhanced] 清理考试缓存");
  await dataGateway.invalidateCache("getExams");
  await dataGateway.invalidateCache("getStatistics");
};

/**
 * 获取数据网关健康状态
 */
export const getDataGatewayHealth = async () => {
  console.log("[examService.enhanced] 检查数据网关健康状态");
  return dataGateway.healthCheck();
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  console.log("[examService.enhanced] 获取缓存统计");
  return dataGateway.getCacheStats();
};

/**
 * 批量操作考试数据
 */
export const batchOperateExams = async (
  operation: "create" | "update" | "delete",
  data: any[]
): Promise<any[]> => {
  console.log(
    `[examService.enhanced] 批量${operation}操作，数量:`,
    data.length
  );
  return dataGateway.batchOperation(operation, data);
};

/**
 * 强制刷新考试数据（绕过缓存）
 */
export const refreshExamData = async (filter?: ExamFilter): Promise<Exam[]> => {
  console.log("[examService.enhanced] 强制刷新考试数据");
  // 先清理缓存
  await clearExamCache();
  // 重新获取数据
  return getExams(filter);
};

// 默认导出增强版服务对象
export default {
  // 核心CRUD操作
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  deleteExams,
  duplicateExam,

  // 统计和分析
  getExamStatistics,
  getExamParticipantCount,
  getExamWarningStatistics,
  getExamOverviewStatistics,

  // 辅助功能
  getExamTypes,
  getRecentExams,
  getAcademicTerms,
  getCurrentAcademicTerm,
  getExamsByTerm,

  // 科目配置
  getExamSubjectScores,
  saveExamSubjectScores,
  getExamActiveSubjects,

  // 新增的增强功能
  clearExamCache,
  getDataGatewayHealth,
  getCacheStats,
  batchOperateExams,
  refreshExamData,
};
