/**
 * 测试学生画像和班级管理功能的简单验证脚本
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseFunctions() {
  console.log('🧪 开始测试数据库函数...');
  
  try {
    // 1. 测试 get_class_portrait_stats 函数
    console.log('\n📊 测试班级画像统计函数...');
    const { data: classStats, error: classError } = await supabase
      .rpc('get_class_portrait_stats', { class_name_param: '高三(1)班' });
    
    if (classError) {
      console.error('❌ 班级统计函数失败:', classError.message);
    } else {
      console.log('✅ 班级统计函数成功:', classStats);
    }

    // 2. 测试基本数据表查询
    console.log('\n📋 测试学生数据查询...');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, name, class_name')
      .limit(5);
      
    if (studentsError) {
      console.error('❌ 学生查询失败:', studentsError.message);
    } else {
      console.log('✅ 学生查询成功，返回', students?.length || 0, '条记录');
    }

    // 3. 测试成绩数据查询
    console.log('\n📈 测试成绩数据查询...');
    const { data: grades, error: gradesError } = await supabase
      .from('grade_data_new')
      .select('student_id, total_score, exam_title')
      .limit(5);
      
    if (gradesError) {
      console.error('❌ 成绩查询失败:', gradesError.message);
    } else {
      console.log('✅ 成绩查询成功，返回', grades?.length || 0, '条记录');
    }

    // 4. 测试班级信息查询
    console.log('\n🏫 测试班级信息查询...');
    const { data: classInfo, error: classInfoError } = await supabase
      .from('class_info')
      .select('class_name, grade_level, student_count')
      .limit(3);
      
    if (classInfoError) {
      console.error('❌ 班级信息查询失败:', classInfoError.message);
    } else {
      console.log('✅ 班级信息查询成功，返回', classInfo?.length || 0, '条记录');
    }

  } catch (error) {
    console.error('💥 测试过程中出现异常:', error.message);
  }
}

// 运行测试
testDatabaseFunctions()
  .then(() => {
    console.log('\n🎉 数据库功能测试完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 测试失败:', error);
    process.exit(1);
  });