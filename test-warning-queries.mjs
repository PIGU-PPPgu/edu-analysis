#!/usr/bin/env node

// 测试警告系统的具体查询逻辑
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 警告系统查询逻辑测试');
console.log('=======================');

async function testWarningQueries() {
  
  // 1. 测试基本的警告获取查询
  console.log('\n1️⃣ 测试基本警告获取查询');
  console.log('============================');
  
  try {
    const { data: basicWarnings, error: basicError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        rule_id,
        status,
        created_at,
        details,
        warning_rules (
          name,
          severity,
          description
        ),
        students (
          name,
          class_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (basicError) {
      console.log(`❌ 基本查询失败: ${basicError.message}`);
    } else {
      console.log(`✅ 成功获取 ${basicWarnings.length} 条警告记录`);
      
      // 显示前3条记录的详细信息
      console.log('\n📋 前3条警告详情:');
      basicWarnings.slice(0, 3).forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.students?.name || '未知学生'} (${warning.student_id})`);
        console.log(`     班级: ${warning.students?.class_name || '未知班级'}`);
        console.log(`     警告: ${warning.warning_rules?.name || '未知规则'}`);
        console.log(`     严重程度: ${warning.warning_rules?.severity || 'N/A'}`);
        console.log(`     状态: ${warning.status}`);
        console.log(`     时间: ${new Date(warning.created_at).toLocaleString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log(`❌ 测试基本查询时出错: ${error.message}`);
  }
  
  // 2. 测试按时间范围筛选
  console.log('\n2️⃣ 测试时间范围筛选');
  console.log('===================');
  
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    console.log(`查询范围: ${sixtyDaysAgo.toLocaleDateString()} 到 ${now.toLocaleDateString()}`);
    
    const { data: timeRangeWarnings, error: timeError } = await supabase
      .from('warning_records')
      .select('*')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lte('created_at', now.toISOString());
    
    if (timeError) {
      console.log(`❌ 时间范围查询失败: ${timeError.message}`);
    } else {
      console.log(`✅ 最近60天警告记录: ${timeRangeWarnings.length} 条`);
      
      // 按月份统计
      const monthlyStats = {};
      timeRangeWarnings.forEach(warning => {
        const month = new Date(warning.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' });
        monthlyStats[month] = (monthlyStats[month] || 0) + 1;
      });
      
      console.log('\n📊 按月份统计:');
      Object.entries(monthlyStats).forEach(([month, count]) => {
        console.log(`  ${month}: ${count} 条`);
      });
    }
  } catch (error) {
    console.log(`❌ 测试时间范围查询时出错: ${error.message}`);
  }
  
  // 3. 测试按状态筛选
  console.log('\n3️⃣ 测试按状态筛选');
  console.log('=================');
  
  const statuses = ['resolved', 'dismissed', 'active'];
  
  for (const status of statuses) {
    try {
      const { data: statusWarnings, error: statusError } = await supabase
        .from('warning_records')
        .select('id, student_id, status, created_at')
        .eq('status', status);
      
      if (statusError) {
        console.log(`❌ 查询状态 ${status} 失败: ${statusError.message}`);
      } else {
        console.log(`✅ 状态为 ${status} 的警告: ${statusWarnings.length} 条`);
      }
    } catch (error) {
      console.log(`❌ 测试状态筛选时出错: ${error.message}`);
    }
  }
  
  // 4. 测试按严重程度筛选
  console.log('\n4️⃣ 测试按严重程度筛选');
  console.log('=====================');
  
  try {
    const { data: severityWarnings, error: severityError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        status,
        warning_rules (
          severity
        )
      `)
      .not('warning_rules.severity', 'is', null);
    
    if (severityError) {
      console.log(`❌ 严重程度查询失败: ${severityError.message}`);
    } else {
      console.log(`✅ 成功获取有严重程度的警告: ${severityWarnings.length} 条`);
      
      // 统计严重程度分布
      const severityStats = {};
      severityWarnings.forEach(warning => {
        const severity = warning.warning_rules?.severity;
        if (severity) {
          severityStats[severity] = (severityStats[severity] || 0) + 1;
        }
      });
      
      console.log('\n📊 严重程度统计:');
      Object.entries(severityStats).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count} 条`);
      });
    }
  } catch (error) {
    console.log(`❌ 测试严重程度筛选时出错: ${error.message}`);
  }
  
  // 5. 测试按班级筛选
  console.log('\n5️⃣ 测试按班级筛选');
  console.log('=================');
  
  try {
    // 先获取有警告的班级
    const { data: classWarnings, error: classError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        students (
          class_name
        )
      `)
      .not('students.class_name', 'is', null);
    
    if (classError) {
      console.log(`❌ 班级筛选查询失败: ${classError.message}`);
    } else {
      console.log(`✅ 成功获取有班级信息的警告: ${classWarnings.length} 条`);
      
      // 统计班级分布
      const classStats = {};
      classWarnings.forEach(warning => {
        const className = warning.students?.class_name;
        if (className) {
          classStats[className] = (classStats[className] || 0) + 1;
        }
      });
      
      console.log('\n📊 班级警告统计:');
      Object.entries(classStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([className, count]) => {
          console.log(`  ${className}: ${count} 条警告`);
        });
    }
  } catch (error) {
    console.log(`❌ 测试班级筛选时出错: ${error.message}`);
  }
  
  // 6. 测试组合查询
  console.log('\n6️⃣ 测试组合查询');
  console.log('===============');
  
  try {
    // 查询最近30天的高危警告
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: combinedWarnings, error: combinedError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        status,
        created_at,
        warning_rules (
          name,
          severity
        ),
        students (
          name,
          class_name
        )
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'resolved');
    
    if (combinedError) {
      console.log(`❌ 组合查询失败: ${combinedError.message}`);
    } else {
      console.log(`✅ 最近30天已解决的警告: ${combinedWarnings.length} 条`);
      
      if (combinedWarnings.length > 0) {
        console.log('\n📋 示例记录:');
        combinedWarnings.slice(0, 3).forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning.students?.name} (${warning.students?.class_name})`);
          console.log(`     警告: ${warning.warning_rules?.name}`);
          console.log(`     严重程度: ${warning.warning_rules?.severity}`);
          console.log(`     解决时间: ${new Date(warning.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }
  } catch (error) {
    console.log(`❌ 测试组合查询时出错: ${error.message}`);
  }
  
  // 7. 测试统计查询
  console.log('\n7️⃣ 测试统计查询');
  console.log('===============');
  
  try {
    // 获取每个学生的警告数量
    const { data: studentStats, error: statsError } = await supabase
      .from('warning_records')
      .select(`
        student_id,
        students (
          name,
          class_name
        )
      `);
    
    if (statsError) {
      console.log(`❌ 统计查询失败: ${statsError.message}`);
    } else {
      console.log(`✅ 成功获取学生警告统计数据`);
      
      // 统计每个学生的警告数量
      const studentWarningCount = {};
      studentStats.forEach(warning => {
        const studentId = warning.student_id;
        const studentName = warning.students?.name || '未知学生';
        const className = warning.students?.class_name || '未知班级';
        
        if (!studentWarningCount[studentId]) {
          studentWarningCount[studentId] = {
            name: studentName,
            class_name: className,
            count: 0
          };
        }
        studentWarningCount[studentId].count++;
      });
      
      console.log('\n📊 学生警告排行榜:');
      Object.entries(studentWarningCount)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([studentId, data], index) => {
          console.log(`  ${index + 1}. ${data.name} (${data.class_name}): ${data.count} 条警告`);
        });
    }
  } catch (error) {
    console.log(`❌ 测试统计查询时出错: ${error.message}`);
  }
  
  // 8. 测试性能查询
  console.log('\n8️⃣ 测试查询性能');
  console.log('===============');
  
  try {
    const startTime = Date.now();
    
    const { data: perfWarnings, error: perfError } = await supabase
      .from('warning_records')
      .select(`
        id,
        student_id,
        rule_id,
        status,
        created_at,
        details,
        warning_rules (
          name,
          severity,
          description
        ),
        students (
          name,
          class_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (perfError) {
      console.log(`❌ 性能测试查询失败: ${perfError.message}`);
    } else {
      console.log(`✅ 性能测试完成:`);
      console.log(`  查询时间: ${queryTime}ms`);
      console.log(`  返回记录: ${perfWarnings.length} 条`);
      console.log(`  平均每条记录: ${(queryTime / perfWarnings.length).toFixed(2)}ms`);
    }
  } catch (error) {
    console.log(`❌ 测试查询性能时出错: ${error.message}`);
  }
  
  console.log('\n✅ 查询逻辑测试完成!');
  console.log('===================');
}

// 运行测试
testWarningQueries().catch(console.error);