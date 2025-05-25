-- 创建学生学习行为表
CREATE TABLE IF NOT EXISTS public.student_learning_behaviors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_rate INTEGER NOT NULL DEFAULT 90 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  homework_completion_rate INTEGER NOT NULL DEFAULT 80 CHECK (homework_completion_rate >= 0 AND homework_completion_rate <= 100),
  class_participation INTEGER NOT NULL DEFAULT 70 CHECK (class_participation >= 0 AND class_participation <= 100),
  focus_duration INTEGER NOT NULL DEFAULT 70 CHECK (focus_duration >= 0 AND focus_duration <= 100),
  learning_consistency INTEGER NOT NULL DEFAULT 70 CHECK (learning_consistency >= 0 AND learning_consistency <= 100),
  problem_solving_speed INTEGER NOT NULL DEFAULT 70 CHECK (problem_solving_speed >= 0 AND problem_solving_speed <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_learning_behaviors_student_id ON public.student_learning_behaviors(student_id);
COMMENT ON TABLE public.student_learning_behaviors IS '学生学习行为数据表';

-- 创建学生学习风格表
CREATE TABLE IF NOT EXISTS public.student_learning_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_learning_styles_student_id ON public.student_learning_styles(student_id);
COMMENT ON TABLE public.student_learning_styles IS '学生学习风格数据表';

-- 创建学生学习模式表
CREATE TABLE IF NOT EXISTS public.student_learning_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL,
  description TEXT,
  is_strength BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_learning_patterns_student_id ON public.student_learning_patterns(student_id);
COMMENT ON TABLE public.student_learning_patterns IS '学生学习模式数据表';

-- 创建学生成就表
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('academic', 'behavior', 'milestone', 'improvement')),
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON public.student_achievements(student_id);
COMMENT ON TABLE public.student_achievements IS '学生成就记录表';

-- 创建学生AI标签表（如果不存在）
CREATE TABLE IF NOT EXISTS public.student_ai_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  learning_style TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_ai_tags_student_id ON public.student_ai_tags(student_id);
COMMENT ON TABLE public.student_ai_tags IS '学生AI标签表';

-- 创建学生自定义标签表（如果不存在）
CREATE TABLE IF NOT EXISTS public.student_custom_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_custom_tags_student_id ON public.student_custom_tags(student_id);
COMMENT ON TABLE public.student_custom_tags IS '学生自定义标签表';

-- 添加RLS策略
ALTER TABLE public.student_learning_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_learning_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ai_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_custom_tags ENABLE ROW LEVEL SECURITY;

-- 添加策略允许已验证用户访问
CREATE POLICY "已验证用户可查看学生行为" ON public.student_learning_behaviors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "已验证用户可查看学生风格" ON public.student_learning_styles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "已验证用户可查看学生模式" ON public.student_learning_patterns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "已验证用户可查看学生成就" ON public.student_achievements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "已验证用户可查看AI标签" ON public.student_ai_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "已验证用户可查看自定义标签" ON public.student_custom_tags
  FOR SELECT TO authenticated USING (true);

-- 添加触发器更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_learning_behaviors_updated_at
BEFORE UPDATE ON public.student_learning_behaviors
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_student_learning_styles_updated_at
BEFORE UPDATE ON public.student_learning_styles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_student_learning_patterns_updated_at
BEFORE UPDATE ON public.student_learning_patterns
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_student_achievements_updated_at
BEFORE UPDATE ON public.student_achievements
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_student_ai_tags_updated_at
BEFORE UPDATE ON public.student_ai_tags
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_student_custom_tags_updated_at
BEFORE UPDATE ON public.student_custom_tags
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- 添加初始数据示例
INSERT INTO public.student_learning_behaviors (student_id, attendance_rate, homework_completion_rate, class_participation, focus_duration, learning_consistency, problem_solving_speed)
SELECT 
  id, 
  floor(random() * 20) + 80, -- 80-100
  floor(random() * 30) + 70, -- 70-100
  floor(random() * 40) + 60, -- 60-100
  floor(random() * 30) + 70, -- 70-100
  floor(random() * 40) + 60, -- 60-100
  floor(random() * 30) + 70  -- 70-100
FROM public.students
WHERE id NOT IN (SELECT student_id FROM public.student_learning_behaviors)
LIMIT 50;

-- 添加学习风格示例数据
WITH student_data AS (
  SELECT 
    id,
    ARRAY[
      json_build_object(
        'style_name', '视觉型学习',
        'percentage', floor(random() * 50) + 10,
        'color', '#10b981'
      ),
      json_build_object(
        'style_name', '听觉型学习',
        'percentage', floor(random() * 40) + 10,
        'color', '#3b82f6'
      ),
      json_build_object(
        'style_name', '读写型学习',
        'percentage', floor(random() * 30) + 10,
        'color', '#8b5cf6'
      ),
      json_build_object(
        'style_name', '实践型学习',
        'percentage', floor(random() * 30) + 10,
        'color', '#f59e0b'
      )
    ] AS styles
  FROM public.students
  WHERE id NOT IN (SELECT student_id FROM public.student_learning_styles)
  LIMIT 50
)
INSERT INTO public.student_learning_styles (student_id, style_name, percentage, description, color)
SELECT
  sd.id,
  (s->>'style_name')::text,
  (s->>'percentage')::integer,
  CASE
    WHEN (s->>'style_name') = '视觉型学习' THEN '通过看和观察学习效果最好，如图表、视频等'
    WHEN (s->>'style_name') = '听觉型学习' THEN '通过听和讨论学习效果好，如讲座、对话等'
    WHEN (s->>'style_name') = '读写型学习' THEN '通过阅读和写作学习效果好，如做笔记、阅读材料等'
    WHEN (s->>'style_name') = '实践型学习' THEN '通过动手实践学习效果好，如实验、角色扮演等'
  END,
  (s->>'color')::text
FROM student_data sd,
LATERAL unnest(sd.styles) AS s;

-- 添加学生画像相关的API权限
BEGIN;
  -- 确保API角色存在
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role;
    END IF;
  END
  $$;

  -- 赋予查询权限
  GRANT SELECT ON public.student_learning_behaviors TO anon, authenticated, service_role;
  GRANT SELECT ON public.student_learning_styles TO anon, authenticated, service_role;
  GRANT SELECT ON public.student_learning_patterns TO anon, authenticated, service_role;
  GRANT SELECT ON public.student_achievements TO anon, authenticated, service_role;
  GRANT SELECT ON public.student_ai_tags TO anon, authenticated, service_role;
  GRANT SELECT ON public.student_custom_tags TO anon, authenticated, service_role;
  
  -- 赋予插入/更新权限
  GRANT INSERT, UPDATE ON public.student_learning_behaviors TO authenticated, service_role;
  GRANT INSERT, UPDATE ON public.student_learning_styles TO authenticated, service_role;
  GRANT INSERT, UPDATE ON public.student_learning_patterns TO authenticated, service_role;
  GRANT INSERT, UPDATE ON public.student_achievements TO authenticated, service_role;
  GRANT INSERT, UPDATE ON public.student_ai_tags TO authenticated, service_role;
  GRANT INSERT, UPDATE ON public.student_custom_tags TO authenticated, service_role;
  
  -- 赋予使用序列的权限
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
COMMIT; 