import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Building,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import UploadProgressIndicator, {
  ProcessingStage,
} from "@/components/shared/UploadProgressIndicator";
import { NotificationManager } from "@/services/NotificationManager";
import { showErrorSmart } from "@/services/errorHandler";
import {
  autoSyncService,
  type CreateOptions,
  type PreviewResult,
} from "@/services/autoSyncService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface StudentDataImporterProps {
  onDataImported: (data: any[]) => void;
  onSuccess?: () => void; // 导入成功后的回调，用于引导用户继续导入成绩
}

interface ImportStats {
  imported: number;
  updated: number;
  skipped: number;
  errors: any[];
}

export default function StudentDataImporter({
  onDataImported,
  onSuccess,
}: StudentDataImporterProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("uploading");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [autoCreateMode, setAutoCreateMode] = useState(false); // 🔒 默认关闭自动创建（安全模式）

  // 🔍 预览确认对话框状态 (Plan A)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null
  );
  const [pendingData, setPendingData] = useState<any[] | null>(null);
  const [pendingImportResult, setPendingImportResult] = useState<any | null>(
    null
  );

  const parseFileData = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let parsedData: any[] = [];

          if (file.name.endsWith(".csv")) {
            // CSV解析
            const text = data as string;
            const lines = text.split("\n");
            const headers = lines[0].split(",").map((h) => h.trim());

            parsedData = lines
              .slice(1)
              .filter((line) => line.trim())
              .map((line) => {
                const values = line.split(",").map((v) => v.trim());
                const obj: any = {};
                headers.forEach((header, index) => {
                  obj[header] = values[index] || "";
                });
                return obj;
              });
          } else {
            // Excel解析
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            parsedData = XLSX.utils.sheet_to_json(worksheet);
          }

          resolve(parsedData);
        } catch (error) {
          reject(new Error("文件解析失败，请检查文件格式"));
        }
      };

      reader.onerror = () => reject(new Error("文件读取失败"));

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file, "UTF-8");
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const validateAndTransformData = (rawData: any[]): any[] => {
    return rawData.map((row, index) => {
      // 统一字段名称
      const transformedRow: any = {};

      // 学号字段映射
      transformedRow.student_id =
        row.student_id || row["学号"] || row.学号 || "";

      // 姓名字段映射
      transformedRow.name = row.name || row["姓名"] || row.姓名 || "";

      // 班级字段映射 - 优先使用 class_name (TEXT)
      const classValue =
        row.class_name || row["班级"] || row.班级 || row.class_id || "";
      transformedRow.class_name = classValue; // ✅ 主字段
      transformedRow.class_id = classValue; // ⚠️ 过渡期兼容字段

      // 可选字段映射
      transformedRow.admission_year =
        row.admission_year || row["入学年份"] || row.入学年份 || "";
      transformedRow.gender = row.gender || row["性别"] || row.性别 || null;
      transformedRow.contact_phone =
        row.contact_phone || row["联系电话"] || row.联系电话 || "";
      transformedRow.contact_email =
        row.contact_email || row["联系邮箱"] || row.联系邮箱 || "";

      // 🔄 宽松验证：至少有姓名或学号其中之一即可（支持智能匹配和自动创建）
      if (!transformedRow.name && !transformedRow.student_id) {
        throw new Error(`第${index + 2}行：至少需要提供姓名或学号其中之一`);
      }

      // ✅ 不再强制要求班级、学号，系统会自动创建或匹配
      return transformedRow;
    });
  };

  // 🔄 AutoSync 重试策略配置 - 跳过严格字段校验
  const autoSyncAttempts = [
    {
      label: "宽松验证",
      options: {
        strictMode: false,
        enableAutoFix: true,
        enableDataCleaning: true,
        skipWarnings: false,
        skipInfo: true,
        fieldBlacklist: ["class_name", "student_id", "name"] as string[], // ← KEY: 跳过严格必填检查
        maxErrors: 2000,
      },
    },
    {
      label: "跳过清洗回退",
      options: {
        strictMode: false,
        enableAutoFix: true,
        enableDataCleaning: false, // 禁用数据清洗
        skipWarnings: true,
        skipInfo: true,
        fieldBlacklist: ["class_name", "student_id", "name"] as string[],
        maxErrors: 5000,
      },
    },
  ];

  /**
   * 执行实际的同步操作（抽取公共逻辑）
   */
  const executeSync = async (
    validatedData: any[],
    importStats: {
      imported: number;
      updated: number;
      skipped: number;
      errors: any[];
    }
  ) => {
    const { imported, updated, skipped, errors } = importStats;

    // 🔄 智能同步：自动创建缺失的班级和学生（带重试和错误阻断）
    setProcessingProgress(85);
    try {
      const syncResult = await runAutoSyncWithRetry(validatedData);

      // 如果创建了新的班级或学生，添加到通知中
      if (
        syncResult.newClasses.length > 0 ||
        syncResult.newStudents.length > 0
      ) {
        NotificationManager.success("自动创建成功", {
          description: `创建了 ${syncResult.newClasses.length} 个班级和 ${syncResult.newStudents.length} 名学生`,
          duration: 5000,
        });
      }

      // 如果有部分错误（但整体成功），显示警告
      if (syncResult.errors && syncResult.errors.length > 0) {
        toast.warning("学生同步部分失败", {
          description: `错误: ${syncResult.errors.slice(0, 3).join("；")}`,
          duration: 8000,
        });
        console.warn("[智能同步] 部分同步失败:", syncResult.errors);
      }
    } catch (syncError) {
      // ✅ 关键修复: 同步失败时阻断成功流程
      const syncErrorMessage =
        syncError instanceof Error ? syncError.message : "自动同步失败";

      console.error("[智能同步] 同步失败，流程已中断，未标记成功:", syncError);

      setProcessingStage("error");
      setProcessingError(syncErrorMessage);
      setShowSuccessCard(false);

      toast.error("自动同步失败", {
        description: syncErrorMessage,
        duration: 8000,
      });
      NotificationManager.error("自动同步失败", {
        description: "学生/班级未完全创建，请修正后重试",
        duration: 8000,
      });

      return;
    }

    // 完成
    setProcessingStage("completed");
    setProcessingProgress(100);

    // 保存导入统计数据
    setImportStats({ imported, updated, skipped, errors });
    setShowSuccessCard(true);

    // 保留: 最终成功通知
    NotificationManager.success("学生数据导入完成", {
      description:
        errors.length > 0
          ? `成功导入 ${imported + updated} 名学生，${errors.length} 个错误`
          : `成功导入 ${imported + updated} 名学生`,
      deduplicate: true,
    });

    // 详细错误记录在控制台
    if (errors.length > 0) {
      console.warn("导入错误详情:", errors);
    }

    // 通知父组件数据导入成功
    onDataImported(validatedData);
  };

  /**
   * 用户确认预览后执行创建
   */
  const handleConfirmCreate = async () => {
    if (!pendingData || !pendingImportResult) return;

    setShowPreviewDialog(false);
    setIsUploading(true);
    setProcessingStage("saving");

    await executeSync(pendingData, pendingImportResult);

    // 清理状态
    setPendingData(null);
    setPendingImportResult(null);
    setPreviewResult(null);
    setIsUploading(false);
  };

  /**
   * 用户取消预览创建
   */
  const handleCancelCreate = () => {
    setShowPreviewDialog(false);
    setPendingData(null);
    setPendingImportResult(null);
    setPreviewResult(null);

    // 显示成功信息但不创建新数据
    if (pendingImportResult) {
      const { imported, updated, errors } = pendingImportResult;
      setImportStats({ ...pendingImportResult });
      setShowSuccessCard(true);

      NotificationManager.success("学生数据导入完成（安全模式）", {
        description: `成功导入 ${imported + updated} 名学生，未创建新班级/学生`,
        deduplicate: true,
      });

      if (pendingData) {
        onDataImported(pendingData);
      }
    }
  };

  // 🔄 AutoSync 重试函数 - 自动降级策略
  const runAutoSyncWithRetry = async (data: any[]) => {
    let lastError: any = null;

    for (let attempt = 0; attempt < autoSyncAttempts.length; attempt++) {
      const { label, options } = autoSyncAttempts[attempt];
      setProcessingStage("analyzing");
      setProcessingProgress(85 + attempt * 3);

      try {
        const syncResult = await autoSyncService.syncImportedData(
          data,
          undefined, // aiConfig
          options, // ← 传递验证选项，跳过严格字段检查
          {
            createNewClasses: autoCreateMode,
            createNewStudents: autoCreateMode,
          } as CreateOptions // ← 传递创建选项，默认安全模式不创建
        );

        if (syncResult.success) {
          return syncResult;
        }

        lastError = new Error(syncResult.errors?.join("；") || "自动同步失败");
        console.warn(
          `[学生导入][AutoSync] 尝试${attempt + 1}失败，错误:`,
          syncResult.errors
        );
      } catch (error) {
        lastError = error;
        console.error(`[学生导入][AutoSync] 尝试${attempt + 1}异常:`, error);
      }
    }

    // 所有尝试都失败，抛出最后的错误
    throw lastError || new Error("自动同步失败");
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadingFile(file);
    setProcessingStage("uploading");
    setProcessingProgress(0);
    setProcessingError(null);
    setShowSuccessCard(false);

    try {
      // 验证文件类型
      setProcessingProgress(10);
      const allowedTypes = [".xlsx", ".xls", ".csv"];
      const isValidType = allowedTypes.some((type) =>
        file.name.toLowerCase().endsWith(type)
      );

      if (!isValidType) {
        throw new Error("请选择 Excel (.xlsx/.xls) 或 CSV (.csv) 格式的文件");
      }

      // 解析文件数据
      setProcessingStage("parsing");
      setProcessingProgress(30);
      const rawData = await parseFileData(file);

      if (!rawData || rawData.length === 0) {
        throw new Error("文件中没有找到有效数据");
      }

      // 验证和转换数据
      setProcessingStage("validating");
      setProcessingProgress(50);
      const validatedData = validateAndTransformData(rawData);

      // 批量导入学生（upsert by student_id）
      setProcessingStage("saving");
      setProcessingProgress(70);
      const importResult = await (async () => {
        const errors: string[] = [];
        let imported = 0;
        let updated = 0;
        const skipped = 0;
        try {
          const { data: existing } = await supabase
            .from("students")
            .select("student_id");
          const existingIds = new Set(
            (existing || []).map((r: any) => r.student_id)
          );
          const toCreate = validatedData.filter(
            (r: any) => !existingIds.has(r.student_id)
          );
          const toUpdate = validatedData.filter((r: any) =>
            existingIds.has(r.student_id)
          );
          if (toCreate.length > 0) {
            const { error } = await supabase.from("students").insert(toCreate);
            if (error) errors.push(`批量创建失败: ${error.message}`);
            else imported = toCreate.length;
          }
          for (const row of toUpdate) {
            const { error } = await supabase
              .from("students")
              .update(row)
              .eq("student_id", row.student_id);
            if (error)
              errors.push(`更新学生${row.student_id}失败: ${error.message}`);
            else updated++;
          }
          return {
            success: errors.length === 0,
            data: { imported, updated, skipped, errors },
          };
        } catch (e: any) {
          return {
            success: false,
            error: e.message,
            data: { imported: 0, updated: 0, skipped: 0, errors: [e.message] },
          };
        }
      })();

      if (importResult.success && importResult.data) {
        const { imported, updated, skipped, errors } = importResult.data;

        // 🔍 Plan A: 如果开启自动创建模式，先进行预览
        if (autoCreateMode) {
          setProcessingStage("analyzing");
          setProcessingProgress(80);
          try {
            const preview = await autoSyncService.previewChanges(validatedData);
            // 如果有新的班级或学生需要创建，显示确认对话框
            if (
              preview.summary.newClassCount > 0 ||
              preview.summary.newStudentCount > 0
            ) {
              setPreviewResult(preview);
              setPendingData(validatedData);
              setPendingImportResult({ imported, updated, skipped, errors });
              setShowPreviewDialog(true);
              setIsUploading(false);
              return; // 等待用户确认
            }
          } catch (previewError) {
            console.warn("[学生导入] 预览生成失败，继续同步:", previewError);
          }
        }

        // 执行实际同步（安全模式或无需创建时直接执行）
        await executeSync(validatedData, {
          imported,
          updated,
          skipped,
          errors,
        });
      } else {
        throw new Error(importResult.error || "导入失败");
      }
    } catch (error) {
      console.error("导入学生数据失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "请检查文件格式是否正确";

      setProcessingStage("error");
      setProcessingError(errorMessage);

      // 使用智能错误处理
      showErrorSmart(error, { context: "学生数据导入" });
    } finally {
      setIsUploading(false);
      // 清空文件输入
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* 导入成功统计卡片 */}
      {showSuccessCard && importStats && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-6 w-6" />
              导入成功！
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {importStats.imported}
                </div>
                <div className="text-sm text-gray-600 mt-1">新增学生</div>
              </div>
              {importStats.updated > 0 && (
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {importStats.updated}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">更新记录</div>
                </div>
              )}
              {importStats.skipped > 0 && (
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {importStats.skipped}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">跳过重复</div>
                </div>
              )}
              {importStats.errors.length > 0 && (
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importStats.errors.length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">错误记录</div>
                </div>
              )}
            </div>

            {onSuccess && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => {
                    setShowSuccessCard(false);
                    onSuccess();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  继续导入成绩数据
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 🔒 安全模式开关 */}
      <Card
        className={
          autoCreateMode
            ? "border-orange-300 bg-orange-50"
            : "border-green-300 bg-green-50"
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {autoCreateMode ? (
                  <ShieldAlert className="h-5 w-5 text-orange-600" />
                ) : (
                  <Shield className="h-5 w-5 text-green-600" />
                )}
                <h3 className="font-medium text-base">
                  {autoCreateMode
                    ? "自动创建模式（已开启）"
                    : "安全模式（推荐）"}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {autoCreateMode ? (
                  <>
                    <strong className="text-orange-700">注意：</strong>
                    系统会自动创建文件中不存在的班级和学生。请确保数据准确，避免误创建。
                  </>
                ) : (
                  <>
                    <strong className="text-green-700">安全：</strong>
                    系统仅匹配现有班级和学生，不会自动创建新数据。推荐用于初次导入或不确定数据准确性时使用。
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-create-mode"
                  checked={autoCreateMode}
                  onCheckedChange={setAutoCreateMode}
                  disabled={isUploading}
                />
                <Label
                  htmlFor="auto-create-mode"
                  className="text-sm cursor-pointer"
                >
                  {autoCreateMode ? "关闭自动创建" : "开启自动创建"}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文件上传区域 */}
      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium mb-2">上传学生数据文件</h3>
              <p className="text-sm text-gray-500">
                支持 Excel (.xlsx) 和 CSV (.csv) 格式
              </p>
            </div>

            <div className="relative">
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="student-file-upload"
              />
              <Label htmlFor="student-file-upload">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  className="cursor-pointer"
                  asChild
                >
                  <div>
                    {isUploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-pulse" />
                        正在导入...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        选择文件
                      </>
                    )}
                  </div>
                </Button>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导入进度指示器 */}
      {isUploading && uploadingFile && (
        <UploadProgressIndicator
          currentStage={processingStage}
          progress={processingProgress}
          fileName={uploadingFile.name}
          fileSize={`${(uploadingFile.size / 1024 / 1024).toFixed(1)} MB`}
          error={processingError || undefined}
          compact={true}
        />
      )}

      {/* 导入说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            导入格式说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">建议提供的字段（宽松校验）：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>姓名 (name)</strong> 或{" "}
                  <strong>学号 (student_id)</strong>{" "}
                  至少填一个，推荐都填以提升匹配准确度
                </li>
                <li>
                  • <strong>班级 (class_name)</strong>:
                  可留空，系统会自动匹配/创建
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">选填字段：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>年级 (grade)</strong>: 年级信息
                </li>
                <li>
                  • <strong>性别 (gender)</strong>: 男/女
                </li>
                <li>
                  • <strong>联系电话 (contact_phone)</strong>: 联系方式
                </li>
                <li>
                  • <strong>联系邮箱 (contact_email)</strong>: 邮箱地址
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>提示：</strong>
                确保Excel或CSV文件的第一行为字段名，与上述字段名称保持一致
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🔍 预览确认对话框 (Plan A) */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              确认创建新数据
            </DialogTitle>
            <DialogDescription>
              系统检测到以下数据不存在，将被自动创建。请仔细核对后确认。
            </DialogDescription>
          </DialogHeader>

          {previewResult && (
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {/* 警告信息 */}
                {previewResult.warnings.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      风险提示
                    </h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      {previewResult.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 统计摘要 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-700">
                      {previewResult.summary.totalRecords}
                    </div>
                    <div className="text-xs text-gray-500">总记录数</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {previewResult.summary.matchedStudents}
                    </div>
                    <div className="text-xs text-gray-500">已匹配学生</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {previewResult.summary.newClassCount}
                    </div>
                    <div className="text-xs text-gray-500">新建班级</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {previewResult.summary.newStudentCount}
                    </div>
                    <div className="text-xs text-gray-500">新建学生</div>
                  </div>
                </div>

                {/* 新班级列表 */}
                {previewResult.newClasses.length > 0 && (
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-500" />
                      将创建 {previewResult.newClasses.length} 个新班级
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {previewResult.newClasses.slice(0, 10).map((cls, idx) => (
                        <Badge key={idx} variant="secondary">
                          {cls.name} ({cls.grade}, {cls.studentCount}人)
                        </Badge>
                      ))}
                      {previewResult.newClasses.length > 10 && (
                        <Badge variant="outline">
                          +{previewResult.newClasses.length - 10} 更多
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* 相似班级警告 */}
                {previewResult.similarClasses.length > 0 && (
                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      发现相似班级（可能是拼写错误）
                    </h4>
                    <div className="space-y-1 text-sm">
                      {previewResult.similarClasses
                        .slice(0, 5)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-yellow-700"
                          >
                            <span className="font-medium">
                              {item.inputName}
                            </span>
                            <span>≈</span>
                            <span>{item.existingName}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.similarity}% 相似
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 新学生列表 */}
                {previewResult.newStudents.length > 0 && (
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      将创建 {previewResult.newStudents.length} 名新学生
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {previewResult.newStudents
                        .slice(0, 15)
                        .map((student, idx) => (
                          <Badge key={idx} variant="secondary">
                            {student.name} ({student.class_name})
                          </Badge>
                        ))}
                      {previewResult.newStudents.length > 15 && (
                        <Badge variant="outline">
                          +{previewResult.newStudents.length - 15} 更多
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* 相似学生警告 */}
                {previewResult.similarStudents.length > 0 && (
                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      发现相似学生（请确认是否同一人）
                    </h4>
                    <div className="space-y-1 text-sm">
                      {previewResult.similarStudents
                        .slice(0, 5)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-yellow-700"
                          >
                            <span className="font-medium">
                              {item.inputName} ({item.inputClass})
                            </span>
                            <span>≈</span>
                            <span>
                              {item.existingName} ({item.existingClass})
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.similarity}% 相似
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelCreate}>
              <X className="h-4 w-4 mr-2" />
              取消创建（仅匹配）
            </Button>
            <Button
              onClick={handleConfirmCreate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-2" />
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
