
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const GradeExport: React.FC = () => {
  const { gradeData } = useGradeAnalysis();
  const [exportFormat, setExportFormat] = useState<string>("excel");
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [includeStats, setIncludeStats] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = () => {
    if (gradeData.length === 0) {
      toast.error("无数据可导出", {
        description: "请先导入或生成数据"
      });
      return;
    }

    setIsExporting(true);

    try {
      if (exportFormat === "excel") {
        exportToExcel();
      } else if (exportFormat === "csv") {
        exportToCSV();
      } else if (exportFormat === "json") {
        exportToJSON();
      }

      toast.success("数据导出成功", {
        description: `已成功导出${gradeData.length}条数据记录`
      });
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败", {
        description: "生成文件时发生错误，请重试"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // 成绩数据表
    const worksheet = XLSX.utils.json_to_sheet(gradeData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "成绩数据");
    
    // 如果包含统计数据，添加统计表
    if (includeStats) {
      const statsData = generateStatsData();
      const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsWorksheet, "统计分析");
    }
    
    XLSX.writeFile(workbook, "成绩分析报告.xlsx");
  };

  const exportToCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(gradeData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', '成绩数据.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const jsonData = JSON.stringify(gradeData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', '成绩数据.json');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 生成统计数据
  const generateStatsData = () => {
    // 按科目分组计算平均分、最高分、最低分
    const subjectMap = new Map<string, number[]>();
    
    gradeData.forEach(record => {
      const subject = record.subject;
      const score = typeof record.score === 'number' ? record.score : parseFloat(record.score);
      
      if (!isNaN(score)) {
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, []);
        }
        subjectMap.get(subject)?.push(score);
      }
    });
    
    const statsData: any[] = [];
    
    subjectMap.forEach((scores, subject) => {
      if (scores.length > 0) {
        // 计算平均分
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = sum / scores.length;
        
        // 获取最高分和最低分
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        
        // 计算标准差
        const mean = avg;
        const sumSquareDiff = scores.reduce((sum, score) => {
          return sum + Math.pow(score - mean, 2);
        }, 0);
        const stdDev = Math.sqrt(sumSquareDiff / scores.length);
        
        statsData.push({
          科目: subject,
          平均分: avg.toFixed(2),
          最高分: max,
          最低分: min,
          标准差: stdDev.toFixed(2),
          样本数: scores.length
        });
      }
    });
    
    return statsData;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          数据导出
        </CardTitle>
        <CardDescription>导出分析数据和报告</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="export-format">导出格式</Label>
          <Select 
            value={exportFormat} 
            onValueChange={setExportFormat}
          >
            <SelectTrigger id="export-format">
              <SelectValue placeholder="选择导出格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excel">Excel工作簿 (.xlsx)</SelectItem>
              <SelectItem value="csv">CSV文件 (.csv)</SelectItem>
              <SelectItem value="json">JSON数据 (.json)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-stats" 
              checked={includeStats}
              onCheckedChange={(checked) => setIncludeStats(checked as boolean)}
              disabled={exportFormat !== "excel"}
            />
            <Label htmlFor="include-stats" className={exportFormat !== "excel" ? "text-gray-400" : ""}>
              包含统计分析
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-charts" 
              checked={includeCharts}
              onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
              disabled={exportFormat !== "excel"}
            />
            <Label htmlFor="include-charts" className={exportFormat !== "excel" ? "text-gray-400" : ""}>
              包含图表(仅Excel)
            </Label>
          </div>
        </div>
        
        <Button 
          onClick={handleExport}
          className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
          disabled={isExporting || gradeData.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "导出中..." : "导出数据"}
        </Button>
        
        {gradeData.length === 0 && (
          <div className="text-sm text-center text-gray-500">
            暂无数据可导出，请先导入或生成数据
          </div>
        )}
        
        {gradeData.length > 0 && (
          <div className="text-sm text-gray-500">
            导出内容包括：
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>学生成绩数据 ({gradeData.length}条记录)</li>
              {includeStats && exportFormat === "excel" && <li>科目统计分析</li>}
              {includeCharts && exportFormat === "excel" && <li>成绩分布图表</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeExport;
