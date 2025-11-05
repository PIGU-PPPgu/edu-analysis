-- 作业模板表
CREATE TABLE IF NOT EXISTS homework_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT REFERENCES subjects(subject_code),
  knowledge_points JSONB DEFAULT '[]'::jsonb,
  grading_scale_id UUID REFERENCES grading_scales(id),
  estimated_duration INTEGER, -- 预计完成时间(分钟)
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_template_name_per_user UNIQUE(name, created_by)
);

-- 评分历史记录表
CREATE TABLE IF NOT EXISTS grading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  modified_by UUID NOT NULL REFERENCES auth.users(id),
  previous_score NUMERIC,
  new_score NUMERIC,
  previous_feedback TEXT,
  new_feedback TEXT,
  previous_knowledge_points JSONB,
  new_knowledge_points JSONB,
  modification_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_score_change CHECK (previous_score IS DISTINCT FROM new_score OR previous_feedback IS DISTINCT FROM new_feedback)
);

-- 索引优化
CREATE INDEX idx_homework_templates_created_by ON homework_templates(created_by);
CREATE INDEX idx_homework_templates_subject ON homework_templates(subject_code);
CREATE INDEX idx_homework_templates_public ON homework_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_grading_history_submission ON grading_history(submission_id);
CREATE INDEX idx_grading_history_created_at ON grading_history(created_at DESC);

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_homework_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_homework_template_timestamp
  BEFORE UPDATE ON homework_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_template_timestamp();

-- RLS策略
ALTER TABLE homework_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_history ENABLE ROW LEVEL SECURITY;

-- 模板访问策略：创建者可以管理自己的模板，所有人可以查看公开模板
CREATE POLICY "用户可以查看自己创建的模板" ON homework_templates
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "用户可以查看公开模板" ON homework_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "用户可以创建模板" ON homework_templates
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "用户可以更新自己的模板" ON homework_templates
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "用户可以删除自己的模板" ON homework_templates
  FOR DELETE USING (created_by = auth.uid());

-- 评分历史策略：教师和管理员可以查看
CREATE POLICY "教师可以查看评分历史" ON grading_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "教师可以创建评分历史" ON grading_history
  FOR INSERT WITH CHECK (
    modified_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- 评论
COMMENT ON TABLE homework_templates IS '作业模板表，用于保存和复用作业设置';
COMMENT ON TABLE grading_history IS '评分历史记录表，追踪所有评分修改';
COMMENT ON COLUMN homework_templates.knowledge_points IS 'JSON数组，存储关联的知识点ID和名称';
COMMENT ON COLUMN grading_history.previous_knowledge_points IS 'JSON对象，存储修改前的知识点评分';
COMMENT ON COLUMN grading_history.new_knowledge_points IS 'JSON对象，存储修改后的知识点评分';
