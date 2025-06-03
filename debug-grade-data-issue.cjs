const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase配置缺失');
  console.log('当前环境变量:', {
    SUPABASE_URL: process.env.SUPABASE_URL ? '已设置' : '未设置',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '已设置' : '未设置',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '已设置' : '未设置',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '已设置' : '未设置'
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGradeDataIssue() {
  console.log('🔍 调试成绩数据查询问题\n');
  console.log('📍 Supabase配置:');
  console.log('- URL:', supabaseUrl);
  console.log('- Key:', supabaseKey.substring(0, 20) + '...');

  try {
    // 1. 检查考试表数据
    console.log('1️⃣ 检查考试表数据...');
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('*')
      .limit(5);
    
    if (examError) {
      console.error('❌ 考试表查询错误:', examError);
    } else {
      console.log(`✅ 考试表有 ${exams?.length || 0} 条记录`);
      if (exams && exams.length > 0) {
        console.log('📋 前5个考试:', exams.map(e => ({
          id: e.id,
          name: e.exam_name,
          type: e.exam_type,
          date: e.exam_date
        })));
      }
    }

    // 2. 检查成绩表数据
    console.log('\n2️⃣ 检查成绩表数据...');
    const { data: grades, error: gradeError } = await supabase
      .from('grades')
      .select('*')
      .limit(10);
    
    if (gradeError) {
      console.error('❌ 成绩表查询错误:', gradeError);
    } else {
      console.log(`✅ 成绩表有 ${grades?.length || 0} 条记录`);
      if (grades && grades.length > 0) {
        console.log('📊 前10条成绩记录:', grades.map(g => ({
          id: g.id,
          exam_id: g.exam_id,
          student_id: g.student_id,
          subject: g.subject,
          score: g.score
        })));
      }
    }

    // 3. 检查特定考试的成绩数据
    if (exams && exams.length > 0) {
      const testExamId = exams[0].id;
      console.log(`\n3️⃣ 检查考试ID [${testExamId}] 的成绩数据...`);
      
      const { data: examGrades, error: examGradeError } = await supabase
        .from('grades')
        .select(`
          *,
          students (
            student_id,
            name,
            class_name
          )
        `)
        .eq('exam_id', testExamId);
      
      if (examGradeError) {
        console.error('❌ 特定考试成绩查询错误:', examGradeError);
      } else {
        console.log(`✅ 考试 [${testExamId}] 有 ${examGrades?.length || 0} 条成绩记录`);
        if (examGrades && examGrades.length > 0) {
          console.log('📊 成绩详情:', examGrades.slice(0, 5).map(g => ({
            student: g.students?.name,
            subject: g.subject,
            score: g.score
          })));
        }
      }
    }

    // 4. 检查学生表数据
    console.log('\n4️⃣ 检查学生表数据...');
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .limit(5);
    
    if (studentError) {
      console.error('❌ 学生表查询错误:', studentError);
    } else {
      console.log(`✅ 学生表有 ${students?.length || 0} 条记录`);
      if (students && students.length > 0) {
        console.log('👥 前5个学生:', students.map(s => ({
          id: s.id,
          student_id: s.student_id,
          name: s.name,
          class_name: s.class_name
        })));
      }
    }

    // 5. 检查数据关联情况
    console.log('\n5️⃣ 检查数据关联情况...');
    const { data: gradeStats, error: statsError } = await supabase
      .from('grades')
      .select('exam_id')
      .not('exam_id', 'is', null);
    
    if (statsError) {
      console.error('❌ 统计查询错误:', statsError);
    } else {
      const examIds = [...new Set(gradeStats?.map(g => g.exam_id) || [])];
      console.log(`✅ 成绩表中涉及 ${examIds.length} 个不同的考试ID`);
      console.log('🔗 考试ID列表:', examIds.slice(0, 5));
    }

    // 6. 检查RLS策略
    console.log('\n6️⃣ 检查当前用户认证状态...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ 用户认证错误:', userError);
    } else if (!user) {
      console.log('⚠️ 当前用户未登录，这可能是RLS策略阻止数据访问的原因');
    } else {
      console.log('✅ 用户已登录:', {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role
      });
    }

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  }
}

debugGradeDataIssue(); 