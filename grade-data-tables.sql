-- 创建考试表
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建成绩数据表
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  subject TEXT,
  total_score NUMERIC,
  exam_date DATE,
  exam_type TEXT,
  exam_title TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);

-- 添加行级安全策略
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;

-- 创建公共访问策略
CREATE POLICY "Public read access for exams"
  ON exams FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage exams"
  ON exams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
  ));
  
CREATE POLICY "Public read access for grade_data"
  ON grade_data FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage grade data"
  ON grade_data FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
  )); 