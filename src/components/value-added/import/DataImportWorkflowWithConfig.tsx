"use client";

/**
 * 数据导入工作流组件（配置版）
 * 新增配置选择步骤，简化成绩导入流程
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Trash2,
  CheckCircle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { ConfigurationSelector } from "@/components/value-added/config/ConfigurationSelector";
import { AbsentConfirmationDialog } from "./AbsentConfirmationDialog";
import { cn } from "@/lib/utils";
import {
  readExcelFile,
  parseGradeScores,
  validateGradeScores,
  validateCrossReference,
} from "@/services/excelImportService";
import {
  createConfiguration,
  updateConfigLastUsed,
} from "@/services/configurationService";
import {
  saveGradeScores,
  createExamRecord,
} from "@/services/dataStorageService";
import { markAbsent } from "@/services/absentMarkingService";
import {
  downloadStudentInfoTemplate,
  downloadTeachingArrangementTemplate,
  downloadGradeScoresTemplate,
  downloadAllTemplates,
} from "@/services/templateDownloadService";
import type {
  GradeScores,
  ValidationResult,
  ConfigurationMode,
} from "@/types/valueAddedTypes";

// 0分记录类型
interface ZeroScoreRecord {
  student_id: string;
  student_name: string;
  class_name: string;
  subject: string;
  score: number;
  grade_data_id?: number;
}

/**
 * 简化的导入工作流（使用配置）
 */
export function DataImportWorkflowWithConfig() {
  const [currentStep, setCurrentStep] = useState(0);
  const [configMode, setConfigMode] = useState<ConfigurationMode>("existing");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");

  // 成绩文件
  const [entryGradesFile, setEntryGradesFile] = useState<File | null>(null);
  const [exitGradesFile, setExitGradesFile] = useState<File | null>(null);
  const [entryGrades, setEntryGrades] = useState<GradeScores[]>([]);
  const [exitGrades, setExitGrades] = useState<GradeScores[]>([]);

  // 校验结果
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);

  // 0分检测和缺考标记
  const [zeroScoreRecords, setZeroScoreRecords] = useState<ZeroScoreRecord[]>(
    []
  );
  const [showAbsentDialog, setShowAbsentDialog] = useState(false);
  const [absentMarks, setAbsentMarks] = useState<Map<string, Set<string>>>(
    new Map()
  ); // student_id -> Set<subject>

  // 导入进度
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // 配置创建进度
  const [creatingConfig, setCreatingConfig] = useState(false);
  const [configProgress, setConfigProgress] = useState(0);

  // Step 0: 配置选择处理
  const handleConfigSelect = async (config: {
    mode: ConfigurationMode;
    existingConfigId?: string;
    newConfigData?: any;
  }) => {
    try {
      if (config.mode === "existing") {
        setSelectedConfigId(config.existingConfigId!);
        setConfigMode("existing");
        toast.success("配置已选择");
        setCurrentStep(1);
      } else {
        // 创建新配置 - 显示进度
        setCreatingConfig(true);
        setConfigProgress(10);
        toast.info("开始创建配置...");

        setConfigProgress(30);
        const result = await createConfiguration({
          name: config.newConfigData.name,
          studentInfo: config.newConfigData.studentInfo,
          teachingArrangement: config.newConfigData.teachingArrangement,
        });

        setConfigProgress(90);

        if (result.success) {
          setSelectedConfigId(result.config_id);
          setConfigMode("new");
          setConfigProgress(100);
          toast.success(
            `配置创建成功！学生: ${result.students_created}, 教师: ${result.teachers_created}`
          );
          setCurrentStep(1);
        } else {
          toast.error("配置创建失败");
          return;
        }
      }
    } catch (error) {
      console.error("配置处理失败:", error);
      toast.error(
        `配置处理失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setCreatingConfig(false);
      setConfigProgress(0);
    }
  };

  // Step 1: 成绩文件上传
  const handleGradeFileUpload = async (type: "entry" | "exit", file: File) => {
    try {
      const workbook = await readExcelFile(file);
      const data = parseGradeScores(workbook);

      if (data.length === 0) {
        throw new Error("文件中没有有效数据");
      }

      if (type === "entry") {
        setEntryGradesFile(file);
        setEntryGrades(data);
      } else {
        setExitGradesFile(file);
        setExitGrades(data);
      }

      toast.success(`成功读取 ${data.length} 条成绩记录`);
    } catch (error) {
      console.error("解析成绩失败:", error);
      toast.error("解析成绩文件失败");
    }
  };

  // 入口成绩拖拽上传
  const entryDropzone = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleGradeFileUpload("entry", acceptedFiles[0]);
      }
    },
  });

  // 出口成绩拖拽上传
  const exitDropzone = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleGradeFileUpload("exit", acceptedFiles[0]);
      }
    },
  });

  // Step 2: 校验数据
  const handleValidation = () => {
    const results: ValidationResult[] = [];

    // 校验入口成绩
    if (entryGrades.length > 0) {
      results.push(validateGradeScores(entryGrades));
    }

    // 校验出口成绩
    if (exitGrades.length > 0) {
      results.push(validateGradeScores(exitGrades));
    }

    setValidationResults(results);

    // ✅ 检测缺考记录（包括0分、Q、N、"缺考"等标记）
    const zeroScores: ZeroScoreRecord[] = [];

    const subjectMap: Record<string, string> = {
      chinese_score: "语文",
      math_score: "数学",
      english_score: "英语",
      physics_score: "物理",
      chemistry_score: "化学",
      biology_score: "生物",
      history_score: "历史",
      geography_score: "地理",
      politics_score: "政治",
    };

    // 判断是否为疑似缺考
    const isSuspectedAbsent = (value: any): boolean => {
      if (value === 0 || value === 0.0) return true;
      if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        return (
          normalized === "Q" ||
          normalized === "N" ||
          normalized === "缺考" ||
          normalized === "未参加"
        );
      }
      return false;
    };

    // 获取分数值（用于显示）
    const getDisplayScore = (value: any): number => {
      if (typeof value === "number") return value;
      return 0; // Q/N/缺考等显示为0
    };

    // 检测入口成绩的疑似缺考记录
    entryGrades.forEach((grade) => {
      Object.entries(subjectMap).forEach(([field, subjectName]) => {
        const score = (grade as any)[field];
        if (isSuspectedAbsent(score)) {
          zeroScores.push({
            student_id: grade.student_id,
            student_name: grade.student_name,
            class_name: grade.class_name || "未知班级",
            subject: subjectName,
            score: getDisplayScore(score),
          });
        }
      });
    });

    // 检测出口成绩的疑似缺考记录
    exitGrades.forEach((grade) => {
      Object.entries(subjectMap).forEach(([field, subjectName]) => {
        const score = (grade as any)[field];
        if (isSuspectedAbsent(score)) {
          zeroScores.push({
            student_id: grade.student_id,
            student_name: grade.student_name,
            class_name: grade.class_name || "未知班级",
            subject: subjectName,
            score: getDisplayScore(score),
          });
        }
      });
    });

    setZeroScoreRecords(zeroScores);

    const hasFatalErrors = results.some((r) => r.status === "failed");
    const hasZeroScores = zeroScores.length > 0;

    if (hasFatalErrors) {
      toast.error("数据校验失败，请查看详细错误");
    } else if (hasZeroScores) {
      toast.warning(
        `检测到 ${zeroScores.length} 条疑似缺考记录（0分/Q/N/缺考），请确认`
      );
      setShowAbsentDialog(true);
    } else {
      toast.success("数据校验通过！");
      setCurrentStep(3);
    }
  };

  // ✅ 处理缺考确认
  const handleAbsentConfirm = async (absentRecords: ZeroScoreRecord[]) => {
    // 构建缺考标记映射: student_id -> Set<subject>
    const marks = new Map<string, Set<string>>();

    absentRecords.forEach((record) => {
      if (!marks.has(record.student_id)) {
        marks.set(record.student_id, new Set());
      }
      marks.get(record.student_id)!.add(record.subject);
    });

    // ✅ 在成绩数据中添加缺考标记字段
    const subjectToField: Record<string, string> = {
      语文: "chinese_absent",
      数学: "math_absent",
      英语: "english_absent",
      物理: "physics_absent",
      化学: "chemistry_absent",
      生物: "biology_absent",
      历史: "history_absent",
      地理: "geography_absent",
      政治: "politics_absent",
    };

    // 更新入口成绩数据
    const updatedEntryGrades = entryGrades.map((grade) => {
      const studentAbsents = marks.get(grade.student_id);
      if (!studentAbsents) return grade;

      const updated = { ...grade };
      studentAbsents.forEach((subject) => {
        const absentField = subjectToField[subject];
        if (absentField) {
          (updated as any)[absentField] = true;
        }
      });
      return updated;
    });

    // 更新出口成绩数据
    const updatedExitGrades = exitGrades.map((grade) => {
      const studentAbsents = marks.get(grade.student_id);
      if (!studentAbsents) return grade;

      const updated = { ...grade };
      studentAbsents.forEach((subject) => {
        const absentField = subjectToField[subject];
        if (absentField) {
          (updated as any)[absentField] = true;
        }
      });
      return updated;
    });

    setEntryGrades(updatedEntryGrades);
    setExitGrades(updatedExitGrades);
    setAbsentMarks(marks);
    setShowAbsentDialog(false);

    toast.success(`已标记 ${absentRecords.length} 条记录为缺考`);
    setCurrentStep(3);
  };

  // Step 3: 开始导入
  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);

    try {
      // 更新配置的最后使用时间
      await updateConfigLastUsed(selectedConfigId);

      // ✅ 从班级名自动推断年级（取第一个学生的班级名前缀）
      const detectGradeLevel = (grades: GradeScores[]): string => {
        if (grades.length === 0) return "未知年级";

        const firstClassName = grades[0].class_name;
        if (!firstClassName) return "未知年级";

        // 提取班级名前缀（例如："初一1班" -> "初一"，"高二3班" -> "高二"）
        const match = firstClassName.match(/^(初|高)(一|二|三)/);
        return match ? match[0] : "未知年级";
      };

      const gradeLevel = detectGradeLevel(
        entryGrades.length > 0 ? entryGrades : exitGrades
      );
      console.log(`✅ 自动检测年级: ${gradeLevel}`);

      // ✅ 使用文件名作为考试标题（去除.xlsx后缀）
      const entryExamTitle = entryGradesFile
        ? entryGradesFile.name.replace(/\.(xlsx|xls)$/i, "")
        : "入口考试";

      const exitExamTitle = exitGradesFile
        ? exitGradesFile.name.replace(/\.(xlsx|xls)$/i, "")
        : "出口考试";

      // ========== 入口考试 ==========
      const entryExamInfo = {
        business_id: `entry-${Date.now()}`,
        exam_title: entryExamTitle, // ✅ 使用文件名
        exam_type: "摸底考试",
        exam_date: new Date().toISOString().split("T")[0],
        grade_level: gradeLevel, // ✅ 自动检测的年级
        academic_year: "2024-2025",
        semester: "第一学期",
        original_filename: entryGradesFile?.name, // ✅ 保存原始文件名
      };

      setImportProgress(20);
      const entryExamResult = await createExamRecord(entryExamInfo);

      if (!entryExamResult.success || !entryExamResult.data) {
        throw new Error("创建入口考试记录失败");
      }

      // 使用真实的 UUID 而不是字符串 exam_id
      setImportProgress(40);
      const entryResult = await saveGradeScores(
        entryGrades,
        {
          exam_id: entryExamResult.data.id, // ✅ 使用返回的 UUID
          exam_title: entryExamInfo.exam_title,
          exam_type: entryExamInfo.exam_type,
          exam_date: entryExamInfo.exam_date,
        },
        selectedConfigId
      );

      // ========== 出口考试 ==========
      const exitExamInfo = {
        business_id: `exit-${Date.now()}`,
        exam_title: exitExamTitle, // ✅ 使用文件名
        exam_type: "期末考试",
        exam_date: new Date().toISOString().split("T")[0],
        grade_level: gradeLevel, // ✅ 自动检测的年级
        academic_year: "2024-2025",
        semester: "第一学期",
        original_filename: exitGradesFile?.name, // ✅ 保存原始文件名
      };

      setImportProgress(60);
      const exitExamResult = await createExamRecord(exitExamInfo);

      if (!exitExamResult.success || !exitExamResult.data) {
        throw new Error("创建出口考试记录失败");
      }

      // 使用真实的 UUID 而不是字符串 exam_id
      setImportProgress(80);
      const exitResult = await saveGradeScores(
        exitGrades,
        {
          exam_id: exitExamResult.data.id, // ✅ 使用返回的 UUID
          exam_title: exitExamInfo.exam_title,
          exam_type: exitExamInfo.exam_type,
          exam_date: exitExamInfo.exam_date,
        },
        selectedConfigId
      );

      setImportProgress(100);
      toast.success(
        `导入完成！入口成绩: ${entryResult.count}, 出口成绩: ${exitResult.count}`
      );
    } catch (error) {
      console.error("导入失败:", error);
      toast.error(
        `导入失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center space-x-4">
        {["配置选择", "上传成绩", "校验数据", "完成导入"].map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                index <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>
            <span className="ml-2 text-sm">{step}</span>
            {index < 3 && (
              <ArrowRight className="mx-4 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: 配置选择 */}
      {currentStep === 0 && (
        <>
          {/* 模板下载卡片 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              下载导入模板
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              首次使用或需要更新数据时，请下载对应模板填写后上传
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  downloadStudentInfoTemplate();
                  toast.success("学生信息表模板已下载");
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                学生信息表
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  downloadTeachingArrangementTemplate();
                  toast.success("教学编排表模板已下载");
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                教学编排表
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  downloadGradeScoresTemplate();
                  toast.success("成绩表模板已下载");
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                成绩表
              </Button>

              <Button
                variant="default"
                className="justify-start"
                onClick={() => {
                  const result = downloadAllTemplates();
                  if (result.success) {
                    toast.success("所有模板已下载");
                  } else {
                    toast.error(result.error || "下载失败");
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                下载全部模板
              </Button>
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>重要提示：</strong>
                下载模板后，请查看"填写说明"sheet，按要求填写数据，删除说明行后再上传
              </AlertDescription>
            </Alert>
          </Card>

          <ConfigurationSelector onConfigSelect={handleConfigSelect} />

          {/* 配置创建进度提示 */}
          {creatingConfig && (
            <Card className="p-6 mt-4">
              <h3 className="text-lg font-semibold mb-4">正在创建配置...</h3>
              <div className="space-y-2">
                <Progress value={configProgress} className="h-2" />
                <div className="text-sm text-center text-muted-foreground">
                  {configProgress}% - 正在保存学生信息和教学编排
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Step 1: 上传成绩 */}
      {currentStep === 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">上传考试成绩</h3>

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              配置已选择，现在只需上传入口和出口考试成绩即可
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 入口成绩上传 */}
            <div>
              <label className="block mb-3 font-medium text-sm">
                入口考试成绩 *
              </label>

              {!entryGradesFile ? (
                <div
                  {...entryDropzone.getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    entryDropzone.isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-gray-300 hover:border-primary hover:bg-gray-50"
                  )}
                >
                  <input {...entryDropzone.getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    {entryDropzone.isDragActive
                      ? "松开鼠标上传文件"
                      : "拖拽文件到此处，或点击选择文件"}
                  </p>
                  <p className="text-xs text-gray-500">支持 .xlsx, .xls 格式</p>
                </div>
              ) : (
                <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {entryGradesFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          已读取 {entryGrades.length} 条记录
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEntryGradesFile(null);
                        setEntryGrades([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 出口成绩上传 */}
            <div>
              <label className="block mb-3 font-medium text-sm">
                出口考试成绩 *
              </label>

              {!exitGradesFile ? (
                <div
                  {...exitDropzone.getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    exitDropzone.isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-gray-300 hover:border-primary hover:bg-gray-50"
                  )}
                >
                  <input {...exitDropzone.getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    {exitDropzone.isDragActive
                      ? "松开鼠标上传文件"
                      : "拖拽文件到此处，或点击选择文件"}
                  </p>
                  <p className="text-xs text-gray-500">支持 .xlsx, .xls 格式</p>
                </div>
              ) : (
                <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {exitGradesFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          已读取 {exitGrades.length} 条记录
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExitGradesFile(null);
                        setExitGrades([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={entryGrades.length === 0 || exitGrades.length === 0}
            >
              下一步：校验数据
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: 校验数据 */}
      {currentStep === 2 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">数据校验</h3>

          <Button onClick={handleValidation}>开始校验</Button>

          {validationResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {validationResults.map((result, index) => (
                <div key={index}>
                  <div className="font-medium">{result.rule}</div>
                  <div
                    className={
                      result.status === "passed"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {result.status === "passed" ? "✅ 通过" : "❌ 失败"}
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-red-600">
                      {result.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            {validationResults.some((r) => r.status === "passed") && (
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={showAbsentDialog}
              >
                下一步：开始导入
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ✅ 缺考确认对话框 */}
      <AbsentConfirmationDialog
        open={showAbsentDialog}
        onOpenChange={setShowAbsentDialog}
        zeroScores={zeroScoreRecords}
        onConfirm={handleAbsentConfirm}
      />

      {/* Step 3: 导入 */}
      {currentStep === 3 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">开始导入</h3>

          {!importing ? (
            <Button onClick={handleImport}>开始导入</Button>
          ) : (
            <div>
              <Progress value={importProgress} className="mb-2" />
              <div className="text-sm text-center">{importProgress}%</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
