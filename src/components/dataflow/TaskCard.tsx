/**
 * TaskCard - 任务卡片组件
 *
 * 展示单个DataFlow任务的状态和进度
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
} from "lucide-react";
import { DataFlowTask, DataFlowState, TaskType } from "@/types/dataFlow";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TaskCardProps {
  task: DataFlowTask;
  onStart?: (taskId: string) => void;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

/**
 * 获取任务类型显示名称
 */
const getTaskTypeLabel = (type: TaskType): string => {
  const labels: Record<TaskType, string> = {
    [TaskType.STUDENT_IMPORT]: "学生导入",
    [TaskType.GRADE_IMPORT]: "成绩导入",
    [TaskType.BATCH_UPDATE]: "批量更新",
    [TaskType.DATA_MIGRATION]: "数据迁移",
    [TaskType.ANALYSIS]: "数据分析",
  };
  return labels[type] || type;
};

/**
 * 获取状态徽章样式
 */
const getStateBadgeVariant = (
  state: DataFlowState
): "default" | "secondary" | "destructive" | "outline" => {
  switch (state) {
    case DataFlowState.PROCESSING:
    case DataFlowState.RESUMING:
      return "default";
    case DataFlowState.PAUSED:
    case DataFlowState.QUEUED:
      return "secondary";
    case DataFlowState.FAILED:
    case DataFlowState.CANCELLED:
      return "destructive";
    case DataFlowState.COMPLETED:
      return "outline";
    default:
      return "outline";
  }
};

/**
 * 获取状态图标
 */
const getStateIcon = (state: DataFlowState) => {
  switch (state) {
    case DataFlowState.PROCESSING:
      return <PlayCircle className="w-4 h-4" />;
    case DataFlowState.PAUSED:
      return <PauseCircle className="w-4 h-4" />;
    case DataFlowState.COMPLETED:
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case DataFlowState.FAILED:
      return <XCircle className="w-4 h-4 text-red-600" />;
    case DataFlowState.CANCELLED:
      return <StopCircle className="w-4 h-4 text-gray-600" />;
    case DataFlowState.QUEUED:
      return <Clock className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
};

/**
 * 状态中文映射
 */
const stateLabels: Record<DataFlowState, string> = {
  [DataFlowState.IDLE]: "待开始",
  [DataFlowState.QUEUED]: "队列中",
  [DataFlowState.VALIDATING]: "验证中",
  [DataFlowState.PREPARING]: "准备中",
  [DataFlowState.PROCESSING]: "处理中",
  [DataFlowState.PAUSED]: "已暂停",
  [DataFlowState.RESUMING]: "恢复中",
  [DataFlowState.COMPLETED]: "已完成",
  [DataFlowState.FAILED]: "失败",
  [DataFlowState.CANCELLED]: "已取消",
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDelete,
}) => {
  const isActive =
    task.state === DataFlowState.PROCESSING ||
    task.state === DataFlowState.VALIDATING ||
    task.state === DataFlowState.PREPARING ||
    task.state === DataFlowState.RESUMING;

  const canPause = task.state === DataFlowState.PROCESSING && task.resumable;
  const canResume = task.state === DataFlowState.PAUSED;
  const canStart =
    task.state === DataFlowState.IDLE || task.state === DataFlowState.QUEUED;
  const canCancel =
    task.state !== DataFlowState.COMPLETED &&
    task.state !== DataFlowState.FAILED &&
    task.state !== DataFlowState.CANCELLED;
  const canDelete =
    task.state === DataFlowState.COMPLETED ||
    task.state === DataFlowState.FAILED ||
    task.state === DataFlowState.CANCELLED;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isActive && "border-blue-500"
      )}
    >
      <CardContent className="pt-6">
        {/* 头部：类型和状态 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {getStateIcon(task.state)}
            <div>
              <h3 className="font-semibold text-sm">
                {getTaskTypeLabel(task.type)}
              </h3>
              <p className="text-xs text-gray-500">
                {task.context.fileName || "未知文件"}
              </p>
            </div>
          </div>
          <Badge variant={getStateBadgeVariant(task.state)}>
            {stateLabels[task.state]}
          </Badge>
        </div>

        {/* 进度条 */}
        {task.progress.total > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">进度</span>
              <span className="font-medium">{task.progress.percentage}%</span>
            </div>
            <Progress value={task.progress.percentage} className="h-1.5" />

            {/* 详细统计 */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="text-center">
                <p className="text-xs font-semibold text-blue-600">
                  {task.progress.total}
                </p>
                <p className="text-[10px] text-gray-500">总数</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-green-600">
                  {task.progress.successful}
                </p>
                <p className="text-[10px] text-gray-500">成功</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-red-600">
                  {task.progress.failed}
                </p>
                <p className="text-[10px] text-gray-500">失败</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-600">
                  {task.progress.processed}
                </p>
                <p className="text-[10px] text-gray-500">已处理</p>
              </div>
            </div>
          </div>
        )}

        {/* 时间信息 */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(task.createdAt, {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
          {task.progress.processingRate !== undefined && isActive && (
            <div>速率: {task.progress.processingRate.toFixed(1)} 条/秒</div>
          )}
          {task.progress.estimatedTimeRemaining !== undefined && isActive && (
            <div>
              预计剩余: {Math.ceil(task.progress.estimatedTimeRemaining / 60)}{" "}
              分钟
            </div>
          )}
        </div>

        {/* 错误和警告 */}
        {task.errors.length > 0 && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="flex items-center gap-1 text-red-700 font-medium mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{task.errors.length} 个错误</span>
            </div>
            <p className="text-red-600 truncate">{task.errors[0].message}</p>
          </div>
        )}

        {task.warnings.length > 0 && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="flex items-center gap-1 text-yellow-700 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>{task.warnings.length} 个警告</span>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {canStart && onStart && (
            <Button
              onClick={() => onStart(task.id)}
              size="sm"
              variant="default"
              className="flex-1"
            >
              <PlayCircle className="w-3 h-3 mr-1" />
              开始
            </Button>
          )}

          {canPause && onPause && (
            <Button
              onClick={() => onPause(task.id)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <PauseCircle className="w-3 h-3 mr-1" />
              暂停
            </Button>
          )}

          {canResume && onResume && (
            <Button
              onClick={() => onResume(task.id)}
              size="sm"
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              恢复
            </Button>
          )}

          {canCancel && onCancel && (
            <Button
              onClick={() => onCancel(task.id)}
              size="sm"
              variant="destructive"
              className="flex-1"
            >
              <StopCircle className="w-3 h-3 mr-1" />
              取消
            </Button>
          )}

          {canDelete && onDelete && (
            <Button
              onClick={() => onDelete(task.id)}
              size="sm"
              variant="ghost"
              className="flex-1"
            >
              删除
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
