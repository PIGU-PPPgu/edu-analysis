# 成绩分析系统修复指南

## 最新问题修复

我们已经定位并修复了以下问题：

1. **表检查方法错误**：使用 `information_schema.tables` 查询表是否存在的方法在 Supabase 中失败，导致 404 错误。我们添加了多种备用方法来检查表是否存在。

2. **缺少数据库表**：系统需要的 `exams`、`grade_data` 等表不存在，现在添加了一个数据库初始化功能。

3. **初始化数据库表**：添加了一键初始化数据库表的功能，可以自动创建所需的表。

## 问题描述

成绩分析系统存在以下几个问题导致加载失败：

1. **数据库表缺失**：系统需要的 `exams`、`grade_data`、`grade_tags` 和 `grade_data_tags` 等表不存在
2. **导入名称不匹配**：代码中导入 `supabaseClient` 但实际导出名称是 `supabase`
3. **ExamInfo 接口不一致**：在不同文件中定义的接口存在差异
4. **迁移函数失败**：使用 `runMigration` 执行 SQL 脚本时，依赖不存在的 `exec_sql` RPC 函数
5. **表检查方法错误**：使用 `information_schema.tables` 查询表不适用于 Supabase

## 修复步骤

### 1. 创建必要的数据库表

在系统中已添加"初始化数据库表"按钮，可以一键创建所需表。如果自动创建失败，您可以在 Supabase SQL 编辑器中手动执行以下 SQL 脚本：

#### 1.1 创建考试和成绩数据表

```sql
-- 创建考试表
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建成绩数据表
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  subject TEXT,
  total_score NUMERIC,
  exam_date DATE,
  exam_type TEXT,
  exam_title TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
```

#### 1.2 创建标签相关表 (可选)

```sql
-- 创建成绩标签表
CREATE TABLE IF NOT EXISTS grade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 成绩数据和标签的关联表
CREATE TABLE IF NOT EXISTS grade_data_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT grade_data_tags_grade_id_tag_id_key UNIQUE (grade_id, tag_id),
  CONSTRAINT grade_data_tags_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES grade_data(id) ON DELETE CASCADE,
  CONSTRAINT grade_data_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES grade_tags(id) ON DELETE CASCADE
);

-- 添加行级安全策略
ALTER TABLE grade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_data_tags ENABLE ROW LEVEL SECURITY;
```

#### 1.3 创建辅助函数 (推荐)

```sql
-- 创建一个检查表是否存在的函数
-- 使用方法：SELECT * FROM table_exists('表名');
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT)
RETURNS TABLE (exists BOOLEAN) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = table_name
    AND schemaname = 'public'
  );
END;
$$;

-- 为当前用户授予执行权限
GRANT EXECUTE ON FUNCTION table_exists TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists TO anon;
GRANT EXECUTE ON FUNCTION table_exists TO service_role;

-- 创建一个执行任意SQL的函数(需要admin权限)
-- 警告：这个函数有安全风险，只应该在安全的环境中使用
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE sql;
END;
$$;
```

### 2. 代码修复摘要

以下是已经应用的主要代码修复：

1. **修复导入不匹配**：将 `supabaseClient` 改为 `supabase`
2. **添加表检查逻辑**：在相关函数中添加了更可靠的表存在性检查
3. **增强错误处理**：添加了友好的错误提示和引导用户手动创建表的操作
4. **添加一键初始化数据库功能**：增加了"初始化数据库表"按钮

## 使用说明

1. 点击"初始化数据库表"按钮创建所需的数据表
2. 如果自动创建失败，请使用提供的SQL脚本在Supabase SQL编辑器中手动执行
3. 创建表后，使用"前往导入数据"按钮开始导入考试数据
4. 导入数据后，系统将正常加载考试列表和成绩数据

## 常见问题

### 如何确认表已成功创建？

您可以在Supabase管理面板中的"表编辑器"部分查看是否存在 `exams` 和 `grade_data` 表。

### 如果数据导入后仍然出现问题？

请检查控制台日志中的详细错误信息，通常会提示具体的问题所在。如果问题仍然存在，可能需要检查Supabase项目的权限设置。

### 标签功能是否必需？

标签功能是可选的，即使没有创建 `grade_tags` 和 `grade_data_tags` 表，基本的成绩分析功能也能正常使用。 