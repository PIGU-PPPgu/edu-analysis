import React, { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AutoAnalysisTrigger from "../../../AutoAnalysisTrigger";
import {
  convertToScore,
  detectDataType,
  GRADE_TO_SCORE_MAP,
} from "@/utils/dataTypeConverter";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Upload,
  Database,
  Loader2,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCcw,
  Download,
  Settings,
  Users,
  BookOpen,
  Clock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ImportResult,
  ImportProgress,
  ImportOptions,
  ExamInfo,
  ValidationResult,
  ImportMode,
  ImportModeConfig,
  SkippedRecord,
} from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  examDuplicateChecker,
  type ExamInfo as DuplicateExamInfo,
} from "@/services/examDuplicateChecker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SimplePostImportReview from "./SimplePostImportReview";

//  正式化考试重复检查函数 - 解决406错误的最优方案
const checkExamDuplicateOptimized = async (examInfo: ExamInfo) => {
  try {
    console.log("[检查重复] 开始优化考试查询:", examInfo.title);

    // 使用分阶段查询策略，避免复杂查询导致的406错误
    const { data, error } = await supabase
      .from("exams")
      .select(
        `
        id, 
        title, 
        type, 
        date, 
        created_at, 
        updated_at
      `
      )
      .eq("title", examInfo.title)
      .eq("type", examInfo.type)
      .eq("date", examInfo.date)
      .limit(10); // 限制结果数量，提高查询性能

    if (error) {
      console.error("[检查重复] 查询失败:", error);
      // 根据错误类型提供更具体的错误信息
      if (error.code === "406") {
        throw new Error("数据库查询格式不兼容，请检查考试信息格式");
      } else if (error.code === "PGRST116") {
        throw new Error("查询结果过大，请使用更具体的筛选条件");
      }
      return { data: null, error };
    }

    console.log("[检查重复] 查询成功:", data?.length || 0, "条记录");
    return { data, error: null };
  } catch (err) {
    console.error("[检查重复] 异常:", err);
    return { data: null, error: err };
  }
};

//  正式化成绩重复检查函数 - 高性能查询优化
const checkGradeDataDuplicateOptimized = async (
  examId: string,
  studentId: string
) => {
  try {
    console.log("[成绩检查] 开始查询重复成绩:", { examId, studentId });

    // 优化查询策略：只选择必要字段，提高查询性能
    const { data, error } = await supabase
      .from("grade_data")
      .select("id, student_id, exam_id, subject, created_at")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .limit(50) // 限制结果数量，防止大量数据导致的性能问题
      .order("created_at", { ascending: false }); // 按时间倒序，优先显示最新记录

    if (error) {
      console.error("[成绩检查] 查询失败:", error);
      // 提供更详细的错误处理
      if (error.code === "406") {
        throw new Error("成绩查询格式错误，请检查学号和考试ID格式");
      } else if (error.code === "PGRST204") {
        // 没有找到记录，这是正常情况
        return { data: [], error: null };
      }
      return { data: null, error };
    }

    console.log("[成绩检查] 查询成功:", data?.length || 0, "条重复记录");
    return { data, error: null };
  } catch (err) {
    console.error("[成绩检查] 异常:", err);
    return { data: null, error: err };
  }
};

const insertGradeDataSafe = async (gradeRecord: any) => {
  try {
    console.log("安全插入成绩数据，学生:", gradeRecord.student_id);
    console.log("输入数据字段:", Object.keys(gradeRecord));

    // 数据类型转换和清洗
    const cleanScore = (value: any): number | null => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const converted = convertToScore(value);
      if (converted !== null) {
        return converted;
      }

      // 记录转换失败的值
      console.warn(`无法转换分数值: "${value}" (类型: ${typeof value})`);
      return null;
    };

    // 构建单行宽表记录 - 每个学生每次考试只有一行记录，包含所有科目
    const wideRecord: Record<string, any> = {
      exam_id: gradeRecord.exam_id,
      student_id: gradeRecord.student_id,
      name: gradeRecord.name,
      class_name: gradeRecord.class_name,
      exam_title: gradeRecord.exam_title || null,
      exam_type: gradeRecord.exam_type || null,
      exam_date: gradeRecord.exam_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. 检测总分字段
    const totalScoreFields = [
      "total_score",
      "score",
      "总分",
      "总分分数",
      "总成绩",
    ];
    const totalGradeFields = ["grade", "original_grade", "总分等级", "等级"];
    const classRankFields = ["rank_in_class", "班级排名", "班排名", "总分班名"];
    const gradeRankFields = ["rank_in_grade", "年级排名", "级排名", "总分级名"];
    const schoolRankFields = [
      "rank_in_school",
      "学校排名",
      "校排名",
      "总分校名",
    ];

    // 查找并设置总分相关字段
    for (const field of totalScoreFields) {
      if (
        gradeRecord[field] !== undefined &&
        gradeRecord[field] !== null &&
        gradeRecord[field] !== ""
      ) {
        const score = cleanScore(gradeRecord[field]);
        if (score !== null) {
          wideRecord.total_score = score;
          break;
        }
      }
    }

    for (const field of totalGradeFields) {
      if (
        gradeRecord[field] !== undefined &&
        gradeRecord[field] !== null &&
        gradeRecord[field] !== ""
      ) {
        wideRecord.total_grade = String(gradeRecord[field]).trim();
        break;
      }
    }

    for (const field of classRankFields) {
      if (gradeRecord[field] !== undefined) {
        const rank = cleanScore(gradeRecord[field]);
        if (rank !== null) {
          wideRecord.total_rank_in_class = rank;
          break;
        }
      }
    }

    for (const field of gradeRankFields) {
      if (gradeRecord[field] !== undefined) {
        const rank = cleanScore(gradeRecord[field]);
        if (rank !== null) {
          wideRecord.total_rank_in_grade = rank;
          break;
        }
      }
    }

    for (const field of schoolRankFields) {
      if (gradeRecord[field] !== undefined) {
        const rank = cleanScore(gradeRecord[field]);
        if (rank !== null) {
          wideRecord.total_rank_in_school = rank;
          break;
        }
      }
    }

    // 2. 检测并设置各科目成绩字段到宽表记录
    const subjectFieldMappings = {
      // 英文字段映射到数据库列
      chinese_score: {
        scoreCol: "chinese_score",
        gradeCol: "chinese_grade",
        rankCol: "chinese_rank_in_class",
      },
      math_score: {
        scoreCol: "math_score",
        gradeCol: "math_grade",
        rankCol: "math_rank_in_class",
      },
      english_score: {
        scoreCol: "english_score",
        gradeCol: "english_grade",
        rankCol: "english_rank_in_class",
      },
      physics_score: {
        scoreCol: "physics_score",
        gradeCol: "physics_grade",
        rankCol: "physics_rank_in_class",
      },
      chemistry_score: {
        scoreCol: "chemistry_score",
        gradeCol: "chemistry_grade",
        rankCol: "chemistry_rank_in_class",
      },
      biology_score: {
        scoreCol: "biology_score",
        gradeCol: "biology_grade",
        rankCol: "biology_rank_in_class",
      },
      politics_score: {
        scoreCol: "politics_score",
        gradeCol: "politics_grade",
        rankCol: "politics_rank_in_class",
      },
      history_score: {
        scoreCol: "history_score",
        gradeCol: "history_grade",
        rankCol: "history_rank_in_class",
      },
      geography_score: {
        scoreCol: "geography_score",
        gradeCol: "geography_grade",
        rankCol: "geography_rank_in_class",
      },

      // 中文字段映射到数据库列
      语文: {
        scoreCol: "chinese_score",
        gradeCol: "chinese_grade",
        rankCol: "chinese_rank_in_class",
      },
      数学: {
        scoreCol: "math_score",
        gradeCol: "math_grade",
        rankCol: "math_rank_in_class",
      },
      英语: {
        scoreCol: "english_score",
        gradeCol: "english_grade",
        rankCol: "english_rank_in_class",
      },
      物理: {
        scoreCol: "physics_score",
        gradeCol: "physics_grade",
        rankCol: "physics_rank_in_class",
      },
      化学: {
        scoreCol: "chemistry_score",
        gradeCol: "chemistry_grade",
        rankCol: "chemistry_rank_in_class",
      },
      生物: {
        scoreCol: "biology_score",
        gradeCol: "biology_grade",
        rankCol: "biology_rank_in_class",
      },
      政治: {
        scoreCol: "politics_score",
        gradeCol: "politics_grade",
        rankCol: "politics_rank_in_class",
      },
      历史: {
        scoreCol: "history_score",
        gradeCol: "history_grade",
        rankCol: "history_rank_in_class",
      },
      地理: {
        scoreCol: "geography_score",
        gradeCol: "geography_grade",
        rankCol: "geography_rank_in_class",
      },

      // 中文分数字段映射
      语文分数: {
        scoreCol: "chinese_score",
        gradeCol: "chinese_grade",
        rankCol: "chinese_rank_in_class",
      },
      数学分数: {
        scoreCol: "math_score",
        gradeCol: "math_grade",
        rankCol: "math_rank_in_class",
      },
      英语分数: {
        scoreCol: "english_score",
        gradeCol: "english_grade",
        rankCol: "english_rank_in_class",
      },
      物理分数: {
        scoreCol: "physics_score",
        gradeCol: "physics_grade",
        rankCol: "physics_rank_in_class",
      },
      化学分数: {
        scoreCol: "chemistry_score",
        gradeCol: "chemistry_grade",
        rankCol: "chemistry_rank_in_class",
      },
      生物分数: {
        scoreCol: "biology_score",
        gradeCol: "biology_grade",
        rankCol: "biology_rank_in_class",
      },
      政治分数: {
        scoreCol: "politics_score",
        gradeCol: "politics_grade",
        rankCol: "politics_rank_in_class",
      },
      历史分数: {
        scoreCol: "history_score",
        gradeCol: "history_grade",
        rankCol: "history_rank_in_class",
      },
      地理分数: {
        scoreCol: "geography_score",
        gradeCol: "geography_grade",
        rankCol: "geography_rank_in_class",
      },
    };

    // 映射各科目成绩到宽表字段
    for (const [inputField, mapping] of Object.entries(subjectFieldMappings)) {
      if (
        gradeRecord[inputField] !== undefined &&
        gradeRecord[inputField] !== null &&
        gradeRecord[inputField] !== ""
      ) {
        const score = cleanScore(gradeRecord[inputField]);
        if (score !== null) {
          wideRecord[mapping.scoreCol] = score;
          console.log(`映射 ${inputField} -> ${mapping.scoreCol}: ${score}`);

          // 查找对应的等级字段
          const gradeField = gradeRecord[`${inputField}等级`]
            ? `${inputField}等级`
            : `${inputField}_grade`;
          if (gradeRecord[gradeField]) {
            wideRecord[mapping.gradeCol] = String(
              gradeRecord[gradeField]
            ).trim();
          }

          // 查找对应的排名字段
          const rankField = gradeRecord[`${inputField}班排名`]
            ? `${inputField}班排名`
            : `${inputField}_rank_in_class`;
          if (gradeRecord[rankField]) {
            const rank = cleanScore(gradeRecord[rankField]);
            if (rank !== null) {
              wideRecord[mapping.rankCol] = rank;
            }
          }
        }
      }
    }

    console.log(`准备插入宽表记录，学生: ${gradeRecord.student_id}`);
    console.log(`记录字段数量: ${Object.keys(wideRecord).length}`);

    // 插入单条宽表记录
    const { data, error } = await supabase
      .from("grade_data")
      .upsert(wideRecord, {
        onConflict: "exam_id,student_id",
        ignoreDuplicates: false,
      })
      .select("id, student_id, name, total_score, chinese_score, math_score")
      .single();

    if (error) {
      console.error("成绩宽表插入失败:", error);
      return { data: null, error };
    }

    console.log(`成绩宽表插入成功:`, data);
    return { data, error: null };
  } catch (err) {
    console.error("成绩插入异常:", err);
    return { data: null, error: err };
  }
};

//  正式化考试创建函数 - 高性能和错误处理优化
const createExamOptimized = async (examInfo: ExamInfo) => {
  try {
    const startTime = performance.now();
    console.log("[考试创建] 开始创建考试:", examInfo.title);

    // 数据清洗和验证
    const examRecord = {
      title: examInfo.title.trim(),
      type: examInfo.type.trim(),
      date: examInfo.date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 验证必要字段
    if (!examRecord.title || !examRecord.type || !examRecord.date) {
      throw new Error("考试信息不完整：标题、类型和日期都是必填项");
    }

    const { data, error } = await supabase
      .from("exams")
      .insert(examRecord)
      .select("id, title, type, date, created_at")
      .single();

    if (error) {
      console.error("[考试创建] 失败:", error);
      // 详细错误处理
      if (error.code === "23505") {
        throw new Error("考试记录已存在，请检查考试信息或修改后重试");
      } else if (error.code === "23502") {
        throw new Error("考试信息不完整，请检查必填字段");
      } else if (error.code === "406") {
        throw new Error("考试数据格式错误，请检查日期格式");
      }
      return { data: null, error };
    }

    const endTime = performance.now();
    console.log(
      `[考试创建] 成功: ${data.title}, 耗时: ${Math.round(endTime - startTime)}ms`
    );
    return { data, error: null };
  } catch (err) {
    console.error("[考试创建] 异常:", err);
    return { data: null, error: err };
  }
};

// 导入配置接口
export interface ImportConfig {
  batchSize: number;
  createMissingStudents: boolean;
  updateExistingData: boolean;
  skipDuplicates: boolean;
  enableBackup: boolean;
  enableRollback: boolean;
  parallelImport: boolean;
  strictMode: boolean;
}

// ImportProcessor 组件属性
interface ImportProcessorProps {
  validData: any[];
  examInfo: ExamInfo;
  validationResult: ValidationResult;
  headers: string[];
  sampleData: any[];
  currentMapping: Record<string, string>;
  aiAnalysis?: any;
  onImportComplete: (result: ImportResult) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

const ImportProcessor: React.FC<ImportProcessorProps> = ({
  validData,
  examInfo,
  validationResult,
  headers,
  sampleData,
  currentMapping,
  aiAnalysis,
  onImportComplete,
  onError,
  loading = false,
}) => {
  const { user } = useAuthContext(); // 获取当前用户信息
  const [importing, setImporting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    batchSize: 50,
    createMissingStudents: true,
    updateExistingData: true,
    skipDuplicates: true,
    enableBackup: true,
    enableRollback: true,
    parallelImport: false,
    strictMode: false,
  });
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    percentage: 0,
    currentBatch: 0,
    totalBatches: 0,
    status: "pending",
    startTime: null,
    endTime: null,
    errors: [],
    warnings: [],
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPostImportReview, setShowPostImportReview] = useState(false);
  const [updatedMapping, setUpdatedMapping] =
    useState<Record<string, string>>(currentMapping);
  const [activeTab, setActiveTab] = useState("config");

  // 导入模式状态
  const [importMode, setImportMode] = useState<ImportModeConfig>({
    mode: "full",
    autoDetected: false,
    confidence: 1.0,
    description: "完整导入模式",
  });
  const [skippedRecords, setSkippedRecords] = useState<SkippedRecord[]>([]);

  // 考试信息确认对话框状态
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [tempExamInfo, setTempExamInfo] = useState({
    title: examInfo.title || "未命名考试",
    type: examInfo.type || "月考",
    date: examInfo.date || new Date().toISOString().split("T")[0],
    subject: examInfo.subject || "",
    className: examInfo.className || "",
  });

  // 导入控制
  const abortControllerRef = useRef<AbortController | null>(null);
  const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化进度
  useEffect(() => {
    if (validData && validData.length > 0) {
      const totalBatches = Math.ceil(validData.length / importConfig.batchSize);
      setImportProgress((prev) => ({
        ...prev,
        total: validData.length,
        totalBatches,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
        currentBatch: 0,
        status: "pending",
        errors: [],
        warnings: [],
      }));
    }
  }, [validData, importConfig.batchSize]);

  // 开始导入 - 先显示考试确认对话框
  const startImport = async () => {
    if (!validData || validData.length === 0) {
      toast.error("没有有效数据可以导入");
      return;
    }

    // 显示考试信息确认对话框
    setShowExamDialog(true);
  };

  // 确认考试信息后执行导入
  const executeImport = async () => {
    // 先关闭对话框，等待DOM更新完成
    setShowExamDialog(false);

    // 等待一个渲染周期，确保Dialog正确卸载
    await new Promise((resolve) => setTimeout(resolve, 100));

    setImporting(true);
    setPaused(false);
    setActiveTab("progress");

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    const startTime = new Date();
    setImportProgress((prev) => ({
      ...prev,
      status: "importing",
      startTime,
      endTime: null,
      errors: [],
      warnings: [],
    }));

    try {
      const result = await performImport();
      setImportResult(result);

      // 导入成功后显示字段检查界面，而不是直接完成
      if (result.successCount > 0) {
        setShowPostImportReview(true);
        setActiveTab("review");

        // 生成包含跳过信息的消息
        const resultMessage = `导入完成！成功 ${result.successCount} 条，失败 ${result.failedCount} 条${skippedRecords.length > 0 ? `，跳过 ${skippedRecords.length} 条（学号不存在）` : ""}。请检查字段映射。`;
        toast.success(resultMessage);
      } else {
        onImportComplete(result);
        toast.error("导入失败，没有成功导入任何记录");
      }
    } catch (error) {
      console.error("导入失败:", error);
      onError("导入失败: " + error.message);

      setImportProgress((prev) => ({
        ...prev,
        status: "failed",
        endTime: new Date(),
      }));
    } finally {
      setImporting(false);
      abortControllerRef.current = null;
    }
  };

  // 执行导入
  const performImport = async (): Promise<ImportResult> => {
    const { batchSize, parallelImport, enableBackup } = importConfig;
    const totalBatches = Math.ceil(validData.length / batchSize);

    // 检测导入模式
    const headers = validData.length > 0 ? Object.keys(validData[0]) : [];
    const detectedMode = detectImportMode(headers);
    setImportMode(detectedMode);
    const localSkippedRecords: SkippedRecord[] = [];

    console.log(`[导入模式] ${detectedMode.description}`);

    // 初始化进度状态
    setImportProgress((prev) => ({
      ...prev,
      total: validData.length,
      totalBatches,
      processed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
      currentBatch: 0,
      status: "importing",
    }));

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedIds: string[] = [];

    // 备份数据（如果启用）
    if (enableBackup) {
      await createBackup();
    }

    // 创建考试记录
    let examId: string;
    try {
      const examResult = await createExamRecord();
      examId = examResult.id;
    } catch (error) {
      throw new Error("创建考试记录失败: " + error.message);
    }

    // 分批处理数据
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // 检查是否需要暂停或取消
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error("导入被用户取消");
      }

      while (paused) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, validData.length);
      const batch = validData.slice(startIndex, endIndex);

      setImportProgress((prev) => ({
        ...prev,
        currentBatch: batchIndex + 1,
        status: "importing",
      }));

      try {
        let batchResult;

        if (parallelImport) {
          // 并行处理批次
          batchResult = await processBatchParallel(
            batch,
            examId,
            detectedMode,
            localSkippedRecords,
            successCount + failedCount
          );
        } else {
          // 顺序处理批次
          batchResult = await processBatchSequential(
            batch,
            examId,
            detectedMode,
            localSkippedRecords
          );
        }

        successCount += batchResult.successCount;
        failedCount += batchResult.failedCount;
        errors.push(...batchResult.errors);
        warnings.push(...batchResult.warnings);
        processedIds.push(...batchResult.processedIds);

        // 更新进度
        const processed = endIndex;
        const percentage = Math.round((processed / validData.length) * 100);

        setImportProgress((prev) => ({
          ...prev,
          processed,
          successful: successCount,
          failed: failedCount,
          percentage,
          errors,
          warnings,
        }));

        // 短暂延迟，避免过度占用资源
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error(`批次 ${batchIndex + 1} 处理失败:`, error);
        errors.push(`批次 ${batchIndex + 1} 处理失败: ${error.message}`);
        failedCount += batch.length;
      }
    }

    // 完成导入
    const endTime = new Date();
    setImportProgress((prev) => ({
      ...prev,
      status: "completed",
      endTime,
    }));

    // 更新跳过记录的状态
    setSkippedRecords(localSkippedRecords);

    // 生成导入结果消息
    console.log(
      `[导入完成] 成功: ${successCount}, 失败: ${failedCount}, 跳过: ${localSkippedRecords.length}`
    );

    return {
      success: true,
      examId,
      successCount,
      failedCount,
      totalCount: validData.length,
      errors,
      warnings,
      processedIds,
      duration:
        importProgress.startTime && importProgress.startTime instanceof Date
          ? endTime.getTime() - importProgress.startTime.getTime()
          : 0,
    };
  };

  // 顺序处理批次
  const processBatchSequential = async (
    batch: any[],
    examId: string,
    detectedMode: ImportModeConfig,
    localSkippedRecords: SkippedRecord[]
  ) => {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedIds: string[] = [];
    let processedCount = 0;

    for (const record of batch) {
      try {
        // 处理学生信息 - 获取匹配或创建的学生记录
        let studentRecord = null;

        // 根据导入模式处理学生记录
        if (detectedMode.mode === "grades-only") {
          // 仅成绩模式：只查询，不创建
          studentRecord = await findStudentByIdOnly(record.student_id);

          if (!studentRecord) {
            // 学号不存在，跳过该记录
            localSkippedRecords.push({
              row: processedCount + 1,
              student_id: record.student_id,
              reason: "学号不存在于系统中",
              data: record,
            });

            console.log(
              `[跳过记录] 第${processedCount + 1}行: 学号 ${record.student_id} 不存在`
            );
            processedCount++;
            continue; // 跳过该行
          }
        } else {
          // 完整导入模式：查询或创建
          if (importConfig.createMissingStudents) {
            studentRecord = await ensureStudentExists(record);
          }
        }

        // 使用智能匹配返回的学生UUID，如果没有则使用原始记录中的student_id
        const finalStudentId = studentRecord
          ? studentRecord.id
          : record.student_id;

        // 准备数据 - 使用已映射的字段数据和正确的学生UUID
        const gradeData = {
          exam_id: examId,
          student_id: finalStudentId, // 使用匹配到的学生UUID
          name: record.name,
          class_name: record.class_name,
          subject: record.subject,
          score: record.score,
          total_score: record.total_score,
          grade: record.original_grade || record.grade, // 支持两种字段名
          rank_in_class: record.rank_in_class,
          rank_in_grade: record.rank_in_grade,
          grade_level: record.grade_level,
          exam_title: tempExamInfo.title,
          exam_type: tempExamInfo.type,
          exam_date: tempExamInfo.date,
          metadata: record.metadata || {},

          // 支持更多字段映射结果
          chinese_score: record.chinese_score,
          math_score: record.math_score,
          english_score: record.english_score,
          physics_score: record.physics_score,
          chemistry_score: record.chemistry_score,
          biology_score: record.biology_score,
          politics_score: record.politics_score,
          history_score: record.history_score,
          geography_score: record.geography_score,
          rank_in_school: record.rank_in_school,
        };

        // 插入成绩数据
        await insertGradeData(gradeData);

        successCount++;
        processedIds.push(record.student_id);
      } catch (error) {
        console.error("插入数据失败:", error);
        errors.push(`学号 ${record.student_id}: ${error.message}`);
        failedCount++;
      }
    }

    return { successCount, failedCount, errors, warnings, processedIds };
  };

  // 并行处理批次
  const processBatchParallel = async (
    batch: any[],
    examId: string,
    detectedMode: ImportModeConfig,
    localSkippedRecords: SkippedRecord[],
    processedCount: number
  ) => {
    const promises = batch.map(async (record, index) => {
      try {
        // 处理学生信息 - 获取匹配或创建的学生记录
        let studentRecord = null;

        // 根据导入模式处理学生记录
        if (detectedMode.mode === "grades-only") {
          // 仅成绩模式：只查询，不创建
          studentRecord = await findStudentByIdOnly(record.student_id);

          if (!studentRecord) {
            // 学号不存在，跳过该记录
            localSkippedRecords.push({
              row: processedCount + index + 1,
              student_id: record.student_id,
              reason: "学号不存在于系统中",
              data: record,
            });

            console.log(`[跳过记录] 学号 ${record.student_id} 不存在`);
            return { success: false, skipped: true }; // 标记为跳过
          }
        } else {
          // 完整导入模式：查询或创建
          if (importConfig.createMissingStudents) {
            studentRecord = await ensureStudentExists(record);
          }
        }

        // 使用智能匹配返回的学生UUID，如果没有则使用原始记录中的student_id
        const finalStudentId = studentRecord
          ? studentRecord.id
          : record.student_id;

        // 准备数据 - 使用已映射的字段数据和正确的学生UUID
        const gradeData = {
          exam_id: examId,
          student_id: finalStudentId, // 使用匹配到的学生UUID
          name: record.name,
          class_name: record.class_name,
          subject: record.subject,
          score: record.score,
          total_score: record.total_score,
          grade: record.original_grade || record.grade, // 支持两种字段名
          rank_in_class: record.rank_in_class,
          rank_in_grade: record.rank_in_grade,
          grade_level: record.grade_level,

          // 支持更多字段映射结果
          chinese_score: record.chinese_score,
          math_score: record.math_score,
          english_score: record.english_score,
          physics_score: record.physics_score,
          chemistry_score: record.chemistry_score,
          biology_score: record.biology_score,
          politics_score: record.politics_score,
          history_score: record.history_score,
          geography_score: record.geography_score,
          rank_in_school: record.rank_in_school,
          exam_title: tempExamInfo.title,
          exam_type: tempExamInfo.type,
          exam_date: tempExamInfo.date,
          metadata: record.metadata || {},
        };

        // 插入成绩数据
        await insertGradeData(gradeData);

        return { success: true, studentId: record.student_id };
      } catch (error) {
        console.error("插入数据失败:", error);
        return {
          success: false,
          studentId: record.student_id,
          error: error.message,
        };
      }
    });

    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const processedIds: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const value = result.value;
        if (value.success) {
          successCount++;
          processedIds.push(value.studentId);
        } else {
          failedCount++;
          errors.push(`学号 ${value.studentId}: ${value.error}`);
        }
      } else {
        failedCount++;
        errors.push(`记录 ${index + 1}: ${result.reason}`);
      }
    });

    return { successCount, failedCount, errors, warnings, processedIds };
  };

  // 创建考试记录 - 使用智能重复检查
  const createExamRecord = async () => {
    // 检查用户认证状态
    if (!user) {
      throw new Error("用户未登录，无法创建考试记录");
    }

    console.log(" 使用安全的考试记录创建，用户信息:", {
      userId: user.id,
      email: user.email,
    });

    try {
      //  使用优化的考试查询，解决406错误
      const duplicateCheck = await checkExamDuplicateOptimized(tempExamInfo);

      if (duplicateCheck.error) {
        console.error("考试查询失败:", duplicateCheck.error);
        // 如果查询失败，继续尝试创建
      } else if (duplicateCheck.data && duplicateCheck.data.length > 0) {
        const existingExam = duplicateCheck.data[0];
        console.log("找到现有考试记录，重用:", existingExam);
        toast.info(`使用现有考试记录: ${existingExam.title}`);
        return existingExam;
      }

      //  使用优化的考试创建函数
      const createResult = await createExamOptimized(tempExamInfo);

      if (createResult.error) {
        console.error("安全考试创建失败:", createResult.error);

        // 处理409重复键错误
        if (createResult.error.code === "23505") {
          throw new Error("考试记录已存在，请检查考试信息或删除重复记录后重试");
        }

        throw new Error(`创建考试记录失败: ${createResult.error.message}`);
      }

      console.log("考试记录创建成功:", createResult.data);
      toast.success("考试记录创建成功");
      return createResult.data;
    } catch (error) {
      console.error("考试记录处理失败:", error);

      // 如果智能处理失败，提供用户选择
      if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        toast.error("检测到重复考试，请检查考试信息或选择不同的名称");
        throw new Error("考试已存在，请修改考试标题、日期或类型后重试");
      }

      throw error;
    }
  };

  // 自动检测导入模式
  const detectImportMode = (headers: string[]): ImportModeConfig => {
    const studentInfoPatterns = [
      "姓名",
      "name",
      "学生姓名",
      "student_name",
      "studentname",
      "班级",
      "class",
      "class_name",
      "classname",
      "班级名称",
    ];

    const hasStudentInfo = headers.some((header) =>
      studentInfoPatterns.some((pattern) =>
        header.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    if (hasStudentInfo) {
      return {
        mode: "full",
        autoDetected: true,
        confidence: 0.95,
        description: "完整导入模式 - 将自动创建不存在的学生",
      };
    } else {
      return {
        mode: "grades-only",
        autoDetected: true,
        confidence: 0.9,
        description:
          "仅成绩模式 - 将通过学号关联现有学生，不存在的学号将被跳过",
      };
    }
  };

  // 仅查询学生（不创建）
  const findStudentByIdOnly = async (studentId: string) => {
    try {
      const { data: student, error } = await supabase
        .from("students")
        .select("id, student_id, name, class_name")
        .eq("student_id", studentId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // 没有找到记录
          return null;
        }
        console.error("查询学生失败:", error);
        return null;
      }

      return student;
    } catch (err) {
      console.error("查询学生异常:", err);
      return null;
    }
  };

  // 确保学生存在 - 使用智能匹配算法
  const ensureStudentExists = async (record: any) => {
    // 检查用户认证状态
    if (!user) {
      throw new Error("用户未登录，无法创建学生记录");
    }

    try {
      // 1. 获取所有现有学生（用于智能匹配）
      const { data: existingStudents, error: fetchError } = await supabase
        .from("students")
        .select("id, student_id, name, class_name")
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("获取现有学生失败:", fetchError);
        throw new Error(`获取现有学生失败: ${fetchError.message}`);
      }

      // 2. 使用智能匹配算法
      const { intelligentStudentMatcher } = await import(
        "@/services/intelligentStudentMatcher"
      );

      const fileStudents = [
        {
          name: record.name,
          student_id: record.student_id,
          class_name: record.class_name,
        },
      ];

      const systemStudents = existingStudents.map((s) => ({
        id: s.id,
        name: s.name,
        student_id: s.student_id,
        class_name: s.class_name,
      }));

      // 执行智能匹配（严格三选二）
      const matchResult = await intelligentStudentMatcher.matchStudents(
        fileStudents,
        systemStudents,
        {
          useCache: true,
        }
      );

      // 3. 处理匹配结果
      if (matchResult.exactMatches.length > 0) {
        // 找到三选二精确匹配，使用现有学生
        const match = matchResult.exactMatches[0];
        console.log(
          `三选二匹配成功: ${record.name} -> 现有学生 ${match.systemStudent!.name} (${match.matchType})`
        );
        return match.systemStudent;
      }

      // 无法通过三选二匹配，需要手动处理或创建新学生
      if (matchResult.manualReviewNeeded.length > 0) {
        console.log(`无法通过三选二匹配: ${record.name}，创建新学生`);
      }

      // 4. 没有匹配到，创建新学生
      if (matchResult.newStudents.length > 0) {
        console.log("智能匹配未找到匹配学生，创建新学生记录:", {
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
        });

        const { data: newStudent, error: insertError } = await supabase
          .from("students")
          .insert({
            student_id: record.student_id,
            name: record.name,
            class_name: record.class_name,
            grade: record.grade_level,
          })
          .select("id, student_id, name, class_name")
          .single();

        if (insertError) {
          console.error("创建学生记录失败:", insertError);
          throw new Error(`创建学生记录失败: ${insertError.message}`);
        }

        console.log("新学生记录创建成功:", newStudent);
        return newStudent;
      }
    } catch (error) {
      console.error("智能学生匹配失败，回退到简单匹配:", error);

      // 回退机制：使用简单的student_id检查
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id, student_id, name, class_name")
        .eq("student_id", record.student_id)
        .single();

      if (existingStudent) {
        console.log("回退匹配成功:", existingStudent.name);
        return existingStudent;
      }

      // 最后手段：创建新学生
      const { data: newStudent, error: insertError } = await supabase
        .from("students")
        .insert({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          grade: record.grade_level,
        })
        .select("id, student_id, name, class_name")
        .single();

      if (insertError) {
        throw new Error(`创建学生记录失败: ${insertError.message}`);
      }

      return newStudent;
    }
  };

  // 插入成绩数据 - 改进版本，处理重复数据
  const insertGradeData = async (gradeData: any) => {
    try {
      //  使用优化的重复检查，解决406错误
      const duplicateCheck = await checkGradeDataDuplicateOptimized(
        gradeData.exam_id,
        gradeData.student_id
      );

      if (duplicateCheck.error) {
        console.error("重复检查失败:", duplicateCheck.error);
        // 继续尝试插入，可能是查询问题而非数据问题
      } else if (duplicateCheck.data && duplicateCheck.data.length > 0) {
        const existingData = duplicateCheck.data[0];

        // 如果配置为跳过重复数据
        if (importConfig.skipDuplicates) {
          console.log(`跳过重复数据: 学号${gradeData.student_id}`);
          return;
        }

        // 如果配置为更新现有数据
        if (importConfig.updateExistingData) {
          //  使用安全的更新方式
          const updateResult = await insertGradeDataSafe({
            ...gradeData,
            id: existingData.id, // 用于更新现有记录
          });

          if (updateResult.error) {
            throw new Error(`更新数据失败: ${updateResult.error.message}`);
          }

          console.log(`更新现有数据: 学号${gradeData.student_id}`);
          return;
        }

        // 默认情况下抛出错误
        throw new Error(`数据已存在: 学号${gradeData.student_id}`);
      }

      //  使用安全的插入函数
      const insertResult = await insertGradeDataSafe(gradeData);

      if (insertResult.error) {
        throw new Error(`插入数据失败: ${insertResult.error.message}`);
      }
    } catch (error) {
      console.error("插入成绩数据失败:", error);
      throw error;
    }
  };

  // 创建备份
  const createBackup = async () => {
    // 实现数据备份逻辑
    console.log("创建数据备份...");
  };

  // 暂停导入
  const pauseImport = () => {
    setPaused(true);
    setImportProgress((prev) => ({
      ...prev,
      status: "paused",
    }));
    toast.info("导入已暂停");
  };

  // 恢复导入
  const resumeImport = () => {
    setPaused(false);
    setImportProgress((prev) => ({
      ...prev,
      status: "importing",
    }));
    toast.info("导入已恢复");
  };

  // 取消导入
  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setImporting(false);
    setPaused(false);
    setImportProgress((prev) => ({
      ...prev,
      status: "cancelled",
      endTime: new Date(),
    }));
    toast.warning("导入已取消");
  };

  // 重置状态
  const resetImport = () => {
    setImporting(false);
    setPaused(false);
    setImportResult(null);
    setShowPostImportReview(false);
    setUpdatedMapping(currentMapping);
    setImportProgress((prev) => ({
      ...prev,
      processed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
      currentBatch: 0,
      status: "pending",
      startTime: null,
      endTime: null,
      errors: [],
      warnings: [],
    }));
    setActiveTab("config");
  };

  // 确认并前往分析
  const handleConfirmAndProceed = () => {
    if (importResult) {
      onImportComplete(importResult);
      window.location.href = "/grade-analysis";
    }
  };

  // 重新导入
  const handleReimport = () => {
    setShowPostImportReview(false);
    resetImport();
  };

  // 导出导入报告
  const exportImportReport = () => {
    if (!importResult) return;

    const report = {
      考试信息: {
        标题: tempExamInfo.title,
        类型: tempExamInfo.type,
        日期: tempExamInfo.date,
      },
      导入统计: {
        总记录数: importResult.totalCount,
        成功数: importResult.successCount,
        失败数: importResult.failedCount,
        成功率: `${Math.round((importResult.successCount / importResult.totalCount) * 100)}%`,
      },
      时间信息: {
        开始时间: importProgress.startTime?.toLocaleString(),
        结束时间: importProgress.endTime?.toLocaleString(),
        总耗时: `${Math.round(importResult.duration / 1000)}秒`,
      },
      错误信息: importResult.errors,
      警告信息: importResult.warnings,
    };

    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `导入报告_${tempExamInfo.title}_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("导入报告导出成功");
  };

  // 计算导入统计
  const importStats = {
    progressPercentage: importProgress.percentage,
    isCompleted: importProgress.status === "completed",
    isFailed: importProgress.status === "failed",
    isPaused: importProgress.status === "paused",
    isImporting: importProgress.status === "importing",
    estimatedTimeRemaining: (() => {
      if (!importProgress.startTime || importProgress.processed === 0)
        return null;
      const elapsed = Date.now() - importProgress.startTime.getTime();
      const rate = importProgress.processed / elapsed;
      const remaining =
        (importProgress.total - importProgress.processed) / rate;
      return Math.round(remaining / 1000);
    })(),
  };

  return (
    <>
      {/* 考试信息确认对话框 */}
      <Dialog
        key="exam-dialog"
        open={showExamDialog}
        onOpenChange={setShowExamDialog}
      >
        <DialogContent key="exam-dialog-content" className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认考试信息</DialogTitle>
            <DialogDescription>
              请确认或修改考试信息，确保数据导入的准确性
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="exam-title">考试标题</Label>
              <Input
                id="exam-title"
                value={tempExamInfo.title}
                onChange={(e) =>
                  setTempExamInfo((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="请输入考试标题"
              />
            </div>

            <div>
              <Label htmlFor="exam-type">考试类型</Label>
              <Select
                value={tempExamInfo.type}
                onValueChange={(value) =>
                  setTempExamInfo((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择考试类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="月考">月考</SelectItem>
                  <SelectItem value="期中考试">期中考试</SelectItem>
                  <SelectItem value="期末考试">期末考试</SelectItem>
                  <SelectItem value="模拟考试">模拟考试</SelectItem>
                  <SelectItem value="单元测试">单元测试</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exam-date">考试日期</Label>
              <Input
                id="exam-date"
                type="date"
                value={tempExamInfo.date}
                onChange={(e) =>
                  setTempExamInfo((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="exam-subject">科目 (可选)</Label>
              <Input
                id="exam-subject"
                value={tempExamInfo.subject}
                onChange={(e) =>
                  setTempExamInfo((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="如果是单科考试，请输入科目名称"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDialog(false)}>
              取消
            </Button>
            <Button onClick={executeImport}>确认并开始导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            数据导入处理
          </CardTitle>
          <CardDescription>
            配置导入参数，执行数据导入，监控导入进度
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 导入概览 - Positivus风格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-all duration-200">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-black" />
                <div>
                  <p className="text-2xl font-bold text-black">
                    {validData ? validData.length : 0}
                  </p>
                  <p className="text-sm text-gray-600">待导入记录</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#B9FF66] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-all duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-black" />
                <div>
                  <p className="text-2xl font-bold text-black">
                    {importProgress.successful}
                  </p>
                  <p className="text-sm text-black">成功导入</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-all duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-black">
                    {importProgress.failed}
                  </p>
                  <p className="text-sm text-gray-600">导入失败</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-all duration-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-black" />
                <div>
                  <p className="text-2xl font-bold text-black">
                    {importStats.estimatedTimeRemaining
                      ? `${importStats.estimatedTimeRemaining}s`
                      : "—"}
                  </p>
                  <p className="text-sm text-gray-600">预计剩余</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config">导入配置</TabsTrigger>
              <TabsTrigger value="progress">导入进度</TabsTrigger>
              <TabsTrigger value="result">导入结果</TabsTrigger>
              <TabsTrigger value="review" disabled={!showPostImportReview}>
                字段检查
              </TabsTrigger>
            </TabsList>

            {/* 导入配置 */}
            <TabsContent value="config">
              <div className="space-y-6">
                <Card className="p-4 bg-gray-50">
                  <h4 className="font-medium mb-4">导入配置</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">创建缺失学生</Label>
                        <Switch
                          checked={importConfig.createMissingStudents}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              createMissingStudents: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">更新现有数据</Label>
                        <Switch
                          checked={importConfig.updateExistingData}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              updateExistingData: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">跳过重复记录</Label>
                        <Switch
                          checked={importConfig.skipDuplicates}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              skipDuplicates: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">启用数据备份</Label>
                        <Switch
                          checked={importConfig.enableBackup}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              enableBackup: checked,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">启用回滚功能</Label>
                        <Switch
                          checked={importConfig.enableRollback}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              enableRollback: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">并行导入</Label>
                        <Switch
                          checked={importConfig.parallelImport}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              parallelImport: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">严格模式</Label>
                        <Switch
                          checked={importConfig.strictMode}
                          onCheckedChange={(checked) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              strictMode: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">批次大小</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2"
                          value={importConfig.batchSize}
                          onChange={(e) =>
                            setImportConfig((prev) => ({
                              ...prev,
                              batchSize: parseInt(e.target.value),
                            }))
                          }
                        >
                          <option value={10}>10条/批次</option>
                          <option value={25}>25条/批次</option>
                          <option value={50}>50条/批次</option>
                          <option value={100}>100条/批次</option>
                          <option value={200}>200条/批次</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 配置说明 */}
                <Alert>
                  <Settings className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">配置说明：</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>
                          • <strong>创建缺失学生</strong>:
                          自动创建数据中不存在的学生记录
                        </li>
                        <li>
                          • <strong>更新现有数据</strong>: 更新已存在的成绩记录
                        </li>
                        <li>
                          • <strong>跳过重复记录</strong>:
                          遇到重复记录时跳过而不是报错
                        </li>
                        <li>
                          • <strong>并行导入</strong>: 可能更快但占用更多资源
                        </li>
                        <li>
                          • <strong>严格模式</strong>: 任何错误都会停止导入
                        </li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* 导入进度 */}
            <TabsContent value="progress">
              <div className="space-y-6">
                {/* 进度条 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">导入进度</h4>
                    <Badge
                      variant={
                        importStats.isCompleted
                          ? "default"
                          : importStats.isFailed
                            ? "destructive"
                            : importStats.isPaused
                              ? "secondary"
                              : importStats.isImporting
                                ? "default"
                                : "outline"
                      }
                    >
                      {importProgress.status === "completed"
                        ? "已完成"
                        : importProgress.status === "failed"
                          ? "失败"
                          : importProgress.status === "paused"
                            ? "已暂停"
                            : importProgress.status === "importing"
                              ? "导入中"
                              : importProgress.status === "cancelled"
                                ? "已取消"
                                : "待开始"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {importProgress.processed} / {importProgress.total}(
                        {importProgress.percentage}%)
                      </span>
                      <span>
                        批次 {importProgress.currentBatch} /{" "}
                        {importProgress.totalBatches}
                      </span>
                    </div>
                    <Progress
                      value={importProgress.percentage}
                      className="h-3"
                    />
                  </div>

                  {importStats.estimatedTimeRemaining && (
                    <p className="text-sm text-gray-600">
                      预计剩余时间: {importStats.estimatedTimeRemaining} 秒
                    </p>
                  )}
                </div>

                {/* 实时状态 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {importProgress.successful}
                      </p>
                      <p className="text-xs text-gray-600">成功</p>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">
                        {importProgress.failed}
                      </p>
                      <p className="text-xs text-gray-600">失败</p>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">
                        {importProgress.errors.length}
                      </p>
                      <p className="text-xs text-gray-600">错误</p>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-600">
                        {importProgress.warnings.length}
                      </p>
                      <p className="text-xs text-gray-600">警告</p>
                    </div>
                  </Card>
                </div>

                {/* 错误日志 */}
                {importProgress.errors.length > 0 && (
                  <Card className="p-4">
                    <h5 className="font-medium mb-2">错误日志</h5>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {importProgress.errors
                          .slice(-10)
                          .map((error, index) => (
                            <p key={index} className="text-sm text-red-600">
                              {error}
                            </p>
                          ))}
                      </div>
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* 导入结果 */}
            <TabsContent value="result">
              <div className="space-y-6">
                {importResult ? (
                  <>
                    {/* 结果统计 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-4 text-center">
                        <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">
                          {importResult.totalCount}
                        </p>
                        <p className="text-sm text-gray-600">总记录数</p>
                      </Card>

                      <Card className="p-4 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold">
                          {importResult.successCount}
                        </p>
                        <p className="text-sm text-gray-600">成功导入</p>
                      </Card>

                      <Card className="p-4 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <p className="text-2xl font-bold">
                          {importResult.failedCount}
                        </p>
                        <p className="text-sm text-gray-600">导入失败</p>
                      </Card>

                      <Card className="p-4 text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">
                          {Math.round(importResult.duration / 1000)}
                        </p>
                        <p className="text-sm text-gray-600">耗时(秒)</p>
                      </Card>
                    </div>

                    {/* 成功率 */}
                    <Card className="p-4">
                      <h5 className="font-medium mb-2">导入成功率</h5>
                      <div className="flex justify-between text-sm mb-2">
                        <span>成功率</span>
                        <span>
                          {Math.round(
                            (importResult.successCount /
                              importResult.totalCount) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          (importResult.successCount /
                            importResult.totalCount) *
                          100
                        }
                        className="h-2"
                      />
                    </Card>

                    {/* 详细信息 */}
                    {(importResult.errors.length > 0 ||
                      importResult.warnings.length > 0) && (
                      <Card className="p-4">
                        <h5 className="font-medium mb-2">详细信息</h5>

                        {importResult.errors.length > 0 && (
                          <div className="mb-4">
                            <h6 className="text-sm font-medium text-red-600 mb-2">
                              错误信息
                            </h6>
                            <ScrollArea className="h-32 border rounded p-2">
                              <div className="space-y-1">
                                {importResult.errors.map((error, index) => (
                                  <p
                                    key={index}
                                    className="text-sm text-red-600"
                                  >
                                    {typeof error === "string"
                                      ? error
                                      : error.error || error.code}
                                  </p>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {importResult.warnings.length > 0 && (
                          <div>
                            <h6 className="text-sm font-medium text-yellow-600 mb-2">
                              警告信息
                            </h6>
                            <ScrollArea className="h-32 border rounded p-2">
                              <div className="space-y-1">
                                {importResult.warnings.map((warning, index) => (
                                  <p
                                    key={index}
                                    className="text-sm text-yellow-600"
                                  >
                                    {typeof warning === "string"
                                      ? warning
                                      : warning.warning || warning.code}
                                  </p>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </Card>
                    )}
                  </>
                ) : (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      暂无导入结果，请先执行导入操作
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            {/* 字段检查和映射编辑 */}
            <TabsContent value="review">
              {showPostImportReview && (
                <SimplePostImportReview
                  headers={headers}
                  sampleData={sampleData}
                  currentMapping={updatedMapping}
                  onConfirmAndProceed={handleConfirmAndProceed}
                  onReimport={handleReimport}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* 自动分析触发器 */}
          {importResult && importResult.successCount > 0 && (
            <div className="mt-6">
              <AutoAnalysisTrigger
                examTitle={tempExamInfo?.title || "未命名考试"}
                className={tempExamInfo?.className}
                studentCount={importResult.successCount}
                autoTrigger={true}
                onImportComplete={() => {
                  toast.success("🎉 分析已完成并推送到企业微信！");
                }}
              />
            </div>
          )}

          {/* 导入模式提示 */}
          {importMode.autoDetected && !importing && !importResult && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>
                      检测到
                      {importMode.mode === "full" ? "完整导入" : "仅成绩导入"}
                      模式
                    </strong>
                    <p className="text-sm text-muted-foreground mt-1">
                      {importMode.description}
                    </p>
                  </div>
                  <Badge
                    variant={
                      importMode.mode === "full" ? "default" : "secondary"
                    }
                  >
                    {importMode.mode === "full" ? "完整模式" : "仅成绩模式"}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 跳过记录警告 */}
          {skippedRecords.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>
                  跳过 {skippedRecords.length} 条记录（学号不存在）
                </strong>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">查看详情</summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {skippedRecords.slice(0, 10).map((record, idx) => (
                      <li key={idx}>
                        第{record.row}行: 学号{" "}
                        <code className="bg-muted px-1 rounded">
                          {record.student_id}
                        </code>{" "}
                        - {record.reason}
                      </li>
                    ))}
                    {skippedRecords.length > 10 && (
                      <li className="text-muted-foreground">
                        ... 还有 {skippedRecords.length - 10} 条记录
                      </li>
                    )}
                  </ul>
                </details>
                <p className="text-sm mt-2 text-muted-foreground">
                  💡
                  提示：如需导入新学生成绩，请使用包含"姓名"和"班级"列的完整表格
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              {!importing && !importResult && (
                <Button
                  onClick={startImport}
                  disabled={!validData || validData.length === 0 || loading}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  开始导入
                </Button>
              )}

              {importing && !paused && (
                <Button variant="outline" onClick={pauseImport}>
                  <PauseCircle className="w-4 h-4 mr-2" />
                  暂停
                </Button>
              )}

              {importing && paused && (
                <Button variant="outline" onClick={resumeImport}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  恢复
                </Button>
              )}

              {importing && (
                <Button variant="destructive" onClick={cancelImport}>
                  <StopCircle className="w-4 h-4 mr-2" />
                  取消
                </Button>
              )}

              {importResult && (
                <Button variant="outline" onClick={resetImport}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重新开始
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {importResult &&
                importResult.successCount > 0 &&
                !showPostImportReview && (
                  <Button
                    onClick={() => (window.location.href = "/grade-analysis")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    前往成绩分析
                  </Button>
                )}
              {importResult && (
                <Button variant="outline" onClick={exportImportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  导出报告
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default ImportProcessor;
