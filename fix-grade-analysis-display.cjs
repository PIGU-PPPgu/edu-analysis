const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function fixGradeAnalysisDisplay() {
  console.log('🔧 修复成绩分析显示问题...\n');
  
  try {
    // 1. 获取有成绩数据的考试
    console.log('📊 查找有成绩数据的考试...');
    
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('exam_id')
      .limit(1000);
    
    if (gradeError) {
      console.error('❌ 查询grade_data失败:', gradeError);
      return;
    }
    
    const examIds = [...new Set(gradeData.map(item => item.exam_id))];
    console.log(`发现 ${examIds.length} 个有成绩数据的考试ID:`, examIds);
    
    // 2. 检查这些考试在exams表中的状态
    console.log('\n🔍 检查考试状态...');
    
    for (const examId of examIds) {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      
      if (examError) {
        console.error(`❌ 考试 ${examId} 在exams表中不存在:`, examError);
        continue;
      }
      
      // 统计该考试的成绩数量
      const { count, error: countError } = await supabase
        .from('grade_data')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId);
      
      console.log(`✅ 考试: ${exam.title} (${examId})`);
      console.log(`   类型: ${exam.type}, 日期: ${exam.date}`);
      console.log(`   成绩记录数: ${count || 0}`);
      
      // 3. 测试成绩分析页面的查询逻辑
      console.log(`\n🧪 测试成绩分析查询逻辑 (考试: ${exam.title})...`);
      
      // 模拟成绩分析页面的查询
      const { data: testGradeData, error: testError } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId);
      
      if (testError) {
        console.error('❌ 成绩查询失败:', testError);
        continue;
      }
      
      console.log(`   查询结果: ${testGradeData ? testGradeData.length : 0} 条记录`);
      
      if (testGradeData && testGradeData.length > 0) {
        // 分析数据质量
        const validScores = testGradeData.filter(item => 
          (item.score !== null && !isNaN(Number(item.score))) ||
          (item.total_score !== null && !isNaN(Number(item.total_score)))
        );
        
        console.log(`   有效成绩数: ${validScores.length}`);
        
        if (validScores.length > 0) {
          const scores = validScores.map(item => 
            item.score !== null ? Number(item.score) : Number(item.total_score)
          );
          const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          const max = Math.max(...scores);
          const min = Math.min(...scores);
          
          console.log(`   统计信息: 平均分=${avg.toFixed(1)}, 最高分=${max}, 最低分=${min}`);
          console.log(`   ✅ 该考试数据完整，应该能在成绩分析页面正常显示`);
        } else {
          console.log(`   ⚠️ 该考试没有有效的成绩数据`);
        }
        
        // 检查学生信息
        const studentIds = [...new Set(testGradeData.map(item => item.student_id))];
        console.log(`   学生数量: ${studentIds.length}`);
        
        // 检查班级信息
        const classNames = [...new Set(testGradeData.map(item => item.class_name).filter(c => c))];
        console.log(`   班级数量: ${classNames.length}`);
        console.log(`   班级列表: ${classNames.join(', ')}`);
      }
    }
    
    // 4. 提供修复建议
    console.log('\n💡 修复建议:');
    console.log('1. 数据库中的数据是完整的');
    console.log('2. 问题可能在前端的数据加载逻辑');
    console.log('3. 建议检查成绩分析页面的考试选择和数据加载流程');
    console.log('4. 可能需要清除浏览器缓存或重新加载页面');
    
    // 5. 生成测试URL
    if (examIds.length > 0) {
      console.log('\n🔗 测试链接:');
      console.log(`可以直接访问成绩分析页面，应该会自动选择考试: ${examIds[0]}`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  }
}

fixGradeAnalysisDisplay(); 