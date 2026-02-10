-- Migration: 添加等级列到grade_data表
-- Task #21: 支持从Excel导入各科目的等级（可选字段）
-- Date: 2026-02-10

-- 添加9个科目的等级字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS biology_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS politics_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS history_grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS geography_grade TEXT;

-- 添加注释说明字段用途
COMMENT ON COLUMN grade_data.chinese_grade IS '语文等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.math_grade IS '数学等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.english_grade IS '英语等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.physics_grade IS '物理等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.chemistry_grade IS '化学等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.biology_grade IS '生物等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.politics_grade IS '政治/道法等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.history_grade IS '历史等级（从Excel导入或系统计算）';
COMMENT ON COLUMN grade_data.geography_grade IS '地理等级（从Excel导入或系统计算）';
