const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function fixExamSelectionLogic() {
  console.log('🔧 修复考试选择逻辑...\n');
  
  try {
    // 1. 获取所有考试并检查字段
    console.log('📊 获取考试列表并检查字段...');
    
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .order('date', { ascending: false });
    
    if (examsError) {
      console.error('❌ 获取考试列表失败:', examsError);
      return;
    }
    
    console.log(`发现 ${exams.length} 个考试`);
    
    if (exams.length > 0) {
      console.log('考试字段:', Object.keys(exams[0]));
      
      // 检查每个考试的成绩数量
      console.log('\n📈 检查每个考试的成绩数量...');
      
      const examsWithCounts = [];
      
      for (const exam of exams) {
        const { count, error: countError } = await supabase
          .from('grade_data')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', exam.id);
        
        const gradeCount = countError ? 0 : (count || 0);
        
        examsWithCounts.push({
          ...exam,
          gradeCount
        });
        
        console.log(`  ${exam.title}: ${gradeCount} 条成绩记录`);
      }
      
      // 2. 找出有成绩数据的考试
      const examsWithGrades = examsWithCounts.filter(exam => exam.gradeCount > 0);
      
      console.log(`\n✅ 有成绩数据的考试: ${examsWithGrades.length} 个`);
      
      if (examsWithGrades.length > 0) {
        // 按日期排序，选择最新的有数据的考试
        const sortedExamsWithGrades = examsWithGrades.sort((a, b) => {
          const dateA = new Date(a.date || '1970-01-01');
          const dateB = new Date(b.date || '1970-01-01');
          return dateB.getTime() - dateA.getTime();
        });
        
        const recommendedExam = sortedExamsWithGrades[0];
        
        console.log(`\n🎯 推荐选择的考试:`);
        console.log(`  ID: ${recommendedExam.id}`);
        console.log(`  标题: ${recommendedExam.title}`);
        console.log(`  类型: ${recommendedExam.type}`);
        console.log(`  日期: ${recommendedExam.date}`);
        console.log(`  成绩数量: ${recommendedExam.gradeCount}`);
        
        // 3. 测试该考试的数据加载
        console.log(`\n🧪 测试推荐考试的数据加载...`);
        
        const { data: testGradeData, error: testError } = await supabase
          .from('grade_data')
          .select('*')
          .eq('exam_id', recommendedExam.id);
        
        if (testError) {
          console.error('❌ 测试数据加载失败:', testError);
        } else {
          console.log(`✅ 成功加载 ${testGradeData.length} 条成绩记录`);
          
          // 分析数据质量
          const validScores = testGradeData.filter(item => 
            (item.score !== null && !isNaN(Number(item.score))) ||
            (item.total_score !== null && !isNaN(Number(item.total_score)))
          );
          
          if (validScores.length > 0) {
            const scores = validScores.map(item => 
              item.score !== null ? Number(item.score) : Number(item.total_score)
            );
            const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            
            console.log(`  有效成绩: ${validScores.length} 条`);
            console.log(`  平均分: ${avg.toFixed(1)}`);
            console.log(`  ✅ 数据质量良好，应该能正常显示`);
          }
        }
        
        // 4. 生成前端修复代码
        console.log(`\n💻 前端修复建议:`);
        console.log(`1. 确保考试选择逻辑优先选择有数据的考试`);
        console.log(`2. 考试ID ${recommendedExam.id} 应该被自动选中`);
        console.log(`3. 如果仍然显示"没有数据"，可能是缓存问题`);
        
      } else {
        console.log('❌ 没有找到有成绩数据的考试');
        
        // 检查是否有孤立的成绩数据
        const { data: orphanGrades, error: orphanError } = await supabase
          .from('grade_data')
          .select('exam_id')
          .limit(10);
        
        if (!orphanError && orphanGrades && orphanGrades.length > 0) {
          const orphanExamIds = [...new Set(orphanGrades.map(g => g.exam_id))];
          console.log('⚠️ 发现孤立的成绩数据，exam_id:', orphanExamIds);
          console.log('💡 建议: 为这些成绩数据创建对应的考试记录');
        }
      }
    }
    
    // 5. 提供具体的修复步骤
    console.log(`\n🛠️ 修复步骤:`);
    console.log(`1. 清除浏览器缓存和localStorage`);
    console.log(`2. 重新访问成绩分析页面`);
    console.log(`3. 检查浏览器控制台的日志输出`);
    console.log(`4. 如果问题仍然存在，可能需要修改前端代码`);
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  }
}

fixExamSelectionLogic(); 