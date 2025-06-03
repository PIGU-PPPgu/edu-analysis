/**
 * 导入问题调试脚本
 * 专门诊断为什么导入成功但数据为空的问题
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function debugImportIssue() {
  console.log('🔍 开始调试导入问题\n');
  
  try {
    // 1. 检查最新的考试记录
    console.log('1️⃣ 检查最新考试记录...');
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (examsError) {
      console.error('❌ 查询考试失败:', examsError);
      return;
    }
    
    console.log(`✅ 找到 ${exams.length} 个考试记录`);
    exams.forEach((exam, index) => {
      console.log(`  ${index + 1}. ${exam.title} (ID: ${exam.id}) - ${exam.created_at}`);
    });
    
    if (exams.length === 0) {
      console.log('❌ 没有找到任何考试记录，导入可能失败');
      return;
    }
    
    // 2. 检查最新考试的成绩数据
    const latestExam = exams[0];
    console.log(`\n2️⃣ 检查最新考试 "${latestExam.title}" 的成绩数据...`);
    
    const { data: gradeData, error: gradeError } = await supabase
      .from('grade_data')
      .select('*')
      .eq('exam_id', latestExam.id)
      .limit(10);
    
    if (gradeError) {
      console.error('❌ 查询成绩数据失败:', gradeError);
      return;
    }
    
    console.log(`✅ 找到 ${gradeData.length} 条成绩记录`);
    if (gradeData.length > 0) {
      console.log('成绩数据样本:');
      gradeData.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.name} - ${record.subject}: ${record.score}分`);
      });
    } else {
      console.log('❌ 该考试没有成绩数据');
    }
    
    // 3. 检查学生记录
    console.log('\n3️⃣ 检查学生记录...');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (studentsError) {
      console.error('❌ 查询学生失败:', studentsError);
      return;
    }
    
    console.log(`✅ 找到 ${students.length} 个学生记录`);
    if (students.length > 0) {
      console.log('学生记录样本:');
      students.slice(0, 5).forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.name} (${student.student_id}) - ${student.class_name}`);
      });
    }
    
    // 4. 检查所有考试的成绩统计
    console.log('\n4️⃣ 检查所有考试的成绩统计...');
    for (const exam of exams) {
      const { data: examGrades, error: examGradesError } = await supabase
        .from('grade_data')
        .select('id')
        .eq('exam_id', exam.id);
      
      if (!examGradesError) {
        console.log(`  ${exam.title}: ${examGrades.length} 条成绩记录`);
      }
    }
    
    // 5. 检查数据库表结构
    console.log('\n5️⃣ 检查数据库表结构...');
    
    // 检查grade_data表的字段
    const { data: gradeDataSample, error: gradeDataSampleError } = await supabase
      .from('grade_data')
      .select('*')
      .limit(1);
    
    if (!gradeDataSampleError && gradeDataSample.length > 0) {
      console.log('grade_data表字段:', Object.keys(gradeDataSample[0]));
    }
    
    // 6. 检查可能的数据不一致问题
    console.log('\n6️⃣ 检查数据一致性...');
    
    // 检查是否有考试ID不匹配的情况
    if (exams.length > 0) {
      const examIds = exams.map(e => `'${e.id}'`).join(',');
      const { data: orphanGrades, error: orphanError } = await supabase
        .from('grade_data')
        .select('exam_id')
        .not('exam_id', 'in', `(${examIds})`);
      
      if (!orphanError) {
        console.log(`发现 ${orphanGrades.length} 条成绩记录的考试ID不在考试表中`);
      }
    }
    
    // 7. 检查最近的导入活动
    console.log('\n7️⃣ 检查最近的数据变化...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentGrades, error: recentError } = await supabase
      .from('grade_data')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    if (!recentError) {
      console.log(`最近1小时内新增 ${recentGrades.length} 条成绩记录`);
      if (recentGrades.length > 0) {
        console.log('最新成绩记录:');
        recentGrades.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.name} - ${record.subject}: ${record.score}分 (${record.created_at})`);
        });
      }
    }
    
    // 8. 诊断结论
    console.log('\n🎯 诊断结论:');
    
    if (exams.length === 0) {
      console.log('❌ 问题: 没有考试记录，导入流程可能在考试创建阶段失败');
    } else if (gradeData.length === 0) {
      console.log('❌ 问题: 考试记录存在但没有成绩数据，导入流程可能在数据转换或保存阶段失败');
      console.log('💡 建议: 检查智能字段映射和宽表格转换逻辑');
    } else {
      console.log('✅ 数据导入正常，可能是前端查询或显示问题');
      console.log('💡 建议: 检查前端的考试选择和数据获取逻辑');
    }
    
    // 9. 提供修复建议
    console.log('\n🔧 修复建议:');
    console.log('1. 检查浏览器控制台的错误信息');
    console.log('2. 确认前端查询的考试ID是否正确');
    console.log('3. 验证智能字段映射是否正确识别了CSV结构');
    console.log('4. 检查宽表格转长表格的转换逻辑');
    console.log('5. 确认数据库权限和RLS策略设置');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  }
}

// 运行调试
debugImportIssue(); 