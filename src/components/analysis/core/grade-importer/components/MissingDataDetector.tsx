/**
 * 🔍 MissingDataDetector - 缺失数据检测器
 * 
 * 智能检测用户可能需要但系统没有识别到的数据字段
 * 基于教育数据的常见模式，主动提醒用户可能缺失的重要信息
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  AlertTriangle, 
  Lightbulb,
  Target,
  TrendingUp,
  Calculator,
  Trophy,
  Users,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 使用现有的类型定义
import type { MappingConfig } from '../types';

// 常见的缺失数据类型
export interface MissingDataPattern {
  category: 'scores' | 'grades' | 'rankings' | 'statistics' | 'metadata';
  fieldKey: string;
  displayName: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  icon: React.ComponentType<any>;
  commonNames: string[];
  detectionLogic: (headers: string[], mappings: Record<string, string>) => boolean;
  suggestedSources?: string[];
}

// 检测结果
export interface MissingDataResult {
  pattern: MissingDataPattern;
  confidence: number;
  suggestedHeaders: string[];
  reason: string;
}

export interface MissingDataDetectorProps {
  headers: string[];
  sampleData: any[];
  currentMapping: MappingConfig;
  onDataFound: (fieldMapping: Record<string, string>, customFields: Record<string, string>) => void;
  onSkip: () => void;
}

const MissingDataDetector: React.FC<MissingDataDetectorProps> = ({
  headers,
  sampleData,
  currentMapping,
  onDataFound,
  onSkip
}) => {
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [userDismissed, setUserDismissed] = useState<Set<string>>(new Set());

  // 定义常见的缺失数据模式
  const missingDataPatterns: MissingDataPattern[] = [
    {
      category: 'scores',
      fieldKey: 'total_score',
      displayName: '总分',
      description: '学生的总成绩，通常是各科成绩的总和',
      importance: 'high',
      icon: Calculator,
      commonNames: ['总分', '总成绩', '合计', '总计', 'total', 'sum'],
      detectionLogic: (headers, mappings) => {
        return !Object.values(mappings).includes('total_score') && 
               Object.values(mappings).some(v => v.includes('score'));
      }
    },
    {
      category: 'rankings',
      fieldKey: 'rank_in_class',
      displayName: '班级排名',
      description: '学生在班级中的排名位置',
      importance: 'high',
      icon: Trophy,
      commonNames: ['班级排名', '班排名', '班内排名', '排名', 'rank'],
      detectionLogic: (headers, mappings) => {
        return !Object.values(mappings).some(v => v.includes('rank')) &&
               Object.values(mappings).includes('total_score');
      }
    },
    {
      category: 'rankings',
      fieldKey: 'rank_in_grade',
      displayName: '年级排名',
      description: '学生在年级中的排名位置',
      importance: 'medium',
      icon: TrendingUp,
      commonNames: ['年级排名', '年排名', '级排名', '全年级排名'],
      detectionLogic: (headers, mappings) => {
        return !Object.values(mappings).includes('rank_in_grade') &&
               Object.values(mappings).includes('rank_in_class');
      }
    },
    {
      category: 'grades',
      fieldKey: 'original_grade',
      displayName: '等级评定',
      description: '成绩等级，如A+、A、B+等',
      importance: 'medium',
      icon: BookOpen,
      commonNames: ['等级', '评级', '成绩等级', 'grade', '级别'],
      detectionLogic: (headers, mappings) => {
        return !Object.values(mappings).some(v => v.includes('grade')) &&
               Object.values(mappings).some(v => v.includes('score'));
      }
    },
    {
      category: 'metadata',
      fieldKey: 'exam_title',
      displayName: '考试名称',
      description: '本次考试的标题或名称',
      importance: 'low',
      icon: Users,
      commonNames: ['考试名称', '考试标题', '考试', '测试名称', 'exam'],
      detectionLogic: (headers, mappings) => {
        return !Object.values(mappings).includes('exam_title');
      }
    }
  ];

  // 检测缺失的数据
  const detectMissingData = (): MissingDataResult[] => {
    const results: MissingDataResult[] = [];
    const mappedFields = currentMapping.fieldMappings || {};
    
    missingDataPatterns.forEach(pattern => {
      if (userDismissed.has(pattern.fieldKey)) return;
      
      // 检测是否缺失
      if (pattern.detectionLogic(headers, mappedFields)) {
        // 查找可能匹配的字段
        const suggestedHeaders = headers.filter(header => {
          const headerLower = header.toLowerCase();
          return pattern.commonNames.some(name => 
            headerLower.includes(name.toLowerCase()) ||
            name.toLowerCase().includes(headerLower)
          );
        });

        // 计算置信度
        let confidence = 0.5;
        if (suggestedHeaders.length > 0) {
          confidence = Math.min(0.9, 0.5 + suggestedHeaders.length * 0.2);
        }

        results.push({
          pattern,
          confidence,
          suggestedHeaders,
          reason: generateReason(pattern, suggestedHeaders, mappedFields)
        });
      }
    });

    return results.sort((a, b) => {
      // 按重要性和置信度排序
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      const aScore = importanceOrder[a.pattern.importance] * a.confidence;
      const bScore = importanceOrder[b.pattern.importance] * b.confidence;
      return bScore - aScore;
    });
  };

  // 生成检测原因说明
  const generateReason = (
    pattern: MissingDataPattern, 
    suggestedHeaders: string[], 
    mappedFields: Record<string, string>
  ): string => {
    if (suggestedHeaders.length > 0) {
      return `发现可能的"${pattern.displayName}"字段：${suggestedHeaders.join('、')}`;
    }
    
    switch (pattern.fieldKey) {
      case 'total_score':
        return '您已导入科目成绩，通常还会有总分数据';
      case 'rank_in_class':
        return '有总分数据的考试通常也包含排名信息';
      case 'rank_in_grade':
        return '有班级排名的考试可能也包含年级排名';
      case 'original_grade':
        return '成绩数据通常还包含等级评定（A、B、C等）';
      default:
        return `建议检查是否有"${pattern.displayName}"相关数据`;
    }
  };

  // 获取重要性颜色
  const getImportanceColor = (importance: MissingDataPattern['importance']) => {
    switch (importance) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      case 'low': return 'border-blue-200 bg-blue-50';
    }
  };

  // 获取重要性标签
  const getImportanceBadge = (importance: MissingDataPattern['importance']) => {
    switch (importance) {
      case 'high': return <Badge variant="destructive" className="text-xs">重要</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">建议</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">可选</Badge>;
    }
  };

  // 处理字段映射选择
  const handleFieldMapping = (patternKey: string, headerName: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [patternKey]: headerName
    }));
  };

  // 忽略某个建议
  const handleDismiss = (patternKey: string) => {
    setUserDismissed(prev => new Set([...prev, patternKey]));
  };

  // 确认添加字段
  const handleConfirmMappings = () => {
    const newFieldMappings: Record<string, string> = {};
    const newCustomFields: Record<string, string> = {};
    
    Object.entries(selectedMappings).forEach(([patternKey, headerName]) => {
      const pattern = missingDataPatterns.find(p => p.fieldKey === patternKey);
      if (pattern) {
        newFieldMappings[headerName] = pattern.fieldKey;
        
        // 如果是自定义字段，添加到customFields
        if (!['student_id', 'name', 'class_name', 'total_score', 'rank_in_class', 'rank_in_grade', 'original_grade'].includes(pattern.fieldKey)) {
          newCustomFields[pattern.fieldKey] = pattern.displayName;
        }
      }
    });

    onDataFound(newFieldMappings, newCustomFields);
  };

  const missingDataResults = useMemo(() => detectMissingData(), [headers, currentMapping, userDismissed]);

  if (missingDataResults.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-green-700 mb-2">数据完整性很好！</h3>
            <p className="text-gray-600">
              没有发现明显缺失的数据字段，您可以继续处理。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" />
          智能数据检查
        </CardTitle>
        <CardDescription>
          我们发现您的数据可能还包含一些有用的信息，请确认是否需要导入这些数据
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 检测结果列表 */}
        <div className="space-y-4">
          {missingDataResults.map((result) => {
            const IconComponent = result.pattern.icon;
            const isSelected = selectedMappings[result.pattern.fieldKey];
            
            return (
              <Alert 
                key={result.pattern.fieldKey} 
                className={cn("border-l-4", getImportanceColor(result.pattern.importance))}
              >
                <AlertDescription>
                  <div className="space-y-3">
                    {/* 标题和重要性 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {result.pattern.displayName}
                            {getImportanceBadge(result.pattern.importance)}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {result.pattern.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(result.pattern.fieldKey)}
                      >
                        忽略
                      </Button>
                    </div>

                    {/* 检测原因 */}
                    <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <Lightbulb className="w-4 h-4 inline mr-2 text-orange-500" />
                        {result.reason}
                      </p>
                    </div>

                    {/* 字段选择 */}
                    {result.suggestedHeaders.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          请选择对应的字段：
                        </Label>
                        <Select
                          value={selectedMappings[result.pattern.fieldKey] || ''}
                          onValueChange={(value) => handleFieldMapping(result.pattern.fieldKey, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择字段..." />
                          </SelectTrigger>
                          <SelectContent>
                            {result.suggestedHeaders.map((header) => (
                              <SelectItem key={header} value={header}>
                                <div className="flex items-center gap-2">
                                  <span>{header}</span>
                                  {sampleData[0]?.[header] && (
                                    <Badge variant="outline" className="text-xs">
                                      示例: {String(sampleData[0][header]).slice(0, 10)}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Alert className="bg-gray-50">
                        <HelpCircle className="w-4 h-4" />
                        <AlertDescription className="text-sm">
                          没有找到明显匹配的字段。如果您的文件中确实包含"{result.pattern.displayName}"，
                          您可以稍后在高级设置中手动指定。
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 选择确认 */}
                    {isSelected && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">
                          已选择：{isSelected} → {result.pattern.displayName}
                        </span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onSkip}>
            跳过，使用当前数据
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setUserDismissed(new Set(missingDataResults.map(r => r.pattern.fieldKey)))}
            >
              全部忽略
            </Button>
            <Button 
              onClick={handleConfirmMappings}
              disabled={Object.keys(selectedMappings).length === 0}
              className="min-w-[120px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加 {Object.keys(selectedMappings).length} 个字段
            </Button>
          </div>
        </div>

        {/* 帮助提示 */}
        <Alert>
          <HelpCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>提示：</strong>
            这些都是可选的数据字段。如果您不确定是否需要，可以先跳过，稍后在数据分析中发现需要时再重新导入。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default MissingDataDetector;