/**
 * 检查数据库表结构的 TypeScript 脚本
 * 确认 exam_subject_scores 表是否存在，并提供迁移指导
 */

import { checkTableExists, runMigration } from './src/integrations/supabase/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要检查的表
const TABLES_TO_CHECK = [
  'exams',
  'exam_subject_scores', 
  'academic_terms'
];

async function main() {
  console.log('🔍 开始检查数据库表结构...\n');

  const results: Record<string, boolean> = {};

  // 检查所有表
  for (const tableName of TABLES_TO_CHECK) {
    console.log(`检查表: ${tableName}`);
    try {
      const result = await checkTableExists(tableName);
      results[tableName] = result.exists;
      
      if (result.exists) {
        console.log(`✅ 表 '${tableName}' 存在`);
      } else {
        console.log(`❌ 表 '${tableName}' 不存在`);
        if (result.error) {
          console.log(`   错误详情: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ 检查表 '${tableName}' 时出错:`, error);
      results[tableName] = false;
    }
    console.log('');
  }

  // 总结结果
  console.log('📊 检查结果总结:');
  Object.entries(results).forEach(([table, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${table}`);
  });

  // 诊断问题
  console.log('\n🔍 问题诊断:');
  
  if (!results.exam_subject_scores) {
    console.log('🚨 CRITICAL: exam_subject_scores 表不存在！');
    console.log('   这就是为什么科目总分设置功能无法工作的根本原因。');
    console.log('');
    console.log('🛠️ 解决方案:');
    console.log('   需要执行迁移文件来创建 exam_subject_scores 表');
    
    // 尝试读取迁移文件
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250801_create_exam_subject_scores.sql');
    
    if (fs.existsSync(migrationPath)) {
      console.log('   ✅ 迁移文件存在: 20250801_create_exam_subject_scores.sql');
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log('\n📝 迁移SQL内容 (前200字符):');
      console.log(migrationSQL.substring(0, 200) + '...');
      
      console.log('\n⚠️ 请在 Supabase Dashboard 的 SQL Editor 中执行完整的迁移SQL');
    } else {
      console.log('   ❌ 迁移文件不存在，需要先创建');
    }
  } else {
    console.log('✅ exam_subject_scores 表存在，科目总分功能应该正常工作');
  }

  if (!results.academic_terms) {
    console.log('\n⚠️ WARNING: academic_terms 表不存在');
    console.log('   学期筛选功能可能无法正常工作');
  }

  console.log('\n🎯 下一步行动:');
  if (!results.exam_subject_scores) {
    console.log('1. 在 Supabase Dashboard 中执行 exam_subject_scores 表迁移');
    console.log('2. 在 Supabase Dashboard 中执行 academic_terms 表迁移');
    console.log('3. 重新测试科目总分设置功能');
  } else {
    console.log('1. 所有表都存在，检查前端代码是否有其他问题');
    console.log('2. 检查 API 接口是否正确调用');
  }
}

// 错误处理
main().catch((error) => {
  console.error('💥 脚本执行失败:', error);
  console.log('\n可能的原因:');
  console.log('1. 环境变量未正确配置 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
  console.log('2. Supabase 连接问题');
  console.log('3. 权限不足');
  
  process.exit(1);
});