/**
 * DataFlowImporter使用示例
 *
 * 展示如何将useDataFlowImporter集成到导入组件中
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useDataFlowImporter } from "@/hooks/useDataFlowImporter";
import { TaskType, DataFlowState } from "@/types/dataFlow";

/**
 * 模拟导入处理器
 */
const SimulatedImporter: React.FC = () => {
  const {
    taskId,
    state,
    progress,
    isActive,
    canPause,
    canResume,
    canCancel,
    createImportTask,
    startImport,
    pauseImport,
    resumeImport,
    cancelImport,
    updateProgress,
    saveCheckpoint,
    addError,
  } = useDataFlowImporter();

  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 创建并启动模拟导入任务
   */
  const handleStartDemo = () => {
    // 模拟数据
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `学生${i + 1}`,
      score: Math.floor(Math.random() * 100),
    }));

    // 创建任务
    const taskId = createImportTask({
      type: TaskType.GRADE_IMPORT,
      data: mockData,
      options: {
        batchSize: 10,
        createMissingStudents: true,
        updateExisting: true,
        skipDuplicates: false,
        parallelImport: false,
        strictMode: false,
      },
      fileName: "demo_grades.xlsx",
      fileSize: 50 * 1024,
    });

    // 启动任务
    startImport();

    // 模拟处理过程
    simulateImport(mockData);
  };

  /**
   * 模拟导入处理
   */
  const simulateImport = async (data: any[]) => {
    setIsProcessing(true);
    const batchSize = 10;
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      // 检查是否暂停
      if (state === DataFlowState.PAUSED) {
        console.log("[Demo] 任务已暂停,等待恢复...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        i--; // 重试当前批次
        continue;
      }

      // 检查是否取消
      if (state === DataFlowState.CANCELLED) {
        console.log("[Demo] 任务已取消");
        break;
      }

      const batchStart = i * batchSize;
      const batchEnd = Math.min((i + 1) * batchSize, data.length);
      const batch = data.slice(batchStart, batchEnd);

      // 模拟处理延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟成功率 (90%)
      const successful = Math.floor(batch.length * 0.9);
      const failed = batch.length - successful;

      // 更新进度
      updateProgress({
        total: data.length,
        processed: batchEnd,
        successful: (progress?.successful || 0) + successful,
        failed: (progress?.failed || 0) + failed,
        skipped: 0,
      });

      // 每3个批次保存一次检查点
      if (i % 3 === 0) {
        saveCheckpoint(i, { lastProcessedIndex: batchEnd });
      }

      // 模拟10%概率的错误
      if (Math.random() < 0.1) {
        addError({
          message: `批次${i + 1}处理时发生错误`,
          code: "BATCH_ERROR",
          data: { batchIndex: i },
        });
      }
    }

    setIsProcessing(false);
    console.log("[Demo] 导入完成!");
  };

  /**
   * 获取状态颜色
   */
  const getStateColor = (state?: DataFlowState) => {
    switch (state) {
      case DataFlowState.PROCESSING:
        return "default";
      case DataFlowState.PAUSED:
        return "secondary";
      case DataFlowState.COMPLETED:
        return "default";
      case DataFlowState.FAILED:
        return "destructive";
      case DataFlowState.CANCELLED:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>DataFlow导入示例</span>
          {state && <Badge variant={getStateColor(state)}>{state}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 任务信息 */}
        {taskId && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">任务ID</p>
            <p className="text-sm font-mono">{taskId.substring(0, 24)}...</p>
          </div>
        )}

        {/* 进度信息 */}
        {progress && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <p className="font-bold text-blue-600">{progress.total}</p>
                <p className="text-xs text-gray-600">总数</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="font-bold text-green-600">
                  {progress.successful}
                </p>
                <p className="text-xs text-gray-600">成功</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <p className="font-bold text-red-600">{progress.failed}</p>
                <p className="text-xs text-gray-600">失败</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-bold text-gray-600">{progress.processed}</p>
                <p className="text-xs text-gray-600">已处理</p>
              </div>
            </div>

            {/* 进度条 */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>进度</span>
                <span>{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>

            {/* 处理速率 */}
            {progress.processingRate !== undefined && (
              <p className="text-xs text-gray-600">
                速率: {progress.processingRate.toFixed(2)} 条/秒
                {progress.estimatedTimeRemaining !== undefined &&
                  ` | 预计剩余: ${Math.ceil(progress.estimatedTimeRemaining / 60)}分钟`}
              </p>
            )}
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-2">
          {!taskId && (
            <Button onClick={handleStartDemo}>
              <PlayCircle className="w-4 h-4 mr-2" />
              开始模拟导入
            </Button>
          )}

          {canPause && (
            <Button onClick={pauseImport} variant="outline">
              <PauseCircle className="w-4 h-4 mr-2" />
              暂停
            </Button>
          )}

          {canResume && (
            <Button onClick={resumeImport}>
              <RefreshCw className="w-4 h-4 mr-2" />
              恢复
            </Button>
          )}

          {canCancel && (
            <Button onClick={cancelImport} variant="destructive">
              <StopCircle className="w-4 h-4 mr-2" />
              取消
            </Button>
          )}
        </div>

        {/* 状态指示 */}
        <div className="flex items-center gap-2 text-sm">
          {isActive && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span>正在处理...</span>
            </div>
          )}
          {state === DataFlowState.COMPLETED && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>导入完成</span>
            </div>
          )}
          {state === DataFlowState.FAILED && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>导入失败</span>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">集成步骤:</h4>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>
              调用 <code>createImportTask()</code> 创建任务
            </li>
            <li>
              调用 <code>startImport()</code> 启动任务
            </li>
            <li>
              在处理循环中调用 <code>updateProgress()</code> 更新进度
            </li>
            <li>
              定期调用 <code>saveCheckpoint()</code> 保存检查点
            </li>
            <li>
              使用 <code>pauseImport()</code> / <code>resumeImport()</code>{" "}
              控制暂停
            </li>
            <li>状态会自动持久化到IndexedDB</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulatedImporter;
