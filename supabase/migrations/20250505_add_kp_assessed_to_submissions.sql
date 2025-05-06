-- 为 homework_submissions 表添加 knowledge_points_assessed 列
ALTER TABLE public.homework_submissions
ADD COLUMN IF NOT EXISTS knowledge_points_assessed BOOLEAN NOT NULL DEFAULT FALSE;

-- 添加注释
COMMENT ON COLUMN public.homework_submissions.knowledge_points_assessed IS '知识点是否已被评估'; 