/**
 * 🔧 GradeImporter - 重构后的成绩导入主组件
 * 
 * 集成了所有模块化的子组件：
 * - FileUploader: 文件上传和解析
 * - DataMapper: AI智能字段映射  
 * - DataValidator: 数据验证和检查
 * - ImportProcessor: 导入处理和进度控制
 * - ConfigManager: 配置模板管理
 */

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Upload,
  MapPin,
  Shield,
  Play,
  RotateCcw
} from 'lucide-react';

// 导入重构后的子组件
import { 
  FileUploader,
  DataMapper, 
  DataValidator,
  ImportProcessor,
  ConfigManager
} from './components';

// 导入hooks和类型
import { useGradeImporter } from './hooks';
import type { 
  GradeImporterProps,
  ParsedData,
  MappingConfig,
  ValidationResult,
  ImportResult,
  ExamInfo
} from './types';

const GradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  // 使用重构后的hook
  const { state, actions } = useGradeImporter();
  
  // 解构状态
  const {
    currentStep,
    loading: isProcessing,
    fileData: uploadedData,
    mappingConfig,
    validationResult,
    importResult,
    importProgress: progress
  } = state;

  // 本地状态
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [fullFileData, setFullFileData] = useState<any>(null); // 保存完整的文件数据（包含AI解析结果）

  // ==================== 步骤处理函数 ====================

  // 1. 文件上传完成（智能处理）
  const handleFileUploaded = useCallback(async (fileData: any, fileInfo: any) => {
    console.log('文件上传完成:', fileData, fileInfo);
    
    // 检查 setFileData 是否存在
    if (typeof actions.setFileData === 'function') {
      // 保存完整的文件数据（包含AI解析结果）
      setFullFileData(fileData);
      
      // 直接使用 actions.setFileData 方法设置数据
      actions.setFileData(fileData.data || [], fileInfo.name);
      
      // 🤖 检查是否有AI解析结果，且置信度足够高可以自动处理
      const hasHighConfidenceAI = fileData.aiAnalysis && 
                                 fileData.aiAnalysis.confidence && 
                                 fileData.aiAnalysis.confidence > 0.85 && 
                                 !fileData.aiAnalysis.processing?.requiresUserInput;
      
      if (hasHighConfidenceAI) {
        console.log('[GradeImporter] 🚀 AI置信度足够高，启动自动处理流程');
        
        // 自动跳过字段映射，直接进入验证步骤
        actions.setCurrentStep('validation');
        setActiveTab('validation');
        
        toast.success(
          `AI智能处理完成！置信度: ${Math.round(fileData.aiAnalysis.confidence * 100)}%，已自动进入验证步骤`,
          { duration: 4000 }
        );
        
        // 可选：如果验证也能自动通过，可以直接进入导入步骤
        // 这里暂时保留验证步骤让用户确认
        
      } else {
        // 标准流程：进入字段映射步骤
        actions.setCurrentStep('mapping');
        setActiveTab('mapping');
        
        const message = fileData.aiAnalysis?.confidence 
          ? `文件上传成功，AI识别置信度: ${Math.round(fileData.aiAnalysis.confidence * 100)}%，请确认字段映射`
          : '文件上传成功，请进行字段映射';
        
        toast.success(message);
      }
    } else {
      console.error('actions.setFileData 不是一个函数:', typeof actions.setFileData);
      toast.error('文件上传处理失败：setFileData 方法不可用');
    }
  }, [actions]);

  // 2. 字段映射完成
  const handleMappingComplete = useCallback((config: any) => {
    actions.setMappingConfig(config);
    actions.setCurrentStep('validation');
    setActiveTab('validation');
  }, [actions]);

  // 3. 数据验证完成
  const handleValidationComplete = useCallback(async (result: ValidationResult, validData: any[]) => {
    // 保存验证结果
    actions.setValidationResult(result, validData);
    
    // 更新状态
    actions.setCurrentStep('import');
      setActiveTab('import');
    
    // 显示验证结果
    if (result.summary.errorRows > 0) {
      toast.warning(`数据验证完成，发现 ${result.summary.errorRows} 行错误数据`);
    } else {
      toast.success(`数据验证完成，共 ${result.summary.validRows} 行有效数据`);
    }
  }, [actions]);

  // 4. 开始导入
  const handleStartImport = useCallback(async () => {
    try {
      await actions.startImport();
      if (onDataImported && importResult) {
        onDataImported(importResult);
    }
    } catch (error) {
      console.error('导入失败:', error);
    }
  }, [actions, onDataImported, importResult]);

  // 重置整个流程
  const handleReset = useCallback(() => {
    actions.resetImport();
    setActiveTab('upload');
  }, [actions]);

  // ==================== 步骤状态计算 ====================

  const getStepStatus = (step: string) => {
    if (currentStep === step) return 'active';
    
    const stepOrder = ['upload', 'mapping', 'validation', 'import', 'completed'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    return 'pending';
  };

  const getStepIcon = (step: string) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  // ==================== 渲染组件 ====================

  return (
    <div className="w-full space-y-6">
      {/* 进度指示器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            成绩数据导入流程
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {[
                { key: 'upload', label: '文件上传', icon: Upload },
                { key: 'mapping', label: '字段映射', icon: MapPin },
                { key: 'validation', label: '数据验证', icon: Shield },
                { key: 'import', label: '数据导入', icon: Play },
              ].map(({ key, label, icon: Icon }) => (
                <div 
                  key={key}
                  className="flex items-center gap-2"
                >
                  {getStepIcon(key)}
                  <span className={`text-sm ${
                    getStepStatus(key) === 'active' 
                      ? 'font-semibold text-blue-600' 
                      : getStepStatus(key) === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                  {key !== 'import' && (
                    <div className="w-8 h-px bg-gray-300 mx-2" />
                  )}
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新开始
            </Button>
          </div>
          
          {/* 当前进度 */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>处理进度</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress 
                value={(progress.current / progress.total) * 100} 
                className="h-2"
              />
              <p className="text-xs text-gray-600">{progress.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger 
            value="upload" 
            disabled={getStepStatus('upload') === 'pending'}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            文件上传
          </TabsTrigger>
          <TabsTrigger 
            value="mapping" 
            disabled={getStepStatus('mapping') === 'pending'}
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            字段映射
          </TabsTrigger>
          <TabsTrigger 
            value="validation" 
            disabled={getStepStatus('validation') === 'pending'}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            数据验证
          </TabsTrigger>
          <TabsTrigger 
            value="import" 
            disabled={getStepStatus('import') === 'pending'}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            数据导入
          </TabsTrigger>
          <TabsTrigger 
            value="config" 
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            配置管理
          </TabsTrigger>
        </TabsList>

        {/* 文件上传 */}
        <TabsContent value="upload" className="space-y-4">
          <FileUploader
            onFileUploaded={handleFileUploaded}
            onError={(error) => {
              console.error('文件上传错误:', error);
              toast.error('文件上传失败: ' + error);
            }}
            disabled={isProcessing}
            acceptedFormats={['.xlsx', '.xls', '.csv']}
            maxFileSize={10}
          />
        </TabsContent>

        {/* 字段映射 */}
        <TabsContent value="mapping" className="space-y-4">
          {uploadedData && uploadedData.length > 0 ? (
            <DataMapper 
              headers={Object.keys(uploadedData[0] || {})}
              sampleData={uploadedData.slice(0, 5)}
              onMappingConfigured={handleMappingComplete}
              onError={(error) => {
                console.error('字段映射错误:', error);
                toast.error('字段映射失败: ' + error);
              }}
              loading={isProcessing}
              fileData={fullFileData} // 传递完整的文件数据，包含AI解析结果
            />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                请先上传文件数据
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* 数据验证 */}
        <TabsContent value="validation" className="space-y-4">
          {uploadedData && mappingConfig ? (
            <DataValidator 
              data={uploadedData}
              mappingConfig={mappingConfig}
              examInfo={state.examInfo || { title: '未命名考试', type: '月考', date: new Date().toISOString().split('T')[0] }}
              onValidationComplete={handleValidationComplete}
              onError={(error) => {
                console.error('数据验证错误:', error);
                toast.error('数据验证失败: ' + error);
              }}
              loading={isProcessing}
            />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                请先完成文件上传和字段映射
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* 数据导入 */}
        <TabsContent value="import" className="space-y-4">
          {state.validData && state.validData.length > 0 && mappingConfig && validationResult ? (
            <ImportProcessor 
              validData={state.validData}
              examInfo={state.examInfo || { title: '未命名考试', type: '月考', date: new Date().toISOString().split('T')[0] }}
              validationResult={validationResult}
              onImportComplete={handleStartImport}
              onError={(error) => {
                console.error('数据导入错误:', error);
                toast.error('数据导入失败: ' + error);
              }}
              loading={isProcessing}
            />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                请先完成前面的步骤：文件上传 → 字段映射 → 数据验证
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* 配置管理 */}
        <TabsContent value="config" className="space-y-4">
          <ConfigManager 
            currentConfig={state.importOptions}
            currentMappingConfig={mappingConfig}
            currentExamInfo={state.examInfo}
            onConfigChange={actions.setImportOptions}
            onMappingConfigChange={(config) => setMappingConfig(config)}
            onExamInfoChange={(info) => actions.setExamInfo(info)}
          />
        </TabsContent>
      </Tabs>

      {/* 结果显示 */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              导入结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.summary.importedRows}
                </div>
                <div className="text-sm text-gray-600">成功导入</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResult.summary.skippedRows}
                </div>
                <div className="text-sm text-gray-600">跳过记录</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.summary.errorRows}
                </div>
                <div className="text-sm text-gray-600">错误记录</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.summary.createdStudents}
                </div>
                <div className="text-sm text-gray-600">新增学生</div>
              </div>
            </div>
            
            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  导入过程中发现 {importResult.errors.length} 个错误，请检查数据质量。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GradeImporter; 