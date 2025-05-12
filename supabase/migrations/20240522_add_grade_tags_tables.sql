-- 创建成绩标签表
CREATE TABLE IF NOT EXISTS public.grade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_system BOOLEAN DEFAULT FALSE
);

-- 创建成绩标签关联表
CREATE TABLE IF NOT EXISTS public.grade_data_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID REFERENCES public.grade_data(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.grade_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grade_id, tag_id)
);

-- 添加预设标签
INSERT INTO public.grade_tags (name, description, color, is_system)
VALUES 
  ('优秀', '90分以上的优秀学生', '#8B5CF6', TRUE),
  ('良好', '80-89分的良好表现', '#10B981', TRUE),
  ('中等', '70-79分的中等表现', '#3B82F6', TRUE),
  ('及格', '60-69分的及格表现', '#F59E0B', TRUE),
  ('不及格', '60分以下需要关注', '#EF4444', TRUE),
  ('进步显著', '相比上次成绩提高很多', '#8B5CF6', TRUE),
  ('表现退步', '相比上次成绩有所下滑', '#EC4899', TRUE);

-- 添加RLS策略
ALTER TABLE public.grade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_data_tags ENABLE ROW LEVEL SECURITY;

-- 允许用户访问自己创建的标签
CREATE POLICY "允许用户访问自己创建的标签" ON public.grade_tags 
  FOR ALL 
  TO authenticated 
  USING (
    auth.uid() = created_by OR
    is_system = TRUE
  );

-- 允许用户访问与自己成绩数据相关的标签关联
CREATE POLICY "允许用户访问与自己成绩数据相关的标签关联" ON public.grade_data_tags 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grade_data gd
      JOIN public.exams e ON gd.exam_id = e.id
      WHERE gd.id = grade_data_tags.grade_id 
      AND e.created_by = auth.uid()
    )
  );

-- 添加索引提高查询性能
CREATE INDEX IF NOT EXISTS grade_tags_created_by_idx ON public.grade_tags(created_by);
CREATE INDEX IF NOT EXISTS grade_data_tags_grade_id_idx ON public.grade_data_tags(grade_id);
CREATE INDEX IF NOT EXISTS grade_data_tags_tag_id_idx ON public.grade_data_tags(tag_id); 