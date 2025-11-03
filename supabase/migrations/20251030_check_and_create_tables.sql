-- ============================================
-- 检查并创建缺失的表
-- ============================================

-- 首先检查当前存在哪些表
DO $$
BEGIN
  RAISE NOTICE 'Existing tables in public schema:';
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename)
  LOOP
    RAISE NOTICE '  - %', r.tablename;
  END LOOP;
END $$;

-- ============================================
-- 创建 grade_data 表（如果不存在）
-- ============================================

CREATE TABLE IF NOT EXISTS public.grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT,
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  exam_title TEXT,
  exam_type TEXT,
  exam_date DATE,

  -- 总分信息
  total_score NUMERIC,
  total_max_score NUMERIC DEFAULT 750,
  total_grade TEXT,

  -- 各科目成绩
  chinese_score NUMERIC,
  chinese_grade TEXT,
  math_score NUMERIC,
  math_grade TEXT,
  english_score NUMERIC,
  english_grade TEXT,
  physics_score NUMERIC,
  physics_grade TEXT,
  chemistry_score NUMERIC,
  chemistry_grade TEXT,
  politics_score NUMERIC,
  politics_grade TEXT,
  history_score NUMERIC,
  history_grade TEXT,
  biology_score NUMERIC,
  biology_grade TEXT,
  geography_score NUMERIC,
  geography_grade TEXT,

  -- 排名信息
  total_rank_in_class INTEGER,
  total_rank_in_school INTEGER,
  total_rank_in_grade INTEGER,

  -- 各科目排名
  chinese_rank_in_class INTEGER,
  math_rank_in_class INTEGER,
  english_rank_in_class INTEGER,
  physics_rank_in_class INTEGER,
  chemistry_rank_in_class INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS grade_data_student_id_idx ON public.grade_data(student_id);
CREATE INDEX IF NOT EXISTS grade_data_class_name_idx ON public.grade_data(class_name);
CREATE INDEX IF NOT EXISTS grade_data_exam_id_idx ON public.grade_data(exam_id);

-- ============================================
-- 简化的 RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_info ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "allow_authenticated_read_grade_data" ON grade_data;
DROP POLICY IF EXISTS "allow_authenticated_read_students" ON students;
DROP POLICY IF EXISTS "allow_authenticated_read_class_info" ON class_info;

-- 允许所有认证用户读取（临时策略，后续可以改为更严格的）
CREATE POLICY "allow_authenticated_read_grade_data" ON grade_data
FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_authenticated_read_students" ON students
FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_authenticated_read_class_info" ON class_info
FOR SELECT TO authenticated USING (true);

-- 允许认证用户插入数据（管理员功能）
CREATE POLICY "allow_authenticated_insert_grade_data" ON grade_data
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "allow_authenticated_insert_students" ON students
FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- 完成
-- ============================================

SELECT 'Tables and policies created successfully!' as status;
