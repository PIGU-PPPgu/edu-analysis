-- 预警跟踪系统数据库架构
-- 创建日期: 2025-01-07

-- 1. 预警跟踪记录表
CREATE TABLE IF NOT EXISTS warning_tracking_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    warning_id UUID NOT NULL REFERENCES warning_records(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES auth.users(id),
    student_id TEXT NOT NULL REFERENCES students(student_id),
    
    -- 行动信息
    action_type TEXT NOT NULL CHECK (action_type IN (
        'contact_parent', 
        'student_meeting', 
        'tutoring', 
        'counseling', 
        'home_visit',
        'other'
    )),
    action_description TEXT NOT NULL,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- 跟踪信息
    followup_date DATE,
    followup_completed BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
        'pending', 
        'in_progress', 
        'completed', 
        'follow_up_needed',
        'cancelled'
    )),
    
    -- 效果评估
    effectiveness TEXT DEFAULT 'unknown' CHECK (effectiveness IN (
        'unknown', 
        'low', 
        'medium', 
        'high'
    )),
    improvement_observed BOOLEAN DEFAULT NULL,
    
    -- 详细记录
    notes TEXT,
    additional_notes TEXT,
    resources_used JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. 预警干预结果表
CREATE TABLE IF NOT EXISTS warning_intervention_outcomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    warning_id UUID NOT NULL REFERENCES warning_records(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(student_id),
    
    -- 干预前后对比
    baseline_metrics JSONB, -- 干预前的成绩、行为等指标
    followup_metrics JSONB, -- 干预后的指标
    improvement_percentage NUMERIC,
    
    -- 结果分类
    outcome_category TEXT CHECK (outcome_category IN (
        'significant_improvement',
        'moderate_improvement', 
        'slight_improvement',
        'no_change',
        'deterioration'
    )),
    
    -- 时间信息
    intervention_start_date DATE NOT NULL,
    intervention_end_date DATE,
    measurement_date DATE NOT NULL,
    
    -- 详细分析
    success_factors TEXT[],
    challenge_factors TEXT[],
    recommendations TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 预警处理时间分析表
CREATE TABLE IF NOT EXISTS warning_time_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    warning_id UUID NOT NULL REFERENCES warning_records(id) ON DELETE CASCADE,
    
    -- 时间维度
    warning_created_at TIMESTAMPTZ NOT NULL,
    first_action_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- 计算字段
    response_time_hours INTEGER, -- 首次响应时间（小时）
    resolution_time_hours INTEGER, -- 解决时间（小时）
    total_actions_count INTEGER DEFAULT 0,
    
    -- 分类统计
    severity_level TEXT NOT NULL,
    category TEXT NOT NULL,
    class_name TEXT,
    
    -- 效率指标
    efficiency_score NUMERIC, -- 效率评分 (0-100)
    complexity_score NUMERIC DEFAULT 50, -- 复杂程度评分
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 学生进展监控表
CREATE TABLE IF NOT EXISTS student_progress_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(student_id),
    
    -- 监控周期
    monitoring_period_start DATE NOT NULL,
    monitoring_period_end DATE NOT NULL,
    
    -- 关键指标
    academic_performance JSONB, -- 学业表现指标
    behavioral_indicators JSONB, -- 行为指标
    attendance_metrics JSONB, -- 出勤指标
    
    -- 风险评估
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors TEXT[],
    protective_factors TEXT[],
    
    -- 趋势分析
    performance_trend TEXT CHECK (performance_trend IN ('improving', 'stable', 'declining')),
    trend_confidence NUMERIC DEFAULT 0.5,
    
    -- 预测和建议
    predicted_outcomes JSONB,
    recommended_interventions TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 干预效果统计视图
CREATE OR REPLACE VIEW warning_intervention_stats AS
SELECT 
    wtr.action_type,
    COUNT(*) as total_interventions,
    COUNT(CASE WHEN wtr.effectiveness = 'high' THEN 1 END) as high_effectiveness_count,
    COUNT(CASE WHEN wtr.effectiveness = 'medium' THEN 1 END) as medium_effectiveness_count,
    COUNT(CASE WHEN wtr.effectiveness = 'low' THEN 1 END) as low_effectiveness_count,
    ROUND(AVG(CASE 
        WHEN wtr.effectiveness = 'high' THEN 3
        WHEN wtr.effectiveness = 'medium' THEN 2
        WHEN wtr.effectiveness = 'low' THEN 1
        ELSE 0 
    END), 2) as avg_effectiveness_score,
    COUNT(CASE WHEN wtr.status = 'completed' THEN 1 END) as completed_count,
    ROUND(100.0 * COUNT(CASE WHEN wtr.status = 'completed' THEN 1 END) / COUNT(*), 1) as completion_rate
FROM warning_tracking_records wtr
WHERE wtr.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY wtr.action_type;

-- 6. 学生风险趋势视图
CREATE OR REPLACE VIEW student_risk_trends AS
SELECT 
    spm.student_id,
    s.name as student_name,
    s.class_name,
    spm.risk_level,
    spm.performance_trend,
    spm.trend_confidence,
    COUNT(wr.id) as active_warnings_count,
    MAX(spm.updated_at) as last_assessment_date,
    spm.recommended_interventions
FROM student_progress_monitoring spm
LEFT JOIN students s ON s.student_id = spm.student_id
LEFT JOIN warning_records wr ON wr.student_id = spm.student_id AND wr.status = 'active'
WHERE spm.monitoring_period_end >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY spm.student_id, s.name, s.class_name, spm.risk_level, spm.performance_trend, 
         spm.trend_confidence, spm.recommended_interventions, spm.updated_at;

-- 7. 索引优化
CREATE INDEX IF NOT EXISTS idx_warning_tracking_warning_id ON warning_tracking_records(warning_id);
CREATE INDEX IF NOT EXISTS idx_warning_tracking_student_id ON warning_tracking_records(student_id);
CREATE INDEX IF NOT EXISTS idx_warning_tracking_action_date ON warning_tracking_records(action_date);
CREATE INDEX IF NOT EXISTS idx_warning_tracking_status ON warning_tracking_records(status);
CREATE INDEX IF NOT EXISTS idx_warning_intervention_warning_id ON warning_intervention_outcomes(warning_id);
CREATE INDEX IF NOT EXISTS idx_warning_time_analytics_created ON warning_time_analytics(warning_created_at);
CREATE INDEX IF NOT EXISTS idx_student_progress_monitoring_student ON student_progress_monitoring(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_monitoring_period ON student_progress_monitoring(monitoring_period_start, monitoring_period_end);

-- 8. 触发器：自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_warning_tracking_records_updated_at
    BEFORE UPDATE ON warning_tracking_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warning_intervention_outcomes_updated_at
    BEFORE UPDATE ON warning_intervention_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_progress_monitoring_updated_at
    BEFORE UPDATE ON student_progress_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. 触发器：自动计算时间分析
CREATE OR REPLACE FUNCTION calculate_warning_time_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- 当预警状态更改为resolved时，计算时间分析
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        INSERT INTO warning_time_analytics (
            warning_id,
            warning_created_at,
            first_action_at,
            resolved_at,
            response_time_hours,
            resolution_time_hours,
            total_actions_count,
            severity_level,
            category,
            class_name
        )
        SELECT 
            NEW.id,
            NEW.created_at,
            (SELECT MIN(action_date) FROM warning_tracking_records WHERE warning_id = NEW.id),
            NEW.resolved_at,
            EXTRACT(EPOCH FROM (
                SELECT MIN(action_date) FROM warning_tracking_records WHERE warning_id = NEW.id
            ) - NEW.created_at) / 3600,
            EXTRACT(EPOCH FROM NEW.resolved_at - NEW.created_at) / 3600,
            (SELECT COUNT(*) FROM warning_tracking_records WHERE warning_id = NEW.id),
            wr.severity,
            wr.category,
            s.class_name
        FROM warning_rules wr, students s
        WHERE wr.id = NEW.rule_id AND s.student_id = NEW.student_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_calculate_warning_time_analytics
    AFTER UPDATE ON warning_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_warning_time_analytics();

-- 10. RLS 安全策略
ALTER TABLE warning_tracking_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_intervention_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_time_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress_monitoring ENABLE ROW LEVEL SECURITY;

-- 教师只能查看自己创建的跟踪记录
CREATE POLICY "Teachers can view their own tracking records" ON warning_tracking_records
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own tracking records" ON warning_tracking_records
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own tracking records" ON warning_tracking_records
    FOR UPDATE USING (teacher_id = auth.uid());

-- 管理员可以查看所有记录
CREATE POLICY "Admins can view all tracking records" ON warning_tracking_records
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 类似的策略应用到其他表
CREATE POLICY "Teachers can view intervention outcomes" ON warning_intervention_outcomes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers can view time analytics" ON warning_time_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

CREATE POLICY "Teachers can view progress monitoring" ON student_progress_monitoring
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- 添加注释
COMMENT ON TABLE warning_tracking_records IS '预警跟踪记录表，记录教师对预警的具体处理行动';
COMMENT ON TABLE warning_intervention_outcomes IS '预警干预结果表，记录干预前后的效果对比';
COMMENT ON TABLE warning_time_analytics IS '预警处理时间分析表，用于统计响应时间和处理效率';
COMMENT ON TABLE student_progress_monitoring IS '学生进展监控表，持续跟踪学生的各项指标变化';
COMMENT ON VIEW warning_intervention_stats IS '干预效果统计视图，提供不同干预方式的效果分析';
COMMENT ON VIEW student_risk_trends IS '学生风险趋势视图，显示学生的风险变化趋势';