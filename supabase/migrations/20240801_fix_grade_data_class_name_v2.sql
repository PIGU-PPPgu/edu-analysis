-- 将grade_data表中的NULL或空班级名称更新为默认值
UPDATE grade_data SET class_name = '未知班级' WHERE class_name IS NULL OR class_name = '';

-- 添加默认值约束
ALTER TABLE grade_data ALTER COLUMN class_name SET DEFAULT '未知班级';

-- 添加NOT NULL约束
ALTER TABLE grade_data ALTER COLUMN class_name SET NOT NULL;

-- 添加注释说明表和字段
COMMENT ON TABLE grade_data IS '学生成绩数据表';
COMMENT ON COLUMN grade_data.class_name IS '班级名称，不允许为空，默认为"未知班级"';

-- 日志记录
DO $$
BEGIN
  RAISE NOTICE '成功修复grade_data表的class_name列，设置默认值为"未知班级"并添加NOT NULL约束';
END $$; 