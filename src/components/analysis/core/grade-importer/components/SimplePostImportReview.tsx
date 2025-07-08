/**
 * SimplePostImportReview - 简化版导入后字段检查组件
 * 
 * 重点显示未识别或有问题的字段，让用户快速处理
 * 成功映射的字段折叠显示，节省界面空间
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Target,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export interface SimplePostImportReviewProps {
  headers: string[];
  sampleData: any[];
  currentMapping: Record<string, string>;
  onConfirmAndProceed: () => void;
  onReimport: () => void;
}

const SimplePostImportReview: React.FC<SimplePostImportReviewProps> = ({
  headers,
  sampleData,
  currentMapping,
  onConfirmAndProceed,
  onReimport
}) => {
  const [showSuccessFields, setShowSuccessFields] = useState(false);

  // 简单的字段分析
  const unmappedFields = headers.filter(header => !currentMapping[header]);
  const mappedFields = headers.filter(header => currentMapping[header]);

  // 获取字段显示名称
  const getFieldDisplayName = (fieldKey: string): string => {
    const displayNames: Record<string, string> = {
      name: '学生姓名',
      student_id: '学号',
      class_name: '班级',
      chinese_score: '语文成绩',
      math_score: '数学成绩',
      english_score: '英语成绩',
      total_score: '总分',
      rank_in_class: '班级排名',
      rank_in_grade: '年级排名'
    };
    return displayNames[fieldKey] || fieldKey;
  };

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
                {unmappedFields.length > 0 
                  ? `发现 ${unmappedFields.length} 个字段需要处理`
                  : '所有字段已正确识别'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{unmappedFields.length}</div>
              <div className="text-sm text-gray-600">未识别字段</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{mappedFields.length}</div>
              <div className="text-sm text-gray-600">已正确识别</div>
            </div>
          </div>
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
              这些字段无法自动识别，暂时忽略这些字段或选择重新导入
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unmappedFields.map((field) => (
              <Alert key={field} className="border-red-200">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-800">"{field}"</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        数据示例: {sampleData.slice(0, 3).map(row => row[field]).filter(val => val != null).join(', ') || '无数据'}
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 成功识别的字段 - 折叠显示 */}
      {mappedFields.length > 0 && (
        <Card className="border-green-200">
          <CardHeader 
            className="cursor-pointer hover:bg-green-50"
            onClick={() => setShowSuccessFields(!showSuccessFields)}
          >
            <CardTitle className="flex items-center justify-between text-green-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                已正确识别的字段 ({mappedFields.length})
              </div>
              {showSuccessFields ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          
          {showSuccessFields && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mappedFields.map((field) => (
                  <div key={field} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">"{field}"</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-green-600">{getFieldDisplayName(currentMapping[field])}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 底部操作栏 */}
      <Card className="border-t-2 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {unmappedFields.length === 0 ? (
                <span className="text-green-600 font-medium"> 所有字段已处理完成，可以开始分析</span>
              ) : (
                <span>还有 {unmappedFields.length} 个字段未识别（将被忽略）</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onReimport}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重新导入
              </Button>
              
              <Button 
                onClick={onConfirmAndProceed}
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

export default SimplePostImportReview;