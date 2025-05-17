-- 创建预警统计表的SQL脚本
-- 可以直接在Supabase SQL编辑器中执行此脚本

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

-- 插入初始数据（如果表为空）
INSERT INTO public.warning_statistics (students, classes, warnings, risk_factors)
SELECT 
  '{
    "total": 320,
    "at_risk": 48,
    "trend": "down"
  }'::jsonb,
  '{
    "total": 12,
    "at_risk": 8,
    "trend": "unchanged"
  }'::jsonb,
  '{
    "total": 76,
    "by_type": [
      {"type": "学业预警", "count": 32, "percentage": 42, "trend": "up"},
      {"type": "行为预警", "count": 24, "percentage": 32, "trend": "down"},
      {"type": "出勤预警", "count": 12, "percentage": 16, "trend": "down"},
      {"type": "情绪预警", "count": 8, "percentage": 10, "trend": "unchanged"}
    ],
    "by_severity": [
      {"severity": "high", "count": 24, "percentage": 32, "trend": "up"},
      {"severity": "medium", "count": 36, "percentage": 47, "trend": "down"},
      {"severity": "low", "count": 16, "percentage": 21, "trend": "unchanged"}
    ],
    "trend": "down"
  }'::jsonb,
  '[
    {"factor": "缺勤率高", "count": 28, "percentage": 58, "trend": "up"},
    {"factor": "作业完成率低", "count": 24, "percentage": 50, "trend": "unchanged"},
    {"factor": "考试成绩下滑", "count": 22, "percentage": 46, "trend": "down"},
    {"factor": "课堂参与度低", "count": 18, "percentage": 38, "trend": "down"},
    {"factor": "纪律问题", "count": 10, "percentage": 21, "trend": "unchanged"}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.warning_statistics LIMIT 1); 