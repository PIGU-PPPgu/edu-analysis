-- =============================================
-- 考试成绩表创建脚本
-- 版本: v1.0
-- 日期: 2025-01-21
-- 说明: 创建考试信息和成绩相关表
-- =============================================

-- ========== 1. 考试信息表 ==========
DROP TABLE IF EXISTS exams CASCADE;
CREATE TABLE exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_name VARCHAR(100) NOT NULL,         -- 考试名称
    exam_type exam_type NOT NULL,            -- 类型: monthly/midterm/final/mock
    academic_year VARCHAR(20) NOT NULL,      -- 学年
    semester VARCHAR(20) NOT NULL,           -- 学期
    grade VARCHAR(20) NOT NULL,              -- 年级
    exam_date DATE NOT NULL,                 -- 考试日期
    subjects TEXT[],                         -- 考试科目
    total_score DECIMAL(10,2),              -- 总分
    status VARCHAR(20) DEFAULT 'planned',    -- 状态: planned/ongoing/completed
    metadata JSONB,                          -- 扩展信息（含考试安排等）
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uk_exam UNIQUE (exam_name, grade, exam_date)
);

-- 创建索引
CREATE INDEX idx_exams_date ON exams(exam_date DESC);
CREATE INDEX idx_exams_grade ON exams(grade);
CREATE INDEX idx_exams_type ON exams(exam_type);
CREATE INDEX idx_exams_year_semester ON exams(academic_year, semester);
CREATE INDEX idx_exams_status ON exams(status);

-- 添加注释
COMMENT ON TABLE exams IS '考试信息表';
COMMENT ON COLUMN exams.exam_type IS '考试类型: monthly-月考, midterm-期中, final-期末, mock-模拟';
COMMENT ON COLUMN exams.status IS '状态: planned-计划中, ongoing-进行中, completed-已完成';

-- ========== 2. 考试成绩表 ==========
DROP TABLE IF EXISTS exam_scores CASCADE;
CREATE TABLE exam_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,                -- 学生ID
    exam_id UUID NOT NULL,                   -- 考试ID
    
    -- 各科成绩（根据实际科目动态调整）
    chinese DECIMAL(10,2),                   -- 语文
    math DECIMAL(10,2),                      -- 数学
    english DECIMAL(10,2),                   -- 英语
    physics DECIMAL(10,2),                   -- 物理
    chemistry DECIMAL(10,2),                 -- 化学
    biology DECIMAL(10,2),                   -- 生物
    politics DECIMAL(10,2),                  -- 政治
    history DECIMAL(10,2),                   -- 历史
    geography DECIMAL(10,2),                 -- 地理
    
    -- 统计数据
    total_score DECIMAL(10,2),              -- 总分
    average_score DECIMAL(10,2),            -- 平均分
    class_rank INTEGER,                      -- 班级排名
    grade_rank INTEGER,                      -- 年级排名
    
    -- 进步情况（与上次考试对比）
    progress_score DECIMAL(10,2),           -- 进步分数（正数表示进步）
    progress_rank INTEGER,                   -- 进步名次（正数表示进步）
    
    -- 各科排名（存储在JSONB中，灵活扩展）
    subject_ranks JSONB,                    -- {"chinese": 5, "math": 10, ...}
    
    -- 其他信息
    status VARCHAR(20) DEFAULT 'normal',     -- 状态: normal/absent/cheating/invalid
    absent_subjects TEXT[],                  -- 缺考科目
    remarks TEXT,                            -- 备注
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_scores_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_scores_exam FOREIGN KEY (exam_id) 
        REFERENCES exams(id) ON DELETE CASCADE,
    CONSTRAINT uk_student_exam UNIQUE (student_id, exam_id)
);

-- 创建索引
CREATE INDEX idx_scores_student ON exam_scores(student_id);
CREATE INDEX idx_scores_exam ON exam_scores(exam_id);
CREATE INDEX idx_scores_total ON exam_scores(total_score DESC);
CREATE INDEX idx_scores_class_rank ON exam_scores(exam_id, class_rank);
CREATE INDEX idx_scores_grade_rank ON exam_scores(exam_id, grade_rank);
CREATE INDEX idx_scores_status ON exam_scores(status);

-- 创建复合索引优化查询
CREATE INDEX idx_scores_exam_student_total ON exam_scores(exam_id, student_id, total_score);
CREATE INDEX idx_scores_student_exam_date ON exam_scores(student_id, exam_id);

-- 添加注释
COMMENT ON TABLE exam_scores IS '考试成绩表';
COMMENT ON COLUMN exam_scores.subject_ranks IS '各科排名，JSON格式: {"科目": 排名}';
COMMENT ON COLUMN exam_scores.status IS '状态: normal-正常, absent-缺考, cheating-作弊, invalid-无效';

-- ========== 3. 成绩分析汇总表（物化视图）==========
DROP MATERIALIZED VIEW IF EXISTS score_analysis_summary CASCADE;
CREATE MATERIALIZED VIEW score_analysis_summary AS
SELECT 
    s.id as student_id,
    s.student_no,
    s.name as student_name,
    c.class_name,
    c.grade,
    COUNT(DISTINCT es.exam_id) as exam_count,
    AVG(es.total_score) as avg_total_score,
    MAX(es.total_score) as max_total_score,
    MIN(es.total_score) as min_total_score,
    AVG(es.class_rank) as avg_class_rank,
    AVG(es.grade_rank) as avg_grade_rank,
    MIN(es.class_rank) as best_class_rank,
    MIN(es.grade_rank) as best_grade_rank,
    -- 各科平均分
    AVG(es.chinese) as avg_chinese,
    AVG(es.math) as avg_math,
    AVG(es.english) as avg_english,
    AVG(es.physics) as avg_physics,
    AVG(es.chemistry) as avg_chemistry,
    -- 计算标准差（衡量成绩稳定性）
    STDDEV(es.total_score) as score_stability,
    -- 最近一次考试信息
    MAX(e.exam_date) as last_exam_date,
    NOW() as last_updated
FROM students s
JOIN classes c ON s.class_id = c.id
LEFT JOIN exam_scores es ON s.id = es.student_id
LEFT JOIN exams e ON es.exam_id = e.id
WHERE es.status = 'normal'
GROUP BY s.id, s.student_no, s.name, c.class_name, c.grade;

-- 创建索引优化物化视图查询
CREATE UNIQUE INDEX idx_score_summary_student ON score_analysis_summary(student_id);
CREATE INDEX idx_score_summary_class ON score_analysis_summary(class_name);
CREATE INDEX idx_score_summary_grade ON score_analysis_summary(grade);
CREATE INDEX idx_score_summary_avg_score ON score_analysis_summary(avg_total_score DESC);

-- 添加注释
COMMENT ON MATERIALIZED VIEW score_analysis_summary IS '成绩分析汇总视图，定期刷新';

-- ========== 4. 成绩趋势表 ==========
DROP TABLE IF EXISTS score_trends CASCADE;
CREATE TABLE score_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,                -- 学生ID
    subject VARCHAR(50),                     -- 科目（NULL表示总分）
    period_type VARCHAR(20) NOT NULL,        -- 周期类型: monthly/termly/yearly
    period_value VARCHAR(50) NOT NULL,       -- 周期值: 2024-01/2024-1st/2024
    
    -- 趋势数据
    avg_score DECIMAL(10,2),                -- 平均分
    max_score DECIMAL(10,2),                -- 最高分
    min_score DECIMAL(10,2),                -- 最低分
    trend_direction VARCHAR(20),            -- 趋势方向: up/down/stable
    trend_percentage DECIMAL(10,2),         -- 趋势百分比
    
    -- 统计信息
    exam_count INTEGER,                     -- 考试次数
    rank_improvement INTEGER,               -- 排名进步
    
    metadata JSONB,                         -- 详细数据
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_trends_student FOREIGN KEY (student_id) 
        REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uk_student_period UNIQUE (student_id, subject, period_type, period_value)
);

-- 创建索引
CREATE INDEX idx_trends_student ON score_trends(student_id);
CREATE INDEX idx_trends_period ON score_trends(period_type, period_value);
CREATE INDEX idx_trends_subject ON score_trends(subject);

-- 添加更新触发器
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON exam_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建刷新物化视图的函数
CREATE OR REPLACE FUNCTION refresh_score_analysis()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY score_analysis_summary;
END;
$$ LANGUAGE plpgsql;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ 考试成绩表创建完成';
    RAISE NOTICE '📋 已创建表: exams, exam_scores, score_trends';
    RAISE NOTICE '📊 已创建物化视图: score_analysis_summary';
END $$;