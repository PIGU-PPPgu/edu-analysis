/**
 * 通知中心组件
 * 显示和管理用户通知
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Trophy,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getUserNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  getUnreadNotificationCount,
  addNotificationListener,
  removeNotificationListener,
  sendTestNotification,
  type Notification,
} from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

interface NotificationCenterProps {
  className?: string;
  compact?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className,
  compact = false,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // 加载通知
  const loadNotifications = async (type?: string) => {
    try {
      setIsLoading(true);
      const data = await getUserNotifications(50, 0, undefined, type === 'all' ? undefined : type);
      setNotifications(data);
    } catch (error) {
      console.error('加载通知失败:', error);
      toast.error('加载通知失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载未读数量
  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('加载未读数量失败:', error);
    }
  };

  // 处理新通知
  const handleNewNotification = (notification: any) => {
    // 添加到通知列表顶部
    setNotifications(prev => [
      {
        id: notification.notification_id,
        title: notification.title,
        content: notification.content,
        notification_type: notification.type,
        priority: notification.priority,
        status: 'sent',
        data: notification.data,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    
    // 更新未读数量
    setUnreadCount(prev => prev + 1);
  };

  // 标记为已读
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('标记已读失败:', error);
      toast.error('标记已读失败');
    }
  };

  // 批量标记已读
  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => n.status === 'sent')
        .map(n => n.id);
      
      if (unreadIds.length === 0) {
        toast.info('没有未读通知');
        return;
      }

      const count = await markNotificationsAsRead(unreadIds);
      if (count > 0) {
        setNotifications(prev =>
          prev.map(n =>
            unreadIds.includes(n.id)
              ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(0);
        toast.success(`已标记 ${count} 条通知为已读`);
      }
    } catch (error) {
      console.error('批量标记已读失败:', error);
      toast.error('批量标记已读失败');
    }
  };

  // 切换通知选择
  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // 批量操作选中的通知
  const handleBatchOperation = async (operation: 'read' | 'unread') => {
    if (selectedNotifications.size === 0) {
      toast.info('请先选择通知');
      return;
    }

    try {
      if (operation === 'read') {
        const count = await markNotificationsAsRead(Array.from(selectedNotifications));
        if (count > 0) {
          setNotifications(prev =>
            prev.map(n =>
              selectedNotifications.has(n.id)
                ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
                : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - count));
          toast.success(`已标记 ${count} 条通知为已读`);
        }
      }
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('批量操作失败:', error);
      toast.error('批量操作失败');
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'achievement':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'system':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // 过滤通知
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return notification.status === 'sent';
    return notification.notification_type === activeTab;
  });

  useEffect(() => {
    // 添加实时通知监听器
    addNotificationListener('notification-center', handleNewNotification);
    
    // 加载初始数据
    loadNotifications();
    loadUnreadCount();

    return () => {
      removeNotificationListener('notification-center');
    };
  }, []);

  useEffect(() => {
    // 当切换标签时重新加载数据
    const type = activeTab === 'all' || activeTab === 'unread' ? undefined : activeTab;
    loadNotifications(type);
  }, [activeTab]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            通知中心
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedNotifications.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchOperation('read')}
                >
                  <Check className="h-3 w-3 mr-1" />
                  标记已读
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              全部已读
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadNotifications()}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Button
                size="sm"
                variant="outline"
                onClick={sendTestNotification}
              >
                测试通知
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full mb-4">
            <TabsTrigger value="all" className="text-xs">
              全部
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              未读 {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="warning" className="text-xs">
              预警
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs">
              系统
            </TabsTrigger>
            <TabsTrigger value="achievement" className="text-xs">
              成就
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">加载中...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无通知</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer
                        ${notification.status === 'sent' 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200'
                        }
                        ${selectedNotifications.has(notification.id) 
                          ? 'ring-2 ring-blue-500' 
                          : ''
                        }
                      `}
                      onClick={() => toggleNotificationSelection(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.notification_type, notification.priority)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`}
                                  title={`优先级: ${notification.priority}`}
                                />
                                {notification.status === 'sent' ? (
                                  <EyeOff className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Eye className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(notification.created_at), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                              {notification.status === 'sent' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                >
                                  标记已读
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;