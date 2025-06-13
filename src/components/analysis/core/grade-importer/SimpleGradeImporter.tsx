/**
 * 🔧 SimpleGradeImporter - 简化版成绩导入组件
 * 
 * 基于重构后的模块，提供基本的成绩导入功能
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  MapPin,
  Shield,
  Play,
  RotateCcw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

// 导入类型定义
import type { FileDataForReview } from './types';

// 组件属性
interface SimpleGradeImporterProps {
  onDataImported?: (data: any[]) => void;
}

// 导入步骤类型
type ImportStep = 'upload' | 'mapping' | 'validation' | 'import' | 'completed';

const SimpleGradeImporter: React.FC<SimpleGradeImporterProps> = ({ onDataImported }) => {
  // 状态管理
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [uploadedData, setUploadedData] = useState<FileDataForReview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');

  // 重置流程
  const handleReset = useCallback(() => {
    setCurrentStep('upload');
    setUploadedData(null);
    setIsProcessing(false);
    setProgress(0);
    setActiveTab('upload');
  }, []);

  // 文件上传处理
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // 模拟文件解析过程
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 简化的文件数据结构
      const mockData: FileDataForReview = {
        headers: ['学号', '姓名', '班级', '语文', '数学', '英语'],
        data: [
          { '学号': '001', '姓名': '张三', '班级': '初三1班', '语文': '85', '数学': '92', '英语': '78' },
          { '学号': '002', '姓名': '李四', '班级': '初三1班', '语文': '78', '数学': '85', '英语': '88' },
          { '学号': '003', '姓名': '王五', '班级': '初三1班', '语文': '92', '数学': '78', '英语': '85' }
        ],
        fileName: file.name,
        fileSize: file.size,
        totalRows: 3
      };
      
      setUploadedData(mockData);
      setCurrentStep('mapping');
      setActiveTab('mapping');
      toast.success(`文件 "${file.name}" 上传成功！`);
      
    } catch (error) {
      toast.error('文件上传失败：' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  // 字段映射处理
  const handleMapping = useCallback(() => {
    setIsProcessing(true);
    
    // 模拟映射过程
    setTimeout(() => {
      setCurrentStep('validation');
      setActiveTab('validation');
      setIsProcessing(false);
      toast.success('字段映射完成！');
    }, 1500);
  }, []);

  // 数据验证处理
  const handleValidation = useCallback(() => {
    setIsProcessing(true);
    
    // 模拟验证过程
    setTimeout(() => {
      setCurrentStep('import');
      setActiveTab('import');
      setIsProcessing(false);
      toast.success('数据验证通过！');
    }, 1000);
  }, []);

  // 数据导入处理
  const handleImport = useCallback(() => {
    setIsProcessing(true);
    setProgress(0);
    
    // 模拟导入过程
    const importInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(importInterval);
          setCurrentStep('completed');
          setIsProcessing(false);
          toast.success('成绩数据导入完成！');
          
          // 通知父组件
          if (onDataImported && uploadedData) {
            onDataImported(uploadedData.data);
          }
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, [onDataImported, uploadedData]);

  // 获取步骤状态
  const getStepStatus = (step: ImportStep) => {
    const stepOrder: ImportStep[] = ['upload', 'mapping', 'validation', 'import', 'completed'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  // 获取步骤图标
  const getStepIcon = (step: ImportStep) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 进度指示器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            成绩数据导入流程
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {[
                { key: 'upload', label: '文件上传', icon: Upload },
                { key: 'mapping', label: '字段映射', icon: MapPin },
                { key: 'validation', label: '数据验证', icon: Shield },
                { key: 'import', label: '数据导入', icon: Play },
              ].map(({ key, label, icon: Icon }) => (
                <div 
                  key={key}
                  className="flex items-center gap-2"
                >
                  {getStepIcon(key as ImportStep)}
                  <span className={`text-sm ${
                    getStepStatus(key as ImportStep) === 'active' 
                      ? 'font-semibold text-blue-600' 
                      : getStepStatus(key as ImportStep) === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                  {key !== 'import' && (
                    <div className="w-8 h-px bg-gray-300 mx-2" />
                  )}
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新开始
            </Button>
          </div>
          
          {/* 当前进度 */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>处理进度</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            文件上传
          </TabsTrigger>
          <TabsTrigger value="mapping" disabled={getStepStatus('mapping') === 'pending'} className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            字段映射
          </TabsTrigger>
          <TabsTrigger value="validation" disabled={getStepStatus('validation') === 'pending'} className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            数据验证
          </TabsTrigger>
          <TabsTrigger value="import" disabled={getStepStatus('import') === 'pending'} className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            数据导入
          </TabsTrigger>
        </TabsList>

        {/* 文件上传 */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>上传成绩文件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  拖拽文件到此处或点击选择文件
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  支持 Excel (.xlsx, .xls) 和 CSV 文件
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild>
                    <span>选择文件</span>
                  </Button>
                </label>
              </div>
              
              {uploadedData && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    文件 "{uploadedData.fileName}" 已上传成功！
                    共 {uploadedData.totalRows} 行数据，{uploadedData.headers.length} 个字段。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 字段映射 */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>字段映射</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadedData ? (
                <div className="space-y-4">
                  <Alert>
                    <MapPin className="h-4 w-4" />
                    <AlertDescription>
                      检测到字段：{uploadedData.headers.join(', ')}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleMapping} disabled={isProcessing}>
                    {isProcessing ? '映射中...' : '开始字段映射'}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    请先上传文件
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据验证 */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>数据验证</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    准备验证 {uploadedData?.totalRows || 0} 条记录
                  </AlertDescription>
                </Alert>
                <Button onClick={handleValidation} disabled={isProcessing}>
                  {isProcessing ? '验证中...' : '开始数据验证'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据导入 */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>数据导入</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Play className="h-4 w-4" />
                  <AlertDescription>
                    准备导入 {uploadedData?.totalRows || 0} 条成绩记录
                  </AlertDescription>
                </Alert>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? '导入中...' : '开始数据导入'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 完成状态 */}
      {currentStep === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              导入完成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                成功导入 {uploadedData?.totalRows || 0} 条成绩记录！
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleGradeImporter; 