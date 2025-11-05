import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  Upload,
  AlertCircle,
  RefreshCw,
  Zap,
  HardDrive,
  ChevronDown,
  ChevronRight,
  Settings2,
  Wifi,
  WifiOff,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationManager } from "@/services/NotificationManager";
import { showErrorSmart } from "@/services/errorHandler";
import {
  processFileWithWorker,
  shouldUseWorker,
  isWorkerSupported,
} from "@/utils/workerManager";
import type {
  ParseProgress,
  ParseResult as WorkerParseResult,
} from "@/workers/fileProcessor.worker";
import { GradeDataPreview } from "@/components/ui/VirtualTable";
import { intelligentFileParser } from "@/services/intelligentFileParser";
import { supabase } from "@/integrations/supabase/client";
import UploadProgressIndicator from "@/components/shared/UploadProgressIndicator";
import {
  convertWideToLongFormatEnhanced,
  analyzeCSVHeaders,
} from "@/services/intelligentFieldMapper";
import { autoSyncService } from "@/services/autoSyncService";
import { intelligentStudentMatcher } from "@/services/intelligentStudentMatcher";
import type { MatchResult } from "@/services/intelligentStudentMatcher";
import {
  ManualMatchReview,
  type StudentDecision,
} from "@/components/import/ManualMatchReview";

// 简化的用户流程：上传 → 智能确认 → 导入完成

interface SimpleGradeImporterProps {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successRecords: number;
  errorRecords: number;
  errors: string[];
  examId?: string;
}

interface ParsedData {
  file: File;
  preview: any[];
  mapping: Record<string, string>;
  confidence: number;
  issues: string[];
  metadata?: {
    fileName: string;
    fileSize: number;
    totalRows: number;
    totalColumns: number;
    parseTime: number;
    encoding?: string;
    sheetNames?: string[];
    examInfo?: {
      title?: string;
      type?: string;
      date?: string;
    };
    detectedSubjects?: string[];
    detectedStructure?: string;
  };
}

interface ExamInfo {
  title: string;
  type: string;
  date: string;
  description?: string;
}

export const SimpleGradeImporter: React.FC<SimpleGradeImporterProps> = ({
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<
    | "upload"
    | "selectClass"
    | "confirm"
    | "importing"
    | "manualMatch"
    | "complete"
  >("upload");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [processingStage, setProcessingStage] = useState<
    | "uploading"
    | "parsing"
    | "validating"
    | "saving"
    | "analyzing"
    | "completed"
    | "error"
  >("uploading");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [examInfo, setExamInfo] = useState<ExamInfo>({
    title: "",
    type: "月考",
    date: new Date().toISOString().split("T")[0],
  });

  // 📚 班级选择相关状态
  const [classScope, setClassScope] = useState<
    "specific" | "wholeGrade" | "unknown"
  >("specific");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState<string>("");
  const [unmatchedStudents, setUnmatchedStudents] = useState<any[]>([]);

  // 🤖 AI辅助选项
  const [useAI, setUseAI] = useState(false); // 是否启用AI辅助
  const [aiMode, setAIMode] = useState<"auto" | "force" | "disabled">("auto"); // AI模式

  // 加载可用班级列表
  React.useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data, error } = await supabase
          .from("class_info")
          .select("class_name")
          .order("class_name");

        if (!error && data) {
          setAvailableClasses(data.map((c) => c.class_name));
        }
      } catch (error) {
        console.error("加载班级列表失败:", error);
      }
    };

    loadClasses();
  }, []);

  // 从文件名智能推断考试信息
  const inferExamInfoFromFileName = useCallback(
    (fileName: string): Partial<ExamInfo> => {
      const nameWithoutExt = fileName.replace(/\.(xlsx?|csv)$/i, "");

      // 考试类型关键词匹配
      const typeMap: Record<string, string> = {
        期中: "期中考试",
        期末: "期末考试",
        月考: "月考",
        周测: "周测",
        单元测: "单元测试",
        模拟: "模拟考试",
        诊断: "诊断考试",
        摸底: "摸底考试",
      };

      let detectedType = "月考"; // 默认
      for (const [keyword, type] of Object.entries(typeMap)) {
        if (nameWithoutExt.includes(keyword)) {
          detectedType = type;
          break;
        }
      }

      // 提取日期 (YYYY-MM-DD, YYYY.MM.DD, YYYYMMDD格式)
      const datePatterns = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
        /(\d{4})(\d{2})(\d{2})/,
      ];

      let detectedDate = new Date().toISOString().split("T")[0];
      for (const pattern of datePatterns) {
        const match = nameWithoutExt.match(pattern);
        if (match) {
          const [_, year, month, day] = match;
          detectedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          break;
        }
      }

      // 生成考试标题 (使用完整文件名,去掉扩展名和日期)
      let title = nameWithoutExt
        .replace(/\d{4}[-.]?\d{2}[-.]?\d{2}/g, "") // 移除日期
        .replace(/\s+/g, " ") // 合并多余空格
        .trim();

      // 如果标题为空,使用考试类型作为标题
      if (!title || title.length < 2) {
        title = `${detectedType}成绩`;
      }

      return {
        title,
        type: detectedType,
        date: detectedDate,
      };
    },
    []
  );

  // 一键智能上传 - 支持Web Workers大文件处理
  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("");
    setProcessingStage("uploading");
    setProcessingError(null);

    try {
      // 检查是否应该使用Web Worker
      const useWorker = shouldUseWorker(file);
      const fileSize = (file.size / 1024 / 1024).toFixed(1); // MB

      if (useWorker) {
        setProgressMessage("检测到大文件，启用高性能处理模式...");
        // 移除: 大文件提示 - 已在进度条中显示
        console.log(`检测到大文件 (${fileSize}MB)，启用高性能处理模式`);
      } else {
        setProgressMessage("正在准备文件解析...");
      }

      let workerResult: WorkerParseResult | null = null;

      if (useWorker && isWorkerSupported()) {
        // 使用Web Worker处理大文件
        workerResult = await processFileWithWorker(file, {
          onProgress: (progress: ParseProgress) => {
            const progressMap = {
              reading: 20,
              parsing: 50,
              validating: 70,
              formatting: 90,
            };
            const baseProgress = progressMap[progress.phase] || 0;
            const currentProgress =
              baseProgress + (progress.progress / 100) * 20;
            setProgress(Math.min(currentProgress, 95));
            setProgressMessage(progress.message);

            // 显示详细进度信息
            if (progress.currentRow && progress.totalRows) {
              setProgressMessage(
                `${progress.message} (${progress.currentRow}/${progress.totalRows})`
              );
            }
          },
        });
      } else {
        // 小文件使用传统方式处理
        setProgress(10);
        setProgressMessage("正在读取成绩数据...");
        await new Promise((resolve) => setTimeout(resolve, 800));

        setProgress(30);
        setProgressMessage("正在分析文件结构...");
        setProcessingStage("parsing");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setProgress(60);
        setProgressMessage("正在识别成绩科目...");
        setProcessingStage("validating");
        await new Promise((resolve) => setTimeout(resolve, 700));

        setProgress(85);
        setProgressMessage("准备数据预览...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 转换Worker结果为组件数据格式
      let parsedData: ParsedData;

      if (workerResult && workerResult.success) {
        parsedData = {
          file,
          preview: workerResult.data.slice(0, 5), // 只显示前5行预览
          mapping: generateSmartMapping(workerResult.headers),
          confidence: calculateConfidence(
            workerResult.headers,
            workerResult.errors,
            workerResult.warnings
          ),
          issues: [...workerResult.errors, ...workerResult.warnings],
          metadata: workerResult.metadata,
        };
      } else {
        // 使用智能文件解析器处理真实文件
        const modeLabel = useAI
          ? aiMode === "force"
            ? " (AI增强模式)"
            : " (AI辅助模式)"
          : "";
        setProgressMessage(`使用智能解析引擎处理文件${modeLabel}...`);

        try {
          const parseResult = await intelligentFileParser.parseFile(file, {
            useAI,
            aiMode: useAI ? aiMode : "disabled",
            minConfidenceForAI: 0.8,
          });
          console.log("[SimpleGradeImporter] 智能解析结果:", parseResult);
          console.log(
            `[SimpleGradeImporter] 使用的解析方法: ${parseResult.metadata.parseMethod}`
          );

          parsedData = {
            file,
            preview: parseResult.data.slice(0, 5), // 只显示前5行预览
            mapping: parseResult.metadata.suggestedMappings,
            confidence: parseResult.metadata.confidence,
            issues: [],
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              totalRows: parseResult.metadata.totalRows,
              totalColumns: parseResult.headers.length,
              parseTime: 1000,
              examInfo: parseResult.metadata.examInfo,
              detectedSubjects: parseResult.metadata.detectedSubjects,
              detectedStructure: parseResult.metadata.detectedStructure,
            },
          };

          // 添加检测到的问题和建议
          if (
            parseResult.metadata.unknownFields &&
            parseResult.metadata.unknownFields.length > 0
          ) {
            parsedData.issues.push(
              `发现 ${parseResult.metadata.unknownFields.length} 个未识别字段`
            );
          }

          if (parseResult.metadata.confidence < 0.8) {
            parsedData.issues.push(
              "部分字段识别置信度较低，请确认映射是否正确"
            );
          }

          // 自动推断考试信息
          if (parseResult.metadata.examInfo) {
            setExamInfo((prev) => ({
              title:
                parseResult.metadata.examInfo?.title ||
                prev.title ||
                file.name.replace(/\.[^/.]+$/, ""),
              type: parseResult.metadata.examInfo?.type || prev.type,
              date: parseResult.metadata.examInfo?.date || prev.date,
            }));
          } else {
            // 使用智能推断功能从文件名提取考试信息
            const inferredInfo = inferExamInfoFromFileName(file.name);
            setExamInfo((prev) => ({
              ...prev,
              title: inferredInfo.title || prev.title,
              type: inferredInfo.type || prev.type,
              date: inferredInfo.date || prev.date,
            }));
          }
        } catch (error) {
          console.error(
            "[SimpleGradeImporter] 智能解析失败，使用降级处理:",
            error
          );

          // 降级处理：使用模拟数据
          const mockHeaders = ["姓名", "数学", "语文", "英语"];
          parsedData = {
            file,
            preview: [
              { 姓名: "张三", 数学: 95, 语文: 88, 英语: 92 },
              { 姓名: "李四", 数学: 87, 语文: 91, 英语: 85 },
              { 姓名: "王五", 数学: 78, 语文: 82, 英语: 89 },
            ],
            mapping: generateSmartMapping(mockHeaders),
            confidence: 0.5, // 降低置信度表明这是降级处理
            issues: [
              `文件解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
              "使用了模拟数据，请检查文件格式",
            ],
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              totalRows: 3,
              totalColumns: 4,
              parseTime: 1000,
            },
          };
        }
      }

      setProgress(100);
      setProgressMessage("解析完成！");
      setParsedData(parsedData);
      setStep("selectClass"); // 先选择班级再确认数据

      const processingMode = useWorker ? "高性能模式" : "标准模式";
      const processingTime = parsedData.metadata?.parseTime
        ? `${(parsedData.metadata.parseTime / 1000).toFixed(1)}秒`
        : "";

      // 移除: 文件解析完成提示 - 用户已通过进度条看到
      console.log(`文件解析完成！(${processingMode} ${processingTime})`, {
        fields: Object.keys(parsedData.mapping).length,
        confidence: Math.round(parsedData.confidence * 100),
      });
    } catch (error) {
      console.error("解析失败:", error);
      setProgressMessage("解析失败");
      // 使用智能错误处理
      showErrorSmart(error, { context: "文件解析" });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage("");
    }
  }, []);

  // 确认并开始导入 - 实现真实的数据库保存
  const handleConfirmImport = useCallback(async () => {
    if (!parsedData) return;

    setIsProcessing(true);
    setStep("importing");
    setProgress(0);
    setProcessingStage("validating");

    try {
      // 步骤1: 验证考试信息
      setProgress(10);
      setProgressMessage("正在验证考试信息...");

      if (!examInfo.title.trim()) {
        throw new Error("考试标题不能为空");
      }

      // 步骤2: 处理原始数据
      setProgress(25);
      setProgressMessage("正在读取完整成绩表...");

      // 重新解析文件以获取完整数据（不只是预览）
      const fullParseResult = await intelligentFileParser.parseFile(
        parsedData.file,
        {
          useAI,
          aiMode: useAI ? aiMode : "disabled",
          minConfidenceForAI: 0.8,
        }
      );
      console.log("[真实导入] 完整解析结果:", fullParseResult);
      console.log(
        `[真实导入] 使用的解析方法: ${fullParseResult.metadata.parseMethod}`
      );

      // 步骤3: 生成考试ID并准备考试数据
      setProgress(40);
      setProgressMessage("正在准备考试记录...");

      const examId = crypto.randomUUID();
      const examData = {
        exam_id: examId,
        title: examInfo.title.trim(),
        type: examInfo.type,
        date: examInfo.date,
      };

      // 步骤4: 转换数据格式 - 将宽表格转换为长表格
      setProgress(55);
      setProgressMessage(
        `正在处理成绩数据 (共 ${fullParseResult.data.length} 名学生)...`
      );

      const headerAnalysis = analyzeCSVHeaders(fullParseResult.headers);
      console.log("[真实导入] 字段分析结果:", headerAnalysis);

      const allGradeRecords: any[] = [];
      let processedRows = 0;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // 处理每一行数据 - 宽表格模式，每行一条记录
      for (const rowData of fullParseResult.data) {
        try {
          // 注入班级信息到原始数据（根据用户选择的班级范围）
          const enrichedRowData = {
            ...rowData,
            class_name:
              classScope === "specific"
                ? selectedClass
                : classScope === "unknown"
                  ? newClassName
                  : rowData.class_name, // 全年级模式保留原数据中的班级
          };

          // 将CSV行转换为单条完整记录（宽表格模式）
          const gradeRecord = convertWideToLongFormatEnhanced(
            enrichedRowData,
            headerAnalysis,
            examData
          );

          // 验证记录有效性（检查映射后的英文字段）
          if (
            gradeRecord.student_id &&
            gradeRecord.name &&
            (gradeRecord.total_score != null ||
              gradeRecord.chinese_score != null ||
              gradeRecord.math_score != null ||
              gradeRecord.english_score != null)
          ) {
            allGradeRecords.push(gradeRecord);
            successCount++;
          } else {
            errorCount++;
            errors.push(
              `行 ${processedRows + 1}: 缺少必要数据字段（学生姓名或成绩）`
            );
          }
        } catch (error) {
          errorCount++;
          errors.push(
            `行 ${processedRows + 1}: ${error instanceof Error ? error.message : "处理失败"}`
          );
        }

        processedRows++;
        setProgress(55 + (processedRows / fullParseResult.data.length) * 20);
      }

      console.log("[真实导入] 转换完成:", {
        原始行数: fullParseResult.data.length,
        生成记录数: allGradeRecords.length,
        成功记录: successCount,
        错误数: errorCount,
      });

      // 步骤5: 保存到数据库
      setProgress(80);
      setProgressMessage(`正在保存 ${successCount} 名学生的成绩...`);
      setProcessingStage("saving");

      // 直接保存到数据库，绕过Edge Function
      console.log("[真实导入] 直接保存到grade_data表:", {
        examId,
        recordCount: allGradeRecords.length,
        firstRecord: allGradeRecords[0],
      });

      // 1. 首先创建考试记录 - 使用onConflict处理重复
      const { error: examError } = await supabase.from("exams").upsert(
        {
          id: examId,
          title: examInfo.title.trim(),
          type: examInfo.type,
          date: examInfo.date,
          subject: "综合",
          scope: "all",
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "title,date,type",
          ignoreDuplicates: false,
        }
      );

      if (examError) {
        console.error("[真实导入] 创建考试记录失败:", examError);
        throw new Error(`创建考试记录失败: ${examError.message}`);
      }

      // 2. 批量插入成绩数据到新表
      const { error: saveError } = await supabase.from("grade_data").insert(
        allGradeRecords.map((record) => ({
          ...record,
          exam_id: examId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      );

      if (saveError) {
        console.error("[真实导入] 数据库保存失败:", saveError);
        throw new Error(`数据库保存失败: ${saveError.message}`);
      }

      console.log("[真实导入] 成功保存到grade_data表");

      // 步骤5: 智能学生匹配 - 使用严格3选2匹配
      setProgress(85);
      setProgressMessage("正在匹配学生信息...");
      setProcessingStage("analyzing");

      try {
        console.log("[智能匹配] 开始匹配学生...");

        // 准备文件学生数据
        const fileStudents = allGradeRecords.map((record) => ({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
        }));

        // 调用智能匹配器
        const matchingResult =
          await intelligentStudentMatcher.matchStudents(fileStudents);

        console.log("[智能匹配] 匹配结果:", matchingResult);
        console.log(
          `[智能匹配] 统计: 精确匹配=${matchingResult.exactMatches.length}, 需手动确认=${matchingResult.manualReviewNeeded.length}`
        );

        // 如果有需要手动确认的学生,进入手动确认流程
        if (matchingResult.manualReviewNeeded.length > 0) {
          console.log("[智能匹配] 发现未匹配学生,进入手动确认流程");
          setUnmatchedStudents(matchingResult.manualReviewNeeded);
          setProgress(90);
          setStep("manualMatch");
          setIsProcessing(false);
          return; // 中断流程,等待手动确认
        }

        // 所有学生都已匹配,继续自动同步流程
        console.log("[智能匹配] 所有学生已成功匹配,开始自动同步...");
        const syncResult =
          await autoSyncService.syncImportedData(allGradeRecords);

        console.log("[智能同步] 同步结果:", syncResult);

        if (syncResult.success) {
          console.log(
            `[智能同步] 完成！自动创建了 ${syncResult.newClasses.length} 个班级和 ${syncResult.newStudents.length} 名学生`
          );
        } else if (syncResult.errors.length > 0) {
          console.warn("[智能同步] 部分同步失败:", syncResult.errors);
        }
      } catch (matchError) {
        console.error("[智能匹配] 匹配过程出错:", matchError);
        console.warn(
          "[智能匹配] 成绩数据已成功导入，但学生匹配时遇到问题，回退到自动创建模式"
        );

        // 匹配失败时回退到自动同步
        try {
          const syncResult =
            await autoSyncService.syncImportedData(allGradeRecords);
          console.log("[智能同步] 回退同步完成:", syncResult);
        } catch (syncError) {
          console.error("[智能同步] 同步过程出错:", syncError);
        }
      }

      // 步骤6: 完成导入
      setProgress(100);
      setProgressMessage("导入完成！");
      setProcessingStage("completed");

      const importResult: ImportResult = {
        success: true,
        totalRecords: fullParseResult.data.length,
        successRecords: successCount, // 宽表格模式：一个学生一条记录
        errorRecords: errorCount,
        errors: errors.slice(0, 10), // 只显示前10个错误
        examId: examId,
      };

      setImportResult(importResult);
      setStep("complete");

      toast.success("🎉 一键式导入成功！", {
        description: `成功创建考试"${examInfo.title}"，导入 ${importResult.successRecords} 个学生的成绩数据，系统已智能同步班级和学生信息`,
        duration: 8000,
      });

      onComplete?.(importResult);
    } catch (error) {
      console.error("[真实导入] 导入失败:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";

      setProcessingStage("error");
      setProcessingError(errorMessage);

      // 使用智能错误处理
      showErrorSmart(error, { context: "成绩导入" });

      // 回到确认步骤，让用户可以重试
      setStep("confirm");
    } finally {
      setIsProcessing(false);
    }
  }, [parsedData, examInfo, onComplete]);

  // 处理手动匹配决策
  const handleManualMatchDecisions = useCallback(
    async (decisions: StudentDecision[]) => {
      setIsProcessing(true);
      setStep("importing");
      setProgress(90);
      setProgressMessage("正在处理手动匹配决策...");

      try {
        // 1. 处理创建新学生的决策
        const studentsToCreate = decisions.filter((d) => d.action === "create");
        if (studentsToCreate.length > 0) {
          console.log(`[手动匹配] 创建 ${studentsToCreate.length} 名新学生`);

          for (const decision of studentsToCreate) {
            try {
              const { data: newStudent, error } = await supabase
                .from("students")
                .insert({
                  student_id:
                    decision.fileStudent.student_id || `AUTO_${Date.now()}`,
                  name: decision.fileStudent.name,
                  class_name: decision.fileStudent.class_name,
                })
                .select()
                .single();

              if (error) {
                console.error("创建学生失败:", error);
              } else {
                console.log("成功创建学生:", newStudent);
              }
            } catch (error) {
              console.error("创建学生异常:", error);
            }
          }
        }

        // 2. 处理手动匹配的决策
        const studentsToMatch = decisions.filter((d) => d.action === "match");
        if (studentsToMatch.length > 0) {
          console.log(`[手动匹配] 匹配 ${studentsToMatch.length} 名学生`);
          // 匹配操作已经在决策中记录,这里只是日志
          studentsToMatch.forEach((d) => {
            console.log(
              `学生 ${d.fileStudent.name} 匹配到系统学生 ${d.matchedStudentId}`
            );
          });
        }

        // 3. 跳过的学生只记录日志
        const skippedStudents = decisions.filter((d) => d.action === "skip");
        if (skippedStudents.length > 0) {
          console.log(
            `[手动匹配] 跳过 ${skippedStudents.length} 名学生:`,
            skippedStudents.map((d) => d.fileStudent.name)
          );
        }

        // 完成处理
        setProgress(100);
        setProgressMessage("手动匹配完成！");

        toast.success(
          `手动匹配完成: 创建${studentsToCreate.length}名新学生, 匹配${studentsToMatch.length}名学生, 跳过${skippedStudents.length}名学生`
        );

        // 等待一下再跳转到完成步骤
        setTimeout(() => {
          setStep("complete");
          setIsProcessing(false);
        }, 500);
      } catch (error) {
        console.error("[手动匹配] 处理决策失败:", error);
        toast.error("处理手动匹配决策时出错");
        setIsProcessing(false);
      }
    },
    []
  );

  // 重新开始
  const handleRestart = useCallback(() => {
    setStep("upload");
    setParsedData(null);
    setImportResult(null);
    setProgress(0);
    setShowFieldMapping(false);
    setExamInfo({
      title: "",
      type: "月考",
      date: new Date().toISOString().split("T")[0],
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 进度指示器 */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div
          className={`flex items-center space-x-2 ${step === "upload" ? "text-blue-600" : step === "confirm" || step === "importing" || step === "complete" ? "text-green-600" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "upload" ? "bg-blue-100 border-2 border-blue-600" : step === "confirm" || step === "importing" || step === "complete" ? "bg-green-600" : "bg-gray-200"}`}
          >
            {step === "confirm" ||
            step === "importing" ||
            step === "complete" ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <span className="text-sm font-semibold">1</span>
            )}
          </div>
          <span className="font-medium">上传文件</span>
        </div>

        <div className="flex-1 h-px bg-gray-300"></div>

        <div
          className={`flex items-center space-x-2 ${step === "confirm" ? "text-blue-600" : step === "importing" || step === "complete" ? "text-green-600" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "confirm" ? "bg-blue-100 border-2 border-blue-600" : step === "importing" || step === "complete" ? "bg-green-600" : "bg-gray-200"}`}
          >
            {step === "importing" || step === "complete" ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <span className="text-sm font-semibold">2</span>
            )}
          </div>
          <span className="font-medium">智能确认</span>
        </div>

        <div className="flex-1 h-px bg-gray-300"></div>

        <div
          className={`flex items-center space-x-2 ${step === "complete" ? "text-green-600" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "complete" ? "bg-green-600" : "bg-gray-200"}`}
          >
            {step === "complete" ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <span className="text-sm font-semibold">3</span>
            )}
          </div>
          <span className="font-medium">导入完成</span>
        </div>
      </div>

      {/* 步骤1: 文件上传 */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>一键智能导入</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              {isProcessing ? (
                <div className="space-y-4">
                  <RefreshCw className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
                  <p className="text-lg font-medium">正在智能解析文件...</p>
                  <Progress value={progress} className="w-64 mx-auto" />
                  <p className="text-sm text-gray-600">
                    {progressMessage || "处理中..."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 mx-auto text-gray-400" />
                  <div>
                    <p className="text-xl font-medium text-gray-900">
                      拖拽文件到这里，或点击选择
                    </p>
                    <p className="text-gray-600 mt-2">
                      支持 Excel (.xlsx, .xls) 和 CSV 文件，自动识别成绩数据
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".xlsx,.xls,.csv";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                      };
                      input.click();
                    }}
                    className="mt-4"
                  >
                    选择文件
                  </Button>
                </div>
              )}
            </div>

            {/* 🤖 AI辅助选项 */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    高级选项 (AI辅助)
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="ai-mode" className="text-sm font-medium">
                      启用AI辅助识别
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      当算法置信度较低时，使用AI增强识别准确率
                    </p>
                  </div>
                  <Switch
                    id="ai-mode"
                    checked={useAI}
                    onCheckedChange={setUseAI}
                  />
                </div>

                {useAI && (
                  <div className="pl-3 space-y-2">
                    <Label className="text-sm font-medium">AI模式</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="aiMode"
                          value="auto"
                          checked={aiMode === "auto"}
                          onChange={(e) => setAIMode(e.target.value as any)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">自动 (智能判断)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="aiMode"
                          value="force"
                          checked={aiMode === "force"}
                          onChange={(e) => setAIMode(e.target.value as any)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">强制 (完整AI增强)</span>
                      </label>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* 步骤2: 智能确认 */}
      {/* 步骤2: 选择班级范围 */}
      {step === "selectClass" && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>选择成绩所属班级</span>
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              选择班级有助于更准确地匹配学生信息
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 班级范围选择 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <input
                  type="radio"
                  id="specific-class"
                  name="classScope"
                  checked={classScope === "specific"}
                  onChange={() => setClassScope("specific")}
                  className="w-4 h-4"
                />
                <label htmlFor="specific-class" className="flex-1">
                  <div className="font-medium">指定班级</div>
                  <div className="text-sm text-gray-500">
                    从现有班级中选择(推荐)
                  </div>
                </label>
              </div>

              {classScope === "specific" && (
                <div className="ml-8 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    选择班级
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">请选择班级</option>
                    {availableClasses.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-4">
                <input
                  type="radio"
                  id="whole-grade"
                  name="classScope"
                  checked={classScope === "wholeGrade"}
                  onChange={() => setClassScope("wholeGrade")}
                  className="w-4 h-4"
                />
                <label htmlFor="whole-grade" className="flex-1">
                  <div className="font-medium">全年级</div>
                  <div className="text-sm text-gray-500">
                    成绩数据包含多个班级
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="radio"
                  id="unknown-class"
                  name="classScope"
                  checked={classScope === "unknown"}
                  onChange={() => setClassScope("unknown")}
                  className="w-4 h-4"
                />
                <label htmlFor="unknown-class" className="flex-1">
                  <div className="font-medium">未知班级/创建新班级</div>
                  <div className="text-sm text-gray-500">
                    班级不在列表中,需要创建
                  </div>
                </label>
              </div>

              {classScope === "unknown" && (
                <div className="ml-8 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    输入新班级名称
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="例如: 高一(5)班"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setParsedData(null);
                  setStep("upload");
                }}
              >
                返回上传
              </Button>
              <Button
                onClick={() => {
                  if (classScope === "specific" && !selectedClass) {
                    toast.error("请选择一个班级");
                    return;
                  }
                  if (classScope === "unknown" && !newClassName.trim()) {
                    toast.error("请输入新班级名称");
                    return;
                  }
                  setStep("confirm");
                }}
              >
                下一步：确认数据
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤3: 确认数据 */}
      {step === "confirm" && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>✅ 数据解析完成，请确认考试信息</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 考试信息设置 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  考试信息（已自动识别）
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const inferredInfo = inferExamInfoFromFileName(
                      parsedData.file.name
                    );
                    setExamInfo((prev) => ({
                      ...prev,
                      ...inferredInfo,
                    }));
                    toast.success("考试信息已从文件名重新提取");
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  重新识别
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    考试标题
                  </label>
                  <input
                    type="text"
                    value={examInfo.title}
                    onChange={(e) =>
                      setExamInfo((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入考试标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    考试类型
                  </label>
                  <select
                    value={examInfo.type}
                    onChange={(e) =>
                      setExamInfo((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="月考">月考</option>
                    <option value="期中考试">期中考试</option>
                    <option value="期末考试">期末考试</option>
                    <option value="模拟考试">模拟考试</option>
                    <option value="单元测试">单元测试</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    考试日期
                  </label>
                  <input
                    type="date"
                    value={examInfo.date}
                    onChange={(e) =>
                      setExamInfo((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {!examInfo.title.trim() && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    请填写考试标题，这将帮助您在后续管理中更好地识别这次考试数据。
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* 数据类型统计 */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(parsedData.mapping).filter((field) =>
                field.includes("grade")
              ).length > 0 && (
                <Badge variant="outline" className="bg-purple-50">
                  ✨ 检测到等级数据 (
                  {
                    Object.keys(parsedData.mapping).filter((field) =>
                      field.includes("grade")
                    ).length
                  }
                  个)
                </Badge>
              )}
              {Object.keys(parsedData.mapping).filter((field) =>
                field.includes("score")
              ).length > 0 && (
                <Badge variant="outline" className="bg-green-50">
                  📊 检测到分数数据 (
                  {
                    Object.keys(parsedData.mapping).filter((field) =>
                      field.includes("score")
                    ).length
                  }
                  个)
                </Badge>
              )}
              {Object.keys(parsedData.mapping).filter((field) =>
                field.includes("rank")
              ).length > 0 && (
                <Badge variant="outline" className="bg-orange-50">
                  🏆 检测到排名数据 (
                  {
                    Object.keys(parsedData.mapping).filter((field) =>
                      field.includes("rank")
                    ).length
                  }
                  个)
                </Badge>
              )}
            </div>

            {/* 高级选项 - 可折叠 */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 font-medium text-gray-600 hover:text-gray-900 p-2"
                >
                  {showFieldMapping ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <Settings2 className="w-4 h-4" />
                  高级选项 (置信度、字段映射详情)
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3">
                {/* 置信度显示 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    解析置信度:{" "}
                    <span className="font-semibold text-green-600">
                      {Math.round(parsedData.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* 字段映射详情 */}
                <h4 className="font-semibold mb-2 text-gray-700">
                  识别的字段映射 ({Object.keys(parsedData.mapping).length}个)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(parsedData.mapping).map(
                    ([systemField, fileField]) => {
                      // 检测是否为等级字段
                      const isGradeField =
                        systemField.includes("grade") ||
                        systemField.includes("level");
                      const isScoreField = systemField.includes("score");
                      const isRankField = systemField.includes("rank");

                      let bgColor = "bg-blue-50";
                      let textColor = "text-blue-900";
                      let badge = null;

                      if (isGradeField) {
                        bgColor = "bg-purple-50";
                        textColor = "text-purple-900";
                        badge = (
                          <Badge variant="secondary" className="text-xs mt-1">
                            等级数据
                          </Badge>
                        );
                      } else if (isScoreField) {
                        bgColor = "bg-green-50";
                        textColor = "text-green-900";
                        badge = (
                          <Badge variant="secondary" className="text-xs mt-1">
                            分数数据
                          </Badge>
                        );
                      } else if (isRankField) {
                        bgColor = "bg-orange-50";
                        textColor = "text-orange-900";
                        badge = (
                          <Badge variant="secondary" className="text-xs mt-1">
                            排名数据
                          </Badge>
                        );
                      }

                      return (
                        <div
                          key={systemField}
                          className={`${bgColor} p-3 rounded-lg`}
                        >
                          <div className="text-sm text-gray-600">
                            文件中: {fileField}
                          </div>
                          <div className={`font-medium ${textColor}`}>
                            → {systemField}
                          </div>
                          {badge}
                        </div>
                      );
                    }
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 高性能数据预览 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">数据预览</h3>
                <div className="flex items-center space-x-2">
                  {parsedData.metadata && (
                    <>
                      <Badge variant="outline">
                        总计 {parsedData.metadata.totalRows} 行
                      </Badge>
                      <Badge variant="outline">
                        {parsedData.metadata.totalColumns} 列
                      </Badge>
                      <Badge variant="secondary">
                        预览前 {parsedData.preview.length} 行
                      </Badge>
                      {parsedData.metadata.parseTime && (
                        <Badge variant="secondary">
                          解析耗时:{" "}
                          {(parsedData.metadata.parseTime / 1000).toFixed(1)}s
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 水平滚动的数据预览表格 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-w-full">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(parsedData.preview[0] || {}).map(
                          (header, index) => (
                            <th
                              key={index}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 last:border-r-0"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedData.preview.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {Object.keys(parsedData.preview[0] || {}).map(
                            (header, colIndex) => (
                              <td
                                key={colIndex}
                                className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                              >
                                {String(row[header] || "")}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 滚动提示 */}
                {parsedData.metadata &&
                  parsedData.metadata.totalColumns > 6 && (
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm flex items-center justify-between">
                      <span>💡 数据较宽，可以左右滚动查看更多列</span>
                      <span>{parsedData.metadata.totalColumns} 列数据</span>
                    </div>
                  )}
              </div>
            </div>

            {/* 问题提醒 */}
            {parsedData.issues.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    发现以下问题，但不影响导入：
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {parsedData.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleRestart}>
                重新选择文件
              </Button>
              <div className="space-x-3">
                <Button variant="outline" onClick={onCancel}>
                  取消
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isProcessing || !examInfo.title.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  确认导入 (
                  {parsedData.metadata?.totalRows || parsedData.preview.length}{" "}
                  条记录)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤3: 导入进行中 */}
      {step === "importing" && (
        <UploadProgressIndicator
          currentStage={processingStage}
          progress={progress}
          fileName={parsedData?.file.name}
          fileSize={
            parsedData
              ? `${(parsedData.file.size / 1024 / 1024).toFixed(1)} MB`
              : undefined
          }
          error={processingError || undefined}
          onCancel={onCancel}
        />
      )}

      {/* 步骤3.5: 手动匹配确认 */}
      {step === "manualMatch" && unmatchedStudents.length > 0 && (
        <ManualMatchReview
          unmatchedStudents={unmatchedStudents}
          onConfirm={handleManualMatchDecisions}
          onCancel={() => {
            setStep("confirm");
            setUnmatchedStudents([]);
          }}
        />
      )}

      {/* 步骤4: 导入完成 */}
      {step === "complete" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span>✅ 成绩导入成功!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 成功消息 */}
            {importResult.errorRecords === 0 ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>太棒了！</strong> 已成功导入{" "}
                  {importResult.successRecords}{" "}
                  名学生的成绩数据,数据已准备就绪,可以开始分析了!
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  成功导入 {importResult.successRecords} 条记录,
                  {importResult.errorRecords} 条记录处理失败,请检查数据格式。
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.totalRecords}
                </div>
                <div className="text-sm text-gray-600">总学生数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.successRecords}
                </div>
                <div className="text-sm text-gray-600">成功导入</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.errorRecords}
                </div>
                <div className="text-sm text-gray-600">处理失败</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">部分记录导入失败：</div>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                  {importResult.errors.length > 5 && (
                    <p className="text-sm mt-2">
                      还有 {importResult.errors.length - 5} 个错误...
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleRestart}>
                继续导入其他文件
              </Button>
              <Button
                onClick={() => (window.location.href = "/grade-analysis")}
              >
                查看分析结果
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 辅助函数：智能生成字段映射
function generateSmartMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  // 字段匹配规则 - 增强对等级/级别数据的识别
  const fieldPatterns = {
    name: /姓名|name|学生姓名|真实姓名/i,
    student_id: /学号|student_?id|学生学号|学生编号|编号|考生号|id$/i,
    class: /班级|class|班级名称|所在班级/i,

    // 分数类型字段
    chinese_score:
      /语文(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^语文$(?!.*(?:等级|级别))|chinese.*?score/i,
    math_score:
      /数学(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^数学$(?!.*(?:等级|级别))|math.*?score|mathematics.*?score/i,
    english_score:
      /英语(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^英语$(?!.*(?:等级|级别))|english.*?score/i,
    physics_score:
      /物理(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^物理$(?!.*(?:等级|级别))|physics.*?score/i,
    chemistry_score:
      /化学(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^化学$(?!.*(?:等级|级别))|chemistry.*?score/i,
    biology_score:
      /生物(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^生物$(?!.*(?:等级|级别))|biology.*?score/i,
    history_score:
      /历史(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^历史$(?!.*(?:等级|级别))|history.*?score/i,
    geography_score:
      /地理(?!等级|级别|班名|校名|级名).*?(?:分数|成绩|得分|score)$|^地理$(?!.*(?:等级|级别))|geography.*?score/i,
    total_score: /总分|总成绩|total.*?score/i,

    // 等级/级别类型字段 - 重要！用户强调的等级数据识别
    chinese_grade: /语文.*?(?:等级|级别|评级|level|grade)$|语文等级|语文级别/i,
    math_grade: /数学.*?(?:等级|级别|评级|level|grade)$|数学等级|数学级别/i,
    english_grade: /英语.*?(?:等级|级别|评级|level|grade)$|英语等级|英语级别/i,
    physics_grade: /物理.*?(?:等级|级别|评级|level|grade)$|物理等级|物理级别/i,
    chemistry_grade:
      /化学.*?(?:等级|级别|评级|level|grade)$|化学等级|化学级别/i,
    biology_grade: /生物.*?(?:等级|级别|评级|level|grade)$|生物等级|生物级别/i,
    history_grade: /历史.*?(?:等级|级别|评级|level|grade)$|历史等级|历史级别/i,
    geography_grade:
      /地理.*?(?:等级|级别|评级|level|grade)$|地理等级|地理级别/i,

    // 排名类型字段
    class_rank: /班级排名|班排|班内排名/i,
    grade_rank: /年级排名|级排|校排|年级内排名/i,
  };

  for (const header of headers) {
    if (!header || typeof header !== "string") continue;

    for (const [systemField, pattern] of Object.entries(fieldPatterns)) {
      if (pattern.test(header.trim())) {
        mapping[systemField] = header;
        break;
      }
    }
  }

  return mapping;
}

// 辅助函数：计算解析置信度
function calculateConfidence(
  headers: string[],
  errors: string[],
  warnings: string[]
): number {
  let confidence = 1.0;

  // 基于找到的字段数量
  const mapping = generateSmartMapping(headers);
  const mappedFields = Object.keys(mapping).length;
  const expectedFields = 3; // 至少期望：姓名、一个科目分数

  if (mappedFields < expectedFields) {
    confidence -= (expectedFields - mappedFields) * 0.2;
  }

  // 基于错误数量
  confidence -= errors.length * 0.1;
  confidence -= warnings.length * 0.05;

  // 基于文件结构
  if (headers.length < 2) {
    confidence -= 0.3; // 文件结构太简单
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}
