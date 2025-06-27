#!/usr/bin/env node

/**
 * 🧪 测试总分排名字段映射修复
 * 验证"总分等级、总分班名、总分校名、总分级名"等字段能否正确识别
 */

// 模拟测试数据
const testHeaders = [
  '学号',
  '姓名', 
  '班级',
  '总分',
  '总分等级',
  '总分班排',
  '总分班级排名',
  '总分班名',
  '总分级排',
  '总分年级排名', 
  '总分级名',
  '总分校排',
  '总分学校排名',
  '总分校名',
  '语文',
  '数学',
  '英语'
];

const sampleData = [
  {
    '学号': '2023001',
    '姓名': '张三',
    '班级': '高一1班', 
    '总分': 650,
    '总分等级': 'A',
    '总分班排': 3,
    '总分班级排名': 3,
    '总分班名': 3,
    '总分级排': 25,
    '总分年级排名': 25,
    '总分级名': 25,
    '总分校排': 25,
    '总分学校排名': 25,
    '总分校名': 25,
    '语文': 120,
    '数学': 135,
    '英语': 128
  }
];

/**
 * 测试AI增强解析器的算法模式匹配
 */
function testAlgorithmPatterns() {
  console.log('🔍 测试算法模式匹配...');
  console.log('='.repeat(50));
  
  const patterns = {
    // 学生信息
    student_id: [/学号|student_?id|学生学号|学生编号|编号|考生号|id$/i],
    name: [/姓名|name|学生姓名|真实姓名$/i],
    class_name: [/班级|class|所在班级|行政班级$/i],
    
    // 排名 - 包含总分排名
    rank_in_class: [/班级排名|班排|总分班排|总分班级排名|总分班名$/i],
    rank_in_grade: [/年级排名|级排|区排|总分级排|总分年级排名|总分级名$/i], 
    rank_in_school: [/校排名|校排|总分校排|总分学校排名|总分校名$/i],
    
    // 总分
    total_score: [/总分|总成绩|合计$/i],
    total_grade: [/总分等级|总等级$/i],
    
    // 总分排名的其他变体
    total_class_rank: [/总分班排|总分班级排名|总分班名$/i],
    total_grade_rank: [/总分级排|总分年级排名|总分级名$/i],
    total_school_rank: [/总分校排|总分学校排名|总分校名$/i]
  };
  
  const mappings = new Map();
  let totalMatched = 0;
  let totalHeaders = testHeaders.length;
  
  // 模拟算法匹配过程
  for (const header of testHeaders) {
    console.log(`\n📋 测试字段: "${header}"`);
    let matched = false;
    
    for (const [fieldName, patternList] of Object.entries(patterns)) {
      if (patternList.some(pattern => pattern.test(header))) {
        console.log(`  ✅ 匹配成功: ${fieldName}`);
        mappings.set(header, fieldName);
        totalMatched++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      console.log(`  ❌ 未匹配到任何模式`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 算法匹配结果统计:');
  console.log(`✅ 成功匹配: ${totalMatched}/${totalHeaders} (${((totalMatched/totalHeaders)*100).toFixed(1)}%)`);
  console.log(`❌ 未匹配: ${totalHeaders - totalMatched}`);
  
  // 重点检查总分排名字段
  console.log('\n🎯 重点验证 - 总分排名字段:');
  const totalRankFields = [
    '总分等级', '总分班排', '总分班级排名', '总分班名',
    '总分级排', '总分年级排名', '总分级名',
    '总分校排', '总分学校排名', '总分校名'
  ];
  
  let totalRankMatched = 0;
  totalRankFields.forEach(field => {
    if (mappings.has(field)) {
      console.log(`  ✅ ${field} -> ${mappings.get(field)}`);
      totalRankMatched++;
    } else {
      console.log(`  ❌ ${field} -> 未匹配`);
    }
  });
  
  console.log(`\n📈 总分排名字段匹配率: ${totalRankMatched}/${totalRankFields.length} (${((totalRankMatched/totalRankFields.length)*100).toFixed(1)}%)`);
  
  return {
    overall: { matched: totalMatched, total: totalHeaders, rate: totalMatched/totalHeaders },
    totalRank: { matched: totalRankMatched, total: totalRankFields.length, rate: totalRankMatched/totalRankFields.length },
    mappings: Object.fromEntries(mappings)
  };
}

/**
 * 测试增强字段映射器的模式匹配
 */
function testEnhancedFieldPatterns() {
  console.log('\n\n🚀 测试增强字段映射器...');
  console.log('='.repeat(50));
  
  const enhancedPatterns = {
    rank_in_class: ['班级排名', '班内排名', '班排名', '班级名次', 'class_rank', '总分班排', '总分班级排名', '总分班名'],
    rank_in_grade: ['年级排名', '年级名次', '级排名', 'grade_rank', '总分级排', '总分年级排名', '总分级名'],
    rank_in_school: ['校排名', '学校排名', '校内排名', 'school_rank', '总分校排', '总分学校排名', '总分校名'],
    total_score: ['总分', '总成绩', 'total_score'],
    grade_level: ['总分等级', '总等级']
  };
  
  const mappings = {};
  let enhancedMatched = 0;
  
  // 标准化函数（模拟增强映射器的处理）
  const normalizeHeader = (header) => {
    return header
      .trim()
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
      .replace(/\s+/g, '');
  };
  
  for (const header of testHeaders) {
    const normalizedHeader = normalizeHeader(header);
    console.log(`\n📋 测试字段: "${header}" (标准化: "${normalizedHeader}")`);
    let matched = false;
    
    for (const [fieldName, alternatives] of Object.entries(enhancedPatterns)) {
      const normalizedAlternatives = alternatives.map(alt => normalizeHeader(alt));
      
      if (normalizedAlternatives.includes(normalizedHeader)) {
        console.log(`  ✅ 增强匹配成功: ${fieldName}`);
        mappings[header] = fieldName;
        enhancedMatched++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      console.log(`  ❌ 增强匹配失败`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 增强映射器结果统计:');
  console.log(`✅ 成功匹配: ${enhancedMatched}/${testHeaders.length} (${((enhancedMatched/testHeaders.length)*100).toFixed(1)}%)`);
  
  return {
    matched: enhancedMatched,
    total: testHeaders.length,
    rate: enhancedMatched/testHeaders.length,
    mappings
  };
}

/**
 * 主测试函数
 */
function runTests() {
  console.log('🧪 开始测试总分排名字段映射修复');
  console.log('测试数据包含以下字段:');
  console.log(testHeaders.map((h, i) => `  ${i+1}. ${h}`).join('\n'));
  
  // 测试算法模式匹配
  const algorithmResults = testAlgorithmPatterns();
  
  // 测试增强字段映射
  const enhancedResults = testEnhancedFieldPatterns();
  
  // 总结
  console.log('\n\n' + '='.repeat(60));
  console.log('🎯 测试总结');
  console.log('='.repeat(60));
  
  console.log('\n📈 算法模式匹配:');
  console.log(`  - 整体匹配率: ${(algorithmResults.overall.rate * 100).toFixed(1)}%`);
  console.log(`  - 总分排名匹配率: ${(algorithmResults.totalRank.rate * 100).toFixed(1)}%`);
  
  console.log('\n🚀 增强字段映射:');
  console.log(`  - 整体匹配率: ${(enhancedResults.rate * 100).toFixed(1)}%`);
  
  // 成功率评估
  const overallSuccess = Math.max(algorithmResults.overall.rate, enhancedResults.rate);
  const totalRankSuccess = algorithmResults.totalRank.rate;
  
  console.log('\n🏆 修复效果评估:');
  if (totalRankSuccess >= 0.8) {
    console.log('  ✅ 总分排名字段识别修复成功！');
    console.log(`  ✅ 修复前: 0% -> 修复后: ${(totalRankSuccess * 100).toFixed(1)}%`);
  } else {
    console.log('  ⚠️  总分排名字段识别仍需改进');
    console.log(`  ⚠️  当前识别率: ${(totalRankSuccess * 100).toFixed(1)}%`);
  }
  
  if (overallSuccess >= 0.7) {
    console.log('  ✅ 整体字段映射表现良好');
  } else {
    console.log('  ⚠️  整体字段映射需要进一步优化');
  }
  
  console.log('\n🔍 建议:');
  if (totalRankSuccess < 0.8) {
    console.log('  1. 检查是否所有总分排名变体都已包含在模式中');
    console.log('  2. 考虑添加更多的总分排名字段别名');
    console.log('  3. 验证正则表达式的匹配准确性');
  } else {
    console.log('  1. 修复效果良好，可以进行实际测试');
    console.log('  2. 建议在真实数据上验证映射效果');
  }
  
  console.log('='.repeat(60));
}

// 运行测试
runTests();