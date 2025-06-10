-- 为grade_data表添加等级字段
DO $$
DECLARE
  columns_to_add TEXT[] := ARRAY[
    '总分等级',
    '语文等级', 
    '数学等级',
    '英语等级',
    '物理等级',
    '化学等级',
    '道法等级',
    '历史等级'
  ];
  col TEXT;
  column_exists BOOLEAN;
BEGIN
  FOREACH col IN ARRAY columns_to_add
  LOOP
    -- 检查字段是否已存在
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = col
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE 'Adding column % to grade_data table', col;
      EXECUTE format('ALTER TABLE grade_data ADD COLUMN %I TEXT', col);
      EXECUTE format('COMMENT ON COLUMN grade_data.%I IS ''%s等级字段，从CSV导入''', col, col);
    ELSE
      RAISE NOTICE 'Column % already exists in grade_data table', col;
    END IF;
  END LOOP;
END $$; 