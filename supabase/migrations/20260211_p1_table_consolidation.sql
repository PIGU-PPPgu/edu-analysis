-- ============================================
-- P1级表整合优化脚本
-- 目标: 整合重复表,避免数据分散
-- 执行前务必备份数据库
-- 执行方式: 分步执行,每步验证
-- 创建时间: 2026-02-11
-- ============================================

-- ============================================
-- 阶段1: 知识点表合并
-- ============================================

BEGIN;

-- 1.1 检查数据分布
DO $$
DECLARE
  skm_count INTEGER;
  skp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO skm_count FROM student_knowledge_mastery;
  SELECT COUNT(*) INTO skp_count FROM submission_knowledge_points;

  RAISE NOTICE 'student_knowledge_mastery记录数: %', skm_count;
  RAISE NOTICE 'submission_knowledge_points记录数: %', skp_count;
END $$;

-- 1.2 迁移submission_knowledge_points数据到主表
INSERT INTO student_knowledge_mastery (
  student_id,
  knowledge_point_id,
  homework_id,
  submission_id,
  mastery_level,
  mastery_grade,
  assessment_count,
  comments
)
SELECT
  hs.student_id,
  skp.knowledge_point_id,
  hs.homework_id,
  skp.submission_id,
  skp.mastery_level,
  skp.mastery_grade,
  1 AS assessment_count,
  NULL AS comments
FROM submission_knowledge_points skp
JOIN homework_submissions hs ON hs.id = skp.submission_id
WHERE NOT EXISTS (
  SELECT 1 FROM student_knowledge_mastery skm
  WHERE skm.submission_id = skp.submission_id
    AND skm.knowledge_point_id = skp.knowledge_point_id
)
ON CONFLICT (student_id, knowledge_point_id, homework_id) DO NOTHING;

-- 1.3 验证迁移
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM student_knowledge_mastery skm
  WHERE EXISTS (
    SELECT 1 FROM submission_knowledge_points skp
    WHERE skp.submission_id = skm.submission_id
      AND skp.knowledge_point_id = skm.knowledge_point_id
  );

  RAISE NOTICE '已迁移记录数: %', migrated_count;
END $$;

-- 1.4 备份并删除旧表(确认迁移成功后执行)
-- CREATE TABLE submission_knowledge_points_backup AS SELECT * FROM submission_knowledge_points;
-- DROP TABLE IF EXISTS submission_knowledge_points CASCADE;

COMMIT;

-- ============================================
-- 阶段2: grades表视图化改造
-- ============================================

BEGIN;

-- 2.1 检查grades表依赖
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'grades';

-- 2.2 备份grades表数据
CREATE TABLE IF NOT EXISTS grades_backup AS SELECT * FROM grades;

-- 2.3 删除grades表(如果无外键依赖)
-- DROP TABLE IF EXISTS grades CASCADE;

-- 2.4 创建grades视图(提供向后兼容)
CREATE OR REPLACE VIEW grades AS
SELECT
  gen_random_uuid() AS id,
  student_id AS student_id,
  'chinese' AS subject,
  chinese_score AS score,
  exam_date,
  exam_type,
  exam_title,
  chinese_rank_in_class AS rank_in_class,
  chinese_rank_in_grade AS rank_in_grade,
  chinese_grade AS grade_level,
  created_at
FROM grade_data WHERE chinese_score IS NOT NULL
UNION ALL
SELECT
  gen_random_uuid() AS id,
  student_id AS student_id,
  'math' AS subject,
  math_score AS score,
  exam_date,
  exam_type,
  exam_title,
  math_rank_in_class AS rank_in_class,
  math_rank_in_grade AS rank_in_grade,
  math_grade AS grade_level,
  created_at
FROM grade_data WHERE math_score IS NOT NULL
UNION ALL
SELECT
  gen_random_uuid() AS id,
  student_id AS student_id,
  'english' AS subject,
  english_score AS score,
  exam_date,
  exam_type,
  exam_title,
  english_rank_in_class AS rank_in_class,
  english_rank_in_grade AS rank_in_grade,
  english_grade AS grade_level,
  created_at
FROM grade_data WHERE english_score IS NOT NULL
UNION ALL
SELECT
  gen_random_uuid() AS id,
  student_id AS student_id,
  'physics' AS subject,
  physics_score AS score,
  exam_date,
  exam_type,
  exam_title,
  physics_rank_in_class AS rank_in_class,
  physics_rank_in_grade AS rank_in_grade,
  physics_grade AS grade_level,
  created_at
FROM grade_data WHERE physics_score IS NOT NULL
UNION ALL
SELECT
  gen_random_uuid() AS id,
  student_id AS student_id,
  'chemistry' AS subject,
  chemistry_score AS score,
  exam_date,
  exam_type,
  exam_title,
  chemistry_rank_in_class AS rank_in_class,
  chemistry_rank_in_grade AS rank_in_grade,
  chemistry_grade AS grade_level,
  created_at
FROM grade_data WHERE chemistry_score IS NOT NULL;

-- 2.5 添加视图注释
COMMENT ON VIEW grades IS '成绩视图(兼容层),将grade_data宽表转换为单科目格式';

COMMIT;

-- ============================================
-- 阶段3: classes表整合到class_info
-- ============================================

BEGIN;

-- 3.1 检查classes表依赖
DO $$
DECLARE
  dep_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dep_count
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'classes';

  IF dep_count > 0 THEN
    RAISE NOTICE '⚠️  classes表仍有%个外键依赖,需要先迁移', dep_count;
  ELSE
    RAISE NOTICE '✅ classes表无外键依赖,可以安全删除';
  END IF;
END $$;

-- 3.2 迁移classes数据到class_info(如果尚未迁移)
INSERT INTO class_info (class_name, grade_level, academic_year)
SELECT
  name AS class_name,
  grade AS grade_level,
  COALESCE(academic_year, '2024-2025') AS academic_year
FROM classes
WHERE NOT EXISTS (
  SELECT 1 FROM class_info WHERE class_name = classes.name
)
ON CONFLICT (class_name) DO NOTHING;

-- 3.3 验证迁移结果
DO $$
DECLARE
  classes_count INTEGER;
  class_info_count INTEGER;
  matched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO classes_count FROM classes;
  SELECT COUNT(*) INTO class_info_count FROM class_info;
  SELECT COUNT(*) INTO matched_count
  FROM classes c
  JOIN class_info ci ON ci.class_name = c.name;

  RAISE NOTICE 'classes表记录数: %', classes_count;
  RAISE NOTICE 'class_info表记录数: %', class_info_count;
  RAISE NOTICE '匹配记录数: %', matched_count;

  IF matched_count = classes_count THEN
    RAISE NOTICE '✅ 所有classes数据已存在于class_info';
  ELSE
    RAISE WARNING '⚠️  存在未匹配的记录';
  END IF;
END $$;

-- 3.4 备份并删除classes表(确认无依赖后执行)
-- CREATE TABLE classes_backup AS SELECT * FROM classes;
-- DROP TABLE IF EXISTS classes CASCADE;

COMMIT;

-- ============================================
-- 验证整合结果
-- ============================================

-- 检查表是否存在
SELECT
  table_name,
  table_type,
  CASE
    WHEN table_type = 'VIEW' THEN '✅ 已转为视图'
    WHEN table_type = 'BASE TABLE' THEN '📊 物理表'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('grades', 'classes', 'class_info', 'student_knowledge_mastery', 'submission_knowledge_points')
ORDER BY table_name;

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ P1级表整合完成!';
  RAISE NOTICE '📋 知识点表已合并';
  RAISE NOTICE '👁️  grades已转为视图';
  RAISE NOTICE '📊 class_info已整合classes数据';
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  请在生产环境执行前:';
  RAISE NOTICE '   1. 验证应用程序兼容性';
  RAISE NOTICE '   2. 创建完整数据库备份';
  RAISE NOTICE '   3. 在测试环境完整测试';
END $$;
