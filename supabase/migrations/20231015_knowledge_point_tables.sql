-- 知识点表
CREATE TABLE IF NOT EXISTS knowledge_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  homework_id UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES knowledge_points(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 知识点评分表
CREATE TABLE IF NOT EXISTS knowledge_point_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  knowledge_point_id UUID NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(assignment_id, student_id, knowledge_point_id)
);

-- 提交知识点评估表
CREATE TABLE IF NOT EXISTS submission_knowledge_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  knowledge_point_id UUID NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(submission_id, knowledge_point_id)
);

-- AI分析结果表
CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id UUID NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  extracted_points JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(homework_id, student_id)
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_knowledge_points_homework_id ON knowledge_points(homework_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_point_scores_assignment_student ON knowledge_point_scores(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submission_knowledge_points_submission ON submission_knowledge_points(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_homework_student ON ai_analysis_results(homework_id, student_id);

-- 添加RLS(行级安全)策略
ALTER TABLE knowledge_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_point_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_knowledge_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;

-- 知识点表权限策略
CREATE POLICY "教师可以创建知识点" ON knowledge_points
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT teacher_id FROM homeworks WHERE id = homework_id
    )
  );

CREATE POLICY "教师可以查看知识点" ON knowledge_points
  FOR SELECT USING (
    auth.uid() IN (
      SELECT teacher_id FROM homeworks WHERE id = homework_id
    )
  );

CREATE POLICY "教师可以更新知识点" ON knowledge_points
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT teacher_id FROM homeworks WHERE id = homework_id
    )
  );

-- 知识点评分表权限策略
CREATE POLICY "教师可以创建和更新知识点评分" ON knowledge_point_scores
  FOR ALL USING (
    auth.uid() IN (
      SELECT teacher_id FROM assignments WHERE id = assignment_id
    )
  );

CREATE POLICY "学生可以查看自己的知识点评分" ON knowledge_point_scores
  FOR SELECT USING (
    auth.uid() = student_id
  );

-- 提交知识点评估表权限策略
CREATE POLICY "教师可以管理提交知识点评估" ON submission_knowledge_points
  FOR ALL USING (
    auth.uid() IN (
      SELECT h.teacher_id 
      FROM homework_submissions s
      JOIN homeworks h ON s.homework_id = h.id
      WHERE s.id = submission_id
    )
  );

-- AI分析结果表权限策略
CREATE POLICY "教师可以管理AI分析结果" ON ai_analysis_results
  FOR ALL USING (
    auth.uid() IN (
      SELECT teacher_id FROM homeworks WHERE id = homework_id
    )
  );

CREATE POLICY "学生可以查看自己的AI分析结果" ON ai_analysis_results
  FOR SELECT USING (
    auth.uid() = student_id
  ); 