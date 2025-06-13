import { toast } from "sonner";

/**
 * Toast辅助函数
 * 提供统一的用户反馈体验
 */
export const toastHelpers = {
  /**
   * 成功提示
   */
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * 错误提示
   */
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * 警告提示
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * 信息提示
   */
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * 加载提示
   */
  loading: (message: string, description?: string) => {
    return toast.loading(message, {
      description,
    });
  },

  /**
   * 功能开发中提示
   */
  developing: (featureName: string) => {
    toast.info(`${featureName}功能正在开发中`, {
      description: '我们正在努力完善这个功能，敬请期待！',
      duration: 3000,
    });
  },

  /**
   * 数据加载失败提示
   */
  loadError: (dataType: string, retry?: () => void) => {
    toast.error(`${dataType}加载失败`, {
      description: '请检查网络连接或稍后重试',
      duration: 5000,
      action: retry ? {
        label: '重试',
        onClick: retry,
      } : undefined,
    });
  },

  /**
   * 操作成功提示
   */
  actionSuccess: (action: string, target?: string) => {
    toast.success(`${action}成功`, {
      description: target ? `${target}已${action}` : undefined,
      duration: 3000,
    });
  },

  /**
   * 操作失败提示
   */
  actionError: (action: string, error?: string) => {
    toast.error(`${action}失败`, {
      description: error || '请稍后重试或联系管理员',
      duration: 5000,
    });
  },

  /**
   * 权限不足提示
   */
  noPermission: (action: string) => {
    toast.error('权限不足', {
      description: `您没有权限执行${action}操作`,
      duration: 4000,
    });
  },

  /**
   * 网络错误提示
   */
  networkError: () => {
    toast.error('网络连接异常', {
      description: '请检查您的网络连接后重试',
      duration: 5000,
    });
  },

  /**
   * 表单验证错误提示
   */
  validationError: (field: string, message: string) => {
    toast.error('表单验证失败', {
      description: `${field}: ${message}`,
      duration: 4000,
    });
  },
};

export default toastHelpers; 