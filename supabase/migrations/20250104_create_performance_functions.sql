-- 创建性能优化相关的数据库函数
-- 减少前端计算负担，提高查询效率

-- 1. 获取预警类型分布的优化函数
CREATE OR REPLACE FUNCTION get_warnings_by_type(
  time_range_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  type TEXT,
  count INTEGER,
  percentage NUMERIC,
  trend TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH warning_type_stats AS (
    SELECT 
      CASE 
        WHEN wr.category = 'grade' THEN '学业预警'
        WHEN wr.category = 'homework' THEN '作业预警'
        WHEN wr.category = 'attendance' THEN '出勤预警'
        WHEN wr.category = 'behavior' THEN '行为预警'
        WHEN wr.category = 'progress' THEN '进步预警'
        WHEN wr.category = 'composite' THEN '综合预警'
        ELSE '其他预警'
      END as warning_type,
      COUNT(*) as warning_count
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
    GROUP BY wr.category
  ),
  total_count AS (
    SELECT SUM(warning_count) as total FROM warning_type_stats
  ),
  previous_period_stats AS (
    SELECT 
      CASE 
        WHEN wr.category = 'grade' THEN '学业预警'
        WHEN wr.category = 'homework' THEN '作业预警'
        WHEN wr.category = 'attendance' THEN '出勤预警'
        WHEN wr.category = 'behavior' THEN '行为预警'
        WHEN wr.category = 'progress' THEN '进步预警'
        WHEN wr.category = 'composite' THEN '综合预警'
        ELSE '其他预警'
      END as warning_type,
      COUNT(*) as prev_count
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days * 2 || ' days')::INTERVAL
    AND w.created_at < CURRENT_DATE - (time_range_days || ' days')::INTERVAL
    GROUP BY wr.category
  )
  SELECT 
    wts.warning_type,
    wts.warning_count::INTEGER,
    CASE 
      WHEN tc.total > 0 THEN ROUND((wts.warning_count::NUMERIC / tc.total * 100), 1)
      ELSE 0
    END,
    CASE 
      WHEN pps.prev_count IS NULL THEN 'unchanged'
      WHEN wts.warning_count > pps.prev_count THEN 'up'
      WHEN wts.warning_count < pps.prev_count THEN 'down'
      ELSE 'unchanged'
    END
  FROM warning_type_stats wts
  CROSS JOIN total_count tc
  LEFT JOIN previous_period_stats pps ON wts.warning_type = pps.warning_type
  ORDER BY wts.warning_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. 获取班级风险分布的优化函数
CREATE OR REPLACE FUNCTION get_risk_by_class(
  time_range_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  class TEXT,
  count INTEGER,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH class_warning_stats AS (
    SELECT 
      COALESCE(s.class_name, '未知班级') as class_name,
      COUNT(DISTINCT w.student_id) as warning_student_count
    FROM warning_records w
    LEFT JOIN students s ON w.student_id = s.student_id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
    AND w.status = 'active'
    GROUP BY s.class_name
  ),
  total_warning_students AS (
    SELECT SUM(warning_student_count) as total FROM class_warning_stats
  )
  SELECT 
    cws.class_name,
    cws.warning_student_count::INTEGER,
    CASE 
      WHEN tws.total > 0 THEN ROUND((cws.warning_student_count::NUMERIC / tws.total * 100), 1)
      ELSE 0
    END
  FROM class_warning_stats cws
  CROSS JOIN total_warning_students tws
  WHERE cws.warning_student_count > 0
  ORDER BY cws.warning_student_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 3. 获取常见风险因素的优化函数
CREATE OR REPLACE FUNCTION get_common_risk_factors(
  time_range_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  factor TEXT,
  count INTEGER,
  percentage NUMERIC,
  trend TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH risk_factor_stats AS (
    SELECT 
      wr.name as rule_name,
      COUNT(*) as warning_count,
      -- 将规则名称映射为用户友好的风险因素名称
      CASE 
        WHEN wr.name ILIKE '%不及格%' OR wr.name ILIKE '%成绩%' THEN '成绩问题'
        WHEN wr.name ILIKE '%作业%' THEN '作业完成率低'
        WHEN wr.name ILIKE '%出勤%' OR wr.name ILIKE '%缺勤%' THEN '出勤问题'
        WHEN wr.name ILIKE '%行为%' OR wr.name ILIKE '%纪律%' THEN '行为问题'
        WHEN wr.name ILIKE '%下降%' OR wr.name ILIKE '%退步%' THEN '成绩下滑'
        ELSE '其他风险'
      END as risk_factor
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
  ),
  aggregated_factors AS (
    SELECT 
      risk_factor,
      SUM(warning_count) as total_count
    FROM risk_factor_stats
    GROUP BY risk_factor
  ),
  total_warnings AS (
    SELECT SUM(total_count) as total FROM aggregated_factors
  ),
  previous_period_factors AS (
    SELECT 
      CASE 
        WHEN wr.name ILIKE '%不及格%' OR wr.name ILIKE '%成绩%' THEN '成绩问题'
        WHEN wr.name ILIKE '%作业%' THEN '作业完成率低'
        WHEN wr.name ILIKE '%出勤%' OR wr.name ILIKE '%缺勤%' THEN '出勤问题'
        WHEN wr.name ILIKE '%行为%' OR wr.name ILIKE '%纪律%' THEN '行为问题'
        WHEN wr.name ILIKE '%下降%' OR wr.name ILIKE '%退步%' THEN '成绩下滑'
        ELSE '其他风险'
      END as risk_factor,
      COUNT(*) as prev_count
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.created_at >= CURRENT_DATE - (time_range_days * 2 || ' days')::INTERVAL
    AND w.created_at < CURRENT_DATE - (time_range_days || ' days')::INTERVAL
    GROUP BY risk_factor
  ),
  prev_aggregated AS (
    SELECT 
      risk_factor,
      SUM(prev_count) as prev_total
    FROM previous_period_factors
    GROUP BY risk_factor
  )
  SELECT 
    af.risk_factor,
    af.total_count::INTEGER,
    CASE 
      WHEN tw.total > 0 THEN ROUND((af.total_count::NUMERIC / tw.total * 100), 1)
      ELSE 0
    END,
    CASE 
      WHEN pa.prev_total IS NULL THEN 'unchanged'
      WHEN af.total_count > pa.prev_total THEN 'up'
      WHEN af.total_count < pa.prev_total THEN 'down'
      ELSE 'unchanged'
    END
  FROM aggregated_factors af
  CROSS JOIN total_warnings tw
  LEFT JOIN prev_aggregated pa ON af.risk_factor = pa.risk_factor
  ORDER BY af.total_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- 4. 获取预警趋势分析的函数
CREATE OR REPLACE FUNCTION get_warning_trends(
  p_time_range TEXT DEFAULT '30d',
  p_group_by TEXT DEFAULT 'day'
)
RETURNS TABLE (
  period TEXT,
  total INTEGER,
  new INTEGER,
  resolved INTEGER,
  active INTEGER
) AS $$
DECLARE
  days_count INTEGER;
  date_format TEXT;
  interval_str TEXT;
BEGIN
  -- 解析时间范围
  CASE p_time_range
    WHEN '7d' THEN days_count := 7;
    WHEN '30d' THEN days_count := 30;
    WHEN '90d' THEN days_count := 90;
    WHEN '180d' THEN days_count := 180;
    WHEN '365d' THEN days_count := 365;
    ELSE days_count := 30;
  END CASE;
  
  -- 设置日期格式和间隔
  CASE p_group_by
    WHEN 'day' THEN 
      date_format := 'YYYY-MM-DD';
      interval_str := '1 day';
    WHEN 'week' THEN 
      date_format := 'YYYY-"W"WW';
      interval_str := '1 week';
    WHEN 'month' THEN 
      date_format := 'YYYY-MM';
      interval_str := '1 month';
    ELSE 
      date_format := 'YYYY-MM-DD';
      interval_str := '1 day';
  END CASE;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_count || ' days')::INTERVAL,
      CURRENT_DATE,
      interval_str::INTERVAL
    )::DATE as period_date
  ),
  warning_stats AS (
    SELECT 
      DATE_TRUNC(p_group_by, w.created_at::DATE) as period_date,
      COUNT(*) as total_warnings,
      COUNT(CASE WHEN w.status = 'active' THEN 1 END) as active_warnings,
      COUNT(CASE WHEN w.status = 'resolved' THEN 1 END) as resolved_warnings
    FROM warning_records w
    WHERE w.created_at >= CURRENT_DATE - (days_count || ' days')::INTERVAL
    GROUP BY DATE_TRUNC(p_group_by, w.created_at::DATE)
  )
  SELECT 
    TO_CHAR(ds.period_date, date_format),
    COALESCE(ws.total_warnings, 0)::INTEGER,
    COALESCE(ws.total_warnings, 0)::INTEGER, -- 新增预警（简化为总数）
    COALESCE(ws.resolved_warnings, 0)::INTEGER,
    COALESCE(ws.active_warnings, 0)::INTEGER
  FROM date_series ds
  LEFT JOIN warning_stats ws ON ds.period_date = ws.period_date
  ORDER BY ds.period_date;
END;
$$ LANGUAGE plpgsql;

-- 5. 获取预警建议的函数
CREATE OR REPLACE FUNCTION get_warning_recommendations(
  p_student_id TEXT DEFAULT NULL,
  p_class_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  type TEXT,
  description TEXT,
  priority INTEGER,
  actions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH student_warnings AS (
    SELECT 
      w.student_id,
      wr.category,
      wr.severity,
      COUNT(*) as warning_count
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    WHERE w.status = 'active'
    AND (p_student_id IS NULL OR w.student_id = p_student_id)
    GROUP BY w.student_id, wr.category, wr.severity
  ),
  class_warnings AS (
    SELECT 
      s.class_name,
      wr.category,
      COUNT(*) as class_warning_count
    FROM warning_records w
    JOIN warning_rules wr ON w.rule_id = wr.id
    JOIN students s ON w.student_id = s.student_id
    WHERE w.status = 'active'
    AND (p_class_id IS NULL OR s.class_name = p_class_id)
    GROUP BY s.class_name, wr.category
  )
  -- 基于学生预警生成建议
  SELECT 
    '个人干预',
    CASE 
      WHEN sw.category = 'grade' THEN '学生存在学业困难，建议进行学业辅导'
      WHEN sw.category = 'homework' THEN '学生作业完成情况不佳，建议加强作业监督'
      WHEN sw.category = 'attendance' THEN '学生出勤率低，建议关注出勤情况'
      WHEN sw.category = 'behavior' THEN '学生行为表现需要改善，建议进行行为干预'
      ELSE '学生需要综合关注和支持'
    END,
    CASE 
      WHEN sw.severity = 'high' THEN 9
      WHEN sw.severity = 'medium' THEN 6
      ELSE 3
    END,
    CASE 
      WHEN sw.category = 'grade' THEN ARRAY['安排一对一辅导', '制定学习计划', '家长沟通']
      WHEN sw.category = 'homework' THEN ARRAY['设立作业提醒', '建立奖励机制', '课后跟踪']
      WHEN sw.category = 'attendance' THEN ARRAY['了解缺勤原因', '家长联系', '制定出勤计划']
      WHEN sw.category = 'behavior' THEN ARRAY['行为矫正计划', '心理咨询', '同伴支持']
      ELSE ARRAY['综合评估', '制定个性化方案', '定期跟踪']
    END
  FROM student_warnings sw
  WHERE sw.warning_count >= 1
  
  UNION ALL
  
  -- 基于班级预警生成建议
  SELECT 
    '班级管理',
    CASE 
      WHEN cw.category = 'grade' THEN '班级整体学业水平需要提升'
      WHEN cw.category = 'homework' THEN '班级作业完成率需要改善'
      WHEN cw.category = 'attendance' THEN '班级出勤率需要关注'
      WHEN cw.category = 'behavior' THEN '班级纪律需要加强管理'
      ELSE '班级综合表现需要提升'
    END,
    CASE 
      WHEN cw.class_warning_count >= 10 THEN 8
      WHEN cw.class_warning_count >= 5 THEN 5
      ELSE 2
    END,
    CASE 
      WHEN cw.category = 'grade' THEN ARRAY['调整教学方法', '增加练习', '分层教学']
      WHEN cw.category = 'homework' THEN ARRAY['优化作业设计', '建立检查机制', '提高作业质量']
      WHEN cw.category = 'attendance' THEN ARRAY['强化出勤管理', '家校合作', '激励措施']
      WHEN cw.category = 'behavior' THEN ARRAY['加强班级管理', '建立班规', '正向激励']
      ELSE ARRAY['全面班级建设', '师生沟通', '家长会议']
    END
  FROM class_warnings cw
  WHERE cw.class_warning_count >= 3
  
  ORDER BY priority DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 6. 批量更新预警状态的优化函数
CREATE OR REPLACE FUNCTION batch_update_warning_status(
  p_warning_ids UUID[],
  p_new_status TEXT,
  p_resolution_notes TEXT DEFAULT NULL,
  p_resolved_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- 验证状态值
  IF p_new_status NOT IN ('active', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION '无效的预警状态: %', p_new_status;
  END IF;
  
  -- 批量更新
  UPDATE warning_records 
  SET 
    status = p_new_status,
    resolved_at = CASE 
      WHEN p_new_status IN ('resolved', 'dismissed') THEN now()
      ELSE NULL 
    END,
    resolved_by = CASE 
      WHEN p_new_status IN ('resolved', 'dismissed') THEN p_resolved_by
      ELSE NULL 
    END,
    resolution_notes = CASE 
      WHEN p_new_status IN ('resolved', 'dismissed') THEN p_resolution_notes
      ELSE resolution_notes 
    END,
    updated_at = now()
  WHERE id = ANY(p_warning_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- 记录操作日志（可选）
  INSERT INTO warning_operation_logs (
    operation_type,
    affected_records,
    operator_id,
    details
  ) VALUES (
    'batch_status_update',
    updated_count,
    p_resolved_by,
    jsonb_build_object(
      'new_status', p_new_status,
      'warning_ids', p_warning_ids,
      'notes', p_resolution_notes
    )
  );
  
  RETURN updated_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '批量更新预警状态失败: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建操作日志表（可选）
CREATE TABLE IF NOT EXISTS warning_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  affected_records INTEGER DEFAULT 0,
  operator_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. 创建预警性能视图
CREATE OR REPLACE VIEW warning_performance_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_warnings,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_warnings,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_warnings,
  COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_warnings,
  ROUND(
    COUNT(CASE WHEN status = 'resolved' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(CASE WHEN status IN ('resolved', 'dismissed') THEN 1 END), 0) * 100, 
    2
  ) as resolution_rate,
  COUNT(DISTINCT student_id) as affected_students
FROM warning_records
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 9. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_warning_records_created_status ON warning_records(created_at, status);
CREATE INDEX IF NOT EXISTS idx_warning_records_student_created ON warning_records(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warning_rules_category_active ON warning_rules(category, is_active);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);

-- 10. 添加函数注释
COMMENT ON FUNCTION get_warnings_by_type IS '获取预警类型分布统计，包含趋势分析';
COMMENT ON FUNCTION get_risk_by_class IS '获取班级风险分布统计';
COMMENT ON FUNCTION get_common_risk_factors IS '获取常见风险因素统计，包含趋势分析';
COMMENT ON FUNCTION get_warning_trends IS '获取预警趋势分析数据，支持按天/周/月分组';
COMMENT ON FUNCTION get_warning_recommendations IS '基于当前预警情况生成干预建议';
COMMENT ON FUNCTION batch_update_warning_status IS '批量更新预警记录状态，提高操作效率';

-- 11. 创建性能监控函数
CREATE OR REPLACE FUNCTION get_warning_system_performance()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'total_warnings'::TEXT,
    COUNT(*)::NUMERIC,
    'count'::TEXT,
    '总预警数量'::TEXT
  FROM warning_records
  
  UNION ALL
  
  SELECT 
    'active_warnings'::TEXT,
    COUNT(*)::NUMERIC,
    'count'::TEXT,
    '活跃预警数量'::TEXT
  FROM warning_records 
  WHERE status = 'active'
  
  UNION ALL
  
  SELECT 
    'resolution_rate'::TEXT,
    ROUND(
      COUNT(CASE WHEN status = 'resolved' THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(CASE WHEN status IN ('resolved', 'dismissed') THEN 1 END), 0) * 100, 
      2
    ),
    'percentage'::TEXT,
    '预警解决率'::TEXT
  FROM warning_records
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION ALL
  
  SELECT 
    'avg_resolution_time'::TEXT,
    ROUND(
      EXTRACT(EPOCH FROM AVG(resolved_at - created_at)) / 3600, 
      2
    ),
    'hours'::TEXT,
    '平均解决时间（小时）'::TEXT
  FROM warning_records
  WHERE status = 'resolved' 
  AND resolved_at IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;