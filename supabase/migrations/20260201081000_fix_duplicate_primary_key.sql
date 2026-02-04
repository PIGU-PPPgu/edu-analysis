-- 修复 grade_data 表的重复主键问题
-- 删除重复的主键约束 grade_data_pkey1

-- 1. 删除重复的主键约束
ALTER TABLE grade_data DROP CONSTRAINT IF EXISTS grade_data_pkey1;

-- 2. 确保只保留一个主键约束
-- (grade_data_pkey 应该已经存在)

-- 3. 验证约束状态
DO $$
DECLARE
    pk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pk_count
    FROM information_schema.table_constraints
    WHERE table_name = 'grade_data' AND constraint_type = 'PRIMARY KEY';

    IF pk_count != 1 THEN
        RAISE EXCEPTION '主键约束数量异常: %，应该只有1个', pk_count;
    END IF;

    RAISE NOTICE '✅ grade_data 表主键约束已修复，当前有 % 个主键', pk_count;
END $$;

-- 4. 添加注释
COMMENT ON TABLE grade_data IS '学生成绩数据表（已修复重复主键问题）';
