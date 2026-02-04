// GradeImporter 重构后的组件导出

// 原有组件
export { default as FileUploader } from "./FileUploader";
export { default as DataMapper } from "./DataMapper";
export { default as DataValidator } from "./DataValidator";
export { default as ImportProcessor } from "./ImportProcessor";
export { default as ConfigManager } from "./ConfigManager";

// DataFlow集成版本 (推荐使用)
export { default as ImportProcessorWithDataFlow } from "./ImportProcessorWithDataFlow";

// 新的用户友好组件
export { default as UserFriendlyDataMapper } from "./UserFriendlyDataMapper";
export { default as DataPreviewCard } from "./DataPreviewCard";
export { default as SmartConfirmationDialog } from "./SmartConfirmationDialog";
export { default as MissingDataDetector } from "./MissingDataDetector";
export { default as QuickFixSuggestions } from "./QuickFixSuggestions";

// 🔧 强制确认对话框组件（Phase 2 新增）
export { default as UnknownFieldsBlockDialog } from "./UnknownFieldsBlockDialog";
export { default as LowConfidenceWarningDialog } from "./LowConfidenceWarningDialog";

// 导出组件接口
export type { FileDataForReview } from "./FileUploader";
export type { MappingConfig } from "../types";

// 导出新组件的接口
export type { DataPreviewProps } from "./DataPreviewCard";
export type { SmartConfirmationProps } from "./SmartConfirmationDialog";
export type { MissingDataDetectorProps } from "./MissingDataDetector";
export type { QuickFixSuggestionsProps } from "./QuickFixSuggestions";
