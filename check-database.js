/**
 * 检查数据库表结构脚本
 * 用于确认 exam_subject_scores 表是否存在
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量或配置文件获取 Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL 或 API Key 未找到');
  console.log('请检查以下环境变量:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ 表 '${tableName}' 不存在`);
        return false;
      } else {
        console.log(`⚠️ 检查表 '${tableName}' 时出错:`, error.message);
        return false;
      }
    }
    
    console.log(`✅ 表 '${tableName}' 存在`);
    return true;
  } catch (err) {
    console.log(`❌ 检查表 '${tableName}' 失败:`, err.message);
    return false;
  }
}

async function applyMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`❌ 迁移文件不存在: ${migrationFile}`);
      return false;
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📝 应用迁移: ${migrationFile}`);
    console.log('SQL 内容:');
    console.log('---');
    console.log(sql);
    console.log('---');
    
    // 注意：这里无法直接执行 DDL，需要手动在 Supabase Dashboard 中执行
    console.log(`⚠️ 请手动在 Supabase Dashboard 的 SQL Editor 中执行上述 SQL`);
    return true;
    
  } catch (err) {
    console.log(`❌ 读取迁移文件失败:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🔍 检查数据库表结构...\n');
  
  // 检查核心表
  const tables = [
    'exams',
    'exam_subject_scores', 
    'academic_terms'
  ];
  
  const results = {};
  
  for (const table of tables) {
    results[table] = await checkTableExists(table);
  }
  
  console.log('\n📊 检查结果:');
  Object.entries(results).forEach(([table, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  });
  
  // 如果 exam_subject_scores 表不存在，提供迁移文件
  if (!results.exam_subject_scores) {
    console.log('\n🚨 exam_subject_scores 表不存在，这就是科目总分无法修改的原因！');
    console.log('\n📋 需要应用以下迁移:');
    await applyMigration('20250801_create_exam_subject_scores.sql');
  }
  
  // 检查 academic_terms 表的字段
  if (results.academic_terms) {
    try {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('semester_code')
        .limit(1);
      
      if (error && error.message.includes('column "semester_code" does not exist')) {
        console.log('\n⚠️ academic_terms 表缺少 semester_code 字段');
        console.log('📋 需要应用以下迁移:');
        await applyMigration('20250801_create_academic_terms.sql');
      } else {
        console.log('✅ academic_terms 表结构完整');
      }
    } catch (err) {
      console.log('⚠️ 检查 academic_terms 表字段时出错:', err.message);
    }
  }
}

main().catch(console.error);