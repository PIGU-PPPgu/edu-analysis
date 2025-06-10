-- 修复版快速数据库Schema - 解决函数冲突和成绩导入问题
-- 这个版本会先清理现有函数，然后重新创建

-- 1. 为grades表添加缺失的字段
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_school INTEGER;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS total_score NUMERIC;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS exam_title TEXT;

-- 2. 添加索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_grades_rank_class ON grades(rank_in_class);
CREATE INDEX IF NOT EXISTS idx_grades_rank_grade ON grades(rank_in_grade);
CREATE INDEX IF NOT EXISTS idx_grades_grade_level ON grades(grade_level);
CREATE INDEX IF NOT EXISTS idx_grades_exam_title ON grades(exam_title);

-- 3. 删除现有的函数（如果存在）
DROP FUNCTION IF EXISTS calculate_grade_level(NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS calculate_grade_level(NUMERIC);
DROP FUNCTION IF EXISTS auto_update_grade_level();

-- 4. 删除现有的触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_auto_update_grade_level ON grades;

-- 5. 重新创建等级计算函数
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

-- 6. 重新创建自动更新等级的触发器函数
CREATE OR REPLACE FUNCTION auto_update_grade_level()
RETURNS TRIGGER AS $$
BEGIN
  -- 自动计算等级
  IF NEW.score IS NOT NULL AND NEW.max_score IS NOT NULL THEN
    NEW.grade_level := calculate_grade_level(NEW.score, NEW.max_score);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 重新创建触发器
CREATE TRIGGER trigger_auto_update_grade_level
  BEFORE INSERT OR UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION auto_update_grade_level();

-- 8. 更新现有数据的等级字段
UPDATE grades 
SET grade_level = calculate_grade_level(score, max_score)
WHERE score IS NOT NULL AND max_score IS NOT NULL AND grade_level IS NULL;

-- 9. 验证修复结果
SELECT 
  'Fixed database schema completed successfully!' as status,
  COUNT(*) as total_grades_records,
  COUNT(grade_level) as records_with_grade_level
FROM grades; 