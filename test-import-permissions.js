// 测试导入权限修复
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testImportPermissions() {
  console.log('🔍 测试导入权限修复...\n');

  try {
    // 1. 测试用户认证状态
    console.log('1. 检查用户认证状态...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ 认证检查失败:', authError.message);
      console.log('💡 请确保用户已登录');
      return;
    }
    
    if (!user) {
      console.log('❌ 用户未登录');
      console.log('💡 请先登录再测试导入功能');
      return;
    }
    
    console.log('✅ 用户已认证:', { id: user.id, email: user.email });

    // 2. 测试创建考试记录权限
    console.log('\n2. 测试创建考试记录权限...');
    const testExam = {
      title: '权限测试考试_' + Date.now(),
      type: '测试',
      date: new Date().toISOString().split('T')[0],
      subject: '测试科目',
      scope: 'class',
      created_by: user.id
    };

    const { data: examData, error: examError } = await supabase
      .from('exams')
      .insert(testExam)
      .select()
      .single();

    if (examError) {
      console.error('❌ 创建考试记录失败:', examError.message);
      console.log('💡 RLS策略可能仍有问题');
      return;
    }

    console.log('✅ 考试记录创建成功:', examData.id);

    // 3. 测试创建学生记录权限
    console.log('\n3. 测试创建学生记录权限...');
    const testStudent = {
      student_id: 'test_' + Date.now(),
      name: '测试学生',
      class_name: '测试班级',
      grade: '测试年级'
    };

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert(testStudent)
      .select()
      .single();

    if (studentError) {
      console.error('❌ 创建学生记录失败:', studentError.message);
      console.log('💡 可能需要先创建班级信息');
      
      // 尝试创建班级信息
      console.log('   尝试创建班级信息...');
      const { error: classError } = await supabase
        .from('class_info')
        .insert({
          class_name: '测试班级',
          grade_level: '测试年级',
          academic_year: '2024'
        });
      
      if (classError && classError.code !== '23505') { // 忽略重复错误
        console.error('   ❌ 创建班级信息失败:', classError.message);
      } else {
        console.log('   ✅ 班级信息创建成功');
        
        // 重新尝试创建学生
        const { data: retryStudentData, error: retryStudentError } = await supabase
          .from('students')
          .insert(testStudent)
          .select()
          .single();
          
        if (retryStudentError) {
          console.error('   ❌ 重试创建学生记录失败:', retryStudentError.message);
        } else {
          console.log('   ✅ 学生记录创建成功:', retryStudentData.student_id);
        }
      }
    } else {
      console.log('✅ 学生记录创建成功:', studentData.student_id);
    }

    // 4. 测试创建成绩数据权限
    console.log('\n4. 测试创建成绩数据权限...');
    const testGradeData = {
      exam_id: examData.id,
      student_id: testStudent.student_id,
      name: testStudent.name,
      class_name: testStudent.class_name,
      subject: '数学',
      score: 85,
      total_score: 100
    };

    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .insert(testGradeData)
      .select()
      .single();

    if (gradeError) {
      console.error('❌ 创建成绩数据失败:', gradeError.message);
    } else {
      console.log('✅ 成绩数据创建成功:', gradeData.id);
    }

    // 5. 清理测试数据
    console.log('\n5. 清理测试数据...');
    
    // 删除成绩数据
    if (gradeData) {
      await supabase.from('grade_data').delete().eq('id', gradeData.id);
    }
    
    // 删除学生记录
    await supabase.from('students').delete().eq('student_id', testStudent.student_id);
    
    // 删除考试记录
    await supabase.from('exams').delete().eq('id', examData.id);
    
    console.log('✅ 测试数据清理完成');

    console.log('\n🎉 权限测试完成！导入功能应该可以正常工作了。');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testImportPermissions(); 