-- 创建学生画像表
CREATE TABLE IF NOT EXISTS student_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ai_tags JSONB,
  custom_tags TEXT[],
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

-- 添加行级安全策略
ALTER TABLE student_portraits ENABLE ROW LEVEL SECURITY;

-- 管理员和教师可以查看所有学生画像
CREATE POLICY view_student_portraits ON student_portraits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
    )
  );

-- 学生只能查看自己的画像
CREATE POLICY students_view_own_portraits ON student_portraits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE user_id = auth.uid() AND id = student_portraits.student_id
    )
  );

-- 只有管理员和教师可以更新学生画像
CREATE POLICY teachers_update_portraits ON student_portraits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
    )
  );

-- 只有管理员和教师可以插入学生画像
CREATE POLICY teachers_insert_portraits ON student_portraits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
    )
  );

-- 添加触发器更新最后修改时间
CREATE OR REPLACE FUNCTION update_portrait_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portrait_timestamp
  BEFORE UPDATE ON student_portraits
  FOR EACH ROW EXECUTE FUNCTION update_portrait_timestamp();

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_student_portraits_student_id ON student_portraits(student_id); 