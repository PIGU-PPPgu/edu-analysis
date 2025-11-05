/**
 * 边缘案例测试数据
 * 用于测试学生重复检测和合并机制
 */

import fs from 'fs';

// 创建包含各种边缘案例的测试数据
const edgeCaseTestData = [
  // 正常数据
  {
    exam_id: 'EDGE_TEST_001',
    name: '张三',
    class_name: '初一1班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 85,
    math_score: 90,
    english_score: 88,
    total_score: 263
  },
  
  // 同名学生在不同班级（应该被识别为不同学生）
  {
    exam_id: 'EDGE_TEST_002',
    name: '张三',
    class_name: '初一2班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 78,
    math_score: 85,
    english_score: 82,
    total_score: 245
  },
  
  // 相似姓名学生（编辑距离测试）
  {
    exam_id: 'EDGE_TEST_003',
    name: '张珊',
    class_name: '初一1班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 82,
    math_score: 87,
    english_score: 85,
    total_score: 254
  },
  
  // 数据质量问题：姓名包含空格和特殊字符
  {
    exam_id: 'EDGE_TEST_004',
    name: ' 李 四@ ',
    class_name: '初一1班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 75,
    math_score: 80,
    english_score: 78,
    total_score: 233
  },
  
  // 班级名称不规范
  {
    exam_id: 'EDGE_TEST_005',
    name: '王五',
    class_name: '初一 3 班班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 88,
    math_score: 92,
    english_score: 90,
    total_score: 270
  },
  
  // 缺少必要字段（应该被过滤）
  {
    exam_id: 'EDGE_TEST_006',
    name: '',
    class_name: '初一1班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 80,
    math_score: 85,
    english_score: 82,
    total_score: 247
  },
  
  // 异常长的姓名（应该被截断）
  {
    exam_id: 'EDGE_TEST_007',
    name: '这是一个非常长的学生姓名测试数据应该被系统正确处理',
    class_name: '初一1班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 77,
    math_score: 83,
    english_score: 79,
    total_score: 239
  },
  
  // 重复学生（完全相同的姓名和班级）
  {
    exam_id: 'EDGE_TEST_008',
    name: '张三',
    class_name: '初一1班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 86,
    math_score: 91,
    english_score: 89,
    total_score: 266
  },
  
  // 包含数字和英文的姓名
  {
    exam_id: 'EDGE_TEST_009',
    name: '李明123',
    class_name: '初一2班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 83,
    math_score: 88,
    english_score: 85,
    total_score: 256
  },
  
  // 新班级（应该被自动创建）
  {
    exam_id: 'EDGE_TEST_010',
    name: '新同学',
    class_name: '初一5班',
    exam_title: '边缘案例测试',
    exam_type: '期中考试',
    exam_date: '2024-01-15',
    chinese_score: 79,
    math_score: 84,
    english_score: 81,
    total_score: 244
  }
];

// 转换为CSV格式
const csvHeader = 'exam_id,name,class_name,exam_title,exam_type,exam_date,chinese_score,math_score,english_score,total_score';
const csvData = edgeCaseTestData.map(row => 
  `${row.exam_id},${row.name},${row.class_name},${row.exam_title},${row.exam_type},${row.exam_date},${row.chinese_score},${row.math_score},${row.english_score},${row.total_score}`
).join('\n');

const csvContent = csvHeader + '\n' + csvData;

// 写入CSV文件
fs.writeFileSync('edge-case-test.csv', csvContent, 'utf-8');

console.log('✅ 边缘案例测试数据已生成: edge-case-test.csv');
console.log(`📊 包含 ${edgeCaseTestData.length} 条测试记录`);
console.log('🔍 测试案例包括:');
console.log('- 同名学生在不同班级');
console.log('- 相似姓名学生（编辑距离测试）');
console.log('- 数据质量问题（空格、特殊字符）');
console.log('- 班级名称不规范');
console.log('- 缺少必要字段');
console.log('- 异常长的姓名');
console.log('- 重复学生记录');
console.log('- 包含数字和英文的姓名');
console.log('- 新班级自动创建');