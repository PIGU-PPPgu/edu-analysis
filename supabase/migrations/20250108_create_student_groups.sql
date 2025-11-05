-- 创建学生分组管理表
CREATE TABLE IF NOT EXISTS student_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  class_name TEXT NOT NULL,
  student_ids TEXT[] NOT NULL DEFAULT '{}',
  group_type TEXT NOT NULL DEFAULT 'custom' CHECK (group_type IN ('academic', 'behavioral', 'custom', 'ai_generated')),
  allocation_strategy TEXT CHECK (allocation_strategy IN ('balanced', 'mixed_ability', 'homogeneous')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 小组特征数据
  group_metrics JSONB DEFAULT '{}',
  performance_prediction NUMERIC,
  balance_scores JSONB DEFAULT '{}',
  
  -- 状态管理
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  CONSTRAINT valid_group_size CHECK (array_length(student_ids, 1) >= 1)
);

-- 创建小组画像存储表
CREATE TABLE IF NOT EXISTS group_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  
  -- 学术组成分析
  academic_composition JSONB NOT NULL DEFAULT '{}',
  
  -- 协作特征分析
  collaboration_profile JSONB NOT NULL DEFAULT '{}',
  
  -- 小组动态评估
  group_dynamics JSONB NOT NULL DEFAULT '{}',
  
  -- 生成时间和数据质量
  generated_at TIMESTAMPTZ DEFAULT now(),
  data_quality_score INTEGER DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  analysis_period JSONB DEFAULT '{}',
  
  UNIQUE(group_id)
);

-- 创建班级画像存储表
CREATE TABLE IF NOT EXISTS class_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL UNIQUE,
  
  -- 基础统计（从ClassPortraitStats继承）
  student_count INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC,
  excellent_rate NUMERIC,
  progress_rate NUMERIC,
  
  -- 班级特征分析
  class_characteristics JSONB NOT NULL DEFAULT '{}',
  
  -- 小组化分析
  group_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- 教学建议
  teaching_recommendations JSONB NOT NULL DEFAULT '{}',
  
  -- 科目统计
  subject_stats JSONB DEFAULT '[]',
  
  -- 性别分布
  gender_distribution JSONB DEFAULT '{}',
  
  -- 生成时间和数据质量
  generated_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data_quality_score INTEGER DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  
  -- 数据有效期
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_student_groups_class_name ON student_groups(class_name);
CREATE INDEX IF NOT EXISTS idx_student_groups_created_by ON student_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_student_groups_status ON student_groups(status);
CREATE INDEX IF NOT EXISTS idx_student_groups_type ON student_groups(group_type);

CREATE INDEX IF NOT EXISTS idx_group_portraits_group_id ON group_portraits(group_id);
CREATE INDEX IF NOT EXISTS idx_group_portraits_generated_at ON group_portraits(generated_at);

CREATE INDEX IF NOT EXISTS idx_class_portraits_class_name ON class_portraits(class_name);
CREATE INDEX IF NOT EXISTS idx_class_portraits_generated_at ON class_portraits(generated_at);
CREATE INDEX IF NOT EXISTS idx_class_portraits_expires_at ON class_portraits(expires_at);

-- 添加触发器更新时间戳
CREATE OR REPLACE FUNCTION update_student_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_groups_timestamp
  BEFORE UPDATE ON student_groups
  FOR EACH ROW EXECUTE FUNCTION update_student_groups_timestamp();

CREATE OR REPLACE FUNCTION update_class_portraits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_portraits_timestamp
  BEFORE UPDATE ON class_portraits
  FOR EACH ROW EXECUTE FUNCTION update_class_portraits_timestamp();

-- 启用行级安全 (RLS)
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_portraits ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_portraits ENABLE ROW LEVEL SECURITY;

-- 分组管理权限策略
CREATE POLICY "Teachers can manage groups in their classes" ON student_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Students can view groups they belong to" ON student_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() 
      AND s.student_id = ANY(student_groups.student_ids)
    )
  );

-- 小组画像权限策略
CREATE POLICY "Teachers and admins can manage group portraits" ON group_portraits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Students can view their group portraits" ON group_portraits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_groups sg
      JOIN students s ON s.student_id = ANY(sg.student_ids)
      WHERE sg.id = group_portraits.group_id
      AND s.user_id = auth.uid()
    )
  );

-- 班级画像权限策略
CREATE POLICY "Teachers and admins can manage class portraits" ON class_portraits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Students can view their class portraits" ON class_portraits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() 
      AND s.class_name = class_portraits.class_name
    )
  );

-- 创建辅助函数：获取学生所在的小组
CREATE OR REPLACE FUNCTION get_student_groups(student_id_param TEXT)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_type TEXT,
  member_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sg.id,
    sg.name,
    sg.group_type,
    array_length(sg.student_ids, 1) as member_count,
    sg.created_at
  FROM student_groups sg
  WHERE student_id_param = ANY(sg.student_ids)
  AND sg.status = 'active'
  ORDER BY sg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建辅助函数：获取班级分组统计
CREATE OR REPLACE FUNCTION get_class_group_stats(class_name_param TEXT)
RETURNS TABLE (
  total_groups INTEGER,
  total_grouped_students INTEGER,
  total_students INTEGER,
  grouping_rate NUMERIC,
  avg_group_size NUMERIC,
  group_types_distribution JSONB
) AS $$
DECLARE
  total_students_count INTEGER;
  total_groups_count INTEGER;
  grouped_students_count INTEGER;
  avg_size NUMERIC;
  type_dist JSONB;
BEGIN
  -- 获取班级总学生数
  SELECT COUNT(*) INTO total_students_count
  FROM students
  WHERE class_name = class_name_param;

  -- 获取分组统计
  SELECT 
    COUNT(*),
    COALESCE(SUM(array_length(student_ids, 1)), 0),
    COALESCE(AVG(array_length(student_ids, 1)), 0)
  INTO total_groups_count, grouped_students_count, avg_size
  FROM student_groups
  WHERE class_name = class_name_param AND status = 'active';

  -- 获取分组类型分布
  SELECT json_object_agg(group_type, count)
  INTO type_dist
  FROM (
    SELECT group_type, COUNT(*) as count
    FROM student_groups
    WHERE class_name = class_name_param AND status = 'active'
    GROUP BY group_type
  ) t;

  RETURN QUERY
  SELECT 
    total_groups_count,
    grouped_students_count,
    total_students_count,
    CASE 
      WHEN total_students_count > 0 
      THEN ROUND((grouped_students_count::NUMERIC / total_students_count * 100), 2)
      ELSE 0::NUMERIC
    END,
    ROUND(avg_size, 2),
    COALESCE(type_dist, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建清理过期画像的函数
CREATE OR REPLACE FUNCTION cleanup_expired_portraits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM class_portraits
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建定时任务清理过期数据（需要pg_cron扩展）
-- SELECT cron.schedule('cleanup-expired-portraits', '0 2 * * *', 'SELECT cleanup_expired_portraits();');