/**
 * 旧API服务适配器
 *
 * 提供向后兼容性，将旧的API调用重定向到新的核心服务
 */

// 将旧apiService的功能重定向到AI模块的适配层
export {
  performSingleModelAnalysis,
  handleApiError,
} from "../ai/legacy-adapter";
