const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function checkExamsTable() {
  console.log('🔍 检查exams表和grade_data表中的考试信息...\n');
  
  try {
    // 检查exams表
    console.log('📊 检查exams表:');
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*');
    
    if (examsError) {
      console.error('❌ 查询exams表失败:', examsError);
    } else {
      console.log(`  - 记录数: ${exams ? exams.length : 0}`);
      if (exams && exams.length > 0) {
        console.log('  - 考试记录:');
        exams.forEach((exam, index) => {
          console.log(`    ${index + 1}. ${exam.title} (${exam.id})`);
          console.log(`       类型: ${exam.type}, 日期: ${exam.date}`);
        });
      } else {
        console.log('  ⚠️ exams表为空 - 这是问题的根源！');
      }
    }
    
    // 检查grade_data中的考试信息
    console.log('\n📋 检查grade_data中的考试信息:');
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('exam_id, exam_title, exam_type, exam_date')
      .limit(5);
    
    if (gradeError) {
      console.error('❌ 查询grade_data失败:', gradeError);
    } else {
      console.log(`  - 记录数: ${gradeData ? gradeData.length : 0}`);
      if (gradeData && gradeData.length > 0) {
        console.log('  - 考试信息样本:');
        gradeData.forEach((item, index) => {
          console.log(`    ${index + 1}. exam_id: ${item.exam_id}`);
          console.log(`       title: ${item.exam_title || '无'}`);
          console.log(`       type: ${item.exam_type || '无'}`);
          console.log(`       date: ${item.exam_date || '无'}`);
          console.log('');
        });
        
        // 检查是否有重复的exam_id
        const uniqueExamIds = [...new Set(gradeData.map(item => item.exam_id))];
        console.log(`  - 唯一考试ID数量: ${uniqueExamIds.length}`);
        console.log(`  - 考试ID列表: ${uniqueExamIds.join(', ')}`);
      }
    }
    
    // 分析问题
    console.log('\n🔍 问题分析:');
    if (!exams || exams.length === 0) {
      console.log('❌ 问题确认: exams表为空');
      console.log('💡 解决方案: 需要根据grade_data中的考试信息创建exams表记录');
      
      if (gradeData && gradeData.length > 0) {
        const uniqueExamIds = [...new Set(gradeData.map(item => item.exam_id))];
        console.log(`\n📝 建议创建的考试记录:`);
        uniqueExamIds.forEach(examId => {
          const sampleData = gradeData.find(item => item.exam_id === examId);
          console.log(`  - ID: ${examId}`);
          console.log(`    标题: ${sampleData.exam_title || '未知考试'}`);
          console.log(`    类型: ${sampleData.exam_type || '月考'}`);
          console.log(`    日期: ${sampleData.exam_date || '2024-05-31'}`);
        });
      }
    } else {
      console.log('✅ exams表有数据，问题可能在其他地方');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkExamsTable(); 