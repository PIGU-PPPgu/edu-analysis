-- 修复Supabase认证表结构
-- 这个脚本需要在Supabase SQL编辑器中运行

-- 1. 检查auth schema是否存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        CREATE SCHEMA auth;
        RAISE NOTICE 'Created auth schema';
    ELSE
        RAISE NOTICE 'Auth schema already exists';
    END IF;
END $$;

-- 2. 确保auth.users表存在且配置正确
-- 注意：在正常的Supabase项目中，这些表应该自动存在
-- 如果不存在，说明项目初始化有问题

-- 检查auth.users表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'auth.users table does not exist. This indicates a problem with Supabase project initialization. Please contact Supabase support or recreate the project.';
    ELSE
        RAISE NOTICE 'auth.users table exists';
    END IF;
END $$;

-- 3. 检查RLS (Row Level Security) 策略
-- 确保用户可以注册

-- 检查public schema的用户相关表
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户可以读取和更新自己的profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 4. 创建触发器：在用户注册时自动创建profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'teacher'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 检查是否有阻止注册的限制
-- 检查Supabase项目设置中的认证配置

-- 显示当前数据库中的用户数量
SELECT 
    'Total users in auth.users: ' || COUNT(*) as user_count
FROM auth.users;

-- 显示user_profiles表状态
SELECT 
    'Total user profiles: ' || COUNT(*) as profile_count
FROM public.user_profiles;

-- 最后的诊断信息
SELECT 
    'Database name: ' || current_database() as database_info
UNION ALL
SELECT 
    'Auth schema exists: ' || CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
        THEN 'YES' 
        ELSE 'NO' 
    END as auth_schema_status
UNION ALL
SELECT 
    'Auth users table exists: ' || CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
        THEN 'YES' 
        ELSE 'NO' 
    END as auth_users_table_status; 