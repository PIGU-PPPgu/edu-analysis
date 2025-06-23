#!/usr/bin/env node

// 基于实际表结构的警告系统数据检查
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 警告系统数据详细分析报告');
console.log('===============================');

async function analyzeDatabaseData() {
  
  // 1. 数据统计总览
  console.log('\n📊 数据统计总览');
  console.log('================');
  
  const tables = {
    'warning_records': 'id',
    'warning_rules': 'id', 
    'students': 'id',
    'grade_data': 'id',
    'exams': 'id'
  };
  
  const stats = {};
  
  for (const [tableName, idField] of Object.entries(tables)) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: 查询失败 (${error.message})`);
        stats[tableName] = 0;
      } else {
        console.log(`✅ ${tableName}: ${count} 条记录`);
        stats[tableName] = count;
      }
    } catch (error) {
      console.log(`❌ ${tableName}: 查询异常 (${error.message})`);
      stats[tableName] = 0;
    }
  }
  
  // 2. 警告记录详细分析
  console.log('\n🚨 警告记录详细分析');
  console.log('===================');
  
  if (stats.warning_records > 0) {
    // 获取所有警告记录
    const { data: warnings, error: warningError } = await supabase
      .from('warning_records')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (warningError) {
      console.log(`❌ 获取警告记录失败: ${warningError.message}`);
    } else {
      console.log(`✅ 成功获取 ${warnings.length} 条警告记录`);
      
      // 分析警告状态分布
      const statusCount = {};
      warnings.forEach(w => {
        statusCount[w.status] = (statusCount[w.status] || 0) + 1;
      });
      
      console.log('\n📈 警告状态分布:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 条`);
      });
      
      // 显示最新的警告记录
      console.log('\n📋 最近的警告记录:');
      warnings.slice(0, 5).forEach((warning, index) => {
        console.log(`  ${index + 1}. ID: ${warning.id}`);
        console.log(`     学生ID: ${warning.student_id}`);
        console.log(`     规则ID: ${warning.rule_id}`);
        console.log(`     状态: ${warning.status}`);
        console.log(`     创建时间: ${warning.created_at}`);
        console.log(`     详情: ${JSON.stringify(warning.details, null, 2)}`);
        console.log('');
      });
    }
  } else {
    console.log('⚠️  warning_records 表中没有数据');
  }
  
  // 3. 警告规则分析
  console.log('\n📏 警告规则分析');
  console.log('================');
  
  if (stats.warning_rules > 0) {
    const { data: rules, error: rulesError } = await supabase
      .from('warning_rules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (rulesError) {
      console.log(`❌ 获取警告规则失败: ${rulesError.message}`);
    } else {
      console.log(`✅ 成功获取 ${rules.length} 条警告规则`);
      
      // 分析规则状态
      const activeRules = rules.filter(r => r.is_active);
      const systemRules = rules.filter(r => r.is_system);
      
      console.log(`📊 活跃规则: ${activeRules.length} 条`);
      console.log(`📊 系统规则: ${systemRules.length} 条`);
      
      // 按严重程度分类
      const severityCount = {};
      rules.forEach(r => {
        severityCount[r.severity] = (severityCount[r.severity] || 0) + 1;
      });
      
      console.log('\n📈 严重程度分布:');
      Object.entries(severityCount).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count} 条`);
      });
      
      // 显示规则详情
      console.log('\n📋 警告规则详情:');
      rules.forEach((rule, index) => {
        console.log(`  ${index + 1}. ${rule.name} (${rule.severity})`);
        console.log(`     描述: ${rule.description}`);
        console.log(`     条件: ${JSON.stringify(rule.conditions, null, 2)}`);
        console.log(`     状态: ${rule.is_active ? '启用' : '禁用'} | 系统规则: ${rule.is_system ? '是' : '否'}`);
        console.log('');
      });
    }
  } else {
    console.log('⚠️  warning_rules 表中没有数据');
  }
  
  // 4. 学生数据分析
  console.log('\n👥 学生数据分析');
  console.log('================');
  
  if (stats.students > 0) {
    // 获取班级分布
    const { data: classData, error: classError } = await supabase
      .from('students')
      .select('class_name')
      .not('class_name', 'is', null);
    
    if (classError) {
      console.log(`❌ 获取班级数据失败: ${classError.message}`);
    } else {
      const classCount = {};
      classData.forEach(s => {
        classCount[s.class_name] = (classCount[s.class_name] || 0) + 1;
      });
      
      console.log('📊 班级分布 (前10个班级):');
      Object.entries(classCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([className, count]) => {
          console.log(`  ${className}: ${count} 名学生`);
        });
    }
    
    // 获取最新的学生记录
    const { data: recentStudents, error: recentError } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recentError) {
      console.log(`❌ 获取最新学生记录失败: ${recentError.message}`);
    } else {
      console.log('\n📋 最新学生记录:');
      recentStudents.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.name} (学号: ${student.student_id})`);
        console.log(`     班级: ${student.class_name}`);
        console.log(`     入学年份: ${student.admission_year}`);
        console.log(`     创建时间: ${student.created_at}`);
        console.log('');
      });
    }
  }
  
  // 5. 成绩数据分析
  console.log('\n📊 成绩数据分析');
  console.log('================');
  
  if (stats.grade_data > 0) {
    // 获取考试类型分布
    const { data: examTypes, error: examError } = await supabase
      .from('grade_data')
      .select('exam_type, exam_title')
      .not('exam_type', 'is', null);
    
    if (examError) {
      console.log(`❌ 获取考试类型失败: ${examError.message}`);
    } else {
      const typeCount = {};
      examTypes.forEach(e => {
        typeCount[e.exam_type] = (typeCount[e.exam_type] || 0) + 1;
      });
      
      console.log('📊 考试类型分布:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} 条记录`);
      });
    }
    
    // 获取成绩分布
    const { data: scores, error: scoresError } = await supabase
      .from('grade_data')
      .select('score, grade')
      .not('score', 'is', null);
    
    if (scoresError) {
      console.log(`❌ 获取成绩数据失败: ${scoresError.message}`);
    } else {
      const validScores = scores.filter(s => s.score && s.score > 0);
      if (validScores.length > 0) {
        const avgScore = validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length;
        const maxScore = Math.max(...validScores.map(s => s.score));
        const minScore = Math.min(...validScores.map(s => s.score));
        
        console.log(`📊 成绩统计 (基于 ${validScores.length} 条有效记录):`);
        console.log(`  平均分: ${avgScore.toFixed(2)}`);
        console.log(`  最高分: ${maxScore}`);
        console.log(`  最低分: ${minScore}`);
      }
    }
  }
  
  // 6. 关联关系验证
  console.log('\n🔗 关联关系验证');
  console.log('================');
  
  if (stats.warning_records > 0 && stats.warning_rules > 0) {
    try {
      // 验证警告记录和规则的关联
      const { data: joinData, error: joinError } = await supabase
        .from('warning_records')
        .select(`
          id,
          student_id,
          rule_id,
          status,
          warning_rules (
            id,
            name,
            severity
          )
        `)
        .limit(5);
      
      if (joinError) {
        console.log(`❌ 验证警告记录和规则关联失败: ${joinError.message}`);
      } else {
        console.log(`✅ 警告记录和规则关联正常`);
        console.log('示例关联数据:');
        joinData.forEach((record, index) => {
          console.log(`  ${index + 1}. 警告ID: ${record.id}`);
          console.log(`     学生ID: ${record.student_id}`);
          console.log(`     规则: ${record.warning_rules ? record.warning_rules.name : '未找到规则'}`);
          console.log(`     严重程度: ${record.warning_rules ? record.warning_rules.severity : 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log(`❌ 验证关联关系时出错: ${error.message}`);
    }
  }
  
  // 7. 数据质量问题检查
  console.log('\n🔍 数据质量检查');
  console.log('================');
  
  // 检查警告记录中的孤立数据
  if (stats.warning_records > 0) {
    const { data: orphanWarnings, error: orphanError } = await supabase
      .from('warning_records')
      .select('id, student_id, rule_id')
      .or('student_id.is.null,rule_id.is.null');
    
    if (orphanError) {
      console.log(`❌ 检查孤立警告记录失败: ${orphanError.message}`);
    } else {
      console.log(`🔍 含有空值的警告记录: ${orphanWarnings.length} 条`);
      if (orphanWarnings.length > 0) {
        orphanWarnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ID: ${warning.id}, 学生ID: ${warning.student_id || 'NULL'}, 规则ID: ${warning.rule_id || 'NULL'}`);
        });
      }
    }
  }
  
  // 8. 时间范围分析
  console.log('\n📅 时间范围分析');
  console.log('================');
  
  if (stats.warning_records > 0) {
    const { data: timeData, error: timeError } = await supabase
      .from('warning_records')
      .select('created_at')
      .order('created_at', { ascending: true });
    
    if (timeError) {
      console.log(`❌ 获取时间数据失败: ${timeError.message}`);
    } else {
      const dates = timeData.map(t => new Date(t.created_at));
      const earliest = dates[0];
      const latest = dates[dates.length - 1];
      
      console.log(`📊 警告记录时间范围:`);
      console.log(`  最早记录: ${earliest.toLocaleDateString()}`);
      console.log(`  最新记录: ${latest.toLocaleDateString()}`);
      console.log(`  时间跨度: ${Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24))} 天`);
      
      // 最近30天的记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecords = timeData.filter(t => new Date(t.created_at) >= thirtyDaysAgo);
      console.log(`  最近30天记录: ${recentRecords.length} 条`);
    }
  }
  
  console.log('\n✅ 数据库分析完成!');
  console.log('==================');
  
  // 生成总结报告
  console.log('\n📝 问题总结和建议');
  console.log('==================');
  
  const issues = [];
  const suggestions = [];
  
  if (stats.warning_records === 0) {
    issues.push('warning_records 表中没有数据');
    suggestions.push('需要确保警告生成逻辑正常工作');
  }
  
  if (stats.warning_rules === 0) {
    issues.push('warning_rules 表中没有数据');
    suggestions.push('需要初始化警告规则数据');
  }
  
  if (issues.length > 0) {
    console.log('\n❌ 发现的问题:');
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
    
    console.log('\n💡 建议:');
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  } else {
    console.log('\n✅ 数据库状态良好，所有关键表都有数据');
  }
}

// 运行分析
analyzeDatabaseData().catch(console.error);