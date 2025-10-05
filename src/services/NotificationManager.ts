/**
 * NotificationManager - 统一通知管理器
 *
 * 解决 Week 3 问题:
 * - 问题 1.4: 错误处理不统一
 * - 问题 1.5: Toast 通知过多干扰
 *
 * 核心功能:
 * 1. Toast 去重 - 相同内容3秒内只显示一次
 * 2. 优先级管理 - 高优先级可覆盖低优先级
 * 3. 批量归纳 - 多个通知归纳为一个
 * 4. 静默模式 - 只显示关键通知
 */

import { toast } from "sonner";

// 通知优先级
export enum NotificationPriority {
  INFO = 1,      // 信息提示 - 可被任意覆盖
  SUCCESS = 2,   // 成功提示 - 正常优先级
  WARNING = 3,   // 警告提示 - 较高优先级
  ERROR = 4,     // 错误提示 - 最高优先级
  CRITICAL = 5   // 严重错误 - 不可被覆盖
}

// 通知类型
export type NotificationType = "info" | "success" | "warning" | "error";

// 通知选项
export interface NotificationOptions {
  priority?: NotificationPriority;
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  silent?: boolean; // 静默模式 - 不显示Toast
  deduplicate?: boolean; // 是否去重
  category?: string; // 通知分类，用于批量管理
}

// 通知记录
interface NotificationRecord {
  id: string;
  type: NotificationType;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  category?: string;
}

class NotificationManagerClass {
  // 通知历史记录 (用于去重)
  private recentNotifications: NotificationRecord[] = [];

  // 去重时间窗口 (毫秒)
  private readonly DEDUP_WINDOW = 3000;

  // 静默模式
  private silentMode = false;

  // 最小优先级 (低于此优先级的通知不显示)
  private minPriority: NotificationPriority = NotificationPriority.INFO;

  // 批量通知缓存
  private batchedNotifications: Map<string, NotificationRecord[]> = new Map();

  // 批量延迟时间 (毫秒)
  private readonly BATCH_DELAY = 2000;

  // 批量定时器
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 显示通知
   */
  notify(
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): void {
    const {
      priority = this.getDefaultPriority(type),
      duration = this.getDefaultDuration(type),
      description,
      action,
      silent = false,
      deduplicate = true,
      category,
    } = options;

    // 静默模式或低优先级通知不显示
    if (this.silentMode || silent || priority < this.minPriority) {
      this.logToConsole(type, message, priority);
      return;
    }

    // 去重检查
    if (deduplicate && this.isDuplicate(message, priority)) {
      console.log(`[NotificationManager] 去重: ${message}`);
      return;
    }

    // 记录通知
    const record: NotificationRecord = {
      id: this.generateId(),
      type,
      message,
      priority,
      timestamp: Date.now(),
      category,
    };
    this.addToHistory(record);

    // 显示 Toast
    this.showToast(type, message, { duration, description, action });
  }

  /**
   * 批量通知 - 多个通知归纳为一个
   */
  batchNotify(
    category: string,
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): void {
    const {
      priority = this.getDefaultPriority(type),
    } = options;

    const record: NotificationRecord = {
      id: this.generateId(),
      type,
      message,
      priority,
      timestamp: Date.now(),
      category,
    };

    // 添加到批量缓存
    if (!this.batchedNotifications.has(category)) {
      this.batchedNotifications.set(category, []);
    }
    this.batchedNotifications.get(category)!.push(record);

    // 清除旧定时器
    if (this.batchTimers.has(category)) {
      clearTimeout(this.batchTimers.get(category)!);
    }

    // 设置新定时器
    const timer = setTimeout(() => {
      this.flushBatch(category);
    }, this.BATCH_DELAY);
    this.batchTimers.set(category, timer);
  }

  /**
   * 立即刷新批量通知
   */
  private flushBatch(category: string): void {
    const notifications = this.batchedNotifications.get(category);
    if (!notifications || notifications.length === 0) {
      return;
    }

    // 清理
    this.batchedNotifications.delete(category);
    if (this.batchTimers.has(category)) {
      clearTimeout(this.batchTimers.get(category)!);
      this.batchTimers.delete(category);
    }

    // 按类型分组
    const groups = this.groupNotifications(notifications);

    // 显示归纳通知
    if (groups.error.length > 0) {
      this.notify("error", `${groups.error.length} 个操作失败`, {
        description: groups.error.slice(0, 3).map(n => n.message).join("; "),
        priority: NotificationPriority.ERROR,
        deduplicate: false,
      });
    }

    if (groups.warning.length > 0) {
      this.notify("warning", `${groups.warning.length} 个警告`, {
        description: groups.warning.slice(0, 3).map(n => n.message).join("; "),
        priority: NotificationPriority.WARNING,
        deduplicate: false,
      });
    }

    if (groups.success.length > 0 && groups.error.length === 0) {
      this.notify("success", `${groups.success.length} 个操作成功`, {
        priority: NotificationPriority.SUCCESS,
        deduplicate: false,
      });
    }
  }

  /**
   * 便捷方法: 信息通知
   */
  info(message: string, options?: NotificationOptions): void {
    this.notify("info", message, { ...options, priority: NotificationPriority.INFO });
  }

  /**
   * 便捷方法: 成功通知
   */
  success(message: string, options?: NotificationOptions): void {
    this.notify("success", message, { ...options, priority: NotificationPriority.SUCCESS });
  }

  /**
   * 便捷方法: 警告通知
   */
  warning(message: string, options?: NotificationOptions): void {
    this.notify("warning", message, { ...options, priority: NotificationPriority.WARNING });
  }

  /**
   * 便捷方法: 错误通知
   */
  error(message: string, options?: NotificationOptions): void {
    this.notify("error", message, { ...options, priority: NotificationPriority.ERROR });
  }

  /**
   * 便捷方法: 严重错误通知
   */
  critical(message: string, options?: NotificationOptions): void {
    this.notify("error", message, { ...options, priority: NotificationPriority.CRITICAL });
  }

  /**
   * 启用静默模式
   */
  setSilentMode(enabled: boolean): void {
    this.silentMode = enabled;
    console.log(`[NotificationManager] 静默模式: ${enabled ? "开启" : "关闭"}`);
  }

  /**
   * 设置最小优先级
   */
  setMinPriority(priority: NotificationPriority): void {
    this.minPriority = priority;
    console.log(`[NotificationManager] 最小优先级: ${priority}`);
  }

  /**
   * 清除通知历史
   */
  clearHistory(): void {
    this.recentNotifications = [];
  }

  /**
   * 刷新所有批量通知
   */
  flushAllBatches(): void {
    const categories = Array.from(this.batchedNotifications.keys());
    categories.forEach(category => this.flushBatch(category));
  }

  // ==================== 私有方法 ====================

  /**
   * 检查是否重复
   */
  private isDuplicate(message: string, priority: NotificationPriority): boolean {
    const now = Date.now();

    // 清理过期记录
    this.recentNotifications = this.recentNotifications.filter(
      record => now - record.timestamp < this.DEDUP_WINDOW
    );

    // 检查是否有相同消息
    return this.recentNotifications.some(
      record =>
        record.message === message &&
        record.priority === priority &&
        now - record.timestamp < this.DEDUP_WINDOW
    );
  }

  /**
   * 添加到历史
   */
  private addToHistory(record: NotificationRecord): void {
    this.recentNotifications.push(record);

    // 限制历史记录数量
    if (this.recentNotifications.length > 50) {
      this.recentNotifications = this.recentNotifications.slice(-50);
    }
  }

  /**
   * 显示 Toast
   */
  private showToast(
    type: NotificationType,
    message: string,
    options: Pick<NotificationOptions, "duration" | "description" | "action">
  ): void {
    const { duration, description, action } = options;

    switch (type) {
      case "info":
        toast.info(message, { duration, description, action });
        break;
      case "success":
        toast.success(message, { duration, description, action });
        break;
      case "warning":
        toast.warning(message, { duration, description, action });
        break;
      case "error":
        toast.error(message, { duration, description, action });
        break;
    }
  }

  /**
   * 记录到控制台
   */
  private logToConsole(
    type: NotificationType,
    message: string,
    priority: NotificationPriority
  ): void {
    const prefix = `[Notification ${type.toUpperCase()}/${priority}]`;

    switch (type) {
      case "error":
        console.error(prefix, message);
        break;
      case "warning":
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * 按类型分组通知
   */
  private groupNotifications(notifications: NotificationRecord[]): {
    error: NotificationRecord[];
    warning: NotificationRecord[];
    success: NotificationRecord[];
    info: NotificationRecord[];
  } {
    return notifications.reduce(
      (acc, notification) => {
        acc[notification.type].push(notification);
        return acc;
      },
      { error: [], warning: [], success: [], info: [] } as {
        error: NotificationRecord[];
        warning: NotificationRecord[];
        success: NotificationRecord[];
        info: NotificationRecord[];
      }
    );
  }

  /**
   * 获取默认优先级
   */
  private getDefaultPriority(type: NotificationType): NotificationPriority {
    switch (type) {
      case "error":
        return NotificationPriority.ERROR;
      case "warning":
        return NotificationPriority.WARNING;
      case "success":
        return NotificationPriority.SUCCESS;
      case "info":
      default:
        return NotificationPriority.INFO;
    }
  }

  /**
   * 获取默认持续时间
   */
  private getDefaultDuration(type: NotificationType): number {
    switch (type) {
      case "error":
        return 5000;
      case "warning":
        return 4000;
      case "success":
        return 3000;
      case "info":
      default:
        return 2000;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const NotificationManager = new NotificationManagerClass();

// 导出类型和枚举
export type { NotificationOptions, NotificationRecord };
