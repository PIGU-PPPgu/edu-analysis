/**
 * 测试真实数据服务
 * 验证新的前端数据处理逻辑是否工作正常
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

// 动态导入真实数据服务
async function testRealDataService() {
  console.log('🧪 测试真实数据服务...\n');

  try {
    // 由于使用ES模块导入，需要这种方式
    const { default: realDataService } = await import('./src/services/realDataService.ts');

    console.log('=== 1. 测试预警类型分布 ===');
    const warningTypes = await realDataService.getWarningsByType();
    console.log('预警类型统计:', warningTypes.slice(0, 3));

    console.log('\n=== 2. 测试班级风险分布 ===');
    const classRisks = await realDataService.getRiskByClass();
    console.log('班级风险统计:', classRisks.slice(0, 3));

    console.log('\n=== 3. 测试班级画像数据 ===');
    const classPortrait = await realDataService.getClassPortraitStats('初三7班');
    if (classPortrait) {
      console.log('班级画像统计:');
      console.log(`  班级: ${classPortrait.className}`);
      console.log(`  学生数: ${classPortrait.studentCount}`);
      console.log(`  平均分: ${classPortrait.averageScore}`);
      console.log(`  优秀率: ${classPortrait.excellentRate}%`);
      console.log(`  及格率: ${classPortrait.passRate}%`);
    } else {
      console.log('班级画像数据获取失败');
    }

    console.log('\n=== 4. 测试预警统计总览 ===');
    const warningStats = await realDataService.calculateWarningStatistics();
    console.log('预警统计总览:', {
      总预警数: warningStats.totalWarnings,
      活跃预警: warningStats.activeWarnings,
      已解决预警: warningStats.resolvedWarnings,
      高风险学生: warningStats.highRiskStudents
    });

    console.log('\n✅ 所有真实数据服务测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);

    // 直接测试数据库连接
    console.log('\n🔧 直接测试数据库连接...');
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('class_name')
        .not('class_name', 'is', null)
        .limit(5);

      if (error) {
        console.error('数据库连接失败:', error);
      } else {
        console.log('数据库连接正常，示例班级:', students?.map(s => s.class_name));
      }
    } catch (dbError) {
      console.error('数据库测试异常:', dbError);
    }
  }
}

// 也测试现有的portrait API是否工作
async function testPortraitAPI() {
  console.log('\n🎨 测试现有的Portrait API...\n');

  try {
    // 模拟PortraitAPI类的使用
    const testClasses = ['初三7班', 'class-初三11班', '高一(1)班'];

    for (const classId of testClasses) {
      console.log(`\n测试班级: ${classId}`);

      // 解析班级名称（模拟现有逻辑）
      let className = classId;
      if (classId.startsWith('class-')) {
        className = classId.replace('class-', '').replace(/-/g, '');
      }

      // 获取学生数据
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('student_id, gender, class_name')
        .eq('class_name', className)
        .limit(10);

      if (studentsError) {
        console.log(`❌ 获取学生数据失败: ${studentsError.message}`);
        continue;
      }

      console.log(`✅ 找到 ${studentsData?.length || 0} 名学生`);

      // 获取成绩数据
      const { data: gradesData, error: gradesError } = await supabase
        .from('grade_data_new')
        .select('student_id, total_score')
        .eq('class_name', className)
        .not('total_score', 'is', null)
        .limit(10);

      if (gradesError) {
        console.log(`❌ 获取成绩数据失败: ${gradesError.message}`);
        continue;
      }

      console.log(`✅ 找到 ${gradesData?.length || 0} 条成绩记录`);

      if (gradesData && gradesData.length > 0) {
        const avgScore = gradesData.reduce((sum, g) => sum + g.total_score, 0) / gradesData.length;
        console.log(`  平均分: ${Math.round(avgScore * 10) / 10}`);
      }
    }

  } catch (error) {
    console.error('❌ Portrait API测试失败:', error);
  }
}

async function runAllTests() {
  await testRealDataService();
  await testPortraitAPI();
  console.log('\n🎯 所有测试完成！');
}

runAllTests().catch(console.error);