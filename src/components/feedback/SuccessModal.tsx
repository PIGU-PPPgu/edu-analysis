/**
 * 统一成功反馈模态框
 *
 * 功能:
 * - 显示操作成功的详细信息
 * - 支持统计数据展示
 * - 提供后续操作建议
 * - 支持自定义内容和操作按钮
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
import { CheckCircle2, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuccessAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  icon?: React.ReactNode;
}

export interface SuccessStatistic {
  label: string;
  value: string | number;
  description?: string;
  highlight?: boolean;
}

export interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  statistics?: SuccessStatistic[];
  details?: React.ReactNode;
  actions?: SuccessAction[];
  showCloseButton?: boolean;
  autoCloseDelay?: number; // 自动关闭延迟(毫秒)
  size?: "sm" | "md" | "lg";
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onClose,
  title,
  description,
  icon,
  statistics = [],
  details,
  actions = [],
  showCloseButton = true,
  autoCloseDelay,
  size = "md",
}) => {
  // 自动关闭逻辑
  React.useEffect(() => {
    if (open && autoCloseDelay && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [open, autoCloseDelay, onClose]);

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn("sm:max-w-[425px]", sizeClasses[size])}>
        {/* 标题区域 */}
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {icon || (
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* 统计数据展示 */}
        {statistics.length > 0 && (
          <div className="grid grid-cols-2 gap-4 py-4">
            {statistics.map((stat, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-lg border p-4 space-y-1",
                  stat.highlight && "border-green-200 bg-green-50"
                )}
              >
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </div>
                {stat.description && (
                  <div className="text-xs text-muted-foreground">
                    {stat.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 详细信息 */}
        {details && <div className="border-t pt-4">{details}</div>}

        {/* 操作按钮 */}
        <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {actions.length > 0 ? (
            <>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  variant={action.variant || "default"}
                  className="w-full sm:w-auto"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
              {showCloseButton && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  关闭
                </Button>
              )}
            </>
          ) : (
            <Button onClick={onClose} className="w-full sm:w-auto">
              知道了
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 预设: 数据导入成功
 */
export interface ImportSuccessOptions {
  totalCount: number;
  successCount: number;
  errorCount?: number;
  warningCount?: number;
  itemName?: string; // "学生"、"成绩" 等
  onViewDetails?: () => void;
  onContinueImport?: () => void;
}

export const ImportSuccessModal: React.FC<
  Omit<SuccessModalProps, "title" | "statistics" | "actions"> &
    ImportSuccessOptions
> = ({
  totalCount,
  successCount,
  errorCount = 0,
  warningCount = 0,
  itemName = "项",
  onViewDetails,
  onContinueImport,
  ...props
}) => {
  const statistics: SuccessStatistic[] = [
    {
      label: `成功导入`,
      value: successCount,
      description: `共处理 ${totalCount} ${itemName}`,
      highlight: true,
    },
  ];

  if (errorCount > 0) {
    statistics.push({
      label: "导入失败",
      value: errorCount,
      description: "需要人工处理",
    });
  }

  if (warningCount > 0) {
    statistics.push({
      label: "警告",
      value: warningCount,
      description: "数据可能不完整",
    });
  }

  const actions: SuccessAction[] = [];

  if (onViewDetails) {
    actions.push({
      label: "查看详情",
      onClick: onViewDetails,
      variant: "outline",
      icon: <ArrowRight className="w-4 h-4" />,
    });
  }

  if (onContinueImport) {
    actions.push({
      label: "继续导入",
      onClick: onContinueImport,
      variant: "default",
    });
  }

  return (
    <SuccessModal
      {...props}
      title="导入成功"
      description={`已成功导入 ${successCount} ${itemName}数据`}
      statistics={statistics}
      actions={actions}
    />
  );
};

/**
 * 预设: 批量操作成功
 */
export interface BatchOperationSuccessOptions {
  operationName: string; // "删除"、"更新"、"分配" 等
  successCount: number;
  failedCount?: number;
  affectedItems?: string; // "学生"、"成绩记录" 等
  onUndo?: () => void;
  onViewResult?: () => void;
}

export const BatchOperationSuccessModal: React.FC<
  Omit<SuccessModalProps, "title" | "description" | "statistics" | "actions"> &
    BatchOperationSuccessOptions
> = ({
  operationName,
  successCount,
  failedCount = 0,
  affectedItems = "项",
  onUndo,
  onViewResult,
  ...props
}) => {
  const statistics: SuccessStatistic[] = [
    {
      label: "成功处理",
      value: successCount,
      highlight: true,
    },
  ];

  if (failedCount > 0) {
    statistics.push({
      label: "失败",
      value: failedCount,
    });
  }

  const actions: SuccessAction[] = [];

  if (onViewResult) {
    actions.push({
      label: "查看结果",
      onClick: onViewResult,
      variant: "default",
    });
  }

  if (onUndo) {
    actions.push({
      label: "撤销操作",
      onClick: onUndo,
      variant: "outline",
    });
  }

  return (
    <SuccessModal
      {...props}
      title={`${operationName}成功`}
      description={`已${operationName} ${successCount} ${affectedItems}`}
      statistics={statistics}
      actions={actions}
    />
  );
};

/**
 * 预设: 保存成功
 */
export interface SaveSuccessOptions {
  itemName: string; // "学生信息"、"考试设置" 等
  onContinueEdit?: () => void;
  onViewItem?: () => void;
  savedAt?: Date;
}

export const SaveSuccessModal: React.FC<
  Omit<SuccessModalProps, "title" | "description" | "actions" | "details"> &
    SaveSuccessOptions
> = ({
  itemName,
  onContinueEdit,
  onViewItem,
  savedAt = new Date(),
  ...props
}) => {
  const actions: SuccessAction[] = [];

  if (onViewItem) {
    actions.push({
      label: "查看",
      onClick: onViewItem,
      variant: "default",
    });
  }

  if (onContinueEdit) {
    actions.push({
      label: "继续编辑",
      onClick: onContinueEdit,
      variant: "outline",
    });
  }

  return (
    <SuccessModal
      {...props}
      title="保存成功"
      description={`${itemName}已成功保存`}
      details={
        <div className="text-sm text-muted-foreground">
          保存时间: {savedAt.toLocaleString("zh-CN")}
        </div>
      }
      actions={actions}
      autoCloseDelay={3000}
    />
  );
};

/**
 * 便捷Hook - 管理成功模态框状态
 */
export const useSuccessModal = () => {
  const [open, setOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Partial<SuccessModalProps>>({});

  const show = React.useCallback((newConfig: Partial<SuccessModalProps>) => {
    setConfig(newConfig);
    setOpen(true);
  }, []);

  const hide = React.useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    config,
    show,
    hide,
  };
};
