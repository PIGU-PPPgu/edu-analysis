/**
 * 测试学生画像管理页面的数据修复
 * 验证班级查询、学生查询和小组数据的正确性
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

// 模拟StudentPortraitManagement组件的数据查询逻辑
async function testStudentPortraitManagement() {
  console.log('🧪 测试学生画像管理页面数据查询...\n');

  try {
    // 1. 测试班级列表查询（模拟组件的查询逻辑）
    console.log('=== 1. 测试班级列表查询 ===');
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, name, grade")
      .order("grade", { ascending: true })
      .order("name", { ascending: true });

    if (classesError) {
      console.error('❌ 班级查询失败:', classesError);
      return;
    }

    console.log(`✅ 找到 ${classesData?.length || 0} 个班级`);

    // 2. 测试修复后的学生计数查询（使用class_name而不是class_id）
    console.log('\n=== 2. 测试班级学生计数（修复后） ===');
    const classesWithCount = await Promise.all(
      (classesData || []).map(async (cls) => {
        // 使用修复后的查询逻辑：通过class_name查询
        const { data: studentsData, error: countError } = await supabase
          .from("students")
          .select("id")
          .eq("class_name", cls.name);

        if (countError) {
          console.warn(`⚠️  获取班级 ${cls.name} 学生数量失败:`, countError.message);
          return {
            ...cls,
            student_count: 0,
          };
        }

        return {
          ...cls,
          student_count: studentsData?.length || 0,
        };
      })
    );

    classesWithCount.forEach(cls => {
      console.log(`  📋 ${cls.name} (${cls.grade}): ${cls.student_count}名学生`);
    });

    // 3. 测试portraitAPI方法
    console.log('\n=== 3. 测试Portrait API方法 ===');

    // 选择第一个班级进行测试
    if (classesWithCount.length > 0) {
      const testClass = classesWithCount[0];
      console.log(`\n测试班级: ${testClass.name} (ID: ${testClass.id})`);

      try {
        // 动态导入portraitAPI
        const { portraitAPI } = await import('./src/lib/api/portrait.ts');

        // 测试班级统计数据
        console.log('\n--- 测试班级统计数据 ---');
        const classStats = await portraitAPI.getClassPortraitStats(testClass.id);
        if (classStats) {
          console.log('✅ 班级统计获取成功:');
          console.log(`  平均分: ${classStats.averageScore}`);
          console.log(`  优秀率: ${classStats.excellentRate}%`);
          console.log(`  及格率: ${classStats.passRate}%`);
          console.log(`  学生数: ${classStats.studentCount}`);
        } else {
          console.log('⚠️  班级统计数据为空');
        }

        // 测试班级学生列表
        console.log('\n--- 测试班级学生列表 ---');
        const students = await portraitAPI.getClassStudents(testClass.id);
        console.log(`✅ 获取到 ${students?.length || 0} 名学生`);
        if (students && students.length > 0) {
          students.slice(0, 3).forEach(student => {
            console.log(`  👤 ${student.name} (${student.student_id})`);
          });
        }

        // 测试班级小组数据（应该返回模拟数据，因为groups表不存在）
        console.log('\n--- 测试班级小组数据 ---');
        const groups = await portraitAPI.getClassGroups(testClass.id);
        console.log(`✅ 获取到 ${groups?.length || 0} 个小组`);
        if (groups && groups.length > 0) {
          groups.forEach(group => {
            console.log(`  👥 ${group.name}: ${group.studentCount}人, 平均分${group.averageScore}`);
          });
        }

      } catch (apiError) {
        console.error('❌ Portrait API测试失败:', apiError);
      }
    }

    console.log('\n✅ 学生画像管理页面数据查询测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 测试数据库连接状态
async function testDatabaseConnection() {
  console.log('\n🔌 测试数据库连接状态...');

  try {
    const { data, error } = await supabase
      .from('students')
      .select('name')
      .limit(1);

    if (error) {
      console.error('❌ 数据库连接失败:', error);
    } else {
      console.log('✅ 数据库连接正常');
    }
  } catch (e) {
    console.error('❌ 数据库连接异常:', e.message);
  }
}

async function runAllTests() {
  await testDatabaseConnection();
  await testStudentPortraitManagement();
  console.log('\n🎯 所有测试完成！');
}

runAllTests().catch(console.error);