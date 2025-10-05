-- ============================================================
-- 班级管理和小组系统数据库迁移
-- 版本: 002
-- 日期: 2025-10-02
-- 目标:
--   1. 统一班级数据模型 (废弃classes表, 使用class_info)
--   2. 创建智能小组管理系统
--   3. 优化学生匹配索引 (支持三选二匹配)
-- ============================================================

-- ============================================================
-- Part 1: 创建统一班级视图 (兼容过渡)
-- ============================================================

-- 创建统一班级视图,使用class_name作为主键
CREATE OR REPLACE VIEW unified_classes AS
SELECT
  class_name as id,              -- 使用class_name作为主键
  class_name as name,
  grade_level as grade,
  student_count,
  homeroom_teacher,
  department,
  academic_year,
  created_at,
  updated_at
FROM class_info
WHERE class_name IS NOT NULL;

COMMENT ON VIEW unified_classes IS '统一班级视图 - 使用class_info作为数据源,class_name作为主键';


-- ============================================================
-- Part 2: 优化学生表索引 (支持班级名/学号/姓名三选二匹配)
-- ============================================================

-- 检查并创建复合索引 - 支持快速匹配
CREATE INDEX IF NOT EXISTS idx_students_class_student
ON students(class_name, student_id)
WHERE class_name IS NOT NULL AND student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_class_name_match
ON students(class_name, name)
WHERE class_name IS NOT NULL AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_full_match
ON students(class_name, student_id, name)
WHERE class_name IS NOT NULL AND student_id IS NOT NULL AND name IS NOT NULL;

COMMENT ON INDEX idx_students_class_student IS '学生匹配索引: 班级名+学号';
COMMENT ON INDEX idx_students_class_name_match IS '学生匹配索引: 班级名+姓名';
COMMENT ON INDEX idx_students_full_match IS '学生匹配索引: 班级名+学号+姓名完整匹配';


-- ============================================================
-- Part 3: 创建小组管理系统表
-- ============================================================

-- 3.1 小组基础表
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL REFERENCES class_info(class_name) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  description TEXT,

  -- 创建方式和元数据
  creation_method TEXT NOT NULL CHECK (creation_method IN ('ai', 'algorithm', 'manual')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 小组质量指标
  balance_score NUMERIC(5,2) CHECK (balance_score >= 0 AND balance_score <= 100),
  academic_balance NUMERIC(5,2),      -- 学术能力平衡度
  personality_balance NUMERIC(5,2),   -- 性格互补度
  skill_complementarity NUMERIC(5,2), -- 技能互补度

  -- AI推荐理由 (JSON格式)
  recommendation_reason JSONB,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 唯一约束: 同班级不能有重名小组
  UNIQUE(class_name, group_name)
);

CREATE INDEX IF NOT EXISTS idx_groups_class ON groups(class_name);
CREATE INDEX IF NOT EXISTS idx_groups_balance ON groups(balance_score DESC) WHERE balance_score IS NOT NULL;

COMMENT ON TABLE groups IS '学习小组基础信息表';
COMMENT ON COLUMN groups.creation_method IS '创建方式: ai(AI推荐) | algorithm(算法推荐) | manual(教师手动)';
COMMENT ON COLUMN groups.balance_score IS '小组综合平衡度 0-100';
COMMENT ON COLUMN groups.recommendation_reason IS 'AI推荐理由 JSON: {academic: "...", personality: "...", issues: [...]}';


-- 3.2 小组成员表
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 成员角色和贡献
  role TEXT CHECK (role IN ('leader', 'collaborator', 'supporter', 'specialist')) DEFAULT 'collaborator',
  contribution_score NUMERIC(5,2) DEFAULT 0 CHECK (contribution_score >= 0 AND contribution_score <= 100),

  -- 成员特征标签 (用于算法计算)
  academic_level TEXT CHECK (academic_level IN ('high', 'medium', 'low')),
  strength_subjects TEXT[],  -- 优势科目列表
  personality_traits TEXT[], -- 性格特征标签

  -- 时间戳
  assigned_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 唯一约束: 一个学生只能属于一个小组
  UNIQUE(student_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student ON group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role) WHERE role IS NOT NULL;

COMMENT ON TABLE group_members IS '小组成员关系表';
COMMENT ON COLUMN group_members.role IS '成员角色: leader(组长) | collaborator(协作者) | supporter(支持者) | specialist(专家)';
COMMENT ON COLUMN group_members.contribution_score IS '成员贡献度 0-100';
COMMENT ON COLUMN group_members.academic_level IS '学术水平: high(优秀) | medium(中等) | low(待提升)';


-- 3.3 小组推荐历史表 (记录所有推荐方案)
CREATE TABLE IF NOT EXISTS group_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL REFERENCES class_info(class_name) ON DELETE CASCADE,

  -- 推荐参数
  algorithm_type TEXT NOT NULL CHECK (algorithm_type IN ('balance', 'performance', 'diversity')),
  group_size INTEGER NOT NULL CHECK (group_size >= 2 AND group_size <= 10),
  custom_requirements TEXT,  -- 教师自定义要求

  -- 推荐结果 (JSON格式,存储完整方案)
  recommendation_data JSONB NOT NULL,

  -- 方案质量
  overall_score NUMERIC(5,2),
  applied BOOLEAN DEFAULT false,  -- 是否已应用
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_recommendations_class ON group_recommendations(class_name);
CREATE INDEX IF NOT EXISTS idx_group_recommendations_applied ON group_recommendations(applied, created_at DESC);

COMMENT ON TABLE group_recommendations IS '小组推荐历史记录表';
COMMENT ON COLUMN group_recommendations.algorithm_type IS '推荐算法类型: balance(平衡型) | performance(高效型) | diversity(多样化)';
COMMENT ON COLUMN group_recommendations.recommendation_data IS '完整推荐方案JSON';


-- ============================================================
-- Part 4: 创建小组统计视图 (优化查询性能)
-- ============================================================

CREATE OR REPLACE VIEW group_statistics AS
SELECT
  g.id as group_id,
  g.class_name,
  g.group_name,
  g.creation_method,
  g.balance_score,

  -- 成员统计
  COUNT(gm.id) as member_count,

  -- 学术统计 (需要关联成绩数据)
  AVG(
    (SELECT AVG(gd.total_score)
     FROM grade_data_new gd
     WHERE gd.student_id = (SELECT student_id FROM students s WHERE s.id = gm.student_id LIMIT 1)
    )
  ) as avg_group_score,

  -- 角色分布
  COUNT(CASE WHEN gm.role = 'leader' THEN 1 END) as leader_count,
  COUNT(CASE WHEN gm.role = 'collaborator' THEN 1 END) as collaborator_count,
  COUNT(CASE WHEN gm.role = 'supporter' THEN 1 END) as supporter_count,

  -- 时间信息
  g.created_at,
  g.updated_at

FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.class_name, g.group_name, g.creation_method, g.balance_score, g.created_at, g.updated_at;

COMMENT ON VIEW group_statistics IS '小组统计视图 - 汇总成员数、平均分、角色分布';


-- ============================================================
-- Part 5: 触发器 - 自动更新小组平衡度
-- ============================================================

CREATE OR REPLACE FUNCTION update_group_balance_score()
RETURNS TRIGGER AS $$
BEGIN
  -- 当成员变更时,重新计算小组平衡度
  -- 这里是简化版,生产环境应调用复杂算法
  UPDATE groups
  SET
    balance_score = (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE LEAST(100,
            (STDDEV_POP(COALESCE(contribution_score, 50)) * -1 + 100) * 0.5 +  -- 贡献度方差
            (COUNT(DISTINCT role)::NUMERIC / 4 * 100) * 0.3 +  -- 角色多样性
            50 * 0.2  -- 基础分
          )
        END
      FROM group_members
      WHERE group_id = NEW.group_id
    ),
    updated_at = now()
  WHERE id = NEW.group_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_balance ON group_members;
CREATE TRIGGER trigger_update_group_balance
AFTER INSERT OR UPDATE OR DELETE ON group_members
FOR EACH ROW
EXECUTE FUNCTION update_group_balance_score();

COMMENT ON FUNCTION update_group_balance_score IS '自动更新小组平衡度的触发器函数';


-- ============================================================
-- Part 6: RPC函数 - 获取班级可用学生 (未分组)
-- ============================================================

CREATE OR REPLACE FUNCTION get_available_students_for_grouping(target_class_name TEXT)
RETURNS TABLE (
  student_id UUID,
  student_display_id TEXT,
  name TEXT,
  average_score NUMERIC,
  strength_subjects TEXT[],
  current_group_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as student_id,
    s.student_id as student_display_id,
    s.name,

    -- 计算平均成绩
    (SELECT AVG(gd.total_score)
     FROM grade_data_new gd
     WHERE gd.student_id = s.student_id
     LIMIT 1
    ) as average_score,

    -- 获取优势科目 (简化版,取分数最高的3科)
    ARRAY(
      SELECT gd.subject_name
      FROM (
        SELECT
          UNNEST(ARRAY['chinese', 'math', 'english', 'physics', 'chemistry', 'politics', 'history', 'biology', 'geography']) as subject_name,
          UNNEST(ARRAY[
            chinese_score, math_score, english_score, physics_score, chemistry_score,
            politics_score, history_score, biology_score, geography_score
          ]) as score
        FROM grade_data_new
        WHERE student_id = s.student_id
        ORDER BY exam_date DESC
        LIMIT 1
      ) gd
      WHERE gd.score IS NOT NULL
      ORDER BY gd.score DESC
      LIMIT 3
    ) as strength_subjects,

    -- 当前所属小组
    gm.group_id as current_group_id

  FROM students s
  LEFT JOIN group_members gm ON s.id = gm.student_id
  WHERE s.class_name = target_class_name
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_students_for_grouping IS '获取班级可用于分组的学生列表(含未分组和已分组状态)';


-- ============================================================
-- Part 7: 数据验证和完整性检查
-- ============================================================

-- 检查是否有学生同时属于多个小组 (数据一致性)
CREATE OR REPLACE FUNCTION check_group_member_consistency()
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  group_count BIGINT,
  group_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as student_id,
    s.name as student_name,
    COUNT(gm.group_id) as group_count,
    ARRAY_AGG(g.group_name) as group_names
  FROM students s
  JOIN group_members gm ON s.id = gm.student_id
  JOIN groups g ON gm.group_id = g.id
  GROUP BY s.id, s.name
  HAVING COUNT(gm.group_id) > 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_group_member_consistency IS '检查小组成员一致性 - 发现同时属于多个小组的学生';


-- ============================================================
-- Part 8: 权限设置 (RLS策略)
-- ============================================================

-- 启用RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_recommendations ENABLE ROW LEVEL SECURITY;

-- 教师和管理员可以查看所有小组
CREATE POLICY "教师和管理员可查看所有小组" ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

-- 教师可以创建和管理小组
CREATE POLICY "教师可管理小组" ON groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

-- 学生可以查看自己所在的小组
CREATE POLICY "学生可查看所在小组" ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN students s ON gm.student_id = s.id
      WHERE gm.group_id = groups.id
      AND s.user_id = auth.uid()
    )
  );

-- 小组成员表同样策略
CREATE POLICY "教师可查看所有小组成员" ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "教师可管理小组成员" ON group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'teacher')
    )
  );


-- ============================================================
-- Part 9: 示例数据 (可选,用于测试)
-- ============================================================

-- 插入示例小组 (仅在测试环境)
-- 注意: 生产环境请注释掉这部分

-- INSERT INTO groups (class_name, group_name, creation_method, balance_score, recommendation_reason)
-- VALUES
--   ('高一(1)班', '学习小组A', 'algorithm', 87.5, '{"academic": "高中低搭配3:2:1", "personality": "性格互补", "skills": "数学强+语文强组合"}'),
--   ('高一(1)班', '学习小组B', 'ai', 92.0, '{"academic": "成绩均衡", "personality": "领导力分散", "skills": "全科发展"}');


-- ============================================================
-- 迁移完成标记
-- ============================================================

-- 记录迁移版本
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now(),
  description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES ('002', '班级统一和小组系统')
ON CONFLICT (version) DO NOTHING;

-- 迁移完成
SELECT '✅ 数据库迁移 002 完成: 班级统一 + 小组管理系统' as status;
