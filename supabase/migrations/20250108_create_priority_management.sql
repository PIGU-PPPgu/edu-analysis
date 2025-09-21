-- 重点跟进学生管理系统
-- 创建日期: 2025-01-08
-- 功能: 支持手动添加和算法推荐的混合管理模式

-- 1. 重点跟进学生管理表
CREATE TABLE IF NOT EXISTS priority_student_management (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    
    -- 添加来源和类型
    source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'algorithm', 'hybrid')) DEFAULT 'manual',
    added_by UUID REFERENCES auth.users(id), -- 手动添加时记录添加者
    
    -- 优先级和状态
    priority_level TEXT NOT NULL CHECK (priority_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
    
    -- 标签和分类
    custom_tags TEXT[] DEFAULT '{}',
    category TEXT, -- 如: '学业困难', '行为问题', '心理健康' 等
    
    -- 时间管理
    follow_up_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    follow_up_end_date DATE, -- 跟进期限
    expected_review_date DATE, -- 预期复查日期
    
    -- 详细信息
    reason_description TEXT, -- 添加原因描述
    notes TEXT, -- 备注
    intervention_goals TEXT[], -- 干预目标
    progress_notes JSONB DEFAULT '{}', -- 进展记录
    
    -- 算法相关数据（当source_type为algorithm时）
    algorithm_score NUMERIC, -- 算法评分
    algorithm_factors JSONB, -- 算法考虑的风险因素
    algorithm_version TEXT, -- 算法版本，便于追踪
    
    -- 配置选项
    is_ignored_by_algorithm BOOLEAN DEFAULT false, -- 是否忽略算法推荐
    auto_review_enabled BOOLEAN DEFAULT true, -- 是否启用自动复查
    notification_enabled BOOLEAN DEFAULT true, -- 是否启用通知
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- 唯一性约束：一个学生同时只能有一个活跃的重点跟进记录
    UNIQUE(student_id) WHERE status = 'active'
);

-- 2. 重点跟进历史记录表
CREATE TABLE IF NOT EXISTS priority_student_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    priority_management_id UUID REFERENCES priority_student_management(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    
    -- 操作信息
    action_type TEXT NOT NULL CHECK (action_type IN (
        'added', 'removed', 'priority_changed', 'status_changed', 
        'notes_updated', 'tags_updated', 'reviewed', 'goals_updated'
    )),
    action_description TEXT,
    performed_by UUID REFERENCES auth.users(id),
    
    -- 变更详情
    old_values JSONB,
    new_values JSONB,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 重点跟进干预记录表（扩展原有的跟踪记录）
CREATE TABLE IF NOT EXISTS priority_intervention_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    priority_management_id UUID REFERENCES priority_student_management(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    performed_by UUID REFERENCES auth.users(id),
    
    -- 干预详情
    intervention_type TEXT NOT NULL CHECK (intervention_type IN (
        'meeting', 'phone_call', 'counseling', 'tutoring', 'home_visit', 
        'parent_meeting', 'peer_support', 'behavior_plan', 'academic_plan', 'other'
    )),
    intervention_title TEXT NOT NULL,
    intervention_description TEXT,
    
    -- 时间和持续性
    intervention_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER,
    follow_up_required BOOLEAN DEFAULT false,
    next_follow_up_date DATE,
    
    -- 效果评估
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    student_response TEXT CHECK (student_response IN ('positive', 'neutral', 'negative', 'mixed')),
    goals_progress JSONB, -- 目标进展评估
    
    -- 详细记录
    detailed_notes TEXT,
    resources_used TEXT[],
    participants TEXT[], -- 参与人员
    
    -- 状态管理
    status TEXT DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 增强的学生风险评估视图（整合手动和算法数据）
CREATE OR REPLACE VIEW enhanced_student_priority_view AS
SELECT 
    s.student_id,
    s.name as student_name,
    s.class_name,
    
    -- 重点跟进状态
    psm.id as priority_management_id,
    psm.source_type,
    psm.priority_level,
    psm.status as priority_status,
    psm.custom_tags,
    psm.category,
    psm.follow_up_start_date,
    psm.follow_up_end_date,
    psm.reason_description,
    psm.notes,
    psm.algorithm_score,
    psm.created_at as priority_added_at,
    
    -- 算法数据（如果没有手动记录，从算法计算）
    COALESCE(psm.algorithm_score, 
        CASE 
            WHEN COUNT(wr.id) >= 3 THEN 75
            WHEN COUNT(wr.id) >= 2 THEN 65
            WHEN COUNT(wr.id) >= 1 THEN 55
            ELSE 45
        END
    ) as effective_risk_score,
    
    -- 预警统计
    COUNT(wr.id) FILTER (WHERE wr.status = 'active') as active_warnings_count,
    COUNT(wr.id) as total_warnings_count,
    MAX(wr.created_at) as latest_warning_date,
    
    -- 干预统计
    COUNT(pir.id) as intervention_count,
    MAX(pir.intervention_date) as last_intervention_date,
    AVG(pir.effectiveness_rating) as avg_intervention_effectiveness,
    
    -- 计算最终优先级（手动优先级 > 算法优先级）
    CASE 
        WHEN psm.priority_level IS NOT NULL THEN psm.priority_level
        WHEN COUNT(wr.id) FILTER (WHERE wr.status = 'active') >= 3 THEN 'high'
        WHEN COUNT(wr.id) FILTER (WHERE wr.status = 'active') >= 2 THEN 'medium'
        ELSE 'low'
    END as final_priority,
    
    -- 是否为活跃的重点跟进学生
    CASE WHEN psm.status = 'active' THEN true ELSE false END as is_priority_active
    
FROM students s
LEFT JOIN priority_student_management psm ON s.student_id = psm.student_id AND psm.status = 'active'
LEFT JOIN warning_records wr ON s.student_id = wr.student_id
LEFT JOIN priority_intervention_records pir ON psm.id = pir.priority_management_id
GROUP BY s.student_id, s.name, s.class_name, psm.id, psm.source_type, psm.priority_level, 
         psm.status, psm.custom_tags, psm.category, psm.follow_up_start_date, 
         psm.follow_up_end_date, psm.reason_description, psm.notes, psm.algorithm_score, psm.created_at;

-- 5. 索引优化
CREATE INDEX IF NOT EXISTS idx_priority_student_management_student_id ON priority_student_management(student_id);
CREATE INDEX IF NOT EXISTS idx_priority_student_management_source_type ON priority_student_management(source_type);
CREATE INDEX IF NOT EXISTS idx_priority_student_management_status ON priority_student_management(status);
CREATE INDEX IF NOT EXISTS idx_priority_student_management_priority_level ON priority_student_management(priority_level);
CREATE INDEX IF NOT EXISTS idx_priority_student_management_follow_up_dates ON priority_student_management(follow_up_start_date, follow_up_end_date);
CREATE INDEX IF NOT EXISTS idx_priority_student_history_student_id ON priority_student_history(student_id);
CREATE INDEX IF NOT EXISTS idx_priority_student_history_action_type ON priority_student_history(action_type);
CREATE INDEX IF NOT EXISTS idx_priority_intervention_records_student_id ON priority_intervention_records(student_id);
CREATE INDEX IF NOT EXISTS idx_priority_intervention_records_date ON priority_intervention_records(intervention_date);

-- 6. 触发器：自动更新updated_at时间戳
CREATE OR REPLACE FUNCTION update_priority_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_priority_student_management_updated_at
    BEFORE UPDATE ON priority_student_management
    FOR EACH ROW
    EXECUTE FUNCTION update_priority_updated_at_column();

CREATE TRIGGER update_priority_intervention_records_updated_at
    BEFORE UPDATE ON priority_intervention_records
    FOR EACH ROW
    EXECUTE FUNCTION update_priority_updated_at_column();

-- 7. 触发器：自动记录变更历史
CREATE OR REPLACE FUNCTION record_priority_management_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- 记录变更历史
    IF TG_OP = 'INSERT' THEN
        INSERT INTO priority_student_history (
            priority_management_id, student_id, action_type, action_description,
            performed_by, new_values
        ) VALUES (
            NEW.id, NEW.student_id, 'added', 
            CASE NEW.source_type 
                WHEN 'manual' THEN '手动添加到重点跟进'
                WHEN 'algorithm' THEN '算法推荐添加到重点跟进'
                ELSE '添加到重点跟进'
            END,
            NEW.added_by,
            jsonb_build_object(
                'priority_level', NEW.priority_level,
                'source_type', NEW.source_type,
                'reason_description', NEW.reason_description
            )
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 检查具体变更内容并记录
        IF OLD.priority_level != NEW.priority_level THEN
            INSERT INTO priority_student_history (
                priority_management_id, student_id, action_type, action_description,
                old_values, new_values
            ) VALUES (
                NEW.id, NEW.student_id, 'priority_changed', '优先级已变更',
                jsonb_build_object('priority_level', OLD.priority_level),
                jsonb_build_object('priority_level', NEW.priority_level)
            );
        END IF;
        
        IF OLD.status != NEW.status THEN
            INSERT INTO priority_student_history (
                priority_management_id, student_id, action_type, action_description,
                old_values, new_values
            ) VALUES (
                NEW.id, NEW.student_id, 'status_changed', '状态已变更',
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status)
            );
        END IF;
        
        IF OLD.notes IS DISTINCT FROM NEW.notes THEN
            INSERT INTO priority_student_history (
                priority_management_id, student_id, action_type, action_description
            ) VALUES (
                NEW.id, NEW.student_id, 'notes_updated', '备注已更新'
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO priority_student_history (
            priority_management_id, student_id, action_type, action_description
        ) VALUES (
            OLD.id, OLD.student_id, 'removed', '移出重点跟进'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_record_priority_management_changes
    AFTER INSERT OR UPDATE OR DELETE ON priority_student_management
    FOR EACH ROW
    EXECUTE FUNCTION record_priority_management_changes();

-- 8. RLS 安全策略
ALTER TABLE priority_student_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_student_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_intervention_records ENABLE ROW LEVEL SECURITY;

-- 教师和管理员可以查看和管理重点跟进学生
CREATE POLICY "Teachers and admins can view priority students" ON priority_student_management
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers and admins can manage priority students" ON priority_student_management
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- 类似策略应用到其他表
CREATE POLICY "Teachers and admins can view priority history" ON priority_student_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers and admins can view priority interventions" ON priority_intervention_records
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers and admins can manage priority interventions" ON priority_intervention_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- 9. 添加表注释
COMMENT ON TABLE priority_student_management IS '重点跟进学生管理表，支持手动添加和算法推荐的混合管理模式';
COMMENT ON TABLE priority_student_history IS '重点跟进学生历史记录表，记录所有变更操作';
COMMENT ON TABLE priority_intervention_records IS '重点跟进干预记录表，记录具体的干预措施和效果';
COMMENT ON VIEW enhanced_student_priority_view IS '增强的学生优先级视图，整合手动管理和算法推荐数据';

-- 10. 初始化一些默认数据（可选）
-- 插入一些常用的干预类型说明
INSERT INTO priority_student_management (student_id, source_type, priority_level, reason_description, notes)
SELECT 
    student_id, 
    'algorithm' as source_type,
    'medium' as priority_level,
    '系统初始化 - 基于历史预警数据的算法推荐' as reason_description,
    '由系统自动分析生成，可手动调整优先级和添加备注' as notes
FROM (
    SELECT DISTINCT student_id 
    FROM warning_records 
    WHERE status = 'active' 
    GROUP BY student_id 
    HAVING COUNT(*) >= 2
    LIMIT 5  -- 限制初始数据量
) active_warning_students
ON CONFLICT (student_id) WHERE status = 'active' DO NOTHING;