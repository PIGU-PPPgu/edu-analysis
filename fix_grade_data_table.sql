-- 修复grade_data表结构，添加exam_scope字段
DO $$ DECLARE column_exists BOOLEAN; BEGIN
  SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grade_data' AND column_name = 'exam_scope') INTO column_exists;
