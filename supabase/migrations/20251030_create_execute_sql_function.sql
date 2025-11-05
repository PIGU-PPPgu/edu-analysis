-- 创建 execute_sql 函数用于动态SQL执行
-- 用于数据库初始化和管理

CREATE OR REPLACE FUNCTION public.execute_sql(
  sql_query text,
  query_params jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- 执行传入的SQL查询
  EXECUTE sql_query INTO result;

  -- 返回结果
  RETURN COALESCE(result, '{"success": true}'::jsonb);

EXCEPTION
  WHEN OTHERS THEN
    -- 捕获错误并返回错误信息
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'code', SQLSTATE,
      'success', false
    );
END;
$$;

-- 授予执行权限给 anon 和 authenticated 角色
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO anon, authenticated;

-- 添加函数说明
COMMENT ON FUNCTION public.execute_sql(text, jsonb) IS '执行动态SQL查询，用于数据库初始化和管理操作';
