-- ============================================
-- 完整的 RLS (Row Level Security) 策略配置
-- 用于数据隔离和权限控制
-- ============================================

-- 1️⃣ 启用 RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- 2️⃣ 删除旧策略（如果存在）
DROP POLICY IF EXISTS "students_read_policy" ON students;
DROP POLICY IF EXISTS "class_info_read_policy" ON class_info;
DROP POLICY IF EXISTS "grade_data_read_policy" ON grade_data;
DROP POLICY IF EXISTS "homework_read_policy" ON homework;
DROP POLICY IF EXISTS "submissions_read_policy" ON homework_submissions;

-- ============================================
-- 🔐 Students 表策略
-- ============================================

-- 管理员和老师可以读取所有学生
CREATE POLICY "students_read_policy" ON students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
  OR
  -- 学生只能看自己的信息
  user_id = auth.uid()
);

-- 管理员可以插入学生
CREATE POLICY "students_insert_policy" ON students
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 管理员可以更新学生
CREATE POLICY "students_update_policy" ON students
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================
-- 🏫 Class_info 表策略
-- ============================================

-- 所有认证用户可以读取班级信息（公开数据）
CREATE POLICY "class_info_read_policy" ON class_info
FOR SELECT
TO authenticated
USING (true);

-- 管理员可以管理班级
CREATE POLICY "class_info_insert_policy" ON class_info
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "class_info_update_policy" ON class_info
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================
-- 📊 Grade_data 表策略
-- ============================================

-- 管理员和老师可以读取所有成绩
-- 学生只能看自己的成绩
CREATE POLICY "grade_data_read_policy" ON grade_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
  OR
  -- 学生只能看自己的成绩
  student_id IN (
    SELECT student_id FROM students
    WHERE user_id = auth.uid()
  )
);

-- 管理员和老师可以插入成绩
CREATE POLICY "grade_data_insert_policy" ON grade_data
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- ============================================
-- 📝 Homework 表策略
-- ============================================

-- 所有认证用户可以读取作业
CREATE POLICY "homework_read_policy" ON homework
FOR SELECT
TO authenticated
USING (true);

-- 老师和管理员可以创建作业
CREATE POLICY "homework_insert_policy" ON homework
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- 老师可以更新自己创建的作业
CREATE POLICY "homework_update_policy" ON homework
FOR UPDATE
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================
-- 📤 Homework_submissions 表策略
-- ============================================

-- 老师和管理员可以看所有提交
-- 学生只能看自己的提交
CREATE POLICY "submissions_read_policy" ON homework_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
  OR
  -- 学生只能看自己的提交
  student_id IN (
    SELECT id FROM students
    WHERE user_id = auth.uid()
  )
);

-- 学生可以创建自己的提交
CREATE POLICY "submissions_insert_policy" ON homework_submissions
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM students
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- 学生可以更新自己的提交（未批改前）
-- 老师可以更新所有提交（批改）
CREATE POLICY "submissions_update_policy" ON homework_submissions
FOR UPDATE
USING (
  (
    student_id IN (
      SELECT id FROM students
      WHERE user_id = auth.uid()
    )
    AND status = 'submitted'  -- 只能更新未批改的
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'teacher')
  )
);

-- ============================================
-- 📊 添加注释说明
-- ============================================

COMMENT ON POLICY "students_read_policy" ON students IS '管理员和老师可读取所有学生，学生只能读取自己';
COMMENT ON POLICY "grade_data_read_policy" ON grade_data IS '管理员和老师可读取所有成绩，学生只能读取自己的成绩';
COMMENT ON POLICY "submissions_read_policy" ON homework_submissions IS '管理员和老师可读取所有提交，学生只能读取自己的提交';

-- ============================================
-- ✅ 完成
-- ============================================
