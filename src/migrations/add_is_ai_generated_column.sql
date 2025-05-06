-- 添加is_ai_generated列到knowledge_points表
-- 此列用于标记是否是由AI生成的知识点
ALTER TABLE knowledge_points
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- 为现有知识点设置默认值
UPDATE knowledge_points
SET is_ai_generated = FALSE 
WHERE is_ai_generated IS NULL;

-- 添加索引以便快速查询AI生成的知识点
CREATE INDEX IF NOT EXISTS idx_knowledge_points_is_ai_generated 
ON knowledge_points(is_ai_generated);

-- 添加注释
COMMENT ON COLUMN knowledge_points.is_ai_generated IS '标记是否是由AI生成的知识点'; 