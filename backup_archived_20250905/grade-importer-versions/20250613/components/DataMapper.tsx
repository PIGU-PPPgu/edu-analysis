import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Settings,
  AlertTriangle, 
  Info, 
  Check, 
  HelpCircle, 
  Sparkles, 
  Bot,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeCSVHeaders, generateMappingSuggestions } from '@/services/intelligentFieldMapper';

// 系统字段映射
const SYSTEM_FIELDS: Record<string, string> = {
  'student_id': '学号',
  'name': '姓名',
  'class_name': '班级',
  'grade_level': '年级',
  'subject': '科目',
  'exam_date': '考试日期',
  'exam_type': '考试类型',
  'exam_title': '考试标题',
  'exam_scope': '考试范围',
  'score': '分数/成绩',
  'total_score': '总分',
  'subject_total_score': '满分/科目满分',
  'original_grade': '等级/评级',
  'computed_grade': '计算等级',
  'grade': '旧等级',
  'rank_in_class': '班级排名',
  'rank_in_grade': '年级排名/校排名',
  'percentile': '百分位数',
  'z_score': '标准分'
};

// 字段映射配置接口
export interface FieldMapping {
  originalField: string;
  mappedField: string;
  isRequired: boolean;
  isCustom: boolean;
  confidence?: number;
  suggestions?: string[];
}

// 数据映射配置接口
export interface MappingConfig {
  fieldMappings: Record<string, string>;
  customFields: Record<string, string>;
  aiSuggestions?: {
    confidence: number;
    suggestions: Record<string, string>;
    issues: string[];
  };
  wideTableFormat?: {
    detected: boolean;
    subjects: string[];
    confidence: number;
  };
}

// DataMapper 组件属性
interface DataMapperProps {
  headers: string[];
  sampleData: any[];
  onMappingConfigured: (config: MappingConfig) => void;
  onError: (error: string) => void;
  loading?: boolean;
  initialMapping?: Record<string, string>;
}

const DataMapper: React.FC<DataMapperProps> = ({
  headers,
  sampleData,
  onMappingConfigured,
  onError,
  loading = false,
  initialMapping = {}
}) => {
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(initialMapping);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    confidence: number;
    suggestions: Record<string, string>;
    issues: string[];
  } | null>(null);
  const [wideTableAnalysis, setWideTableAnalysis] = useState<{
    detected: boolean;
    subjects: string[];
    confidence: number;
  } | null>(null);

  // 必需字段
  const requiredFields = ['student_id', 'name', 'class_name'];
  
  // 可选字段
  const optionalFields = Object.keys(SYSTEM_FIELDS).filter(field => !requiredFields.includes(field));

  // 自动分析字段映射
  useEffect(() => {
    if (headers.length > 0) {
      performAutoMapping();
    }
  }, [headers]);

  // 执行自动映射分析
  const performAutoMapping = async () => {
    setAiAnalyzing(true);
    try {
      // 使用智能字段映射器分析表头
      const headerAnalysis = analyzeCSVHeaders(headers);
      const mappingSuggestions = generateMappingSuggestions(headers);
      
      // 设置AI建议
      setAiSuggestions({
        confidence: mappingSuggestions.confidence,
        suggestions: mappingSuggestions.suggestions,
        issues: mappingSuggestions.issues
      });
      
      // 检查是否为宽表格格式
      if (headerAnalysis.subjects.length > 1) {
        setWideTableAnalysis({
          detected: true,
          subjects: headerAnalysis.subjects,
          confidence: headerAnalysis.confidence
        });
      }
      
      // 应用建议的映射
      const newMappings: Record<string, string> = {};
      
      // 首先映射学生信息字段
      headerAnalysis.studentFields.forEach(mapping => {
        const originalField = mapping.originalField;
        const mappedField = mapping.mappedField;
        if (SYSTEM_FIELDS[mappedField]) {
          newMappings[originalField] = mappedField;
        }
      });
      
      // 然后处理科目字段
      headerAnalysis.mappings.forEach(mapping => {
        if (mapping.subject && mapping.dataType === 'score') {
          // 对于科目分数，创建自定义字段
          const customFieldKey = `${mapping.subject}_score`;
          setCustomFields(prev => ({
            ...prev,
            [customFieldKey]: `${mapping.subject}分数`
          }));
          newMappings[mapping.originalField] = customFieldKey;
        }
      });
      
      setFieldMappings(newMappings);
      
      if (Object.keys(newMappings).length > 0) {
        toast.success(`AI自动识别了 ${Object.keys(newMappings).length} 个字段映射`);
      }
      
    } catch (error) {
      console.error('自动映射分析失败:', error);
      onError('字段自动分析失败: ' + error.message);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // 手动设置字段映射
  const handleFieldMapping = (originalField: string, mappedField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [originalField]: mappedField
    }));
  };

  // 添加自定义字段
  const handleAddCustomField = (fieldKey: string, fieldName: string) => {
    setCustomFields(prev => ({
      ...prev,
      [fieldKey]: fieldName
    }));
  };

  // 移除字段映射
  const handleRemoveMapping = (originalField: string) => {
    setFieldMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[originalField];
      return newMappings;
    });
  };

  // 应用AI建议
  const handleApplyAISuggestions = () => {
    if (aiSuggestions?.suggestions) {
      setFieldMappings(prev => ({
        ...prev,
        ...aiSuggestions.suggestions
      }));
      toast.success('已应用AI建议的字段映射');
    }
  };

  // 重置映射
  const handleResetMapping = () => {
    setFieldMappings({});
    setCustomFields({});
    setAiSuggestions(null);
    setWideTableAnalysis(null);
    toast.info('已重置字段映射');
  };

  // 验证映射配置
  const validateMapping = (): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // 检查必需字段
    requiredFields.forEach(requiredField => {
      const isMapped = Object.values(fieldMappings).includes(requiredField);
      if (!isMapped) {
        const fieldName = SYSTEM_FIELDS[requiredField] || requiredField;
        issues.push(`缺少必需字段: ${fieldName}`);
      }
    });
    
    // 检查重复映射
    const mappedValues = Object.values(fieldMappings);
    const duplicates = mappedValues.filter((value, index) => mappedValues.indexOf(value) !== index);
    if (duplicates.length > 0) {
      issues.push(`存在重复映射: ${duplicates.join(', ')}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  // 确认映射配置
  const handleConfirmMapping = () => {
    const validation = validateMapping();
    
    if (!validation.isValid) {
      onError('映射配置有误: ' + validation.issues.join('; '));
      return;
    }
    
    const config: MappingConfig = {
      fieldMappings,
      customFields,
      aiSuggestions: aiSuggestions || undefined,
      wideTableFormat: wideTableAnalysis || undefined
    };
    
    onMappingConfigured(config);
    toast.success('字段映射配置已确认');
  };

  // 获取字段映射状态
  const getFieldMappingStatus = (originalField: string) => {
    const mappedField = fieldMappings[originalField];
    if (!mappedField) return 'unmapped';
    if (requiredFields.includes(mappedField)) return 'required';
    if (customFields[mappedField]) return 'custom';
    return 'optional';
  };

  // 获取可用的映射选项
  const getAvailableMappingOptions = (originalField: string) => {
    const currentMapping = fieldMappings[originalField];
    const usedMappings = Object.values(fieldMappings).filter(mapping => mapping !== currentMapping);
    
    const availableSystemFields = Object.keys(SYSTEM_FIELDS).filter(field => !usedMappings.includes(field));
    const availableCustomFields = Object.keys(customFields);
    
    return {
      system: availableSystemFields,
      custom: availableCustomFields
    };
  };

  // 计算映射完成度
  const mappingProgress = useMemo(() => {
    const totalFields = headers.length;
    const mappedFields = Object.keys(fieldMappings).length;
    const requiredMapped = requiredFields.filter(field => Object.values(fieldMappings).includes(field)).length;
    
    return {
      total: totalFields,
      mapped: mappedFields,
      required: requiredMapped,
      percentage: totalFields > 0 ? Math.round((mappedFields / totalFields) * 100) : 0,
      requiredPercentage: Math.round((requiredMapped / requiredFields.length) * 100)
    };
  }, [fieldMappings, headers, requiredFields]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          字段映射配置
        </CardTitle>
        <CardDescription>
          配置导入文件的字段映射关系，确保数据正确导入系统
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* AI分析状态 */}
        {aiAnalyzing && (
          <Alert>
            <Bot className="w-4 h-4 animate-pulse" />
            <AlertDescription>
              AI正在分析文件结构，自动识别字段映射...
            </AlertDescription>
          </Alert>
        )}

        {/* AI建议 */}
        {aiSuggestions && (
          <Alert className={cn(
            aiSuggestions.confidence > 0.8 ? 'border-green-200 bg-green-50' : 
            aiSuggestions.confidence > 0.6 ? 'border-yellow-200 bg-yellow-50' : 
            'border-red-200 bg-red-50'
          )}>
            <Sparkles className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    AI分析结果 (置信度: {Math.round(aiSuggestions.confidence * 100)}%)
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleApplyAISuggestions}
                    disabled={Object.keys(aiSuggestions.suggestions).length === 0}
                  >
                    应用建议
                  </Button>
                </div>
                
                {aiSuggestions.issues.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600">发现的问题:</p>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {aiSuggestions.issues.map((issue, index) => (
                        <li key={index} className="text-red-600">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 宽表格检测 */}
        {wideTableAnalysis?.detected && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">检测到宽表格格式</p>
                <p className="text-sm">
                  发现科目: {wideTableAnalysis.subjects.join(', ')} 
                  (置信度: {Math.round(wideTableAnalysis.confidence * 100)}%)
                </p>
                <p className="text-sm text-blue-700">
                  系统将自动将宽表格转换为长表格格式，每个科目生成一条记录。
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 映射进度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>映射进度</span>
            <span>{mappingProgress.mapped}/{mappingProgress.total} 字段</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${mappingProgress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>必需字段: {mappingProgress.required}/{requiredFields.length}</span>
            <span>{mappingProgress.percentage}% 完成</span>
          </div>
        </div>

        {/* 字段映射表格 */}
        <div className="border rounded-lg">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>原始字段</TableHead>
                  <TableHead>映射到</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>示例数据</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header, index) => {
                  const mappedField = fieldMappings[header];
                  const status = getFieldMappingStatus(header);
                  const availableOptions = getAvailableMappingOptions(header);
                  const sampleValue = sampleData[0]?.[header] || '';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={mappedField || ''}
                          onValueChange={(value) => handleFieldMapping(header, value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="选择映射字段" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" disabled>
                              -- 请选择 --
                            </SelectItem>
                            
                            {/* 必需字段 */}
                            {requiredFields.filter(field => availableOptions.system.includes(field)).length > 0 && (
                              <>
                                <SelectItem value="" disabled className="font-semibold">
                                  必需字段
                                </SelectItem>
                                {requiredFields
                                  .filter(field => availableOptions.system.includes(field))
                                  .map(field => (
                                    <SelectItem key={field} value={field}>
                                      {SYSTEM_FIELDS[field]} *
                                    </SelectItem>
                                  ))
                                }
                              </>
                            )}
                            
                            {/* 可选字段 */}
                            {availableOptions.system.filter(field => !requiredFields.includes(field)).length > 0 && (
                              <>
                                <SelectItem value="" disabled className="font-semibold">
                                  可选字段
                                </SelectItem>
                                {availableOptions.system
                                  .filter(field => !requiredFields.includes(field))
                                  .map(field => (
                                    <SelectItem key={field} value={field}>
                                      {SYSTEM_FIELDS[field]}
                                    </SelectItem>
                                  ))
                                }
                              </>
                            )}
                            
                            {/* 自定义字段 */}
                            {availableOptions.custom.length > 0 && (
                              <>
                                <SelectItem value="" disabled className="font-semibold">
                                  自定义字段
                                </SelectItem>
                                {availableOptions.custom.map(field => (
                                  <SelectItem key={field} value={field}>
                                    {customFields[field]}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            status === 'required' ? 'default' :
                            status === 'custom' ? 'secondary' :
                            status === 'optional' ? 'outline' :
                            'destructive'
                          }
                          className="text-xs"
                        >
                          {status === 'required' ? '必需' :
                           status === 'custom' ? '自定义' :
                           status === 'optional' ? '可选' :
                           '未映射'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[120px] truncate">
                        {sampleValue}
                      </TableCell>
                      <TableCell>
                        {mappedField && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMapping(header)}
                          >
                            移除
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* 高级选项 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
            <Label>显示高级选项</Label>
          </div>
          
          {showAdvanced && (
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium mb-3">自定义字段管理</h4>
              <div className="space-y-2">
                {Object.entries(customFields).map(([key, name]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{name} ({key})</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newCustomFields = { ...customFields };
                        delete newCustomFields[key];
                        setCustomFields(newCustomFields);
                      }}
                    >
                      删除
                    </Button>
                  </div>
                ))}
                
                {Object.keys(customFields).length === 0 && (
                  <p className="text-sm text-gray-500">暂无自定义字段</p>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={performAutoMapping}
              disabled={aiAnalyzing || loading}
            >
              <Zap className="w-4 h-4 mr-2" />
              重新分析
            </Button>
            <Button
              variant="outline"
              onClick={handleResetMapping}
              disabled={loading}
            >
              重置映射
            </Button>
          </div>
          
          <Button
            onClick={handleConfirmMapping}
            disabled={mappingProgress.requiredPercentage < 100 || loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            确认映射 ({mappingProgress.requiredPercentage}%)
          </Button>
        </div>

        {/* 映射验证提示 */}
        {mappingProgress.requiredPercentage < 100 && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              请完成所有必需字段的映射：
              {requiredFields
                .filter(field => !Object.values(fieldMappings).includes(field))
                .map(field => SYSTEM_FIELDS[field])
                .join(', ')
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DataMapper; 