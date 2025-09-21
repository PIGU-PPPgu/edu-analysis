-- 创建实时通知系统
-- 为预警结果提供实时推送通知

-- 1. 创建通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('warning', 'system', 'reminder', 'achievement')),
  target_roles TEXT[] DEFAULT ARRAY['teacher', 'admin'], -- 目标角色
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建通知记录表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  recipient_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'dismissed', 'failed')),
  delivery_methods TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'sms', 'push'
  related_entity_type TEXT, -- 关联实体类型
  related_entity_id TEXT, -- 关联实体ID
  data JSONB DEFAULT '{}', -- 通知相关数据
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建通知订阅表
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'sms', 'push')),
  is_enabled BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}', -- 订阅偏好设置
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_type, delivery_method)
);

-- 4. 创建实时通知广播表
CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL, -- 广播频道
  event_type TEXT NOT NULL, -- 事件类型
  payload JSONB NOT NULL, -- 广播数据
  target_users UUID[], -- 目标用户（为空表示广播给所有用户）
  target_roles TEXT[], -- 目标角色
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 插入默认通知模板
INSERT INTO notification_templates (name, title_template, content_template, notification_type, target_roles) VALUES
('warning_created', '新预警通知', '学生 {{student_name}} 触发了 {{warning_type}} 预警，请及时关注。', 'warning', ARRAY['teacher', 'admin']),
('high_risk_warning', '高风险预警', '学生 {{student_name}} 处于高风险状态，触发了 {{rule_name}} 规则，建议立即干预。', 'warning', ARRAY['teacher', 'admin']),
('batch_warnings_generated', '批量预警生成', '本次预警检查共生成 {{warning_count}} 个新预警，涉及 {{student_count}} 名学生。', 'system', ARRAY['admin']),
('warning_engine_completed', '预警引擎执行完成', '预警引擎执行完成，处理了 {{rules_count}} 个规则，生成 {{warnings_count}} 个预警。', 'system', ARRAY['admin']),
('warning_engine_failed', '预警引擎执行失败', '预警引擎执行失败：{{error_message}}', 'system', ARRAY['admin']),
('student_improvement', '学生改善通知', '学生 {{student_name}} 的预警状态已改善，{{improvement_details}}。', 'achievement', ARRAY['teacher']),
('warning_resolved', '预警已解决', '学生 {{student_name}} 的 {{warning_type}} 预警已被标记为已解决。', 'system', ARRAY['teacher', 'admin']);

-- 6. 创建发送通知的函数
CREATE OR REPLACE FUNCTION send_notification(
  p_template_name TEXT,
  p_recipient_id UUID,
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal',
  p_delivery_methods TEXT[] DEFAULT ARRAY['in_app'],
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  template_record RECORD;
  notification_id UUID;
  rendered_title TEXT;
  rendered_content TEXT;
  placeholder TEXT;
  replacement_value TEXT;
BEGIN
  -- 获取通知模板
  SELECT * INTO template_record
  FROM notification_templates
  WHERE name = p_template_name AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '通知模板 % 不存在或未激活', p_template_name;
  END IF;
  
  -- 渲染模板内容
  rendered_title := template_record.title_template;
  rendered_content := template_record.content_template;
  
  -- 替换模板中的占位符
  FOR placeholder, replacement_value IN SELECT * FROM jsonb_each_text(p_data)
  LOOP
    rendered_title := replace(rendered_title, '{{' || placeholder || '}}', replacement_value);
    rendered_content := replace(rendered_content, '{{' || placeholder || '}}', replacement_value);
  END LOOP;
  
  -- 创建通知记录
  INSERT INTO notifications (
    template_id,
    recipient_id,
    title,
    content,
    notification_type,
    priority,
    delivery_methods,
    related_entity_type,
    related_entity_id,
    data,
    status
  ) VALUES (
    template_record.id,
    p_recipient_id,
    rendered_title,
    rendered_content,
    template_record.notification_type,
    p_priority,
    p_delivery_methods,
    p_related_entity_type,
    p_related_entity_id,
    p_data,
    'pending'
  ) RETURNING id INTO notification_id;
  
  -- 创建实时广播记录
  INSERT INTO notification_broadcasts (
    channel,
    event_type,
    payload,
    target_users
  ) VALUES (
    'user_' || p_recipient_id,
    'notification_created',
    jsonb_build_object(
      'notification_id', notification_id,
      'title', rendered_title,
      'content', rendered_content,
      'type', template_record.notification_type,
      'priority', p_priority,
      'data', p_data
    ),
    ARRAY[p_recipient_id]
  );
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建广播通知的函数（给多个用户）
CREATE OR REPLACE FUNCTION broadcast_notification(
  p_template_name TEXT,
  p_target_roles TEXT[] DEFAULT ARRAY['teacher', 'admin'],
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal',
  p_delivery_methods TEXT[] DEFAULT ARRAY['in_app'],
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  template_record RECORD;
  user_record RECORD;
  notification_count INTEGER := 0;
  rendered_title TEXT;
  rendered_content TEXT;
  placeholder TEXT;
  replacement_value TEXT;
  notification_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 获取通知模板
  SELECT * INTO template_record
  FROM notification_templates
  WHERE name = p_template_name AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '通知模板 % 不存在或未激活', p_template_name;
  END IF;
  
  -- 渲染模板内容
  rendered_title := template_record.title_template;
  rendered_content := template_record.content_template;
  
  -- 替换模板中的占位符
  FOR placeholder, replacement_value IN SELECT * FROM jsonb_each_text(p_data)
  LOOP
    rendered_title := replace(rendered_title, '{{' || placeholder || '}}', replacement_value);
    rendered_content := replace(rendered_content, '{{' || placeholder || '}}', replacement_value);
  END LOOP;
  
  -- 获取目标用户
  FOR user_record IN
    SELECT DISTINCT u.id
    FROM auth.users u
    JOIN user_roles ur ON u.id = ur.user_id
    WHERE ur.role = ANY(p_target_roles)
  LOOP
    -- 为每个用户创建通知
    INSERT INTO notifications (
      template_id,
      recipient_id,
      title,
      content,
      notification_type,
      priority,
      delivery_methods,
      related_entity_type,
      related_entity_id,
      data,
      status
    ) VALUES (
      template_record.id,
      user_record.id,
      rendered_title,
      rendered_content,
      template_record.notification_type,
      p_priority,
      p_delivery_methods,
      p_related_entity_type,
      p_related_entity_id,
      p_data,
      'pending'
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  -- 创建广播记录
  INSERT INTO notification_broadcasts (
    channel,
    event_type,
    payload,
    target_roles
  ) VALUES (
    'role_broadcast',
    'notification_broadcast',
    jsonb_build_object(
      'title', rendered_title,
      'content', rendered_content,
      'type', template_record.notification_type,
      'priority', p_priority,
      'data', p_data,
      'recipient_count', notification_count
    ),
    p_target_roles
  );
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建预警通知触发器
CREATE OR REPLACE FUNCTION trigger_warning_notifications()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  rule_record RECORD;
BEGIN
  -- 获取学生姓名
  SELECT name INTO student_name
  FROM students
  WHERE student_id = NEW.student_id;
  
  -- 获取规则信息
  SELECT * INTO rule_record
  FROM warning_rules
  WHERE id = NEW.rule_id;
  
  -- 根据预警严重程度选择不同的通知模板
  IF rule_record.severity = 'high' THEN
    -- 高风险预警立即通知
    PERFORM broadcast_notification(
      'high_risk_warning',
      ARRAY['teacher', 'admin'],
      jsonb_build_object(
        'student_name', COALESCE(student_name, '未知学生'),
        'student_id', NEW.student_id,
        'rule_name', rule_record.name,
        'warning_id', NEW.id,
        'severity', rule_record.severity
      ),
      'high',
      ARRAY['in_app'],
      'warning_record',
      NEW.id::TEXT
    );
  ELSE
    -- 普通预警通知
    PERFORM broadcast_notification(
      'warning_created',
      ARRAY['teacher', 'admin'],
      jsonb_build_object(
        'student_name', COALESCE(student_name, '未知学生'),
        'student_id', NEW.student_id,
        'warning_type', rule_record.category,
        'warning_id', NEW.id,
        'severity', rule_record.severity
      ),
      'normal',
      ARRAY['in_app'],
      'warning_record',
      NEW.id::TEXT
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建预警引擎执行通知触发器
CREATE OR REPLACE FUNCTION trigger_warning_engine_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- 当预警引擎执行完成时发送通知
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM broadcast_notification(
      'warning_engine_completed',
      ARRAY['admin'],
      jsonb_build_object(
        'execution_id', NEW.id,
        'rules_count', NEW.rules_count,
        'warnings_count', NEW.new_warnings_count,
        'execution_time', NEW.execution_duration_ms,
        'trigger_event', NEW.trigger_event
      ),
      'normal',
      ARRAY['in_app'],
      'warning_execution',
      NEW.id::TEXT
    );
    
    -- 如果生成了大量预警，发送特别通知
    IF NEW.new_warnings_count >= 10 THEN
      PERFORM broadcast_notification(
        'batch_warnings_generated',
        ARRAY['teacher', 'admin'],
        jsonb_build_object(
          'warning_count', NEW.new_warnings_count,
          'student_count', NEW.matched_students_count,
          'execution_id', NEW.id
        ),
        'high',
        ARRAY['in_app'],
        'warning_execution',
        NEW.id::TEXT
      );
    END IF;
    
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    -- 执行失败时通知管理员
    PERFORM broadcast_notification(
      'warning_engine_failed',
      ARRAY['admin'],
      jsonb_build_object(
        'execution_id', NEW.id,
        'error_message', NEW.error_message,
        'trigger_event', NEW.trigger_event
      ),
      'urgent',
      ARRAY['in_app'],
      'warning_execution',
      NEW.id::TEXT
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建触发器
DROP TRIGGER IF EXISTS trigger_warning_record_notifications ON warning_records;
CREATE TRIGGER trigger_warning_record_notifications
  AFTER INSERT ON warning_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_warning_notifications();

DROP TRIGGER IF EXISTS trigger_warning_execution_notifications ON warning_executions;
CREATE TRIGGER trigger_warning_execution_notifications
  AFTER UPDATE ON warning_executions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_warning_engine_notifications();

-- 11. 创建通知查询优化函数
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  notification_type TEXT,
  priority TEXT,
  status TEXT,
  data JSONB,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.notification_type,
    n.priority,
    n.status,
    n.data,
    n.created_at,
    n.read_at
  FROM notifications n
  WHERE n.recipient_id = p_user_id
  AND (p_status IS NULL OR n.status = p_status)
  AND (p_type IS NULL OR n.notification_type = p_type)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 12. 创建标记通知为已读的函数
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET status = 'read', read_at = now()
  WHERE id = p_notification_id AND status = 'sent';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 13. 创建批量标记已读的函数
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NOT NULL THEN
    -- 标记指定通知为已读
    UPDATE notifications
    SET status = 'read', read_at = now()
    WHERE id = ANY(p_notification_ids)
    AND recipient_id = p_user_id
    AND status = 'sent';
  ELSE
    -- 标记用户所有未读通知为已读
    UPDATE notifications
    SET status = 'read', read_at = now()
    WHERE recipient_id = p_user_id
    AND status = 'sent';
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 14. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_channel ON notification_broadcasts(channel);
CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_created ON notification_broadcasts(created_at DESC);

-- 15. 添加RLS策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的通知
CREATE POLICY "用户只能查看自己的通知" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- 用户只能管理自己的订阅
CREATE POLICY "用户只能管理自己的订阅" ON notification_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- 管理员可以查看广播记录
CREATE POLICY "管理员可以查看广播记录" ON notification_broadcasts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 16. 添加注释
COMMENT ON TABLE notification_templates IS '通知模板表：定义各种通知的模板格式';
COMMENT ON TABLE notifications IS '通知记录表：存储发送给用户的通知';
COMMENT ON TABLE notification_subscriptions IS '通知订阅表：用户的通知偏好设置';
COMMENT ON TABLE notification_broadcasts IS '通知广播表：实时推送的广播记录';
COMMENT ON FUNCTION send_notification IS '发送单个通知给指定用户';
COMMENT ON FUNCTION broadcast_notification IS '广播通知给指定角色的所有用户';
COMMENT ON FUNCTION get_user_notifications IS '获取用户的通知列表';
COMMENT ON FUNCTION mark_notification_read IS '标记单个通知为已读';
COMMENT ON FUNCTION mark_notifications_read IS '批量标记通知为已读';