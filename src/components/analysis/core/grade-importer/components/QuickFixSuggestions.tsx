/**
 *  QuickFixSuggestions - 快速修复建议组件
 * 
 * 提供一键修复功能，快速解决常见的数据映射问题
 * 基于常见错误模式，提供智能化的修复建议
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Wand2,
  Target,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  Settings,
  FileText,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 使用现有的类型定义
import type { MappingConfig } from '../types';

// 快速修复类型定义
export interface QuickFixAction {
  id: string;
  title: string;
  description: string;
  category: 'mapping' | 'validation' | 'optimization' | 'structure';
  severity: 'error' | 'warning' | 'suggestion';
  icon: React.ComponentType<any>;
  autoFixable: boolean;
  estimatedTime: string;
  impact: 'high' | 'medium' | 'low';
  fix: QuickFix;
}

export interface QuickFix {
  type: 'add_mapping' | 'remove_mapping' | 'update_mapping' | 'add_custom_field' | 'reorganize_mappings';
  params: {
    fieldMappings?: Record<string, string>;
    customFields?: Record<string, string>;
    removeFields?: string[];
    reorganizeRules?: any;
  };
  preview: string;
  reasoning: string;
}

export interface QuickFixSuggestionsProps {
  headers: string[];
  sampleData: any[];
  currentMapping: MappingConfig;
  validationErrors?: any[];
  onApplyFix: (updatedMapping: MappingConfig, actionId: string) => void;
  onDismiss: (actionId: string) => void;
}

const QuickFixSuggestions: React.FC<QuickFixSuggestionsProps> = ({
  headers,
  sampleData,
  currentMapping,
  validationErrors = [],
  onApplyFix,
  onDismiss
}) => {
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // 生成快速修复建议
  const generateQuickFixes = (): QuickFixAction[] => {
    console.log('[QuickFixSuggestions] 生成修复建议:', { currentMapping });
    const fixes: QuickFixAction[] = [];
    const fieldMappings = currentMapping.fieldMappings || {};
    const customFields = currentMapping.customFields || {};

    // 1. 检查重复映射
    const mappedValues = Object.values(fieldMappings);
    const duplicates = mappedValues.filter((value, index) => mappedValues.indexOf(value) !== index);
    
    if (duplicates.length > 0) {
      fixes.push({
        id: 'fix_duplicate_mappings',
        title: '修复重复映射',
        description: `发现${duplicates.length}个字段被重复映射，这可能导致数据覆盖`,
        category: 'mapping',
        severity: 'error',
        icon: AlertTriangle,
        autoFixable: true,
        estimatedTime: '< 1分钟',
        impact: 'high',
        fix: {
          type: 'remove_mapping',
          params: {
            removeFields: findDuplicateFields(fieldMappings, duplicates)
          },
          preview: `移除重复映射的字段：${findDuplicateFields(fieldMappings, duplicates).join(', ')}`,
          reasoning: '保留最合适的映射，移除重复的字段映射'
        }
      });
    }

    // 2. 检查常见科目字段的智能分组
    const subjectFields = Object.entries(fieldMappings).filter(([_, mapped]) => {
      const mappedStr = String(mapped || '');
      return mappedStr.includes('score') || mappedStr.includes('grade');
    });
    
    if (subjectFields.length >= 3) {
      const unorganizedSubjects = checkSubjectOrganization(subjectFields);
      if (unorganizedSubjects.length > 0) {
        fixes.push({
          id: 'organize_subject_fields',
          title: '优化科目字段组织',
          description: '自动组织和标准化科目字段映射，提高数据一致性',
          category: 'optimization',
          severity: 'suggestion',
          icon: TrendingUp,
          autoFixable: true,
          estimatedTime: '< 30秒',
          impact: 'medium',
          fix: {
            type: 'reorganize_mappings',
            params: {
              fieldMappings: generateStandardizedSubjectMappings(subjectFields),
              customFields: generateSubjectCustomFields(subjectFields)
            },
            preview: `标准化${unorganizedSubjects.length}个科目字段的映射格式`,
            reasoning: '统一科目字段命名规范，便于后续数据分析'
          }
        });
      }
    }

    // 3. 检查缺失的必需字段
    const requiredFields = ['name'];
    const missingRequired = requiredFields.filter(field => 
      !Object.values(fieldMappings).includes(field)
    );
    
    if (missingRequired.length > 0) {
      const suggestedMappings = findSuggestedMappings(headers, missingRequired);
      if (Object.keys(suggestedMappings).length > 0) {
        fixes.push({
          id: 'add_missing_required',
          title: '添加缺失的必需字段',
          description: `发现${missingRequired.length}个必需字段未映射，这可能影响数据导入`,
          category: 'mapping',
          severity: 'error',
          icon: Target,
          autoFixable: true,
          estimatedTime: '< 30秒',
          impact: 'high',
          fix: {
            type: 'add_mapping',
            params: {
              fieldMappings: suggestedMappings
            },
            preview: `添加映射：${Object.entries(suggestedMappings).map(([k, v]) => `${k} → ${v}`).join(', ')}`,
            reasoning: '必需字段是数据导入的基础，缺失会导致导入失败'
          }
        });
      }
    }

    // 4. 检查置信度低的映射
    if (currentMapping.aiSuggestions && currentMapping.aiSuggestions.confidence < 0.7) {
      const lowConfidenceFields = Object.entries(fieldMappings).filter(([original, _]) => {
        return getFieldConfidence(original, currentMapping.aiSuggestions) < 0.6;
      });

      if (lowConfidenceFields.length > 0) {
        fixes.push({
          id: 'review_low_confidence',
          title: '检查低置信度映射',
          description: `${lowConfidenceFields.length}个字段的映射置信度较低，建议人工确认`,
          category: 'validation',
          severity: 'warning',
          icon: Lightbulb,
          autoFixable: false,
          estimatedTime: '2-3分钟',
          impact: 'medium',
          fix: {
            type: 'update_mapping',
            params: {},
            preview: `需要人工确认：${lowConfidenceFields.map(([k, _]) => k).join(', ')}`,
            reasoning: '低置信度的映射可能不准确，确认后可提高数据质量'
          }
        });
      }
    }

    // 5. 检查数据类型不匹配
    const typeMismatches = checkDataTypeMismatches(fieldMappings, sampleData);
    if (typeMismatches.length > 0) {
      fixes.push({
        id: 'fix_type_mismatches',
        title: '修复数据类型不匹配',
        description: `发现${typeMismatches.length}个字段的数据类型与预期不符`,
        category: 'validation',
        severity: 'warning',
        icon: RefreshCw,
        autoFixable: true,
        estimatedTime: '< 1分钟',
        impact: 'medium',
        fix: {
          type: 'update_mapping',
          params: {
            fieldMappings: generateTypeCorrectedMappings(typeMismatches)
          },
          preview: `修正类型：${typeMismatches.map(m => m.field).join(', ')}`,
          reasoning: '正确的数据类型映射确保数据能被正确处理和分析'
        }
      });
    }

    // 6. 检查宽表格优化机会
    if (currentMapping.wideTableFormat?.detected && subjectFields.length > 5) {
      fixes.push({
        id: 'optimize_wide_table',
        title: '优化宽表格处理',
        description: '检测到宽表格格式，可以优化字段映射以提高处理效率',
        category: 'structure',
        severity: 'suggestion',
        icon: Settings,
        autoFixable: true,
        estimatedTime: '< 1分钟',
        impact: 'low',
        fix: {
          type: 'reorganize_mappings',
          params: {
            fieldMappings: optimizeWideTableMappings(fieldMappings, currentMapping.wideTableFormat)
          },
          preview: '优化宽表格字段映射结构',
          reasoning: '优化后的映射结构处理更高效，便于数据转换'
        }
      });
    }

    return fixes.filter(fix => 
      !appliedFixes.has(fix.id) && !dismissedSuggestions.has(fix.id)
    );
  };

  // 辅助函数：查找重复字段
  const findDuplicateFields = (mappings: Record<string, string>, duplicates: string[]): string[] => {
    const duplicateFields: string[] = [];
    duplicates.forEach(duplicate => {
      const fields = Object.entries(mappings)
        .filter(([_, mapped]) => mapped === duplicate)
        .map(([original, _]) => original);
      
      // 保留第一个，移除其他的
      duplicateFields.push(...fields.slice(1));
    });
    return duplicateFields;
  };

  // 辅助函数：检查科目组织
  const checkSubjectOrganization = (subjectFields: [string, string][]): string[] => {
    return subjectFields
      .filter(([original, mapped]) => !mapped.includes('_score') && !mapped.includes('_grade'))
      .map(([original, _]) => original);
  };

  // 辅助函数：生成标准化科目映射
  const generateStandardizedSubjectMappings = (subjectFields: [string, string][]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    const subjectMap: Record<string, string> = {
      '语文': 'chinese_score',
      '数学': 'math_score',
      '英语': 'english_score',
      '物理': 'physics_score',
      '化学': 'chemistry_score',
      '生物': 'biology_score',
      '政治': 'politics_score',
      '历史': 'history_score',
      '地理': 'geography_score'
    };

    subjectFields.forEach(([original, _]) => {
      const subject = Object.keys(subjectMap).find(s => original.includes(s));
      if (subject) {
        mappings[original] = subjectMap[subject];
      }
    });

    return mappings;
  };

  // 辅助函数：生成科目自定义字段
  const generateSubjectCustomFields = (subjectFields: [string, string][]): Record<string, string> => {
    const customFields: Record<string, string> = {};
    // 这里可以根据需要生成自定义字段
    return customFields;
  };

  // 辅助函数：查找建议映射
  const findSuggestedMappings = (headers: string[], missingFields: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    const fieldPatterns: Record<string, string[]> = {
      'name': ['姓名', '学生姓名', '考生姓名', 'name'],
      'student_id': ['学号', '考生号', '学生号', 'id', 'student_id'],
      'class_name': ['班级', '所在班级', '现班', 'class']
    };

    missingFields.forEach(field => {
      const patterns = fieldPatterns[field] || [];
      const matchedHeader = headers.find(header => 
        patterns.some(pattern => 
          header.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(header.toLowerCase())
        )
      );
      if (matchedHeader) {
        mappings[matchedHeader] = field;
      }
    });

    return mappings;
  };

  // 辅助函数：获取字段置信度
  const getFieldConfidence = (fieldName: string, aiSuggestions?: any): number => {
    if (!aiSuggestions) return 0.5;
    // 这里可以实现更复杂的置信度计算逻辑
    return aiSuggestions.confidence || 0.5;
  };

  // 辅助函数：检查数据类型不匹配
  const checkDataTypeMismatches = (mappings: Record<string, string>, sampleData: any[]): any[] => {
    const mismatches: any[] = [];
    // 实现数据类型检查逻辑
    return mismatches;
  };

  // 辅助函数：生成类型修正映射
  const generateTypeCorrectedMappings = (mismatches: any[]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    // 实现类型修正逻辑
    return mappings;
  };

  // 辅助函数：优化宽表格映射
  const optimizeWideTableMappings = (mappings: Record<string, string>, wideTableFormat: any): Record<string, string> => {
    // 实现宽表格优化逻辑
    return mappings;
  };

  // 应用修复
  const handleApplyFix = (action: QuickFixAction) => {
    console.log('[QuickFixSuggestions] 开始应用修复:', { actionId: action.id, action });
    const updatedMapping: MappingConfig = { ...currentMapping };

    switch (action.fix.type) {
      case 'add_mapping':
        updatedMapping.fieldMappings = {
          ...updatedMapping.fieldMappings,
          ...action.fix.params.fieldMappings
        };
        break;
      case 'remove_mapping':
        action.fix.params.removeFields?.forEach(field => {
          delete updatedMapping.fieldMappings[field];
        });
        break;
      case 'update_mapping':
        updatedMapping.fieldMappings = {
          ...updatedMapping.fieldMappings,
          ...action.fix.params.fieldMappings
        };
        break;
      case 'add_custom_field':
        updatedMapping.customFields = {
          ...updatedMapping.customFields,
          ...action.fix.params.customFields
        };
        break;
      case 'reorganize_mappings':
        if (action.fix.params.fieldMappings) {
          updatedMapping.fieldMappings = action.fix.params.fieldMappings;
        }
        if (action.fix.params.customFields) {
          updatedMapping.customFields = {
            ...updatedMapping.customFields,
            ...action.fix.params.customFields
          };
        }
        break;
    }

    setAppliedFixes(prev => new Set([...prev, action.id]));
    console.log('[QuickFixSuggestions] 修复完成，调用回调:', { updatedMapping, actionId: action.id });
    onApplyFix(updatedMapping, action.id);
  };

  // 忽略建议
  const handleDismiss = (actionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, actionId]));
    onDismiss(actionId);
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: QuickFixAction['severity']) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-orange-200 bg-orange-50';
      case 'suggestion': return 'border-blue-200 bg-blue-50';
    }
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: QuickFixAction['severity']) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <Lightbulb className="w-4 h-4 text-orange-500" />;
      case 'suggestion': return <TrendingUp className="w-4 h-4 text-blue-500" />;
    }
  };

  const quickFixes = useMemo(() => generateQuickFixes(), [
    headers, 
    sampleData, 
    currentMapping, 
    appliedFixes, 
    dismissedSuggestions
  ]);

  if (quickFixes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-green-700 mb-2">映射配置很棒！</h3>
            <p className="text-gray-600">
              没有发现需要优化的问题，您的数据映射配置已经很好了。
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
          <Zap className="w-5 h-5 text-yellow-500" />
          快速修复建议
        </CardTitle>
        <CardDescription>
          我们发现了一些可以快速改进的地方，点击应用即可自动修复
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {quickFixes.map((action) => {
              const IconComponent = action.icon;
              
              return (
                <Alert 
                  key={action.id} 
                  className={cn("border-l-4", getSeverityColor(action.severity))}
                >
                  <AlertDescription>
                    <div className="space-y-3">
                      {/* 标题和严重程度 */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <IconComponent className="w-5 h-5 text-gray-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{action.title}</h4>
                              {getSeverityIcon(action.severity)}
                              <Badge variant="outline" className="text-xs">
                                {action.estimatedTime}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 修复预览 */}
                      <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <ArrowRight className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">修复预览：</span>
                          <span className="text-gray-700">{action.fix.preview}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {action.fix.reasoning}
                        </p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={action.impact === 'high' ? 'default' : 'outline'} 
                            className="text-xs"
                          >
                            {action.impact === 'high' ? '高影响' : 
                             action.impact === 'medium' ? '中影响' : '低影响'}
                          </Badge>
                          {action.autoFixable && (
                            <Badge variant="secondary" className="text-xs">
                              <Wand2 className="w-3 h-3 mr-1" />
                              自动修复
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismiss(action.id)}
                          >
                            忽略
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplyFix(action)}
                            disabled={!action.autoFixable}
                          >
                            {action.autoFixable ? '应用修复' : '手动处理'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default QuickFixSuggestions;