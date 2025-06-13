-- Supabase 认证修复脚本
-- 在 Supabase Dashboard -> SQL Editor 中运行

-- 1. 检查认证状态
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') 
        THEN '✅ Auth schema exists' 
        ELSE '❌ Auth schema missing' 
    END as auth_schema_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
        THEN '✅ Auth users table exists' 
        ELSE '❌ Auth users table missing' 
    END as auth_users_table_status;

-- 2. 创建或修复 user_profiles 表
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
DROP POLICY IF EXISTS "Enable read access for users" ON public.user_profiles;
CREATE POLICY "Enable read access for users" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Enable insert for users" ON public.user_profiles;
CREATE POLICY "Enable insert for users" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable update for users" ON public.user_profiles;
CREATE POLICY "Enable update for users" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. 创建用户注册触发器
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
EXCEPTION WHEN OTHERS THEN
    -- 记录错误但不阻止用户创建
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 验证修复结果
SELECT 'Repair completed. Auth setup should now work.' as status; 