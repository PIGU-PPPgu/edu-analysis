-- 学年学期管理表
-- 用于管理学年学期信息，支持考试的学期筛选功能

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

-- 为exams表添加学期关联字段
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

-- 插入示例学期数据
INSERT INTO "public"."academic_terms" (academic_year, semester, semester_code, start_date, end_date, is_current, description) VALUES
('2024-2025', '第一学期', '2024-2025-1', '2024-09-01', '2025-01-31', true, '2024-2025学年第一学期'),
('2024-2025', '第二学期', '2024-2025-2', '2025-02-01', '2025-07-31', false, '2024-2025学年第二学期'),
('2023-2024', '第一学期', '2023-2024-1', '2023-09-01', '2024-01-31', false, '2023-2024学年第一学期'),
('2023-2024', '第二学期', '2023-2024-2', '2024-02-01', '2024-07-31', false, '2023-2024学年第二学期')
ON CONFLICT (semester_code) DO NOTHING;

RAISE NOTICE '✅ 学年学期管理表创建完成';