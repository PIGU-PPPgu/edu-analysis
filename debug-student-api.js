/**
 * 调试学生数据获取失败问题
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function debugStudentDataFetch() {
  console.log('🔍 调试学生数据获取失败问题...\n');

  try {
    // 1. 测试基础连接
    console.log('=== 1. 测试Supabase连接 ===');
    const { data: healthCheck, error: healthError } = await supabase
      .from('students')
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ Supabase连接失败:', healthError);
      return;
    }

    console.log(`✅ Supabase连接正常，students表有 ${healthCheck} 条记录`);

    // 2. 测试具体的API调用路径
    console.log('\n=== 2. 模拟前端API调用 ===');

    const testClassId = 'class-初三7班';
    console.log(`测试classId: ${testClassId}`);

    // 步骤1：解析className
    let className = testClassId;
    if (testClassId.startsWith('class-')) {
      className = testClassId.replace('class-', '').replace(/-/g, '');
    }
    console.log(`解析后className: ${className}`);

    // 步骤2：查询students表
    console.log('\n--- 查询students表 ---');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, student_id, name, class_name')
      .eq('class_name', className);

    if (studentsError) {
      console.error('❌ 查询students表失败:', studentsError);
      console.error('错误详情:', {
        code: studentsError.code,
        message: studentsError.message,
        details: studentsError.details,
        hint: studentsError.hint
      });
      return;
    }

    console.log(`✅ 查询students表成功，找到 ${students?.length || 0} 个学生`);
    if (students && students.length > 0) {
      console.log('前3个学生:', students.slice(0, 3).map(s =>
        `${s.name} (${s.student_id}) - 班级: ${s.class_name}`
      ));
    }

    // 步骤3：测试映射服务
    console.log('\n--- 测试映射服务 ---');
    try {
      const { getGradesByClassName, batchGetGradeTableIds } = await import('./src/services/enhancedMappingService.js');
      console.log('✅ 映射服务导入成功');

      const { data: grades, error: gradesError } = await getGradesByClassName(className);

      if (gradesError) {
        console.error('❌ 映射服务调用失败:', gradesError);
      } else {
        console.log(`✅ 映射服务成功，获取 ${grades?.length || 0} 条成绩记录`);
      }
    } catch (importError) {
      console.error('❌ 映射服务导入失败:', importError);
    }

    // 步骤4：测试顶尖学生逻辑
    console.log('\n--- 测试顶尖学生逻辑 ---');
    if (students && students.length > 0) {
      // 模拟API中的逻辑
      const studentIds = students.map(s => s.student_id);
      console.log(`学生ID列表: ${studentIds.slice(0, 5).join(', ')}...`);

      // 查询成绩数据
      const { data: grades, error: gradesError } = await supabase
        .from('grade_data')
        .select('student_id, name, total_score, exam_title')
        .in('student_id', studentIds.slice(0, 10)) // 只取前10个测试
        .order('total_score', { ascending: false });

      if (gradesError) {
        console.error('❌ 查询grade_data失败:', gradesError);
      } else {
        console.log(`✅ 查询grade_data成功，找到 ${grades?.length || 0} 条成绩记录`);
        if (grades && grades.length > 0) {
          console.log('前3条成绩:', grades.slice(0, 3).map(g =>
            `${g.name}: ${g.total_score}分 (${g.exam_title})`
          ));
        }
      }
    }

    // 5. 测试学习小组逻辑
    console.log('\n=== 3. 测试学习小组逻辑 ===');
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .eq('class_id', testClassId);

    if (groupsError) {
      if (groupsError.code === '42P01') {
        console.log('✅ groups表不存在 - 这是预期的，应该返回空数组');
      } else {
        console.error('❌ 查询groups表出错:', groupsError);
      }
    } else {
      console.log(`📊 找到 ${groups?.length || 0} 个学习小组`);
    }

    return {
      success: true,
      studentsCount: students?.length || 0,
      studentsFound: !!students && students.length > 0
    };

  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
    console.error('错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

// 运行调试
debugStudentDataFetch()
  .then(result => {
    console.log('\n🎯 调试结果总结:');
    if (result?.success) {
      if (result.studentsFound) {
        console.log('✅ 学生数据获取正常，问题可能在前端调用');
        console.log('💡 建议检查:');
        console.log('  1. 前端组件是否正确调用API');
        console.log('  2. 浏览器网络面板的具体错误信息');
        console.log('  3. 前端控制台的错误日志');
      } else {
        console.log('⚠️ 后端数据查询正常但没有找到学生');
      }
    } else {
      console.log('❌ 后端API调用存在问题');
    }
  })
  .catch(console.error);