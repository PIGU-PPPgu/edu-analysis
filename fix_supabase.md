# Supabase数据库修复指南

本文档提供了修复Supabase数据库中常见问题的指南，特别是成绩导入系统中使用的表结构问题。

## 常见问题及解决方案

### 1. RPC函数缺失

如果遇到"function not found"或404错误，需要创建以下辅助函数：

```sql
-- 创建检查列是否存在的函数
CREATE OR REPLACE FUNCTION public.has_column(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = $1
    AND column_name = $2
    AND table_schema = 'public'
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建安全的SQL执行函数
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS text AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SQL executed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN 'SQL执行失败: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为RPC函数添加注释
COMMENT ON FUNCTION public.has_column IS '检查指定表中是否存在某列';
COMMENT ON FUNCTION public.exec_sql IS '安全地执行动态SQL语句，用于系统维护';

-- 设置适当的权限
GRANT EXECUTE ON FUNCTION public.has_column TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;
```

### 2. 修复exams表结构

如果exams表缺少scope字段，执行以下SQL：

```sql
-- 添加scope字段到exams表
DO $$
BEGIN
  BEGIN
    ALTER TABLE exams ADD COLUMN scope TEXT DEFAULT 'class' NOT NULL;
    RAISE NOTICE 'scope字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'scope字段已存在，无需添加';
  END;
END $$;
```

### 3. 修复grade_data表结构

如果grade_data表缺少必要字段，使用以下一次性修复脚本：

```sql
-- 一次性添加所有必要字段到grade_data表
DO $$
BEGIN
  -- 添加grade字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN grade TEXT;
    COMMENT ON COLUMN grade_data.grade IS '等级评定';
    RAISE NOTICE 'grade字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'grade字段已存在，无需添加';
  END;

  -- 添加import_strategy字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN import_strategy TEXT;
    COMMENT ON COLUMN grade_data.import_strategy IS '数据导入策略';
    RAISE NOTICE 'import_strategy字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'import_strategy字段已存在，无需添加';
  END;

  -- 添加match_type字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN match_type TEXT;
    COMMENT ON COLUMN grade_data.match_type IS '学生匹配类型，例如id、name_class、name等';
    RAISE NOTICE 'match_type字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'match_type字段已存在，无需添加';
  END;

  -- 添加multiple_matches字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN multiple_matches BOOLEAN DEFAULT false;
    COMMENT ON COLUMN grade_data.multiple_matches IS '是否存在多个匹配结果';
    RAISE NOTICE 'multiple_matches字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'multiple_matches字段已存在，无需添加';
  END;
  
  -- 添加rank_in_class字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN rank_in_class INTEGER;
    COMMENT ON COLUMN grade_data.rank_in_class IS '班级内排名';
    RAISE NOTICE 'rank_in_class字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'rank_in_class字段已存在，无需添加';
  END;
  
  -- 添加rank_in_grade字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN rank_in_grade INTEGER;
    COMMENT ON COLUMN grade_data.rank_in_grade IS '年级内排名';
    RAISE NOTICE 'rank_in_grade字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'rank_in_grade字段已存在，无需添加';
  END;
  
  -- 添加exam_scope字段
  BEGIN
    ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class';
    COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
    RAISE NOTICE 'exam_scope字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'exam_scope字段已存在，无需添加';
  END;
END $$;
```

### 4. 完整的表结构修复脚本

以下是一个完整的修复脚本，能够检查并修复所有需要的表结构：

```sql
-- 创建辅助函数
CREATE OR REPLACE FUNCTION public.has_column(table_name text, column_name text)
RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = $1
    AND column_name = $2
    AND table_schema = 'public'
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS text AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SQL executed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN 'SQL执行失败: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 修复表结构
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- 检查exams表
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exams') THEN
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'exams' 
      AND column_name = 'scope'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加scope字段到exams表';
      ALTER TABLE exams ADD COLUMN scope TEXT DEFAULT 'class' NOT NULL;
    END IF;
  ELSE
    RAISE NOTICE 'exams表不存在';
  END IF;
  
  -- 检查grade_data表
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grade_data') THEN
    -- 检查grade字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'grade'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加grade字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN grade TEXT;
      COMMENT ON COLUMN grade_data.grade IS '等级评定';
    END IF;
    
    -- 检查import_strategy字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'import_strategy'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加import_strategy字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN import_strategy TEXT;
      COMMENT ON COLUMN grade_data.import_strategy IS '数据导入策略';
    END IF;
    
    -- 检查match_type字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'match_type'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加match_type字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN match_type TEXT;
      COMMENT ON COLUMN grade_data.match_type IS '学生匹配类型，例如id、name_class、name等';
    END IF;
    
    -- 检查multiple_matches字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'multiple_matches'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加multiple_matches字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN multiple_matches BOOLEAN DEFAULT false;
      COMMENT ON COLUMN grade_data.multiple_matches IS '是否存在多个匹配结果';
    END IF;
    
    -- 检查rank_in_class字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'rank_in_class'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加rank_in_class字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN rank_in_class INTEGER;
      COMMENT ON COLUMN grade_data.rank_in_class IS '班级内排名';
    END IF;
    
    -- 检查rank_in_grade字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'rank_in_grade'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加rank_in_grade字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN rank_in_grade INTEGER;
      COMMENT ON COLUMN grade_data.rank_in_grade IS '年级内排名';
    END IF;
    
    -- 检查exam_scope字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'grade_data' 
      AND column_name = 'exam_scope'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加exam_scope字段到grade_data表';
      ALTER TABLE grade_data ADD COLUMN exam_scope TEXT DEFAULT 'class';
      COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
    END IF;
  ELSE
    RAISE NOTICE 'grade_data表不存在';
  END IF;
  
  -- 检查students表
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    -- 检查class_name字段
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'students' 
      AND column_name = 'class_name'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE NOTICE '添加class_name字段到students表';
      ALTER TABLE students ADD COLUMN class_name TEXT;
    END IF;
  ELSE
    RAISE NOTICE 'students表不存在';
  END IF;
END $$;

-- 设置权限
GRANT EXECUTE ON FUNCTION public.has_column TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;
```

## 使用方法

1. 登录到Supabase管理控制台
2. 打开SQL编辑器
3. 复制上述脚本并执行
4. 检查执行结果确保没有错误

## 快速修复方法（推荐）

以下是修复所有已知问题的最简单方法，在 Supabase 控制台中的 SQL 编辑器中执行：

```sql
-- 一次性添加所有必要字段到grade_data表
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS score NUMERIC;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS match_type TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS multiple_matches BOOLEAN DEFAULT false;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS import_strategy TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS exam_scope TEXT DEFAULT 'class';

-- 添加注释以更好地理解字段用途
COMMENT ON COLUMN grade_data.score IS '分数值';
COMMENT ON COLUMN grade_data.rank_in_class IS '班级内排名';
COMMENT ON COLUMN grade_data.rank_in_grade IS '年级内排名';
COMMENT ON COLUMN grade_data.match_type IS '学生匹配类型';
COMMENT ON COLUMN grade_data.multiple_matches IS '是否存在多个匹配结果';
COMMENT ON COLUMN grade_data.import_strategy IS '数据导入策略';
COMMENT ON COLUMN grade_data.grade IS '等级评定';
COMMENT ON COLUMN grade_data.exam_scope IS '考试范围，继承自exams表';
```

## 检查表是否正确修复

执行以下查询来验证表结构是否已正确修复：

```sql
-- 检查exams表scope字段
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'exams' 
  AND column_name = 'scope'
) as exams_scope_exists;

-- 检查grade_data表的重要字段
SELECT 
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'exam_scope'
  ) as grade_data_exam_scope_exists,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'grade'
  ) as grade_data_grade_exists,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'import_strategy'
  ) as grade_data_import_strategy_exists,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'match_type'
  ) as grade_data_match_type_exists,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'multiple_matches'
  ) as grade_data_multiple_matches_exists,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'rank_in_class'
  ) as grade_data_rank_in_class_exists,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'rank_in_grade'
  ) as grade_data_rank_in_grade_exists;

-- 检查students表class_name字段
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'students' 
  AND column_name = 'class_name'
) as students_class_name_exists;
```

所有查询都应返回`true`才表示表结构已成功修复。