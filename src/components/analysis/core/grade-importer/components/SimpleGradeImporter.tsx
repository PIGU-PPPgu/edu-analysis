/**
 *  简化版成绩导入器
 * 一键导入，智能处理，减少用户决策点
 */

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";

import FileUploader from "./FileUploader";
import UnmappedFieldsOnly from "./UnmappedFieldsOnly";
import type { MappingConfig } from "../types";

interface SimpleGradeImporterProps {
  onImportComplete?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

type ImportStep = "upload" | "mapping" | "importing" | "complete";

interface ImportState {
  step: ImportStep;
  progress: number;
  message: string;
  error?: string;
  fileData?: any;
  mappingConfig?: MappingConfig;
  importResult?: any;
}

const SimpleGradeImporter: React.FC<SimpleGradeImporterProps> = ({
  onImportComplete,
  onError,
  className,
}) => {
  const [state, setState] = useState<ImportState>({
    step: "upload",
    progress: 0,
    message: "准备上传文件",
  });

  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<ImportState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 文件上传完成
  const handleFileUploaded = useCallback(
    async (fileData: any, fileInfo: any) => {
      console.log(" 文件上传完成:", fileInfo.name);

      updateState({
        step: "mapping",
        progress: 25,
        message: "分析文件结构...",
        fileData,
      });

      // 检查是否有AI分析结果且置信度高
      if (fileData.aiAnalysis && fileData.aiAnalysis.confidence > 0.8) {
        console.log(" AI分析置信度高，尝试自动导入");

        // 构建映射配置
        const mappingConfig: MappingConfig = {
          fieldMappings: fileData.aiAnalysis.fieldMappings || {},
          examInfo: fileData.aiAnalysis.examInfo || {
            title: "自动识别考试",
            type: "月考",
            date: new Date().toISOString().split("T")[0],
          },
          options: {
            skipEmptyRows: true,
            validateData: true,
            createMissingStudents: true,
          },
        };

        // 直接进入导入步骤
        await handleMappingComplete(mappingConfig);
      } else {
        console.log(" AI分析置信度较低，需要用户确认");
        updateState({
          progress: 50,
          message: "请确认字段映射",
        });

        toast.info("文件分析完成，请确认字段映射");
      }
    },
    []
  );

  // 映射完成
  const handleMappingComplete = useCallback(
    async (mappingConfig: MappingConfig) => {
      console.log("开始导入数据...");

      updateState({
        step: "importing",
        progress: 75,
        message: "正在导入数据...",
        mappingConfig,
      });

      try {
        // 调用实际的导入逻辑
        const { insertGradeDataSafe } = await import("./ImportProcessor");
        await insertGradeDataSafe(state.fileData, mappingConfig);

        const result = {
          success: true,
          importedCount: state.fileData?.data?.length || 0,
          message: "导入成功",
        };

        updateState({
          step: "complete",
          progress: 100,
          message: "导入完成",
          importResult: result,
        });

        toast.success("成绩数据导入成功！");

        if (onImportComplete) {
          onImportComplete(result);
        }
      } catch (error) {
        console.error("导入失败:", error);
        const errorMessage =
          error instanceof Error ? error.message : "导入失败";

        updateState({
          error: errorMessage,
          message: "导入失败",
        });

        toast.error(errorMessage);

        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [state.fileData, onImportComplete, onError]
  );

  // 重新开始
  const handleRestart = useCallback(() => {
    setState({
      step: "upload",
      progress: 0,
      message: "准备上传文件",
    });
  }, []);

  // 前往分析
  const handleGoToAnalysis = useCallback(() => {
    window.location.href = "/grade-analysis";
  }, []);

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* 进度指示器 */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                state.step === "complete" ? "bg-green-100" : "bg-blue-100"
              )}
            >
              {state.step === "complete" ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : state.step === "importing" ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">智能成绩导入</h2>
              <p className="text-sm text-gray-600 mt-1">{state.message}</p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Progress value={state.progress} className="h-2" />

            <div className="flex justify-between text-xs text-gray-600">
              <span
                className={cn(
                  state.step === "upload" && "font-medium text-blue-600"
                )}
              >
                文件上传
              </span>
              <span
                className={cn(
                  state.step === "mapping" && "font-medium text-blue-600"
                )}
              >
                字段映射
              </span>
              <span
                className={cn(
                  state.step === "importing" && "font-medium text-blue-600"
                )}
              >
                数据导入
              </span>
              <span
                className={cn(
                  state.step === "complete" && "font-medium text-green-600"
                )}
              >
                完成
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {state.error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {state.error}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              className="ml-4"
            >
              重新开始
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 步骤内容 */}
      <div className="space-y-6">
        {/* 文件上传步骤 */}
        {state.step === "upload" && (
          <FileUploader
            onFileUploaded={handleFileUploaded}
            onError={(error) => {
              updateState({ error });
              if (onError) onError(error);
            }}
            acceptedFormats={[".xlsx", ".xls", ".csv"]}
            maxFileSize={10}
            disabled={false}
          />
        )}

        {/* 字段映射步骤 */}
        {state.step === "mapping" && state.fileData && (
          <UnmappedFieldsOnly
            headers={
              state.fileData.headers ||
              Object.keys(state.fileData.data?.[0] || {})
            }
            sampleData={state.fileData.data?.slice(0, 5) || []}
            initialMapping={state.fileData.aiAnalysis?.fieldMappings || {}}
            aiAnalysis={state.fileData.aiAnalysis}
            onMappingConfigured={handleMappingComplete}
            onError={(error) => {
              updateState({ error });
              if (onError) onError(error);
            }}
            loading={false}
          />
        )}

        {/* 导入进行中 */}
        {state.step === "importing" && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    正在导入数据
                  </h3>
                  <p className="text-gray-600 mt-2">
                    请稍候，我们正在将您的成绩数据安全地导入到系统中...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导入完成 */}
        {state.step === "complete" && state.importResult && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />

                <div>
                  <h3 className="text-2xl font-bold text-green-700 mb-2">
                    导入成功！
                  </h3>
                  <p className="text-gray-600">
                    成功导入 {state.importResult.importedCount} 条成绩记录
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <Button
                    onClick={handleGoToAnalysis}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <ArrowRight className="w-4 h-4" />
                    前往成绩分析
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    导入更多数据
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SimpleGradeImporter;
