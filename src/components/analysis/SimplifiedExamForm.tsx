import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

// 考试信息类型定义
export interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject?: string;
}

// 组件属性定义
interface SimplifiedExamFormProps {
  examInfo: ExamInfo;
  onChange: (examInfo: ExamInfo) => void;
}

const SimplifiedExamForm: React.FC<SimplifiedExamFormProps> = ({ examInfo, onChange }) => {
  const handleChange = (field: keyof ExamInfo, value: string) => {
    onChange({
      ...examInfo,
      [field]: value
    });
  };

  // 检查是否有未填写的必填字段
  const hasEmptyRequiredFields = 
    !examInfo.title || examInfo.title.trim() === '' ||
    !examInfo.type || examInfo.type.trim() === '' ||
    !examInfo.date || examInfo.date.trim() === '';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {hasEmptyRequiredFields && (
            <Alert className="bg-amber-50">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-700">考试信息不完整</AlertTitle>
              <AlertDescription className="text-amber-600">
                请完善所有必填的考试信息字段，以便正确导入成绩数据。
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-title">考试标题 <span className="text-red-500">*</span></Label>
              <Input 
                id="exam-title"
                placeholder="如：2023学年第一学期期末考试"
                value={examInfo.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-type">考试类型 <span className="text-red-500">*</span></Label>
              <Select 
                value={examInfo.type || ''}
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger id="exam-type">
                  <SelectValue placeholder="选择考试类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="期中考试">期中考试</SelectItem>
                  <SelectItem value="期末考试">期末考试</SelectItem>
                  <SelectItem value="单元测试">单元测试</SelectItem>
                  <SelectItem value="月考">月考</SelectItem>
                  <SelectItem value="模拟考">模拟考</SelectItem>
                  <SelectItem value="水平考">水平考</SelectItem>
                  <SelectItem value="联考">联考</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-date">考试日期 <span className="text-red-500">*</span></Label>
              <Input 
                id="exam-date"
                type="date"
                value={examInfo.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
              />
            </div>

            {examInfo.subject !== undefined && (
              <div className="space-y-2">
                <Label htmlFor="exam-subject">考试科目</Label>
                <Select 
                  value={examInfo.subject || ''}
                  onValueChange={(value) => handleChange('subject', value)}
                >
                  <SelectTrigger id="exam-subject">
                    <SelectValue placeholder="选择考试科目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="语文">语文</SelectItem>
                    <SelectItem value="数学">数学</SelectItem>
                    <SelectItem value="英语">英语</SelectItem>
                    <SelectItem value="物理">物理</SelectItem>
                    <SelectItem value="化学">化学</SelectItem>
                    <SelectItem value="生物">生物</SelectItem>
                    <SelectItem value="政治">政治</SelectItem>
                    <SelectItem value="历史">历史</SelectItem>
                    <SelectItem value="地理">地理</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedExamForm; 