import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  FileDataForReview, 
  ExamInfo, 
  MappingConfig, 
  ValidationResult, 
  ImportResult, 
  ImportProgress,
  ImportOptions,
  ImportStep 
} from '../types';
import { parseExcelFile, parseCSVFile } from '@/services/fileParsingService';
import { analyzeCSVHeaders, generateMappingSuggestions } from '@/services/intelligentFieldMapper';
import { enhancedStudentMatcher } from '@/services/enhancedStudentMatcher';

// Hook状态接口
export interface GradeImporterState {
  // 步骤状态
  currentStep: ImportStep;
  stepsCompleted: ImportStep[];
  
  // 文件处理
  selectedFile: File | null;
  fileData: FileDataForReview[];
  parseProgress: number;
  parseError: string | null;
  
  // 字段映射
  mappingConfig: MappingConfig | null;
  mappingSuggestions: any;
  mappingProgress: number;
  mappingError: string | null;
  
  // 数据验证
  validationResult: ValidationResult | null;
  validData: any[];
  validationProgress: number;
  validationError: string | null;
  
  // 导入处理
  importResult: ImportResult | null;
  importProgress: ImportProgress;
  importError: string | null;
  
  // 考试信息
  examInfo: ExamInfo | null;
  
  // 配置选项
  importOptions: ImportOptions;
  
  // 通用状态
  loading: boolean;
  error: string | null;
}

// Hook返回类型
export interface GradeImporterHook {
  state: GradeImporterState;
  actions: {
    // 步骤控制
    setCurrentStep: (step: ImportStep) => void;
    nextStep: () => void;
    previousStep: () => void;
    resetImport: () => void;
    
    // 文件处理
    uploadFile: (file: File) => Promise<void>;
    clearFile: () => void;
    
    // 字段映射
    setMappingConfig: (config: MappingConfig) => void;
    generateMapping: () => Promise<void>;
    validateMapping: () => boolean;
    
    // 数据验证
    validateData: () => Promise<void>;
    
    // 导入处理
    startImport: () => Promise<void>;
    pauseImport: () => void;
    resumeImport: () => void;
    cancelImport: () => void;
    
    // 考试信息
    setExamInfo: (info: ExamInfo) => void;
    
    // 配置管理
    setImportOptions: (options: ImportOptions) => void;
    loadConfigTemplate: (templateId: string) => void;
    saveConfigTemplate: (name: string, description: string) => void;
    
    // 错误处理
    clearError: () => void;
    setError: (error: string) => void;
  };
}

// 默认导入选项
const defaultImportOptions: ImportOptions = {
  batchSize: 50,
  createMissingStudents: true,
  updateExistingData: false,
  skipDuplicates: true,
  enableBackup: true,
  enableRollback: true,
  parallelImport: false,
  strictMode: false,
  validateDuplicates: true,
  validateStudentMatch: true,
  requireScores: false,
  maxErrors: 100
};

// 默认导入进度
const defaultImportProgress: ImportProgress = {
  total: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  percentage: 0,
  currentBatch: 0,
  totalBatches: 0,
  status: 'pending',
  startTime: null,
  endTime: null,
  errors: [],
  warnings: []
};

export const useGradeImporter = (): GradeImporterHook => {
  // 状态管理
  const [state, setState] = useState<GradeImporterState>({
    currentStep: 'upload',
    stepsCompleted: [],
    selectedFile: null,
    fileData: [],
    parseProgress: 0,
    parseError: null,
    mappingConfig: null,
    mappingSuggestions: null,
    mappingProgress: 0,
    mappingError: null,
    validationResult: null,
    validData: [],
    validationProgress: 0,
    validationError: null,
    importResult: null,
    importProgress: defaultImportProgress,
    importError: null,
    examInfo: null,
    importOptions: defaultImportOptions,
    loading: false,
    error: null
  });

  // 导入控制引用
  const abortControllerRef = useRef<AbortController | null>(null);
  const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 步骤序列
  const stepSequence: ImportStep[] = ['upload', 'mapping', 'validation', 'import', 'complete'];

  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<GradeImporterState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 步骤控制
  const setCurrentStep = useCallback((step: ImportStep) => {
    updateState({ currentStep: step });
  }, [updateState]);

  const nextStep = useCallback(() => {
    const currentIndex = stepSequence.indexOf(state.currentStep);
    if (currentIndex < stepSequence.length - 1) {
      const nextStep = stepSequence[currentIndex + 1];
      updateState({
        currentStep: nextStep,
        stepsCompleted: [...state.stepsCompleted, state.currentStep]
      });
    }
  }, [state.currentStep, state.stepsCompleted, updateState]);

  const previousStep = useCallback(() => {
    const currentIndex = stepSequence.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const previousStep = stepSequence[currentIndex - 1];
      updateState({
        currentStep: previousStep,
        stepsCompleted: state.stepsCompleted.filter(step => step !== state.currentStep)
      });
    }
  }, [state.currentStep, state.stepsCompleted, updateState]);

  const resetImport = useCallback(() => {
    // 取消正在进行的操作
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (importTimeoutRef.current) {
      clearTimeout(importTimeoutRef.current);
    }

    setState({
      currentStep: 'upload',
      stepsCompleted: [],
      selectedFile: null,
      fileData: [],
      parseProgress: 0,
      parseError: null,
      mappingConfig: null,
      mappingSuggestions: null,
      mappingProgress: 0,
      mappingError: null,
      validationResult: null,
      validData: [],
      validationProgress: 0,
      validationError: null,
      importResult: null,
      importProgress: defaultImportProgress,
      importError: null,
      examInfo: null,
      importOptions: defaultImportOptions,
      loading: false,
      error: null
    });

    toast.info('导入已重置');
  }, []);

  // 文件处理
  const uploadFile = useCallback(async (file: File) => {
    updateState({ loading: true, parseError: null, parseProgress: 0 });

    try {
      let data: any[];
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await parseExcelFile(file, (progress) => {
          updateState({ parseProgress: progress });
        });
      } else if (file.name.endsWith('.csv')) {
        data = await parseCSVFile(file, (progress) => {
          updateState({ parseProgress: progress });
        });
      } else {
        throw new Error('不支持的文件格式，请上传 Excel 或 CSV 文件');
      }

      if (data.length === 0) {
        throw new Error('文件中没有发现有效数据');
      }

      updateState({
        selectedFile: file,
        fileData: data,
        parseProgress: 100,
        loading: false
      });

      toast.success(`文件解析完成，共发现 ${data.length} 条记录`);

    } catch (error) {
      console.error('文件解析失败:', error);
      const errorMessage = error instanceof Error ? error.message : '文件解析失败';
      updateState({
        parseError: errorMessage,
        loading: false
      });
      toast.error(errorMessage);
    }
  }, [updateState]);

  const clearFile = useCallback(() => {
    updateState({
      selectedFile: null,
      fileData: [],
      parseProgress: 0,
      parseError: null,
      mappingConfig: null,
      mappingSuggestions: null
    });
  }, [updateState]);

  // 字段映射
  const setMappingConfig = useCallback((config: MappingConfig) => {
    updateState({ mappingConfig: config });
  }, [updateState]);

  const generateMapping = useCallback(async () => {
    if (state.fileData.length === 0) {
      toast.error('请先上传文件');
      return;
    }

    updateState({ loading: true, mappingProgress: 0, mappingError: null });

    try {
      // 分析文件头部
      const headers = Object.keys(state.fileData[0]);
      const analysisResult = await analyzeCSVHeaders(headers, state.fileData.slice(0, 5));
      
      updateState({ mappingProgress: 50 });

      // 生成映射建议
      const suggestions = await generateMappingSuggestions(analysisResult);
      
      updateState({
        mappingSuggestions: suggestions,
        mappingProgress: 100,
        loading: false
      });

      toast.success('字段映射分析完成');

    } catch (error) {
      console.error('字段映射生成失败:', error);
      const errorMessage = error instanceof Error ? error.message : '字段映射生成失败';
      updateState({
        mappingError: errorMessage,
        loading: false
      });
      toast.error(errorMessage);
    }
  }, [state.fileData, updateState]);

  const validateMapping = useCallback(() => {
    if (!state.mappingConfig) {
      toast.error('请先配置字段映射');
      return false;
    }

    const requiredFields = ['student_id', 'name', 'class_name'];
    const mappedFields = Object.values(state.mappingConfig.fieldMappings || {});
    
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingFields.length > 0) {
      toast.error(`缺少必需字段映射: ${missingFields.join(', ')}`);
      return false;
    }

    return true;
  }, [state.mappingConfig]);

  // 数据验证
  const validateData = useCallback(async () => {
    if (!validateMapping()) {
      return;
    }

    updateState({ loading: true, validationProgress: 0, validationError: null });

    try {
      // 执行数据验证逻辑
      // 这里应该调用 DataValidator 的验证逻辑
      // 暂时用模拟数据
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        summary: {
          totalRows: state.fileData.length,
          validRows: state.fileData.length,
          errorRows: 0,
          warningRows: 0
        }
      };

      updateState({
        validationResult: mockValidationResult,
        validData: state.fileData,
        validationProgress: 100,
        loading: false
      });

      toast.success('数据验证完成');

    } catch (error) {
      console.error('数据验证失败:', error);
      const errorMessage = error instanceof Error ? error.message : '数据验证失败';
      updateState({
        validationError: errorMessage,
        loading: false
      });
      toast.error(errorMessage);
    }
  }, [state.fileData, state.mappingConfig, validateMapping, updateState]);

  // 导入处理
  const startImport = useCallback(async () => {
    if (!state.validationResult?.isValid) {
      toast.error('请先完成数据验证');
      return;
    }

    if (!state.examInfo) {
      toast.error('请先设置考试信息');
      return;
    }

    updateState({
      loading: true,
      importProgress: {
        ...defaultImportProgress,
        total: state.validData.length,
        status: 'importing',
        startTime: new Date()
      }
    });

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 执行导入逻辑
      // 这里应该调用 ImportProcessor 的导入逻辑
      // 暂时用模拟结果
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟导入时间

      const mockImportResult: ImportResult = {
        success: true,
        examId: 'mock_exam_id',
        successCount: state.validData.length,
        failedCount: 0,
        totalCount: state.validData.length,
        errors: [],
        warnings: [],
        processedIds: state.validData.map((_, index) => `student_${index}`),
        duration: 2000
      };

      updateState({
        importResult: mockImportResult,
        importProgress: {
          ...state.importProgress,
          status: 'completed',
          processed: state.validData.length,
          successful: state.validData.length,
          percentage: 100,
          endTime: new Date()
        },
        loading: false,
        currentStep: 'complete'
      });

      toast.success('数据导入完成');

    } catch (error) {
      console.error('数据导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '数据导入失败';
      updateState({
        importError: errorMessage,
        importProgress: {
          ...state.importProgress,
          status: 'failed',
          endTime: new Date()
        },
        loading: false
      });
      toast.error(errorMessage);
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.validationResult, state.examInfo, state.validData, state.importProgress, updateState]);

  const pauseImport = useCallback(() => {
    updateState({
      importProgress: {
        ...state.importProgress,
        status: 'paused'
      }
    });
    toast.info('导入已暂停');
  }, [state.importProgress, updateState]);

  const resumeImport = useCallback(() => {
    updateState({
      importProgress: {
        ...state.importProgress,
        status: 'importing'
      }
    });
    toast.info('导入已恢复');
  }, [state.importProgress, updateState]);

  const cancelImport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    updateState({
      importProgress: {
        ...state.importProgress,
        status: 'cancelled',
        endTime: new Date()
      },
      loading: false
    });
    toast.warning('导入已取消');
  }, [state.importProgress, updateState]);

  // 考试信息
  const setExamInfo = useCallback((info: ExamInfo) => {
    updateState({ examInfo: info });
  }, [updateState]);

  // 配置管理
  const setImportOptions = useCallback((options: ImportOptions) => {
    updateState({ importOptions: options });
  }, [updateState]);

  const loadConfigTemplate = useCallback((templateId: string) => {
    // 从本地存储或API加载配置模板
    const templates = localStorage.getItem('gradeImporter_configTemplates');
    if (templates) {
      try {
        const parsed = JSON.parse(templates);
        const template = parsed.find((t: any) => t.id === templateId);
        if (template) {
          updateState({ importOptions: template.config });
          toast.success('配置模板加载成功');
        }
      } catch (error) {
        toast.error('配置模板加载失败');
      }
    }
  }, [updateState]);

  const saveConfigTemplate = useCallback((name: string, description: string) => {
    // 保存当前配置为模板
    const template = {
      id: `template_${Date.now()}`,
      name,
      description,
      config: state.importOptions,
      mappingConfig: state.mappingConfig,
      examInfo: state.examInfo,
      createdAt: new Date().toISOString(),
      isDefault: false,
      isFavorite: false,
      tags: [],
      usage: 0
    };

    const existingTemplates = localStorage.getItem('gradeImporter_configTemplates');
    const templates = existingTemplates ? JSON.parse(existingTemplates) : [];
    templates.push(template);
    localStorage.setItem('gradeImporter_configTemplates', JSON.stringify(templates));

    toast.success('配置模板保存成功');
  }, [state.importOptions, state.mappingConfig, state.examInfo]);

  // 错误处理
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const setError = useCallback((error: string) => {
    updateState({ error });
  }, [updateState]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (importTimeoutRef.current) {
        clearTimeout(importTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    actions: {
      setCurrentStep,
      nextStep,
      previousStep,
      resetImport,
      uploadFile,
      clearFile,
      setMappingConfig,
      generateMapping,
      validateMapping,
      validateData,
      startImport,
      pauseImport,
      resumeImport,
      cancelImport,
      setExamInfo,
      setImportOptions,
      loadConfigTemplate,
      saveConfigTemplate,
      clearError,
      setError
    }
  };
}; 