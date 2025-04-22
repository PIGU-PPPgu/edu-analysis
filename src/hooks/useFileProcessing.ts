
import { useState } from 'react';
import { toast } from 'sonner';
import { parseCSV, parseExcel } from '@/components/analysis/utils/fileParsingUtils';
import { ParsedData } from '@/components/analysis/types';

export const useFileProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const processFile = async (file: File): Promise<ParsedData | null> => {
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
      return null;
    }

    setIsProcessing(true);
    setProgress(0);
    setFileInfo({ name: file.name, size: file.size });

    try {
      setProgress(20);
      let data: any[];
      let headers: string[];

      if (fileExtension === 'csv' || fileExtension === 'txt') {
        const content = await readFileAsText(file);
        const result = parseCSV(content);
        headers = result.headers;
        data = result.data;
      } else {
        const buffer = await readFileAsArrayBuffer(file);
        const result = await parseExcel(buffer);
        headers = result.headers;
        data = result.data;
      }

      setProgress(100);
      
      return {
        headers,
        data,
        detectedFormat: fileExtension || 'unknown',
        confidence: 0.9,
        fieldMappings: {}
      };

    } catch (error) {
      console.error("解析文件失败:", error);
      toast.error("文件解析失败", {
        description: error instanceof Error ? error.message : "无法解析文件内容"
      });
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(0);
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

  return {
    isProcessing,
    progress,
    fileInfo,
    processFile
  };
};
