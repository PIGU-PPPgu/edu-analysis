-- ============================================
-- 从 grade_data 填充 students 和 exams 表
-- 目的：解决应用显示"数据丢失"的问题
-- 原因：grade_data表使用TEXT字段存储学生/考试信息，
--       但应用依赖students和exams表查询数据
-- ============================================

-- 1. 从 grade_data 提取唯一学生并插入 students 表
-- 使用DISTINCT ON避免重复student_id导致的冲突
INSERT INTO public.students (student_id, name, class_name)
SELECT student_id, name, class_name
FROM (
  SELECT DISTINCT ON (student_id)
    student_id,
    name,
    class_name
  FROM public.grade_data
  WHERE student_id IS NOT NULL AND student_id != ''
  ORDER BY student_id, created_at DESC
) AS unique_students
ON CONFLICT (student_id) DO UPDATE SET
  name = EXCLUDED.name,
  class_name = EXCLUDED.class_name;

-- 2. 从 grade_data 提取唯一考试并插入 exams 表
-- 注意：exams表列名为title, type, date (NOT exam_title, exam_type, exam_date)
INSERT INTO public.exams (title, type, date)
SELECT DISTINCT
  exam_title,
  COALESCE(exam_type, '未分类'),  -- 默认值，避免NULL
  COALESCE(exam_date, CURRENT_DATE)  -- 默认值，避免NULL
FROM public.grade_data
WHERE exam_title IS NOT NULL AND exam_title != ''
ON CONFLICT (title, date, type) DO NOTHING;

-- 3. 显示结果
DO $$
DECLARE
  student_count INTEGER;
  exam_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO student_count FROM public.students;
  SELECT COUNT(*) INTO exam_count FROM public.exams;

  RAISE NOTICE '✅ 数据填充完成！';
  RAISE NOTICE '👥 Students 表: % 条记录', student_count;
  RAISE NOTICE '📝 Exams 表: % 条记录', exam_count;
END $$;

SELECT '✅ Students and exams populated from grade_data!' as status;
