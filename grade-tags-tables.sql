-- 创建成绩标签表
CREATE TABLE IF NOT EXISTS grade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 成绩数据和标签的关联表
CREATE TABLE IF NOT EXISTS grade_data_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT grade_data_tags_grade_id_tag_id_key UNIQUE (grade_id, tag_id),
  CONSTRAINT grade_data_tags_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES grade_data(id) ON DELETE CASCADE,
  CONSTRAINT grade_data_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES grade_tags(id) ON DELETE CASCADE
);

-- 添加行级安全策略
ALTER TABLE grade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_data_tags ENABLE ROW LEVEL SECURITY;

-- 创建公共访问策略
CREATE POLICY "Public read access for grade_tags"
  ON grade_tags FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage grade tags"
  ON grade_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  ));
  
CREATE POLICY "Public read access for grade_data_tags"
  ON grade_data_tags FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage grade data tags"
  ON grade_data_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  )); 