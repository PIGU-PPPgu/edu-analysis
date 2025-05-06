-- 创建新的知识点掌握程度表，替代原有的submission_knowledge_points表
CREATE TABLE student_knowledge_mastery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) NOT NULL,
  knowledge_point_id UUID REFERENCES knowledge_points(id) NOT NULL,
  homework_id UUID REFERENCES homework(id) NOT NULL,
  submission_id UUID REFERENCES homework_submissions(id) NOT NULL,
  mastery_level INTEGER CHECK (mastery_level >= 0 AND mastery_level <= 100) NOT NULL DEFAULT 0,
  mastery_grade TEXT CHECK (mastery_grade IN ('A', 'B', 'C', 'D', 'E')) NOT NULL DEFAULT 'C',
  assessment_count INTEGER NOT NULL DEFAULT 1,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, knowledge_point_id, homework_id)
);

-- 添加索引以优化查询性能
CREATE INDEX idx_student_knowledge_mastery_student ON student_knowledge_mastery(student_id);
CREATE INDEX idx_student_knowledge_mastery_knowledge ON student_knowledge_mastery(knowledge_point_id);
CREATE INDEX idx_student_knowledge_mastery_homework ON student_knowledge_mastery(homework_id);
CREATE INDEX idx_student_knowledge_mastery_submission ON student_knowledge_mastery(submission_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_student_knowledge_mastery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_knowledge_mastery_timestamp
BEFORE UPDATE ON student_knowledge_mastery
FOR EACH ROW
EXECUTE FUNCTION update_student_knowledge_mastery_timestamp();

-- 从旧表迁移数据
INSERT INTO student_knowledge_mastery (
  student_id,
  knowledge_point_id,
  homework_id,
  submission_id,
  mastery_level,
  mastery_grade,
  created_at,
  updated_at
)
SELECT 
  skp.student_id,
  skp.knowledge_point_id,
  hs.homework_id,
  skp.submission_id,
  skp.mastery_level,
  COALESCE(skp.mastery_grade, 
    CASE 
      WHEN skp.mastery_level >= 90 THEN 'A'
      WHEN skp.mastery_level >= 80 THEN 'B'
      WHEN skp.mastery_level >= 70 THEN 'C'
      WHEN skp.mastery_level >= 60 THEN 'D'
      ELSE 'E'
    END
  ),
  COALESCE(skp.created_at, NOW()),
  COALESCE(skp.updated_at, NOW())
FROM submission_knowledge_points skp
JOIN homework_submissions hs ON skp.submission_id = hs.id
WHERE skp.student_id IS NOT NULL; 