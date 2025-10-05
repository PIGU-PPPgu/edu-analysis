-- ============================================================================
-- 数据库迁移脚本 003: 创建小组管理表
-- 创建时间: 2025-01-04
-- 功能: 学生分组管理、小组成员管理
-- ============================================================================

-- ========== 1. 创建 student_groups 表 ==========

CREATE TABLE IF NOT EXISTS student_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL REFERENCES class_info(class_name) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  description TEXT,
  leader_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 确保同一班级内小组名称唯一
  CONSTRAINT unique_group_per_class UNIQUE(class_name, group_name)
);

-- 添加注释
COMMENT ON TABLE student_groups IS '学生小组表 - 管理班级内的学习小组';
COMMENT ON COLUMN student_groups.id IS '小组唯一标识';
COMMENT ON COLUMN student_groups.class_name IS '所属班级名称';
COMMENT ON COLUMN student_groups.group_name IS '小组名称';
COMMENT ON COLUMN student_groups.description IS '小组描述';
COMMENT ON COLUMN student_groups.leader_student_id IS '组长学生ID';

-- ========== 2. 创建 group_members 表 ==========

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),

  -- 确保学生不会重复加入同一小组
  CONSTRAINT unique_student_per_group UNIQUE(group_id, student_id)
);

-- 添加注释
COMMENT ON TABLE group_members IS '小组成员表 - 记录小组与学生的关联关系';
COMMENT ON COLUMN group_members.id IS '成员记录唯一标识';
COMMENT ON COLUMN group_members.group_id IS '所属小组ID';
COMMENT ON COLUMN group_members.student_id IS '学生ID';
COMMENT ON COLUMN group_members.role IS '成员角色: leader(组长) 或 member(成员)';
COMMENT ON COLUMN group_members.joined_at IS '加入小组时间';

-- ========== 3. 创建索引优化查询性能 ==========

-- student_groups 表索引
CREATE INDEX IF NOT EXISTS idx_student_groups_class_name ON student_groups(class_name);
CREATE INDEX IF NOT EXISTS idx_student_groups_leader ON student_groups(leader_student_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_created_at ON student_groups(created_at DESC);

-- group_members 表索引
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student_id ON group_members(student_id);

-- ========== 4. 创建更新时间自动触发器 ==========

-- 创建触发器函数(如果不存在)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 student_groups 表添加自动更新触发器
DROP TRIGGER IF EXISTS update_student_groups_updated_at ON student_groups;
CREATE TRIGGER update_student_groups_updated_at
    BEFORE UPDATE ON student_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========== 5. 启用行级安全策略 (RLS) ==========

ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- student_groups 表的RLS策略
-- 允许所有认证用户查看小组
DROP POLICY IF EXISTS "允许认证用户查看小组" ON student_groups;
CREATE POLICY "允许认证用户查看小组" ON student_groups
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 允许教师和管理员创建小组
DROP POLICY IF EXISTS "允许教师创建小组" ON student_groups;
CREATE POLICY "允许教师创建小组" ON student_groups
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'teacher')
        )
    );

-- 允许教师和管理员更新小组
DROP POLICY IF EXISTS "允许教师更新小组" ON student_groups;
CREATE POLICY "允许教师更新小组" ON student_groups
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'teacher')
        )
    );

-- 允许教师和管理员删除小组
DROP POLICY IF EXISTS "允许教师删除小组" ON student_groups;
CREATE POLICY "允许教师删除小组" ON student_groups
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'teacher')
        )
    );

-- group_members 表的RLS策略
-- 允许所有认证用户查看成员
DROP POLICY IF EXISTS "允许认证用户查看成员" ON group_members;
CREATE POLICY "允许认证用户查看成员" ON group_members
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 允许教师和管理员管理成员
DROP POLICY IF EXISTS "允许教师管理成员" ON group_members;
CREATE POLICY "允许教师管理成员" ON group_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'teacher')
        )
    );

-- ========== 6. 创建统计视图 ==========

-- 小组统计视图
CREATE OR REPLACE VIEW group_statistics AS
SELECT
    sg.id AS group_id,
    sg.class_name,
    sg.group_name,
    sg.description,
    sg.leader_student_id,
    s_leader.name AS leader_name,
    COUNT(DISTINCT gm.student_id) AS member_count,
    sg.created_at,
    sg.updated_at
FROM student_groups sg
LEFT JOIN group_members gm ON sg.id = gm.group_id
LEFT JOIN students s_leader ON sg.leader_student_id = s_leader.id
GROUP BY
    sg.id,
    sg.class_name,
    sg.group_name,
    sg.description,
    sg.leader_student_id,
    s_leader.name,
    sg.created_at,
    sg.updated_at;

COMMENT ON VIEW group_statistics IS '小组统计视图 - 汇总每个小组的成员数量等信息';

-- ========== 7. 迁移完成验证 ==========

DO $$
BEGIN
    -- 验证表是否创建成功
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_groups') THEN
        RAISE EXCEPTION 'student_groups 表创建失败';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
        RAISE EXCEPTION 'group_members 表创建失败';
    END IF;

    -- 验证视图是否创建成功
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'group_statistics') THEN
        RAISE EXCEPTION 'group_statistics 视图创建失败';
    END IF;

    RAISE NOTICE '✅ 小组管理表迁移成功完成!';
    RAISE NOTICE '   - student_groups 表已创建';
    RAISE NOTICE '   - group_members 表已创建';
    RAISE NOTICE '   - 相关索引已创建';
    RAISE NOTICE '   - RLS策略已配置';
    RAISE NOTICE '   - group_statistics 视图已创建';
END $$;
