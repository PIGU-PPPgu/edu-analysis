-- 快速设置用户隔离的SQL脚本
-- 在Supabase管理后台的SQL编辑器中执行

-- 1. 删除现有的公共访问策略
DROP POLICY IF EXISTS "Public read access" ON students;
DROP POLICY IF EXISTS "Public read access" ON class_info;
DROP POLICY IF EXISTS "Public read access" ON subjects;
DROP POLICY IF EXISTS "Public read access" ON exam_types;
DROP POLICY IF EXISTS "Public read access" ON academic_terms;
DROP POLICY IF EXISTS "Teachers read access" ON grades;

-- 2. 创建exams表（如果不存在）
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(title, date, type, created_by)
);

-- 启用RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- 3. 添加created_by字段到现有表
DO $$ 
BEGIN
  -- students表
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE students ADD COLUMN created_by UUID REFERENCES auth.users(id);
    -- 为现有数据设置默认值
    UPDATE students SET created_by = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
    ALTER TABLE students ALTER COLUMN created_by SET DEFAULT auth.uid();
  END IF;

  -- class_info表
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'class_info' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE class_info ADD COLUMN created_by UUID REFERENCES auth.users(id);
    UPDATE class_info SET created_by = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
    ALTER TABLE class_info ALTER COLUMN created_by SET DEFAULT auth.uid();
  END IF;

  -- subjects表
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE subjects ADD COLUMN created_by UUID REFERENCES auth.users(id);
    UPDATE subjects SET created_by = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
    ALTER TABLE subjects ALTER COLUMN created_by SET DEFAULT auth.uid();
  END IF;

  -- grades表
  IF NOT EXISTS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'grades' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE grades ADD COLUMN created_by UUID REFERENCES auth.users(id);
    UPDATE grades SET created_by = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE created_by IS NULL;
    ALTER TABLE grades ALTER COLUMN created_by SET DEFAULT auth.uid();
  END IF;
END $$;

-- 4. 应用基于用户的RLS策略
-- 学生数据访问策略
CREATE POLICY "Users can view their own students"
  ON students FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own students"
  ON students FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own students"
  ON students FOR DELETE
  USING (auth.uid() = created_by);

-- 班级信息访问策略
CREATE POLICY "Users can view their own classes"
  ON class_info FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create classes"
  ON class_info FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own classes"
  ON class_info FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own classes"
  ON class_info FOR DELETE
  USING (auth.uid() = created_by);

-- 科目访问策略
CREATE POLICY "Users can view their own subjects"
  ON subjects FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create subjects"
  ON subjects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own subjects"
  ON subjects FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own subjects"
  ON subjects FOR DELETE
  USING (auth.uid() = created_by);

-- 成绩访问策略
CREATE POLICY "Users can view their own grades"
  ON grades FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create grades"
  ON grades FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own grades"
  ON grades FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own grades"
  ON grades FOR DELETE
  USING (auth.uid() = created_by);

-- 考试记录访问策略
CREATE POLICY "Users can view their own exams"
  ON exams FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create exams"
  ON exams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own exams"
  ON exams FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own exams"
  ON exams FOR DELETE
  USING (auth.uid() = created_by);

-- 5. 创建性能优化索引
CREATE INDEX IF NOT EXISTS idx_grades_created_by ON grades(created_by);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON students(created_by);
CREATE INDEX IF NOT EXISTS idx_class_info_created_by ON class_info(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_subjects_created_by ON subjects(created_by);

-- 完成提示
SELECT 'Database setup completed! User isolation is now active.' as status; 