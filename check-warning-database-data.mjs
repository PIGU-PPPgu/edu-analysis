#!/usr/bin/env node

// 检查警告系统相关数据库表的数据情况
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 检查警告系统数据库数据状态');
console.log('==================================');

// 表结构检查函数
async function checkTableStructure(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ 表 ${tableName} 不存在或无法访问: ${error.message}`);
      return false;
    } else {
      console.log(`✅ 表 ${tableName} 存在且可访问`);
      return true;
    }
  } catch (error) {
    console.log(`❌ 检查表 ${tableName} 时出错: ${error.message}`);
    return false;
  }
}

// 数据统计函数
async function getTableStats(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ 获取 ${tableName} 统计失败: ${error.message}`);
      return 0;
    } else {
      console.log(`  📊 ${tableName} 总记录数: ${count}`);
      return count;
    }
  } catch (error) {
    console.log(`  ❌ 统计 ${tableName} 时出错: ${error.message}`);
    return 0;
  }
}

// 获取表的示例数据
async function getSampleData(tableName, limit = 3) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.log(`  ❌ 获取 ${tableName} 示例数据失败: ${error.message}`);
      return null;
    } else {
      return data;
    }
  } catch (error) {
    console.log(`  ❌ 获取 ${tableName} 示例数据时出错: ${error.message}`);
    return null;
  }
}

async function checkWarningDatabase() {
  console.log('\n🔍 第一步: 检查表结构存在性');
  console.log('============================');
  
  const tables = ['warning_records', 'students', 'warning_rules', 'grade_data', 'exams'];
  const tableStatus = {};
  
  for (const table of tables) {
    tableStatus[table] = await checkTableStructure(table);
  }
  
  console.log('\n📊 第二步: 检查各表数据统计');
  console.log('============================');
  
  for (const table of tables) {
    if (tableStatus[table]) {
      await getTableStats(table);
    }
  }
  
  console.log('\n📋 第三步: 检查各表示例数据');
  console.log('============================');
  
  // 检查 warning_records 表
  if (tableStatus['warning_records']) {
    console.log('\n🚨 warning_records 表示例数据:');
    const warningData = await getSampleData('warning_records');
    if (warningData && warningData.length > 0) {
      warningData.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`);
        console.log(`     学生ID: ${record.student_id}`);
        console.log(`     警告类型: ${record.warning_type}`);
        console.log(`     严重程度: ${record.severity}`);
        console.log(`     创建时间: ${record.created_at}`);
        console.log(`     描述: ${record.description || '无'}`);
        console.log('');
      });
    } else {
      console.log('  ⚠️  warning_records 表中没有数据');
    }
  }
  
  // 检查 students 表
  if (tableStatus['students']) {
    console.log('\n👥 students 表示例数据:');
    const studentData = await getSampleData('students');
    if (studentData && studentData.length > 0) {
      studentData.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`);
        console.log(`     学号: ${record.student_id}`);
        console.log(`     姓名: ${record.name}`);
        console.log(`     班级: ${record.class_name}`);
        console.log(`     创建时间: ${record.created_at}`);
        console.log('');
      });
    } else {
      console.log('  ⚠️  students 表中没有数据');
    }
  }
  
  // 检查 warning_rules 表
  if (tableStatus['warning_rules']) {
    console.log('\n📏 warning_rules 表示例数据:');
    const rulesData = await getSampleData('warning_rules');
    if (rulesData && rulesData.length > 0) {
      rulesData.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}`);
        console.log(`     规则名称: ${record.rule_name}`);
        console.log(`     规则类型: ${record.rule_type}`);
        console.log(`     阈值: ${record.threshold}`);
        console.log(`     是否启用: ${record.is_active}`);
        console.log(`     创建时间: ${record.created_at}`);
        console.log('');
      });
    } else {
      console.log('  ⚠️  warning_rules 表中没有数据');
    }
  }
  
  console.log('\n🔗 第四步: 检查关联关系');
  console.log('======================');
  
  // 检查外键关联
  if (tableStatus['warning_records'] && tableStatus['students']) {
    try {
      const { data: joinData, error: joinError } = await supabase
        .from('warning_records')
        .select(`
          id,
          student_id,
          warning_type,
          students (
            id,
            name,
            class_name
          )
        `)
        .limit(3);
      
      if (joinError) {
        console.log(`❌ 检查 warning_records 和 students 关联失败: ${joinError.message}`);
      } else if (joinData && joinData.length > 0) {
        console.log('✅ warning_records 和 students 表关联正常');
        console.log('示例关联数据:');
        joinData.forEach((record, index) => {
          console.log(`  ${index + 1}. 警告ID: ${record.id}, 学生ID: ${record.student_id}`);
          console.log(`     学生信息: ${record.students ? record.students.name : '未找到'}`);
        });
      } else {
        console.log('⚠️  warning_records 表中没有数据，无法验证关联关系');
      }
    } catch (error) {
      console.log(`❌ 检查关联关系时出错: ${error.message}`);
    }
  }
  
  console.log('\n🧪 第五步: 测试查询逻辑');
  console.log('======================');
  
  // 测试日期范围查询
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  console.log(`测试查询最近30天的警告记录 (${thirtyDaysAgo.toISOString().split('T')[0]} 到 ${today.toISOString().split('T')[0]})`);
  
  if (tableStatus['warning_records']) {
    try {
      const { data: recentWarnings, error: recentError } = await supabase
        .from('warning_records')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .lte('created_at', today.toISOString());
      
      if (recentError) {
        console.log(`❌ 查询最近30天警告记录失败: ${recentError.message}`);
      } else {
        console.log(`✅ 最近30天警告记录: ${recentWarnings.length} 条`);
      }
    } catch (error) {
      console.log(`❌ 测试日期范围查询时出错: ${error.message}`);
    }
  }
  
  // 测试按严重程度分组查询
  if (tableStatus['warning_records']) {
    try {
      console.log('\n按严重程度统计警告记录:');
      const severities = ['high', 'medium', 'low'];
      
      for (const severity of severities) {
        const { count, error } = await supabase
          .from('warning_records')
          .select('*', { count: 'exact', head: true })
          .eq('severity', severity);
        
        if (error) {
          console.log(`  ❌ 查询 ${severity} 级别警告失败: ${error.message}`);
        } else {
          console.log(`  ${severity} 级别: ${count} 条`);
        }
      }
    } catch (error) {
      console.log(`❌ 测试分组查询时出错: ${error.message}`);
    }
  }
  
  console.log('\n📈 第六步: 数据质量检查');
  console.log('======================');
  
  // 检查数据完整性
  if (tableStatus['warning_records']) {
    try {
      // 检查空值情况
      const { data: nullCheck, error: nullError } = await supabase
        .from('warning_records')
        .select('*')
        .or('student_id.is.null,warning_type.is.null,severity.is.null');
      
      if (nullError) {
        console.log(`❌ 检查空值失败: ${nullError.message}`);
      } else {
        console.log(`🔍 含有空值的警告记录: ${nullCheck.length} 条`);
      }
    } catch (error) {
      console.log(`❌ 数据质量检查时出错: ${error.message}`);
    }
  }
  
  console.log('\n✅ 数据库检查完成!');
  console.log('================');
}

// 运行检查
checkWarningDatabase().catch(console.error);