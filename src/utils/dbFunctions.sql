
-- 创建用户资料触发器函数
CREATE OR REPLACE FUNCTION create_user_profile_function()
RETURNS FUNCTION AS $$
  CREATE OR REPLACE FUNCTION public.create_user_profile()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.user_profiles (id, phone)
    VALUES (NEW.id, NEW.phone);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  SELECT 'create_user_profile'::regproc;
$$ LANGUAGE sql;

-- 创建触发器
CREATE OR REPLACE FUNCTION create_user_profile_trigger()
RETURNS VOID AS $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
END;
$$ LANGUAGE plpgsql;

-- 设置用户资料表的RLS策略
CREATE OR REPLACE FUNCTION setup_profile_policies()
RETURNS VOID AS $$
BEGIN
  -- 启用RLS
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
  
  -- 删除可能存在的策略以避免冲突
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
  
  -- 创建新策略
  CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);
    
  CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);
END;
$$ LANGUAGE plpgsql;

-- 设置学生表的RLS策略
CREATE OR REPLACE FUNCTION setup_student_policies()
RETURNS VOID AS $$
BEGIN
  -- 启用RLS
  ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
  
  -- 删除可能存在的策略以避免冲突
  DROP POLICY IF EXISTS "Students read access" ON public.students;
  DROP POLICY IF EXISTS "Students write access for authenticated users" ON public.students;
  
  -- 创建新策略
  CREATE POLICY "Students read access"
    ON public.students FOR SELECT
    TO authenticated
    USING (true);
    
  CREATE POLICY "Students write access for authenticated users"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (true);
    
  CREATE POLICY "Students update access for authenticated users"
    ON public.students FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
END;
$$ LANGUAGE plpgsql;

-- 设置成绩表的RLS策略
CREATE OR REPLACE FUNCTION setup_grades_policies()
RETURNS VOID AS $$
BEGIN
  -- 启用RLS
  ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
  
  -- 删除可能存在的策略以避免冲突
  DROP POLICY IF EXISTS "Grades read access" ON public.grades;
  DROP POLICY IF EXISTS "Grades write access for authenticated users" ON public.grades;
  
  -- 创建新策略
  CREATE POLICY "Grades read access"
    ON public.grades FOR SELECT
    TO authenticated
    USING (true);
    
  CREATE POLICY "Grades write access for authenticated users"
    ON public.grades FOR INSERT
    TO authenticated
    WITH CHECK (true);
END;
$$ LANGUAGE plpgsql;
