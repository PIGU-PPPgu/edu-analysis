/**
 * UploadProgressIndicator - 文件上传进度指示器
 *
 * 统一的文件上传和处理进度展示组件
 * 标准化5阶段流程：上传 → 解析 → 验证 → 保存 → 分析
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle2,
  Database,
  BarChart3,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 标准化的处理阶段
export type ProcessingStage =
  | "uploading" // 上传文件
  | "parsing" // 解析文件
  | "validating" // 验证数据
  | "saving" // 保存到数据库
  | "analyzing" // 数据分析
  | "completed" // 完成
  | "error"; // 错误

// 阶段配置
interface StageConfig {
  id: ProcessingStage;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  estimatedTime: number; // 预估时间（秒）
  weight: number; // 阶段权重（用于计算总进度）
}

// 组件属性
export interface UploadProgressIndicatorProps {
  currentStage: ProcessingStage;
  progress?: number; // 当前阶段的进度 0-100
  fileName?: string;
  fileSize?: string;
  error?: string;
  onCancel?: () => void;
  compact?: boolean; // 紧凑模式
}

// 标准化阶段定义
const STAGE_CONFIGS: StageConfig[] = [
  {
    id: "uploading",
    name: "上传文件",
    description: "正在上传文件到服务器",
    icon: Upload,
    estimatedTime: 2,
    weight: 10,
  },
  {
    id: "parsing",
    name: "解析文件",
    description: "正在读取和解析文件内容",
    icon: FileText,
    estimatedTime: 3,
    weight: 30,
  },
  {
    id: "validating",
    name: "验证数据",
    description: "正在验证数据格式和完整性",
    icon: CheckCircle2,
    estimatedTime: 2,
    weight: 20,
  },
  {
    id: "saving",
    name: "保存数据",
    description: "正在保存到数据库",
    icon: Database,
    estimatedTime: 3,
    weight: 25,
  },
  {
    id: "analyzing",
    name: "数据分析",
    description: "正在进行智能分析",
    icon: BarChart3,
    estimatedTime: 5,
    weight: 15,
  },
];

const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  currentStage,
  progress = 0,
  fileName,
  fileSize,
  error,
  onCancel,
  compact = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState(0);

  // 计算整体进度
  const calculateOverallProgress = () => {
    if (currentStage === "completed") return 100;
    if (currentStage === "error") return 0;

    const currentStageIndex = STAGE_CONFIGS.findIndex(
      (s) => s.id === currentStage
    );
    if (currentStageIndex === -1) return 0;

    // 已完成阶段的权重
    const completedWeight = STAGE_CONFIGS.slice(0, currentStageIndex).reduce(
      (sum, stage) => sum + stage.weight,
      0
    );

    // 当前阶段的权重贡献
    const currentStageConfig = STAGE_CONFIGS[currentStageIndex];
    const currentStageProgress = (progress / 100) * currentStageConfig.weight;

    return Math.round(completedWeight + currentStageProgress);
  };

  // 计算预计剩余时间
  useEffect(() => {
    const currentStageIndex = STAGE_CONFIGS.findIndex(
      (s) => s.id === currentStage
    );
    if (currentStageIndex === -1) {
      setEstimatedRemaining(0);
      return;
    }

    const currentStageConfig = STAGE_CONFIGS[currentStageIndex];
    const currentStageRemaining =
      ((100 - progress) / 100) * currentStageConfig.estimatedTime;

    const futureStagesTime = STAGE_CONFIGS.slice(currentStageIndex + 1).reduce(
      (sum, stage) => sum + stage.estimatedTime,
      0
    );

    setEstimatedRemaining(Math.ceil(currentStageRemaining + futureStagesTime));
  }, [currentStage, progress]);

  // 计时器
  useEffect(() => {
    if (currentStage === "completed" || currentStage === "error") return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStage]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const overallProgress = calculateOverallProgress();
  const currentStageConfig = STAGE_CONFIGS.find((s) => s.id === currentStage);

  // 紧凑模式
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        {error ? (
          <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />
        ) : currentStage === "completed" ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          currentStageConfig && (
            <currentStageConfig.icon className="w-5 h-5 text-blue-600 animate-pulse" />
          )
        )}

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {error ? "处理失败" : currentStageConfig?.name || "处理中"}
            </span>
            <span className="text-xs text-gray-600">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-1" />
        </div>

        {estimatedRemaining > 0 && (
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(estimatedRemaining)}
          </div>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <Card className={cn("w-full", error && "border-red-200 bg-red-50")}>
      <CardContent className="pt-6">
        {/* 文件信息 */}
        {fileName && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">{fileName}</div>
                {fileSize && (
                  <div className="text-xs text-gray-500">{fileSize}</div>
                )}
              </div>
            </div>
            {currentStage === "completed" && (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                完成
              </Badge>
            )}
            {error && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                失败
              </Badge>
            )}
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">处理失败</div>
                <div className="text-sm text-red-700 mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* 整体进度 */}
        {!error && (
          <>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">整体进度</span>
                <span className="text-gray-600">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  已用时: {formatTime(elapsedTime)}
                </div>
                {estimatedRemaining > 0 && (
                  <div>预计还需: {formatTime(estimatedRemaining)}</div>
                )}
              </div>
            </div>

            {/* 阶段列表 */}
            <div className="space-y-2">
              {STAGE_CONFIGS.map((stage, index) => {
                const isActive = stage.id === currentStage;
                const isCompleted =
                  STAGE_CONFIGS.findIndex((s) => s.id === currentStage) > index;
                const Icon = stage.icon;

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-all",
                      isActive && "bg-blue-50 border border-blue-200",
                      isCompleted && "opacity-50"
                    )}
                  >
                    {/* 图标 */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        isCompleted && "bg-green-100",
                        isActive && "bg-blue-100",
                        !isActive && !isCompleted && "bg-gray-100"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive && "text-blue-600 animate-pulse",
                            !isActive && "text-gray-400"
                          )}
                        />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{stage.name}</div>
                      {isActive && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {stage.description}
                        </div>
                      )}
                    </div>

                    {/* 状态 */}
                    {isActive && (
                      <div className="text-xs text-blue-600 flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        {progress}%
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-xs text-green-600">✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 操作按钮 */}
        {onCancel && !error && currentStage !== "completed" && (
          <div className="mt-4 pt-4 border-t flex justify-center">
            <button
              onClick={onCancel}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              取消导入
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadProgressIndicator;
