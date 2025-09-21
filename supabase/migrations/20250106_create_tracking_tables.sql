-- 创建预警追踪相关表
-- 提供详细的执行日志、错误处理和性能监控

-- 1. 创建预警执行记录表
CREATE TABLE IF NOT EXISTS warning_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'auto', 'scheduled', 'import', 'webhook')),
  trigger_source TEXT,
  execution_status TEXT NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  total_rules INTEGER NOT NULL DEFAULT 0,
  executed_rules INTEGER NOT NULL DEFAULT 0,
  matched_students INTEGER NOT NULL DEFAULT 0,
  generated_warnings INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建执行步骤记录表
CREATE TABLE IF NOT EXISTS warning_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES warning_executions(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('rule_validation', 'student_query', 'condition_check', 'warning_creation', 'notification_send')),
  step_name TEXT NOT NULL,
  step_status TEXT NOT NULL DEFAULT 'pending' CHECK (step_status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  execution_time_ms INTEGER,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  stack_trace TEXT,
  rule_id UUID REFERENCES warning_rules(id),
  student_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建执行错误记录表
CREATE TABLE IF NOT EXISTS warning_execution_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES warning_executions(id) ON DELETE CASCADE,
  step_id UUID REFERENCES warning_execution_steps(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('validation', 'database', 'network', 'timeout', 'logic', 'system')),
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  error_context JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_recoverable BOOLEAN NOT NULL DEFAULT true,
  recovery_attempted BOOLEAN NOT NULL DEFAULT false,
  recovery_success BOOLEAN,
  recovery_action TEXT CHECK (recovery_action IN ('retry', 'skip', 'manual')),
  recovery_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 创建性能指标记录表
CREATE TABLE IF NOT EXISTS warning_execution_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES warning_executions(id) ON DELETE CASCADE,
  total_execution_time INTEGER NOT NULL,
  rule_processing_time INTEGER DEFAULT 0,
  database_query_time INTEGER DEFAULT 0,
  warning_creation_time INTEGER DEFAULT 0,
  notification_time INTEGER DEFAULT 0,
  memory_usage_mb NUMERIC(10,2),
  cpu_usage_percent NUMERIC(5,2),
  database_connections INTEGER DEFAULT 0,
  cache_hit_rate NUMERIC(5,2) DEFAULT 0,
  throughput_per_second NUMERIC(10,2) DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 创建审计日志表
CREATE TABLE IF NOT EXISTS warning_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES warning_executions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'execute', 'recover')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('rule', 'execution', 'warning', 'notification')),
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id),
  changes JSONB DEFAULT '{}',
  old_values JSONB DEFAULT '{}',
  new_values JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_warning_executions_status_time ON warning_executions(execution_status, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_warning_executions_trigger_time ON warning_executions(trigger_type, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_warning_executions_created_by ON warning_executions(created_by);

CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_id ON warning_execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_status ON warning_execution_steps(step_status);
CREATE INDEX IF NOT EXISTS idx_execution_steps_rule_id ON warning_execution_steps(rule_id);

CREATE INDEX IF NOT EXISTS idx_execution_errors_execution_id ON warning_execution_errors(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_errors_severity ON warning_execution_errors(severity);
CREATE INDEX IF NOT EXISTS idx_execution_errors_type ON warning_execution_errors(error_type);

CREATE INDEX IF NOT EXISTS idx_execution_performance_execution_id ON warning_execution_performance(execution_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON warning_audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON warning_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON warning_audit_logs(user_id);

-- 7. 创建执行统计函数
CREATE OR REPLACE FUNCTION get_execution_statistics(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH execution_stats AS (
    SELECT 
      COUNT(*) as total_executions,
      COUNT(CASE WHEN execution_status = 'completed' THEN 1 END) as successful_executions,
      COUNT(CASE WHEN execution_status = 'failed' THEN 1 END) as failed_executions,
      AVG(execution_time_ms) as avg_execution_time,
      AVG(success_rate) as avg_success_rate,
      SUM(generated_warnings) as total_warnings,
      SUM(error_count) as total_errors
    FROM warning_executions
    WHERE start_time BETWEEN p_start_date AND p_end_date
  ),
  error_stats AS (
    SELECT 
      error_type,
      COUNT(*) as error_count
    FROM warning_execution_errors e
    JOIN warning_executions ex ON e.execution_id = ex.id
    WHERE ex.start_time BETWEEN p_start_date AND p_end_date
    GROUP BY error_type
  ),
  trigger_stats AS (
    SELECT 
      trigger_type,
      COUNT(*) as execution_count
    FROM warning_executions
    WHERE start_time BETWEEN p_start_date AND p_end_date
    GROUP BY trigger_type
  ),
  daily_stats AS (
    SELECT 
      DATE(start_time) as execution_date,
      COUNT(*) as executions,
      ROUND(AVG(success_rate), 2) as success_rate
    FROM warning_executions
    WHERE start_time BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(start_time)
    ORDER BY execution_date
  )
  SELECT jsonb_build_object(
    'totalExecutions', COALESCE(es.total_executions, 0),
    'successfulExecutions', COALESCE(es.successful_executions, 0),
    'failedExecutions', COALESCE(es.failed_executions, 0),
    'averageExecutionTime', COALESCE(ROUND(es.avg_execution_time), 0),
    'averageSuccessRate', COALESCE(ROUND(es.avg_success_rate, 2), 0),
    'totalWarningsGenerated', COALESCE(es.total_warnings, 0),
    'totalErrorCount', COALESCE(es.total_errors, 0),
    'errorsByType', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('type', error_type, 'count', error_count))
       FROM error_stats), 
      '[]'::jsonb
    ),
    'executionsByTrigger', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('trigger', trigger_type, 'count', execution_count))
       FROM trigger_stats), 
      '[]'::jsonb
    ),
    'dailyStats', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('date', execution_date, 'executions', executions, 'success_rate', success_rate))
       FROM daily_stats), 
      '[]'::jsonb
    )
  ) INTO result
  FROM execution_stats es;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 8. 创建清理历史记录函数
CREATE OR REPLACE FUNCTION cleanup_execution_history(
  p_older_than_days INTEGER DEFAULT 90,
  p_keep_minimum INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
  keep_count INTEGER;
  delete_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- 获取总记录数
  SELECT COUNT(*) INTO total_count FROM warning_executions;
  
  -- 如果总记录数小于最小保留数，不删除
  IF total_count <= p_keep_minimum THEN
    RETURN 0;
  END IF;
  
  -- 计算截止日期
  cutoff_date := NOW() - (p_older_than_days || ' days')::INTERVAL;
  
  -- 计算需要保留的记录数
  keep_count := GREATEST(p_keep_minimum, total_count - (
    SELECT COUNT(*)
    FROM warning_executions
    WHERE start_time < cutoff_date
  ));
  
  -- 删除旧记录（保留最新的记录）
  WITH records_to_delete AS (
    SELECT id
    FROM warning_executions
    WHERE start_time < cutoff_date
    ORDER BY start_time DESC
    OFFSET keep_count
  )
  DELETE FROM warning_executions
  WHERE id IN (SELECT id FROM records_to_delete);
  
  GET DIAGNOSTICS delete_count = ROW_COUNT;
  
  RETURN delete_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建自动更新触发器
CREATE OR REPLACE FUNCTION update_execution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_execution_updated_at
  BEFORE UPDATE ON warning_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_execution_updated_at();

-- 10. 创建审计日志触发器
CREATE OR REPLACE FUNCTION log_warning_execution_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO warning_audit_logs (
      execution_id,
      action_type,
      entity_type,
      entity_id,
      user_id,
      new_values
    ) VALUES (
      NEW.id,
      'create',
      'execution',
      NEW.id,
      NEW.created_by,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO warning_audit_logs (
      execution_id,
      action_type,
      entity_type,
      entity_id,
      user_id,
      old_values,
      new_values,
      changes
    ) VALUES (
      NEW.id,
      'update',
      'execution',
      NEW.id,
      NEW.created_by,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'status_changed', OLD.execution_status != NEW.execution_status,
        'old_status', OLD.execution_status,
        'new_status', NEW.execution_status
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO warning_audit_logs (
      execution_id,
      action_type,
      entity_type,
      entity_id,
      old_values
    ) VALUES (
      OLD.id,
      'delete',
      'execution',
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_execution_changes
  AFTER INSERT OR UPDATE OR DELETE ON warning_executions
  FOR EACH ROW
  EXECUTE FUNCTION log_warning_execution_changes();

-- 11. 创建警告记录变更审计触发器
CREATE OR REPLACE FUNCTION log_warning_record_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO warning_audit_logs (
      action_type,
      entity_type,
      entity_id,
      new_values
    ) VALUES (
      'create',
      'warning',
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO warning_audit_logs (
      action_type,
      entity_type,
      entity_id,
      old_values,
      new_values,
      changes
    ) VALUES (
      'update',
      'warning',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'status_changed', OLD.status != NEW.status,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_warning_changes
  AFTER INSERT OR UPDATE ON warning_records
  FOR EACH ROW
  EXECUTE FUNCTION log_warning_record_changes();

-- 12. 添加RLS策略
ALTER TABLE warning_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_execution_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_execution_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_audit_logs ENABLE ROW LEVEL SECURITY;

-- 只有管理员和教师可以查看执行记录
CREATE POLICY "执行记录查看权限" ON warning_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 只有系统和管理员可以插入执行记录
CREATE POLICY "执行记录创建权限" ON warning_executions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
    OR created_by = auth.uid()
  );

-- 只有创建者和管理员可以更新执行记录
CREATE POLICY "执行记录更新权限" ON warning_executions
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 步骤记录继承执行记录的权限
CREATE POLICY "执行步骤查看权限" ON warning_execution_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM warning_executions we
      WHERE we.id = execution_id
      AND (
        we.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
      )
    )
  );

-- 错误记录的权限策略
CREATE POLICY "执行错误查看权限" ON warning_execution_errors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM warning_executions we
      WHERE we.id = execution_id
      AND (
        we.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
      )
    )
  );

-- 性能记录的权限策略
CREATE POLICY "性能记录查看权限" ON warning_execution_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM warning_executions we
      WHERE we.id = execution_id
      AND (
        we.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
      )
    )
  );

-- 审计日志只有管理员可以查看
CREATE POLICY "审计日志查看权限" ON warning_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 13. 添加表和函数注释
COMMENT ON TABLE warning_executions IS '预警执行记录表，记录每次预警规则执行的详细信息';
COMMENT ON TABLE warning_execution_steps IS '执行步骤记录表，记录每个执行步骤的详细信息';
COMMENT ON TABLE warning_execution_errors IS '执行错误记录表，记录执行过程中的错误信息';
COMMENT ON TABLE warning_execution_performance IS '性能指标记录表，记录执行性能数据';
COMMENT ON TABLE warning_audit_logs IS '审计日志表，记录系统操作的审计信息';

COMMENT ON FUNCTION get_execution_statistics IS '获取指定时间范围内的执行统计数据';
COMMENT ON FUNCTION cleanup_execution_history IS '清理历史执行记录，保留最新的指定数量记录';

-- 14. 创建实时监控视图
CREATE OR REPLACE VIEW warning_execution_monitor AS
SELECT 
  we.id,
  we.trigger_type,
  we.execution_status,
  we.start_time,
  we.end_time,
  we.execution_time_ms,
  we.success_rate,
  we.total_rules,
  we.generated_warnings,
  we.error_count,
  COUNT(wes.id) as total_steps,
  COUNT(CASE WHEN wes.step_status = 'completed' THEN 1 END) as completed_steps,
  COUNT(CASE WHEN wes.step_status = 'failed' THEN 1 END) as failed_steps,
  MAX(wep.memory_usage_mb) as peak_memory_usage,
  AVG(wep.cpu_usage_percent) as avg_cpu_usage
FROM warning_executions we
LEFT JOIN warning_execution_steps wes ON we.id = wes.execution_id
LEFT JOIN warning_execution_performance wep ON we.id = wep.execution_id
GROUP BY we.id, we.trigger_type, we.execution_status, we.start_time, we.end_time, 
         we.execution_time_ms, we.success_rate, we.total_rules, we.generated_warnings, we.error_count
ORDER BY we.start_time DESC;

COMMENT ON VIEW warning_execution_monitor IS '预警执行监控视图，提供执行状态的综合信息';