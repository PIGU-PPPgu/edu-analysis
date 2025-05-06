-- 为 homework_submissions 表添加 teacher_feedback 列
ALTER TABLE public.homework_submissions
ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;

-- 可选：为现有行设置默认值（如果需要）
-- UPDATE public.homework_submissions
-- SET teacher_feedback = ''
-- WHERE teacher_feedback IS NULL;

-- 添加注释（如果需要）
COMMENT ON COLUMN public.homework_submissions.teacher_feedback IS '教师对作业提交的评语'; 