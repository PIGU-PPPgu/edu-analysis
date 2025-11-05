/**
 * 测试前端实际显示的数据
 * 验证是否还在显示模拟数据
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testFrontendDataFlow() {
  console.log('🔍 测试前端实际数据流...\n');

  try {
    // 1. 测试实际的学生数据查询（模拟前端API调用）
    console.log('=== 1. 测试班级学生数据查询 ===');

    // 获取一个真实班级的学生数据（模拟前端调用）
    const testClass = '初三7班';
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, name, class_name, gender')
      .eq('class_name', testClass)
      .limit(10);

    if (studentsError) {
      console.error('❌ 学生数据查询失败:', studentsError);
      return;
    }

    console.log(`📊 班级 ${testClass} 的学生数据:`);
    students?.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (${student.student_id}) - ${student.gender || '未知'}`);
    });

    // 2. 测试映射后的成绩数据
    console.log('\n=== 2. 测试映射成绩数据查询 ===');

    const studentIds = students?.map(s => s.student_id) || [];
    if (studentIds.length > 0) {
      // 获取映射
      const { data: mappings, error: mappingError } = await supabase
        .from('student_id_mapping')
        .select('student_table_id, grade_table_id, student_name')
        .in('student_table_id', studentIds);

      if (mappingError) {
        console.error('❌ 映射查询失败:', mappingError);
        return;
      }

      console.log(`📈 找到 ${mappings?.length || 0} 个映射:`);
      mappings?.slice(0, 5).forEach((mapping, index) => {
        console.log(`  ${index + 1}. ${mapping.student_name}: ${mapping.student_table_id} → ${mapping.grade_table_id}`);
      });

      // 获取对应的成绩
      const gradeIds = mappings?.map(m => m.grade_table_id) || [];
      if (gradeIds.length > 0) {
        const { data: grades, error: gradesError } = await supabase
          .from('grade_data_new')
          .select('student_id, name, total_score, chinese_score, math_score')
          .in('student_id', gradeIds)
          .limit(5);

        if (gradesError) {
          console.error('❌ 成绩查询失败:', gradesError);
        } else {
          console.log('\n📊 对应的成绩数据:');
          grades?.forEach((grade, index) => {
            console.log(`  ${index + 1}. ${grade.name}: 总分${grade.total_score}, 语文${grade.chinese_score}, 数学${grade.math_score}`);
          });
        }
      }
    }

    // 3. 检查是否有张三李四王五的数据
    console.log('\n=== 3. 检查模拟数据污染 ===');

    const mockNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

    for (const name of mockNames) {
      const { data: mockCheck, error } = await supabase
        .from('students')
        .select('student_id, name, class_name')
        .eq('name', name);

      if (!error && mockCheck && mockCheck.length > 0) {
        console.log(`⚠️ 发现可能的模拟数据: ${name}`);
        mockCheck.forEach(student => {
          console.log(`   - ${student.name} (${student.student_id}) 在 ${student.class_name}`);
        });
      }
    }

    // 4. 验证真实数据比例
    console.log('\n=== 4. 真实数据比例分析 ===');

    const { data: allStudents, error: allError } = await supabase
      .from('students')
      .select('name')
      .not('name', 'is', null);

    if (!allError && allStudents) {
      const totalStudents = allStudents.length;
      const mockDataCount = allStudents.filter(s =>
        mockNames.includes(s.name)
      ).length;

      const realDataPercentage = Math.round(((totalStudents - mockDataCount) / totalStudents) * 100);

      console.log(`📊 数据分析:`);
      console.log(`  总学生数: ${totalStudents}`);
      console.log(`  疑似模拟数据: ${mockDataCount}`);
      console.log(`  真实数据比例: ${realDataPercentage}%`);
    }

    // 5. 提供修复建议
    console.log('\n=== 5. 问题诊断与修复建议 ===');

    const hasRealData = students?.some(s => !mockNames.includes(s.name));

    if (hasRealData) {
      console.log('✅ 数据库包含真实学生数据');
      console.log('🔍 如果前端仍显示张三李四王五，可能的原因:');
      console.log('   1. 前端组件缓存了旧数据');
      console.log('   2. 某些组件仍在使用 mockData.ts');
      console.log('   3. API调用没有正确更新');
      console.log('   4. 浏览器缓存问题');

      console.log('\n💡 修复建议:');
      console.log('   1. 清除浏览器缓存并强制刷新 (Ctrl+Shift+R)');
      console.log('   2. 检查开发者工具网络面板，确认API返回真实数据');
      console.log('   3. 确认没有组件在使用本地 mockData');
    } else {
      console.log('❌ 数据库主要包含模拟数据');
      console.log('💡 需要导入真实的学生数据');
    }

    return {
      success: true,
      hasRealData,
      sampleStudents: students?.slice(0, 5) || []
    };

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return { success: false, error: error.message };
  }
}

// 运行测试
testFrontendDataFlow()
  .then(result => {
    console.log('\n🎯 测试结论:');
    if (result?.hasRealData) {
      console.log('✅ 数据库有真实数据，前端显示问题可能是缓存或组件配置');
      console.log('🔧 建议刷新浏览器缓存后重新测试');
    } else {
      console.log('⚠️ 需要确认数据源和前端组件配置');
    }
  })
  .catch(console.error);