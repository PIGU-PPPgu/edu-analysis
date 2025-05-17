-- 修复students表结构的SQL脚本
-- 此脚本用于解决"column students.class_name does not exist"错误
-- 以及其他可能的表结构问题

-- 检查并创建students表(如果不存在)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT,
  grade TEXT,
  school_id TEXT,
  gender TEXT,
  birth_date DATE,
  contact_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 添加唯一约束(如果不存在)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'students_student_id_unique' 
    AND conrelid = 'students'::regclass
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_student_id_unique UNIQUE(student_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- 忽略错误，继续执行
  RAISE NOTICE 'Error adding unique constraint: %', SQLERRM;
END $$;

-- 完整的字段检查和添加功能
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- 检查并添加 class_name 字段
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'class_name'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding class_name column to students table';
    ALTER TABLE students ADD COLUMN class_name TEXT;
  END IF;
  
  -- 检查并添加 student_id 字段
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'student_id'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding student_id column to students table';
    ALTER TABLE students ADD COLUMN student_id TEXT NOT NULL DEFAULT 'STD' || gen_random_uuid();
  END IF;
  
  -- 检查并添加 name 字段
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'name'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding name column to students table';
    ALTER TABLE students ADD COLUMN name TEXT NOT NULL DEFAULT '未命名学生';
  END IF;
  
  -- 检查并添加 grade 字段
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'grade'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding grade column to students table';
    ALTER TABLE students ADD COLUMN grade TEXT;
  END IF;
  
  -- 检查并添加 metadata 字段
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'metadata'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding metadata column to students table';
    ALTER TABLE students ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- 确保时间戳字段存在
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'created_at'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding created_at column to students table';
    ALTER TABLE students ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'updated_at'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE NOTICE 'Adding updated_at column to students table';
    ALTER TABLE students ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- 创建或更新自动时间戳更新触发器
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS update_students_timestamp ON students;

-- 创建新的触发器
CREATE TRIGGER update_students_timestamp
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- 设置RLS策略
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 默认RLS策略：允许所有授权用户读取学生记录
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = '允许授权用户读取学生信息' 
    AND polrelid = 'students'::regclass
  ) THEN
    CREATE POLICY "允许授权用户读取学生信息" ON students FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- 忽略错误，继续执行
  RAISE NOTICE 'Error creating RLS policy: %', SQLERRM;
END $$;

-- 输出确认信息
DO $$
BEGIN
  RAISE NOTICE 'Students table structure check and repair completed successfully.';
END $$; 