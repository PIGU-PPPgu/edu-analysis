const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function checkTableStructure() {
  console.log('🔍 检查grade_data表结构和数据...\n');
  
  try {
    // 查询表的数据
    const { data, error } = await supabase
      .from('grade_data')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('📋 表字段:', Object.keys(data[0]));
      console.log('\n📊 示例数据:');
      data.forEach((row, index) => {
        console.log(`  ${index + 1}. exam_id: ${row.exam_id}`);
        console.log(`     student_id: ${row.student_id}`);
        console.log(`     subject: ${row.subject}`);
        console.log(`     score: ${row.score}`);
        console.log(`     created_at: ${row.created_at}`);
        console.log('');
      });
    }
    
    // 查询表的总记录数
    const { count, error: countError } = await supabase
      .from('grade_data')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`📈 总记录数: ${count}`);
    }
    
    // 检查subject字段的分布
    const { data: subjectData, error: subjectError } = await supabase
      .from('grade_data')
      .select('subject')
      .not('subject', 'is', null)
      .limit(10);
    
    if (!subjectError) {
      console.log('\n📚 非空subject字段示例:');
      if (subjectData && subjectData.length > 0) {
        subjectData.forEach(row => {
          console.log(`  - ${row.subject}`);
        });
      } else {
        console.log('  ⚠️ 所有subject字段都为null');
      }
    }
    
    // 检查约束信息
    console.log('\n🔒 检查约束信息...');
    const { data: constraintData, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'grade_data' });
    
    if (constraintError) {
      console.log('❌ 无法获取约束信息:', constraintError.message);
    } else if (constraintData) {
      console.log('约束信息:', constraintData);
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkTableStructure(); 