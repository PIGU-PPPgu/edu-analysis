const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testPortraitData() {
  console.log('=== 检查班级数据 ===');
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name, grade')
    .limit(5);
  
  if (classError) {
    console.error('班级查询错误:', classError);
  } else {
    console.log('班级数据:', classes);
  }
  
  console.log('\n=== 检查学生数据 ===');
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, student_id, name, class_name, class_id')
    .limit(5);
  
  if (studentError) {
    console.error('学生查询错误:', studentError);
  } else {
    console.log('学生数据:', students);
  }
  
  console.log('\n=== 检查成绩数据 ===');
  const { data: grades, error: gradeError } = await supabase
    .from('grade_data')
    .select('student_id, name, class_name, subject, score')
    .limit(5);
  
  if (gradeError) {
    console.error('成绩查询错误:', gradeError);
  } else {
    console.log('成绩数据:', grades);
  }
  
  // 测试画像API接口
  if (classes && classes.length > 0) {
    console.log('\n=== 测试班级画像API ===');
    const testClassId = classes[0].id;
    console.log('测试班级ID:', testClassId);
    
    // 检查班级学生数量
    const { data: classStudents, error: classStudentsError } = await supabase
      .from('students')
      .select('id, student_id, name, gender')
      .eq('class_id', testClassId);
    
    if (classStudentsError) {
      console.error('班级学生查询错误:', classStudentsError);
    } else {
      console.log('班级学生数量:', classStudents?.length || 0);
      console.log('班级学生样本:', classStudents?.slice(0, 3));
    }
  }
}

testPortraitData().catch(console.error); 