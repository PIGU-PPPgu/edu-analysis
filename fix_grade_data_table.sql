
    DO $$
    DECLARE
      column_exists BOOLEAN;
    BEGIN
      -- 检查exam_scope字段是否存在
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'grade_data' 
        AND column_name = 'exam_scope'
      ) INTO column_exists;
      
      IF NOT column_exists THEN
        RAISE NOTICE 'Adding exam_scope column to grade_data table';
        ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class';
        COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
      END IF;
    END $$;
    