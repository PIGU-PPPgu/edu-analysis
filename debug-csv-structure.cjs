const fs = require('fs');

console.log('🔍 分析907九下月考成绩.csv文件结构...\n');

// 读取CSV文件
const csvContent = fs.readFileSync('./907九下月考成绩.csv', 'utf8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

console.log('📋 CSV文件基本信息:');
console.log(`总行数: ${lines.length} (包含表头)`);
console.log(`学生数量: ${lines.length - 1}`);
console.log(`字段数量: ${headers.length}`);

console.log('\n📊 字段列表:');
headers.forEach((header, index) => {
  console.log(`${index + 1}. ${header}`);
});

console.log('\n🎯 分析字段类型:');

// 分析字段类型
const fieldTypes = {
  student_info: [],
  score_fields: [],
  rank_fields: [],
  other_fields: []
};

headers.forEach(header => {
  if (header === '姓名' || header === '班级') {
    fieldTypes.student_info.push(header);
  } else if (header.includes('分数')) {
    fieldTypes.score_fields.push(header);
  } else if (header.includes('等级') || header.includes('班名') || header.includes('校名') || header.includes('级名')) {
    fieldTypes.rank_fields.push(header);
  } else {
    fieldTypes.other_fields.push(header);
  }
});

console.log('学生信息字段:', fieldTypes.student_info);
console.log('分数字段:', fieldTypes.score_fields);
console.log('排名/等级字段:', fieldTypes.rank_fields);
console.log('其他字段:', fieldTypes.other_fields);

console.log('\n📈 分数字段详细分析:');
fieldTypes.score_fields.forEach(field => {
  const subject = field.replace('分数', '');
  console.log(`科目: ${subject} -> 字段: ${field}`);
});

console.log('\n🧪 数据样本分析:');
if (lines.length > 1) {
  const sampleData = lines[1].split(',');
  console.log('第一个学生数据:');
  headers.forEach((header, index) => {
    if (fieldTypes.student_info.includes(header) || fieldTypes.score_fields.includes(header)) {
      console.log(`  ${header}: ${sampleData[index]}`);
    }
  });
}

console.log('\n⚠️ 潜在问题分析:');

// 检查是否有学号字段
const hasStudentId = headers.some(h => h.includes('学号') || h.includes('学生号'));
console.log(`1. 学号字段: ${hasStudentId ? '✅ 存在' : '❌ 缺失 - 需要生成虚拟学号'}`);

// 检查分数字段格式
const scoreFieldFormat = fieldTypes.score_fields[0];
console.log(`2. 分数字段格式: "${scoreFieldFormat}" - 需要特殊处理`);

// 检查冗余字段
const redundantFields = fieldTypes.rank_fields.length;
console.log(`3. 冗余字段数量: ${redundantFields} - 可能影响解析性能`);

console.log('\n🔧 建议的字段映射:');
console.log('学生信息映射:');
console.log('  姓名 -> name');
console.log('  班级 -> class_name');
console.log('  (自动生成) -> student_id');

console.log('\n科目分数映射:');
fieldTypes.score_fields.forEach(field => {
  const subject = field.replace('分数', '');
  console.log(`  ${field} -> subject: "${subject}", score: [对应分数值]`);
});

console.log('\n💡 数据转换策略:');
console.log('1. 宽表转长表: 每个学生的每个科目创建一条记录');
console.log('2. 虚拟学号生成: AUTO_0001, AUTO_0002, ...');
console.log('3. 忽略排名字段: 等级、班名、校名、级名等字段暂时忽略');
console.log('4. 分数字段提取: 从"XX分数"格式中提取科目名和分数值'); 