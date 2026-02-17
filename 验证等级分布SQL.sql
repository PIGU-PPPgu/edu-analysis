-- ============================================
-- 等级分布验证SQL
-- 用于检查数据库中的等级是否按照正确标准计算
-- ============================================

-- 正确标准：
-- A+: 前5%
-- A: 5-25%
-- B+: 25-50%
-- B: 50-75%
-- C+: 75-95%
-- C: 95-100%

-- ============================================
-- 查询1: 检查grade_data表的语文等级分布
-- ============================================
-- 替换 'YOUR_EXAM_ID' 为你的最新考试ID

SELECT
  chinese_grade as 等级,
  COUNT(*) as 学生数,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as 占比百分比
FROM grade_data
WHERE exam_id = 'YOUR_EXAM_ID'
  AND chinese_grade IS NOT NULL
  AND chinese_absent IS NOT true  -- 排除缺考
GROUP BY chinese_grade
ORDER BY
  CASE chinese_grade
    WHEN 'A+' THEN 1
    WHEN 'A' THEN 2
    WHEN 'B+' THEN 3
    WHEN 'B' THEN 4
    WHEN 'C+' THEN 5
    WHEN 'C' THEN 6
    ELSE 7
  END;

-- 期望结果（如果逻辑正确）：
-- A+: ~5%
-- A: ~20%
-- B+: ~25%
-- B: ~25%
-- C+: ~20%
-- C: ~5%

-- ============================================
-- 查询2: 检查所有科目的等级分布
-- ============================================
WITH grade_distribution AS (
  SELECT '语文' as 科目, chinese_grade as 等级 FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND chinese_grade IS NOT NULL AND chinese_absent IS NOT true
  UNION ALL
  SELECT '数学', math_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND math_grade IS NOT NULL AND math_absent IS NOT true
  UNION ALL
  SELECT '英语', english_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND english_grade IS NOT NULL AND english_absent IS NOT true
  UNION ALL
  SELECT '物理', physics_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND physics_grade IS NOT NULL AND physics_absent IS NOT true
  UNION ALL
  SELECT '化学', chemistry_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND chemistry_grade IS NOT NULL AND chemistry_absent IS NOT true
  UNION ALL
  SELECT '生物', biology_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND biology_grade IS NOT NULL AND biology_absent IS NOT true
  UNION ALL
  SELECT '历史', history_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND history_grade IS NOT NULL AND history_absent IS NOT true
  UNION ALL
  SELECT '地理', geography_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND geography_grade IS NOT NULL AND geography_absent IS NOT true
  UNION ALL
  SELECT '政治', politics_grade FROM grade_data
    WHERE exam_id = 'YOUR_EXAM_ID' AND politics_grade IS NOT NULL AND politics_absent IS NOT true
)
SELECT
  科目,
  等级,
  COUNT(*) as 学生数,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(PARTITION BY 科目), 2) as 占比百分比
FROM grade_distribution
WHERE 等级 IS NOT NULL
GROUP BY 科目, 等级
ORDER BY
  科目,
  CASE 等级
    WHEN 'A+' THEN 1
    WHEN 'A' THEN 2
    WHEN 'B+' THEN 3
    WHEN 'B' THEN 4
    WHEN 'C+' THEN 5
    WHEN 'C' THEN 6
    ELSE 7
  END;

-- ============================================
-- 查询3: 检查value_added_cache中的入口/出口等级
-- ============================================
-- 检查增值计算中的等级分布

SELECT
  dimension,
  (result->>'entry_grade')::TEXT as 入口等级,
  (result->>'exit_grade')::TEXT as 出口等级,
  COUNT(*) as 记录数
FROM value_added_cache
WHERE activity_id = 'YOUR_ACTIVITY_ID'
  AND dimension = 'student'
  AND (result->>'entry_grade') IS NOT NULL
  AND (result->>'exit_grade') IS NOT NULL
GROUP BY dimension, 入口等级, 出口等级
ORDER BY 入口等级, 出口等级;

-- ============================================
-- 查询4: 快速检查 - A+ 是否接近5%
-- ============================================
SELECT
  '语文' as 科目,
  SUM(CASE WHEN chinese_grade = 'A+' THEN 1 ELSE 0 END) as A_plus_count,
  COUNT(*) as total_count,
  ROUND(SUM(CASE WHEN chinese_grade = 'A+' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as A_plus_percentage
FROM grade_data
WHERE exam_id = 'YOUR_EXAM_ID'
  AND chinese_grade IS NOT NULL
  AND chinese_absent IS NOT true;

-- 如果结果接近5%，说明使用了正确的等级标准
-- 如果结果接近10%，说明使用了错误的旧标准，需要重新计算

-- ============================================
-- 使用说明：
-- 1. 将所有 'YOUR_EXAM_ID' 替换为实际的考试ID
-- 2. 将 'YOUR_ACTIVITY_ID' 替换为实际的增值活动ID
-- 3. 依次执行查询1-4
-- 4. 检查各等级占比是否符合预期标准
-- ============================================
