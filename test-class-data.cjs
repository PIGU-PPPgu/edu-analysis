const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testClassData() {
  console.log("🔍 开始检查班级数据...\n");
  
  try {
    // 1. 检查考试列表
    console.log("1. 检查考试列表:");
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('*')
      .order('date', { ascending: false });
    
    if (examError) {
      console.error("❌ 获取考试列表失败:", examError);
      return;
    }
    
    console.log(`✅ 找到 ${exams.length} 个考试:`);
    exams.forEach(exam => {
      console.log(`   - ${exam.title} (${exam.type}) - ${exam.date}`);
    });
    
    if (exams.length === 0) {
      console.log("❌ 没有找到考试数据，请先导入考试数据");
      return;
    }
    
    // 2. 检查第一个考试的成绩数据
    const firstExam = exams[0];
    console.log(`\n2. 检查考试 "${firstExam.title}" 的成绩数据:`);
    
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('*')
      .eq('exam_id', firstExam.id)
      .limit(10);
    
    if (gradeError) {
      console.error("❌ 获取成绩数据失败:", gradeError);
      return;
    }
    
    console.log(`✅ 找到 ${gradeData.length} 条成绩记录 (显示前10条):`);
    gradeData.forEach(grade => {
      console.log(`   - 学生: ${grade.student_id} | 姓名: ${grade.name} | 班级: ${grade.class_name} | 科目: ${grade.subject} | 分数: ${grade.score}`);
    });
    
    // 3. 统计班级分布
    console.log(`\n3. 统计班级分布:`);
    const { data: allGrades, error: allGradeError } = await supabase
      .from('grade_data')
      .select('class_name')
      .eq('exam_id', firstExam.id);
    
    if (allGradeError) {
      console.error("❌ 获取所有成绩数据失败:", allGradeError);
      return;
    }
    
    const classStats = {};
    allGrades.forEach(grade => {
      const className = grade.class_name || '未知班级';
      classStats[className] = (classStats[className] || 0) + 1;
    });
    
    console.log("班级统计:");
    Object.entries(classStats).forEach(([className, count]) => {
      console.log(`   - ${className}: ${count} 条记录`);
    });
    
    // 4. 检查学生表中的班级信息
    console.log(`\n4. 检查学生表中的班级信息:`);
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('student_id, name, class_name')
      .limit(10);
    
    if (studentError) {
      console.error("❌ 获取学生数据失败:", studentError);
      return;
    }
    
    console.log(`✅ 找到 ${students.length} 个学生 (显示前10个):`);
    students.forEach(student => {
      console.log(`   - 学号: ${student.student_id} | 姓名: ${student.name} | 班级: ${student.class_name}`);
    });
    
    // 5. 统计学生表中的班级分布
    const { data: allStudents, error: allStudentError } = await supabase
      .from('students')
      .select('class_name');
    
    if (allStudentError) {
      console.error("❌ 获取所有学生数据失败:", allStudentError);
      return;
    }
    
    const studentClassStats = {};
    allStudents.forEach(student => {
      const className = student.class_name || '未知班级';
      studentClassStats[className] = (studentClassStats[className] || 0) + 1;
    });
    
    console.log("\n学生表班级统计:");
    Object.entries(studentClassStats).forEach(([className, count]) => {
      console.log(`   - ${className}: ${count} 个学生`);
    });
    
    // 6. 检查数据一致性
    console.log(`\n5. 数据一致性检查:`);
    const gradeStudentIds = new Set(allGrades.map(g => g.student_id).filter(id => id));
    const studentIds = new Set(allStudents.map(s => s.student_id).filter(id => id));
    
    console.log(`成绩表中的学生数: ${gradeStudentIds.size}`);
    console.log(`学生表中的学生数: ${studentIds.size}`);
    
    const missingInStudents = [...gradeStudentIds].filter(id => !studentIds.has(id));
    const missingInGrades = [...studentIds].filter(id => !gradeStudentIds.has(id));
    
    if (missingInStudents.length > 0) {
      console.log(`⚠️  成绩表中有 ${missingInStudents.length} 个学生在学生表中不存在:`);
      missingInStudents.slice(0, 5).forEach(id => console.log(`   - ${id}`));
      if (missingInStudents.length > 5) {
        console.log(`   ... 还有 ${missingInStudents.length - 5} 个`);
      }
    }
    
    if (missingInGrades.length > 0) {
      console.log(`⚠️  学生表中有 ${missingInGrades.length} 个学生在成绩表中没有成绩:`);
      missingInGrades.slice(0, 5).forEach(id => console.log(`   - ${id}`));
      if (missingInGrades.length > 5) {
        console.log(`   ... 还有 ${missingInGrades.length - 5} 个`);
      }
    }
    
    if (missingInStudents.length === 0 && missingInGrades.length === 0) {
      console.log("✅ 数据一致性检查通过");
    }
    
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
  }
}

testClassData(); 