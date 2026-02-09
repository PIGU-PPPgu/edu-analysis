/**
 * 检查道法/政治科目的数据完整性
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPoliticsData() {
  console.log('🔍 检查道法/政治科目数据完整性...\n');

  // 1. 检查grade_data表中的道法成绩数据
  console.log('1️⃣ 检查grade_data表中的道法成绩数据');
  const { data: gradeData, error: gradeError } = await supabase
    .from('grade_data')
    .select('student_id, name, class_name, exam_title, politics_score')
    .not('politics_score', 'is', null);

  if (gradeError) {
    console.error('❌ 查询失败:', gradeError);
  } else {
    console.log(`✅ 找到 ${gradeData?.length || 0} 条道法成绩记录`);
    if (gradeData && gradeData.length > 0) {
      console.log('\n样本数据 (前5条):');
      gradeData.slice(0, 5).forEach((record, idx) => {
        console.log(`  ${idx + 1}. 学生: ${record.name}, 班级: ${record.class_name}, 考试: ${record.exam_title}, 道法成绩: ${record.politics_score}`);
      });

      // 按班级统计
      const classCounts = new Map<string, number>();
      gradeData.forEach(record => {
        const count = classCounts.get(record.class_name) || 0;
        classCounts.set(record.class_name, count + 1);
      });

      console.log(`\n按班级统计 (共 ${classCounts.size} 个班级):`);
      Array.from(classCounts.entries()).slice(0, 10).forEach(([className, count]) => {
        console.log(`  ${className}: ${count} 条记录`);
      });
    }
  }

  // 2. 检查teacher_student_subjects表中的道法教师信息
  console.log('\n\n2️⃣ 检查teacher_student_subjects表中的道法教师信息');
  const { data: teacherData, error: teacherError } = await supabase
    .from('teacher_student_subjects')
    .select('class_name, subject, teacher_id, teacher_name, student_id')
    .or('subject.eq.道法,subject.eq.政治');

  if (teacherError) {
    console.error('❌ 查询失败:', teacherError);
  } else {
    console.log(`✅ 找到 ${teacherData?.length || 0} 条道法教师关联记录`);
    
    if (teacherData && teacherData.length > 0) {
      // 按科目名称分组
      const bySubject = new Map<string, number>();
      teacherData.forEach(record => {
        const count = bySubject.get(record.subject) || 0;
        bySubject.set(record.subject, count + 1);
      });

      console.log('\n按科目名称统计:');
      bySubject.forEach((count, subject) => {
        console.log(`  ${subject}: ${count} 条`);
      });

      // 统计不同的教师
      const teachers = new Map<string, Set<string>>();
      teacherData.forEach(record => {
        if (!teachers.has(record.teacher_name)) {
          teachers.set(record.teacher_name, new Set());
        }
        teachers.get(record.teacher_name)!.add(record.class_name);
      });

      console.log(`\n道法教师列表 (共 ${teachers.size} 位):`);
      Array.from(teachers.entries()).forEach(([name, classes]) => {
        console.log(`  ${name}: 教 ${classes.size} 个班级 - ${Array.from(classes).join(', ')}`);
      });

      // 按班级统计
      const classCounts = new Map<string, number>();
      teacherData.forEach(record => {
        const count = classCounts.get(record.class_name) || 0;
        classCounts.set(record.class_name, count + 1);
      });

      console.log(`\n按班级统计 (共 ${classCounts.size} 个班级):`);
      Array.from(classCounts.entries()).forEach(([className, count]) => {
        console.log(`  ${className}: ${count} 条记录`);
      });
    }
  }

  // 3. 对比分析：哪些班级有成绩但没有教师映射
  console.log('\n\n3️⃣ 数据完整性对比分析');
  
  if (gradeData && teacherData) {
    // 从成绩数据中获取所有班级
    const classesWithGrades = new Set(gradeData.map(r => r.class_name));
    
    // 从教师映射中获取所有班级
    const classesWithTeachers = new Set(teacherData.map(r => r.class_name));

    console.log(`\n有道法成绩的班级数: ${classesWithGrades.size}`);
    console.log(`有道法教师的班级数: ${classesWithTeachers.size}`);

    // 找出有成绩但没有教师的班级
    const missingTeachers = Array.from(classesWithGrades).filter(cls => !classesWithTeachers.has(cls));
    if (missingTeachers.length > 0) {
      console.log(`\n⚠️ 有道法成绩但缺少教师映射的班级 (${missingTeachers.length}个):`);
      missingTeachers.forEach(cls => console.log(`  - ${cls}`));
    } else {
      console.log('\n✅ 所有有道法成绩的班级都有教师映射');
    }

    // 找出有教师但没有成绩的班级
    const missingGrades = Array.from(classesWithTeachers).filter(cls => !classesWithGrades.has(cls));
    if (missingGrades.length > 0) {
      console.log(`\n⚠️ 有道法教师但缺少成绩的班级 (${missingGrades.length}个):`);
      missingGrades.forEach(cls => console.log(`  - ${cls}`));
    }
  }

  console.log('\n\n✅ 检查完成');
}

checkPoliticsData();
