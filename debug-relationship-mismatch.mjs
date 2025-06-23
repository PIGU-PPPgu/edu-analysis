#!/usr/bin/env node

// 调试关联关系不匹配问题
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 调试关联关系不匹配问题');
console.log('==========================');

async function debugRelationships() {
  
  // 1. 检查警告记录中的实际字段值
  console.log('\n1️⃣ 检查警告记录的实际数据');
  console.log('============================');
  
  const { data: warningRecords } = await supabase
    .from('warning_records')
    .select('*')
    .limit(3);
  
  if (warningRecords) {
    warningRecords.forEach((record, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  student_id: ${record.student_id} (类型: ${typeof record.student_id})`);
      console.log(`  rule_id: ${record.rule_id} (类型: ${typeof record.rule_id})`);
      console.log('');
    });
  }

  // 2. 检查学生表中的匹配情况
  console.log('\n2️⃣ 检查学生表匹配情况');
  console.log('======================');
  
  if (warningRecords && warningRecords.length > 0) {
    const studentIds = warningRecords.map(r => r.student_id);
    console.log(`要查找的学生ID: ${studentIds.join(', ')}`);
    
    // 查找这些student_id在students表中是否存在
    for (const studentId of studentIds) {
      const { data: studentData, count } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('student_id', studentId);
      
      console.log(`student_id ${studentId}:`);
      if (count > 0) {
        console.log(`  ✅ 找到 ${count} 条匹配记录`);
        if (studentData && studentData[0]) {
          console.log(`  学生信息: ${studentData[0].name} (UUID: ${studentData[0].id})`);
        }
      } else {
        console.log(`  ❌ 在students表中未找到匹配记录`);
        
        // 尝试模糊匹配
        const { data: fuzzyMatch } = await supabase
          .from('students')
          .select('student_id, name')
          .ilike('student_id', `%${studentId}%`)
          .limit(5);
        
        if (fuzzyMatch && fuzzyMatch.length > 0) {
          console.log(`  🔍 可能的匹配项:`);
          fuzzyMatch.forEach(s => {
            console.log(`    ${s.student_id} - ${s.name}`);
          });
        }
      }
      console.log('');
    }
  }

  // 3. 检查规则表中的匹配情况
  console.log('\n3️⃣ 检查规则表匹配情况');
  console.log('======================');
  
  if (warningRecords && warningRecords.length > 0) {
    const ruleIds = [...new Set(warningRecords.map(r => r.rule_id))];
    console.log(`要查找的规则ID: ${ruleIds.join(', ')}`);
    
    for (const ruleId of ruleIds) {
      const { data: ruleData, count } = await supabase
        .from('warning_rules')
        .select('*', { count: 'exact' })
        .eq('id', ruleId);
      
      console.log(`rule_id ${ruleId}:`);
      if (count > 0) {
        console.log(`  ✅ 找到匹配规则`);
        if (ruleData && ruleData[0]) {
          console.log(`  规则信息: ${ruleData[0].name} (${ruleData[0].severity})`);
        }
      } else {
        console.log(`  ❌ 在warning_rules表中未找到匹配记录`);
      }
      console.log('');
    }
  }

  // 4. 测试不同的关联查询方式
  console.log('\n4️⃣ 测试不同的关联查询方式');
  console.log('==============================');
  
  // 方式1: 使用外键关联 (当前方式)
  console.log('方式1: 外键关联查询');
  const { data: method1, error: error1 } = await supabase
    .from('warning_records')
    .select(`
      *,
      warning_rules(name, severity),
      students(name, student_id)
    `)
    .limit(2);
  
  if (error1) {
    console.log(`❌ 外键关联查询失败: ${error1.message}`);
  } else {
    console.log(`✅ 外键关联查询成功: ${method1.length} 条记录`);
    method1.forEach((record, index) => {
      console.log(`  记录 ${index + 1}:`);
      console.log(`    学生: ${record.students?.name || '未找到'}`);
      console.log(`    规则: ${record.warning_rules?.name || '未找到'}`);
    });
  }

  // 方式2: 手动JOIN查询
  console.log('\n方式2: 手动查询后关联');
  const { data: warnings } = await supabase
    .from('warning_records')
    .select('*')
    .limit(2);
  
  if (warnings) {
    for (const warning of warnings) {
      // 手动查询学生信息
      const { data: student } = await supabase
        .from('students')
        .select('name, student_id')
        .eq('student_id', warning.student_id)
        .single();
      
      // 手动查询规则信息
      const { data: rule } = await supabase
        .from('warning_rules')
        .select('name, severity')
        .eq('id', warning.rule_id)
        .single();
      
      console.log(`警告记录 ${warning.id}:`);
      console.log(`  学生: ${student?.name || '未找到'} (${warning.student_id})`);
      console.log(`  规则: ${rule?.name || '未找到'} (${warning.rule_id})`);
    }
  }

  // 5. 检查外键约束配置
  console.log('\n5️⃣ 检查可能的外键配置问题');
  console.log('============================');
  
  // 检查warning_records表的实际结构
  console.log('检查warning_records表的字段:');
  const { data: warningStructure } = await supabase
    .from('warning_records')
    .select('*')
    .limit(1);
  
  if (warningStructure && warningStructure[0]) {
    console.log('实际字段:', Object.keys(warningStructure[0]));
  }

  // 检查students表的实际结构  
  console.log('\n检查students表的字段:');
  const { data: studentStructure } = await supabase
    .from('students')
    .select('*')
    .limit(1);
  
  if (studentStructure && studentStructure[0]) {
    console.log('实际字段:', Object.keys(studentStructure[0]));
  }

  // 检查warning_rules表的实际结构
  console.log('\n检查warning_rules表的字段:');
  const { data: ruleStructure } = await supabase
    .from('warning_rules')
    .select('*')
    .limit(1);
  
  if (ruleStructure && ruleStructure[0]) {
    console.log('实际字段:', Object.keys(ruleStructure[0]));
  }

  // 6. 建议解决方案
  console.log('\n6️⃣ 问题分析和解决方案');
  console.log('======================');
  
  console.log('🔍 可能的问题原因:');
  console.log('1. warning_records.student_id 与 students.student_id 字段类型不匹配');
  console.log('2. warning_records.rule_id 与 warning_rules.id 的外键关系配置问题');
  console.log('3. Supabase 自动生成的关联查询可能基于错误的字段映射');
  
  console.log('\n💡 建议解决方案:');
  console.log('1. 使用手动关联查询代替自动外键关联');
  console.log('2. 检查数据库外键约束配置');
  console.log('3. 在前端代码中使用手动查询方式获取关联数据');
  
  console.log('\n📋 推荐的查询代码:');
  console.log(`
// 获取警告记录
const warnings = await supabase
  .from('warning_records')
  .select('*')
  .order('created_at', { ascending: false });

// 手动获取关联数据
for (const warning of warnings) {
  // 获取学生信息
  const { data: student } = await supabase
    .from('students')
    .select('name, student_id, class_name')
    .eq('student_id', warning.student_id)
    .single();
  
  // 获取规则信息
  const { data: rule } = await supabase
    .from('warning_rules')
    .select('name, severity, description')
    .eq('id', warning.rule_id)
    .single();
  
  warning.student = student;
  warning.warning_rule = rule;
}
  `);
}

// 运行调试
debugRelationships().catch(console.error);