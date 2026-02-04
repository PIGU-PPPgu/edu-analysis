/**
 * LowConfidenceWarningDialog - 低置信度警告对话框
 *
 * 当智能识别置信度较低时，提示用户可能存在识别错误
 * 给用户选择：
 * 1. 进入字段映射界面手动检查
 * 2. 信任AI继续导入（风险提示）
 * 3. 取消导入
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockReason {
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
}

interface LowConfidenceWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confidence: number; // 置信度 (0-1)
  mappingQuality: number; // 映射质量评分 (0-100)
  blockReasons: BlockReason[];
  onEnterMapping: () => void; // 进入字段映射界面
  onTrustAndContinue: () => void; // 信任AI继续
  onCancel: () => void; // 取消导入
}

export const LowConfidenceWarningDialog: React.FC<
  LowConfidenceWarningDialogProps
> = ({
  open,
  onOpenChange,
  confidence,
  mappingQuality,
  blockReasons,
  onEnterMapping,
  onTrustAndContinue,
  onCancel,
}) => {
  // 计算显示用的百分比
  const confidencePercent = Math.round(confidence * 100);
  const qualityPercent = mappingQuality;

  // 判断风险等级
  const riskLevel =
    confidence < 0.5 ? "high" : confidence < 0.7 ? "medium" : "low";

  const riskConfig = {
    high: {
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: <ShieldAlert className="h-6 w-6 text-red-600" />,
      title: "高风险警告",
      description: "识别准确性较低，强烈建议手动检查字段映射",
    },
    medium: {
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
      title: "中等风险提示",
      description: "识别结果可能存在错误，建议确认重要字段",
    },
    low: {
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: <AlertTriangle className="h-6 w-6 text-blue-600" />,
      title: "一般提示",
      description: "识别结果基本可靠，但建议快速检查",
    },
  };

  const config = riskConfig[riskLevel];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {config.icon}
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        {/* 识别质量概览 */}
        <div className="space-y-4">
          {/* 置信度 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                识别置信度
              </span>
              <Badge
                variant="outline"
                className={cn(
                  riskLevel === "high"
                    ? "border-red-500 text-red-600"
                    : riskLevel === "medium"
                      ? "border-amber-500 text-amber-600"
                      : "border-blue-500 text-blue-600"
                )}
              >
                {confidencePercent}%
              </Badge>
            </div>
            <Progress
              value={confidencePercent}
              className={cn(
                "h-2",
                riskLevel === "high"
                  ? "[&>div]:bg-red-500"
                  : riskLevel === "medium"
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-blue-500"
              )}
            />
          </div>

          {/* 映射质量 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                字段映射质量
              </span>
              <Badge variant="outline">{qualityPercent}分</Badge>
            </div>
            <Progress
              value={qualityPercent}
              className={cn(
                "h-2",
                qualityPercent >= 80
                  ? "[&>div]:bg-green-500"
                  : qualityPercent >= 60
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-red-500"
              )}
            />
          </div>
        </div>

        {/* 检测到的问题 */}
        {blockReasons.length > 0 && (
          <Alert className={cn(config.borderColor, config.bgColor)}>
            <AlertTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              检测到 {blockReasons.length} 个问题
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-2">
                {blockReasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn(
                        "inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                        reason.severity === "high"
                          ? "bg-red-500"
                          : reason.severity === "medium"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      )}
                    />
                    <span className={config.color}>{reason.message}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 操作说明 */}
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            推荐操作
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">手动检查（推荐）：</span>
                <span className="text-gray-600">
                  进入字段映射界面，确认每个字段的识别结果
                </span>
              </div>
            </div>
            {riskLevel !== "high" && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">信任并继续（有风险）：</span>
                  <span className="text-gray-600">
                    直接使用当前识别结果，可能导致数据导入错误
                  </span>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* 操作按钮 */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            取消导入
          </Button>

          <div className="flex items-center gap-2">
            {riskLevel !== "high" && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onTrustAndContinue();
                }}
                className="flex items-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4" />
                信任并继续
              </Button>
            )}

            <Button
              onClick={() => {
                onOpenChange(false);
                onEnterMapping();
              }}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              手动检查字段
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LowConfidenceWarningDialog;
