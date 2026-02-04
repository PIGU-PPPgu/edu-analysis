-- 修复 teachers 表的外键约束问题
-- 问题：teachers.id 引用 auth.users(id)，但导入的教师不一定是系统用户
-- 解决：移除外键约束，改为普通 UUID 主键

-- 1. 移除外键约束
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_id_fkey;

-- 2. 确认 id 有默认值（之前已添加）
-- ALTER TABLE teachers ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. 添加注释
COMMENT ON COLUMN teachers.id IS 'Teacher UUID (独立主键，不强制关联 auth.users)';
COMMENT ON TABLE teachers IS '教师信息表 - 教师不一定是系统用户，可通过导入创建';
