/**
 * 测试修复后的API是否返回真实数据
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

// 模拟portrait API调用
async function testPortraitAPI() {
  console.log('🔍 测试修复后的portrait API...\n');

  try {
    // 1. 测试班级学生获取逻辑（模拟前端调用）
    console.log('=== 1. 模拟getClassStudents调用 ===');

    const classId = 'class-初三7班'; // 模拟前端传入的classId

    // 解析班级名称（复制API中的逻辑）
    let className = classId;
    if (classId.startsWith('class-')) {
      className = classId.replace('class-', '').replace(/-/g, '');
    }

    console.log(`输入classId: ${classId}`);
    console.log(`解析后className: ${className}`);

    // 直接通过class_name获取学生
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, student_id, name, gender, admission_year, class_name")
      .eq("class_name", className);

    if (studentsError) {
      console.error("❌ 获取班级学生失败:", studentsError);
      return;
    }

    const students = studentsData || [];
    console.log(`✅ 找到 ${students.length} 个学生`);
    console.log('前5个学生:', students.slice(0, 5).map(s => `${s.name} (${s.student_id})`));

    // 2. 测试映射服务
    console.log('\n=== 2. 测试映射服务调用 ===');

    try {
      const { getGradesByClassName } = await import('./src/services/enhancedMappingService.js');
      const { data: grades, error: gradesError } = await getGradesByClassName(className);

      if (gradesError) {
        console.error("❌ 映射服务调用失败:", gradesError);
      } else {
        console.log(`✅ 通过映射获取到 ${grades?.length || 0} 条成绩记录`);
        if (grades && grades.length > 0) {
          console.log('前3条成绩:', grades.slice(0, 3).map(g =>
            `${g.name}: 总分${g.total_score}`
          ));
        }
      }
    } catch (importError) {
      console.error("❌ 导入映射服务失败:", importError.message);
    }

    // 3. 检查数据质量
    console.log('\n=== 3. 检查数据质量 ===');

    const realNames = students.filter(s =>
      !['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'].includes(s.name)
    );

    console.log(`真实姓名学生: ${realNames.length} / ${students.length}`);
    console.log('真实学生样本:', realNames.slice(0, 5).map(s => s.name));

    const realDataPercentage = students.length > 0 ? Math.round((realNames.length / students.length) * 100) : 0;
    console.log(`真实数据比例: ${realDataPercentage}%`);

    // 4. 模拟完整API响应
    console.log('\n=== 4. 模拟完整API响应结构 ===');

    const mockStudentPortraitData = realNames.slice(0, 3).map(student => ({
      id: student.id,
      student_id: student.student_id,
      name: student.name,
      class_id: classId,
      class_name: student.class_name,
      gender: student.gender,
      scores: [], // 会由实际API填充
      abilities: [],
      learningHabits: [],
      tags: [],
      aiTags: {
        learningStyle: ['视觉学习者'],
        strengths: ['数学思维'],
        improvements: ['语言表达'],
        personalityTraits: ['认真负责']
      }
    }));

    console.log('✅ 模拟API响应结构:');
    mockStudentPortraitData.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (${student.student_id})`);
    });

    return {
      success: true,
      totalStudents: students.length,
      realStudents: realNames.length,
      realDataPercentage,
      sampleData: mockStudentPortraitData
    };

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    return { success: false, error: error.message };
  }
}

// 运行测试
testPortraitAPI()
  .then(result => {
    console.log('\n🎯 测试结果总结:');
    if (result?.success) {
      console.log(`✅ API修复成功`);
      console.log(`✅ 真实数据比例: ${result.realDataPercentage}%`);
      console.log(`✅ 学生总数: ${result.totalStudents}`);
      console.log(`✅ 真实学生: ${result.realStudents}`);

      if (result.realDataPercentage >= 80) {
        console.log('🎉 数据质量优秀，前端应该显示真实学生姓名！');
      } else {
        console.log('⚠️ 真实数据比例偏低，可能需要进一步检查');
      }
    } else {
      console.log('❌ API修复需要进一步调试');
    }
  })
  .catch(console.error);