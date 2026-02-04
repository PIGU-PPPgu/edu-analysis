-- 为 exams 表添加学年和学期字段
-- 这些字段在配置导入工作流中需要使用

-- 1. 添加学年字段
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- 2. 添加学期字段
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS semester TEXT;

-- 3. 添加年级字段
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- 4. 添加考试ID字段（业务主键）
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS exam_id TEXT UNIQUE;

-- 5. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_exams_academic_year ON exams(academic_year);
CREATE INDEX IF NOT EXISTS idx_exams_semester ON exams(semester);
CREATE INDEX IF NOT EXISTS idx_exams_grade_level ON exams(grade_level);
CREATE INDEX IF NOT EXISTS idx_exams_exam_id ON exams(exam_id);

-- 6. 添加注释
COMMENT ON COLUMN exams.academic_year IS '学年，如 2024-2025';
COMMENT ON COLUMN exams.semester IS '学期，如 第一学期';
COMMENT ON COLUMN exams.grade_level IS '年级，如 高一';
COMMENT ON COLUMN exams.exam_id IS '考试业务ID，用于外部引用';
