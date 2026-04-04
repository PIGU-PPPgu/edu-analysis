-- Grade statistics RPC functions.
-- Moves aggregation from frontend JS to the database.

-- 1. Class ranking for a given exam
CREATE OR REPLACE FUNCTION get_class_ranking(p_exam_id TEXT)
RETURNS TABLE (
  class_name      TEXT,
  average_score   NUMERIC,
  max_score       NUMERIC,
  min_score       NUMERIC,
  student_count   BIGINT,
  pass_count      BIGINT,
  pass_rate       NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(gd.class_name, '未知班级') AS class_name,
    ROUND(AVG(gd.total_score), 2)       AS average_score,
    MAX(gd.total_score)                 AS max_score,
    MIN(gd.total_score)                 AS min_score,
    COUNT(*)                            AS student_count,
    COUNT(*) FILTER (WHERE gd.total_score >= 60) AS pass_count,
    ROUND(
      COUNT(*) FILTER (WHERE gd.total_score >= 60)::NUMERIC / NULLIF(COUNT(*), 0),
      4
    )                                   AS pass_rate
  FROM grade_data gd
  WHERE gd.exam_id = p_exam_id
  GROUP BY gd.class_name
  ORDER BY average_score DESC;
$$;

-- 2. Student ranking for a given exam (optional class filter)
CREATE OR REPLACE FUNCTION get_student_ranking(
  p_exam_id     TEXT,
  p_class_name  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  student_id      TEXT,
  name            TEXT,
  class_name      TEXT,
  total_score     NUMERIC,
  rank            BIGINT,
  rank_percentile NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH ranked AS (
    SELECT
      gd.id,
      gd.student_id,
      gd.name,
      gd.class_name,
      gd.total_score,
      ROW_NUMBER() OVER (ORDER BY gd.total_score DESC NULLS LAST) AS rank,
      COUNT(*) OVER ()                                             AS total
    FROM grade_data gd
    WHERE gd.exam_id = p_exam_id
      AND (p_class_name IS NULL OR gd.class_name = p_class_name)
  )
  SELECT
    id, student_id, name, class_name, total_score,
    rank,
    ROUND(rank::NUMERIC / NULLIF(total, 0), 4) AS rank_percentile
  FROM ranked
  ORDER BY rank;
$$;

-- 3. Compare multiple classes for a given exam
CREATE OR REPLACE FUNCTION compare_class_performance(
  p_exam_id    TEXT,
  p_class_names TEXT[]
)
RETURNS TABLE (
  class_name    TEXT,
  average_score NUMERIC,
  max_score     NUMERIC,
  min_score     NUMERIC,
  pass_rate     NUMERIC,
  student_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    gd.class_name,
    ROUND(AVG(gd.total_score), 2)  AS average_score,
    MAX(gd.total_score)            AS max_score,
    MIN(gd.total_score)            AS min_score,
    ROUND(
      COUNT(*) FILTER (WHERE gd.total_score >= 60)::NUMERIC / NULLIF(COUNT(*), 0),
      4
    )                              AS pass_rate,
    COUNT(*)                       AS student_count
  FROM grade_data gd
  WHERE gd.exam_id = p_exam_id
    AND gd.class_name = ANY(p_class_names)
  GROUP BY gd.class_name
  ORDER BY average_score DESC;
$$;
