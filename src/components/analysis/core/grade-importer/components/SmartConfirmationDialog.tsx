/**
 * 🤖 SmartConfirmationDialog - 智能确认对话框
 * 
 * 用自然语言的方式引导用户确认和修正数据识别结果
 * 当检测到潜在问题或缺失数据时，主动提供解决方案
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle,
  Lightbulb,
  ArrowRight,
  Target,
  Eye,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 使用现有的类型定义
import type { MappingConfig } from '../types';

// 问题类型定义
export interface DetectedIssue {
  type: 'missing_field' | 'low_confidence' | 'duplicate_mapping' | 'inconsistent_data';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  fieldName?: string;
  suggestedFields: string[];
  autoFixAvailable: boolean;
}

// 修正建议
export interface FixSuggestion {
  issueId: string;
  action: 'map_field' | 'create_custom' | 'ignore' | 'manual_review';
  targetField: string;
  displayName: string;
  confidence: number;
  explanation: string;
}

export interface SmartConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  sampleData: any[];
  currentMapping: MappingConfig;
  detectedIssues: DetectedIssue[];
  onConfirm: (updatedMapping: MappingConfig, userFeedback: Record<string, any>) => void;
  onCancel: () => void;
}

const SmartConfirmationDialog: React.FC<SmartConfirmationProps> = ({
  open,
  onOpenChange,
  headers,
  sampleData,
  currentMapping,
  detectedIssues,
  onConfirm,
  onCancel
}) => {
  const [selectedFixes, setSelectedFixes] = useState<Record<string, FixSuggestion>>({});
  const [userFeedback, setUserFeedback] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // 重置状态当对话框打开时
  useEffect(() => {
    if (open) {
      setSelectedFixes({});
      setUserFeedback({});
      setCurrentStep(0);
    }
  }, [open]);

  // 生成修正建议
  const generateFixSuggestions = (issue: DetectedIssue): FixSuggestion[] => {
    const suggestions: FixSuggestion[] = [];
    
    switch (issue.type) {
      case 'missing_field':
        // 为缺失字段生成映射建议
        issue.suggestedFields.forEach((fieldName, index) => {
          const confidence = Math.max(0.9 - index * 0.2, 0.5);
          suggestions.push({
            issueId: `${issue.type}_${issue.fieldName}`,
            action: 'map_field',
            targetField: fieldName,
            displayName: getFieldDisplayName(fieldName),
            confidence,
            explanation: `将"${fieldName}"列映射为${issue.title}`
          });
        });
        
        // 添加创建自定义字段选项
        suggestions.push({
          issueId: `${issue.type}_${issue.fieldName}`,
          action: 'create_custom',
          targetField: `custom_${issue.fieldName}`,
          displayName: `自定义${issue.title}`,
          confidence: 0.7,
          explanation: `创建新的自定义字段来存储${issue.title}`
        });
        break;
        
      case 'low_confidence':
        // 为低置信度字段提供替代映射
        issue.suggestedFields.forEach((fieldName, index) => {
          suggestions.push({
            issueId: `${issue.type}_${issue.fieldName}`,
            action: 'map_field',
            targetField: fieldName,
            displayName: getFieldDisplayName(fieldName),
            confidence: 0.8 - index * 0.1,
            explanation: `将"${issue.fieldName}"重新映射为${getFieldDisplayName(fieldName)}`
          });
        });
        break;
        
      default:
        // 其他问题类型的通用处理
        suggestions.push({
          issueId: `${issue.type}_${issue.fieldName}`,
          action: 'manual_review',
          targetField: issue.fieldName || 'unknown',
          displayName: '手动检查',
          confidence: 0.5,
          explanation: '需要手动检查和确认'
        });
    }
    
    return suggestions;
  };

  // 获取字段显示名称
  const getFieldDisplayName = (fieldName: string): string => {
    const displayNames: Record<string, string> = {
      'total_score': '总分',
      'chinese_grade': '语文等级',
      'math_grade': '数学等级',
      'english_grade': '英语等级',
      'rank_in_class': '班级排名',
      'rank_in_grade': '年级排名',
      'rank_in_school': '学校排名'
    };
    return displayNames[fieldName] || fieldName;
  };

  // 处理修正选择
  const handleFixSelection = (issueId: string, suggestion: FixSuggestion) => {
    setSelectedFixes(prev => ({
      ...prev,
      [issueId]: suggestion
    }));
  };

  // 处理用户反馈
  const handleUserFeedback = (key: string, value: any) => {
    setUserFeedback(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 获取问题的严重程度颜色
  const getSeverityColor = (severity: DetectedIssue['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // 应用修正
  const handleConfirm = () => {
    const updatedMapping: MappingConfig = { ...currentMapping };
    
    // 应用选择的修正
    Object.values(selectedFixes).forEach(fix => {
      switch (fix.action) {
        case 'map_field':
          // 查找对应的原始字段名
          const originalField = headers.find(h => 
            h.toLowerCase().includes(fix.targetField.toLowerCase()) ||
            fix.targetField.toLowerCase().includes(h.toLowerCase())
          );
          if (originalField) {
            updatedMapping.fieldMappings[originalField] = fix.targetField;
          }
          break;
          
        case 'create_custom':
          updatedMapping.customFields[fix.targetField] = fix.displayName;
          break;
      }
    });

    onConfirm(updatedMapping, userFeedback);
  };

  const highPriorityIssues = detectedIssues.filter(issue => issue.severity === 'high');
  const mediumPriorityIssues = detectedIssues.filter(issue => issue.severity === 'medium');
  const lowPriorityIssues = detectedIssues.filter(issue => issue.severity === 'low');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            智能数据确认
          </DialogTitle>
          <DialogDescription>
            我们发现了一些需要您确认的问题，让我们一起来解决它们，确保数据完全正确。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* 高优先级问题 */}
            {highPriorityIssues.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-red-700">重要问题需要解决</h3>
                  <Badge variant="destructive" className="text-xs">
                    {highPriorityIssues.length} 个问题
                  </Badge>
                </div>
                
                {highPriorityIssues.map((issue, index) => {
                  const suggestions = generateFixSuggestions(issue);
                  const issueId = `${issue.type}_${issue.fieldName}_${index}`;
                  const selectedFix = selectedFixes[issueId];
                  
                  return (
                    <Alert key={issueId} className={cn("border-l-4", getSeverityColor(issue.severity))}>
                      <AlertDescription>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium">{issue.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          </div>
                          
                          {/* 修正建议选择 */}
                          {suggestions.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">请选择解决方案：</Label>
                              <div className="space-y-2">
                                {suggestions.map((suggestion, suggestionIndex) => (
                                  <div 
                                    key={suggestionIndex}
                                    className={cn(
                                      "p-3 border rounded-lg cursor-pointer transition-colors",
                                      selectedFix?.targetField === suggestion.targetField
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                    onClick={() => handleFixSelection(issueId, suggestion)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{suggestion.displayName}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(suggestion.confidence * 100)}% 匹配
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                          {suggestion.explanation}
                                        </p>
                                      </div>
                                      {selectedFix?.targetField === suggestion.targetField && (
                                        <CheckCircle className="w-5 h-5 text-blue-500" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  );
                })}
              </div>
            )}

            {/* 中优先级问题 */}
            {mediumPriorityIssues.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-orange-700">建议优化</h3>
                  <Badge variant="secondary" className="text-xs">
                    {mediumPriorityIssues.length} 个建议
                  </Badge>
                </div>
                
                {mediumPriorityIssues.map((issue, index) => {
                  const issueId = `${issue.type}_${issue.fieldName}_${index}`;
                  
                  return (
                    <Alert key={issueId} className={cn("border-l-4", getSeverityColor(issue.severity))}>
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{issue.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          </div>
                          {issue.autoFixAvailable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserFeedback(`auto_fix_${issueId}`, true)}
                              className={cn(
                                userFeedback[`auto_fix_${issueId}`] && "bg-blue-50 border-blue-500"
                              )}
                            >
                              <Target className="w-4 h-4 mr-2" />
                              自动修复
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  );
                })}
              </div>
            )}

            {/* 低优先级提示 */}
            {lowPriorityIssues.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-blue-700">提示信息</h3>
                  <Badge variant="outline" className="text-xs">
                    {lowPriorityIssues.length} 个提示
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {lowPriorityIssues.map((issue, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <h4 className="text-sm font-medium text-blue-800">{issue.title}</h4>
                      <p className="text-sm text-blue-700 mt-1">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无问题状态 */}
            {detectedIssues.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold text-green-700 mb-2">数据识别完美！</h3>
                <p className="text-gray-600">
                  没有发现任何问题，您可以直接继续导入数据。
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => onConfirm(currentMapping, userFeedback)}
            >
              跳过问题，继续导入
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={highPriorityIssues.some((_, index) => 
                !selectedFixes[`${highPriorityIssues[index].type}_${highPriorityIssues[index].fieldName}_${index}`]
              )}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              确认修正，继续导入
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SmartConfirmationDialog;