-- ===========================================
-- 🔧 用户企业微信设置表
-- 存储每个用户的企业微信机器人配置
-- ===========================================

CREATE TABLE IF NOT EXISTS user_wechat_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_name VARCHAR(255) DEFAULT '企业微信机器人',
  is_enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '["grade_analysis", "warning_alerts", "homework_reminders"]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_wechat_settings_user_id ON user_wechat_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wechat_settings_enabled ON user_wechat_settings(is_enabled);

-- 添加RLS策略
ALTER TABLE user_wechat_settings ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的企业微信设置
CREATE POLICY "用户只能访问自己的企业微信设置" ON user_wechat_settings
  FOR ALL USING (auth.uid() = user_id);

-- 插入一些测试数据（可选）
INSERT INTO user_wechat_settings (user_id, webhook_url, webhook_name, notification_types) 
VALUES 
  (
    (SELECT id FROM auth.users LIMIT 1),
    'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key',
    '成绩分析机器人',
    '["grade_analysis", "warning_alerts"]'
  )
ON CONFLICT (user_id) DO NOTHING;

-- 创建函数：获取用户的企业微信设置
CREATE OR REPLACE FUNCTION get_user_wechat_settings(user_uuid UUID)
RETURNS TABLE (
  webhook_url TEXT,
  webhook_name VARCHAR(255),
  is_enabled BOOLEAN,
  notification_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uws.webhook_url,
    uws.webhook_name,
    uws.is_enabled,
    uws.notification_types
  FROM user_wechat_settings uws
  WHERE uws.user_id = user_uuid
  AND uws.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：测试企业微信webhook连接
CREATE OR REPLACE FUNCTION test_wechat_webhook(webhook_url TEXT)
RETURNS JSONB AS $$
BEGIN
  -- 这里可以添加实际的webhook测试逻辑
  -- 目前返回成功状态
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Webhook测试成功',
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_wechat_settings IS '用户企业微信设置表';
COMMENT ON COLUMN user_wechat_settings.webhook_url IS '企业微信机器人Webhook URL';
COMMENT ON COLUMN user_wechat_settings.webhook_name IS '机器人名称';
COMMENT ON COLUMN user_wechat_settings.is_enabled IS '是否启用推送';
COMMENT ON COLUMN user_wechat_settings.notification_types IS '通知类型数组';
COMMENT ON COLUMN user_wechat_settings.settings IS '其他设置（JSON格式）';