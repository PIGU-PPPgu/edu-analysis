#!/usr/bin/env node
/**
 * 数据库重新初始化脚本
 * 应用新的用户隔离和RLS策略
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ 错误: 需要设置 SUPABASE_SERVICE_KEY 环境变量');
  console.log('请在Supabase管理面板的 Settings > API 中获取Service Role Key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔄 开始数据库重新初始化...');

async function runSQL(sql, description) {
  try {
    console.log(`📝 执行: ${description}`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ 失败: ${description}`, error);
      throw error;
    }
    
    console.log(`✅ 成功: ${description}`);
  } catch (error) {
    console.error(`❌ 异常: ${description}`, error);
    throw error;
  }
}

async function initializeDatabase() {
  console.log('🚀 开始数据库重新初始化...\n');

  try {
    // 1. 清理现有策略
    console.log('🧹 清理现有RLS策略...');
    await runSQL(`
      -- 删除现有的RLS策略
      DROP POLICY IF EXISTS "Public read access" ON students;
      DROP POLICY IF EXISTS "Public read access" ON class_info;
      DROP POLICY IF EXISTS "Public read access" ON subjects;
      DROP POLICY IF EXISTS "Public read access" ON exam_types;
      DROP POLICY IF EXISTS "Public read access" ON academic_terms;
      DROP POLICY IF EXISTS "Teachers read access" ON grades;
    `, '删除旧的RLS策略');

    // 2. 添加created_by字段到现有表
    console.log('🔧 更新表结构，添加用户隔离字段...');
    await runSQL(`
      -- 为现有表添加created_by字段（如果不存在）
      DO $$ 
      BEGIN
        -- students表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'students' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE students ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE students SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE students ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE students ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;

        -- class_info表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'class_info' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE class_info ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE class_info SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE class_info ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE class_info ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;

        -- subjects表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'subjects' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE subjects ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE subjects SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE subjects ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE subjects ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;

        -- teachers表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'teachers' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE teachers ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE teachers SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE teachers ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE teachers ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;

        -- grades表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'grades' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE grades ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE grades SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE grades ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE grades ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;

        -- exam_types表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'exam_types' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE exam_types ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE exam_types SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE exam_types ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE exam_types ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;

        -- academic_terms表
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'academic_terms' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE academic_terms ADD COLUMN created_by UUID REFERENCES auth.users(id);
          UPDATE academic_terms SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
          ALTER TABLE academic_terms ALTER COLUMN created_by SET NOT NULL;
          ALTER TABLE academic_terms ALTER COLUMN created_by SET DEFAULT auth.uid();
        END IF;
      END $$;
    `, '添加created_by字段');

    // 3. 创建exams表（如果不存在）
    console.log('📋 创建考试记录表...');
    await runSQL(`
      CREATE TABLE IF NOT EXISTS exams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        date DATE NOT NULL,
        type TEXT NOT NULL,
        subject TEXT,
        description TEXT,
        created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(title, date, type, created_by)  -- 在用户级别防止重复
      );

      -- 启用RLS
      ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
    `, '创建exams表');

    // 4. 应用新的RLS策略
    console.log('🔐 应用基于用户的RLS策略...');
    await runSQL(`
      -- 学生数据访问策略
      CREATE POLICY "Users can view their own students"
        ON students FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create students"
        ON students FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own students"
        ON students FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own students"
        ON students FOR DELETE
        USING (auth.uid() = created_by);

      -- 班级信息访问策略
      CREATE POLICY "Users can view their own classes"
        ON class_info FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create classes"
        ON class_info FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own classes"
        ON class_info FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own classes"
        ON class_info FOR DELETE
        USING (auth.uid() = created_by);

      -- 科目访问策略
      CREATE POLICY "Users can view their own subjects"
        ON subjects FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create subjects"
        ON subjects FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own subjects"
        ON subjects FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own subjects"
        ON subjects FOR DELETE
        USING (auth.uid() = created_by);

      -- 教师访问策略
      CREATE POLICY "Users can view their own teachers"
        ON teachers FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create teachers"
        ON teachers FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own teachers"
        ON teachers FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own teachers"
        ON teachers FOR DELETE
        USING (auth.uid() = created_by);

      -- 成绩访问策略
      CREATE POLICY "Users can view their own grades"
        ON grades FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create grades"
        ON grades FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own grades"
        ON grades FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own grades"
        ON grades FOR DELETE
        USING (auth.uid() = created_by);

      -- 考试类型访问策略
      CREATE POLICY "Users can view their own exam types"
        ON exam_types FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create exam types"
        ON exam_types FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own exam types"
        ON exam_types FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own exam types"
        ON exam_types FOR DELETE
        USING (auth.uid() = created_by);

      -- 学年学期访问策略
      CREATE POLICY "Users can view their own academic terms"
        ON academic_terms FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create academic terms"
        ON academic_terms FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own academic terms"
        ON academic_terms FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own academic terms"
        ON academic_terms FOR DELETE
        USING (auth.uid() = created_by);

      -- 考试记录访问策略
      CREATE POLICY "Users can view their own exams"
        ON exams FOR SELECT
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can create exams"
        ON exams FOR INSERT
        WITH CHECK (auth.uid() = created_by);

      CREATE POLICY "Users can update their own exams"
        ON exams FOR UPDATE
        USING (auth.uid() = created_by);

      CREATE POLICY "Users can delete their own exams"
        ON exams FOR DELETE
        USING (auth.uid() = created_by);
    `, '应用用户隔离RLS策略');

    // 5. 创建索引优化
    console.log('⚡ 创建性能优化索引...');
    await runSQL(`
      -- 为created_by字段创建索引
      CREATE INDEX IF NOT EXISTS idx_grades_created_by ON grades(created_by);
      CREATE INDEX IF NOT EXISTS idx_students_created_by ON students(created_by);
      CREATE INDEX IF NOT EXISTS idx_class_info_created_by ON class_info(created_by);
      CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
      CREATE INDEX IF NOT EXISTS idx_subjects_created_by ON subjects(created_by);
      CREATE INDEX IF NOT EXISTS idx_teachers_created_by ON teachers(created_by);
      CREATE INDEX IF NOT EXISTS idx_exam_types_created_by ON exam_types(created_by);
      CREATE INDEX IF NOT EXISTS idx_academic_terms_created_by ON academic_terms(created_by);
    `, '创建性能索引');

    console.log('\n✅ 数据库重新初始化完成！');
    console.log('🔐 所有表现在都具有基于用户的访问控制');
    console.log('🚪 请关闭开发模式并重新登录以测试真实用户认证');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 运行初始化
initializeDatabase()
  .then(() => {
    console.log('\n🎉 数据库重新初始化成功完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 数据库初始化失败:', error);
    process.exit(1);
  }); 