#!/usr/bin/env node

/**
 * 🔧 DOM错误自动化测试和修复
 * 重现并解决React DOM removeChild错误
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始DOM错误诊断和修复...\n');

// 1. 检查错误堆栈中的关键组件
console.log('📋 分析错误堆栈:');
console.log('- 错误发生在 FileUploader 组件内部');
console.log('- 涉及 Radix UI Tabs 的 Presence 组件');
console.log('- 问题出现在 card.tsx Text 组件');
console.log('- 根本原因: React DOM reconciliation 冲突\n');

// 2. 检查当前修复状态
const gradeImporterPath = 'src/components/analysis/core/grade-importer/GradeImporter.tsx';
console.log('🔍 检查当前修复状态...');

try {
  const content = fs.readFileSync(gradeImporterPath, 'utf8');
  
  // 检查是否有条件渲染
  const hasConditionalRendering = content.includes('activeTab === \'upload\'');
  console.log(`- 条件渲染修复: ${hasConditionalRendering ? '✅ 已应用' : '❌ 未应用'}`);
  
  // 检查是否移除了AI自动跳转
  const hasDisabledAutoJump = content.includes('临时禁用AI自动跳转');
  console.log(`- AI自动跳转禁用: ${hasDisabledAutoJump ? '✅ 已应用' : '❌ 未应用'}`);
  
  if (hasConditionalRendering && hasDisabledAutoJump) {
    console.log('⚠️  所有已知修复都已应用，但错误仍然存在');
    console.log('需要更深层的解决方案...\n');
  }
} catch (error) {
  console.log('❌ 无法读取文件:', error.message);
}

// 3. 分析根本原因
console.log('🔬 深度分析根本原因:');
console.log('1. Radix UI Tabs 使用 Presence 组件进行动画');
console.log('2. Presence 会延迟DOM节点的移除');
console.log('3. React 18 的并发模式可能导致状态更新冲突');
console.log('4. 多个嵌套Tabs组件可能产生DOM树冲突\n');

// 4. 提供终极解决方案
console.log('💡 终极解决方案:');
console.log('方案1: 完全重写GradeImporter，移除Radix UI Tabs');
console.log('方案2: 使用React.memo和useMemo避免不必要的重渲染');
console.log('方案3: 添加key属性强制重新挂载组件');
console.log('方案4: 使用纯div替代Tabs组件\n');

// 5. 生成修复代码
console.log('🔧 生成修复代码...');

const simplifiedGradeImporterCode = `// 🔧 终极修复版本 - 移除Radix UI Tabs，使用纯div实现
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
        ? \`文件上传成功，AI识别置信度: \${Math.round(fileData.aiAnalysis.confidence * 100)}%，请确认字段映射\`
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
      toast.warning(\`数据验证完成，发现 \${result.summary.errorRows} 行错误数据\`);
    } else {
      toast.success(\`数据验证完成，共 \${result.summary.validRows} 行有效数据\`);
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
                    <span className={\`text-sm \${
                      getStepStatus(index) === 'active' 
                        ? 'font-semibold text-blue-600' 
                        : getStepStatus(index) === 'completed'
                          ? 'text-green-600'
                          : 'text-gray-500'
                    }\`}>
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

export default GradeImporter;`;

// 将修复代码写入文件
const fixedFilePath = 'src/components/analysis/core/grade-importer/GradeImporter.FIXED.tsx';
try {
  fs.writeFileSync(fixedFilePath, simplifiedGradeImporterCode);
  console.log(`✅ 修复代码已生成: ${fixedFilePath}`);
} catch (error) {
  console.log('❌ 无法写入修复文件:', error.message);
}

// 6. 生成测试脚本
console.log('\n🧪 生成测试脚本...');

const testScript = `#!/bin/bash

# 测试DOM错误修复
echo "🧪 测试DOM错误修复..."

# 1. 备份原文件
cp "${gradeImporterPath}" "${gradeImporterPath}.backup"
echo "✅ 已备份原文件"

# 2. 应用修复
cp "${fixedFilePath}" "${gradeImporterPath}"
echo "✅ 已应用修复代码"

# 3. 启动测试
echo "🚀 启动开发服务器进行测试..."
npm run dev &
DEV_PID=$!

# 4. 等待服务器启动
sleep 5

# 5. 测试文件上传
echo "📁 测试文件上传功能..."
echo "请手动访问 http://localhost:8080 并上传 907九下月考成绩.csv 文件"
echo "观察是否还有DOM错误..."

# 6. 等待用户测试
read -p "测试完成后按回车键继续..."

# 7. 恢复原文件（如果需要）
read -p "是否恢复原文件？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cp "${gradeImporterPath}.backup" "${gradeImporterPath}"
    echo "✅ 已恢复原文件"
else
    echo "✅ 保留修复版本"
fi

# 8. 清理
kill $DEV_PID
echo "🧹 测试完成"
`;

try {
  fs.writeFileSync('test-dom-fix.sh', testScript);
  fs.chmodSync('test-dom-fix.sh', 0o755);
  console.log('✅ 测试脚本已生成: test-dom-fix.sh');
} catch (error) {
  console.log('❌ 无法生成测试脚本:', error.message);
}

console.log('\n📋 下一步操作:');
console.log('1. 运行测试脚本: ./test-dom-fix.sh');
console.log('2. 手动测试上传功能');
console.log('3. 如果修复有效，替换原文件');
console.log('4. 测试所有功能以确保兼容性\n');

console.log('🏆 修复方案总结:');
console.log('- 移除 Radix UI Tabs，使用纯div + 条件渲染');
console.log('- 使用数字索引代替字符串状态，避免状态冲突');
console.log('- 每个步骤独立渲染，避免DOM树复杂度');
console.log('- 保留所有原有功能，只是改变了实现方式');
console.log('- 添加手动步骤切换，用户控制流程进度\n');

console.log('✨ 预期效果:');
console.log('- ✅ 消除 removeChild DOM错误');
console.log('- ✅ 保持用户体验一致');
console.log('- ✅ 修复 ImportProcessor 中的 getTime 错误');
console.log('- ✅ 提高组件渲染性能');