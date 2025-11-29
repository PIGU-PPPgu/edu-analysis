// 简化导入组件使用示例
// 展示如何替换复杂的GradeImporter为用户友好的SimpleGradeImporter

import React, { useState } from "react";
import { SimpleGradeImporter } from "@/components/import/SimpleGradeImporter";
import {
  convertToFriendlyError,
  ErrorContext,
} from "@/utils/friendlyErrorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ArrowLeft } from "lucide-react";

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successRecords: number;
  errorRecords: number;
  errors: string[];
  examId?: string;
}

export const SimpleImportExample: React.FC = () => {
  const [showImporter, setShowImporter] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportResult[]>([]);

  const handleImportComplete = (result: ImportResult) => {
    setImportHistory((prev) => [result, ...prev]);
    setShowImporter(false);

    // 可以在这里添加后续操作，如跳转到分析页面
    if (result.success && result.examId) {
      // 跳转到成绩分析页面
      console.log("跳转到分析页面:", result.examId);
    }
  };

  const handleImportCancel = () => {
    setShowImporter(false);
  };

  const handleError = (error: Error, context: ErrorContext) => {
    const friendlyError = convertToFriendlyError(error, context);
    console.log("用户友好错误:", friendlyError);

    // 这里可以显示友好的错误信息给用户
    // 例如使用 toast 或 alert 组件
  };

  if (showImporter) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setShowImporter(false)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回</span>
            </Button>
          </div>

          <SimpleGradeImporter
            onComplete={handleImportComplete}
            onCancel={handleImportCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>成绩导入中心</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 快速导入按钮 */}
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">导入学生成绩</h2>
            <p className="text-gray-600 mb-6">
              使用我们全新的智能导入系统，3步完成成绩导入
            </p>
            <Button
              onClick={() => setShowImporter(true)}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              开始导入成绩
            </Button>
          </div>

          {/* 功能特性 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">智能识别</h3>
              <p className="text-sm text-gray-600">
                AI自动识别文件结构和字段，无需手动配置
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">快速预览</h3>
              <p className="text-sm text-gray-600">
                即时生成数据预览，确认无误后一键导入
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">友好错误</h3>
              <p className="text-sm text-gray-600">
                智能错误检测和修复建议，轻松解决问题
              </p>
            </div>
          </div>

          {/* 导入历史 */}
          {importHistory.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">最近导入记录</h3>
              <div className="space-y-3">
                {importHistory.slice(0, 5).map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">
                          {record.success ? "导入成功" : "导入失败"}
                        </p>
                        <p className="text-sm text-gray-600">
                          总计 {record.totalRecords} 条记录，成功{" "}
                          {record.successRecords} 条
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">支持的文件格式：</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Excel 文件 (.xlsx, .xls) - 推荐格式</li>
                  <li>CSV 文件 (.csv) - 确保使用UTF-8编码</li>
                  <li>文件大小限制：10MB</li>
                  <li>建议格式：第一行为列名，数据从第二行开始</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 对比展示 */}
      <Card>
        <CardHeader>
          <CardTitle>新旧流程对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 旧流程 */}
            <div className="space-y-3">
              <h4 className="font-semibold text-red-600">原有流程 (5步)</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>文件上传 (复杂验证)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>字段映射 (手动配置)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>数据验证 (8个开关)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">
                    4
                  </span>
                  <span>导入处理 (mock实现)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">
                    5
                  </span>
                  <span>完成总结</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>问题:</strong>{" "}
                  流程复杂、技术术语多、错误处理差、成功率仅70%
                </p>
              </div>
            </div>

            {/* 新流程 */}
            <div className="space-y-3">
              <h4 className="font-semibold text-green-600">新版流程 (3步)</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>一键智能上传 (AI自动解析)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>智能确认 (可视化预览)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>后台导入 (实时进度)</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>优势:</strong>{" "}
                  流程简化、AI智能、友好错误、预期成功率95%+
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// 错误处理使用示例
export const ErrorHandlingExample: React.FC = () => {
  const handleFileError = () => {
    try {
      // 模拟文件解析错误
      throw new Error(
        "File format not supported, invalid xlsx structure detected"
      );
    } catch (error) {
      const context: ErrorContext = {
        operation: "file_parse",
        fileName: "grades.xlsx",
        fileSize: 2048000,
        fileType: "xlsx",
      };

      const friendlyError = convertToFriendlyError(error as Error, context);

      // 显示用户友好的错误信息
      alert(`
        ${friendlyError.title}
        
        ${friendlyError.message}
        
        建议解决方案：
        ${friendlyError.solutions.map((solution, index) => `${index + 1}. ${solution}`).join("\n")}
      `);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">错误处理示例</h3>
      <Button onClick={handleFileError}>模拟文件格式错误</Button>
    </div>
  );
};
