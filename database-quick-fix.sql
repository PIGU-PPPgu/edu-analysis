-- 成绩分析系统数据库快速修复脚本
-- 请在Supabase Dashboard的SQL编辑器中执行此脚本

-- =====================================================
-- 第一部分：添加缺失的字段到grade_data表
-- =====================================================

-- 添加年级字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS grade_level text;

-- 添加科目满分字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS subject_total_score numeric;

-- 添加原始等级字段（来自CSV）
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS original_grade text;

-- 添加计算等级字段（系统计算）
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS computed_grade text;

-- 设置默认值
UPDATE grade_data SET subject_total_score = 100 WHERE subject_total_score IS NULL;

-- =====================================================
-- 第二部分：创建等级配置表
-- =====================================================

-- 创建等级配置表
CREATE TABLE IF NOT EXISTS grade_level_config (
  id SERIAL PRIMARY KEY,
  config_name TEXT NOT NULL,
  grade_levels JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认等级配置
INSERT INTO grade_level_config (config_name, grade_levels, is_default, description)
VALUES (
  '标准5级制',
  '[
    {"grade": "A", "name": "优秀", "min_score": 90, "max_score": 100},
    {"grade": "B", "name": "良好", "min_score": 80, "max_score": 89},
    {"grade": "C", "name": "中等", "min_score": 70, "max_score": 79},
    {"grade": "D", "name": "及格", "min_score": 60, "max_score": 69},
    {"grade": "F", "name": "不及格", "min_score": 0, "max_score": 59}
  ]'::jsonb,
  true,
  '标准的5级等级制度'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 第三部分：创建必要的数据库函数
-- =====================================================

-- 先删除现有的has_column函数（如果存在）
DROP FUNCTION IF EXISTS has_column(text, text);

-- 创建has_column函数（修复前端检查字段的问题）
CREATE OR REPLACE FUNCTION has_column(table_name_param text, column_name_param text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns 
    WHERE table_name = table_name_param 
    AND column_name = column_name_param
    AND table_schema = 'public'
  );
END;
$$;

-- 创建等级计算函数
CREATE OR REPLACE FUNCTION calculate_grade_level(score_value numeric, total_score_value numeric DEFAULT 100)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  percentage numeric;
  config_data jsonb;
  grade_level text;
  level jsonb;
BEGIN
  -- 计算百分比
  percentage := (score_value / total_score_value) * 100;
  
  -- 获取默认等级配置
  SELECT grade_levels INTO config_data
  FROM grade_level_config
  WHERE is_default = true
  LIMIT 1;
  
  -- 如果没有配置，使用默认规则
  IF config_data IS NULL THEN
    IF percentage >= 90 THEN
      RETURN 'A';
    ELSIF percentage >= 80 THEN
      RETURN 'B';
    ELSIF percentage >= 70 THEN
      RETURN 'C';
    ELSIF percentage >= 60 THEN
      RETURN 'D';
    ELSE
      RETURN 'F';
    END IF;
  END IF;
  
  -- 使用配置的等级规则
  FOR level IN SELECT * FROM jsonb_array_elements(config_data)
  LOOP
    IF percentage >= (level->>'min_score')::numeric AND 
       percentage <= (level->>'max_score')::numeric THEN
      RETURN level->>'grade';
    END IF;
  END LOOP;
  
  RETURN 'F'; -- 默认返回F
END;
$$;

-- 创建有效分数获取函数（优先使用score字段）
CREATE OR REPLACE FUNCTION get_effective_score(score_value numeric, total_score_value numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  -- 优先使用score字段，如果为空则使用total_score
  RETURN COALESCE(score_value, total_score_value);
END;
$$;

-- 创建有效等级获取函数（优先级处理）
CREATE OR REPLACE FUNCTION get_effective_grade(original_grade text, computed_grade text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- 优先级：original_grade > computed_grade
  RETURN COALESCE(original_grade, computed_grade, 'N/A');
END;
$$;

-- =====================================================
-- 第四部分：创建分析视图（简化查询）
-- =====================================================

-- 创建成绩分析视图
CREATE OR REPLACE VIEW grade_analysis_view AS
SELECT 
  id,
  exam_id,
  student_id,
  name,
  class_name,
  grade_level,
  subject,
  get_effective_score(score, total_score) as effective_score,
  subject_total_score,
  get_effective_grade(original_grade, computed_grade) as effective_grade,
  original_grade,
  computed_grade,
  rank_in_class,
  rank_in_grade,
  percentile,
  z_score,
  exam_title,
  exam_type,
  exam_date,
  exam_scope,
  created_at,
  updated_at
FROM grade_data;

-- =====================================================
-- 第五部分：创建触发器（自动计算等级）
-- =====================================================

-- 创建自动计算等级的触发器函数
CREATE OR REPLACE FUNCTION auto_calculate_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 如果computed_grade为空且有分数，自动计算等级
  IF NEW.computed_grade IS NULL AND NEW.score IS NOT NULL THEN
    NEW.computed_grade := calculate_grade_level(
      NEW.score, 
      COALESCE(NEW.subject_total_score, 100)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_auto_calculate_grade ON grade_data;
CREATE TRIGGER trigger_auto_calculate_grade
  BEFORE INSERT OR UPDATE ON grade_data
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_grade();

-- =====================================================
-- 第六部分：索引优化（提升查询性能）
-- =====================================================

-- 创建常用查询的索引
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_subject ON grade_data(subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_grade_level ON grade_data(grade_level);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_grade_data_class_subject ON grade_data(class_name, subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_subject ON grade_data(exam_id, subject);

-- =====================================================
-- 第七部分：数据完整性检查和修复
-- =====================================================

-- 修复可能的数据问题
UPDATE grade_data 
SET class_name = '待分配班级' 
WHERE class_name IS NULL OR class_name = '' OR class_name = '未知班级';

-- 确保考试范围字段有默认值
UPDATE grade_data 
SET exam_scope = 'class' 
WHERE exam_scope IS NULL;

-- =====================================================
-- 验证脚本执行结果
-- =====================================================

-- 验证新字段是否添加成功
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'grade_data' 
AND column_name IN ('grade_level', 'subject_total_score', 'original_grade', 'computed_grade')
ORDER BY column_name;

-- 验证新表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'grade_level_config';

-- 验证函数是否创建成功
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('calculate_grade_level', 'get_effective_score', 'get_effective_grade', 'has_column')
AND routine_schema = 'public';

-- 验证默认等级配置是否插入成功
SELECT config_name, is_default 
FROM grade_level_config 
WHERE is_default = true;

-- 测试函数是否正常工作
SELECT 
  calculate_grade_level(85, 100) as test_grade_calculation,
  get_effective_score(85, 90) as test_effective_score,
  get_effective_grade('B', 'A') as test_effective_grade,
  has_column('grade_data', 'grade_level') as test_has_column;

-- 显示修复后的班级数据分布
SELECT 
  class_name, 
  COUNT(*) as record_count
FROM grade_data 
GROUP BY class_name 
ORDER BY record_count DESC;

-- =====================================================
-- 脚本执行完成
-- =====================================================

-- 显示完成信息
SELECT 
  '🎉 数据库修复脚本执行完成！' as status,
  NOW() as completed_at;

SELECT 
  '✅ 新字段已添加到grade_data表' as step_1,
  '✅ grade_level_config表已创建' as step_2,
  '✅ 必要的数据库函数已创建' as step_3,
  '✅ 分析视图和触发器已创建' as step_4,
  '✅ 索引优化已完成' as step_5,
  '✅ 数据完整性已修复' as step_6; 