-- Supabase 项目完整诊断脚本
-- 在 Supabase Dashboard → SQL Editor 中运行

-- 1. 检查基本数据库信息
SELECT 
    'Database: ' || current_database() as info
UNION ALL
SELECT 
    'Current User: ' || current_user
UNION ALL
SELECT 
    'Server Version: ' || version();

-- 2. 检查 auth schema 状态
SELECT 
    'Auth Schema Exists: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
        THEN 'YES ✅' 
        ELSE 'NO ❌' 
    END as auth_schema_status;

-- 3. 检查 auth.users 表
SELECT 
    'Auth Users Table: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) 
        THEN 'EXISTS ✅' 
        ELSE 'MISSING ❌' 
    END as auth_users_table;

-- 4. 检查 auth.users 表结构
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        RAISE NOTICE '✅ auth.users table exists';
        
        -- 检查关键字段
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'id'
        ) THEN
            RAISE NOTICE '✅ auth.users.id field exists';
        ELSE
            RAISE NOTICE '❌ auth.users.id field missing';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email'
        ) THEN
            RAISE NOTICE '✅ auth.users.email field exists';
        ELSE
            RAISE NOTICE '❌ auth.users.email field missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ auth.users table does not exist!';
    END IF;
END $$;

-- 5. 检查现有用户数量
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        SELECT COUNT(*) INTO user_count FROM auth.users;
        RAISE NOTICE 'Current users in auth.users: %', user_count;
    ELSE
        RAISE NOTICE 'Cannot count users - auth.users table missing';
    END IF;
END $$;

-- 6. 检查 RLS 政策
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname IN ('auth', 'public')
ORDER BY schemaname, tablename;

-- 7. 检查触发器
SELECT 
    event_object_schema,
    event_object_table,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table;

-- 8. 检查存储过程/函数
SELECT 
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema IN ('auth', 'public')
ORDER BY routine_schema, routine_name;

-- 最终状态报告
SELECT '=== DIAGNOSIS COMPLETE ===' as status; 