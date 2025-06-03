-- 数据库表命名标准化：第1步
-- 创建新的 exam_scores 表替代 grade_data 表

-- 1. 创建新的考试成绩表
CREATE TABLE exam_scores AS SELECT * FROM grade_data;

-- 2. 添加主键约束（如果还没有）
ALTER TABLE exam_scores ADD CONSTRAINT pk_exam_scores PRIMARY KEY (id);

-- 3. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_exam_scores_exam_id ON exam_scores(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_scores_student_id ON exam_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_scores_created_at ON exam_scores(created_at);

-- 4. 添加外键约束（可选，增强数据完整性）
-- ALTER TABLE exam_scores 
-- ADD CONSTRAINT fk_exam_scores_exam_id 
-- FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- ALTER TABLE exam_scores 
-- ADD CONSTRAINT fk_exam_scores_student_id 
-- FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;

-- 5. 添加表注释
COMMENT ON TABLE exam_scores IS '考试成绩数据表 - 存储学生的考试成绩信息';
COMMENT ON COLUMN exam_scores.exam_id IS '关联的考试ID';
COMMENT ON COLUMN exam_scores.student_id IS '学生ID';
COMMENT ON COLUMN exam_scores.score IS '考试分数';
COMMENT ON COLUMN exam_scores.total_score IS '总分';

-- 验证数据迁移
SELECT 
    '数据迁移验证' as check_type,
    COUNT(*) as exam_scores_count,
    (SELECT COUNT(*) FROM grade_data) as grade_data_count
FROM exam_scores;

-- 显示表结构对比
SELECT 
    'exam_scores表结构' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'exam_scores' 
ORDER BY ordinal_position; 