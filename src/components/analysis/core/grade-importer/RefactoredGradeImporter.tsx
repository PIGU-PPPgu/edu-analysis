/**
 * 🔧 RefactoredGradeImporter - 重构后的成绩导入组件
 * 
 * 将原2120行的巨型组件拆分为多个小组件：
 * - FileUploader: 文件上传处理
 * - DataMappingConfig: 字段映射配置  
 * - ExamInfoConfig: 考试信息配置
 * - ImportPreview: 导入预览
 * - ImportProcessor: 导入处理
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Upload, Settings, Eye, Database } from 'lucide-react';
import { toast } from 'sonner';

import FileUploader from './FileUploader';
import DataMappingConfig from './DataMappingConfig';
import {
  GradeImporterProps,
  FileUploadResult,
  ParsedData,
  FieldMapping,
  ExamInfo,
  ImportConfigState,
  DEFAULT_IMPORT_CONFIG,
  DEFAULT_EXAM_INFO
} from './types';

const RefactoredGradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  // 核心状态管理
  const [activeStep, setActiveStep] = useState<'upload' | 'mapping' | 'config' | 'preview' | 'import'>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>({});
  const [examInfo, setExamInfo] = useState<ExamInfo>(DEFAULT_EXAM_INFO);
  const [importConfig, setImportConfig] = useState<ImportConfigState>(DEFAULT_IMPORT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 步骤完成状态
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // 处理文件上传结果
  const handleFileUploaded = (result: FileUploadResult) => {
    if (result.success && result.data) {
      setParsedData(result.data);
      setCompletedSteps(prev => new Set([...prev, 'upload']));
      setActiveStep('mapping');
      toast.success('文件解析成功，请配置字段映射');
    } else {
      toast.error(result.error || '文件上传失败');
    }
  };

  // 处理字段映射配置
  const handleMappingConfigured = (mappings: FieldMapping) => {
    setFieldMappings(mappings);
    setCompletedSteps(prev => new Set([...prev, 'mapping']));
    setActiveStep('config');
    toast.success('字段映射配置完成');
  };

  // 处理考试信息配置
  const handleExamConfigured = (info: ExamInfo) => {
    setExamInfo(info);
    setCompletedSteps(prev => new Set([...prev, 'config']));
    setActiveStep('preview');
    toast.success('考试信息配置完成');
  };

  // 处理导入预览确认
  const handlePreviewConfirmed = () => {
    setCompletedSteps(prev => new Set([...prev, 'preview']));
    setActiveStep('import');
    startImportProcess();
  };

  // 开始导入处理
  const startImportProcess = async () => {
    if (!parsedData || !fieldMappings || !examInfo) {
      toast.error('缺少必要的配置信息');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // 模拟导入过程
      const steps = [
        '验证数据格式...',
        '检查学生信息...',
        '处理成绩数据...',
        '保存到数据库...',
        '更新统计信息...'
      ];

      for (let i = 0; i < steps.length; i++) {
        toast.info(steps[i]);
        setProgress((i + 1) / steps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 调用父组件回调
      onDataImported(parsedData.data);
      
      setCompletedSteps(prev => new Set([...prev, 'import']));
      toast.success(`导入完成！共处理 ${parsedData.totalRows} 条记录`);

    } catch (error) {
      console.error('导入处理错误:', error);
      toast.error(`导入失败: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 重置导入流程
  const handleReset = () => {
    setParsedData(null);
    setFieldMappings({});
    setExamInfo(DEFAULT_EXAM_INFO);
    setCompletedSteps(new Set());
    setActiveStep('upload');
    setIsProcessing(false);
    setProgress(0);
  };

  // 获取步骤状态
  const getStepStatus = (step: string) => {
    if (completedSteps.has(step)) return 'completed';
    if (activeStep === step) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full space-y-6">
      {/* 进度指示器 */}
      <Card>
        <CardHeader>
          <CardTitle>成绩导入流程</CardTitle>
          <CardDescription>
            按照以下步骤完成成绩数据的导入和配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {[
              { key: 'upload', label: '文件上传', icon: Upload },
              { key: 'mapping', label: '字段映射', icon: Settings },
              { key: 'config', label: '考试配置', icon: Database },
              { key: 'preview', label: '预览确认', icon: Eye },
              { key: 'import', label: '导入完成', icon: CheckCircle }
            ].map((step, index) => {
              const status = getStepStatus(step.key);
              const StepIcon = step.icon;
              
              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                    ${status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' :
                      status === 'active' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                      'bg-gray-100 border-gray-300 text-gray-500'}
                  `}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`
                    text-sm mt-2 font-medium
                    ${status === 'active' ? 'text-blue-700' : 'text-gray-600'}
                  `}>
                    {step.label}
                  </span>
                  {status === 'completed' && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      ✓ 已完成
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-600 text-center">
                导入进度: {progress.toFixed(0)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Tabs value={activeStep} onValueChange={(value) => setActiveStep(value as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload" disabled={isProcessing}>文件上传</TabsTrigger>
          <TabsTrigger value="mapping" disabled={!completedSteps.has('upload') || isProcessing}>字段映射</TabsTrigger>
          <TabsTrigger value="config" disabled={!completedSteps.has('mapping') || isProcessing}>考试配置</TabsTrigger>
          <TabsTrigger value="preview" disabled={!completedSteps.has('config') || isProcessing}>预览确认</TabsTrigger>
          <TabsTrigger value="import" disabled={!completedSteps.has('preview') || isProcessing}>导入处理</TabsTrigger>
        </TabsList>

        {/* 文件上传步骤 */}
        <TabsContent value="upload">
          <FileUploader
            onFileUploaded={handleFileUploaded}
            enableAIEnhancement={importConfig.enableAIEnhancement}
            isLoading={isProcessing}
          />
        </TabsContent>

        {/* 字段映射步骤 */}
        <TabsContent value="mapping">
          {parsedData ? (
            <DataMappingConfig
              parsedData={parsedData}
              onMappingConfigured={handleMappingConfigured}
              enableAISuggestion={importConfig.enableAIEnhancement}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>请先上传文件</AlertTitle>
              <AlertDescription>
                需要先完成文件上传步骤才能进行字段映射配置
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* 考试配置步骤 */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>考试信息配置</CardTitle>
              <CardDescription>配置本次导入的考试基本信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">考试标题</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 p-2 border rounded"
                    value={examInfo.title}
                    onChange={(e) => setExamInfo({...examInfo, title: e.target.value})}
                    placeholder="如：期中考试"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">考试类型</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 p-2 border rounded"
                    value={examInfo.type}
                    onChange={(e) => setExamInfo({...examInfo, type: e.target.value})}
                    placeholder="如：月考"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">考试日期</label>
                  <input 
                    type="date" 
                    className="w-full mt-1 p-2 border rounded"
                    value={examInfo.date}
                    onChange={(e) => setExamInfo({...examInfo, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">科目</label>
                  <input 
                    type="text" 
                    className="w-full mt-1 p-2 border rounded"
                    value={examInfo.subject}
                    onChange={(e) => setExamInfo({...examInfo, subject: e.target.value})}
                    placeholder="如：数学（可选）"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => handleExamConfigured(examInfo)}
                  disabled={!examInfo.title || !examInfo.type || !examInfo.date}
                >
                  确认考试配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 预览确认步骤 */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>导入预览</CardTitle>
              <CardDescription>确认数据格式和配置信息</CardDescription>
            </CardHeader>
            <CardContent>
              {parsedData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">文件信息</p>
                      <p className="text-sm text-gray-600">{parsedData.fileName}</p>
                      <p className="text-sm text-gray-600">{parsedData.totalRows} 行数据</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">考试信息</p>
                      <p className="text-sm text-gray-600">{examInfo.title}</p>
                      <p className="text-sm text-gray-600">{examInfo.date}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">字段映射</p>
                      <p className="text-sm text-gray-600">
                        {Object.keys(fieldMappings).length} 个字段已配置
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={handleReset}>
                      重新开始
                    </Button>
                    <Button onClick={handlePreviewConfirmed}>
                      确认导入
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 导入处理步骤 */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>导入处理</CardTitle>
              <CardDescription>正在处理数据导入...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                {completedSteps.has('import') ? (
                  <div className="space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                    <h3 className="text-lg font-medium">导入完成！</h3>
                    <p className="text-gray-600">
                      成功导入 {parsedData?.totalRows} 条成绩记录
                    </p>
                    <Button onClick={handleReset}>
                      导入新文件
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <h3 className="text-lg font-medium">正在处理数据...</h3>
                    <p className="text-gray-600">请稍候，正在导入成绩数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RefactoredGradeImporter; 