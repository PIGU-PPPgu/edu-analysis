// ===========================================
// 🔧 企业微信设置服务
// 管理用户的企业微信机器人配置
// ===========================================

import { supabase } from '@/integrations/supabase/client';

export interface WechatSettings {
  id?: string;
  user_id?: string;
  webhook_url: string;
  webhook_name: string;
  is_enabled: boolean;
  notification_types: string[];
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WechatTestResult {
  success: boolean;
  message: string;
  timestamp?: string;
}

/**
 * 获取用户的企业微信设置
 */
export const getUserWechatSettings = async (): Promise<WechatSettings | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('user_wechat_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('获取企业微信设置失败:', error);
    throw error;
  }
};

/**
 * 保存用户的企业微信设置
 */
export const saveUserWechatSettings = async (settings: Partial<WechatSettings>): Promise<WechatSettings> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('用户未登录');
    }

    const settingsData = {
      user_id: user.id,
      webhook_url: settings.webhook_url,
      webhook_name: settings.webhook_name || '企业微信机器人',
      is_enabled: settings.is_enabled ?? true,
      notification_types: settings.notification_types || ['grade_analysis'],
      settings: settings.settings || {},
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_wechat_settings')
      .upsert(settingsData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('保存企业微信设置失败:', error);
    throw error;
  }
};

/**
 * 删除用户的企业微信设置
 */
export const deleteUserWechatSettings = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('用户未登录');
    }

    const { error } = await supabase
      .from('user_wechat_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('删除企业微信设置失败:', error);
    throw error;
  }
};

/**
 * 测试企业微信Webhook连接
 */
export const testWechatWebhook = async (webhookUrl: string): Promise<WechatTestResult> => {
  try {
    if (!webhookUrl) {
      throw new Error('Webhook URL不能为空');
    }

    // 验证URL格式
    const urlPattern = /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[\w-]+$/;
    if (!urlPattern.test(webhookUrl)) {
      throw new Error('请输入有效的企业微信机器人Webhook URL');
    }

    // 使用Supabase Edge Function测试，避免CORS问题
    const { data, error } = await supabase.functions.invoke('test-wechat', {
      body: {
        webhook_url: webhookUrl
      }
    });

    if (error) {
      throw new Error(error.message || '调用Edge Function失败');
    }

    if (data?.success) {
      return {
        success: true,
        message: '企业微信机器人连接测试成功！',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(data?.message || '测试失败');
    }
  } catch (error) {
    console.error('测试企业微信连接失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 发送企业微信消息
 */
export const sendWechatMessage = async (
  webhookUrl: string,
  content: string,
  title?: string
): Promise<boolean> => {
  try {
    if (!webhookUrl || !content) {
      throw new Error('参数不完整');
    }

    const message = {
      msgtype: 'text',
      text: {
        content: title ? `${title}\n\n${content}` : content
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    const result = await response.json();

    if (response.ok && result.errcode === 0) {
      return true;
    } else {
      console.error('发送企业微信消息失败:', result);
      return false;
    }
  } catch (error) {
    console.error('发送企业微信消息异常:', error);
    return false;
  }
};

/**
 * 检查用户是否启用了特定类型的通知
 */
export const isNotificationEnabled = async (notificationType: string): Promise<boolean> => {
  try {
    const settings = await getUserWechatSettings();
    
    if (!settings || !settings.is_enabled) {
      return false;
    }

    return settings.notification_types.includes(notificationType);
  } catch (error) {
    console.error('检查通知设置失败:', error);
    return false;
  }
};

/**
 * 获取所有支持的通知类型
 */
export const getSupportedNotificationTypes = () => {
  return [
    {
      type: 'grade_analysis',
      name: '成绩分析报告',
      description: 'AI成绩分析完成后推送详细报告'
    },
    {
      type: 'warning_alerts',
      name: '预警提醒',
      description: '学习预警和异常情况提醒'
    },
    {
      type: 'homework_reminders',
      name: '作业提醒',
      description: '作业截止时间和完成情况提醒'
    },
    {
      type: 'progress_reports',
      name: '进度报告',
      description: '学习进度和成绩变化报告'
    }
  ];
};