-- 为exams表添加scope字段，指示考试范围是班级还是年级
ALTER TABLE IF EXISTS "public"."exams" 
ADD COLUMN IF NOT EXISTS "scope" TEXT DEFAULT 'class' NOT NULL;

-- 添加注释说明字段用途
COMMENT ON COLUMN "public"."exams"."scope" IS '考试范围，可以是班级(class)或年级(grade)级别';

-- 确保已有数据有正确的默认值
UPDATE "public"."exams" SET "scope" = 'class' WHERE "scope" IS NULL;

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE 'Exams表scope字段添加成功, 默认值设置为class';
END $$; 