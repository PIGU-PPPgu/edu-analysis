import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Info, SearchCheck, Sparkles, FileText, UserCheck, Send, Eye, Lightbulb, XCircle, HelpCircle, AlertCircle, Check, ChevronsUpDown, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SimplifiedExamForm from './SimplifiedExamForm';
import { FieldInquiryDialog } from '@/components/db/FieldInquiryDialog';
import { FieldType } from '@/services/intelligentFileParser';
import { analyzeCSVHeaders, generateMappingSuggestions } from '@/services/intelligentFieldMapper';
import StudentMatchingAnalysis from './StudentMatchingAnalysis';
import { supabase } from '@/integrations/supabase/client';

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
    // 🚀 新增：详细的学生匹配信息
    totalStudentsInFile: number;
    exactMatches: Array<{
      fileStudent: { name: string; student_id?: string; class_name?: string };
      systemStudent: { id: string; name: string; student_id: string; class_name?: string };
      matchType: 'exact_id' | 'exact_name';
    }>;
    fuzzyMatches: Array<{
      fileStudent: { name: string; student_id?: string; class_name?: string };
      possibleMatches: Array<{
        systemStudent: { id: string; name: string; student_id: string; class_name?: string };
        similarity: number;
        matchReason: string;
      }>;
    }>;
    newStudents: Array<{
      name: string;
      student_id?: string;
      class_name?: string;
    }>;
    systemStudentsNotInFile: Array<{
      id: string;
      name: string;
      student_id: string;
      class_name?: string;
    }>;
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
  
  // 智能解析结果
  intelligentParseResult?: {
    success: boolean;
    data: any[];
    metadata: {
      originalHeaders: string[];
      detectedStructure: 'wide' | 'long' | 'mixed';
      confidence: number;
      suggestedMappings: Record<string, string>;
      detectedSubjects: string[];
      examInfo?: any;
      totalRows: number;
      autoProcessed?: boolean;
      unknownFields?: Array<{ name: string; sampleValues: string[] }>;
      needsFieldInquiry?: boolean;
    };
  } | null;

  onStartAIParse?: (fileData: FileDataForReview, currentExamInfo: ExamInfo | null) => Promise<AIParseResult>;
  onCheckExistingStudents?: (
    userConfirmedMappings: Record<string, string>,
    sampleData: any[],
    examInfo: ExamInfo,
    examScope: 'class' | 'grade',
    newStudentStrategy: 'create' | 'ignore'
  ) => Promise<ExistingStudentCheckResult>;
  onFinalImport: (
    examInfo: ExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string, 
    dataToProcess: any[],
    examScope: 'class' | 'grade',
    newStudentStrategy: 'create' | 'ignore'
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
  { id: 2, name: '考试信息', description: "请提供考试的详细信息，如考试类型、日期等。", icon: FileText },
  { id: 3, name: '智能匹配与确认', description: "AI已尝试匹配您的文件表头到系统信息项，请检查并调整。", icon: Sparkles },
  { id: 4, name: '学生信息策略', description: "选择如何处理已存在的学生记录与新学生记录。", icon: UserCheck },
  { id: 5, name: '最终确认导入', description: "检查所有设置，然后开始导入数据。", icon: Send },
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
  intelligentParseResult,
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
  
  // 🚀 智能字段分析状态
  const [intelligentAnalysis, setIntelligentAnalysis] = useState<{
    isAnalyzing: boolean;
    confidence: number;
    detectedSubjects: string[];
    isWideFormat: boolean;
    mappingCount: number;
    issues: string[];
  }>({
    isAnalyzing: false,
    confidence: 0,
    detectedSubjects: [],
    isWideFormat: false,
    mappingCount: 0,
    issues: []
  });
  
  // 新增：自动映射相关状态
  const [autoMappingConfidence, setAutoMappingConfidence] = useState<'low' | 'medium' | 'high'>('low');
  const [autoMappedFields, setAutoMappedFields] = useState<string[]>([]);
  const [autoMappingComplete, setAutoMappingComplete] = useState(false);
  
  // 新增：关键字段的列表
  const ESSENTIAL_FIELDS = ['student_id', 'name', 'score', 'class_name'];

  // Step 2: Field Mapping states
  const [userConfirmedMappings, setUserConfirmedMappings] = useState<Record<string, string> | null>(null);

  // Step 3: Student Merge states
  const [isCheckingStudents, setIsCheckingStudents] = useState(false);
  const [existingStudentsInfo, setExistingStudentsInfo] = useState<ExistingStudentCheckResult | null>(null);
  const [mergeChoice, setMergeChoice] = useState<string>('merge'); // Default to 'merge'
  
  // 新增状态变量：考试范围和学生处理策略
  const [examScope, setExamScope] = useState<'class' | 'grade'>('class'); // 默认班级单位
  const [newStudentStrategy, setNewStudentStrategy] = useState<'create' | 'ignore'>('create'); // 默认创建新学生

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
  
  // 字段询问相关状态
  const [showFieldInquiry, setShowFieldInquiry] = useState(false);
  const [unknownFields, setUnknownFields] = useState<Array<{ name: string; sampleValues: string[] }>>([]);
  const [fieldInquiryContext, setFieldInquiryContext] = useState<{
    detectedSubjects: string[];
    fileStructure: 'wide' | 'long' | 'mixed';
    otherFields: string[];
  } | undefined>(undefined);
  
  // 🚀 新增：模糊匹配确认状态
  const [fuzzyMatchConfirmations, setFuzzyMatchConfirmations] = useState<Record<number, string>>({});
  const [rejectedFuzzyMatches, setRejectedFuzzyMatches] = useState<Set<number>>(new Set());
  
  // 🚀 新增：智能学生匹配分析状态
  const [studentMatchingResult, setStudentMatchingResult] = useState<ExistingStudentCheckResult | null>(null);
  const [isPerformingStudentAnalysis, setIsPerformingStudentAnalysis] = useState(false);
  
  // 添加调试日志 - 移到状态声明之后避免引用错误
  console.log("[Dialog Step 2 Render DEBUG] aiParseError:", aiParseError);
  console.log("[Dialog] availableSystemFields received:", availableSystemFields); 
  
  // 确保即使传入的值为undefined，也始终有可用的默认字段
  const effectiveSystemFields = availableSystemFields || DEFAULT_FALLBACK_FIELDS;

  // Log received availableSystemFields when component mounts or prop changes
  useEffect(() => {
    console.log("[Dialog Mount/Prop Change DEBUG] availableSystemFields received by dialog:", JSON.stringify(availableSystemFields));
  }, [availableSystemFields]);

  // 检查智能解析结果，决定是否需要字段询问或设置自动映射
  useEffect(() => {
    console.log("[ImportReviewDialog] useEffect触发 - 检查智能解析结果:", {
      hasIntelligentParseResult: !!intelligentParseResult,
      autoProcessed: intelligentParseResult?.metadata?.autoProcessed,
      needsFieldInquiry: intelligentParseResult?.metadata?.needsFieldInquiry,
      confidence: intelligentParseResult?.metadata?.confidence,
      unknownFieldsCount: intelligentParseResult?.metadata?.unknownFields?.length || 0,
      currentStep,
      hasFileData: !!fileData
    });
    
    // 🚀 执行智能字段分析
    if (isOpen && fileData && fileData.headers && currentStep === 1) {
      console.log('[智能分析] 开始分析CSV表头结构...');
      setIntelligentAnalysis(prev => ({ ...prev, isAnalyzing: true }));
      
      try {
        const analysis = analyzeCSVHeaders(fileData.headers);
        const suggestions = generateMappingSuggestions(fileData.headers);
        
        console.log('[智能分析] 分析完成:', {
          识别的科目: analysis.subjects,
          置信度: analysis.confidence,
          是否宽表格: analysis.subjects.length > 1,
          映射数量: analysis.mappings.length,
          问题: suggestions.issues
        });
        
        setIntelligentAnalysis({
          isAnalyzing: false,
          confidence: analysis.confidence,
          detectedSubjects: analysis.subjects,
          isWideFormat: analysis.subjects.length > 1,
          mappingCount: analysis.mappings.length,
          issues: suggestions.issues
        });
        
        // 如果是高置信度的宽表格，自动设置映射
        if (analysis.confidence > 0.8 && analysis.subjects.length > 1) {
          console.log('[智能分析] 高置信度宽表格，自动设置映射');
          setAiSuggestedMappings(suggestions.suggestions);
          setUserConfirmedMappings(suggestions.suggestions);
          setAutoMappingComplete(true);
          setAutoMappingConfidence('high');
        }
        
      } catch (error) {
        console.error('[智能分析] 分析失败:', error);
        setIntelligentAnalysis(prev => ({ 
          ...prev, 
          isAnalyzing: false,
          issues: ['智能分析失败，请手动配置字段映射']
        }));
      }
    }
    
    // 只在对话框打开且有智能解析结果时处理，且只在步骤1时处理一次
    if (!isOpen || !intelligentParseResult || currentStep !== 1) {
      return;
    }
    
    // 检查是否需要字段询问
    if (intelligentParseResult.metadata?.needsFieldInquiry && intelligentParseResult.metadata.unknownFields) {
      console.log("[Dialog] 检测到需要字段询问，未知字段:", intelligentParseResult.metadata.unknownFields);
      
      setUnknownFields(intelligentParseResult.metadata.unknownFields);
      setFieldInquiryContext({
        detectedSubjects: intelligentParseResult.metadata.detectedSubjects || [],
        fileStructure: intelligentParseResult.metadata.detectedStructure,
        otherFields: intelligentParseResult.metadata.originalHeaders || []
      });
      setShowFieldInquiry(true);
      return;
    }
    
    // 设置自动映射结果，但不立即跳转
    const autoMappings = intelligentParseResult.metadata.suggestedMappings || {};
    setAiSuggestedMappings(autoMappings);
    setUserConfirmedMappings(autoMappings);
    
    // 检查是否应该自动跳过字段映射
    const shouldAutoSkip = intelligentParseResult.metadata?.autoProcessed || 
                          (intelligentParseResult.metadata?.confidence && intelligentParseResult.metadata.confidence >= 0.8);
    
    if (shouldAutoSkip) {
      console.log("[Dialog] ✅ 智能解析置信度足够高，标记为自动处理");
      console.log("[Dialog] 置信度:", intelligentParseResult.metadata?.confidence);
      console.log("[Dialog] 自动处理状态:", intelligentParseResult.metadata?.autoProcessed);
      
      setAutoMappingComplete(true);
      setAutoMappingConfidence('high');
    } else {
      console.log("[Dialog] 智能解析置信度不足，需要手动字段映射");
      console.log("[Dialog] 置信度:", intelligentParseResult.metadata?.confidence);
      setAutoMappingComplete(false);
      setAutoMappingConfidence('low');
    }
  }, [intelligentParseResult, isOpen, currentStep, fileData]);

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
      console.log("[ImportReviewDialog] 对话框打开状态:", {
        isOpen, 
        hasFileData: !!fileData, 
        hasUserConfirmedMappings: !!userConfirmedMappings
      });
      // 只在对话框首次打开时重置状态，而不是在内部状态变化时重置
      // 检查是否是首次打开对话框还是在处理过程中
      const isInitialOpen = !userConfirmedMappings;
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
    if (isOpen) {
      console.log("[Dialog] Setting exam info from props:", currentExamInfo);
      if (currentExamInfo) {
        setEditableExamInfo(currentExamInfo);
      } else {
        // 确保总是有默认值
        setEditableExamInfo({ 
          title: '', 
          type: '', 
          date: new Date().toISOString().split('T')[0], 
          subject: '' 
        });
      }
    }
  }, [isOpen, currentExamInfo]);

  // Effect for initializing exam info when moving to step 2
  useEffect(() => {
    if (isOpen && currentStep === 2 && !editableExamInfo) {
        // Initialize editableExamInfo if it hasn't been set from props yet
        if (currentExamInfo) {
            setEditableExamInfo(currentExamInfo);
        } else {
            // Ensure there's a default if no exam info came from props
            setEditableExamInfo({ title: '', type: '', date: new Date().toISOString().split('T')[0], subject: '' });
        }
    }
  }, [isOpen, currentStep, currentExamInfo, editableExamInfo]);

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
      
      // 评估映射置信度
      const fieldMappings = result.suggestedMappings;
      const mappedFields = Object.values(fieldMappings);
      
      // 定义关键/必要字段
      const essentialFields = ['student_id', 'name', 'score', 'class_name'];
      
      // 检查映射的关键字段数量
      const mappedEssentialFields = essentialFields.filter(field => mappedFields.includes(field));
      const mappedEssentialRatio = mappedEssentialFields.length / essentialFields.length;
      
      // 计算总体映射比例
      const totalFieldsCount = fileData.headers.length;
      const mappedFieldsCount = Object.keys(fieldMappings).length;
      const totalMappedRatio = mappedFieldsCount / totalFieldsCount;
      
      // 设置自动映射的字段列表
      setAutoMappedFields(mappedEssentialFields);
      
      // 基于匹配度设置置信度
      let confidence: 'low' | 'medium' | 'high' = 'low';
      
      const hasStudentId = mappedFields.includes('student_id');
      const hasName = mappedFields.includes('name');
      const hasScore = mappedFields.includes('score');
      
      if (mappedEssentialRatio === 1) {
        // 所有关键字段都匹配，高置信度
        confidence = 'high';
      } else if ((hasStudentId || hasName) && hasScore && mappedEssentialRatio >= 0.75 && totalMappedRatio >= 0.6) {
        // 有学号或姓名、有分数，且75%以上关键字段匹配，中等置信度
        confidence = 'medium';
      } else if ((hasStudentId || hasName) && hasScore) {
        // 有学号或姓名、有分数，最低要求
        confidence = 'low';
      } else {
        // 关键字段匹配不足
        confidence = 'low';
      }
      
      setAutoMappingConfidence(confidence);
      
      // 显示不同级别的提示
      if (confidence === 'high') {
        setAutoMappingComplete(true);
        toast.success('智能识别完成！', {
          description: `系统已自动识别所有必要字段，可直接进入下一步`,
        });
        
        // 自动进入下一步 - 学生信息处理
        setTimeout(() => {
          handleConfirmMappings();
        }, 1000);
      } else if (confidence === 'medium') {
        toast.info('智能识别部分完成', {
          description: `系统已识别大部分字段 (${mappedFieldsCount}/${totalFieldsCount})，请检查并确认。`,
        });
      } else {
        toast.warning('需要您的帮助', {
          description: `系统只识别了部分字段 (${mappedFieldsCount}/${totalFieldsCount})，请完成剩余映射。`,
        });
      }
      
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
    
    // 检查是否有基本的必要字段映射
    const mappedFields = Object.values(userConfirmedMappings).filter(value => value && value.trim() !== '');
    const hasStudentId = mappedFields.includes('student_id');
    const hasName = mappedFields.includes('name');
    
    // 🚀 修复：只要求姓名字段必需，学号字段可选
    if (!hasName) {
        toast.error("缺少必要字段映射", {
            description: "姓名字段是必需的，请确保映射了姓名字段才能继续"
        });
        return;
    }
    
    // 学号字段是可选的，但建议有
    if (!hasStudentId) {
        console.warn("建议映射学号字段以提高匹配准确性");
        toast.info("建议完善字段映射", {
            description: "未检测到学号字段，将仅使用姓名进行学生匹配。建议添加学号字段以提高准确性。",
            duration: 3000
        });
    }
    
    // 统计映射情况
    const totalHeaders = Object.keys(userConfirmedMappings).length;
    const mappedHeaders = mappedFields.length;
    const unmappedHeaders = totalHeaders - mappedHeaders;
    
    if (unmappedHeaders > 0) {
        console.log(`[Dialog] 字段映射不完整: ${mappedHeaders}/${totalHeaders} 个字段已映射`);
        
        // 给用户一个温和的提醒
        toast.warning("部分字段未映射", {
            description: `${unmappedHeaders} 个字段未映射，未映射的字段将被忽略。继续导入？`,
            duration: 4000
        });
    }
    
    console.log("[Dialog] Mappings confirmed, proceeding to step 4. Current mappings:", userConfirmedMappings);
    console.log(`[Dialog] 映射统计: ${mappedHeaders}/${totalHeaders} 个字段已映射`);
    setCurrentStep(4);
  };

  useEffect(() => {
    // Trigger student check when moving to step 4 (学生信息策略)
    if (isOpen && currentStep === 4 && fileData && onCheckExistingStudents && userConfirmedMappings && !isCheckingStudents && !existingStudentsInfo) {
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
        const result = await onCheckExistingStudents(
          userConfirmedMappings, 
          sampleDataForCheck, 
          editableExamInfo!, 
          examScope,
          newStudentStrategy
        );
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
    if (!editableExamInfo || !fileData) {
      console.error("缺少必要数据，无法导入", { editableExamInfo, hasFileData: !!fileData });
      toast.error("缺少必要数据，无法导入");
      return;
    }
    
    // 检查字段映射是否存在，如果不存在则尝试创建默认映射
    if (!userConfirmedMappings || Object.keys(userConfirmedMappings).length === 0) {
      console.warn("用户未确认字段映射，尝试创建默认映射");
      
      // 检查是否有文件数据和表头
      if (!fileData.headers || fileData.headers.length === 0) {
        console.error("无法创建默认映射：缺少文件表头信息");
        toast.error("导入失败", {
          description: "文件表头信息缺失，请重新选择文件"
        });
        return;
      }
      
      // 创建基本的默认映射
      const defaultMappings: Record<string, string> = {};
      const headers = fileData.headers;
      
      // 尝试智能匹配常见字段
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('学号') || lowerHeader.includes('id') || lowerHeader === 'student_id') {
          defaultMappings[header] = 'student_id';
        } else if (lowerHeader.includes('姓名') || lowerHeader.includes('name') || lowerHeader === 'name') {
          defaultMappings[header] = 'name';
        } else if (lowerHeader.includes('班级') || lowerHeader.includes('class') || lowerHeader === 'class_name') {
          defaultMappings[header] = 'class_name';
        } else if (lowerHeader.includes('总分') || lowerHeader.includes('总成绩') || lowerHeader === 'total_score') {
          defaultMappings[header] = 'total_score';
        } else {
          // 其他字段映射为自定义字段
          defaultMappings[header] = header;
        }
      });
      
      console.log("创建的默认映射:", defaultMappings);
      setUserConfirmedMappings(defaultMappings);
      
      // 给用户一个提示
      toast.warning("使用默认字段映射", {
        description: "系统已自动创建字段映射，如有问题请返回上一步手动调整"
      });
      
      // 使用创建的默认映射继续导入
      await proceedWithImport(defaultMappings);
      return;
    }
    
    // 有字段映射的情况，直接进行导入
    await proceedWithImport(userConfirmedMappings);
  };

  // 提取实际导入逻辑到单独函数
  const proceedWithImport = async (mappings: Record<string, string>) => {
    // 进行考试信息的校验
    if (!editableExamInfo.title) {
      console.error("考试标题为空，无法导入");
      toast.error("请输入考试标题", {
        description: "考试标题是必填项"
      });
      return;
    }

    if (!editableExamInfo.type) {
      console.error("考试类型为空，无法导入");
      toast.error("请选择考试类型", {
        description: "考试类型是必填项"
      });
      return;
    }

    if (!editableExamInfo.date) {
      console.error("考试日期为空，无法导入");
      toast.error("请选择考试日期", {
        description: "考试日期是必填项"
      });
      return;
    }

    // 验证映射中是否包含必要字段
    // 🚀 修复：改为更灵活的验证逻辑
    const mappedFields = Object.values(mappings);
    const hasStudentId = mappedFields.includes('student_id');
    const hasName = mappedFields.includes('name');
    
    // 姓名字段是必需的
    if (!hasName) {
      console.error("缺少必要字段映射: name");
      toast.error("字段映射不完整", {
        description: "姓名字段是必需的，请返回上一步确保映射了姓名字段"
      });
      return;
    }
    
    // 学号字段是可选的，但建议有
    if (!hasStudentId) {
      console.warn("建议映射学号字段以提高匹配准确性");
      toast.warning("建议完善字段映射", {
        description: "未检测到学号字段，将仅使用姓名进行学生匹配。建议添加学号字段以提高准确性。",
        duration: 4000
      });
    }
    
    // 检查是否有分数相关字段
    const hasScoreFields = mappedFields.some(field => 
      field.includes('score') || field.includes('分数') || field === 'total_score'
    );
    
    if (!hasScoreFields) {
      console.warn("未检测到分数字段");
      toast.warning("未检测到分数字段", {
        description: "建议映射至少一个分数字段以便进行成绩分析",
        duration: 3000
      });
    }

    setIsImporting(true);
    
    try {
      console.log("[Dialog] 开始最终导入，参数:", {
        examInfo: editableExamInfo,
        mappings: mappings,
        fileData: fileData ? `${fileData.dataRows.length} rows` : 'no data',
        existingStudents: existingStudentsInfo || 'none checked',
        mergeChoice
      });

      await onFinalImport(
        editableExamInfo,
        mappings,
        mergeChoice,
        fileData.dataRows,
        examScope,
        newStudentStrategy
      );
      
      toast.success("数据导入成功！");
      onOpenChange(false);
    } catch (error) {
      console.error("导入失败:", error);
      toast.error("导入失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleNext = () => {
    console.log(`[Dialog] Moving from step ${currentStep} to next step`);
    
    if (currentStep === 1) {
      // 从数据预览到考试信息
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // 从考试信息到字段映射或直接到学生信息策略
      // 检查是否可以自动跳过字段映射步骤
      if (autoMappingComplete && intelligentAnalysis.confidence >= 1.0 && userConfirmedMappings) {
        // 检查是否有必要字段映射
        const mappedFields = Object.values(userConfirmedMappings).filter(value => value && value.trim() !== '');
        const hasStudentId = mappedFields.includes('student_id');
        const hasName = mappedFields.includes('name');
        
        if (hasStudentId || hasName) {
          console.log('[Dialog] 智能分析完成，直接跳过字段映射步骤到第4步');
          toast.success('智能识别完成', {
            description: '系统已自动完成字段映射，直接进入学生信息处理步骤',
            duration: 2000
          });
          setCurrentStep(4); // 直接跳到第4步
          return;
        }
      }
      
      // 如果不能自动跳过，正常进入第3步
      console.log('[Dialog] 进入字段映射步骤');
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // 从字段映射到学生信息策略
      handleConfirmMappings();
    } else if (currentStep === 4) {
      // 从学生信息策略到最终确认
      setCurrentStep(5);
    }
  };

  const handlePrevious = () => {
    console.log(`[Dialog] Moving from step ${currentStep} to previous step`);
    
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      // 如果是从自动跳过的情况回到上一步，需要判断是回到第2步还是第3步
      if (autoMappingComplete && autoMappingConfidence === 'high') {
        console.log('[Dialog] 从自动跳过的第4步回到第2步');
        setCurrentStep(2);
      } else {
        console.log('[Dialog] 从第4步回到第3步');
        setCurrentStep(3);
      }
    } else if (currentStep === 5) {
      setCurrentStep(4);
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
          
          // 添加分析开始时的视觉反馈
          toast.info(`正在分析 "${header}" 字段`, {
            id: `field-analysis-${header}`,
            description: "AI正在智能识别该字段的最佳映射...",
            duration: 5000
          });
          
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
                  toast.success("AI建议创建新字段", { 
                    id: `field-analysis-${header}`,
                    description: `AI建议为 "${header}" 创建新字段 "${suggestion.newFieldName}". 请确认或修改名称.`,
                    duration: 5000
                  });
              } else if (suggestion.suggestedSystemField && effectiveSystemFields[suggestion.suggestedSystemField]) {
                  // AI suggests an existing system field
                  setUserConfirmedMappings(prev => ({ ...prev!, [header]: suggestion.suggestedSystemField }));
                  // Ensure no pending custom field creation UI for this header
                  setCustomFieldCreationState(prev => ({ ...prev, [header]: {isPromptingName: false, newNameInput: '', error: null, isLoading: false} }));
                  toast.success("AI建议匹配成功", { 
                    id: `field-analysis-${header}`,
                    description: `AI已将 "${header}" 匹配到 "${effectiveSystemFields[suggestion.suggestedSystemField]}".`,
                    duration: 3000
                  });
              } else {
                  toast.info("AI建议", { 
                    id: `field-analysis-${header}`,
                    description: "AI未能提供明确的匹配建议，请手动选择。",
                    duration: 3000
                  });
              }
          } else {
              toast.info("AI建议", { 
                id: `field-analysis-${header}`,
                description: "AI未能分析此字段或没有建议。",
                duration: 3000 
              });
          }
      } catch (error) {
          console.error(`[Dialog] AI suggestion failed for header "${header}":`, error);
          toast.error("AI建议失败", { 
            id: `field-analysis-${header}`,
            description: (error as Error).message,
            duration: 4000
          });
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

  // 处理字段询问完成
  const handleFieldInquiryComplete = (fieldMappings: Record<string, FieldType>) => {
    console.log("[Dialog] 字段询问完成，映射结果:", fieldMappings);
    
    // 将FieldType映射转换为字符串映射
    const stringMappings: Record<string, string> = {};
    Object.entries(fieldMappings).forEach(([fieldName, fieldType]) => {
      stringMappings[fieldName] = fieldType;
    });
    
    // 合并智能解析的映射和用户询问的映射
    const combinedMappings = {
      ...intelligentParseResult?.metadata?.suggestedMappings,
      ...stringMappings
    };
    
    setUserConfirmedMappings(combinedMappings);
    setShowFieldInquiry(false);
    
    // 继续到下一步
    setCurrentStep(2);
    
    toast.success("字段映射完成", {
      description: `成功映射 ${Object.keys(fieldMappings).length} 个字段`
    });
  };

  // 🚀 新增：处理模糊匹配确认
  const handleConfirmFuzzyMatch = (fileStudentIndex: number, systemStudentId: string) => {
    console.log(`[Dialog] 确认模糊匹配: 文件学生索引 ${fileStudentIndex} -> 系统学生ID ${systemStudentId}`);
    
    setFuzzyMatchConfirmations(prev => ({
      ...prev,
      [fileStudentIndex]: systemStudentId
    }));
    
    // 从拒绝列表中移除（如果之前被拒绝过）
    setRejectedFuzzyMatches(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileStudentIndex);
      return newSet;
    });
    
    toast.success("匹配确认成功", {
      description: "已确认学生匹配关系"
    });
  };

  // 🚀 新增：处理模糊匹配拒绝
  const handleRejectFuzzyMatch = (fileStudentIndex: number) => {
    console.log(`[Dialog] 拒绝模糊匹配: 文件学生索引 ${fileStudentIndex}`);
    
    setRejectedFuzzyMatches(prev => new Set([...prev, fileStudentIndex]));
    
    // 从确认列表中移除（如果之前被确认过）
    setFuzzyMatchConfirmations(prev => {
      const newConfirmations = { ...prev };
      delete newConfirmations[fileStudentIndex];
      return newConfirmations;
    });
    
    toast.info("已拒绝匹配", {
      description: "该学生将被视为新学生处理"
    });
  };

  // 🚀 新增：查看学生详情（占位函数）
  const handleViewStudentDetails = (student: any) => {
    console.log("[Dialog] 查看学生详情:", student);
    // 这里可以实现学生详情查看功能
    toast.info("学生详情", {
      description: `查看 ${student.name} 的详细信息`
    });
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

  // 新增：学生匹配说明组件
  const studentMatchingDescription = useMemo(() => {
    if (!fileData) return null;
    
    // 检测是否是宽表格式
    const scoreFields = fileData.headers.filter(header => 
      header.includes('分数') || header.includes('成绩') || header.includes('score')
    );
    const isWideFormat = scoreFields.length > 1;
    
    // 计算实际学生数量（去重）
    const studentIdField = Object.keys(userConfirmedMappings || {}).find(key => 
      userConfirmedMappings?.[key] === 'student_id'
    );
    const nameField = Object.keys(userConfirmedMappings || {}).find(key => 
      userConfirmedMappings?.[key] === 'name'
    );
    
    const uniqueStudentsSet = new Set<string>();
    fileData.dataRows.forEach(row => {
      const studentId = studentIdField ? String(row[studentIdField]).trim() : null;
      const name = nameField ? String(row[nameField]).trim() : null;
      const key = studentId || name;
      if (key) uniqueStudentsSet.add(key);
    });
    
    const uniqueStudentCount = uniqueStudentsSet.size;
    const totalRecords = fileData.dataRows.length;
    
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <h4 className="font-medium text-blue-800 mb-2">数据结构说明</h4>
            <div className="text-blue-700 space-y-1">
              <p>• <strong>文件总记录数：</strong>{totalRecords} 条</p>
              <p>• <strong>实际学生人数：</strong>{uniqueStudentCount} 人</p>
              {isWideFormat && (
                <p>• <strong>数据格式：</strong>宽表格式（每个学生一行，包含多个科目分数）</p>
              )}
              {!isWideFormat && totalRecords > uniqueStudentCount && (
                <p>• <strong>数据格式：</strong>长表格式（每个学生每科目一行记录）</p>
              )}
              <p className="text-xs text-blue-600 mt-2">
                系统将基于学生人数（{uniqueStudentCount}人）进行匹配检查，而不是记录总数
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [fileData, userConfirmedMappings]);

  // 添加智能批量匹配功能
  const handleBatchAIMatching = async () => {
    if (!fileData || !onSuggestFieldMapping) return;
    
    try {
      // 记录当前未映射的字段
      const unmappedHeaders = fileData.headers.filter(
        header => !userConfirmedMappings?.[header] && 
                 !customFieldCreationState[header]?.isPromptingName
      );
      
      if (unmappedHeaders.length === 0) {
        toast.info("所有字段已完成映射", {
          description: "没有剩余未映射的字段。"
        });
        return;
      }
      
      // 显示批量处理开始提示
      toast.info("开始批量智能匹配", {
        id: "batch-matching",
        description: `AI将分析 ${unmappedHeaders.length} 个未映射字段`,
        duration: 8000
      });
      
      // 设置所有待处理字段为加载状态
      setFieldSuggestionsLoading(prev => {
        const newState = { ...prev };
        unmappedHeaders.forEach(header => {
          newState[header] = true;
        });
        return newState;
      });
      
      // 创建一个进度计数器
      let processed = 0;
      
      // 使用Promise.all但限制并发数为3，避免一次性发送太多请求
      const batchSize = 3;
      for (let i = 0; i < unmappedHeaders.length; i += batchSize) {
        const batch = unmappedHeaders.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (header) => {
          try {
            await handleSuggestMappingInternal(header);
          } catch (error) {
            console.error(`批量匹配时处理 "${header}" 失败:`, error);
          } finally {
            processed++;
            
            // 更新进度提示
            toast.info(`批量匹配进度: ${processed}/${unmappedHeaders.length}`, {
              id: "batch-matching",
              description: `已完成 ${processed} 个字段的分析`,
              duration: 3000
            });
          }
        }));
      }
      
      // 批量匹配完成提示
      toast.success("批量智能匹配完成", {
        id: "batch-matching",
        description: `已完成 ${processed} 个字段的分析与匹配`,
        duration: 5000
      });
      
    } catch (error) {
      console.error("批量智能匹配失败:", error);
      toast.error("批量智能匹配失败", {
        id: "batch-matching",
        description: error instanceof Error ? error.message : "未知错误",
        duration: 5000
      });
    } finally {
      // 确保所有字段的加载状态都被重置
      setFieldSuggestionsLoading(prev => {
        const newState = { ...prev };
        fileData.headers.forEach(header => {
          newState[header] = false;
        });
        return newState;
      });
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
            
            {/* 🚀 智能分析结果显示 */}
            {fileData && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">智能字段分析</h4>
                  {intelligentAnalysis.isAnalyzing && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                </div>
                
                {intelligentAnalysis.isAnalyzing ? (
                  <p className="text-sm text-blue-700">正在分析CSV表头结构...</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">识别置信度: </span>
                        <Badge variant={intelligentAnalysis.confidence > 0.8 ? "default" : intelligentAnalysis.confidence > 0.5 ? "secondary" : "destructive"}>
                          {(intelligentAnalysis.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">数据格式: </span>
                        <Badge variant={intelligentAnalysis.isWideFormat ? "default" : "secondary"}>
                          {intelligentAnalysis.isWideFormat ? "宽表格(多科目)" : "长表格(单科目)"}
                        </Badge>
                      </div>
                    </div>
                    
                    {intelligentAnalysis.detectedSubjects.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">识别的科目: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {intelligentAnalysis.detectedSubjects.map(subject => (
                            <Badge key={subject} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-700">字段映射: </span>
                      <span className="text-sm text-gray-600">
                        已识别 {intelligentAnalysis.mappingCount}/{fileData.headers.length} 个字段
                      </span>
                    </div>
                    
                    {intelligentAnalysis.issues.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center gap-1 mb-1">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">注意事项:</span>
                        </div>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {intelligentAnalysis.issues.map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {intelligentAnalysis.confidence > 0.8 && intelligentAnalysis.isWideFormat && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            系统已自动识别表格结构，将在导入时自动转换为标准格式
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 2: // 第二步：纯粹的考试信息表单
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[1].name}</h3>
            <p className="text-sm text-gray-600 mb-4">请填写本次考试的基本信息，将用于数据整理和分析</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-md border">
              <div className="space-y-2">
                <label className="text-sm font-medium">考试标题 <span className="text-red-500">*</span></label>
                <Input 
                  type="text" 
                  placeholder="例如：2023学年第一学期期末考试" 
                  value={editableExamInfo?.title || ''}
                  onChange={(e) => setEditableExamInfo(prev => ({...prev!, title: e.target.value}))}
                />
                {editableExamInfo && !editableExamInfo.title && (
                  <p className="text-xs text-red-500">考试标题不能为空</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">考试类型 <span className="text-red-500">*</span></label>
                <Select 
                  value={editableExamInfo?.type || ''}
                  onValueChange={(value) => setEditableExamInfo(prev => ({...prev!, type: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- 请选择考试类型 --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="期中考试">期中考试</SelectItem>
                    <SelectItem value="期末考试">期末考试</SelectItem>
                    <SelectItem value="月考">月考</SelectItem>
                    <SelectItem value="单元测试">单元测试</SelectItem>
                    <SelectItem value="模拟考">模拟考</SelectItem>
                  </SelectContent>
                </Select>
                {editableExamInfo && !editableExamInfo.type && (
                  <p className="text-xs text-red-500">请选择考试类型</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">考试日期 <span className="text-red-500">*</span></label>
                <Input 
                  type="date" 
                  value={editableExamInfo?.date || ''}
                  onChange={(e) => setEditableExamInfo(prev => ({...prev!, date: e.target.value}))}
                />
                {editableExamInfo && !editableExamInfo.date && (
                  <p className="text-xs text-red-500">请选择考试日期</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">考试科目</label>
                <Input 
                  type="text" 
                  placeholder="例如：语文、数学（可选）" 
                  value={editableExamInfo?.subject || ''}
                  onChange={(e) => setEditableExamInfo(prev => ({...prev!, subject: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                填写考试信息有助于系统更好地组织和分析成绩数据。请尽量完整填写考试标题、类型和日期。
                <div className="mt-1 text-xs text-blue-500">如果您不提供科目信息，系统将视为含多科目的综合考试</div>
              </div>
            </div>
            
            {/* 🚀 智能分析结果预览 */}
            {intelligentAnalysis.confidence > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">智能分析完成</h4>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>• 识别置信度: <strong>{(intelligentAnalysis.confidence * 100).toFixed(0)}%</strong></p>
                  {intelligentAnalysis.detectedSubjects.length > 0 && (
                    <p>• 检测到科目: <strong>{intelligentAnalysis.detectedSubjects.join('、')}</strong></p>
                  )}
                  <p>• 数据格式: <strong>{intelligentAnalysis.isWideFormat ? '宽表格(多科目)' : '长表格(单科目)'}</strong></p>
                  {intelligentAnalysis.confidence > 0.8 && (
                    <p className="text-green-600 font-medium">✓ 系统将自动处理字段映射，无需手动配置</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 3: // 智能匹配步骤
        console.log("[Dialog Step 3 Render DEBUG] currentStep:", currentStep);
        console.log("[Dialog Step 3 Render DEBUG] fileData present:", !!fileData);
        if (fileData) {
            console.log("[Dialog Step 3 Render DEBUG] fileData.headers:", JSON.stringify(fileData.headers));
        }
        console.log("[Dialog Step 3 Render DEBUG] isAIParsing:", isAIParsing);
        console.log("[Dialog Step 3 Render DEBUG] userConfirmedMappings:", JSON.stringify(userConfirmedMappings));
        console.log("[Dialog Step 3 Render DEBUG] availableSystemFields (potentially defaulted):", JSON.stringify(effectiveSystemFields));
        console.log("[Dialog Step 3 Render DEBUG] aiParseError:", aiParseError);

        const previewDataStep3 = fileData?.dataRows.slice(0, PREVIEW_ROW_COUNT_STEP_2) || [];
        if (!fileData) return (
            <div className="h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p>等待数据加载以开始智能分析...</p>
            </div>
        );
        
        // 🚀 如果智能分析置信度足够高，直接跳过字段映射
        if (intelligentAnalysis.confidence > 0.8 && autoMappingComplete) {
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[2].name}</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-green-800 mb-2">智能分析完成</h4>
                <p className="text-green-700 mb-4">
                  系统已自动识别您的文件结构并完成字段映射（置信度: {(intelligentAnalysis.confidence * 100).toFixed(0)}%）
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm text-green-600 mb-4">
                  <div>
                    <span className="font-medium">数据格式:</span> {intelligentAnalysis.isWideFormat ? '宽表格(多科目)' : '长表格(单科目)'}
                  </div>
                  <div>
                    <span className="font-medium">识别科目:</span> {intelligentAnalysis.detectedSubjects.join('、')}
                  </div>
                </div>
                <p className="text-xs text-green-600 mb-4">
                  系统将在导入时自动转换数据格式，正在自动跳转到下一步...
                </p>
                
                {/* 添加自动跳转提示 */}
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>3秒后自动进入学生信息处理步骤</span>
                </div>
              </div>
            </div>
          );
        }
        
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
              <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[2].name}</h3>
              <p className="text-sm text-gray-600 mb-4">{UPDATED_STEPS[2].description}</p>
              
              {/* 添加字段映射状态和帮助信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">字段映射说明</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• <strong>必要字段</strong>：至少需要映射"学号"或"姓名"字段</p>
                      <p>• <strong>推荐字段</strong>：班级、总分等字段有助于更好的数据分析</p>
                      <p>• <strong>其他字段</strong>：可以映射为自定义字段，或保持空白忽略</p>
                    </div>
                    {userConfirmedMappings && (
                      <div className="mt-2 text-sm">
                        <span className="text-blue-700">
                          映射状态: {Object.values(userConfirmedMappings).filter(v => v && v.trim() !== '').length} / {Object.keys(userConfirmedMappings).length} 个字段已映射
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <ScrollArea className="h-[35vh] border rounded-md bg-white">
                <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[30%] whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">您的文件表头</TableHead>
                      <TableHead className="w-[45%] whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">匹配到系统信息项</TableHead>
                      <TableHead className="w-[25%] whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {fileData.headers.map((header) => {
                      const currentMappingValue = userConfirmedMappings[header];
                      const creationUIState = customFieldCreationState[header];

                      return (
                        <TableRow key={`row-${header}`} className="hover:bg-gray-50">
                          <TableCell className="py-1.5 px-3 w-[30%]">
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
                                {header}
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell className="py-1.5 px-3 w-[45%]">
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
                          </TableCell>
                          
                          <TableCell className="py-1.5 px-3 text-center w-[25%]">
                            {onSuggestFieldMapping && !isAIParsing && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-8 transition-all ${
                                  fieldSuggestionsLoading[header] 
                                    ? 'animate-pulse text-primary/70 bg-primary/5 border-primary/30' 
                                    : 'hover:text-primary hover:bg-primary/10 hover:border-primary/50 hover:scale-105 hover:shadow-sm'
                                } group relative`}
                                onClick={() => handleSuggestMappingInternal(header)}
                                disabled={fieldSuggestionsLoading[header] || !!customFieldCreationState[header]?.isPromptingName}
                              >
                                {fieldSuggestionsLoading[header] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    <span>分析中...</span>
                                  </>
                                ) : (
                                  <>
                                    <Lightbulb className="h-4 w-4 mr-1 group-hover:text-yellow-500 transition-colors" />
                                    <span>AI智能建议</span>
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/60"></span>
                                    </span>
                                  </>
                                )}
                              </Button>
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
              {previewDataStep3.length > 0 ? (
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
                        {previewDataStep3.map((row, rowIndex) => (
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
            {currentStep === 3 && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  提示: 请为每个文件表头选择匹配到的系统字段
                </div>
                {onSuggestFieldMapping && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="bg-primary/5 hover:bg-primary/10 hover:text-primary group"
                    onClick={handleBatchAIMatching}
                    disabled={isAIParsing || Object.values(fieldSuggestionsLoading).some(loading => loading)}
                  >
                    <Wand2 className="h-4 w-4 mr-1 group-hover:text-purple-500" />
                    <span>AI批量智能匹配</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 4: // Student Information Merge
        return (
          <div className="space-y-4">
            <DialogHeader className="mb-4">
              <DialogTitle>学生信息处理策略</DialogTitle>
              <DialogDescription>
                请选择如何处理新导入的学生信息
              </DialogDescription>
            </DialogHeader>
            
            {/* 添加学生匹配说明 */}
            {studentMatchingDescription}
            
            <div className="mb-6">
              {isCheckingStudents ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p>正在检查学生信息匹配情况...</p>
                </div>
              ) : existingStudentsInfo ? (
                <div className="bg-amber-50 p-4 rounded-md mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">已发现匹配的学生记录</h4>
                      <p className="text-sm text-amber-700">
                        系统检测到您的数据与 <strong>{existingStudentsInfo.count}</strong> 条现有学生记录匹配，
                        请选择如何处理这些重复记录。
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* 学生处理策略选择 */}
              <div className="space-y-4">
                <h4 className="font-medium">新学生处理策略</h4>
                <RadioGroup 
                  value={newStudentStrategy || 'create'} 
                  onValueChange={(value: 'create' | 'ignore') => setNewStudentStrategy(value)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="create" id="strategy-create" />
                    <Label htmlFor="strategy-create">自动创建新学生 - 如找不到匹配学生，则自动创建新学生记录</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ignore" id="strategy-ignore" />
                    <Label htmlFor="strategy-ignore">仅处理已有学生 - 只导入能匹配到系统中已有学生的记录</Label>
                  </div>
                </RadioGroup>
                
                <h4 className="font-medium mt-4">成绩记录合并策略</h4>
                <RadioGroup 
                  value={mergeChoice} 
                  onValueChange={setMergeChoice}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="r1" />
                    <Label htmlFor="r1">智能合并 - 智能处理重复记录，保留最新数据</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="r2" />
                    <Label htmlFor="r2">全部替换 - 删除已有记录，使用新数据</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add_only" id="r3" />
                    <Label htmlFor="r3">仅添加新记录 - 保留已有记录，只添加不存在的记录</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 5: // Final Confirmation and Import
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2">{UPDATED_STEPS[4].name}</h3>
            <p className="text-sm text-gray-600 mb-1">{UPDATED_STEPS[4].description}</p>
            <div className="mt-4 p-4 border rounded-md space-y-2 bg-gray-50">
                <p className="text-sm"><span className="font-semibold">考试标题:</span> {editableExamInfo?.title}</p>
                <p className="text-sm"><span className="font-semibold">考试类型:</span> {editableExamInfo?.type}</p>
                <p className="text-sm"><span className="font-semibold">考试日期:</span> {editableExamInfo?.date}</p>
                <p className="text-sm"><span className="font-semibold">文件名:</span> {fileData?.fileName}</p>
                <p className="text-sm"><span className="font-semibold">总记录数:</span> {fileData?.dataRows.length} 条</p>
                <p className="text-sm"><span className="font-semibold">学生信息处理:</span> 
                    {newStudentStrategy === 'create' ? "自动创建新学生" : "仅处理已有学生"}
                </p>
                <p className="text-sm"><span className="font-semibold">记录合并策略:</span> 
                    {mergeChoice === 'merge' ? "智能合并" : 
                     mergeChoice === 'replace' ? "全部替换" : "仅添加新记录"}
                </p>
                <p className="text-xs text-gray-500 pt-2">字段映射将在后台使用您第三步确认的设置为准。</p>
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

  // 新增：检查智能解析结果并自动设置映射
  useEffect(() => {
    if (isOpen && intelligentParseResult && intelligentParseResult.success) {
      const { metadata } = intelligentParseResult;
      
      console.log('[ImportReviewDialog] 检查智能解析结果:', {
        confidence: metadata.confidence,
        autoProcessed: metadata.autoProcessed,
        mappingsCount: Object.keys(metadata.suggestedMappings).length,
        totalFields: metadata.originalHeaders?.length || fileData?.headers.length
      });
      
      // 如果智能解析标记为可自动处理，直接设置映射并跳过字段映射步骤
      if (metadata.autoProcessed && metadata.confidence >= 0.8) {
        console.log('[ImportReviewDialog] 智能解析置信度高，自动设置映射并跳过字段映射步骤');
        
        setAiSuggestedMappings(metadata.suggestedMappings);
        setUserConfirmedMappings(metadata.suggestedMappings);
        setAutoMappingConfidence('high');
        setAutoMappingComplete(true);
        setAutoMappedFields(Object.values(metadata.suggestedMappings));
        
        // 🚀 更新intelligentAnalysis状态
        setIntelligentAnalysis({
          isAnalyzing: false,
          confidence: metadata.confidence,
          detectedSubjects: metadata.detectedSubjects || [],
          isWideFormat: metadata.detectedStructure === 'wide',
          mappingCount: Object.keys(metadata.suggestedMappings).length,
          issues: []
        });
        
        // 显示成功提示
        toast.success('智能识别完成！', {
          description: `系统已自动识别所有必要字段 (置信度: ${(metadata.confidence * 100).toFixed(0)}%)，将自动跳过字段映射步骤`,
          duration: 3000
        });
        
        // 如果当前在第1步，自动跳转到第2步（考试信息）
        if (currentStep === 1) {
          setTimeout(() => {
            setCurrentStep(2);
          }, 1500);
        }
      } else if (metadata.suggestedMappings && Object.keys(metadata.suggestedMappings).length > 0) {
        // 如果有建议映射但置信度不够高，设置为建议但不自动跳过
        console.log('[ImportReviewDialog] 智能解析提供建议映射，但需要用户确认');
        
        setAiSuggestedMappings(metadata.suggestedMappings);
        setUserConfirmedMappings(metadata.suggestedMappings);
        
        // 🚀 更新intelligentAnalysis状态
        setIntelligentAnalysis({
          isAnalyzing: false,
          confidence: metadata.confidence,
          detectedSubjects: metadata.detectedSubjects || [],
          isWideFormat: metadata.detectedStructure === 'wide',
          mappingCount: Object.keys(metadata.suggestedMappings).length,
          issues: []
        });
        
        const mappedCount = Object.keys(metadata.suggestedMappings).length;
        const totalCount = metadata.originalHeaders?.length || fileData?.headers.length || 0;
        
        if (metadata.confidence >= 0.6) {
          setAutoMappingConfidence('medium');
          toast.info('智能识别部分完成', {
            description: `系统已识别 ${mappedCount}/${totalCount} 个字段，请在第3步检查并确认映射`,
            duration: 4000
          });
        } else {
          setAutoMappingConfidence('low');
          toast.warning('需要您的帮助', {
            description: `系统只识别了 ${mappedCount}/${totalCount} 个字段，请在第3步完成剩余映射`,
            duration: 4000
          });
        }
      }
    }
  }, [isOpen, intelligentParseResult, fileData, currentStep]);

  // 🚀 新增：智能分析完成后的自动跳转逻辑
  useEffect(() => {
    // 只在第3步且智能分析完成时触发自动跳转
    if (currentStep === 3 && intelligentAnalysis.confidence >= 1.0 && autoMappingComplete) {
      console.log('[Dialog] 智能分析100%置信度，准备自动跳转到第4步');
      
      const timer = setTimeout(() => {
        console.log('[Dialog] 执行自动跳转到第4步');
        toast.success('自动跳转', {
          description: '智能识别完成，已自动进入学生信息处理步骤',
          duration: 2000
        });
        setCurrentStep(4);
      }, 3000); // 3秒后自动跳转
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, intelligentAnalysis.confidence, autoMappingComplete]);

  // 🚀 新增：智能分析完成后直接跳过第3步的逻辑
  useEffect(() => {
    // 当智能分析完成且置信度足够高时，直接从第2步跳到第4步
    if (currentStep === 2 && intelligentAnalysis.confidence >= 1.0 && autoMappingComplete && userConfirmedMappings) {
      console.log('[Dialog] 智能分析完成，准备从第2步直接跳转到第4步');
      
      // 检查是否有必要字段映射
      const mappedFields = Object.values(userConfirmedMappings).filter(value => value && value.trim() !== '');
      const hasStudentId = mappedFields.includes('student_id');
      const hasName = mappedFields.includes('name');
      
      if (hasStudentId || hasName) {
        const timer = setTimeout(() => {
          console.log('[Dialog] 执行从第2步直接跳转到第4步');
          toast.success('智能识别完成', {
            description: '系统已自动完成字段映射，直接进入学生信息处理步骤',
            duration: 3000
          });
          setCurrentStep(4);
        }, 2000); // 2秒后自动跳转
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, intelligentAnalysis.confidence, autoMappingComplete, userConfirmedMappings]);

  // 🚀 新增：智能学生匹配分析
  const performStudentMatchingAnalysis = async (fileData: any[]): Promise<ExistingStudentCheckResult> => {
    console.log('[Dialog] 开始执行智能学生匹配分析');
    
    try {
      // 从文件数据中提取学生信息
      const fileStudents = fileData.map(row => {
        const mappedData: any = {};
        
        // 使用确认的字段映射来提取学生信息
        Object.entries(userConfirmedMappings || {}).forEach(([originalField, mappedField]) => {
          if (row[originalField] !== undefined) {
            mappedData[mappedField] = row[originalField];
          }
        });
        
        return {
          name: mappedData.name || '',
          student_id: mappedData.student_id || '',
          class_name: mappedData.class_name || ''
        };
      }).filter(student => student.name); // 过滤掉没有姓名的记录
      
      console.log('[Dialog] 文件中提取的学生信息:', fileStudents);
      
      // 获取系统中的所有学生
      const { data: systemStudents, error } = await supabase
        .from('students')
        .select('id, name, student_id, class_name')
        .order('name');
      
      if (error) {
        console.error('[Dialog] 获取系统学生失败:', error);
        throw error;
      }
      
      console.log('[Dialog] 系统中的学生数量:', systemStudents?.length || 0);
      
      // 执行智能匹配分析
      const exactMatches: any[] = [];
      const fuzzyMatches: any[] = [];
      const newStudents: any[] = [];
      const systemStudentsNotInFile: any[] = [];
      
      // 创建系统学生的映射表
      const systemStudentsByName = new Map();
      const systemStudentsById = new Map();
      
      (systemStudents || []).forEach(student => {
        systemStudentsByName.set(student.name.toLowerCase(), student);
        if (student.student_id) {
          systemStudentsById.set(student.student_id, student);
        }
      });
      
      // 分析每个文件中的学生
      fileStudents.forEach(fileStudent => {
        let matched = false;
        
        // 1. 精确学号匹配
        if (fileStudent.student_id && systemStudentsById.has(fileStudent.student_id)) {
          const systemStudent = systemStudentsById.get(fileStudent.student_id);
          exactMatches.push({
            fileStudent,
            systemStudent,
            matchType: 'exact_id'
          });
          matched = true;
        }
        // 2. 精确姓名匹配
        else if (systemStudentsByName.has(fileStudent.name.toLowerCase())) {
          const systemStudent = systemStudentsByName.get(fileStudent.name.toLowerCase());
          exactMatches.push({
            fileStudent,
            systemStudent,
            matchType: 'exact_name'
          });
          matched = true;
        }
        // 3. 模糊匹配
        else {
          const possibleMatches: any[] = [];
          
          (systemStudents || []).forEach(systemStudent => {
            // 计算姓名相似度（简单的编辑距离）
            const similarity = calculateNameSimilarity(fileStudent.name, systemStudent.name);
            
            if (similarity >= 0.6) { // 相似度阈值
              let matchReason = '';
              if (similarity >= 0.9) {
                matchReason = '姓名高度相似';
              } else if (similarity >= 0.7) {
                matchReason = '姓名中等相似';
              } else {
                matchReason = '姓名部分相似';
              }
              
              // 如果班级信息匹配，提高相似度
              if (fileStudent.class_name && systemStudent.class_name && 
                  fileStudent.class_name === systemStudent.class_name) {
                matchReason += '，班级匹配';
                // 可以适当提高相似度
              }
              
              possibleMatches.push({
                systemStudent,
                similarity,
                matchReason
              });
            }
          });
          
          if (possibleMatches.length > 0) {
            // 按相似度排序
            possibleMatches.sort((a, b) => b.similarity - a.similarity);
            
            fuzzyMatches.push({
              fileStudent,
              possibleMatches: possibleMatches.slice(0, 3) // 最多显示3个可能匹配
            });
            matched = true;
          }
        }
        
        // 如果没有匹配到，标记为新学生
        if (!matched) {
          newStudents.push(fileStudent);
        }
      });
      
      // 找出系统中存在但文件中没有的学生
      const fileStudentNames = new Set(fileStudents.map(s => s.name.toLowerCase()));
      const fileStudentIds = new Set(fileStudents.map(s => s.student_id).filter(Boolean));
      
      (systemStudents || []).forEach(systemStudent => {
        const nameMatch = fileStudentNames.has(systemStudent.name.toLowerCase());
        const idMatch = systemStudent.student_id && fileStudentIds.has(systemStudent.student_id);
        
        if (!nameMatch && !idMatch) {
          systemStudentsNotInFile.push(systemStudent);
        }
      });
      
      const result: ExistingStudentCheckResult = {
        count: exactMatches.length,
        totalStudentsInFile: fileStudents.length,
        exactMatches,
        fuzzyMatches,
        newStudents,
        systemStudentsNotInFile
      };
      
      console.log('[Dialog] 学生匹配分析结果:', result);
      return result;
      
    } catch (error) {
      console.error('[Dialog] 学生匹配分析失败:', error);
      
      // 返回默认结果
      return {
        count: 0,
        totalStudentsInFile: fileData.length,
        exactMatches: [],
        fuzzyMatches: [],
        newStudents: [],
        systemStudentsNotInFile: []
      };
    }
  };
  
  // 🚀 新增：计算姓名相似度（简单的编辑距离算法）
  const calculateNameSimilarity = (name1: string, name2: string): number => {
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    // 计算编辑距离
    const matrix = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // 删除
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j - 1] + 1  // 替换
          );
        }
      }
    }
    
    const editDistance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    
    // 转换为相似度（0-1之间）
    return maxLength === 0 ? 1.0 : 1 - (editDistance / maxLength);
  };

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
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={
                currentStep <= 1 || 
                isAIParsing || 
                isCheckingStudents || 
                isImporting ||
                (currentStep === 3 && isAIParsing) // 只在第3步AI解析时禁用
              }
            >
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
                    (currentStep === 2 && (!editableExamInfo?.title || !editableExamInfo?.type || !editableExamInfo?.date)) ||
                    (currentStep === 3 && (isAIParsing || isCheckingStudents || Object.values(customFieldCreationState).some(s => s.isPromptingName || s.isLoading) || Object.values(fieldSuggestionsLoading).some(loading => loading))) || 
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
      
      {/* 字段询问对话框 */}
      <FieldInquiryDialog
        isOpen={showFieldInquiry}
        onOpenChange={setShowFieldInquiry}
        unknownFields={unknownFields}
        context={fieldInquiryContext}
        onComplete={handleFieldInquiryComplete}
        onCancel={() => {
          setShowFieldInquiry(false);
          toast.info("已取消字段询问", {
            description: "将使用默认的字段映射界面"
          });
        }}
      />
    </Dialog>
  );
};

export default ImportReviewDialog; 