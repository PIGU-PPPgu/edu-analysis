/**
 * 🎯 UserFriendlyDataMapper - 用户友好的数据确认组件
 * 
 * 重构版本的DataMapper，专为非技术用户设计
 * 将"字段映射"转换为直观的"数据确认"流程
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Eye,
  Zap,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 导入新创建的组件
import DataPreviewCard from './DataPreviewCard';
import SmartConfirmationDialog from './SmartConfirmationDialog';
import MissingDataDetector from './MissingDataDetector';
import QuickFixSuggestions from './QuickFixSuggestions';
import UnmappedFieldsOnly from './UnmappedFieldsOnly';
import CompleteMappingViewer from './CompleteMappingViewer';

// 使用现有的类型定义
import type { 
  MappingConfig, 
  AIAnalysisResult,
  ValidationResult
} from '../types';

// 用户友好的流程步骤
type UserFlowStep = 'preview' | 'confirm' | 'enhance' | 'advanced' | 'complete' | 'full_view';

// 检测到的问题类型
interface DetectedIssue {
  type: 'missing_field' | 'low_confidence' | 'duplicate_mapping' | 'inconsistent_data';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  fieldName?: string;
  suggestedFields: string[];
  autoFixAvailable: boolean;
}

export interface UserFriendlyDataMapperProps {
  headers: string[];
  sampleData: any[];
  onMappingConfigured: (config: MappingConfig) => void;
  onError: (error: string) => void;
  loading?: boolean;
  initialMapping?: Record<string, string>;
  fileData?: {
    aiAnalysis?: AIAnalysisResult;
  };
}

const UserFriendlyDataMapper: React.FC<UserFriendlyDataMapperProps> = ({
  headers,
  sampleData,
  onMappingConfigured,
  onError,
  loading = false,
  initialMapping = {},
  fileData
}) => {
  // 流程状态
  const [currentStep, setCurrentStep] = useState<UserFlowStep>('preview');
  const [workingMapping, setWorkingMapping] = useState<MappingConfig>({
    fieldMappings: initialMapping,
    customFields: {},
    aiSuggestions: fileData?.aiAnalysis ? {
      confidence: fileData.aiAnalysis.confidence,
      suggestions: fileData.aiAnalysis.fieldMappings,
      issues: fileData.aiAnalysis.processing?.issues || []
    } : undefined
  });

  // 对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [detectedIssues, setDetectedIssues] = useState<DetectedIssue[]>([]);
  
  // 用户反馈状态
  const [userFeedback, setUserFeedback] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<UserFlowStep>>(new Set());

  // 检测数据质量问题
  const detectDataQualityIssues = useCallback((mapping: MappingConfig): DetectedIssue[] => {
    const issues: DetectedIssue[] = [];
    const fieldMappings = mapping.fieldMappings || {};

    // 1. 检查缺失的重要字段
    const importantFields = [
      { key: 'total_score', name: '总分', commonNames: ['总分', '总成绩', '合计'] },
      { key: 'rank_in_class', name: '班级排名', commonNames: ['班级排名', '班排名', '排名'] },
      { key: 'original_grade', name: '等级', commonNames: ['等级', '评级', '成绩等级'] }
    ];

    importantFields.forEach(field => {
      if (!Object.values(fieldMappings).includes(field.key)) {
        const suggestedHeaders = headers.filter(header => 
          field.commonNames.some(name => 
            header.toLowerCase().includes(name.toLowerCase())
          )
        );

        if (suggestedHeaders.length > 0) {
          issues.push({
            type: 'missing_field',
            severity: field.key === 'total_score' ? 'high' : 'medium',
            title: `可能缺少${field.name}`,
            description: `在您的文件中发现了可能的"${field.name}"数据，但没有被识别`,
            fieldName: field.key,
            suggestedFields: suggestedHeaders,
            autoFixAvailable: true
          });
        }
      }
    });

    // 2. 检查重复映射
    const mappedValues = Object.values(fieldMappings);
    const duplicates = mappedValues.filter((value, index) => mappedValues.indexOf(value) !== index);
    
    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_mapping',
        severity: 'high',
        title: '发现重复映射',
        description: `有多个字段被映射到同一个数据类型，这可能导致数据覆盖`,
        suggestedFields: duplicates,
        autoFixAvailable: true
      });
    }

    // 3. 检查AI置信度
    if (mapping.aiSuggestions && mapping.aiSuggestions.confidence < 0.7) {
      issues.push({
        type: 'low_confidence',
        severity: 'medium',
        title: 'AI识别置信度较低',
        description: '智能识别的准确性可能不够高，建议人工确认重要字段',
        suggestedFields: Object.keys(fieldMappings),
        autoFixAvailable: false
      });
    }

    return issues;
  }, [headers]);

  // 初始化检测问题
  useEffect(() => {
    if (headers.length > 0 && Object.keys(workingMapping.fieldMappings).length > 0) {
      const issues = detectDataQualityIssues(workingMapping);
      setDetectedIssues(issues);
    }
  }, [workingMapping, detectDataQualityIssues]);

  // 处理数据确认
  const handleDataConfirmed = (confirmedMapping: MappingConfig) => {
    setWorkingMapping(confirmedMapping);
    setCompletedSteps(prev => new Set([...prev, 'preview']));
    
    // 简化流程：直接进入确认步骤，不显示复杂的问题检测对话框
    setCurrentStep('enhance');
    toast.success('数据识别完成，请确认后继续');
  };

  // 处理需要帮助
  const handleNeedHelp = (missingData: string[]) => {
    setUserFeedback({ needHelp: missingData });
    setCurrentStep('enhance');
    toast.info('让我们来检查是否还有其他有用的数据');
  };

  // 处理高级设置
  const handleShowAdvanced = () => {
    setCurrentStep('advanced');
  };

  // 处理确认对话框结果
  const handleConfirmDialogResult = (
    updatedMapping: MappingConfig, 
    feedback: Record<string, any>
  ) => {
    setWorkingMapping(updatedMapping);
    setUserFeedback({ ...userFeedback, ...feedback });
    setShowConfirmDialog(false);
    setCompletedSteps(prev => new Set([...prev, 'confirm']));
    setCurrentStep('enhance');
    toast.success('问题已解决，继续优化数据');
  };

  // 处理缺失数据检测结果
  const handleMissingDataFound = (
    newMappings: Record<string, string>, 
    newCustomFields: Record<string, string>
  ) => {
    const updatedMapping: MappingConfig = {
      ...workingMapping,
      fieldMappings: { ...workingMapping.fieldMappings, ...newMappings },
      customFields: { ...workingMapping.customFields, ...newCustomFields }
    };
    
    setWorkingMapping(updatedMapping);
    setCompletedSteps(prev => new Set([...prev, 'enhance']));
    toast.success(`成功添加了 ${Object.keys(newMappings).length} 个字段`);
  };

  // 处理快速修复
  const handleQuickFix = (updatedMapping: MappingConfig, actionId: string) => {
    console.log('[UserFriendlyDataMapper] 应用快速修复:', { actionId, updatedMapping });
    
    // 更新映射配置
    setWorkingMapping(updatedMapping);
    
    // 重新检测问题
    const newIssues = detectDataQualityIssues(updatedMapping);
    setDetectedIssues(newIssues);
    
    // 显示成功消息
    toast.success(`快速修复已应用: ${actionId}`);
    
    // 如果所有问题都解决了，可以自动进入下一步
    if (newIssues.length === 0) {
      setCompletedSteps(prev => new Set([...prev, 'enhance']));
      toast.info('所有问题已解决，可以进行最终确认了！');
    }
  };

  // 最终确认配置
  const handleFinalConfirm = () => {
    // 验证最终配置
    const requiredFields = ['name']; // 最低要求只需要姓名
    const mappedFields = Object.values(workingMapping.fieldMappings);
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));

    if (missingRequired.length > 0) {
      onError(`缺少必需字段: ${missingRequired.join(', ')}`);
      return;
    }

    setCompletedSteps(prev => new Set([...prev, 'complete']));
    onMappingConfigured(workingMapping);
    toast.success('数据确认完成，开始导入！');
  };

  // 计算完成进度
  const getProgress = (): number => {
    const totalSteps = 3; // preview, enhance, complete
    const completed = completedSteps.size;
    return Math.round((completed / totalSteps) * 100);
  };

  // 获取当前步骤描述
  const getCurrentStepDescription = (): string => {
    switch (currentStep) {
      case 'preview': return '处理未映射字段 - 仅显示需要处理的问题';
      case 'confirm': return '解决发现的问题';
      case 'enhance': return '最终确认映射结果';
      case 'advanced': return '高级字段映射设置';
      case 'complete': return '完成数据确认';
      default: return '准备数据';
    }
  };

  return (
    <div className="space-y-6">
      {/* 进度指示器 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">数据确认流程</CardTitle>
              <CardDescription className="mt-1">
                {getCurrentStepDescription()}
              </CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {getProgress()}% 完成
            </Badge>
          </div>
          <Progress value={getProgress()} className="w-full mt-3" />
        </CardHeader>
      </Card>

      {/* 主要内容区域 */}
      <div className="space-y-6">
        {/* 步骤1: 仅显示未映射字段 - 根据用户明确要求 */}
        {currentStep === 'preview' && (
          <div className="space-y-4">
            {/* 视图切换按钮 */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">字段映射确认</h3>
                <p className="text-sm text-gray-600">请确认需要处理的字段映射</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('full_view')}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                查看完整映射结果
              </Button>
            </div>
            
            <UnmappedFieldsOnly
              headers={headers}
              sampleData={sampleData}
              initialMapping={workingMapping.fieldMappings}
              aiAnalysis={fileData?.aiAnalysis}
              onMappingConfigured={handleDataConfirmed}
              onError={(error) => {
                console.error('字段映射错误:', error);
                toast.error('字段映射失败: ' + error);
              }}
              loading={loading}
            />
          </div>
        )}

        {/* 完整映射结果查看器 */}
        {currentStep === 'full_view' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">完整映射结果</h3>
                <p className="text-sm text-gray-600">查看所有字段的映射状态和AI识别结果</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('preview')}
                className="flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                返回简化视图
              </Button>
            </div>
            
            <CompleteMappingViewer
              headers={headers}
              mappingConfig={workingMapping}
              aiAnalysis={fileData?.aiAnalysis}
              onMappingUpdate={(mapping) => {
                setWorkingMapping(mapping);
              }}
              onConfirm={handleDataConfirmed}
            />
          </div>
        )}

        {/* 步骤2: 简化的数据确认 - 不显示成功映射详情 */}
        {currentStep === 'enhance' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                字段映射完成
              </CardTitle>
              <CardDescription>
                所有字段处理完毕，可以继续数据导入
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 简化的统计信息 - 只显示数量，不显示具体成功映射 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-800">映射统计</h4>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {Object.keys(workingMapping.fieldMappings || {}).length}
                  </div>
                  <div className="text-sm text-gray-600">个字段已完成映射</div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleShowAdvanced}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  需要调整设置
                </Button>
                <Button 
                  onClick={handleFinalConfirm}
                  className="flex items-center gap-2 px-8"
                >
                  <ArrowRight className="w-4 h-4" />
                  确认无误，开始导入
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤3: 高级设置 (如果用户选择) */}
        {currentStep === 'advanced' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                高级字段映射设置
              </CardTitle>
              <CardDescription>
                为有经验的用户提供详细的字段映射控制
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <HelpCircle className="w-4 h-4" />
                <AlertDescription>
                  这里可以显示原有的DataMapper组件内容，
                  为需要精确控制的用户提供技术接口。
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setCurrentStep('preview')}>
                  返回简单模式
                </Button>
                <Button onClick={handleFinalConfirm}>
                  确认配置
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 完成步骤 */}
        {currentStep === 'complete' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold text-green-700 mb-2">
                    数据确认完成！
                  </h3>
                  <p className="text-gray-600 mb-4">
                    共识别 {Object.keys(workingMapping.fieldMappings).length} 个字段，
                    包含 {Object.keys(workingMapping.customFields || {}).length} 个自定义字段
                  </p>
                </div>
                
                {/* 最终确认摘要 */}
                <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium mb-2">导入摘要</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 学生信息字段: {Object.values(workingMapping.fieldMappings || {}).filter(v => ['name', 'student_id', 'class_name'].includes(String(v || ''))).length} 个</li>
                    <li>• 成绩数据字段: {Object.values(workingMapping.fieldMappings || {}).filter(v => String(v || '').includes('score')).length} 个</li>
                    <li>• 排名数据字段: {Object.values(workingMapping.fieldMappings || {}).filter(v => String(v || '').includes('rank')).length} 个</li>
                    <li>• 其他数据字段: {Object.keys(workingMapping.customFields || {}).length} 个</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleFinalConfirm}
                  className="px-8"
                  disabled={loading}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  开始导入数据
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 智能确认对话框 */}
      <SmartConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        headers={headers}
        sampleData={sampleData}
        currentMapping={workingMapping}
        detectedIssues={detectedIssues}
        onConfirm={handleConfirmDialogResult}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* 底部操作栏 */}
      {currentStep !== 'complete' && (
        <Card className="border-t-2 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HelpCircle className="w-4 h-4" />
                如果数据识别有误，可以点击
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm"
                  onClick={handleShowAdvanced}
                >
                  手动调整
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserFriendlyDataMapper;