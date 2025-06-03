/**
 * 智能学生匹配算法测试脚本
 */

// 模拟智能学生匹配器（简化版本，用于测试）
class TestIntelligentStudentMatcher {
  constructor() {
    this.EXACT_MATCH_THRESHOLD = 1.0;
    this.FUZZY_MATCH_THRESHOLD = 0.8;
    this.MIN_CONFIDENCE_THRESHOLD = 0.6;
  }

  // 计算字符串相似度
  calculateStringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    // 计算编辑距离
    const matrix = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // 删除
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j - 1] + 1  // 替换
          );
        }
      }
    }
    
    const editDistance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (editDistance / maxLength);
  }

  // 查找精确匹配
  findExactMatch(fileStudent, systemStudents, excludeIds) {
    // 1. 学号精确匹配（最高优先级）
    if (fileStudent.student_id) {
      const match = systemStudents.find(ss => 
        !excludeIds.has(ss.id) && 
        ss.student_id === fileStudent.student_id
      );
      
      if (match) {
        return {
          fileStudent,
          systemStudent: match,
          matchType: 'exact_id',
          confidence: 1.0,
          matchReason: `学号精确匹配: ${fileStudent.student_id}`,
          needsConfirmation: false
        };
      }
    }

    // 2. 姓名 + 班级精确匹配
    if (fileStudent.class_name) {
      const match = systemStudents.find(ss => 
        !excludeIds.has(ss.id) && 
        ss.name === fileStudent.name && 
        ss.class_name === fileStudent.class_name
      );
      
      if (match) {
        return {
          fileStudent,
          systemStudent: match,
          matchType: 'exact_name',
          confidence: 1.0,
          matchReason: `姓名+班级精确匹配: ${fileStudent.name} (${fileStudent.class_name})`,
          needsConfirmation: false
        };
      }
    }

    // 3. 姓名精确匹配（同班级优先）
    const nameMatches = systemStudents.filter(ss => 
      !excludeIds.has(ss.id) && 
      ss.name === fileStudent.name
    );

    if (nameMatches.length === 1) {
      return {
        fileStudent,
        systemStudent: nameMatches[0],
        matchType: 'exact_name',
        confidence: 1.0,
        matchReason: `姓名精确匹配: ${fileStudent.name}`,
        needsConfirmation: false
      };
    }

    return null;
  }

  // 计算匹配置信度
  calculateMatchConfidence(fileStudent, systemStudent) {
    let totalWeight = 0;
    let weightedScore = 0;

    // 姓名相似度（权重：0.5）
    const nameSimilarity = this.calculateStringSimilarity(fileStudent.name, systemStudent.name);
    weightedScore += nameSimilarity * 0.5;
    totalWeight += 0.5;

    // 学号匹配（权重：0.3）
    if (fileStudent.student_id && systemStudent.student_id) {
      const idSimilarity = fileStudent.student_id === systemStudent.student_id ? 1.0 : 0.0;
      weightedScore += idSimilarity * 0.3;
      totalWeight += 0.3;
    }

    // 班级匹配（权重：0.2）
    if (fileStudent.class_name && systemStudent.class_name) {
      const classSimilarity = fileStudent.class_name === systemStudent.class_name ? 1.0 : 
                             this.calculateStringSimilarity(fileStudent.class_name, systemStudent.class_name);
      weightedScore += classSimilarity * 0.2;
      totalWeight += 0.2;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  // 查找模糊匹配
  findFuzzyMatch(fileStudent, systemStudents, excludeIds, threshold) {
    let bestMatch = null;

    for (const systemStudent of systemStudents) {
      if (excludeIds.has(systemStudent.id)) continue;

      const confidence = this.calculateMatchConfidence(fileStudent, systemStudent);
      
      if (confidence >= threshold && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          student: systemStudent,
          confidence,
          reason: this.generateMatchReason(fileStudent, systemStudent, confidence)
        };
      }
    }

    if (bestMatch) {
      return {
        fileStudent,
        systemStudent: bestMatch.student,
        matchType: 'fuzzy_combined',
        confidence: bestMatch.confidence,
        matchReason: bestMatch.reason,
        needsConfirmation: true
      };
    }

    return null;
  }

  // 生成匹配原因说明
  generateMatchReason(fileStudent, systemStudent, confidence) {
    const reasons = [];

    // 姓名相似度
    const nameSimilarity = this.calculateStringSimilarity(fileStudent.name, systemStudent.name);
    if (nameSimilarity >= 0.8) {
      reasons.push(`姓名相似度${(nameSimilarity * 100).toFixed(0)}%`);
    }

    // 学号匹配
    if (fileStudent.student_id && systemStudent.student_id) {
      if (fileStudent.student_id === systemStudent.student_id) {
        reasons.push('学号完全匹配');
      }
    }

    // 班级匹配
    if (fileStudent.class_name && systemStudent.class_name) {
      if (fileStudent.class_name === systemStudent.class_name) {
        reasons.push('班级完全匹配');
      } else {
        const classSimilarity = this.calculateStringSimilarity(fileStudent.class_name, systemStudent.class_name);
        if (classSimilarity >= 0.8) {
          reasons.push(`班级相似度${(classSimilarity * 100).toFixed(0)}%`);
        }
      }
    }

    return `${reasons.join(', ')} (总置信度: ${(confidence * 100).toFixed(0)}%)`;
  }

  // 执行智能学生匹配
  async matchStudents(fileStudents, systemStudents, options = {}) {
    const {
      enableFuzzyMatching = true,
      fuzzyThreshold = this.FUZZY_MATCH_THRESHOLD,
      classFilter
    } = options;

    console.log(`🔍 开始智能学生匹配: 文件学生${fileStudents.length}人, 系统学生${systemStudents.length}人`);

    // 过滤系统学生（如果指定了班级过滤）
    const filteredSystemStudents = classFilter && classFilter.length > 0
      ? systemStudents.filter(s => classFilter.includes(s.class_name || ''))
      : systemStudents;

    console.log(`📋 班级过滤后系统学生: ${filteredSystemStudents.length}人`);

    const exactMatches = [];
    const fuzzyMatches = [];
    const unmatchedFileStudents = [];
    const matchedSystemStudentIds = new Set();

    // 第一轮：精确匹配
    for (const fileStudent of fileStudents) {
      const exactMatch = this.findExactMatch(fileStudent, filteredSystemStudents, matchedSystemStudentIds);
      
      if (exactMatch) {
        exactMatches.push(exactMatch);
        matchedSystemStudentIds.add(exactMatch.systemStudent.id);
        console.log(`✅ 精确匹配: ${fileStudent.name} -> ${exactMatch.systemStudent.name} (${exactMatch.matchType})`);
      } else {
        unmatchedFileStudents.push(fileStudent);
      }
    }

    // 第二轮：模糊匹配（如果启用）
    if (enableFuzzyMatching) {
      for (const fileStudent of unmatchedFileStudents) {
        const fuzzyMatch = this.findFuzzyMatch(
          fileStudent, 
          filteredSystemStudents, 
          matchedSystemStudentIds, 
          fuzzyThreshold
        );
        
        if (fuzzyMatch) {
          fuzzyMatches.push(fuzzyMatch);
          console.log(`🔍 模糊匹配: ${fileStudent.name} -> ${fuzzyMatch.systemStudent.name} (置信度: ${fuzzyMatch.confidence.toFixed(2)})`);
        }
      }
    }

    // 识别新学生
    const matchedFileStudents = new Set([
      ...exactMatches.map(m => m.fileStudent),
      ...fuzzyMatches.map(m => m.fileStudent)
    ]);
    
    const newStudents = fileStudents.filter(fs => !matchedFileStudents.has(fs));

    // 识别缺失学生
    const missingStudents = filteredSystemStudents.filter(ss => !matchedSystemStudentIds.has(ss.id));

    // 计算统计信息
    const statistics = {
      totalFileStudents: fileStudents.length,
      totalSystemStudents: filteredSystemStudents.length,
      exactMatchCount: exactMatches.length,
      fuzzyMatchCount: fuzzyMatches.length,
      newStudentCount: newStudents.length,
      missingStudentCount: missingStudents.length,
      matchRate: exactMatches.length / fileStudents.length
    };

    console.log(`📊 匹配统计:`, statistics);

    return {
      exactMatches,
      fuzzyMatches,
      newStudents,
      missingStudents,
      statistics
    };
  }
}

// 测试数据
const systemStudents = [
  { id: '1', name: '张三', student_id: '2024001', class_name: '九年级1班' },
  { id: '2', name: '李四', student_id: '2024002', class_name: '九年级1班' },
  { id: '3', name: '王五', student_id: '2024003', class_name: '九年级1班' },
  { id: '4', name: '赵六', student_id: '2024004', class_name: '九年级2班' },
  { id: '5', name: '钱七', student_id: '2024005', class_name: '九年级2班' },
];

async function runTests() {
  const matcher = new TestIntelligentStudentMatcher();

  // 测试场景1：完美匹配
  console.log('\n🧪 测试场景1：完美匹配');
  console.log('=' .repeat(50));
  const fileStudents1 = [
    { name: '张三', student_id: '2024001', class_name: '九年级1班' },
    { name: '李四', student_id: '2024002', class_name: '九年级1班' },
  ];
  const result1 = await matcher.matchStudents(fileStudents1, systemStudents);
  console.log(`结果: 精确匹配${result1.exactMatches.length}个, 模糊匹配${result1.fuzzyMatches.length}个, 新学生${result1.newStudents.length}个, 缺失学生${result1.missingStudents.length}个`);

  // 测试场景2：缺少学号的匹配
  console.log('\n🧪 测试场景2：缺少学号的匹配');
  console.log('=' .repeat(50));
  const fileStudents2 = [
    { name: '张三', class_name: '九年级1班' }, // 缺少学号
    { name: '新学生', class_name: '九年级1班' }, // 新学生
  ];
  const result2 = await matcher.matchStudents(fileStudents2, systemStudents);
  console.log(`结果: 精确匹配${result2.exactMatches.length}个, 模糊匹配${result2.fuzzyMatches.length}个, 新学生${result2.newStudents.length}个, 缺失学生${result2.missingStudents.length}个`);

  // 测试场景3：数量不匹配
  console.log('\n🧪 测试场景3：数量不匹配');
  console.log('=' .repeat(50));
  const fileStudents3 = [
    { name: '张三', student_id: '2024001', class_name: '九年级1班' },
    { name: '李四', student_id: '2024002', class_name: '九年级1班' },
    // 缺少王五，系统中有3个九年级1班学生，但文件只有2个
    { name: '新转学生', class_name: '九年级1班' }, // 新学生
  ];
  const result3 = await matcher.matchStudents(fileStudents3, systemStudents, {
    classFilter: ['九年级1班'] // 只匹配九年级1班
  });
  console.log(`结果: 精确匹配${result3.exactMatches.length}个, 模糊匹配${result3.fuzzyMatches.length}个, 新学生${result3.newStudents.length}个, 缺失学生${result3.missingStudents.length}个`);

  // 详细分析场景3
  console.log('\n📊 场景3详细分析:');
  console.log('精确匹配的学生:', result3.exactMatches.map(m => `${m.fileStudent.name} -> ${m.systemStudent.name}`));
  console.log('新学生:', result3.newStudents.map(s => s.name));
  console.log('缺失学生:', result3.missingStudents.map(s => `${s.name} (${s.student_id})`));

  console.log('\n✅ 智能学生匹配算法测试完成！');
  console.log('\n🎯 算法特点总结:');
  console.log('1. 支持学号、姓名、班级三选二的智能匹配');
  console.log('2. 精确匹配优先，模糊匹配作为补充');
  console.log('3. 自动识别新学生和缺失学生');
  console.log('4. 支持班级过滤，提高匹配准确性');
  console.log('5. 提供详细的匹配原因和置信度');
}

runTests().catch(console.error); 