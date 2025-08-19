-- 创建预警算法支持函数
-- 为预警引擎提供高效的数据查询和计算支持

-- 1. 检查连续不及格的学生
CREATE OR REPLACE FUNCTION check_consecutive_fails(
  fail_count INTEGER,
  score_threshold NUMERIC,
  subject_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  fail_count INTEGER,
  subjects TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH consecutive_fails AS (
    SELECT 
      gd.student_id,
      gd.name as student_name,
      CASE 
        WHEN subject_filter IS NULL OR subject_filter = 'all' THEN
          ARRAY[
            CASE WHEN gd.chinese_score < score_threshold THEN 'chinese' END,
            CASE WHEN gd.math_score < score_threshold THEN 'math' END,
            CASE WHEN gd.english_score < score_threshold THEN 'english' END,
            CASE WHEN gd.physics_score < score_threshold THEN 'physics' END,
            CASE WHEN gd.chemistry_score < score_threshold THEN 'chemistry' END
          ]
        WHEN subject_filter = 'chinese' THEN
          CASE WHEN gd.chinese_score < score_threshold THEN ARRAY['chinese'] ELSE ARRAY[]::TEXT[] END
        WHEN subject_filter = 'math' THEN
          CASE WHEN gd.math_score < score_threshold THEN ARRAY['math'] ELSE ARRAY[]::TEXT[] END
        WHEN subject_filter = 'english' THEN
          CASE WHEN gd.english_score < score_threshold THEN ARRAY['english'] ELSE ARRAY[]::TEXT[] END
        WHEN subject_filter = 'physics' THEN
          CASE WHEN gd.physics_score < score_threshold THEN ARRAY['physics'] ELSE ARRAY[]::TEXT[] END
        WHEN subject_filter = 'chemistry' THEN
          CASE WHEN gd.chemistry_score < score_threshold THEN ARRAY['chemistry'] ELSE ARRAY[]::TEXT[] END
        ELSE ARRAY[]::TEXT[]
      END as failed_subjects,
      gd.exam_date,
      ROW_NUMBER() OVER (
        PARTITION BY gd.student_id 
        ORDER BY gd.exam_date DESC
      ) as exam_rank
    FROM grade_data gd
    WHERE gd.exam_date >= CURRENT_DATE - INTERVAL '6 months'
  ),
  student_fail_counts AS (
    SELECT 
      cf.student_id,
      cf.student_name,
      COUNT(*) as consecutive_fail_count,
      ARRAY_AGG(DISTINCT unnest_val) FILTER (WHERE unnest_val IS NOT NULL) as all_failed_subjects
    FROM consecutive_fails cf
    CROSS JOIN LATERAL unnest(cf.failed_subjects) as unnest_val
    WHERE array_length(cf.failed_subjects, 1) > 0 
    AND cf.exam_rank <= fail_count
    GROUP BY cf.student_id, cf.student_name
  )
  SELECT 
    sfc.student_id,
    sfc.student_name,
    sfc.consecutive_fail_count::INTEGER,
    sfc.all_failed_subjects
  FROM student_fail_counts sfc
  WHERE sfc.consecutive_fail_count >= fail_count;
END;
$$ LANGUAGE plpgsql;

-- 2. 检查成绩下降的学生
CREATE OR REPLACE FUNCTION check_grade_decline(
  decline_threshold NUMERIC,
  consecutive_count INTEGER DEFAULT 2
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  decline_amount NUMERIC,
  decline_periods INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH score_trends AS (
    SELECT 
      gd.student_id,
      gd.name as student_name,
      gd.total_score,
      gd.exam_date,
      LAG(gd.total_score, 1) OVER (
        PARTITION BY gd.student_id 
        ORDER BY gd.exam_date
      ) as previous_score,
      LAG(gd.total_score, 2) OVER (
        PARTITION BY gd.student_id 
        ORDER BY gd.exam_date
      ) as two_exams_ago_score,
      ROW_NUMBER() OVER (
        PARTITION BY gd.student_id 
        ORDER BY gd.exam_date DESC
      ) as recent_rank
    FROM grade_data gd
    WHERE gd.total_score IS NOT NULL
    AND gd.exam_date >= CURRENT_DATE - INTERVAL '1 year'
  ),
  declining_students AS (
    SELECT 
      st.student_id,
      st.student_name,
      CASE 
        WHEN st.previous_score IS NOT NULL THEN 
          st.previous_score - st.total_score
        ELSE 0
      END as recent_decline,
      CASE 
        WHEN st.two_exams_ago_score IS NOT NULL AND st.previous_score IS NOT NULL THEN
          st.two_exams_ago_score - st.total_score
        ELSE 0
      END as total_decline,
      CASE 
        WHEN st.previous_score IS NOT NULL 
        AND st.previous_score - st.total_score >= decline_threshold THEN 1
        ELSE 0
      END +
      CASE 
        WHEN st.two_exams_ago_score IS NOT NULL AND st.previous_score IS NOT NULL
        AND st.previous_score - st.two_exams_ago_score >= decline_threshold THEN 1
        ELSE 0
      END as decline_count
    FROM score_trends st
    WHERE st.recent_rank = 1
  )
  SELECT 
    ds.student_id,
    ds.student_name,
    GREATEST(ds.recent_decline, ds.total_decline),
    ds.decline_count::INTEGER
  FROM declining_students ds
  WHERE ds.decline_count >= consecutive_count
  AND GREATEST(ds.recent_decline, ds.total_decline) >= decline_threshold;
END;
$$ LANGUAGE plpgsql;

-- 3. 检查考试不及格的学生
CREATE OR REPLACE FUNCTION check_exam_fail(
  score_threshold NUMERIC,
  subject_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  score NUMERIC,
  subject TEXT,
  exam_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_exam AS (
    SELECT 
      gd.student_id,
      gd.name as student_name,
      gd.exam_title,
      gd.chinese_score,
      gd.math_score,
      gd.english_score,
      gd.physics_score,
      gd.chemistry_score,
      ROW_NUMBER() OVER (ORDER BY gd.exam_date DESC) as exam_rank
    FROM grade_data gd
    WHERE gd.exam_date >= CURRENT_DATE - INTERVAL '1 month'
  ),
  failing_scores AS (
    SELECT 
      le.student_id,
      le.student_name,
      le.exam_title,
      unnest(ARRAY[
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'chinese') 
             AND le.chinese_score < score_threshold THEN le.chinese_score END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'math') 
             AND le.math_score < score_threshold THEN le.math_score END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'english') 
             AND le.english_score < score_threshold THEN le.english_score END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'physics') 
             AND le.physics_score < score_threshold THEN le.physics_score END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'chemistry') 
             AND le.chemistry_score < score_threshold THEN le.chemistry_score END
      ]) as failing_score,
      unnest(ARRAY[
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'chinese') 
             AND le.chinese_score < score_threshold THEN 'chinese' END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'math') 
             AND le.math_score < score_threshold THEN 'math' END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'english') 
             AND le.english_score < score_threshold THEN 'english' END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'physics') 
             AND le.physics_score < score_threshold THEN 'physics' END,
        CASE WHEN (subject_filter IS NULL OR subject_filter = 'all' OR subject_filter = 'chemistry') 
             AND le.chemistry_score < score_threshold THEN 'chemistry' END
      ]) as failing_subject
    FROM latest_exam le
    WHERE le.exam_rank = 1
  )
  SELECT 
    fs.student_id,
    fs.student_name,
    fs.failing_score,
    fs.failing_subject,
    fs.exam_title
  FROM failing_scores fs
  WHERE fs.failing_score IS NOT NULL 
  AND fs.failing_subject IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. 检查作业拖欠的学生
CREATE OR REPLACE FUNCTION check_homework_default(
  default_count INTEGER,
  include_late_submissions BOOLEAN DEFAULT true
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  default_count INTEGER,
  late_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH student_homework_stats AS (
    SELECT 
      s.student_id,
      s.name as student_name,
      COUNT(CASE WHEN hs.id IS NULL THEN 1 END) as missing_count,
      COUNT(CASE 
        WHEN hs.submitted_at IS NOT NULL 
        AND h.due_date IS NOT NULL 
        AND hs.submitted_at > h.due_date 
        THEN 1 
      END) as late_submission_count
    FROM students s
    CROSS JOIN homework h
    LEFT JOIN homework_submissions hs ON s.id = hs.student_id AND h.id = hs.homework_id
    WHERE h.due_date >= CURRENT_DATE - INTERVAL '2 months'
    AND h.due_date <= CURRENT_DATE
    GROUP BY s.student_id, s.name
  )
  SELECT 
    shs.student_id,
    shs.student_name,
    shs.missing_count::INTEGER,
    shs.late_submission_count::INTEGER
  FROM student_homework_stats shs
  WHERE shs.missing_count >= default_count
  OR (include_late_submissions AND shs.late_submission_count >= default_count);
END;
$$ LANGUAGE plpgsql;

-- 5. 获取适用的预警规则（优化版本）
CREATE OR REPLACE FUNCTION get_applicable_warning_rules(
  rule_scope TEXT DEFAULT NULL,
  rule_category TEXT DEFAULT NULL,
  active_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  conditions JSONB,
  severity TEXT,
  scope TEXT,
  category TEXT,
  priority INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wr.id,
    wr.name,
    wr.description,
    wr.conditions,
    wr.severity,
    wr.scope,
    wr.category,
    wr.priority,
    wr.is_active,
    wr.created_at
  FROM warning_rules wr
  WHERE (NOT active_only OR wr.is_active = true)
  AND (rule_scope IS NULL OR wr.scope = rule_scope)
  AND (rule_category IS NULL OR wr.category = rule_category)
  ORDER BY wr.priority DESC, wr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 预警统计优化函数
CREATE OR REPLACE FUNCTION get_warning_statistics_optimized(
  time_range_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  total_students INTEGER,
  warning_students INTEGER,
  high_risk_students INTEGER,
  total_warnings INTEGER,
  active_warnings INTEGER,
  risk_distribution JSONB,
  category_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats_data AS (
    SELECT 
      (SELECT COUNT(*) FROM students) as total_student_count,
      COUNT(DISTINCT wr.student_id) as unique_warning_students,
      COUNT(CASE WHEN wrl.severity = 'high' THEN 1 END) as high_risk_count,
      COUNT(*) as total_warning_count,
      COUNT(CASE WHEN wr.status = 'active' THEN 1 END) as active_warning_count,
      jsonb_build_object(
        'low', COUNT(CASE WHEN wrl.severity = 'low' THEN 1 END),
        'medium', COUNT(CASE WHEN wrl.severity = 'medium' THEN 1 END),
        'high', COUNT(CASE WHEN wrl.severity = 'high' THEN 1 END)
      ) as risk_dist,
      jsonb_build_object(
        'grade', COUNT(CASE WHEN wrl.category = 'grade' THEN 1 END),
        'homework', COUNT(CASE WHEN wrl.category = 'homework' THEN 1 END),
        'attendance', COUNT(CASE WHEN wrl.category = 'attendance' THEN 1 END),
        'behavior', COUNT(CASE WHEN wrl.category = 'behavior' THEN 1 END),
        'progress', COUNT(CASE WHEN wrl.category = 'progress' THEN 1 END),
        'composite', COUNT(CASE WHEN wrl.category = 'composite' THEN 1 END)
      ) as category_dist
    FROM warning_records wr
    LEFT JOIN warning_rules wrl ON wr.rule_id = wrl.id
    WHERE wr.created_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
  )
  SELECT 
    sd.total_student_count::INTEGER,
    sd.unique_warning_students::INTEGER,
    sd.high_risk_count::INTEGER,
    sd.total_warning_count::INTEGER,
    sd.active_warning_count::INTEGER,
    sd.risk_dist,
    sd.category_dist
  FROM stats_data sd;
END;
$$ LANGUAGE plpgsql;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_grade_data_student_exam_date ON grade_data(student_id, exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_grade_data_scores ON grade_data(chinese_score, math_score, english_score, physics_score, chemistry_score);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_homework ON homework_submissions(student_id, homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(due_date);
CREATE INDEX IF NOT EXISTS idx_warning_records_student_rule ON warning_records(student_id, rule_id);
CREATE INDEX IF NOT EXISTS idx_warning_records_status_created ON warning_records(status, created_at);

-- 添加函数注释
COMMENT ON FUNCTION check_consecutive_fails IS '检查连续不及格的学生，支持指定科目筛选';
COMMENT ON FUNCTION check_grade_decline IS '检查成绩连续下降的学生';
COMMENT ON FUNCTION check_exam_fail IS '检查最近考试不及格的学生';
COMMENT ON FUNCTION check_homework_default IS '检查作业拖欠的学生，包含缺交和迟交统计';
COMMENT ON FUNCTION get_applicable_warning_rules IS '获取适用的预警规则，支持按范围和类别筛选';
COMMENT ON FUNCTION get_warning_statistics_optimized IS '优化的预警统计函数，一次查询获取所有统计数据';