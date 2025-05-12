import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Info, SearchCheck, Sparkles, FileText, UserCheck, Send, Eye, Lightbulb, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";

// Assuming ExamInfo is defined in a shared types file or passed appropriately
// For now, defining it locally for clarity if not already globally available.
// Make sure this is exported if Index.tsx or other parent components need it directly.
export interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject: string;
}

export interface FileDataForReview {
    fileName: string;
    headers: string[];
    dataRows: any[];
}

export interface AIParseResult {
    suggestedMappings: Record<string, string>;
    // We could add more details from AI if needed, e.g., warnings, data preview
}

export interface ExistingStudentCheckResult {
    count: number;
    // message?: string; // e.g. "Found 5 existing students. Recommended action: Merge."
}

// Type for AI suggestion for a single field (passed to onSuggestFieldMapping callback in parent)
export type AIFieldSuggestionForParent = {
  suggestedSystemField: string; // The key of the suggested system field
  isNewField?: boolean;       // If true, AI suggests creating a new field
  newFieldName?: string;      // Suggested name for the new field
} | null;

interface ImportReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  
  fileData: FileDataForReview | null;
  currentExamInfo: ExamInfo | null;
  // Now represents combined standard and dynamic custom fields
  // Key: unique field key (e.g., 'student_id', 'custom_field_123')
  // Value: display name (e.g., "学号", "自定义物理等级 (自定义)")
  availableSystemFields?: Record<string, string>; // Made optional for default value
  initialDisplayInfo?: { name: string, size: number } | null;

  onStartAIParse?: (fileData: FileDataForReview, currentExamInfo: ExamInfo | null) => Promise<AIParseResult>;
  onCheckExistingStudents?: (
    userConfirmedMappings: Record<string, string>,
    sampleData: any[],
    examInfo: ExamInfo
  ) => Promise<ExistingStudentCheckResult>;
  onFinalImport: (
    finalExamInfo: ExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string, 
    fullDataToImport: any[]
  ) => Promise<void>;
  onSuggestFieldMapping?: (header: string, sampleData: any[]) => Promise<AIFieldSuggestionForParent>;
  // Callback to inform parent that a new custom field needs to be created and added to availableSystemFields
  // Parent should handle unique key generation and update availableSystemFields prop.
  // Should return the unique key of the newly created field, or null if creation failed.
  onCustomFieldCreateRequested?: (newFieldName: string, originalHeader: string) => Promise<string | null>;
  onCancel?: () => void;
}

const UPDATED_STEPS = [
  { id: 1, name: '数据预览', description: "请检查上传文件的前5行数据，确认无误后开始智能分析。", icon: Eye },
  { id: 2, name: '智能匹配与确认', description: "AI已尝试匹配您的文件表头到系统信息项，请检查并调整。", icon: Sparkles },
  { id: 3, name: '学生信息合并', description: "选择如何处理已存在的学生记录。", icon: UserCheck },
  { id: 4, name: '最终确认导入', description: "检查所有设置，然后开始导入数据。", icon: Send },
];

const PREVIEW_ROW_COUNT_STEP_1 = 5;
const PREVIEW_ROW_COUNT_STEP_2 = 10;

const DEFAULT_FALLBACK_FIELDS: Record<string, string> = { // Basic fallback
    'student_id': '学号 (Fallback)',
    'name': '姓名 (Fallback)',
    'score': '分数 (Fallback)',
    // Add other common keys that might appear in userConfirmedMappings to avoid errors
    'class_name': '班级 (Fallback)',
    'subject': '科目 (Fallback)',
    'exam_date': '考试日期 (Fallback)',
    'exam_type': '考试类型 (Fallback)',
    'teacher': '教师 (Fallback)', // From your log
    'grade': '等级 (Fallback)', // From your log
    'rank_in_class': '班名 (Fallback)', // From your log
    'rank_in_grade': '校名 (Fallback)', // From your log
    'unknown': '未知 (Fallback)' // From your log
};

const ImportReviewDialog: React.FC<ImportReviewDialogProps> = ({
  isOpen,
  onOpenChange,
  fileData,
  currentExamInfo,
  availableSystemFields = DEFAULT_FALLBACK_FIELDS, // 已有默认值
  initialDisplayInfo,
  onStartAIParse,
  onCheckExistingStudents,
  onFinalImport,
  onSuggestFieldMapping,
  onCustomFieldCreateRequested,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [editableExamInfo, setEditableExamInfo] = useState<ExamInfo | null>(null);
  
  // Step 1: AI Parsing states
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [aiParseProgress, setAiParseProgress] = useState(0);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [aiSuggestedMappings, setAiSuggestedMappings] = useState<Record<string, string> | null>(null);

  // Step 2: Field Mapping states
  const [userConfirmedMappings, setUserConfirmedMappings] = useState<Record<string, string> | null>(null);

  // Step 3: Student Merge states
  const [isCheckingStudents, setIsCheckingStudents] = useState(false);
  const [existingStudentsInfo, setExistingStudentsInfo] = useState<ExistingStudentCheckResult | null>(null);
  const [mergeChoice, setMergeChoice] = useState<string>('merge'); // Default to 'merge'

  // Step 4: Final Import states
  const [isImporting, setIsImporting] = useState(false);

  // States for AI field suggestion and custom field creation
  const [fieldSuggestionsLoading, setFieldSuggestionsLoading] = useState<Record<string, boolean>>({});
  // State for managing the UI when user wants to create a new field for a specific header
  const [customFieldCreationState, setCustomFieldCreationState] = useState<Record<string, { 
    isPromptingName: boolean; // True when input field for new name is shown
    newNameInput: string;      // Current value in the input field
    error: string | null;      // Error message for input validation
    isLoading: boolean;        // True when waiting for parent to confirm creation
  }>>({});
  
  // 添加调试日志 - 移到状态声明之后避免引用错误
  console.log("[Dialog Step 2 Render DEBUG] aiParseError:", aiParseError);
  console.log("[Dialog] availableSystemFields received:", availableSystemFields); 
  
  // 确保即使传入的值为undefined，也始终有可用的默认字段
  const effectiveSystemFields = availableSystemFields || DEFAULT_FALLBACK_FIELDS;

  // Log received availableSystemFields when component mounts or prop changes
  useEffect(() => {
    console.log("[Dialog Mount/Prop Change DEBUG] availableSystemFields received by dialog:", JSON.stringify(availableSystemFields));
  }, [availableSystemFields]);

  // 在使用availableSystemFields的地方替换为effectiveSystemFields
  useEffect(() => {
    if (currentStep === 2 && !isAIParsing && userConfirmedMappings) {
      console.log("[Dialog Step 2 DEBUG] 渲染字段映射表格时的状态:", {
        'onSuggestFieldMapping存在': !!onSuggestFieldMapping,
        '已确认的映射数量': Object.keys(userConfirmedMappings).length,
        '可用系统字段数量': Object.keys(effectiveSystemFields).length,
        '自定义字段创建状态': Object.keys(customFieldCreationState).length > 0 ? customFieldCreationState : '无',
        'AI建议加载状态': fieldSuggestionsLoading
      });
    }
  }, [currentStep, isAIParsing, userConfirmedMappings, onSuggestFieldMapping, effectiveSystemFields, customFieldCreationState, fieldSuggestionsLoading]);

  const resetDialogState = useCallback(() => {
    console.log("[Dialog] Resetting state");
    setCurrentStep(1);
    if (currentExamInfo) {
      setEditableExamInfo(currentExamInfo);
    } else {
      setEditableExamInfo({ title: '', type: '', date: new Date().toISOString().split('T')[0], subject: '' });
    }
    setIsAIParsing(false);
    setAiParseProgress(0);
    setAiParseError(null);
    setAiSuggestedMappings(null);
    setUserConfirmedMappings(null);
    setIsCheckingStudents(false);
    setExistingStudentsInfo(null);
    setMergeChoice('merge');
    setIsImporting(false);
    setFieldSuggestionsLoading({});
    setCustomFieldCreationState({});
  }, [currentExamInfo]);

  // Effect for resetting dialog state when it opens
  useEffect(() => {
    if (isOpen) {
      // 只在对话框首次打开时重置状态，而不是在内部状态变化时重置
      // 检查是否是首次打开对话框还是在处理过程中
      const isInitialOpen = !fileData && !userConfirmedMappings;
      if (isInitialOpen) {
        console.log("[Dialog] First open - resetting dialog state");
        resetDialogState();
      } else {
        console.log("[Dialog] Dialog is open but has active data - skipping reset");
      }
    }
  }, [isOpen, resetDialogState, fileData, userConfirmedMappings]);

  // Simplified effect for updating exam info from props when available
  useEffect(() => {
    if (isOpen && currentExamInfo && !editableExamInfo) {
      setEditableExamInfo(currentExamInfo);
    }
  }, [isOpen, currentExamInfo, editableExamInfo]);

  // Effect for Step 2: Trigger AI parsing when moving to step 2 AND fileData is available.
  // This is now explicitly triggered by user clicking "Next" from Step 1.
  useEffect(() => {
    if (isOpen && currentStep === 2 && fileData && onStartAIParse && !isAIParsing && !aiSuggestedMappings && !aiParseError) {
        // Initialize editableExamInfo if it hasn't been set from props yet
        if (!editableExamInfo && currentExamInfo) {
            setEditableExamInfo(currentExamInfo);
        } else if (!editableExamInfo && !currentExamInfo) {
            // Ensure there's a default if no exam info came from props
            setEditableExamInfo({ title: '', type: '', date: new Date().toISOString().split('T')[0], subject: '' });
        }
        handleStartAIParsingInternal();
    }
  }, [isOpen, currentStep, fileData, onStartAIParse, isAIParsing, aiSuggestedMappings, aiParseError, currentExamInfo, editableExamInfo]);

  const handleStartAIParsingInternal = async () => {
    if (!fileData || !onStartAIParse) return; 
    console.log("[Dialog] Starting internal AI parsing");
    setIsAIParsing(true);
    setAiParseProgress(0);
    setAiParseError(null);
    setAiSuggestedMappings(null); 
    setFieldSuggestionsLoading({});
    setCustomFieldCreationState({}); 

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 100) setAiParseProgress(progress);
    }, 200);

    try {
      // Pass editableExamInfo or currentExamInfo to onStartAIParse if needed by the parent
      const result = await onStartAIParse(fileData, editableExamInfo);
      clearInterval(interval);
      setAiParseProgress(100);
      console.log("[Dialog] Internal AI parsing complete, suggested mappings:", result.suggestedMappings);
      setAiSuggestedMappings(result.suggestedMappings);
      setUserConfirmedMappings(result.suggestedMappings); 
      toast.success("AI智能分析与匹配完成！");
      // setCurrentStep(2); // No longer auto-move, user is already on step 2
    } catch (error) {
      clearInterval(interval);
      setAiParseProgress(100); 
      console.error("AI parsing failed:", error);
      setAiParseError((error as Error).message || "AI解析时发生未知错误。");
      toast.error("AI智能分析失败", { description: (error as Error).message });
    } finally {
      setIsAIParsing(false);
    }
  };

  const handleConfirmMappings = () => {
    const pendingCustomFieldCreation = Object.entries(customFieldCreationState).find(([_, state]) => state.isPromptingName || state.isLoading);
    if (pendingCustomFieldCreation) {
        toast.error("自定义字段待处理", { description: `请先为表头 "${pendingCustomFieldCreation[0]}" 完成自定义字段的命名与确认，或取消创建。` });
        return;
    }
    if (!userConfirmedMappings) {
        toast.error("映射尚未确认");
        return;
    }
    console.log("[Dialog] Mappings confirmed, proceeding to step 3. Current mappings:", userConfirmedMappings);
    setCurrentStep(3);
  };

  useEffect(() => {
    // Trigger student check when moving to step 3
    if (isOpen && currentStep === 3 && fileData && onCheckExistingStudents && userConfirmedMappings && !isCheckingStudents && !existingStudentsInfo) {
      handleStudentCheck();
    }
  }, [isOpen, currentStep, fileData, onCheckExistingStudents, userConfirmedMappings, isCheckingStudents, existingStudentsInfo]);

  const handleStudentCheck = async () => {
    if (!fileData || !userConfirmedMappings || !onCheckExistingStudents) return;
    console.log("[Dialog] Starting student check with mappings:", userConfirmedMappings, "examInfo:", editableExamInfo);
    setIsCheckingStudents(true);
    try {
        // Sending a small sample of data (e.g., first 5 rows) for checking
        const sampleDataForCheck = fileData.dataRows.slice(0, 5);
        const result = await onCheckExistingStudents(userConfirmedMappings, sampleDataForCheck, editableExamInfo!);
        setExistingStudentsInfo(result);
        console.log("[Dialog] Student check complete, result:", result);
    } catch (error) {
        console.error("Student check failed:", error);
        toast.error("检查学生信息失败", { description: (error as Error).message });
        // Decide if we should block proceeding or allow user to skip this
    } finally {
        setIsCheckingStudents(false);
    }
  };

  const handleFinalConfirmAndImport = async () => {
    if (!fileData || !userConfirmedMappings) {
        toast.error("数据或映射不完整，无法导入");
        return;
    }
    console.log("[Dialog] Final import initiated. ExamInfo:", editableExamInfo, "Mappings:", userConfirmedMappings, "MergeChoice:", mergeChoice);
    setIsImporting(true);
    try {
      await onFinalImport(editableExamInfo!, userConfirmedMappings, mergeChoice, fileData.dataRows);
      onOpenChange(false); // Close dialog on success (parent should show toast)
    } catch (error) {
      // Error already handled by parent's onFinalImport or toast shown there
      console.error("Final import failed:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleNext = () => {
    console.log(`[Dialog] Next button clicked. Current step: ${currentStep}`);
    if (currentStep === 1 && !fileData) { // From Step 1 (Preview) to Step 2 (AI Parse & Map)
        toast.error("数据尚未加载完成", { description: "请稍等或检查文件上传状态后再继续。"});
        return;
    }
    if (currentStep === 2 && (isAIParsing || !userConfirmedMappings)) {
        toast.info(isAIParsing ? "AI正在分析匹配中，请稍候..." : "请确认所有文件表头的匹配方式或等待AI分析完成。" );
        return;
    }
    if (currentStep === 3 && isCheckingStudents) {
        toast.info("正在检查学生信息...");
        return;
    }
    if (currentStep < UPDATED_STEPS.length) {
        setCurrentStep(currentStep + 1);
    } else if (currentStep === UPDATED_STEPS.length) {
        // This case should be handled by "Finish & Import" button for the last step
        // Before final import, double check pending custom fields again, though primary check is in handleConfirmMappings
        const pendingCustomFieldCreation = Object.entries(customFieldCreationState).find(([_, state]) => state.isPromptingName || state.isLoading);
        if (pendingCustomFieldCreation) {
            toast.error("自定义字段待处理", { description: `请先为表头 "${pendingCustomFieldCreation[0]}" 完成自定义字段的命名与确认，或取消创建。`});
            return;
        }
        handleFinalConfirmAndImport();
    }
  };

  const handlePrevious = () => {
    console.log(`[Dialog] Previous button clicked. Current step: ${currentStep}`);
    if (currentStep === 2 && isAIParsing) {
        toast.info("AI正在分析，请稍候或取消。"); // Or allow cancel
        return;
    }
    if (currentStep > 1) {
      // If going back from step 3 (student merge) to step 2 (mapping), 
      // we might not need to clear aiSuggestedMappings or userConfirmedMappings yet,
      // unless we want to force a re-parse or re-confirmation.
      // For now, just go back.
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDialogClose = () => {
    if (isAIParsing || isCheckingStudents || isImporting || Object.values(fieldSuggestionsLoading).some(loading => loading)) {
        toast.info("操作正在进行中，请稍候或等待完成。");
        return;
    }
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleSuggestMappingInternal = async (header: string) => {
      if (!fileData || !onSuggestFieldMapping) return;
      const currentMapping = userConfirmedMappings?.[header];
      console.log(`[Dialog] Requesting AI suggestion for header: "${header}"`, 
        currentMapping ? `(当前映射: "${currentMapping}")` : "(当前无映射)");
      
      setFieldSuggestionsLoading(prev => ({ ...prev, [header]: true }));
      try {
          const sampleData = fileData.dataRows.slice(0, 5).map(row => row[header]);
          console.log(`[Dialog] 样本数据: [${sampleData.slice(0, 3).join(', ')}${sampleData.length > 3 ? '...' : ''}]`);
          
          const suggestion = await onSuggestFieldMapping(header, sampleData);
          console.log(`[Dialog] AI Suggestion for "${header}":`, suggestion);

          if (suggestion) {
              if (suggestion.isNewField && suggestion.newFieldName && onCustomFieldCreateRequested) {
                  // AI suggests creating a new field
                  // Prompt user to confirm/edit the AI-suggested new field name
                  setCustomFieldCreationState(prev => ({
                      ...prev,
                      [header]: { isPromptingName: true, newNameInput: suggestion.newFieldName!, error: null, isLoading: false }
                  }));
                  setUserConfirmedMappings(prev => ({ ...prev!, [header]: '' })); // Clear existing mapping
                  toast.success("AI建议创建新字段", { description: `AI建议为 "${header}" 创建新字段 "${suggestion.newFieldName}". 请确认或修改名称.` });
              } else if (suggestion.suggestedSystemField && effectiveSystemFields[suggestion.suggestedSystemField]) {
                  // AI suggests an existing system field
                  setUserConfirmedMappings(prev => ({ ...prev!, [header]: suggestion.suggestedSystemField }));
                  // Ensure no pending custom field creation UI for this header
                  setCustomFieldCreationState(prev => ({ ...prev, [header]: {isPromptingName: false, newNameInput: '', error: null, isLoading: false} }));
                  toast.success("AI建议匹配成功", { description: `AI已将 "${header}" 匹配到 "${effectiveSystemFields[suggestion.suggestedSystemField]}".` });
              } else {
                  toast.info("AI建议", { description: "AI未能提供明确的匹配建议，请手动选择。" });
              }
          } else {
              toast.info("AI建议", { description: "AI未能分析此字段或没有建议。" });
          }
      } catch (error) {
          console.error(`[Dialog] AI suggestion failed for header "${header}":`, error);
          toast.error("AI建议失败", { description: (error as Error).message });
      } finally {
          setFieldSuggestionsLoading(prev => ({ ...prev, [header]: false }));
      }
  };

  const handleCustomFieldInputChangeInternal = (header: string, newName: string) => {
      console.log(`[Dialog] Custom field name input change for "${header}": ${newName}`);
      setCustomFieldCreationState(prev => ({
          ...prev,
          [header]: { ...(prev[header] || { isPromptingName: true, error: null, isLoading: false }), newNameInput: newName, error: null }
      }));
  };

  const handleConfirmCustomFieldCreationInternal = async (header: string) => {
      const creationUIState = customFieldCreationState[header];
      if (!creationUIState || !creationUIState.newNameInput?.trim()) {
          setCustomFieldCreationState(prev => ({
              ...prev,
              [header]: { ...creationUIState, error: "自定义字段名称不能为空。" }
          }));
          toast.error("自定义字段名称不能为空。");
          console.log(`[Dialog] Custom field name for "${header}" is empty.`);
          return;
      }
      const finalNewName = creationUIState.newNameInput.trim();
      console.log(`[Dialog] Attempting to confirm custom field "${finalNewName}" for header "${header}"`);

      // 添加更多调试日志
      console.log(`[Dialog] onCustomFieldCreateRequested exists: ${typeof onCustomFieldCreateRequested === 'function'}`);
      console.log(`[Dialog] onCustomFieldCreateRequested type: ${typeof onCustomFieldCreateRequested}`);
      console.log(`[Dialog] All props for debugging:`, { 
        hasOnStartAIParse: !!onStartAIParse,
        hasOnCheckExistingStudents: !!onCheckExistingStudents,
        hasOnFinalImport: !!onFinalImport,
        hasOnSuggestFieldMapping: !!onSuggestFieldMapping,
        hasOnCustomFieldCreateRequested: !!onCustomFieldCreateRequested
      });

      if (typeof onCustomFieldCreateRequested !== 'function') {
          console.error("[Dialog] onCustomFieldCreateRequested prop is not provided or not a function!");
          toast.error("配置错误", {description: "无法创建自定义字段，请联系管理员。"});
          return;
      }

      // Mark this custom field as loading
      setCustomFieldCreationState(prev => ({
          ...prev,
          [header]: { ...prev[header], isLoading: true, error: null }
      }));

      try {
          // Call parent to handle the actual creation, which should return a new unique field id (key)
          const newFieldKey = await onCustomFieldCreateRequested(finalNewName, header);
          console.log(`[Dialog] Custom field creation result:`, newFieldKey);
          
          if (newFieldKey) {
              // If parent successfully created the field, update the mapping
              // Parent should have added the new field to availableSystemFields
              setUserConfirmedMappings(prev => {
                  const updated = { ...prev! };
                  updated[header] = newFieldKey; // Set mapping to use the new field key
                  console.log(`[Dialog] Updated userConfirmedMappings:`, updated);
                  return updated;
              });
              
              // Clear creation UI state
              setCustomFieldCreationState(prev => {
                  const updated = { ...prev };
                  delete updated[header]; // Remove creation UI for this header
                  return updated;
              });
              
              toast.success(`已创建自定义字段 "${finalNewName}"`, {
                  description: `表头 "${header}" 已映射到新的自定义字段。`
              });
              
              // 在这里强制组件重新注意到availableSystemFields已经更新
              console.log(`[Dialog] After custom field creation - availableSystemFields:`, availableSystemFields);
              console.log(`[Dialog] effectiveSystemFields will be updated on next render`);
          } else {
              // Handle failure from parent
              setCustomFieldCreationState(prev => ({
                  ...prev,
                  [header]: { ...prev[header], isLoading: false, error: "自定义字段创建失败。" }
              }));
              toast.error("自定义字段创建失败", { description: "服务器未能创建字段。" });
          }
      } catch (error) {
          console.error(`[Dialog] Error creating custom field:`, error);
          setCustomFieldCreationState(prev => ({
              ...prev,
              [header]: { ...prev[header], isLoading: false, error: (error as Error).message || "创建过程中出错。" }
          }));
          toast.error("自定义字段创建错误", { description: (error as Error).message });
      }
  };
  
  const handleCancelCustomFieldCreationInternal = (header: string) => {
      console.log(`[Dialog] Cancelling custom field creation for header "${header}"`);
      setUserConfirmedMappings(prev => ({ ...prev!, [header]: '' })); 
      setCustomFieldCreationState(prev => ({
          ...prev,
          [header]: { isPromptingName: false, newNameInput: '', error: null, isLoading: false }
      }));
  };

  const handleSelectChange = (header: string, value: string) => {
    console.log(`[Dialog] Select change for header "${header}": new value "${value}"`);
    if (value === '__CREATE_NEW__') {
        setUserConfirmedMappings(prev => ({ ...prev!, [header]: '' })); 
        setCustomFieldCreationState(prev => ({
            ...prev,
            [header]: { isPromptingName: true, newNameInput: '', error: null, isLoading: false }
        }));
    } else {
        setUserConfirmedMappings(prev => ({ ...prev!, [header]: value === 'empty' ? '' : value }));
        // Ensure no pending custom field creation UI is shown for this header if a direct mapping is chosen
        setCustomFieldCreationState(prev => ({ 
            ...prev, 
            [header]: { isPromptingName: false, newNameInput: '', error: null, isLoading: false }
        }));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // New Step 1: Data Preview & Initial Check
        const previewDataStep1 = fileData?.dataRows.slice(0, PREVIEW_ROW_COUNT_STEP_1) || [];
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-1">{UPDATED_STEPS[0].name}</h3>
            <p className="text-sm text-gray-600 mb-3">
                {initialDisplayInfo 
                    ? `您上传的文件: ${initialDisplayInfo.name}` 
                    : "正在等待文件信息..."}
            </p>
            <p className="text-sm text-gray-600 mb-4">{UPDATED_STEPS[0].description}</p>

            {fileData && previewDataStep1.length > 0 ? (
              <ScrollArea className="h-[45vh] border rounded-md bg-white">
                <div className="overflow-x-auto">
                  <Table className="min-w-full divide-y divide-gray-200">
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        {fileData.headers.map((header) => (
                          <TableHead key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-200">
                      {previewDataStep1.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {fileData.headers.map((header) => (
                            <TableCell key={`${rowIndex}-${header}`} className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                              {String(row[header] !== undefined && row[header] !== null ? row[header] : '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[45vh] flex flex-col items-center justify-center border rounded-md bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">
                  {initialDisplayInfo ? `正在加载 "${initialDisplayInfo.name}" 的数据内容...` : "等待文件数据加载..."}
                </p>
              </div>
            )}
             <div className="mt-2 text-xs text-gray-500">
                如果预览数据与您期望上传的文件不符，请取消并重新上传。
            </div>
          </div>
        );

      case 2: // New Step 2: AI Smart Matching & Confirmation (was Field Mapping)
        console.log("[Dialog Step 2 Render DEBUG] currentStep:", currentStep);
        console.log("[Dialog Step 2 Render DEBUG] fileData present:", !!fileData);
        if (fileData) {
            console.log("[Dialog Step 2 Render DEBUG] fileData.headers:", JSON.stringify(fileData.headers));
        }
        console.log("[Dialog Step 2 Render DEBUG] isAIParsing:", isAIParsing);
        console.log("[Dialog Step 2 Render DEBUG] userConfirmedMappings:", JSON.stringify(userConfirmedMappings));
        console.log("[Dialog Step 2 Render DEBUG] availableSystemFields (potentially defaulted):", JSON.stringify(effectiveSystemFields));
        console.log("[Dialog Step 2 Render DEBUG] aiParseError:", aiParseError);

        const previewDataStep2 = fileData?.dataRows.slice(0, PREVIEW_ROW_COUNT_STEP_2) || [];
        if (!fileData) return (
            <div className="h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p>等待数据加载以开始智能分析...</p>
            </div>
        );
        if (isAIParsing) return (
          <div className="text-center py-8 h-[70vh] flex flex-col justify-center items-center">
            <h3 className="text-xl font-semibold mb-3">AI助手分析中</h3>
            <p className="text-sm text-gray-600 mb-6">正在智能识别您的文件结构并尝试自动匹配表头...</p>
            <div className="my-8 w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex items-center justify-center">
              <p className="text-xs text-gray-400 p-2">AI 工作动画区域</p>
            </div>
            <Progress value={aiParseProgress} className="w-3/4 mx-auto mb-4" />
            {aiParseError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <Info size={16} className="inline mr-2" /> {aiParseError}
                 <Button variant="outline" size="sm" onClick={handleStartAIParsingInternal} className="ml-4"> 重试分析 </Button>
              </div>
            )}
          </div>
        );
        
        if (!userConfirmedMappings && !aiParseError) return (
            <div className="h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p>AI分析结果准备中...</p>
            </div>
        );
        if (!userConfirmedMappings && aiParseError) return (
             <div className="h-[70vh] flex flex-col items-center justify-center">
                <p className="text-red-600">AI分析失败，无法进行字段匹配。请尝试返回上一步重试或取消。</p>
                 <Button variant="outline" size="sm" onClick={handleStartAIParsingInternal} className="mt-4"> 重试AI分析 </Button>
            </div>
        )
        // Only proceed if userConfirmedMappings is available (even if empty from AI, user needs to see it)
        if (!userConfirmedMappings) return null; // Should be covered by above, but as a fallback

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[1].name}</h3>
              <p className="text-sm text-gray-600 mb-4">{UPDATED_STEPS[1].description}</p>
              <ScrollArea className="h-[35vh] border rounded-md bg-white">
                <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[35%] whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">您的文件表头</TableHead>
                      <TableHead className="w-[50%] whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">匹配到系统信息项</TableHead>
                      <TableHead className="w-[15%] whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {fileData.headers.map((header) => {
                      const currentMappingValue = userConfirmedMappings[header];
                      const creationUIState = customFieldCreationState[header];

                      return (
                        <TableRow key={`row-${header}`} className="hover:bg-gray-50">
                          <TableCell className="py-1.5 px-3">
                            {creationUIState?.isPromptingName ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Input
                                    value={creationUIState.newNameInput}
                                    onChange={(e) => handleCustomFieldInputChangeInternal(header, e.target.value)}
                                    placeholder="例如: 物理等级, 出勤率..."
                                    className={creationUIState.error ? "border-red-500" : ""}
                                    disabled={creationUIState.isLoading}
                                    autoFocus
                                  />
                                  <Button 
                                    size="sm"
                                    onClick={() => handleConfirmCustomFieldCreationInternal(header)}
                                    disabled={creationUIState.isLoading || !creationUIState.newNameInput?.trim()}
                                    className="flex items-center gap-1"
                                  >
                                    {creationUIState.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                    确认
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleCancelCustomFieldCreationInternal(header)}
                                    disabled={creationUIState.isLoading}
                                    className="flex items-center gap-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    取消
                                  </Button>
                                </div>
                                {creationUIState.error && (
                                  <p className="text-red-500 text-xs">{creationUIState.error}</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={currentMappingValue || ''} 
                                  onValueChange={(value) => handleSelectChange(header, value)}
                                >
                                  <SelectTrigger className="w-full text-xs h-9">
                                    <SelectValue placeholder="选择匹配的信息项">
                                      {currentMappingValue && effectiveSystemFields[currentMappingValue] 
                                          ? `${effectiveSystemFields[currentMappingValue]} (${currentMappingValue.startsWith('custom_') ? '自定义' : currentMappingValue})`
                                          : (currentMappingValue === '' && userConfirmedMappings.hasOwnProperty(header)) 
                                              ? "已忽略此列数据" 
                                              : "选择匹配的信息项"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="empty"><em>-- 忽略此列数据 --</em></SelectItem>
                                    {Object.entries(effectiveSystemFields).map(([sysKey, sysName]) => (
                                      <SelectItem key={sysKey} value={sysKey}>{sysName} {sysKey.startsWith('custom_') && <span className="text-xs text-blue-500 ml-1">(自定义)</span>}</SelectItem>
                                    ))}
                                    <SelectItem value="__CREATE_NEW__" className="text-blue-600 font-medium">-- 创建为新的自定义信息项 --</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {/* 改进的灯泡按钮 */}
                                {onSuggestFieldMapping && !isAIParsing && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 rounded-full p-0 transition-all ${
                                      fieldSuggestionsLoading[header] 
                                        ? 'animate-pulse text-primary/70' 
                                        : 'hover:text-primary hover:bg-primary/20 active:scale-95'
                                    }`}
                                    onClick={() => handleSuggestMappingInternal(header)}
                                    title={
                                      userConfirmedMappings?.[header] 
                                        ? "重新请求AI智能匹配建议" 
                                        : (aiParseError ? "尝试对此字段单独使用AI建议" : "AI智能匹配建议")
                                    }
                                    disabled={fieldSuggestionsLoading[header] || !!customFieldCreationState[header]?.isPromptingName}
                                  >
                                    {fieldSuggestionsLoading[header] ? (
                                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                    ) : (
                                      <Lightbulb className="h-4.5 w-4.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            </div>
            <div>
              <h4 className="text-md font-semibold mb-2">数据预览 (前 {PREVIEW_ROW_COUNT_STEP_2} 行，基于上方匹配)</h4>
              {previewDataStep2.length > 0 ? (
                <ScrollArea className="h-[30vh] border rounded-md bg-white">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full divide-y divide-gray-200">
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                          {/* TODO: Preview headers should reflect the mapping if possible */}
                          {fileData.headers.map((header) => {
                            const mappedSystemKey = userConfirmedMappings[header];
                            let displayHeader = header;
                            if (mappedSystemKey) {
                              if (mappedSystemKey.startsWith('NEW_FIELD::')) {
                                  displayHeader = `${mappedSystemKey.substring('NEW_FIELD::'.length)} (原: ${header})`;
                              } else if (effectiveSystemFields[mappedSystemKey]) {
                                  displayHeader = `${effectiveSystemFields[mappedSystemKey]} (原: ${header})`;
                              }
                            }
                            return (
                              <TableHead key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                {displayHeader}
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white divide-y divide-gray-200">
                        {previewDataStep2.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {fileData.headers.map((header) => (
                              <TableCell key={`${rowIndex}-${header}`} className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                                {String(row[header] !== undefined && row[header] !== null ? row[header] : '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-gray-500">没有可预览的数据。</p>
              )}
            </div>
          </div>
        );

      case 3: // Student Information Merge
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[2].name}</h3>
            <p className="text-sm text-gray-600 mb-4">{UPDATED_STEPS[2].description}</p>
            {isCheckingStudents && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={24} className="animate-spin mr-2" /> 正在检查现有学生信息...
              </div>
            )}
            {!isCheckingStudents && existingStudentsInfo && (
              <>
                {existingStudentsInfo.count > 0 ? (
                  <div className="p-4 border rounded-md bg-blue-50 border-blue-200">
                    <p className="text-blue-700 mb-3">
                      <SearchCheck size={18} className="inline mr-2" />
                      系统检测到 <strong>{existingStudentsInfo.count}</strong> 位可能已存在的学生。
                    </p>
                    <RadioGroup value={mergeChoice} onValueChange={setMergeChoice} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="merge" id="merge-yes" />
                        <Label htmlFor="merge-yes" className="font-normal">
                          是的，将本次导入的成绩合并到这些已存在的学生记录中。
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="create_new" id="merge-no" />
                        <Label htmlFor="merge-no" className="font-normal">
                          不，为本次导入的所有记录创建新的学生信息（如果学号/姓名已存在，可能会产生重复记录）。
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ) : (
                  <div className="p-4 border rounded-md bg-green-50 border-green-200 text-green-700">
                    <Info size={18} className="inline mr-2" />
                    未检测到匹配的现有学生记录。本次导入将为所有学生创建新的学生信息。
                  </div>
                )}
              </>
            )}
            {!isCheckingStudents && !existingStudentsInfo && (
                <p className="text-sm text-gray-500 mt-4">学生信息检查服务似乎未配置或遇到问题。</p>
            )}
          </div>
        );

      case 4: // Final Confirmation and Import
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[3].name}</h3>
            <p className="text-sm text-gray-600 mb-1">{UPDATED_STEPS[3].description}</p>
            <div className="mt-4 p-4 border rounded-md space-y-2 bg-gray-50">
                <p className="text-sm"><span className="font-semibold">考试标题:</span> {editableExamInfo?.title}</p>
                <p className="text-sm"><span className="font-semibold">文件名:</span> {fileData?.fileName}</p>
                <p className="text-sm"><span className="font-semibold">总记录数:</span> {fileData?.dataRows.length} 条</p>
                <p className="text-sm"><span className="font-semibold">学生信息处理:</span> 
                    {mergeChoice === 'merge' ? "合并到现有记录" : "创建新记录"}
                </p>
                <p className="text-xs text-gray-500 pt-2">字段映射将在后台使用您第二步确认的设置为准。</p>
            </div>
            <div className="mt-6 p-3 border rounded-md bg-yellow-50 border-yellow-300 text-yellow-800 text-sm">
                <Info size={16} className="inline mr-2" />
                点击"完成并导入"后，数据将开始处理并保存。此过程可能不可逆。
            </div>
          </div>
        );
      default:
        return <div>未知步骤</div>;
    }
  };

  // Stepper UI Visuals
  const StepperUI = () => (
    <div className="px-6 sm:px-8 py-4 border-b bg-gray-50/50">
      <div className="flex items-start justify-between">
        {UPDATED_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center text-center w-1/4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold text-lg
                  ${
                    currentStep > step.id
                      ? 'bg-green-500 border-green-600 text-white'
                      : currentStep === step.id
                      ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg'
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  } transition-all duration-300 ease-in-out`}
              >
                {currentStep > step.id ? <CheckCircle size={22} /> : <step.icon size={20} />}
              </div>
              <p className={`mt-2 text-xs sm:text-sm font-medium ${
                currentStep === step.id ? 'text-primary' : currentStep > step.id ? 'text-green-600' : 'text-gray-500'
              }`}>{step.name}</p>
            </div>
            {index < UPDATED_STEPS.length - 1 && (
              <div className={`flex-1 h-1 mt-5 mx-1 sm:mx-2 rounded-full ${
                currentStep > step.id + 1 ? 'bg-green-500' : (currentStep > step.id ? 'bg-green-300' : 'bg-gray-300')
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0 shadow-xl">
        <DialogHeader className="p-5 sm:p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-gray-800">导入数据审核与确认</DialogTitle>
          {/* Optional: Sub-description if needed */}
          {/* <DialogDescription>请按步骤检查并确认您的数据与设置。</DialogDescription> */}
        </DialogHeader>

        <StepperUI />

        <div className="p-5 sm:p-6 flex-grow overflow-y-auto min-h-[350px] bg-white">
          {renderStepContent()}
        </div>

        <DialogFooter className="p-4 sm:p-5 border-t flex flex-col sm:flex-row justify-between items-center w-full bg-gray-50 space-y-3 sm:space-y-0">
          <div className="flex-shrink-0">
            <Button variant="outline" onClick={handlePrevious} disabled={isAIParsing || isCheckingStudents || isImporting}>
              <ArrowLeft size={16} className="mr-1.5" />
              上一步
            </Button>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <Button variant="ghost" onClick={handleDialogClose} disabled={isAIParsing || isCheckingStudents || isImporting || Object.values(fieldSuggestionsLoading).some(loading => loading) || Object.values(customFieldCreationState).some(s => s.isLoading)}>
                取消
            </Button>
            {currentStep < UPDATED_STEPS.length && (
              <Button 
                onClick={handleNext} 
                disabled={
                    (currentStep === 1 && !fileData) || 
                    (currentStep === 2 && (isAIParsing || (!userConfirmedMappings && !aiParseError) || Object.values(customFieldCreationState).some(s => s.isPromptingName || s.isLoading) || Object.values(fieldSuggestionsLoading).some(loading => loading) )) || 
                    (currentStep === 3 && isCheckingStudents) || 
                    isImporting
                }
              >
                {currentStep === 1 ? '确认数据，开始智能分析' : '下一步'}
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            )}
            {currentStep === UPDATED_STEPS.length && (
              <Button 
                onClick={handleFinalConfirmAndImport} 
                disabled={isImporting || isAIParsing || isCheckingStudents || Object.values(customFieldCreationState).some(s => s.isLoading)}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
              >
                {isImporting ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Send size={16} className="mr-2" />
                )}
                {isImporting ? '正在导入...' : '完成并导入'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportReviewDialog; 