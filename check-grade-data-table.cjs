const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase配置缺失');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGradeDataTable() {
  console.log('🔍 检查grade_data表中的数据\n');

  try {
    // 1. 检查grade_data表是否存在
    console.log('1️⃣ 检查grade_data表...');
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('*')
      .limit(5);
    
    if (gradeError) {
      console.error('❌ grade_data表查询错误:', gradeError);
    } else {
      console.log(`✅ grade_data表有 ${gradeData?.length || 0} 条记录`);
      if (gradeData && gradeData.length > 0) {
        console.log('📊 前5条记录:', gradeData);
      }
    }

    // 2. 检查grade_data表的统计信息
    console.log('\n2️⃣ 检查grade_data表统计信息...');
    const { count, error: countError } = await supabase
      .from('grade_data')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ 统计查询错误:', countError);
    } else {
      console.log(`✅ grade_data表总记录数: ${count}`);
    }

    // 3. 检查exams表的数据
    console.log('\n3️⃣ 检查exams表的详细数据...');
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*');
    
    if (examError) {
      console.error('❌ exams表查询错误:', examError);
    } else {
      console.log(`✅ exams表有 ${examData?.length || 0} 条记录`);
      examData?.forEach((exam, index) => {
        console.log(`📋 考试 ${index + 1}:`, {
          id: exam.id,
          title: exam.title,
          type: exam.type,
          date: exam.date,
          created_by: exam.created_by
        });
      });
    }

    // 4. 检查grade_data和exams的关联
    if (examData && examData.length > 0) {
      console.log('\n4️⃣ 检查grade_data和exams的关联...');
      for (const exam of examData.slice(0, 3)) {
        const { data: relatedGrades, error: relatedError } = await supabase
          .from('grade_data')
          .select('*')
          .eq('exam_id', exam.id);
        
        if (relatedError) {
          console.error(`❌ 考试[${exam.id}]关联成绩查询错误:`, relatedError);
        } else {
          console.log(`📊 考试[${exam.title || exam.id}]关联的成绩记录数: ${relatedGrades?.length || 0}`);
        }
      }
    }

    // 5. 检查class_info表
    console.log('\n5️⃣ 检查class_info表数据...');
    const { data: classData, error: classError } = await supabase
      .from('class_info')
      .select('*');
    
    if (classError) {
      console.error('❌ class_info表查询错误:', classError);
    } else {
      console.log(`✅ class_info表有 ${classData?.length || 0} 条记录`);
      classData?.forEach((cls, index) => {
        console.log(`🏫 班级 ${index + 1}:`, {
          class_name: cls.class_name,
          grade_level: cls.grade_level,
          student_count: cls.student_count
        });
      });
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkGradeDataTable(); 