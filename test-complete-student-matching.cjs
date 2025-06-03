const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量读取配置
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置信息');
  console.error('请确保.env文件中包含SUPABASE_URL和SUPABASE_ANON_KEY');
  console.error('或者VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 计算姓名相似度（编辑距离算法）
function calculateNameSimilarity(name1, name2) {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
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
  
  // 转换为相似度（0-1之间）
  return maxLength === 0 ? 1.0 : 1 - (editDistance / maxLength);
}

// 智能学生匹配分析函数
async function performStudentMatchingAnalysis(fileData, userConfirmedMappings) {
  console.log('\n🔍 开始执行智能学生匹配分析...');
  
  try {
    // 从文件数据中提取学生信息
    const fileStudents = fileData.map(row => {
      const mappedData = {};
      
      // 使用确认的字段映射来提取学生信息
      Object.entries(userConfirmedMappings).forEach(([originalField, mappedField]) => {
        if (row[originalField] !== undefined) {
          mappedData[mappedField] = row[originalField];
        }
      });
      
      return {
        name: mappedData.name || '',
        student_id: mappedData.student_id || '',
        class_name: mappedData.class_name || ''
      };
    }).filter(student => student.name); // 过滤掉没有姓名的记录
    
    console.log(`📊 文件中提取的学生信息: ${fileStudents.length} 个学生`);
    fileStudents.slice(0, 3).forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name} (学号: ${student.student_id || '无'}, 班级: ${student.class_name || '无'})`);
    });
    if (fileStudents.length > 3) {
      console.log(`   ... 还有 ${fileStudents.length - 3} 个学生`);
    }
    
    // 获取系统中的所有学生
    const { data: systemStudents, error } = await supabase
      .from('students')
      .select('id, name, student_id, class_name')
      .order('name');
    
    if (error) {
      console.error('❌ 获取系统学生失败:', error);
      throw error;
    }
    
    console.log(`🏫 系统中的学生数量: ${systemStudents?.length || 0} 个学生`);
    
    // 执行智能匹配分析
    const exactMatches = [];
    const fuzzyMatches = [];
    const newStudents = [];
    const systemStudentsNotInFile = [];
    
    // 创建系统学生的映射表
    const systemStudentsByName = new Map();
    const systemStudentsById = new Map();
    
    (systemStudents || []).forEach(student => {
      systemStudentsByName.set(student.name.toLowerCase(), student);
      if (student.student_id) {
        systemStudentsById.set(student.student_id, student);
      }
    });
    
    console.log('\n🔄 开始匹配分析...');
    
    // 分析每个文件中的学生
    fileStudents.forEach((fileStudent, index) => {
      let matched = false;
      
      // 1. 精确学号匹配
      if (fileStudent.student_id && systemStudentsById.has(fileStudent.student_id)) {
        const systemStudent = systemStudentsById.get(fileStudent.student_id);
        exactMatches.push({
          fileStudent,
          systemStudent,
          matchType: 'exact_id'
        });
        matched = true;
        console.log(`   ✅ 精确学号匹配: ${fileStudent.name} (${fileStudent.student_id}) -> ${systemStudent.name}`);
      }
      // 2. 精确姓名匹配
      else if (systemStudentsByName.has(fileStudent.name.toLowerCase())) {
        const systemStudent = systemStudentsByName.get(fileStudent.name.toLowerCase());
        exactMatches.push({
          fileStudent,
          systemStudent,
          matchType: 'exact_name'
        });
        matched = true;
        console.log(`   ✅ 精确姓名匹配: ${fileStudent.name} -> ${systemStudent.name} (${systemStudent.student_id})`);
      }
      // 3. 模糊匹配
      else {
        const possibleMatches = [];
        
        (systemStudents || []).forEach(systemStudent => {
          // 计算姓名相似度
          const similarity = calculateNameSimilarity(fileStudent.name, systemStudent.name);
          
          if (similarity >= 0.6) { // 相似度阈值
            let matchReason = '';
            if (similarity >= 0.9) {
              matchReason = '姓名高度相似';
            } else if (similarity >= 0.7) {
              matchReason = '姓名中等相似';
            } else {
              matchReason = '姓名部分相似';
            }
            
            // 如果班级信息匹配，提高相似度
            if (fileStudent.class_name && systemStudent.class_name && 
                fileStudent.class_name === systemStudent.class_name) {
              matchReason += '，班级匹配';
            }
            
            possibleMatches.push({
              systemStudent,
              similarity,
              matchReason
            });
          }
        });
        
        if (possibleMatches.length > 0) {
          // 按相似度排序
          possibleMatches.sort((a, b) => b.similarity - a.similarity);
          
          fuzzyMatches.push({
            fileStudent,
            possibleMatches: possibleMatches.slice(0, 3) // 最多显示3个可能匹配
          });
          matched = true;
          
          console.log(`   🤔 模糊匹配: ${fileStudent.name} -> ${possibleMatches.length} 个可能匹配`);
          possibleMatches.slice(0, 2).forEach(match => {
            console.log(`      - ${match.systemStudent.name} (相似度: ${(match.similarity * 100).toFixed(0)}%, ${match.matchReason})`);
          });
        }
      }
      
      // 如果没有匹配到，标记为新学生
      if (!matched) {
        newStudents.push(fileStudent);
        console.log(`   🆕 新学生: ${fileStudent.name} (学号: ${fileStudent.student_id || '无'})`);
      }
    });
    
    // 找出系统中存在但文件中没有的学生
    const fileStudentNames = new Set(fileStudents.map(s => s.name.toLowerCase()));
    const fileStudentIds = new Set(fileStudents.map(s => s.student_id).filter(Boolean));
    
    (systemStudents || []).forEach(systemStudent => {
      const nameMatch = fileStudentNames.has(systemStudent.name.toLowerCase());
      const idMatch = systemStudent.student_id && fileStudentIds.has(systemStudent.student_id);
      
      if (!nameMatch && !idMatch) {
        systemStudentsNotInFile.push(systemStudent);
      }
    });
    
    const result = {
      count: exactMatches.length,
      totalStudentsInFile: fileStudents.length,
      exactMatches,
      fuzzyMatches,
      newStudents,
      systemStudentsNotInFile
    };
    
    console.log('\n📊 学生匹配分析结果:');
    console.log(`   📈 总学生数: ${result.totalStudentsInFile}`);
    console.log(`   ✅ 精确匹配: ${result.exactMatches.length} (${((result.exactMatches.length / result.totalStudentsInFile) * 100).toFixed(1)}%)`);
    console.log(`   🤔 需要确认: ${result.fuzzyMatches.length}`);
    console.log(`   🆕 新学生: ${result.newStudents.length}`);
    console.log(`   👻 系统中存在但文件未包含: ${result.systemStudentsNotInFile.length}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ 学生匹配分析失败:', error);
    throw error;
  }
}

// 主测试函数
async function testCompleteStudentMatching() {
  console.log('🚀 开始测试完整的智能学生匹配功能');
  console.log('=' .repeat(60));
  
  try {
    // 1. 检查数据库连接
    console.log('\n1️⃣ 检查数据库连接...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('students')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ 数据库连接失败:', connectionError);
      return;
    }
    console.log('✅ 数据库连接正常');
    
    // 2. 读取测试CSV文件
    console.log('\n2️⃣ 读取测试CSV文件...');
    const csvFilePath = '907九下月考成绩.csv';
    
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ 找不到测试文件: ${csvFilePath}`);
      return;
    }
    
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`✅ 成功读取CSV文件: ${lines.length - 1} 行数据, ${headers.length} 个字段`);
    console.log(`📋 表头: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`);
    
    // 3. 解析CSV数据
    console.log('\n3️⃣ 解析CSV数据...');
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      dataRows.push(row);
    }
    
    console.log(`✅ 解析完成: ${dataRows.length} 行数据`);
    
    // 4. 设置字段映射（模拟智能识别结果）
    console.log('\n4️⃣ 设置字段映射...');
    const userConfirmedMappings = {
      '姓名': 'name',
      '班级': 'class_name',
      '总分': 'total_score',
      '语文分数': '语文_score',
      '数学分数': '数学_score',
      '英语分数': '英语_score',
      '物理分数': '物理_score',
      '化学分数': '化学_score',
      '道法分数': '政治_score',
      '历史分数': '历史_score'
    };
    
    console.log('✅ 字段映射设置完成');
    console.log('   映射关系:');
    Object.entries(userConfirmedMappings).forEach(([original, mapped]) => {
      console.log(`     ${original} -> ${mapped}`);
    });
    
    // 5. 执行智能学生匹配分析
    console.log('\n5️⃣ 执行智能学生匹配分析...');
    const matchingResult = await performStudentMatchingAnalysis(dataRows, userConfirmedMappings);
    
    // 6. 详细展示匹配结果
    console.log('\n6️⃣ 详细匹配结果分析:');
    
    if (matchingResult.exactMatches.length > 0) {
      console.log('\n✅ 精确匹配学生:');
      matchingResult.exactMatches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.fileStudent.name} (${match.matchType === 'exact_id' ? '学号匹配' : '姓名匹配'})`);
        console.log(`      文件: 学号=${match.fileStudent.student_id || '无'}, 班级=${match.fileStudent.class_name || '无'}`);
        console.log(`      系统: 学号=${match.systemStudent.student_id}, 班级=${match.systemStudent.class_name || '无'}`);
      });
    }
    
    if (matchingResult.fuzzyMatches.length > 0) {
      console.log('\n🤔 需要确认的模糊匹配:');
      matchingResult.fuzzyMatches.forEach((fuzzyMatch, index) => {
        console.log(`   ${index + 1}. 文件学生: ${fuzzyMatch.fileStudent.name}`);
        console.log(`      可能匹配:`);
        fuzzyMatch.possibleMatches.forEach((possible, pIndex) => {
          console.log(`        ${pIndex + 1}. ${possible.systemStudent.name} (相似度: ${(possible.similarity * 100).toFixed(0)}%)`);
          console.log(`           ${possible.matchReason}`);
        });
      });
    }
    
    if (matchingResult.newStudents.length > 0) {
      console.log('\n🆕 新学生 (需要创建):');
      matchingResult.newStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (学号: ${student.student_id || '无'}, 班级: ${student.class_name || '无'})`);
      });
    }
    
    if (matchingResult.systemStudentsNotInFile.length > 0) {
      console.log(`\n👻 系统中存在但本次文件未包含的学生 (${matchingResult.systemStudentsNotInFile.length} 个):`);
      matchingResult.systemStudentsNotInFile.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (学号: ${student.student_id}, 班级: ${student.class_name || '无'})`);
      });
      if (matchingResult.systemStudentsNotInFile.length > 5) {
        console.log(`   ... 还有 ${matchingResult.systemStudentsNotInFile.length - 5} 个学生`);
      }
    }
    
    // 7. 生成匹配报告
    console.log('\n7️⃣ 匹配质量评估:');
    const totalStudents = matchingResult.totalStudentsInFile;
    const exactMatchRate = (matchingResult.exactMatches.length / totalStudents) * 100;
    const fuzzyMatchRate = (matchingResult.fuzzyMatches.length / totalStudents) * 100;
    const newStudentRate = (matchingResult.newStudents.length / totalStudents) * 100;
    
    console.log(`   📊 精确匹配率: ${exactMatchRate.toFixed(1)}% (${matchingResult.exactMatches.length}/${totalStudents})`);
    console.log(`   🤔 模糊匹配率: ${fuzzyMatchRate.toFixed(1)}% (${matchingResult.fuzzyMatches.length}/${totalStudents})`);
    console.log(`   🆕 新学生率: ${newStudentRate.toFixed(1)}% (${matchingResult.newStudents.length}/${totalStudents})`);
    
    let qualityLevel = '';
    if (exactMatchRate >= 80) {
      qualityLevel = '🟢 优秀 - 大部分学生都能精确匹配';
    } else if (exactMatchRate >= 60) {
      qualityLevel = '🟡 良好 - 多数学生能够匹配，少数需要确认';
    } else if (exactMatchRate >= 40) {
      qualityLevel = '🟠 一般 - 需要较多人工确认';
    } else {
      qualityLevel = '🔴 较差 - 需要大量人工处理';
    }
    
    console.log(`   🎯 匹配质量: ${qualityLevel}`);
    
    console.log('\n✅ 智能学生匹配功能测试完成!');
    console.log('=' .repeat(60));
    
    // 8. 测试相似度算法
    console.log('\n8️⃣ 测试姓名相似度算法:');
    const testCases = [
      ['张三', '张三', 1.0],
      ['张三', '张四', 0.5],
      ['李明', '李明明', 0.67],
      ['王小红', '王晓红', 0.67],
      ['陈志强', '陈志刚', 0.67],
      ['刘德华', '刘德', 0.67],
      ['完全不同', '毫无关系', 0.0]
    ];
    
    testCases.forEach(([name1, name2, expected]) => {
      const similarity = calculateNameSimilarity(name1, name2);
      const passed = Math.abs(similarity - expected) < 0.1;
      console.log(`   ${passed ? '✅' : '❌'} "${name1}" vs "${name2}": ${(similarity * 100).toFixed(0)}% (期望: ${(expected * 100).toFixed(0)}%)`);
    });
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.error('错误详情:', error.message);
  }
}

// 运行测试
testCompleteStudentMatching(); 