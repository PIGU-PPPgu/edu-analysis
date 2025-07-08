/**
 * MappingEditor - 字段映射编辑器
 * 
 * 用于已导入的考试数据，允许用户修改字段映射
 * 避免重复导入，直接更新数据库中的字段映射关系
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit3, 
  Save, 
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  Eye,
  History,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// 字段映射历史记录
interface MappingHistory {
  id: string;
  exam_id: string;
  old_mapping: Record<string, string>;
  new_mapping: Record<string, string>;
  changed_by: string;
  changed_at: string;
  reason: string;
}

// 考试信息
interface ExamInfo {
  id: string;
  title: string;
  type: string;
  date: string;
  field_mappings: Record<string, string>;
  total_records: number;
}

export interface MappingEditorProps {
  examId: string;
  onMappingUpdated: (newMapping: Record<string, string>) => void;
  onClose: () => void;
}

const MappingEditor: React.FC<MappingEditorProps> = ({
  examId,
  onMappingUpdated,
  onClose
}) => {
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>({});
  const [originalMapping, setOriginalMapping] = useState<Record<string, string>>({});
  const [mappingHistory, setMappingHistory] = useState<MappingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // 预定义字段
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

  // 加载考试信息和映射历史
  useEffect(() => {
    loadExamData();
  }, [examId]);

  const loadExamData = async () => {
    try {
      setLoading(true);

      // 加载考试基本信息
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // 获取字段映射（从考试表或者成绩数据中推断）
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId)
        .limit(5);

      if (gradeError) throw gradeError;

      // 推断当前字段映射
      const inferredMapping = inferMappingFromData(gradeData);
      
      setExamInfo({
        id: exam.id,
        title: exam.title,
        type: exam.type,
        date: exam.date,
        field_mappings: exam.field_mappings || inferredMapping,
        total_records: gradeData.length
      });

      setCurrentMapping(exam.field_mappings || inferredMapping);
      setOriginalMapping(exam.field_mappings || inferredMapping);
      setPreviewData(gradeData.slice(0, 3));

      // 加载映射历史（如果有映射历史表的话）
      await loadMappingHistory();

    } catch (error) {
      console.error('加载考试数据失败:', error);
      toast.error('加载考试数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 从数据推断字段映射
  const inferMappingFromData = (data: any[]): Record<string, string> => {
    if (!data.length) return {};

    const mapping: Record<string, string> = {};
    const sampleRow = data[0];

    // 基于数据库字段推断原始字段名
    Object.keys(sampleRow).forEach(dbField => {
      if (dbField === 'name') mapping['姓名'] = 'name';
      else if (dbField === 'student_id') mapping['学号'] = 'student_id';
      else if (dbField === 'class_name') mapping['班级'] = 'class_name';
      else if (dbField === 'chinese_score') mapping['语文'] = 'chinese_score';
      else if (dbField === 'math_score') mapping['数学'] = 'math_score';
      else if (dbField === 'english_score') mapping['英语'] = 'english_score';
      else if (dbField === 'total_score') mapping['总分'] = 'total_score';
      // ... 其他字段推断
    });

    return mapping;
  };

  // 加载映射历史
  const loadMappingHistory = async () => {
    // 这里可以从映射历史表加载，暂时为空
    setMappingHistory([]);
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

  // 处理字段映射变更
  const handleMappingChange = (originalField: string, newTargetField: string) => {
    const newMapping = { ...currentMapping };
    
    if (newTargetField === 'remove') {
      delete newMapping[originalField];
    } else {
      newMapping[originalField] = newTargetField;
    }
    
    setCurrentMapping(newMapping);
  };

  // 重置映射
  const handleReset = () => {
    setCurrentMapping({ ...originalMapping });
    toast.info('已重置为原始映射');
  };

  // 保存映射更改
  const handleSaveMapping = async () => {
    try {
      setSaving(true);

      // 更新考试表中的字段映射
      const { error: updateError } = await supabase
        .from('exams')
        .update({ 
          field_mappings: currentMapping,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId);

      if (updateError) throw updateError;

      // 记录映射变更历史（如果需要的话）
      await recordMappingChange();

      setOriginalMapping({ ...currentMapping });
      onMappingUpdated(currentMapping);
      
      toast.success('字段映射已更新');

    } catch (error) {
      console.error('保存映射失败:', error);
      toast.error('保存映射失败');
    } finally {
      setSaving(false);
    }
  };

  // 记录映射变更历史
  const recordMappingChange = async () => {
    // 可以在这里记录到映射历史表
    console.log('映射变更记录:', {
      exam_id: examId,
      old_mapping: originalMapping,
      new_mapping: currentMapping,
      changed_at: new Date().toISOString()
    });
  };

  // 检查是否有变更
  const hasChanges = JSON.stringify(currentMapping) !== JSON.stringify(originalMapping);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            加载考试数据中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!examInfo) {
    return (
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          无法加载考试数据，请检查考试ID是否正确
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 考试信息头部 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                编辑字段映射
              </CardTitle>
              <CardDescription>
                考试: {examInfo.title} | 日期: {examInfo.date} | 记录数: {examInfo.total_records}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重置
              </Button>
              <Button 
                onClick={handleSaveMapping}
                disabled={!hasChanges || saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '保存中...' : '保存映射'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="mapping" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mapping">字段映射</TabsTrigger>
          <TabsTrigger value="preview">数据预览</TabsTrigger>
          <TabsTrigger value="history">变更历史</TabsTrigger>
        </TabsList>

        {/* 字段映射编辑 */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>当前字段映射</CardTitle>
              <CardDescription>
                修改字段映射会影响该考试的所有数据解释和分析结果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(currentMapping).map(([originalField, mappedField]) => (
                <div key={originalField} className="flex items-center gap-4 p-3 border rounded">
                  <div className="flex-1">
                    <Label className="font-medium">原始字段: "{originalField}"</Label>
                    <div className="text-sm text-gray-600 mt-1">
                      当前映射到: {getFieldDisplayName(mappedField)}
                    </div>
                  </div>
                  
                  <div className="w-64">
                    <Select
                      value={mappedField}
                      onValueChange={(value) => handleMappingChange(originalField, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                        <SelectItem value="remove" className="text-red-500">
                          移除此字段
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {mappedField !== originalMapping[originalField] && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      已修改
                    </Badge>
                  )}
                </div>
              ))}

              {Object.keys(currentMapping).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无字段映射
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据预览 */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                数据预览
              </CardTitle>
              <CardDescription>
                查看当前映射下的数据解释效果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.values(currentMapping).map((field) => (
                          <th key={field} className="px-4 py-2 text-left border-b">
                            {getFieldDisplayName(field)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="border-b">
                          {Object.values(currentMapping).map((field) => (
                            <td key={field} className="px-4 py-2">
                              {row[field] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无预览数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 变更历史 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                映射变更历史
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mappingHistory.length > 0 ? (
                <div className="space-y-3">
                  {mappingHistory.map((history) => (
                    <div key={history.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {new Date(history.changed_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {history.reason}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {history.changed_by}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无变更历史
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部警告信息 */}
      {hasChanges && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>注意:</strong> 修改字段映射会影响该考试的所有分析结果和报表。
            保存前请确认修改无误。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MappingEditor;