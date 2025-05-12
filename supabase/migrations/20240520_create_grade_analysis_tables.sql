-- 创建推荐考试类型表
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加默认考试类型
INSERT INTO public.exam_types (type_name, description, is_system)
VALUES 
  ('小测', '课堂或课后小型测验', TRUE),
  ('月考', '每月定期考试', TRUE),
  ('期中考试', '学期中期考试', TRUE),
  ('期末考试', '学期末考试', TRUE);

-- 创建考试表
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(title, date, type)
);

-- 创建成绩数据表
CREATE TABLE IF NOT EXISTS public.grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT,
  total_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  UNIQUE(exam_id, student_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS grade_data_exam_id_idx ON public.grade_data(exam_id);
CREATE INDEX IF NOT EXISTS grade_data_student_id_idx ON public.grade_data(student_id);
CREATE INDEX IF NOT EXISTS grade_data_class_name_idx ON public.grade_data(class_name);

-- 创建 RLS 策略
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：允许已认证用户访问自己的数据
CREATE POLICY "允许用户访问自己创建的考试" ON public.exams 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = created_by);

CREATE POLICY "允许用户访问自己创建的考试的成绩数据" ON public.grade_data 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE exams.id = grade_data.exam_id 
      AND exams.created_by = auth.uid()
    )
  );

-- 允许所有已认证用户读取考试类型
CREATE POLICY "允许所有用户读取考试类型" ON public.exam_types
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 只允许管理员添加系统级考试类型
CREATE POLICY "只允许管理员添加系统级考试类型" ON public.exam_types
  FOR INSERT
  TO authenticated
  WITH CHECK (is_system = FALSE OR auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));

-- 添加自动设置 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_grade_data_updated_at
BEFORE UPDATE ON public.grade_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 添加自动设置 created_by 的触发器
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_exams_created_by
BEFORE INSERT ON public.exams
FOR EACH ROW
EXECUTE FUNCTION set_created_by(); 