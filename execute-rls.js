#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

const SQL = `
-- ============================================
-- 最终 RLS 修复脚本
-- ============================================

-- 1️⃣ 启用 RLS
ALTER TABLE IF EXISTS grade_data_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework_submissions ENABLE ROW LEVEL SECURITY;

-- 2️⃣ 删除所有旧策略
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'grade_data_new') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON grade_data_new', r.policyname);
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'students') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON students', r.policyname);
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'class_info') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON class_info', r.policyname);
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'grades') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON grades', r.policyname);
    END LOOP;
END $$;

-- 3️⃣ 创建新策略（允许所有认证用户访问）
-- grade_data_new
CREATE POLICY "authenticated_read_grade_data_new" ON grade_data_new FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_grade_data_new" ON grade_data_new FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_grade_data_new" ON grade_data_new FOR UPDATE TO authenticated USING (true);

-- students
CREATE POLICY "authenticated_read_students" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_students" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_students" ON students FOR UPDATE TO authenticated USING (true);

-- class_info
CREATE POLICY "authenticated_read_class_info" ON class_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_class_info" ON class_info FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_class_info" ON class_info FOR UPDATE TO authenticated USING (true);

-- grades
CREATE POLICY "authenticated_read_grades" ON grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_grades" ON grades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_grades" ON grades FOR UPDATE TO authenticated USING (true);

-- homework
CREATE POLICY "authenticated_read_homework" ON homework FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_manage_homework" ON homework FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- homework_submissions
CREATE POLICY "authenticated_read_submissions" ON homework_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_manage_submissions" ON homework_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ RLS policies configured successfully!' as status;
`;

const DB_URL = "postgresql://postgres.giluhqotfjpmofowvogn:Ypy990410@aws-0-us-west-1.pooler.supabase.com:6543/postgres";

console.log('🔄 Installing pg package...');
exec('npm install --no-save pg', (error) => {
  if (error) {
    console.error('❌ Failed to install pg:', error);
    process.exit(1);
  }

  console.log('✅ pg package installed');
  console.log('🔄 Executing RLS migration...\n');

  const { Client } = require('pg');
  const client = new Client({ connectionString: DB_URL });

  client.connect()
    .then(() => {
      console.log('✅ Connected to Supabase');
      return client.query(SQL);
    })
    .then(result => {
      console.log('\n✅ RLS Migration completed successfully!');
      if (result.rows && result.rows.length > 0) {
        console.log('Result:', result.rows);
      }
      return client.end();
    })
    .then(() => {
      console.log('✅ Connection closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err.message);
      console.error('Details:', err);
      client.end();
      process.exit(1);
    });
});
