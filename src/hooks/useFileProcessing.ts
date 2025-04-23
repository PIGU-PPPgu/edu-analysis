
import { useState } from 'react';
import { toast } from 'sonner';
import { parseCSV, parseExcel, isBinaryContent } from '@/utils/fileParsingUtils';
import { ParsedData } from '@/components/analysis/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * 文件处理 Hook
 */
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
      // 初始阶段 - 读取文件内容
      setProgress(20);
      let data: any[] = [];
      let headers: string[] = [];
      let detectedFormat = fileExtension || 'unknown';
      let confidence = 0.7;

      if (fileExtension === 'csv' || fileExtension === 'txt') {
        const content = await readFileAsText(file);
        
        // 检查是否为二进制文件而非文本文件
        if (isBinaryContent(content)) {
          throw new Error("无法解析文件，可能是二进制内容或损坏的文件");
        }
        
        // 检查空文件
        if (!content.trim()) {
          throw new Error("文件为空，无内容可解析");
        }
        
        try {
          const result = parseCSV(content);
          headers = result.headers;
          data = result.data;
          confidence = 0.9;
        } catch (csvError) {
          console.error("CSV解析失败:", csvError);
          throw new Error(`CSV解析失败: ${csvError instanceof Error ? csvError.message : "未知错误"}`);
        }
      } else {
        try {
          const buffer = await readFileAsArrayBuffer(file);
          const result = await parseExcel(buffer);
          headers = result.headers;
          data = result.data;
          confidence = 0.95;
        } catch (excelError) {
          console.error("Excel解析失败:", excelError);
          throw new Error(`Excel解析失败: ${excelError instanceof Error ? excelError.message : "未知错误"}`);
        }
      }

      // 检查数据有效性
      if (!Array.isArray(headers) || headers.length === 0) {
        throw new Error("文件格式不正确，未能识别列标题");
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("解析后未发现有效数据记录");
      }

      // 数据清洗和增强
      setProgress(50);
      
      // 标准化数据 - 移除空行和处理特殊字符
      data = data.filter(row => {
        // 检查是否有至少一个非空值
        return Object.values(row).some(val => 
          val !== undefined && val !== null && val !== '');
      });
      
      // 调用 Supabase Edge 函数进行额外的数据增强（如果需要）
      // 这里可以根据实际需求添加对 Edge 函数的调用
      setProgress(70);
      
      // 智能类型转换 - 判断考试日期、成绩等
      data = data.map(row => {
        const processedRow = { ...row };
        
        // 处理数值类型
        Object.keys(processedRow).forEach(key => {
          // 分数应该是数字
          if (key.toLowerCase().includes('score') || 
              key.toLowerCase().includes('分数') || 
              key.toLowerCase().includes('成绩')) {
            const numValue = parseFloat(processedRow[key]);
            if (!isNaN(numValue)) {
              processedRow[key] = numValue;
            }
          }
          
          // 日期格式处理
          if (key.toLowerCase().includes('date') || 
              key.toLowerCase().includes('日期')) {
            // 尝试转换为标准日期格式
            const dateValue = processedRow[key];
            if (typeof dateValue === 'string') {
              // 处理中文日期格式 (如 "2023年5月1日")
              const zhMatch = dateValue.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
              if (zhMatch) {
                const [_, year, month, day] = zhMatch;
                processedRow[key] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              // 处理斜杠日期格式 (如 "2023/5/1")
              const slashMatch = dateValue.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
              if (slashMatch) {
                const [_, year, month, day] = slashMatch;
                processedRow[key] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }
          }
        });
        
        return processedRow;
      });
      
      // 最终处理
      setProgress(100);
      
      // 返回解析结果
      return {
        headers,
        data,
        detectedFormat,
        confidence,
        fieldMappings: {}
      };

    } catch (error) {
      console.error("解析文件失败:", error);
      toast.error("文件解析失败", {
        description: error instanceof Error ? error.message : "无法解析文件内容"
      });
      return null;
    } finally {
      // 延迟重置状态，让用户看到100%完成的进度
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 500);
    }
  };

  /**
   * 读取文件为文本
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => {
        console.error("文件读取错误:", e);
        reject(new Error("读取文件时发生错误"));
      };
      reader.readAsText(file);
    });
  };

  /**
   * 读取文件为 ArrayBuffer
   */
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (e) => {
        console.error("文件读取错误:", e);
        reject(new Error("读取文件时发生错误"));
      };
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
