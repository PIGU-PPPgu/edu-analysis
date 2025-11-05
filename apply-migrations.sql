-- 🚨 考试科目总分设置功能修复 - 数据库迁移脚本
-- 这个脚本需要在 Supabase Dashboard 的 SQL Editor 中执行

-- ============================================
-- 1. 创建 exam_subject_scores 表 (科目总分配置表)
-- ============================================

CREATE TABLE IF NOT EXISTS "public"."exam_subject_scores" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES "public"."exams"(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL, -- 科目代码：chinese, math, english, physics, chemistry, biology, politics, history, geography
    subject_name TEXT NOT NULL, -- 科目名称：语文、数学、英语等
    total_score NUMERIC NOT NULL DEFAULT 100, -- 该科目的总分
    passing_score NUMERIC, -- 及格分
    excellent_score NUMERIC, -- 优秀分
    is_required BOOLEAN DEFAULT true, -- 是否为必考科目
    weight NUMERIC DEFAULT 1.0, -- 科目权重，用于计算总分
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

-- ============================================
-- 2. 检查并更新 academic_terms 表 (学期管理表)
-- ============================================

-- 检查 academic_terms 表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS "public"."academic_terms" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year TEXT NOT NULL, -- 学年，如：2024-2025
    semester TEXT NOT NULL, -- 学期，如：第一学期、第二学期
    semester_code TEXT NOT NULL, -- 学期代码，如：2024-2025-1、2024-2025-2
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- 确保学期代码唯一
    UNIQUE(semester_code),
    -- 确保同一学年的同一学期只有一个记录
    UNIQUE(academic_year, semester)
);

-- 为 exams 表添加学期关联字段（如果不存在）
ALTER TABLE IF EXISTS "public"."exams" 
ADD COLUMN IF NOT EXISTS "academic_term_id" UUID REFERENCES "public"."academic_terms"(id);

-- 添加注释
COMMENT ON TABLE "public"."academic_terms" IS '学年学期管理表';
COMMENT ON COLUMN "public"."academic_terms"."academic_year" IS '学年，格式：YYYY-YYYY';
COMMENT ON COLUMN "public"."academic_terms"."semester" IS '学期名称';
COMMENT ON COLUMN "public"."academic_terms"."semester_code" IS '学期唯一代码';
COMMENT ON COLUMN "public"."academic_terms"."start_date" IS '学期开始日期';
COMMENT ON COLUMN "public"."academic_terms"."end_date" IS '学期结束日期';
COMMENT ON COLUMN "public"."academic_terms"."is_current" IS '是否为当前学期';
COMMENT ON COLUMN "public"."academic_terms"."is_active" IS '是否激活状态';

COMMENT ON COLUMN "public"."exams"."academic_term_id" IS '关联的学期ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_academic_terms_semester_code ON "public"."academic_terms"(semester_code);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_current ON "public"."academic_terms"(is_current);
CREATE INDEX IF NOT EXISTS idx_academic_terms_academic_year ON "public"."academic_terms"(academic_year);
CREATE INDEX IF NOT EXISTS idx_exams_academic_term_id ON "public"."exams"(academic_term_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_academic_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_academic_terms_updated_at
    BEFORE UPDATE ON "public"."academic_terms"
    FOR EACH ROW
    EXECUTE FUNCTION update_academic_terms_updated_at();

-- 确保只有一个当前学期的触发器
CREATE OR REPLACE FUNCTION ensure_single_current_term()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果设置为当前学期，取消其他学期的当前状态
    IF NEW.is_current = true THEN
        UPDATE "public"."academic_terms" 
        SET is_current = false 
        WHERE id != NEW.id AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ensure_single_current_term
    BEFORE INSERT OR UPDATE ON "public"."academic_terms"
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_term();

-- ============================================
-- 3. 插入示例数据
-- ============================================

-- 插入示例学期数据
INSERT INTO "public"."academic_terms" (academic_year, semester, semester_code, start_date, end_date, is_current, description) VALUES
('2024-2025', '第一学期', '2024-2025-1', '2024-09-01', '2025-01-31', true, '2024-2025学年第一学期'),
('2024-2025', '第二学期', '2024-2025-2', '2025-02-01', '2025-07-31', false, '2024-2025学年第二学期'),
('2023-2024', '第一学期', '2023-2024-1', '2023-09-01', '2024-01-31', false, '2023-2024学年第一学期'),
('2023-2024', '第二学期', '2023-2024-2', '2024-02-01', '2024-07-31', false, '2023-2024学年第二学期')
ON CONFLICT (semester_code) DO NOTHING;

-- 为现有考试创建默认科目总分配置
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

-- ============================================
-- 4. 验证创建结果
-- ============================================

-- 验证表是否创建成功
DO $$
BEGIN
    -- 检查 exam_subject_scores 表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_subject_scores') THEN
        RAISE NOTICE '✅ exam_subject_scores 表创建成功';
    ELSE
        RAISE NOTICE '❌ exam_subject_scores 表创建失败';
    END IF;
    
    -- 检查 academic_terms 表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'academic_terms') THEN
        RAISE NOTICE '✅ academic_terms 表已存在或创建成功';
    ELSE
        RAISE NOTICE '❌ academic_terms 表创建失败';
    END IF;
    
    -- 检查 exams 表的 academic_term_id 字段
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'academic_term_id') THEN
        RAISE NOTICE '✅ exams.academic_term_id 字段已存在或创建成功';
    ELSE
        RAISE NOTICE '❌ exams.academic_term_id 字段创建失败';
    END IF;
END $$;

-- 显示创建的记录数
SELECT 
    (SELECT COUNT(*) FROM "public"."exam_subject_scores") as exam_subject_scores_count,
    (SELECT COUNT(*) FROM "public"."academic_terms") as academic_terms_count;

RAISE NOTICE '🎉 数据库迁移完成！科目总分设置功能现在应该可以正常工作了。';