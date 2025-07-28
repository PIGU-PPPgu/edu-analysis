import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Upload,
  Download,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationFeedbackProps {
  type: "loading" | "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  progress?: number;
  showProgress?: boolean;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary";
    icon?: "upload" | "download" | "save" | "delete" | "refresh";
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const iconMap = {
  upload: Upload,
  download: Download,
  save: Save,
  delete: Trash2,
  refresh: RefreshCw,
};

const OperationFeedback: React.FC<OperationFeedbackProps> = ({
  type,
  title,
  description,
  progress = 0,
  showProgress = false,
  action,
  className,
  size = "md",
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case "loading":
        return {
          icon: Loader2,
          iconClassName: "h-8 w-8 text-blue-600 animate-spin",
          cardClassName:
            "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
          titleClassName: "text-blue-700",
          descriptionClassName: "text-blue-500",
          progressClassName: "bg-blue-500",
        };
      case "success":
        return {
          icon: CheckCircle,
          iconClassName: "h-8 w-8 text-green-600",
          cardClassName:
            "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
          titleClassName: "text-green-700",
          descriptionClassName: "text-green-500",
          progressClassName: "bg-green-500",
        };
      case "error":
        return {
          icon: XCircle,
          iconClassName: "h-8 w-8 text-red-600",
          cardClassName:
            "bg-gradient-to-r from-red-50 to-pink-50 border-red-200",
          titleClassName: "text-red-700",
          descriptionClassName: "text-red-500",
          progressClassName: "bg-red-500",
        };
      case "warning":
        return {
          icon: AlertCircle,
          iconClassName: "h-8 w-8 text-amber-600",
          cardClassName:
            "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200",
          titleClassName: "text-amber-700",
          descriptionClassName: "text-amber-600",
          progressClassName: "bg-amber-500",
        };
      case "info":
        return {
          icon: AlertCircle,
          iconClassName: "h-8 w-8 text-blue-600",
          cardClassName:
            "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200",
          titleClassName: "text-blue-700",
          descriptionClassName: "text-blue-600",
          progressClassName: "bg-blue-500",
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case "sm":
        return {
          containerPadding: "py-4",
          spacing: "space-y-2",
          iconSize: "h-6 w-6",
          titleSize: "text-base font-medium",
          descriptionSize: "text-sm",
        };
      case "lg":
        return {
          containerPadding: "py-10",
          spacing: "space-y-6",
          iconSize: "h-12 w-12",
          titleSize: "text-xl font-semibold",
          descriptionSize: "text-base",
        };
      default: // md
        return {
          containerPadding: "py-6",
          spacing: "space-y-4",
          iconSize: "h-8 w-8",
          titleSize: "text-lg font-medium",
          descriptionSize: "text-sm",
        };
    }
  };

  const typeConfig = getTypeConfig();
  const sizeConfig = getSizeConfig();
  const Icon = typeConfig.icon;
  const ActionIcon = action?.icon ? iconMap[action.icon] : null;

  return (
    <Card className={cn(typeConfig.cardClassName, "shadow-md", className)}>
      <CardContent className={cn("pt-6", sizeConfig.containerPadding)}>
        <div className="text-center">
          <div className={cn("flex flex-col items-center", sizeConfig.spacing)}>
            {/* 图标 */}
            <div className="relative">
              <Icon
                className={cn(typeConfig.iconClassName, sizeConfig.iconSize)}
              />
              {type === "loading" && (
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse opacity-30"></div>
              )}
            </div>

            {/* 标题和描述 */}
            <div className="space-y-2">
              <p
                className={cn(sizeConfig.titleSize, typeConfig.titleClassName)}
              >
                {title}
              </p>
              {description && (
                <p
                  className={cn(
                    sizeConfig.descriptionSize,
                    typeConfig.descriptionClassName,
                    "max-w-md"
                  )}
                >
                  {description}
                </p>
              )}
            </div>

            {/* 进度条 */}
            {showProgress && (
              <div className="w-64 space-y-1">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      typeConfig.progressClassName,
                      "h-2 rounded-full transition-all duration-300 ease-out"
                    )}
                    style={{
                      width: `${Math.min(Math.max(progress, 0), 100)}%`,
                    }}
                  ></div>
                </div>
                <p className={cn("text-xs", typeConfig.descriptionClassName)}>
                  {progress}% 完成
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || "default"}
                className={cn(
                  "inline-flex items-center",
                  size === "sm" && "h-8 px-3 text-sm",
                  size === "lg" && "h-12 px-6 text-base"
                )}
              >
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {action.label}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationFeedback;
