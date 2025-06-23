#!/usr/bin/env node

// 最终的数据库状态验证报告
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('📋 最终数据库状态验证报告');
console.log('==========================');
console.log(`检查时间: ${new Date().toLocaleString()}`);

async function generateFinalReport() {
  const report = {
    tableStats: {},
    dataQuality: {},
    queryPerformance: {},
    issues: [],
    recommendations: []
  };

  // 1. 表统计信息
  console.log('\n📊 表统计信息');
  console.log('==============');
  
  const tables = ['warning_records', 'warning_rules', 'students', 'grade_data', 'exams'];
  
  for (const table of tables) {
    try {
      const startTime = Date.now();
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      const queryTime = Date.now() - startTime;
      
      if (error) {
        report.tableStats[table] = { status: 'error', error: error.message };
        report.issues.push(`${table} 表查询失败: ${error.message}`);
      } else {
        report.tableStats[table] = { 
          status: 'ok', 
          count: count || 0,
          queryTime: queryTime
        };
        console.log(`✅ ${table}: ${count || 0} 条记录 (${queryTime}ms)`);
      }
    } catch (error) {
      report.tableStats[table] = { status: 'error', error: error.message };
      report.issues.push(`${table} 表查询异常: ${error.message}`);
    }
  }

  // 2. 警告记录详细分析
  console.log('\n🚨 警告记录分析');
  console.log('================');
  
  try {
    const { data: warnings, error: warningError } = await supabase
      .from('warning_records')
      .select(`
        *,
        warning_rules(name, severity, description),
        students(name, student_id, class_name)
      `)
      .order('created_at', { ascending: false });
    
    if (warningError) {
      report.issues.push(`警告记录关联查询失败: ${warningError.message}`);
      console.log(`❌ 警告记录关联查询失败: ${warningError.message}`);
    } else {
      const stats = {
        total: warnings.length,
        byStatus: {},
        bySeverity: {},
        byStudent: {},
        withMissingData: 0
      };
      
      warnings.forEach(warning => {
        // 按状态统计
        stats.byStatus[warning.status] = (stats.byStatus[warning.status] || 0) + 1;
        
        // 按严重程度统计
        const severity = warning.warning_rules?.severity || 'unknown';
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        
        // 按学生统计
        const studentName = warning.students?.name || 'unknown';
        stats.byStudent[studentName] = (stats.byStudent[studentName] || 0) + 1;
        
        // 检查缺失数据
        if (!warning.students || !warning.warning_rules) {
          stats.withMissingData++;
        }
      });
      
      report.dataQuality.warningRecords = stats;
      
      console.log(`✅ 警告记录总数: ${stats.total}`);
      console.log('📈 状态分布:');
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 条`);
      });
      
      console.log('📈 严重程度分布:');
      Object.entries(stats.bySeverity).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count} 条`);
      });
      
      if (stats.withMissingData > 0) {
        report.issues.push(`${stats.withMissingData} 条警告记录存在关联数据缺失`);
        console.log(`⚠️  ${stats.withMissingData} 条记录存在关联数据缺失`);
      }
    }
  } catch (error) {
    report.issues.push(`警告记录分析失败: ${error.message}`);
  }

  // 3. 数据完整性检查
  console.log('\n🔍 数据完整性检查');
  console.log('==================');
  
  try {
    // 检查孤立的警告记录
    const { data: orphanWarnings } = await supabase
      .from('warning_records')
      .select('id, student_id, rule_id')
      .or('student_id.is.null,rule_id.is.null');
    
    if (orphanWarnings && orphanWarnings.length > 0) {
      report.issues.push(`发现 ${orphanWarnings.length} 条孤立警告记录`);
      console.log(`⚠️  发现 ${orphanWarnings.length} 条孤立警告记录`);
    } else {
      console.log('✅ 所有警告记录都有有效的关联数据');
    }
    
    // 检查无效的学生引用
    const { data: invalidStudentRefs } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        students(id)
      `)
      .is('students.id', null);
    
    if (invalidStudentRefs && invalidStudentRefs.length > 0) {
      report.issues.push(`发现 ${invalidStudentRefs.length} 条警告记录引用了不存在的学生`);
      console.log(`⚠️  发现 ${invalidStudentRefs.length} 条警告记录引用了不存在的学生`);
    } else {
      console.log('✅ 所有警告记录都引用了有效的学生');
    }
    
    // 检查无效的规则引用
    const { data: invalidRuleRefs } = await supabase
      .from('warning_records')
      .select(`
        id,
        rule_id,
        warning_rules(id)
      `)
      .is('warning_rules.id', null);
    
    if (invalidRuleRefs && invalidRuleRefs.length > 0) {
      report.issues.push(`发现 ${invalidRuleRefs.length} 条警告记录引用了不存在的规则`);
      console.log(`⚠️  发现 ${invalidRuleRefs.length} 条警告记录引用了不存在的规则`);
    } else {
      console.log('✅ 所有警告记录都引用了有效的规则');
    }
    
  } catch (error) {
    report.issues.push(`数据完整性检查失败: ${error.message}`);
  }

  // 4. 查询性能测试
  console.log('\n⚡ 查询性能测试');
  console.log('================');
  
  const performanceTests = [
    {
      name: '获取所有警告记录',
      query: () => supabase.from('warning_records').select('*').order('created_at', { ascending: false })
    },
    {
      name: '获取警告记录(含关联)',
      query: () => supabase.from('warning_records').select(`
        *,
        warning_rules(name, severity),
        students(name, class_name)
      `).order('created_at', { ascending: false })
    },
    {
      name: '按状态筛选',
      query: () => supabase.from('warning_records').select('*').eq('status', 'resolved')
    },
    {
      name: '按时间范围筛选',
      query: () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return supabase.from('warning_records').select('*')
          .gte('created_at', thirtyDaysAgo.toISOString());
      }
    }
  ];
  
  for (const test of performanceTests) {
    try {
      const startTime = Date.now();
      const { data, error } = await test.query();
      const queryTime = Date.now() - startTime;
      
      if (error) {
        console.log(`❌ ${test.name}: 查询失败 (${error.message})`);
        report.issues.push(`${test.name} 查询失败: ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: ${queryTime}ms (${data.length} 条记录)`);
        
        if (queryTime > 1000) {
          report.recommendations.push(`${test.name} 查询较慢 (${queryTime}ms)，建议优化`);
        }
      }
      
      report.queryPerformance[test.name] = {
        queryTime,
        recordCount: data ? data.length : 0,
        success: !error
      };
    } catch (error) {
      console.log(`❌ ${test.name}: 查询异常 (${error.message})`);
      report.issues.push(`${test.name} 查询异常: ${error.message}`);
    }
  }

  // 5. 生成总结报告
  console.log('\n📋 检查结果总结');
  console.log('================');
  
  const totalRecords = Object.values(report.tableStats)
    .filter(stat => stat.status === 'ok')
    .reduce((sum, stat) => sum + stat.count, 0);
  
  console.log(`📊 数据库总记录数: ${totalRecords}`);
  console.log(`🚨 警告记录数: ${report.tableStats.warning_records?.count || 0}`);
  console.log(`📏 警告规则数: ${report.tableStats.warning_rules?.count || 0}`);
  console.log(`👥 学生数: ${report.tableStats.students?.count || 0}`);
  console.log(`📊 成绩记录数: ${report.tableStats.grade_data?.count || 0}`);
  
  if (report.issues.length > 0) {
    console.log('\n❌ 发现的问题:');
    report.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ 未发现数据问题');
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 优化建议:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  // 6. 数据可用性评分
  console.log('\n🏆 数据可用性评分');
  console.log('==================');
  
  let score = 100;
  
  // 扣分项
  if (report.tableStats.warning_records?.count === 0) score -= 20;
  if (report.tableStats.warning_rules?.count === 0) score -= 15;
  if (report.issues.length > 0) score -= report.issues.length * 5;
  if (report.recommendations.length > 0) score -= report.recommendations.length * 2;
  
  score = Math.max(0, score);
  
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  
  console.log(`评分: ${score}/100 (等级: ${grade})`);
  
  if (grade === 'A') {
    console.log('🎉 数据库状态优秀，系统可正常使用！');
  } else if (grade === 'B') {
    console.log('👍 数据库状态良好，有小问题但不影响使用');
  } else if (grade === 'C') {
    console.log('⚠️  数据库状态一般，建议解决发现的问题');
  } else {
    console.log('🚨 数据库状态较差，需要立即修复问题');
  }

  // 保存报告到文件
  const reportData = {
    timestamp: new Date().toISOString(),
    score,
    grade,
    ...report
  };
  
  console.log('\n📄 报告已生成');
  return reportData;
}

// 运行验证
generateFinalReport()
  .then(report => {
    console.log('\n✅ 数据库验证完成');
  })
  .catch(error => {
    console.error('❌ 验证过程出错:', error);
  });