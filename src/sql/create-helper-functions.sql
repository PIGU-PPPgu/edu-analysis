-- 创建一个检查表是否存在的函数
-- 使用方法：SELECT * FROM table_exists('表名');
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT)
RETURNS TABLE ("exists" BOOLEAN) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = table_name
    AND schemaname = 'public'
  );
END;
$$;

-- 为当前用户授予执行权限
GRANT EXECUTE ON FUNCTION table_exists TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists TO anon;
GRANT EXECUTE ON FUNCTION table_exists TO service_role;

-- 创建一个执行任意SQL的函数(需要admin权限)
-- 警告：这个函数有安全风险，只应该在安全的环境中使用
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- 注意：exec_sql函数通常需要rls策略或其他安全限制
-- 在生产环境中，应该限制其使用范围

-- 创建一个函数返回当前用户可以使用的所有函数
CREATE OR REPLACE FUNCTION get_stored_procedures()
RETURNS TABLE (
  name TEXT,
  return_type TEXT,
  argument_types TEXT,
  schema_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::TEXT AS name,
    pg_catalog.pg_get_function_result(p.oid)::TEXT AS return_type,
    pg_catalog.pg_get_function_arguments(p.oid)::TEXT AS argument_types,
    n.nspname::TEXT AS schema_name
  FROM pg_catalog.pg_proc p
  LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND pg_catalog.pg_function_is_visible(p.oid)
  ORDER BY 1;
END;
$$;

-- 为当前用户授予执行权限
GRANT EXECUTE ON FUNCTION get_stored_procedures TO authenticated;
GRANT EXECUTE ON FUNCTION get_stored_procedures TO anon;
GRANT EXECUTE ON FUNCTION get_stored_procedures TO service_role; 