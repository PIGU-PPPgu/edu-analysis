-- 🚀 快速修复脚本（核心问题）

-- 1. 添加标准科目字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_score NUMERIC CHECK (chinese_score >= 0 AND chinese_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_score NUMERIC CHECK (math_score >= 0 AND math_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_score NUMERIC CHECK (english_score >= 0 AND english_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_score NUMERIC CHECK (physics_score >= 0 AND physics_score <= 100);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_score NUMERIC CHECK (chemistry_score >= 0 AND chemistry_score <= 100);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS biology_score NUMERIC CHECK (biology_score >= 0 AND biology_score <= 100);

-- 2. 修复exams表问题
ALTER TABLE exams DROP COLUMN IF EXISTS subject;

-- 3. 创建基础索引
CREATE INDEX IF NOT EXISTS idx_grade_data_scores ON grade_data (chinese_score, math_score, english_score);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_exam ON grade_data (student_id, exam_id);

-- 4. 数据迁移（如果score字段有数据）
UPDATE grade_data SET total_score = score WHERE total_score IS NULL AND score IS NOT NULL;

SELECT '🎉 核心修复完成！' as result;