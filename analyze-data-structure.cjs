const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function analyzeDataStructure() {
  console.log('🔍 分析当前数据结构和导入策略...\n');
  
  try {
    // 检查当前数据
    const { data: allData, error } = await supabase
      .from('grade_data')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    if (allData && allData.length > 0) {
      const fields = Object.keys(allData[0]);
      const customFields = fields.filter(f => f.startsWith('custom_'));
      const standardFields = fields.filter(f => !f.startsWith('custom_'));
      
      console.log('📋 标准字段:');
      standardFields.forEach(field => {
        console.log(`  - ${field}`);
      });
      
      console.log(`\n🔧 自定义字段 (${customFields.length}个):`);
      customFields.forEach(field => {
        console.log(`  - ${field}`);
      });
      
      console.log('\n📊 示例数据分析:');
      const sample = allData[0];
      
      // 分析科目相关的自定义字段
      console.log('\n🎯 科目相关字段分析:');
      customFields.slice(0, 10).forEach(field => {
        const value = sample[field];
        if (value !== null && value !== undefined && value !== '') {
          console.log(`  ${field}: ${value}`);
        }
      });
      
      // 检查是否有多个学生的数据
      console.log('\n👥 学生数据分布:');
      const { data: studentStats } = await supabase
        .from('grade_data')
        .select('student_id, name, class_name, subject, score, total_score')
        .limit(10);
      
      if (studentStats) {
        studentStats.forEach((student, index) => {
          console.log(`  ${index + 1}. ${student.name} (${student.student_id}) - 班级: ${student.class_name}`);
          console.log(`     科目: ${student.subject || '无'}, 分数: ${student.score || student.total_score || '无'}`);
        });
      }
      
      // 分析数据导入模式
      console.log('\n📈 数据导入模式分析:');
      
      // 检查是否所有记录都有相同的exam_id
      const { data: examIds } = await supabase
        .from('grade_data')
        .select('exam_id')
        .limit(50);
      
      if (examIds) {
        const uniqueExamIds = [...new Set(examIds.map(e => e.exam_id))];
        console.log(`  - 考试数量: ${uniqueExamIds.length}`);
        console.log(`  - 总记录数: ${examIds.length}`);
        
        if (uniqueExamIds.length === 1) {
          console.log('  - 模式: 单次考试，多个学生');
          console.log('  - 问题: 如果是分科目成绩，需要修改约束');
        } else {
          console.log('  - 模式: 多次考试');
        }
      }
      
    }
    
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error);
  }
}

analyzeDataStructure(); 