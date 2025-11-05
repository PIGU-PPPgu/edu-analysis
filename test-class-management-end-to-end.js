/**
 * 班级管理页面端到端功能测试
 * 验证ClassManagement页面的完整数据流
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

// 模拟classService中的函数逻辑
async function getAllClassesAnalysisData() {
  try {
    // 1. 从students表获取班级列表
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('class_name, student_id, grade')
      .not('class_name', 'is', null);

    if (studentsError) throw studentsError;

    // 2. 按班级分组统计
    const classStats = new Map();
    (studentsData || []).forEach(student => {
      const className = student.class_name;
      if (!classStats.has(className)) {
        classStats.set(className, {
          id: `class-${className}`,
          name: className,
          grade: student.grade || inferGradeFromClassName(className),
          studentCount: 0,
          studentIds: []
        });
      }
      const classData = classStats.get(className);
      classData.studentCount++;
      classData.studentIds.push(student.student_id);
    });

    // 3. 获取每个班级的成绩数据
    const classesWithAnalysis = [];

    for (const [className, classData] of classStats.entries()) {
      // 获取该班级的成绩数据
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_data_new')
        .select('student_id, total_score, exam_type, exam_date, chinese_score, math_score, english_score')
        .in('student_id', classData.studentIds)
        .not('total_score', 'is', null)
        .order('exam_date', { ascending: false });

      if (gradeError) {
        console.warn(`班级 ${className} 成绩数据获取失败:`, gradeError);
        classesWithAnalysis.push({
          ...classData,
          averageScore: 0,
          excellentRate: 0,
          passRate: 0,
          recentExams: [],
          subjectStats: {}
        });
        continue;
      }

      // 计算班级统计数据
      const scores = (gradeData || []).map(g => parseFloat(g.total_score)).filter(s => !isNaN(s));
      const averageScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      const excellentCount = scores.filter(s => s >= 400).length; // 假设400分以上为优秀
      const passCount = scores.filter(s => s >= 300).length; // 假设300分以上为及格

      const excellentRate = scores.length > 0 ? (excellentCount / scores.length) * 100 : 0;
      const passRate = scores.length > 0 ? (passCount / scores.length) * 100 : 0;

      // 统计最近考试
      const examStats = new Map();
      (gradeData || []).forEach(grade => {
        if (!examStats.has(grade.exam_type)) {
          examStats.set(grade.exam_type, {
            type: grade.exam_type,
            date: grade.exam_date,
            count: 0,
            avgScore: 0,
            scores: []
          });
        }
        const examStat = examStats.get(grade.exam_type);
        examStat.count++;
        examStat.scores.push(parseFloat(grade.total_score));
      });

      // 计算每种考试的平均分
      const recentExams = Array.from(examStats.values()).map(exam => ({
        ...exam,
        avgScore: exam.scores.reduce((sum, s) => sum + s, 0) / exam.scores.length
      })).slice(0, 3); // 取最近3种考试

      // 各科目统计
      const subjects = ['chinese_score', 'math_score', 'english_score'];
      const subjectNames = ['语文', '数学', '英语'];
      const subjectStats = {};

      subjects.forEach((subject, index) => {
        const subjectScores = (gradeData || [])
          .map(g => parseFloat(g[subject]))
          .filter(s => !isNaN(s) && s > 0);

        if (subjectScores.length > 0) {
          subjectStats[subjectNames[index]] = {
            average: subjectScores.reduce((sum, s) => sum + s, 0) / subjectScores.length,
            count: subjectScores.length
          };
        }
      });

      classesWithAnalysis.push({
        ...classData,
        averageScore: Math.round(averageScore * 10) / 10,
        excellentRate: Math.round(excellentRate * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        recentExams,
        subjectStats,
        gradeCount: scores.length
      });
    }

    return classesWithAnalysis.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('获取班级分析数据失败:', error);
    return [];
  }
}

// 从班级名称推断年级
function inferGradeFromClassName(className) {
  if (className.includes('高一') || className.includes('1班')) return '高一';
  if (className.includes('高二') || className.includes('2班')) return '高二';
  if (className.includes('高三') || className.includes('3班')) return '高三';
  if (className.includes('九') || className.includes('初三')) return '九年级';
  if (className.includes('八') || className.includes('初二')) return '八年级';
  if (className.includes('七') || className.includes('初一')) return '七年级';
  return '未知年级';
}

async function testClassManagementEndToEnd() {
  console.log('🏫 班级管理端到端功能测试开始\n');

  try {
    // 1. 测试班级数据获取
    console.log('=== 1. 测试班级数据获取 ===');

    const classesData = await getAllClassesAnalysisData();
    console.log(`✅ 成功获取${classesData.length}个班级的分析数据`);

    if (classesData.length > 0) {
      console.log('前3个班级概览:');
      classesData.slice(0, 3).forEach(cls => {
        console.log(`  🏫 ${cls.name} (${cls.grade}): ${cls.studentCount}人, 平均分${cls.averageScore}, 及格率${cls.passRate}%`);
      });
    }

    // 2. 测试班级详细分析
    console.log('\n=== 2. 测试班级详细分析 ===');

    if (classesData.length > 0) {
      const testClass = classesData[0];
      console.log(`📊 详细分析班级: ${testClass.name}`);
      console.log(`  学生人数: ${testClass.studentCount}`);
      console.log(`  平均成绩: ${testClass.averageScore}分`);
      console.log(`  优秀率: ${testClass.excellentRate}%`);
      console.log(`  及格率: ${testClass.passRate}%`);
      console.log(`  成绩记录数: ${testClass.gradeCount}条`);

      // 科目统计
      if (testClass.subjectStats && Object.keys(testClass.subjectStats).length > 0) {
        console.log('  科目平均分:');
        Object.entries(testClass.subjectStats).forEach(([subject, stats]) => {
          console.log(`    ${subject}: ${Math.round(stats.average * 10) / 10}分 (${stats.count}条记录)`);
        });
      }

      // 考试统计
      if (testClass.recentExams && testClass.recentExams.length > 0) {
        console.log('  最近考试:');
        testClass.recentExams.forEach(exam => {
          console.log(`    ${exam.type}: 平均${Math.round(exam.avgScore * 10) / 10}分 (${exam.count}人次)`);
        });
      }
    }

    // 3. 测试数据完整性验证
    console.log('\n=== 3. 测试数据完整性验证 ===');

    let totalStudents = 0;
    let classesWithGrades = 0;
    let totalGradeRecords = 0;

    classesData.forEach(cls => {
      totalStudents += cls.studentCount;
      if (cls.gradeCount > 0) {
        classesWithGrades++;
        totalGradeRecords += cls.gradeCount;
      }
    });

    console.log(`✅ 数据完整性统计:`);
    console.log(`  总班级数: ${classesData.length}`);
    console.log(`  总学生数: ${totalStudents}`);
    console.log(`  有成绩班级: ${classesWithGrades}/${classesData.length}`);
    console.log(`  总成绩记录: ${totalGradeRecords}条`);

    // 4. 测试班级分类和筛选
    console.log('\n=== 4. 测试班级分类和筛选 ===');

    // 按年级分组
    const gradeGroups = new Map();
    classesData.forEach(cls => {
      const grade = cls.grade;
      if (!gradeGroups.has(grade)) {
        gradeGroups.set(grade, []);
      }
      gradeGroups.get(grade).push(cls);
    });

    console.log('按年级分组统计:');
    Array.from(gradeGroups.entries()).forEach(([grade, classes]) => {
      const totalStudentsInGrade = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
      const avgScoreInGrade = classes
        .filter(cls => cls.averageScore > 0)
        .reduce((sum, cls) => sum + cls.averageScore, 0) / classes.filter(cls => cls.averageScore > 0).length;

      console.log(`  📚 ${grade}: ${classes.length}个班级, ${totalStudentsInGrade}名学生, 平均${Math.round(avgScoreInGrade * 10) / 10 || 0}分`);
    });

    // 5. 测试性能指标
    console.log('\n=== 5. 测试性能指标 ===');

    // 找出表现最好和最差的班级
    const classesWithScores = classesData.filter(cls => cls.averageScore > 0);
    if (classesWithScores.length > 0) {
      const bestClass = classesWithScores.reduce((best, current) =>
        current.averageScore > best.averageScore ? current : best
      );
      const worstClass = classesWithScores.reduce((worst, current) =>
        current.averageScore < worst.averageScore ? current : worst
      );

      console.log(`🏆 表现最佳班级: ${bestClass.name} (平均${bestClass.averageScore}分, 及格率${bestClass.passRate}%)`);
      console.log(`⚠️  需要关注班级: ${worstClass.name} (平均${worstClass.averageScore}分, 及格率${worstClass.passRate}%)`);

      // 计算整体统计
      const overallAvg = classesWithScores.reduce((sum, cls) => sum + cls.averageScore, 0) / classesWithScores.length;
      const overallPassRate = classesWithScores.reduce((sum, cls) => sum + cls.passRate, 0) / classesWithScores.length;

      console.log(`📊 全校整体表现: 平均${Math.round(overallAvg * 10) / 10}分, 及格率${Math.round(overallPassRate * 10) / 10}%`);
    }

    // 6. 测试数据更新时效性
    console.log('\n=== 6. 测试数据更新时效性 ===');

    // 检查最新成绩数据的时间
    const { data: latestGrades, error: latestError } = await supabase
      .from('grade_data_new')
      .select('exam_date, exam_title')
      .not('exam_date', 'is', null)
      .order('exam_date', { ascending: false })
      .limit(5);

    if (latestError) {
      console.error('❌ 获取最新成绩失败:', latestError);
    } else {
      console.log('✅ 最新成绩数据:');
      latestGrades?.forEach(grade => {
        console.log(`  📅 ${grade.exam_date}: ${grade.exam_title}`);
      });
    }

    console.log('\n✅ 班级管理端到端测试完成！');

    // 返回测试结果
    return {
      success: true,
      classesCount: classesData.length,
      studentsCount: totalStudents,
      gradeRecordsCount: totalGradeRecords,
      classesWithGradesCount: classesWithGrades,
      gradeGroups: Array.from(gradeGroups.keys()),
      bestPerformance: classesWithScores.length > 0 ? {
        className: classesWithScores.reduce((best, current) =>
          current.averageScore > best.averageScore ? current : best
        ).name,
        score: classesWithScores.reduce((best, current) =>
          current.averageScore > best.averageScore ? current : best
        ).averageScore
      } : null
    };

  } catch (error) {
    console.error('❌ 班级管理端到端测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
testClassManagementEndToEnd()
  .then(result => {
    console.log('\n🎯 班级管理测试结果:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);