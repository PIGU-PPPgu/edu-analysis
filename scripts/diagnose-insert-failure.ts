/**
 * 诊断teacher_student_subjects表插入失败的原因
 *
 * 可能的原因：
 * 1. RLS (Row Level Security) 策略阻止插入
 * 2. 数据库权限问题
 * 3. 表约束冲突
 * 4. 外键约束失败
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseInsertFailure() {
  console.log('\n🔍 开始诊断teacher_student_subjects表插入失败问题...\n');
  console.log('='.repeat(80));

  // 1. 检查表是否存在
  console.log('\n1️⃣ 检查表是否存在...');
  const { count: tableCount, error: tableError } = await supabase
    .from('teacher_student_subjects')
    .select('*', { count: 'exact', head: true });

  if (tableError) {
    console.error('❌ 表不存在或无权限访问:', tableError.message);
    console.log('   可能原因：表名错误、RLS策略阻止、或用户没有SELECT权限');
    return;
  }
  console.log(`✅ 表存在，当前记录数: ${tableCount}`);

  // 2. 尝试插入一条测试数据
  console.log('\n2️⃣ 尝试插入测试数据...');
  const testData = {
    teacher_id: '00000000-0000-0000-0000-000000000000', // UUID格式的测试ID
    teacher_name: '测试教师',
    student_id: 'TEST001',
    student_name: '测试学生',
    class_name: '测试班级',
    subject: '测试科目',
    academic_year: '2024-2025',
    semester: '第一学期',
  };

  console.log('   测试数据:', testData);

  const { data: insertData, error: insertError } = await supabase
    .from('teacher_student_subjects')
    .insert([testData])
    .select();

  if (insertError) {
    console.error('❌ 插入失败:', insertError.message);
    console.error('   错误代码:', insertError.code);
    console.error('   错误详情:', insertError.details);
    console.error('   错误提示:', insertError.hint);

    // 分析错误类型
    if (insertError.message.includes('permission denied') || insertError.message.includes('RLS')) {
      console.log('\n💡 诊断结果: RLS策略阻止了插入操作');
      console.log('   解决方案:');
      console.log('   1. 检查teacher_student_subjects表的RLS策略');
      console.log('   2. 确保当前用户有INSERT权限');
      console.log('   3. 可能需要在Supabase Dashboard中修改RLS策略');
    } else if (insertError.message.includes('foreign key')) {
      console.log('\n💡 诊断结果: 外键约束失败');
      console.log('   解决方案:');
      console.log('   1. 检查teacher_id是否在teachers表中存在');
      console.log('   2. 检查student_id是否在students表中存在');
      console.log('   3. 检查class_name是否在classes或class_info表中存在');
    } else if (insertError.message.includes('unique constraint')) {
      console.log('\n💡 诊断结果: 唯一约束冲突');
      console.log('   解决方案: 数据可能已存在，检查表是否有唯一约束');
    } else {
      console.log('\n💡 诊断结果: 未知错误');
      console.log('   建议: 查看上面的错误详情进行排查');
    }
  } else {
    console.log('✅ 测试数据插入成功!');
    console.log('   插入的数据:', insertData);
    console.log('\n💡 说明: 测试插入成功，说明表本身可以插入数据');
    console.log('   可能原因: 实际数据中存在问题（如外键不匹配）');

    // 清理测试数据
    console.log('\n   清理测试数据...');
    const { error: deleteError } = await supabase
      .from('teacher_student_subjects')
      .delete()
      .eq('student_id', 'TEST001');

    if (deleteError) {
      console.warn('⚠️  清理测试数据失败:', deleteError.message);
    } else {
      console.log('✅ 测试数据已清理');
    }
  }

  // 3. 检查外键依赖的表
  console.log('\n3️⃣ 检查外键依赖的表...');

  // 检查teachers表
  const { count: teacherCount, error: teacherError } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true });

  if (teacherError) {
    console.error('❌ teachers表查询失败:', teacherError.message);
  } else {
    console.log(`✅ teachers表存在，共 ${teacherCount} 条记录`);
  }

  // 检查students表
  const { count: studentCount, error: studentError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  if (studentError) {
    console.error('❌ students表查询失败:', studentError.message);
  } else {
    console.log(`✅ students表存在，共 ${studentCount} 条记录`);
  }

  // 检查class_info表
  const { count: classCount, error: classError } = await supabase
    .from('class_info')
    .select('*', { count: 'exact', head: true });

  if (classError) {
    console.error('❌ class_info表查询失败:', classError.message);
  } else {
    console.log(`✅ class_info表存在，共 ${classCount} 条记录`);
  }

  // 4. 尝试用真实数据插入
  console.log('\n4️⃣ 尝试用真实数据插入...');

  // 获取第一个真实教师
  const { data: realTeacher, error: realTeacherError } = await supabase
    .from('teachers')
    .select('id, name')
    .limit(1)
    .single();

  if (realTeacherError || !realTeacher) {
    console.warn('⚠️  无法获取真实教师数据，跳过此步骤');
  } else {
    // 获取第一个真实学生
    const { data: realStudent, error: realStudentError } = await supabase
      .from('students')
      .select('student_id, name, class_name')
      .limit(1)
      .single();

    if (realStudentError || !realStudent) {
      console.warn('⚠️  无法获取真实学生数据，跳过此步骤');
    } else {
      const realData = {
        teacher_id: realTeacher.id,
        teacher_name: realTeacher.name,
        student_id: realStudent.student_id,
        student_name: realStudent.name,
        class_name: realStudent.class_name,
        subject: '语文',
        academic_year: '2024-2025',
        semester: '第一学期',
      };

      console.log('   使用真实数据:', {
        teacher: realTeacher.name,
        student: realStudent.name,
        class: realStudent.class_name,
      });

      const { data: realInsertData, error: realInsertError } = await supabase
        .from('teacher_student_subjects')
        .insert([realData])
        .select();

      if (realInsertError) {
        console.error('❌ 真实数据插入失败:', realInsertError.message);
        console.error('   错误详情:', realInsertError);
      } else {
        console.log('✅ 真实数据插入成功!');
        console.log('   说明: 数据库配置正常，问题在于批量插入逻辑');

        // 清理
        console.log('   清理真实测试数据...');
        await supabase
          .from('teacher_student_subjects')
          .delete()
          .eq('student_id', realStudent.student_id);
        console.log('✅ 已清理');
      }
    }
  }

  // 5. 检查当前用户身份
  console.log('\n5️⃣ 检查当前用户身份...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('⚠️  当前未登录，使用匿名密钥');
    console.log('   说明: 使用VITE_SUPABASE_ANON_KEY，受RLS策略限制');
    console.log('   解决方案: 如果RLS策略要求登录，需要修改策略或使用service_role密钥');
  } else {
    console.log(`✅ 当前用户: ${user.email || user.id}`);
    console.log('   用户ID:', user.id);
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 诊断完成');
  console.log('='.repeat(80));
  console.log('\n如果测试插入失败，请根据上面的错误信息采取相应的解决方案。');
  console.log('如果测试插入成功，说明问题在于批量数据的某些字段不符合约束。\n');
}

diagnoseInsertFailure();
