-- 为submission_knowledge_points表添加updated_at字段
ALTER TABLE IF EXISTS submission_knowledge_points 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 更新现有记录的updated_at字段为当前时间
UPDATE submission_knowledge_points
SET updated_at = now()
WHERE updated_at IS NULL;

-- 添加触发器，自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_submission_knowledge_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_submission_knowledge_points_updated_at ON submission_knowledge_points;

CREATE TRIGGER update_submission_knowledge_points_updated_at
BEFORE UPDATE ON submission_knowledge_points
FOR EACH ROW
EXECUTE FUNCTION update_submission_knowledge_points_updated_at(); 