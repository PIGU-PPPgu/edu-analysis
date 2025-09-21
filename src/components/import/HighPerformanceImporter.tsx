import React, { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Upload,
  AlertCircle,
  RefreshCw,
  Zap,
  HardDrive,
  Gauge,
  Cpu,
  Memory,
  Database,
  Clock,
  Settings,
  Pause,
  Play,
  Square,
  Activity,
  TrendingUp,
  FileText,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { intelligentFileParser } from "@/services/intelligentFileParser";
import {
  convertWideToLongFormatEnhanced,
  analyzeCSVHeaders,
} from "@/services/intelligentFieldMapper";
import { autoSyncService } from "@/services/autoSyncService";
import {
  processFileWithWorker,
  shouldUseWorker,
  isWorkerSupported,
  getWorkerManager,
} from "@/utils/workerManager";

interface HighPerformanceImporterProps {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
  maxFileSize?: number; // MB
  enableMemoryMonitoring?: boolean;
  enablePerformanceMetrics?: boolean;
  batchSize?: number;
  concurrentWorkers?: number;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successRecords: number;
  errorRecords: number;
  errors: string[];
  examId?: string;
  processingTime: number;
  peakMemoryUsage?: number;
  averageProcessingSpeed?: number; // records per second
}

interface ProcessingMetrics {
  startTime: number;
  currentPhase: string;
  processedRecords: number;
  totalRecords: number;
  recordsPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
  estimatedTimeRemaining: number;
  throughput: number;
  errorRate: number;
}

interface PerformanceStats {
  fileReadTime: number;
  parseTime: number;
  validationTime: number;
  conversionTime: number;
  databaseTime: number;
  totalTime: number;
  memoryPeak: number;
  recordsProcessed: number;
  averageSpeed: number;
  cacheHitRate: number;
}

export const HighPerformanceImporter: React.FC<HighPerformanceImporterProps> = ({
  onComplete,
  onCancel,
  maxFileSize = 100, // 100MB 默认限制
  enableMemoryMonitoring = true,
  enablePerformanceMetrics = true,
  batchSize = 1000,
  concurrentWorkers = Math.min(4, navigator.hardwareConcurrency || 2),
}) => {
  const [step, setStep] = useState<
    "upload" | "processing" | "importing" | "complete" | "paused"
  >("upload");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detailedProgress, setDetailedProgress] = useState({
    currentOperation: "",
    phase: "",
    percentage: 0,
    eta: "",
    throughput: "",
  });

  const [metrics, setMetrics] = useState<ProcessingMetrics>({
    startTime: 0,
    currentPhase: "",
    processedRecords: 0,
    totalRecords: 0,
    recordsPerSecond: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    estimatedTimeRemaining: 0,
    throughput: 0,
    errorRate: 0,
  });

  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    fileReadTime: 0,
    parseTime: 0,
    validationTime: 0,
    conversionTime: 0,
    databaseTime: 0,
    totalTime: 0,
    memoryPeak: 0,
    recordsProcessed: 0,
    averageSpeed: 0,
    cacheHitRate: 0,
  });

  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
    estimatedRecords: number;
  } | null>(null);

  const [examInfo, setExamInfo] = useState({
    title: "",
    type: "月考",
    date: new Date().toISOString().split("T")[0],
  });

  // 实时监控引用
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingStateRef = useRef<{
    startTime: number;
    processedRecords: number;
    totalRecords: number;
    lastUpdateTime: number;
    errors: string[];
    isPaused: boolean;
    abortController?: AbortController;
  }>({
    startTime: 0,
    processedRecords: 0,
    totalRecords: 0,
    lastUpdateTime: 0,
    errors: [],
    isPaused: false,
  });

  // 内存监控
  const monitorPerformance = useCallback(() => {
    if (!enablePerformanceMetrics) return;

    const now = performance.now();
    const state = processingStateRef.current;

    // 计算处理速度
    const timeDiff = (now - state.lastUpdateTime) / 1000; // 转换为秒
    const recordsDiff = state.processedRecords - metrics.processedRecords;
    const speed = timeDiff > 0 ? recordsDiff / timeDiff : 0;

    // 估算剩余时间
    const remainingRecords = state.totalRecords - state.processedRecords;
    const eta = speed > 0 ? remainingRecords / speed : 0;

    // 内存使用（如果支持）
    let memoryUsage = 0;
    if (enableMemoryMonitoring && "memory" in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    // 计算吞吐量（MB/s）
    const throughput =
      timeDiff > 0 && fileInfo
        ? ((recordsDiff / timeDiff) * 1000) / fileInfo.size
        : 0;

    // 错误率
    const errorRate =
      state.totalRecords > 0 ? (state.errors.length / state.totalRecords) * 100 : 0;

    setMetrics({
      startTime: state.startTime,
      currentPhase: step,
      processedRecords: state.processedRecords,
      totalRecords: state.totalRecords,
      recordsPerSecond: Math.round(speed),
      memoryUsage: Math.round(memoryUsage),
      cpuUsage: 0, // CPU监控需要专门的API
      estimatedTimeRemaining: Math.round(eta),
      throughput: Math.round(throughput * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
    });

    state.lastUpdateTime = now;
  }, [step, metrics.processedRecords, enablePerformanceMetrics, enableMemoryMonitoring, fileInfo]);

  // 开始性能监控
  useEffect(() => {
    if (isProcessing && enablePerformanceMetrics) {
      metricsIntervalRef.current = setInterval(monitorPerformance, 500); // 0.5秒更新一次
      return () => {
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
        }
      };
    }
  }, [isProcessing, monitorPerformance, enablePerformanceMetrics]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      // 清理Worker Manager
      const manager = getWorkerManager();
      if (manager) {
        manager.dispose();
      }
    };
  }, []);

  // 文件大小格式化
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // 时间格式化
  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  }, []);

  // 文件检查和预处理
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string; warnings: string[] } => {
      const warnings: string[] = [];
      
      // 文件大小检查
      if (file.size > maxFileSize * 1024 * 1024) {
        return {
          valid: false,
          error: `文件大小超过限制 (${formatFileSize(file.size)} > ${maxFileSize}MB)`,
          warnings,
        };
      }

      // 文件类型检查
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const fileExt = file.name.toLowerCase().split(".").pop() || "";
      if (!validExtensions.includes("." + fileExt)) {
        return {
          valid: false,
          error: `不支持的文件类型: ${fileExt}。支持的格式: ${validExtensions.join(", ")}`,
          warnings,
        };
      }

      // 性能警告
      if (file.size > 10 * 1024 * 1024) {
        warnings.push(`大文件 (${formatFileSize(file.size)})，将启用高性能模式`);
      }

      // Worker支持检查
      if (shouldUseWorker(file) && !isWorkerSupported()) {
        warnings.push("浏览器不支持Web Workers，可能影响大文件处理性能");
      }

      return { valid: true, warnings };
    },
    [maxFileSize, formatFileSize]
  );

  // 高性能文件上传处理
  const handleFileUpload = useCallback(
    async (file: File) => {
      // 文件验证
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error!);
        return;
      }

      // 显示警告
      validation.warnings.forEach((warning) => {
        toast.warning(warning, { duration: 5000 });
      });

      setIsProcessing(true);
      setStep("processing");
      setProgress(0);

      // 设置文件信息
      const estimatedRecords = Math.max(1, Math.floor(file.size / 100)); // 粗略估算
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        estimatedRecords,
      });

      // 初始化处理状态
      const startTime = performance.now();
      processingStateRef.current = {
        startTime,
        processedRecords: 0,
        totalRecords: estimatedRecords,
        lastUpdateTime: startTime,
        errors: [],
        isPaused: false,
        abortController: new AbortController(),
      };

      // 设置考试信息
      setExamInfo(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));

      try {
        let parseResult;

        if (shouldUseWorker(file)) {
          // 使用高性能Web Worker
          toast.success(
            `🚀 启用高性能模式处理 ${formatFileSize(file.size)} 的文件`,
            { icon: "⚡", duration: 3000 }
          );

          setDetailedProgress({
            currentOperation: "高性能文件解析",
            phase: "reading",
            percentage: 0,
            eta: "计算中...",
            throughput: "0 MB/s",
          });

          parseResult = await processFileWithWorker(file, {
            onProgress: (progress) => {
              const phaseProgress = {
                reading: 20,
                parsing: 50,
                validating: 70,
                formatting: 90,
              };

              const baseProgress = phaseProgress[progress.phase] || 0;
              const currentProgress = baseProgress + (progress.progress / 100) * 20;
              
              setProgress(Math.min(currentProgress, 95));
              setDetailedProgress({
                currentOperation: progress.message,
                phase: progress.phase,
                percentage: currentProgress,
                eta: formatTime(metrics.estimatedTimeRemaining),
                throughput: `${metrics.throughput} MB/s`,
              });

              // 更新处理状态
              if (progress.currentRow && progress.totalRows) {
                processingStateRef.current.processedRecords = progress.currentRow;
                processingStateRef.current.totalRecords = progress.totalRows;
              }
            },
          });
        } else {
          // 标准处理模式
          setDetailedProgress({
            currentOperation: "标准模式文件解析",
            phase: "parsing",
            percentage: 10,
            eta: "计算中...",
            throughput: "计算中...",
          });

          parseResult = await intelligentFileParser.parseFile(file);
        }

        // 处理解析结果
        setProgress(100);
        setDetailedProgress(prev => ({
          ...prev,
          currentOperation: "解析完成",
          percentage: 100,
          eta: "0秒",
        }));

        // 记录性能统计
        const totalTime = performance.now() - startTime;
        setPerformanceStats(prev => ({
          ...prev,
          parseTime: totalTime,
          recordsProcessed: parseResult.data?.length || 0,
          totalTime,
          averageSpeed: parseResult.data?.length ? (parseResult.data.length / (totalTime / 1000)) : 0,
        }));

        toast.success(
          `📊 解析完成！处理了 ${parseResult.data?.length || 0} 条记录，耗时 ${formatTime(totalTime / 1000)}`
        );

        setStep("importing");
        await handleConfirmImport(parseResult);
      } catch (error) {
        console.error("高性能文件处理失败:", error);
        toast.error(
          `处理失败: ${error instanceof Error ? error.message : "未知错误"}`,
          { duration: 8000 }
        );
        setStep("upload");
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    },
    [validateFile, formatFileSize, formatTime, metrics.estimatedTimeRemaining, metrics.throughput]
  );

  // 确认并执行导入
  const handleConfirmImport = useCallback(async (parseResult: any) => {
    if (!parseResult || !examInfo.title.trim()) return;

    setIsProcessing(true);
    setStep("importing");

    const startTime = performance.now();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // 阶段1: 数据转换 (10-30%)
      setDetailedProgress({
        currentOperation: "转换数据格式",
        phase: "conversion",
        percentage: 10,
        eta: formatTime(metrics.estimatedTimeRemaining),
        throughput: `${metrics.recordsPerSecond} rec/s`,
      });

      const headerAnalysis = analyzeCSVHeaders(parseResult.headers);
      const examId = crypto.randomUUID();
      const examData = {
        exam_id: examId,
        title: examInfo.title.trim(),
        type: examInfo.type,
        date: examInfo.date,
      };

      // 分批处理数据转换
      const allGradeRecords: any[] = [];
      const totalRecords = parseResult.data.length;
      processingStateRef.current.totalRecords = totalRecords;

      for (let i = 0; i < parseResult.data.length; i += batchSize) {
        if (processingStateRef.current.isPaused) {
          await new Promise(resolve => {
            const checkResume = () => {
              if (!processingStateRef.current.isPaused) {
                resolve(null);
              } else {
                setTimeout(checkResume, 100);
              }
            };
            checkResume();
          });
        }

        const batch = parseResult.data.slice(i, i + batchSize);
        
        for (const rowData of batch) {
          try {
            const gradeRecord = convertWideToLongFormatEnhanced(
              rowData,
              headerAnalysis,
              examData
            );

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
              errors.push(`行 ${i + 1}: 缺少必要数据字段`);
            }
          } catch (error) {
            errorCount++;
            errors.push(`行 ${i + 1}: 转换失败`);
          }

          processingStateRef.current.processedRecords++;
        }

        // 更新进度
        const conversionProgress = 10 + (i / parseResult.data.length) * 20;
        setProgress(conversionProgress);
        setDetailedProgress(prev => ({
          ...prev,
          percentage: conversionProgress,
          eta: formatTime(metrics.estimatedTimeRemaining),
        }));

        // 让出控制权，避免阻塞UI
        if (i % (batchSize * 5) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // 阶段2: 数据库保存 (30-80%)
      setDetailedProgress({
        currentOperation: "保存到数据库",
        phase: "database",
        percentage: 30,
        eta: formatTime(metrics.estimatedTimeRemaining),
        throughput: `${metrics.recordsPerSecond} rec/s`,
      });

      const dbStartTime = performance.now();

      // 创建考试记录
      const { error: examError } = await supabase.from("exams").upsert({
        id: examId,
        title: examInfo.title.trim(),
        type: examInfo.type,
        date: examInfo.date,
        subject: "综合",
        scope: "all",
        created_at: new Date().toISOString(),
      }, {
        onConflict: "title,date,type",
        ignoreDuplicates: false,
      });

      if (examError) {
        throw new Error(`创建考试记录失败: ${examError.message}`);
      }

      setProgress(40);

      // 分批保存成绩数据
      const insertBatchSize = Math.min(500, batchSize); // 数据库插入使用较小的批次
      for (let i = 0; i < allGradeRecords.length; i += insertBatchSize) {
        if (processingStateRef.current.isPaused) {
          await new Promise(resolve => {
            const checkResume = () => {
              if (!processingStateRef.current.isPaused) {
                resolve(null);
              } else {
                setTimeout(checkResume, 100);
              }
            };
            checkResume();
          });
        }

        const batch = allGradeRecords.slice(i, i + insertBatchSize).map(record => ({
          ...record,
          exam_id: examId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: saveError } = await supabase
          .from("grade_data_new")
          .insert(batch);

        if (saveError) {
          throw new Error(`数据库保存失败: ${saveError.message}`);
        }

        // 更新进度
        const dbProgress = 40 + (i / allGradeRecords.length) * 30;
        setProgress(dbProgress);
        setDetailedProgress(prev => ({
          ...prev,
          percentage: dbProgress,
        }));

        // 控制保存速度，避免过载
        if (i % (insertBatchSize * 3) === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const dbTime = performance.now() - dbStartTime;

      // 阶段3: 智能同步 (80-95%)
      setProgress(80);
      setDetailedProgress({
        currentOperation: "智能同步班级和学生",
        phase: "sync",
        percentage: 80,
        eta: formatTime(metrics.estimatedTimeRemaining),
        throughput: `${metrics.recordsPerSecond} rec/s`,
      });

      try {
        const syncResult = await autoSyncService.syncImportedData(allGradeRecords);
        
        if (syncResult.success) {
          toast.success(`🤖 智能同步完成`, {
            description: `创建了 ${syncResult.newClasses.length} 个班级和 ${syncResult.newStudents.length} 名学生`,
            duration: 6000,
          });
        }
      } catch (syncError) {
        console.warn("智能同步失败:", syncError);
        toast.warning("数据已导入，但智能同步遇到问题");
      }

      // 完成
      setProgress(100);
      const totalTime = performance.now() - startTime;

      // 更新性能统计
      setPerformanceStats(prev => ({
        ...prev,
        databaseTime: dbTime,
        totalTime,
        recordsProcessed: successCount,
        averageSpeed: successCount / (totalTime / 1000),
        memoryPeak: metrics.memoryUsage,
      }));

      const result: ImportResult = {
        success: true,
        totalRecords: totalRecords,
        successRecords: successCount,
        errorRecords: errorCount,
        errors: errors.slice(0, 20),
        examId,
        processingTime: totalTime,
        peakMemoryUsage: metrics.memoryUsage,
        averageProcessingSpeed: successCount / (totalTime / 1000),
      };

      setImportResult(result);
      setStep("complete");

      toast.success(
        `🎉 高性能导入完成！`,
        {
          description: `成功导入 ${successCount} 条记录，耗时 ${formatTime(totalTime / 1000)}`,
          duration: 8000,
        }
      );

      onComplete?.(result);
    } catch (error) {
      console.error("高性能导入失败:", error);
      toast.error("导入失败", {
        description: error instanceof Error ? error.message : "未知错误",
        duration: 8000,
      });
      setStep("processing");
    } finally {
      setIsProcessing(false);
    }
  }, [examInfo, batchSize, metrics.estimatedTimeRemaining, metrics.recordsPerSecond, metrics.memoryUsage, formatTime, onComplete]);

  // 暂停/恢复处理
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      processingStateRef.current.isPaused = false;
      setIsPaused(false);
      toast.info("处理已恢复");
    } else {
      processingStateRef.current.isPaused = true;
      setIsPaused(true);
      setStep("paused");
      toast.info("处理已暂停");
    }
  }, [isPaused]);

  // 停止处理
  const handleStop = useCallback(() => {
    if (processingStateRef.current.abortController) {
      processingStateRef.current.abortController.abort();
    }
    setIsProcessing(false);
    setStep("upload");
    toast.info("处理已停止");
  }, []);

  // 重新开始
  const handleRestart = useCallback(() => {
    setStep("upload");
    setImportResult(null);
    setProgress(0);
    setFileInfo(null);
    setMetrics({
      startTime: 0,
      currentPhase: "",
      processedRecords: 0,
      totalRecords: 0,
      recordsPerSecond: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      estimatedTimeRemaining: 0,
      throughput: 0,
      errorRate: 0,
    });
    setPerformanceStats({
      fileReadTime: 0,
      parseTime: 0,
      validationTime: 0,
      conversionTime: 0,
      databaseTime: 0,
      totalTime: 0,
      memoryPeak: 0,
      recordsProcessed: 0,
      averageSpeed: 0,
      cacheHitRate: 0,
    });
    setExamInfo({
      title: "",
      type: "月考",
      date: new Date().toISOString().split("T")[0],
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader>
          <CardTitle className="text-3xl font-black text-[#191A23] uppercase tracking-wide flex items-center">
            <div className="p-3 bg-[#191A23] rounded-full border-2 border-black mr-3">
              <Zap className="h-8 w-8 text-[#B9FF66]" />
            </div>
            高性能数据导入引擎
            <Badge variant="secondary" className="ml-3 bg-[#B9FF66] text-[#191A23] font-bold">
              v2.0 Enterprise
            </Badge>
          </CardTitle>
          <p className="text-[#191A23]/80 font-medium mt-2">
            支持超大文件 • Web Worker 多线程 • 实时监控 • 智能恢复 • 企业级性能
          </p>
        </CardHeader>
      </Card>

      {/* 系统状态面板 */}
      {enablePerformanceMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#B9FF66]">
            <CardContent className="p-3 text-center">
              <Activity className="w-6 h-6 mx-auto mb-1 text-[#191A23]" />
              <div className="text-lg font-black text-[#191A23]">
                {metrics.recordsPerSecond}
              </div>
              <div className="text-xs font-bold text-[#191A23]/70 uppercase">
                记录/秒
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#6B7280]">
            <CardContent className="p-3 text-center">
              <Memory className="w-6 h-6 mx-auto mb-1 text-[#191A23]" />
              <div className="text-lg font-black text-[#191A23]">
                {metrics.memoryUsage}MB
              </div>
              <div className="text-xs font-bold text-[#191A23]/70 uppercase">
                内存使用
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#6B7280]">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-1 text-[#191A23]" />
              <div className="text-lg font-black text-[#191A23]">
                {metrics.throughput}MB/s
              </div>
              <div className="text-xs font-bold text-[#191A23]/70 uppercase">
                吞吐量
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#6B7280]">
            <CardContent className="p-3 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-[#191A23]" />
              <div className="text-lg font-black text-[#191A23]">
                {formatTime(metrics.estimatedTimeRemaining)}
              </div>
              <div className="text-xs font-bold text-[#191A23]/70 uppercase">
                预计剩余
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#6B7280]">
            <CardContent className="p-3 text-center">
              <Database className="w-6 h-6 mx-auto mb-1 text-[#191A23]" />
              <div className="text-lg font-black text-[#191A23]">
                {metrics.processedRecords}
              </div>
              <div className="text-xs font-bold text-[#191A23]/70 uppercase">
                已处理
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#6B7280]">
            <CardContent className="p-3 text-center">
              <Gauge className="w-6 h-6 mx-auto mb-1 text-[#191A23]" />
              <div className="text-lg font-black text-[#191A23]">
                {metrics.errorRate}%
              </div>
              <div className="text-xs font-bold text-[#191A23]/70 uppercase">
                错误率
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主要内容区域 */}
      {step === "upload" && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-6 h-6" />
                <span>高性能文件上传</span>
              </div>
              <Badge variant="outline" className="border-[#B9FF66] text-[#191A23]">
                最大支持 {maxFileSize}MB
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 拖拽上传区域 */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-16 text-center hover:border-[#B9FF66] transition-colors cursor-pointer bg-gradient-to-br from-gray-50 to-white"
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
            >
              <div className="space-y-4">
                <div className="p-6 bg-[#191A23] rounded-full border-2 border-black mx-auto w-fit">
                  <HardDrive className="w-16 h-16 text-[#B9FF66]" />
                </div>
                <div>
                  <p className="text-2xl font-black text-[#191A23] mb-2">
                    拖拽超大文件到这里
                  </p>
                  <p className="text-[#191A23]/70 font-medium">
                    支持 Excel (.xlsx, .xls) 和 CSV 文件，最大 {maxFileSize}MB
                  </p>
                  <p className="text-sm text-[#B9FF66] font-bold mt-2">
                    🚀 大文件自动启用多线程处理 • 📊 实时性能监控 • ⏸️ 支持暂停恢复
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
                  className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23]"
                  size="lg"
                >
                  选择文件
                </Button>
              </div>
            </div>

            {/* 技术特性 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#B9FF66] p-4 rounded-lg border-2 border-black">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-5 h-5" />
                  <span className="font-bold text-[#191A23]">多线程处理</span>
                </div>
                <p className="text-sm text-[#191A23]/80">
                  Web Worker 并行处理，支持 {concurrentWorkers} 个并发线程
                </p>
              </div>
              <div className="bg-[#6B7280] p-4 rounded-lg border-2 border-black text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5" />
                  <span className="font-bold">实时监控</span>
                </div>
                <p className="text-sm opacity-80">
                  处理速度、内存使用、进度预测等实时指标
                </p>
              </div>
              <div className="bg-[#191A23] p-4 rounded-lg border-2 border-black text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5" />
                  <span className="font-bold">智能优化</span>
                </div>
                <p className="text-sm opacity-80">
                  自适应批次大小，内存优化，错误恢复
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 处理中界面 */}
      {(step === "processing" || step === "importing" || step === "paused") && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className={`w-6 h-6 ${step !== "paused" ? "animate-spin" : ""}`} />
                <span>
                  {step === "processing" && "高性能解析中"}
                  {step === "importing" && "数据导入中"}
                  {step === "paused" && "处理已暂停"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePauseResume}
                  variant="outline"
                  size="sm"
                  className="border-2 border-black font-bold"
                >
                  {isPaused ? (
                    <><Play className="w-4 h-4 mr-1" /> 继续</>
                  ) : (
                    <><Pause className="w-4 h-4 mr-1" /> 暂停</>
                  )}
                </Button>
                <Button
                  onClick={handleStop}
                  variant="outline"
                  size="sm"
                  className="border-2 border-black font-bold"
                >
                  <Square className="w-4 h-4 mr-1" /> 停止
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 文件信息 */}
            {fileInfo && (
              <div className="bg-[#B9FF66] p-4 rounded-lg border-2 border-black">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-[#191A23]" />
                    <div>
                      <p className="font-black text-[#191A23]">{fileInfo.name}</p>
                      <p className="text-sm text-[#191A23]/70">
                        {formatFileSize(fileInfo.size)} • 预计 {fileInfo.estimatedRecords.toLocaleString()} 条记录
                      </p>
                    </div>
                  </div>
                  {step === "paused" && (
                    <Badge variant="outline" className="border-red-500 text-red-700">
                      已暂停
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* 详细进度 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#191A23]">{detailedProgress.currentOperation}</span>
                <span className="text-[#191A23]/70">
                  {Math.round(detailedProgress.percentage)}% • {detailedProgress.eta}
                </span>
              </div>
              <Progress value={progress} className="h-4 border-2 border-black" />
              <div className="flex justify-between text-sm text-[#191A23]/70">
                <span>阶段: {detailedProgress.phase}</span>
                <span>速度: {detailedProgress.throughput}</span>
              </div>
            </div>

            {/* 实时指标 */}
            {enablePerformanceMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-xs text-gray-600 uppercase">处理速度</div>
                  <div className="font-bold">{metrics.recordsPerSecond} rec/s</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-xs text-gray-600 uppercase">已完成</div>
                  <div className="font-bold">
                    {metrics.processedRecords.toLocaleString()} / {metrics.totalRecords.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-xs text-gray-600 uppercase">内存使用</div>
                  <div className="font-bold">{metrics.memoryUsage}MB</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-xs text-gray-600 uppercase">错误率</div>
                  <div className="font-bold">{metrics.errorRate}%</div>
                </div>
              </div>
            )}

            {/* 考试信息设置 (在导入阶段显示) */}
            {step === "importing" && (
              <div className="bg-blue-50 p-4 rounded-lg border">
                <h3 className="font-bold mb-3">考试信息设置</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">考试标题</label>
                    <input
                      type="text"
                      value={examInfo.title}
                      onChange={(e) => setExamInfo(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">考试类型</label>
                    <select
                      value={examInfo.type}
                      onChange={(e) => setExamInfo(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
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
                    <label className="block text-sm font-medium mb-1">考试日期</label>
                    <input
                      type="date"
                      value={examInfo.date}
                      onChange={(e) => setExamInfo(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 完成界面 */}
      {step === "complete" && importResult && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-8 h-8" />
              <span className="text-2xl">高性能导入完成！</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 导入结果统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-6 rounded-lg text-center border-2 border-blue-200">
                <div className="text-3xl font-black text-blue-600 mb-2">
                  {importResult.totalRecords.toLocaleString()}
                </div>
                <div className="text-sm font-bold text-blue-800 uppercase">总记录数</div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg text-center border-2 border-green-200">
                <div className="text-3xl font-black text-green-600 mb-2">
                  {importResult.successRecords.toLocaleString()}
                </div>
                <div className="text-sm font-bold text-green-800 uppercase">成功导入</div>
              </div>
              <div className="bg-red-50 p-6 rounded-lg text-center border-2 border-red-200">
                <div className="text-3xl font-black text-red-600 mb-2">
                  {importResult.errorRecords.toLocaleString()}
                </div>
                <div className="text-sm font-bold text-red-800 uppercase">失败记录</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg text-center border-2 border-purple-200">
                <div className="text-3xl font-black text-purple-600 mb-2">
                  {formatTime(importResult.processingTime / 1000)}
                </div>
                <div className="text-sm font-bold text-purple-800 uppercase">处理时间</div>
              </div>
            </div>

            {/* 性能报告 */}
            <div className="bg-[#B9FF66] p-6 rounded-lg border-2 border-black">
              <h3 className="text-xl font-black text-[#191A23] mb-4 flex items-center">
                <Gauge className="w-6 h-6 mr-2" />
                性能报告
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-[#191A23]">
                    {Math.round(importResult.averageProcessingSpeed || 0)} rec/s
                  </div>
                  <div className="text-sm text-[#191A23]/70">平均处理速度</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#191A23]">
                    {importResult.peakMemoryUsage || 0}MB
                  </div>
                  <div className="text-sm text-[#191A23]/70">峰值内存</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#191A23]">
                    {((importResult.successRecords / importResult.totalRecords) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-[#191A23]/70">成功率</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#191A23]">
                    {concurrentWorkers}
                  </div>
                  <div className="text-sm text-[#191A23]/70">并发线程</div>
                </div>
              </div>
            </div>

            {/* 错误信息 */}
            {importResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">部分记录处理失败：</div>
                  <ul className="list-disc list-inside space-y-1">
                    {importResult.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-sm">{error}</li>
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

            {/* 操作按钮 */}
            <div className="flex justify-between pt-6 border-t-2 border-black">
              <Button
                onClick={handleRestart}
                variant="outline"
                className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]"
              >
                继续导入其他文件
              </Button>
              <div className="space-x-3">
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]"
                >
                  关闭
                </Button>
                <Button
                  onClick={() => (window.location.href = "/grade-analysis")}
                  className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#191A23]"
                >
                  <Layers className="w-4 h-4 mr-1" />
                  查看分析结果
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HighPerformanceImporter;