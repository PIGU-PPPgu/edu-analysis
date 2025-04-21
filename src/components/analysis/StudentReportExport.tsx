
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Download, FileText, Printer, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentData {
  studentId: string;
  name: string;
  className?: string;
  scores: {
    subject: string;
    score: number;
    examDate?: string;
    examType?: string;
  }[];
}

interface StudentReportExportProps {
  student: StudentData;
}

const StudentReportExport: React.FC<StudentReportExportProps> = ({ student }) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportPDF = () => {
    setIsExporting(true);
    
    // 模拟PDF生成过程
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: "导出成功",
        description: `${student.name}的成绩报告已成功导出为PDF`,
        variant: "default",
      });
    }, 2000);
  };
  
  const handlePrint = () => {
    toast({
      title: "准备打印",
      description: "正在准备打印文档，请确保打印机已连接",
    });
    // 实际实现中会调用打印API
  };
  
  const handleShare = () => {
    toast({
      title: "分享功能",
      description: "分享功能即将上线，敬请期待",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">报告导出</CardTitle>
        <CardDescription>
          生成学生个性化学习报告与成绩分析
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="flex items-center gap-2 bg-[#B9FF66] text-black hover:bg-[#a8e85c]" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                正在导出...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                导出PDF报告
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            打印报告
          </Button>
        </div>
        
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-sm font-medium mb-2">报告内容</div>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>基础信息概览</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>各科成绩详情</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>学习能力分析</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>班级对比数据</span>
            </div>
            <div className="flex items-center text-sm">
              <Check className="h-4 w-4 mr-2 text-green-500" />
              <span>AI学习建议</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          分享报告
        </Button>
      </CardContent>
    </Card>
  );
};

export default StudentReportExport;
