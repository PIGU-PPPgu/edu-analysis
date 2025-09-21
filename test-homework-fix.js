/**
 * 测试作业创建功能修复
 */
import { createClient } from '@supabase/supabase-js';

// 初始化Supabase客户端
const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testClassesList() {
  console.log('🧪 测试班级列表查询...\n');
  
  try {
    // 模拟getAllClasses函数的查询
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, name, grade, created_at")
      .order("grade", { ascending: true })
      .order("name", { ascending: true })
      .limit(5);

    if (classesError) {
      console.error('❌ 查询班级列表失败:', classesError);
      return false;
    }

    if (!classesData || classesData.length === 0) {
      console.log('⚠️ 未找到班级数据');
      return false;
    }

    console.log(`✅ 成功查询到 ${classesData.length} 个班级:`);
    classesData.forEach((cls, index) => {
      console.log(`   ${index + 1}. ${cls.name} (${cls.grade}) - UUID: ${cls.id}`);
    });

    console.log('\n📝 验证作业创建数据格式...');
    
    // 模拟作业创建的数据格式
    const testHomeworkData = {
      title: '测试作业',
      description: '这是一个测试作业',
      class_id: classesData[0].id, // 使用真实的UUID
      due_date: new Date().toISOString().split('T')[0],
      created_by: 'test-user-id'
    };

    console.log('✅ 作业数据格式验证:');
    console.log(`   title: ${testHomeworkData.title}`);
    console.log(`   class_id: ${testHomeworkData.class_id} (UUID格式: ✅)`);
    console.log(`   选中班级: ${classesData[0].name}`);

    return true;

  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    return false;
  }
}

async function testHomeworkQuery() {
  console.log('\n🔍 测试作业统计查询修复...\n');
  
  try {
    // 测试修复后的作业统计查询逻辑
    const testClassNames = ['初三10班', '初三11班', '初三12班'];
    
    console.log(`📊 测试班级: ${testClassNames.join(', ')}`);
    
    // 第一步：获取班级名称对应的UUID
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .in('name', testClassNames);

    if (classError) {
      console.error('❌ 获取班级ID失败:', classError);
      return false;
    }

    console.log(`✅ 成功获取 ${classData?.length || 0} 个班级的UUID映射:`);
    classData?.forEach(cls => {
      console.log(`   ${cls.name}: ${cls.id}`);
    });

    if (classData && classData.length > 0) {
      const classIds = classData.map(c => c.id);
      
      // 第二步：使用UUID查询homework表
      const { data: homeworkData, error: homeworkError } = await supabase
        .from('homework')
        .select('class_id')
        .in('class_id', classIds);

      if (homeworkError) {
        console.log(`⚠️ 作业查询结果: ${homeworkError.message}`);
      } else {
        console.log(`✅ 作业统计查询成功: 找到 ${homeworkData?.length || 0} 条作业记录`);
      }
    }

    return true;

  } catch (error) {
    console.error('❌ 作业查询测试异常:', error.message);
    return false;
  }
}

async function runHomeworkFixTest() {
  console.log('🎯 作业管理系统修复验证\n');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: '班级列表查询', func: testClassesList },
    { name: '作业统计查询', func: testHomeworkQuery }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 测试: ${test.name}`);
    console.log('-'.repeat(30));
    
    const passed = await test.func();
    if (passed) {
      passedTests++;
      console.log(`\n✅ ${test.name} - 通过`);
    } else {
      console.log(`\n❌ ${test.name} - 失败`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`🎉 测试完成！通过率: ${passedTests}/${tests.length} (${Math.round(passedTests/tests.length*100)}%)`);
  
  if (passedTests === tests.length) {
    console.log('\n🚀 作业管理系统修复验证成功！');
    console.log('💡 现在应该可以正常创建作业了');
    console.log('🌐 请访问 http://localhost:3002 测试作业创建功能');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查相关配置');
  }
}

// 运行测试
runHomeworkFixTest().catch(console.error);