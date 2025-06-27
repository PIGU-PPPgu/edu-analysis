// 🔧 终极修复版本 - 移除Radix UI Tabs，使用纯div实现
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  UserFriendlyDataMapper,
  DataValidator,
  ImportProcessor,
  ConfigManager
} from './components';

// 导入错误边界
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

// 🔧 从AI分析结果中提取映射配置
const extractMappingFromAI = (aiAnalysis: any): MappingConfig | null => {
  try {
    if (!aiAnalysis?.fieldMappings && !aiAnalysis?.suggestedMappings) {
      return null;
    }

    const mappings = aiAnalysis.fieldMappings || aiAnalysis.suggestedMappings;
    
    // 转换为标准的 MappingConfig 格式
    const fieldMappings: Record<string, string> = {};
    
    if (Array.isArray(mappings)) {
      // 如果是数组格式
      mappings.forEach((mapping: any) => {
        if (mapping.sourceField && mapping.targetField) {
          fieldMappings[mapping.sourceField] = mapping.targetField;
        }
      });
    } else if (typeof mappings === 'object') {
      // 如果是对象格式
      Object.assign(fieldMappings, mappings);
    }

    return {
      fieldMappings,
      examInfo: aiAnalysis.examInfo || {
        title: '未命名考试',
        type: '月考',
        date: new Date().toISOString().split('T')[0]
      },
      options: {
        skipEmptyRows: true,
        validateData: true,
        createMissingStudents: true
      }
    };
  } catch (error) {
    console.error('提取AI映射配置失败:', error);
    return null;
  }
};

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

  // 本地状态 - 使用数字索引而不是字符串避免状态冲突
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [fullFileData, setFullFileData] = useState<any>(null);
  const [userInterfaceMode, setUserInterfaceMode] = useState<'simple' | 'advanced'>('simple');
  
  // 步骤定义
  const steps = [
    { id: 'upload', label: '文件上传', icon: Upload },
    { id: 'mapping', label: '字段映射', icon: MapPin },
    { id: 'validation', label: '数据验证', icon: Shield },
    { id: 'import', label: '数据导入', icon: Play },
    { id: 'config', label: '配置管理', icon: Settings }
  ];

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
      
      // 🔧 临时禁用AI自动跳转以修复DOM冲突
      // 所有文件都进入手动字段映射步骤，避免状态冲突
      console.log('[GradeImporter] 🔧 使用手动流程，避免DOM冲突');
      
      // 🔧 从AI分析结果中提取映射配置（仅用于预填充，不自动跳转）
      if (fileData.aiAnalysis) {
        const autoMappingConfig = extractMappingFromAI(fileData.aiAnalysis);
        if (autoMappingConfig) {
          // 预设映射配置，但不自动跳转
          actions.setMappingConfig(autoMappingConfig);
          console.log('[GradeImporter] ✅ 预设AI映射配置，等待用户确认');
        }
      }
      
      // 统一进入字段映射步骤（手动流程）
      actions.setCurrentStep('mapping');
      setActiveStepIndex(1);
      
      const message = fileData.aiAnalysis?.confidence 
        ? `文件上传成功，AI识别置信度: ${Math.round(fileData.aiAnalysis.confidence * 100)}%，请确认字段映射`
        : '文件上传成功，请进行字段映射';
      
      toast.success(message);
    } else {
      console.error('actions.setFileData 不是一个函数:', typeof actions.setFileData);
      toast.error('文件上传处理失败：setFileData 方法不可用');
    }
  }, [actions]);

  // 2. 字段映射完成
  const handleMappingComplete = useCallback((config: any) => {
    actions.setMappingConfig(config);
    actions.setCurrentStep('validation');
    setActiveStepIndex(2);
  }, [actions]);

  // 3. 数据验证完成
  const handleValidationComplete = useCallback(async (result: ValidationResult, validData: any[]) => {
    // 保存验证结果
    actions.setValidationResult(result, validData);
    
    // 更新状态
    actions.setCurrentStep('import');
    setActiveStepIndex(3);
    
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
    setActiveStepIndex(0);
    setFullFileData(null);
  }, [actions]);

  // 手动切换步骤
  const handleStepClick = useCallback((stepIndex: number) => {
    if (stepIndex <= activeStepIndex || stepIndex === 4) { // 配置管理可以随时访问
      setActiveStepIndex(stepIndex);
    }
  }, [activeStepIndex]);

  // ==================== 步骤状态计算 ====================

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex === activeStepIndex) return 'active';
    if (stepIndex < activeStepIndex) return 'completed';
    return 'pending';
  };

  const getStepIcon = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    
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
              {steps.slice(0, 4).map((step, index) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={step.id}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleStepClick(index)}
                  >
                    {getStepIcon(index)}
                    <span className={`text-sm ${
                      getStepStatus(index) === 'active' 
                        ? 'font-semibold text-blue-600' 
                        : getStepStatus(index) === 'completed'
                          ? 'text-green-600'
                          : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                    {index < 3 && (
                      <div className="w-8 h-px bg-gray-300 mx-2" />
                    )}
                  </div>
                );
              })}
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

      {/* 步骤切换按钮 */}
      <div className="flex gap-2 mb-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Button
              key={step.id}
              variant={index === activeStepIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStepClick(index)}
              disabled={index > activeStepIndex && index !== 4}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {step.label}
            </Button>
          );
        })}
      </div>

      {/* 主要内容区域 - 使用条件渲染而不是Tabs */}
      <div className="min-h-96">
        {/* 文件上传 */}
        {activeStepIndex === 0 && (
          <div className="space-y-4">
            <ErrorBoundary key="uploader">
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
            </ErrorBoundary>
          </div>
        )}

        {/* 字段映射 */}
        {activeStepIndex === 1 && (
          <div className="space-y-4">
            {uploadedData && uploadedData.length > 0 ? (
              <div className="space-y-4">
                {/* 界面模式选择 */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">数据确认模式</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          选择适合您的操作方式
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={userInterfaceMode === 'simple' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUserInterfaceMode('simple')}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          智能模式
                        </Button>
                        <Button
                          variant={userInterfaceMode === 'advanced' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUserInterfaceMode('advanced')}
                          className="flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          高级模式
                        </Button>
                      </div>
                    </div>
                    
                    {/* 模式说明 */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        {userInterfaceMode === 'simple' 
                          ? '🤖 智能模式：系统自动识别数据，用简单的方式确认即可，适合大多数用户' 
                          : '⚙️ 高级模式：提供详细的字段映射控制，适合有经验的用户进行精确配置'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 根据模式显示不同的组件 */}
                {userInterfaceMode === 'simple' ? (
                  <UserFriendlyDataMapper
                    headers={Object.keys(uploadedData[0] || {})}
                    sampleData={uploadedData.slice(0, 5)}
                    onMappingConfigured={handleMappingComplete}
                    onError={(error) => {
                      console.error('数据确认错误:', error);
                      toast.error('数据确认失败: ' + error);
                    }}
                    loading={isProcessing}
                    fileData={fullFileData}
                  />
                ) : (
                  <DataMapper 
                    headers={Object.keys(uploadedData[0] || {})}
                    sampleData={uploadedData.slice(0, 5)}
                    onMappingConfigured={handleMappingComplete}
                    onError={(error) => {
                      console.error('字段映射错误:', error);
                      toast.error('字段映射失败: ' + error);
                    }}
                    loading={isProcessing}
                    fileData={fullFileData}
                  />
                )}
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  请先上传文件数据
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 数据验证 */}
        {activeStepIndex === 2 && (
          <div className="space-y-4">
            {uploadedData && mappingConfig ? (
              <ErrorBoundary key="validator">
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
              </ErrorBoundary>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  请先完成文件上传和字段映射
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 数据导入 */}
        {activeStepIndex === 3 && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* 配置管理 */}
        {activeStepIndex === 4 && (
          <div className="space-y-4">
            <ConfigManager 
              currentConfig={state.importOptions}
              currentMappingConfig={mappingConfig}
              currentExamInfo={state.examInfo}
              onConfigChange={actions.setImportOptions}
              onMappingConfigChange={(config) => actions.setMappingConfig(config)}
              onExamInfoChange={(info) => actions.setExamInfo(info)}
            />
          </div>
        )}
      </div>

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