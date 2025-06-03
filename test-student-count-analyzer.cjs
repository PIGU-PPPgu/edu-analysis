/**
 * 学生数量差异检测功能测试脚本
 */

// 模拟学生数量差异分析器（简化版本，用于测试）
class TestStudentCountAnalyzer {
  
  // 分析学生数量差异
  analyzeStudentCounts(systemStudents, fileStudents, matchedStudents, options = {}) {
    const {
      tolerancePercentage = 0.1,
      minClassSize = 20,
      maxClassSize = 50
    } = options;

    console.log('🔍 开始学生数量差异分析...');
    console.log(`系统学生: ${systemStudents.length}人, 文件学生: ${fileStudents.length}人`);

    // 统计各班级的学生数量
    const systemClassCounts = this.countStudentsByClass(systemStudents);
    const fileClassCounts = this.countStudentsByClass(fileStudents);
    
    // 获取所有班级名称
    const allClasses = new Set([
      ...Object.keys(systemClassCounts),
      ...Object.keys(fileClassCounts)
    ]);

    console.log(`发现班级: ${Array.from(allClasses).join(', ')}`);

    // 分析每个班级的数量差异
    const classCounts = [];
    
    for (const className of allClasses) {
      const systemCount = systemClassCounts[className] || 0;
      const fileCount = fileClassCounts[className] || 0;
      const difference = fileCount - systemCount;
      
      let status = 'normal';
      
      if (systemCount === 0 && fileCount > 0) {
        status = 'new_class';
      } else if (difference > 0) {
        status = 'extra';
      } else if (difference < 0) {
        status = 'missing';
      }
      
      classCounts.push({
        className,
        systemCount,
        fileCount,
        difference,
        status
      });
    }

    // 分类问题班级
    const classesWithMissingStudents = classCounts.filter(c => c.status === 'missing');
    const classesWithExtraStudents = classCounts.filter(c => c.status === 'extra');
    const newClasses = classCounts.filter(c => c.status === 'new_class');

    // 生成详细的缺失学生信息
    const missingStudentDetails = this.generateMissingStudentDetails(
      classesWithMissingStudents,
      systemStudents,
      fileStudents,
      matchedStudents
    );

    // 生成详细的多余学生信息
    const extraStudentDetails = this.generateExtraStudentDetails(
      classesWithExtraStudents,
      fileStudents,
      matchedStudents
    );

    // 生成分析建议
    const { recommendations, warnings, actions } = this.generateAnalysisRecommendations(
      classCounts,
      tolerancePercentage,
      minClassSize,
      maxClassSize
    );

    const result = {
      classCounts,
      totalSystemStudents: systemStudents.length,
      totalFileStudents: fileStudents.length,
      totalDifference: fileStudents.length - systemStudents.length,
      classesWithMissingStudents,
      classesWithExtraStudents,
      newClasses,
      recommendations,
      warnings,
      actions,
      missingStudentDetails,
      extraStudentDetails
    };

    console.log('📊 数量差异分析完成:', {
      总差异: result.totalDifference,
      缺失学生班级: classesWithMissingStudents.length,
      多余学生班级: classesWithExtraStudents.length,
      新班级: newClasses.length
    });

    return result;
  }

  // 按班级统计学生数量
  countStudentsByClass(students) {
    const counts = {};
    
    for (const student of students) {
      const className = student.class_name || '未分班';
      counts[className] = (counts[className] || 0) + 1;
    }
    
    return counts;
  }

  // 生成缺失学生详细信息
  generateMissingStudentDetails(classesWithMissing, systemStudents, fileStudents, matchedStudents) {
    const matchedSystemStudentIds = new Set(
      matchedStudents.map(m => m.systemStudent.id || m.systemStudent.student_id)
    );

    return classesWithMissing.map(classInfo => {
      // 找到该班级中未匹配的系统学生
      const classSystemStudents = systemStudents.filter(s => s.class_name === classInfo.className);
      const unmatchedSystemStudents = classSystemStudents.filter(s => 
        !matchedSystemStudentIds.has(s.student_id)
      );

      // 分析可能的原因
      const possibleReasons = this.analyzeMissingReasons(
        classInfo,
        unmatchedSystemStudents,
        fileStudents
      );

      return {
        className: classInfo.className,
        missingCount: Math.abs(classInfo.difference),
        systemStudents: unmatchedSystemStudents.map(s => ({
          name: s.name,
          student_id: s.student_id
        })),
        possibleReasons
      };
    });
  }

  // 生成多余学生详细信息
  generateExtraStudentDetails(classesWithExtra, fileStudents, matchedStudents) {
    const matchedFileStudents = new Set(matchedStudents.map(m => m.fileStudent));

    return classesWithExtra.map(classInfo => {
      // 找到该班级中未匹配的文件学生
      const classFileStudents = fileStudents.filter(s => s.class_name === classInfo.className);
      const unmatchedFileStudents = classFileStudents.filter(s => 
        !matchedFileStudents.has(s)
      );

      // 分析可能的原因
      const possibleReasons = this.analyzeExtraReasons(classInfo, unmatchedFileStudents);

      return {
        className: classInfo.className,
        extraCount: classInfo.difference,
        extraStudents: unmatchedFileStudents.map(s => ({
          name: s.name,
          student_id: s.student_id
        })),
        possibleReasons
      };
    });
  }

  // 分析缺失学生的可能原因
  analyzeMissingReasons(classInfo, missingStudents, fileStudents) {
    const reasons = [];
    
    // 检查是否有学生可能在其他班级
    const fileStudentNames = new Set(fileStudents.map(s => s.name));
    const studentsInOtherClasses = missingStudents.filter(s => fileStudentNames.has(s.name));
    
    if (studentsInOtherClasses.length > 0) {
      reasons.push(`${studentsInOtherClasses.length}个学生可能在文件中的其他班级`);
    }
    
    // 检查缺失比例
    const missingPercentage = Math.abs(classInfo.difference) / classInfo.systemCount;
    if (missingPercentage > 0.2) {
      reasons.push('缺失比例较高，可能是部分学生缺考或转班');
    } else if (missingPercentage > 0.1) {
      reasons.push('可能是个别学生缺考或请假');
    } else {
      reasons.push('少量学生缺失，可能是数据录入遗漏');
    }
    
    // 检查是否是特殊情况
    if (classInfo.difference === -1) {
      reasons.push('仅缺失1人，可能是学生请假或数据录入错误');
    }
    
    return reasons;
  }

  // 分析多余学生的可能原因
  analyzeExtraReasons(classInfo, extraStudents) {
    const reasons = [];
    
    // 检查是否有学号
    const studentsWithId = extraStudents.filter(s => s.student_id);
    const studentsWithoutId = extraStudents.filter(s => !s.student_id);
    
    if (studentsWithoutId.length > 0) {
      reasons.push(`${studentsWithoutId.length}个学生缺少学号，可能是新转入学生`);
    }
    
    if (studentsWithId.length > 0) {
      reasons.push(`${studentsWithId.length}个学生有学号但系统中不存在，可能需要创建学生档案`);
    }
    
    // 检查多余比例
    const extraPercentage = classInfo.difference / (classInfo.systemCount || 1);
    if (extraPercentage > 0.2) {
      reasons.push('多余学生比例较高，请确认班级设置和数据来源');
    } else if (extraPercentage > 0.1) {
      reasons.push('可能有转班学生或新入学学生');
    } else {
      reasons.push('少量新增学生，可能是转班或补录');
    }
    
    return reasons;
  }

  // 生成分析建议
  generateAnalysisRecommendations(classCounts, tolerancePercentage, minClassSize, maxClassSize) {
    const recommendations = [];
    const warnings = [];
    const actions = [];

    // 总体数量分析
    const totalClasses = classCounts.length;
    const normalClasses = classCounts.filter(c => c.status === 'normal').length;
    const problemClasses = totalClasses - normalClasses;

    if (problemClasses === 0) {
      recommendations.push('✅ 所有班级学生数量匹配良好，数据一致性很高');
    } else {
      const problemPercentage = (problemClasses / totalClasses) * 100;
      if (problemPercentage > 50) {
        warnings.push(`❌ ${problemPercentage.toFixed(0)}%的班级存在数量差异，建议检查数据来源和质量`);
      } else {
        recommendations.push(`⚠️ ${problemClasses}个班级存在数量差异，需要逐一确认`);
      }
    }

    // 具体问题处理建议
    const missingClasses = classCounts.filter(c => c.status === 'missing');
    const extraClasses = classCounts.filter(c => c.status === 'extra');
    const newClasses = classCounts.filter(c => c.status === 'new_class');

    if (missingClasses.length > 0) {
      actions.push(`🔍 检查${missingClasses.length}个班级的缺失学生情况`);
      recommendations.push('对于缺失学生，建议确认是否缺考、请假或转班');
    }

    if (extraClasses.length > 0) {
      actions.push(`➕ 处理${extraClasses.length}个班级的多余学生`);
      recommendations.push('对于多余学生，建议确认是否为新转入或需要创建学生档案');
    }

    if (newClasses.length > 0) {
      actions.push(`🆕 确认${newClasses.length}个新班级的创建`);
      recommendations.push('新班级需要确认是否为有效班级，并创建相应的班级档案');
    }

    return { recommendations, warnings, actions };
  }
}

// 测试数据
const systemStudents = [
  // 九年级1班 - 3人
  { name: '张三', student_id: '2024001', class_name: '九年级1班' },
  { name: '李四', student_id: '2024002', class_name: '九年级1班' },
  { name: '王五', student_id: '2024003', class_name: '九年级1班' },
  
  // 九年级2班 - 2人
  { name: '赵六', student_id: '2024004', class_name: '九年级2班' },
  { name: '钱七', student_id: '2024005', class_name: '九年级2班' },
];

async function runTests() {
  const analyzer = new TestStudentCountAnalyzer();

  console.log('\n🧪 测试场景1：完美匹配（数量一致）');
  console.log('=' .repeat(60));
  
  const fileStudents1 = [
    { name: '张三', student_id: '2024001', class_name: '九年级1班' },
    { name: '李四', student_id: '2024002', class_name: '九年级1班' },
    { name: '王五', student_id: '2024003', class_name: '九年级1班' },
    { name: '赵六', student_id: '2024004', class_name: '九年级2班' },
    { name: '钱七', student_id: '2024005', class_name: '九年级2班' },
  ];
  
  const matchedStudents1 = fileStudents1.map(fs => ({
    fileStudent: fs,
    systemStudent: systemStudents.find(ss => ss.student_id === fs.student_id)
  }));
  
  const result1 = analyzer.analyzeStudentCounts(systemStudents, fileStudents1, matchedStudents1);
  console.log('📊 分析结果:');
  console.log(`- 总差异: ${result1.totalDifference}`);
  console.log(`- 缺失学生班级: ${result1.classesWithMissingStudents.length}个`);
  console.log(`- 多余学生班级: ${result1.classesWithExtraStudents.length}个`);
  console.log(`- 新班级: ${result1.newClasses.length}个`);
  console.log('建议:', result1.recommendations);

  console.log('\n🧪 测试场景2：缺失学生（班级50人但只导入49人）');
  console.log('=' .repeat(60));
  
  const fileStudents2 = [
    { name: '张三', student_id: '2024001', class_name: '九年级1班' },
    { name: '李四', student_id: '2024002', class_name: '九年级1班' },
    // 缺少王五 - 九年级1班缺失1人
    { name: '赵六', student_id: '2024004', class_name: '九年级2班' },
    { name: '钱七', student_id: '2024005', class_name: '九年级2班' },
  ];
  
  const matchedStudents2 = fileStudents2.map(fs => ({
    fileStudent: fs,
    systemStudent: systemStudents.find(ss => ss.student_id === fs.student_id)
  }));
  
  const result2 = analyzer.analyzeStudentCounts(systemStudents, fileStudents2, matchedStudents2);
  console.log('📊 分析结果:');
  console.log(`- 总差异: ${result2.totalDifference}`);
  console.log(`- 缺失学生班级: ${result2.classesWithMissingStudents.length}个`);
  console.log('缺失学生详情:');
  result2.missingStudentDetails.forEach(detail => {
    console.log(`  ${detail.className}: 缺失${detail.missingCount}人`);
    console.log(`    缺失学生: ${detail.systemStudents.map(s => s.name).join(', ')}`);
    console.log(`    可能原因: ${detail.possibleReasons.join('; ')}`);
  });

  console.log('\n🧪 测试场景3：多余学生（导入51人但班级只有50人）');
  console.log('=' .repeat(60));
  
  const fileStudents3 = [
    { name: '张三', student_id: '2024001', class_name: '九年级1班' },
    { name: '李四', student_id: '2024002', class_name: '九年级1班' },
    { name: '王五', student_id: '2024003', class_name: '九年级1班' },
    { name: '新转学生1', class_name: '九年级1班' }, // 多余学生，无学号
    { name: '新转学生2', student_id: '2024099', class_name: '九年级1班' }, // 多余学生，有学号
    { name: '赵六', student_id: '2024004', class_name: '九年级2班' },
    { name: '钱七', student_id: '2024005', class_name: '九年级2班' },
  ];
  
  const matchedStudents3 = [
    { fileStudent: fileStudents3[0], systemStudent: systemStudents[0] },
    { fileStudent: fileStudents3[1], systemStudent: systemStudents[1] },
    { fileStudent: fileStudents3[2], systemStudent: systemStudents[2] },
    { fileStudent: fileStudents3[5], systemStudent: systemStudents[3] },
    { fileStudent: fileStudents3[6], systemStudent: systemStudents[4] },
  ];
  
  const result3 = analyzer.analyzeStudentCounts(systemStudents, fileStudents3, matchedStudents3);
  console.log('📊 分析结果:');
  console.log(`- 总差异: ${result3.totalDifference}`);
  console.log(`- 多余学生班级: ${result3.classesWithExtraStudents.length}个`);
  console.log('多余学生详情:');
  result3.extraStudentDetails.forEach(detail => {
    console.log(`  ${detail.className}: 多余${detail.extraCount}人`);
    console.log(`    多余学生: ${detail.extraStudents.map(s => `${s.name}${s.student_id ? `(${s.student_id})` : '(无学号)'}`).join(', ')}`);
    console.log(`    可能原因: ${detail.possibleReasons.join('; ')}`);
  });

  console.log('\n🧪 测试场景4：新班级（文件中有系统中不存在的班级）');
  console.log('=' .repeat(60));
  
  const fileStudents4 = [
    { name: '张三', student_id: '2024001', class_name: '九年级1班' },
    { name: '李四', student_id: '2024002', class_name: '九年级1班' },
    { name: '新班级学生1', student_id: '2024101', class_name: '九年级3班' }, // 新班级
    { name: '新班级学生2', student_id: '2024102', class_name: '九年级3班' }, // 新班级
  ];
  
  const matchedStudents4 = [
    { fileStudent: fileStudents4[0], systemStudent: systemStudents[0] },
    { fileStudent: fileStudents4[1], systemStudent: systemStudents[1] },
  ];
  
  const result4 = analyzer.analyzeStudentCounts(systemStudents, fileStudents4, matchedStudents4);
  console.log('📊 分析结果:');
  console.log(`- 总差异: ${result4.totalDifference}`);
  console.log(`- 新班级: ${result4.newClasses.length}个`);
  console.log('新班级详情:');
  result4.newClasses.forEach(classInfo => {
    console.log(`  ${classInfo.className}: ${classInfo.fileCount}人`);
  });
  console.log('处理建议:', result4.actions);

  console.log('\n✅ 学生数量差异检测功能测试完成！');
  console.log('\n🎯 功能特点总结:');
  console.log('1. 精确检测班级级别的学生数量差异');
  console.log('2. 智能分析缺失学生和多余学生的可能原因');
  console.log('3. 自动识别新班级和数据质量问题');
  console.log('4. 提供详细的处理建议和操作指导');
  console.log('5. 支持多种异常场景的智能分析');
}

runTests().catch(console.error); 