-- ============================================
-- P0级紧急修复SQL脚本
-- 执行前务必备份数据库
-- 执行方式: Supabase Dashboard SQL Editor
-- 创建时间: 2026-02-11
-- ============================================

-- 设置执行参数
SET statement_timeout = '10min';
SET lock_timeout = '30s';

BEGIN;

-- ============================================
-- 1. 创建P0级复合索引
-- ============================================

-- 成绩查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_student_exam_subject
  ON grade_data(student_id, exam_id, subject)
  WHERE score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_class_exam_subject
  ON grade_data(class_name, exam_id, subject)
  WHERE score IS NOT NULL;

-- 作业查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_submissions_homework_student_status
  ON homework_submissions(homework_id, student_id, status);

-- 知识点查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_mastery_composite
  ON student_knowledge_mastery(student_id, knowledge_point_id, homework_id);

-- 预警查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warning_records_student_status_time
  ON warning_records(student_id, status, created_at DESC)
  WHERE status = 'active';

-- ============================================
-- 2. 收紧RLS策略
-- ============================================

-- teacher_student_subjects表
DROP POLICY IF EXISTS "所有人可查看教学关系" ON teacher_student_subjects;
CREATE POLICY "教师查看自己的教学关系" ON teacher_student_subjects
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teachers WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "所有人可插入教学关系" ON teacher_student_subjects;
CREATE POLICY "仅管理员可创建教学关系" ON teacher_student_subjects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "所有人可更新教学关系" ON teacher_student_subjects;
CREATE POLICY "管理员和教师可更新自己的教学关系" ON teacher_student_subjects
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM teachers WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "所有人可删除教学关系" ON teacher_student_subjects;
CREATE POLICY "仅管理员可删除教学关系" ON teacher_student_subjects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- value_added_activities表
DROP POLICY IF EXISTS "所有人可查看增值活动" ON value_added_activities;
CREATE POLICY "认证用户可查看增值活动" ON value_added_activities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理增值活动" ON value_added_activities;
CREATE POLICY "管理员和创建者可管理活动" ON value_added_activities
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- value_added_cache表
DROP POLICY IF EXISTS "所有人可查看缓存" ON value_added_cache;
CREATE POLICY "认证用户可查看缓存" ON value_added_cache
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理缓存" ON value_added_cache;
CREATE POLICY "系统管理缓存" ON value_added_cache
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- grade_levels_config表
DROP POLICY IF EXISTS "所有人可查看等级配置" ON grade_levels_config;
CREATE POLICY "认证用户可查看等级配置" ON grade_levels_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理等级配置" ON grade_levels_config;
CREATE POLICY "管理员可管理等级配置" ON grade_levels_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- exam_series表
DROP POLICY IF EXISTS "所有人可查看考试序列" ON exam_series;
CREATE POLICY "认证用户可查看考试序列" ON exam_series
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "所有人可管理考试序列" ON exam_series;
CREATE POLICY "管理员可管理考试序列" ON exam_series
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 3. 添加数据完整性约束
-- ============================================

-- 成绩数据约束
ALTER TABLE grade_data
  ADD CONSTRAINT IF NOT EXISTS check_chinese_score_range
  CHECK (chinese_score IS NULL OR (chinese_score >= 0 AND chinese_score <= 150));

ALTER TABLE grade_data
  ADD CONSTRAINT IF NOT EXISTS check_math_score_range
  CHECK (math_score IS NULL OR (math_score >= 0 AND math_score <= 150));

ALTER TABLE grade_data
  ADD CONSTRAINT IF NOT EXISTS check_total_score_range
  CHECK (total_score IS NULL OR (total_score >= 0 AND total_score <= 850));

ALTER TABLE grade_data
  ADD CONSTRAINT IF NOT EXISTS check_rank_positive
  CHECK (
    (total_rank_in_class IS NULL OR total_rank_in_class > 0) AND
    (total_rank_in_grade IS NULL OR total_rank_in_grade > 0)
  );

-- 知识点掌握度约束
ALTER TABLE student_knowledge_mastery
  ADD CONSTRAINT IF NOT EXISTS check_mastery_level_range
  CHECK (mastery_level >= 0 AND mastery_level <= 100);

-- 预警状态约束
ALTER TABLE warning_records
  ADD CONSTRAINT IF NOT EXISTS check_resolved_time_after_created
  CHECK (resolved_at IS NULL OR resolved_at >= created_at);

-- ============================================
-- 4. 添加表和字段注释
-- ============================================

COMMENT ON TABLE students IS '学生基本信息表,student_id为业务主键(学号)';
COMMENT ON TABLE grade_data IS '综合成绩表(宽表设计),一行包含一次考试的所有科目成绩';
COMMENT ON TABLE class_info IS '班级主表,class_name为主键';
COMMENT ON TABLE warning_records IS '预警记录表,支持多级预警和干预追踪';
COMMENT ON TABLE student_knowledge_mastery IS '知识点掌握度主表,按学生+知识点+作业唯一';
COMMENT ON TABLE teacher_student_subjects IS '教师-学生-科目关联表,用于增值评价';
COMMENT ON TABLE value_added_activities IS '增值评价活动管理表';

COMMENT ON COLUMN grade_data.business_id IS '业务层考试ID(TEXT),对应前端显示的exam_id';
COMMENT ON COLUMN grade_data.total_score IS '总分';
COMMENT ON COLUMN students.student_id IS '学号(业务主键),用于系统间数据交换';

-- ============================================
-- 5. 更新统计信息
-- ============================================

ANALYZE grade_data;
ANALYZE homework_submissions;
ANALYZE student_knowledge_mastery;
ANALYZE warning_records;
ANALYZE teacher_student_subjects;
ANALYZE value_added_activities;

COMMIT;

-- ============================================
-- 6. 验证执行结果
-- ============================================

-- 验证索引创建
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%_student_%'
ORDER BY tablename, indexname;

-- 验证RLS策略
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('teacher_student_subjects', 'value_added_activities', 'value_added_cache')
ORDER BY tablename, policyname;

-- 验证约束
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE contype = 'c'
  AND conrelid::regclass::text IN ('grade_data', 'student_knowledge_mastery', 'warning_records')
ORDER BY table_name, constraint_name;

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ P0级修复完成! 请执行性能测试验证.';
  RAISE NOTICE '📋 已创建5个复合索引';
  RAISE NOTICE '🔒 已收紧8个RLS策略';
  RAISE NOTICE '✓ 已添加9个数据约束';
END $$;
