#!/usr/bin/env node

/**
 * 数据库对接修复测试脚本
 * 用于测试和验证数据库对接问题的修复
 */

const { createClient } = require('@supabase/supabase-js');

// 使用环境变量或直接指定Supabase配置
const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 数据库健康检查
 */
async function performHealthCheck() {
  console.log('🔍 开始执行数据库健康检查...');
  
  const healthReport = {
    tables: {},
    dataIntegrity: {},
    performance: {}
  };

  try {
    // 1. 检查核心表
    const coreTables = ['students', 'exams', 'grade_data', 'teachers'];
    
    for (const tableName of coreTables) {
      console.log(`📊 检查表: ${tableName}`);
      
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          healthReport.tables[tableName] = {
            exists: false,
            error: error.message,
            recordCount: 0
          };
          console.log(`❌ 表 ${tableName} 检查失败: ${error.message}`);
        } else {
          healthReport.tables[tableName] = {
            exists: true,
            recordCount: count || 0,
            status: 'healthy'
          };
          console.log(`✅ 表 ${tableName} 正常，记录数: ${count || 0}`);
        }
      } catch (err) {
        healthReport.tables[tableName] = {
          exists: false,
          error: err.message,
          recordCount: 0
        };
        console.log(`❌ 表 ${tableName} 检查异常: ${err.message}`);
      }
    }

    // 2. 检查数据完整性
    console.log('🔍 检查数据完整性...');
    
    // 检查成绩数据和学生数据的关联
    if (healthReport.tables.grade_data?.exists && healthReport.tables.students?.exists) {
      try {
        // 获取成绩数据中的学生ID
        const { data: gradeStudentIds, error: gradeError } = await supabase
          .from('grade_data')
          .select('student_id')
          .limit(1000);
        
        if (!gradeError && gradeStudentIds) {
          const uniqueStudentIds = [...new Set(gradeStudentIds.map(g => g.student_id))];
          
          // 检查这些学生ID在学生表中是否存在
          const { data: existingStudents, error: studentError } = await supabase
            .from('students')
            .select('student_id')
            .in('student_id', uniqueStudentIds);
          
          if (!studentError && existingStudents) {
            const existingStudentIds = new Set(existingStudents.map(s => s.student_id));
            const orphanedStudentIds = uniqueStudentIds.filter(id => !existingStudentIds.has(id));
            
            healthReport.dataIntegrity.gradeStudentMatch = {
              totalGradeStudents: uniqueStudentIds.length,
              matchedStudents: existingStudents.length,
              orphanedStudents: orphanedStudentIds.length,
              orphanedIds: orphanedStudentIds.slice(0, 10) // 只显示前10个
            };
            
            console.log(`📊 成绩数据学生匹配: ${existingStudents.length}/${uniqueStudentIds.length} 匹配`);
            if (orphanedStudentIds.length > 0) {
              console.log(`⚠️  发现 ${orphanedStudentIds.length} 个孤立的学生ID`);
            }
          }
        }
      } catch (err) {
        console.warn('数据完整性检查失败:', err.message);
      }
    }

    // 3. 检查考试数据和成绩数据的关联
    if (healthReport.tables.exams?.exists && healthReport.tables.grade_data?.exists) {
      try {
        // 获取有成绩数据的考试
        const { data: examsWithGrades, error: examGradeError } = await supabase
          .from('grade_data')
          .select('exam_id')
          .limit(1000);
        
        if (!examGradeError && examsWithGrades) {
          const uniqueExamIds = [...new Set(examsWithGrades.map(g => g.exam_id))];
          
          // 检查这些考试ID在考试表中是否存在
          const { data: existingExams, error: examError } = await supabase
            .from('exams')
            .select('id, title')
            .in('id', uniqueExamIds);
          
          if (!examError && existingExams) {
            healthReport.dataIntegrity.examGradeMatch = {
              totalGradeExams: uniqueExamIds.length,
              matchedExams: existingExams.length,
              examTitles: existingExams.map(e => e.title)
            };
            
            console.log(`📊 考试成绩匹配: ${existingExams.length}/${uniqueExamIds.length} 匹配`);
            console.log(`📝 有成绩的考试: ${existingExams.map(e => e.title).join(', ')}`);
          }
        }
      } catch (err) {
        console.warn('考试数据完整性检查失败:', err.message);
      }
    }

    // 4. 检查成绩分析页面的数据查询
    console.log('🔍 测试成绩分析页面数据查询...');
    
    try {
      // 模拟成绩分析页面的查询逻辑
      const { data: exams, error: examListError } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!examListError && exams && exams.length > 0) {
        console.log(`📊 找到 ${exams.length} 个考试记录`);
        
        // 检查每个考试的成绩数据
        for (const exam of exams.slice(0, 3)) { // 只检查前3个考试
          const { data: gradeData, error: gradeError } = await supabase
            .from('grade_data')
            .select('*')
            .eq('exam_id', exam.id)
            .limit(10);
          
          if (!gradeError && gradeData) {
            console.log(`📊 考试 "${exam.title}" 有 ${gradeData.length} 条成绩记录`);
            
            if (gradeData.length > 0) {
              // 检查成绩数据的字段完整性
              const sampleRecord = gradeData[0];
              const requiredFields = ['student_id', 'name', 'subject', 'score'];
              const missingFields = requiredFields.filter(field => !sampleRecord[field]);
              
              if (missingFields.length > 0) {
                console.log(`⚠️  成绩记录缺少字段: ${missingFields.join(', ')}`);
              } else {
                console.log(`✅ 成绩记录字段完整`);
              }
            }
          } else if (gradeError) {
            console.log(`❌ 查询考试 "${exam.title}" 成绩失败: ${gradeError.message}`);
          } else {
            console.log(`⚠️  考试 "${exam.title}" 没有成绩数据`);
          }
        }
      } else if (examListError) {
        console.log(`❌ 查询考试列表失败: ${examListError.message}`);
      } else {
        console.log(`⚠️  没有找到任何考试记录`);
      }
    } catch (err) {
      console.warn('成绩分析查询测试失败:', err.message);
    }

    // 5. 生成修复建议
    console.log('💡 生成修复建议...');
    const suggestions = [];
    
    // 检查表状态
    Object.entries(healthReport.tables).forEach(([tableName, tableInfo]) => {
      if (!tableInfo.exists) {
        suggestions.push(`创建缺失的表: ${tableName}`);
      } else if (tableInfo.recordCount === 0) {
        suggestions.push(`表 ${tableName} 为空，需要导入数据`);
      }
    });
    
    // 检查数据完整性
    if (healthReport.dataIntegrity.gradeStudentMatch?.orphanedStudents > 0) {
      suggestions.push(`修复 ${healthReport.dataIntegrity.gradeStudentMatch.orphanedStudents} 个孤立的成绩记录`);
    }
    
    if (suggestions.length > 0) {
      console.log('🔧 修复建议:');
      suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });
    } else {
      console.log('✅ 数据库状态良好，无需修复');
    }

    return healthReport;
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
    return null;
  }
}

/**
 * 测试学生匹配逻辑
 */
async function testStudentMatching() {
  console.log('🔍 测试学生匹配逻辑...');
  
  try {
    // 获取一些学生数据进行测试
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .limit(5);
    
    if (studentError || !students || students.length === 0) {
      console.log('⚠️  没有学生数据可供测试');
      return;
    }
    
    console.log(`📊 找到 ${students.length} 个学生记录用于测试`);
    
    // 测试不同的匹配场景
    const testCases = [
      // 精确学号匹配
      {
        name: '精确学号匹配',
        student: {
          student_id: students[0].student_id,
          name: students[0].name,
          class_name: students[0].class_name
        }
      },
      // 精确姓名匹配
      {
        name: '精确姓名匹配',
        student: {
          student_id: '', // 故意留空
          name: students[0].name,
          class_name: students[0].class_name
        }
      },
      // 模糊姓名匹配
      {
        name: '模糊姓名匹配',
        student: {
          student_id: '',
          name: students[0].name.slice(0, -1), // 去掉最后一个字符
          class_name: students[0].class_name
        }
      },
      // 无匹配
      {
        name: '无匹配',
        student: {
          student_id: 'NONEXISTENT123',
          name: '不存在的学生',
          class_name: '不存在的班级'
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 测试场景: ${testCase.name}`);
      console.log(`   输入: ${JSON.stringify(testCase.student)}`);
      
      // 这里应该调用实际的匹配逻辑
      // 由于我们在Node.js环境中，暂时使用简单的查询逻辑
      let matchResult = null;
      
      if (testCase.student.student_id) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('student_id', testCase.student.student_id)
          .limit(1);
        
        if (data && data.length > 0) {
          matchResult = { type: 'exact_id', student: data[0] };
        }
      }
      
      if (!matchResult && testCase.student.name) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('name', testCase.student.name)
          .limit(1);
        
        if (data && data.length > 0) {
          matchResult = { type: 'exact_name', student: data[0] };
        }
      }
      
      if (matchResult) {
        console.log(`   ✅ 匹配成功: ${matchResult.type} - ${matchResult.student.name} (${matchResult.student.student_id})`);
      } else {
        console.log(`   ❌ 无匹配结果`);
      }
    }
  } catch (error) {
    console.error('❌ 学生匹配测试失败:', error);
  }
}

async function testDatabaseFix() {
  console.log('🔍 开始测试数据库修复...\n');

  // 测试1: 检查 grade_data 表是否存在
  console.log('1️⃣ 检查grade_data表是否存在...');
  try {
    const { data: checkTableData, error: checkTableError } = await supabase
      .from('grade_data')
      .select('id')
      .limit(1);

    if (checkTableError) {
      console.error('❌ grade_data表不存在或无法访问:', checkTableError);
      return;
    }
    console.log('✅ grade_data表存在且可访问\n');
  } catch (error) {
    console.error('❌ 检查表时出错:', error);
    return;
  }

  // 测试2: 检查 rank_in_school 字段是否存在
  console.log('2️⃣ 检查rank_in_school字段是否存在...');
  try {
    // 备用方法：插入一条带rank_in_school的测试数据
    try {
      const testData = {
        exam_id: '00000000-0000-0000-0000-000000000001',
        student_id: 'test-student-id',
        name: 'Test Student',
        class_name: 'Test Class',
        subject: 'test-subject',
        score: 100,
        rank_in_school: 1
      };
      
      const { error: insertError } = await supabase
        .from('grade_data')
        .insert(testData)
        .select();
        
      if (insertError && !insertError.message?.includes('duplicate')) {
        console.error('❌ rank_in_school字段可能不存在:', insertError);
      } else {
        console.log('✅ rank_in_school字段存在');
      }
      
      // 清理测试数据
      await supabase.from('grade_data')
        .delete()
        .eq('exam_id', testData.exam_id)
        .eq('student_id', testData.student_id);
      
    } catch (testError) {
      console.error('❌ 测试数据插入失败，字段可能不存在:', testError);
    }
    console.log('');
  } catch (error) {
    console.error('❌ 检查字段时出错:', error);
  }

  // 测试3: 测试唯一约束
  console.log('3️⃣ 测试唯一约束...');
  try {
    // 准备测试数据
    const testExamId = '00000000-0000-0000-0000-000000000002';
    const testStudentId = 'test-student-id-2';
    
    // 准备两个不同学科的测试数据
    const testData1 = {
      exam_id: testExamId,
      student_id: testStudentId,
      name: 'Test Student',
      class_name: 'Test Class',
      subject: 'math',
      score: 90
    };
    
    const testData2 = {
      exam_id: testExamId,
      student_id: testStudentId,
      name: 'Test Student',
      class_name: 'Test Class',
      subject: 'english',
      score: 85
    };
    
    // 清理可能存在的旧测试数据
    await supabase.from('grade_data')
      .delete()
      .eq('exam_id', testExamId)
      .eq('student_id', testStudentId);
    
    // 插入第一个学科数据
    const { error: insertError1 } = await supabase
      .from('grade_data')
      .insert(testData1);
      
    if (insertError1) {
      console.error('❌ 测试学科1插入失败:', insertError1);
      return;
    }
    console.log('✅ 成功插入学科1(math)测试数据');
    
    // 插入第二个学科数据（如果约束正确，应该允许不同学科）
    const { error: insertError2 } = await supabase
      .from('grade_data')
      .insert(testData2);
      
    if (insertError2) {
      if (insertError2.code === '23505') { // 唯一约束冲突
        console.error('❌ 唯一约束测试失败: 不同学科数据无法共存，约束可能未修复');
      } else {
        console.error('❌ 测试学科2插入失败:', insertError2);
      }
    } else {
      console.log('✅ 成功插入学科2(english)测试数据，约束已正确配置');
    }
    
    // 验证两条记录是否都存在
    const { data: verifyData, error: verifyError } = await supabase
      .from('grade_data')
      .select('subject, score')
      .eq('exam_id', testExamId)
      .eq('student_id', testStudentId);
      
    if (verifyError) {
      console.error('❌ 验证数据查询失败:', verifyError);
    } else if (verifyData.length === 2) {
      console.log('✅ 验证成功: 两个不同学科的记录均已保存');
    } else {
      console.warn(`⚠️ 验证结果不符合预期: 期望2条记录，实际${verifyData.length}条`);
    }
    
    // 清理测试数据
    await supabase.from('grade_data')
      .delete()
      .eq('exam_id', testExamId)
      .eq('student_id', testStudentId);
      
    console.log('🧹 测试数据已清理');
  } catch (error) {
    console.error('❌ 测试唯一约束时出错:', error);
  }
  
  console.log('\n✨ 数据库修复测试完成');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始数据库对接修复测试...\n');
  
  try {
    // 1. 执行健康检查
    const healthReport = await performHealthCheck();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. 测试学生匹配
    await testStudentMatching();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. 测试数据库修复
    await testDatabaseFix();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. 输出总结
    console.log('📋 测试总结:');
    
    if (healthReport) {
      const tableCount = Object.keys(healthReport.tables).length;
      const healthyTables = Object.values(healthReport.tables).filter(t => t.exists).length;
      
      console.log(`   📊 表状态: ${healthyTables}/${tableCount} 个表正常`);
      
      if (healthReport.dataIntegrity.gradeStudentMatch) {
        const { matchedStudents, totalGradeStudents } = healthReport.dataIntegrity.gradeStudentMatch;
        console.log(`   🔗 数据完整性: ${matchedStudents}/${totalGradeStudents} 学生匹配`);
      }
      
      if (healthReport.dataIntegrity.examGradeMatch) {
        const { matchedExams, totalGradeExams } = healthReport.dataIntegrity.examGradeMatch;
        console.log(`   📝 考试数据: ${matchedExams}/${totalGradeExams} 考试有成绩`);
      }
    }
    
    console.log('\n✅ 数据库对接修复测试完成');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
} 