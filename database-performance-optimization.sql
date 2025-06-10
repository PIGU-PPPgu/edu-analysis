-- 学生画像系统数据库性能优化脚本
-- 基于性能分析结果实施的数据库优化措施

-- ============================================================================
-- 1. 索引优化 - 基于查询模式创建必要索引
-- ============================================================================

-- 学生表索引优化
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);

-- 成绩数据表索引优化（最重要的优化）
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_subject ON grade_data(subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_score ON grade_data(score) WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_date ON grade_data(exam_date DESC) WHERE exam_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grade_data_created_at ON grade_data(created_at DESC);

-- 复合索引 - 用于常见的查询组合
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_class ON grade_data(exam_id, class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_subject ON grade_data(student_id, subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_subject ON grade_data(class_name, subject) WHERE score IS NOT NULL;

-- 考试表索引
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date DESC);
CREATE INDEX IF NOT EXISTS idx_exams_type ON exams(type);
CREATE INDEX IF NOT EXISTS idx_exams_title ON exams(title);

-- 班级信息表索引
CREATE INDEX IF NOT EXISTS idx_class_info_grade_level ON class_info(grade_level);
CREATE INDEX IF NOT EXISTS idx_class_info_academic_year ON class_info(academic_year);

-- 预警相关表索引
CREATE INDEX IF NOT EXISTS idx_warning_records_student_id ON warning_records(student_id);
CREATE INDEX IF NOT EXISTS idx_warning_records_created_at ON warning_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warning_records_severity ON warning_records(severity);

-- 学生画像表索引
CREATE INDEX IF NOT EXISTS idx_student_portraits_student_id ON student_portraits(student_id);
CREATE INDEX IF NOT EXISTS idx_student_portraits_updated_at ON student_portraits(updated_at DESC);

-- ============================================================================
-- 2. 性能优化视图 - 预计算常用统计数据
-- ============================================================================

-- 班级性能汇总视图
CREATE OR REPLACE VIEW class_performance_summary AS
SELECT 
    c.class_name,
    c.grade_level,
    c.homeroom_teacher,
    COUNT(DISTINCT s.id) as student_count,
    ROUND(AVG(gd.score), 2) as average_score,
    COUNT(CASE WHEN gd.score >= 90 THEN 1 END) as excellent_count,
    COUNT(CASE WHEN gd.score >= 80 AND gd.score < 90 THEN 1 END) as good_count,
    COUNT(CASE WHEN gd.score >= 60 AND gd.score < 80 THEN 1 END) as pass_count,
    COUNT(CASE WHEN gd.score < 60 THEN 1 END) as fail_count,
    ROUND(
        COUNT(CASE WHEN gd.score >= 60 THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(gd.score), 0) * 100, 2
    ) as pass_rate,
    MAX(gd.updated_at) as last_updated
FROM class_info c
LEFT JOIN students s ON c.class_name = s.class_name
LEFT JOIN grade_data gd ON s.student_id = gd.student_id
WHERE gd.score IS NOT NULL
GROUP BY c.class_name, c.grade_level, c.homeroom_teacher;

-- 学生成绩汇总视图
CREATE OR REPLACE VIEW student_grade_summary AS
SELECT 
    s.student_id,
    s.name,
    s.class_name,
    s.grade,
    COUNT(gd.id) as total_records,
    ROUND(AVG(gd.score), 2) as average_score,
    MAX(gd.score) as highest_score,
    MIN(gd.score) as lowest_score,
    COUNT(DISTINCT gd.subject) as subject_count,
    COUNT(DISTINCT gd.exam_id) as exam_count,
    MAX(gd.updated_at) as last_exam_date
FROM students s
LEFT JOIN grade_data gd ON s.student_id = gd.student_id
WHERE gd.score IS NOT NULL
GROUP BY s.student_id, s.name, s.class_name, s.grade;

-- 科目分析视图
CREATE OR REPLACE VIEW subject_analysis_view AS
SELECT 
    gd.subject,
    gd.class_name,
    COUNT(*) as student_count,
    ROUND(AVG(gd.score), 2) as average_score,
    ROUND(STDDEV(gd.score), 2) as score_stddev,
    MAX(gd.score) as max_score,
    MIN(gd.score) as min_score,
    COUNT(CASE WHEN gd.score >= 90 THEN 1 END) as excellent_count,
    ROUND(
        COUNT(CASE WHEN gd.score >= 90 THEN 1 END)::DECIMAL / 
        COUNT(*) * 100, 2
    ) as excellent_rate
FROM grade_data gd
WHERE gd.score IS NOT NULL AND gd.subject IS NOT NULL
GROUP BY gd.subject, gd.class_name;

-- 考试分析视图
CREATE OR REPLACE VIEW exam_analysis_view AS
SELECT 
    e.id as exam_id,
    e.title,
    e.type,
    e.date,
    COUNT(gd.id) as participation_count,
    ROUND(AVG(gd.score), 2) as average_score,
    MAX(gd.score) as highest_score,
    MIN(gd.score) as lowest_score,
    COUNT(DISTINCT gd.class_name) as class_count,
    COUNT(CASE WHEN gd.score >= 60 THEN 1 END) as pass_count,
    ROUND(
        COUNT(CASE WHEN gd.score >= 60 THEN 1 END)::DECIMAL / 
        COUNT(gd.score) * 100, 2
    ) as pass_rate
FROM exams e
LEFT JOIN grade_data gd ON e.id = gd.exam_id
WHERE gd.score IS NOT NULL
GROUP BY e.id, e.title, e.type, e.date;

-- ============================================================================
-- 3. 查询优化函数
-- ============================================================================

-- 获取班级成绩分布的优化函数
CREATE OR REPLACE FUNCTION get_class_score_distribution(
    p_class_name TEXT,
    p_subject TEXT DEFAULT NULL,
    p_exam_id UUID DEFAULT NULL
)
RETURNS TABLE(
    score_range TEXT,
    student_count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH score_ranges AS (
        SELECT 
            CASE 
                WHEN score >= 90 THEN '90-100分'
                WHEN score >= 80 THEN '80-89分'
                WHEN score >= 70 THEN '70-79分'
                WHEN score >= 60 THEN '60-69分'
                ELSE '60分以下'
            END as range,
            score
        FROM grade_data gd
        WHERE gd.class_name = p_class_name
        AND (p_subject IS NULL OR gd.subject = p_subject)
        AND (p_exam_id IS NULL OR gd.exam_id = p_exam_id)
        AND gd.score IS NOT NULL
    ),
    total_count AS (
        SELECT COUNT(*) as total FROM score_ranges
    )
    SELECT 
        sr.range,
        COUNT(*)::BIGINT as count,
        ROUND(COUNT(*)::NUMERIC / tc.total * 100, 2) as pct
    FROM score_ranges sr, total_count tc
    GROUP BY sr.range, tc.total
    ORDER BY 
        CASE sr.range
            WHEN '90-100分' THEN 1
            WHEN '80-89分' THEN 2
            WHEN '70-79分' THEN 3
            WHEN '60-69分' THEN 4
            WHEN '60分以下' THEN 5
        END;
END;
$$ LANGUAGE plpgsql;

-- 获取学生进步趋势的优化函数
CREATE OR REPLACE FUNCTION get_student_progress_trend(
    p_student_id TEXT,
    p_subject TEXT DEFAULT NULL,
    p_limit INT DEFAULT 10
)
RETURNS TABLE(
    exam_date DATE,
    exam_title TEXT,
    subject TEXT,
    score NUMERIC,
    class_average NUMERIC,
    improvement NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH student_scores AS (
        SELECT 
            gd.exam_date,
            gd.exam_title,
            gd.subject,
            gd.score,
            LAG(gd.score) OVER (PARTITION BY gd.subject ORDER BY gd.exam_date) as prev_score
        FROM grade_data gd
        WHERE gd.student_id = p_student_id
        AND (p_subject IS NULL OR gd.subject = p_subject)
        AND gd.score IS NOT NULL
        AND gd.exam_date IS NOT NULL
        ORDER BY gd.exam_date DESC
        LIMIT p_limit
    ),
    class_averages AS (
        SELECT 
            gd.exam_date,
            gd.subject,
            AVG(gd.score) as avg_score
        FROM grade_data gd
        WHERE (p_subject IS NULL OR gd.subject = p_subject)
        AND gd.score IS NOT NULL
        GROUP BY gd.exam_date, gd.subject
    )
    SELECT 
        ss.exam_date,
        ss.exam_title,
        ss.subject,
        ss.score,
        ca.avg_score,
        COALESCE(ss.score - ss.prev_score, 0) as improvement
    FROM student_scores ss
    LEFT JOIN class_averages ca ON ss.exam_date = ca.exam_date AND ss.subject = ca.subject
    ORDER BY ss.exam_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. 数据库维护和优化设置
-- ============================================================================

-- 更新表统计信息（提高查询计划质量）
ANALYZE students;
ANALYZE grade_data;
ANALYZE exams;
ANALYZE class_info;
ANALYZE warning_records;
ANALYZE student_portraits;

-- 设置合适的工作内存（需要数据库管理员权限）
-- 这些设置可以在postgresql.conf中配置
COMMENT ON SCHEMA public IS '
建议的PostgreSQL性能配置:
- shared_buffers = 256MB (或更多，根据可用内存)
- effective_cache_size = 1GB
- random_page_cost = 1.1
- seq_page_cost = 1.0
- work_mem = 4MB
- maintenance_work_mem = 64MB
';

-- ============================================================================
-- 5. 性能监控查询
-- ============================================================================

-- 监控慢查询的视图
CREATE OR REPLACE VIEW slow_queries_monitor AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- 监控索引使用情况
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read = 0 THEN 0 
        ELSE round((idx_tup_fetch::NUMERIC / idx_tup_read) * 100, 2) 
    END as efficiency_pct
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY efficiency_pct DESC;

-- ============================================================================
-- 6. 清理和维护计划
-- ============================================================================

-- 创建定期清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_grade_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 清理6个月前的临时数据
    DELETE FROM grade_data 
    WHERE created_at < NOW() - INTERVAL '6 months'
    AND student_id LIKE 'temp_%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 更新统计信息
    ANALYZE grade_data;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建索引维护函数
CREATE OR REPLACE FUNCTION reindex_performance_tables()
RETURNS TEXT AS $$
BEGIN
    -- 重建关键表的索引
    REINDEX TABLE students;
    REINDEX TABLE grade_data;
    REINDEX TABLE exams;
    
    -- 更新统计信息
    ANALYZE students;
    ANALYZE grade_data;
    ANALYZE exams;
    
    RETURN '索引重建完成';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. 性能测试查询
-- ============================================================================

-- 测试优化后的查询性能
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) FROM students;

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    class_name,
    AVG(score) as avg_score,
    COUNT(*) as student_count
FROM grade_data 
WHERE score IS NOT NULL 
GROUP BY class_name 
ORDER BY avg_score DESC;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM class_performance_summary 
ORDER BY average_score DESC;

-- ============================================================================
-- 8. 备注和使用说明
-- ============================================================================

COMMENT ON VIEW class_performance_summary IS '班级性能汇总视图 - 预计算常用统计指标，提高查询性能';
COMMENT ON VIEW student_grade_summary IS '学生成绩汇总视图 - 学生个人成绩概览';
COMMENT ON VIEW subject_analysis_view IS '科目分析视图 - 各科目成绩分析';
COMMENT ON VIEW exam_analysis_view IS '考试分析视图 - 考试整体分析';

COMMENT ON FUNCTION get_class_score_distribution IS '获取班级成绩分布 - 优化的查询函数';
COMMENT ON FUNCTION get_student_progress_trend IS '获取学生进步趋势 - 时间序列分析';
COMMENT ON FUNCTION cleanup_old_grade_data IS '清理过期数据 - 定期维护函数';
COMMENT ON FUNCTION reindex_performance_tables IS '重建索引 - 性能维护函数';

-- 使用建议:
-- 1. 定期运行 cleanup_old_grade_data() 清理临时数据
-- 2. 每周运行 reindex_performance_tables() 维护索引
-- 3. 使用视图替代复杂查询以提高性能
-- 4. 监控 slow_queries_monitor 和 index_usage_stats 视图
-- 5. 根据实际查询模式调整索引策略

SELECT '数据库性能优化脚本执行完成！' as status; 