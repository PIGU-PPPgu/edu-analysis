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
  analyzeCSVHeadersWithCache,
  saveMappingToCache,
  diagnoseMappingIssues,
} from "@/services/intelligentFieldMapper";
import {
  autoSyncService,
  type CreateOptions,
} from "@/services/autoSyncService";
import { intelligentStudentMatcher } from "@/services/intelligentStudentMatcher";
import type { MatchResult } from "@/services/intelligentStudentMatcher";
import {
  ManualMatchReview,
  type StudentDecision,
} from "@/components/import/ManualMatchReview";
import {
  useAutoFieldDetection,
  type AutoDetectionResult,
} from "@/hooks/useAutoFieldDetection";
// 🔧 Phase 3: 导入强制确认对话框组件
import {
  UnknownFieldsBlockDialog,
  LowConfidenceWarningDialog,
} from "@/components/analysis/core/grade-importer/components";

// 简化的用户流程：上传 → 智能确认 → 导入完成

interface SimpleGradeImporterProps {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
  // 自动模式：fast 默认自动应用高置信度映射；safe 要求人工确认
  autoMode?: "fast" | "safe";
  confidenceThreshold?: number; // 映射置信度阈值
  conflictThreshold?: number; // 未识别/冲突字段数超过该值则需人工确认
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
  fileBuffer?: ArrayBuffer; // 🔧 新增：保存文件的ArrayBuffer避免权限问题
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
  autoMode = "fast",
  confidenceThreshold = 0.8,
  conflictThreshold = 5,
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

  // 🎯 满分配置状态 - 支持智能默认值
  const [subjectMaxScores, setSubjectMaxScores] = useState<
    Record<string, number>
  >({
    total: 523,
    chinese: 120,
    math: 100,
    english: 75,
    physics: 63,
    chemistry: 45,
    politics: 50,
    history: 70,
  });
  const [showMaxScoreConfig, setShowMaxScoreConfig] = useState(true); // ⚠️ 默认展开，确保用户看到满分设置

  // 📚 班级选择相关状态
  const [classScope, setClassScope] = useState<
    "specific" | "wholeGrade" | "unknown"
  >("specific");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState<string>("");
  const [unmatchedStudents, setUnmatchedStudents] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [detectedMapping, setDetectedMapping] = useState<
    Record<string, { field: string; confidence: number }>
  >({});
  const [lowConfidenceFields, setLowConfidenceFields] = useState<
    Array<{ header: string; confidence: number }>
  >([]);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);

  // 🤖 AI辅助选项
  const [useAI, setUseAI] = useState(false); // 是否启用AI辅助
  const [aiMode, setAIMode] = useState<"auto" | "force" | "disabled">("auto"); // AI模式
  const [autoCreateStudents, setAutoCreateStudents] = useState(true); // 自动创建新学生（默认开启）

  const { detect } = useAutoFieldDetection({ confidenceThreshold });

  // 🔧 Phase 3: 强制确认对话框状态
  const [showUnknownFieldsDialog, setShowUnknownFieldsDialog] = useState(false);
  const [showLowConfidenceDialog, setShowLowConfidenceDialog] = useState(false);
  const [unknownFieldsList, setUnknownFieldsList] = useState<
    Array<{ name: string; sampleValues: string[] }>
  >([]);
  const [currentParseResult, setCurrentParseResult] = useState<any>(null);

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

  // 🎯 获取推荐的满分配置（共享函数）
  const getRecommendedMaxScores = useCallback(
    (examType: string): Record<string, number> => {
      const highStakesExams = ["期中考试", "期末考试", "模拟考试"];
      const isHighStakes = highStakesExams.includes(examType);

      if (isHighStakes) {
        // 正式考试：使用标准满分配置
        return {
          total: 523,
          chinese: 120,
          math: 100,
          english: 75,
          physics: 63,
          chemistry: 45,
          politics: 50,
          history: 70,
        };
      } else {
        // 月考/单元测试：使用简化满分配置
        return {
          total: 100,
          chinese: 100,
          math: 100,
          english: 100,
          physics: 100,
          chemistry: 100,
          politics: 100,
          history: 100,
        };
      }
    },
    []
  );

  // 🎯 智能调整满分：根据考试类型推荐不同的满分配置
  React.useEffect(() => {
    setSubjectMaxScores(getRecommendedMaxScores(examInfo.type));
  }, [examInfo.type, getRecommendedMaxScores]);

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
    setDetectedHeaders([]);
    setDetectedMapping({});
    setLowConfidenceFields([]);
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("");
    setProcessingStage("uploading");
    setProcessingError(null);

    let detectionResult: AutoDetectionResult | null = null;

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
          // 🔧 先读取arrayBuffer，避免后续访问权限问题
          const fileBuffer = await file.arrayBuffer();

          const parseResult = await intelligentFileParser.parseFile(file, {
            useAI,
            aiMode: useAI ? aiMode : "disabled",
            minConfidenceForAI: 0.8,
          });

          // 自动字段检测（用于快速确认）
          detectionResult = await detect(file);
          if (detectionResult) {
            setDetectedHeaders(detectionResult.headers);
            setDetectedMapping(detectionResult.mapping);
            const lowConfidence: Array<{ header: string; confidence: number }> =
              [];
            detectionResult.headers.forEach((h) => {
              const m = detectionResult?.mapping[h];
              if (!m || m.confidence < confidenceThreshold) {
                lowConfidence.push({
                  header: h,
                  confidence: m?.confidence || 0,
                });
              }
            });
            setLowConfidenceFields(lowConfidence);
            setLowConfidenceCount(lowConfidence.length);
          }
          console.log("[SimpleGradeImporter] 智能解析结果:", parseResult);
          console.log(
            `[SimpleGradeImporter] 使用的解析方法: ${parseResult.metadata.parseMethod}`
          );

          parsedData = {
            file,
            fileBuffer, // 🔧 保存arrayBuffer供后续使用
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

          // 合并自动检测映射（仅填充缺失字段）
          if (detectionResult?.mapping) {
            Object.entries(detectionResult.mapping).forEach(([raw, info]) => {
              const existing = Object.entries(parsedData.mapping).find(
                ([sysField, fileField]) =>
                  sysField === info.field || fileField === raw
              );
              if (!existing) {
                parsedData.mapping[info.field] = raw;
              }
            });
          }

          // 添加检测到的问题和建议
          const unknownCount = parseResult.metadata.unknownFields?.length || 0;
          if (unknownCount > 0) {
            parsedData.issues.push(`发现 ${unknownCount} 个未识别字段`);
          }
          if (parseResult.metadata.confidence < confidenceThreshold) {
            parsedData.issues.push("字段识别置信度较低，请检查映射");
          }

          // 🔧 Phase 3: 强制中止检查逻辑
          const mustConfirm = parseResult.metadata.mustConfirmMapping || false;
          const blockReasons = parseResult.metadata.blockReasons || [];

          console.log("[SimpleGradeImporter] 强制确认检查:", {
            mustConfirm,
            blockReasonsCount: blockReasons.length,
            unknownFieldsCount: unknownCount,
            confidence: parseResult.metadata.confidence,
          });

          // 保存当前解析结果供对话框使用
          setCurrentParseResult(parseResult);

          // 条件1: 有未识别字段 → 强制中止，显示未识别字段对话框
          if (unknownCount > 0 && parseResult.metadata.unknownFields) {
            console.warn(
              `[SimpleGradeImporter] ⚠️ 检测到${unknownCount}个未识别字段，中止流程`
            );
            setUnknownFieldsList(parseResult.metadata.unknownFields);
            setShowUnknownFieldsDialog(true);
            setParsedData(parsedData); // 保存数据但不继续流程
            setIsProcessing(false);
            setProcessingStage("validating");
            return; // 中止后续流程
          }

          // 条件2: 置信度低 → 强制中止，显示低置信度警告对话框
          if (mustConfirm && blockReasons.length > 0) {
            console.warn(
              `[SimpleGradeImporter] ⚠️ 识别置信度低或缺少必需字段，中止流程`
            );
            setShowLowConfidenceDialog(true);
            setParsedData(parsedData); // 保存数据但不继续流程
            setIsProcessing(false);
            setProcessingStage("validating");
            return; // 中止后续流程
          }

          // 没有需要强制确认的问题，继续正常流程
          console.log("[SimpleGradeImporter] ✅ 所有检查通过，继续正常流程");

          // 应用自动映射到预览数据
          if (detectionResult?.mapping) {
            parsedData.preview = parsedData.preview.map((row) => {
              const mapped: Record<string, any> = { ...row };
              Object.entries(detectionResult.mapping).forEach(([raw, info]) => {
                if (raw in row) {
                  const value: any = (row as any)[raw];
                  switch (info.field) {
                    case "name":
                      mapped.name = value;
                      break;
                    case "student_id":
                      mapped.student_id = value;
                      break;
                    case "class_name":
                      mapped.class_name = value;
                      break;
                    case "subject":
                      mapped.subject = value;
                      break;
                    case "score":
                      mapped.score = Number(value);
                      break;
                    case "exam_title":
                      mapped.exam_title = value;
                      break;
                    case "exam_date":
                      mapped.exam_date = value;
                      break;
                    default:
                      break;
                  }
                }
              });
              return mapped;
            });
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

          // 应用自动映射到预览数据
          if (detectionResult?.mapping) {
            parsedData.preview = parsedData.preview.map((row) => {
              const mapped: Record<string, any> = { ...row };
              Object.entries(detectionResult.mapping).forEach(([raw, info]) => {
                if (raw in row) {
                  const value: any = (row as any)[raw];
                  switch (info.field) {
                    case "name":
                      mapped.name = value;
                      break;
                    case "student_id":
                      mapped.student_id = value;
                      break;
                    case "class_name":
                      mapped.class_name = value;
                      break;
                    case "subject":
                      mapped.subject = value;
                      break;
                    case "score":
                      mapped.score = Number(value);
                      break;
                    case "exam_title":
                      mapped.exam_title = value;
                      break;
                    case "exam_date":
                      mapped.exam_date = value;
                      break;
                    default:
                      break;
                  }
                }
              });
              return mapped;
            });
          }
        }
      }

      setProgress(100);
      setProgressMessage("解析完成！");
      setParsedData(parsedData);
      const lowConfCount = Math.max(
        lowConfidenceCount,
        lowConfidenceFields.length
      );
      const needReview =
        autoMode === "safe" ||
        parsedData.confidence < confidenceThreshold ||
        lowConfCount > conflictThreshold;
      setShowFieldMapping(needReview);
      setStep(parsedData.preview.length > 0 ? "selectClass" : "upload"); // 先选择班级再确认数据

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

      // 🔧 使用保存的arrayBuffer重新解析，避免File权限问题
      const fileToUse = parsedData.fileBuffer || parsedData.file;
      const fullParseResult = await intelligentFileParser.parseFile(fileToUse, {
        useAI,
        aiMode: useAI ? aiMode : "disabled",
        minConfidenceForAI: 0.8,
        originalFileName: parsedData.file.name, // 传递原始文件名
      });
      console.log("[真实导入] 完整解析结果:", fullParseResult);
      console.log(
        `[真实导入] 使用的解析方法: ${fullParseResult.metadata.parseMethod}`
      );

      // 步骤3: 检查考试是否已存在，如果存在则复用
      setProgress(40);
      setProgressMessage("正在准备考试记录...");

      // 先查询是否已存在相同的考试
      const { data: existingExams } = await supabase
        .from("exams")
        .select("id")
        .eq("title", examInfo.title.trim())
        .eq("date", examInfo.date)
        .eq("type", examInfo.type)
        .limit(1);

      const examId =
        existingExams && existingExams.length > 0
          ? existingExams[0].id
          : crypto.randomUUID();

      const examData = {
        exam_id: examId,
        title: examInfo.title.trim(),
        type: examInfo.type,
        date: examInfo.date,
      };

      console.log("[真实导入] 考试信息:", {
        examId,
        isExisting: !!(existingExams && existingExams.length > 0),
        examInfo,
      });

      // 步骤4: 转换数据格式 - 将宽表格转换为长表格
      setProgress(55);
      setProgressMessage(
        `正在处理成绩数据 (共 ${fullParseResult.data.length} 名学生)...`
      );

      const headerAnalysis = analyzeCSVHeadersWithCache(
        fullParseResult.headers
      );
      console.log(
        "[真实导入] 字段分析结果:",
        headerAnalysis,
        `(缓存命中: ${headerAnalysis.cacheHits})`
      );

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

          // 🔍 调试：打印前3条记录的转换结果
          if (processedRows < 3) {
            console.log(`[调试] 第 ${processedRows + 1} 行转换结果:`, {
              原始数据: enrichedRowData,
              转换后: gradeRecord,
              student_id: gradeRecord.student_id,
              name: gradeRecord.name,
              total_score: gradeRecord.total_score,
              chinese_score: gradeRecord.chinese_score,
            });
          }

          // 验证记录有效性（检查映射后的英文字段）
          const hasStudentInfo = gradeRecord.student_id && gradeRecord.name;
          const hasScore =
            gradeRecord.total_score != null ||
            gradeRecord.chinese_score != null ||
            gradeRecord.math_score != null ||
            gradeRecord.english_score != null;

          if (hasStudentInfo && hasScore) {
            allGradeRecords.push(gradeRecord);
            successCount++;
          } else {
            errorCount++;
            const missingFields = [];
            if (!gradeRecord.student_id) missingFields.push("学号");
            if (!gradeRecord.name) missingFields.push("姓名");
            if (!hasScore) missingFields.push("成绩");

            errors.push(
              `行 ${processedRows + 1}: 缺少字段 [${missingFields.join(", ")}]`
            );

            // 打印详细错误信息
            if (processedRows < 5) {
              console.error(`[调试] 第 ${processedRows + 1} 行验证失败:`, {
                缺少字段: missingFields,
                原始数据: enrichedRowData,
                转换结果: gradeRecord,
              });
            }
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

      // 🔍 自动诊断字段映射问题
      const diagnostics = diagnoseMappingIssues(
        allGradeRecords,
        headerAnalysis
      );
      if (diagnostics.some((d) => d.severity === "error")) {
        const errorDiags = diagnostics.filter((d) => d.severity === "error");
        toast.error("⚠️ 检测到字段映射问题", {
          description: errorDiags.map((d) => d.message).join("；"),
          duration: 10000,
        });
        console.error("[映射诊断] 严重错误:", errorDiags);
      } else if (diagnostics.some((d) => d.severity === "warning")) {
        const warnDiags = diagnostics.filter((d) => d.severity === "warning");
        toast.warning("⚠️ 字段映射可能存在问题", {
          description: warnDiags.map((d) => d.message).join("；"),
          duration: 8000,
        });
      }

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

      // 通用重试配置
      const maxRetries = 3;

      // 1. 创建考试记录（如果不存在）
      if (!(existingExams && existingExams.length > 0)) {
        console.log("[真实导入] 创建新考试记录...");
        let examError = null;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          const { error } = await supabase.from("exams").insert({
            id: examId,
            title: examInfo.title.trim(),
            type: examInfo.type,
            date: examInfo.date,
            subject: "综合",
            scope: "all",
            created_at: new Date().toISOString(),
          });

          if (!error) {
            examError = null;
            console.log("[真实导入] 考试记录创建成功");
            break;
          }

          examError = error;
          retryCount++;

          if (retryCount < maxRetries) {
            console.warn(
              `[真实导入] 创建考试记录失败，第 ${retryCount} 次重试...`,
              error
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            ); // 递增延迟
          }
        }

        if (examError) {
          console.error("[真实导入] 创建考试记录失败（已重试3次）:", examError);
          throw new Error(`创建考试记录失败: ${examError.message}`);
        }
      } else {
        console.log("[真实导入] 复用现有考试记录:", examId);
      }

      // 2. 分批插入成绩数据到新表（避免超时）
      const batchSize = 100; // 每批100条
      const recordsToInsert = allGradeRecords.map((record) => ({
        ...record,
        exam_id: examId,
        // 🎯 添加各科目满分信息
        total_max_score: subjectMaxScores.total,
        chinese_max_score: subjectMaxScores.chinese,
        math_max_score: subjectMaxScores.math,
        english_max_score: subjectMaxScores.english,
        physics_max_score: subjectMaxScores.physics,
        chemistry_max_score: subjectMaxScores.chemistry,
        politics_max_score: subjectMaxScores.politics,
        history_max_score: subjectMaxScores.history,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(recordsToInsert.length / batchSize);

        console.log(
          `[真实导入] 保存第 ${batchNum}/${totalBatches} 批数据 (${batch.length} 条)...`
        );
        setProgressMessage(
          `正在保存成绩数据 (${batchNum}/${totalBatches} 批)...`
        );

        let saveError = null;
        let batchRetryCount = 0;

        while (batchRetryCount < maxRetries) {
          // 调试：打印第一条记录的结构
          if (i === 0 && batchRetryCount === 0) {
            console.log("[调试] 第一条成绩记录示例:", batch[0]);
          }

          const { error } = await supabase.from("grade_data").insert(batch);

          if (!error) {
            saveError = null;
            break;
          }

          saveError = error;
          batchRetryCount++;

          if (batchRetryCount < maxRetries) {
            console.warn(
              `[真实导入] 第 ${batchNum} 批保存失败，第 ${batchRetryCount} 次重试...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * batchRetryCount)
            );
          }
        }

        if (saveError) {
          console.error(
            `[真实导入] 第 ${batchNum} 批数据保存失败（已重试3次）:`,
            saveError
          );
          const detailedError = `第 ${batchNum}/${totalBatches} 批数据保存失败: ${saveError.message}`;
          console.error("[详细错误]", {
            error: saveError,
            code: saveError.code,
            details: saveError.details,
            hint: saveError.hint,
            message: saveError.message,
          });
          toast.error("数据保存失败", {
            description: detailedError,
            duration: 10000,
          });
          throw new Error(detailedError);
        }

        // 更新进度
        const progress = 80 + Math.floor((i / recordsToInsert.length) * 15);
        setProgress(progress);
      }

      console.log("[真实导入] 成功保存到grade_data表");

      // 步骤5: 智能学生匹配 - 根据用户选择决定是否匹配
      setProgress(85);
      setProgressMessage("正在处理学生信息...");
      setProcessingStage("analyzing");

      try {
        // 🔧 如果启用了自动创建新学生，直接跳过匹配流程
        if (autoCreateStudents) {
          console.log(
            "[自动创建模式] 已启用自动创建新学生，跳过匹配流程，直接同步..."
          );
          setProgressMessage("正在自动创建学生和班级...");

          // ✅ 传递 CreateOptions，根据用户设置决定是否创建新数据
          const createOptions: CreateOptions = {
            createNewClasses: autoCreateStudents,
            createNewStudents: autoCreateStudents,
          };
          const syncResult = await autoSyncService.syncImportedData(
            allGradeRecords,
            undefined,
            undefined,
            createOptions
          );

          console.log("[智能同步] 同步结果:", syncResult);

          if (syncResult.success) {
            console.log(
              `[智能同步] 完成！自动创建了 ${syncResult.newClasses.length} 个班级和 ${syncResult.newStudents.length} 名学生`
            );
            toast.success("学生信息同步成功", {
              description: `自动创建了 ${syncResult.newClasses.length} 个班级和 ${syncResult.newStudents.length} 名学生`,
              duration: 5000,
            });
          } else if (syncResult.errors.length > 0) {
            console.warn("[智能同步] 部分同步失败:", syncResult.errors);
            toast.warning("学生同步部分失败", {
              description: `错误: ${syncResult.errors.slice(0, 3).join(", ")}`,
              duration: 8000,
            });
          }
        } else {
          // 启用学生匹配流程（严格模式）
          console.log("[智能匹配] 开始匹配学生...");

          // 1. 查询系统中已有的学生
          const { data: existingStudents, error: studentsError } =
            await supabase
              .from("students")
              .select("id, student_id, name, class_name");

          if (studentsError) {
            console.error("[智能匹配] 查询学生失败:", studentsError);
            throw new Error(`查询学生失败: ${studentsError.message}`);
          }

          const systemStudents = (existingStudents || []).map((s: any) => ({
            id: s.id,
            student_id: s.student_id,
            name: s.name,
            class_name: s.class_name,
          }));

          console.log(`[智能匹配] 系统中已有 ${systemStudents.length} 名学生`);

          // 2. 准备文件学生数据
          const fileStudents = allGradeRecords.map((record) => ({
            student_id: record.student_id,
            name: record.name,
            class_name: record.class_name,
          }));

          // 3. 调用智能匹配器
          const matchingResult = await intelligentStudentMatcher.matchStudents(
            fileStudents,
            systemStudents
          );

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
          // ✅ 匹配完成后的同步，不创建新数据（已全部匹配）
          const syncResult = await autoSyncService.syncImportedData(
            allGradeRecords,
            undefined,
            undefined,
            {
              createNewClasses: false,
              createNewStudents: false,
            }
          );

          console.log("[智能同步] 同步结果:", syncResult);

          if (syncResult.success) {
            console.log(
              `[智能同步] 完成！自动创建了 ${syncResult.newClasses.length} 个班级和 ${syncResult.newStudents.length} 名学生`
            );
          } else if (syncResult.errors.length > 0) {
            console.warn("[智能同步] 部分同步失败:", syncResult.errors);
          }
        }
      } catch (matchError) {
        console.error("[智能处理] 处理过程出错:", matchError);
        const errorDetail =
          matchError instanceof Error ? matchError.message : String(matchError);
        console.error("[智能处理错误详情]", {
          error: matchError,
          message: errorDetail,
          stack: matchError instanceof Error ? matchError.stack : undefined,
        });

        toast.warning("学生匹配遇到问题", {
          description: "成绩已保存，正在尝试自动创建学生...",
          duration: 5000,
        });

        // 处理失败时回退到自动同步
        try {
          // ✅ 回退同步也尊重用户的创建设置
          const syncResult = await autoSyncService.syncImportedData(
            allGradeRecords,
            undefined,
            undefined,
            {
              createNewClasses: autoCreateStudents,
              createNewStudents: autoCreateStudents,
            }
          );
          console.log("[智能同步] 回退同步完成:", syncResult);

          if (!syncResult.success) {
            toast.error("学生同步失败", {
              description: `错误: ${syncResult.errors.join(", ")}`,
              duration: 10000,
            });
          }
        } catch (syncError) {
          console.error("[智能同步] 同步过程出错:", syncError);
          const syncErrorMsg =
            syncError instanceof Error ? syncError.message : String(syncError);
          toast.error("自动创建学生失败", {
            description: syncErrorMsg,
            duration: 10000,
          });
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

      // 🔄 保存成功的字段映射到缓存，供下次使用
      if (headerAnalysis.mappings.length > 0) {
        saveMappingToCache(headerAnalysis.mappings);
        console.log("[缓存] 已保存本次成功的字段映射");
      }

      toast.success("🎉 一键式导入成功！", {
        description: `成功创建考试"${examInfo.title}"，导入 ${importResult.successRecords} 个学生的成绩数据，系统已智能同步班级和学生信息`,
        duration: 8000,
      });

      // 🤖 自动生成分析报告
      (async () => {
        try {
          console.log("🤖 开始生成智能分析报告...");
          const { reportGenerator } = await import(
            "@/services/reportGenerator"
          );

          const report = await reportGenerator.generateCompleteReport(examId);
          if (report) {
            const saved = await reportGenerator.saveReport(report);
            if (saved) {
              console.log("✅ 报告已生成并保存:", report.metadata.reportId);
              toast.success("📊 智能分析报告已生成", {
                description:
                  "数据导入完成，AI 驱动的完整分析报告已自动生成并保存",
                duration: 5000,
              });
            }
          }
        } catch (error) {
          console.error("⚠️ 报告生成失败（不影响导入）:", error);
          // 报告生成失败不影响导入流程，只记录日志
        }
      })();

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

  // 🔧 Phase 3: 未识别字段对话框 - 确认处理
  const handleUnknownFieldsConfirm = useCallback(
    (mappings: Record<string, string>) => {
      console.log("[UnknownFields] 用户确认了字段映射:", mappings);

      if (!parsedData || !currentParseResult) {
        console.error("[UnknownFields] 缺少解析数据");
        return;
      }

      // 合并用户映射到现有映射
      const updatedMapping = {
        ...parsedData.mapping,
        ...mappings,
      };

      // 更新解析数据
      setParsedData({
        ...parsedData,
        mapping: updatedMapping,
        issues: parsedData.issues.filter(
          (issue) => !issue.includes("未识别字段")
        ),
      });

      // 关闭对话框
      setShowUnknownFieldsDialog(false);
      setUnknownFieldsList([]);

      // 继续下一步
      setStep("selectClass");
      setProcessingStage("completed");

      toast.success("字段映射已确认，请继续选择班级");
    },
    [parsedData, currentParseResult]
  );

  // 🔧 Phase 3: 未识别字段对话框 - 取消处理
  const handleUnknownFieldsCancel = useCallback(() => {
    console.log("[UnknownFields] 用户取消了导入");
    setShowUnknownFieldsDialog(false);
    setUnknownFieldsList([]);
    setParsedData(null);
    setCurrentParseResult(null);
    setStep("upload");
    setIsProcessing(false);
    setProgress(0); // 重置进度
    setProgressMessage(""); // 重置进度消息
    setProcessingStage("uploading"); // 重置处理阶段
    toast.info("已取消导入");
  }, []);

  // 🔧 Phase 3: 低置信度对话框 - 进入字段映射界面
  const handleEnterMapping = useCallback(() => {
    console.log("[LowConfidence] 用户选择进入字段映射界面");
    setShowLowConfidenceDialog(false);
    setShowFieldMapping(true); // 显示字段映射UI
    toast.info("请手动检查并调整字段映射");
  }, []);

  // 🔧 Phase 3: 低置信度对话框 - 信任并继续
  const handleTrustAndContinue = useCallback(() => {
    console.log("[LowConfidence] 用户选择信任AI并继续");
    setShowLowConfidenceDialog(false);

    if (!parsedData) {
      console.error("[LowConfidence] 缺少解析数据");
      return;
    }

    // 继续下一步
    setStep("selectClass");
    setProcessingStage("completed");
    toast.success("已继续导入流程，请选择班级");
  }, [parsedData]);

  // 🔧 Phase 3: 低置信度对话框 - 取消处理
  const handleLowConfidenceCancel = useCallback(() => {
    console.log("[LowConfidence] 用户取消了导入");
    setShowLowConfidenceDialog(false);
    setParsedData(null);
    setCurrentParseResult(null);
    setStep("upload");
    setIsProcessing(false);
    setProgress(0); // 重置进度
    setProgressMessage(""); // 重置进度消息
    setProcessingStage("uploading"); // 重置处理阶段
    toast.info("已取消导入");
  }, []);

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

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex-1">
                    <Label
                      htmlFor="auto-create"
                      className="text-sm font-medium"
                    >
                      自动创建新学生
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      成绩数据中的学生如不存在，自动创建到学生库（推荐开启）
                    </p>
                  </div>
                  <Switch
                    id="auto-create"
                    checked={autoCreateStudents}
                    onCheckedChange={setAutoCreateStudents}
                  />
                </div>

                {!autoCreateStudents && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm text-yellow-800">
                      关闭后，系统会严格匹配现有学生信息，未匹配的学生需手动确认
                    </AlertDescription>
                  </Alert>
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

            {/* 🎯 科目满分设置 - 可折叠 */}
            <Collapsible
              open={showMaxScoreConfig}
              onOpenChange={setShowMaxScoreConfig}
            >
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full flex items-center justify-between font-semibold text-amber-900 hover:text-amber-700 p-2"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5" />
                      科目满分设置
                      <Badge className="bg-red-500 text-white text-xs">
                        重要
                      </Badge>
                      <span className="text-xs text-gray-600">
                        (
                        {examInfo.type === "期中考试" ||
                        examInfo.type === "期末考试" ||
                        examInfo.type === "模拟考试"
                          ? "标准考试"
                          : "简化考试"}
                        )
                      </span>
                    </span>
                    {showMaxScoreConfig ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <Alert className="mt-2 mb-3 bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    <strong>⚠️ 请仔细检查满分设置！</strong>
                    满分直接影响及格率、优秀率和等级计算。
                    <br />
                    <div className="mt-2 space-y-1 font-mono text-xs">
                      <div>
                        • 当前总分满分：
                        <strong>{subjectMaxScores.total}</strong> 分
                      </div>
                      <div>
                        • 及格线 = {subjectMaxScores.total} × 60% ={" "}
                        <strong>
                          {Math.round(subjectMaxScores.total * 0.6)}
                        </strong>{" "}
                        分
                      </div>
                      <div>
                        • 优秀线 = {subjectMaxScores.total} × 90% ={" "}
                        <strong>
                          {Math.round(subjectMaxScores.total * 0.9)}
                        </strong>{" "}
                        分
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-800">
                      系统已根据考试类型（{examInfo.type}
                      ）自动推荐满分配置，请根据实际试卷调整。
                    </div>
                  </AlertDescription>
                </Alert>

                <CollapsibleContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        总分满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.total}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            total: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        语文满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.chinese}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            chinese: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        数学满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.math}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            math: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        英语满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.english}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            english: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        物理满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.physics}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            physics: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        化学满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.chemistry}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            chemistry: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        道法满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.politics}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            politics: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        历史满分
                      </label>
                      <input
                        type="number"
                        value={subjectMaxScores.history}
                        onChange={(e) =>
                          setSubjectMaxScores((prev) => ({
                            ...prev,
                            history: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* 恢复推荐值按钮 */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-amber-200">
                    <div className="text-xs text-gray-600">
                      根据考试类型自动推荐满分，您可以随时恢复
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubjectMaxScores(
                          getRecommendedMaxScores(examInfo.type)
                        );
                        toast.success("已恢复推荐满分配置");
                      }}
                      className="border-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      恢复推荐值
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

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

            {detectedHeaders.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <div className="flex flex-col gap-1 text-sm text-gray-700">
                  <div>
                    🤖 自动检测：识别到 {detectedHeaders.length} 列，自动映射{" "}
                    <span className="font-semibold text-green-700">
                      {Object.keys(detectedMapping).length}
                    </span>{" "}
                    个字段
                  </div>
                  <div className="text-xs text-gray-500">
                    置信度阈值 {Math.round(confidenceThreshold * 100)}%，
                    冲突阈值 {conflictThreshold} 个
                  </div>
                  {lowConfidenceFields.length > 0 && (
                    <div className="mt-2 text-amber-700 text-sm">
                      低置信度字段（请确认）：{lowConfidenceFields.length} 个
                      <div className="mt-1 flex flex-wrap gap-2">
                        {lowConfidenceFields.slice(0, 5).map((item) => (
                          <Badge
                            key={item.header}
                            variant="secondary"
                            className="bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            {item.header} ({Math.round(item.confidence * 100)}%)
                          </Badge>
                        ))}
                        {lowConfidenceFields.length > 5 && (
                          <span className="text-xs text-gray-500">
                            其余 {lowConfidenceFields.length - 5} 项省略
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* 智能检测：满分配置与数据不匹配警告 */}
            {(() => {
              // 从预览数据中检测总分
              const totalScoreFields = [
                "总分",
                "总成绩",
                "total_score",
                "总分数",
                "合计",
              ];
              let maxTotalScore = 0;

              parsedData.preview.forEach((row) => {
                totalScoreFields.forEach((field) => {
                  const score = parseFloat(row[field]);
                  if (!isNaN(score) && score > maxTotalScore) {
                    maxTotalScore = score;
                  }
                });
              });

              // 计算差异百分比
              const configuredMax = subjectMaxScores.total;
              const difference = Math.abs(maxTotalScore - configuredMax);

              // 改进：当配置为0或检测到有效总分时都计算差异
              let diffPercent = 0;
              if (maxTotalScore > 0 && configuredMax > 0) {
                diffPercent =
                  (difference / Math.max(configuredMax, maxTotalScore)) * 100;
              } else if (maxTotalScore > 0 && configuredMax === 0) {
                // 配置为0但数据有分数，视为100%差异
                diffPercent = 100;
              }

              // 如果差异>15%，显示警告
              if (maxTotalScore > 0 && diffPercent > 15) {
                return (
                  <Alert className="bg-yellow-50 border-yellow-300 border-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <AlertDescription className="text-sm">
                      <strong className="text-yellow-900">
                        ⚠️ 检测到满分配置可能不匹配
                      </strong>
                      <div className="mt-2 space-y-1 text-yellow-800">
                        <div>
                          • 数据中检测到的最高总分：
                          <strong className="text-yellow-900">
                            {maxTotalScore}
                          </strong>{" "}
                          分
                        </div>
                        <div>
                          • 当前配置的总分满分：
                          <strong className="text-yellow-900">
                            {configuredMax}
                          </strong>{" "}
                          分
                        </div>
                        <div>
                          • 差异：
                          <strong className="text-red-600">
                            {difference.toFixed(0)}
                          </strong>{" "}
                          分（{diffPercent.toFixed(1)}%）
                        </div>
                        <div className="text-xs text-yellow-700 mt-1">
                          💡 提示：基于前{parsedData.preview.length}
                          行样本数据检测，实际满分可能更高
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // 按比例调整各科满分（处理配置为0的情况）
                            if (configuredMax === 0) {
                              // 配置为0时，使用推荐配置并按比例缩放
                              const recommended = getRecommendedMaxScores(
                                examInfo.type
                              );

                              // 计算推荐配置的科目实际总和（而非total字段）
                              const recommendedSubjectSum =
                                recommended.chinese +
                                recommended.math +
                                recommended.english +
                                recommended.physics +
                                recommended.chemistry +
                                recommended.politics +
                                recommended.history;

                              // 使用实际总和计算比例，避免"月考"时所有科目都变成总分
                              const ratio =
                                maxTotalScore / recommendedSubjectSum;

                              setSubjectMaxScores({
                                total: maxTotalScore,
                                chinese: Math.round(
                                  recommended.chinese * ratio
                                ),
                                math: Math.round(recommended.math * ratio),
                                english: Math.round(
                                  recommended.english * ratio
                                ),
                                physics: Math.round(
                                  recommended.physics * ratio
                                ),
                                chemistry: Math.round(
                                  recommended.chemistry * ratio
                                ),
                                politics: Math.round(
                                  recommended.politics * ratio
                                ),
                                history: Math.round(
                                  recommended.history * ratio
                                ),
                              });
                            } else {
                              // 按当前配置比例调整
                              const ratio = maxTotalScore / configuredMax;
                              setSubjectMaxScores((prev) => ({
                                total: maxTotalScore,
                                chinese: Math.round(prev.chinese * ratio),
                                math: Math.round(prev.math * ratio),
                                english: Math.round(prev.english * ratio),
                                physics: Math.round(prev.physics * ratio),
                                chemistry: Math.round(prev.chemistry * ratio),
                                politics: Math.round(prev.politics * ratio),
                                history: Math.round(prev.history * ratio),
                              }));
                            }
                            setShowMaxScoreConfig(true);
                            toast.success(
                              `已将总分满分调整为 ${maxTotalScore} 分，并按比例调整各科满分`
                            );
                          }}
                          className="border-2 border-yellow-600 bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                        >
                          快速调整为 {maxTotalScore} 分（含各科）
                        </Button>
                        <span className="text-xs text-yellow-700">
                          或手动调整上方的满分设置
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}

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
                onClick={() => {
                  if (importResult?.examId) {
                    window.location.href = `/exam-management?highlightExam=${importResult.examId}`;
                  } else {
                    window.location.href = "/exam-management";
                  }
                }}
              >
                返回考试管理
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🔧 Phase 3: 未识别字段强制确认对话框 */}
      <UnknownFieldsBlockDialog
        open={showUnknownFieldsDialog}
        onOpenChange={setShowUnknownFieldsDialog}
        unknownFields={unknownFieldsList}
        onConfirm={handleUnknownFieldsConfirm}
        onCancel={handleUnknownFieldsCancel}
      />

      {/* 🔧 Phase 3: 低置信度警告对话框 */}
      <LowConfidenceWarningDialog
        open={showLowConfidenceDialog}
        onOpenChange={setShowLowConfidenceDialog}
        confidence={currentParseResult?.metadata?.confidence || 0}
        mappingQuality={currentParseResult?.metadata?.mappingQuality || 0}
        blockReasons={currentParseResult?.metadata?.blockReasons || []}
        onEnterMapping={handleEnterMapping}
        onTrustAndContinue={handleTrustAndContinue}
        onCancel={handleLowConfidenceCancel}
      />
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
