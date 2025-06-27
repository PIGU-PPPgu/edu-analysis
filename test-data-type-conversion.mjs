#!/usr/bin/env node

/**
 * 🧪 数据类型转换测试
 * 测试CSV文件中的混合数据类型转换功能
 */

import fs from 'fs';
import { convertToScore, detectDataType, analyzeCSVFieldTypes, cleanRowData, GRADE_TO_SCORE_MAP } from './src/utils/dataTypeConverter.ts';

console.log('🎯 数据类型转换测试');
console.log('='.repeat(50));

// 测试数据
const testValues = [
  '373',      // 纯数字
  'B+',       // 字母等级
  '85.5',     // 小数
  'A',        // 字母等级
  '68',       // 整数
  'A+',       // 字母等级
  '优',       // 中文等级
  '212',      // 大数字（可能是排名）
  '',         // 空值
  null,       // null值
  undefined   // undefined值
];

console.log('\n🧪 测试1: 单值转换测试');
console.log('-'.repeat(30));

testValues.forEach(value => {
  const converted = convertToScore(value);
  console.log(`"${value}" → ${converted} (${typeof converted})`);
});

console.log('\n🧪 测试2: 数据类型检测测试');
console.log('-'.repeat(30));

const scoreField = ['85.5', '68', '66', '90', '78'];
const gradeField = ['B+', 'B+', 'A', 'A', 'B'];
const mixedField = ['85', 'B+', '68', 'A', '78'];
const rankField = ['212', '330', '157', '89', '243'];

console.log('分数字段检测:', detectDataType(scoreField, '语文分数'));
console.log('等级字段检测:', detectDataType(gradeField, '语文等级'));
console.log('混合字段检测:', detectDataType(mixedField, '混合数据'));
console.log('排名字段检测:', detectDataType(rankField, '排名数据'));

console.log('\n🧪 测试3: CSV文件真实数据测试');
console.log('-'.repeat(30));

try {
  // 读取测试CSV文件
  const csvContent = fs.readFileSync('907九下月考成绩.csv', 'utf8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const firstDataRow = lines[1].split(',');
  
  console.log('\n📊 CSV文件分析:');
  console.log('字段数量:', headers.length);
  console.log('数据行数:', lines.length - 1);
  
  console.log('\n📋 前5个字段的数据样本:');
  headers.slice(0, 5).forEach((header, index) => {
    const columnData = lines.slice(1, 6).map(line => line.split(',')[index]);
    console.log(`\n字段: ${header}`);
    console.log('样本:', columnData);
    const detection = detectDataType(columnData, header);
    console.log('检测结果:', detection.type, `(置信度: ${Math.round(detection.confidence * 100)}%)`);
    if (detection.issues.length > 0) {
      console.log('问题:', detection.issues);
    }
    if (detection.suggestions.length > 0) {
      console.log('建议:', detection.suggestions);
    }
  });

  console.log('\n🔧 测试4: 关键字段转换测试');
  console.log('-'.repeat(30));

  // 测试关键字段转换
  const testRow = {};
  headers.forEach((header, index) => {
    testRow[header] = firstDataRow[index];
  });

  console.log('\n原始第一行数据:');
  console.log('姓名:', testRow['姓名']);
  console.log('班级:', testRow['班级']);
  console.log('总分分数:', testRow['总分分数'], '→', convertToScore(testRow['总分分数']));
  console.log('总分等级:', testRow['总分等级'], '→', convertToScore(testRow['总分等级']));
  console.log('语文分数:', testRow['语文分数'], '→', convertToScore(testRow['语文分数']));
  console.log('语文等级:', testRow['语文等级'], '→', convertToScore(testRow['语文等级']));

  console.log('\n📈 等级转换映射表测试:');
  Object.entries(GRADE_TO_SCORE_MAP).forEach(([grade, score]) => {
    console.log(`${grade} → ${score}`);
  });

  console.log('\n✅ 所有测试完成!');
  console.log('\n🚀 建议下一步:');
  console.log('1. 确认数据类型转换逻辑正确');
  console.log('2. 测试ImportProcessor修复后的插入逻辑');
  console.log('3. 进行端到端导入测试');

} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.log('\n📝 可能的原因:');
  console.log('1. CSV文件路径不正确');
  console.log('2. CSV文件格式问题'); 
  console.log('3. TypeScript模块导入问题');
}