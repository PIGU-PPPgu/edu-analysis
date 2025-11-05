/**
 * 测试修复后的班级画像API
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

// 模拟修复后的portraitAPI逻辑
async function testClassPortraitStats(classId) {
  console.log('🧪 测试班级画像API修复效果...');
  console.log('输入的班级ID:', classId);

  // 解析班级ID
  let className = classId;
  if (classId.startsWith('class-')) {
    className = classId.replace('class-', '').replace(/-/g, '');
    console.log('解析后的班级名称:', className);

    // 如果解析后不像班级名称，查找匹配的班级
    if (!className.includes('班') && !className.includes('级')) {
      console.log('尝试从学生表中查找匹配的班级...');
      const { data: allStudentClasses } = await supabase
        .from('students')
        .select('class_name')
        .not('class_name', 'is', null);

      if (allStudentClasses) {
        const uniqueClasses = [...new Set(allStudentClasses.map(s => s.class_name))];
        console.log('可用班级:', uniqueClasses.slice(0, 5));

        const matchedClass = uniqueClasses.find(cls =>
          cls.toLowerCase().includes(className.toLowerCase()) ||
          className.toLowerCase().includes(cls.toLowerCase())
        );

        if (matchedClass) {
          className = matchedClass;
          console.log('匹配到班级:', matchedClass);
        }
      }
    }
  }

  console.log('最终使用的班级名称:', className);

  // 获取学生数据
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('id, gender, class_name')
    .eq('class_name', className);

  if (studentsError) {
    console.error('获取学生数据失败:', studentsError);
    return null;
  }

  console.log('找到学生数量:', studentsData?.length || 0);

  if (!studentsData || studentsData.length === 0) {
    console.log('该班级没有学生数据');
    return null;
  }

  // 获取成绩数据
  const { data: gradesData, error: gradesError } = await supabase
    .from('grade_data_new')
    .select('student_id, total_score, chinese_score, math_score, english_score, physics_score, chemistry_score')
    .eq('class_name', className);

  if (gradesError) {
    console.error('获取成绩数据失败:', gradesError);
    return null;
  }

  console.log('找到成绩记录:', gradesData?.length || 0);

  // 计算统计数据
  let averageScore = 0;
  let excellentCount = 0;
  let passCount = 0;

  if (gradesData && gradesData.length > 0) {
    const totalScores = gradesData
      .map(g => g.total_score)
      .filter(score => score !== null && score !== undefined);

    if (totalScores.length > 0) {
      averageScore = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
      excellentCount = totalScores.filter(score => score >= 400).length;
      passCount = totalScores.filter(score => score >= 300).length;
    }
  }

  const excellentRate = gradesData?.length ? (excellentCount / gradesData.length) * 100 : 0;
  const passRate = gradesData?.length ? (passCount / gradesData.length) * 100 : 0;

  // 统计性别
  const genderStats = {
    male: studentsData.filter(s => s.gender === '男').length,
    female: studentsData.filter(s => s.gender === '女').length,
    other: studentsData.filter(s => !['男', '女'].includes(s.gender)).length
  };

  // 统计各科成绩
  const subjects = [
    { name: '语文', field: 'chinese_score', excellent: 85, pass: 60 },
    { name: '数学', field: 'math_score', excellent: 85, pass: 60 },
    { name: '英语', field: 'english_score', excellent: 85, pass: 60 },
    { name: '物理', field: 'physics_score', excellent: 80, pass: 60 },
    { name: '化学', field: 'chemistry_score', excellent: 80, pass: 60 }
  ];

  const subjectStats = [];
  if (gradesData && gradesData.length > 0) {
    subjects.forEach(subject => {
      const scores = gradesData
        .map(g => g[subject.field])
        .filter(score => score !== null && score !== undefined && score > 0);

      if (scores.length > 0) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const excellentCount = scores.filter(score => score >= subject.excellent).length;
        const passingCount = scores.filter(score => score >= subject.pass).length;

        subjectStats.push({
          name: subject.name,
          averageScore: Math.round(avgScore * 10) / 10,
          excellentCount,
          passingCount
        });
      }
    });
  }

  const result = {
    className,
    studentCount: studentsData.length,
    averageScore: Math.round(averageScore * 10) / 10,
    excellentRate: Math.round(excellentRate * 10) / 10,
    passRate: Math.round(passRate * 10) / 10,
    genderStats,
    subjectStats,
    gradeRecords: gradesData?.length || 0
  };

  console.log('\n✅ 班级画像统计结果:');
  console.log(`班级: ${result.className}`);
  console.log(`学生数量: ${result.studentCount}人`);
  console.log(`平均分: ${result.averageScore}分`);
  console.log(`优秀率: ${result.excellentRate}%`);
  console.log(`及格率: ${result.passRate}%`);
  console.log(`性别分布: 男${result.genderStats.male}人, 女${result.genderStats.female}人, 其他${result.genderStats.other}人`);
  console.log(`成绩记录: ${result.gradeRecords}条`);
  console.log('\n各科成绩:');
  result.subjectStats.forEach(subject => {
    console.log(`  ${subject.name}: 平均${subject.averageScore}分, 优秀${subject.excellentCount}人, 及格${subject.passingCount}人`);
  });

  return result;
}

async function runTest() {
  // 测试不同的班级ID格式
  const testIds = [
    'class-初三7班',
    'class-初三11班',
    'class-高一1班',
    '初三7班',
    '高一(1)班'
  ];

  for (const classId of testIds) {
    console.log('\n' + '='.repeat(60));
    try {
      await testClassPortraitStats(classId);
    } catch (error) {
      console.error(`❌ 测试班级 ${classId} 失败:`, error.message);
    }
  }
}

runTest().catch(console.error);