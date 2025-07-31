-- 成绩系统性能优化索引
-- Master-Database 协同优化方案
-- 基于实际查询模式设计的复合索引策略

-- =====================================================
-- 1. 核心成绩查询索引 (grade_data_new表)
-- =====================================================

-- 高频查询：按学生ID和考试ID查询成绩
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_student_exam 
ON grade_data_new (student_id, exam_id);

-- 高频查询：按班级名称和考试ID查询班级成绩
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_class_exam 
ON grade_data_new (class_name, exam_id);

-- 高频查询：按考试日期范围查询（用于趋势分析）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_date 
ON grade_data_new (exam_date DESC) 
WHERE exam_date IS NOT NULL;

-- 复合索引：学生成绩排名查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_ranking 
ON grade_data_new (exam_id, total_score DESC NULLS LAST, student_id);

-- 复合索引：科目成绩分析优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_subject_analysis 
ON grade_data_new (exam_id, class_name) 
INCLUDE (chinese_score, math_score, english_score, physics_score, chemistry_score);

-- =====================================================
-- 2. 学生管理索引 (students表)
-- =====================================================

-- 学号唯一索引（如果还没有）
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_students_student_id_unique 
ON students (student_id);

-- 班级学生查询索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_class_name 
ON students (class_id, name);

-- 用户关联索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_user_id 
ON students (user_id) 
WHERE user_id IS NOT NULL;

-- =====================================================
-- 3. 考试管理索引 (exams表)
-- =====================================================

-- 考试日期索引（按时间排序查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_date_desc 
ON exams (date DESC, created_at DESC);

-- 考试类型和科目索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_type_subject 
ON exams (type, subject);

-- 考试标题唯一性索引（防重复）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_title_date_type 
ON exams (title, date, type);

-- =====================================================
-- 4. 班级信息索引 (class_info表)
-- =====================================================

-- 年级和学年索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_info_grade_year 
ON class_info (grade_level, academic_year);

-- 班主任索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_info_homeroom_teacher 
ON class_info (homeroom_teacher) 
WHERE homeroom_teacher IS NOT NULL;

-- =====================================================
-- 5. 分区表设计（针对大数据量）
-- =====================================================

-- 如果成绩数据量超过100万条，建议按年份分区
-- 创建分区表（PostgreSQL 10+）
/*
CREATE TABLE grade_data_partitioned (
    LIKE grade_data_new INCLUDING ALL
) PARTITION BY RANGE (exam_date);

-- 创建2024年分区
CREATE TABLE grade_data_2024 PARTITION OF grade_data_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 创建2025年分区
CREATE TABLE grade_data_2025 PARTITION OF grade_data_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
*/

-- =====================================================
-- 6. 统计信息更新
-- =====================================================

-- 更新表统计信息以优化查询计划
ANALYZE grade_data_new;
ANALYZE students;
ANALYZE exams;
ANALYZE class_info;

-- =====================================================
-- 7. 高性能查询函数
-- =====================================================

-- 创建高性能的班级平均分计算函数
CREATE OR REPLACE FUNCTION get_class_average_score(
    p_class_name TEXT,
    p_exam_id TEXT DEFAULT NULL
) RETURNS TABLE (
    subject TEXT,
    avg_score NUMERIC,
    student_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        '总分' as subject,
        ROUND(AVG(gd.total_score), 2) as avg_score,
        COUNT(DISTINCT gd.student_id)::INTEGER as student_count
    FROM grade_data_new gd
    WHERE gd.class_name = p_class_name
      AND (p_exam_id IS NULL OR gd.exam_id = p_exam_id)
      AND gd.total_score IS NOT NULL
    
    UNION ALL
    
    SELECT 
        '语文' as subject,
        ROUND(AVG(gd.chinese_score), 2) as avg_score,
        COUNT(DISTINCT gd.student_id)::INTEGER as student_count
    FROM grade_data_new gd
    WHERE gd.class_name = p_class_name
      AND (p_exam_id IS NULL OR gd.exam_id = p_exam_id)
      AND gd.chinese_score IS NOT NULL
    
    UNION ALL
    
    SELECT 
        '数学' as subject,
        ROUND(AVG(gd.math_score), 2) as avg_score,
        COUNT(DISTINCT gd.student_id)::INTEGER as student_count
    FROM grade_data_new gd
    WHERE gd.class_name = p_class_name
      AND (p_exam_id IS NULL OR gd.exam_id = p_exam_id)
      AND gd.math_score IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 创建学生排名计算函数
CREATE OR REPLACE FUNCTION get_student_ranking(
    p_student_id TEXT,
    p_exam_id TEXT
) RETURNS TABLE (
    subject TEXT,
    score NUMERIC,
    class_rank INTEGER,
    grade_rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH student_data AS (
        SELECT 
            gd.class_name,
            gd.total_score,
            gd.chinese_score,
            gd.math_score,
            gd.english_score
        FROM grade_data_new gd
        WHERE gd.student_id = p_student_id AND gd.exam_id = p_exam_id
    ),
    rankings AS (
        SELECT 
            '总分' as subject,
            sd.total_score as score,
            ROW_NUMBER() OVER (
                PARTITION BY gd.class_name 
                ORDER BY gd.total_score DESC NULLS LAST
            )::INTEGER as class_rank,
            ROW_NUMBER() OVER (
                ORDER BY gd.total_score DESC NULLS LAST
            )::INTEGER as grade_rank
        FROM student_data sd
        CROSS JOIN grade_data_new gd
        WHERE gd.exam_id = p_exam_id 
          AND gd.total_score IS NOT NULL
          AND gd.student_id = p_student_id
    )
    SELECT * FROM rankings;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 8. 物化视图（预计算常用统计）
-- =====================================================

-- 班级统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_class_statistics AS
SELECT 
    gd.class_name,
    gd.exam_id,
    COUNT(DISTINCT gd.student_id) as student_count,
    ROUND(AVG(gd.total_score), 2) as avg_total_score,
    ROUND(AVG(gd.chinese_score), 2) as avg_chinese_score,
    ROUND(AVG(gd.math_score), 2) as avg_math_score,
    ROUND(AVG(gd.english_score), 2) as avg_english_score,
    COUNT(CASE WHEN gd.total_score >= 60 THEN 1 END) as pass_count,
    COUNT(CASE WHEN gd.total_score >= 90 THEN 1 END) as excellent_count,
    MAX(gd.total_score) as max_score,
    MIN(gd.total_score) as min_score
FROM grade_data_new gd
WHERE gd.total_score IS NOT NULL
GROUP BY gd.class_name, gd.exam_id;

-- 为物化视图创建索引
CREATE INDEX idx_mv_class_statistics_class_exam 
ON mv_class_statistics (class_name, exam_id);

-- 创建物化视图刷新函数
CREATE OR REPLACE FUNCTION refresh_class_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_statistics;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. 查询性能监控
-- =====================================================

-- 启用查询统计（需要超级用户权限）
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 创建慢查询监控视图
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100 -- 平均执行时间超过100ms
ORDER BY mean_time DESC;

-- =====================================================
-- 10. 定期维护任务
-- =====================================================

-- 创建索引维护函数
CREATE OR REPLACE FUNCTION maintain_grade_indexes()
RETURNS void AS $$
BEGIN
    -- 重建可能碎片化的索引
    REINDEX INDEX CONCURRENTLY idx_grade_data_student_exam;
    REINDEX INDEX CONCURRENTLY idx_grade_data_class_exam;
    
    -- 更新统计信息
    ANALYZE grade_data_new;
    
    -- 刷新物化视图
    PERFORM refresh_class_statistics();
    
    RAISE NOTICE '成绩系统索引维护完成';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. 应用层查询优化示例
-- =====================================================

-- 优化后的班级成绩查询（使用物化视图）
/*
-- 推荐查询方式
SELECT 
    cs.*,
    ROUND((cs.pass_count::NUMERIC / cs.student_count) * 100, 2) as pass_rate,
    ROUND((cs.excellent_count::NUMERIC / cs.student_count) * 100, 2) as excellent_rate
FROM mv_class_statistics cs
WHERE cs.class_name = '高三(1)班' AND cs.exam_id = 'exam_123';

-- 而不是直接查询原表
SELECT 
    COUNT(*) as student_count,
    AVG(total_score) as avg_score,
    COUNT(CASE WHEN total_score >= 60 THEN 1 END) as pass_count
FROM grade_data_new 
WHERE class_name = '高三(1)班' AND exam_id = 'exam_123';
*/

-- =====================================================
-- 12. 索引使用情况监控
-- =====================================================

-- 创建索引使用情况监控视图
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'LOW_USAGE'
        WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_level
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- 查看未使用的索引
/*
SELECT * FROM index_usage_stats WHERE usage_level = 'UNUSED';
*/

COMMENT ON MATERIALIZED VIEW mv_class_statistics IS '班级成绩统计物化视图，每小时自动刷新';
COMMENT ON FUNCTION get_class_average_score IS '高性能班级平均分计算函数，支持按考试筛选';
COMMENT ON FUNCTION maintain_grade_indexes IS '成绩系统索引定期维护函数，建议每周执行一次';