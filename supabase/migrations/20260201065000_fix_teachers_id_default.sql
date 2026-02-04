-- 修复 teachers 表 id 字段缺少默认值的问题
-- 创建时间: 2026-02-01
-- 问题: id 字段是 UUID 类型但没有 DEFAULT gen_random_uuid()，导致插入时必须手动提供 UUID

-- 为 teachers 表的 id 字段添加默认值
ALTER TABLE teachers
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 验证修改
COMMENT ON COLUMN teachers.id IS 'UUID primary key with auto-generation';
