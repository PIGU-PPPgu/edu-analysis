/**
 * 验证teacher_student_subjects表是否有数据
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyData() {
  console.log('\n🔍 验证teacher_student_subjects表...\n');

  // 1. 查询总记录数
  const { count, error: countError } = await supabase
    .from('teacher_student_subjects')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 查询失败:', countError.message);
    return;
  }

  console.log(`📊 总记录数: ${count} 条`);

  if (count === 0) {
    console.log('❌ 表仍然为空！数据导入可能失败了。');
    return;
  }

  // 2. 按科目统计
  const { data: subjectData, error: subjectError } = await supabase
    .from('teacher_student_subjects')
    .select('subject');

  if (!subjectError && subjectData) {
    const subjectCount = new Map<string, number>();
    subjectData.forEach(row => {
      const count = subjectCount.get(row.subject) || 0;
      subjectCount.set(row.subject, count + 1);
    });

    console.log('\n📈 科目分布:');
    Array.from(subjectCount.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([subject, count]) => {
        console.log(`   ${subject}: ${count} 条记录`);
      });
  }

  // 3. 按教师统计
  const { data: teacherData, error: teacherError } = await supabase
    .from('teacher_student_subjects')
    .select('teacher_name, teacher_id')
    .limit(100);

  if (!teacherError && teacherData) {
    const teacherCount = new Map<string, number>();
    teacherData.forEach(row => {
      const count = teacherCount.get(row.teacher_name) || 0;
      teacherCount.set(row.teacher_name, count + 1);
    });

    console.log('\n👥 教师统计:');
    console.log(`   共 ${teacherCount.size} 位教师`);

    const topTeachers = Array.from(teacherCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\n   记录最多的前5位教师:');
    topTeachers.forEach(([name, count]) => {
      console.log(`     ${name}: ${count} 条`);
    });
  }

  // 4. 查看样本数据
  const { data: sampleData, error: sampleError } = await supabase
    .from('teacher_student_subjects')
    .select('*')
    .limit(3);

  if (!sampleError && sampleData) {
    console.log('\n📝 样本数据 (前3条):');
    sampleData.forEach((row, idx) => {
      console.log(`\n   记录 ${idx + 1}:`);
      console.log(`     学生: ${row.student_name} (${row.student_id})`);
      console.log(`     教师: ${row.teacher_name} (${row.teacher_id})`);
      console.log(`     科目: ${row.subject}`);
      console.log(`     班级: ${row.class_name}`);
      console.log(`     学年: ${row.academic_year} ${row.semester}`);
    });
  }

  console.log('\n✅ 验证完成！\n');
}

verifyData();
