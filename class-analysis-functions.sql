-- 📊 班级分析优化数据库函数
-- 解决N+1查询问题，提供高性能的批量班级数据查询

-- 1. 获取所有班级基础信息和统计
CREATE OR REPLACE FUNCTION get_all_classes_with_stats()
RETURNS TABLE (
    class_name text,
    student_count bigint,
    first_exam_date date
) 
LANGUAGE sql
STABLE
AS $$
    SELECT 
        gd.class_name,
        COUNT(DISTINCT gd.name) as student_count,
        MIN(gd.exam_date)::date as first_exam_date
    FROM grade_data gd
    WHERE gd.class_name IS NOT NULL 
        AND gd.class_name != ''
    GROUP BY gd.class_name
    ORDER BY gd.class_name;
$$;

-- 2. 批量获取班级整体统计数据
CREATE OR REPLACE FUNCTION get_batch_class_overall_stats(class_names text[])
RETURNS TABLE (
    class_name text,
    total_students bigint,
    avg_score numeric,
    median_score numeric,
    std_deviation numeric,
    pass_rate numeric,
    good_rate numeric,
    excellent_rate numeric,
    coefficient_variation numeric
) 
LANGUAGE sql
STABLE
AS $$
    WITH class_scores AS (
        SELECT 
            uvg.class_name,
            uvg.name as student_name,
            AVG(uvg.score) as student_avg_score
        FROM unified_grade_view uvg
        WHERE uvg.class_name = ANY(class_names)
            AND uvg.score IS NOT NULL
            AND uvg.score > 0
        GROUP BY uvg.class_name, uvg.name
    ),
    class_stats AS (
        SELECT 
            cs.class_name,
            COUNT(cs.student_name) as total_students,
            AVG(cs.student_avg_score) as avg_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cs.student_avg_score) as median_score,
            STDDEV_POP(cs.student_avg_score) as std_deviation,
            COUNT(CASE WHEN cs.student_avg_score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
            COUNT(CASE WHEN cs.student_avg_score >= 80 THEN 1 END) * 100.0 / COUNT(*) as good_rate,
            COUNT(CASE WHEN cs.student_avg_score >= 90 THEN 1 END) * 100.0 / COUNT(*) as excellent_rate
        FROM class_scores cs
        GROUP BY cs.class_name
    )
    SELECT 
        cst.class_name,
        cst.total_students,
        ROUND(cst.avg_score, 2) as avg_score,
        ROUND(cst.median_score, 2) as median_score,
        ROUND(cst.std_deviation, 2) as std_deviation,
        ROUND(cst.pass_rate, 2) as pass_rate,
        ROUND(cst.good_rate, 2) as good_rate,
        ROUND(cst.excellent_rate, 2) as excellent_rate,
        ROUND(
            CASE 
                WHEN cst.avg_score > 0 THEN (cst.std_deviation / cst.avg_score) * 100 
                ELSE 0 
            END, 
            2
        ) as coefficient_variation
    FROM class_stats cst
    ORDER BY cst.class_name;
$$;

-- 3. 批量获取班级学科统计数据
CREATE OR REPLACE FUNCTION get_batch_class_subject_stats(class_names text[])
RETURNS TABLE (
    class_name text,
    subject text,
    avg_score numeric,
    median_score numeric,
    std_deviation numeric,
    pass_rate numeric,
    excellent_rate numeric,
    student_count bigint,
    rank_in_grade integer
) 
LANGUAGE sql
STABLE
AS $$
    WITH subject_stats AS (
        SELECT 
            uvg.class_name,
            uvg.subject,
            AVG(uvg.score) as avg_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY uvg.score) as median_score,
            STDDEV_POP(uvg.score) as std_deviation,
            COUNT(CASE WHEN uvg.score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
            COUNT(CASE WHEN uvg.score >= 90 THEN 1 END) * 100.0 / COUNT(*) as excellent_rate,
            COUNT(*) as student_count
        FROM unified_grade_view uvg
        WHERE uvg.class_name = ANY(class_names)
            AND uvg.score IS NOT NULL
            AND uvg.score > 0
        GROUP BY uvg.class_name, uvg.subject
    ),
    grade_rankings AS (
        SELECT 
            ss.class_name,
            ss.subject,
            ss.avg_score,
            ss.median_score,
            ss.std_deviation,
            ss.pass_rate,
            ss.excellent_rate,
            ss.student_count,
            ROW_NUMBER() OVER (
                PARTITION BY ss.subject 
                ORDER BY ss.avg_score DESC
            ) as rank_in_grade
        FROM subject_stats ss
    )
    SELECT 
        gr.class_name,
        gr.subject,
        ROUND(gr.avg_score, 2) as avg_score,
        ROUND(gr.median_score, 2) as median_score,
        ROUND(gr.std_deviation, 2) as std_deviation,
        ROUND(gr.pass_rate, 2) as pass_rate,
        ROUND(gr.excellent_rate, 2) as excellent_rate,
        gr.student_count,
        gr.rank_in_grade::integer
    FROM grade_rankings gr
    ORDER BY gr.class_name, gr.subject;
$$;

-- 4. 批量获取班级分数分布数据
CREATE OR REPLACE FUNCTION get_batch_class_distribution(class_names text[])
RETURNS TABLE (
    class_name text,
    score_range text,
    count bigint,
    percentage numeric,
    q1 numeric,
    q2 numeric,
    q3 numeric,
    min_score numeric,
    max_score numeric
) 
LANGUAGE sql
STABLE
AS $$
    WITH class_scores AS (
        SELECT 
            uvg.class_name,
            uvg.name as student_name,
            AVG(uvg.score) as student_avg_score
        FROM unified_grade_view uvg
        WHERE uvg.class_name = ANY(class_names)
            AND uvg.score IS NOT NULL
            AND uvg.score > 0
        GROUP BY uvg.class_name, uvg.name
    ),
    score_ranges AS (
        SELECT 
            cs.class_name,
            CASE 
                WHEN cs.student_avg_score >= 90 THEN '90-100分(优秀)'
                WHEN cs.student_avg_score >= 80 THEN '80-89分(良好)'
                WHEN cs.student_avg_score >= 70 THEN '70-79分(中等)'
                WHEN cs.student_avg_score >= 60 THEN '60-69分(及格)'
                ELSE '0-59分(不及格)'
            END as score_range,
            cs.student_avg_score
        FROM class_scores cs
    ),
    distribution AS (
        SELECT 
            sr.class_name,
            sr.score_range,
            COUNT(*) as count,
            (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY sr.class_name)) as percentage
        FROM score_ranges sr
        GROUP BY sr.class_name, sr.score_range
    ),
    quartiles AS (
        SELECT 
            cs.class_name,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cs.student_avg_score) as q1,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cs.student_avg_score) as q2,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cs.student_avg_score) as q3,
            MIN(cs.student_avg_score) as min_score,
            MAX(cs.student_avg_score) as max_score
        FROM class_scores cs
        GROUP BY cs.class_name
    )
    SELECT 
        COALESCE(d.class_name, q.class_name) as class_name,
        d.score_range,
        COALESCE(d.count, 0) as count,
        ROUND(COALESCE(d.percentage, 0), 2) as percentage,
        ROUND(q.q1, 2) as q1,
        ROUND(q.q2, 2) as q2,
        ROUND(q.q3, 2) as q3,
        ROUND(q.min_score, 2) as min_score,
        ROUND(q.max_score, 2) as max_score
    FROM distribution d
    FULL OUTER JOIN quartiles q ON d.class_name = q.class_name
    ORDER BY 
        COALESCE(d.class_name, q.class_name),
        CASE d.score_range
            WHEN '90-100分(优秀)' THEN 1
            WHEN '80-89分(良好)' THEN 2
            WHEN '70-79分(中等)' THEN 3
            WHEN '60-69分(及格)' THEN 4
            WHEN '0-59分(不及格)' THEN 5
            ELSE 6
        END;
$$;

-- 5. 批量获取班级时间趋势数据
CREATE OR REPLACE FUNCTION get_batch_class_trends(class_names text[])
RETURNS TABLE (
    class_name text,
    exam_date date,
    exam_title text,
    class_avg_score numeric,
    grade_avg_score numeric,
    relative_performance numeric
) 
LANGUAGE sql
STABLE
AS $$
    WITH exam_class_stats AS (
        SELECT 
            uvg.class_name,
            uvg.exam_date,
            uvg.exam_title,
            AVG(uvg.score) as class_avg_score
        FROM unified_grade_view uvg
        WHERE uvg.class_name = ANY(class_names)
            AND uvg.score IS NOT NULL
            AND uvg.score > 0
            AND uvg.exam_date IS NOT NULL
        GROUP BY uvg.class_name, uvg.exam_date, uvg.exam_title
    ),
    exam_grade_stats AS (
        SELECT 
            uvg.exam_date,
            uvg.exam_title,
            AVG(uvg.score) as grade_avg_score
        FROM unified_grade_view uvg
        WHERE uvg.score IS NOT NULL
            AND uvg.score > 0
            AND uvg.exam_date IS NOT NULL
        GROUP BY uvg.exam_date, uvg.exam_title
    )
    SELECT 
        ecs.class_name,
        ecs.exam_date,
        ecs.exam_title,
        ROUND(ecs.class_avg_score, 2) as class_avg_score,
        ROUND(egs.grade_avg_score, 2) as grade_avg_score,
        ROUND(ecs.class_avg_score - egs.grade_avg_score, 2) as relative_performance
    FROM exam_class_stats ecs
    JOIN exam_grade_stats egs ON ecs.exam_date = egs.exam_date 
        AND ecs.exam_title = egs.exam_title
    ORDER BY ecs.class_name, ecs.exam_date;
$$;

-- 6. 批量获取班级学生分组数据
CREATE OR REPLACE FUNCTION get_batch_class_student_groups(class_names text[])
RETURNS TABLE (
    class_name text,
    group_type text,
    student_name text,
    student_id text,
    avg_score numeric,
    rank_in_class integer,
    subjects_below_60 text,
    improvement_score numeric,
    improvement_subjects text
) 
LANGUAGE sql
STABLE
AS $$
    WITH student_stats AS (
        SELECT 
            uvg.class_name,
            uvg.name as student_name,
            uvg.student_id,
            AVG(uvg.score) as avg_score,
            COUNT(CASE WHEN uvg.score < 60 THEN 1 END) as subjects_below_60_count,
            STRING_AGG(
                CASE WHEN uvg.score < 60 THEN uvg.subject END, 
                ',' ORDER BY uvg.subject
            ) as subjects_below_60
        FROM unified_grade_view uvg
        WHERE uvg.class_name = ANY(class_names)
            AND uvg.score IS NOT NULL
            AND uvg.score > 0
        GROUP BY uvg.class_name, uvg.name, uvg.student_id
    ),
    student_rankings AS (
        SELECT 
            ss.*,
            ROW_NUMBER() OVER (
                PARTITION BY ss.class_name 
                ORDER BY ss.avg_score DESC
            ) as rank_in_class
        FROM student_stats ss
    ),
    improvement_data AS (
        -- 这里需要基于历史数据计算学生进步情况
        -- 简化版本：假设最近考试vs之前考试的对比
        SELECT 
            sr.class_name,
            sr.student_name,
            sr.student_id,
            0 as improvement_score,  -- 需要实际计算
            '' as improvement_subjects  -- 需要实际计算
        FROM student_rankings sr
    ),
    top_students AS (
        SELECT 
            sr.class_name,
            'top' as group_type,
            sr.student_name,
            sr.student_id,
            sr.avg_score,
            sr.rank_in_class,
            sr.subjects_below_60,
            id.improvement_score,
            id.improvement_subjects
        FROM student_rankings sr
        LEFT JOIN improvement_data id ON sr.class_name = id.class_name 
            AND sr.student_name = id.student_name
        WHERE sr.rank_in_class <= 5
    ),
    struggling_students AS (
        SELECT 
            sr.class_name,
            'struggling' as group_type,
            sr.student_name,
            sr.student_id,
            sr.avg_score,
            sr.rank_in_class,
            sr.subjects_below_60,
            id.improvement_score,
            id.improvement_subjects
        FROM student_rankings sr
        LEFT JOIN improvement_data id ON sr.class_name = id.class_name 
            AND sr.student_name = id.student_name
        WHERE sr.avg_score < 60 OR sr.subjects_below_60_count >= 3
    ),
    improved_students AS (
        -- 简化版本：选择平均分在60-80之间的学生作为进步学生
        SELECT 
            sr.class_name,
            'improved' as group_type,
            sr.student_name,
            sr.student_id,
            sr.avg_score,
            sr.rank_in_class,
            sr.subjects_below_60,
            id.improvement_score,
            id.improvement_subjects
        FROM student_rankings sr
        LEFT JOIN improvement_data id ON sr.class_name = id.class_name 
            AND sr.student_name = id.student_name
        WHERE sr.avg_score BETWEEN 60 AND 80 
            AND sr.subjects_below_60_count <= 1
        ORDER BY sr.avg_score DESC
        LIMIT 10
    )
    SELECT * FROM top_students
    UNION ALL
    SELECT * FROM struggling_students
    UNION ALL
    SELECT * FROM improved_students
    ORDER BY class_name, group_type, avg_score DESC;
$$;

-- 7. 创建班级数据变化触发器和通知
CREATE OR REPLACE FUNCTION notify_class_data_change()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('class_data_change', json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'class_name', COALESCE(NEW.class_name, OLD.class_name)
    )::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 在grade_data表上创建触发器
DROP TRIGGER IF EXISTS grade_data_change_trigger ON grade_data;
CREATE TRIGGER grade_data_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON grade_data
    FOR EACH ROW EXECUTE FUNCTION notify_class_data_change();

-- 8. 创建班级分析性能优化的物化视图刷新函数
CREATE OR REPLACE FUNCTION refresh_class_analysis_views()
RETURNS void AS $$
BEGIN
    -- 刷新相关的物化视图
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_subject_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_exam_trends;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_subject_competency;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_subject_correlation;
    
    -- 记录刷新时间
    INSERT INTO system_log (operation, message, created_at) 
    VALUES ('refresh_views', 'Class analysis materialized views refreshed', NOW());
END;
$$ LANGUAGE plpgsql;

-- 9. 创建定时刷新任务 (需要pg_cron扩展)
-- SELECT cron.schedule('refresh-class-views', '0 */2 * * *', 'SELECT refresh_class_analysis_views();');

-- 10. 为函数添加注释
COMMENT ON FUNCTION get_all_classes_with_stats() IS '获取所有班级基础信息和学生数量统计';
COMMENT ON FUNCTION get_batch_class_overall_stats(text[]) IS '批量获取班级整体统计数据，解决N+1查询问题';
COMMENT ON FUNCTION get_batch_class_subject_stats(text[]) IS '批量获取班级学科统计数据和年级排名';
COMMENT ON FUNCTION get_batch_class_distribution(text[]) IS '批量获取班级分数分布和四分位数据';
COMMENT ON FUNCTION get_batch_class_trends(text[]) IS '批量获取班级历史考试趋势数据';
COMMENT ON FUNCTION get_batch_class_student_groups(text[]) IS '批量获取班级学生分组数据(优秀/需帮助/进步学生)';
COMMENT ON FUNCTION refresh_class_analysis_views() IS '刷新班级分析相关的物化视图';

-- 11. 创建索引优化查询性能
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_class_subject 
    ON grade_data(class_name, subject) WHERE class_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_date 
    ON grade_data(exam_date) WHERE exam_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_score_range 
    ON grade_data(class_name, score) WHERE score IS NOT NULL AND score > 0;

-- 12. 创建系统日志表(如果不存在)
CREATE TABLE IF NOT EXISTS system_log (
    id SERIAL PRIMARY KEY,
    operation varchar(50) NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT NOW()
);

COMMENT ON TABLE system_log IS '系统操作日志表，记录重要的系统操作和性能指标';