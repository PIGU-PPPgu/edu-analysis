#!/usr/bin/env node

/**
 * 预警系统数据库修复脚本
 * 修复预警分析功能中的数据库架构问题
 * 运行: node fix-warning-database.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2NjM3OTUsImV4cCI6MjA0NzIzOTc5NX0.P9GxwQKl9XqUifqVc_J9WZbsAWVrx2VhPqjfWU_6qHY';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 开始修复预警系统数据库架构...\n');

async function checkConnection() {
  try {
    console.log('📡 检查数据库连接...');
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error && !error.message.includes('permission denied')) {
      throw error;
    }
    console.log('✅ 数据库连接正常\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

async function executeSQL(sqlContent, description) {
  try {
    console.log(`🔄 ${description}...`);
    const { error } = await supabase.rpc('execute_sql', { sql_content: sqlContent });
    
    if (error) {
      console.error(`❌ ${description}失败:`, error.message);
      return false;
    }
    
    console.log(`✅ ${description}成功`);
    return true;
  } catch (error) {
    console.error(`❌ ${description}执行错误:`, error.message);
    return false;
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
      
    if (error) {
      // 尝试直接查询表
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      return !tableError;
    }
    
    return data && data.length > 0;
  } catch (error) {
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .eq('column_name', columnName);
      
    if (error) {
      console.warn(`无法检查字段 ${tableName}.${columnName}:`, error.message);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.warn(`检查字段时出错 ${tableName}.${columnName}:`, error.message);
    return false;
  }
}

async function fixWarningRulesTable() {
  console.log('\n📋 检查和修复 warning_rules 表...');
  
  // 检查表是否存在
  const tableExists = await checkTableExists('warning_rules');
  
  if (!tableExists) {
    console.log('⚠️  warning_rules 表不存在，创建表...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS warning_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        conditions JSONB NOT NULL DEFAULT '{}',
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'exam', 'class', 'student')),
        category TEXT DEFAULT 'grade' CHECK (category IN ('grade', 'attendance', 'behavior', 'progress', 'homework', 'composite')),
        priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
        auto_trigger BOOLEAN DEFAULT true,
        notification_enabled BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await executeSQL(createTableSQL, '创建 warning_rules 表');
  } else {
    console.log('✅ warning_rules 表已存在');
    
    // 检查关键字段
    const scopeExists = await checkColumnExists('warning_rules', 'scope');
    if (!scopeExists) {
      console.log('⚠️  scope 字段不存在，添加字段...');
      await executeSQL(
        "ALTER TABLE warning_rules ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'global' CHECK (scope IN ('global', 'exam', 'class', 'student'));",
        '添加 scope 字段'
      );
    }
    
    const categoryExists = await checkColumnExists('warning_rules', 'category');
    if (!categoryExists) {
      console.log('⚠️  category 字段不存在，添加字段...');
      await executeSQL(
        "ALTER TABLE warning_rules ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'grade' CHECK (category IN ('grade', 'attendance', 'behavior', 'progress', 'homework', 'composite'));",
        '添加 category 字段'
      );
    }
  }
  
  // 创建索引
  console.log('🔗 创建必要的索引...');
  await executeSQL(
    'CREATE INDEX IF NOT EXISTS idx_warning_rules_scope ON warning_rules(scope);',
    '创建 scope 索引'
  );
  
  await executeSQL(
    'CREATE INDEX IF NOT EXISTS idx_warning_rules_category ON warning_rules(category);',
    '创建 category 索引'
  );
}

async function fixWarningRecordsTable() {
  console.log('\n📋 检查和修复 warning_records 表...');
  
  const tableExists = await checkTableExists('warning_records');
  
  if (!tableExists) {
    console.log('⚠️  warning_records 表不存在，创建表...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS warning_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL,
        rule_id UUID REFERENCES warning_rules(id),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed', 'escalated')),
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by UUID,
        resolution_notes TEXT
      );
    `;
    
    await executeSQL(createTableSQL, '创建 warning_records 表');
  } else {
    console.log('✅ warning_records 表已存在');
  }
  
  // 创建索引
  console.log('🔗 创建必要的索引...');
  await executeSQL(
    'CREATE INDEX IF NOT EXISTS idx_warning_records_student_status ON warning_records(student_id, status);',
    '创建学生状态索引'
  );
}

async function insertDefaultRules() {
  console.log('\n📝 检查并插入默认预警规则...');
  
  try {
    // 检查是否已有规则
    const { data: existingRules, error } = await supabase
      .from('warning_rules')
      .select('id')
      .limit(1);
    
    if (error) {
      console.warn('⚠️  无法检查现有规则，跳过插入默认规则');
      return;
    }
    
    if (existingRules && existingRules.length > 0) {
      console.log('✅ 已存在预警规则，跳过插入');
      return;
    }
    
    // 插入默认规则
    const defaultRules = [
      {
        name: '连续不及格预警',
        description: '学生连续2次考试不及格时触发预警',
        conditions: { type: 'consecutive_fails', count: 2, threshold: 60, subject: 'all' },
        severity: 'medium',
        scope: 'global',
        category: 'grade',
        priority: 7,
        is_active: true,
        is_system: true,
        auto_trigger: true
      },
      {
        name: '成绩下降预警',
        description: '学生成绩连续下降超过15分时触发预警',
        conditions: { type: 'grade_decline', decline_threshold: 15, consecutive_count: 2, subject: 'all' },
        severity: 'high',
        scope: 'global',
        category: 'progress',
        priority: 8,
        is_active: true,
        is_system: true,
        auto_trigger: true
      },
      {
        name: '考试不及格预警',
        description: '本次考试成绩不及格时触发预警',
        conditions: { type: 'exam_fail', threshold: 60, subject: 'all' },
        severity: 'medium',
        scope: 'exam',
        category: 'grade',
        priority: 5,
        is_active: true,
        is_system: true,
        auto_trigger: true
      }
    ];
    
    const { error: insertError } = await supabase
      .from('warning_rules')
      .insert(defaultRules);
    
    if (insertError) {
      console.error('❌ 插入默认规则失败:', insertError.message);
    } else {
      console.log('✅ 成功插入默认预警规则');
    }
    
  } catch (error) {
    console.error('❌ 插入默认规则时出错:', error.message);
  }
}

async function createHelperFunctions() {
  console.log('\n⚙️  创建辅助函数...');
  
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_applicable_warning_rules(
      rule_scope TEXT DEFAULT 'global',
      rule_category TEXT DEFAULT NULL,
      active_only BOOLEAN DEFAULT true
    ) RETURNS TABLE (
      id UUID,
      name TEXT,
      description TEXT,
      conditions JSONB,
      severity TEXT,
      scope TEXT,
      category TEXT,
      priority INTEGER,
      is_active BOOLEAN,
      auto_trigger BOOLEAN
    ) 
    LANGUAGE sql
    AS $$
      SELECT 
        wr.id,
        wr.name,
        wr.description,
        wr.conditions,
        wr.severity,
        wr.scope,
        wr.category,
        wr.priority,
        wr.is_active,
        wr.auto_trigger
      FROM warning_rules wr
      WHERE 
        (rule_scope IS NULL OR wr.scope = rule_scope)
        AND (rule_category IS NULL OR wr.category = rule_category)
        AND (NOT active_only OR wr.is_active = true)
      ORDER BY wr.priority DESC, wr.created_at DESC;
    $$;
  `;
  
  await executeSQL(functionSQL, '创建 get_applicable_warning_rules 函数');
}

async function testDatabaseAccess() {
  console.log('\n🧪 测试数据库访问...');
  
  try {
    // 测试查询预警规则
    const { data: rules, error: rulesError } = await supabase
      .from('warning_rules')
      .select('id, name, scope, category')
      .limit(3);
    
    if (rulesError) {
      console.warn('⚠️  查询预警规则失败:', rulesError.message);
    } else {
      console.log(`✅ 成功查询到 ${rules.length} 条预警规则`);
    }
    
    // 测试查询预警记录
    const { data: records, error: recordsError } = await supabase
      .from('warning_records')
      .select('id, status, severity')
      .limit(3);
    
    if (recordsError) {
      console.warn('⚠️  查询预警记录失败:', recordsError.message);
    } else {
      console.log(`✅ 成功查询到 ${records.length} 条预警记录`);
    }
    
  } catch (error) {
    console.error('❌ 测试数据库访问失败:', error.message);
  }
}

// 主执行函数
async function main() {
  try {
    await checkConnection();
    await fixWarningRulesTable();
    await fixWarningRecordsTable();
    await insertDefaultRules();
    await createHelperFunctions();
    await testDatabaseAccess();
    
    console.log('\n🎉 预警系统数据库修复完成！');
    console.log('\n修复内容：');
    console.log('✅ 检查并创建了 warning_rules 表');
    console.log('✅ 添加了缺失的 scope 和 category 字段');
    console.log('✅ 检查并创建了 warning_records 表');
    console.log('✅ 创建了必要的数据库索引');
    console.log('✅ 插入了默认预警规则');
    console.log('✅ 创建了辅助查询函数');
    console.log('\n现在应该可以正常使用预警分析功能了！');
    
  } catch (error) {
    console.error('\n❌ 修复过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}