#!/usr/bin/env node

/**
 * 🔧 执行数据库结构修复脚本
 * 解决406错误、字段映射失败、冗余表等问题
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules需要手动构建__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取环境变量
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeStructureFix() {
  console.log('🔧 开始执行数据库结构修复...');
  console.log('==========================================');
  
  try {
    // 读取修复脚本
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'fix-database-structure-issues.sql'), 
      'utf-8'
    );
    
    console.log('📖 已读取修复脚本');
    
    // 由于Supabase限制，我们分步执行关键修复
    
    // 1. 首先检查当前grade_data表结构
    console.log('\\n📋 步骤1: 检查当前表结构...');
    
    const { data: currentData, error: currentError } = await supabase
      .from('grade_data')
      .select('*')
      .limit(1);
    
    if (currentError) {
      throw new Error(`无法查询grade_data表: ${currentError.message}`);
    }
    
    if (currentData && currentData.length > 0) {
      const fields = Object.keys(currentData[0]);
      const customFields = fields.filter(f => f.startsWith('custom_'));
      const hasStandardFields = fields.some(f => f.includes('chinese_score') || f.includes('math_score'));
      
      console.log(`📊 当前表状态:`);
      console.log(`   - 总字段数: ${fields.length}`);
      console.log(`   - custom字段数: ${customFields.length}`);
      console.log(`   - 是否有标准科目字段: ${hasStandardFields ? '是' : '否'}`);
      
      if (customFields.length > 20) {
        console.log('⚠️ 发现大量custom字段，需要清理');
      }
      
      if (!hasStandardFields) {
        console.log('⚠️ 缺少标准科目字段，需要添加');
      }
    }
    
    // 2. 检查exams表的问题字段
    console.log('\\n📋 步骤2: 检查exams表结构...');
    
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, title, type, date, subject')
        .limit(1);
      
      if (examError && examError.message.includes('subject')) {
        console.log('✅ 确认exams表的subject字段存在查询问题');
      } else {
        console.log('📊 exams表查询正常');
      }
    } catch (err) {
      console.log('⚠️ exams表查询出现问题，需要修复');
    }
    
    // 3. 尝试执行部分修复（由于权限限制，这里主要是验证）
    console.log('\\n📋 步骤3: 数据库修复验证...');
    
    // 检查是否可以执行DDL操作
    try {
      // 尝试一个简单的查询来验证权限
      const { data: permissionTest, error: permissionError } = await supabase
        .from('grade_data')
        .select('id')
        .limit(1);
      
      if (permissionError) {
        console.log('❌ 数据库访问权限不足');
      } else {
        console.log('✅ 数据库访问权限正常');
      }
    } catch (err) {
      console.log('❌ 无法验证数据库权限');
    }
    
    // 4. 生成修复建议
    console.log('\\n📋 步骤4: 生成修复建议...');
    
    console.log('\\n🔧 需要手动执行的修复步骤:');
    console.log('==========================================');
    console.log('1. 登录Supabase控制台');
    console.log('2. 打开SQL编辑器');
    console.log('3. 执行 fix-database-structure-issues.sql 脚本');
    console.log('4. 或者分步执行以下关键修复:');
    console.log('');
    
    // 生成分步修复命令
    const criticalFixes = [
      `-- 添加标准科目字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_score NUMERIC CHECK (chinese_score >= 0 AND chinese_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_score NUMERIC CHECK (math_score >= 0 AND math_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_score NUMERIC CHECK (english_score >= 0 AND english_score <= 150);`,
      
      `-- 删除问题字段（exams表）
ALTER TABLE exams DROP COLUMN IF EXISTS subject;`,
      
      `-- 清理前5个custom字段示例
ALTER TABLE grade_data DROP COLUMN IF EXISTS custom_1d8d05c1;
ALTER TABLE grade_data DROP COLUMN IF EXISTS custom_c316f6bf;
ALTER TABLE grade_data DROP COLUMN IF EXISTS custom_0afe3098;`,
      
      `-- 创建优化索引
CREATE INDEX IF NOT EXISTS idx_grade_data_scores ON grade_data (chinese_score, math_score, english_score);`
    ];
    
    criticalFixes.forEach((fix, index) => {
      console.log(`\\n--- 修复步骤 ${index + 1} ---`);
      console.log(fix);
    });
    
    console.log('\\n==========================================');
    console.log('📝 修复完成后的预期效果:');
    console.log('✅ 406错误将被解决');
    console.log('✅ 字段映射将正常工作');
    console.log('✅ grade_data表结构将标准化');
    console.log('✅ 查询性能将提升');
    console.log('✅ 前端导入功能将恢复正常');
    
    // 5. 写入修复脚本到临时文件供手动执行
    const quickFixScript = `-- 🚀 快速修复脚本（核心问题）

-- 1. 添加标准科目字段
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chinese_score NUMERIC CHECK (chinese_score >= 0 AND chinese_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS math_score NUMERIC CHECK (math_score >= 0 AND math_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS english_score NUMERIC CHECK (english_score >= 0 AND english_score <= 150);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS physics_score NUMERIC CHECK (physics_score >= 0 AND physics_score <= 100);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS chemistry_score NUMERIC CHECK (chemistry_score >= 0 AND chemistry_score <= 100);
ALTER TABLE grade_data ADD COLUMN IF NOT EXISTS biology_score NUMERIC CHECK (biology_score >= 0 AND biology_score <= 100);

-- 2. 修复exams表问题
ALTER TABLE exams DROP COLUMN IF EXISTS subject;

-- 3. 创建基础索引
CREATE INDEX IF NOT EXISTS idx_grade_data_scores ON grade_data (chinese_score, math_score, english_score);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_exam ON grade_data (student_id, exam_id);

-- 4. 数据迁移（如果score字段有数据）
UPDATE grade_data SET total_score = score WHERE total_score IS NULL AND score IS NOT NULL;

SELECT '🎉 核心修复完成！' as result;`;

    fs.writeFileSync(
      path.join(__dirname, 'quick-database-fix.sql'),
      quickFixScript,
      'utf-8'
    );
    
    console.log('\\n📄 已生成快速修复脚本: quick-database-fix.sql');
    
    return true;
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  const success = await executeStructureFix();
  
  if (success) {
    console.log('\\n🎯 接下来的操作:');
    console.log('1. 手动执行Supabase SQL修复脚本');
    console.log('2. 运行前端测试验证修复效果');
    console.log('3. 检查406错误是否解决');
    console.log('4. 验证字段映射功能是否正常');
  }
  
  process.exit(success ? 0 : 1);
}

// 运行
console.log('✅ 开始数据库结构修复检查...');
main().catch(console.error);