-- 创建考试模板表
CREATE TABLE IF NOT EXISTS public.exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  description TEXT,
  exam_type TEXT NOT NULL,

  -- 考试配置 (存储为JSONB)
  config JSONB DEFAULT '{}'::JSONB,
  -- config结构示例:
  -- {
  --   "duration": 120,
  --   "total_score": 100,
  --   "passing_score": 60,
  --   "subjects": ["语文", "数学", "英语"],
  --   "subject_scores": {
  --     "语文": {"total": 150, "passing": 90, "excellent": 120},
  --     "数学": {"total": 150, "passing": 90, "excellent": 120}
  --   },
  --   "classes": [],
  --   "tags": []
  -- }

  -- 元数据
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_name, created_by)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS exam_templates_created_by_idx ON public.exam_templates(created_by);
CREATE INDEX IF NOT EXISTS exam_templates_exam_type_idx ON public.exam_templates(exam_type);
CREATE INDEX IF NOT EXISTS exam_templates_is_public_idx ON public.exam_templates(is_public);

-- 启用RLS
ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;

-- RLS策略: 用户可以查看自己的模板和公开模板
CREATE POLICY "用户可以查看自己的模板和公开模板" ON public.exam_templates
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_public = TRUE);

-- RLS策略: 用户可以创建自己的模板
CREATE POLICY "用户可以创建自己的模板" ON public.exam_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS策略: 用户可以更新自己的模板
CREATE POLICY "用户可以更新自己的模板" ON public.exam_templates
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS策略: 用户可以删除自己的模板
CREATE POLICY "用户可以删除自己的模板" ON public.exam_templates
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- 添加自动更新updated_at的触发器
CREATE TRIGGER update_exam_templates_updated_at
BEFORE UPDATE ON public.exam_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 插入系统默认模板
INSERT INTO public.exam_templates (template_name, description, exam_type, config, is_public, is_system)
VALUES
  (
    '标准期中考试模板',
    '适用于大多数科目的期中考试',
    '期中考试',
    '{
      "duration": 120,
      "total_score": 100,
      "passing_score": 60,
      "subjects": ["语文", "数学", "英语", "物理", "化学"],
      "subject_scores": {
        "语文": {"total": 150, "passing": 90, "excellent": 120},
        "数学": {"total": 150, "passing": 90, "excellent": 120},
        "英语": {"total": 150, "passing": 90, "excellent": 120},
        "物理": {"total": 100, "passing": 60, "excellent": 85},
        "化学": {"total": 100, "passing": 60, "excellent": 85}
      }
    }'::JSONB,
    TRUE,
    TRUE
  ),
  (
    '标准期末考试模板',
    '适用于大多数科目的期末考试',
    '期末考试',
    '{
      "duration": 150,
      "total_score": 100,
      "passing_score": 60,
      "subjects": ["语文", "数学", "英语", "物理", "化学", "生物", "政治", "历史", "地理"],
      "subject_scores": {
        "语文": {"total": 150, "passing": 90, "excellent": 120},
        "数学": {"total": 150, "passing": 90, "excellent": 120},
        "英语": {"total": 150, "passing": 90, "excellent": 120},
        "物理": {"total": 100, "passing": 60, "excellent": 85},
        "化学": {"total": 100, "passing": 60, "excellent": 85},
        "生物": {"total": 100, "passing": 60, "excellent": 85},
        "政治": {"total": 100, "passing": 60, "excellent": 85},
        "历史": {"total": 100, "passing": 60, "excellent": 85},
        "地理": {"total": 100, "passing": 60, "excellent": 85}
      }
    }'::JSONB,
    TRUE,
    TRUE
  ),
  (
    '快速月考模板',
    '适用于月度测验',
    '月考',
    '{
      "duration": 90,
      "total_score": 100,
      "passing_score": 60,
      "subjects": ["语文", "数学", "英语"],
      "subject_scores": {
        "语文": {"total": 100, "passing": 60, "excellent": 85},
        "数学": {"total": 100, "passing": 60, "excellent": 85},
        "英语": {"total": 100, "passing": 60, "excellent": 85}
      }
    }'::JSONB,
    TRUE,
    TRUE
  )
ON CONFLICT DO NOTHING;
