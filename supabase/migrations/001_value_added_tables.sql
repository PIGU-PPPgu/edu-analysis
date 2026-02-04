-- ============================================
-- 增值评价系统数据库迁移 SQL
-- 执行顺序：按照编号依次执行
-- ============================================

-- ============================================
-- 迁移 1: 教师-学生-科目关联表
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 教师
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,

  -- 学生
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,

  -- 科目
  subject TEXT NOT NULL,

  -- 班级信息
  class_name TEXT NOT NULL,
  class_type TEXT DEFAULT 'administrative' CHECK (class_type IN ('administrative', 'teaching')),

  -- 学年学期
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,

  -- 是否走班
  is_elective BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_id, subject, academic_year, semester)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tss_teacher ON teacher_student_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tss_student ON teacher_student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_tss_subject ON teacher_student_subjects(subject);
CREATE INDEX IF NOT EXISTS idx_tss_class ON teacher_student_subjects(class_name);
CREATE INDEX IF NOT EXISTS idx_tss_year_semester ON teacher_student_subjects(academic_year, semester);

-- RLS策略
ALTER TABLE teacher_student_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "教师查看自己的教学关系" ON teacher_student_subjects;
CREATE POLICY "教师查看自己的教学关系" ON teacher_student_subjects
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- ============================================
-- 迁移 2: 等级划分配置表
-- ============================================

CREATE TABLE IF NOT EXISTS grade_levels_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- 是否为默认配置
  is_default BOOLEAN DEFAULT false,

  -- 等级定义（JSONB数组）
  levels JSONB NOT NULL DEFAULT '[
    {
      "level": "A+",
      "label": "优秀+",
      "percentile": { "min": 0.00, "max": 0.05 },
      "color": "#10b981",
      "description": "前5%"
    },
    {
      "level": "A",
      "label": "优秀",
      "percentile": { "min": 0.05, "max": 0.25 },
      "color": "#22c55e",
      "description": "5%至25%"
    },
    {
      "level": "B+",
      "label": "良好+",
      "percentile": { "min": 0.25, "max": 0.50 },
      "color": "#3b82f6",
      "description": "25%至50%"
    },
    {
      "level": "B",
      "label": "良好",
      "percentile": { "min": 0.50, "max": 0.75 },
      "color": "#6366f1",
      "description": "50%至75%"
    },
    {
      "level": "C+",
      "label": "及格+",
      "percentile": { "min": 0.75, "max": 0.95 },
      "color": "#f59e0b",
      "description": "75%至95%"
    },
    {
      "level": "C",
      "label": "及格",
      "percentile": { "min": 0.95, "max": 1.00 },
      "color": "#ef4444",
      "description": "95%至100%"
    }
  ]'::jsonb,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_glc_default ON grade_levels_config(is_default) WHERE is_default = true;

-- RLS策略
ALTER TABLE grade_levels_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可查看等级配置" ON grade_levels_config;
CREATE POLICY "所有人可查看等级配置" ON grade_levels_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "管理员可管理等级配置" ON grade_levels_config;
CREATE POLICY "管理员可管理等级配置" ON grade_levels_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 插入默认配置
INSERT INTO grade_levels_config (name, description, is_default)
VALUES (
  '标准六级配置',
  'A+（前5%）、A（5%-25%）、B+（25%-50%）、B（50%-75%）、C+（75%-95%）、C（95%-100%）',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 迁移 3: 增值活动管理表
-- ============================================

CREATE TABLE IF NOT EXISTS value_added_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- 入口和出口考试
  entry_exam_id TEXT NOT NULL,
  entry_exam_title TEXT NOT NULL,
  exit_exam_id TEXT NOT NULL,
  exit_exam_title TEXT NOT NULL,

  -- 范围设定
  grade_level TEXT NOT NULL,
  student_year TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,

  -- 状态管理
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message TEXT,

  -- 配置参数
  grade_level_config_id UUID REFERENCES grade_levels_config(id),

  -- 元数据
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(entry_exam_id, exit_exam_id, student_year)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vaa_status ON value_added_activities(status);
CREATE INDEX IF NOT EXISTS idx_vaa_year_semester ON value_added_activities(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_vaa_grade_level ON value_added_activities(grade_level, student_year);

-- RLS策略
ALTER TABLE value_added_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可查看增值活动" ON value_added_activities;
CREATE POLICY "所有人可查看增值活动" ON value_added_activities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "管理员可管理增值活动" ON value_added_activities;
CREATE POLICY "管理员可管理增值活动" ON value_added_activities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'grade_leader'))
  );

-- ============================================
-- 迁移 4: 计算结果缓存表
-- ============================================

CREATE TABLE IF NOT EXISTS value_added_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联的活动
  activity_id UUID NOT NULL REFERENCES value_added_activities(id) ON DELETE CASCADE,

  -- 报告类型和维度
  report_type TEXT NOT NULL,
  dimension TEXT NOT NULL,

  -- 目标ID
  target_id TEXT NOT NULL,
  target_name TEXT,

  -- 计算结果
  result JSONB NOT NULL,

  -- 缓存管理
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),

  UNIQUE(activity_id, report_type, dimension, target_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vac_activity ON value_added_cache(activity_id);
CREATE INDEX IF NOT EXISTS idx_vac_expires ON value_added_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_vac_type_dimension ON value_added_cache(report_type, dimension);

-- RLS策略
ALTER TABLE value_added_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "缓存跟随活动权限" ON value_added_cache;
CREATE POLICY "缓存跟随活动权限" ON value_added_cache
  FOR SELECT USING (true);

-- 定期清理过期缓存的函数
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM value_added_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 迁移 5: 考试序列表
-- ============================================

CREATE TABLE IF NOT EXISTS exam_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- 范围
  grade_level TEXT NOT NULL,
  student_year TEXT NOT NULL,
  academic_year TEXT NOT NULL,

  -- 考试列表
  exams JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_es_grade_year ON exam_series(grade_level, student_year, academic_year);

-- RLS策略
ALTER TABLE exam_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可查看考试序列" ON exam_series;
CREATE POLICY "所有人可查看考试序列" ON exam_series
  FOR SELECT USING (true);
