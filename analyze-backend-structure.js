/**
 * 后端数据库架构分析脚本
 *
 * 目标：
 * 1. 检查关键表的数据情况
 * 2. 验证缺失的存储过程
 * 3. 分析数据一致性问题
 * 4. 为修复提供准确的现状
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

console.log('🔍 开始分析后端数据库架构...\n');

// 1. 检查核心数据表状态
async function analyzeCoreTables() {
  console.log('=== 1. 核心数据表分析 ===');

  const tables = [
    { name: 'students', key: '学生数据' },
    { name: 'grade_data_new', key: '成绩数据(新)' },
    { name: 'grades', key: '成绩数据(旧)' },
    { name: 'class_info', key: '班级信息' },
    { name: 'warning_records', key: '预警记录' },
    { name: 'warning_rules', key: '预警规则' },
    { name: 'student_portraits', key: '学生画像' }
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table.key} (${table.name}): ${error.message}`);
      } else {
        console.log(`✅ ${table.key} (${table.name}): ${count || 0} 条记录`);
      }
    } catch (err) {
      console.log(`❌ ${table.key} (${table.name}): 查询失败 - ${err.message}`);
    }
  }
}

// 2. 检查存储过程是否存在
async function analyzeStoredProcedures() {
  console.log('\n=== 2. 存储过程状态检查 ===');

  const functions = [
    'get_warnings_by_type',
    'get_risk_by_class',
    'get_common_risk_factors',
    'get_class_portrait_stats',
    'get_student_performance_stats',
    'calculate_warning_statistics'
  ];

  for (const funcName of functions) {
    try {
      // 尝试调用函数来检查是否存在
      const { data, error } = await supabase.rpc(funcName, {});

      if (error) {
        if (error.code === 'PGRST202') {
          console.log(`❌ ${funcName}: 函数不存在`);
        } else {
          console.log(`⚠️ ${funcName}: 存在但执行错误 - ${error.message}`);
        }
      } else {
        console.log(`✅ ${funcName}: 函数正常`);
      }
    } catch (err) {
      console.log(`❌ ${funcName}: 检查失败 - ${err.message}`);
    }
  }
}

// 3. 数据一致性分析
async function analyzeDataConsistency() {
  console.log('\n=== 3. 数据一致性分析 ===');

  try {
    // 检查学生表与成绩表的关联
    const { data: studentsWithGrades } = await supabase
      .from('students')
      .select('student_id, name, class_name')
      .limit(5);

    console.log('学生样本数据:', studentsWithGrades?.slice(0, 2));

    // 检查成绩数据字段类型
    const { data: gradesSample } = await supabase
      .from('grade_data_new')
      .select('student_id, name, class_name, total_score, chinese_score, math_score')
      .limit(3);

    console.log('成绩样本数据:', gradesSample?.slice(0, 1));

    // 检查class_name的一致性
    const { data: distinctClasses } = await supabase
      .from('students')
      .select('class_name')
      .not('class_name', 'is', null);

    const uniqueClasses = [...new Set(distinctClasses?.map(item => item.class_name))];
    console.log(`班级名称统计: 共${uniqueClasses.length}个班级`);
    console.log('班级示例:', uniqueClasses.slice(0, 5));

  } catch (error) {
    console.error('数据一致性分析失败:', error);
  }
}

// 4. 预警系统状态检查
async function analyzeWarningSystem() {
  console.log('\n=== 4. 预警系统状态检查 ===');

  try {
    // 检查预警规则
    const { count: rulesCount } = await supabase
      .from('warning_rules')
      .select('*', { count: 'exact', head: true });

    console.log(`预警规则数量: ${rulesCount || 0}`);

    // 检查预警记录
    const { count: recordsCount } = await supabase
      .from('warning_records')
      .select('*', { count: 'exact', head: true });

    console.log(`预警记录数量: ${recordsCount || 0}`);

    // 尝试调用预警相关函数
    try {
      await supabase.rpc('get_warnings_by_type');
    } catch (error) {
      console.log('预警类型统计函数缺失，需要创建');
    }

  } catch (error) {
    console.error('预警系统检查失败:', error);
  }
}

// 5. 学生画像系统检查
async function analyzePortraitSystem() {
  console.log('\n=== 5. 学生画像系统检查 ===');

  try {
    const { count: portraitCount } = await supabase
      .from('student_portraits')
      .select('*', { count: 'exact', head: true });

    console.log(`学生画像记录数量: ${portraitCount || 0}`);

    // 检查画像数据结构
    const { data: portraitSample } = await supabase
      .from('student_portraits')
      .select('student_id, ai_tags, custom_tags')
      .limit(2);

    console.log('画像数据示例:', portraitSample?.slice(0, 1));

  } catch (error) {
    console.error('学生画像系统检查失败:', error);
  }
}

// 主函数
async function runAnalysis() {
  try {
    await analyzeCoreTables();
    await analyzeStoredProcedures();
    await analyzeDataConsistency();
    await analyzeWarningSystem();
    await analyzePortraitSystem();

    console.log('\n🎯 分析完成！基于以上结果制定修复计划。');

  } catch (error) {
    console.error('分析过程中出现错误:', error);
  }
}

runAnalysis().catch(console.error);