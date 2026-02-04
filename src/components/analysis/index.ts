/**
 * 成绩分析模块主索引
 *
 * 新目录结构：
 * - core/: 核心功能组件（数据导入、概览）
 * - statistics/: 统计分析组件（统计概览、分数分布）
 * - comparison/: 对比分析组件（班级对比、箱线图）
 * - advanced/: 高级分析组件（异常检测、高级面板）
 * - services/: 工具库和数据服务（计算工具、图表工具、数据服务）
 */

// 核心功能组件
export * from "./core";

// 统计分析组件
export * from "./statistics";

// 对比分析组件
export * from "./comparison";

// 高级分析组件
export * from "./advanced";

// 服务和工具库
export * as AnalysisServices from "./services";

// 保持向后兼容性的类型导出
export * as GradeAnalysisTypes from "./types";

// 已删除的组件：
// export { default as HomeworkAnalysisDashboard } from './HomeworkAnalysisDashboard';
// export { default as GradeDistributionChart } from './GradeDistributionChart';
// export { default as GradeTrendChart } from './GradeTrendChart';
// export { default as HomeworkQualityChart } from './HomeworkQualityChart';
// export { default as KnowledgePointHeatmap } from './KnowledgePointHeatmap';

// 旧的组件导出已迁移到对应子模块索引
