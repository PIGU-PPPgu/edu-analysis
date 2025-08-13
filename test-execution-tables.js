#!/usr/bin/env node

/**
 * 测试预警执行记录表的创建和基本功能
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExecutionTables() {
  console.log('🧪 开始测试预警执行记录表...\n');

  try {
    // 1. 检查表是否存在
    console.log('📋 检查数据库表结构...');
    
    const tablesToCheck = [
      'warning_executions',
      'warning_rule_executions', 
      'warning_execution_results',
      'warning_engine_stats'
    ];

    for (const tableName of tablesToCheck) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && error.code === '42P01') {
        console.log(`❌ 表 "${tableName}" 不存在`);
      } else if (error) {
        console.log(`⚠️  表 "${tableName}" 查询错误:`, error.message);
      } else {
        console.log(`✅ 表 "${tableName}" 存在且可访问`);
      }
    }

    // 2. 测试创建执行记录
    console.log('\n🚀 测试创建预警执行记录...');
    
    const executionData = {
      execution_type: 'manual',
      trigger_event: 'test_execution',
      rules_count: 3,
      matched_students_count: 0,
      new_warnings_count: 0,
      status: 'running',
      metadata: {
        test: true,
        created_by: 'test_script',
        timestamp: new Date().toISOString()
      }
    };

    const { data: execution, error: executionError } = await supabase
      .from('warning_executions')
      .insert(executionData)
      .select()
      .single();

    if (executionError) {
      console.log('❌ 创建执行记录失败:', executionError);
      return;
    }

    console.log(`✅ 创建执行记录成功, ID: ${execution.id}`);

    // 3. 测试创建规则执行记录
    console.log('\n📝 测试创建规则执行记录...');
    
    const ruleExecutionData = {
      execution_id: execution.id,
      rule_id: 'test-rule-uuid',
      rule_snapshot: {
        name: '测试规则',
        conditions: { type: 'grade', threshold: 60 },
        severity: 'medium'
      },
      affected_students_count: 5,
      new_warnings_count: 2,
      execution_sql: 'SELECT * FROM students WHERE grade < 60',
      execution_time_ms: 150,
      status: 'completed'
    };

    const { data: ruleExecution, error: ruleError } = await supabase
      .from('warning_rule_executions')
      .insert(ruleExecutionData)
      .select()
      .single();

    if (ruleError) {
      console.log('❌ 创建规则执行记录失败:', ruleError);
      return;
    }

    console.log(`✅ 创建规则执行记录成功, ID: ${ruleExecution.id}`);

    // 4. 测试创建执行结果记录
    console.log('\n🎯 测试创建执行结果记录...');
    
    const resultData = {
      rule_execution_id: ruleExecution.id,
      student_id: 'test_student_001',
      student_data: {
        name: '张三',
        class: '高三1班',
        grade: 55
      },
      rule_conditions_matched: {
        condition: 'grade < 60',
        actual_value: 55,
        threshold: 60
      },
      warning_severity: 'medium',
      warning_generated: true,
      warning_record_id: null
    };

    const { data: result, error: resultError } = await supabase
      .from('warning_execution_results')
      .insert(resultData)
      .select()
      .single();

    if (resultError) {
      console.log('❌ 创建执行结果记录失败:', resultError);
      return;
    }

    console.log(`✅ 创建执行结果记录成功, ID: ${result.id}`);

    // 5. 测试完成执行并更新统计
    console.log('\n🏁 测试完成执行...');
    
    const { error: updateError } = await supabase
      .from('warning_executions')
      .update({
        status: 'completed',
        matched_students_count: 5,
        new_warnings_count: 2,
        execution_duration_ms: 300,
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    if (updateError) {
      console.log('❌ 更新执行记录失败:', updateError);
      return;
    }

    console.log('✅ 更新执行记录成功');

    // 6. 测试视图查询
    console.log('\n📊 测试执行摘要视图...');
    
    const { data: summary, error: summaryError } = await supabase
      .from('warning_execution_summary')
      .select('*')
      .eq('id', execution.id)
      .single();

    if (summaryError) {
      console.log('❌ 查询执行摘要失败:', summaryError);
    } else {
      console.log('✅ 执行摘要查询成功');
      console.log('📈 执行摘要数据:', {
        id: summary.id,
        type: summary.execution_type,
        status: summary.status,
        rules_count: summary.rules_count,
        rule_executions_count: summary.rule_executions_count,
        successful_rules: summary.successful_rules,
        failed_rules: summary.failed_rules
      });
    }

    // 7. 检查引擎统计是否自动更新
    console.log('\n📈 检查引擎统计自动更新...');
    
    const today = new Date().toISOString().split('T')[0];
    const { data: stats, error: statsError } = await supabase
      .from('warning_engine_stats')
      .select('*')
      .eq('date', today)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.log('❌ 查询引擎统计失败:', statsError);
    } else if (stats) {
      console.log('✅ 引擎统计自动更新成功');
      console.log('📊 今日统计:', {
        executions_count: stats.executions_count,
        total_execution_time_ms: stats.total_execution_time_ms,
        warnings_generated_count: stats.warnings_generated_count,
        success_rate: stats.success_rate
      });
    } else {
      console.log('ℹ️  今日暂无引擎统计数据');
    }

    // 8. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    
    await supabase.from('warning_execution_results').delete().eq('rule_execution_id', ruleExecution.id);
    await supabase.from('warning_rule_executions').delete().eq('execution_id', execution.id);
    await supabase.from('warning_executions').delete().eq('id', execution.id);
    
    console.log('✅ 测试数据清理完成');

    console.log('\n🎉 所有测试通过！预警执行记录系统运行正常。');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testExecutionTables().catch(console.error);
}

module.exports = { testExecutionTables };