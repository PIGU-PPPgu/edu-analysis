/**
 * 应用 exams 表 RLS 修复
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📝 读取迁移文件...');
  const sqlContent = readFileSync(
    join(__dirname, '../supabase/migrations/20251201_fix_exams_rls.sql'),
    'utf-8'
  );

  console.log('🚀 执行迁移...');

  // 拆分 SQL 语句并执行
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.includes('SELECT')) continue; // 跳过 SELECT 语句

    console.log(`执行: ${statement.substring(0, 50)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.error(`❌ 执行失败:`, error);
      // 继续执行其他语句
    } else {
      console.log('✅ 执行成功');
    }
  }

  console.log('✅ 迁移完成！');
}

applyMigration().catch(console.error);
