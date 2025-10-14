// 快速检查初三7班学生数据
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwljcglflrkcrmqnobfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bGpjZ2xmbHJrY3JtcW5vYmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1NjE2NjIsImV4cCI6MjA0OTEzNzY2Mn0.QXmq8rp72YBQmTMSwj4JxE3CvYt9NLYFI-nEFgJU_FU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('查询初三 7班的学生数据...\n');

  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_id, name, class_name')
    .or('class_name.eq.初三 7班,class_name.eq.初三7班')
    .order('name');

  if (error) {
    console.error('查询失败:', error);
    return;
  }

  console.log(`总共找到 ${students.length} 名学生\n`);

  // 统计重复姓名
  const nameCount = new Map();
  students.forEach(student => {
    if (!nameCount.has(student.name)) {
      nameCount.set(student.name, []);
    }
    nameCount.get(student.name).push(student);
  });

  // 找出重复的
  const duplicates = [];
  nameCount.forEach((studentList, name) => {
    if (studentList.length > 1) {
      duplicates.push({ name, students: studentList });
    }
  });

  if (duplicates.length === 0) {
    console.log('✅ 没有发现重复的学生姓名');
  } else {
    console.log(`❌ 发现 ${duplicates.length} 组重复学生:\n`);
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. 姓名: ${dup.name} (重复 ${dup.students.length} 次)`);
      dup.students.forEach(s => {
        console.log(`   - 学号: ${s.student_id}, 班级: ${s.class_name}, UUID: ${s.id.slice(0, 8)}...`);
      });
      console.log();
    });
  }

  // 显示所有学生列表
  console.log('\n完整学生列表:');
  console.log('序号 | 姓名 | 学号 | 班级 | UUID');
  console.log(''.padEnd(80, '-'));
  students.forEach((s, i) => {
    console.log(`${(i+1).toString().padStart(3)} | ${s.name.padEnd(6)} | ${s.student_id.padEnd(10)} | ${s.class_name.padEnd(10)} | ${s.id.slice(0, 8)}...`);
  });
}

checkDuplicates().then(() => process.exit(0)).catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
