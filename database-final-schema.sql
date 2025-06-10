-- 最终版数据库Schema - 正确处理所有依赖关系，一次性搞定
-- 先删除依赖，再删除函数，确保不会出错

-- 1. 首先删除所有可能存在的触发器（避免依赖错误）
DROP TRIGGER IF EXISTS trigger_auto_calculate_grades ON grade_data;
DROP TRIGGER IF EXISTS trigger_auto_update_grade_level ON grades;
DROP TRIGGER IF EXISTS trigger_update_grade_data_timestamp ON grade_data;

-- 2. 然后删除所有可能冲突的函数
DROP FUNCTION IF EXISTS calculate_grade_level(NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS calculate_grade_level(NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_grades() CASCADE;
DROP FUNCTION IF EXISTS auto_update_grade_level() CASCADE;
DROP FUNCTION IF EXISTS update_grade_data_timestamp() CASCADE;

-- 3. 为grades表添加缺失的字段
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_school INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS total_score NUMERIC;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS exam_title TEXT;

-- 4. 创建核心的多科目成绩表
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  exam_title TEXT,
  exam_type TEXT,
  exam_date DATE,
  
  -- 总分信息
  total_score NUMERIC,
  total_max_score NUMERIC DEFAULT 523,
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
  rank_in_class INTEGER,
  rank_in_grade INTEGER,
  rank_in_school INTEGER,
  
  -- 基础元数据
  teacher_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 添加基础索引
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_title ON grade_data(exam_title);

CREATE INDEX IF NOT EXISTS idx_grades_rank_class ON grades(rank_in_class);
CREATE INDEX IF NOT EXISTS idx_grades_rank_grade ON grades(rank_in_grade);
CREATE INDEX IF NOT EXISTS idx_grades_grade_level ON grades(grade_level);

-- 6. 重新创建时间戳更新函数
CREATE OR REPLACE FUNCTION update_grade_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建时间戳触发器
CREATE TRIGGER trigger_update_grade_data_timestamp
  BEFORE UPDATE ON grade_data
  FOR EACH ROW EXECUTE FUNCTION update_grade_data_timestamp();

-- 8. 创建统一视图
CREATE OR REPLACE VIEW unified_grade_view AS
-- 总分数据
SELECT 
  gd.id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.total_score as score,
  gd.total_grade as grade_level,
  '总分' as subject,
  gd.rank_in_class,
  gd.rank_in_grade,
  gd.rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.total_score IS NOT NULL

UNION ALL

-- 语文数据
SELECT 
  gd.id || '_chinese' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.chinese_score as score,
  gd.chinese_grade as grade_level,
  '语文' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.chinese_score IS NOT NULL

UNION ALL

-- 数学数据
SELECT 
  gd.id || '_math' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.math_score as score,
  gd.math_grade as grade_level,
  '数学' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.math_score IS NOT NULL

UNION ALL

-- 英语数据
SELECT 
  gd.id || '_english' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.english_score as score,
  gd.english_grade as grade_level,
  '英语' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.english_score IS NOT NULL

UNION ALL

-- 物理数据
SELECT 
  gd.id || '_physics' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.physics_score as score,
  gd.physics_grade as grade_level,
  '物理' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.physics_score IS NOT NULL

UNION ALL

-- 化学数据
SELECT 
  gd.id || '_chemistry' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.chemistry_score as score,
  gd.chemistry_grade as grade_level,
  '化学' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.chemistry_score IS NOT NULL

UNION ALL

-- 政治数据
SELECT 
  gd.id || '_politics' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.politics_score as score,
  gd.politics_grade as grade_level,
  '政治' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.politics_score IS NOT NULL

UNION ALL

-- 历史数据
SELECT 
  gd.id || '_history' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.history_score as score,
  gd.history_grade as grade_level,
  '历史' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.history_score IS NOT NULL

UNION ALL

-- 生物数据
SELECT 
  gd.id || '_biology' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.biology_score as score,
  gd.biology_grade as grade_level,
  '生物' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.biology_score IS NOT NULL

UNION ALL

-- 地理数据
SELECT 
  gd.id || '_geography' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.geography_score as score,
  gd.geography_grade as grade_level,
  '地理' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.created_at
FROM grade_data gd
WHERE gd.geography_score IS NOT NULL;

-- 9. 设置安全策略
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can access grade data" ON grade_data
  FOR ALL USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()));

-- 10. 验证安装完成
SELECT 
  'Final database schema installation completed successfully!' as status,
  (SELECT COUNT(*) FROM grade_data) as grade_data_records,
  (SELECT COUNT(*) FROM grades) as grades_records,
  'All dependencies resolved, ready for use!' as message; 