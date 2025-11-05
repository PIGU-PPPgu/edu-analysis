-- =============================================
-- 作业管理表创建脚本
-- 版本: v1.0
-- 日期: 2025-01-21
-- 说明: 创建作业、提交和知识点相关表
-- =============================================

-- ========== 1. 作业信息表 ==========
DROP TABLE IF EXISTS homeworks CASCADE;
CREATE TABLE homeworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,             -- 作业标题
    description TEXT,                        -- 作业描述
    subject VARCHAR(50) NOT NULL,            -- 科目
    class_id UUID NOT NULL,                  -- 班级ID
    teacher_id UUID NOT NULL,                -- 教师ID
    homework_type VARCHAR(50) DEFAULT 'daily', -- 类型: daily/weekly/holiday/exam
    
    -- 时间相关
    assigned_date TIMESTAMPTZ DEFAULT NOW(), -- 布置时间
    due_date TIMESTAMPTZ NOT NULL,           -- 截止时间
    
    -- 分值设置
    total_score DECIMAL(10,2) DEFAULT 100,   -- 总分
    pass_score DECIMAL(10,2) DEFAULT 60,     -- 及格分
    excellent_score DECIMAL(10,2) DEFAULT 85,-- 优秀分
    
    -- 作业要求
    difficulty VARCHAR(20) DEFAULT 'medium', -- 难度: easy/medium/hard
    estimated_minutes INTEGER,               -- 预计完成时间（分钟）
    requirements TEXT,                       -- 具体要求
    reference_materials JSONB,              -- 参考资料
    attachments JSONB,                      -- 附件列表
    
    -- 完成情况统计
    assigned_count INTEGER DEFAULT 0,       -- 应交人数
    submitted_count INTEGER DEFAULT 0,      -- 已交人数
    graded_count INTEGER DEFAULT 0,        -- 已批改人数
    avg_score DECIMAL(10,2),               -- 平均分
    
    -- 其他
    allow_late BOOLEAN DEFAULT FALSE,      -- 是否允许迟交
    late_penalty DECIMAL(5,2) DEFAULT 0,   -- 迟交扣分比例
    is_published BOOLEAN DEFAULT TRUE,     -- 是否已发布
    status VARCHAR(20) DEFAULT 'active',   -- 状态: draft/active/closed/archived
    metadata JSONB,                        -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_homework_class FOREIGN KEY (class_id) 
        REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_homework_teacher FOREIGN KEY (teacher_id) 
        REFERENCES teachers(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX idx_homeworks_class ON homeworks(class_id);
CREATE INDEX idx_homeworks_teacher ON homeworks(teacher_id);
CREATE INDEX idx_homeworks_subject ON homeworks(subject);
CREATE INDEX idx_homeworks_due_date ON homeworks(due_date);
CREATE INDEX idx_homeworks_status ON homeworks(status);
CREATE INDEX idx_homeworks_type ON homeworks(homework_type);

-- 添加注释
COMMENT ON TABLE homeworks IS '作业信息表';
COMMENT ON COLUMN homeworks.homework_type IS '作业类型: daily-日常, weekly-周末, holiday-假期, exam-考试';
COMMENT ON COLUMN homeworks.status IS '状态: draft-草稿, active-进行中, closed-已关闭, archived-已归档';

-- ========== 2. 作业提交表 ==========
DROP TABLE IF EXISTS homework_submissions CASCADE;
CREATE TABLE homework_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    homework_id UUID NOT NULL,               -- 作业ID
    student_id UUID NOT NULL,                -- 学生ID
    
    -- 提交内容
    content TEXT,                           -- 文本内容
    attachments JSONB,                      -- 附件列表
    submission_type VARCHAR(50) DEFAULT 'online', -- 提交方式: online/offline
    
    -- 时间信息
    submitted_at TIMESTAMPTZ DEFAULT NOW(), -- 提交时间
    is_late BOOLEAN DEFAULT FALSE,         -- 是否迟交
    late_minutes INTEGER,                   -- 迟交分钟数
    
    -- 批改信息
    score DECIMAL(10,2),                   -- 得分
    score_details JSONB,                   -- 各项得分明细
    feedback TEXT,                         -- 教师反馈
    ai_feedback TEXT,                      -- AI反馈
    graded_at TIMESTAMPTZ,                -- 批改时间
    graded_by UUID,                       -- 批改人
    
    -- 修订相关
    revision_count INTEGER DEFAULT 0,      -- 修订次数
    last_revised_at TIMESTAMPTZ,          -- 最后修订时间
    revision_history JSONB,               -- 修订历史
    
    -- 状态
    status VARCHAR(20) DEFAULT 'submitted', -- 状态: draft/submitted/graded/returned/revised
    quality_level VARCHAR(20),            -- 质量等级: excellent/good/pass/fail
    
    metadata JSONB,                       -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_submission_homework FOREIGN KEY (homework_id) 
        REFERENCES homeworks(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uk_homework_student UNIQUE (homework_id, student_id)
);

-- 创建索引
CREATE INDEX idx_submissions_homework ON homework_submissions(homework_id);
CREATE INDEX idx_submissions_student ON homework_submissions(student_id);
CREATE INDEX idx_submissions_status ON homework_submissions(status);
CREATE INDEX idx_submissions_submitted_at ON homework_submissions(submitted_at DESC);
CREATE INDEX idx_submissions_score ON homework_submissions(score DESC);
-- 待批改作业索引
CREATE INDEX idx_submissions_pending ON homework_submissions(status) 
    WHERE status = 'submitted';

-- 添加注释
COMMENT ON TABLE homework_submissions IS '作业提交表';
COMMENT ON COLUMN homework_submissions.status IS '状态: draft-草稿, submitted-已提交, graded-已批改, returned-已退回, revised-已修订';

-- ========== 3. 知识点定义表 ==========
DROP TABLE IF EXISTS knowledge_points CASCADE;
CREATE TABLE knowledge_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject VARCHAR(50) NOT NULL,           -- 科目
    chapter VARCHAR(100),                   -- 章节
    section VARCHAR(100),                   -- 小节
    point_name VARCHAR(200) NOT NULL,       -- 知识点名称
    point_code VARCHAR(50) UNIQUE,          -- 知识点编码
    description TEXT,                       -- 描述
    difficulty_level INTEGER DEFAULT 1,     -- 难度等级: 1-5
    importance_level INTEGER DEFAULT 3,     -- 重要程度: 1-5
    parent_id UUID,                        -- 父知识点ID
    prerequisites UUID[],                   -- 前置知识点
    grade_levels INTEGER[],                -- 适用年级
    keywords TEXT[],                       -- 关键词
    learning_objectives TEXT[],            -- 学习目标
    common_mistakes TEXT[],                -- 常见错误
    teaching_suggestions TEXT,             -- 教学建议
    metadata JSONB,                       -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_point_parent FOREIGN KEY (parent_id) 
        REFERENCES knowledge_points(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_knowledge_subject ON knowledge_points(subject);
CREATE INDEX idx_knowledge_chapter ON knowledge_points(chapter);
CREATE INDEX idx_knowledge_code ON knowledge_points(point_code);
CREATE INDEX idx_knowledge_parent ON knowledge_points(parent_id);
CREATE INDEX idx_knowledge_keywords ON knowledge_points USING GIN(keywords);

-- 添加注释
COMMENT ON TABLE knowledge_points IS '知识点定义表';

-- ========== 4. 知识点掌握表 ==========
DROP TABLE IF EXISTS knowledge_mastery CASCADE;
CREATE TABLE knowledge_mastery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,               -- 学生ID
    knowledge_point_id UUID NOT NULL,       -- 知识点ID
    
    -- 掌握程度
    mastery_level INTEGER DEFAULT 0,       -- 掌握度: 0-100
    mastery_grade VARCHAR(10),            -- 等级: A/B/C/D/E
    confidence_level DECIMAL(5,2),        -- 置信度: 0-100
    
    -- 测试记录
    test_count INTEGER DEFAULT 0,         -- 测试次数
    correct_count INTEGER DEFAULT 0,      -- 正确次数
    correct_rate DECIMAL(5,2),           -- 正确率
    last_test_date TIMESTAMPTZ,          -- 最后测试时间
    last_test_score DECIMAL(10,2),       -- 最后测试得分
    
    -- 学习记录
    study_time_minutes INTEGER DEFAULT 0, -- 学习时长（分钟）
    practice_count INTEGER DEFAULT 0,     -- 练习次数
    review_count INTEGER DEFAULT 0,       -- 复习次数
    last_review_date TIMESTAMPTZ,        -- 最后复习时间
    
    -- 错题相关
    error_count INTEGER DEFAULT 0,        -- 错题数量
    common_errors JSONB,                 -- 常见错误类型
    
    -- AI分析
    ai_analysis TEXT,                    -- AI分析结果
    ai_suggestions TEXT[],               -- AI建议
    weakness_points TEXT[],              -- 薄弱点
    
    metadata JSONB,                      -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_mastery_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_mastery_knowledge FOREIGN KEY (knowledge_point_id) 
        REFERENCES knowledge_points(id) ON DELETE CASCADE,
    CONSTRAINT uk_student_knowledge UNIQUE (student_id, knowledge_point_id),
    CONSTRAINT check_mastery_level CHECK (mastery_level >= 0 AND mastery_level <= 100)
);

-- 创建索引
CREATE INDEX idx_mastery_student ON knowledge_mastery(student_id);
CREATE INDEX idx_mastery_knowledge ON knowledge_mastery(knowledge_point_id);
CREATE INDEX idx_mastery_level ON knowledge_mastery(mastery_level);
CREATE INDEX idx_mastery_grade ON knowledge_mastery(mastery_grade);
-- 薄弱知识点索引
CREATE INDEX idx_mastery_weak ON knowledge_mastery(student_id, mastery_level) 
    WHERE mastery_level < 60;

-- 添加注释
COMMENT ON TABLE knowledge_mastery IS '知识点掌握情况表';
COMMENT ON COLUMN knowledge_mastery.mastery_level IS '掌握程度: 0-100分';
COMMENT ON COLUMN knowledge_mastery.mastery_grade IS '掌握等级: A(90-100), B(80-89), C(70-79), D(60-69), E(0-59)';

-- ========== 5. 作业知识点关联表 ==========
DROP TABLE IF EXISTS homework_knowledge_points CASCADE;
CREATE TABLE homework_knowledge_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    homework_id UUID NOT NULL,              -- 作业ID
    knowledge_point_id UUID NOT NULL,       -- 知识点ID
    weight DECIMAL(5,2) DEFAULT 1.0,       -- 权重
    is_primary BOOLEAN DEFAULT FALSE,      -- 是否主要知识点
    
    CONSTRAINT fk_hk_homework FOREIGN KEY (homework_id) 
        REFERENCES homeworks(id) ON DELETE CASCADE,
    CONSTRAINT fk_hk_knowledge FOREIGN KEY (knowledge_point_id) 
        REFERENCES knowledge_points(id) ON DELETE CASCADE,
    CONSTRAINT uk_homework_knowledge UNIQUE (homework_id, knowledge_point_id)
);

-- 创建索引
CREATE INDEX idx_hk_homework ON homework_knowledge_points(homework_id);
CREATE INDEX idx_hk_knowledge ON homework_knowledge_points(knowledge_point_id);

-- 添加更新触发器
CREATE TRIGGER update_homeworks_updated_at BEFORE UPDATE ON homeworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON homework_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_points_updated_at BEFORE UPDATE ON knowledge_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mastery_updated_at BEFORE UPDATE ON knowledge_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ 作业管理表创建完成';
    RAISE NOTICE '📋 已创建表: homeworks, homework_submissions, knowledge_points, knowledge_mastery, homework_knowledge_points';
    RAISE NOTICE '📊 包含完整的作业和知识点追踪功能';
END $$;