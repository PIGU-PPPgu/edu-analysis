import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

/**
 * 确认对话框组件
 * 提供统一的用户确认体验
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={getConfirmButtonVariant()}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * 删除确认对话框
 */
export const DeleteConfirmationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: () => void;
  loading?: boolean;
}> = ({ open, onOpenChange, itemName, onConfirm, loading }) => {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="确认删除"
      description={`您确定要删除"${itemName}"吗？此操作无法撤销。`}
      confirmText="删除"
      cancelText="取消"
      variant="destructive"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
};

/**
 * 保存确认对话框
 */
export const SaveConfirmationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: string[];
  onConfirm: () => void;
  loading?: boolean;
}> = ({ open, onOpenChange, changes, onConfirm, loading }) => {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="保存更改"
      description={
        changes.length > 0
          ? `以下内容将被保存：\n${changes.map(change => `• ${change}`).join('\n')}`
          : '确认保存当前更改？'
      }
      confirmText="保存"
      cancelText="取消"
      variant="default"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
};

/**
 * 离开页面确认对话框
 */
export const LeaveConfirmationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({ open, onOpenChange, onConfirm }) => {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="离开页面"
      description="您有未保存的更改，确定要离开此页面吗？"
      confirmText="离开"
      cancelText="留在此页"
      variant="warning"
      onConfirm={onConfirm}
    />
  );
};

/**
 * 批量操作确认对话框
 */
export const BatchOperationDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: string;
  itemCount: number;
  onConfirm: () => void;
  loading?: boolean;
}> = ({ open, onOpenChange, operation, itemCount, onConfirm, loading }) => {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`批量${operation}`}
      description={`您确定要对选中的 ${itemCount} 个项目执行${operation}操作吗？`}
      confirmText={operation}
      cancelText="取消"
      variant="warning"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
};

export default ConfirmationDialog; 