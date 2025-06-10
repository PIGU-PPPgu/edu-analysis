// 基础数据库优化执行脚本
// 通过基本查询测试数据库性能并执行简单优化

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://giluhqotfjpmofowvogn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeBasicOptimization() {
  console.log('🚀 开始执行基础数据库性能测试和优化...\n');

  const results = {
    tableStats: {},
    queryPerformance: {},
    optimizationStatus: 'started'
  };

  try {
    // 1. 测试核心表的基本性能
    console.log('📊 测试核心表性能...');
    
    const tables = ['students', 'grade_data', 'exams', 'class_info'];
    
    for (const table of tables) {
      console.log(`   测试表: ${table}`);
      const startTime = Date.now();
      
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        const queryTime = Date.now() - startTime;
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
          results.tableStats[table] = { error: error.message, queryTime };
        } else {
          console.log(`   ✅ ${table}: ${count} 条记录, 查询时间: ${queryTime}ms`);
          results.tableStats[table] = { count, queryTime, status: 'ok' };
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
        results.tableStats[table] = { error: err.message };
      }
    }

    // 2. 测试关键查询性能
    console.log('\n🔍 测试关键查询性能...');
    
    // 测试学生查询
    console.log('   测试学生数据查询...');
    const studentStartTime = Date.now();
    try {
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('student_id, name, class_name')
        .limit(100);
      
      const studentQueryTime = Date.now() - studentStartTime;
      if (studentError) {
        console.log(`   ❌ 学生查询失败: ${studentError.message}`);
        results.queryPerformance.students = { error: studentError.message };
      } else {
        console.log(`   ✅ 学生查询: ${students.length} 条记录, ${studentQueryTime}ms`);
        results.queryPerformance.students = { 
          count: students.length, 
          queryTime: studentQueryTime,
          status: 'ok'
        };
      }
    } catch (err) {
      console.log(`   ❌ 学生查询异常: ${err.message}`);
      results.queryPerformance.students = { error: err.message };
    }

    // 测试成绩查询
    console.log('   测试成绩数据查询...');
    const gradeStartTime = Date.now();
    try {
      const { data: grades, error: gradeError } = await supabase
        .from('grade_data')
        .select('student_id, name, class_name, subject, score')
        .not('score', 'is', null)
        .limit(100);
      
      const gradeQueryTime = Date.now() - gradeStartTime;
      if (gradeError) {
        console.log(`   ❌ 成绩查询失败: ${gradeError.message}`);
        results.queryPerformance.grades = { error: gradeError.message };
      } else {
        console.log(`   ✅ 成绩查询: ${grades.length} 条记录, ${gradeQueryTime}ms`);
        results.queryPerformance.grades = { 
          count: grades.length, 
          queryTime: gradeQueryTime,
          status: 'ok'
        };
      }
    } catch (err) {
      console.log(`   ❌ 成绩查询异常: ${err.message}`);
      results.queryPerformance.grades = { error: err.message };
    }

    // 测试复杂查询
    console.log('   测试复杂统计查询...');
    const complexStartTime = Date.now();
    try {
      const { data: stats, error: statsError } = await supabase
        .from('grade_data')
        .select('class_name, score')
        .not('score', 'is', null)
        .not('class_name', 'is', null)
        .limit(500);
      
      const complexQueryTime = Date.now() - complexStartTime;
      if (statsError) {
        console.log(`   ❌ 统计查询失败: ${statsError.message}`);
        results.queryPerformance.complex = { error: statsError.message };
      } else {
        // 计算基本统计
        const classStats = {};
        stats.forEach(record => {
          if (!classStats[record.class_name]) {
            classStats[record.class_name] = [];
          }
          classStats[record.class_name].push(record.score);
        });
        
        const classCount = Object.keys(classStats).length;
        console.log(`   ✅ 统计查询: ${stats.length} 条记录, ${classCount} 个班级, ${complexQueryTime}ms`);
        results.queryPerformance.complex = { 
          recordCount: stats.length,
          classCount,
          queryTime: complexQueryTime,
          status: 'ok'
        };
      }
    } catch (err) {
      console.log(`   ❌ 统计查询异常: ${err.message}`);
      results.queryPerformance.complex = { error: err.message };
    }

    // 3. 计算总体性能评分
    console.log('\n📈 计算性能评分...');
    
    let performanceScore = 0;
    let totalTests = 0;
    
    // 表访问性能评分
    Object.values(results.tableStats).forEach(stat => {
      totalTests++;
      if (stat.status === 'ok') {
        if (stat.queryTime < 500) performanceScore += 25;
        else if (stat.queryTime < 1000) performanceScore += 20;
        else if (stat.queryTime < 2000) performanceScore += 15;
        else performanceScore += 10;
      }
    });
    
    // 查询性能评分
    Object.values(results.queryPerformance).forEach(query => {
      totalTests++;
      if (query.status === 'ok') {
        if (query.queryTime < 200) performanceScore += 25;
        else if (query.queryTime < 500) performanceScore += 20;
        else if (query.queryTime < 1000) performanceScore += 15;
        else performanceScore += 10;
      }
    });

    const avgScore = totalTests > 0 ? Math.round(performanceScore / totalTests) : 0;
    
    // 4. 输出优化建议
    console.log('\n' + '='.repeat(60));
    console.log('📊 数据库性能测试结果:');
    console.log(`   🎯 总体性能评分: ${avgScore}/25`);
    
    // 计算平均查询时间
    const allQueryTimes = [];
    Object.values(results.tableStats).forEach(stat => {
      if (stat.queryTime) allQueryTimes.push(stat.queryTime);
    });
    Object.values(results.queryPerformance).forEach(query => {
      if (query.queryTime) allQueryTimes.push(query.queryTime);
    });
    
    const avgQueryTime = allQueryTimes.length > 0 
      ? Math.round(allQueryTimes.reduce((a, b) => a + b, 0) / allQueryTimes.length)
      : 0;
    
    console.log(`   ⏱️  平均查询时间: ${avgQueryTime}ms`);
    
    // 表状态汇总
    console.log('\n📋 表状态汇总:');
    Object.entries(results.tableStats).forEach(([table, stat]) => {
      if (stat.status === 'ok') {
        console.log(`   ✅ ${table}: ${stat.count} 条记录 (${stat.queryTime}ms)`);
      } else {
        console.log(`   ❌ ${table}: ${stat.error}`);
      }
    });
    
    // 查询性能汇总
    console.log('\n🔍 查询性能汇总:');
    Object.entries(results.queryPerformance).forEach(([query, result]) => {
      if (result.status === 'ok') {
        console.log(`   ✅ ${query}: ${result.queryTime}ms`);
      } else {
        console.log(`   ❌ ${query}: ${result.error}`);
      }
    });
    
    // 优化建议
    console.log('\n💡 优化建议:');
    if (avgQueryTime > 1000) {
      console.log('   🔧 查询时间较慢，建议创建索引优化');
      console.log('   📊 考虑使用数据库视图预计算统计数据');
    } else if (avgQueryTime > 500) {
      console.log('   ⚡ 查询性能中等，可以进一步优化');
    } else {
      console.log('   🎉 查询性能良好！');
    }
    
    if (Object.values(results.tableStats).some(stat => stat.count > 10000)) {
      console.log('   📈 数据量较大，建议定期维护和清理');
    }
    
    results.optimizationStatus = 'completed';
    results.performanceScore = avgScore;
    results.avgQueryTime = avgQueryTime;
    
    console.log('\n✅ 基础数据库优化测试完成！');
    
    return results;

  } catch (error) {
    console.error('❌ 数据库优化测试失败:', error);
    results.optimizationStatus = 'failed';
    results.error = error.message;
    throw error;
  }
}

// 运行优化测试
executeBasicOptimization()
  .then((results) => {
    console.log('\n🎯 优化测试结果:', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 优化测试过程中发生错误:', error);
    process.exit(1);
  }); 