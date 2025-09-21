-- 创建预警系统自动触发机制
-- 在数据变更时自动触发预警检查

-- 1. 创建预警触发队列表
CREATE TABLE IF NOT EXISTS warning_trigger_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event TEXT NOT NULL, -- 触发事件类型
  trigger_data JSONB DEFAULT '{}', -- 触发相关数据
  entity_type TEXT, -- 实体类型 (grade_data, homework_submission, etc.)
  entity_id TEXT, -- 实体ID
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建成绩导入触发函数
CREATE OR REPLACE FUNCTION trigger_warning_on_grade_import()
RETURNS TRIGGER AS $$
BEGIN
  -- 当有新成绩数据导入时，添加到触发队列
  INSERT INTO warning_trigger_queue (
    trigger_event,
    trigger_data,
    entity_type,
    entity_id,
    scheduled_at
  ) VALUES (
    'grade_import',
    jsonb_build_object(
      'student_id', NEW.student_id,
      'exam_title', NEW.exam_title,
      'exam_date', NEW.exam_date,
      'total_score', NEW.total_score,
      'class_name', NEW.class_name
    ),
    'grade_data',
    NEW.id::TEXT,
    now() + INTERVAL '30 seconds' -- 延迟30秒执行，避免批量导入时频繁触发
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建作业提交触发函数
CREATE OR REPLACE FUNCTION trigger_warning_on_homework_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- 当有作业提交时，检查是否需要触发预警
  INSERT INTO warning_trigger_queue (
    trigger_event,
    trigger_data,
    entity_type,
    entity_id,
    scheduled_at
  ) VALUES (
    'homework_submission',
    jsonb_build_object(
      'student_id', NEW.student_id,
      'homework_id', NEW.homework_id,
      'submitted_at', NEW.submitted_at,
      'status', NEW.status
    ),
    'homework_submission',
    NEW.id::TEXT,
    now() + INTERVAL '10 seconds'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建预警规则变更触发函数
CREATE OR REPLACE FUNCTION trigger_warning_on_rule_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 当预警规则发生变更时，触发全面检查
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active) THEN
    INSERT INTO warning_trigger_queue (
      trigger_event,
      trigger_data,
      entity_type,
      entity_id,
      scheduled_at
    ) VALUES (
      'rule_change',
      jsonb_build_object(
        'rule_id', NEW.id,
        'rule_name', NEW.name,
        'operation', TG_OP,
        'is_active', NEW.is_active
      ),
      'warning_rule',
      NEW.id::TEXT,
      now() + INTERVAL '1 minute' -- 规则变更后延迟1分钟执行
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. 创建批量成绩导入检测函数
CREATE OR REPLACE FUNCTION trigger_warning_on_batch_import()
RETURNS TRIGGER AS $$
DECLARE
  recent_imports INTEGER;
BEGIN
  -- 检查最近5分钟内是否有大量成绩导入
  SELECT COUNT(*) INTO recent_imports
  FROM grade_data
  WHERE created_at >= now() - INTERVAL '5 minutes';
  
  -- 如果导入数量超过阈值，触发批量检查
  IF recent_imports >= 10 THEN
    INSERT INTO warning_trigger_queue (
      trigger_event,
      trigger_data,
      entity_type,
      entity_id,
      scheduled_at
    ) VALUES (
      'batch_grade_import',
      jsonb_build_object(
        'import_count', recent_imports,
        'exam_title', NEW.exam_title,
        'exam_date', NEW.exam_date
      ),
      'batch_operation',
      gen_random_uuid()::TEXT,
      now() + INTERVAL '2 minutes'
    )
    ON CONFLICT DO NOTHING; -- 避免重复插入
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS trigger_grade_import_warning ON grade_data;
CREATE TRIGGER trigger_grade_import_warning
  AFTER INSERT ON grade_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_warning_on_grade_import();

DROP TRIGGER IF EXISTS trigger_batch_import_warning ON grade_data;
CREATE TRIGGER trigger_batch_import_warning
  AFTER INSERT ON grade_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_warning_on_batch_import();

DROP TRIGGER IF EXISTS trigger_homework_submission_warning ON homework_submissions;
CREATE TRIGGER trigger_homework_submission_warning
  AFTER INSERT OR UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_warning_on_homework_submission();

DROP TRIGGER IF EXISTS trigger_rule_change_warning ON warning_rules;
CREATE TRIGGER trigger_rule_change_warning
  AFTER INSERT OR UPDATE ON warning_rules
  FOR EACH ROW
  EXECUTE FUNCTION trigger_warning_on_rule_change();

-- 7. 创建队列处理函数
CREATE OR REPLACE FUNCTION process_warning_trigger_queue()
RETURNS TABLE (
  processed_count INTEGER,
  failed_count INTEGER,
  pending_count INTEGER
) AS $$
DECLARE
  trigger_record RECORD;
  processed INTEGER := 0;
  failed INTEGER := 0;
  pending INTEGER := 0;
BEGIN
  -- 处理待处理的触发记录
  FOR trigger_record IN
    SELECT * FROM warning_trigger_queue
    WHERE status = 'pending'
    AND scheduled_at <= now()
    AND retry_count < max_retries
    ORDER BY scheduled_at
    LIMIT 50 -- 每次处理最多50条记录
  LOOP
    BEGIN
      -- 更新状态为处理中
      UPDATE warning_trigger_queue
      SET status = 'processing', processed_at = now()
      WHERE id = trigger_record.id;
      
      -- 根据触发事件类型执行相应操作
      CASE trigger_record.trigger_event
        WHEN 'grade_import', 'homework_submission' THEN
          -- 调用相关预警规则检查
          PERFORM check_student_warnings(trigger_record.trigger_data->>'student_id');
          
        WHEN 'batch_grade_import', 'rule_change' THEN
          -- 触发全面预警检查（通过插入特殊记录到执行队列）
          INSERT INTO warning_executions (
            execution_type,
            trigger_event,
            status,
            metadata
          ) VALUES (
            'triggered',
            trigger_record.trigger_event,
            'pending',
            trigger_record.trigger_data
          );
          
        ELSE
          -- 未知事件类型，记录错误
          RAISE EXCEPTION '未知的触发事件类型: %', trigger_record.trigger_event;
      END CASE;
      
      -- 标记为完成
      UPDATE warning_trigger_queue
      SET status = 'completed', processed_at = now()
      WHERE id = trigger_record.id;
      
      processed := processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- 处理失败，增加重试次数
      UPDATE warning_trigger_queue
      SET 
        status = CASE 
          WHEN retry_count + 1 >= max_retries THEN 'failed'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        error_message = SQLERRM,
        scheduled_at = now() + INTERVAL '5 minutes' -- 5分钟后重试
      WHERE id = trigger_record.id;
      
      failed := failed + 1;
    END;
  END LOOP;
  
  -- 获取剩余待处理数量
  SELECT COUNT(*) INTO pending
  FROM warning_trigger_queue
  WHERE status = 'pending';
  
  RETURN QUERY SELECT processed, failed, pending;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建学生预警检查函数
CREATE OR REPLACE FUNCTION check_student_warnings(target_student_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  rule_record RECORD;
  warning_count INTEGER := 0;
BEGIN
  -- 获取所有活跃的预警规则
  FOR rule_record IN
    SELECT * FROM warning_rules
    WHERE is_active = true
    ORDER BY priority DESC
  LOOP
    -- 根据规则类型检查学生是否匹配
    CASE rule_record.conditions->>'type'
      WHEN 'consecutive_fails' THEN
        IF EXISTS (
          SELECT 1 FROM check_consecutive_fails(
            (rule_record.conditions->>'count')::INTEGER,
            (rule_record.conditions->>'threshold')::NUMERIC,
            rule_record.conditions->>'subject'
          )
          WHERE student_id = target_student_id
        ) THEN
          -- 创建预警记录（如果不存在）
          INSERT INTO warning_records (student_id, rule_id, details, status)
          SELECT target_student_id, rule_record.id, 
                 jsonb_build_object('type', 'consecutive_fails', 'auto_generated', true),
                 'active'
          WHERE NOT EXISTS (
            SELECT 1 FROM warning_records
            WHERE student_id = target_student_id
            AND rule_id = rule_record.id
            AND status = 'active'
          );
          warning_count := warning_count + 1;
        END IF;
        
      WHEN 'grade_decline' THEN
        IF EXISTS (
          SELECT 1 FROM check_grade_decline(
            (rule_record.conditions->>'decline_threshold')::NUMERIC,
            (rule_record.conditions->>'consecutive_count')::INTEGER
          )
          WHERE student_id = target_student_id
        ) THEN
          INSERT INTO warning_records (student_id, rule_id, details, status)
          SELECT target_student_id, rule_record.id,
                 jsonb_build_object('type', 'grade_decline', 'auto_generated', true),
                 'active'
          WHERE NOT EXISTS (
            SELECT 1 FROM warning_records
            WHERE student_id = target_student_id
            AND rule_id = rule_record.id
            AND status = 'active'
          );
          warning_count := warning_count + 1;
        END IF;
        
      -- 可以继续添加其他规则类型的检查
    END CASE;
  END LOOP;
  
  RETURN warning_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建清理过期队列记录的函数
CREATE OR REPLACE FUNCTION cleanup_warning_trigger_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 删除7天前已完成的记录
  DELETE FROM warning_trigger_queue
  WHERE status IN ('completed', 'failed')
  AND created_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建索引优化队列查询性能
CREATE INDEX IF NOT EXISTS idx_warning_trigger_queue_status_scheduled ON warning_trigger_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_warning_trigger_queue_entity ON warning_trigger_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_warning_trigger_queue_created_at ON warning_trigger_queue(created_at);

-- 11. 添加RLS策略
ALTER TABLE warning_trigger_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可以查看触发队列" ON warning_trigger_queue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "系统可以管理触发队列" ON warning_trigger_queue
  FOR ALL USING (
    auth.uid() IS NULL OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 12. 添加注释
COMMENT ON TABLE warning_trigger_queue IS '预警触发队列：管理自动触发的预警检查任务';
COMMENT ON FUNCTION trigger_warning_on_grade_import IS '成绩导入时触发预警检查';
COMMENT ON FUNCTION trigger_warning_on_homework_submission IS '作业提交时触发预警检查';
COMMENT ON FUNCTION trigger_warning_on_rule_change IS '预警规则变更时触发检查';
COMMENT ON FUNCTION process_warning_trigger_queue IS '处理预警触发队列中的待处理任务';
COMMENT ON FUNCTION check_student_warnings IS '检查指定学生的预警规则匹配情况';
COMMENT ON FUNCTION cleanup_warning_trigger_queue IS '清理过期的队列记录';