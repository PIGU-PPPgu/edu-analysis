
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileExport, Download, Save } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ExportData {
  students?: any[];
  grades?: any[];
  classInfo?: any[];
}

interface Props {
  data: ExportData;
}

const DataExport: React.FC<Props> = ({ data }) => {
  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Export students
      if (data.students?.length) {
        const studentWS = XLSX.utils.json_to_sheet(data.students);
        XLSX.utils.book_append_sheet(workbook, studentWS, "学生信息");
      }
      
      // Export grades
      if (data.grades?.length) {
        const gradesWS = XLSX.utils.json_to_sheet(data.grades);
        XLSX.utils.book_append_sheet(workbook, gradesWS, "成绩数据");
      }
      
      // Export class info
      if (data.classInfo?.length) {
        const classWS = XLSX.utils.json_to_sheet(data.classInfo);
        XLSX.utils.book_append_sheet(workbook, classWS, "班级信息");
      }
      
      XLSX.writeFile(workbook, "成绩分析报告.xlsx");
      toast.success("数据导出成功");
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败，请重试");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileExport className="h-5 w-5" />
          数据导出
        </CardTitle>
        <CardDescription>导出分析数据和报告</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleExportExcel}
          className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
        >
          <Download className="mr-2 h-4 w-4" />
          导出Excel报告
        </Button>
        
        <div className="text-sm text-gray-500">
          导出内容包括：
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>学生基本信息</li>
            <li>成绩数据分析</li>
            <li>班级统计信息</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExport;
