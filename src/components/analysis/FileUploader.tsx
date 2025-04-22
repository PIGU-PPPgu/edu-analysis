
import React, { useState } from "react";
import { FileInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { parseCSV, parseExcel } from "./utils/fileParsingUtils";

interface FileUploaderProps {
  onFileProcessed: (data: any[], headers: string[]) => void;
  isAIEnhanced: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileProcessed, isAIEnhanced }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && 
        !['csv', 'xls', 'xlsx', 'txt'].includes(fileExtension || '')) {
      toast.error("不支持的文件格式", {
        description: "请上传CSV、Excel(xls/xlsx)或文本文件"
      });
      return;
    }

    setIsUploading(true);
    setParseProgress(0);
    setFileInfo({ name: file.name, size: file.size });

    try {
      let data: any[];
      let headers: string[];

      setParseProgress(20);

      if (fileExtension === 'csv' || fileExtension === 'txt') {
        const content = await readFileAsText(file);
        const { headers: csvHeaders, data: csvData } = parseCSV(content);
        headers = csvHeaders;
        data = csvData;
      } else {
        const buffer = await readFileAsArrayBuffer(file);
        const { headers: excelHeaders, data: excelData } = await parseExcel(buffer);
        headers = excelHeaders;
        data = excelData;
      }

      setParseProgress(100);
      onFileProcessed(data, headers);

    } catch (error) {
      console.error("解析文件失败:", error);
      toast.error("文件解析失败", {
        description: error instanceof Error ? error.message : "无法解析文件内容"
      });
    } finally {
      setIsUploading(false);
      setParseProgress(0);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  if (isUploading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-medium">{fileInfo?.name}</p>
            <p className="text-sm text-gray-500">
              {(fileInfo?.size || 0) / 1024 < 1024 
                ? `${Math.round((fileInfo?.size || 0) / 1024)} KB` 
                : `${Math.round((fileInfo?.size || 0) / 1024 / 1024 * 10) / 10} MB`}
            </p>
          </div>
          <p className="text-sm font-medium">{parseProgress}%</p>
        </div>
        <Progress value={parseProgress} className="h-2" />
        <div className="mt-4 text-sm">
          <p>正在进行智能数据解析...</p>
          <ul className="mt-2 space-y-1 text-gray-500">
            <li className={parseProgress >= 20 ? "text-green-600" : ""}>✓ 数据格式检测</li>
            <li className={parseProgress >= 40 ? "text-green-600" : ""}>✓ 列标题分析</li>
            <li className={parseProgress >= 60 ? "text-green-600" : ""}>✓ 数据类型推断</li>
            <li className={parseProgress >= 80 ? "text-green-600" : ""}>✓ 数据清洗和处理</li>
            <li className={parseProgress >= 100 ? "text-green-600" : ""}>✓ 解析完成</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <FileInput className="h-10 w-10 mx-auto text-gray-400 mb-4" />
      <p className="text-lg font-medium mb-2">拖拽文件到此处或点击上传</p>
      <p className="text-sm text-gray-500 mb-4">
        支持 CSV、Excel文件，系统将自动识别并解析
      </p>
      <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px] inline-block">
        选择文件
        <Input
          type="file"
          accept=".csv,.txt,.xls,.xlsx"
          className="hidden"
          onChange={handleFileUpload}
        />
      </label>
    </div>
  );
};

export default FileUploader;
