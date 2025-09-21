-- =============================================
-- 创建缺失的核心存储过程
-- 用于支持预警系统、班级画像、学生画像
-- =============================================

-- 1. 预警类型分布统计函数
CREATE OR REPLACE FUNCTION get_warnings_by_type()
RETURNS TABLE (
  type TEXT,
  count BIGINT,
  percentage NUMERIC,
  trend TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH warning_counts AS (
    SELECT
      (wr.details->>'type')::TEXT as warning_type,
      COUNT(*) as warning_count
    FROM warning_records wr
    WHERE wr.status = 'active'
      AND wr.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY (wr.details->>'type')::TEXT
  ),
  total_warnings AS (
    SELECT SUM(warning_count) as total_count FROM warning_counts
  )
  SELECT
    wc.warning_type as type,
    wc.warning_count as count,
    ROUND((wc.warning_count::NUMERIC / GREATEST(tw.total_count, 1)) * 100, 1) as percentage,
    'unchanged'::TEXT as trend  -- TODO: 实现趋势计算逻辑
  FROM warning_counts wc
  CROSS JOIN total_warnings tw
  ORDER BY wc.warning_count DESC;
END;
$$;

-- 2. 班级风险分布统计函数
CREATE OR REPLACE FUNCTION get_risk_by_class()
RETURNS TABLE (
  class_name TEXT,
  student_count BIGINT,
  warning_count BIGINT,
  risk_level TEXT,
  avg_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH class_warnings AS (
    SELECT
      s.class_name,
      COUNT(DISTINCT s.student_id) as students,
      COUNT(wr.id) as warnings
    FROM students s
    LEFT JOIN warning_records wr ON s.student_id = wr.student_id
      AND wr.status = 'active'
    WHERE s.class_name IS NOT NULL
      AND s.class_name != '未知班级'
    GROUP BY s.class_name
  ),
  class_grades AS (
    SELECT
      gd.class_name,
      AVG(gd.total_score) as avg_total_score
    FROM grade_data_new gd
    WHERE gd.class_name IS NOT NULL
      AND gd.total_score IS NOT NULL
    GROUP BY gd.class_name
  )
  SELECT
    cw.class_name,
    cw.students as student_count,
    cw.warnings as warning_count,
    CASE
      WHEN cw.warnings >= 5 THEN 'high'::TEXT
      WHEN cw.warnings >= 2 THEN 'medium'::TEXT
      ELSE 'low'::TEXT
    END as risk_level,
    COALESCE(cg.avg_total_score, 0) as avg_score
  FROM class_warnings cw
  LEFT JOIN class_grades cg ON cw.class_name = cg.class_name
  ORDER BY cw.warnings DESC, cw.class_name;
END;
$$;

-- 3. 常见风险因素统计函数
CREATE OR REPLACE FUNCTION get_common_risk_factors()
RETURNS TABLE (
  factor TEXT,
  count BIGINT,
  percentage NUMERIC,
  severity TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH risk_factors AS (
    SELECT
      (wr.details->>'factor')::TEXT as risk_factor,
      (wr.details->>'severity')::TEXT as risk_severity,
      COUNT(*) as factor_count
    FROM warning_records wr
    WHERE wr.status = 'active'
      AND wr.details ? 'factor'
      AND wr.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY (wr.details->>'factor')::TEXT, (wr.details->>'severity')::TEXT
  ),
  total_factors AS (
    SELECT SUM(factor_count) as total_count FROM risk_factors
  )
  SELECT
    rf.risk_factor as factor,
    rf.factor_count as count,
    ROUND((rf.factor_count::NUMERIC / GREATEST(tf.total_count, 1)) * 100, 1) as percentage,
    COALESCE(rf.risk_severity, 'medium'::TEXT) as severity
  FROM risk_factors rf
  CROSS JOIN total_factors tf
  WHERE rf.risk_factor IS NOT NULL
  ORDER BY rf.factor_count DESC
  LIMIT 10;
END;
$$;

-- 4. 班级画像统计函数 (优化版本)
CREATE OR REPLACE FUNCTION get_class_portrait_stats(input_class_name TEXT)
RETURNS TABLE (
  class_name TEXT,
  student_count BIGINT,
  average_score NUMERIC,
  excellent_rate NUMERIC,
  pass_rate NUMERIC,
  gender_stats JSONB,
  subject_stats JSONB,
  grade_records BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_class_name TEXT;
BEGIN
  -- 智能班级名称解析
  resolved_class_name := input_class_name;

  -- 如果是class-前缀格式，进行解析
  IF input_class_name LIKE 'class-%' THEN
    resolved_class_name := REPLACE(REPLACE(input_class_name, 'class-', ''), '-', '');

    -- 如果解析后不像班级名称，尝试匹配
    IF resolved_class_name NOT LIKE '%班%' AND resolved_class_name NOT LIKE '%级%' THEN
      SELECT s.class_name INTO resolved_class_name
      FROM students s
      WHERE s.class_name IS NOT NULL
        AND (
          LOWER(s.class_name) LIKE '%' || LOWER(resolved_class_name) || '%' OR
          LOWER(resolved_class_name) LIKE '%' || LOWER(s.class_name) || '%'
        )
      LIMIT 1;
    END IF;
  END IF;

  RETURN QUERY
  WITH student_data AS (
    SELECT
      s.student_id,
      s.gender,
      s.class_name as real_class_name
    FROM students s
    WHERE s.class_name = resolved_class_name
  ),
  grade_data AS (
    SELECT
      gd.student_id,
      gd.total_score,
      gd.chinese_score,
      gd.math_score,
      gd.english_score,
      gd.physics_score,
      gd.chemistry_score
    FROM grade_data_new gd
    WHERE gd.class_name = resolved_class_name
      AND gd.total_score IS NOT NULL
  ),
  stats_calculation AS (
    SELECT
      resolved_class_name as calc_class_name,
      COUNT(DISTINCT sd.student_id) as total_students,
      COUNT(gd.total_score) as total_grades,
      AVG(gd.total_score) as avg_score,
      COUNT(CASE WHEN gd.total_score >= 400 THEN 1 END) as excellent_count,
      COUNT(CASE WHEN gd.total_score >= 300 THEN 1 END) as pass_count,

      -- 性别统计
      COUNT(CASE WHEN sd.gender = '男' THEN 1 END) as male_count,
      COUNT(CASE WHEN sd.gender = '女' THEN 1 END) as female_count,
      COUNT(CASE WHEN sd.gender NOT IN ('男', '女') OR sd.gender IS NULL THEN 1 END) as other_count,

      -- 科目统计
      AVG(gd.chinese_score) as avg_chinese,
      AVG(gd.math_score) as avg_math,
      AVG(gd.english_score) as avg_english,
      AVG(gd.physics_score) as avg_physics,
      AVG(gd.chemistry_score) as avg_chemistry,

      COUNT(CASE WHEN gd.chinese_score >= 85 THEN 1 END) as chinese_excellent,
      COUNT(CASE WHEN gd.chinese_score >= 60 THEN 1 END) as chinese_pass,
      COUNT(CASE WHEN gd.math_score >= 85 THEN 1 END) as math_excellent,
      COUNT(CASE WHEN gd.math_score >= 60 THEN 1 END) as math_pass,
      COUNT(CASE WHEN gd.english_score >= 85 THEN 1 END) as english_excellent,
      COUNT(CASE WHEN gd.english_score >= 60 THEN 1 END) as english_pass
    FROM student_data sd
    LEFT JOIN grade_data gd ON sd.student_id = gd.student_id
  )
  SELECT
    sc.calc_class_name,
    sc.total_students,
    ROUND(COALESCE(sc.avg_score, 0), 1),
    ROUND(COALESCE((sc.excellent_count::NUMERIC / GREATEST(sc.total_grades, 1)) * 100, 0), 1) as excellent_rate,
    ROUND(COALESCE((sc.pass_count::NUMERIC / GREATEST(sc.total_grades, 1)) * 100, 0), 1) as pass_rate,

    -- 性别分布JSON
    jsonb_build_object(
      'male', sc.male_count,
      'female', sc.female_count,
      'other', sc.other_count
    ) as gender_stats,

    -- 科目统计JSON
    jsonb_build_array(
      jsonb_build_object('name', '语文', 'averageScore', ROUND(COALESCE(sc.avg_chinese, 0), 1), 'excellentCount', sc.chinese_excellent, 'passingCount', sc.chinese_pass),
      jsonb_build_object('name', '数学', 'averageScore', ROUND(COALESCE(sc.avg_math, 0), 1), 'excellentCount', sc.math_excellent, 'passingCount', sc.math_pass),
      jsonb_build_object('name', '英语', 'averageScore', ROUND(COALESCE(sc.avg_english, 0), 1), 'excellentCount', sc.english_excellent, 'passingCount', sc.english_pass),
      jsonb_build_object('name', '物理', 'averageScore', ROUND(COALESCE(sc.avg_physics, 0), 1), 'excellentCount', 0, 'passingCount', 0),
      jsonb_build_object('name', '化学', 'averageScore', ROUND(COALESCE(sc.avg_chemistry, 0), 1), 'excellentCount', 0, 'passingCount', 0)
    ) as subject_stats,

    sc.total_grades
  FROM stats_calculation sc;
END;
$$;

-- 5. 学生表现统计函数
CREATE OR REPLACE FUNCTION get_student_performance_stats(input_student_id TEXT)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  class_name TEXT,
  total_exams BIGINT,
  avg_score NUMERIC,
  best_score NUMERIC,
  latest_score NUMERIC,
  score_trend TEXT,
  subject_performance JSONB,
  class_ranking BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_info AS (
    SELECT s.student_id, s.name, s.class_name
    FROM students s
    WHERE s.student_id = input_student_id
  ),
  student_grades AS (
    SELECT
      gd.*,
      ROW_NUMBER() OVER (ORDER BY gd.created_at DESC) as exam_order
    FROM grade_data_new gd
    WHERE gd.student_id = input_student_id
      AND gd.total_score IS NOT NULL
  ),
  performance_stats AS (
    SELECT
      COUNT(*) as exam_count,
      AVG(total_score) as average_score,
      MAX(total_score) as best_total_score,
      (SELECT total_score FROM student_grades WHERE exam_order = 1) as latest_total_score,

      -- 科目表现
      AVG(chinese_score) as avg_chinese,
      AVG(math_score) as avg_math,
      AVG(english_score) as avg_english,
      AVG(physics_score) as avg_physics,
      AVG(chemistry_score) as avg_chemistry
    FROM student_grades
  ),
  class_ranking_calc AS (
    SELECT
      COUNT(*) + 1 as student_rank
    FROM grade_data_new gd2
    JOIN student_info si ON si.class_name = gd2.class_name
    WHERE gd2.total_score > (
      SELECT AVG(total_score)
      FROM student_grades
      WHERE total_score IS NOT NULL
    )
  )
  SELECT
    si.student_id,
    si.name as student_name,
    si.class_name,
    ps.exam_count as total_exams,
    ROUND(COALESCE(ps.average_score, 0), 1) as avg_score,
    COALESCE(ps.best_total_score, 0) as best_score,
    COALESCE(ps.latest_total_score, 0) as latest_score,

    -- 简单的趋势判断
    CASE
      WHEN ps.latest_total_score > ps.average_score THEN 'improving'::TEXT
      WHEN ps.latest_total_score < ps.average_score THEN 'declining'::TEXT
      ELSE 'stable'::TEXT
    END as score_trend,

    -- 科目表现JSON
    jsonb_build_array(
      jsonb_build_object('subject', '语文', 'average', ROUND(COALESCE(ps.avg_chinese, 0), 1)),
      jsonb_build_object('subject', '数学', 'average', ROUND(COALESCE(ps.avg_math, 0), 1)),
      jsonb_build_object('subject', '英语', 'average', ROUND(COALESCE(ps.avg_english, 0), 1)),
      jsonb_build_object('subject', '物理', 'average', ROUND(COALESCE(ps.avg_physics, 0), 1)),
      jsonb_build_object('subject', '化学', 'average', ROUND(COALESCE(ps.avg_chemistry, 0), 1))
    ) as subject_performance,

    COALESCE(crc.student_rank, 999) as class_ranking
  FROM student_info si
  CROSS JOIN performance_stats ps
  LEFT JOIN class_ranking_calc crc ON true;
END;
$$;

-- 6. 预警统计计算函数
CREATE OR REPLACE FUNCTION calculate_warning_statistics()
RETURNS TABLE (
  total_warnings BIGINT,
  active_warnings BIGINT,
  resolved_warnings BIGINT,
  high_risk_students BIGINT,
  warning_trends JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH warning_stats AS (
    SELECT
      COUNT(*) as total_count,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
      COUNT(CASE WHEN status = 'active' AND (details->>'severity')::TEXT = 'high' THEN 1 END) as high_risk_count
    FROM warning_records
    WHERE created_at >= NOW() - INTERVAL '90 days'
  ),
  weekly_trends AS (
    SELECT
      DATE_TRUNC('week', created_at) as week_start,
      COUNT(*) as week_count
    FROM warning_records
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week_start
  )
  SELECT
    ws.total_count,
    ws.active_count,
    ws.resolved_count,
    ws.high_risk_count,

    -- 趋势数据JSON
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'week', TO_CHAR(week_start, 'YYYY-MM-DD'),
            'count', week_count
          )
        )
        FROM weekly_trends
      ),
      '[]'::jsonb
    ) as warning_trends
  FROM warning_stats ws;
END;
$$;

-- 为函数添加权限
GRANT EXECUTE ON FUNCTION get_warnings_by_type() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_risk_by_class() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_common_risk_factors() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_class_portrait_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_student_performance_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_warning_statistics() TO anon, authenticated;

-- 添加函数注释
COMMENT ON FUNCTION get_warnings_by_type() IS '获取预警类型分布统计';
COMMENT ON FUNCTION get_risk_by_class() IS '获取班级风险分布统计';
COMMENT ON FUNCTION get_common_risk_factors() IS '获取常见风险因素统计';
COMMENT ON FUNCTION get_class_portrait_stats(TEXT) IS '获取班级画像统计数据';
COMMENT ON FUNCTION get_student_performance_stats(TEXT) IS '获取学生表现统计数据';
COMMENT ON FUNCTION calculate_warning_statistics() IS '计算预警系统总体统计';

RAISE NOTICE '✅ 所有缺失的核心存储过程已创建完成';