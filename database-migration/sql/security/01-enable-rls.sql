-- ==========================================
-- 启用行级安全策略（RLS）
-- ==========================================

-- 1. 创建用户-班级关联表
CREATE TABLE IF NOT EXISTS user_class_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('owner', 'teacher', 'student', 'readonly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, class_name)
);

-- 为user_class_access表创建索引
CREATE INDEX idx_user_class_access_user ON user_class_access(user_id);
CREATE INDEX idx_user_class_access_class ON user_class_access(class_name);

-- 2. 启用RLS
ALTER TABLE grade_data_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_records ENABLE ROW LEVEL SECURITY;

-- 3. 创建RLS策略 - grade_data_new表
CREATE POLICY "用户只能查看授权班级的成绩数据"
ON grade_data_new
FOR SELECT
USING (
  -- 管理员可以查看所有数据
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- 或者用户有该班级的访问权限
  EXISTS (
    SELECT 1 FROM user_class_access
    WHERE user_id = auth.uid() AND class_name = grade_data_new.class_name
  )
);

-- 4. 创建RLS策略 - students表
CREATE POLICY "用户只能查看授权班级的学生"
ON students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_class_access uca
    JOIN class_info ci ON ci.class_name = uca.class_name
    WHERE uca.user_id = auth.uid()
    AND students.class_id::text = ci.class_name
  )
  OR
  -- 学生可以查看自己的信息
  students.user_id = auth.uid()
);

-- 5. 创建RLS策略 - homework表
CREATE POLICY "用户只能查看授权班级的作业"
ON homework
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- 作业创建者可以查看
  created_by = auth.uid()
  OR
  -- 班级有访问权限的用户可以查看
  EXISTS (
    SELECT 1 FROM user_class_access uca
    JOIN classes c ON c.id = homework.class_id
    WHERE uca.user_id = auth.uid() AND uca.class_name = c.name
  )
);

-- 6. 创建RLS策略 - homework_submissions表
CREATE POLICY "用户只能查看授权的作业提交"
ON homework_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- 作业创建者可以查看所有提交
  EXISTS (
    SELECT 1 FROM homework h
    WHERE h.id = homework_submissions.homework_id AND h.created_by = auth.uid()
  )
  OR
  -- 学生只能查看自己的提交
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = homework_submissions.student_id AND s.user_id = auth.uid()
  )
);

-- 7. 创建RLS策略 - warning_records表
CREATE POLICY "用户只能查看授权的预警记录"
ON warning_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- 教师可以查看其班级的预警
  EXISTS (
    SELECT 1 FROM students s
    JOIN user_class_access uca ON uca.class_name = s.class_id::text
    WHERE s.student_id = warning_records.student_id
    AND uca.user_id = auth.uid()
  )
  OR
  -- 学生可以查看自己的预警
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.student_id = warning_records.student_id AND s.user_id = auth.uid()
  )
);

-- 8. 为user_class_access表启用RLS
ALTER TABLE user_class_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的班级访问权限"
ON user_class_access
FOR SELECT
USING (user_id = auth.uid());

-- 9. 创建辅助函数：检查用户是否是管理员
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建辅助函数：获取用户可访问的班级列表
CREATE OR REPLACE FUNCTION get_user_accessible_classes()
RETURNS TABLE(class_name TEXT) AS $$
BEGIN
  -- 如果是管理员，返回所有班级
  IF is_admin() THEN
    RETURN QUERY SELECT ci.class_name FROM class_info ci;
  ELSE
    -- 否则返回用户有权限的班级
    RETURN QUERY
    SELECT uca.class_name
    FROM user_class_access uca
    WHERE uca.user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 注释说明
-- ==========================================

COMMENT ON TABLE user_class_access IS '用户-班级访问权限关联表';
COMMENT ON COLUMN user_class_access.access_type IS '访问类型: owner(所有者), teacher(教师), student(学生), readonly(只读)';
COMMENT ON FUNCTION is_admin() IS '检查当前用户是否是管理员';
COMMENT ON FUNCTION get_user_accessible_classes() IS '获取当前用户可访问的班级列表';
