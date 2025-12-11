import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载.env.local文件
config({ path: path.resolve(__dirname, '../.env.local') });

async function verify() {
  console.log('🔍 验证测试环境...\n');

  // 读取环境变量
  const url = process.env.VITE_TEST_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_TEST_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const schema = process.env.VITE_TEST_SUPABASE_SCHEMA || 'public';

  console.log(`📋 配置信息:`);
  console.log(`  URL: ${url}`);
  console.log(`  Key length: ${key?.length || 0}`);
  console.log(`  Schema: ${schema}\n`);

  if (!url || !key) {
    console.error('❌ 环境变量未配置');
    process.exit(1);
  }

  // 创建客户端
  const supabase = createClient(url, key, {
    db: { schema },
    auth: { persistSession: false }
  });

  // 1. 测试连接
  console.log('1️⃣ 测试数据库连接...');
  const { data: countData, error: countError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 数据库连接失败:', countError.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功\n');

  // 2. 测试插入
  console.log('2️⃣ 测试插入权限...');
  const testId = crypto.randomUUID();
  const { data: insertData, error: insertError } = await supabase
    .from('students')
    .insert({
      id: testId,
      student_id: 'TEST_VERIFY_001',
      name: '测试学生',
      class_name: '测试班级'
    })
    .select();

  if (insertError) {
    console.error('❌ 插入失败:', insertError.message);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
    process.exit(1);
  }
  console.log('✅ 插入权限验证通过');
  console.log(`   插入数据:`, insertData);

  // 3. 清理
  console.log('\n3️⃣ 测试删除权限...');
  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .eq('student_id', 'TEST_VERIFY_001');

  if (deleteError) {
    console.error('❌ 删除失败:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ 清理权限验证通过');

  console.log('\n🎉 测试环境配置成功！');
}

verify();
