-- 为submission_knowledge_points表添加学生ID字段
ALTER TABLE submission_knowledge_points
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id);

-- 更新现有记录，设置student_id
UPDATE submission_knowledge_points skp
SET student_id = hs.student_id
FROM homework_submissions hs
WHERE skp.submission_id = hs.id;

-- 添加新的索引以提高按学生查询的性能
CREATE INDEX IF NOT EXISTS idx_submission_knowledge_points_student 
ON submission_knowledge_points(student_id);

-- 添加新的显示字段，用于存储字母等级
ALTER TABLE submission_knowledge_points
ADD COLUMN IF NOT EXISTS mastery_grade TEXT DEFAULT 'C';

-- 更新现有记录的等级字段
UPDATE submission_knowledge_points
SET mastery_grade = 
  CASE 
    WHEN mastery_level >= 90 THEN 'A'
    WHEN mastery_level >= 80 THEN 'B'
    WHEN mastery_level >= 70 THEN 'C'
    WHEN mastery_level >= 60 THEN 'D'
    ELSE 'E'
  END;

-- 添加约束确保等级值有效
ALTER TABLE submission_knowledge_points
ADD CONSTRAINT chk_mastery_grade 
CHECK (mastery_grade IN ('A', 'B', 'C', 'D', 'E')); 