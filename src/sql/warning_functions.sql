-- 创建获取预警类型统计的存储过程
CREATE OR REPLACE FUNCTION get_warning_types_summary()
RETURNS TABLE (
  warning_type TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_warnings BIGINT;
BEGIN
  -- 获取总预警数
  SELECT COUNT(*) INTO total_warnings FROM public.warning_records WHERE status = 'active';
  
  -- 返回各类型的统计
  RETURN QUERY
  SELECT 
    details->>'type' AS warning_type,
    COUNT(*) AS count,
    ROUND((COUNT(*) * 100.0 / total_warnings), 1) AS percentage
  FROM public.warning_records
  WHERE status = 'active'
  GROUP BY details->>'type'
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建获取班级预警统计的存储过程
CREATE OR REPLACE FUNCTION get_warning_by_class()
RETURNS TABLE (
  class_name TEXT,
  total_students BIGINT,
  at_risk_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH class_counts AS (
    SELECT 
      c.class_name,
      COUNT(DISTINCT s.student_id) AS total_students
    FROM 
      public.class_info c
      LEFT JOIN public.students s ON c.class_name = s.class_name
    GROUP BY c.class_name
  ),
  risk_counts AS (
    SELECT 
      s.class_name,
      COUNT(DISTINCT w.student_id) AS at_risk
    FROM 
      public.warning_records w
      JOIN public.students s ON w.student_id = s.student_id
    WHERE 
      w.status = 'active'
    GROUP BY s.class_name
  )
  SELECT 
    cc.class_name,
    cc.total_students,
    COALESCE(rc.at_risk, 0) AS at_risk_count
  FROM 
    class_counts cc
    LEFT JOIN risk_counts rc ON cc.class_name = rc.class_name
  ORDER BY at_risk_count DESC, cc.class_name;
END;
$$ LANGUAGE plpgsql;

-- 创建获取风险因素统计的存储过程
CREATE OR REPLACE FUNCTION get_risk_factors_summary()
RETURNS TABLE (
  risk_factor TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_factors BIGINT;
BEGIN
  -- 获取风险因素总数量（每条预警记录可能有多个因素）
  SELECT COUNT(*) INTO total_factors 
  FROM public.warning_records w, 
       jsonb_array_elements_text(w.details->'factors') AS factor
  WHERE w.status = 'active';
  
  -- 返回各因素的统计
  RETURN QUERY
  SELECT 
    factor::TEXT AS risk_factor,
    COUNT(*) AS count,
    ROUND((COUNT(*) * 100.0 / total_factors), 1) AS percentage
  FROM 
    public.warning_records w,
    jsonb_array_elements_text(w.details->'factors') AS factor
  WHERE 
    w.status = 'active'
  GROUP BY factor
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建按学生分组的预警统计
CREATE OR REPLACE FUNCTION get_warning_count_by_student()
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  class_name TEXT,
  warning_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.student_id,
    s.name AS student_name,
    s.class_name,
    COUNT(w.id) AS warning_count
  FROM 
    public.students s
    LEFT JOIN public.warning_records w ON s.student_id = w.student_id
  WHERE 
    w.status = 'active' OR w.status IS NULL
  GROUP BY s.student_id, s.name, s.class_name
  ORDER BY warning_count DESC, s.name;
END;
$$ LANGUAGE plpgsql;

-- 检查表是否存在的函数
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT) 
RETURNS TABLE (exists BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = table_name AND schemaname = 'public'
  );
END;
$$ LANGUAGE plpgsql; 