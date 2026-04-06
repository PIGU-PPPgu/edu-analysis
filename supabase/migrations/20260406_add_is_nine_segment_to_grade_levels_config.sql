-- 给 grade_levels_config 表添加 is_nine_segment 字段
-- 用于标识该配置是否为九段评价（高中使用），区别于六段评价（初中使用）
ALTER TABLE grade_levels_config
  ADD COLUMN IF NOT EXISTS is_nine_segment BOOLEAN NOT NULL DEFAULT false;

-- 将"深圳市标准九段评价"配置标记为九段
-- 通过名称匹配，避免硬编码 ID
UPDATE grade_levels_config
SET is_nine_segment = true
WHERE name ILIKE '%九段%';

-- 确保同时只有一条九段配置（加唯一约束，仅对 true 值生效）
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_levels_config_one_nine_segment
  ON grade_levels_config (is_nine_segment)
  WHERE is_nine_segment = true;
