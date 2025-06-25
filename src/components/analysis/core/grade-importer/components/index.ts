// GradeImporter 重构后的组件导出

// 原有组件
export { default as FileUploader } from './FileUploader';
export { default as DataMapper } from './DataMapper';
export { default as DataValidator } from './DataValidator';
export { default as ImportProcessor } from './ImportProcessor';
export { default as ConfigManager } from './ConfigManager';

// 新的用户友好组件
export { default as UserFriendlyDataMapper } from './UserFriendlyDataMapper';
export { default as DataPreviewCard } from './DataPreviewCard';
export { default as SmartConfirmationDialog } from './SmartConfirmationDialog';
export { default as MissingDataDetector } from './MissingDataDetector';
export { default as QuickFixSuggestions } from './QuickFixSuggestions';

// 零干预导入系统
export { default as OneClickImporter } from './OneClickImporter';
export { default as PostImportCompletion } from './PostImportCompletion';

// 导出组件接口
export type { FileDataForReview } from './FileUploader';
export type { MappingConfig } from '../types';

// 导出新组件的接口
export type { DataPreviewProps } from './DataPreviewCard';
export type { SmartConfirmationProps } from './SmartConfirmationDialog';
export type { MissingDataDetectorProps } from './MissingDataDetector';
export type { QuickFixSuggestionsProps } from './QuickFixSuggestions'; 