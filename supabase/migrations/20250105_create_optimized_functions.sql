-- 创建优化的预警统计函数
-- 这个函数整合了多个查询，减少网络往返次数

-- 1. 创建综合预警统计函数
CREATE OR REPLACE FUNCTION get_warning_statistics_optimized(
  time_range_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  total_students INTEGER,
  warning_students INTEGER,
  high_risk_students INTEGER,
  total_warnings INTEGER,
  active_warnings INTEGER,
  risk_distribution JSONB,
  category_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH student_stats AS (
    SELECT COUNT(DISTINCT s.id) as total_student_count
    FROM students s
  ),
  warning_student_stats AS (
    SELECT 
      COUNT(DISTINCT w.student_id) as warning_student_count,
      COUNT(*) as total_warning_count,
      COUNT(CASE WHEN w.status = 'active' THEN 1 END) as active_warning_count,
      COUNT(CASE WHEN wr.severity = 'high' THEN 1 END) as high_risk_count
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
  ),
  risk_distribution_stats AS (
    SELECT 
      jsonb_build_object(
        'low', COUNT(CASE WHEN wr.severity = 'low' THEN 1 END),
        'medium', COUNT(CASE WHEN wr.severity = 'medium' THEN 1 END),
        'high', COUNT(CASE WHEN wr.severity = 'high' THEN 1 END)
      ) as risk_dist
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
  ),
  category_distribution_stats AS (
    SELECT 
      jsonb_build_object(
        'grade', COUNT(CASE WHEN wr.category = 'grade' THEN 1 END),
        'attendance', COUNT(CASE WHEN wr.category = 'attendance' THEN 1 END),
        'behavior', COUNT(CASE WHEN wr.category = 'behavior' THEN 1 END),
        'progress', COUNT(CASE WHEN wr.category = 'progress' THEN 1 END),
        'homework', COUNT(CASE WHEN wr.category = 'homework' THEN 1 END),
        'composite', COUNT(CASE WHEN wr.category = 'composite' THEN 1 END)
      ) as category_dist
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
  )
  SELECT 
    ss.total_student_count::INTEGER,
    COALESCE(wss.warning_student_count, 0)::INTEGER,
    COALESCE(wss.high_risk_count, 0)::INTEGER,
    COALESCE(wss.total_warning_count, 0)::INTEGER,
    COALESCE(wss.active_warning_count, 0)::INTEGER,
    COALESCE(rds.risk_dist, '{}'::jsonb),
    COALESCE(cds.category_dist, '{}'::jsonb)
  FROM student_stats ss
  CROSS JOIN warning_student_stats wss
  CROSS JOIN risk_distribution_stats rds
  CROSS JOIN category_distribution_stats cds;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建通知相关函数（如果不存在）
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

-- 3. 创建标记通知已读函数
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET 
    status = 'read',
    read_at = NOW()
  WHERE id = p_notification_id
    AND status = 'sent';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建批量标记通知已读函数
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- 标记用户所有未读通知为已读
    UPDATE notifications 
    SET 
      status = 'read',
      read_at = NOW()
    WHERE recipient_id = p_user_id
      AND status = 'sent';
  ELSE
    -- 标记指定的通知为已读
    UPDATE notifications 
    SET 
      status = 'read',
      read_at = NOW()
    WHERE id = ANY(p_notification_ids)
      AND recipient_id = p_user_id
      AND status = 'sent';
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建发送通知函数（如果不存在）
CREATE OR REPLACE FUNCTION send_notification(
  p_template_name TEXT,
  p_recipient_id UUID,
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal'
)
RETURNS BOOLEAN AS $$
DECLARE
  template_record RECORD;
  notification_id UUID;
BEGIN
  -- 获取模板信息
  SELECT * INTO template_record
  FROM notification_templates
  WHERE name = p_template_name
    AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '通知模板不存在或未激活: %', p_template_name;
  END IF;
  
  -- 创建通知记录
  INSERT INTO notifications (
    title,
    content,
    notification_type,
    priority,
    recipient_id,
    data,
    status
  ) VALUES (
    template_record.title,
    template_record.content,
    template_record.type,
    p_priority,
    p_recipient_id,
    p_data,
    'sent'
  ) RETURNING id INTO notification_id;
  
  -- 发送实时通知（通过广播）
  PERFORM pg_notify(
    'user_' || p_recipient_id::text,
    json_build_object(
      'type', 'notification_created',
      'notification_id', notification_id,
      'title', template_record.title,
      'content', template_record.content,
      'priority', p_priority,
      'data', p_data
    )::text
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '发送通知失败: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 6. 添加函数注释
COMMENT ON FUNCTION get_warning_statistics_optimized IS '获取优化的预警统计数据，减少网络往返次数';
COMMENT ON FUNCTION get_user_notifications IS '获取用户通知列表，支持分页和筛选';
COMMENT ON FUNCTION mark_notification_read IS '标记单个通知为已读状态';
COMMENT ON FUNCTION mark_notifications_read IS '批量标记通知为已读状态';
COMMENT ON FUNCTION send_notification IS '基于模板发送通知并触发实时推送';

-- 7. 确保索引存在以优化查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warning_records_created_severity ON warning_records(created_at, rule_id);

-- 8. 创建系统性能监控函数（扩展版）
CREATE OR REPLACE FUNCTION get_system_performance_metrics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  description TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'database_size'::TEXT,
    pg_database_size(current_database())::NUMERIC / (1024*1024*1024),
    'GB'::TEXT,
    '数据库总大小'::TEXT,
    CASE 
      WHEN pg_database_size(current_database()) > 10 * 1024*1024*1024 THEN 'warning'
      ELSE 'normal'
    END::TEXT
  
  UNION ALL
  
  SELECT 
    'active_connections'::TEXT,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::NUMERIC,
    'count'::TEXT,
    '活跃连接数'::TEXT,
    CASE 
      WHEN (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') > 50 THEN 'warning'
      ELSE 'normal'
    END::TEXT
  
  UNION ALL
  
  SELECT 
    'cache_hit_ratio'::TEXT,
    ROUND(
      (SELECT sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0) 
       FROM pg_stat_database), 
      2
    ),
    'percentage'::TEXT,
    '缓存命中率'::TEXT,
    CASE 
      WHEN (SELECT sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0) 
            FROM pg_stat_database) < 95 THEN 'warning'
      ELSE 'normal'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_system_performance_metrics IS '获取系统性能指标，包括数据库大小、连接数和缓存命中率';