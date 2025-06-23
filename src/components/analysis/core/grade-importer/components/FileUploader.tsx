import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Download, 
  FileSpreadsheet,
  UploadCloud, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
// 导入AI解析服务
import { aiEnhancedFileParser } from '@/services/aiEnhancedFileParser';
import { initDefaultAIConfig } from '@/utils/userAuth';

// 文件数据接口
export interface FileDataForReview {
  headers: string[];
  data: any[];
  rawData?: any[][];
  fileName?: string;
  fileSize?: number;
  totalRows?: number;
  // AI解析结果
  aiAnalysis?: {
    examInfo?: {
      title: string;
      type: string;
      date: string;
      scope: string;
    };
    fieldMappings?: Record<string, string>;
    subjects?: string[];
    dataStructure?: 'wide' | 'long' | 'mixed';
    confidence?: number;
    autoProcessed?: boolean;
    processing?: {
      requiresUserInput: boolean;
      issues: string[];
      suggestions: string[];
    };
  };
}

// FileUploader 组件属性
interface FileUploaderProps {
  onFileUploaded: (fileData: FileDataForReview, fileInfo: { name: string; size: number }) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  acceptedFormats?: string[];
  maxFileSize?: number; // MB
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUploaded,
  onError,
  disabled = false,
  acceptedFormats = ['.xlsx', '.xls', '.csv'],
  maxFileSize = 10
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 获取文件图标
  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'csv':
        return <FileText className="w-6 h-6 text-blue-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 验证文件格式
  const validateFile = (file: File): string | null => {
    const fileName = file.name.toLowerCase();
    const isValidFormat = acceptedFormats.some(format => fileName.endsWith(format.toLowerCase()));
    
    if (!isValidFormat) {
      return `不支持的文件格式。支持的格式: ${acceptedFormats.join(', ')}`;
    }
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return `文件大小超过限制 (${maxFileSize}MB)。当前文件: ${fileSizeMB.toFixed(2)}MB`;
    }
    
    return null;
  };

  // 解析Excel文件
  const parseExcelFile = (file: File): Promise<FileDataForReview> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为JSON，保持原始数据结构
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',
            raw: false 
          }) as any[][];
          
          if (jsonData.length === 0) {
            reject(new Error('Excel文件为空'));
            return;
          }
          
          // 提取表头（第一行）
          const headers = jsonData[0]?.map(header => String(header || '').trim()).filter(h => h) || [];
          
          if (headers.length === 0) {
            reject(new Error('Excel文件没有有效的表头'));
            return;
          }
          
          // 提取数据行（跳过表头）
          const dataRows = jsonData.slice(1)
            .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map(row => {
              const rowData: Record<string, any> = {};
              headers.forEach((header, index) => {
                const value = row[index];
                rowData[header] = value !== null && value !== undefined ? String(value).trim() : '';
              });
              return rowData;
            });
          
          resolve({
            headers,
            data: dataRows,
            rawData: jsonData,
            fileName: file.name,
            fileSize: file.size,
            totalRows: dataRows.length
          });
        } catch (error) {
          reject(new Error(`解析Excel文件失败: ${error.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 解析CSV文件
  const parseCSVFile = (file: File): Promise<FileDataForReview> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              const errorMsg = results.errors.map(e => e.message).join(', ');
              reject(new Error(`CSV解析错误: ${errorMsg}`));
              return;
            }
            
            const rawData = results.data as string[][];
            
            if (rawData.length === 0) {
              reject(new Error('CSV文件为空'));
              return;
            }
            
            // 提取表头
            const headers = rawData[0]?.map(header => String(header || '').trim()).filter(h => h) || [];
            
            if (headers.length === 0) {
              reject(new Error('CSV文件没有有效的表头'));
              return;
            }
            
            // 提取数据行
            const dataRows = rawData.slice(1)
              .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
              .map(row => {
                const rowData: Record<string, any> = {};
                headers.forEach((header, index) => {
                  const value = row[index];
                  rowData[header] = value !== null && value !== undefined ? String(value).trim() : '';
                });
                return rowData;
              });
            
            resolve({
              headers,
              data: dataRows,
              rawData,
              fileName: file.name,
              fileSize: file.size,
              totalRows: dataRows.length
            });
          } catch (error) {
            reject(new Error(`解析CSV文件失败: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV文件读取失败: ${error.message}`));
        }
      });
    });
  };

  // 处理文件上传
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      // 验证文件
      const validationError = validateFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      let fileData: FileDataForReview;
      
      // 根据文件类型选择解析方法
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        fileData = await parseExcelFile(file);
      } else if (fileName.endsWith('.csv')) {
        fileData = await parseCSVFile(file);
      } else {
        throw new Error('不支持的文件格式');
      }
      
      clearInterval(progressInterval);
      setUploadProgress(90);
      
      // 验证解析结果
      if (!fileData.headers || fileData.headers.length === 0) {
        throw new Error('文件没有有效的表头');
      }
      
      if (!fileData.data || fileData.data.length === 0) {
        throw new Error('文件没有有效的数据行');
      }
      
      // 🤖 尝试AI智能解析增强
      try {
        console.log('[FileUploader] 🚀 尝试AI智能解析增强...');
        
        // 确保AI配置已初始化
        await initDefaultAIConfig(false);
        
        // 调用AI解析服务
        const aiResult = await aiEnhancedFileParser.oneClickParse(file);
        
        if (aiResult && aiResult.metadata) {
          // 将AI解析结果合并到文件数据中
          fileData.aiAnalysis = {
            examInfo: aiResult.metadata.examInfo,
            fieldMappings: aiResult.metadata.suggestedMappings,
            subjects: aiResult.metadata.detectedSubjects,
            dataStructure: aiResult.metadata.detectedStructure,
            confidence: aiResult.metadata.confidence,
            autoProcessed: aiResult.metadata.autoProcessed,
            processing: {
              requiresUserInput: (aiResult.metadata.confidence || 0) < 0.8,
              issues: aiResult.metadata.unknownFields?.map(field => `未识别字段: ${field}`) || [],
              suggestions: []
            }
          };
          
          console.log(`[FileUploader] ✅ AI解析成功，置信度: ${aiResult.metadata.confidence}`);
          toast.success(`AI智能解析完成！置信度: ${Math.round((aiResult.metadata.confidence || 0) * 100)}%`);
        }
      } catch (aiError) {
        console.warn('[FileUploader] ⚠️ AI解析失败，使用基础解析:', aiError);
        // AI解析失败不影响基础功能，只是缺少智能增强
        toast.info('文件解析成功，AI增强功能暂时不可用');
      }
      
      setUploadProgress(100);
      
      const successMessage = fileData.aiAnalysis?.autoProcessed 
        ? `AI智能解析完成！自动识别了 ${fileData.aiAnalysis.subjects?.length || 0} 个科目`
        : `文件上传成功！解析了 ${fileData.totalRows} 行数据`;
      
      toast.success(successMessage);
      
      onFileUploaded(fileData, {
        name: file.name,
        size: file.size
      });
      
    } catch (error) {
      onError(error.message || '文件处理失败');
      toast.error('文件处理失败: ' + (error.message || '未知错误'));
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  // 设置拖拽上传
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: async (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(f => f.errors.map(e => e.message).join(', ')).join('; ');
        onError(`文件不符合要求: ${errors}`);
        return;
      }
      
      if (acceptedFiles.length > 0) {
        await processFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: maxFileSize * 1024 * 1024,
    disabled: disabled || isProcessing
  });

  // 模板下载功能
  const handleTemplateDownload = (type: 'excel' | 'csv') => {
    const templateData = [
      ['学号', '姓名', '班级', '语文', '数学', '英语', '物理', '化学', '总分'],
      ['001', '张三', '高三1班', '85', '92', '78', '88', '90', '433'],
      ['002', '李四', '高三1班', '78', '85', '92', '76', '83', '414'],
      ['003', '王五', '高三2班', '92', '88', '85', '90', '87', '442']
    ];
    
    if (type === 'excel') {
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '成绩模板');
      XLSX.writeFile(wb, '成绩导入模板.xlsx');
    } else {
      const csvContent = templateData.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', '成绩导入模板.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast.success(`${type === 'excel' ? 'Excel' : 'CSV'} 模板下载成功`);
  };

  return (
    <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          文件上传
        </CardTitle>
        <CardDescription>
          上传Excel (.xlsx, .xls) 或CSV文件进行成绩导入
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 拖拽上传区域 */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive && !isDragReject && 'border-blue-500 bg-blue-50',
            isDragReject && 'border-red-500 bg-red-50',
            (disabled || isProcessing) && 'cursor-not-allowed opacity-50',
            !isDragActive && !isDragReject && 'border-gray-300 hover:border-gray-400'
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            <UploadCloud className={cn(
              'w-12 h-12',
              isDragActive && !isDragReject && 'text-blue-500',
              isDragReject && 'text-red-500',
              !isDragActive && !isDragReject && 'text-gray-400'
            )} />
            
            {isProcessing ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">正在处理文件...</p>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{uploadProgress}%</p>
              </div>
            ) : isDragActive ? (
              isDragReject ? (
                <p className="text-red-600">不支持的文件格式</p>
              ) : (
                <p className="text-blue-600">放开以上传文件</p>
              )
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">
                  拖拽文件到这里，或者
                  <span className="text-blue-600 underline ml-1">点击浏览</span>
                </p>
                <div className="flex gap-2 justify-center">
                  {acceptedFormats.map(format => (
                    <Badge key={format} variant="outline" className="text-xs">
                      {format}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  最大文件大小: {maxFileSize}MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTemplateDownload('excel')}
            disabled={isProcessing}
          >
            <Download className="w-4 h-4 mr-2" />
            下载Excel模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTemplateDownload('csv')}
            disabled={isProcessing}
          >
            <Download className="w-4 h-4 mr-2" />
            下载CSV模板
          </Button>
        </div>

        {/* 帮助信息 */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>导入提示：</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>确保第一行为表头（字段名称）</li>
              <li>必须包含：学号、姓名、班级</li>
              <li>科目成绩可以是分数或等级</li>
              <li>支持多科目的宽表格格式</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FileUploader; 