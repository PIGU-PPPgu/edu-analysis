/**
 * 学生数量差异检测服务
 * 分析班级学生数量差异，检测缺失学生和多余学生的情况
 */

export interface ClassStudentCount {
  className: string;
  systemCount: number; // 系统中该班级的学生数量
  fileCount: number;   // 文件中该班级的学生数量
  difference: number;  // 差异数量 (fileCount - systemCount)
  status: 'normal' | 'missing' | 'extra' | 'new_class'; // 状态
}

export interface StudentCountAnalysisResult {
  // 班级级别的分析
  classCounts: ClassStudentCount[];
  
  // 总体统计
  totalSystemStudents: number;
  totalFileStudents: number;
  totalDifference: number;
  
  // 问题分类
  classesWithMissingStudents: ClassStudentCount[]; // 有缺失学生的班级
  classesWithExtraStudents: ClassStudentCount[];   // 有多余学生的班级
  newClasses: ClassStudentCount[];                 // 新班级
  
  // 分析建议
  recommendations: string[];
  warnings: string[];
  actions: string[];
  
  // 详细信息
  missingStudentDetails: Array<{
    className: string;
    missingCount: number;
    systemStudents: Array<{ name: string; student_id: string }>;
    possibleReasons: string[];
  }>;
  
  extraStudentDetails: Array<{
    className: string;
    extraCount: number;
    extraStudents: Array<{ name: string; student_id?: string }>;
    possibleReasons: string[];
  }>;
}

/**
 * 学生数量差异分析器
 */
export class StudentCountAnalyzer {
  
  /**
   * 分析学生数量差异
   */
  public analyzeStudentCounts(
    systemStudents: Array<{ name: string; student_id: string; class_name?: string }>,
    fileStudents: Array<{ name: string; student_id?: string; class_name?: string }>,
    matchedStudents: Array<{ fileStudent: any; systemStudent: any }>,
    options: {
      tolerancePercentage?: number; // 容忍的差异百分比
      minClassSize?: number;        // 最小班级规模
      maxClassSize?: number;        // 最大班级规模
    } = {}
  ): StudentCountAnalysisResult {
    
    const {
      tolerancePercentage = 0.1, // 默认10%容忍度
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
    const classCounts: ClassStudentCount[] = [];
    
    for (const className of allClasses) {
      const systemCount = systemClassCounts[className] || 0;
      const fileCount = fileClassCounts[className] || 0;
      const difference = fileCount - systemCount;
      
      let status: ClassStudentCount['status'] = 'normal';
      
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

    const result: StudentCountAnalysisResult = {
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

  /**
   * 按班级统计学生数量
   */
  private countStudentsByClass(students: Array<{ class_name?: string }>): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const student of students) {
      const className = student.class_name || '未分班';
      counts[className] = (counts[className] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * 生成缺失学生详细信息
   */
  private generateMissingStudentDetails(
    classesWithMissing: ClassStudentCount[],
    systemStudents: Array<{ name: string; student_id: string; class_name?: string }>,
    fileStudents: Array<{ name: string; student_id?: string; class_name?: string }>,
    matchedStudents: Array<{ fileStudent: any; systemStudent: any }>
  ): StudentCountAnalysisResult['missingStudentDetails'] {
    
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

  /**
   * 生成多余学生详细信息
   */
  private generateExtraStudentDetails(
    classesWithExtra: ClassStudentCount[],
    fileStudents: Array<{ name: string; student_id?: string; class_name?: string }>,
    matchedStudents: Array<{ fileStudent: any; systemStudent: any }>
  ): StudentCountAnalysisResult['extraStudentDetails'] {
    
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

  /**
   * 分析缺失学生的可能原因
   */
  private analyzeMissingReasons(
    classInfo: ClassStudentCount,
    missingStudents: Array<{ name: string; student_id: string }>,
    fileStudents: Array<{ name: string; student_id?: string; class_name?: string }>
  ): string[] {
    const reasons: string[] = [];
    
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

  /**
   * 分析多余学生的可能原因
   */
  private analyzeExtraReasons(
    classInfo: ClassStudentCount,
    extraStudents: Array<{ name: string; student_id?: string }>
  ): string[] {
    const reasons: string[] = [];
    
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

  /**
   * 生成分析建议
   */
  private generateAnalysisRecommendations(
    classCounts: ClassStudentCount[],
    tolerancePercentage: number,
    minClassSize: number,
    maxClassSize: number
  ): { recommendations: string[]; warnings: string[]; actions: string[] } {
    
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const actions: string[] = [];

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

    // 班级规模分析
    for (const classInfo of classCounts) {
      if (classInfo.systemCount > 0) { // 排除新班级
        if (classInfo.systemCount < minClassSize) {
          warnings.push(`${classInfo.className}班级规模偏小(${classInfo.systemCount}人)，建议关注`);
        } else if (classInfo.systemCount > maxClassSize) {
          warnings.push(`${classInfo.className}班级规模偏大(${classInfo.systemCount}人)，建议关注`);
        }
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

    // 数据质量建议
    const totalDifference = classCounts.reduce((sum, c) => sum + Math.abs(c.difference), 0);
    const totalStudents = classCounts.reduce((sum, c) => sum + c.systemCount, 0);
    const overallErrorRate = totalDifference / (totalStudents || 1);

    if (overallErrorRate > 0.1) {
      warnings.push('整体数据差异率较高，建议检查数据导入流程和质量控制');
    } else if (overallErrorRate > 0.05) {
      recommendations.push('数据差异率中等，建议加强数据验证');
    } else {
      recommendations.push('数据质量良好，差异在可接受范围内');
    }

    return { recommendations, warnings, actions };
  }

  /**
   * 获取处理建议
   */
  public getProcessingSuggestions(analysisResult: StudentCountAnalysisResult): {
    autoActions: string[];
    userActions: string[];
    confirmations: string[];
  } {
    const autoActions: string[] = [];
    const userActions: string[] = [];
    const confirmations: string[] = [];

    // 自动处理建议
    if (analysisResult.totalDifference === 0) {
      autoActions.push('数量完全匹配，可以直接导入');
    }

    // 需要用户确认的操作
    if (analysisResult.classesWithMissingStudents.length > 0) {
      userActions.push('确认缺失学生的处理方式（忽略/标记缺考/延后处理）');
    }

    if (analysisResult.classesWithExtraStudents.length > 0) {
      userActions.push('确认多余学生的处理方式（创建新档案/分配到其他班级/忽略）');
    }

    if (analysisResult.newClasses.length > 0) {
      userActions.push('确认是否创建新班级档案');
    }

    // 需要特别确认的情况
    const highDifferenceClasses = analysisResult.classCounts.filter(c => 
      Math.abs(c.difference) / (c.systemCount || 1) > 0.2
    );

    if (highDifferenceClasses.length > 0) {
      confirmations.push(`${highDifferenceClasses.length}个班级差异较大，需要特别确认`);
    }

    return { autoActions, userActions, confirmations };
  }
}

// 导出默认实例
export const studentCountAnalyzer = new StudentCountAnalyzer(); 