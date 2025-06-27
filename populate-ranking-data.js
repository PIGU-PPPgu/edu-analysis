import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateRankingData() {
  console.log('🔄 开始填充排名数据...\n');
  
  try {
    // 1. 填充班级排名 (rank_in_class)
    console.log('📊 计算班级排名...');
    const classRankSQL = `
      UPDATE grade_data 
      SET rank_in_class = (
        SELECT COUNT(*) + 1 
        FROM grade_data g2 
        WHERE g2.class_name = grade_data.class_name 
        AND g2.exam_id = grade_data.exam_id 
        AND g2.total_score > grade_data.total_score
      )
      WHERE total_score IS NOT NULL AND rank_in_class IS NULL;
    `;
    
    const { data: classRankResult, error: classRankError } = await supabase.rpc('exec_sql', {
      sql_query: classRankSQL
    });
    
    if (classRankError) {
      console.error('❌ 班级排名计算失败:', classRankError);
    } else {
      console.log('✅ 班级排名计算完成');
    }
    
    // 2. 填充年级排名 (rank_in_grade) 
    console.log('📊 计算年级排名...');
    const gradeRankSQL = `
      UPDATE grade_data 
      SET rank_in_grade = (
        SELECT COUNT(*) + 1 
        FROM grade_data g2 
        WHERE g2.exam_id = grade_data.exam_id 
        AND g2.total_score > grade_data.total_score
      )
      WHERE total_score IS NOT NULL AND rank_in_grade IS NULL;
    `;
    
    const { data: gradeRankResult, error: gradeRankError } = await supabase.rpc('exec_sql', {
      sql_query: gradeRankSQL
    });
    
    if (gradeRankError) {
      console.error('❌ 年级排名计算失败:', gradeRankError);
    } else {
      console.log('✅ 年级排名计算完成');
    }
    
    // 3. 填充学校排名 (假设所有数据都是同一学校)
    console.log('📊 计算学校排名...');
    const schoolRankSQL = `
      UPDATE grade_data 
      SET rank_in_school = rank_in_grade
      WHERE rank_in_grade IS NOT NULL AND rank_in_school IS NULL;
    `;
    
    const { data: schoolRankResult, error: schoolRankError } = await supabase.rpc('exec_sql', {
      sql_query: schoolRankSQL
    });
    
    if (schoolRankError) {
      console.error('❌ 学校排名计算失败:', schoolRankError);
    } else {
      console.log('✅ 学校排名计算完成');
    }
    
    // 4. 填充等级数据 (grade_level)
    console.log('📊 计算等级数据...');
    const gradeLevelSQL = `
      UPDATE grade_data 
      SET grade_level = CASE 
        WHEN rank_in_class <= GREATEST(1, (SELECT COUNT(*) FROM grade_data g2 WHERE g2.class_name = grade_data.class_name AND g2.exam_id = grade_data.exam_id) * 0.1) THEN 'A+'
        WHEN rank_in_class <= GREATEST(1, (SELECT COUNT(*) FROM grade_data g2 WHERE g2.class_name = grade_data.class_name AND g2.exam_id = grade_data.exam_id) * 0.2) THEN 'A'
        WHEN rank_in_class <= GREATEST(1, (SELECT COUNT(*) FROM grade_data g2 WHERE g2.class_name = grade_data.class_name AND g2.exam_id = grade_data.exam_id) * 0.4) THEN 'B+'
        WHEN rank_in_class <= GREATEST(1, (SELECT COUNT(*) FROM grade_data g2 WHERE g2.class_name = grade_data.class_name AND g2.exam_id = grade_data.exam_id) * 0.6) THEN 'B'
        WHEN rank_in_class <= GREATEST(1, (SELECT COUNT(*) FROM grade_data g2 WHERE g2.class_name = grade_data.class_name AND g2.exam_id = grade_data.exam_id) * 0.8) THEN 'C+'
        ELSE 'C'
      END,
      grade = grade_level
      WHERE rank_in_class IS NOT NULL AND grade_level IS NULL;
    `;
    
    const { data: gradeLevelResult, error: gradeLevelError } = await supabase.rpc('exec_sql', {
      sql_query: gradeLevelSQL
    });
    
    if (gradeLevelError) {
      console.error('❌ 等级数据计算失败:', gradeLevelError);
    } else {
      console.log('✅ 等级数据计算完成');
    }
    
    // 5. 验证结果
    console.log('\n🔍 验证填充结果...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('grade_data')
      .select('name, class_name, total_score, rank_in_class, rank_in_grade, rank_in_school, grade_level')
      .not('rank_in_class', 'is', null)
      .limit(5);
    
    if (verifyError) {
      console.error('❌ 验证查询失败:', verifyError);
    } else {
      console.log('✅ 验证结果样本:');
      verifyData.forEach((record, index) => {
        console.log(`${index + 1}. ${record.name} (${record.class_name}): 总分${record.total_score}, 班级排名${record.rank_in_class}, 年级排名${record.rank_in_grade}, 等级${record.grade_level}`);
      });
    }
    
    // 6. 统计填充数量
    const { count: totalFilled, error: countError } = await supabase
      .from('grade_data')
      .select('*', { count: 'exact', head: true })
      .not('rank_in_class', 'is', null);
    
    if (countError) {
      console.error('❌ 统计查询失败:', countError);
    } else {
      console.log(`\n📈 填充统计: ${totalFilled} 条记录已填充排名数据`);
    }
    
  } catch (error) {
    console.error('❌ 填充过程中发生错误:', error);
  }
}

// 执行填充
populateRankingData()
  .then(() => {
    console.log('\n✅ 排名数据填充完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 填充失败:', error);
    process.exit(1);
  });