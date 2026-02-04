-- ============================================
-- 增值评价系统完整迁移脚本
-- 包含：数据表创建 + RLS策略 + 用户权限全开配置
-- 执行方式：在 Supabase Dashboard SQL Editor 中执行
-- ============================================

-- ============================================
-- 第一部分：创建5张增值评价表
-- ============================================

-- 1. 教师-学生-科目关联表
CREATE TABLE IF NOT EXISTS teacher_student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_name TEXT NOT NULL,
  class_type TEXT DEFAULT 'administrative' CHECK (class_type IN ('administrative', 'teaching')),
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  is_elective BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_tss_teacher ON teacher_student_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tss_student ON teacher_student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_tss_subject ON teacher_student_subjects(subject);
CREATE INDEX IF NOT EXISTS idx_tss_class ON teacher_student_subjects(class_name);
CREATE INDEX IF NOT EXISTS idx_tss_year_semester ON teacher_student_subjects(academic_year, semester);

-- 2. 等级划分配置表
CREATE TABLE IF NOT EXISTS grade_levels_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  levels JSONB NOT NULL DEFAULT '[
    {"level": "A+", "label": "优秀+", "percentile": {"min": 0.00, "max": 0.05}, "color": "#10b981", "description": "前5%"},
    {"level": "A", "label": "优秀", "percentile": {"min": 0.05, "max": 0.25}, "color": "#22c55e", "description": "5%至25%"},
    {"level": "B+", "label": "良好+", "percentile": {"min": 0.25, "max": 0.50}, "color": "#3b82f6", "description": "25%至50%"},
    {"level": "B", "label": "良好", "percentile": {"min": 0.50, "max": 0.75}, "color": "#6366f1", "description": "50%至75%"},
    {"level": "C+", "label": "及格+", "percentile": {"min": 0.75, "max": 0.95}, "color": "#f59e0b", "description": "75%至95%"},
    {"level": "C", "label": "及格", "percentile": {"min": 0.95, "max": 1.00}, "color": "#ef4444", "description": "95%至100%"}
  ]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glc_default ON grade_levels_config(is_default) WHERE is_default = true;

-- 插入默认配置
INSERT INTO grade_levels_config (name, description, is_default)
VALUES ('标准六级配置', 'A+（前5%）、A（5%-25%）、B+（25%-50%）、B（50%-75%）、C+（75%-95%）、C（95%-100%）', true)
ON CONFLICT DO NOTHING;

-- 3. 增值活动管理表
CREATE TABLE IF NOT EXISTS value_added_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entry_exam_id TEXT NOT NULL,
  entry_exam_title TEXT NOT NULL,
  exit_exam_id TEXT NOT NULL,
  exit_exam_title TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  student_year TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message TEXT,
  grade_level_config_id UUID REFERENCES grade_levels_config(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entry_exam_id, exit_exam_id, student_year)
);

CREATE INDEX IF NOT EXISTS idx_vaa_status ON value_added_activities(status);
CREATE INDEX IF NOT EXISTS idx_vaa_year_semester ON value_added_activities(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_vaa_grade_level ON value_added_activities(grade_level, student_year);

-- 4. 计算结果缓存表
CREATE TABLE IF NOT EXISTS value_added_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES value_added_activities(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  dimension TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(activity_id, report_type, dimension, target_id)
);

CREATE INDEX IF NOT EXISTS idx_vac_activity ON value_added_cache(activity_id);
CREATE INDEX IF NOT EXISTS idx_vac_expires ON value_added_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_vac_type_dimension ON value_added_cache(report_type, dimension);

-- 清理过期缓存函数
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM value_added_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 5. 考试序列表
CREATE TABLE IF NOT EXISTS exam_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  grade_level TEXT NOT NULL,
  student_year TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  exams JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_es_grade_year ON exam_series(grade_level, student_year, academic_year);

-- ============================================
-- 第二部分：配置RLS策略（启用但全部开放）
-- ============================================

-- 启用RLS但配置为全开放策略
ALTER TABLE teacher_student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_added_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_added_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_series ENABLE ROW LEVEL SECURITY;

-- teacher_student_subjects - 全开放
DROP POLICY IF EXISTS "所有人可查看教学关系" ON teacher_student_subjects;
CREATE POLICY "所有人可查看教学关系" ON teacher_student_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可插入教学关系" ON teacher_student_subjects;
CREATE POLICY "所有人可插入教学关系" ON teacher_student_subjects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "所有人可更新教学关系" ON teacher_student_subjects;
CREATE POLICY "所有人可更新教学关系" ON teacher_student_subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "所有人可删除教学关系" ON teacher_student_subjects;
CREATE POLICY "所有人可删除教学关系" ON teacher_student_subjects FOR DELETE TO authenticated USING (true);

-- grade_levels_config - 全开放
DROP POLICY IF EXISTS "所有人可查看等级配置" ON grade_levels_config;
CREATE POLICY "所有人可查看等级配置" ON grade_levels_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理等级配置" ON grade_levels_config;
CREATE POLICY "所有人可管理等级配置" ON grade_levels_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- value_added_activities - 全开放
DROP POLICY IF EXISTS "所有人可查看增值活动" ON value_added_activities;
CREATE POLICY "所有人可查看增值活动" ON value_added_activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理增值活动" ON value_added_activities;
CREATE POLICY "所有人可管理增值活动" ON value_added_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- value_added_cache - 全开放
DROP POLICY IF EXISTS "所有人可查看缓存" ON value_added_cache;
CREATE POLICY "所有人可查看缓存" ON value_added_cache FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理缓存" ON value_added_cache;
CREATE POLICY "所有人可管理缓存" ON value_added_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- exam_series - 全开放
DROP POLICY IF EXISTS "所有人可查看考试序列" ON exam_series;
CREATE POLICY "所有人可查看考试序列" ON exam_series FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理考试序列" ON exam_series;
CREATE POLICY "所有人可管理考试序列" ON exam_series FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 第三部分：收紧核心表的写入策略（但保持全开放）
-- ============================================

-- grade_data 表 - 全开放
DROP POLICY IF EXISTS "allow_authenticated_insert_grade_data" ON grade_data;
DROP POLICY IF EXISTS "allow_authenticated_update_grade_data" ON grade_data;

CREATE POLICY "所有人可插入成绩" ON grade_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "所有人可更新成绩" ON grade_data FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- students 表 - 全开放
DROP POLICY IF EXISTS "allow_authenticated_insert_students" ON students;
DROP POLICY IF EXISTS "allow_authenticated_update_students" ON students;
DROP POLICY IF EXISTS "allow_authenticated_read_students" ON students;

CREATE POLICY "所有人可查看学生" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "所有人可插入学生" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "所有人可更新学生" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- exams 表 - 全开放
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可查看考试" ON exams;
CREATE POLICY "所有人可查看考试" ON exams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理考试" ON exams;
CREATE POLICY "所有人可管理考试" ON exams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 第四部分：性能优化索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tss_teacher_id ON teacher_student_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- ============================================
-- 第五部分：用户权限默认全开（给所有现有用户admin角色）
-- ============================================

-- 为所有没有角色的用户添加admin角色
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_roles WHERE role = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 创建触发器：新用户自动获得admin角色
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_assign_admin_role();

-- ============================================
-- 验证迁移结果
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
  user_count INTEGER;
  admin_count INTEGER;
BEGIN
  -- 检查表是否创建
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'teacher_student_subjects',
      'grade_levels_config',
      'value_added_activities',
      'value_added_cache',
      'exam_series'
    );

  RAISE NOTICE '✅ 已创建 % 张增值评价表（应为5张）', table_count;

  -- 检查RLS策略
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'teacher_student_subjects',
      'grade_levels_config',
      'value_added_activities',
      'value_added_cache',
      'exam_series'
    );

  RAISE NOTICE '✅ 已创建 % 个RLS策略', policy_count;

  -- 检查用户角色
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO admin_count FROM user_roles WHERE role = 'admin';

  RAISE NOTICE '✅ 系统共有 % 个用户，其中 % 个拥有admin角色', user_count, admin_count;

  -- 最终确认
  IF table_count = 5 THEN
    RAISE NOTICE '🎉 迁移成功！所有表已创建，权限已全开。';
  ELSE
    RAISE WARNING '⚠️  部分表创建失败，请检查错误日志。';
  END IF;
END $$;
