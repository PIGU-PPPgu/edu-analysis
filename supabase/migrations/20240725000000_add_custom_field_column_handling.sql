-- 确保自定义字段可以正确保存到grade_data表
-- 创建用于处理自定义字段的函数
CREATE OR REPLACE FUNCTION handle_custom_field_column(field_id text) RETURNS void AS $$
DECLARE
  column_exists boolean;
BEGIN
  -- 检查列是否已存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grade_data' AND column_name = field_id
  ) INTO column_exists;
  
  -- 如果列不存在，添加它
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS %I TEXT', field_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，在新增自定义字段时自动添加对应列
CREATE OR REPLACE FUNCTION create_custom_field_column() RETURNS TRIGGER AS $$
BEGIN
  PERFORM handle_custom_field_column('custom_' || NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器不存在，则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_custom_field_column'
  ) THEN
    CREATE TRIGGER trigger_create_custom_field_column
    AFTER INSERT ON custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION create_custom_field_column();
  END IF;
END
$$;

-- 处理已存在的自定义字段
DO $$
DECLARE
  field_record RECORD;
BEGIN
  FOR field_record IN SELECT id FROM custom_fields LOOP
    PERFORM handle_custom_field_column('custom_' || field_record.id::text);
  END LOOP;
END
$$;

-- 添加exam_scope字段到grade_data表
DO $$
DECLARE
  column_exists boolean;
BEGIN
  -- 检查exam_scope列是否已存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grade_data' AND column_name = 'exam_scope'
  ) INTO column_exists;
  
  -- 如果列不存在，添加它
  IF NOT column_exists THEN
    ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS exam_scope TEXT DEFAULT 'class';
    COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，可以是班级(class)或年级(grade)级别';
  END IF;
END
$$; 