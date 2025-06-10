-- 安全版本完整增强数据库Schema - 支持多科目详细分析
-- 移除外键依赖，确保执行顺序不会出错

-- 1. 确保grades表已有基础字段
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_school INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS total_score NUMERIC;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS exam_title TEXT;

-- 2. 创建详细成绩数据表（支持多科目，移除外键依赖）
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
  chinese_max_score NUMERIC DEFAULT 120,
  chinese_grade TEXT,
  
  math_score NUMERIC,
  math_max_score NUMERIC DEFAULT 100,
  math_grade TEXT,
  
  english_score NUMERIC,
  english_max_score NUMERIC DEFAULT 75,
  english_grade TEXT,
  
  physics_score NUMERIC,
  physics_max_score NUMERIC DEFAULT 63,
  physics_grade TEXT,
  
  chemistry_score NUMERIC,
  chemistry_max_score NUMERIC DEFAULT 45,
  chemistry_grade TEXT,
  
  politics_score NUMERIC,
  politics_max_score NUMERIC DEFAULT 50,
  politics_grade TEXT,
  
  history_score NUMERIC,
  history_max_score NUMERIC DEFAULT 70,
  history_grade TEXT,
  
  biology_score NUMERIC,
  biology_max_score NUMERIC DEFAULT 50,
  biology_grade TEXT,
  
  geography_score NUMERIC,
  geography_max_score NUMERIC DEFAULT 50,
  geography_grade TEXT,
  
  -- 排名信息
  rank_in_class INTEGER,
  rank_in_grade INTEGER,
  rank_in_school INTEGER,
  
  -- 班级统计信息
  class_total_students INTEGER,
  grade_total_students INTEGER,
  school_total_students INTEGER,
  
  -- 元数据（移除外键依赖）
  teacher_id TEXT,
  batch_info TEXT, -- 简化的批次信息，不做外键关联
  file_name TEXT,  -- 导入文件名
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 创建导入批次表（独立，无依赖）
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

-- 4. 创建字段映射表（用于AI学习历史）
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id TEXT,
  original_field TEXT NOT NULL,
  mapped_field TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0.8,
  mapping_source TEXT DEFAULT 'ai' CHECK (mapping_source IN ('ai', 'rule', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 创建等级配置表（用于自定义等级规则）
CREATE TABLE IF NOT EXISTS grade_level_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_name TEXT NOT NULL,
  description TEXT,
  exam_type TEXT,
  subject TEXT,
  grade_rules JSONB NOT NULL,
  calculation_method TEXT DEFAULT 'percentile' CHECK (calculation_method IN ('percentile', 'fixed_score')),
  is_default BOOLEAN DEFAULT false,
  teacher_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. 添加性能索引
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_title ON grade_data(exam_title);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_date ON grade_data(exam_date);
CREATE INDEX IF NOT EXISTS idx_grade_data_batch_info ON grade_data(batch_info);

CREATE INDEX IF NOT EXISTS idx_grades_rank_class ON grades(rank_in_class);
CREATE INDEX IF NOT EXISTS idx_grades_rank_grade ON grades(rank_in_grade);
CREATE INDEX IF NOT EXISTS idx_grades_grade_level ON grades(grade_level);
CREATE INDEX IF NOT EXISTS idx_grades_exam_title ON grades(exam_title);

CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_date ON import_batches(import_date);

CREATE INDEX IF NOT EXISTS idx_field_mappings_batch ON field_mappings(batch_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_field ON field_mappings(mapped_field);

CREATE INDEX IF NOT EXISTS idx_grade_level_configs_teacher ON grade_level_configs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grade_level_configs_type ON grade_level_configs(exam_type);
CREATE INDEX IF NOT EXISTS idx_grade_level_configs_default ON grade_level_configs(is_default);

-- 7. 删除现有的等级计算函数
DROP FUNCTION IF EXISTS calculate_grade_level(NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS calculate_grade_level(NUMERIC);
DROP FUNCTION IF EXISTS auto_calculate_grades();
DROP FUNCTION IF EXISTS auto_update_grade_level();

-- 8. 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 删除并重新创建触发器
DROP TRIGGER IF EXISTS trigger_auto_calculate_grades ON grade_data;
DROP TRIGGER IF EXISTS trigger_auto_update_grade_level ON grades;
DROP TRIGGER IF EXISTS trigger_update_grade_data_timestamp ON grade_data;

-- 只创建时间戳更新触发器
CREATE TRIGGER trigger_update_grade_data_timestamp
  BEFORE UPDATE ON grade_data
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 10. 创建自定义等级计算函数（可选）
CREATE OR REPLACE FUNCTION calculate_percentile_grade(
  scores NUMERIC[],
  current_score NUMERIC,
  grade_config JSONB DEFAULT '{"A+": 5, "A": 10, "B+": 20, "B": 30, "C+": 25, "C": 10}'::JSONB
)
RETURNS TEXT AS $$
DECLARE
  sorted_scores NUMERIC[];
  total_count INTEGER;
  current_rank INTEGER;
  percentile NUMERIC;
BEGIN
  IF scores IS NULL OR array_length(scores, 1) IS NULL OR current_score IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT array_agg(score ORDER BY score DESC) INTO sorted_scores
  FROM unnest(scores) AS score WHERE score IS NOT NULL;
  
  total_count := array_length(sorted_scores, 1);
  
  SELECT pos INTO current_rank
  FROM (
    SELECT score, row_number() OVER (ORDER BY score DESC) as pos
    FROM unnest(sorted_scores) AS score
  ) ranked
  WHERE score = current_score
  LIMIT 1;
  
  percentile := (current_rank::NUMERIC / total_count::NUMERIC) * 100;
  
  IF percentile <= (grade_config->>'A+')::NUMERIC THEN RETURN 'A+';
  ELSIF percentile <= ((grade_config->>'A+')::NUMERIC + (grade_config->>'A')::NUMERIC) THEN RETURN 'A';
  ELSIF percentile <= ((grade_config->>'A+')::NUMERIC + (grade_config->>'A')::NUMERIC + (grade_config->>'B+')::NUMERIC) THEN RETURN 'B+';
  ELSIF percentile <= ((grade_config->>'A+')::NUMERIC + (grade_config->>'A')::NUMERIC + (grade_config->>'B+')::NUMERIC + (grade_config->>'B')::NUMERIC) THEN RETURN 'B';
  ELSIF percentile <= ((grade_config->>'A+')::NUMERIC + (grade_config->>'A')::NUMERIC + (grade_config->>'B+')::NUMERIC + (grade_config->>'B')::NUMERIC + (grade_config->>'C+')::NUMERIC) THEN RETURN 'C+';
  ELSE RETURN 'C';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. 创建统一视图（支持多科目查询）
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
  gd.total_max_score as max_score,
  gd.total_grade as grade_level,
  '总分' as subject,
  gd.rank_in_class,
  gd.rank_in_grade,
  gd.rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
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
  gd.biology_max_score as max_score,
  gd.biology_grade as grade_level,
  '生物' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
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
  gd.geography_max_score as max_score,
  gd.geography_grade as grade_level,
  '地理' as subject,
  NULL as rank_in_class,
  NULL as rank_in_grade,
  NULL as rank_in_school,
  gd.class_total_students,
  gd.grade_total_students,
  gd.created_at
FROM grade_data gd
WHERE gd.geography_score IS NOT NULL;

-- 12. 创建查询辅助函数
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

-- 13. 创建班级成绩统计函数
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

-- 14. 设置行级安全策略
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_level_configs ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Teachers can access grade data" ON grade_data
  FOR ALL USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can access import batches" ON import_batches
  FOR ALL USING (teacher_id IN (SELECT teacher_id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can access field mappings" ON field_mappings
  FOR ALL USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can access grade level configs" ON grade_level_configs
  FOR ALL USING (teacher_id IN (SELECT teacher_id FROM teachers WHERE user_id = auth.uid()) OR is_default = true);

-- 15. 验证完整安装
SELECT 
  'Safe database schema installation completed successfully!' as status,
  (SELECT COUNT(*) FROM grade_data) as grade_data_records,
  (SELECT COUNT(*) FROM import_batches) as import_batches_count,
  (SELECT COUNT(*) FROM field_mappings) as field_mappings_count,
  (SELECT COUNT(*) FROM grade_level_configs) as grade_level_configs_count,
  (SELECT COUNT(*) FROM grades) as grades_records; 