-- =============================================
-- 预警和分析系统表创建脚本
-- 版本: v1.0
-- 日期: 2025-01-21
-- 说明: 创建预警规则、记录、学生画像等分析表
-- =============================================

-- ========== 1. 预警规则表 ==========
DROP TABLE IF EXISTS warning_rules CASCADE;
CREATE TABLE warning_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,         -- 规则名称
    rule_code VARCHAR(50) UNIQUE,            -- 规则代码
    rule_type VARCHAR(50) NOT NULL,          -- 类型: score/attendance/homework/behavior/trend
    description TEXT,                        -- 描述
    
    -- 触发条件（JSON格式存储复杂条件）
    conditions JSONB NOT NULL,               -- 触发条件
    /* 条件示例:
    {
        "type": "score_drop",
        "threshold": -10,
        "subject": "math",
        "consecutive_times": 2
    }
    */
    
    -- 规则配置
    priority VARCHAR(20) DEFAULT 'medium',   -- 优先级: low/medium/high/critical
    severity warning_level DEFAULT 'warning', -- 严重程度
    check_frequency VARCHAR(20) DEFAULT 'daily', -- 检查频率: realtime/hourly/daily/weekly
    
    -- 触发动作
    actions JSONB,                           -- 触发动作
    /* 动作示例:
    {
        "notify_teacher": true,
        "notify_parent": false,
        "create_task": true,
        "send_email": false
    }
    */
    
    -- 适用范围
    applicable_grades TEXT[],                -- 适用年级
    applicable_subjects TEXT[],              -- 适用科目
    
    -- 管理信息
    is_active BOOLEAN DEFAULT TRUE,          -- 是否启用
    is_system BOOLEAN DEFAULT FALSE,         -- 是否系统规则
    created_by UUID,                         -- 创建人
    approved_by UUID,                        -- 审批人
    approved_at TIMESTAMPTZ,                 -- 审批时间
    
    -- 统计信息
    trigger_count INTEGER DEFAULT 0,         -- 触发次数
    last_triggered_at TIMESTAMPTZ,          -- 最后触发时间
    effectiveness_score DECIMAL(5,2),       -- 有效性评分
    
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_rules_type ON warning_rules(rule_type);
CREATE INDEX idx_rules_priority ON warning_rules(priority);
CREATE INDEX idx_rules_active ON warning_rules(is_active);
CREATE INDEX idx_rules_check_frequency ON warning_rules(check_frequency);
CREATE INDEX idx_rules_conditions ON warning_rules USING GIN(conditions);

-- 添加注释
COMMENT ON TABLE warning_rules IS '预警规则表';
COMMENT ON COLUMN warning_rules.rule_type IS '规则类型: score-成绩, attendance-出勤, homework-作业, behavior-行为, trend-趋势';

-- ========== 2. 预警记录表 ==========
DROP TABLE IF EXISTS warning_records CASCADE;
CREATE TABLE warning_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,                -- 学生ID
    rule_id UUID,                           -- 规则ID（可为空，手动预警时）
    
    -- 预警信息
    warning_level warning_level NOT NULL,    -- 级别: info/warning/danger/critical
    warning_type VARCHAR(50) NOT NULL,       -- 类型（同规则类型）
    title VARCHAR(200) NOT NULL,             -- 标题
    message TEXT NOT NULL,                   -- 详细信息
    
    -- 触发数据
    trigger_data JSONB,                     -- 触发时的数据快照
    related_exam_id UUID,                    -- 相关考试ID
    related_homework_id UUID,                -- 相关作业ID
    
    -- 处理信息
    status VARCHAR(20) DEFAULT 'active',     -- 状态: active/acknowledged/handling/resolved/ignored
    handled_by UUID,                        -- 处理人
    handled_at TIMESTAMPTZ,                 -- 处理时间
    handle_method VARCHAR(50),              -- 处理方式
    resolution TEXT,                        -- 处理结果
    
    -- 跟进信息
    follow_up_required BOOLEAN DEFAULT FALSE, -- 需要跟进
    follow_up_deadline DATE,                -- 跟进截止日期
    follow_up_notes TEXT,                   -- 跟进记录
    
    -- 通知信息
    notified_users UUID[],                  -- 已通知用户
    notified_at TIMESTAMPTZ,                -- 通知时间
    notification_channels TEXT[],           -- 通知渠道
    
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_warning_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_warning_rule FOREIGN KEY (rule_id) 
        REFERENCES warning_rules(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX idx_warnings_student ON warning_records(student_id);
CREATE INDEX idx_warnings_rule ON warning_records(rule_id);
CREATE INDEX idx_warnings_level ON warning_records(warning_level);
CREATE INDEX idx_warnings_type ON warning_records(warning_type);
CREATE INDEX idx_warnings_status ON warning_records(status);
CREATE INDEX idx_warnings_created ON warning_records(created_at DESC);
-- 活跃预警索引
CREATE INDEX idx_warnings_active ON warning_records(status, student_id) 
    WHERE status IN ('active', 'handling');

-- 添加注释
COMMENT ON TABLE warning_records IS '预警记录表';
COMMENT ON COLUMN warning_records.status IS '状态: active-活跃, acknowledged-已确认, handling-处理中, resolved-已解决, ignored-已忽略';

-- ========== 3. 学生画像表 ==========
DROP TABLE IF EXISTS student_portraits CASCADE;
CREATE TABLE student_portraits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL UNIQUE,         -- 学生ID
    
    -- 学业分析
    academic_level VARCHAR(20),              -- 学业水平: excellent/good/average/below_average/poor
    learning_style VARCHAR(50),              -- 学习风格: visual/auditory/kinesthetic/mixed
    learning_pace VARCHAR(20),               -- 学习节奏: fast/normal/slow
    strengths TEXT[],                        -- 优势科目
    weaknesses TEXT[],                       -- 薄弱科目
    potential_score DECIMAL(10,2),          -- 潜力分数
    
    -- 行为特征
    attendance_rate DECIMAL(5,2),           -- 出勤率
    homework_completion_rate DECIMAL(5,2),   -- 作业完成率
    homework_quality_score DECIMAL(5,2),    -- 作业质量分
    participation_score DECIMAL(5,2),       -- 课堂参与度
    discipline_score DECIMAL(5,2),          -- 纪律分数
    
    -- 心理特征
    stress_level VARCHAR(20),               -- 压力水平: low/medium/high
    motivation_level VARCHAR(20),           -- 动力水平: low/medium/high
    confidence_level VARCHAR(20),           -- 自信水平: low/medium/high
    social_adaptability VARCHAR(20),        -- 社交适应性: good/average/poor
    
    -- 风险评估
    risk_level VARCHAR(20),                 -- 风险等级: low/medium/high/critical
    risk_factors JSONB,                     -- 风险因素
    dropout_probability DECIMAL(5,2),       -- 辍学概率
    failure_probability DECIMAL(5,2),       -- 挂科概率
    
    -- AI分析
    ai_tags JSONB,                          -- AI标签
    ai_insights TEXT,                       -- AI洞察
    ai_suggestions TEXT[],                  -- AI建议
    personality_traits JSONB,               -- 性格特征
    learning_preferences JSONB,             -- 学习偏好
    
    -- 目标和计划
    short_term_goals TEXT[],                -- 短期目标
    long_term_goals TEXT[],                 -- 长期目标
    improvement_plan JSONB,                 -- 改进计划
    
    -- 统计数据
    total_exams INTEGER DEFAULT 0,          -- 参加考试次数
    avg_score DECIMAL(10,2),                -- 平均成绩
    score_trend VARCHAR(20),                -- 成绩趋势: rising/stable/declining
    best_rank INTEGER,                      -- 历史最佳排名
    current_rank INTEGER,                   -- 当前排名
    rank_trend VARCHAR(20),                 -- 排名趋势
    
    -- 更新信息
    last_analysis_date TIMESTAMPTZ,         -- 最后分析时间
    analysis_version VARCHAR(20),           -- 分析版本
    confidence_score DECIMAL(5,2),          -- 画像置信度
    
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_portrait_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_portraits_student ON student_portraits(student_id);
CREATE INDEX idx_portraits_level ON student_portraits(academic_level);
CREATE INDEX idx_portraits_risk ON student_portraits(risk_level);
CREATE INDEX idx_portraits_trend ON student_portraits(score_trend);
-- 高风险学生索引
CREATE INDEX idx_portraits_high_risk ON student_portraits(risk_level, student_id) 
    WHERE risk_level IN ('high', 'critical');

-- 添加注释
COMMENT ON TABLE student_portraits IS '学生画像表';
COMMENT ON COLUMN student_portraits.academic_level IS '学业水平: excellent-优秀, good-良好, average-中等, below_average-中下, poor-较差';

-- ========== 4. 预警统计表 ==========
DROP TABLE IF EXISTS warning_statistics CASCADE;
CREATE TABLE warning_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_type VARCHAR(20) NOT NULL,        -- 统计周期: daily/weekly/monthly/termly
    period_date DATE NOT NULL,               -- 统计日期
    period_label VARCHAR(50),                -- 周期标签: "2025年1月"
    
    -- 总体统计
    total_warnings INTEGER DEFAULT 0,        -- 总预警数
    new_warnings INTEGER DEFAULT 0,          -- 新增预警数
    resolved_warnings INTEGER DEFAULT 0,     -- 解决预警数
    pending_warnings INTEGER DEFAULT 0,      -- 待处理预警数
    
    -- 按级别统计
    critical_count INTEGER DEFAULT 0,        -- 严重预警数
    danger_count INTEGER DEFAULT 0,          -- 危险预警数
    warning_count INTEGER DEFAULT 0,         -- 警告数
    info_count INTEGER DEFAULT 0,            -- 提示数
    
    -- 按类型统计
    by_type JSONB,                          -- 按类型统计
    /* 示例:
    {
        "score": 15,
        "attendance": 5,
        "homework": 8,
        "behavior": 3
    }
    */
    
    -- 按班级统计
    by_class JSONB,                         -- 按班级统计
    
    -- 按科目统计
    by_subject JSONB,                       -- 按科目统计
    
    -- 处理情况
    avg_handle_time_hours DECIMAL(10,2),    -- 平均处理时长（小时）
    handle_rate DECIMAL(5,2),               -- 处理率
    resolution_rate DECIMAL(5,2),           -- 解决率
    
    -- 趋势分析
    trend_direction VARCHAR(20),            -- 趋势方向: improving/stable/worsening
    trend_percentage DECIMAL(10,2),         -- 趋势百分比
    
    -- 重点关注
    top_students UUID[],                    -- 预警最多的学生
    top_rules UUID[],                       -- 触发最多的规则
    critical_cases JSONB,                   -- 重点案例
    
    metadata JSONB,                         -- 扩展信息
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uk_period_stats UNIQUE (period_type, period_date)
);

-- 创建索引
CREATE INDEX idx_stats_period ON warning_statistics(period_type, period_date DESC);
CREATE INDEX idx_stats_date ON warning_statistics(period_date DESC);

-- 添加注释
COMMENT ON TABLE warning_statistics IS '预警统计表';

-- ========== 5. 学习行为记录表 ==========
DROP TABLE IF EXISTS learning_behaviors CASCADE;
CREATE TABLE learning_behaviors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,               -- 学生ID
    behavior_type VARCHAR(50) NOT NULL,     -- 行为类型: login/study/practice/review/test
    behavior_date DATE NOT NULL,            -- 行为日期
    
    -- 行为详情
    start_time TIMESTAMPTZ,                -- 开始时间
    end_time TIMESTAMPTZ,                  -- 结束时间
    duration_minutes INTEGER,              -- 持续时长（分钟）
    
    -- 学习内容
    subject VARCHAR(50),                   -- 科目
    content_type VARCHAR(50),              -- 内容类型: video/document/exercise/exam
    content_id UUID,                       -- 内容ID
    content_title VARCHAR(200),            -- 内容标题
    
    -- 学习效果
    completion_rate DECIMAL(5,2),          -- 完成率
    accuracy_rate DECIMAL(5,2),            -- 准确率
    score DECIMAL(10,2),                   -- 得分
    
    -- 设备和环境
    device_type VARCHAR(50),               -- 设备类型: pc/mobile/tablet
    ip_address INET,                       -- IP地址
    location VARCHAR(100),                 -- 位置
    
    metadata JSONB,                        -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_behavior_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_behaviors_student ON learning_behaviors(student_id);
CREATE INDEX idx_behaviors_date ON learning_behaviors(behavior_date DESC);
CREATE INDEX idx_behaviors_type ON learning_behaviors(behavior_type);
CREATE INDEX idx_behaviors_subject ON learning_behaviors(subject);

-- 添加更新触发器
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON warning_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warnings_updated_at BEFORE UPDATE ON warning_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portraits_updated_at BEFORE UPDATE ON student_portraits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ 预警和分析系统表创建完成';
    RAISE NOTICE '📋 已创建表: warning_rules, warning_records, student_portraits, warning_statistics, learning_behaviors';
    RAISE NOTICE '📊 包含完整的预警和学生画像功能';
END $$;