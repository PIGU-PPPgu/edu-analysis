
import React, { useRef } from "react";
import { FileInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFileProcessing } from "@/hooks/useFileProcessing";
import { FileProcessingProps } from "./types";
import { toast } from "sonner";

const FileUploader: React.FC<FileProcessingProps> = ({ onFileProcessed, isAIEnhanced }) => {
  const { isProcessing, progress, fileInfo, processFile } = useFileProcessing();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 文件大小验证 (限制为10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("文件过大", {
        description: "文件大小不能超过10MB"
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      const result = await processFile(file);
      if (result) {
        onFileProcessed(result);
      }
    } catch (error) {
      console.error("处理文件时出错:", error);
      toast.error("文件处理失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // 文件大小验证 (限制为10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("文件过大", {
          description: "文件大小不能超过10MB"
        });
        return;
      }

      try {
        const result = await processFile(file);
        if (result) {
          onFileProcessed(result);
        }
      } catch (error) {
        console.error("处理文件时出错:", error);
        toast.error("文件处理失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (isProcessing) {
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
          <p className="text-sm font-medium">{progress}%</p>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="mt-4 text-sm">
          <p>正在进行智能数据解析...</p>
          <ul className="mt-2 space-y-1 text-gray-500">
            <li className={progress >= 20 ? "text-green-600" : ""}>✓ 数据格式检测</li>
            <li className={progress >= 40 ? "text-green-600" : ""}>✓ 列标题分析</li>
            <li className={progress >= 60 ? "text-green-600" : ""}>✓ 数据类型推断</li>
            <li className={progress >= 80 ? "text-green-600" : ""}>✓ 数据清洗和处理</li>
            <li className={progress >= 100 ? "text-green-600" : ""}>✓ 解析完成</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#B9FF66] transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <FileInput className="h-10 w-10 mx-auto text-gray-400 mb-4" />
      <p className="text-lg font-medium mb-2">拖拽文件到此处或点击上传</p>
      <p className="text-sm text-gray-500 mb-4">
        支持 CSV、Excel文件，系统将自动识别并解析
      </p>
      <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px] inline-block">
        选择文件
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xls,.xlsx"
          className="hidden"
          onChange={handleFileUpload}
        />
      </label>
      
      <div className="mt-6 text-xs text-gray-400">
        支持的文件格式: CSV, Excel (XLS/XLSX), 文本文件 (TXT)
        <br />
        最大文件大小: 10MB
      </div>
    </div>
  );
};

export default FileUploader;
