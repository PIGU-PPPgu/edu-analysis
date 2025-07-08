-- 更新grade_data表结构，添加缺失的排名字段
-- 这些字段可能在之前的schema中丢失了

-- 添加总分排名字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_rank_in_grade INTEGER;

-- 添加各科目排名字段
-- 语文
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_rank_in_grade INTEGER;

-- 数学
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_rank_in_grade INTEGER;

-- 英语
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_rank_in_grade INTEGER;

-- 物理
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_rank_in_grade INTEGER;

-- 化学
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_rank_in_grade INTEGER;

-- 道法
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_rank_in_grade INTEGER;

-- 历史
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_rank_in_school INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_rank_in_grade INTEGER;

-- 确保基本字段存在
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS total_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_grade TEXT;

-- 查看表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'grade_data' 
ORDER BY ordinal_position;