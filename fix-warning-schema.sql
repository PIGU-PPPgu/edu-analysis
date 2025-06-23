-- 修复预警系统数据库架构问题
-- 2025-06-23 创建，用于修复预警分析功能中的字段缺失问题

-- 检查并创建warning_rules表（如果不存在）
DO $$
BEGIN
    -- 检查warning_rules表是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules'
    ) THEN
        -- 创建warning_rules表
        CREATE TABLE warning_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            conditions JSONB NOT NULL DEFAULT '{}',
            severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
            is_active BOOLEAN DEFAULT true,
            is_system BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created warning_rules table';
    END IF;
END $$;

-- 检查并添加缺失的字段
DO $$
BEGIN
    -- 添加scope字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules' 
        AND column_name = 'scope'
    ) THEN
        ALTER TABLE warning_rules 
        ADD COLUMN scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'exam', 'class', 'student'));
        
        RAISE NOTICE 'Added scope column to warning_rules';
    END IF;

    -- 添加category字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE warning_rules 
        ADD COLUMN category TEXT DEFAULT 'grade' CHECK (category IN ('grade', 'attendance', 'behavior', 'progress', 'homework', 'composite'));
        
        RAISE NOTICE 'Added category column to warning_rules';
    END IF;

    -- 添加priority字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE warning_rules 
        ADD COLUMN priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10);
        
        RAISE NOTICE 'Added priority column to warning_rules';
    END IF;

    -- 添加auto_trigger字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules' 
        AND column_name = 'auto_trigger'
    ) THEN
        ALTER TABLE warning_rules 
        ADD COLUMN auto_trigger BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added auto_trigger column to warning_rules';
    END IF;

    -- 添加notification_enabled字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules' 
        AND column_name = 'notification_enabled'
    ) THEN
        ALTER TABLE warning_rules 
        ADD COLUMN notification_enabled BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Added notification_enabled column to warning_rules';
    END IF;

    -- 添加metadata字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_rules' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE warning_rules 
        ADD COLUMN metadata JSONB DEFAULT '{}';
        
        RAISE NOTICE 'Added metadata column to warning_rules';
    END IF;
END $$;

-- 检查并创建warning_records表（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'warning_records'
    ) THEN
        CREATE TABLE warning_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_id UUID NOT NULL,
            rule_id UUID REFERENCES warning_rules(id),
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'escalated')),
            severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
            details JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE,
            resolved_by UUID,
            resolution_notes TEXT
        );
        
        RAISE NOTICE 'Created warning_records table';
    END IF;
END $$;

-- 创建索引（如果不存在）
DO $$
BEGIN
    -- warning_rules索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'warning_rules' 
        AND indexname = 'idx_warning_rules_scope'
    ) THEN
        CREATE INDEX idx_warning_rules_scope ON warning_rules(scope);
        RAISE NOTICE 'Created index idx_warning_rules_scope';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'warning_rules' 
        AND indexname = 'idx_warning_rules_category'
    ) THEN
        CREATE INDEX idx_warning_rules_category ON warning_rules(category);
        RAISE NOTICE 'Created index idx_warning_rules_category';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'warning_rules' 
        AND indexname = 'idx_warning_rules_active_scope'
    ) THEN
        CREATE INDEX idx_warning_rules_active_scope ON warning_rules(is_active, scope);
        RAISE NOTICE 'Created index idx_warning_rules_active_scope';
    END IF;

    -- warning_records索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'warning_records' 
        AND indexname = 'idx_warning_records_student_status'
    ) THEN
        CREATE INDEX idx_warning_records_student_status ON warning_records(student_id, status);
        RAISE NOTICE 'Created index idx_warning_records_student_status';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'warning_records' 
        AND indexname = 'idx_warning_records_created_at'
    ) THEN
        CREATE INDEX idx_warning_records_created_at ON warning_records(created_at);
        RAISE NOTICE 'Created index idx_warning_records_created_at';
    END IF;
END $$;

-- 插入默认预警规则（如果表为空）
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM warning_rules) = 0 THEN
        INSERT INTO warning_rules (name, description, conditions, severity, scope, category, priority, is_active, is_system, auto_trigger) VALUES
        ('连续不及格预警', '学生连续2次考试不及格时触发预警', 
         '{"type": "consecutive_fails", "count": 2, "threshold": 60, "subject": "all"}', 
         'medium', 'global', 'grade', 7, true, true, true),
        
        ('成绩下降预警', '学生成绩连续下降超过15分时触发预警', 
         '{"type": "grade_decline", "decline_threshold": 15, "consecutive_count": 2, "subject": "all"}', 
         'high', 'global', 'progress', 8, true, true, true),
        
        ('单科异常预警', '单科成绩低于班级平均分30分以上时触发预警', 
         '{"type": "subject_anomaly", "deviation_threshold": 30, "comparison": "class_average", "subject": "any"}', 
         'medium', 'global', 'grade', 6, true, true, true),
        
        ('考试不及格预警', '本次考试成绩不及格时触发预警', 
         '{"type": "exam_fail", "threshold": 60, "subject": "all"}', 
         'medium', 'exam', 'grade', 5, true, true, true),
        
        ('考试退步预警', '本次考试相比上次考试成绩下降超过10分时触发预警', 
         '{"type": "exam_regression", "decline_threshold": 10, "comparison": "previous_exam", "subject": "all"}', 
         'medium', 'exam', 'progress', 6, true, true, true);
         
        RAISE NOTICE 'Inserted default warning rules';
    END IF;
END $$;

-- 创建或替换获取适用预警规则的函数
CREATE OR REPLACE FUNCTION get_applicable_warning_rules(
  rule_scope TEXT DEFAULT 'global',
  rule_category TEXT DEFAULT NULL,
  active_only BOOLEAN DEFAULT true
) RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  conditions JSONB,
  severity TEXT,
  scope TEXT,
  category TEXT,
  priority INTEGER,
  is_active BOOLEAN,
  auto_trigger BOOLEAN
) 
LANGUAGE sql
AS $$
  SELECT 
    wr.id,
    wr.name,
    wr.description,
    wr.conditions,
    wr.severity,
    wr.scope,
    wr.category,
    wr.priority,
    wr.is_active,
    wr.auto_trigger
  FROM warning_rules wr
  WHERE 
    (rule_scope IS NULL OR wr.scope = rule_scope)
    AND (rule_category IS NULL OR wr.category = rule_category)
    AND (NOT active_only OR wr.is_active = true)
  ORDER BY wr.priority DESC, wr.created_at DESC;
$$;

-- 更新updated_at触发器函数（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'Created update_updated_at_column function';
    END IF;
END $$;

-- 创建触发器（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_warning_rules_updated_at'
    ) THEN
        CREATE TRIGGER update_warning_rules_updated_at
            BEFORE UPDATE ON warning_rules
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'Created update_warning_rules_updated_at trigger';
    END IF;
END $$;

-- 添加表注释
DO $$
BEGIN
    -- 添加列注释
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warning_rules' AND column_name = 'scope') THEN
        COMMENT ON COLUMN warning_rules.scope IS '规则适用范围: global(全局), exam(考试级), class(班级级), student(学生级)';
        COMMENT ON COLUMN warning_rules.category IS '规则分类: grade(成绩), attendance(出勤), behavior(行为), progress(进步), homework(作业), composite(综合)';
        COMMENT ON COLUMN warning_rules.priority IS '规则优先级: 1-10, 数值越高优先级越高';
        COMMENT ON COLUMN warning_rules.auto_trigger IS '是否自动触发预警';
        COMMENT ON COLUMN warning_rules.notification_enabled IS '是否启用通知';
        COMMENT ON COLUMN warning_rules.metadata IS '规则元数据, 存储额外的配置信息';
    END IF;
END $$;

-- 显示修复完成信息
DO $$
BEGIN
    RAISE NOTICE '======================================';
    RAISE NOTICE '预警系统数据库架构修复完成！';
    RAISE NOTICE '已修复的问题:';
    RAISE NOTICE '1. warning_rules表缺失的scope字段';
    RAISE NOTICE '2. warning_rules表缺失的category等字段';
    RAISE NOTICE '3. 创建了必要的索引';
    RAISE NOTICE '4. 插入了默认预警规则';
    RAISE NOTICE '5. 创建了辅助函数';
    RAISE NOTICE '======================================';
END $$;