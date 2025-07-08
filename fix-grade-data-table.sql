-- 修复grade_data表结构，确保包含所有必要字段

-- 添加可能缺失的字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS exam_id TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_rank_in_grade INTEGER;

-- 添加各科目排名字段（如果缺失）
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_rank_in_grade INTEGER;

ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_rank_in_grade INTEGER;

ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_rank_in_grade INTEGER;

ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_rank_in_grade INTEGER;

ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_rank_in_grade INTEGER;

ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_rank_in_grade INTEGER;

ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_rank_in_grade INTEGER;

-- 查看表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'grade_data' 
ORDER BY ordinal_position;