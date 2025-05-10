import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';

interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject: string;
}

interface SimplifiedExamFormProps {
  initialExamInfo: ExamInfo;
  onExamInfoChange: (newExamInfo: ExamInfo) => void;
}

const SimplifiedExamForm: React.FC<SimplifiedExamFormProps> = ({ initialExamInfo, onExamInfoChange }) => {
  const [title, setTitle] = useState(initialExamInfo.title);
  const [type, setType] = useState(initialExamInfo.type);
  const [date, setDate] = useState(initialExamInfo.date);
  const [subject, setSubject] = useState(initialExamInfo.subject);

  useEffect(() => {
    setTitle(initialExamInfo.title);
    setType(initialExamInfo.type);
    setDate(initialExamInfo.date);
    setSubject(initialExamInfo.subject);
  }, [initialExamInfo]);

  const handleChange = (field: keyof ExamInfo, value: string) => {
    let newInfo: ExamInfo;
    switch (field) {
      case 'title':
        setTitle(value);
        newInfo = { ...initialExamInfo, title: value, type, date, subject };
        break;
      case 'type':
        setType(value);
        newInfo = { ...initialExamInfo, type: value, title, date, subject };
        break;
      case 'date':
        setDate(value);
        newInfo = { ...initialExamInfo, date: value, title, type, subject };
        break;
      case 'subject':
        setSubject(value);
        newInfo = { ...initialExamInfo, subject: value, title, type, date };
        break;
      default:
        return;
    }
    // 在这里，我们使用更新后的本地状态来构建 newInfo
    // 但为了确保 onExamInfoChange 接收到的是基于当前用户输入最新状态的对象
    // 我们可以直接使用 setState 的回调或者在调用前更新状态
    
    // 修正：确保使用最新的本地状态值构造传递给父组件的对象
    const updatedInfo = {
        title: field === 'title' ? value : title,
        type: field === 'type' ? value : type,
        date: field === 'date' ? value : date,
        subject: field === 'subject' ? value : subject,
    };
     // 如果 initialExamInfo 中包含其他未在此表单处理的字段，需要合并进来
     const finalInfo = { ...initialExamInfo, ...updatedInfo };

    onExamInfoChange(finalInfo);
  };
  
  // 更简洁和正确的 handleChange
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, fieldName: keyof ExamInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setter(newValue);
    
    // 创建一个新的 examInfo 对象，它基于当前所有输入字段的最新值
    const updatedExamInfo = {
      title: fieldName === 'title' ? newValue : title,
      type: fieldName === 'type' ? newValue : type,
      date: fieldName === 'date' ? newValue : date,
      subject: fieldName === 'subject' ? newValue : subject,
    };
    // 如果 initialExamInfo 中包含其他未在此表单处理的字段，需要合并进来
    const finalInfo = { ...initialExamInfo, ...updatedExamInfo };
    onExamInfoChange(finalInfo);
  };


  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-medium text-sm flex items-center gap-1.5">
        <CalendarIcon className="h-4 w-4 text-purple-500" />
        考试信息
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="simplifiedExamTitle" className="text-sm">
            考试标题 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="simplifiedExamTitle"
            placeholder="如：2023年秋季期中考试"
            value={title}
            onChange={handleInputChange(setTitle, 'title')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="simplifiedExamType" className="text-sm">
            考试类型 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="simplifiedExamType"
            placeholder="如：期中/期末/单元测试"
            value={type}
            onChange={handleInputChange(setType, 'type')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="simplifiedExamDate" className="text-sm">
            考试日期
          </Label>
          <Input
            id="simplifiedExamDate"
            type="date"
            value={date}
            onChange={handleInputChange(setDate, 'date')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="simplifiedExamSubject" className="text-sm">
            统一科目 <span className="text-gray-500 text-xs">(可选)</span>
          </Label>
          <Input
            id="simplifiedExamSubject"
            placeholder="如所有记录使用同一科目"
            value={subject}
            onChange={handleInputChange(setSubject, 'subject')}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">注：标有 * 的字段为必填项；统一科目如果设置，将覆盖文件中的科目信息</p>
    </div>
  );
};

export default SimplifiedExamForm; 