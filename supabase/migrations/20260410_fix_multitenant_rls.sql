-- ============================================================
-- 多租户 RLS 修复
-- 1. grade_data SELECT 策略加 school_id 匹配，防止跨校数据泄露
-- 2. 添加 grade_leader 到 app_role enum（年级账号角色）
-- 3. user_profiles 添加 school_id 列（若不存在）
-- ============================================================

-- 1. 确保 user_profiles 有 school_id 列
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id
  ON user_profiles(school_id);

-- 2. 添加 grade_leader 角色（年级账号使用）
-- app_role 是 TEXT CHECK 约束而非 ENUM，直接更新约束
DO $$
BEGIN
  -- 尝试添加 grade_leader 到 app_role enum（如果是 enum 类型）
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'app_role'
  ) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'grade_leader';
  END IF;
END $$;

-- 3. 修复 grade_data SELECT 策略：加入 school_id 匹配
DROP POLICY IF EXISTS "teachers_and_admins_can_view_grades" ON grade_data;

CREATE POLICY "teachers_and_admins_can_view_grades" ON grade_data
  FOR SELECT
  USING (
    -- 管理员可以查看所有成绩
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- 教师只能查看同校且所教学生的成绩
    EXISTS (
      SELECT 1 FROM teachers t
      JOIN teacher_student_subjects tss ON tss.teacher_id = t.id
      WHERE t.id = auth.uid()
        AND tss.student_id = grade_data.student_id
        AND t.school_id = grade_data.school_id
    )
    OR
    -- grade_leader 可以查看同校所有成绩
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN teachers t ON t.id = auth.uid()
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('grade_leader', 'teacher')
        AND t.school_id = grade_data.school_id
    )
    OR
    -- 学生可以查看自己的成绩
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = grade_data.student_id
        AND s.user_id = auth.uid()
    )
  );

-- 4. 修复 students SELECT 策略：加入 school_id 匹配
DROP POLICY IF EXISTS "teachers_and_admins_can_view_students" ON students;
DROP POLICY IF EXISTS "用户可以查看学生信息" ON students;

CREATE POLICY "school_members_can_view_students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- 同校教师可以查看学生
    EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = auth.uid()
        AND t.school_id = students.school_id
    )
    OR
    -- 学生本人
    user_id = auth.uid()
  );

-- 5. 修复 class_info SELECT 策略
DROP POLICY IF EXISTS "school_members_can_view_classes" ON class_info;

CREATE POLICY "school_members_can_view_classes" ON class_info
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = auth.uid()
        AND t.school_id = class_info.school_id
    )
  );

-- 6. 辅助函数：获取当前用户的 school_id
CREATE OR REPLACE FUNCTION get_current_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM teachers WHERE id = auth.uid()
  UNION ALL
  SELECT school_id FROM user_profiles WHERE id = auth.uid() AND school_id IS NOT NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
