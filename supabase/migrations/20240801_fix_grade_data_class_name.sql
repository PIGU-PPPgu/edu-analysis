-- 为grade_data表的class_name字段添加默认值
-- 这将确保所有新记录如果未提供班级名称，会自动设置为'未知班级'
-- 同时也会把现有的NULL值更新为'未知班级'

-- 首先更新现有的NULL记录
UPDATE grade_data 
SET class_name = '未知班级'
WHERE class_name IS NULL;

-- 然后为字段添加默认值
ALTER TABLE grade_data 
ALTER COLUMN class_name SET DEFAULT '未知班级';

-- 记录迁移日志
INSERT INTO _migrations (name, applied_at)
VALUES ('20240801_fix_grade_data_class_name', now())
ON CONFLICT (name) DO NOTHING;

-- 添加注释
COMMENT ON COLUMN grade_data.class_name IS '学生班级名称，默认为"未知班级"，确保查询和图表显示时有值'; 