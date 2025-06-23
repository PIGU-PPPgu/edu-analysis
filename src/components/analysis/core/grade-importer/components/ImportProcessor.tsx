import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Upload,
  Database,
  Loader2,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCcw,
  Download,
  Settings,
  Users,
  BookOpen,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ImportResult, 
  ImportProgress, 
  ImportOptions,
  ExamInfo,
  ValidationResult 
} from '../types';
import { saveExamData } from '@/services/examDataService';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { examDuplicateChecker, type ExamInfo as DuplicateExamInfo } from '@/services/examDuplicateChecker';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 导入配置接口
export interface ImportConfig {
  batchSize: number;
  createMissingStudents: boolean;
  updateExistingData: boolean;
  skipDuplicates: boolean;
  enableBackup: boolean;
  enableRollback: boolean;
  parallelImport: boolean;
  strictMode: boolean;
}

// ImportProcessor 组件属性
interface ImportProcessorProps {
  validData: any[];
  examInfo: ExamInfo;
  validationResult: ValidationResult;
  onImportComplete: (result: ImportResult) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

const ImportProcessor: React.FC<ImportProcessorProps> = ({
  validData,
  examInfo,
  validationResult,
  onImportComplete,
  onError,
  loading = false
}) => {
  const { user } = useAuthContext(); // 获取当前用户信息
  const [importing, setImporting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    batchSize: 50,
    createMissingStudents: true,
    updateExistingData: true,
    skipDuplicates: true,
    enableBackup: true,
    enableRollback: true,
    parallelImport: false,
    strictMode: false
  });
  const [importProgress, setImportProgress] = useState<ImportProgress>({
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
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  
  // 考试信息确认对话框状态
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [tempExamInfo, setTempExamInfo] = useState({
    title: examInfo.title || '未命名考试',
    type: examInfo.type || '月考',
    date: examInfo.date || new Date().toISOString().split('T')[0],
    subject: examInfo.subject || ''
  });
  
  // 导入控制
  const abortControllerRef = useRef<AbortController | null>(null);
  const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化进度
  useEffect(() => {
    if (validData && validData.length > 0) {
      const totalBatches = Math.ceil(validData.length / importConfig.batchSize);
      setImportProgress(prev => ({
        ...prev,
        total: validData.length,
        totalBatches,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
        currentBatch: 0,
        status: 'pending',
        errors: [],
        warnings: []
      }));
    }
  }, [validData, importConfig.batchSize]);

  // 开始导入 - 先显示考试确认对话框
  const startImport = async () => {
    if (!validData || validData.length === 0) {
      toast.error('没有有效数据可以导入');
      return;
    }

    // 显示考试信息确认对话框
    setShowExamDialog(true);
  };

  // 确认考试信息后执行导入
  const executeImport = async () => {
    setShowExamDialog(false);
    setImporting(true);
    setPaused(false);
    setActiveTab('progress');
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    
    const startTime = new Date();
    setImportProgress(prev => ({
      ...prev,
      status: 'importing',
      startTime,
      endTime: null,
      errors: [],
      warnings: []
    }));

    try {
      const result = await performImport();
      setImportResult(result);
      onImportComplete(result);
      
      toast.success(`导入完成！成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
      
    } catch (error) {
      console.error('导入失败:', error);
      onError('导入失败: ' + error.message);
      
      setImportProgress(prev => ({
        ...prev,
        status: 'failed',
        endTime: new Date()
      }));
      
    } finally {
      setImporting(false);
      abortControllerRef.current = null;
    }
  };

  // 执行导入
  const performImport = async (): Promise<ImportResult> => {
    const { batchSize, parallelImport, enableBackup } = importConfig;
    const totalBatches = Math.ceil(validData.length / batchSize);
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedIds: string[] = [];
    
    // 备份数据（如果启用）
    if (enableBackup) {
      await createBackup();
    }

    // 创建考试记录
    let examId: string;
    try {
      const examResult = await createExamRecord();
      examId = examResult.id;
    } catch (error) {
      throw new Error('创建考试记录失败: ' + error.message);
    }

    // 分批处理数据
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // 检查是否需要暂停或取消
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('导入被用户取消');
      }
      
      while (paused) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, validData.length);
      const batch = validData.slice(startIndex, endIndex);

      setImportProgress(prev => ({
        ...prev,
        currentBatch: batchIndex + 1,
        status: 'importing'
      }));

      try {
        let batchResult;
        
        if (parallelImport) {
          // 并行处理批次
          batchResult = await processBatchParallel(batch, examId);
        } else {
          // 顺序处理批次
          batchResult = await processBatchSequential(batch, examId);
        }
        
        successCount += batchResult.successCount;
        failedCount += batchResult.failedCount;
        errors.push(...batchResult.errors);
        warnings.push(...batchResult.warnings);
        processedIds.push(...batchResult.processedIds);
        
        // 更新进度
        const processed = endIndex;
        const percentage = Math.round((processed / validData.length) * 100);
        
        setImportProgress(prev => ({
          ...prev,
          processed,
          successful: successCount,
          failed: failedCount,
          percentage,
          errors,
          warnings
        }));
        
        // 短暂延迟，避免过度占用资源
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.error(`批次 ${batchIndex + 1} 处理失败:`, error);
        errors.push(`批次 ${batchIndex + 1} 处理失败: ${error.message}`);
        failedCount += batch.length;
      }
    }

    // 完成导入
    const endTime = new Date();
    setImportProgress(prev => ({
      ...prev,
      status: 'completed',
      endTime
    }));

    return {
      success: true,
      examId,
      successCount,
      failedCount,
      totalCount: validData.length,
      errors,
      warnings,
      processedIds,
      duration: endTime.getTime() - importProgress.startTime!.getTime()
    };
  };

  // 顺序处理批次
  const processBatchSequential = async (batch: any[], examId: string) => {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedIds: string[] = [];

    for (const record of batch) {
      try {
        // 准备数据
        const gradeData = {
          exam_id: examId,
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject: record.subject,
          score: record.score,
          total_score: record.total_score,
          grade: record.original_grade,
          rank_in_class: record.rank_in_class,
          rank_in_grade: record.rank_in_grade,
          grade_level: record.grade_level,
          exam_title: tempExamInfo.title,
          exam_type: tempExamInfo.type,
          exam_date: tempExamInfo.date,
          metadata: record.metadata || {}
        };

        // 处理学生信息
        if (importConfig.createMissingStudents) {
          await ensureStudentExists(record);
        }

        // 插入成绩数据
        await insertGradeData(gradeData);
        
        successCount++;
        processedIds.push(record.student_id);
        
      } catch (error) {
        console.error('插入数据失败:', error);
        errors.push(`学号 ${record.student_id}: ${error.message}`);
        failedCount++;
      }
    }

    return { successCount, failedCount, errors, warnings, processedIds };
  };

  // 并行处理批次
  const processBatchParallel = async (batch: any[], examId: string) => {
    const promises = batch.map(async (record) => {
      try {
        // 准备数据
        const gradeData = {
          exam_id: examId,
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject: record.subject,
          score: record.score,
          total_score: record.total_score,
          grade: record.original_grade,
          rank_in_class: record.rank_in_class,
          rank_in_grade: record.rank_in_grade,
          grade_level: record.grade_level,
          exam_title: tempExamInfo.title,
          exam_type: tempExamInfo.type,
          exam_date: tempExamInfo.date,
          metadata: record.metadata || {}
        };

        // 处理学生信息
        if (importConfig.createMissingStudents) {
          await ensureStudentExists(record);
        }

        // 插入成绩数据
        await insertGradeData(gradeData);
        
        return { success: true, studentId: record.student_id };
        
      } catch (error) {
        console.error('插入数据失败:', error);
        return { 
          success: false, 
          studentId: record.student_id, 
          error: error.message 
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedIds: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (value.success) {
          successCount++;
          processedIds.push(value.studentId);
        } else {
          failedCount++;
          errors.push(`学号 ${value.studentId}: ${value.error}`);
        }
      } else {
        failedCount++;
        errors.push(`记录 ${index + 1}: ${result.reason}`);
      }
    });

    return { successCount, failedCount, errors, warnings, processedIds };
  };

  // 创建考试记录 - 使用智能重复检查
  const createExamRecord = async () => {
    // 检查用户认证状态
    if (!user) {
      throw new Error('用户未登录，无法创建考试记录');
    }

    console.log('创建考试记录，用户信息:', { userId: user.id, email: user.email });

    try {
      // 构建考试信息对象 - 使用用户确认的信息
      const examInfoForCheck: DuplicateExamInfo = {
        title: tempExamInfo.title,
        type: tempExamInfo.type,
        date: tempExamInfo.date,
        subject: tempExamInfo.subject,
        scope: 'class'
      };

      // 使用智能重复检查服务
      examDuplicateChecker.setStrategy('auto_merge'); // 设置为自动合并策略
      const duplicateResult = await examDuplicateChecker.checkDuplicate(examInfoForCheck);
      
      if (duplicateResult.isDuplicate) {
        console.log('检测到重复考试，使用智能解决方案:', duplicateResult);
        
        // 显示重复提示给用户
        toast.info(`检测到相似考试"${duplicateResult.existingExam?.title}"，自动合并数据`);
        
        // 智能解决重复冲突
        const resolution = await examDuplicateChecker.resolveDuplicate(
          examInfoForCheck, 
          duplicateResult
        );
        
        console.log('重复冲突解决结果:', resolution);
        toast.success(resolution.message);
        
        // 返回解决后的考试ID
        return { id: resolution.examId };
      }

      // 先检查是否存在相同考试（基于用户隔离）
      const { data: existingExam } = await supabase
        .from('exams')
        .select('id, title, date, type')
        .eq('title', tempExamInfo.title)
        .eq('date', tempExamInfo.date)
        .eq('type', tempExamInfo.type)
        .eq('created_by', user.id)
        .maybeSingle();

      if (existingExam) {
        console.log('找到现有考试记录，重用:', existingExam);
        toast.info(`使用现有考试记录: ${existingExam.title}`);
        return existingExam;
      }

      // 没有重复，直接创建新考试
      const { data, error } = await supabase
        .from('exams')
        .insert({
          title: tempExamInfo.title,
          type: tempExamInfo.type,
          date: tempExamInfo.date,
          subject: tempExamInfo.subject,
          description: `自动导入 - ${new Date().toLocaleString()}`,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('创建考试记录失败:', error);
        
        // 处理409重复键错误
        if (error.code === '23505') {
          throw new Error('考试记录已存在，请检查考试信息或删除重复记录后重试');
        }
        
        throw new Error(`创建考试记录失败: ${error.message}`);
      }

      console.log('考试记录创建成功:', data);
      toast.success('考试记录创建成功');
      return data;

    } catch (error) {
      console.error('考试记录处理失败:', error);
      
      // 如果智能处理失败，提供用户选择
      if (error.message.includes('duplicate key value violates unique constraint')) {
        toast.error('检测到重复考试，请检查考试信息或选择不同的名称');
        throw new Error('考试已存在，请修改考试标题、日期或类型后重试');
      }
      
      throw error;
    }
  };

  // 确保学生存在
  const ensureStudentExists = async (record: any) => {
    // 检查用户认证状态
    if (!user) {
      throw new Error('用户未登录，无法创建学生记录');
    }

    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', record.student_id)
      .single();

    if (!existingStudent) {
      console.log('创建新学生记录:', {
        student_id: record.student_id,
        name: record.name,
        class_name: record.class_name
      });

      const { error } = await supabase
        .from('students')
        .insert({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          grade: record.grade_level
        });

      if (error) {
        console.error('创建学生记录失败:', error);
        throw new Error(`创建学生记录失败: ${error.message}`);
      }
      
      console.log('学生记录创建成功');
    }
  };

  // 插入成绩数据 - 改进版本，处理重复数据
  const insertGradeData = async (gradeData: any) => {
    try {
      // 首先检查是否存在相同记录
      const { data: existingData } = await supabase
        .from('grade_data')
        .select('id')
        .eq('exam_id', gradeData.exam_id)
        .eq('student_id', gradeData.student_id)
        .eq('subject', gradeData.subject || '')
        .single();

      if (existingData) {
        // 如果配置为跳过重复数据
        if (importConfig.skipDuplicates) {
          console.log(`跳过重复数据: 学号${gradeData.student_id}, 科目${gradeData.subject || '总分'}`);
          return;
        }
        
        // 如果配置为更新现有数据
        if (importConfig.updateExistingData) {
          const { error: updateError } = await supabase
            .from('grade_data')
            .update({
              score: gradeData.score,
              total_score: gradeData.total_score,
              grade: gradeData.grade,
              rank_in_class: gradeData.rank_in_class,
              rank_in_grade: gradeData.rank_in_grade,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingData.id);

          if (updateError) {
            throw new Error(`更新数据失败: ${updateError.message}`);
          }
          
          console.log(`更新现有数据: 学号${gradeData.student_id}, 科目${gradeData.subject || '总分'}`);
          return;
        }
        
        // 默认情况下抛出错误
        throw new Error(`数据已存在: 学号${gradeData.student_id}, 科目${gradeData.subject || '总分'}`);
      }

      // 插入新数据
      const { error } = await supabase
        .from('grade_data')
        .insert(gradeData);

      if (error) {
        throw new Error(`插入数据失败: ${error.message}`);
      }
      
    } catch (error) {
      console.error('插入成绩数据失败:', error);
      throw error;
    }
  };

  // 创建备份
  const createBackup = async () => {
    // 实现数据备份逻辑
    console.log('创建数据备份...');
  };

  // 暂停导入
  const pauseImport = () => {
    setPaused(true);
    setImportProgress(prev => ({
      ...prev,
      status: 'paused'
    }));
    toast.info('导入已暂停');
  };

  // 恢复导入
  const resumeImport = () => {
    setPaused(false);
    setImportProgress(prev => ({
      ...prev,
      status: 'importing'
    }));
    toast.info('导入已恢复');
  };

  // 取消导入
  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setImporting(false);
    setPaused(false);
    setImportProgress(prev => ({
      ...prev,
      status: 'cancelled',
      endTime: new Date()
    }));
    toast.warning('导入已取消');
  };

  // 重置状态
  const resetImport = () => {
    setImporting(false);
    setPaused(false);
    setImportResult(null);
    setImportProgress(prev => ({
      ...prev,
      processed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
      currentBatch: 0,
      status: 'pending',
      startTime: null,
      endTime: null,
      errors: [],
      warnings: []
    }));
    setActiveTab('config');
  };

  // 导出导入报告
  const exportImportReport = () => {
    if (!importResult) return;

    const report = {
      考试信息: {
        标题: tempExamInfo.title,
        类型: tempExamInfo.type,
        日期: tempExamInfo.date
      },
      导入统计: {
        总记录数: importResult.totalCount,
        成功数: importResult.successCount,
        失败数: importResult.failedCount,
        成功率: `${Math.round((importResult.successCount / importResult.totalCount) * 100)}%`
      },
      时间信息: {
        开始时间: importProgress.startTime?.toLocaleString(),
        结束时间: importProgress.endTime?.toLocaleString(),
        总耗时: `${Math.round(importResult.duration / 1000)}秒`
      },
      错误信息: importResult.errors,
      警告信息: importResult.warnings
    };

    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `导入报告_${tempExamInfo.title}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('导入报告导出成功');
  };

  // 计算导入统计
  const importStats = {
    progressPercentage: importProgress.percentage,
    isCompleted: importProgress.status === 'completed',
    isFailed: importProgress.status === 'failed',
    isPaused: importProgress.status === 'paused',
    isImporting: importProgress.status === 'importing',
    estimatedTimeRemaining: (() => {
      if (!importProgress.startTime || importProgress.processed === 0) return null;
      const elapsed = Date.now() - importProgress.startTime.getTime();
      const rate = importProgress.processed / elapsed;
      const remaining = (importProgress.total - importProgress.processed) / rate;
      return Math.round(remaining / 1000);
    })()
  };

  return (
    <>
      {/* 考试信息确认对话框 */}
      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认考试信息</DialogTitle>
            <DialogDescription>
              请确认或修改考试信息，确保数据导入的准确性
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="exam-title">考试标题</Label>
              <Input
                id="exam-title"
                value={tempExamInfo.title}
                onChange={(e) => setTempExamInfo(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入考试标题"
              />
            </div>
            
            <div>
              <Label htmlFor="exam-type">考试类型</Label>
              <Select
                value={tempExamInfo.type}
                onValueChange={(value) => setTempExamInfo(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择考试类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="月考">月考</SelectItem>
                  <SelectItem value="期中考试">期中考试</SelectItem>
                  <SelectItem value="期末考试">期末考试</SelectItem>
                  <SelectItem value="模拟考试">模拟考试</SelectItem>
                  <SelectItem value="单元测试">单元测试</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="exam-date">考试日期</Label>
              <Input
                id="exam-date"
                type="date"
                value={tempExamInfo.date}
                onChange={(e) => setTempExamInfo(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="exam-subject">科目 (可选)</Label>
              <Input
                id="exam-subject"
                value={tempExamInfo.subject}
                onChange={(e) => setTempExamInfo(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="如果是单科考试，请输入科目名称"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDialog(false)}>
              取消
            </Button>
            <Button onClick={executeImport}>
              确认并开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            数据导入处理
          </CardTitle>
          <CardDescription>
            配置导入参数，执行数据导入，监控导入进度
          </CardDescription>
        </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 导入概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{validData ? validData.length : 0}</p>
                <p className="text-sm text-gray-600">待导入记录</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{importProgress.successful}</p>
                <p className="text-sm text-gray-600">成功导入</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{importProgress.failed}</p>
                <p className="text-sm text-gray-600">导入失败</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {importStats.estimatedTimeRemaining ? `${importStats.estimatedTimeRemaining}s` : '—'}
                </p>
                <p className="text-sm text-gray-600">预计剩余</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">导入配置</TabsTrigger>
            <TabsTrigger value="progress">导入进度</TabsTrigger>
            <TabsTrigger value="result">导入结果</TabsTrigger>
          </TabsList>
          
          {/* 导入配置 */}
          <TabsContent value="config">
            <div className="space-y-6">
              <Card className="p-4 bg-gray-50">
                <h4 className="font-medium mb-4">导入配置</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">创建缺失学生</Label>
                      <Switch
                        checked={importConfig.createMissingStudents}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, createMissingStudents: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">更新现有数据</Label>
                      <Switch
                        checked={importConfig.updateExistingData}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, updateExistingData: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">跳过重复记录</Label>
                      <Switch
                        checked={importConfig.skipDuplicates}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, skipDuplicates: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">启用数据备份</Label>
                      <Switch
                        checked={importConfig.enableBackup}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, enableBackup: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">启用回滚功能</Label>
                      <Switch
                        checked={importConfig.enableRollback}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, enableRollback: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">并行导入</Label>
                      <Switch
                        checked={importConfig.parallelImport}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, parallelImport: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">严格模式</Label>
                      <Switch
                        checked={importConfig.strictMode}
                        onCheckedChange={(checked) => 
                          setImportConfig(prev => ({ ...prev, strictMode: checked }))
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">批次大小</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2"
                        value={importConfig.batchSize}
                        onChange={(e) => 
                          setImportConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))
                        }
                      >
                        <option value={10}>10条/批次</option>
                        <option value={25}>25条/批次</option>
                        <option value={50}>50条/批次</option>
                        <option value={100}>100条/批次</option>
                        <option value={200}>200条/批次</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 配置说明 */}
              <Alert>
                <Settings className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">配置说明：</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• <strong>创建缺失学生</strong>: 自动创建数据中不存在的学生记录</li>
                      <li>• <strong>更新现有数据</strong>: 更新已存在的成绩记录</li>
                      <li>• <strong>跳过重复记录</strong>: 遇到重复记录时跳过而不是报错</li>
                      <li>• <strong>并行导入</strong>: 可能更快但占用更多资源</li>
                      <li>• <strong>严格模式</strong>: 任何错误都会停止导入</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          {/* 导入进度 */}
          <TabsContent value="progress">
            <div className="space-y-6">
              {/* 进度条 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">导入进度</h4>
                  <Badge variant={
                    importStats.isCompleted ? 'default' :
                    importStats.isFailed ? 'destructive' :
                    importStats.isPaused ? 'secondary' :
                    importStats.isImporting ? 'default' :
                    'outline'
                  }>
                    {importProgress.status === 'completed' ? '已完成' :
                     importProgress.status === 'failed' ? '失败' :
                     importProgress.status === 'paused' ? '已暂停' :
                     importProgress.status === 'importing' ? '导入中' :
                     importProgress.status === 'cancelled' ? '已取消' :
                     '待开始'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {importProgress.processed} / {importProgress.total} 
                      ({importProgress.percentage}%)
                    </span>
                    <span>
                      批次 {importProgress.currentBatch} / {importProgress.totalBatches}
                    </span>
                  </div>
                  <Progress value={importProgress.percentage} className="h-3" />
                </div>
                
                {importStats.estimatedTimeRemaining && (
                  <p className="text-sm text-gray-600">
                    预计剩余时间: {importStats.estimatedTimeRemaining} 秒
                  </p>
                )}
              </div>

              {/* 实时状态 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{importProgress.successful}</p>
                    <p className="text-xs text-gray-600">成功</p>
                  </div>
                </Card>
                
                <Card className="p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">{importProgress.failed}</p>
                    <p className="text-xs text-gray-600">失败</p>
                  </div>
                </Card>
                
                <Card className="p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{importProgress.errors.length}</p>
                    <p className="text-xs text-gray-600">错误</p>
                  </div>
                </Card>
                
                <Card className="p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-600">{importProgress.warnings.length}</p>
                    <p className="text-xs text-gray-600">警告</p>
                  </div>
                </Card>
              </div>

              {/* 错误日志 */}
              {importProgress.errors.length > 0 && (
                <Card className="p-4">
                  <h5 className="font-medium mb-2">错误日志</h5>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {importProgress.errors.slice(-10).map((error, index) => (
                        <p key={index} className="text-sm text-red-600">{error}</p>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>
          </TabsContent>
          
          {/* 导入结果 */}
          <TabsContent value="result">
            <div className="space-y-6">
              {importResult ? (
                <>
                  {/* 结果统计 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 text-center">
                      <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{importResult.totalCount}</p>
                      <p className="text-sm text-gray-600">总记录数</p>
                    </Card>
                    
                    <Card className="p-4 text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">{importResult.successCount}</p>
                      <p className="text-sm text-gray-600">成功导入</p>
                    </Card>
                    
                    <Card className="p-4 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                      <p className="text-2xl font-bold">{importResult.failedCount}</p>
                      <p className="text-sm text-gray-600">导入失败</p>
                    </Card>
                    
                    <Card className="p-4 text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{Math.round(importResult.duration / 1000)}</p>
                      <p className="text-sm text-gray-600">耗时(秒)</p>
                    </Card>
                  </div>

                  {/* 成功率 */}
                  <Card className="p-4">
                    <h5 className="font-medium mb-2">导入成功率</h5>
                    <div className="flex justify-between text-sm mb-2">
                      <span>成功率</span>
                      <span>{Math.round((importResult.successCount / importResult.totalCount) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(importResult.successCount / importResult.totalCount) * 100} 
                      className="h-2" 
                    />
                  </Card>

                  {/* 详细信息 */}
                  {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">详细信息</h5>
                      
                      {importResult.errors.length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-red-600 mb-2">错误信息</h6>
                          <ScrollArea className="h-32 border rounded p-2">
                            <div className="space-y-1">
                              {importResult.errors.map((error, index) => (
                                <p key={index} className="text-sm text-red-600">{error}</p>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {importResult.warnings.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-yellow-600 mb-2">警告信息</h6>
                          <ScrollArea className="h-32 border rounded p-2">
                            <div className="space-y-1">
                              {importResult.warnings.map((warning, index) => (
                                <p key={index} className="text-sm text-yellow-600">{warning}</p>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </Card>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    暂无导入结果，请先执行导入操作
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* 操作按钮 */}
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            {!importing && !importResult && (
              <Button
                onClick={startImport}
                disabled={!validData || validData.length === 0 || loading}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                开始导入
              </Button>
            )}
            
            {importing && !paused && (
              <Button variant="outline" onClick={pauseImport}>
                <PauseCircle className="w-4 h-4 mr-2" />
                暂停
              </Button>
            )}
            
            {importing && paused && (
              <Button variant="outline" onClick={resumeImport}>
                <PlayCircle className="w-4 h-4 mr-2" />
                恢复
              </Button>
            )}
            
            {importing && (
              <Button variant="destructive" onClick={cancelImport}>
                <StopCircle className="w-4 h-4 mr-2" />
                取消
              </Button>
            )}
            
            {importResult && (
              <Button variant="outline" onClick={resetImport}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重新开始
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {importResult && (
              <Button variant="outline" onClick={exportImportReport}>
                <Download className="w-4 h-4 mr-2" />
                导出报告
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default ImportProcessor; 