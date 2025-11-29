-- 为 analysis_reports 表添加 RLS 策略
-- 执行此 SQL 以修复 406 错误

-- 启用 RLS
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "认证用户可以查看报告" ON analysis_reports;
DROP POLICY IF EXISTS "认证用户可以创建报告" ON analysis_reports;

-- 允许所有认证用户查看报告
CREATE POLICY "认证用户可以查看报告" ON analysis_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 允许所有认证用户创建报告
CREATE POLICY "认证用户可以创建报告" ON analysis_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
