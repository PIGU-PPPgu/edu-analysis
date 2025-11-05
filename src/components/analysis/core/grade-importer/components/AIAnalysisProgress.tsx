/**
 *  AIAnalysisProgress - AI分析进度实时反馈组件
 *
 * 功能：
 * 1. 实时显示AI分析各个阶段的进度
 * 2. 展示置信度变化和分析质量
 * 3. 提供详细的分析步骤说明
 * 4. 支持进度中断和重试机制
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  Search,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  RotateCcw,
  TrendingUp,
  FileText,
  Database,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 分析阶段定义
export interface AnalysisStage {
  id: string;
  name: string;
  description: string;
  estimatedTime: number; // 预估时间（秒）
  icon: React.ComponentType<any>;
  status: "pending" | "running" | "completed" | "failed";
  confidence?: number; // 置信度 0-1
  details?: string;
  startTime?: number;
  endTime?: number;
}

// 组件属性
interface AIAnalysisProgressProps {
  isAnalyzing: boolean;
  currentStage: string;
  stages: AnalysisStage[];
  overallProgress: number;
  overallConfidence: number;
  onRetry?: () => void;
  onCancel?: () => void;
  estimatedRemainingTime?: number;
  showDetails?: boolean;
}

const AIAnalysisProgress: React.FC<AIAnalysisProgressProps> = ({
  isAnalyzing,
  currentStage,
  stages,
  overallProgress,
  overallConfidence,
  onRetry,
  onCancel,
  estimatedRemainingTime,
  showDetails = true,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // 计时器
  useEffect(() => {
    if (!isAnalyzing) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnalyzing]);

  // 进度条动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(overallProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [overallProgress]);

  // 获取当前运行阶段
  const currentStageInfo = stages.find((stage) => stage.id === currentStage);
  const completedStages = stages.filter(
    (stage) => stage.status === "completed"
  );
  const failedStages = stages.filter((stage) => stage.status === "failed");

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 bg-green-100";
    if (confidence >= 0.7) return "text-blue-600 bg-blue-100";
    if (confidence >= 0.5) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  // 获取进度条颜色
  const getProgressColor = () => {
    if (failedStages.length > 0) return "bg-red-500";
    if (overallConfidence >= 0.8) return "bg-green-500";
    if (overallConfidence >= 0.6) return "bg-blue-500";
    return "bg-yellow-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="w-6 h-6 text-purple-600" />
              {isAnalyzing && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">AI智能分析</CardTitle>
              <CardDescription>
                {isAnalyzing ? "正在分析您的数据..." : "分析已完成"}
              </CardDescription>
            </div>
          </div>

          {/* 整体置信度 */}
          <div className="text-right">
            <div
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                getConfidenceColor(overallConfidence)
              )}
            >
              置信度: {Math.round(overallConfidence * 100)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              已用时: {formatTime(elapsedTime)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 总体进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">整体进度</span>
            <span>{Math.round(animatedProgress)}%</span>
          </div>
          <Progress
            value={animatedProgress}
            className={cn(
              "h-2 transition-all duration-500",
              getProgressColor()
            )}
          />
          {estimatedRemainingTime && estimatedRemainingTime > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              预计还需 {formatTime(estimatedRemainingTime)}
            </div>
          )}
        </div>

        {/* 分析阶段详情 */}
        {showDetails && (
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const isActive = stage.id === currentStage;
              const isCompleted = stage.status === "completed";
              const isFailed = stage.status === "failed";

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isActive && "border-blue-200 bg-blue-50",
                    isCompleted && "border-green-200 bg-green-50",
                    isFailed && "border-red-200 bg-red-50",
                    !isActive && !isCompleted && !isFailed && "border-gray-200"
                  )}
                >
                  {/* 阶段图标 */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isCompleted && "bg-green-100",
                      isActive && "bg-blue-100",
                      isFailed && "bg-red-100",
                      !isActive && !isCompleted && !isFailed && "bg-gray-100"
                    )}
                  >
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {isFailed && (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    {isActive && (
                      <stage.icon className="w-4 h-4 text-blue-600 animate-pulse" />
                    )}
                    {!isActive && !isCompleted && !isFailed && (
                      <stage.icon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* 阶段信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          isActive && "text-blue-700",
                          isCompleted && "text-green-700",
                          isFailed && "text-red-700"
                        )}
                      >
                        {stage.name}
                      </span>

                      {stage.confidence !== undefined && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getConfidenceColor(stage.confidence)
                          )}
                        >
                          {Math.round(stage.confidence * 100)}%
                        </Badge>
                      )}

                      {isActive && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          进行中
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {stage.description}
                    </p>

                    {stage.details && (
                      <p className="text-xs text-gray-500 mt-1">
                        {stage.details}
                      </p>
                    )}
                  </div>

                  {/* 阶段时间 */}
                  <div className="text-xs text-gray-500 text-right">
                    {stage.endTime && stage.startTime && (
                      <div>
                        用时:{" "}
                        {formatTime(
                          Math.floor((stage.endTime - stage.startTime) / 1000)
                        )}
                      </div>
                    )}
                    {isActive && (
                      <div>预计: {formatTime(stage.estimatedTime)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 状态提醒 */}
        {failedStages.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              有 {failedStages.length}{" "}
              个分析步骤失败，但系统会使用备用算法确保分析完成。
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={onRetry}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  重新分析
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {overallConfidence < 0.7 && overallProgress > 50 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <TrendingUp className="w-4 h-4" />
            <AlertDescription>
              当前置信度较低，建议启用混合解析模式以提高准确性。
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        {isAnalyzing && onCancel && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onCancel}>
              取消分析
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysisProgress;
