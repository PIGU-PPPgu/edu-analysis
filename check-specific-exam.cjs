const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase配置缺失');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificExam() {
  console.log('🔍 检查特定考试ID的成绩数据\n');

  // 用户日志中显示的考试ID
  const examIds = [
    '5bc46dd7-602a-414e-af91-e0a1abec8dea', // 测试20
    'fc7d3bf5-3cb5-4f87-bcd4-a17ed647ad4c', // 18
    '6af37767-3719-4d39-b4ab-08a3f558d393'  // 测试14 (有数据的)
  ];

  try {
    for (const examId of examIds) {
      console.log(`\n📋 检查考试ID: ${examId}`);
      
      // 1. 查询考试信息
      const { data: examInfo, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      
      if (examError) {
        console.error(`❌ 查询考试信息失败:`, examError);
        continue;
      }
      
      if (!examInfo) {
        console.log(`⚠️ 考试不存在`);
        continue;
      }
      
      console.log(`✅ 考试信息:`, {
        title: examInfo.title,
        type: examInfo.type,
        date: examInfo.date,
        created_by: examInfo.created_by
      });
      
      // 2. 查询关联的成绩数据
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data')
        .select('*')
        .eq('exam_id', examId);
      
      if (gradeError) {
        console.error(`❌ 查询成绩数据失败:`, gradeError);
        continue;
      }
      
      console.log(`📊 成绩记录数: ${gradeData?.length || 0}`);
      
      if (gradeData && gradeData.length > 0) {
        console.log(`📈 前3条成绩记录:`);
        gradeData.slice(0, 3).forEach((record, index) => {
          console.log(`   ${index + 1}. 学生: ${record.name} (${record.student_id}), 班级: ${record.class_name}, 分数: ${record.score || record.total_score}`);
        });
        
        // 统计班级和学生数量
        const classes = [...new Set(gradeData.map(r => r.class_name))].filter(Boolean);
        const students = [...new Set(gradeData.map(r => r.student_id))].filter(Boolean);
        console.log(`📊 统计信息: ${classes.length}个班级, ${students.length}个学生`);
        console.log(`📚 班级列表: ${classes.join(', ')}`);
      }
    }

    // 3. 检查所有有成绩数据的考试
    console.log(`\n🔍 查询所有有成绩数据的考试...`);
    const { data: examWithGrades, error: examWithGradesError } = await supabase
      .rpc('get_exams_with_grade_count');
    
    if (examWithGradesError) {
      // 手动查询
      console.log('使用手动查询方式...');
      const { data: allGrades, error: allGradesError } = await supabase
        .from('grade_data')
        .select('exam_id, count(*)')
        .not('exam_id', 'is', null);
      
      if (allGradesError) {
        console.error('❌ 查询失败:', allGradesError);
      } else {
        // 按exam_id分组统计
        const examCounts = {};
        for (const grade of allGrades || []) {
          examCounts[grade.exam_id] = (examCounts[grade.exam_id] || 0) + 1;
        }
        
        console.log('✅ 有成绩数据的考试统计:');
        for (const [examId, count] of Object.entries(examCounts)) {
          console.log(`  - ${examId}: ${count}条记录`);
        }
      }
    } else {
      console.log('✅ 有成绩数据的考试:', examWithGrades);
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkSpecificExam(); 