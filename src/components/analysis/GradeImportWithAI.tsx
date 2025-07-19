import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { gradeAnalysisAutoTrigger } from '@/services/gradeAnalysisAutoTrigger';
import AIAnalysisButton from './AIAnalysisButton';

interface ImportResult {
  success: boolean;
  importedCount: number;
  errors?: string[];
  details?: any;
}

/**
 * 集成AI分析功能的成绩导入组件
 * 演示如何在成绩导入成功后自动触发AI分析
 */
export const GradeImportWithAI: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 模拟文件上传和成绩导入
  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      // 模拟导入过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟导入结果
      const mockResult: ImportResult = {
        success: true,
        importedCount: Math.floor(Math.random() * 50) + 10, // 10-60条记录
        details: {
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString()
        }
      };

      setImportResult(mockResult);
      
      toast.success('成绩导入成功！', {
        description: `已导入 ${mockResult.importedCount} 条记录`,
        duration: 3000
      });

      // 🔥 关键：导入成功后自动触发AI分析
      await gradeAnalysisAutoTrigger.onGradeImportSuccess(
        mockResult.importedCount,
        mockResult.details
      );

    } catch (error) {
      console.error('导入失败:', error);
      
      const errorResult: ImportResult = {
        success: false,
        importedCount: 0,
        errors: [error.message || '导入过程中发生错误']
      };
      
      setImportResult(errorResult);
      
      toast.error('成绩导入失败', {
        description: error.message || '请检查文件格式',
        duration: 5000
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // 验证文件类型
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('文件格式不支持', {
          description: '请选择 Excel (.xlsx, .xls) 或 CSV 文件',
          duration: 5000
        });
        return;
      }
      
      // 开始导入
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            成绩数据导入
          </CardTitle>
          <CardDescription>
            支持 Excel (.xlsx, .xls) 和 CSV 格式文件
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* 文件选择 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="grade-file-upload"
                disabled={isImporting}
              />
              
              <label
                htmlFor="grade-file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {isImporting ? '正在导入...' : '点击选择文件或拖拽文件到此处'}
                </span>
              </label>
            </div>

            {/* 导入状态 */}
            {isImporting && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-800">正在导入成绩数据...</span>
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                importResult.success 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {importResult.success 
                    ? `导入成功！共导入 ${importResult.importedCount} 条记录`
                    : `导入失败: ${importResult.errors?.[0] || '未知错误'}`
                  }
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI分析控制面板 */}
      <AIAnalysisButton
        importedRecords={importResult?.importedCount || 0}
        showConfig={true}
      />

      {/* 导入历史记录 */}
      {importResult?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本次导入详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">文件名：</span>
                {selectedFile?.name}
              </div>
              <div>
                <span className="font-medium">文件大小：</span>
                {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
              </div>
              <div>
                <span className="font-medium">导入时间：</span>
                {new Date().toLocaleString('zh-CN')}
              </div>
              <div>
                <span className="font-medium">记录数量：</span>
                {importResult.importedCount} 条
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <div>1. 选择符合格式的Excel或CSV文件</div>
            <div>2. 系统会自动验证并导入成绩数据</div>
            <div>3. 当导入记录数达到设定阈值时，会自动触发AI分析</div>
            <div>4. 分析结果会推送到企业微信和Linear项目管理工具</div>
            <div>5. 可以在AI分析面板中手动触发分析或调整设置</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeImportWithAI;