-- Supabase评分方案相关表结构
-- 用于批改设置页面中的评分方案和评级等级

-- 1. 创建评分方案表
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_default BOOLEAN DEFAULT false
);

-- 2. 创建评分等级表
CREATE TABLE IF NOT EXISTS grading_scale_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  color TEXT DEFAULT 'bg-green-500',
  description TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建知识点阈值设置表
CREATE TABLE IF NOT EXISTS knowledge_point_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 安全地删除相关的触发器和函数
DO $$
BEGIN
  -- 删除触发器
  DROP TRIGGER IF EXISTS update_grading_scales_timestamp ON grading_scales;
  DROP TRIGGER IF EXISTS update_grading_scale_levels_timestamp ON grading_scale_levels;
  DROP TRIGGER IF EXISTS update_knowledge_point_thresholds_timestamp ON knowledge_point_thresholds;
  
  -- 删除函数
  DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
END
$$;

-- 5. 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 为表添加更新时间戳的触发器
CREATE TRIGGER update_grading_scales_timestamp
  BEFORE UPDATE ON grading_scales
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_grading_scale_levels_timestamp
  BEFORE UPDATE ON grading_scale_levels
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_knowledge_point_thresholds_timestamp
  BEFORE UPDATE ON knowledge_point_thresholds
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 7. 设置默认评分方案的触发器函数
CREATE OR REPLACE FUNCTION ensure_single_default_scale()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果设置了新的默认方案，则取消之前的默认方案
  IF NEW.is_default = true THEN
    UPDATE grading_scales 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  
  -- 确保至少有一个默认方案
  IF (SELECT COUNT(*) FROM grading_scales WHERE is_default = true) = 0 THEN
    NEW.is_default := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 添加默认评分方案触发器
CREATE TRIGGER ensure_single_default_scale
  BEFORE INSERT OR UPDATE OF is_default ON grading_scales
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_scale();

-- 9. 行级安全策略
-- 评分方案表的安全策略
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- 教师和管理员可以查看所有评分方案
CREATE POLICY view_grading_scales ON grading_scales 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
    )
  );

-- 创建者和管理员可以修改评分方案
CREATE POLICY manage_grading_scales ON grading_scales
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 评分等级表的安全策略
ALTER TABLE grading_scale_levels ENABLE ROW LEVEL SECURITY;

-- 教师和管理员可以查看所有评分等级
CREATE POLICY view_grading_scale_levels ON grading_scale_levels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
    )
  );

-- 创建者和管理员可以修改评分等级
CREATE POLICY manage_grading_scale_levels ON grading_scale_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM grading_scales gs 
      WHERE gs.id = grading_scale_levels.scale_id AND 
      (gs.created_by = auth.uid() OR 
       EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
  );

-- 知识点阈值表的安全策略
ALTER TABLE knowledge_point_thresholds ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的阈值设置
CREATE POLICY view_own_thresholds ON knowledge_point_thresholds
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 用户可以管理自己的阈值设置
CREATE POLICY manage_own_thresholds ON knowledge_point_thresholds
  FOR ALL USING (
    user_id = auth.uid()
  );

-- 10. 插入默认评分方案
INSERT INTO grading_scales (name, is_default)
VALUES ('优良中差', true)
ON CONFLICT DO NOTHING;

-- 获取刚插入的评分方案ID
DO $$
DECLARE
  scale_id UUID;
BEGIN
  SELECT id INTO scale_id FROM grading_scales WHERE name = '优良中差' LIMIT 1;
  
  IF scale_id IS NOT NULL THEN
    -- 为默认评分方案添加等级
    INSERT INTO grading_scale_levels (scale_id, name, min_score, max_score, color, position)
    VALUES 
      (scale_id, '优', 90, 100, 'bg-green-500', 1),
      (scale_id, '良', 80, 89, 'bg-blue-500', 2),
      (scale_id, '中', 70, 79, 'bg-yellow-500', 3),
      (scale_id, '差', 60, 69, 'bg-red-500', 4)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 再添加一个示例评分方案
INSERT INTO grading_scales (name)
VALUES ('五星评级')
ON CONFLICT DO NOTHING;

-- 获取刚插入的评分方案ID
DO $$
DECLARE
  scale_id UUID;
BEGIN
  SELECT id INTO scale_id FROM grading_scales WHERE name = '五星评级' LIMIT 1;
  
  IF scale_id IS NOT NULL THEN
    -- 为默认评分方案添加等级
    INSERT INTO grading_scale_levels (scale_id, name, min_score, max_score, color, position)
    VALUES 
      (scale_id, '五星', 90, 100, 'bg-purple-500', 1),
      (scale_id, '四星', 80, 89, 'bg-blue-500', 2),
      (scale_id, '三星', 70, 79, 'bg-green-500', 3),
      (scale_id, '二星', 60, 69, 'bg-yellow-500', 4),
      (scale_id, '一星', 0, 59, 'bg-red-500', 5)
    ON CONFLICT DO NOTHING;
  END IF;
END $$; 