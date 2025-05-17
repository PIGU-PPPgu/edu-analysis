-- 创建执行SQL语句的函数
-- 注意: 该函数需要超级用户权限，只适用于开发环境
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建warning_statistics表的函数
CREATE OR REPLACE FUNCTION create_warning_statistics_table()
RETURNS void AS $$
BEGIN
  -- 创建表
  CREATE TABLE IF NOT EXISTS public.warning_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    students JSONB NOT NULL DEFAULT '{"total": 0, "at_risk": 0, "trend": "unchanged"}',
    classes JSONB NOT NULL DEFAULT '{"total": 0, "at_risk": 0, "trend": "unchanged"}',
    warnings JSONB NOT NULL DEFAULT '{"total": 0, "by_type": [], "by_severity": [], "trend": "unchanged"}',
    risk_factors JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  
  -- 添加注释
  COMMENT ON TABLE public.warning_statistics IS '预警统计数据表，保存系统预警统计信息';
  
  -- 启用RLS
  ALTER TABLE public.warning_statistics ENABLE ROW LEVEL SECURITY;
  
  -- 创建读取权限策略
  DROP POLICY IF EXISTS "允许已认证用户读取预警统计" ON public.warning_statistics;
  CREATE POLICY "允许已认证用户读取预警统计"
    ON public.warning_statistics
    FOR SELECT
    TO authenticated
    USING (true);
    
  -- 创建更新权限策略（仅限管理员和教师）
  DROP POLICY IF EXISTS "允许管理员更新预警统计" ON public.warning_statistics;
  CREATE POLICY "允许管理员更新预警统计"
    ON public.warning_statistics
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
      )
    );
    
  -- 创建插入权限策略（仅限管理员和教师）
  DROP POLICY IF EXISTS "允许管理员插入预警统计" ON public.warning_statistics;
  CREATE POLICY "允许管理员插入预警统计"
    ON public.warning_statistics
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
      )
    );
    
  -- 创建预警统计更新函数
  CREATE OR REPLACE FUNCTION update_warning_statistics()
  RETURNS TRIGGER AS $$
  BEGIN
    -- 当预警记录变化时自动更新统计数据
    UPDATE public.warning_statistics
    SET last_updated = now();
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  -- 创建触发器
  DROP TRIGGER IF EXISTS warning_statistics_update ON public.warning_records;
  CREATE TRIGGER warning_statistics_update
  AFTER INSERT OR UPDATE OR DELETE ON public.warning_records
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_warning_statistics();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 