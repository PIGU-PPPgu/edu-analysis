-- 增强的数据库Schema - 添加缺失的成绩分析字段
-- 执行时间：2024年

-- 1. 修改grades表，添加缺失的字段
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_school INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS total_score NUMERIC;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS exam_title TEXT;

-- 2. 先创建导入批次表
CREATE TABLE IF NOT EXISTS import_batches (
  batch_id TEXT PRIMARY KEY,
  exam_title TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  exam_date DATE NOT NULL,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  teacher_id TEXT,
  file_name TEXT,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 创建成绩数据表（用于复杂成绩导入）
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  exam_title TEXT,
  exam_type TEXT,
  exam_date DATE,
  
  -- 各科目成绩
  total_score NUMERIC,
  total_max_score NUMERIC DEFAULT 523,
  chinese_score NUMERIC,
  chinese_max_score NUMERIC DEFAULT 120,
  math_score NUMERIC,
  math_max_score NUMERIC DEFAULT 100,
  english_score NUMERIC,
  english_max_score NUMERIC DEFAULT 75,
  physics_score NUMERIC,
  physics_max_score NUMERIC DEFAULT 63,
  chemistry_score NUMERIC,
  chemistry_max_score NUMERIC DEFAULT 45,
  politics_score NUMERIC,
  politics_max_score NUMERIC DEFAULT 50,
  history_score NUMERIC,
  history_max_score NUMERIC DEFAULT 70,
  
  -- 各科目等级
  total_grade TEXT,
  chinese_grade TEXT,
  math_grade TEXT,
  english_grade TEXT,
  physics_grade TEXT,
  chemistry_grade TEXT,
  politics_grade TEXT,
  history_grade TEXT,
  
  -- 排名信息
  rank_in_class INTEGER,
  rank_in_grade INTEGER,
  rank_in_school INTEGER,
  
  -- 班级信息
  class_total_students INTEGER,
  grade_total_students INTEGER,
  school_total_students INTEGER,
  
  -- 元数据
  teacher_id TEXT,
  import_batch_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. 创建字段映射表（用于AI解析结果存储）
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id TEXT,
  original_field TEXT NOT NULL,
  mapped_field TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.8,
  mapping_source TEXT DEFAULT 'ai' CHECK (mapping_source IN ('ai', 'rule', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_title ON grade_data(exam_title);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_date ON grade_data(exam_date);
CREATE INDEX IF NOT EXISTS idx_grade_data_batch_id ON grade_data(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_grades_rank_class ON grades(rank_in_class);
CREATE INDEX IF NOT EXISTS idx_grades_rank_grade ON grades(rank_in_grade);
CREATE INDEX IF NOT EXISTS idx_grades_grade_level ON grades(grade_level);

-- 6. 创建视图，统一成绩数据访问
CREATE OR REPLACE VIEW unified_grade_view AS
SELECT 
  gd.id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  
  -- 总分信息
  gd.total_score as score,
  gd.total_max_score as max_score,
  gd.total_grade as grade_level,
  '总分' as subject,
  
  -- 排名信息
  gd.rank_in_class,
  gd.rank_in_grade,
  gd.rank_in_school,
  
  -- 班级统计
  gd.class_total_students,
  gd.grade_total_students,
  
  gd.created_at
FROM grade_data gd

UNION ALL

SELECT 
  gd.id || '_chinese' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.chinese_score as score,
  gd.chinese_max_score as max_score,
  gd.chinese_grade as grade_level,
  '语文' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.chinese_score IS NOT NULL

UNION ALL

SELECT 
  gd.id || '_math' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.math_score as score,
  gd.math_max_score as max_score,
  gd.math_grade as grade_level,
  '数学' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.math_score IS NOT NULL

UNION ALL

SELECT 
  gd.id || '_english' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.english_score as score,
  gd.english_max_score as max_score,
  gd.english_grade as grade_level,
  '英语' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.english_score IS NOT NULL

UNION ALL

SELECT 
  gd.id || '_physics' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.physics_score as score,
  gd.physics_max_score as max_score,
  gd.physics_grade as grade_level,
  '物理' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.physics_score IS NOT NULL

UNION ALL

SELECT 
  gd.id || '_chemistry' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.chemistry_score as score,
  gd.chemistry_max_score as max_score,
  gd.chemistry_grade as grade_level,
  '化学' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.chemistry_score IS NOT NULL

UNION ALL

SELECT 
  gd.id || '_politics' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.politics_score as score,
  gd.politics_max_score as max_score,
  gd.politics_grade as grade_level,
  '政治' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.politics_score IS NOT NULL

UNION ALL

SELECT 
  gd.id || '_history' as id,
  gd.student_id,
  gd.name,
  gd.class_name,
  gd.exam_title,
  gd.exam_type,
  gd.exam_date,
  gd.history_score as score,
  gd.history_max_score as max_score,
  gd.history_grade as grade_level,
  '历史' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.history_score IS NOT NULL;

-- 7. 创建等级计算函数
CREATE OR REPLACE FUNCTION calculate_grade_level(score NUMERIC, max_score NUMERIC DEFAULT 100)
RETURNS TEXT AS $$
BEGIN
  IF score IS NULL OR max_score IS NULL OR max_score = 0 THEN
    RETURN NULL;
  END IF;
  
  DECLARE 
    percentage NUMERIC := (score / max_score) * 100;
  BEGIN
    IF percentage >= 90 THEN RETURN 'A';
    ELSIF percentage >= 80 THEN RETURN 'B';
    ELSIF percentage >= 70 THEN RETURN 'C';
    ELSIF percentage >= 60 THEN RETURN 'D';
    ELSE RETURN 'E';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建自动计算等级的触发器函数
CREATE OR REPLACE FUNCTION auto_calculate_grades()
RETURNS TRIGGER AS $$
BEGIN
  -- 自动计算各科目等级
  NEW.total_grade := calculate_grade_level(NEW.total_score, NEW.total_max_score);
  NEW.chinese_grade := calculate_grade_level(NEW.chinese_score, NEW.chinese_max_score);
  NEW.math_grade := calculate_grade_level(NEW.math_score, NEW.math_max_score);
  NEW.english_grade := calculate_grade_level(NEW.english_score, NEW.english_max_score);
  NEW.physics_grade := calculate_grade_level(NEW.physics_score, NEW.physics_max_score);
  NEW.chemistry_grade := calculate_grade_level(NEW.chemistry_score, NEW.chemistry_max_score);
  NEW.politics_grade := calculate_grade_level(NEW.politics_score, NEW.politics_max_score);
  NEW.history_grade := calculate_grade_level(NEW.history_score, NEW.history_max_score);
  
  -- 更新时间戳
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建触发器
CREATE TRIGGER trigger_auto_calculate_grades
  BEFORE INSERT OR UPDATE ON grade_data
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_grades();

-- 10. 设置RLS权限
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Teachers can access grade data" ON grade_data
  FOR ALL USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can access import batches" ON import_batches
  FOR ALL USING (teacher_id IN (SELECT teacher_id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can access field mappings" ON field_mappings
  FOR ALL USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()));

-- 11. 创建查询辅助函数
CREATE OR REPLACE FUNCTION get_student_exam_grades(
  p_student_id TEXT,
  p_exam_title TEXT DEFAULT NULL
)
RETURNS TABLE (
  subject TEXT,
  score NUMERIC,
  max_score NUMERIC,
  grade_level TEXT,
  exam_title TEXT,
  exam_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ugv.subject,
    ugv.score,
    ugv.max_score,
    ugv.grade_level,
    ugv.exam_title,
    ugv.exam_date
  FROM unified_grade_view ugv
  WHERE ugv.student_id = p_student_id
    AND (p_exam_title IS NULL OR ugv.exam_title = p_exam_title)
  ORDER BY ugv.exam_date DESC, ugv.subject;
END;
$$ LANGUAGE plpgsql;

-- 12. 创建班级成绩统计函数
CREATE OR REPLACE FUNCTION get_class_grade_statistics(
  p_class_name TEXT,
  p_exam_title TEXT,
  p_subject TEXT DEFAULT '总分'
)
RETURNS TABLE (
  class_name TEXT,
  subject TEXT,
  avg_score NUMERIC,
  max_score NUMERIC,
  min_score NUMERIC,
  pass_count BIGINT,
  total_count BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_class_name,
    p_subject,
    ROUND(AVG(ugv.score), 2) as avg_score,
    MAX(ugv.score) as max_score,
    MIN(ugv.score) as min_score,
    COUNT(CASE WHEN ugv.score >= (ugv.max_score * 0.6) THEN 1 END) as pass_count,
    COUNT(*) as total_count,
    ROUND(
      (COUNT(CASE WHEN ugv.score >= (ugv.max_score * 0.6) THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
      2
    ) as pass_rate
  FROM unified_grade_view ugv
  WHERE ugv.class_name = p_class_name 
    AND ugv.exam_title = p_exam_title
    AND ugv.subject = p_subject
  GROUP BY ugv.class_name, ugv.subject;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE grade_data IS '增强的成绩数据表，支持多科目成绩、等级和排名信息';
COMMENT ON VIEW unified_grade_view IS '统一的成绩视图，用于兼容现有查询逻辑';
COMMENT ON FUNCTION calculate_grade_level IS '根据分数和满分自动计算等级';
COMMENT ON FUNCTION get_student_exam_grades IS '获取学生某次考试的完整成绩信息';
COMMENT ON FUNCTION get_class_grade_statistics IS '获取班级某科目成绩统计信息'; 