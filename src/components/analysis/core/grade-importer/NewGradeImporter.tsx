/**
 * 🔧 NewGradeImporter - 简化版的新成绩导入组件
 * 
 * 基于重构后的模块化架构，但采用更简化的工作流程
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Upload, Database } from 'lucide-react';
import { toast } from 'sonner';

import { FileUploader } from './components';
import { useGradeImporter } from './hooks';
import type { GradeImporterProps } from './types';

const NewGradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  const {
    state,
    actions: {
      uploadFile,
      processData,
      resetImport,
      cancelImport
    }
  } = useGradeImporter();

  const [showFileUploader, setShowFileUploader] = useState(true);

  // 处理文件上传成功
  const handleFileUploadSuccess = async (files: File[]) => {
    try {
      const result = await uploadFile(files[0]);
      if (result.success) {
        setShowFileUploader(false);
        toast.success('文件解析成功！请确认数据并开始导入');
      } else {
        toast.error(result.error || '文件上传失败');
      }
    } catch (error) {
      console.error('文件上传错误:', error);
      toast.error('文件上传过程中出现错误');
    }
  };

  // 开始导入处理
  const handleStartImport = async () => {
    if (!state.fileData) {
      toast.error('没有可导入的数据');
      return;
    }

    try {
      const result = await processData();
      if (result.success) {
        onDataImported(state.fileData.data);
        toast.success(`导入成功！处理了 ${result.importedCount} 条记录`);
      } else {
        toast.error(`导入失败: ${result.message}`);
      }
    } catch (error) {
      console.error('导入处理错误:', error);
      toast.error('导入过程中出现错误');
    }
  };

  // 重新开始
  const handleReset = () => {
    resetImport();
    setShowFileUploader(true);
    toast.info('已重置导入流程');
  };

  // 获取当前状态描述
  const getStatusInfo = () => {
    if (state.isLoading) {
      return {
        title: '正在处理...',
        description: '请等待文件处理完成',
        variant: 'default' as const
      };
    }
    
    if (state.error) {
      return {
        title: '处理失败',
        description: state.error,
        variant: 'destructive' as const
      };
    }
    
    if (state.fileData && !state.isProcessing) {
      return {
        title: '文件解析完成',
        description: `已解析 ${state.fileData.totalRows} 条数据，可以开始导入`,
        variant: 'default' as const
      };
    }
    
    if (state.isProcessing) {
      return {
        title: '正在导入数据...',
        description: '请耐心等待导入完成',
        variant: 'default' as const
      };
    }
    
    return {
      title: '等待文件上传',
      description: '请选择要导入的成绩文件',
      variant: 'default' as const
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="w-full space-y-6">
      {/* 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            成绩数据导入
          </CardTitle>
          <CardDescription>
            上传Excel或CSV文件，快速导入学生成绩数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant={statusInfo.variant}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <strong>{statusInfo.title}</strong>
                <span>{statusInfo.description}</span>
                
                {state.fileData && (
                  <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">文件信息</p>
                      <p className="text-xs text-gray-600">{state.fileData.fileName}</p>
                      <p className="text-xs text-gray-600">{state.fileData.totalRows} 行数据</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">处理状态</p>
                      {state.isProcessing ? (
                        <Badge variant="outline">正在处理...</Badge>
                      ) : (
                        <Badge variant="secondary">等待导入</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">数据预览</p>
                      <p className="text-xs text-gray-600">
                        字段数: {state.fileData.headers.length}
                      </p>
                    </div>
                  </div>
                )}
                
                {state.progress && state.progress.current > 0 && (
                  <div className="space-y-2 mt-4">
                    <Progress 
                      value={(state.progress.current / state.progress.total) * 100} 
                      className="h-2" 
                    />
                    <p className="text-xs text-gray-600">
                      {state.progress.message} ({state.progress.current}/{state.progress.total})
                    </p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 文件上传器 */}
      {showFileUploader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              上传成绩文件
            </CardTitle>
            <CardDescription>
              支持 Excel (.xlsx, .xls) 和 CSV 格式文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              onFileUploaded={handleFileUploadSuccess}
              enableAIEnhancement={true}
              isLoading={state.isLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      {state.fileData && !showFileUploader && (
        <Card>
          <CardHeader>
            <CardTitle>确认导入</CardTitle>
            <CardDescription>
              确认数据无误后，点击开始导入按钮
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end gap-4">
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={state.isProcessing}
              >
                重新选择文件
              </Button>
              
              {state.isProcessing ? (
                <Button 
                  variant="destructive"
                  onClick={cancelImport}
                >
                  取消导入
                </Button>
              ) : (
                <Button 
                  onClick={handleStartImport}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  开始导入
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 成功完成状态 */}
      {state.importResult && state.importResult.success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-green-900">导入完成！</h3>
                <p className="text-green-700">
                  成功导入 {state.importResult.summary.importedRows} 条成绩记录
                </p>
              </div>
              <Button 
                onClick={handleReset}
                variant="outline"
              >
                导入新文件
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewGradeImporter; 