-- 添加获取考试相关班级名称的函数
CREATE OR REPLACE FUNCTION public.get_distinct_class_names(p_exam_id UUID)
RETURNS TABLE(class_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT g.class_name
  FROM grade_data g
  WHERE g.exam_id = p_exam_id
  AND g.class_name IS NOT NULL
  ORDER BY g.class_name;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION public.get_distinct_class_names(uuid) IS '根据考试ID获取所有相关的班级名称'; 