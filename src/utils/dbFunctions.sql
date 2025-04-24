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

-- 获取学生预警列表
CREATE OR REPLACE FUNCTION get_student_warnings()
RETURNS TABLE (
  student_id TEXT,
  name TEXT,
  risk_level TEXT,
  warning_subjects TEXT[],
  trend TEXT,
  last_update TIMESTAMP
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH recent_grades AS (
    SELECT 
      g.student_id,
      s.name,
      g.subject,
      g.score,
      g.exam_date,
      CASE
        WHEN AVG(g.score) < 60 THEN 'high'
        WHEN AVG(g.score) < 70 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      CASE
        WHEN LAG(g.score) OVER (PARTITION BY g.student_id, g.subject ORDER BY g.exam_date) < g.score THEN 'up'
        WHEN LAG(g.score) OVER (PARTITION BY g.student_id, g.subject ORDER BY g.exam_date) > g.score THEN 'down'
        ELSE 'stable'
      END as trend
    FROM grades g
    JOIN students s ON s.student_id = g.student_id
    WHERE g.exam_date >= NOW() - INTERVAL '6 months'
    GROUP BY g.student_id, s.name, g.subject, g.score, g.exam_date
    HAVING AVG(g.score) < 75
  )
  SELECT DISTINCT ON (rg.student_id)
    rg.student_id,
    rg.name,
    rg.risk_level,
    ARRAY_AGG(DISTINCT rg.subject) as warning_subjects,
    rg.trend,
    MAX(rg.exam_date) as last_update
  FROM recent_grades rg
  GROUP BY rg.student_id, rg.name, rg.risk_level, rg.trend;
END;
$$;

-- 获取预警统计信息
CREATE OR REPLACE FUNCTION get_warning_statistics()
RETURNS TABLE (
  high_risk INTEGER,
  medium_risk INTEGER,
  low_risk INTEGER,
  total INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT * FROM get_student_warnings()
  )
  SELECT
    COUNT(*) FILTER (WHERE risk_level = 'high')::INTEGER as high_risk,
    COUNT(*) FILTER (WHERE risk_level = 'medium')::INTEGER as medium_risk,
    COUNT(*) FILTER (WHERE risk_level = 'low')::INTEGER as low_risk,
    COUNT(*)::INTEGER as total
  FROM stats;
END;
$$;

-- 获取风险因素数据
CREATE OR REPLACE FUNCTION get_risk_factors()
RETURNS TABLE (
  factor TEXT,
  value NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH recent_data AS (
    SELECT
      COUNT(DISTINCT student_id)::FLOAT as total_students,
      COUNT(*) FILTER (WHERE score < 60)::FLOAT as failed_count,
      COUNT(*) as total_exams
    FROM grades
    WHERE exam_date >= NOW() - INTERVAL '6 months'
  )
  SELECT unnest(ARRAY[
    '出勤率',
    '作业完成',
    '考试成绩',
    '课堂参与',
    '学习态度'
  ]) as factor,
  unnest(ARRAY[
    85, -- 模拟出勤率
    75, -- 模拟作业完成率
    (1 - (failed_count / NULLIF(total_exams, 0))) * 100, -- 及格率转换为分数
    70, -- 模拟课堂参与度
    80  -- 模拟学习态度分数
  ])::NUMERIC as value
  FROM recent_data;
END;
$$;

-- 获取当前用户角色
CREATE OR REPLACE FUNCTION get_user_roles()
RETURNS SETOF text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_id uuid;
BEGIN
  -- 获取当前用户ID
  user_id := auth.uid();
  
  -- 如果用户未登录，返回空结果
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- 返回用户角色
  RETURN QUERY
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  UNION
  SELECT 'student' WHERE EXISTS (
    SELECT 1 FROM public.students WHERE user_id = auth.uid()
  );
END;
$$;

-- 检查用户是否为管理员
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;
