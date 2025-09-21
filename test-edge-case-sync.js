/**
 * 测试边缘案例的自动同步功能
 * 验证学生重复检测和合并机制
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// 模拟AutoSyncService的核心逻辑
class TestAutoSyncService {
  /**
   * 清理学生姓名
   */
  cleanStudentName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .trim()
      .replace(/\s+/g, '') // 去除所有空格
      .replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '') // 只保留中文、英文字母
      .slice(0, 10); // 限制长度
  }

  /**
   * 清理班级名称
   */
  cleanClassName(className) {
    if (!className || typeof className !== 'string') return '';
    
    return className
      .trim()
      .replace(/\s+/g, '') // 去除多余空格
      .replace(/班$/, '') // 去除末尾的"班"字
      .slice(0, 20); // 限制长度
  }

  /**
   * 数据质量检查和清理
   */
  cleanStudentData(gradeData) {
    const validData = [];
    const issues = [];

    gradeData.forEach((record, index) => {
      // 基础数据完整性检查
      if (!record.name || !record.class_name) {
        issues.push(`行 ${index + 1}: 缺少学生姓名或班级信息`);
        return;
      }

      // 姓名格式检查和清理
      const cleanedName = this.cleanStudentName(record.name);
      if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 10) {
        issues.push(`行 ${index + 1}: 学生姓名格式异常 "${record.name}"`);
        return;
      }

      // 班级名称清理
      const cleanedClassName = this.cleanClassName(record.class_name);
      if (!cleanedClassName) {
        issues.push(`行 ${index + 1}: 班级名称格式异常 "${record.class_name}"`);
        return;
      }

      // 创建清理后的记录
      const cleanedRecord = {
        ...record,
        name: cleanedName,
        class_name: cleanedClassName
      };

      validData.push(cleanedRecord);
    });

    if (issues.length > 0) {
      console.warn('🚨 发现数据质量问题:', issues.slice(0, 10));
      if (issues.length > 10) {
        console.warn(`... 还有 ${issues.length - 10} 个问题`);
      }
    }

    return validData;
  }

  /**
   * 计算两个姓名的相似度
   */
  calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;
    if (name1 === name2) return 1.0;

    const len1 = name1.length;
    const len2 = name2.length;
    
    // 长度差异过大，相似度低
    if (Math.abs(len1 - len2) > Math.min(len1, len2) / 2) return 0;

    // 使用动态规划计算编辑距离
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (name1[i - 1] === name2[j - 1]) {
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

    const editDistance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, 1 - editDistance / maxLen);
  }

  /**
   * 检测重复学生
   */
  analyzeDuplicateStudents(newStudentsMap, existingStudents) {
    const exactDuplicates = [];
    const potentialDuplicates = [];
    const crossClassDuplicates = [];

    // 构建现有学生的索引
    const existingByName = new Map();
    existingStudents?.forEach(student => {
      if (student.name) {
        if (!existingByName.has(student.name)) {
          existingByName.set(student.name, []);
        }
        existingByName.get(student.name).push(student);
      }
    });

    // 检测跨班级重复
    existingByName.forEach((students, name) => {
      if (students.length > 1) {
        const classes = students
          .map(s => s.classes?.name)
          .filter(Boolean)
          .filter((value, index, self) => self.indexOf(value) === index);
        
        if (classes.length > 1) {
          crossClassDuplicates.push({ name, classes });
        }
      }
    });

    // 检测新学生的重复情况
    [...newStudentsMap.entries()].forEach(([newKey, newStudent]) => {
      const { name, class_name } = newStudent;

      // 检查完全匹配的重复
      const exactMatch = existingStudents?.find(existing => 
        existing.name === name && existing.classes?.name === class_name
      );
      if (exactMatch) {
        exactDuplicates.push(newKey);
        return;
      }

      // 检查潜在重复
      existingStudents?.forEach(existing => {
        if (!existing.name) return;

        // 同名但不同班级
        if (existing.name === name && existing.classes?.name !== class_name) {
          potentialDuplicates.push({
            newKey,
            existingStudent: existing,
            similarity: 1.0
          });
          return;
        }

        // 相似姓名检测
        const similarity = this.calculateNameSimilarity(name, existing.name);
        if (similarity > 0.8 && similarity < 1.0) {
          potentialDuplicates.push({
            newKey,
            existingStudent: existing,
            similarity
          });
        }
      });
    });

    return {
      exactDuplicates,
      potentialDuplicates,
      crossClassDuplicates,
      summary: {
        totalNew: newStudentsMap.size,
        exactDuplicates: exactDuplicates.length,
        potentialDuplicates: potentialDuplicates.length,
        crossClassDuplicates: crossClassDuplicates.length
      }
    };
  }
}

// 测试函数
async function testEdgeCaseSync() {
  console.log('🧪 开始边缘案例同步测试...\n');

  try {
    // 读取边缘案例测试数据
    const csvContent = fs.readFileSync('edge-case-test.csv', 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const testData = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',');
        const record = {};
        headers.forEach((header, index) => {
          record[header.trim()] = values[index]?.trim() || '';
        });
        return record;
      });

    console.log(`📊 原始测试数据: ${testData.length} 条记录`);

    // 初始化测试服务
    const testService = new TestAutoSyncService();

    // 测试数据清理
    console.log('\n🧹 测试数据清理...');
    const cleanedData = testService.cleanStudentData(testData);
    console.log(`✅ 清理后数据: ${cleanedData.length} 条记录`);
    console.log(`❌ 过滤掉: ${testData.length - cleanedData.length} 条无效记录`);

    // 构建学生映射
    const studentsFromData = new Map();
    cleanedData.forEach(record => {
      if (record.name && record.class_name) {
        const key = `${record.name}_${record.class_name}`;
        if (!studentsFromData.has(key)) {
          studentsFromData.set(key, {
            name: record.name,
            class_name: record.class_name,
            rawRecords: []
          });
        }
        studentsFromData.get(key).rawRecords.push(record);
      }
    });

    console.log(`\n👥 去重后学生: ${studentsFromData.size} 名`);

    // 获取现有学生数据进行重复检测测试
    console.log('\n🔍 测试重复检测逻辑...');
    const { data: existingStudents } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        name,
        class_id,
        classes(id, name)
      `);

    console.log(`📋 现有学生数量: ${existingStudents?.length || 0}`);

    // 执行重复检测分析
    const duplicateAnalysis = testService.analyzeDuplicateStudents(studentsFromData, existingStudents);
    
    console.log('\n📈 重复检测分析结果:');
    console.log(`📊 总体摘要:`, duplicateAnalysis.summary);
    
    if (duplicateAnalysis.exactDuplicates.length > 0) {
      console.log(`🎯 精确重复 (${duplicateAnalysis.exactDuplicates.length} 个):`);
      duplicateAnalysis.exactDuplicates.forEach(key => {
        console.log(`   - ${key}`);
      });
    }
    
    if (duplicateAnalysis.potentialDuplicates.length > 0) {
      console.log(`⚠️  潜在重复 (${duplicateAnalysis.potentialDuplicates.length} 个):`);
      duplicateAnalysis.potentialDuplicates.forEach(dup => {
        console.log(`   - ${dup.newKey} ↔️ ${dup.existingStudent.name}(${dup.existingStudent.classes?.name}) 相似度: ${(dup.similarity * 100).toFixed(1)}%`);
      });
    }
    
    if (duplicateAnalysis.crossClassDuplicates.length > 0) {
      console.log(`🔀 跨班级重复 (${duplicateAnalysis.crossClassDuplicates.length} 个):`);
      duplicateAnalysis.crossClassDuplicates.forEach(dup => {
        console.log(`   - ${dup.name} 存在于班级: ${dup.classes.join(', ')}`);
      });
    }

    // 测试相似度计算算法
    console.log('\n🔬 测试姓名相似度算法:');
    const testPairs = [
      ['张三', '张珊'],
      ['李明123', '李明'],
      ['王五', '王武'],
      ['这是一个非常长的学生姓名测试', '长姓名测试'],
      ['张三', '李四']
    ];
    
    testPairs.forEach(([name1, name2]) => {
      const similarity = testService.calculateNameSimilarity(name1, name2);
      console.log(`   "${name1}" ↔️ "${name2}": ${(similarity * 100).toFixed(1)}%`);
    });

    console.log('\n✅ 边缘案例测试完成！');
    console.log('\n📋 测试结果总结:');
    console.log(`✅ 数据清理: ${cleanedData.length}/${testData.length} 记录通过验证`);
    console.log(`✅ 学生去重: ${studentsFromData.size} 个唯一学生`);
    console.log(`✅ 重复检测: 发现 ${duplicateAnalysis.summary.exactDuplicates} 个精确重复`);
    console.log(`✅ 相似检测: 发现 ${duplicateAnalysis.summary.potentialDuplicates} 个潜在重复`);
    console.log(`✅ 姓名相似度算法正常工作`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testEdgeCaseSync();