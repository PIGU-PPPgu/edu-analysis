-- ============================================
-- 多租户隔离迁移 (修复版)
-- 修复 Codex 发现的所有 P0/P1 问题
-- ============================================

-- ============================================
-- 前置检查：确保依赖表存在
-- ============================================

DO $$
BEGIN
  -- 检查 user_profiles 表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'user_profiles 表不存在，请先运行基础表创建脚本';
  END IF;

  -- 检查 user_roles 表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    RAISE EXCEPTION 'user_roles 表不存在，请先运行基础表创建脚本';
  END IF;
END $$;

-- ============================================
-- 1. 创建 schools 表
-- ============================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  province TEXT,
  city TEXT,
  district TEXT,
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active) WHERE is_active = true;

-- RLS策略
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可查看所属学校" ON schools;
CREATE POLICY "用户可查看所属学校" ON schools
  FOR SELECT USING (
    -- 管理员可查看全部
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    -- 用户可查看自己所属学校（使用函数避免递归）
    OR id = get_user_school_id(auth.uid())
  );

DROP POLICY IF EXISTS "管理员可管理学校" ON schools;
CREATE POLICY "管理员可管理学校" ON schools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. user_profiles 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON user_profiles(school_id);
-- 关键性能索引：避免 RLS 策略中的全表扫描
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_school ON user_profiles(id, school_id);

-- 启用 RLS（如果未启用）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 更新 RLS 策略（真正修复无限递归问题）
-- 关键：不能在 user_profiles 策略中查询 user_profiles 表
-- 解决方案：创建一个 SECURITY DEFINER 函数来获取用户的 school_id
CREATE OR REPLACE FUNCTION get_user_school_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT school_id FROM user_profiles WHERE id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "用户可查看同校用户资料" ON user_profiles;
CREATE POLICY "用户可查看同校用户资料" ON user_profiles
  FOR SELECT USING (
    -- 用户可查看自己
    id = auth.uid()
    -- 管理员可查看全部
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    -- 同校用户可查看（使用函数避免递归）
    OR school_id = get_user_school_id(auth.uid())
  );

-- ============================================
-- 3. students 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE students ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class_id);

-- 更新 RLS 策略
DROP POLICY IF EXISTS "用户可查看同校学生" ON students;
CREATE POLICY "用户可查看同校学生" ON students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "同校管理员可插入学生" ON students;
CREATE POLICY "同校管理员可插入学生" ON students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = students.school_id
    )
  );

DROP POLICY IF EXISTS "同校管理员可更新学生" ON students;
CREATE POLICY "同校管理员可更新学生" ON students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = students.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = students.school_id
    )
  );

-- ============================================
-- 4. teachers 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE teachers ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_school ON teachers(user_id, school_id);

-- 启用 RLS（如果未启用）
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- RLS策略（修复 teacher_id vs user_id 问题）
DROP POLICY IF EXISTS "用户可查看同校教师" ON teachers;
CREATE POLICY "用户可查看同校教师" ON teachers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
    -- 教师可查看自己（使用 user_id 而非 id）
    OR user_id = auth.uid()
  );

-- ============================================
-- 5. grade_data 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grade_data' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE grade_data ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grade_data_school ON grade_data(school_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_school_student ON grade_data(school_id, student_id);

-- 更新 RLS 策略（添加跨租户写入检查）
DROP POLICY IF EXISTS "用户可查看同校成绩" ON grade_data;
CREATE POLICY "用户可查看同校成绩" ON grade_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "同校管理员可插入成绩" ON grade_data;
CREATE POLICY "同校管理员可插入成绩" ON grade_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_data.school_id
    )
    -- 关键：验证 student_id 属于同一学校
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1 FROM students s
        WHERE s.student_id = grade_data.student_id
          AND s.school_id = grade_data.school_id
      )
    )
  );

DROP POLICY IF EXISTS "同校管理员可更新成绩" ON grade_data;
CREATE POLICY "同校管理员可更新成绩" ON grade_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_data.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_data.school_id
    )
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1 FROM students s
        WHERE s.student_id = grade_data.student_id
          AND s.school_id = grade_data.school_id
      )
    )
  );

-- ============================================
-- 6. teacher_student_subjects 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_student_subjects' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE teacher_student_subjects ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tss_school ON teacher_student_subjects(school_id);

-- 更新 RLS 策略（添加跨租户写入检查）
DROP POLICY IF EXISTS "用户可查看同校教学关系" ON teacher_student_subjects;
CREATE POLICY "用户可查看同校教学关系" ON teacher_student_subjects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
    -- 教师可查看自己的教学关系（使用 teachers.user_id）
    OR EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_student_subjects.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "同校管理员可插入教学关系" ON teacher_student_subjects;
CREATE POLICY "同校管理员可插入教学关系" ON teacher_student_subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = teacher_student_subjects.school_id
    )
    -- 关键：验证 teacher_id 和 student_id 都属于同一学校
    AND EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_student_subjects.teacher_id
        AND t.school_id = teacher_student_subjects.school_id
    )
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = teacher_student_subjects.student_id
        AND s.school_id = teacher_student_subjects.school_id
    )
  );

DROP POLICY IF EXISTS "同校管理员可更新教学关系" ON teacher_student_subjects;
CREATE POLICY "同校管理员可更新教学关系" ON teacher_student_subjects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = teacher_student_subjects.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = teacher_student_subjects.school_id
    )
    AND EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_student_subjects.teacher_id
        AND t.school_id = teacher_student_subjects.school_id
    )
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = teacher_student_subjects.student_id
        AND s.school_id = teacher_student_subjects.school_id
    )
  );

DROP POLICY IF EXISTS "同校管理员可删除教学关系" ON teacher_student_subjects;
CREATE POLICY "同校管理员可删除教学关系" ON teacher_student_subjects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = teacher_student_subjects.school_id
    )
  );

-- ============================================
-- 7. value_added_activities 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'value_added_activities' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE value_added_activities ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vaa_school ON value_added_activities(school_id);

-- 更新 RLS 策略
DROP POLICY IF EXISTS "用户可查看同校增值活动" ON value_added_activities;
CREATE POLICY "用户可查看同校增值活动" ON value_added_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "同校管理员可管理增值活动" ON value_added_activities;
CREATE POLICY "同校管理员可管理增值活动" ON value_added_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = value_added_activities.school_id
    )
  );

-- ============================================
-- 8. value_added_cache 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'value_added_cache' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE value_added_cache ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vac_school ON value_added_cache(school_id);

-- 更新 RLS 策略（收紧权限）
DROP POLICY IF EXISTS "用户可查看同校缓存" ON value_added_cache;
CREATE POLICY "用户可查看同校缓存" ON value_added_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "同校管理员可写入缓存" ON value_added_cache;
CREATE POLICY "同校管理员可写入缓存" ON value_added_cache
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = value_added_cache.school_id
    )
  );

-- ============================================
-- 9. exam_series 表添加 school_id 和写入策略
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_series' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE exam_series ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_series_school ON exam_series(school_id);

-- 更新 RLS 策略
DROP POLICY IF EXISTS "用户可查看同校考试序列" ON exam_series;
CREATE POLICY "用户可查看同校考试序列" ON exam_series
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "同校管理员可管理考试序列" ON exam_series;
CREATE POLICY "同校管理员可管理考试序列" ON exam_series
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = exam_series.school_id
    )
  );

-- ============================================
-- 10. grade_levels_config 表添加 school_id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grade_levels_config' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE grade_levels_config ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_glc_school ON grade_levels_config(school_id);

-- 更新 RLS 策略（修复全局配置权限问题）
DROP POLICY IF EXISTS "用户可查看同校等级配置" ON grade_levels_config;
CREATE POLICY "用户可查看同校等级配置" ON grade_levels_config
  FOR SELECT USING (
    school_id IS NULL -- 系统默认配置，所有人可见
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      get_user_school_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "同校管理员可管理等级配置" ON grade_levels_config;
CREATE POLICY "同校管理员可管理等级配置" ON grade_levels_config
  FOR ALL USING (
    -- 只有系统管理员可以管理全局配置（school_id IS NULL）
    (school_id IS NULL AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ))
    -- 学校管理员可以管理自己学校的配置
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_levels_config.school_id
    )
  );

-- ============================================
-- 11. 智能数据迁移函数（修复 backfill 逻辑）
-- ============================================

CREATE OR REPLACE FUNCTION migrate_school_data()
RETURNS TABLE(
  table_name TEXT,
  rows_updated INTEGER,
  status TEXT
) AS $$
DECLARE
  default_school_id UUID;
  v_table_name TEXT;
  v_rows_updated INTEGER;
BEGIN
  -- 创建默认学校（如果不存在）
  INSERT INTO schools (name, code, is_active)
  VALUES ('默认学校', 'DEFAULT_SCHOOL', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO default_school_id;

  IF default_school_id IS NULL THEN
    SELECT id INTO default_school_id FROM schools WHERE code = 'DEFAULT_SCHOOL';
  END IF;

  -- 1. 迁移 user_profiles（所有 NULL 设为默认学校）
  UPDATE user_profiles SET school_id = default_school_id WHERE school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'user_profiles'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 2. 迁移 students（从 class_info 推导，如果无法推导则用默认）
  -- 注意：这里假设 class_info 也有 school_id，如果没有则全部用默认
  UPDATE students s
  SET school_id = COALESCE(
    (SELECT ci.school_id FROM class_info ci WHERE ci.class_name = s.class_name LIMIT 1),
    default_school_id
  )
  WHERE s.school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'students'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 3. 迁移 teachers（从 user_profiles 推导）
  UPDATE teachers t
  SET school_id = COALESCE(
    (SELECT up.school_id FROM user_profiles up WHERE up.id = t.user_id LIMIT 1),
    default_school_id
  )
  WHERE t.school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'teachers'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 4. 迁移 grade_data（从 students 推导）
  UPDATE grade_data gd
  SET school_id = COALESCE(
    (SELECT s.school_id FROM students s WHERE s.student_id = gd.student_id LIMIT 1),
    default_school_id
  )
  WHERE gd.school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'grade_data'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 5. 迁移 teacher_student_subjects（从 teachers 推导）
  UPDATE teacher_student_subjects tss
  SET school_id = COALESCE(
    (SELECT t.school_id FROM teachers t WHERE t.id = tss.teacher_id LIMIT 1),
    default_school_id
  )
  WHERE tss.school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'teacher_student_subjects'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 6. 迁移 value_added_activities（用默认学校）
  UPDATE value_added_activities SET school_id = default_school_id WHERE school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'value_added_activities'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 7. 迁移 value_added_cache（从 activity 推导）
  UPDATE value_added_cache vac
  SET school_id = COALESCE(
    (SELECT vaa.school_id FROM value_added_activities vaa WHERE vaa.id = vac.activity_id LIMIT 1),
    default_school_id
  )
  WHERE vac.school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'value_added_cache'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 8. 迁移 exam_series（用默认学校）
  UPDATE exam_series SET school_id = default_school_id WHERE school_id IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'exam_series'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

  -- 9. 迁移 grade_levels_config（保持系统默认配置为 NULL，其他用默认学校）
  UPDATE grade_levels_config
  SET school_id = default_school_id
  WHERE school_id IS NULL AND is_default = false;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  table_name := 'grade_levels_config'; rows_updated := v_rows_updated; status := 'completed';
  RETURN NEXT;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 限制函数执行权限（只有管理员可调用）
REVOKE EXECUTE ON FUNCTION migrate_school_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION migrate_school_data() FROM authenticated;

-- 创建一个只有管理员可以调用的包装函数
CREATE OR REPLACE FUNCTION admin_migrate_school_data()
RETURNS TABLE(
  table_name TEXT,
  rows_updated INTEGER,
  status TEXT
) AS $$
BEGIN
  -- 检查调用者是否是管理员
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION '只有管理员可以执行数据迁移';
  END IF;

  -- 调用实际的迁移函数
  RETURN QUERY SELECT * FROM migrate_school_data();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION admin_migrate_school_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_migrate_school_data() TO authenticated;

-- ============================================
-- 12. 执行数据迁移（可选，需要管理员手动触发）
-- ============================================

-- 取消自动执行，改为手动触发
-- SELECT * FROM migrate_school_data();

-- ============================================
-- 13. 验证
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- 检查添加了 school_id 的表数量
  SELECT COUNT(DISTINCT table_name) INTO table_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'school_id'
    AND table_name IN (
      'user_profiles', 'students', 'teachers', 'grade_data',
      'teacher_student_subjects', 'value_added_activities',
      'value_added_cache', 'exam_series', 'grade_levels_config'
    );

  RAISE NOTICE '已添加 school_id 字段的表数量: %', table_count;

  -- 检查包含 "同校" 的策略数量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE '%同校%';

  RAISE NOTICE '包含"同校"的RLS策略数量: %', policy_count;

  -- 检查 RLS 是否启用
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'teachers' AND rowsecurity = true
  ) THEN
    RAISE WARNING 'teachers 表的 RLS 未启用！';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND rowsecurity = true
  ) THEN
    RAISE WARNING 'user_profiles 表的 RLS 未启用！';
  END IF;
END $$;

-- ============================================
-- 完成
-- ============================================

COMMENT ON FUNCTION migrate_school_data() IS '智能数据迁移函数：从关联表推导 school_id，避免数据丢失';
