/**
 * 🔧 DataMappingConfig 组件 - GradeImporter重构第2部分
 * 负责数据字段映射配置功能
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Zap, CheckCircle } from 'lucide-react';
import { 
  FieldMapping, 
  ParsedData, 
  SYSTEM_FIELDS,
  DataMappingHandler 
} from './types';

interface DataMappingConfigProps {
  parsedData: ParsedData;
  onMappingConfigured: DataMappingHandler;
  enableAISuggestion?: boolean;
}

const DataMappingConfig: React.FC<DataMappingConfigProps> = ({
  parsedData,
  onMappingConfigured,
  enableAISuggestion = true
}) => {
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});

  // 初始化AI建议映射
  useEffect(() => {
    if (enableAISuggestion && parsedData) {
      const suggestions = generateAISuggestions(parsedData.headers);
      setAiSuggestions(suggestions);
      setFieldMappings(suggestions);
    }
  }, [parsedData, enableAISuggestion]);

  // 生成AI建议映射
  const generateAISuggestions = (headers: string[]): FieldMapping => {
    const suggestions: FieldMapping = {};
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      
      // 简单的关键词匹配
      if (lowerHeader.includes('学号') || lowerHeader.includes('id')) {
        suggestions[header] = 'student_id';
      } else if (lowerHeader.includes('姓名') || lowerHeader.includes('name')) {
        suggestions[header] = 'name';
      } else if (lowerHeader.includes('班级') || lowerHeader.includes('class')) {
        suggestions[header] = 'class_name';
      } else if (lowerHeader.includes('语文')) {
        suggestions[header] = 'custom_chinese';
      } else if (lowerHeader.includes('数学')) {
        suggestions[header] = 'custom_math';
      } else if (lowerHeader.includes('英语')) {
        suggestions[header] = 'custom_english';
      } else {
        // 自定义字段
        suggestions[header] = `custom_${header.toLowerCase()}`;
      }
    });
    
    return suggestions;
  };

  const handleMappingChange = (header: string, systemField: string) => {
    const newMappings = { ...fieldMappings, [header]: systemField };
    setFieldMappings(newMappings);
    onMappingConfigured(newMappings);
  };

  const getSystemFieldOptions = () => {
    const options = Object.entries(SYSTEM_FIELDS).map(([key, label]) => ({
      value: key,
      label: `${label} (${key})`
    }));
    
    // 添加自定义字段选项
    options.push({ value: 'skip', label: '跳过此字段' });
    
    return options;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          字段映射配置
        </CardTitle>
        <CardDescription>
          将Excel/CSV文件中的列映射到系统字段
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {enableAISuggestion && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                AI已自动分析并建议字段映射，您可以根据需要调整
              </span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Excel/CSV列名</TableHead>
                <TableHead>示例数据</TableHead>
                <TableHead>映射到系统字段</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.headers.map((header, index) => (
                <TableRow key={header}>
                  <TableCell className="font-medium">{header}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {parsedData.preview[0]?.[index] || '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={fieldMappings[header] || ''}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="选择系统字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSystemFieldOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {fieldMappings[header] ? (
                      <Badge variant="secondary">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        已映射
                      </Badge>
                    ) : (
                      <Badge variant="outline">未配置</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              共 {parsedData.headers.length} 个字段，
              已映射 {Object.keys(fieldMappings).filter(k => fieldMappings[k] !== 'skip').length} 个
            </div>
            <Button 
              onClick={() => onMappingConfigured(fieldMappings)}
              disabled={Object.keys(fieldMappings).length === 0}
            >
              确认映射配置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataMappingConfig; 