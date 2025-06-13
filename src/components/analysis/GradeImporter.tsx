import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CheckCircle,
  AlertTriangle,
  Upload,
  Mapping,
  CheckSquare,
  Download,
  RotateCcw,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FileUploader,
  DataMapper,
  DataValidator,
  ImportProcessor,
  ConfigManager,
  useGradeImporter
} from './core/grade-importer';
import type {
  ExamInfo,
  MappingConfig,
  ValidationResult,
  ImportResult,
  ImportStep
} from './core/grade-importer';

// GradeImporter 主组件
const GradeImporter: React.FC = () => {
  const { state, actions } = useGradeImporter();
  const [showConfigManager, setShowConfigManager] = useState(false);

  // 步骤配置
  const steps = [
    {
      id: 'upload' as ImportStep,
      title: '文件上传',
      description: '上传Excel或CSV格式的成绩文件',
      icon: Upload,
      component: FileUploader
    },
    {
      id: 'mapping' as ImportStep,
      title: '字段映射',
      description: '配置文件字段与系统字段的对应关系',
      icon: Mapping,
      component: DataMapper
    },
    {
      id: 'validation' as ImportStep,
      title: '数据验证',
      description: '验证数据质量，检查错误和警告',
      icon: CheckSquare,
      component: DataValidator
    },
    {
      id: 'import' as ImportStep,
      title: '导入处理',
      description: '执行数据导入，监控进度和结果',
      icon: Download,
      component: ImportProcessor
    },
    {
      id: 'complete' as ImportStep,
      title: '导入完成',
      description: '查看导入结果和统计信息',
      icon: CheckCircle,
      component: null
    }
  ];

  // 获取当前步骤配置
  const currentStepConfig = steps.find(step => step.id === state.currentStep);
  const currentStepIndex = steps.findIndex(step => step.id === state.currentStep);

  // 处理文件上传完成
  const handleFileUploadComplete = (fileData: any[], file: File) => {
    toast.success('文件上传成功');
    actions.nextStep();
  };

  // 处理字段映射完成
  const handleMappingComplete = (mappingConfig: MappingConfig) => {
    actions.setMappingConfig(mappingConfig);
    toast.success('字段映射配置完成');
    actions.nextStep();
  };

  // 处理数据验证完成
  const handleValidationComplete = (result: ValidationResult, validData: any[]) => {
    if (result.isValid || result.errors.length === 0) {
      toast.success('数据验证通过');
      actions.nextStep();
    } else {
      toast.warning(`发现 ${result.errors.length} 个错误，请修复后继续`);
    }
  };

  // 处理导入完成
  const handleImportComplete = (result: ImportResult) => {
    toast.success(`导入完成！成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
    actions.nextStep();
  };

  // 处理考试信息设置
  const handleExamInfoSet = (examInfo: ExamInfo) => {
    actions.setExamInfo(examInfo);
  };

  // 处理错误
  const handleError = (error: string) => {
    actions.setError(error);
    toast.error(error);
  };

  // 计算整体进度
  const calculateOverallProgress = () => {
    const stepWeights = {
      upload: 20,
      mapping: 25,
      validation: 25,
      import: 25,
      complete: 5
    };

    let totalProgress = 0;
    
    // 已完成步骤的进度
    state.stepsCompleted.forEach(step => {
      totalProgress += stepWeights[step] || 0;
    });

    // 当前步骤的进度
    if (state.currentStep !== 'complete') {
      const currentStepWeight = stepWeights[state.currentStep] || 0;
      let currentStepProgress = 0;

      switch (state.currentStep) {
        case 'upload':
          currentStepProgress = state.parseProgress;
          break;
        case 'mapping':
          currentStepProgress = state.mappingProgress;
          break;
        case 'validation':
          currentStepProgress = state.validationProgress;
          break;
        case 'import':
          currentStepProgress = state.importProgress.percentage;
          break;
      }

      totalProgress += (currentStepWeight * currentStepProgress) / 100;
    } else {
      totalProgress = 100;
    }

    return Math.min(totalProgress, 100);
  };

  const overallProgress = calculateOverallProgress();

  // 渲染步骤指示器
  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === state.currentStep;
        const isCompleted = state.stepsCompleted.includes(step.id);
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors",
                  isActive && "border-blue-500 bg-blue-50 text-blue-600",
                  isCompleted && "border-green-500 bg-green-50 text-green-600",
                  !isActive && !isCompleted && "border-gray-300 bg-gray-50 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-sm font-medium",
                  isActive && "text-blue-600",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-gray-500"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 max-w-[120px] break-words">
                  {step.description}
                </p>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4 transition-colors",
                state.stepsCompleted.includes(step.id) ? "bg-green-300" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // 渲染当前步骤内容
  const renderCurrentStep = () => {
    if (!currentStepConfig) {
      return <div>未知步骤</div>;
    }

    const Component = currentStepConfig.component;

    if (!Component) {
      // 完成步骤
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              导入完成
            </CardTitle>
            <CardDescription>
              成绩数据导入已完成，您可以查看导入结果
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.importResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{state.importResult.totalCount}</p>
                  <p className="text-sm text-gray-600">总记录数</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{state.importResult.successCount}</p>
                  <p className="text-sm text-gray-600">成功导入</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{state.importResult.failedCount}</p>
                  <p className="text-sm text-gray-600">导入失败</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((state.importResult.successCount / state.importResult.totalCount) * 100)}%
                  </p>
                  <p className="text-sm text-gray-600">成功率</p>
                </Card>
              </div>
            )}
            
            <div className="flex gap-4 justify-center">
              <Button onClick={actions.resetImport}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重新导入
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // 渲染对应的组件
    const componentProps: any = {
      onError: handleError
    };

    switch (state.currentStep) {
      case 'upload':
        return (
          <Component
            onFileUploaded={handleFileUploadComplete}
            onError={handleError}
            loading={state.loading}
          />
        );

      case 'mapping':
        return (
          <Component
            data={state.fileData}
            onMappingComplete={handleMappingComplete}
            onExamInfoSet={handleExamInfoSet}
            onError={handleError}
            loading={state.loading}
          />
        );

      case 'validation':
        return (
          <Component
            data={state.fileData}
            mappingConfig={state.mappingConfig!}
            examInfo={state.examInfo!}
            onValidationComplete={handleValidationComplete}
            onError={handleError}
            loading={state.loading}
          />
        );

      case 'import':
        return (
          <Component
            validData={state.validData}
            examInfo={state.examInfo!}
            validationResult={state.validationResult!}
            onImportComplete={handleImportComplete}
            onError={handleError}
            loading={state.loading}
          />
        );

      default:
        return <div>未知步骤</div>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">成绩数据导入</h1>
          <p className="text-gray-600 mt-2">
            上传并导入学生成绩数据，支持Excel和CSV格式文件
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConfigManager(!showConfigManager)}
          >
            配置管理
          </Button>
          <Button variant="outline" onClick={actions.resetImport}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>
      </div>

      {/* 整体进度 */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">整体进度</span>
          <span className="text-sm text-gray-600">{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </Card>

      {/* 错误提示 */}
      {state.error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      {/* 配置管理器 */}
      {showConfigManager && (
        <ConfigManager
          currentConfig={state.importOptions}
          currentMappingConfig={state.mappingConfig}
          currentExamInfo={state.examInfo}
          onConfigChange={actions.setImportOptions}
          onMappingConfigChange={actions.setMappingConfig}
          onExamInfoChange={actions.setExamInfo}
        />
      )}

      {/* 步骤指示器 */}
      {renderStepIndicator()}

      {/* 当前步骤内容 */}
      <div className="min-h-[600px]">
        {renderCurrentStep()}
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={actions.previousStep}
          disabled={currentStepIndex === 0 || state.loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          上一步
        </Button>

        <div className="flex gap-2">
          {state.currentStep !== 'complete' && state.currentStep !== 'import' && (
            <Button
              onClick={actions.nextStep}
              disabled={
                (state.currentStep === 'upload' && !state.selectedFile) ||
                (state.currentStep === 'mapping' && !state.mappingConfig) ||
                (state.currentStep === 'validation' && !state.validationResult?.isValid) ||
                state.loading
              }
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              下一步
            </Button>
          )}
        </div>
      </div>

      {/* 状态信息 */}
      {state.loading && (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">
              {state.currentStep === 'upload' && '正在解析文件...'}
              {state.currentStep === 'mapping' && '正在分析字段...'}
              {state.currentStep === 'validation' && '正在验证数据...'}
              {state.currentStep === 'import' && '正在导入数据...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeImporter; 