-- Supabase用户表和角色配置

-- 1. 创建用户角色枚举类型（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'teacher', 'student');
  END IF;
END $$;

-- 2. 创建用户角色表（如果不存在）
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. 创建教师表（如果不存在）
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 确保students表与用户ID关联
-- 注意：students表已存在，但我们需要确保它正确关联到auth.users
ALTER TABLE IF EXISTS students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 安全地删除相关的策略和触发器（只有在对应的表存在时）
DO $$
BEGIN
  -- 删除user_roles表相关策略
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_roles') THEN
    DROP POLICY IF EXISTS admin_view_all_roles ON user_roles;
    DROP POLICY IF EXISTS users_view_own_roles ON user_roles;
    DROP POLICY IF EXISTS admin_manage_roles ON user_roles;
  END IF;

  -- 删除teachers表相关策略
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'teachers') THEN
    DROP POLICY IF EXISTS view_teachers ON teachers;
    DROP POLICY IF EXISTS admin_manage_teachers ON teachers;
    DROP POLICY IF EXISTS teachers_update_own ON teachers;
  END IF;

  -- 删除触发器
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  END IF;
END
$$;

-- 删除函数时使用CASCADE选项，包括删除所有依赖项
DROP FUNCTION IF EXISTS get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 5. 重新创建用户角色查询RPC函数
CREATE OR REPLACE FUNCTION get_user_roles(_user_id UUID DEFAULT auth.uid())
RETURNS SETOF app_role AS $$
BEGIN
  RETURN QUERY SELECT role FROM user_roles WHERE user_id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 重新创建检查用户角色的函数
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 重新创建检查当前用户是否为管理员的函数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 重新创建为新注册用户自动添加默认角色的触发器
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 默认分配学生角色给所有新用户
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 9. 设置行级安全策略
-- user_roles表的安全策略
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 管理员可以查看所有角色
CREATE POLICY admin_view_all_roles ON user_roles 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 用户可以查看自己的角色
CREATE POLICY users_view_own_roles ON user_roles 
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 只有管理员可以分配角色
CREATE POLICY admin_manage_roles ON user_roles 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- teachers表的安全策略
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- 管理员和教师可以查看教师信息
CREATE POLICY view_teachers ON teachers 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
    )
  );

-- 只有管理员可以管理教师信息
CREATE POLICY admin_manage_teachers ON teachers 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 教师可以更新自己的信息
CREATE POLICY teachers_update_own ON teachers 
  FOR UPDATE USING (
    id = auth.uid()
  ); 