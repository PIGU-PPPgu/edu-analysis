/**
 * 🎯 SmartFieldConfirmDialog - 智能字段确认对话框
 * 
 * 功能：
 * 1. 显示未映射的具体字段
 * 2. 智能推测科目类型
 * 3. 让用户选择字段属性（分数/等级/排名）
 * 4. 一键完成所有未映射字段
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  HelpCircle,
  CheckCircle,
  Target,
  BookOpen,
  TrendingUp,
  Award,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

// 科目定义
const SUBJECTS = [
  { key: 'chinese', name: '语文', patterns: ['语文', 'chinese', '语'] },
  { key: 'math', name: '数学', patterns: ['数学', 'math', '数'] },
  { key: 'english', name: '英语', patterns: ['英语', 'english', '英'] },
  { key: 'physics', name: '物理', patterns: ['物理', 'physics', '理'] },
  { key: 'chemistry', name: '化学', patterns: ['化学', 'chemistry', '化'] },
  { key: 'biology', name: '生物', patterns: ['生物', 'biology', '生'] },
  { key: 'politics', name: '政治', patterns: ['政治', 'politics', '政', '道法'] },
  { key: 'history', name: '历史', patterns: ['history', '历史', '史'] },
  { key: 'geography', name: '地理', patterns: ['geography', '地理', '地'] },
  { key: 'total', name: '总分', patterns: ['总分', 'total', '合计', '总成绩'] }
];

// 字段类型定义
const FIELD_TYPES = [
  { 
    key: 'score', 
    name: '分数', 
    icon: Hash,
    description: '数值成绩(如85分)',
    examples: ['85', '92', '78'] 
  },
  { 
    key: 'grade', 
    name: '等级', 
    icon: Award,
    description: '等级评定(如A+、B等)',
    examples: ['A+', 'A', 'B+', 'B'] 
  },
  { 
    key: 'classRank', 
    name: '班级排名', 
    icon: TrendingUp,
    description: '在班级中的排名',
    examples: ['1', '5', '10'] 
  },
  { 
    key: 'gradeRank', 
    name: '年级排名', 
    icon: TrendingUp,
    description: '在年级/全区的排名',
    examples: ['15', '28', '45'] 
  },
  { 
    key: 'schoolRank', 
    name: '校排名', 
    icon: TrendingUp,
    description: '在学校中的排名',
    examples: ['12', '35', '67'] 
  }
];

// 未映射字段信息
interface UnmappedField {
  originalName: string;
  sampleValues: string[];
  suggestedSubject?: string;
  suggestedType?: string;
  confidence: number;
}

interface SmartFieldConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmappedFields: UnmappedField[];
  onConfirm: (mappings: Record<string, string>) => void;
  onSkip: () => void;
}

const SmartFieldConfirmDialog: React.FC<SmartFieldConfirmDialogProps> = ({
  open,
  onOpenChange,
  unmappedFields,
  onConfirm,
  onSkip
}) => {
  const [fieldMappings, setFieldMappings] = useState<Record<string, { subject: string; type: string }>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // 智能推测字段信息
  const analyzeField = useCallback((field: UnmappedField) => {
    const fieldName = field.originalName.toLowerCase();
    
    // 推测科目
    let suggestedSubject = '';
    for (const subject of SUBJECTS) {
      if (subject.patterns.some(pattern => fieldName.includes(pattern.toLowerCase()))) {
        suggestedSubject = subject.key;
        break;
      }
    }
    
    // 推测类型
    let suggestedType = '';
    if (fieldName.includes('排名') || fieldName.includes('名次') || fieldName.includes('rank')) {
      if (fieldName.includes('班级') || fieldName.includes('班')) {
        suggestedType = 'classRank';
      } else if (fieldName.includes('年级') || fieldName.includes('级') || fieldName.includes('区')) {
        suggestedType = 'gradeRank';
      } else if (fieldName.includes('校') || fieldName.includes('学校')) {
        suggestedType = 'schoolRank';
      } else {
        suggestedType = 'classRank'; // 默认班级排名
      }
    } else if (fieldName.includes('等级') || fieldName.includes('级别') || fieldName.includes('grade')) {
      suggestedType = 'grade';
    } else {
      // 通过样本值判断
      const hasNumericValues = field.sampleValues.some(val => !isNaN(Number(val)) && Number(val) > 0);
      const hasGradeValues = field.sampleValues.some(val => /^[A-F][+-]?$/.test(val));
      
      if (hasGradeValues) {
        suggestedType = 'grade';
      } else if (hasNumericValues) {
        // 判断是分数还是排名
        const avgValue = field.sampleValues
          .filter(val => !isNaN(Number(val)))
          .reduce((sum, val, _, arr) => sum + Number(val) / arr.length, 0);
        
        if (avgValue > 50) {
          suggestedType = 'score'; // 可能是分数
        } else {
          suggestedType = 'classRank'; // 可能是排名
        }
      } else {
        suggestedType = 'score'; // 默认为分数
      }
    }
    
    return { suggestedSubject, suggestedType };
  }, []);

  // 更新字段映射
  const updateFieldMapping = useCallback((fieldName: string, subject: string, type: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldName]: { subject, type }
    }));
  }, []);

  // 确认映射
  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      // 转换为标准映射格式
      const standardMappings: Record<string, string> = {};
      
      Object.entries(fieldMappings).forEach(([fieldName, mapping]) => {
        const { subject, type } = mapping;
        standardMappings[fieldName] = `${subject}_${type}`;
      });
      
      // 检查是否所有字段都已映射
      const unmappedCount = unmappedFields.length - Object.keys(fieldMappings).length;
      if (unmappedCount > 0) {
        toast.warning(`还有 ${unmappedCount} 个字段未设置映射`, {
          description: '请为所有字段选择科目和类型，或选择跳过'
        });
        return;
      }
      
      onConfirm(standardMappings);
      onOpenChange(false);
      
      toast.success('字段映射已确认！', {
        description: `成功映射 ${Object.keys(standardMappings).length} 个字段`
      });
      
    } catch (error) {
      console.error('映射确认失败:', error);
      toast.error('映射确认失败');
    } finally {
      setIsProcessing(false);
    }
  }, [fieldMappings, unmappedFields.length, onConfirm, onOpenChange]);

  // 跳过映射
  const handleSkip = useCallback(() => {
    onSkip();
    onOpenChange(false);
    toast.info('已跳过字段映射', {
      description: '系统将使用基础映射继续导入'
    });
  }, [onSkip, onOpenChange]);

  // 智能批量映射
  const handleSmartMap = useCallback(() => {
    const autoMappings: Record<string, { subject: string; type: string }> = {};
    
    unmappedFields.forEach(field => {
      const { suggestedSubject, suggestedType } = analyzeField(field);
      if (suggestedSubject && suggestedType) {
        autoMappings[field.originalName] = {
          subject: suggestedSubject,
          type: suggestedType
        };
      }
    });
    
    setFieldMappings(autoMappings);
    toast.success('智能映射完成！', {
      description: `自动映射了 ${Object.keys(autoMappings).length} 个字段，请检查确认`
    });
  }, [unmappedFields, analyzeField]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            确认未映射的字段
          </DialogTitle>
          <DialogDescription>
            系统发现 {unmappedFields.length} 个字段需要您确认。请为每个字段选择对应的科目和类型。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* 快速操作 */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSmartMap}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              智能批量映射
            </Button>
          </div>

          {/* 未映射字段列表 */}
          <div className="space-y-4">
            {unmappedFields.map((field, index) => {
              const { suggestedSubject, suggestedType } = analyzeField(field);
              const currentMapping = fieldMappings[field.originalName];
              
              return (
                <Card key={field.originalName} className="border-l-4 border-l-orange-400">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* 字段信息 */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-lg">{field.originalName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">样本数据:</span>
                            {field.sampleValues.slice(0, 3).map((value, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {suggestedSubject && (
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">
                              AI建议: {SUBJECTS.find(s => s.key === suggestedSubject)?.name}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* 选择区域 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 科目选择 */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">选择科目</Label>
                          <Select
                            value={currentMapping?.subject || ''}
                            onValueChange={(value) => 
                              updateFieldMapping(field.originalName, value, currentMapping?.type || '')
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="请选择科目..." />
                            </SelectTrigger>
                            <SelectContent>
                              {SUBJECTS.map(subject => (
                                <SelectItem key={subject.key} value={subject.key}>
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    {subject.name}
                                    {subject.key === suggestedSubject && (
                                      <Badge variant="secondary" className="text-xs ml-2">推荐</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 类型选择 */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">选择类型</Label>
                          <Select
                            value={currentMapping?.type || ''}
                            onValueChange={(value) => 
                              updateFieldMapping(field.originalName, currentMapping?.subject || '', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="请选择类型..." />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map(type => (
                                <SelectItem key={type.key} value={type.key}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="w-4 h-4" />
                                    <div>
                                      <div className="font-medium">{type.name}</div>
                                      <div className="text-xs text-gray-500">{type.description}</div>
                                    </div>
                                    {type.key === suggestedType && (
                                      <Badge variant="secondary" className="text-xs ml-2">推荐</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* 预览映射结果 */}
                      {currentMapping?.subject && currentMapping?.type && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            将映射为: <code className="bg-green-100 px-1 rounded text-sm">
                              {currentMapping.subject}_{currentMapping.type}
                            </code>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            disabled={isProcessing}
          >
            跳过映射
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isProcessing || Object.keys(fieldMappings).length === 0}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                确认中...
              </div>
            ) : (
              `确认映射 (${Object.keys(fieldMappings).length}/${unmappedFields.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SmartFieldConfirmDialog;