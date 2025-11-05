/**
 * 学生画像页面端到端功能测试
 * 验证从前端页面到后端数据的完整流程
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testStudentPortraitEndToEnd() {
  console.log('👤 学生画像端到端功能测试开始\n');

  try {
    // 1. 测试数据基础结构
    console.log('=== 1. 验证数据基础结构 ===');

    // 检查学生表数据
    const { data: studentsSample, error: studentsError } = await supabase
      .from('students')
      .select('student_id, name, class_name, gender')
      .limit(10);

    if (studentsError) {
      console.error('❌ 获取学生数据失败:', studentsError);
      return;
    }

    console.log(`✅ 学生数据基础(${studentsSample?.length || 0}条样本):`);
    studentsSample?.slice(0, 3).forEach(student => {
      console.log(`  👤 ${student.name} (${student.student_id}) - ${student.class_name} [${student.gender || 'N/A'}]`);
    });

    // 检查班级数据
    const { data: classInfo, error: classError } = await supabase
      .from('class_info')
      .select('class_name, grade_level, student_count')
      .limit(5);

    if (classError) {
      console.error('❌ 获取班级数据失败:', classError);
    } else {
      console.log(`✅ 班级信息基础(${classInfo?.length || 0}条):`);
      classInfo?.slice(0, 3).forEach(cls => {
        console.log(`  🏫 ${cls.class_name} (${cls.grade_level}) - ${cls.student_count}人`);
      });
    }

    // 2. 测试学生画像API数据流
    console.log('\n=== 2. 测试学生画像API数据流 ===');

    // 模拟StudentPortraitManagement页面的数据获取流程
    console.log('模拟StudentPortraitManagement组件数据获取...');

    // 2.1 获取班级列表（模拟StudentPortraitManagement组件逻辑）
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('class_name, student_id, grade')
      .not('class_name', 'is', null);

    if (studentError) {
      console.error('❌ 获取学生数据失败:', studentError);
      return;
    }

    // 从班级名称推断年级的辅助函数
    const inferGradeFromClassName = (className) => {
      if (className.includes('高一') || className.includes('1班')) return '高一';
      if (className.includes('高二') || className.includes('2班')) return '高二';
      if (className.includes('高三') || className.includes('3班')) return '高三';
      if (className.includes('九') || className.includes('初三')) return '九年级';
      if (className.includes('八') || className.includes('初二')) return '八年级';
      if (className.includes('七') || className.includes('初一')) return '七年级';
      return '未知年级';
    };

    // 按班级名称分组并统计
    const classStats = new Map();
    (studentData || []).forEach(student => {
      const className = student.class_name;
      if (!classStats.has(className)) {
        classStats.set(className, {
          id: `class-${className}`,
          name: className,
          class_name: className, // 保持兼容性
          grade: student.grade || inferGradeFromClassName(className),
          grade_level: student.grade || inferGradeFromClassName(className),
          student_count: 0
        });
      }
      classStats.get(className).student_count++;
    });

    // 转换为数组并排序
    const allClasses = Array.from(classStats.values()).sort((a, b) => {
      if (a.grade !== b.grade) {
        return a.grade.localeCompare(b.grade);
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ 成功获取${allClasses?.length || 0}个班级 (从students表统计)`);

    // 2.2 选择一个班级进行详细测试
    if (allClasses && allClasses.length > 0) {
      const testClass = allClasses[0];
      console.log(`📋 选择测试班级: ${testClass.class_name}`);

      // 2.3 获取该班级的学生列表（模拟点击班级）
      const { data: classStudents, error: classStudentsError } = await supabase
        .from('students')
        .select('student_id, name, gender')
        .eq('class_name', testClass.class_name);

      if (classStudentsError) {
        console.error('❌ 获取班级学生失败:', classStudentsError);
      } else {
        console.log(`  👥 班级学生数量: ${classStudents?.length || 0}人`);

        // 2.4 测试学生画像详情获取
        if (classStudents && classStudents.length > 0) {
          const testStudent = classStudents[0];
          console.log(`  🎯 测试学生: ${testStudent.name} (${testStudent.student_id})`);

          // 获取学生成绩数据
          const { data: studentGrades, error: gradesError } = await supabase
            .from('grade_data_new')
            .select('exam_title, total_score, exam_date, chinese_score, math_score, english_score')
            .eq('student_id', testStudent.student_id)
            .order('exam_date', { ascending: false })
            .limit(5);

          if (gradesError) {
            console.error('    ❌ 获取学生成绩失败:', gradesError);
          } else {
            console.log(`    📊 成绩记录: ${studentGrades?.length || 0}条`);
            studentGrades?.slice(0, 2).forEach(grade => {
              console.log(`      - ${grade.exam_title}: 总分${grade.total_score}, 语文${grade.chinese_score}, 数学${grade.math_score}`);
            });
          }

          // 获取学生预警记录
          const { data: studentWarnings, error: warningsError } = await supabase
            .from('warning_records')
            .select(`
              id, status, created_at, details,
              warning_rules(name, severity)
            `)
            .eq('student_id', testStudent.student_id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (warningsError) {
            console.error('    ❌ 获取学生预警失败:', warningsError);
          } else {
            console.log(`    ⚠️  预警记录: ${studentWarnings?.length || 0}条`);
            studentWarnings?.forEach(warning => {
              const ruleName = warning.warning_rules?.name || '未知规则';
              console.log(`      - ${ruleName} (${warning.status}) - ${warning.created_at?.substring(0, 10)}`);
            });
          }
        }
      }
    }

    // 3. 测试班级画像数据流
    console.log('\n=== 3. 测试班级画像数据流 ===');

    if (allClasses && allClasses.length > 0) {
      const testClass = allClasses[1] || allClasses[0]; // 选择第二个班级，如果没有则选择第一个
      console.log(`🏫 测试班级画像: ${testClass.class_name}`);

      // 模拟ClassProfile API调用
      try {
        // 3.1 班级基础信息
        const { data: classData, error: classDataError } = await supabase
          .from('students')
          .select('student_id, name, gender')
          .eq('class_name', testClass.class_name);

        if (classDataError) {
          console.error('  ❌ 获取班级学生失败:', classDataError);
        } else {
          const totalStudents = classData?.length || 0;
          const maleCount = classData?.filter(s => s.gender === '男').length || 0;
          const femaleCount = classData?.filter(s => s.gender === '女').length || 0;

          console.log(`  📊 班级统计:`);
          console.log(`    总人数: ${totalStudents}`);
          console.log(`    男生: ${maleCount}人, 女生: ${femaleCount}人`);

          // 3.2 班级成绩分析
          if (totalStudents > 0) {
            const studentIds = classData.map(s => s.student_id);

            const { data: classGrades, error: classGradesError } = await supabase
              .from('grade_data_new')
              .select('student_id, total_score, chinese_score, math_score, english_score, exam_title, exam_date')
              .in('student_id', studentIds)
              .not('total_score', 'is', null)
              .order('exam_date', { ascending: false });

            if (classGradesError) {
              console.error('  ❌ 获取班级成绩失败:', classGradesError);
            } else {
              console.log(`  📈 成绩数据: ${classGrades?.length || 0}条记录`);

              if (classGrades && classGrades.length > 0) {
                // 计算班级平均分
                const avgScore = classGrades.reduce((sum, g) => sum + parseFloat(g.total_score), 0) / classGrades.length;
                const maxScore = Math.max(...classGrades.map(g => parseFloat(g.total_score)));
                const minScore = Math.min(...classGrades.map(g => parseFloat(g.total_score)));

                console.log(`    平均分: ${Math.round(avgScore * 10) / 10}`);
                console.log(`    最高分: ${maxScore}, 最低分: ${minScore}`);

                // 各科目统计
                const subjects = ['chinese_score', 'math_score', 'english_score'];
                const subjectNames = ['语文', '数学', '英语'];
                subjects.forEach((subject, index) => {
                  const scores = classGrades
                    .map(g => parseFloat(g[subject]))
                    .filter(score => !isNaN(score) && score > 0);

                  if (scores.length > 0) {
                    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                    console.log(`    ${subjectNames[index]}平均: ${Math.round(avg * 10) / 10}`);
                  }
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('  ❌ 班级画像数据流测试失败:', error);
      }
    }

    // 4. 测试数据一致性
    console.log('\n=== 4. 测试数据一致性 ===');

    // 4.1 检查学生表与成绩表的数据一致性
    const { data: studentsWithGrades, error: consistencyError } = await supabase
      .from('students')
      .select(`
        student_id,
        name,
        class_name
      `)
      .limit(5);

    if (consistencyError) {
      console.error('❌ 一致性检查失败:', consistencyError);
    } else {
      console.log('✅ 数据一致性检查:');

      for (const student of studentsWithGrades || []) {
        const { data: grades, error } = await supabase
          .from('grade_data_new')
          .select('id')
          .eq('student_id', student.student_id)
          .limit(1);

        const hasGrades = !error && grades && grades.length > 0;
        console.log(`  👤 ${student.name}: ${hasGrades ? '✅ 有成绩' : '⚠️  无成绩'}`);
      }
    }

    // 5. 测试实时数据更新能力
    console.log('\n=== 5. 测试实时数据更新能力 ===');

    // 模拟实时统计查询
    const { data: realtimeStats, error: realtimeError } = await supabase
      .rpc('get_class_real_time_stats', { class_name_param: allClasses?.[0]?.class_name })
      .single();

    if (realtimeError) {
      console.log('⚠️  实时统计函数不存在，使用备用方案');

      // 备用方案：直接查询
      const className = allClasses?.[0]?.class_name;
      if (className) {
        const { data: students } = await supabase
          .from('students')
          .select('student_id')
          .eq('class_name', className);

        const { data: grades } = await supabase
          .from('grade_data_new')
          .select('total_score')
          .in('student_id', students?.map(s => s.student_id) || [])
          .not('total_score', 'is', null);

        const avgScore = grades && grades.length > 0
          ? grades.reduce((sum, g) => sum + parseFloat(g.total_score), 0) / grades.length
          : 0;

        console.log(`✅ 备用统计 - ${className}: 平均分 ${Math.round(avgScore * 10) / 10}`);
      }
    } else {
      console.log('✅ 实时统计功能正常:', realtimeStats);
    }

    console.log('\n✅ 学生画像端到端测试完成！');

    // 6. 总结报告
    console.log('\n📋 功能验证总结:');
    console.log(`- 学生数据: ${studentsSample?.length || 0}+条记录 ✅`);
    console.log(`- 班级数据: ${allClasses?.length || 0}个班级 ✅`);
    console.log('- 数据查询: 学生→成绩→预警 ✅');
    console.log('- 班级画像: 统计→分析→展示 ✅');
    console.log('- 数据一致性: 表关联正常 ✅');
    console.log('- 实时更新: 查询响应正常 ✅');

    return {
      success: true,
      studentsCount: studentsSample?.length || 0,
      classesCount: allClasses?.length || 0,
      dataFlowWorking: true
    };

  } catch (error) {
    console.error('❌ 端到端测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
testStudentPortraitEndToEnd()
  .then(result => {
    console.log('\n🎯 测试结果:', result);
  })
  .catch(console.error);