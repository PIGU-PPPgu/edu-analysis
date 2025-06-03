import { useState } from 'react';
import { toast } from 'sonner';
import { parseCSV, parseExcel, isBinaryContent, enhancedGenerateInitialMappings } from '@/utils/fileParsingUtils';
import { ParsedData } from '@/components/analysis/types';
import { intelligentFileParser } from '@/services/intelligentFileParser';
import { aiService } from '@/services/aiService';

/**
 * 文件处理 Hook
 */
export const useFileProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const processFile = async (file: File, isAIEnhanced: boolean = true): Promise<ParsedData | null> => {
    console.log("[useFileProcessing] 开始处理文件:", file.name, "AI增强:", isAIEnhanced);
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
      // 使用新的智能文件解析器
      setProgress(20);
      console.log("[useFileProcessing] 使用智能文件解析器处理文件");
      
      const parseResult = await intelligentFileParser.parseFile(file);
      
      setProgress(60);
      
      // 检查解析结果
      if (!parseResult || !parseResult.data || parseResult.data.length === 0) {
        throw new Error("文件解析失败或文件为空");
      }
      
      console.log("[useFileProcessing] 智能解析结果:", {
        confidence: parseResult.metadata.confidence,
        detectedStructure: parseResult.metadata.detectedStructure,
        detectedSubjects: parseResult.metadata.detectedSubjects,
        totalRows: parseResult.metadata.totalRows
      });
      
      setProgress(80);
      
      // 根据置信度决定是否跳过字段映射
      const shouldSkipMapping = parseResult.metadata.confidence >= 0.8;
      
      console.log("[useFileProcessing] 智能解析置信度检查:", {
        confidence: parseResult.metadata.confidence,
        shouldSkipMapping,
        threshold: 0.8,
        detectedStructure: parseResult.metadata.detectedStructure
      });
      
      let finalData = parseResult.data;
      let finalHeaders = parseResult.headers;
      
      // 如果是宽表格式且置信度高，自动转换为长表
      if (parseResult.metadata.detectedStructure === 'wide' && shouldSkipMapping) {
        console.log("[useFileProcessing] 自动转换宽表为长表格式");
        finalData = intelligentFileParser.convertWideToLong(
          parseResult.data,
          parseResult.metadata.suggestedMappings,
          parseResult.metadata.examInfo || {}
        );
        
        // 更新headers为长表格式
        finalHeaders = ['student_id', 'name', 'class_name', 'subject', 'score', 'grade', 'rank_in_class', 'rank_in_grade', 'exam_title', 'exam_type', 'exam_date', 'exam_scope'];
        
        // 为长表格式创建对应的字段映射
        const longTableMappings: Record<string, string> = {
          'student_id': 'student_id',
          'name': 'name',
          'class_name': 'class_name',
          'subject': 'subject',
          'score': 'score',
          'grade': 'grade',
          'rank_in_class': 'rank_in_class',
          'rank_in_grade': 'rank_in_grade',
          'exam_title': 'exam_title',
          'exam_type': 'exam_type',
          'exam_date': 'exam_date',
          'exam_scope': 'exam_scope'
        };
        
        console.log(`[useFileProcessing] 宽表转换完成，共生成 ${finalData.length} 条记录`);
        console.log(`[useFileProcessing] 使用长表字段映射:`, longTableMappings);
        
        // 构建返回结果（宽表转长表的情况）
        const result: ParsedData = {
          fileName: file.name,
          headers: finalHeaders,
          data: finalData,
          detectedFormat: parseResult.metadata.fileType,
          confidence: parseResult.metadata.confidence,
          fieldMappings: {}, // 长表格式不需要字段映射
          intelligentParseResult: {
            success: true,
            data: finalData,
            metadata: {
              originalHeaders: parseResult.headers,
              detectedStructure: 'long', // 转换后变为长表
              confidence: parseResult.metadata.confidence,
              suggestedMappings: longTableMappings, // 使用长表映射
              detectedSubjects: parseResult.metadata.detectedSubjects,
              examInfo: parseResult.metadata.examInfo,
              totalRows: finalData.length,
              autoProcessed: true, // 已自动处理
              unknownFields: [], // 长表格式没有未知字段
              needsFieldInquiry: false // 不需要字段询问
            }
          }
        };
        
        console.log("[useFileProcessing] ✅ 智能解析自动转换完成，autoProcessed=true，应该跳过字段映射步骤");
        console.log("[useFileProcessing] 返回结果:", {
          autoProcessed: result.intelligentParseResult?.metadata?.autoProcessed,
          confidence: result.confidence,
          dataLength: result.data.length,
          headers: result.headers
        });
        
        toast.success("智能解析成功", {
          description: `自动识别并转换文件结构，置信度 ${Math.round(parseResult.metadata.confidence * 100)}%`
        });
        
        return result;
      }
      
      setProgress(100);
      
      // 检查是否有未知字段需要询问
      const hasUnknownFields = parseResult.metadata.unknownFields && parseResult.metadata.unknownFields.length > 0;
      const needsFieldInquiry = hasUnknownFields && !shouldSkipMapping;
      
      // 构建返回结果
      const result: ParsedData = {
        fileName: file.name,
        headers: finalHeaders,
        data: finalData,
        detectedFormat: parseResult.metadata.fileType,
        confidence: parseResult.metadata.confidence,
        fieldMappings: shouldSkipMapping ? {} : parseResult.metadata.suggestedMappings, // 高置信度时返回空映射
        intelligentParseResult: {
          success: true,
          data: finalData,
          metadata: {
            originalHeaders: parseResult.headers,
            detectedStructure: parseResult.metadata.detectedStructure,
            confidence: parseResult.metadata.confidence,
            suggestedMappings: parseResult.metadata.suggestedMappings,
            detectedSubjects: parseResult.metadata.detectedSubjects,
            examInfo: parseResult.metadata.examInfo,
            totalRows: finalData.length,
            autoProcessed: shouldSkipMapping, // 标记是否自动处理
            unknownFields: parseResult.metadata.unknownFields,
            needsFieldInquiry // 标记是否需要字段询问
          }
        }
      };
      
      console.log("[useFileProcessing] 最终结果检查:", {
        shouldSkipMapping,
        autoProcessed: result.intelligentParseResult?.metadata?.autoProcessed,
        confidence: result.confidence,
        detectedStructure: parseResult.metadata.detectedStructure,
        dataLength: result.data.length
      });
      
      if (shouldSkipMapping) {
        console.log("[useFileProcessing] 智能解析置信度足够高，跳过字段映射步骤");
        toast.success("智能解析成功", {
          description: `自动识别文件结构，置信度 ${Math.round(parseResult.metadata.confidence * 100)}%`
        });
      } else {
        console.log("[useFileProcessing] 智能解析置信度较低，需要手动确认字段映射");
        toast.info("需要确认字段映射", {
          description: `解析置信度 ${Math.round(parseResult.metadata.confidence * 100)}%，请确认字段映射`
        });
      }
      
      return result;

    } catch (error) {
      console.error("解析文件失败:", error);
      
      // 如果智能解析失败，回退到传统解析方法
      console.log("[useFileProcessing] 智能解析失败，回退到传统解析方法");
      
      try {
        setProgress(30);
        
        let data: any[] = [];
        let headers: string[] = [];
        let detectedFormat = fileExtension || 'unknown';
        
        if (fileExtension === 'csv' || fileExtension === 'txt') {
          const content = await readFileAsText(file);
          
          if (isBinaryContent(content)) {
            throw new Error("无法解析文件，可能是二进制内容或损坏的文件");
          }
          
          if (!content.trim()) {
            throw new Error("文件为空，无内容可解析");
          }
          
          const result = parseCSV(content);
          headers = result.headers;
          data = result.data;
        } else {
          const buffer = await readFileAsArrayBuffer(file);
          const result = await parseExcel(buffer);
          headers = result.headers;
          data = result.data;
        }
        
        setProgress(70);
        
        // 数据清洗
        data = data.filter(row => {
          return Object.values(row).some(val => 
            val !== undefined && val !== null && val !== '');
        });
        
        if (data.length === 0) {
          throw new Error("解析后未发现有效数据记录");
        }
        
        setProgress(90);
        
        // 生成传统字段映射
        const fieldMappings = enhancedGenerateInitialMappings(headers, data.slice(0, Math.min(10, data.length)));
        
        setProgress(100);
        
        toast.warning("使用传统解析方法", {
          description: "智能解析失败，请手动确认字段映射"
        });
        
        return {
          fileName: file.name,
          headers,
          data,
          detectedFormat,
          confidence: 0.6,
          fieldMappings,
          intelligentParseResult: null
        };
        
      } catch (fallbackError) {
        console.error("传统解析方法也失败:", fallbackError);
        toast.error("文件解析失败", {
          description: fallbackError instanceof Error ? fallbackError.message : "无法解析文件内容"
        });
        return null;
      }
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
