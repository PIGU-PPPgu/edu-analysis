
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const TemplateDownloader: React.FC = () => {
  const downloadTemplate = (type: 'basic' | 'detailed') => {
    let csvContent = '';
    
    if (type === 'basic') {
      csvContent = "学号,姓名,分数,科目\n20230001,张三,92,语文\n20230002,李四,85,语文\n20230003,王五,78,语文";
    } else {
      csvContent = "学号,姓名,班级,科目,分数,考试日期,考试类型,教师\n20230001,张三,一年级1班,语文,92,2023/09/01,期中考试,李老师\n20230001,张三,一年级1班,数学,85,2023/09/01,期中考试,王老师\n20230001,张三,一年级1班,英语,78,2023/09/01,期中考试,赵老师";
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = type === 'basic' ? "成绩基础模板.csv" : "成绩详细模板.csv";
    link.click();
    toast.success("模板下载成功");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">基础成绩模板</CardTitle>
            <CardDescription>包含学号、姓名、分数、科目字段</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => downloadTemplate('basic')}
            >
              下载模板
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">详细成绩模板</CardTitle>
            <CardDescription>包含更多详细字段和示例数据</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => downloadTemplate('detailed')}
            >
              下载模板
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg text-sm">
        <p className="font-medium mb-2">导入数据说明：</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>列标题必须完整，系统将根据标题自动识别数据类型</li>
          <li>学号字段必须唯一，用于标识不同学生</li>
          <li>数字类型字段请勿包含非数字字符</li>
          <li>日期格式推荐使用 YYYY/MM/DD 或 YYYY-MM-DD</li>
          <li>如有特殊格式数据，系统将尝试智能解析或提供手动映射</li>
          <li>支持CSV和Excel格式文件导入</li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateDownloader;
