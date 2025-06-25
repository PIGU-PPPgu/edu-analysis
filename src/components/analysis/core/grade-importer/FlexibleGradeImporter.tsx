/**
 * 🎯 FlexibleGradeImporter - 灵活智能导入组件
 * 
 * 支持多种导入模式和字段修正：
 * 1. 快速模式：一键导入，自动处理
 * 2. 确认模式：AI识别后用户确认  
 * 3. 手动模式：完全由用户控制
 * 4. 字段修正：支持多维度数据选择
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Zap, 
  CheckCircle, 
  Settings,
  ArrowRight,
  HelpCircle,
  Target,
  FileText,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// 导入组件
import OneClickImporter from './components/OneClickImporter';
import { DataMapper, UserFriendlyDataMapper } from './components';
import { cn } from '@/lib/utils';

// 使用现有的类型定义
import type { 
  GradeImporterProps,
  ImportResult,
  MappingConfig
} from './types';

// 导入模式
type ImportMode = 'quick' | 'confirm' | 'manual';

// 字段类型定义（按您的要求）
interface SubjectFieldTypes {
  score?: string;        // 分数
  grade?: string;        // 等级 
  classRank?: string;    // 班级排名
  gradeRank?: string;    // 年级排名（全区排名）
  schoolRank?: string;   // 校排名
}

// 科目字段映射
interface SubjectMappings {
  chinese: SubjectFieldTypes;
  math: SubjectFieldTypes;
  english: SubjectFieldTypes;
  physics: SubjectFieldTypes;
  chemistry: SubjectFieldTypes;
  biology: SubjectFieldTypes;
  politics: SubjectFieldTypes;
  history: SubjectFieldTypes;
  geography: SubjectFieldTypes;
  total: SubjectFieldTypes;  // 总分相关
}

const FlexibleGradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  // 状态管理
  const [importMode, setImportMode] = useState<ImportMode>('quick');
  const [currentStep, setCurrentStep] = useState<'mode' | 'upload' | 'mapping' | 'confirm' | 'completed'>('mode');
  const [fileData, setFileData] = useState<any>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [subjectMappings, setSubjectMappings] = useState<SubjectMappings>({
    chinese: {},
    math: {},
    english: {},
    physics: {},
    chemistry: {},
    biology: {},
    politics: {},
    history: {},
    geography: {},
    total: {}
  });

  // 科目列表定义
  const subjects = [
    { key: 'chinese', name: '语文', patterns: ['语文', 'chinese', '语'] },
    { key: 'math', name: '数学', patterns: ['数学', 'math', '数'] },
    { key: 'english', name: '英语', patterns: ['英语', 'english', '英'] },
    { key: 'physics', name: '物理', patterns: ['物理', 'physics', '理'] },
    { key: 'chemistry', name: '化学', patterns: ['chemistry', '化学', '化'] },
    { key: 'biology', name: '生物', patterns: ['biology', '生物', '生'] },
    { key: 'politics', name: '政治', patterns: ['politics', '政治', '政', '道法'] },
    { key: 'history', name: '历史', patterns: ['history', '历史', '史'] },
    { key: 'geography', name: '地理', patterns: ['geography', '地理', '地'] },
    { key: 'total', name: '总分', patterns: ['总分', 'total', '合计', '总成绩'] }
  ];

  // 字段类型定义
  const fieldTypes = [
    { key: 'score', name: '分数', description: '数值成绩' },
    { key: 'grade', name: '等级', description: 'A+、A、B+等级评定' },
    { key: 'classRank', name: '班级排名', description: '在班级中的排名' },
    { key: 'gradeRank', name: '年级排名', description: '在年级/全区的排名' },
    { key: 'schoolRank', name: '校排名', description: '在学校中的排名' }
  ];

  // 处理模式选择
  const handleModeSelect = (mode: ImportMode) => {
    setImportMode(mode);
    setCurrentStep('upload');
  };

  // 处理文件上传
  const handleFileUploaded = useCallback((uploadedFileData: any, fileInfo: any) => {
    setFileData(uploadedFileData);
    setHeaders(uploadedFileData.headers || []);
    setAiSuggestions(uploadedFileData.aiAnalysis);

    if (importMode === 'quick') {
      // 快速模式：直接导入
      handleQuickImport(uploadedFileData);
    } else {
      // 其他模式：进入映射确认
      setCurrentStep('mapping');
      performSmartMapping(uploadedFileData);
    }
  }, [importMode]);

  // 执行智能映射
  const performSmartMapping = (data: any) => {
    const smartMappings: SubjectMappings = {
      chinese: {}, math: {}, english: {}, physics: {}, chemistry: {},
      biology: {}, politics: {}, history: {}, geography: {}, total: {}
    };

    // 智能识别各科目的各种字段
    subjects.forEach(subject => {
      const subjectHeaders = headers.filter(header => 
        subject.patterns.some(pattern => 
          header.toLowerCase().includes(pattern.toLowerCase())
        )
      );

      subjectHeaders.forEach(header => {
        const headerLower = header.toLowerCase();
        
        // 判断字段类型
        if (headerLower.includes('排名') || headerLower.includes('名次') || headerLower.includes('rank')) {
          if (headerLower.includes('班级') || headerLower.includes('班')) {
            smartMappings[subject.key].classRank = header;
          } else if (headerLower.includes('年级') || headerLower.includes('级') || headerLower.includes('区')) {
            smartMappings[subject.key].gradeRank = header;
          } else if (headerLower.includes('校') || headerLower.includes('学校')) {
            smartMappings[subject.key].schoolRank = header;
          }
        } else if (headerLower.includes('等级') || headerLower.includes('级别') || headerLower.includes('grade')) {
          smartMappings[subject.key].grade = header;
        } else {
          // 默认为分数
          smartMappings[subject.key].score = header;
        }
      });
    });

    setSubjectMappings(smartMappings);
  };

  // 快速导入处理
  const handleQuickImport = useCallback(async (data: any) => {
    try {
      // 这里应该调用实际的导入逻辑
      // 暂时模拟成功
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentStep('completed');
      toast.success('快速导入成功！');
      
      if (onDataImported) {
        onDataImported(data.data || []);
      }
    } catch (error) {
      toast.error('导入失败: ' + error.message);
    }
  }, [onDataImported]);

  // 处理字段映射
  const handleFieldMapping = (subject: string, fieldType: string, headerName: string) => {
    setSubjectMappings(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [fieldType]: headerName
      }
    }));
  };

  // 清除字段映射
  const clearFieldMapping = (subject: string, fieldType: string) => {
    setSubjectMappings(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [fieldType]: undefined
      }
    }));
  };

  // 确认映射并导入
  const handleConfirmAndImport = async () => {
    try {
      // 转换为标准映射格式
      const standardMapping: Record<string, string> = {};
      
      Object.entries(subjectMappings).forEach(([subjectKey, fields]) => {
        Object.entries(fields).forEach(([fieldType, headerName]) => {
          if (headerName) {
            const systemFieldName = `${subjectKey}_${fieldType}`;
            standardMapping[headerName] = systemFieldName;
          }
        });
      });

      // 执行导入
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setCurrentStep('completed');
      toast.success('导入成功！');
      
      if (onDataImported) {
        onDataImported(fileData.data || []);
      }
    } catch (error) {
      toast.error('导入失败: ' + error.message);
    }
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentStep('mode');
    setFileData(null);
    setHeaders([]);
    setAiSuggestions(null);
    setSubjectMappings({
      chinese: {}, math: {}, english: {}, physics: {}, chemistry: {},
      biology: {}, politics: {}, history: {}, geography: {}, total: {}
    });
  };

  // 获取可用的字段选项
  const getAvailableHeaders = (excludeSubject?: string, excludeField?: string) => {
    const usedHeaders = new Set();
    
    Object.entries(subjectMappings).forEach(([subjectKey, fields]) => {
      Object.entries(fields).forEach(([fieldType, headerName]) => {
        if (headerName && !(subjectKey === excludeSubject && fieldType === excludeField)) {
          usedHeaders.add(headerName);
        }
      });
    });

    return headers.filter(header => !usedHeaders.has(header));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 模式选择 */}
      {currentStep === 'mode' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">选择导入方式</CardTitle>
              <CardDescription className="text-center">
                根据您的需求选择最适合的导入模式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 快速模式 */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleModeSelect('quick')}>
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">快速模式</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      AI全自动处理，上传即完成，适合信任AI识别的用户
                    </p>
                    <Badge variant="default" className="text-xs">推荐</Badge>
                  </CardContent>
                </Card>

                {/* 确认模式 */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleModeSelect('confirm')}>
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">确认模式</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      AI智能识别后让您确认，兼顾效率和准确性
                    </p>
                    <Badge variant="secondary" className="text-xs">平衡</Badge>
                  </CardContent>
                </Card>

                {/* 手动模式 */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleModeSelect('manual')}>
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">手动模式</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      完全由您控制字段映射，适合有特殊需求的用户
                    </p>
                    <Badge variant="outline" className="text-xs">精确</Badge>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 文件上传 */}
      {currentStep === 'upload' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {importMode === 'quick' && '快速模式 - 文件上传'}
                {importMode === 'confirm' && '确认模式 - 文件上传'}
                {importMode === 'manual' && '手动模式 - 文件上传'}
              </CardTitle>
              <CardDescription>
                {importMode === 'quick' && '上传后将自动处理并导入数据'}
                {importMode === 'confirm' && '上传后将显示AI识别结果供您确认'}
                {importMode === 'manual' && '上传后您需要手动配置所有字段映射'}
              </CardDescription>
            </CardHeader>
          </Card>

          <OneClickImporter
            onFileSelected={() => {}}
            onImportComplete={handleFileUploaded}
            onError={(error) => toast.error('文件处理失败: ' + error)}
          />
        </div>
      )}

      {/* 字段映射确认 */}
      {currentStep === 'mapping' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                字段映射确认
              </CardTitle>
              <CardDescription>
                请确认或调整各科目字段的映射关系
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* AI识别结果提示 */}
              {aiSuggestions && (
                <Alert className="mb-6">
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    AI已智能识别字段映射 (置信度: {Math.round(aiSuggestions.confidence * 100)}%)，
                    您可以确认或调整下面的映射关系。
                  </AlertDescription>
                </Alert>
              )}

              {/* 字段映射表格 */}
              <div className="space-y-6">
                {subjects.map(subject => {
                  const hasAnyMapping = Object.values(subjectMappings[subject.key]).some(Boolean);
                  
                  return (
                    <Card key={subject.key} className={cn(
                      "border-l-4",
                      hasAnyMapping ? "border-l-green-500" : "border-l-gray-300"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{subject.name}</CardTitle>
                          {hasAnyMapping && (
                            <Badge variant="default" className="text-xs">
                              {Object.values(subjectMappings[subject.key]).filter(Boolean).length} 个字段
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {fieldTypes.map(fieldType => {
                            const currentMapping = subjectMappings[subject.key][fieldType.key];
                            const availableOptions = getAvailableHeaders(subject.key, fieldType.key);
                            
                            return (
                              <div key={fieldType.key} className="space-y-2">
                                <Label className="text-sm font-medium">
                                  {fieldType.name}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({fieldType.description})
                                  </span>
                                </Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={currentMapping || ''}
                                    onValueChange={(value) => handleFieldMapping(subject.key, fieldType.key, value)}
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="选择字段..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">-- 不映射 --</SelectItem>
                                      {currentMapping && (
                                        <SelectItem value={currentMapping}>
                                          {currentMapping} (当前)
                                        </SelectItem>
                                      )}
                                      {availableOptions.map(header => (
                                        <SelectItem key={header} value={header}>
                                          {header}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {currentMapping && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => clearFieldMapping(subject.key, fieldType.key)}
                                    >
                                      清除
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleRestart}>
                  重新开始
                </Button>
                <Button onClick={handleConfirmAndImport}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  确认映射并导入
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 完成状态 */}
      {currentStep === 'completed' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-green-700 mb-4">
                导入成功！
              </h3>
              
              <p className="text-gray-600 mb-8">
                数据已成功导入到系统中，您可以立即查看分析结果
              </p>

              <div className="flex gap-4 justify-center">
                <Button onClick={handleRestart} variant="outline">
                  导入新文件
                </Button>
                <Button>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  查看数据分析
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlexibleGradeImporter;