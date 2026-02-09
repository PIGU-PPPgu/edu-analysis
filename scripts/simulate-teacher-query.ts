/**
 * 模拟增值计算的教师匹配过程
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simulateValueAddedQuery() {
  console.log('🔍 模拟增值计算的教师匹配过程...\n');

  // 1. 模拟从grade_data获取入口考试数据
  console.log('1️⃣ 查询入口考试数据 (grade_data表)');
  const { data: entryData, error: entryError } = await supabase
    .from('grade_data')
    .select('student_id, name, class_name, exam_title')
    .eq('exam_title', '7上期中成绩')
    .limit(1000);

  if (entryError) {
    console.error('❌ 查询失败:', entryError);
    return;
  }

  console.log(`✅ 查询到 ${entryData.length} 条入口考试数据`);

  // 2. 提取唯一班级列表
  console.log('\n2️⃣ 提取唯一班级列表');
  const uniqueClasses = Array.from(
    new Set(entryData.map((d) => d.class_name))
  );

  console.log(`📚 涉及班级: ${uniqueClasses.length}个`);
  console.log(`   班级列表:`, uniqueClasses);

  // 3. 查询教师映射
  console.log('\n3️⃣ 查询教师映射 (teacher_student_subjects表)');
  const { data: teacherMappingData, error: teacherMappingError } = await supabase
    .from("teacher_student_subjects")
    .select("class_name, subject, teacher_id, teacher_name, student_id")
    .in("class_name", uniqueClasses)
    .limit(50000); // 修复：设置足够大的limit

  if (teacherMappingError) {
    console.error('❌ 查询失败:', teacherMappingError);
    return;
  }

  console.log(`✅ 查询到 ${teacherMappingData?.length || 0} 条教师映射记录`);

  // 4. 按班级和科目统计
  console.log('\n4️⃣ 按班级和科目统计教师映射');
  const mappingByClass = new Map<string, Set<string>>();

  teacherMappingData?.forEach(m => {
    if (!mappingByClass.has(m.class_name)) {
      mappingByClass.set(m.class_name, new Set());
    }
    mappingByClass.get(m.class_name)!.add(m.subject);
  });

  console.log('\n班级-科目覆盖情况:');
  uniqueClasses.forEach(cls => {
    const subjects = mappingByClass.get(cls);
    if (subjects) {
      console.log(`   ${cls}: ${subjects.size}个科目 - ${Array.from(subjects).join(', ')}`);
    } else {
      console.log(`   ${cls}: ❌ 没有教师映射数据`);
    }
  });

  // 5. 建立映射 (和valueAddedActivityService.ts一样)
  console.log('\n5️⃣ 建立教师映射表');
  const teacherMap = new Map<string, { teacher_id: string; teacher_name: string }>();

  teacherMappingData?.forEach((mapping) => {
    const key = `${mapping.class_name}_${mapping.subject}`;
    if (!teacherMap.has(key)) {
      teacherMap.set(key, {
        teacher_id: mapping.teacher_id,
        teacher_name: mapping.teacher_name,
      });
    }
  });

  console.log(`✅ 成功建立 ${teacherMap.size} 个班级-科目映射`);
  console.log(`\n映射键样本 (前10个):`);
  Array.from(teacherMap.keys()).slice(0, 10).forEach(key => {
    const teacher = teacherMap.get(key)!;
    console.log(`   ${key} → ${teacher.teacher_name}`);
  });

  // 6. 测试查找
  console.log('\n6️⃣ 测试教师查找');
  const testCases = [
    { class: '初一1班', subject: '语文' },
    { class: '初一1班', subject: '数学' },
    { class: '初一4班', subject: '数学' },
    { class: '初一10班', subject: '英语' },
  ];

  testCases.forEach(({ class: cls, subject }) => {
    const key = `${cls}_${subject}`;
    const teacher = teacherMap.get(key);
    if (teacher) {
      console.log(`   ✅ ${key} → ${teacher.teacher_name}`);
    } else {
      console.log(`   ❌ ${key} → 未找到`);
    }
  });
}

simulateValueAddedQuery();
