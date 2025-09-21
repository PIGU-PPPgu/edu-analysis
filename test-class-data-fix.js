/**
 * 测试修复后的班级数据加载功能
 */
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testGetAllClasses() {
  console.log('📊 测试修复后的班级数据加载...');

  // 从学生数据中获取实际存在的班级列表
  const { data: studentClassData, error: studentError } = await supabase
    .from('students')
    .select('class_name, grade')
    .not('class_name', 'is', null);

  if (studentError) {
    console.error('获取学生班级数据失败:', studentError);
    return;
  }

  // 统计每个班级的学生数量
  const classStats = new Map();
  studentClassData.forEach(student => {
    const className = student.class_name;
    if (!classStats.has(className)) {
      classStats.set(className, {
        name: className,
        grade: student.grade || '未知',
        studentCount: 0
      });
    }
    classStats.get(className).studentCount++;
  });

  const classNames = Array.from(classStats.keys()).slice(0, 5); // 只测试前5个班级
  console.log('测试班级:', classNames);

  // 获取成绩统计
  const { data: gradeData, error: gradeError } = await supabase
    .from('grade_data_new')
    .select('class_name, total_score')
    .in('class_name', classNames)
    .not('total_score', 'is', null);

  if (gradeError) {
    console.error('获取成绩数据失败:', gradeError);
    return;
  }

  // 计算统计
  const statsMap = new Map();
  gradeData.forEach(record => {
    const className = record.class_name;
    if (!statsMap.has(className)) {
      statsMap.set(className, { class_name: className, scores: [] });
    }
    statsMap.get(className).scores.push(record.total_score);
  });

  const gradeStats = Array.from(statsMap.values()).map(classData => {
    const scores = classData.scores;
    const avg_score = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const excellent_count = scores.filter(score => score >= 400).length;
    const excellent_rate = (excellent_count / scores.length) * 100;

    return {
      class_name: classData.class_name,
      avg_score: Math.round(avg_score * 10) / 10,
      excellent_rate: Math.round(excellent_rate * 10) / 10,
      grade_records: scores.length
    };
  });

  // 模拟最终结果
  const enrichedClasses = Array.from(classStats.values()).slice(0, 5).map(classInfo => {
    const gradeData = gradeStats.find(g => g.class_name === classInfo.name);

    return {
      id: `class-${classInfo.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: classInfo.name,
      grade: classInfo.grade,
      studentCount: classInfo.studentCount,
      averageScore: gradeData?.avg_score || 0,
      excellentRate: gradeData?.excellent_rate || 0,
      gradeRecordCount: gradeData?.grade_records || 0
    };
  });

  console.log('\n✅ 修复后的班级数据样本:');
  enrichedClasses.forEach(cls => {
    console.log(`班级: ${cls.name} (${cls.grade})`);
    console.log(`  学生数: ${cls.studentCount}人`);
    console.log(`  平均分: ${cls.averageScore}分`);
    console.log(`  优秀率: ${cls.excellentRate}%`);
    console.log(`  成绩记录: ${cls.gradeRecordCount}条`);
    console.log('');
  });

  console.log(`\n🎯 数据质量检查:`);
  console.log(`  - 总班级数: ${Array.from(classStats.keys()).length}`);
  console.log(`  - 有学生的班级: ${enrichedClasses.filter(c => c.studentCount > 0).length}`);
  console.log(`  - 有成绩的班级: ${enrichedClasses.filter(c => c.gradeRecordCount > 0).length}`);
  console.log(`  - 平均每班学生数: ${Math.round(enrichedClasses.reduce((sum, c) => sum + c.studentCount, 0) / enrichedClasses.length)}`);
}

testGetAllClasses().catch(console.error);