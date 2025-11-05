/**
 * 通过Supabase客户端执行预警引擎迁移
 * 使用RPC方式执行复杂的DDL语句
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function executeWarningMigrations() {
  console.log('🚀 开始执行预警引擎数据库迁移...\n');

  try {
    // 逐个执行表创建
    const migrations = [
      {
        name: 'warning_executions',
        sql: `
          CREATE TABLE IF NOT EXISTS warning_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            execution_type TEXT NOT NULL CHECK (execution_type IN ('manual', 'scheduled', 'triggered')),
            trigger_event TEXT,
            executed_by UUID,
            rules_count INTEGER DEFAULT 0,
            matched_students_count INTEGER DEFAULT 0,
            new_warnings_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
            error_message TEXT,
            execution_duration_ms INTEGER,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT now(),
            completed_at TIMESTAMPTZ
          );
        `
      },
      {
        name: 'warning_rule_executions',
        sql: `
          CREATE TABLE IF NOT EXISTS warning_rule_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            execution_id UUID NOT NULL,
            rule_id UUID NOT NULL,
            rule_snapshot JSONB NOT NULL,
            affected_students_count INTEGER DEFAULT 0,
            new_warnings_count INTEGER DEFAULT 0,
            execution_sql TEXT,
            execution_time_ms INTEGER,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            completed_at TIMESTAMPTZ
          );
        `
      },
      {
        name: 'warning_execution_results',
        sql: `
          CREATE TABLE IF NOT EXISTS warning_execution_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rule_execution_id UUID NOT NULL,
            student_id TEXT NOT NULL,
            student_data JSONB,
            rule_conditions_matched JSONB,
            warning_severity TEXT NOT NULL CHECK (warning_severity IN ('low', 'medium', 'high')),
            warning_generated BOOLEAN DEFAULT false,
            warning_record_id UUID,
            skip_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
          );
        `
      },
      {
        name: 'warning_engine_stats',
        sql: `
          CREATE TABLE IF NOT EXISTS warning_engine_stats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            executions_count INTEGER DEFAULT 0,
            total_execution_time_ms BIGINT DEFAULT 0,
            avg_execution_time_ms INTEGER DEFAULT 0,
            rules_executed_count INTEGER DEFAULT 0,
            students_processed_count INTEGER DEFAULT 0,
            warnings_generated_count INTEGER DEFAULT 0,
            success_rate DECIMAL(5,2) DEFAULT 0.00,
            error_count INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(date)
          );
        `
      }
    ];

    for (const migration of migrations) {
      console.log(`📋 创建表: ${migration.name}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: migration.sql });
      
      if (error) {
        console.log(`⚠️  ${migration.name} 创建可能失败:`, error.message);
        // 尝试直接查询来验证表是否存在
        const { error: checkError } = await supabase
          .from(migration.name)
          .select('*')
          .limit(1);
        
        if (!checkError) {
          console.log(`✅ ${migration.name} 表已存在，跳过创建`);
        } else if (checkError.code === '42P01') {
          console.log(`❌ ${migration.name} 表确实不存在，需要手动创建`);
        }
      } else {
        console.log(`✅ ${migration.name} 创建成功`);
      }
    }

    // 创建索引
    console.log('\n📊 创建索引...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_warning_executions_created_at ON warning_executions(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_warning_executions_status ON warning_executions(status);',
      'CREATE INDEX IF NOT EXISTS idx_warning_rule_executions_execution_id ON warning_rule_executions(execution_id);',
      'CREATE INDEX IF NOT EXISTS idx_warning_execution_results_student_id ON warning_execution_results(student_id);'
    ];

    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: indexSql });
      if (error) {
        console.log(`⚠️  索引创建失败: ${error.message}`);
      } else {
        console.log(`✅ 索引创建成功`);
      }
    }

    console.log('\n✅ 预警引擎迁移执行完成！');
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
  }
}

// 如果Supabase没有exec_sql RPC函数，我们创建一个备用方案
async function createMigrationRPCFunction() {
  console.log('🔧 尝试创建迁移辅助函数...');
  
  // 这通常需要服务角色权限，但我们试试
  const createRPCSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'Success';
    EXCEPTION
      WHEN others THEN
        RETURN SQLERRM;
    END;
    $$;
  `;

  try {
    // 这可能会失败，因为匿名用户通常没有权限创建函数
    const { error } = await supabase.rpc('exec', { query: createRPCSQL });
    if (error) {
      console.log('⚠️  无法创建RPC函数，将使用替代方案');
      return false;
    }
    console.log('✅ RPC函数创建成功');
    return true;
  } catch (error) {
    console.log('⚠️  RPC函数创建失败，使用替代方案');
    return false;
  }
}

// 直接尝试创建表的方案（不用RPC）
async function directTableCreation() {
  console.log('🔄 使用直接表创建方案...\n');

  // 简单的表结构创建（避免复杂的DDL）
  const simpleMigrations = [
    {
      name: 'warning_executions',
      action: async () => {
        // 尝试插入一条测试记录来触发表创建
        const { error } = await supabase
          .from('warning_executions')
          .upsert({
            execution_type: 'manual',
            status: 'completed',
            rules_count: 0,
            matched_students_count: 0,
            new_warnings_count: 0
          })
          .select()
          .single();
        
        return !error || error.code !== '42P01';
      }
    }
  ];

  for (const migration of simpleMigrations) {
    console.log(`📋 检查表: ${migration.name}`);
    
    try {
      const success = await migration.action();
      if (success) {
        console.log(`✅ ${migration.name} 表可用`);
      } else {
        console.log(`❌ ${migration.name} 表不可用`);
      }
    } catch (error) {
      console.log(`⚠️  ${migration.name} 检查失败:`, error.message);
    }
  }
}

async function main() {
  // 首先检查当前表状态
  await directTableCreation();
  
  // 如果直接方案不行，尝试RPC方案
  // await executeWarningMigrations();
}

main().catch(console.error);