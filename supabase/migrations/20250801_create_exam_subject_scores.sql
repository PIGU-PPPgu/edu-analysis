-- 考试科目总分配置表
-- 用于存储每个考试中各科目的总分设置

CREATE TABLE IF NOT EXISTS "public"."exam_subject_scores" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES "public"."exams"(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    total_score NUMERIC NOT NULL DEFAULT 100,
    passing_score NUMERIC,
    excellent_score NUMERIC,
    is_required BOOLEAN DEFAULT true,
    weight NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- 确保同一考试的同一科目只有一个配置
    UNIQUE(exam_id, subject_code)
);

-- 添加注释
COMMENT ON TABLE "public"."exam_subject_scores" IS '考试科目总分配置表';
COMMENT ON COLUMN "public"."exam_subject_scores"."exam_id" IS '关联的考试ID';
COMMENT ON COLUMN "public"."exam_subject_scores"."subject_code" IS '科目代码（如：chinese, math, english）';
COMMENT ON COLUMN "public"."exam_subject_scores"."subject_name" IS '科目名称（如：语文, 数学, 英语）';
COMMENT ON COLUMN "public"."exam_subject_scores"."total_score" IS '该科目在此次考试中的总分';
COMMENT ON COLUMN "public"."exam_subject_scores"."passing_score" IS '该科目及格分数';
COMMENT ON COLUMN "public"."exam_subject_scores"."excellent_score" IS '该科目优秀分数';
COMMENT ON COLUMN "public"."exam_subject_scores"."is_required" IS '是否为必考科目';
COMMENT ON COLUMN "public"."exam_subject_scores"."weight" IS '科目权重（用于总分计算）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exam_subject_scores_exam_id ON "public"."exam_subject_scores"(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_subject_scores_subject_code ON "public"."exam_subject_scores"(subject_code);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_exam_subject_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_exam_subject_scores_updated_at
    BEFORE UPDATE ON "public"."exam_subject_scores"
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_subject_scores_updated_at();

-- 插入常用科目的默认配置模板
INSERT INTO "public"."exam_subject_scores" (exam_id, subject_code, subject_name, total_score, passing_score, excellent_score)
SELECT 
    e.id as exam_id,
    unnest(ARRAY['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']) as subject_code,
    unnest(ARRAY['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理']) as subject_name,
    100 as total_score,
    60 as passing_score,
    90 as excellent_score
FROM "public"."exams" e
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."exam_subject_scores" ess 
    WHERE ess.exam_id = e.id
)
ON CONFLICT (exam_id, subject_code) DO NOTHING;

RAISE NOTICE '✅ 考试科目总分配置表创建完成';