-- 创建预警统计表
CREATE TABLE IF NOT EXISTS public.warning_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  students JSONB NOT NULL DEFAULT '{
    "total": 0,
    "at_risk": 0,
    "trend": "unchanged"
  }',
  classes JSONB NOT NULL DEFAULT '{
    "total": 0,
    "at_risk": 0,
    "trend": "unchanged"
  }',
  warnings JSONB NOT NULL DEFAULT '{
    "total": 0,
    "by_type": [],
    "by_severity": [],
    "trend": "unchanged"
  }',
  risk_factors JSONB NOT NULL DEFAULT '[]',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 添加注释
COMMENT ON TABLE public.warning_statistics IS '预警统计数据表，保存系统预警统计信息';

-- 插入初始数据（与模拟数据一致）
INSERT INTO public.warning_statistics (students, classes, warnings, risk_factors)
VALUES (
  '{
    "total": 320,
    "at_risk": 48,
    "trend": "down"
  }',
  '{
    "total": 12,
    "at_risk": 8,
    "trend": "unchanged"
  }',
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
  }',
  '[
    {"factor": "缺勤率高", "count": 28, "percentage": 58, "trend": "up"},
    {"factor": "作业完成率低", "count": 24, "percentage": 50, "trend": "unchanged"},
    {"factor": "考试成绩下滑", "count": 22, "percentage": 46, "trend": "down"},
    {"factor": "课堂参与度低", "count": 18, "percentage": 38, "trend": "down"},
    {"factor": "纪律问题", "count": 10, "percentage": 21, "trend": "unchanged"}
  ]'
)
ON CONFLICT (id) DO NOTHING;

-- 设置访问权限策略
ALTER TABLE public.warning_statistics ENABLE ROW LEVEL SECURITY;

-- 创建读取权限策略
DROP POLICY IF EXISTS "允许已认证用户读取预警统计" ON public.warning_statistics;
CREATE POLICY "允许已认证用户读取预警统计"
  ON public.warning_statistics
  FOR SELECT
  TO authenticated
  USING (true);

-- 创建更新权限策略（仅限管理员）
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

-- 创建预警统计更新函数
CREATE OR REPLACE FUNCTION update_warning_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- 在这里添加更新预警统计的逻辑
  -- 当预警记录变化时自动更新统计数据
  UPDATE public.warning_statistics
  SET last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，当预警记录表变化时更新统计
DROP TRIGGER IF EXISTS warning_statistics_update ON public.warning_records;
CREATE TRIGGER warning_statistics_update
AFTER INSERT OR UPDATE OR DELETE ON public.warning_records
FOR EACH STATEMENT
EXECUTE FUNCTION update_warning_statistics(); 