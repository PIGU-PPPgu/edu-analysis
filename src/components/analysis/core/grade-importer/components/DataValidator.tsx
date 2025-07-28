import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Eye,
  Database,
  Loader2,
  FileCheck,
  Users,
  BookOpen,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  MappingConfig,
  ExamInfo,
  StudentMatchResult,
} from "../types";
import { enhancedStudentMatcher } from "@/services/enhancedStudentMatcher";
import { convertWideToLongFormatEnhanced } from "@/services/intelligentFieldMapper";
import { gradeSchema } from "../types";

// 数据验证配置接口
export interface ValidationConfig {
  strictMode: boolean;
  skipInvalidRows: boolean;
  maxErrors: number;
  validateDuplicates: boolean;
  validateStudentMatch: boolean;
  requireScores: boolean;
  requireStudentId: boolean; // 新增：是否要求学号
  autoGenerateStudentId: boolean; // 新增：自动生成学号
  allowShortStudentId: boolean; // 新增：允许短学号
}

// DataValidator 组件属性
interface DataValidatorProps {
  data: any[];
  mappingConfig: MappingConfig;
  examInfo: ExamInfo;
  onValidationComplete: (result: ValidationResult, validData: any[]) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

const DataValidator: React.FC<DataValidatorProps> = ({
  data,
  mappingConfig,
  examInfo,
  onValidationComplete,
  onError,
  loading = false,
}) => {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [validationConfig, setValidationConfig] = useState<ValidationConfig>({
    strictMode: false,
    skipInvalidRows: true,
    maxErrors: 100,
    validateDuplicates: true,
    validateStudentMatch: true,
    requireScores: false,
    requireStudentId: false, // 默认不要求学号
    autoGenerateStudentId: true, // 默认自动生成学号
    allowShortStudentId: true, // 默认允许短学号
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [studentMatches, setStudentMatches] = useState<
    Record<string, StudentMatchResult>
  >({});
  const [activeTab, setActiveTab] = useState("preview");

  // 执行数据验证
  useEffect(() => {
    if (
      data &&
      data.length > 0 &&
      mappingConfig &&
      mappingConfig.fieldMappings
    ) {
      performValidation();
    }
  }, [data, mappingConfig, validationConfig]);

  // 执行验证
  const performValidation = async () => {
    setValidating(true);
    try {
      const result = await validateData();
      setValidationResult(result);

      // 预处理数据用于预览
      const processedData = await processDataForPreview();
      setPreviewData(processedData);

      // 如果启用学生匹配验证，执行学生匹配
      if (validationConfig.validateStudentMatch) {
        await performStudentMatching(processedData);
      }

      // 生成有效数据
      const validData = processedData.filter((_, index) => {
        const hasErrors = result.errors.some(
          (error) => error.row === index + 1
        );
        return !hasErrors || !validationConfig.skipInvalidRows;
      });

      onValidationComplete(result, validData);
    } catch (error) {
      console.error("数据验证失败:", error);
      onError("数据验证失败: " + error.message);
    } finally {
      setValidating(false);
    }
  };

  // 验证数据
  const validateData = async (): Promise<ValidationResult> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    let validRows = 0;
    let errorRows = 0;
    let warningRows = 0;

    // 安全检查
    if (!data || !Array.isArray(data)) {
      throw new Error("数据无效或为空");
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;
      let hasError = false;
      let hasWarning = false;

      // 映射数据到系统字段
      const mappedRow: any = {};
      if (mappingConfig && mappingConfig.fieldMappings) {
        Object.entries(mappingConfig.fieldMappings).forEach(
          ([originalField, mappedField]) => {
            mappedRow[mappedField] = row[originalField];
          }
        );
      }

      // 补充考试信息
      if (examInfo) {
        mappedRow.exam_title = examInfo.title;
        mappedRow.exam_type = examInfo.type;
        mappedRow.exam_date = examInfo.date;
      }

      try {
        // 验证必需字段 - 根据配置决定是否要求学号
        const requiredFields = ["name", "class_name"];
        if (validationConfig.requireStudentId) {
          requiredFields.push("student_id");
        }

        requiredFields.forEach((field) => {
          const value = mappedRow[field];
          if (!value || String(value).trim() === "") {
            errors.push({
              row: rowNumber,
              field: field,
              value: value,
              error: `${field}字段不能为空`,
              severity: "error",
            });
            hasError = true;
          }
        });

        // 处理学号 - 如果没有学号且启用自动生成
        if (
          !mappedRow.student_id ||
          String(mappedRow.student_id).trim() === ""
        ) {
          if (validationConfig.autoGenerateStudentId) {
            // 生成临时学号：temp_行号_时间戳后4位
            const timestamp = Date.now().toString().slice(-4);
            mappedRow.student_id = `temp_${rowNumber}_${timestamp}`;
            warnings.push({
              row: rowNumber,
              field: "student_id",
              value: mappedRow.student_id,
              warning: "已自动生成临时学号",
              suggestion: "建议后续更新为正式学号",
            });
            hasWarning = true;
          } else if (!validationConfig.requireStudentId) {
            // 如果不要求学号，生成一个基于姓名和班级的临时学号
            const name = String(mappedRow.name || "").trim();
            const className = String(mappedRow.class_name || "").trim();
            if (name && className) {
              mappedRow.student_id = `${className}_${name}_${rowNumber}`;
              warnings.push({
                row: rowNumber,
                field: "student_id",
                value: mappedRow.student_id,
                warning: "已基于姓名和班级生成临时学号",
                suggestion: "建议后续更新为正式学号",
              });
              hasWarning = true;
            }
          }
        }

        // 验证分数字段
        if (
          mappedRow.score !== undefined &&
          mappedRow.score !== null &&
          mappedRow.score !== ""
        ) {
          const score = parseFloat(mappedRow.score);
          if (isNaN(score)) {
            errors.push({
              row: rowNumber,
              field: "score",
              value: mappedRow.score,
              error: "分数必须是有效数字",
              severity: "error",
            });
            hasError = true;
          } else if (score < 0) {
            errors.push({
              row: rowNumber,
              field: "score",
              value: score,
              error: "分数不能为负数",
              severity: "error",
            });
            hasError = true;
          } else if (score > 200) {
            warnings.push({
              row: rowNumber,
              field: "score",
              value: score,
              warning: "分数偏高，请确认是否正确",
              suggestion: "检查分数是否在合理范围内",
            });
            hasWarning = true;
          }
        } else if (validationConfig.requireScores) {
          errors.push({
            row: rowNumber,
            field: "score",
            value: mappedRow.score,
            error: "缺少分数信息",
            severity: "error",
          });
          hasError = true;
        }

        // 验证等级字段
        if (
          mappedRow.original_grade &&
          typeof mappedRow.original_grade === "string"
        ) {
          const grade = mappedRow.original_grade.trim().toUpperCase();
          const validGrades = [
            "A+",
            "A",
            "A-",
            "B+",
            "B",
            "B-",
            "C+",
            "C",
            "C-",
            "D",
            "E",
            "F",
          ];
          if (!validGrades.includes(grade)) {
            warnings.push({
              row: rowNumber,
              field: "original_grade",
              value: grade,
              warning: "等级格式可能不标准",
              suggestion: "建议使用标准等级格式 (A+, A, B+, B, C+, C, D, E, F)",
            });
            hasWarning = true;
          }
        }

        // 验证学号格式 - 根据配置决定是否允许短学号
        if (mappedRow.student_id) {
          const studentId = String(mappedRow.student_id).trim();
          if (studentId.length < 3 && !validationConfig.allowShortStudentId) {
            warnings.push({
              row: rowNumber,
              field: "student_id",
              value: studentId,
              warning: "学号长度较短",
              suggestion: "确认学号格式是否正确，或在验证设置中允许短学号",
            });
            hasWarning = true;
          }
        }

        // 验证班级名称格式
        if (mappedRow.class_name) {
          const className = String(mappedRow.class_name).trim();
          if (!/^.*(班|Class).*$/i.test(className)) {
            warnings.push({
              row: rowNumber,
              field: "class_name",
              value: className,
              warning: "班级名称格式可能不标准",
              suggestion: '确认班级名称是否包含"班"字',
            });
            hasWarning = true;
          }
        }

        // 使用Zod验证（如果有score字段）
        if (mappedRow.score !== undefined) {
          try {
            gradeSchema.parse(mappedRow);
          } catch (zodError) {
            zodError.errors?.forEach((err: any) => {
              errors.push({
                row: rowNumber,
                field: err.path[0] || "unknown",
                value: err.received,
                error: err.message,
                severity: "error",
              });
              hasError = true;
            });
          }
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: "unknown",
          value: null,
          error: `验证过程中发生错误: ${error.message}`,
          severity: "error",
        });
        hasError = true;
      }

      // 统计行状态
      if (hasError) {
        errorRows++;
      } else if (hasWarning) {
        warningRows++;
      } else {
        validRows++;
      }

      // 检查最大错误数限制
      if (
        validationConfig.maxErrors > 0 &&
        errors.length >= validationConfig.maxErrors
      ) {
        warnings.push({
          row: rowNumber,
          field: "system",
          value: null,
          warning: `已达到最大错误数限制 (${validationConfig.maxErrors})，停止验证`,
          suggestion: "修复现有错误后重新验证",
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRows: data.length,
        validRows,
        errorRows,
        warningRows,
      },
    };
  };

  // 处理数据用于预览
  const processDataForPreview = async (): Promise<any[]> => {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    // 检查是否为宽表格格式
    const isWideTable =
      mappingConfig?.wideTableFormat?.detected && mappingConfig?.headerAnalysis;

    if (isWideTable && mappingConfig.headerAnalysis) {
      // 宽表格转长表格处理
      console.log("[数据验证] 检测到宽表格，开始转换为长表格格式");

      const allRecords: any[] = [];

      data.forEach((row, index) => {
        try {
          const longFormatRecords = convertWideToLongFormatEnhanced(
            row,
            mappingConfig.headerAnalysis!,
            {
              title: examInfo.title,
              type: examInfo.type,
              date: examInfo.date,
              exam_id: examInfo.exam_id || `exam_${Date.now()}`,
            }
          );

          // 为每条记录添加行索引
          longFormatRecords.forEach((record, recordIndex) => {
            allRecords.push({
              ...record,
              _rowIndex: `${index + 1}-${recordIndex + 1}`,
              _originalRowIndex: index + 1,
            });
          });
        } catch (error) {
          console.error(`[数据验证] 第${index + 1}行转换失败:`, error);
          // 转换失败时，使用原始映射方式
          const mappedRow: any = {
            _rowIndex: index + 1,
            _originalRowIndex: index + 1,
            _conversionError: error.message,
          };

          if (mappingConfig.fieldMappings) {
            Object.entries(mappingConfig.fieldMappings).forEach(
              ([originalField, mappedField]) => {
                mappedRow[mappedField] = row[originalField];
              }
            );
          }

          allRecords.push(mappedRow);
        }
      });

      console.log(
        `[数据验证] 宽表转长表完成: ${data.length}行 → ${allRecords.length}条记录`
      );
      return allRecords;
    } else {
      // 普通表格处理（原有逻辑）
      console.log("[数据验证] 使用普通表格映射模式");

      return data.map((row, index) => {
        const mappedRow: any = { _rowIndex: index + 1 };

        // 映射字段
        if (mappingConfig && mappingConfig.fieldMappings) {
          Object.entries(mappingConfig.fieldMappings).forEach(
            ([originalField, mappedField]) => {
              mappedRow[mappedField] = row[originalField];
            }
          );
        }

        // 添加考试信息
        if (examInfo) {
          mappedRow.exam_title = examInfo.title;
          mappedRow.exam_type = examInfo.type;
          mappedRow.exam_date = examInfo.date;
        }

        // 处理分数
        if (mappedRow.score) {
          const score = parseFloat(mappedRow.score);
          if (!isNaN(score)) {
            mappedRow.score = score;
          }
        }

        return mappedRow;
      });
    }
  };

  // 执行学生匹配
  const performStudentMatching = async (processedData: any[]) => {
    const matches: Record<string, StudentMatchResult> = {};

    for (const row of processedData) {
      const studentInfo = {
        student_id: row.student_id,
        name: row.name,
        class_name: row.class_name,
      };

      try {
        const matchResult =
          await enhancedStudentMatcher.matchSingleStudent(studentInfo);
        matches[`${row.student_id}_${row.name}`] = matchResult;
      } catch (error) {
        console.error("学生匹配失败:", error);
      }
    }

    setStudentMatches(matches);
  };

  // 获取行的验证状态
  const getRowValidationStatus = (rowIndex: number) => {
    if (!validationResult) return "pending";

    const hasError = validationResult.errors.some(
      (error) => error.row === rowIndex
    );
    const hasWarning = validationResult.warnings.some(
      (warning) => warning.row === rowIndex
    );

    if (hasError) return "error";
    if (hasWarning) return "warning";
    return "valid";
  };

  // 获取字段的验证状态
  const getFieldValidationStatus = (rowIndex: number, field: string) => {
    if (!validationResult) return null;

    const error = validationResult.errors.find(
      (e) => e.row === rowIndex && e.field === field
    );
    const warning = validationResult.warnings.find(
      (w) => w.row === rowIndex && w.field === field
    );

    return error || warning || null;
  };

  // 重新验证
  const handleRevalidate = () => {
    performValidation();
    toast.info("正在重新验证数据...");
  };

  // 导出错误报告
  const handleExportErrors = () => {
    if (!validationResult || validationResult.errors.length === 0) {
      toast.warning("没有错误需要导出");
      return;
    }

    const errorReport = validationResult.errors.map((error) => ({
      行号: error.row,
      字段: error.field,
      值: error.value,
      错误: error.error,
    }));

    const csvContent = [
      Object.keys(errorReport[0]).join(","),
      ...errorReport.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "数据验证错误报告.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("错误报告导出成功");
  };

  // 计算验证统计
  const validationStats = useMemo(() => {
    if (!validationResult) return null;

    const { summary } = validationResult;
    const totalRows = summary.totalRows;

    return {
      validPercentage:
        totalRows > 0 ? Math.round((summary.validRows / totalRows) * 100) : 0,
      errorPercentage:
        totalRows > 0 ? Math.round((summary.errorRows / totalRows) * 100) : 0,
      warningPercentage:
        totalRows > 0 ? Math.round((summary.warningRows / totalRows) * 100) : 0,
      ...summary,
    };
  }, [validationResult]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          数据验证与预览
        </CardTitle>
        <CardDescription>
          验证数据质量，预览导入效果，确保数据准确性
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 验证状态 */}
        {validating && (
          <Alert>
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>正在验证数据质量，请稍候...</AlertDescription>
          </Alert>
        )}

        {/* 验证配置 */}
        <Card className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">验证配置</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setValidationConfig({
                    strictMode: false,
                    skipInvalidRows: true,
                    maxErrors: 100,
                    validateDuplicates: false,
                    validateStudentMatch: false,
                    requireScores: false,
                    requireStudentId: false,
                    autoGenerateStudentId: true,
                    allowShortStudentId: true,
                  });
                  toast.success("已切换到宽松模式");
                }}
              >
                宽松模式
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setValidationConfig({
                    strictMode: true,
                    skipInvalidRows: false,
                    maxErrors: 50,
                    validateDuplicates: true,
                    validateStudentMatch: true,
                    requireScores: true,
                    requireStudentId: true,
                    autoGenerateStudentId: false,
                    allowShortStudentId: false,
                  });
                  toast.success("已切换到严格模式");
                }}
              >
                严格模式
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.strictMode}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    strictMode: checked,
                  }))
                }
              />
              <Label className="text-sm">严格模式</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.skipInvalidRows}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    skipInvalidRows: checked,
                  }))
                }
              />
              <Label className="text-sm">跳过无效行</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.validateDuplicates}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    validateDuplicates: checked,
                  }))
                }
              />
              <Label className="text-sm">检查重复</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.validateStudentMatch}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    validateStudentMatch: checked,
                  }))
                }
              />
              <Label className="text-sm">学生匹配</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.requireScores}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    requireScores: checked,
                  }))
                }
              />
              <Label className="text-sm">必须有分数</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.requireStudentId}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    requireStudentId: checked,
                  }))
                }
              />
              <Label className="text-sm">必须有学号</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.autoGenerateStudentId}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    autoGenerateStudentId: checked,
                  }))
                }
              />
              <Label className="text-sm">自动生成学号</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={validationConfig.allowShortStudentId}
                onCheckedChange={(checked) =>
                  setValidationConfig((prev) => ({
                    ...prev,
                    allowShortStudentId: checked,
                  }))
                }
              />
              <Label className="text-sm">允许短学号</Label>
            </div>
          </div>

          {/* 学号配置说明 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-800 mb-2">
              学号配置说明
            </h5>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>
                • <strong>必须有学号</strong>
                ：开启后，没有学号的行将被标记为错误
              </li>
              <li>
                • <strong>自动生成学号</strong>：为没有学号的行自动生成临时学号
              </li>
              <li>
                • <strong>允许短学号</strong>
                ：允许长度小于3位的学号（如：1、2、3）
              </li>
            </ul>
          </div>
        </Card>

        {/* 验证结果统计 */}
        {validationStats && (
          <div className="space-y-4">
            <h4 className="font-medium">验证结果</h4>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {validationStats.validRows}
                    </p>
                    <p className="text-sm text-gray-600">有效行</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {validationStats.errorRows}
                    </p>
                    <p className="text-sm text-gray-600">错误行</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {validationStats.warningRows}
                    </p>
                    <p className="text-sm text-gray-600">警告行</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {validationStats.totalRows}
                    </p>
                    <p className="text-sm text-gray-600">总行数</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 准备导入的数据统计 */}
            {validationResult && previewData.length > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-800">
                      {validationConfig.skipInvalidRows
                        ? validationStats.validRows
                        : validationStats.totalRows}
                    </p>
                    <p className="text-sm text-blue-600">准备导入</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  {validationConfig.skipInvalidRows
                    ? "将跳过错误行，仅导入有效数据"
                    : "将导入所有数据（包括有错误的行）"}
                </p>
              </Card>
            )}

            {/* 验证进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>数据质量</span>
                <span>{validationStats.validPercentage}% 有效</span>
              </div>
              <Progress
                value={validationStats.validPercentage}
                className="h-2"
              />
            </div>

            {/* 验证状态提示 */}
            <Alert
              className={cn(
                validationResult?.isValid
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              )}
            >
              {validationResult?.isValid ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>
                {validationResult?.isValid ? (
                  <span className="text-green-700">
                    所有数据验证通过，可以进行导入操作
                  </span>
                ) : (
                  <span className="text-red-700">
                    发现 {validationResult?.errors.length}{" "}
                    个错误，需要修复后才能导入
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 详细信息标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">数据预览</TabsTrigger>
            <TabsTrigger value="errors">错误详情</TabsTrigger>
            <TabsTrigger value="warnings">警告信息</TabsTrigger>
            <TabsTrigger value="students">学生匹配</TabsTrigger>
          </TabsList>

          {/* 数据预览 */}
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">数据预览 (前20行)</h4>
                <Badge variant="outline">{previewData.length} 条记录</Badge>
              </div>

              <div className="border rounded-lg">
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>行号</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>学号</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead>班级</TableHead>
                        <TableHead>科目</TableHead>
                        <TableHead>分数</TableHead>
                        <TableHead>等级</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 20).map((row, index) => {
                        const rowIndex = row._rowIndex;
                        const status = getRowValidationStatus(rowIndex);

                        return (
                          <TableRow
                            key={index}
                            className={cn(
                              status === "error" && "bg-red-50",
                              status === "warning" && "bg-yellow-50",
                              status === "valid" && "bg-green-50"
                            )}
                          >
                            <TableCell>{rowIndex}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  status === "error"
                                    ? "destructive"
                                    : status === "warning"
                                      ? "secondary"
                                      : status === "valid"
                                        ? "default"
                                        : "outline"
                                }
                                className="text-xs"
                              >
                                {status === "error"
                                  ? "错误"
                                  : status === "warning"
                                    ? "警告"
                                    : status === "valid"
                                      ? "有效"
                                      : "待验证"}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.student_id}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.class_name}</TableCell>
                            <TableCell>{row.subject || "—"}</TableCell>
                            <TableCell>{row.score || "—"}</TableCell>
                            <TableCell>{row.original_grade || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* 错误详情 */}
          <TabsContent value="errors">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">错误详情</h4>
                <div className="flex gap-2">
                  <Badge variant="destructive">
                    {validationResult?.errors.length || 0} 个错误
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportErrors}
                  >
                    导出错误
                  </Button>
                </div>
              </div>

              {validationResult?.errors.length === 0 ? (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    没有发现错误，数据验证通过！
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg">
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>行号</TableHead>
                          <TableHead>字段</TableHead>
                          <TableHead>值</TableHead>
                          <TableHead>错误信息</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult?.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.field}</TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {String(error.value)}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {error.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 警告信息 */}
          <TabsContent value="warnings">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">警告信息</h4>
                <Badge variant="secondary">
                  {validationResult?.warnings.length || 0} 个警告
                </Badge>
              </div>

              {validationResult?.warnings.length === 0 ? (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>没有发现警告信息</AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg">
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>行号</TableHead>
                          <TableHead>字段</TableHead>
                          <TableHead>值</TableHead>
                          <TableHead>警告信息</TableHead>
                          <TableHead>建议</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult?.warnings.map((warning, index) => (
                          <TableRow key={index}>
                            <TableCell>{warning.row}</TableCell>
                            <TableCell>{warning.field}</TableCell>
                            <TableCell className="max-w-[120px] truncate">
                              {String(warning.value)}
                            </TableCell>
                            <TableCell className="text-yellow-600">
                              {warning.warning}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {warning.suggestion || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 学生匹配 */}
          <TabsContent value="students">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">学生匹配结果</h4>
                <Badge variant="outline">
                  {Object.keys(studentMatches).length} 个学生
                </Badge>
              </div>

              <div className="border rounded-lg">
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>学号</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead>班级</TableHead>
                        <TableHead>匹配状态</TableHead>
                        <TableHead>置信度</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(studentMatches).map(
                        ([key, match], index) => (
                          <TableRow key={index}>
                            <TableCell>{match.student_id}</TableCell>
                            <TableCell>{match.name}</TableCell>
                            <TableCell>{match.class_name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  match.matchType === "exact"
                                    ? "default"
                                    : match.matchType === "fuzzy"
                                      ? "secondary"
                                      : match.matchType === "new"
                                        ? "outline"
                                        : "destructive"
                                }
                                className="text-xs"
                              >
                                {match.matchType === "exact"
                                  ? "精确匹配"
                                  : match.matchType === "fuzzy"
                                    ? "模糊匹配"
                                    : match.matchType === "new"
                                      ? "新学生"
                                      : "冲突"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {Math.round(match.confidence * 100)}%
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 操作按钮 */}
        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={handleRevalidate}
            disabled={validating || loading}
          >
            <FileCheck className="w-4 h-4 mr-2" />
            重新验证
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportErrors}
              disabled={!validationResult?.errors.length}
            >
              导出错误
            </Button>

            <Button
              onClick={() => {
                if (validationResult && previewData.length > 0) {
                  // 直接使用已经验证和处理过的数据，避免重新过滤
                  // 这样可以避免缓存延迟和重复处理
                  const validData = previewData.filter((_, index) => {
                    const hasErrors = validationResult.errors.some(
                      (error) => error.row === index + 1
                    );
                    // 如果启用跳过无效行，则过滤掉有错误的行
                    // 否则保留所有行（包括有错误的行）
                    return validationConfig.skipInvalidRows ? !hasErrors : true;
                  });

                  console.log("确认验证结果 - 传递数据:", {
                    originalCount: previewData.length,
                    validCount: validData.length,
                    errorCount: validationResult.errors.length,
                    skipInvalidRows: validationConfig.skipInvalidRows,
                  });

                  // 立即传递数据，不需要等待缓存
                  onValidationComplete(validationResult, validData);

                  toast.success(
                    `验证完成！准备导入 ${validData.length} 条记录`
                  );
                } else {
                  toast.error("没有可用的验证数据，请重新验证");
                }
              }}
              disabled={
                !validationResult ||
                validating ||
                loading ||
                previewData.length === 0
              }
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              确认验证结果
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataValidator;
