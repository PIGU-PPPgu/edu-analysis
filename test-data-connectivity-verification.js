/**
 * 数据联通验证测试
 * 验证前端→后端→数据库的完整数据流
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testDataConnectivityVerification() {
  console.log('🔗 数据联通验证测试开始\n');

  const testResults = {
    studentPortraitFlow: false,
    classManagementFlow: false,
    warningSystemFlow: false,
    dataConsistency: false,
    apiResponseTime: 0,
    edgeFunctionConnectivity: false,
    overallConnectivity: false
  };

  try {
    // 1. 学生画像数据流验证
    console.log('=== 1. 学生画像数据流验证 ===');

    const startTime1 = Date.now();

    // 模拟前端获取班级列表
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('class_name, student_id, grade, name')
      .not('class_name', 'is', null)
      .limit(100);

    if (studentError) {
      console.error('❌ 学生数据获取失败:', studentError);
    } else {
      // 统计班级
      const classStats = new Map();
      studentData.forEach(student => {
        const className = student.class_name;
        if (!classStats.has(className)) {
          classStats.set(className, { students: [], count: 0 });
        }
        classStats.get(className).students.push(student);
        classStats.get(className).count++;
      });

      console.log(`✅ 学生画像数据流: ${classStats.size}个班级, ${studentData.length}名学生`);

      // 测试单个学生的详细信息获取
      if (studentData.length > 0) {
        const testStudent = studentData[0];
        const { data: gradeData, error: gradeError } = await supabase
          .from('grade_data_new')
          .select('total_score, exam_title, exam_date')
          .eq('student_id', testStudent.student_id)
          .limit(5);

        if (!gradeError && gradeData) {
          console.log(`  📊 学生 ${testStudent.name} 有 ${gradeData.length} 条成绩记录`);
          testResults.studentPortraitFlow = true;
        }
      }
    }

    const apiTime1 = Date.now() - startTime1;

    // 2. 班级管理数据流验证
    console.log('\n=== 2. 班级管理数据流验证 ===');

    const startTime2 = Date.now();

    // 模拟班级管理页面的数据获取流程
    const { data: allStudents, error: allStudentsError } = await supabase
      .from('students')
      .select('class_name, student_id')
      .not('class_name', 'is', null);

    if (allStudentsError) {
      console.error('❌ 班级管理数据获取失败:', allStudentsError);
    } else {
      // 按班级分组
      const classGroups = new Map();
      allStudents.forEach(student => {
        const className = student.class_name;
        if (!classGroups.has(className)) {
          classGroups.set(className, []);
        }
        classGroups.get(className).push(student.student_id);
      });

      // 获取一个班级的成绩统计
      const testClassName = Array.from(classGroups.keys())[0];
      const testClassStudents = classGroups.get(testClassName);

      const { data: classGrades, error: classGradeError } = await supabase
        .from('grade_data_new')
        .select('student_id, total_score')
        .in('student_id', testClassStudents.slice(0, 10)) // 限制查询数量
        .not('total_score', 'is', null);

      if (!classGradeError && classGrades) {
        const avgScore = classGrades.reduce((sum, g) => sum + parseFloat(g.total_score), 0) / classGrades.length;
        console.log(`✅ 班级管理数据流: ${testClassName} 平均分 ${Math.round(avgScore * 10) / 10}`);
        testResults.classManagementFlow = true;
      }
    }

    const apiTime2 = Date.now() - startTime2;

    // 3. 预警系统数据流验证
    console.log('\n=== 3. 预警系统数据流验证 ===');

    const startTime3 = Date.now();

    // 检查预警规则
    const { data: warningRules, error: rulesError } = await supabase
      .from('warning_rules')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (rulesError) {
      console.error('❌ 预警规则获取失败:', rulesError);
    } else {
      console.log(`✅ 预警规则: ${warningRules?.length || 0} 条活跃规则`);

      // 检查预警记录
      const { data: warningRecords, error: recordsError } = await supabase
        .from('warning_records')
        .select('id, student_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recordsError) {
        console.log(`✅ 预警记录: ${warningRecords?.length || 0} 条最新记录`);
        testResults.warningSystemFlow = true;
      }
    }

    const apiTime3 = Date.now() - startTime3;

    // 4. Edge Function连通性验证
    console.log('\n=== 4. Edge Function连通性验证 ===');

    const startTimeEdge = Date.now();

    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('warning-engine', {
        body: { action: 'execute_all_rules', trigger: 'connectivity_test' }
      });

      const edgeTime = Date.now() - startTimeEdge;

      if (!edgeError && edgeResult?.success) {
        console.log(`✅ Edge Function连通性: 响应时间 ${edgeTime}ms`);
        console.log(`  执行结果: ${edgeResult.data?.summary?.totalRules || 0} 条规则`);
        testResults.edgeFunctionConnectivity = true;
      } else {
        console.error('❌ Edge Function连通性失败:', edgeError);
      }
    } catch (error) {
      console.error('❌ Edge Function调用异常:', error.message);
    }

    // 5. 数据一致性验证
    console.log('\n=== 5. 数据一致性验证 ===');

    // 验证学生表与成绩表的一致性
    const { data: studentsWithIds, error: idsError } = await supabase
      .from('students')
      .select('student_id, name')
      .limit(10);

    if (idsError) {
      console.error('❌ 学生ID获取失败:', idsError);
    } else {
      let consistentCount = 0;
      for (const student of studentsWithIds) {
        const { data: grades, error } = await supabase
          .from('grade_data_new')
          .select('id')
          .eq('student_id', student.student_id)
          .limit(1);

        if (!error && grades && grades.length > 0) {
          consistentCount++;
        }
      }

      const consistencyRate = (consistentCount / studentsWithIds.length) * 100;
      console.log(`✅ 数据一致性: ${consistentCount}/${studentsWithIds.length} 学生有对应成绩 (${Math.round(consistencyRate)}%)`);

      if (consistencyRate >= 50) { // 50%以上一致性认为通过
        testResults.dataConsistency = true;
      }
    }

    // 6. 性能指标测试
    console.log('\n=== 6. 性能指标测试 ===');

    const totalApiTime = apiTime1 + apiTime2 + apiTime3;
    testResults.apiResponseTime = totalApiTime;

    console.log(`📊 API响应时间统计:`);
    console.log(`  学生画像API: ${apiTime1}ms`);
    console.log(`  班级管理API: ${apiTime2}ms`);
    console.log(`  预警系统API: ${apiTime3}ms`);
    console.log(`  总计: ${totalApiTime}ms`);

    // 性能评级
    let performanceGrade = 'C';
    if (totalApiTime < 1000) performanceGrade = 'A';
    else if (totalApiTime < 2000) performanceGrade = 'B';

    console.log(`  性能等级: ${performanceGrade} (${totalApiTime < 2000 ? '✅ 良好' : '⚠️  需优化'})`);

    // 7. 综合连通性评估
    console.log('\n=== 7. 综合连通性评估 ===');

    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const totalTests = Object.keys(testResults).length - 2; // 减去数值型字段

    testResults.overallConnectivity = passedTests >= totalTests * 0.8; // 80%通过率

    console.log(`📈 测试通过率: ${passedTests}/${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`);

    if (testResults.overallConnectivity) {
      console.log('✅ 整体数据联通性: 通过');
    } else {
      console.log('❌ 整体数据联通性: 不通过');
    }

    // 8. 详细诊断报告
    console.log('\n=== 8. 详细诊断报告 ===');

    console.log('各模块连通性状态:');
    console.log(`  📱 学生画像系统: ${testResults.studentPortraitFlow ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  🏫 班级管理系统: ${testResults.classManagementFlow ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  ⚠️  预警系统: ${testResults.warningSystemFlow ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  🔧 Edge Functions: ${testResults.edgeFunctionConnectivity ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  🔗 数据一致性: ${testResults.dataConsistency ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  ⚡ 性能指标: ${totalApiTime < 2000 ? '✅ 良好' : '⚠️  需优化'} (${totalApiTime}ms)`);

    console.log('\n✅ 数据联通验证测试完成！');

    return testResults;

  } catch (error) {
    console.error('❌ 数据联通验证测试失败:', error);
    return {
      ...testResults,
      error: error.message
    };
  }
}

// 运行测试
testDataConnectivityVerification()
  .then(result => {
    console.log('\n🎯 数据联通验证结果:');
    console.log('================================');
    Object.entries(result).forEach(([key, value]) => {
      const status = typeof value === 'boolean' ? (value ? '✅ 通过' : '❌ 失败') : `${value}${key.includes('Time') ? 'ms' : ''}`;
      console.log(`${key}: ${status}`);
    });
    console.log('================================');

    if (result.overallConnectivity) {
      console.log('🎉 恭喜！系统数据联通性验证通过！');
    } else {
      console.log('⚠️  系统数据联通性需要进一步优化。');
    }
  })
  .catch(console.error);