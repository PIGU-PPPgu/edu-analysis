/**
 * 🔧 FileUploader 组件 - GradeImporter重构第1部分
 * 
 * 负责文件上传和AI增强解析功能
 * 
 * 功能包括：
 * - 文件拖拽上传
 * - 文件格式验证 
 * - 文件大小检查
 * - Excel/CSV解析
 * - AI智能解析（字段映射、结构识别）
 * - 文件预览信息显示
 */

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  FileSpreadsheet, 
  Upload, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Download,
  Trash2,
  Brain,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { AIEnhancedFileParser } from '@/services/aiEnhancedFileParser';
import { 
  FileUploadHandler, 
  FileUploadResult, 
  ParsedData,
  MAX_FILE_SIZE
} from './types';

interface FileUploaderProps {
  onFileUploaded: (result: FileUploadResult) => void;
  enableAIEnhancement?: boolean;
  isLoading?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUploaded,
  enableAIEnhancement = true,
  isLoading = false
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseProgress, setParseProgress] = useState(0);

  // 定义支持的文件类型（react-dropzone格式）
  const acceptedFileTypes = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv']
  };

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

  // 验证文件类型和大小
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // 检查文件扩展名
    const fileName = file.name.toLowerCase();
    const supportedExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = supportedExts.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExt) {
      return {
        isValid: false,
        error: `不支持的文件格式。支持的格式：${supportedExts.join(', ')}`
      };
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `文件大小超过限制。最大支持 ${formatFileSize(MAX_FILE_SIZE)}`
      };
    }

    return { isValid: true };
  };

  // 解析Excel文件
  const parseExcelFile = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          setParseProgress(25);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          setParseProgress(50);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          setParseProgress(75);
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length === 0) {
            reject(new Error('文件内容为空'));
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1) as any[][];
          const preview = dataRows.slice(0, 5) as any[][]; // 预览前5行

          setParseProgress(100);
          
          resolve({
            headers,
            data: dataRows,
            preview,
            totalRows: dataRows.length,
            fileName: file.name,
            fileSize: file.size
          });
        } catch (error) {
          reject(new Error(`Excel文件解析失败: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // 解析CSV文件
  const parseCSVFile = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      setParseProgress(25);

      Papa.parse(file, {
        complete: (results) => {
          try {
            setParseProgress(75);
            
            if (results.errors.length > 0) {
              console.warn('CSV解析警告:', results.errors);
            }

            const allData = results.data as string[][];
            
            // 过滤空行
            const filteredData = allData.filter(row => 
              row.some(cell => cell && cell.toString().trim() !== '')
            );

            if (filteredData.length === 0) {
              reject(new Error('文件内容为空'));
              return;
            }

            const headers = filteredData[0];
            const dataRows = filteredData.slice(1);
            const preview = dataRows.slice(0, 5); // 预览前5行

            setParseProgress(100);

            resolve({
              headers,
              data: dataRows,
              preview,
              totalRows: dataRows.length,
              fileName: file.name,
              fileSize: file.size
            });
          } catch (error) {
            reject(new Error(`CSV文件解析失败: ${error.message}`));
          }
        },
        error: (error) => {
          reject(new Error(`CSV文件读取失败: ${error.message}`));
        },
        encoding: 'UTF-8',
        skipEmptyLines: true
      });
    });
  };

  // 处理文件上传 - 集成AI增强解析
  const handleFileUpload: FileUploadHandler = async (files) => {
    if (files.length === 0) return;

    const file = files[0];
    setUploadedFile(file);
    setUploadProgress(0);
    setParseProgress(0);

    try {
      // 验证文件
      const validation = validateFile(file);
      if (!validation.isValid) {
        onFileUploaded({
          success: false,
          error: validation.error
        });
        return;
      }

      // 模拟上传进度
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      // 等待上传完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      let result: FileUploadResult;

      if (enableAIEnhancement) {
        // 🤖 使用AI增强解析
        console.log('🤖 启用AI增强解析...');
        toast.info('正在使用AI智能解析文件...', { duration: 2000 });
        
        const aiParser = new AIEnhancedFileParser();
        const aiResult = await aiParser.oneClickParse(file);
        
        console.log('🎉 AI解析完成:', aiResult);
        
        // 转换AI解析结果为FileUploadResult格式
        result = {
          success: true,
          data: {
            headers: aiResult.headers,
            data: aiResult.data,
            preview: aiResult.data.slice(0, 5),
            totalRows: aiResult.data.length,
            fileName: file.name,
            fileSize: file.size
          },
          aiAnalysis: {
            examInfo: {
              title: aiResult.metadata?.examInfo?.title || `${file.name.replace(/\.[^/.]+$/, "")}`,
              type: aiResult.metadata?.examInfo?.type || 'monthly',
              date: aiResult.metadata?.examInfo?.date || new Date().toISOString().split('T')[0],
              scope: 'class' as const
            },
            fieldMappings: aiResult.metadata?.suggestedMappings || {},
            subjects: aiResult.metadata?.detectedSubjects || [],
            dataStructure: aiResult.metadata?.detectedStructure || 'wide',
            confidence: aiResult.metadata?.confidence || 0.5,
            processing: {
              requiresUserInput: false,
              issues: [],
              suggestions: [`AI分析置信度: ${((aiResult.metadata?.confidence || 0.5) * 100).toFixed(1)}%`]
            }
          }
        };
        
        toast.success(`🤖 AI智能解析完成！识别到 ${result.data.totalRows} 行数据，置信度 ${((aiResult.metadata?.confidence || 0.5) * 100).toFixed(1)}%`);
        
      } else {
        // 📊 使用传统解析
        console.log('📊 使用传统解析...');
        let parsedData: ParsedData;
        
        if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          parsedData = await parseExcelFile(file);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          parsedData = await parseCSVFile(file);
        } else {
          throw new Error('不支持的文件格式');
        }

        result = {
          success: true,
          data: parsedData
        };
        
        toast.success(`文件上传成功！共解析 ${parsedData.totalRows} 行数据`);
      }

      onFileUploaded(result);

    } catch (error) {
      console.error('文件处理错误:', error);
      
      // AI解析失败时，尝试降级到传统解析
      if (enableAIEnhancement && error.message.includes('AI')) {
        console.log('🔄 AI解析失败，降级到传统解析...');
        toast.warning('AI解析失败，使用传统方式解析...');
        
        try {
          let parsedData: ParsedData;
          
          if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            parsedData = await parseExcelFile(file);
          } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            parsedData = await parseCSVFile(file);
          } else {
            throw new Error('不支持的文件格式');
          }

          onFileUploaded({
            success: true,
            data: parsedData
          });
          
          toast.success(`传统解析成功！共解析 ${parsedData.totalRows} 行数据`);
          return;
          
        } catch (fallbackError) {
          console.error('传统解析也失败:', fallbackError);
        }
      }
      
      toast.error(`文件处理失败: ${error.message}`);
      
      onFileUploaded({
        success: false,
        error: error.message
      });
    } finally {
      setUploadProgress(0);
      setParseProgress(0);
    }
  };

  // 清除已上传文件
  const handleClearFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setParseProgress(0);
  };

  // 下载模板文件
  const handleTemplateDownload = (type: 'excel' | 'csv') => {
    const headers = ['学号', '姓名', '班级', '语文', '数学', '英语', '物理', '化学'];
    const sampleData = [
      ['20240001', '张三', '高三1班', '85', '92', '78', '88', '90'],
      ['20240002', '李四', '高三1班', '92', '88', '85', '90', '87'],
      ['20240003', '王五', '高三2班', '78', '85', '92', '85', '89']
    ];

    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      XLSX.utils.book_append_sheet(wb, ws, '成绩导入模板');
      XLSX.writeFile(wb, '成绩导入模板.xlsx');
      toast.success('Excel模板下载成功');
    } else {
      const csvContent = [headers, ...sampleData]
        .map(row => row.join(','))
        .join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', '成绩导入模板.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV模板下载成功');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: acceptedFileTypes,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isLoading
  });

  return (
    <div className="space-y-6">
      {/* 模板下载 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            下载模板
          </CardTitle>
          <CardDescription>
            推荐先下载模板文件，按照标准格式整理数据后再上传
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => handleTemplateDownload('excel')}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              下载Excel模板
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleTemplateDownload('csv')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              下载CSV模板
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 文件上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传成绩文件
          </CardTitle>
          <CardDescription>
            支持 Excel (.xlsx, .xls) 和 CSV 格式，最大文件大小 {formatFileSize(MAX_FILE_SIZE)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                
                {isLoading ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">正在处理文件...</p>
                    {uploadProgress > 0 && (
                      <div className="w-48">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">上传进度: {uploadProgress}%</p>
                      </div>
                    )}
                    {parseProgress > 0 && (
                      <div className="w-48">
                        <Progress value={parseProgress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">解析进度: {parseProgress}%</p>
                      </div>
                    )}
                  </div>
                ) : isDragActive ? (
                  <p className="text-lg text-blue-600 font-medium">释放文件到这里...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-700">
                      拖拽文件到这里，或点击选择文件
                    </p>
                    <p className="text-sm text-gray-500">
                      支持 .xlsx, .xls, .csv 格式
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 已上传文件信息 */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>文件上传成功</AlertTitle>
                <AlertDescription>
                  文件已成功上传并解析，可以进行下一步操作
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadedFile.name)}
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(uploadedFile.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已解析
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFile}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    重新上传
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI增强提示 */}
      {enableAIEnhancement && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI增强解析</AlertTitle>
          <AlertDescription>
            已启用AI增强文件解析功能，将自动识别字段类型和数据格式，提高导入准确性。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FileUploader; 