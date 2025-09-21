/**
 * 完整的预警引擎功能测试
 * 验证端到端数据流：前端→Edge Function→数据库→预警记录
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testCompleteWarningEngine() {
  console.log('🔥 完整预警引擎测试开始\n');

  try {
    // 1. 测试预警规则是否存在
    console.log('=== 1. 检查预警规则配置 ===');
    const { data: rules, error: rulesError } = await supabase
      .from('warning_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      console.error('❌ 获取预警规则失败:', rulesError);
      return;
    }

    console.log(`✅ 发现${rules?.length || 0}条活跃预警规则:`);
    rules?.forEach(rule => {
      console.log(`  📋 ${rule.name} (${rule.severity}) - ${rule.description}`);
    });

    // 2. 检查学生数据基础
    console.log('\n=== 2. 检查学生数据基础 ===');
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('student_id, name, class_name')
      .limit(10);

    if (studentsError) {
      console.error('❌ 获取学生数据失败:', studentsError);
      return;
    }

    console.log(`✅ 学生数据样本(${studentsData?.length || 0}条):`);
    studentsData?.slice(0, 3).forEach(student => {
      console.log(`  👤 ${student.name} (${student.student_id}) - ${student.class_name}`);
    });

    // 3. 检查成绩数据
    console.log('\n=== 3. 检查成绩数据基础 ===');
    const { data: gradesData, error: gradesError } = await supabase
      .from('grade_data_new')
      .select('student_id, total_score, exam_type, exam_date')
      .not('total_score', 'is', null)
      .order('exam_date', { ascending: false })
      .limit(10);

    if (gradesError) {
      console.error('❌ 获取成绩数据失败:', gradesError);
      return;
    }

    console.log(`✅ 成绩数据样本(${gradesData?.length || 0}条):`);
    gradesData?.slice(0, 3).forEach(grade => {
      console.log(`  📊 ${grade.student_id}: ${grade.total_score}分 (${grade.exam_type})`);
    });

    // 4. 调用预警引擎Edge Function
    console.log('\n=== 4. 调用预警引擎Edge Function ===');
    const startTime = Date.now();

    const { data: functionResult, error: functionError } = await supabase.functions.invoke('warning-engine', {
      body: {
        action: 'execute_all_rules',
        debug: true
      }
    });

    const executionTime = Date.now() - startTime;

    if (functionError) {
      console.error('❌ 调用预警引擎失败:', functionError);
      return;
    }

    console.log(`✅ 预警引擎执行完成 (耗时: ${executionTime}ms)`);
    console.log('执行结果:', JSON.stringify(functionResult, null, 2));

    // 5. 检查预警记录是否生成
    console.log('\n=== 5. 检查预警记录生成情况 ===');

    // 等待一下确保数据写入完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: warningRecords, error: recordsError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        rule_id,
        status,
        details,
        created_at,
        warning_rules(name, severity)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recordsError) {
      console.error('❌ 获取预警记录失败:', recordsError);
      return;
    }

    console.log(`✅ 最新预警记录(${warningRecords?.length || 0}条):`);

    // 按规则类型分组统计
    const recordsByRule = new Map();
    warningRecords?.forEach(record => {
      const ruleName = record.warning_rules?.name || '未知规则';
      if (!recordsByRule.has(ruleName)) {
        recordsByRule.set(ruleName, []);
      }
      recordsByRule.get(ruleName).push(record);
    });

    Array.from(recordsByRule.entries()).forEach(([ruleName, records]) => {
      console.log(`  ⚠️  ${ruleName}: ${records.length}条记录`);
      records.slice(0, 2).forEach(record => {
        const detail = record.details || {};
        console.log(`    - 学生${record.student_id}: ${detail.description || 'N/A'}`);
      });
    });

    // 6. 测试数据统计功能
    console.log('\n=== 6. 测试预警统计功能 ===');

    // 按严重程度统计
    const severityStats = new Map();
    warningRecords?.forEach(record => {
      const severity = record.warning_rules?.severity || 'unknown';
      severityStats.set(severity, (severityStats.get(severity) || 0) + 1);
    });

    console.log('按严重程度统计:');
    Array.from(severityStats.entries()).forEach(([severity, count]) => {
      console.log(`  🔴 ${severity}: ${count}条`);
    });

    // 按状态统计
    const statusStats = new Map();
    warningRecords?.forEach(record => {
      const status = record.status;
      statusStats.set(status, (statusStats.get(status) || 0) + 1);
    });

    console.log('按状态统计:');
    Array.from(statusStats.entries()).forEach(([status, count]) => {
      console.log(`  📊 ${status}: ${count}条`);
    });

    // 7. 验证预警引擎执行历史
    console.log('\n=== 7. 检查预警引擎执行历史 ===');

    const { data: executions, error: execError } = await supabase
      .from('warning_engine_executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    if (execError) {
      console.log('⚠️  无法获取执行历史 (可能表不存在):', execError.message);
    } else {
      console.log(`✅ 最近执行历史(${executions?.length || 0}条):`);
      executions?.forEach(exec => {
        const duration = exec.completed_at ?
          new Date(exec.completed_at) - new Date(exec.started_at) :
          'N/A';
        console.log(`  🕐 ${exec.started_at}: ${exec.status} (耗时: ${duration}ms)`);
      });
    }

    // 8. 性能测试 - 多次调用
    console.log('\n=== 8. 性能测试 - 连续调用3次 ===');
    const performanceResults = [];

    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const { data: perfResult, error: perfError } = await supabase.functions.invoke('warning-engine', {
        body: { action: 'execute_all_rules' }
      });
      const duration = Date.now() - start;

      performanceResults.push({
        call: i + 1,
        duration,
        success: !perfError,
        newWarnings: perfResult?.results?.summary?.new_warnings || 0
      });

      console.log(`  ⏱️  调用${i + 1}: ${duration}ms ${perfError ? '❌' : '✅'}`);

      // 避免过于频繁调用
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const avgDuration = performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;
    console.log(`📈 平均执行时间: ${Math.round(avgDuration)}ms`);

    console.log('\n✅ 完整预警引擎测试完成！');
    console.log('\n📋 测试总结:');
    console.log(`- 预警规则: ${rules?.length || 0}条活跃`);
    console.log(`- 学生数据: ${studentsData?.length || 0}+条记录`);
    console.log(`- 成绩数据: ${gradesData?.length || 0}+条记录`);
    console.log(`- 预警记录: ${warningRecords?.length || 0}条最新`);
    console.log(`- 执行性能: 平均${Math.round(avgDuration)}ms`);
    console.log(`- 数据流状态: ${functionError ? '❌ 异常' : '✅ 正常'}`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testCompleteWarningEngine().catch(console.error);