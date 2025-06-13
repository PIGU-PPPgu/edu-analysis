/**
 * 检查数据库中的考试和成绩数据
 * 用于诊断为什么成绩显示不出来
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkExamData() {
  console.log('🔍 检查数据库中的考试和成绩数据...\n');

  try {
    // 1. 检查考试表
    console.log('📋 检查考试表 (exams)...');
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (examError) {
      console.error('❌ 考试表查询失败:', examError);
    } else {
      console.log(`✅ 找到 ${exams.length} 个考试记录:`);
      exams.forEach((exam, index) => {
        console.log(`   ${index + 1}. ${exam.title} (${exam.type}) - ${exam.date || '无日期'}`);
        console.log(`      ID: ${exam.id}`);
      });
    }

    // 2. 检查成绩数据表
    console.log('\n📊 检查成绩数据表 (grade_data)...');
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('exam_id, exam_title, count(*)')
      .group('exam_id, exam_title');

    if (gradeError) {
      console.error('❌ 成绩数据表查询失败:', gradeError);
    } else {
      console.log(`✅ 成绩数据分布:`);
      gradeData.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.exam_title || '未知考试'} - ${item.count} 条记录`);
        console.log(`      考试ID: ${item.exam_id}`);
      });
    }

    // 3. 检查学生表
    console.log('\n👥 检查学生表 (students)...');
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('count(*)')
      .single();

    if (studentError) {
      console.error('❌ 学生表查询失败:', studentError);
    } else {
      console.log(`✅ 学生总数: ${students.count}`);
    }

    // 4. 检查数据关联性
    console.log('\n🔗 检查数据关联性...');
    if (exams && exams.length > 0) {
      for (const exam of exams.slice(0, 3)) { // 只检查前3个考试
        const { data: relatedGrades, error: relatedError } = await supabase
          .from('grade_data')
          .select('count(*)')
          .eq('exam_id', exam.id)
          .single();

        if (!relatedError && relatedGrades) {
          console.log(`   考试 "${exam.title}" 关联成绩数: ${relatedGrades.count}`);
        }
      }
    }

    // 5. 检查最近的数据
    console.log('\n⏰ 检查最近的数据...');
    const { data: recentGrades, error: recentError } = await supabase
      .from('grade_data')
      .select('exam_title, student_id, name, class_name, subject, score, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ 最近数据查询失败:', recentError);
    } else {
      console.log(`✅ 最近 ${recentGrades.length} 条成绩记录:`);
      recentGrades.forEach((grade, index) => {
        console.log(`   ${index + 1}. ${grade.name} (${grade.student_id}) - ${grade.subject}: ${grade.score}分`);
        console.log(`      考试: ${grade.exam_title}, 班级: ${grade.class_name}`);
        console.log(`      创建时间: ${grade.created_at}`);
      });
    }

  } catch (error) {
    console.error('💥 检查过程中发生错误:', error);
  }
}

// 运行检查
checkExamData().then(() => {
  console.log('\n🎉 数据检查完成!');
  process.exit(0);
}).catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
}); 