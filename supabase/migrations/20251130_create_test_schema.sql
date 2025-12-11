-- 🧪 创建测试数据隔离schema
-- 目的: 将测试数据与生产数据完全隔离，避免数据污染
-- 创建时间: 2024-11-30

-- ====================================
-- 1. 创建test_schema并授权
-- ====================================

CREATE SCHEMA IF NOT EXISTS test_schema;

-- 授权anon和authenticated角色访问test_schema
GRANT USAGE ON SCHEMA test_schema TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA test_schema TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA test_schema TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA test_schema TO anon, authenticated;

-- 设置默认权限（未来在test_schema中创建的表也自动授权）
ALTER DEFAULT PRIVILEGES IN SCHEMA test_schema
  GRANT ALL ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA test_schema
  GRANT ALL ON SEQUENCES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA test_schema
  GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- ====================================
-- 2. 复制核心表结构到test_schema
-- ====================================

-- 学生表
CREATE TABLE IF NOT EXISTS test_schema.students (
  LIKE public.students INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 考试表
CREATE TABLE IF NOT EXISTS test_schema.exams (
  LIKE public.exams INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 成绩数据表（主表）
CREATE TABLE IF NOT EXISTS test_schema.grade_data_new (
  LIKE public.grade_data_new INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 成绩表（兼容表）
CREATE TABLE IF NOT EXISTS test_schema.grades (
  LIKE public.grades INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 班级信息表
CREATE TABLE IF NOT EXISTS test_schema.class_info (
  LIKE public.class_info INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 作业表
CREATE TABLE IF NOT EXISTS test_schema.homework (
  LIKE public.homework INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 作业提交表
CREATE TABLE IF NOT EXISTS test_schema.homework_submissions (
  LIKE public.homework_submissions INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 知识点表
CREATE TABLE IF NOT EXISTS test_schema.knowledge_points (
  LIKE public.knowledge_points INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 学生知识点掌握度表
CREATE TABLE IF NOT EXISTS test_schema.student_knowledge_mastery (
  LIKE public.student_knowledge_mastery INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 预警记录表
CREATE TABLE IF NOT EXISTS test_schema.warning_records (
  LIKE public.warning_records INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- 预警规则表
CREATE TABLE IF NOT EXISTS test_schema.warning_rules (
  LIKE public.warning_rules INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
);

-- ====================================
-- 3. 为test_schema设置宽松的RLS策略
-- ====================================

-- 注意: 测试环境使用宽松策略，生产环境保持严格策略

-- 学生表 - 允许所有操作
ALTER TABLE test_schema.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_students_select" ON test_schema.students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "test_students_insert" ON test_schema.students
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "test_students_update" ON test_schema.students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "test_students_delete" ON test_schema.students
  FOR DELETE TO authenticated USING (true);

-- 考试表 - 允许所有操作
ALTER TABLE test_schema.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_exams_all" ON test_schema.exams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 成绩数据表 - 允许所有操作
ALTER TABLE test_schema.grade_data_new ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_grade_data_all" ON test_schema.grade_data_new
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 成绩表 - 允许所有操作
ALTER TABLE test_schema.grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_grades_all" ON test_schema.grades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 班级信息表 - 允许所有操作
ALTER TABLE test_schema.class_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_class_info_all" ON test_schema.class_info
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 作业表 - 允许所有操作
ALTER TABLE test_schema.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_homework_all" ON test_schema.homework
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 作业提交表 - 允许所有操作
ALTER TABLE test_schema.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_homework_submissions_all" ON test_schema.homework_submissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 知识点表 - 允许所有操作
ALTER TABLE test_schema.knowledge_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_knowledge_points_all" ON test_schema.knowledge_points
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 学生知识点掌握度表 - 允许所有操作
ALTER TABLE test_schema.student_knowledge_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_student_knowledge_mastery_all" ON test_schema.student_knowledge_mastery
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 预警记录表 - 允许所有操作
ALTER TABLE test_schema.warning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_warning_records_all" ON test_schema.warning_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 预警规则表 - 允许所有操作
ALTER TABLE test_schema.warning_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_warning_rules_all" ON test_schema.warning_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- 4. 验证创建结果
-- ====================================

-- 输出创建的表列表（仅供参考，执行时可能不会显示）
DO $$
BEGIN
  RAISE NOTICE '✅ test_schema创建完成';
  RAISE NOTICE '📋 已创建以下测试表:';
  RAISE NOTICE '  - students';
  RAISE NOTICE '  - exams';
  RAISE NOTICE '  - grade_data_new';
  RAISE NOTICE '  - grades';
  RAISE NOTICE '  - class_info';
  RAISE NOTICE '  - homework';
  RAISE NOTICE '  - homework_submissions';
  RAISE NOTICE '  - knowledge_points';
  RAISE NOTICE '  - student_knowledge_mastery';
  RAISE NOTICE '  - warning_records';
  RAISE NOTICE '  - warning_rules';
  RAISE NOTICE '🔓 所有表已启用RLS并设置宽松策略（仅用于测试）';
END $$;
