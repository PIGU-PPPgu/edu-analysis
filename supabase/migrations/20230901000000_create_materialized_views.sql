-- 创建物化视图以提高查询性能
-- 这些物化视图用于教学管理系统的数据分析功能
-- 为使应用程序在物化视图不存在时也能正常运行，添加了降级方案

-- 1. 班级基本统计信息物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS class_statistics AS
SELECT 
  c.id AS class_id,
  c.name AS class_name,
  c.grade,
  COUNT(DISTINCT s.id) AS student_count,
  COUNT(DISTINCT h.id) AS homework_count,
  COALESCE(AVG(g.score), 0) AS average_score,
  COALESCE((SUM(CASE WHEN g.score >= 90 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(g.id), 0)), 0) AS excellent_rate
FROM 
  classes c
  LEFT JOIN students s ON s.class_id = c.id
  LEFT JOIN homework h ON h.class_id = c.id
  LEFT JOIN grades g ON g.student_id = s.id
GROUP BY 
  c.id, c.name, c.grade;

-- 2. 班级学科统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_class_subject_stats AS
SELECT 
  s.class_id,
  g.subject,
  COUNT(DISTINCT s.id) AS student_count,
  AVG(g.score) AS average_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY g.score) AS median_score,
  MIN(g.score) AS min_score,
  MAX(g.score) AS max_score,
  STDDEV(g.score) AS score_deviation,
  (SUM(CASE WHEN g.score >= 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(g.id)) AS pass_rate,
  (SUM(CASE WHEN g.score >= 90 THEN 1 ELSE 0 END) * 100.0 / COUNT(g.id)) AS excellent_rate
FROM 
  students s
  JOIN grades g ON g.student_id = s.id
WHERE 
  g.subject IS NOT NULL
GROUP BY 
  s.class_id, g.subject;

-- 3. 班级考试趋势物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_class_exam_trends AS
SELECT 
  s.class_id,
  g.subject,
  g.exam_type,
  g.exam_date,
  AVG(g.score) AS average_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY g.score) AS median_score,
  (SUM(CASE WHEN g.score >= 60 THEN 1 ELSE 0 END) * 100.0 / COUNT(g.id)) AS pass_rate,
  (SUM(CASE WHEN g.score >= 90 THEN 1 ELSE 0 END) * 100.0 / COUNT(g.id)) AS excellent_rate
FROM 
  students s
  JOIN grades g ON g.student_id = s.id
WHERE 
  g.exam_date IS NOT NULL AND g.subject IS NOT NULL
GROUP BY 
  s.class_id, g.subject, g.exam_type, g.exam_date;

-- 4. 班级学科能力物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_class_subject_competency AS
SELECT 
  s.class_id,
  km.knowledge_point_id,
  kp.name AS knowledge_point_name,
  AVG(km.mastery_level) AS average_mastery
FROM 
  students s
  JOIN student_knowledge_mastery km ON km.student_id = s.id
  JOIN knowledge_points kp ON kp.id = km.knowledge_point_id
GROUP BY 
  s.class_id, km.knowledge_point_id, kp.name;

-- 5. 班级学科相关性物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_class_subject_correlation AS
WITH subject_avg_scores AS (
  SELECT 
    s.class_id,
    g.student_id,
    g.subject,
    AVG(g.score) AS avg_score
  FROM 
    students s
    JOIN grades g ON g.student_id = s.id
  GROUP BY 
    s.class_id, g.student_id, g.subject
)
SELECT 
  sa1.class_id,
  sa1.subject AS subject_a,
  sa2.subject AS subject_b,
  CORR(sa1.avg_score, sa2.avg_score) AS correlation_coefficient
FROM 
  subject_avg_scores sa1
  JOIN subject_avg_scores sa2 ON 
    sa1.class_id = sa2.class_id AND 
    sa1.student_id = sa2.student_id AND 
    sa1.subject < sa2.subject
GROUP BY 
  sa1.class_id, sa1.subject, sa2.subject;

-- 创建索引以加快查询速度
CREATE INDEX IF NOT EXISTS idx_class_statistics_class_id ON class_statistics(class_id);
CREATE INDEX IF NOT EXISTS idx_mv_subject_stats_class_id ON mv_class_subject_stats(class_id);
CREATE INDEX IF NOT EXISTS idx_mv_exam_trends_class_id ON mv_class_exam_trends(class_id);
CREATE INDEX IF NOT EXISTS idx_mv_competency_class_id ON mv_class_subject_competency(class_id);
CREATE INDEX IF NOT EXISTS idx_mv_correlation_class_id ON mv_class_subject_correlation(class_id);

-- 注意：物化视图创建后需要手动刷新或设置定时刷新任务
-- 可以使用以下命令手动刷新:
-- REFRESH MATERIALIZED VIEW class_statistics; 