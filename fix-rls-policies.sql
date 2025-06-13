-- 修复学生画像数据的RLS策略问题
-- 临时允许匿名用户插入数据以修复基础数据

-- 1. 检查现有RLS策略
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('classes', 'students') 
ORDER BY tablename, policyname;

-- 2. 临时禁用classes表的RLS（用于数据修复）
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- 3. 临时禁用students表的RLS（用于数据修复）
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- 注意：这是临时措施，数据修复完成后需要重新启用RLS并配置正确的政策 