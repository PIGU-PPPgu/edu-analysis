-- 创建预警执行记录表
-- 用于跟踪预警规则的自动执行历史和结果

-- 预警执行批次表
CREATE TABLE IF NOT EXISTS warning_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_type TEXT NOT NULL CHECK (execution_type IN ('manual', 'scheduled', 'triggered')),
  trigger_event TEXT, -- 触发事件描述，如 'grade_import', 'homework_submit'
  executed_by UUID REFERENCES auth.users(id), -- 手动执行时的用户ID
  rules_count INTEGER DEFAULT 0, -- 本次执行涉及的规则数量
  matched_students_count INTEGER DEFAULT 0, -- 匹配到的学生数量
  new_warnings_count INTEGER DEFAULT 0, -- 新产生的预警数量
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT, -- 失败时的错误信息
  execution_duration_ms INTEGER, -- 执行耗时（毫秒）
  metadata JSONB DEFAULT '{}', -- 额外的执行信息
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 预警规则执行详情表
CREATE TABLE IF NOT EXISTS warning_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES warning_executions(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES warning_rules(id) ON DELETE CASCADE,
  rule_snapshot JSONB NOT NULL, -- 执行时规则的完整快照
  affected_students_count INTEGER DEFAULT 0, -- 本规则影响的学生数量
  new_warnings_count INTEGER DEFAULT 0, -- 本规则产生的新预警数量
  execution_sql TEXT, -- 执行的SQL语句（如果适用）
  execution_time_ms INTEGER, -- 本规则的执行耗时
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  error_message TEXT, -- 执行失败的错误信息
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(execution_id, rule_id)
);

-- 预警执行结果表（记录具体匹配的学生和生成的预警）
CREATE TABLE IF NOT EXISTS warning_execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_execution_id UUID NOT NULL REFERENCES warning_rule_executions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL, -- 学生ID（可能是字符串格式）
  student_data JSONB, -- 触发预警时的学生数据快照
  rule_conditions_matched JSONB, -- 匹配的具体条件
  warning_severity TEXT NOT NULL CHECK (warning_severity IN ('low', 'medium', 'high')),
  warning_generated BOOLEAN DEFAULT false, -- 是否实际生成了预警记录
  warning_record_id UUID REFERENCES warning_records(id), -- 生成的预警记录ID
  skip_reason TEXT, -- 如果跳过生成预警，记录原因
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 预警引擎性能统计表
CREATE TABLE IF NOT EXISTS warning_engine_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  executions_count INTEGER DEFAULT 0, -- 当日执行次数
  total_execution_time_ms BIGINT DEFAULT 0, -- 当日总执行时间
  avg_execution_time_ms INTEGER DEFAULT 0, -- 平均执行时间
  rules_executed_count INTEGER DEFAULT 0, -- 执行的规则总数
  students_processed_count INTEGER DEFAULT 0, -- 处理的学生总数
  warnings_generated_count INTEGER DEFAULT 0, -- 生成的预警总数
  success_rate DECIMAL(5,2) DEFAULT 0.00, -- 成功率
  error_count INTEGER DEFAULT 0, -- 错误次数
  metadata JSONB DEFAULT '{}', -- 额外统计信息
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(date)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_warning_executions_created_at ON warning_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warning_executions_status ON warning_executions(status);
CREATE INDEX IF NOT EXISTS idx_warning_executions_type ON warning_executions(execution_type);

CREATE INDEX IF NOT EXISTS idx_warning_rule_executions_execution_id ON warning_rule_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_warning_rule_executions_rule_id ON warning_rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_warning_rule_executions_status ON warning_rule_executions(status);

CREATE INDEX IF NOT EXISTS idx_warning_execution_results_rule_execution_id ON warning_execution_results(rule_execution_id);
CREATE INDEX IF NOT EXISTS idx_warning_execution_results_student_id ON warning_execution_results(student_id);
CREATE INDEX IF NOT EXISTS idx_warning_execution_results_warning_record_id ON warning_execution_results(warning_record_id);

CREATE INDEX IF NOT EXISTS idx_warning_engine_stats_date ON warning_engine_stats(date DESC);

-- 添加RLS策略
ALTER TABLE warning_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_rule_executions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE warning_execution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_engine_stats ENABLE ROW LEVEL SECURITY;

-- RLS策略：管理员和教师可以查看执行记录
CREATE POLICY "管理员和教师可以查看预警执行记录" ON warning_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "管理员和教师可以查看规则执行详情" ON warning_rule_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "管理员和教师可以查看执行结果" ON warning_execution_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "管理员和教师可以查看引擎统计" ON warning_engine_stats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 只有管理员可以执行和修改执行记录
CREATE POLICY "只有管理员可以创建执行记录" ON warning_executions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "只有管理员可以更新执行记录" ON warning_executions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 为其他表添加类似的插入/更新策略
CREATE POLICY "只有管理员可以创建规则执行记录" ON warning_rule_executions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "只有管理员可以更新规则执行记录" ON warning_rule_executions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "只有管理员可以创建执行结果" ON warning_execution_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "只有管理员可以更新引擎统计" ON warning_engine_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 创建触发器自动更新统计信息
CREATE OR REPLACE FUNCTION update_warning_engine_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 当执行完成时，更新当日统计
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO warning_engine_stats (
      date, 
      executions_count, 
      total_execution_time_ms,
      rules_executed_count,
      students_processed_count,
      warnings_generated_count
    ) VALUES (
      CURRENT_DATE,
      1,
      COALESCE(NEW.execution_duration_ms, 0),
      COALESCE(NEW.rules_count, 0),
      COALESCE(NEW.matched_students_count, 0),
      COALESCE(NEW.new_warnings_count, 0)
    )
    ON CONFLICT (date) DO UPDATE SET
      executions_count = warning_engine_stats.executions_count + 1,
      total_execution_time_ms = warning_engine_stats.total_execution_time_ms + COALESCE(NEW.execution_duration_ms, 0),
      rules_executed_count = warning_engine_stats.rules_executed_count + COALESCE(NEW.rules_count, 0),
      students_processed_count = warning_engine_stats.students_processed_count + COALESCE(NEW.matched_students_count, 0),
      warnings_generated_count = warning_engine_stats.warnings_generated_count + COALESCE(NEW.new_warnings_count, 0),
      avg_execution_time_ms = (warning_engine_stats.total_execution_time_ms + COALESCE(NEW.execution_duration_ms, 0)) / (warning_engine_stats.executions_count + 1),
      updated_at = now();
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    -- 更新错误统计
    INSERT INTO warning_engine_stats (date, executions_count, error_count) 
    VALUES (CURRENT_DATE, 1, 1)
    ON CONFLICT (date) DO UPDATE SET
      executions_count = warning_engine_stats.executions_count + 1,
      error_count = warning_engine_stats.error_count + 1,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_warning_engine_stats
  AFTER UPDATE ON warning_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_warning_engine_stats();

-- 添加一些有用的视图
CREATE OR REPLACE VIEW warning_execution_summary AS
SELECT 
  we.id,
  we.execution_type,
  we.status,
  we.rules_count,
  we.matched_students_count,
  we.new_warnings_count,
  we.execution_duration_ms,
  we.created_at,
  we.completed_at,
  COUNT(wre.id) as rule_executions_count,
  COUNT(CASE WHEN wre.status = 'completed' THEN 1 END) as successful_rules,
  COUNT(CASE WHEN wre.status = 'failed' THEN 1 END) as failed_rules
FROM warning_executions we
LEFT JOIN warning_rule_executions wre ON we.id = wre.execution_id
GROUP BY we.id, we.execution_type, we.status, we.rules_count, 
         we.matched_students_count, we.new_warnings_count, 
         we.execution_duration_ms, we.created_at, we.completed_at
ORDER BY we.created_at DESC;

-- 创建最近执行状态的视图
CREATE OR REPLACE VIEW recent_warning_executions AS
SELECT 
  execution_type,
  status,
  rules_count,
  new_warnings_count,
  execution_duration_ms,
  created_at,
  CASE 
    WHEN status = 'completed' THEN '✅ 完成'
    WHEN status = 'running' THEN '🔄 运行中'
    WHEN status = 'failed' THEN '❌ 失败'
    WHEN status = 'cancelled' THEN '⏹️ 已取消'
    ELSE status
  END as status_display
FROM warning_executions
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

COMMENT ON TABLE warning_executions IS '预警执行批次表：记录每次预警规则执行的整体信息';
COMMENT ON TABLE warning_rule_executions IS '预警规则执行详情表：记录每个规则的具体执行情况';  
COMMENT ON TABLE warning_execution_results IS '预警执行结果表：记录规则匹配的学生和生成的预警';
COMMENT ON TABLE warning_engine_stats IS '预警引擎性能统计表：按日期统计预警引擎的运行性能';