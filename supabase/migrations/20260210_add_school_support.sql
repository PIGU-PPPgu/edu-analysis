-- =====================================================
-- 多学校支持架构升级
-- 创建时间: 2026-02-10
-- 优先级: P0（修复教师历次追踪学校隔离问题）
-- =====================================================

-- =====================================================
-- 第1部分：创建学校表和基础数据
-- =====================================================

-- 创建学校表
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT UNIQUE NOT NULL,
  school_code TEXT UNIQUE,
  address TEXT,
  contact_phone TEXT,
  principal TEXT,
  established_date DATE,
  school_type TEXT CHECK (school_type IN ('小学', '初中', '高中', '九年一贯制', '十二年一贯制')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_schools_school_name ON schools(school_name);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

-- 插入默认学校（用于数据迁移）
INSERT INTO schools (id, school_name, school_code, school_type, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '默认学校',
  'DEFAULT_SCHOOL',
  '初中',
  true
) ON CONFLICT (school_name) DO NOTHING;

-- =====================================================
-- 第2部分：添加school_id外键到现有表
-- =====================================================

-- 2.1 为teachers表添加school_id
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);

-- 将现有教师关联到默认学校
UPDATE teachers
SET school_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE school_id IS NULL;

-- 2.2 为class_info表添加school_id
ALTER TABLE class_info
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_class_info_school_id ON class_info(school_id);

-- 将现有班级关联到默认学校
UPDATE class_info
SET school_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE school_id IS NULL;

-- 2.3 为students表添加school_id
ALTER TABLE students
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);

-- 将现有学生关联到默认学校（通过班级推断）
UPDATE students s
SET school_id = COALESCE(
  (SELECT ci.school_id FROM class_info ci WHERE ci.class_name = s.class_name LIMIT 1),
  '00000000-0000-0000-0000-000000000001'::uuid
)
WHERE s.school_id IS NULL;

-- 2.4 为teacher_student_subjects表添加school_id
ALTER TABLE teacher_student_subjects
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_teacher_student_subjects_school_id ON teacher_student_subjects(school_id);

-- 更新teacher_student_subjects的school_id（通过教师推断）
UPDATE teacher_student_subjects tss
SET school_id = COALESCE(
  (SELECT t.school_id FROM teachers t WHERE t.id = tss.teacher_id LIMIT 1),
  '00000000-0000-0000-0000-000000000001'::uuid
)
WHERE tss.school_id IS NULL;

-- 2.5 为grade_data表添加school_id（成绩表）
ALTER TABLE grade_data
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_grade_data_school_id ON grade_data(school_id);

-- 更新grade_data的school_id（通过学生推断）
UPDATE grade_data gd
SET school_id = COALESCE(
  (SELECT s.school_id FROM students s WHERE s.student_id = gd.student_id LIMIT 1),
  '00000000-0000-0000-0000-000000000001'::uuid
)
WHERE gd.school_id IS NULL;

-- 2.6 为value_added_cache表添加school_id（增值评价缓存）
ALTER TABLE value_added_cache
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

CREATE INDEX IF NOT EXISTS idx_value_added_cache_school_id ON value_added_cache(school_id);
CREATE INDEX IF NOT EXISTS idx_value_added_cache_school_activity ON value_added_cache(school_id, activity_id);

-- 更新value_added_cache的school_id（从result JSONB字段或关联表推断）
UPDATE value_added_cache vac
SET school_id = COALESCE(
  -- 尝试从教师维度推断
  (SELECT t.school_id FROM teachers t WHERE t.id = vac.target_id::uuid AND vac.dimension = 'teacher' LIMIT 1),
  -- 尝试从学生维度推断
  (SELECT s.school_id FROM students s WHERE s.id = vac.target_id::uuid AND vac.dimension = 'student' LIMIT 1),
  -- 尝试从班级维度推断（通过target_name）
  (SELECT ci.school_id FROM class_info ci WHERE ci.class_name = vac.target_name AND vac.dimension = 'class' LIMIT 1),
  -- 默认学校
  '00000000-0000-0000-0000-000000000001'::uuid
)
WHERE vac.school_id IS NULL;

-- =====================================================
-- 第3部分：更新RLS策略以支持学校隔离
-- =====================================================

-- 3.1 更新teachers表的RLS策略
DROP POLICY IF EXISTS "teachers_and_admins_can_view_teachers" ON teachers;

CREATE POLICY "teachers_and_admins_can_view_teachers" ON teachers
  FOR SELECT
  USING (
    -- 管理员可以查看所有学校
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- 教师只能查看同校教师
    school_id = (
      SELECT school_id FROM teachers WHERE id = auth.uid()
    )
  );

-- 3.2 更新grade_data表的RLS策略
DROP POLICY IF EXISTS "teachers_can_view_same_school_grades" ON grade_data;

CREATE POLICY "teachers_can_view_same_school_grades" ON grade_data
  FOR SELECT
  USING (
    -- 管理员可以查看所有成绩
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- 教师可以查看同校成绩
    school_id = (
      SELECT school_id FROM teachers WHERE id = auth.uid()
    )
  );

-- 3.3 更新value_added_cache表的RLS策略
DROP POLICY IF EXISTS "users_can_view_same_school_cache" ON value_added_cache;

CREATE POLICY "users_can_view_same_school_cache" ON value_added_cache
  FOR SELECT
  USING (
    -- 管理员可以查看所有缓存
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- 教师可以查看同校缓存
    school_id = (
      SELECT school_id FROM teachers WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 第4部分：创建学校管理辅助函数
-- =====================================================

-- 获取当前用户的学校ID
CREATE OR REPLACE FUNCTION get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  -- 从teachers表获取
  SELECT school_id INTO v_school_id
  FROM teachers
  WHERE id = auth.uid()
  LIMIT 1;

  -- 如果是学生，从students表获取
  IF v_school_id IS NULL THEN
    SELECT school_id INTO v_school_id
    FROM students
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN v_school_id;
END;
$$;

-- 检查用户是否可以访问指定学校的数据
CREATE OR REPLACE FUNCTION can_access_school(target_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 管理员可以访问所有学校
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 检查是否是同一学校
  RETURN target_school_id = get_current_user_school_id();
END;
$$;

-- =====================================================
-- 第5部分：数据验证和统计
-- =====================================================

-- 统计各表的学校数据分布
DO $$
DECLARE
  v_schools_count INT;
  v_teachers_count INT;
  v_classes_count INT;
  v_students_count INT;
  v_cache_count INT;
BEGIN
  SELECT COUNT(*) INTO v_schools_count FROM schools;
  SELECT COUNT(*) INTO v_teachers_count FROM teachers WHERE school_id IS NOT NULL;
  SELECT COUNT(*) INTO v_classes_count FROM class_info WHERE school_id IS NOT NULL;
  SELECT COUNT(*) INTO v_students_count FROM students WHERE school_id IS NOT NULL;
  SELECT COUNT(*) INTO v_cache_count FROM value_added_cache WHERE school_id IS NOT NULL;

  RAISE NOTICE '✅ 学校支持架构升级完成';
  RAISE NOTICE '📊 数据统计:';
  RAISE NOTICE '  - 学校数量: %', v_schools_count;
  RAISE NOTICE '  - 已关联学校的教师: %', v_teachers_count;
  RAISE NOTICE '  - 已关联学校的班级: %', v_classes_count;
  RAISE NOTICE '  - 已关联学校的学生: %', v_students_count;
  RAISE NOTICE '  - 已关联学校的增值缓存: %', v_cache_count;
END $$;

-- =====================================================
-- 迁移完成
-- =====================================================
-- 变更内容：
-- 1. ✅ 创建schools表
-- 2. ✅ 在6个核心表添加school_id外键
-- 3. ✅ 创建9个性能索引
-- 4. ✅ 数据迁移：所有现有数据关联到默认学校
-- 5. ✅ 更新RLS策略支持学校隔离
-- 6. ✅ 创建辅助函数：get_current_user_school_id(), can_access_school()
--
-- 后续工作：
-- - 修改service层代码添加school_id筛选
-- - 修改UI组件支持学校选择和切换
-- - 提供学校管理界面
-- =====================================================
