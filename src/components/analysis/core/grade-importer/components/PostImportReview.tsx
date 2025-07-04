/**
 * 📋 PostImportReview - 导入后字段检查组件
 * 
 * 重点显示未识别或有问题的字段，让用户快速处理
 * 成功映射的字段折叠显示，节省界面空间
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Plus,
  Target,
  BookOpen,
  Save,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 字段状态类型
interface FieldStatus {
  header: string;
  status: 'unmapped' | 'low_confidence' | 'mapped' | 'ignored';
  mappedTo?: string;
  confidence?: number;
  suggestion?: string;
  dataPreview?: any[];
}

// 预定义字段选项
const PREDEFINED_FIELDS = {
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
      original_grade: '等级',
      chinese_grade: '语文等级',
      math_grade: '数学等级',
      english_grade: '英语等级'
    }
  }
};

export interface PostImportReviewProps {
  headers: string[];
  sampleData: any[];
  currentMapping: Record<string, string>;
  aiAnalysis?: any;
  onMappingChange: (updatedMapping: Record<string, string>) => void;
  onConfirmAndProceed: () => void;
  onReimport: () => void;
}

const PostImportReview: React.FC<PostImportReviewProps> = ({
  headers,
  sampleData,
  currentMapping,
  aiAnalysis,
  onMappingChange,
  onConfirmAndProceed,
  onReimport
}) => {
  const [localMapping, setLocalMapping] = useState<Record<string, string>>(currentMapping);
  const [showSuccessFields, setShowSuccessFields] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // 生成字段建议
  const generateSuggestion = useCallback((header: string, dataPreview: any[]): string => {
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
  }, []);

  // 分析字段状态
  const fieldStatuses = useMemo((): FieldStatus[] => {
    return headers.map(header => {
      const mappedTo = localMapping[header];
      const confidence = aiAnalysis?.fieldConfidence?.[header] || 0;
      
      let status: FieldStatus['status'];
      if (!mappedTo) {
        status = 'unmapped';
      } else if (confidence < 0.6) {
        status = 'low_confidence';
      } else {
        status = 'mapped';
      }

      // 获取数据预览
      const dataPreview = sampleData.slice(0, 3).map(row => row[header]).filter(val => val != null);

      return {
        header,
        status,
        mappedTo,
        confidence,
        dataPreview,
        suggestion: generateSuggestion(header, dataPreview)
      };
    });
  }, [headers, localMapping, sampleData, aiAnalysis, generateSuggestion]);

  // 获取字段显示名称
  const getFieldDisplayName = (fieldKey: string): string => {
    for (const category of Object.values(PREDEFINED_FIELDS)) {
      if (category.fields[fieldKey]) {
        return category.fields[fieldKey];
      }
    }
    return fieldKey;
  };

  // 处理字段映射更改
  const handleFieldMapping = (header: string, targetField: string) => {
    const newMapping = { ...localMapping };
    if (targetField === 'ignore') {
      delete newMapping[header];
    } else {
      newMapping[header] = targetField;
    }
    setLocalMapping(newMapping);
  };

  // 自动修复所有建议
  const handleAutoFix = () => {
    const newMapping = { ...localMapping };
    let fixedCount = 0;

    fieldStatuses.forEach(field => {
      if (field.status === 'unmapped' && field.suggestion) {
        newMapping[field.header] = field.suggestion;
        fixedCount++;
      }
    });

    setLocalMapping(newMapping);
    toast.success(`自动修复了 ${fixedCount} 个字段映射`);
  };

  // 保存映射更改
  const handleSaveMapping = () => {
    onMappingChange(localMapping);
    setIsEditing(false);
    toast.success('字段映射已保存');
  };

  // 添加自定义字段
  const handleAddCustomField = (header: string) => {
    if (!customFieldName.trim()) {
      toast.error('请输入自定义字段名称');
      return;
    }
    
    const newMapping = { ...localMapping };
    newMapping[header] = `custom_${customFieldName}`;
    setLocalMapping(newMapping);
    setCustomFieldName('');
    toast.success(`添加自定义字段: ${customFieldName}`);
  };

  const unmappedFields = fieldStatuses.filter(f => f.status === 'unmapped');
  const lowConfidenceFields = fieldStatuses.filter(f => f.status === 'low_confidence');
  const mappedFields = fieldStatuses.filter(f => f.status === 'mapped');

  return (
    <div className="space-y-6">
      {/* 头部状态总览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                导入字段检查
              </CardTitle>
              <CardDescription>
                {unmappedFields.length + lowConfidenceFields.length > 0 
                  ? `发现 ${unmappedFields.length + lowConfidenceFields.length} 个字段需要处理`
                  : '所有字段已正确识别'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? '取消编辑' : '编辑映射'}
              </Button>
              {isEditing && (
                <Button onClick={handleSaveMapping} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  保存更改
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{unmappedFields.length}</div>
              <div className="text-sm text-gray-600">未识别字段</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{lowConfidenceFields.length}</div>
              <div className="text-sm text-gray-600">低置信度字段</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{mappedFields.length}</div>
              <div className="text-sm text-gray-600">已正确识别</div>
            </div>
          </div>

          {unmappedFields.length > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={handleAutoFix}
                className="flex items-center gap-2"
                disabled={unmappedFields.filter(f => f.suggestion).length === 0}
              >
                <RefreshCw className="w-4 h-4" />
                自动修复 {unmappedFields.filter(f => f.suggestion).length} 个字段
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 未识别字段 - 优先显示 */}
      {unmappedFields.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              未识别字段 ({unmappedFields.length})
            </CardTitle>
            <CardDescription>
              这些字段无法自动识别，请手动指定映射或选择忽略
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unmappedFields.map((field) => (
              <Alert key={field.header} className="border-red-200">
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800">"{field.header}"</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          数据示例: {field.dataPreview?.join(', ') || '无数据'}
                        </p>
                      </div>
                    </div>

                    {(isEditing || field.status === 'unmapped') && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">选择映射字段:</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Select
                            value={localMapping[field.header] || ''}
                            onValueChange={(value) => handleFieldMapping(field.header, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择字段..." />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PREDEFINED_FIELDS).map(([categoryKey, category]) => (
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
                              onClick={() => handleFieldMapping(field.header, field.suggestion!)}
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
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 低置信度字段 */}
      {lowConfidenceFields.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Eye className="w-5 h-5" />
              需要确认的字段 ({lowConfidenceFields.length})
            </CardTitle>
            <CardDescription>
              这些字段的识别置信度较低，建议确认是否正确
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowConfidenceFields.map((field) => (
              <div key={field.header} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">"{field.header}"</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-blue-600">{getFieldDisplayName(field.mappedTo!)}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round((field.confidence || 0) * 100)}% 置信度
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    数据: {field.dataPreview?.join(', ')}
                  </p>
                </div>
                
                {isEditing && (
                  <Select
                    value={localMapping[field.header] || ''}
                    onValueChange={(value) => handleFieldMapping(field.header, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PREDEFINED_FIELDS).map(([categoryKey, category]) => (
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
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 成功识别的字段 - 折叠显示 */}
      {mappedFields.length > 0 && (
        <Collapsible open={showSuccessFields} onOpenChange={setShowSuccessFields}>
          <Card className="border-green-200">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-green-50">
                <CardTitle className="flex items-center justify-between text-green-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    已正确识别的字段 ({mappedFields.length})
                  </div>
                  {showSuccessFields ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {mappedFields.map((field) => (
                    <div key={field.header} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">"{field.header}"</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-green-600">{getFieldDisplayName(field.mappedTo!)}</span>
                        </div>
                      </div>
                      {field.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(field.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 底部操作栏 */}
      <Card className="border-t-2 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {unmappedFields.length + lowConfidenceFields.length === 0 ? (
                <span className="text-green-600 font-medium">✅ 所有字段已处理完成，可以开始分析</span>
              ) : (
                <span>还有 {unmappedFields.length + lowConfidenceFields.length} 个字段需要处理</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onReimport}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重新导入
              </Button>
              
              <Button 
                onClick={onConfirmAndProceed}
                disabled={unmappedFields.length > 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                确认无误，前往分析
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostImportReview;