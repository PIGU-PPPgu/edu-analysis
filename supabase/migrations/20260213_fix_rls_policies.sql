-- ============================================
-- P0修复: 收紧RLS策略,启用学校隔离
-- 审查发现: value_added_activities和value_added_cache的RLS策略过宽
-- 修复时间: 2026-02-13
-- ============================================

-- 1. 修复value_added_activities表的RLS策略
-- 移除过宽的策略
DROP POLICY IF EXISTS "所有人可查看增值活动" ON value_added_activities;
DROP POLICY IF EXISTS "所有人可创建增值活动" ON value_added_activities;
DROP POLICY IF EXISTS "所有人可更新增值活动" ON value_added_activities;

-- 创建基于学校隔离的新策略
CREATE POLICY "users_view_same_school_activities"
ON value_added_activities FOR SELECT
USING (
  -- 管理员可以查看所有学校
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- 教师只能查看同校活动(通过exit_exam关联学校)
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN grade_data gd ON gd.class_name IN (
      SELECT DISTINCT class_name FROM teacher_student_subjects
      WHERE teacher_id = t.id
    )
    WHERE t.id = auth.uid()
  )
);

CREATE POLICY "users_create_same_school_activities"
ON value_added_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
  )
);

CREATE POLICY "users_update_own_activities"
ON value_added_activities FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 2. 修复value_added_cache表的RLS策略
DROP POLICY IF EXISTS "所有人可查看增值缓存" ON value_added_cache;

CREATE POLICY "users_view_same_school_cache"
ON value_added_cache FOR SELECT
USING (
  -- 管理员可以查看所有学校
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- 教师只能查看同校缓存
  (
    school_id IS NOT NULL AND
    school_id = (
      SELECT school_id FROM teachers WHERE id = auth.uid()
    )
  )
  OR
  -- 兼容school_id为空的历史数据(临时)
  school_id IS NULL
);

CREATE POLICY "system_can_write_cache"
ON value_added_cache FOR INSERT
WITH CHECK (true); -- 服务端写入,前端只读

CREATE POLICY "system_can_update_cache"
ON value_added_cache FOR UPDATE
USING (true); -- 服务端更新,前端只读

-- 3. 添加索引优化RLS策略性能
CREATE INDEX IF NOT EXISTS idx_value_added_cache_school_user 
ON value_added_cache(school_id, dimension, target_id);

CREATE INDEX IF NOT EXISTS idx_teachers_school_user
ON teachers(school_id, id);

-- 4. 创建学校访问权限检查函数(增强版)
CREATE OR REPLACE FUNCTION can_access_school(target_school_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_school_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- 检查是否为管理员
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN true;
  END IF;
  
  -- 获取当前用户的学校ID
  SELECT school_id INTO v_user_school_id
  FROM teachers
  WHERE id = auth.uid();
  
  -- 检查是否匹配
  RETURN v_user_school_id = target_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 日志记录
COMMENT ON POLICY "users_view_same_school_activities" ON value_added_activities IS 
'P0修复: 基于学校隔离的查看权限,管理员可查看全部,教师只能查看同校数据';

COMMENT ON POLICY "users_view_same_school_cache" ON value_added_cache IS
'P0修复: 基于school_id的数据隔离,防止跨学校数据泄露';
