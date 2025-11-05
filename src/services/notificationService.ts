/**
 * 实时通知服务
 * 管理预警结果的实时推送通知
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

// 通知接口
export interface Notification {
  id: string;
  title: string;
  content: string;
  notification_type: "warning" | "system" | "reminder" | "achievement";
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "sent" | "read" | "dismissed" | "failed";
  data: any;
  created_at: string;
  read_at?: string;
}

// 通知订阅偏好
export interface NotificationSubscription {
  id: string;
  user_id: string;
  notification_type: string;
  delivery_method: "in_app" | "email" | "sms" | "push";
  is_enabled: boolean;
  preferences: any;
}

// 实时通知管理器
class NotificationManager {
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;
  private listeners: Map<string, (notification: any) => void> = new Map();
  private isConnected = false;

  /**
   * 初始化通知管理器
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.connectToRealtime();
  }

  /**
   * 连接到实时通知频道
   */
  private async connectToRealtime(): Promise<void> {
    if (!this.userId) return;

    try {
      // 断开现有连接
      if (this.channel) {
        await this.disconnect();
      }

      // 创建用户专属频道
      this.channel = supabase.channel(`user_${this.userId}`);

      // 监听广播事件
      this.channel
        .on("broadcast", { event: "notification_created" }, (payload) => {
          this.handleNotificationReceived(payload.payload);
        })
        .on("broadcast", { event: "notification_broadcast" }, (payload) => {
          this.handleBroadcastReceived(payload.payload);
        });

      // 订阅频道
      const status = await this.channel.subscribe();

      if (status === "SUBSCRIBED") {
        this.isConnected = true;
        console.log(
          `[NotificationManager] 已连接到通知频道: user_${this.userId}`
        );
      } else {
        console.error("[NotificationManager] 连接通知频道失败");
      }
    } catch (error) {
      console.error("[NotificationManager] 初始化实时通知失败:", error);
    }
  }

  /**
   * 处理接收到的通知
   */
  private handleNotificationReceived(notification: any): void {
    console.log("[NotificationManager] 收到新通知:", notification);

    // 显示浏览器通知
    this.showBrowserNotification(notification);

    // 显示应用内通知
    this.showInAppNotification(notification);

    // 触发监听器
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error("[NotificationManager] 通知监听器错误:", error);
      }
    });
  }

  /**
   * 处理广播通知
   */
  private handleBroadcastReceived(broadcast: any): void {
    console.log("[NotificationManager] 收到广播通知:", broadcast);

    // 广播通知通常显示为Toast
    this.showBroadcastToast(broadcast);
  }

  /**
   * 显示浏览器通知
   */
  private showBrowserNotification(notification: any): void {
    // 检查浏览器通知权限
    if (Notification.permission === "granted") {
      const browserNotification = new Notification(notification.title, {
        body: notification.content,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: notification.notification_id,
        data: notification.data,
      });

      // 点击通知时的处理
      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.notification_id);
        browserNotification.close();
      };

      // 自动关闭
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  /**
   * 显示应用内通知
   */
  private showInAppNotification(notification: any): void {
    const getToastVariant = (priority: string) => {
      switch (priority) {
        case "urgent":
          return "destructive";
        case "high":
          return "destructive";
        case "normal":
          return "default";
        case "low":
          return "default";
        default:
          return "default";
      }
    };

    const getToastDuration = (priority: string) => {
      switch (priority) {
        case "urgent":
          return 10000; // 10秒
        case "high":
          return 8000; // 8秒
        case "normal":
          return 5000; // 5秒
        case "low":
          return 3000; // 3秒
        default:
          return 5000;
      }
    };

    toast(notification.title, {
      description: notification.content,
      duration: getToastDuration(notification.priority),
      action:
        notification.priority === "urgent" || notification.priority === "high"
          ? {
              label: "查看详情",
              onClick: () => this.handleNotificationClick(notification),
            }
          : undefined,
    });
  }

  /**
   * 显示广播Toast
   */
  private showBroadcastToast(broadcast: any): void {
    if (broadcast.type === "system") {
      toast.info(broadcast.title, {
        description: broadcast.content,
        duration: 6000,
      });
    } else {
      toast(broadcast.title, {
        description: broadcast.content,
        duration: 5000,
      });
    }
  }

  /**
   * 处理通知点击
   */
  private handleNotificationClick(notification: any): void {
    // 根据通知类型导航到相应页面
    const { type, data } = notification;

    switch (type) {
      case "warning":
        if (data.warning_id) {
          // 导航到预警详情页面
          window.location.href = `/warning-analysis?warning=${data.warning_id}`;
        } else {
          window.location.href = "/warning-analysis";
        }
        break;
      case "system":
        if (data.execution_id) {
          // 导航到执行详情页面
          window.location.href = `/warning-analysis?execution=${data.execution_id}`;
        }
        break;
      default:
        // 默认导航到通知中心
        window.location.href = "/notifications";
    }

    // 标记为已读
    if (notification.notification_id) {
      this.markAsRead(notification.notification_id);
    }
  }

  /**
   * 添加通知监听器
   */
  addListener(id: string, callback: (notification: any) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * 移除通知监听器
   */
  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
      this.isConnected = false;
      console.log("[NotificationManager] 已断开通知频道连接");
    }
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("mark_notification_read", {
        p_notification_id: notificationId,
      });

      if (error) {
        console.error("标记通知已读失败:", error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error("标记通知已读失败:", error);
      return false;
    }
  }

  /**
   * 获取连接状态
   */
  isConnectedToRealtime(): boolean {
    return this.isConnected;
  }
}

// 创建全局通知管理器实例
const notificationManager = new NotificationManager();

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(
  limit: number = 20,
  offset: number = 0,
  status?: string,
  type?: string
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_notifications", {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_limit: limit,
      p_offset: offset,
      p_status: status,
      p_type: type,
    });

    if (error) {
      console.error("获取通知列表失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取通知列表失败:", error);
    return [];
  }
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  return notificationManager.markAsRead(notificationId);
}

/**
 * 批量标记通知为已读
 */
export async function markNotificationsAsRead(
  notificationIds?: string[]
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("mark_notifications_read", {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_notification_ids: notificationIds,
    });

    if (error) {
      console.error("批量标记通知已读失败:", error);
      return 0;
    }

    return data as number;
  } catch (error) {
    console.error("批量标记通知已读失败:", error);
    return 0;
  }
}

/**
 * 获取用户未读通知数量
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", (await supabase.auth.getUser()).data.user?.id)
      .eq("status", "sent");

    if (error) {
      console.error("获取未读通知数量失败:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("获取未读通知数量失败:", error);
    return 0;
  }
}

/**
 * 初始化通知系统
 */
export async function initializeNotifications(): Promise<void> {
  try {
    // 请求浏览器通知权限
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[NotificationService] 用户未登录，无法初始化通知");
      return;
    }

    // 初始化通知管理器
    await notificationManager.initialize(user.id);

    console.log("[NotificationService] 通知系统初始化完成");
  } catch (error) {
    console.error("[NotificationService] 初始化通知系统失败:", error);
  }
}

/**
 * 添加通知监听器
 */
export function addNotificationListener(
  id: string,
  callback: (notification: any) => void
): void {
  notificationManager.addListener(id, callback);
}

/**
 * 移除通知监听器
 */
export function removeNotificationListener(id: string): void {
  notificationManager.removeListener(id);
}

/**
 * 断开通知连接
 */
export async function disconnectNotifications(): Promise<void> {
  await notificationManager.disconnect();
}

/**
 * 检查通知连接状态
 */
export function isNotificationConnected(): boolean {
  return notificationManager.isConnectedToRealtime();
}

/**
 * 手动发送测试通知
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("send_notification", {
      p_template_name: "warning_created",
      p_recipient_id: (await supabase.auth.getUser()).data.user?.id,
      p_data: {
        student_name: "测试学生",
        warning_type: "成绩预警",
      },
      p_priority: "normal",
    });

    if (error) {
      console.error("发送测试通知失败:", error);
      toast.error("发送测试通知失败");
      return false;
    }

    toast.success("测试通知已发送");
    return true;
  } catch (error) {
    console.error("发送测试通知失败:", error);
    toast.error("发送测试通知失败");
    return false;
  }
}

// 导出通知管理器实例（仅供内部使用）
export { notificationManager };
