-- 成绩系统性能优化迁移
-- 创建复合索引、数据库函数和物化视图

-- 1. 创建高性能复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_compound_1 
ON grade_data_new (exam_id, class_name, total_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_compound_2 
ON grade_data_new (class_name, exam_date, total_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_compound_3 
ON grade_data_new (student_id, exam_date);

-- 添加分区键索引（如果使用分区表）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_date 
ON grade_data_new (exam_date);

-- 2. 创建优化的查询函数
CREATE OR REPLACE FUNCTION get_grade_data_optimized(
  p_exam_id UUID DEFAULT NULL,
  p_class_filter TEXT DEFAULT NULL,
  p_grade_level_filter TEXT DEFAULT NULL,
  p_score_min NUMERIC DEFAULT NULL,
  p_score_max NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
BEGIN
  -- 构建动态查询，利用索引
  WITH filtered_data AS (
    SELECT *
    FROM grade_data_new
    WHERE 
      (p_exam_id IS NULL OR exam_id = p_exam_id)
      AND (p_class_filter IS NULL OR class_name = p_class_filter)
      AND (p_grade_level_filter IS NULL OR grade_level = p_grade_level_filter)
      AND (p_score_min IS NULL OR total_score >= p_score_min)
      AND (p_score_max IS NULL OR total_score <= p_score_max)
    ORDER BY total_score DESC
  ),
  paginated_data AS (
    SELECT *
    FROM filtered_data
    LIMIT p_limit OFFSET p_offset
  ),
  count_data AS (
    SELECT COUNT(*) as total FROM filtered_data
  )
  SELECT json_build_object(
    'records', COALESCE(json_agg(pd.*), '[]'::json),
    'total_count', cd.total,
    'statistics', json_build_object(
      'average', AVG(pd.total_score),
      'max', MAX(pd.total_score),
      'min', MIN(pd.total_score),
      'count', COUNT(pd.*)
    )
  )
  INTO result
  FROM paginated_data pd, count_data cd;
  
  RETURN result;
END;
$$;

-- 3. 创建统计计算函数
CREATE OR REPLACE FUNCTION get_grade_statistics(
  p_exam_id UUID,
  p_class_filter TEXT DEFAULT NULL,
  p_subject_filter TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  WITH stats_data AS (
    SELECT 
      COUNT(*) as total,
      AVG(total_score) as average,
      MAX(total_score) as max_score,
      MIN(total_score) as min_score,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_score) as median,
      STDDEV(total_score) as std_dev,
      COUNT(CASE WHEN total_score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
      COUNT(CASE WHEN total_score >= 90 THEN 1 END) * 100.0 / COUNT(*) as excellent_rate
    FROM grade_data_new
    WHERE 
      exam_id = p_exam_id
      AND (p_class_filter IS NULL OR class_name = p_class_filter)
      AND (p_subject_filter IS NULL OR subject = p_subject_filter)
  )
  SELECT json_build_object(
    'total', total,
    'average', ROUND(average, 2),
    'max', max_score,
    'min', min_score,
    'median', ROUND(median, 2),
    'standardDeviation', ROUND(std_dev, 2),
    'passRate', ROUND(pass_rate, 2),
    'excellentRate', ROUND(excellent_rate, 2)
  )
  INTO result
  FROM stats_data;
  
  RETURN result;
END;
$$;

-- 4. 创建班级对比统计函数
CREATE OR REPLACE FUNCTION get_class_comparison_stats(
  p_exam_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  WITH class_stats AS (
    SELECT 
      class_name,
      COUNT(*) as student_count,
      AVG(total_score) as avg_score,
      MAX(total_score) as max_score,
      MIN(total_score) as min_score,
      STDDEV(total_score) as std_dev,
      RANK() OVER (ORDER BY AVG(total_score) DESC) as class_rank
    FROM grade_data_new
    WHERE exam_id = p_exam_id
    GROUP BY class_name
  )
  SELECT json_agg(
    json_build_object(
      'className', class_name,
      'studentCount', student_count,
      'avgScore', ROUND(avg_score, 2),
      'maxScore', max_score,
      'minScore', min_score,
      'stdDev', ROUND(std_dev, 2),
      'classRank', class_rank
    )
  )
  INTO result
  FROM class_stats
  ORDER BY class_rank;
  
  RETURN result;
END;
$$;

-- 5. 创建数据新鲜度检查函数
CREATE OR REPLACE FUNCTION check_data_freshness(
  p_exam_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  last_update TIMESTAMPTZ;
BEGIN
  SELECT MAX(updated_at)
  INTO last_update
  FROM grade_data_new
  WHERE exam_id = p_exam_id;
  
  SELECT json_build_object(
    'lastUpdate', last_update,
    'is_fresh', (EXTRACT(EPOCH FROM (NOW() - last_update)) < 300) -- 5分钟内为新鲜
  )
  INTO result;
  
  RETURN result;
END;
$$;

-- 6. 创建成绩趋势分析物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_grade_trends AS
SELECT 
  student_id,
  exam_date,
  class_name,
  AVG(total_score) OVER (
    PARTITION BY student_id 
    ORDER BY exam_date 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as rolling_avg,
  total_score,
  total_score - LAG(total_score) OVER (
    PARTITION BY student_id 
    ORDER BY exam_date
  ) as score_change,
  RANK() OVER (
    PARTITION BY exam_id 
    ORDER BY total_score DESC
  ) as overall_rank
FROM grade_data_new
WHERE exam_date >= CURRENT_DATE - INTERVAL '1 year';

-- 为物化视图创建索引
CREATE INDEX IF NOT EXISTS idx_mv_grade_trends_student 
ON mv_grade_trends (student_id, exam_date);

-- 7. 创建自动刷新物化视图的函数
CREATE OR REPLACE FUNCTION refresh_grade_trends()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_grade_trends;
END;
$$;

-- 8. 创建触发器自动更新物化视图
CREATE OR REPLACE FUNCTION trigger_refresh_grade_trends()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 异步刷新物化视图（避免阻塞）
  PERFORM pg_notify('refresh_trends', '');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_grade_data_refresh_trends ON grade_data_new;
CREATE TRIGGER tr_grade_data_refresh_trends
AFTER INSERT OR UPDATE OR DELETE ON grade_data_new
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_grade_trends();

-- 9. 优化查询计划的配置
-- 增加统计信息收集频率
ALTER TABLE grade_data_new SET (autovacuum_analyze_scale_factor = 0.02);

-- 10. 创建分区表（可选，用于大数据量场景）
-- 按考试日期分区可以显著提升查询性能
/*
CREATE TABLE IF NOT EXISTS grade_data_partitioned (
  LIKE grade_data_new INCLUDING ALL
) PARTITION BY RANGE (exam_date);

-- 创建分区（按月）
CREATE TABLE IF NOT EXISTS grade_data_y2024m01 
PARTITION OF grade_data_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS grade_data_y2024m02 
PARTITION OF grade_data_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... 更多分区
*/

-- 11. 添加性能监控
CREATE OR REPLACE VIEW v_grade_query_performance AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs
FROM pg_stats 
WHERE tablename = 'grade_data_new'
ORDER BY schemaname, tablename, attname;

-- 12. 权限设置
GRANT EXECUTE ON FUNCTION get_grade_data_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION get_grade_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_comparison_stats TO authenticated;
GRANT EXECUTE ON FUNCTION check_data_freshness TO authenticated;
GRANT SELECT ON mv_grade_trends TO authenticated;

-- 添加注释
COMMENT ON FUNCTION get_grade_data_optimized IS '优化的成绩数据查询函数，支持分页和多条件筛选';
COMMENT ON FUNCTION get_grade_statistics IS '预计算统计数据，避免前端重复计算';
COMMENT ON MATERIALIZED VIEW mv_grade_trends IS '成绩趋势分析物化视图，用于提升趋势分析性能';