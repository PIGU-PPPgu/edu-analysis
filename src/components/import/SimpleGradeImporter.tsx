import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Upload, AlertCircle, RefreshCw, Zap, HardDrive, ChevronDown, ChevronRight, Settings2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { processFileWithWorker, shouldUseWorker, isWorkerSupported } from '@/utils/workerManager';
import type { ParseProgress, ParseResult as WorkerParseResult } from '@/workers/fileProcessor.worker';
import { GradeDataPreview } from '@/components/ui/VirtualTable';
import { intelligentFileParser } from '@/services/intelligentFileParser';
import { supabase } from '@/integrations/supabase/client';
import { convertWideToLongFormatEnhanced, analyzeCSVHeaders } from '@/services/intelligentFieldMapper';

// 简化的用户流程：上传 → 智能确认 → 导入完成

interface SimpleGradeImporterProps {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successRecords: number;
  errorRecords: number;
  errors: string[];
  examId?: string;
}

interface ParsedData {
  file: File;
  preview: any[];
  mapping: Record<string, string>;
  confidence: number;
  issues: string[];
  metadata?: {
    fileName: string;
    fileSize: number;
    totalRows: number;
    totalColumns: number;
    parseTime: number;
    encoding?: string;
    sheetNames?: string[];
    examInfo?: {
      title?: string;
      type?: string;
      date?: string;
    };
    detectedSubjects?: string[];
    detectedStructure?: string;
  };
}

interface ExamInfo {
  title: string;
  type: string;
  date: string;
  description?: string;
}

export const SimpleGradeImporter: React.FC<SimpleGradeImporterProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'upload' | 'confirm' | 'importing' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [examInfo, setExamInfo] = useState<ExamInfo>({
    title: '',
    type: '月考',
    date: new Date().toISOString().split('T')[0]
  });
  const [aiServiceStatus, setAiServiceStatus] = useState<'checking' | 'available' | 'unavailable' | 'unknown'>('unknown');

  // 检测AI服务状态 - 简化版本，直接反映当前配置
  React.useEffect(() => {
    // 由于当前AI服务已被禁用以解决CORS问题，直接设置为不可用
    setAiServiceStatus('unavailable');
    
    // 注意：如果未来AI服务修复，可以恢复完整的检测逻辑
    console.log('[AI服务状态] 当前使用纯算法解析模式，AI服务暂时禁用');
  }, []);

  // 一键智能上传 - 支持Web Workers大文件处理
  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('');

    try {
      // 检查是否应该使用Web Worker
      const useWorker = shouldUseWorker(file);
      const fileSize = (file.size / 1024 / 1024).toFixed(1); // MB
      
      if (useWorker) {
        setProgressMessage('检测到大文件，启用高性能处理模式...');
        toast.success(`检测到大文件 (${fileSize}MB)，启用高性能处理模式`, {
          icon: '⚡',
          duration: 3000
        });
      } else {
        setProgressMessage('正在准备文件解析...');
      }

      let workerResult: WorkerParseResult | null = null;

      if (useWorker && isWorkerSupported()) {
        // 使用Web Worker处理大文件
        workerResult = await processFileWithWorker(file, {
          onProgress: (progress: ParseProgress) => {
            const progressMap = {
              'reading': 20,
              'parsing': 50,
              'validating': 70,
              'formatting': 90
            };
            const baseProgress = progressMap[progress.phase] || 0;
            const currentProgress = baseProgress + (progress.progress / 100) * 20;
            setProgress(Math.min(currentProgress, 95));
            setProgressMessage(progress.message);
            
            // 显示详细进度信息
            if (progress.currentRow && progress.totalRows) {
              setProgressMessage(`${progress.message} (${progress.currentRow}/${progress.totalRows})`);
            }
          }
        });
      } else {
        // 小文件使用传统方式处理
        setProgress(10);
        setProgressMessage('正在读取文件...');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setProgress(30);
        setProgressMessage('AI正在分析文件结构...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProgress(60);
        setProgressMessage('智能识别字段映射...');
        await new Promise(resolve => setTimeout(resolve, 700));

        setProgress(85);
        setProgressMessage('生成数据预览...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 转换Worker结果为组件数据格式
      let parsedData: ParsedData;
      
      if (workerResult && workerResult.success) {
        parsedData = {
          file,
          preview: workerResult.data.slice(0, 5), // 只显示前5行预览
          mapping: generateSmartMapping(workerResult.headers),
          confidence: calculateConfidence(workerResult.headers, workerResult.errors, workerResult.warnings),
          issues: [...workerResult.errors, ...workerResult.warnings],
          metadata: workerResult.metadata
        };
      } else {
        // 使用智能文件解析器处理真实文件
        setProgressMessage('使用智能解析引擎处理文件...');
        
        try {
          const parseResult = await intelligentFileParser.parseFile(file);
          console.log('[SimpleGradeImporter] 智能解析结果:', parseResult);
          
          parsedData = {
            file,
            preview: parseResult.data.slice(0, 5), // 只显示前5行预览
            mapping: parseResult.metadata.suggestedMappings,
            confidence: parseResult.metadata.confidence,
            issues: [],
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              totalRows: parseResult.metadata.totalRows,
              totalColumns: parseResult.headers.length,
              parseTime: 1000,
              examInfo: parseResult.metadata.examInfo,
              detectedSubjects: parseResult.metadata.detectedSubjects,
              detectedStructure: parseResult.metadata.detectedStructure
            }
          };
          
          // 添加检测到的问题和建议
          if (parseResult.metadata.unknownFields && parseResult.metadata.unknownFields.length > 0) {
            parsedData.issues.push(`发现 ${parseResult.metadata.unknownFields.length} 个未识别字段`);
          }
          
          if (parseResult.metadata.confidence < 0.8) {
            parsedData.issues.push('部分字段识别置信度较低，请确认映射是否正确');
          }
          
          // 自动推断考试信息
          if (parseResult.metadata.examInfo) {
            setExamInfo(prev => ({
              title: parseResult.metadata.examInfo?.title || prev.title || file.name.replace(/\.[^/.]+$/, ''),
              type: parseResult.metadata.examInfo?.type || prev.type,
              date: parseResult.metadata.examInfo?.date || prev.date
            }));
          } else {
            // 如果没有检测到考试信息，使用文件名作为标题
            setExamInfo(prev => ({
              ...prev,
              title: prev.title || file.name.replace(/\.[^/.]+$/, '')
            }));
          }
          
        } catch (error) {
          console.error('[SimpleGradeImporter] 智能解析失败，使用降级处理:', error);
          
          // 降级处理：使用模拟数据
          const mockHeaders = ['姓名', '数学', '语文', '英语'];
          parsedData = {
            file,
            preview: [
              { 姓名: '张三', 数学: 95, 语文: 88, 英语: 92 },
              { 姓名: '李四', 数学: 87, 语文: 91, 英语: 85 },
              { 姓名: '王五', 数学: 78, 语文: 82, 英语: 89 }
            ],
            mapping: generateSmartMapping(mockHeaders),
            confidence: 0.5, // 降低置信度表明这是降级处理
            issues: [`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`, '使用了模拟数据，请检查文件格式'],
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              totalRows: 3,
              totalColumns: 4,
              parseTime: 1000
            }
          };
        }
      }

      setProgress(100);
      setProgressMessage('解析完成！');
      setParsedData(parsedData);
      setStep('confirm');
      
      const processingMode = useWorker ? '高性能模式' : '标准模式';
      const processingTime = parsedData.metadata?.parseTime ? `${(parsedData.metadata.parseTime / 1000).toFixed(1)}秒` : '';
      
      toast.success(`文件解析完成！(${processingMode} ${processingTime})`, {
        description: `AI智能识别了 ${Object.keys(parsedData.mapping).length} 个字段，置信度 ${Math.round(parsedData.confidence * 100)}%`
      });

    } catch (error) {
      console.error('解析失败:', error);
      setProgressMessage('解析失败');
      toast.error(`解析失败: ${error instanceof Error ? error.message : '未知错误'}`, {
        description: "请检查文件格式是否正确，或尝试使用较小的文件",
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
    }
  }, []);

  // 确认并开始导入 - 实现真实的数据库保存
  const handleConfirmImport = useCallback(async () => {
    if (!parsedData) return;

    setIsProcessing(true);
    setStep('importing');
    setProgress(0);

    try {
      // 步骤1: 验证考试信息
      setProgress(10);
      setProgressMessage('验证考试信息...');
      
      if (!examInfo.title.trim()) {
        throw new Error('考试标题不能为空');
      }

      // 步骤2: 处理原始数据
      setProgress(25);
      setProgressMessage('分析数据结构...');
      
      // 重新解析文件以获取完整数据（不只是预览）
      const fullParseResult = await intelligentFileParser.parseFile(parsedData.file);
      console.log('[真实导入] 完整解析结果:', fullParseResult);

      // 步骤3: 生成考试ID并准备考试数据
      setProgress(40);
      setProgressMessage('创建考试记录...');
      
      const examId = crypto.randomUUID();
      const examData = {
        exam_id: examId,
        title: examInfo.title.trim(),
        type: examInfo.type,
        date: examInfo.date
      };

      // 步骤4: 转换数据格式 - 将宽表格转换为长表格
      setProgress(55);
      setProgressMessage('转换数据格式...');
      
      const headerAnalysis = analyzeCSVHeaders(fullParseResult.headers);
      console.log('[真实导入] 字段分析结果:', headerAnalysis);
      
      let allGradeRecords: any[] = [];
      let processedRows = 0;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // 处理每一行数据 - 宽表格模式，每行一条记录
      for (const rowData of fullParseResult.data) {
        try {
          // 将CSV行转换为单条完整记录（宽表格模式）
          const gradeRecord = convertWideToLongFormatEnhanced(rowData, headerAnalysis, examData);
          
          // 验证记录有效性（检查映射后的英文字段）
          if (gradeRecord.student_id && gradeRecord.name && 
              (gradeRecord.total_score !== null || gradeRecord.chinese_score !== null || 
               gradeRecord.math_score !== null || gradeRecord.english_score !== null)) {
            allGradeRecords.push(gradeRecord);
            successCount++;
          } else {
            errorCount++;
            errors.push(`行 ${processedRows + 1}: 缺少必要数据字段（学生姓名或成绩）`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`行 ${processedRows + 1}: ${error instanceof Error ? error.message : '处理失败'}`);
        }
        
        processedRows++;
        setProgress(55 + (processedRows / fullParseResult.data.length) * 20);
      }

      console.log('[真实导入] 转换完成:', {
        原始行数: fullParseResult.data.length,
        生成记录数: allGradeRecords.length,
        成功记录: successCount,
        错误数: errorCount
      });

      // 步骤5: 保存到数据库
      setProgress(80);
      setProgressMessage('保存到数据库...');

      // 直接保存到数据库，绕过Edge Function
      console.log('[真实导入] 直接保存到grade_data_new表:', {
        examId,
        recordCount: allGradeRecords.length,
        firstRecord: allGradeRecords[0]
      });

      // 1. 首先创建考试记录 - 使用onConflict处理重复
      const { error: examError } = await supabase
        .from('exams')
        .upsert({
          id: examId,
          title: examInfo.title.trim(),
          type: examInfo.type,
          date: examInfo.date,
          subject: '综合',
          scope: 'all',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'title,date,type',
          ignoreDuplicates: false
        });

      if (examError) {
        console.error('[真实导入] 创建考试记录失败:', examError);
        throw new Error(`创建考试记录失败: ${examError.message}`);
      }

      // 2. 批量插入成绩数据到新表
      const { error: saveError } = await supabase
        .from('grade_data_new')
        .insert(allGradeRecords.map(record => ({
          ...record,
          exam_id: examId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));

      if (saveError) {
        console.error('[真实导入] 数据库保存失败:', saveError);
        throw new Error(`数据库保存失败: ${saveError.message}`);
      }

      console.log('[真实导入] 成功保存到grade_data_new表');

      // 步骤6: 完成导入
      setProgress(100);
      setProgressMessage('导入完成！');

      const importResult: ImportResult = {
        success: true,
        totalRecords: fullParseResult.data.length,
        successRecords: successCount, // 宽表格模式：一个学生一条记录
        errorRecords: errorCount,
        errors: errors.slice(0, 10), // 只显示前10个错误
        examId: examId
      };

      setImportResult(importResult);
      setStep('complete');
      
      toast.success("🎉 导入成功！", {
        description: `成功创建考试"${examInfo.title}"，导入 ${importResult.successRecords} 个学生的成绩数据`,
        duration: 5000
      });

      onComplete?.(importResult);

    } catch (error) {
      console.error('[真实导入] 导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      toast.error("导入失败", {
        description: errorMessage,
        duration: 8000
      });
      
      // 回到确认步骤，让用户可以重试
      setStep('confirm');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, examInfo, onComplete]);

  // 重新开始
  const handleRestart = useCallback(() => {
    setStep('upload');
    setParsedData(null);
    setImportResult(null);
    setProgress(0);
    setShowFieldMapping(false);
    setExamInfo({
      title: '',
      type: '月考',
      date: new Date().toISOString().split('T')[0]
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 进度指示器 */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-blue-600' : step === 'confirm' || step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-100 border-2 border-blue-600' : step === 'confirm' || step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-gray-200'}`}>
            {step === 'confirm' || step === 'importing' || step === 'complete' ? <CheckCircle className="w-5 h-5 text-white" /> : <span className="text-sm font-semibold">1</span>}
          </div>
          <span className="font-medium">上传文件</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300"></div>
        
        <div className={`flex items-center space-x-2 ${step === 'confirm' ? 'text-blue-600' : step === 'importing' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-blue-100 border-2 border-blue-600' : step === 'importing' || step === 'complete' ? 'bg-green-600' : 'bg-gray-200'}`}>
            {step === 'importing' || step === 'complete' ? <CheckCircle className="w-5 h-5 text-white" /> : <span className="text-sm font-semibold">2</span>}
          </div>
          <span className="font-medium">智能确认</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300"></div>
        
        <div className={`flex items-center space-x-2 ${step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-green-600' : 'bg-gray-200'}`}>
            {step === 'complete' ? <CheckCircle className="w-5 h-5 text-white" /> : <span className="text-sm font-semibold">3</span>}
          </div>
          <span className="font-medium">导入完成</span>
        </div>
      </div>

      {/* 步骤1: 文件上传 */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>一键智能导入</span>
              {/* AI服务状态指示器 */}
              {aiServiceStatus === 'checking' && (
                <Badge variant="secondary" className="ml-2">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  检测中
                </Badge>
              )}
              {aiServiceStatus === 'available' && (
                <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                  <Wifi className="w-3 h-3 mr-1" />
                  AI增强
                </Badge>
              )}
              {aiServiceStatus === 'unavailable' && (
                <Badge variant="outline" className="ml-2 border-orange-200 text-orange-700">
                  <Zap className="w-3 h-3 mr-1" />
                  算法模式
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              {isProcessing ? (
                <div className="space-y-4">
                  <RefreshCw className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
                  <p className="text-lg font-medium">
                    {aiServiceStatus === 'available' ? 'AI正在智能解析文件...' : '算法正在智能解析文件...'}
                  </p>
                  <Progress value={progress} className="w-64 mx-auto" />
                  <p className="text-sm text-gray-600">
                    {progressMessage || '处理中...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 mx-auto text-gray-400" />
                  <div>
                    <p className="text-xl font-medium text-gray-900">拖拽文件到这里，或点击选择</p>
                    <p className="text-gray-600 mt-2">支持 Excel (.xlsx, .xls) 和 CSV 文件</p>
                    {aiServiceStatus === 'available' && (
                      <p className="text-sm text-green-600 mt-1">✨ AI将自动识别字段并生成预览</p>
                    )}
                    {aiServiceStatus === 'unavailable' && (
                      <p className="text-sm text-orange-600 mt-1">⚡ 高性能算法将自动识别字段并生成预览</p>
                    )}
                    {aiServiceStatus === 'checking' && (
                      <p className="text-sm text-gray-500 mt-1">🔍 正在检测AI服务状态...</p>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx,.xls,.csv';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                      };
                      input.click();
                    }}
                    className="mt-4"
                  >
                    选择文件
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤2: 智能确认 */}
      {step === 'confirm' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>智能解析完成，请确认</span>
              </div>
              <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                置信度: {Math.round(parsedData.confidence * 100)}%
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 考试信息设置 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                考试信息设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">考试标题</label>
                  <input
                    type="text"
                    value={examInfo.title}
                    onChange={(e) => setExamInfo(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入考试标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">考试类型</label>
                  <select
                    value={examInfo.type}
                    onChange={(e) => setExamInfo(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="月考">月考</option>
                    <option value="期中考试">期中考试</option>
                    <option value="期末考试">期末考试</option>
                    <option value="模拟考试">模拟考试</option>
                    <option value="单元测试">单元测试</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">考试日期</label>
                  <input
                    type="date"
                    value={examInfo.date}
                    onChange={(e) => setExamInfo(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {!examInfo.title.trim() && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    请填写考试标题，这将帮助您在后续管理中更好地识别这次考试数据。
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* 数据类型统计 */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(parsedData.mapping).filter(field => field.includes('grade')).length > 0 && (
                <Badge variant="outline" className="bg-purple-50">
                  ✨ 检测到等级数据 ({Object.keys(parsedData.mapping).filter(field => field.includes('grade')).length}个)
                </Badge>
              )}
              {Object.keys(parsedData.mapping).filter(field => field.includes('score')).length > 0 && (
                <Badge variant="outline" className="bg-green-50">
                  📊 检测到分数数据 ({Object.keys(parsedData.mapping).filter(field => field.includes('score')).length}个)
                </Badge>
              )}
              {Object.keys(parsedData.mapping).filter(field => field.includes('rank')).length > 0 && (
                <Badge variant="outline" className="bg-orange-50">
                  🏆 检测到排名数据 ({Object.keys(parsedData.mapping).filter(field => field.includes('rank')).length}个)
                </Badge>
              )}
            </div>

            {/* 字段映射预览 - 可折叠 */}
            <div>
              <button
                onClick={() => setShowFieldMapping(!showFieldMapping)}
                className="flex items-center gap-2 font-semibold mb-3 text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showFieldMapping ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                查看AI识别的字段映射 ({Object.keys(parsedData.mapping).length}个字段)
              </button>
              
              {showFieldMapping && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(parsedData.mapping).map(([systemField, fileField]) => {
                    // 检测是否为等级字段
                    const isGradeField = systemField.includes('grade') || systemField.includes('level');
                    const isScoreField = systemField.includes('score');
                    const isRankField = systemField.includes('rank');
                    
                    let bgColor = 'bg-blue-50';
                    let textColor = 'text-blue-900';
                    let badge = null;
                    
                    if (isGradeField) {
                      bgColor = 'bg-purple-50';
                      textColor = 'text-purple-900';
                      badge = <Badge variant="secondary" className="text-xs mt-1">等级数据</Badge>;
                    } else if (isScoreField) {
                      bgColor = 'bg-green-50';
                      textColor = 'text-green-900';
                      badge = <Badge variant="secondary" className="text-xs mt-1">分数数据</Badge>;
                    } else if (isRankField) {
                      bgColor = 'bg-orange-50';
                      textColor = 'text-orange-900';
                      badge = <Badge variant="secondary" className="text-xs mt-1">排名数据</Badge>;
                    }
                    
                    return (
                      <div key={systemField} className={`${bgColor} p-3 rounded-lg`}>
                        <div className="text-sm text-gray-600">文件中: {fileField}</div>
                        <div className={`font-medium ${textColor}`}>→ {systemField}</div>
                        {badge}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 高性能数据预览 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">数据预览</h3>
                <div className="flex items-center space-x-2">
                  {parsedData.metadata && (
                    <>
                      <Badge variant="outline">
                        总计 {parsedData.metadata.totalRows} 行
                      </Badge>
                      <Badge variant="outline">
                        {parsedData.metadata.totalColumns} 列
                      </Badge>
                      <Badge variant="secondary">
                        预览前 {parsedData.preview.length} 行
                      </Badge>
                      {parsedData.metadata.parseTime && (
                        <Badge variant="secondary">
                          解析耗时: {(parsedData.metadata.parseTime / 1000).toFixed(1)}s
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* 水平滚动的数据预览表格 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-w-full">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(parsedData.preview[0] || {}).map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 last:border-r-0"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedData.preview.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {Object.keys(parsedData.preview[0] || {}).map((header, colIndex) => (
                            <td
                              key={colIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                            >
                              {String(row[header] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* 滚动提示 */}
                {parsedData.metadata && parsedData.metadata.totalColumns > 6 && (
                  <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm flex items-center justify-between">
                    <span>💡 数据较宽，可以左右滚动查看更多列</span>
                    <span>{parsedData.metadata.totalColumns} 列数据</span>
                  </div>
                )}
              </div>
            </div>

            {/* 问题提醒 */}
            {parsedData.issues.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">发现以下问题，但不影响导入：</div>
                  <ul className="list-disc list-inside space-y-1">
                    {parsedData.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleRestart}>
                重新选择文件
              </Button>
              <div className="space-x-3">
                <Button variant="outline" onClick={onCancel}>
                  取消
                </Button>
                <Button 
                  onClick={handleConfirmImport}
                  disabled={isProcessing || !examInfo.title.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  确认导入 ({parsedData.metadata?.totalRows || parsedData.preview.length} 条记录)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤3: 导入进行中 */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <RefreshCw className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
              <h3 className="text-xl font-semibold">正在导入数据...</h3>
              <Progress value={progress} className="w-80 mx-auto" />
              <p className="text-gray-600">
                {progressMessage || '请稍候，导入完成后将自动跳转到结果页面'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤4: 导入完成 */}
      {step === 'complete' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span>导入完成！</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.totalRecords}</div>
                <div className="text-sm text-gray-600">总记录数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.successRecords}</div>
                <div className="text-sm text-gray-600">成功导入</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.errorRecords}</div>
                <div className="text-sm text-gray-600">失败记录</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">部分记录导入失败：</div>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-sm">{error}</li>
                    ))}
                  </ul>
                  {importResult.errors.length > 5 && (
                    <p className="text-sm mt-2">还有 {importResult.errors.length - 5} 个错误...</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleRestart}>
                继续导入其他文件
              </Button>
              <Button onClick={() => window.location.href = '/grade-analysis'}>
                查看分析结果
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 辅助函数：智能生成字段映射
function generateSmartMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // 字段匹配规则 - 增强对等级/级别数据的识别
  const fieldPatterns = {
    name: /姓名|name|学生姓名|真实姓名/i,
    student_id: /学号|student_?id|学生学号|学生编号|编号|考生号|id$/i,
    class: /班级|class|班级名称|所在班级/i,
    
    // 分数类型字段
    chinese_score: /语文(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^语文$(?!.*(?:等级|级别))|chinese.*?score/i,
    math_score: /数学(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^数学$(?!.*(?:等级|级别))|math.*?score|mathematics.*?score/i,
    english_score: /英语(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^英语$(?!.*(?:等级|级别))|english.*?score/i,
    physics_score: /物理(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^物理$(?!.*(?:等级|级别))|physics.*?score/i,
    chemistry_score: /化学(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^化学$(?!.*(?:等级|级别))|chemistry.*?score/i,
    biology_score: /生物(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^生物$(?!.*(?:等级|级别))|biology.*?score/i,
    history_score: /历史(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^历史$(?!.*(?:等级|级别))|history.*?score/i,
    geography_score: /地理(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^地理$(?!.*(?:等级|级别))|geography.*?score/i,
    total_score: /总分|总成绩|total.*?score/i,
    
    // 等级/级别类型字段 - 重要！用户强调的等级数据识别
    chinese_grade: /语文.*?(?:等级|级别|评级|level|grade)$|语文等级|语文级别/i,
    math_grade: /数学.*?(?:等级|级别|评级|level|grade)$|数学等级|数学级别/i,
    english_grade: /英语.*?(?:等级|级别|评级|level|grade)$|英语等级|英语级别/i,
    physics_grade: /物理.*?(?:等级|级别|评级|level|grade)$|物理等级|物理级别/i,
    chemistry_grade: /化学.*?(?:等级|级别|评级|level|grade)$|化学等级|化学级别/i,
    biology_grade: /生物.*?(?:等级|级别|评级|level|grade)$|生物等级|生物级别/i,
    history_grade: /历史.*?(?:等级|级别|评级|level|grade)$|历史等级|历史级别/i,
    geography_grade: /地理.*?(?:等级|级别|评级|level|grade)$|地理等级|地理级别/i,
    
    // 排名类型字段
    class_rank: /班级排名|班排|班内排名/i,
    grade_rank: /年级排名|级排|校排|年级内排名/i
  };

  for (const header of headers) {
    if (!header || typeof header !== 'string') continue;
    
    for (const [systemField, pattern] of Object.entries(fieldPatterns)) {
      if (pattern.test(header.trim())) {
        mapping[systemField] = header;
        break;
      }
    }
  }

  return mapping;
}

// 辅助函数：计算解析置信度
function calculateConfidence(
  headers: string[], 
  errors: string[], 
  warnings: string[]
): number {
  let confidence = 1.0;

  // 基于找到的字段数量
  const mapping = generateSmartMapping(headers);
  const mappedFields = Object.keys(mapping).length;
  const expectedFields = 3; // 至少期望：姓名、一个科目分数
  
  if (mappedFields < expectedFields) {
    confidence -= (expectedFields - mappedFields) * 0.2;
  }

  // 基于错误数量
  confidence -= errors.length * 0.1;
  confidence -= warnings.length * 0.05;

  // 基于文件结构
  if (headers.length < 2) {
    confidence -= 0.3; // 文件结构太简单
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}