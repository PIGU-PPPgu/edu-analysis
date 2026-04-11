"use client";

/**
 * 数据导入工作流组件
 * 三步流程：上传文件 → 校验数据 → 配置参数
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  Users,
  BookOpen,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  readExcelFile,
  parseStudentInfo,
  parseTeachingArrangement,
  parseElectiveCourse,
  parseGradeScores,
  validateStudentInfo,
  validateTeachingArrangement,
  validateGradeScores,
  validateCrossReference,
  calculateImportSummary,
  type ImportSummary,
} from "@/services/excelImportService";
import { importAllData } from "@/services/dataStorageService";
import {
  downloadStudentInfoTemplate,
  downloadTeachingArrangementTemplate,
  downloadElectiveCourseTemplate,
  downloadGradeScoresTemplate,
  downloadAllTemplates,
} from "@/services/templateDownloadService";
import type {
  StudentInfo,
  TeachingArrangement,
  ElectiveCourse,
  GradeScores,
  ValidationResult,
} from "@/types/valueAddedTypes";

interface FileUploadState {
  file: File | null;
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  rowCount?: number;
}

interface ImportData {
  studentInfo: StudentInfo[];
  teachingArrangement: TeachingArrangement[];
  electiveCourse: ElectiveCourse[];
  entryGrades: GradeScores[];
  exitGrades: GradeScores[];
}

export function DataImportWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [fileStates, setFileStates] = useState<Record<string, FileUploadState>>(
    {
      studentInfo: { file: null, status: "idle", progress: 0 },
      teachingArrangement: { file: null, status: "idle", progress: 0 },
      electiveCourse: { file: null, status: "idle", progress: 0 },
      entryGrades: { file: null, status: "idle", progress: 0 },
      exitGrades: { file: null, status: "idle", progress: 0 },
    }
  );
  const [importData, setImportData] = useState<Partial<ImportData>>({});
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // 处理文件选择
  const handleFileSelect = async (key: string, file: File | null) => {
    if (!file) {
      setFileStates((prev) => ({
        ...prev,
        [key]: { file: null, status: "idle", progress: 0 },
      }));
      return;
    }

    // 验证文件类型
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("请上传Excel文件（.xlsx或.xls）");
      return;
    }

    // 更新状态为上传中
    setFileStates((prev) => ({
      ...prev,
      [key]: { file, status: "uploading", progress: 0 },
    }));

    try {
      // 读取Excel文件
      const workbook = await readExcelFile(file);

      // 根据文件类型解析数据
      let parsedData: any;
      let rowCount = 0;

      switch (key) {
        case "studentInfo":
          parsedData = parseStudentInfo(workbook);
          rowCount = parsedData.length;
          setImportData((prev) => ({ ...prev, studentInfo: parsedData }));
          break;

        case "teachingArrangement":
          parsedData = parseTeachingArrangement(workbook);
          rowCount = parsedData.length;
          setImportData((prev) => ({
            ...prev,
            teachingArrangement: parsedData,
          }));
          break;

        case "electiveCourse":
          parsedData = parseElectiveCourse(workbook);
          rowCount = parsedData.length;
          setImportData((prev) => ({ ...prev, electiveCourse: parsedData }));
          break;

        case "entryGrades":
          parsedData = parseGradeScores(workbook);
          rowCount = parsedData.length;
          setImportData((prev) => ({ ...prev, entryGrades: parsedData }));
          break;

        case "exitGrades":
          parsedData = parseGradeScores(workbook);
          rowCount = parsedData.length;
          setImportData((prev) => ({ ...prev, exitGrades: parsedData }));
          break;
      }

      // 更新状态为成功
      setFileStates((prev) => ({
        ...prev,
        [key]: { file, status: "success", progress: 100, rowCount },
      }));

      toast.success(`${file.name} 解析成功（${rowCount}条记录）`);
    } catch (error) {
      console.error("文件解析失败:", error);
      setFileStates((prev) => ({
        ...prev,
        [key]: {
          file,
          status: "error",
          progress: 0,
          error: error instanceof Error ? error.message : "解析失败",
        },
      }));
      toast.error("文件解析失败，请检查文件格式");
    }
  };

  // 进入下一步（校验）
  const handleNextToValidation = () => {
    // 检查必需文件
    if (!fileStates.studentInfo.file || !fileStates.teachingArrangement.file) {
      toast.error("请至少上传学生信息表和教学编排表");
      return;
    }

    if (!fileStates.entryGrades.file || !fileStates.exitGrades.file) {
      toast.error("请上传入口和出口考试成绩表");
      return;
    }

    // 执行数据校验
    const results: ValidationResult[] = [];

    // 1. 校验学生信息
    if (importData.studentInfo) {
      results.push(validateStudentInfo(importData.studentInfo));
    }

    // 2. 校验教学编排
    if (importData.teachingArrangement) {
      results.push(validateTeachingArrangement(importData.teachingArrangement));
    }

    // 3. 校验入口成绩
    if (importData.entryGrades) {
      results.push(validateGradeScores(importData.entryGrades));
    }

    // 4. 校验出口成绩
    if (importData.exitGrades) {
      results.push(validateGradeScores(importData.exitGrades));
    }

    // 5. 交叉校验
    if (importData.studentInfo && importData.entryGrades) {
      results.push(
        validateCrossReference(importData.studentInfo, importData.entryGrades)
      );
    }

    setValidationResults(results);

    // 计算统计摘要
    if (
      importData.studentInfo &&
      importData.teachingArrangement &&
      importData.entryGrades &&
      importData.exitGrades
    ) {
      const summaryData = calculateImportSummary(
        importData.studentInfo,
        importData.teachingArrangement,
        importData.entryGrades,
        importData.electiveCourse
      );
      setSummary(summaryData);
    }

    // 检查是否有致命错误
    const hasFatalErrors = results.some((r) => r.status === "failed");

    // 🔧 修复：始终进入第二步，让用户看到详细错误
    setCurrentStep(2);

    if (hasFatalErrors) {
      toast.error("数据校验失败，请查看下方详细错误信息");
    } else {
      toast.success("数据校验通过！");
    }
  };

  // 返回上一步
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // 进入参数配置
  const handleNextToConfig = () => {
    setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      {/* 步骤指示器 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <StepIndicator
              step={1}
              label="上传文件"
              active={currentStep === 1}
              completed={currentStep > 1}
            />
            <div className="flex-1 h-0.5 bg-gray-200 mx-4">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: currentStep > 1 ? "100%" : "0%" }}
              />
            </div>
            <StepIndicator
              step={2}
              label="校验数据"
              active={currentStep === 2}
              completed={currentStep > 2}
            />
            <div className="flex-1 h-0.5 bg-gray-200 mx-4">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: currentStep > 2 ? "100%" : "0%" }}
              />
            </div>
            <StepIndicator
              step={3}
              label="配置参数"
              active={currentStep === 3}
              completed={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* 步骤内容 */}
      {currentStep === 1 && (
        <StepOneUpload
          fileStates={fileStates}
          onFileSelect={handleFileSelect}
          onNext={handleNextToValidation}
          importData={importData}
        />
      )}

      {currentStep === 2 && (
        <StepTwoValidation
          validationResults={validationResults}
          summary={summary}
          onBack={handleBack}
          onNext={handleNextToConfig}
        />
      )}

      {currentStep === 3 && (
        <StepThreeConfig
          summary={summary}
          onBack={handleBack}
          importData={importData as ImportData}
        />
      )}
    </div>
  );
}

/**
 * 步骤指示器
 */
interface StepIndicatorProps {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ step, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold
          ${completed ? "bg-green-500 text-white" : ""}
          ${active ? "bg-blue-500 text-white" : ""}
          ${!active && !completed ? "bg-gray-200 text-gray-600" : ""}
        `}
      >
        {completed ? <CheckCircle className="h-6 w-6" /> : step}
      </div>
      <span
        className={`font-medium ${active ? "text-black" : "text-gray-600"}`}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * 第一步：上传文件
 */
interface StepOneUploadProps {
  fileStates: Record<string, FileUploadState>;
  onFileSelect: (key: string, file: File | null) => void;
  onNext: () => void;
  importData?: Partial<ImportData>;
}

function StepOneUpload({
  fileStates,
  onFileSelect,
  onNext,
  importData = {},
}: StepOneUploadProps) {
  const files = [
    {
      key: "studentInfo",
      icon: Users,
      title: "学生信息表",
      description: "✅必填：学号、姓名、班级名称（格式：高一1班，禁用括号）",
      required: true,
    },
    {
      key: "teachingArrangement",
      icon: BookOpen,
      title: "教学编排表",
      description: "✅必填：班级名称、教师姓名（不需要工号）、科目",
      required: true,
    },
    {
      key: "electiveCourse",
      icon: Target,
      title: "学生走班表",
      description: "选课制班级信息（可选）",
      required: false,
    },
    {
      key: "entryGrades",
      icon: FileSpreadsheet,
      title: "入口考试成绩",
      description: "基准考试的各科成绩（学号必填，成绩可选）",
      required: true,
    },
    {
      key: "exitGrades",
      icon: FileSpreadsheet,
      title: "出口考试成绩",
      description: "目标考试的各科成绩（学号必填，成绩可选）",
      required: true,
    },
  ];

  return (
    <>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>必需文件</strong>
          ：学生信息表、教学编排表、入口成绩、出口成绩。
          <br />
          <strong className="text-red-600">重要提示</strong>：
          <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
            <li>
              <strong>班级名称格式</strong>：必须为"高一1班"、"高二3班"（
              <span className="text-red-600 font-bold">禁用括号</span>）
            </li>
            <li>
              <strong>学生信息表</strong>：学号、姓名、班级名称为必填项
            </li>
            <li>
              <strong>教学编排表</strong>
              ：班级名称、教师姓名、科目为必填项（不需要教师工号）
            </li>
            <li>
              <strong>模板说明</strong>
              ：下载模板后，查看"填写说明"sheet，删除说明行后再导入
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* 模板下载 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">下载导入模板</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadStudentInfoTemplate();
                toast.success("学生信息表模板已下载");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              学生信息表
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadTeachingArrangementTemplate();
                toast.success("教学编排表模板已下载");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              教学编排表
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadElectiveCourseTemplate();
                toast.success("学生走班表模板已下载");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              学生走班表
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadGradeScoresTemplate();
                toast.success("成绩表模板已下载");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              成绩表
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const result = downloadAllTemplates();
                if (result.success) {
                  toast.success("所有模板已下载");
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              下载全部模板
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map((file) => (
          <FileUploadCard
            key={file.key}
            fileKey={file.key}
            icon={file.icon}
            title={file.title}
            description={file.description}
            required={file.required}
            state={fileStates[file.key]}
            parsedData={
              file.key === "studentInfo"
                ? importData.studentInfo
                : file.key === "teachingArrangement"
                  ? importData.teachingArrangement
                  : file.key === "electiveCourse"
                    ? importData.electiveCourse
                    : file.key === "entryGrades"
                      ? importData.entryGrades
                      : file.key === "exitGrades"
                        ? importData.exitGrades
                        : undefined
            }
            onFileSelect={(f) => onFileSelect(file.key, f)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} size="lg">
          下一步：校验数据
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </>
  );
}

/**
 * 文件上传卡片
 */
interface FileUploadCardProps {
  fileKey: string;
  icon: React.ElementType;
  title: string;
  description: string;
  required: boolean;
  state: FileUploadState;
  parsedData?: any[];
  onFileSelect: (file: File | null) => void;
}

function FileUploadCard({
  fileKey,
  icon: Icon,
  title,
  description,
  required,
  state,
  parsedData,
  onFileSelect,
}: FileUploadCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  // 获取预览数据（前5行）
  const previewData = parsedData?.slice(0, 5) || [];
  const previewColumns =
    previewData.length > 0 ? Object.keys(previewData[0]) : [];
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              {required ? (
                <Badge variant="destructive" className="text-xs">
                  必需
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  可选
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        {state.status === "idle" && (
          <div className="relative">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </div>
        )}

        {state.status === "success" && state.file && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">
                {state.file.name}
              </span>
              <Badge variant="outline">{state.rowCount}条</Badge>
            </div>

            {/* 数据预览卡片 */}
            {previewData.length > 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1 text-gray-700">
                    <Eye className="h-3 w-3" />
                    数据预览（前5行）
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="overflow-x-auto max-h-32 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewColumns.map((col) => (
                            <TableHead key={col} className="text-xs py-1">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, i) => (
                          <TableRow key={i}>
                            {previewColumns.map((col) => (
                              <TableCell key={col} className="text-xs py-1">
                                {row[col]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              {parsedData && parsedData.length > 5 && (
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      查看全部
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{title} - 完整数据</DialogTitle>
                      <DialogDescription>
                        共 {parsedData.length} 条记录
                      </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {previewColumns.map((col) => (
                              <TableHead key={col}>{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.map((row, i) => (
                            <TableRow key={i}>
                              {previewColumns.map((col) => (
                                <TableCell key={col}>{row[col]}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFileSelect(null)}
              >
                重新上传
              </Button>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              <span>{state.error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFileSelect(null)}
            >
              重试
            </Button>
          </div>
        )}

        {state.status === "uploading" && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">解析中...</div>
            <Progress value={50} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 第二步：校验数据
 */
interface StepTwoValidationProps {
  validationResults: ValidationResult[];
  summary: ImportSummary | null;
  onBack: () => void;
  onNext: () => void;
}

function StepTwoValidation({
  validationResults,
  summary,
  onBack,
  onNext,
}: StepTwoValidationProps) {
  const hasFatalErrors = validationResults.some((r) => r.status === "failed");

  return (
    <>
      {/* 统计摘要 */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>数据统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">学生数</div>
                <div className="text-2xl font-bold">{summary.studentCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">班级数</div>
                <div className="text-2xl font-bold">{summary.classCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">教师数</div>
                <div className="text-2xl font-bold">{summary.teacherCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">科目数</div>
                <div className="text-2xl font-bold">{summary.subjectCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">缺考人次</div>
                <div className="text-2xl font-bold">
                  {summary.missingScoreCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 校验结果 */}
      <Card>
        <CardHeader>
          <CardTitle>校验结果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationResults.map((result, index) => (
            <ValidationResultItem key={index} result={result} />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回上传
        </Button>
        <Button onClick={onNext} disabled={hasFatalErrors}>
          下一步：配置参数
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </>
  );
}

/**
 * 校验结果项
 */
function ValidationResultItem({ result }: { result: ValidationResult }) {
  const [showAllErrors, setShowAllErrors] = useState(false);

  const getIcon = () => {
    switch (result.status) {
      case "passed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getColor = () => {
    switch (result.status) {
      case "passed":
        return "border-green-200 bg-green-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "failed":
        return "border-red-200 bg-red-50";
    }
  };

  // 导出错误清单为Excel（模拟功能）
  const downloadErrorReport = () => {
    if (!result.detailedErrors || result.detailedErrors.length === 0) return;

    const csvContent = [
      ["行号", "字段", "问题", "当前值", "修复建议"].join(","),
      ...result.detailedErrors.map((err) =>
        [
          err.row,
          err.field,
          err.message,
          err.currentValue ?? "空",
          err.suggestion || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${result.rule}-错误清单.csv`;
    link.click();
  };

  return (
    <div className={`border rounded-lg p-4 ${getColor()}`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">{result.rule}</div>
              {result.error_count > 0 && (
                <div className="text-sm text-muted-foreground mt-1">
                  发现 {result.error_count} 个问题
                </div>
              )}
            </div>
            {result.detailedErrors && result.detailedErrors.length > 0 && (
              <Button size="sm" variant="outline" onClick={downloadErrorReport}>
                <Download className="h-3 w-3 mr-1" />
                导出错误清单
              </Button>
            )}
          </div>

          {/* 详细错误表格 */}
          {result.detailedErrors && result.detailedErrors.length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">行号</TableHead>
                      <TableHead className="w-24">字段</TableHead>
                      <TableHead className="w-32">问题</TableHead>
                      <TableHead className="w-24">当前值</TableHead>
                      <TableHead>修复建议</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllErrors
                      ? result.detailedErrors
                      : result.detailedErrors.slice(0, 5)
                    ).map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">
                          第{err.row}行
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{err.field}</Badge>
                        </TableCell>
                        <TableCell className="text-red-700">
                          {err.message}
                        </TableCell>
                        <TableCell className="text-red-600 font-mono">
                          {err.currentValue ?? "空"}
                        </TableCell>
                        <TableCell className="text-blue-600 text-sm">
                          {err.suggestion}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result.detailedErrors.length > 5 && !showAllErrors && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowAllErrors(true)}
                  className="h-auto p-0"
                >
                  显示全部 {result.detailedErrors.length} 个错误 ▼
                </Button>
              )}

              {showAllErrors && result.detailedErrors.length > 5 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowAllErrors(false)}
                  className="h-auto p-0"
                >
                  收起 ▲
                </Button>
              )}
            </div>
          )}

          {/* 如果没有详细错误，降级显示简单错误列表 */}
          {(!result.detailedErrors || result.detailedErrors.length === 0) &&
            result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.slice(0, 5).map((error, i) => (
                  <div key={i} className="text-sm text-red-700">
                    • {error}
                  </div>
                ))}
                {result.errors.length > 5 && (
                  <div className="text-sm text-red-600">
                    还有 {result.errors.length - 5} 个错误...
                  </div>
                )}
              </div>
            )}

          {result.warnings && result.warnings.length > 0 && (
            <div className="space-y-1 mt-3 pt-3 border-t">
              <div className="text-sm font-medium text-yellow-700 mb-2">
                警告信息：
              </div>
              {result.warnings.slice(0, 3).map((warning, i) => (
                <div key={i} className="text-sm text-yellow-700">
                  • {warning}
                </div>
              ))}
              {result.warnings.length > 3 && (
                <div className="text-sm text-yellow-600">
                  还有 {result.warnings.length - 3} 个警告...
                </div>
              )}
            </div>
          )}

          {result.status === "passed" && result.errors.length === 0 && (
            <div className="text-sm text-green-700">校验通过</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 第三步：配置参数
 */
interface StepThreeConfigProps {
  summary: ImportSummary | null;
  onBack: () => void;
  importData: ImportData;
}

function StepThreeConfig({
  summary,
  onBack,
  importData,
}: StepThreeConfigProps) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    step: "",
    progress: 0,
    message: "",
  });

  const handleImport = async () => {
    setImporting(true);
    setImportProgress({ step: "start", progress: 0, message: "准备导入..." });

    try {
      // 准备考试信息
      const entryExamInfo = {
        exam_id: `entry-${Date.now()}`,
        exam_title: "入口考试",
        exam_type: "月考",
        exam_date: new Date().toISOString().split("T")[0],
        grade_level: "高一",
        academic_year: "2024-2025",
        semester: "上学期",
      };

      const exitExamInfo = {
        exam_id: `exit-${Date.now()}`,
        exam_title: "出口考试",
        exam_type: "期末考",
        exam_date: new Date().toISOString().split("T")[0],
        grade_level: "高一",
        academic_year: "2024-2025",
        semester: "上学期",
      };

      // 调用导入服务
      const result = await importAllData({
        studentInfo: importData.studentInfo || [],
        teachingArrangement: importData.teachingArrangement || [],
        electiveCourse: importData.electiveCourse,
        entryGrades: importData.entryGrades || [],
        exitGrades: importData.exitGrades || [],
        entryExamInfo,
        exitExamInfo,
        onProgress: (step, progress, message) => {
          setImportProgress({ step, progress, message });
        },
      });

      if (result.success) {
        toast.success(
          `导入完成! 学生:${result.results.students} 教师:${result.results.teachers} 入口成绩:${result.results.entryScores} 出口成绩:${result.results.exitScores}`
        );
      } else {
        toast.error(`导入失败: ${result.error}`);
      }
    } catch (error) {
      console.error("导入失败:", error);
      toast.error("导入失败，请重试");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>参数配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!importing ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  数据将保存到Supabase数据库,请确认信息无误后开始导入。
                </AlertDescription>
              </Alert>

              {summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">即将导入</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {summary.studentCount} 名学生</li>
                    <li>• {summary.classCount} 个班级</li>
                    <li>• {summary.teacherCount} 名教师</li>
                    <li>• {summary.subjectCount} 个科目</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">
                  {importProgress.message}
                </div>
                <Progress value={importProgress.progress} className="h-3" />
                <div className="text-sm text-muted-foreground mt-2">
                  {importProgress.progress}%
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回校验
        </Button>
        <Button onClick={handleImport} disabled={importing}>
          {importing ? "导入中..." : "开始导入"}
        </Button>
      </div>
    </>
  );
}
