-- 创建项目模块表
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT '未开始',
  parent_module UUID REFERENCES modules(id),
  type VARCHAR(50) NOT NULL DEFAULT '核心模块',
  priority VARCHAR(50) DEFAULT '中',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE modules IS '项目功能模块表，用于跟踪项目进度';
COMMENT ON COLUMN modules.name IS '模块名称';
COMMENT ON COLUMN modules.description IS '模块描述';
COMMENT ON COLUMN modules.progress IS '完成度百分比 (0-100)';
COMMENT ON COLUMN modules.status IS '进度状态 (未开始/进行中/已完成)';
COMMENT ON COLUMN modules.parent_module IS '父模块ID，用于子功能';
COMMENT ON COLUMN modules.type IS '模块类型 (核心模块/子功能/概览)';
COMMENT ON COLUMN modules.priority IS '优先级 (高/中/低)';

-- 创建子功能视图
CREATE OR REPLACE VIEW module_features AS
SELECT
  m.id,
  m.name,
  m.progress,
  m.status,
  m.priority,
  p.name AS parent_module_name,
  m.created_at,
  m.last_updated
FROM modules m
LEFT JOIN modules p ON m.parent_module = p.id
WHERE m.type = '子功能';

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_modules_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modules_updated 
BEFORE UPDATE ON modules 
FOR EACH ROW EXECUTE FUNCTION update_modules_last_updated();

-- 创建RLS策略
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- 只有认证用户可以查看
CREATE POLICY modules_select_policy ON modules
  FOR SELECT USING (auth.role() = 'authenticated');

-- 只有特定角色可以插入/更新/删除
CREATE POLICY modules_insert_policy ON modules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' IN ('admin', 'teacher'));
  
CREATE POLICY modules_update_policy ON modules
  FOR UPDATE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' IN ('admin', 'teacher'));
  
CREATE POLICY modules_delete_policy ON modules
  FOR DELETE USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin'); 