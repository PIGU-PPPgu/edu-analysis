-- 创建导入配置表
-- 用于保存学生信息和教学编排的配置，方便后续只导入成绩

CREATE TABLE import_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 配置基本信息
  name TEXT NOT NULL UNIQUE,  -- 配置名称（用户自定义，唯一）
  description TEXT,           -- 配置描述

  -- 学年学期信息（用于生成推荐名称）
  academic_year TEXT,         -- 学年，如 "2024-2025"
  semester TEXT,              -- 学期，如 "第一学期"
  grade_levels TEXT[],        -- 包含的年级列表，如 ["高一", "高二"]

  -- 统计信息（冗余字段，方便列表展示）
  student_count INTEGER DEFAULT 0,
  class_count INTEGER DEFAULT 0,
  teacher_count INTEGER DEFAULT 0,
  subject_count INTEGER DEFAULT 0,

  -- 元数据
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,  -- 最后使用时间（导入成绩时更新）
  is_active BOOLEAN DEFAULT true,

  -- 约束
  CHECK (name IS NOT NULL AND name != ''),
  CHECK (student_count >= 0),
  CHECK (class_count >= 0),
  CHECK (teacher_count >= 0),
  CHECK (subject_count >= 0)
);

-- 创建索引
CREATE INDEX idx_import_configurations_created_by ON import_configurations(created_by);
CREATE INDEX idx_import_configurations_is_active ON import_configurations(is_active);
CREATE INDEX idx_import_configurations_last_used_at ON import_configurations(last_used_at DESC);

-- 添加注释
COMMENT ON TABLE import_configurations IS '导入配置表，保存学生信息和教学编排配置，用于简化后续成绩导入';
COMMENT ON COLUMN import_configurations.name IS '配置名称，用户可自定义，系统会提供推荐名称';
COMMENT ON COLUMN import_configurations.grade_levels IS '包含的年级列表，用于生成推荐名称';
COMMENT ON COLUMN import_configurations.last_used_at IS '最后使用该配置导入成绩的时间';

-- RLS 策略
ALTER TABLE import_configurations ENABLE ROW LEVEL SECURITY;

-- 认证用户可以查看所有配置
CREATE POLICY "认证用户可以查看配置" ON import_configurations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 认证用户可以创建配置
CREATE POLICY "认证用户可以创建配置" ON import_configurations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 用户只能更新自己创建的配置
CREATE POLICY "用户只能更新自己的配置" ON import_configurations
  FOR UPDATE
  USING (created_by = auth.uid());

-- 用户只能删除自己创建的配置
CREATE POLICY "用户只能删除自己的配置" ON import_configurations
  FOR DELETE
  USING (created_by = auth.uid());
