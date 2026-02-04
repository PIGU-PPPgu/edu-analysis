-- ============================================
-- 修复增值评价系统的RLS策略
-- ============================================

-- ============================================
-- 1. teacher_student_subjects 表 - 添加写入策略
-- ============================================

-- 管理员和年级组长可以插入数据
DROP POLICY IF EXISTS "管理员可插入教学关系" ON teacher_student_subjects;
CREATE POLICY "管理员可插入教学关系" ON teacher_student_subjects
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- 管理员和年级组长可以更新数据
DROP POLICY IF EXISTS "管理员可更新教学关系" ON teacher_student_subjects;
CREATE POLICY "管理员可更新教学关系" ON teacher_student_subjects
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- 管理员和年级组长可以删除数据
DROP POLICY IF EXISTS "管理员可删除教学关系" ON teacher_student_subjects;
CREATE POLICY "管理员可删除教学关系" ON teacher_student_subjects
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- ============================================
-- 2. 收紧 grade_data 表的写入策略
-- ============================================

-- 删除过宽的策略
DROP POLICY IF EXISTS "allow_authenticated_insert_grade_data" ON grade_data;
DROP POLICY IF EXISTS "allow_authenticated_update_grade_data" ON grade_data;

-- 只允许管理员和年级组长插入成绩数据
CREATE POLICY "管理员可插入成绩" ON grade_data
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- 只允许管理员和年级组长更新成绩数据
CREATE POLICY "管理员可更新成绩" ON grade_data
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- ============================================
-- 3. 收紧 students 表的写入策略
-- ============================================

-- 删除过宽的策略
DROP POLICY IF EXISTS "allow_authenticated_insert_students" ON students;
DROP POLICY IF EXISTS "allow_authenticated_update_students" ON students;

-- 只允许管理员和年级组长插入学生信息
CREATE POLICY "管理员可插入学生" ON students
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- 只允许管理员和年级组长更新学生信息
CREATE POLICY "管理员可更新学生" ON students
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- 学生可以查看自己的信息，教师可以查看所教学生的信息
DROP POLICY IF EXISTS "allow_authenticated_read_students" ON students;
CREATE POLICY "用户可查看相关学生" ON students
  FOR SELECT
  USING (
    -- 管理员可查看全部
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
    -- 教师可查看自己所教学生
    OR EXISTS (
      SELECT 1 FROM teacher_student_subjects tss
      WHERE tss.student_id = students.student_id AND tss.teacher_id = auth.uid()
    )
    -- 学生可查看自己
    OR user_id = auth.uid()
  );

-- ============================================
-- 4. 添加 exams 表的RLS策略（如果缺失）
-- ============================================

-- 启用RLS（如果未启用）
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可读
DROP POLICY IF EXISTS "所有人可查看考试" ON exams;
CREATE POLICY "所有人可查看考试" ON exams
  FOR SELECT
  TO authenticated
  USING (true);

-- 只有管理员可写
DROP POLICY IF EXISTS "管理员可管理考试" ON exams;
CREATE POLICY "管理员可管理考试" ON exams
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- ============================================
-- 5. 添加索引以优化策略性能
-- ============================================

-- teacher_student_subjects 的teacher_id索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_tss_teacher_id ON teacher_student_subjects(teacher_id);

-- students 的user_id索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- user_roles 的复合索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- ============================================
-- 完成
-- ============================================

-- 验证策略
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- 检查teacher_student_subjects策略数量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'teacher_student_subjects';

  RAISE NOTICE 'teacher_student_subjects 表共有 % 个RLS策略', policy_count;

  -- 检查grade_data策略数量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'grade_data';

  RAISE NOTICE 'grade_data 表共有 % 个RLS策略', policy_count;
END $$;
