/**
 *  UnmappedFieldsOnly - 仅显示未映射字段的组件
 * 
 * 专门用于第二步字段映射，只显示需要用户处理的问题字段
 * 不显示成功映射的字段，减少信息干扰
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Target,
  ArrowRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import type { MappingConfig } from '../types';

// 预定义字段选项
const FIELD_OPTIONS = {
  student_info: {
    label: '学生信息',
    fields: {
      name: '学生姓名',
      student_id: '学号', 
      class_name: '班级',
      grade_level: '年级'
    }
  },
  scores: {
    label: '成绩字段',
    fields: {
      chinese_score: '语文成绩',
      math_score: '数学成绩',
      english_score: '英语成绩',
      physics_score: '物理成绩',
      chemistry_score: '化学成绩',
      biology_score: '生物成绩',
      politics_score: '政治成绩',
      history_score: '历史成绩',
      geography_score: '地理成绩',
      total_score: '总分'
    }
  },
  performance: {
    label: '排名等级',
    fields: {
      rank_in_class: '班级排名',
      rank_in_grade: '年级排名',
      rank_in_school: '学校排名',
      original_grade: '等级'
    }
  }
};

export interface UnmappedFieldsOnlyProps {
  headers: string[];
  sampleData: any[];
  initialMapping?: Record<string, string>;
  aiAnalysis?: any;
  onMappingConfigured: (config: MappingConfig) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

const UnmappedFieldsOnly: React.FC<UnmappedFieldsOnlyProps> = ({
  headers,
  sampleData,
  initialMapping = {},
  aiAnalysis,
  onMappingConfigured,
  onError,
  loading = false
}) => {
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>(initialMapping);
  const [customFieldName, setCustomFieldName] = useState('');

  // 生成智能建议
  const generateSuggestion = (header: string): string => {
    const headerLower = header.toLowerCase();
    
    // 学生信息建议
    if (headerLower.includes('姓名') || headerLower.includes('name')) return 'name';
    if (headerLower.includes('学号') || headerLower.includes('id')) return 'student_id';
    if (headerLower.includes('班级') || headerLower.includes('class')) return 'class_name';
    
    // 科目成绩建议
    if (headerLower.includes('语文')) return headerLower.includes('等级') ? 'chinese_grade' : 'chinese_score';
    if (headerLower.includes('数学')) return headerLower.includes('等级') ? 'math_grade' : 'math_score';
    if (headerLower.includes('英语')) return headerLower.includes('等级') ? 'english_grade' : 'english_score';
    if (headerLower.includes('物理')) return 'physics_score';
    if (headerLower.includes('化学')) return 'chemistry_score';
    if (headerLower.includes('生物')) return 'biology_score';
    if (headerLower.includes('政治') || headerLower.includes('道法')) return 'politics_score';
    if (headerLower.includes('历史')) return 'history_score';
    if (headerLower.includes('地理')) return 'geography_score';
    if (headerLower.includes('总分') || headerLower.includes('总成绩')) return 'total_score';
    
    // 排名建议
    if (headerLower.includes('班级排名') || headerLower.includes('班排')) return 'rank_in_class';
    if (headerLower.includes('年级排名') || headerLower.includes('级排')) return 'rank_in_grade';
    if (headerLower.includes('等级') && !headerLower.includes('年级')) return 'original_grade';
    
    return '';
  };

  // 获取字段显示名称
  const getFieldDisplayName = (fieldKey: string): string => {
    for (const category of Object.values(FIELD_OPTIONS)) {
      if (category.fields[fieldKey]) {
        return category.fields[fieldKey];
      }
    }
    return fieldKey;
  };

  // 分析字段状态
  const { unmappedFields, mappedCount } = useMemo(() => {
    const unmapped = headers.filter(header => !currentMapping[header]);
    const mapped = headers.filter(header => currentMapping[header]);
    
    return {
      unmappedFields: unmapped.map(header => ({
        header,
        suggestion: generateSuggestion(header),
        dataPreview: sampleData.slice(0, 3).map(row => row[header]).filter(val => val != null)
      })),
      mappedCount: mapped.length
    };
  }, [headers, currentMapping, sampleData]);

  // 处理字段映射
  const handleFieldMapping = (header: string, targetField: string) => {
    const newMapping = { ...currentMapping };
    if (targetField === 'ignore') {
      delete newMapping[header];
    } else {
      newMapping[header] = targetField;
    }
    setCurrentMapping(newMapping);
  };

  // 应用智能建议
  const handleApplySuggestion = (header: string, suggestion: string) => {
    if (suggestion) {
      handleFieldMapping(header, suggestion);
      toast.success(`已映射: ${header} → ${getFieldDisplayName(suggestion)}`);
    }
  };

  // 添加自定义字段
  const handleAddCustomField = (header: string) => {
    if (!customFieldName.trim()) {
      toast.error('请输入自定义字段名称');
      return;
    }
    
    const newMapping = { ...currentMapping };
    newMapping[header] = `custom_${customFieldName}`;
    setCurrentMapping(newMapping);
    setCustomFieldName('');
    toast.success(`添加自定义字段: ${customFieldName}`);
  };

  // 批量应用建议
  const handleAutoFix = () => {
    const newMapping = { ...currentMapping };
    let fixedCount = 0;

    unmappedFields.forEach(field => {
      if (field.suggestion) {
        newMapping[field.header] = field.suggestion;
        fixedCount++;
      }
    });

    setCurrentMapping(newMapping);
    toast.success(`自动修复了 ${fixedCount} 个字段映射`);
  };

  // 完成配置
  const handleComplete = () => {
    const mappingConfig: MappingConfig = {
      fieldMappings: currentMapping,
      examInfo: {
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

    onMappingConfigured(mappingConfig);
  };

  const hasUnmappedFields = unmappedFields.length > 0;
  const hasAutoFixSuggestions = unmappedFields.some(f => f.suggestion);

  return (
    <div className="space-y-6">
      {/* 状态概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                字段映射检查
              </CardTitle>
              <CardDescription>
                {hasUnmappedFields 
                  ? `${unmappedFields.length} 个字段需要处理，${mappedCount} 个已识别`
                  : '所有字段已完成映射'}
              </CardDescription>
            </div>
            {hasAutoFixSuggestions && (
              <Button onClick={handleAutoFix} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                自动修复 {unmappedFields.filter(f => f.suggestion).length} 个
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{unmappedFields.length}</div>
              <div className="text-sm text-gray-600">需要处理</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{mappedCount}</div>
              <div className="text-sm text-gray-600">已识别</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 未映射字段列表 */}
      {hasUnmappedFields ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">
              <AlertTriangle className="w-5 h-5 inline mr-2" />
              需要处理的字段 ({unmappedFields.length})
            </CardTitle>
            <CardDescription>
              请为这些字段选择映射，或选择忽略
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unmappedFields.map((field, index) => (
              <Alert key={field.header} className="border-red-200">
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800">"{field.header}"</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          数据示例: {field.dataPreview.join(', ') || '无数据'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">选择映射字段:</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Select
                          value={currentMapping[field.header] || ''}
                          onValueChange={(value) => handleFieldMapping(field.header, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择字段..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(FIELD_OPTIONS).map(([categoryKey, category]) => (
                              <div key={categoryKey}>
                                <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100">
                                  {category.label}
                                </div>
                                {Object.entries(category.fields).map(([fieldKey, fieldName]) => (
                                  <SelectItem key={fieldKey} value={fieldKey}>
                                    {fieldName}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                            <SelectItem value="ignore" className="text-gray-500">
                              忽略此字段
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {field.suggestion && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplySuggestion(field.header, field.suggestion)}
                            className="text-blue-600"
                          >
                            <Target className="w-4 h-4 mr-1" />
                            使用建议: {getFieldDisplayName(field.suggestion)}
                          </Button>
                        )}
                      </div>

                      {/* 自定义字段选项 */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="自定义字段名..."
                          value={customFieldName}
                          onChange={(e) => setCustomFieldName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCustomField(field.header)}
                          disabled={!customFieldName.trim()}
                        >
                          <Plus className="w-4 h-4" />
                          添加自定义
                        </Button>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <div className="text-green-600 mb-2">
                 所有字段已完成映射
              </div>
              <p className="text-sm text-gray-600">
                共识别 {mappedCount} 个字段，可以继续下一步
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 底部操作 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {hasUnmappedFields 
                ? `还有 ${unmappedFields.length} 个字段需要处理`
                : '字段映射已完成，可以继续'}
            </div>
            
            <Button 
              onClick={handleComplete}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              继续验证数据
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnmappedFieldsOnly;