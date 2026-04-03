-- ============================================
-- 多租户隔离迁移
-- 为所有核心表添加 school_id 字段和 RLS 策略
-- ============================================

-- ============================================
-- 1. 添加 schools 表（如果不存在）
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

-- 索引
CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active) WHERE is_active = true;

-- RLS策略
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可查看所属学校" ON schools;
CREATE POLICY "用户可查看所属学校" ON schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.school_id = schools.id
    )
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "管理员可管理学校" ON schools;
CREATE POLICY "管理员可管理学校" ON schools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 2. user_profiles 表添加 school_id
-- ============================================

-- 添加 school_id 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN school_id UUID REFERENCES schools(id);
    CREATE INDEX idx_user_profiles_school ON user_profiles(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "用户可查看同校用户资料" ON user_profiles;
CREATE POLICY "用户可查看同校用户资料" ON user_profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
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
    CREATE INDEX idx_students_school ON students(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "用户可查看相关学生" ON students;
CREATE POLICY "用户可查看同校学生" ON students
  FOR SELECT USING (
    -- 管理员可查看全部
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    -- 同校用户可查看
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
    -- 教师可查看自己所教学生
    OR EXISTS (
      SELECT 1 FROM teacher_student_subjects tss
      WHERE tss.student_id = students.student_id AND tss.teacher_id = auth.uid()
    )
    -- 学生可查看自己
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "管理员可插入学生" ON students;
CREATE POLICY "同校管理员可插入学生" ON students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = students.school_id
    )
  );

DROP POLICY IF EXISTS "管理员可更新学生" ON students;
CREATE POLICY "同校管理员可更新学生" ON students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = students.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
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
    CREATE INDEX idx_teachers_school ON teachers(school_id);
  END IF;
END $$;

-- RLS策略
DROP POLICY IF EXISTS "所有人可查看教师" ON teachers;
CREATE POLICY "用户可查看同校教师" ON teachers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
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
    CREATE INDEX idx_grade_data_school ON grade_data(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "allow_authenticated_read_grade_data" ON grade_data;
CREATE POLICY "用户可查看同校成绩" ON grade_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "管理员可插入成绩" ON grade_data;
CREATE POLICY "同校管理员可插入成绩" ON grade_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_data.school_id
    )
  );

DROP POLICY IF EXISTS "管理员可更新成绩" ON grade_data;
CREATE POLICY "同校管理员可更新成绩" ON grade_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_data.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND up.school_id = grade_data.school_id
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
    CREATE INDEX idx_tss_school ON teacher_student_subjects(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "教师查看自己的教学关系" ON teacher_student_subjects;
CREATE POLICY "用户可查看同校教学关系" ON teacher_student_subjects
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "管理员可插入教学关系" ON teacher_student_subjects;
CREATE POLICY "同校管理员可插入教学关系" ON teacher_student_subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
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
    CREATE INDEX idx_vaa_school ON value_added_activities(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "所有人可查看增值活动" ON value_added_activities;
CREATE POLICY "用户可查看同校增值活动" ON value_added_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "管理员可管理增值活动" ON value_added_activities;
CREATE POLICY "同校管理员可管理增值活动" ON value_added_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
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
    CREATE INDEX idx_vac_school ON value_added_cache(school_id);
  END IF;
END $$;

-- 更新 RLS 策略（收紧权限）
DROP POLICY IF EXISTS "缓存跟随活动权限" ON value_added_cache;
CREATE POLICY "用户可查看同校缓存" ON value_added_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- 只允许同校管理员写入缓存
CREATE POLICY "同校管理员可写入缓存" ON value_added_cache
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
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
    CREATE INDEX idx_exam_series_school ON exam_series(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "所有人可查看考试序列" ON exam_series;
CREATE POLICY "用户可查看同校考试序列" ON exam_series
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- 添加写入策略
CREATE POLICY "同校管理员可管理考试序列" ON exam_series
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
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
    CREATE INDEX idx_glc_school ON grade_levels_config(school_id);
  END IF;
END $$;

-- 更新 RLS 策略
DROP POLICY IF EXISTS "所有人可查看等级配置" ON grade_levels_config;
CREATE POLICY "用户可查看同校等级配置" ON grade_levels_config
  FOR SELECT USING (
    school_id IS NULL -- 系统默认配置
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR school_id IN (
      SELECT school_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "管理员可管理等级配置" ON grade_levels_config;
CREATE POLICY "同校管理员可管理等级配置" ON grade_levels_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN user_profiles up ON up.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'grade_leader')
        AND (
          grade_levels_config.school_id IS NULL
          OR up.school_id = grade_levels_config.school_id
        )
    )
  );

-- ============================================
-- 11. 数据迁移辅助函数
-- ============================================

-- 为现有数据设置默认 school_id 的函数
CREATE OR REPLACE FUNCTION set_default_school_id()
RETURNS void AS $$
DECLARE
  default_school_id UUID;
BEGIN
  -- 创建默认学校（如果不存在）
  INSERT INTO schools (name, code, is_active)
  VALUES ('默认学校', 'DEFAULT_SCHOOL', true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO default_school_id;

  -- 如果已存在，获取其ID
  IF default_school_id IS NULL THEN
    SELECT id INTO default_school_id FROM schools WHERE code = 'DEFAULT_SCHOOL';
  END IF;

  -- 更新所有表的 NULL school_id
  UPDATE user_profiles SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE students SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE teachers SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE grade_data SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE teacher_student_subjects SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE value_added_activities SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE value_added_cache SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE exam_series SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE grade_levels_config SET school_id = default_school_id WHERE school_id IS NULL AND is_default = false;

  RAISE NOTICE '已为现有数据设置默认 school_id: %', default_school_id;
END;
$$ LANGUAGE plpgsql;

-- 执行数据迁移
SELECT set_default_school_id();

-- ============================================
-- 12. 验证
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
END $$;
