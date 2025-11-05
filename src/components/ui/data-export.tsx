import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileImage,
  Share2,
  Copy,
  Mail,
  Printer,
  Settings2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExportField {
  key: string;
  label: string;
  description?: string;
  selected: boolean;
}

interface DataExportProps {
  data: any[];
  title?: string;
  fields?: ExportField[];
  onExport?: (format: string, fields: string[], data: any[]) => void;
  className?: string;
}

const DataExport: React.FC<DataExportProps> = ({
  data,
  title = "数据导出",
  fields = [],
  onExport,
  className,
}) => {
  const [exportFormat, setExportFormat] = useState<string>("xlsx");
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(
    fields.length > 0
      ? fields
      : [
          { key: "student_id", label: "学号", selected: true },
          { key: "name", label: "姓名", selected: true },
          { key: "class_name", label: "班级", selected: true },
          { key: "score", label: "分数", selected: true },
          { key: "subject", label: "科目", selected: true },
        ]
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // 支持的导出格式
  const exportFormats = [
    {
      value: "xlsx",
      label: "Excel文件 (.xlsx)",
      icon: FileSpreadsheet,
      color: "text-green-600",
      description: "适合进一步数据分析",
    },
    {
      value: "csv",
      label: "CSV文件 (.csv)",
      icon: FileText,
      color: "text-blue-600",
      description: "通用格式，兼容性好",
    },
    {
      value: "pdf",
      label: "PDF报告 (.pdf)",
      icon: FileImage,
      color: "text-red-600",
      description: "打印和分享专用",
    },
    {
      value: "json",
      label: "JSON数据 (.json)",
      icon: FileText,
      color: "text-purple-600",
      description: "程序处理专用",
    },
  ];

  // 切换字段选择
  const toggleField = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.map((field) =>
        field.key === fieldKey ? { ...field, selected: !field.selected } : field
      )
    );
  };

  // 全选/全不选
  const toggleAllFields = () => {
    const allSelected = selectedFields.every((field) => field.selected);
    setSelectedFields((prev) =>
      prev.map((field) => ({ ...field, selected: !allSelected }))
    );
  };

  // 导出数据
  const handleExport = async () => {
    const activeFields = selectedFields.filter((field) => field.selected);

    if (activeFields.length === 0) {
      toast.error("请至少选择一个字段");
      return;
    }

    if (data.length === 0) {
      toast.error("没有可导出的数据");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // 实际导出进度显示
      setExportProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 准备导出数据
      const exportData = data.map((row) => {
        const exportRow: any = {};
        activeFields.forEach((field) => {
          exportRow[field.label] = row[field.key] || "";
        });
        return exportRow;
      });

      setExportProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 调用导出回调或默认导出
      if (onExport) {
        onExport(
          exportFormat,
          activeFields.map((f) => f.key),
          exportData
        );
      } else {
        // 增强的默认导出行为
        await downloadData(exportData, exportFormat);
      }

      setExportProgress(100);
      toast.success(`成功导出${exportData.length}条记录`, {
        description: `文件格式: ${exportFormats.find((f) => f.value === exportFormat)?.label}`,
      });
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // 增强的默认下载实现
  const downloadData = async (exportData: any[], format: string) => {
    const fileName = `${title}_${new Date().toISOString().split("T")[0]}`;

    switch (format) {
      case "csv":
        downloadCSV(exportData, fileName);
        break;
      case "json":
        downloadJSON(exportData, fileName);
        break;
      case "xlsx":
        // 使用兼容性Excel导出
        downloadExcel(exportData, fileName);
        break;
      case "pdf":
        // 使用HTML转PDF方式
        downloadPDF(exportData, fileName);
        break;
      default:
        downloadJSON(exportData, fileName);
    }
  };

  // Excel下载（兼容性实现）
  const downloadExcel = (data: any[], fileName: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    const bom = "\uFEFF"; // UTF-8 BOM for Excel
    const blob = new Blob([bom + csvContent], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // PDF下载（HTML实现）
  const downloadPDF = (data: any[], fileName: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .summary { margin: 20px 0; padding: 15px; background: #eff6ff; border-radius: 8px; }
          @media print {
            body { margin: 0; }
            .summary { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="summary">
          <strong>数据摘要:</strong> 共 ${data.length} 条记录，生成时间: ${new Date().toLocaleString("zh-CN")}
        </div>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) =>
                  `<tr>${headers.map((h) => `<td>${row[h] || ""}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // CSV下载
  const downloadCSV = (data: any[], fileName: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  };

  // JSON下载
  const downloadJSON = (data: any[], fileName: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.json`;
    link.click();
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    const activeFields = selectedFields.filter((field) => field.selected);
    const exportData = data.map((row) => {
      const exportRow: any = {};
      activeFields.forEach((field) => {
        exportRow[field.label] = row[field.key] || "";
      });
      return exportRow;
    });

    const text = JSON.stringify(exportData, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      toast.success("数据已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const selectedFormat = exportFormats.find((f) => f.value === exportFormat);

  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-white to-gray-50 shadow-lg border-0",
        className
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {data.length} 条记录
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 导出格式选择 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">导出格式</label>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", format.color)} />
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-xs text-gray-500">
                          {format.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedFormat && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <selectedFormat.icon
                className={cn("h-4 w-4", selectedFormat.color)}
              />
              <span className="text-sm text-blue-700">
                {selectedFormat.description}
              </span>
            </div>
          )}
        </div>

        {/* 字段选择 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              导出字段
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllFields}
              className="h-6 text-xs"
            >
              {selectedFields.every((field) => field.selected)
                ? "全不选"
                : "全选"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg">
            {selectedFields.map((field) => (
              <div key={field.key} className="flex items-center space-x-2">
                <Checkbox
                  id={field.key}
                  checked={field.selected}
                  onCheckedChange={() => toggleField(field.key)}
                />
                <label
                  htmlFor={field.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {field.label}
                </label>
                {field.description && (
                  <span className="text-xs text-gray-500">
                    ({field.description})
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            已选择 {selectedFields.filter((f) => f.selected).length} /{" "}
            {selectedFields.length} 个字段
          </div>
        </div>

        {/* 导出进度 */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">导出进度</span>
              <span className="font-medium">{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <Button
            onClick={handleExport}
            disabled={
              isExporting ||
              selectedFields.filter((f) => f.selected).length === 0
            }
            className="flex-1 min-w-[120px]"
          >
            {isExporting ? (
              <>
                <Settings2 className="w-4 h-4 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                开始导出
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={copyToClipboard}
            disabled={selectedFields.filter((f) => f.selected).length === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            复制
          </Button>

          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            打印
          </Button>
        </div>

        {/* 分享选项 */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">快速分享</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const subject = encodeURIComponent(`${title} - 数据报告`);
                const body = encodeURIComponent(
                  `请查看附件中的数据报告。\n\n导出时间: ${new Date().toLocaleString()}\n记录数量: ${data.length}条`
                );
                window.open(`mailto:?subject=${subject}&body=${body}`);
              }}
            >
              <Mail className="w-3 w-3 mr-1" />
              邮件
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExport;
