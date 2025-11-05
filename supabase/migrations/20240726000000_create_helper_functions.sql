-- 创建缺失的RPC辅助函数
-- 这些函数用于动态检查数据库结构并执行SQL

-- 创建检查列是否存在的函数
CREATE OR REPLACE FUNCTION has_column(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = $1
    AND column_name = $2
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建安全的SQL执行函数
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS text AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SQL executed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN 'SQL执行失败: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为RPC函数添加注释
COMMENT ON FUNCTION has_column IS '检查指定表中是否存在某列';
COMMENT ON FUNCTION exec_sql IS '安全地执行动态SQL语句，用于系统维护';

-- 设置适当的权限
GRANT EXECUTE ON FUNCTION has_column TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;