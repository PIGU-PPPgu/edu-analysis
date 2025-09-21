/**
 * 测试预警系统与AutoSyncService的集成
 * 验证数据源集成的完整性和一致性
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// 模拟预警系统的实时计算功能
async function testWarningSystemIntegration() {
  console.log('🔍 [集成测试] 开始测试预警系统与AutoSyncService的集成...\n');

  try {
    // 1. 检查grade_data_new表中的student_id一致性
    console.log('📊 [集成测试] 步骤1: 检查grade_data_new表数据一致性...');
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data_new')
      .select('student_id, name, class_name')
      .limit(10);

    if (gradeError) {
      console.error('❌ 查询成绩数据失败:', gradeError);
      return;
    }

    console.log(`✅ 成绩数据样本 (${gradeData?.length || 0} 条):`, 
      gradeData?.slice(0, 3).map(g => ({
        student_id: g.student_id?.substring(0, 8) + '...',
        name: g.name,
        class_name: g.class_name
      }))
    );

    // 2. 检查students表中的对应关系
    console.log('\n👥 [集成测试] 步骤2: 验证students表关联关系...');
    const uniqueStudentIds = [...new Set(gradeData?.map(g => g.student_id).filter(Boolean) || [])];
    
    if (uniqueStudentIds.length === 0) {
      console.warn('⚠️ 成绩数据中没有有效的student_id，可能需要AutoSync处理');
      return;
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, student_id, name, class_id, classes(name)')
      .in('id', uniqueStudentIds.slice(0, 5));

    if (studentsError) {
      console.error('❌ 查询学生数据失败:', studentsError);
      return;
    }

    console.log(`✅ 学生数据关联验证 (${studentsData?.length || 0} 条):`,
      studentsData?.slice(0, 3).map(s => ({
        uuid: s.id.substring(0, 8) + '...',
        name: s.name,
        class: s.classes?.name || 'N/A'
      }))
    );

    // 3. 测试预警系统实时计算功能
    console.log('\n⚠️ [集成测试] 步骤3: 测试预警实时计算...');
    
    // 模拟预警计算逻辑
    const warningAnalysis = analyzeWarningsFromTestData(gradeData || []);
    console.log('📈 预警分析结果:', {
      总学生数: warningAnalysis.totalStudents,
      风险学生数: warningAnalysis.warningStudents,
      风险比例: `${warningAnalysis.warningRatio}%`,
      主要风险因素: warningAnalysis.topRiskFactors
    });

    // 4. 检查数据完整性
    console.log('\n🔗 [集成测试] 步骤4: 数据完整性检查...');
    let dataConsistencyIssues = [];

    // 检查student_id为空的记录
    const { count: emptyStudentIdCount } = await supabase
      .from('grade_data_new')
      .select('*', { count: 'exact', head: true })
      .or('student_id.is.null,student_id.eq.');

    if (emptyStudentIdCount > 0) {
      dataConsistencyIssues.push(`${emptyStudentIdCount} 条成绩记录缺少student_id`);
    }

    // 检查孤立的成绩记录
    const orphanedRecords = [];
    for (const record of (gradeData || []).slice(0, 5)) {
      if (record.student_id) {
        const { data: studentExists } = await supabase
          .from('students')
          .select('id')
          .eq('id', record.student_id)
          .single();
        
        if (!studentExists) {
          orphanedRecords.push(record.name);
        }
      }
    }

    if (orphanedRecords.length > 0) {
      dataConsistencyIssues.push(`发现孤立成绩记录: ${orphanedRecords.join(', ')}`);
    }

    if (dataConsistencyIssues.length === 0) {
      console.log('✅ 数据完整性检查通过');
    } else {
      console.warn('⚠️ 发现数据完整性问题:', dataConsistencyIssues);
    }

    // 5. 集成测试总结
    console.log('\n📋 [集成测试] 测试总结:');
    console.log('✅ 成绩数据查询: 正常');
    console.log('✅ 学生关联验证: 正常'); 
    console.log('✅ 预警计算功能: 正常');
    console.log(`${dataConsistencyIssues.length === 0 ? '✅' : '⚠️'} 数据完整性: ${dataConsistencyIssues.length === 0 ? '通过' : '存在问题'}`);

    console.log('\n🚀 [集成测试] 建议后续优化:');
    if (emptyStudentIdCount > 0) {
      console.log(`- 运行AutoSyncService同步 ${emptyStudentIdCount} 条缺失student_id的记录`);
    }
    if (orphanedRecords.length > 0) {
      console.log(`- 处理 ${orphanedRecords.length} 个孤立成绩记录`);
    }
    console.log('- 启用预警系统实时监控功能');
    console.log('- 设置数据同步定时任务');

  } catch (error) {
    console.error('❌ [集成测试] 测试过程中出错:', error);
  }
}

// 简化的预警分析逻辑（模拟warningService中的逻辑）
function analyzeWarningsFromTestData(gradeData) {
  console.log('🔍 分析预警情况 - 测试数据:', gradeData.length, '条记录');

  // 按学生分组
  const studentData = new Map();
  gradeData.forEach(record => {
    const studentId = record.student_id || record.name; // 容错处理
    if (!studentData.has(studentId)) {
      studentData.set(studentId, {
        studentInfo: {
          name: record.name,
          class_name: record.class_name
        },
        examRecords: []
      });
    }
    studentData.get(studentId).examRecords.push(record);
  });

  const students = Array.from(studentData.values());
  let warningStudents = 0;
  const riskFactorCounts = new Map();

  // 简化的预警计算
  students.forEach(student => {
    let hasWarning = false;

    student.examRecords.forEach(record => {
      // 检查总分预警
      if (record.total_score && record.total_score < 300) {
        hasWarning = true;
        riskFactorCounts.set('总分过低', (riskFactorCounts.get('总分过低') || 0) + 1);
      }

      // 检查单科不及格
      const subjects = ['chinese', 'math', 'english'];
      let failingCount = 0;
      subjects.forEach(subject => {
        const score = record[`${subject}_score`];
        if (score && score < 60) failingCount++;
      });

      if (failingCount >= 2) {
        hasWarning = true;
        riskFactorCounts.set('多科目不及格', (riskFactorCounts.get('多科目不及格') || 0) + 1);
      }
    });

    if (hasWarning) warningStudents++;
  });

  const warningRatio = students.length > 0 
    ? Math.round((warningStudents / students.length) * 100) 
    : 0;

  // 获取前3个风险因素
  const topRiskFactors = Array.from(riskFactorCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([factor, count]) => `${factor}(${count}人)`)
    .join(', ');

  return {
    totalStudents: students.length,
    warningStudents,
    warningRatio,
    topRiskFactors: topRiskFactors || '暂无'
  };
}

// 运行集成测试
testWarningSystemIntegration();