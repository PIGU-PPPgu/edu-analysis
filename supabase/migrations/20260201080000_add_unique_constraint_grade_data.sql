-- 为 grade_data 表添加唯一约束
-- 确保同一个学生在同一次考试中只有一条成绩记录

-- 1. 先清理可能存在的重复数据（如果有）
DELETE FROM grade_data a
USING grade_data b
WHERE a.id > b.id
  AND a.exam_id = b.exam_id
  AND a.student_id = b.student_id;

-- 2. 添加唯一约束
ALTER TABLE grade_data
ADD CONSTRAINT grade_data_exam_student_unique
UNIQUE (exam_id, student_id);

-- 3. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_student ON grade_data(exam_id, student_id);

-- 4. 添加注释
COMMENT ON CONSTRAINT grade_data_exam_student_unique ON grade_data IS '确保同一学生在同一考试中只有一条成绩记录';
