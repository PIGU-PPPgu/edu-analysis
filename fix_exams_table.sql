-- 修复exams表结构
DO $$ DECLARE column_exists BOOLEAN; BEGIN
  SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'scope') INTO column_exists;
  IF NOT column_exists THEN RAISE NOTICE 'Adding scope column to exams table'; ALTER TABLE exams ADD COLUMN scope TEXT DEFAULT 'class' NOT NULL;
  COMMENT ON COLUMN exams.scope IS '考试范围，可以是班级(class)或年级(grade)级别';
  END IF; END $$;
