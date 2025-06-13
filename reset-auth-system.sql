-- 重置 Supabase 认证系统脚本
-- ⚠️ 警告：这会删除所有现有用户数据！
-- 只有在确认无法修复时才运行

-- 1. 备份现有数据（如果有的话）
CREATE TABLE IF NOT EXISTS public.auth_users_backup AS 
SELECT * FROM auth.users WHERE false; -- 创建空表结构

-- 如果auth.users表存在且有数据，先备份
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        INSERT INTO public.auth_users_backup 
        SELECT * FROM auth.users;
        RAISE NOTICE 'Backed up % users', (SELECT COUNT(*) FROM auth.users);
    END IF;
END $$;

-- 2. 清理现有用户数据（谨慎操作）
-- TRUNCATE auth.users CASCADE; -- 取消注释来执行

-- 3. 确保 public.user_profiles 表存在
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. 创建安全策略
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_profiles;
CREATE POLICY "Enable all access for authenticated users" 
    ON public.user_profiles 
    FOR ALL 
    USING (auth.uid() = id);

-- 5. 重新创建用户注册触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
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
    RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 6. 测试触发器
SELECT 'Auth system reset complete. Try creating a user now.' as status; 