-- 创建考试表
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建成绩数据表
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  subject TEXT,
  total_score NUMERIC,
  score NUMERIC,
  rank_in_class INTEGER,
  rank_in_grade INTEGER,
  grade TEXT,
  percentile NUMERIC,
  z_score NUMERIC,
  exam_date DATE,
  exam_type TEXT,
  exam_title TEXT,
  exam_scope TEXT DEFAULT 'class',
  is_analyzed BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 创建分析队列表
CREATE TABLE IF NOT EXISTS analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  UNIQUE(exam_id)
);

-- 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);

-- 添加行级安全策略
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_queue ENABLE ROW LEVEL SECURITY;

-- 创建公共访问策略
CREATE POLICY "Public read access for exams"
  ON exams FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage exams"
  ON exams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
  ));
  
CREATE POLICY "Public read access for grade_data"
  ON grade_data FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage grade data"
  ON grade_data FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
  ));

CREATE POLICY "Public read access for analysis_queue"
  ON analysis_queue FOR SELECT
  USING (true);

CREATE POLICY "Teachers can manage analysis queue"
  ON analysis_queue FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'teacher')
  ));

-- 自动将新考试加入分析队列的触发器
CREATE OR REPLACE FUNCTION add_to_analysis_queue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analysis_queue (exam_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (exam_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_exam_created
  AFTER INSERT ON exams
  FOR EACH ROW EXECUTE FUNCTION add_to_analysis_queue();

-- 创建获取考试分析数据的RPC函数
CREATE OR REPLACE FUNCTION get_exam_analysis(p_exam_id UUID)
RETURNS TABLE (
  total_students INTEGER,
  avg_score NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC,
  std_dev NUMERIC,
  passing_count INTEGER,
  failing_count INTEGER,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_students,
    AVG(COALESCE(score, total_score))::NUMERIC AS avg_score,
    MIN(COALESCE(score, total_score))::NUMERIC AS min_score,
    MAX(COALESCE(score, total_score))::NUMERIC AS max_score,
    STDDEV(COALESCE(score, total_score))::NUMERIC AS std_dev,
    COUNT(CASE WHEN COALESCE(score, total_score) >= 60 THEN 1 END)::INTEGER AS passing_count,
    COUNT(CASE WHEN COALESCE(score, total_score) < 60 THEN 1 END)::INTEGER AS failing_count,
    (COUNT(CASE WHEN COALESCE(score, total_score) >= 60 THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(*)::NUMERIC, 0) * 100)::NUMERIC AS pass_rate
  FROM grade_data
  WHERE exam_id = p_exam_id;
END;
$$ LANGUAGE plpgsql;

-- 创建获取分数分布的RPC函数
CREATE OR REPLACE FUNCTION get_score_distribution(p_exam_id UUID)
RETURNS TABLE (
  score_range TEXT,
  count INTEGER,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ranges AS (
    SELECT '91-100' AS range, 91 AS lower_bound, 100 AS upper_bound UNION ALL
    SELECT '81-90', 81, 90 UNION ALL
    SELECT '71-80', 71, 80 UNION ALL
    SELECT '61-70', 61, 70 UNION ALL
    SELECT '51-60', 51, 60 UNION ALL
    SELECT '41-50', 41, 50 UNION ALL
    SELECT '31-40', 31, 40 UNION ALL
    SELECT '21-30', 21, 30 UNION ALL
    SELECT '11-20', 11, 20 UNION ALL
    SELECT '0-10', 0, 10
  ),
  counts AS (
    SELECT 
      r.range,
      COUNT(gd.id) AS count
    FROM ranges r
    LEFT JOIN grade_data gd ON 
      COALESCE(gd.score, gd.total_score) >= r.lower_bound AND 
      COALESCE(gd.score, gd.total_score) <= r.upper_bound AND
      gd.exam_id = p_exam_id
    GROUP BY r.range, r.lower_bound
    ORDER BY r.lower_bound DESC
  ),
  total AS (
    SELECT COUNT(*) AS total_count FROM grade_data WHERE exam_id = p_exam_id
  )
  SELECT 
    c.range AS score_range,
    c.count::INTEGER,
    (c.count::NUMERIC / NULLIF(t.total_count, 0) * 100)::NUMERIC AS percentage
  FROM counts c, total t;
END;
$$ LANGUAGE plpgsql;

-- 创建获取班级表现的RPC函数
CREATE OR REPLACE FUNCTION get_class_performance(p_exam_id UUID)
RETURNS TABLE (
  class_name TEXT,
  student_count INTEGER,
  average_score NUMERIC,
  max_score NUMERIC,
  min_score NUMERIC,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gd.class_name,
    COUNT(*)::INTEGER AS student_count,
    AVG(COALESCE(gd.score, gd.total_score))::NUMERIC AS average_score,
    MAX(COALESCE(gd.score, gd.total_score))::NUMERIC AS max_score,
    MIN(COALESCE(gd.score, gd.total_score))::NUMERIC AS min_score,
    (COUNT(CASE WHEN COALESCE(gd.score, gd.total_score) >= 60 THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(*)::NUMERIC, 0) * 100)::NUMERIC AS pass_rate
  FROM grade_data gd
  WHERE gd.exam_id = p_exam_id AND gd.class_name IS NOT NULL
  GROUP BY gd.class_name
  ORDER BY average_score DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建获取科目表现的RPC函数
CREATE OR REPLACE FUNCTION get_subject_performance(p_exam_id UUID, p_subject_name TEXT)
RETURNS TABLE (
  class_name TEXT,
  overall_average_score NUMERIC,
  overall_max_score NUMERIC,
  overall_min_score NUMERIC,
  class_average_score NUMERIC,
  class_max_score NUMERIC,
  class_min_score NUMERIC
) AS $$
BEGIN
  -- 获取所有班级
  RETURN QUERY
  WITH overall_stats AS (
    SELECT
      AVG(COALESCE(gd.score, gd.total_score))::NUMERIC AS overall_avg,
      MAX(COALESCE(gd.score, gd.total_score))::NUMERIC AS overall_max,
      MIN(COALESCE(gd.score, gd.total_score))::NUMERIC AS overall_min
    FROM grade_data gd
    WHERE gd.exam_id = p_exam_id
      AND (
        (p_subject_name = 'total_score') OR 
        (gd.subject = p_subject_name)
      )
  ),
  class_stats AS (
    SELECT
      gd.class_name,
      AVG(COALESCE(gd.score, gd.total_score))::NUMERIC AS class_avg,
      MAX(COALESCE(gd.score, gd.total_score))::NUMERIC AS class_max,
      MIN(COALESCE(gd.score, gd.total_score))::NUMERIC AS class_min
    FROM grade_data gd
    WHERE gd.exam_id = p_exam_id
      AND gd.class_name IS NOT NULL
      AND (
        (p_subject_name = 'total_score') OR 
        (gd.subject = p_subject_name)
      )
    GROUP BY gd.class_name
  )
  SELECT
    cs.class_name,
    os.overall_avg AS overall_average_score,
    os.overall_max AS overall_max_score,
    os.overall_min AS overall_min_score,
    cs.class_avg AS class_average_score,
    cs.class_max AS class_max_score,
    cs.class_min AS class_min_score
  FROM class_stats cs, overall_stats os
  ORDER BY cs.class_avg DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建计算并更新排名的函数
CREATE OR REPLACE FUNCTION update_grade_data_ranks(p_exam_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 更新班级排名
  WITH class_ranks AS (
    SELECT 
      id,
      class_name,
      RANK() OVER (PARTITION BY class_name ORDER BY COALESCE(score, total_score) DESC) as rank
    FROM grade_data
    WHERE exam_id = p_exam_id AND class_name IS NOT NULL
  )
  UPDATE grade_data gd
  SET rank_in_class = cr.rank
  FROM class_ranks cr
  WHERE gd.id = cr.id;
  
  -- 更新年级排名
  WITH grade_ranks AS (
    SELECT 
      id,
      RANK() OVER (ORDER BY COALESCE(score, total_score) DESC) as rank
    FROM grade_data
    WHERE exam_id = p_exam_id
  )
  UPDATE grade_data gd
  SET rank_in_grade = gr.rank
  FROM grade_ranks gr
  WHERE gd.id = gr.id;
  
  -- 更新百分位数和Z分数
  WITH stats AS (
    SELECT 
      AVG(COALESCE(score, total_score)) as avg_score,
      STDDEV(COALESCE(score, total_score)) as std_dev,
      COUNT(*) as total_count
    FROM grade_data
    WHERE exam_id = p_exam_id
  )
  UPDATE grade_data gd
  SET 
    z_score = CASE 
      WHEN s.std_dev > 0 THEN 
        ((COALESCE(score, total_score) - s.avg_score) / s.std_dev)::NUMERIC 
      ELSE 0 
    END,
    percentile = (
      (COUNT(*) OVER (WHERE COALESCE(score, total_score) <= COALESCE(gd.score, gd.total_score))::NUMERIC / 
       NULLIF(s.total_count, 0) * 100
    )::NUMERIC,
    is_analyzed = TRUE,
    analyzed_at = NOW()
  FROM stats s
  WHERE gd.exam_id = p_exam_id;
  
  -- 更新分析队列状态
  UPDATE analysis_queue
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE exam_id = p_exam_id;
END;
$$ LANGUAGE plpgsql; 