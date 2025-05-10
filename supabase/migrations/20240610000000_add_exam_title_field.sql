-- 为grades表添加exam_title字段
ALTER TABLE IF EXISTS "public"."grades" 
ADD COLUMN IF NOT EXISTS "exam_title" TEXT;

-- 注释
COMMENT ON COLUMN "public"."grades"."exam_title" IS '考试标题';

-- 确保exam_type字段存在（如果之前没有）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'grades'
        AND column_name = 'exam_type'
    ) THEN
        ALTER TABLE "public"."grades" ADD COLUMN "exam_type" TEXT;
        COMMENT ON COLUMN "public"."grades"."exam_type" IS '考试类型（如期中、期末等）';
    END IF;
END $$; 