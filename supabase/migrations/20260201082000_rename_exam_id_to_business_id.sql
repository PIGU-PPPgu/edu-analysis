-- 规范化 exams 表的业务ID字段
-- 将容易混淆的 exam_id 重命名为 business_id

-- 1. 重命名字段
ALTER TABLE exams
RENAME COLUMN exam_id TO business_id;

-- 2. 重命名唯一约束
ALTER TABLE exams
DROP CONSTRAINT IF EXISTS exams_exam_id_key;

ALTER TABLE exams
ADD CONSTRAINT exams_business_id_key
UNIQUE (business_id);

-- 3. 重命名索引
DROP INDEX IF EXISTS idx_exams_exam_id;

CREATE INDEX IF NOT EXISTS idx_exams_business_id
ON exams(business_id);

-- 4. 添加注释
COMMENT ON COLUMN exams.business_id IS '业务主键，用于外部系统引用（如导入时的临时ID）';

-- 5. 说明
COMMENT ON TABLE exams IS '考试记录表（已规范化字段命名）';
