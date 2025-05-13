-- 启用pg_cron扩展（需要管理员权限）
-- 在迁移中，这个语句可能需要DBA手动执行
-- 注释掉以避免权限错误，但保留作为参考
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 创建刷新物化视图的存储过程
CREATE OR REPLACE PROCEDURE refresh_all_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'Refreshing class_statistics...';
  REFRESH MATERIALIZED VIEW class_statistics;
  
  RAISE NOTICE 'Refreshing mv_class_subject_stats...';
  REFRESH MATERIALIZED VIEW mv_class_subject_stats;
  
  RAISE NOTICE 'Refreshing mv_class_exam_trends...';
  REFRESH MATERIALIZED VIEW mv_class_exam_trends;
  
  RAISE NOTICE 'Refreshing mv_class_subject_competency...';
  REFRESH MATERIALIZED VIEW mv_class_subject_competency;
  
  RAISE NOTICE 'Refreshing mv_class_subject_correlation...';
  REFRESH MATERIALIZED VIEW mv_class_subject_correlation;
  
  RAISE NOTICE 'All materialized views refreshed successfully.';
END;
$$;

-- 创建一个RPC函数供前端调用以手动刷新视图
CREATE OR REPLACE FUNCTION rpc_refresh_materialized_views()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 检查权限，只允许管理员刷新物化视图
  IF NOT (SELECT is_admin FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only administrators can refresh materialized views';
  END IF;

  CALL refresh_all_materialized_views();
  RETURN '物化视图刷新成功';
EXCEPTION
  WHEN OTHERS THEN
    RETURN '物化视图刷新失败: ' || SQLERRM;
END;
$$;

-- 创建触发器函数，在数据变更时刷新相关物化视图
CREATE OR REPLACE FUNCTION tg_refresh_class_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY class_statistics;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error refreshing class_statistics: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 为数据更改事件创建触发器
CREATE TRIGGER tg_refresh_after_grades_change
AFTER INSERT OR UPDATE OR DELETE ON grades
FOR EACH STATEMENT
EXECUTE FUNCTION tg_refresh_class_statistics();

CREATE TRIGGER tg_refresh_after_students_change
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH STATEMENT
EXECUTE FUNCTION tg_refresh_class_statistics();

CREATE TRIGGER tg_refresh_after_homework_change
AFTER INSERT OR UPDATE OR DELETE ON homework
FOR EACH STATEMENT
EXECUTE FUNCTION tg_refresh_class_statistics();

-- 为其他物化视图创建类似的触发器函数和触发器
-- 这里省略了详细代码，可根据需要添加

-- 如果启用了pg_cron扩展，可以设置定时刷新
-- 注释掉以避免在迁移中执行出错，但保留作为参考
/*
-- 每天凌晨3点刷新所有物化视图
SELECT cron.schedule('0 3 * * *', 'CALL refresh_all_materialized_views()');
*/

-- 创建一个RPC函数，检查物化视图状态
CREATE OR REPLACE FUNCTION check_materialized_views_status()
RETURNS TABLE (
  view_name TEXT,
  exists BOOLEAN,
  last_refresh TIMESTAMPTZ,
  row_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH view_info AS (
    SELECT
      v.matviewname AS view_name,
      TRUE AS exists,
      pg_catalog.pg_stat_get_last_analyze_time(c.oid) AS last_refresh,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.views WHERE table_name = v.matviewname)::BIGINT AS row_count
    FROM pg_catalog.pg_matviews v
    JOIN pg_catalog.pg_class c ON v.matviewname = c.relname
    WHERE v.matviewname IN ('class_statistics', 'mv_class_subject_stats', 'mv_class_exam_trends', 
                            'mv_class_subject_competency', 'mv_class_subject_correlation')
  )
  SELECT 
    m.view_name,
    COALESCE(vi.exists, FALSE) AS exists,
    vi.last_refresh,
    COALESCE(vi.row_count, 0) AS row_count
  FROM 
    (VALUES 
      ('class_statistics'),
      ('mv_class_subject_stats'),
      ('mv_class_exam_trends'),
      ('mv_class_subject_competency'),
      ('mv_class_subject_correlation')
    ) AS m(view_name)
  LEFT JOIN view_info vi ON vi.view_name = m.view_name;
END;
$$; 