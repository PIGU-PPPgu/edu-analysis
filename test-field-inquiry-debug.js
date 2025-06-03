const fs = require('fs');
const { intelligentFileParser } = require('./src/services/intelligentFileParser.ts');

console.log('=== 字段询问功能测试 ===');

// 读取测试文件
const csvContent = fs.readFileSync('./test-field-inquiry-trigger.csv', 'utf8');
console.log('CSV内容:');
console.log(csvContent);

// 模拟文件对象
const mockFile = {
  name: 'test-field-inquiry-trigger.csv',
  type: 'text/csv',
  size: csvContent.length
};

// 手动解析CSV
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');
const dataRows = lines.slice(1).map(line => {
  const values = line.split(',');
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || '';
  });
  return row;
});

console.log('解析后的表头:', headers);
console.log('数据行数:', dataRows.length);

// 模拟智能解析的字段映射部分
const parser = new intelligentFileParser.constructor();

// 检查字段映射
const mappings = parser.generateFieldMappings(headers, dataRows, 'wide');
console.log('字段映射结果:', mappings);

// 检测科目
const detectedSubjects = parser.detectSubjects(headers, dataRows);
console.log('检测到的科目:', detectedSubjects);

// 识别未知字段
const unknownFields = parser.identifyUnknownFields(headers, dataRows, mappings);
console.log('未知字段:', unknownFields);

// 计算置信度
const confidence = parser.calculateConfidence(mappings, detectedSubjects, 'wide');
console.log('置信度:', confidence);

// 判断是否需要字段询问
const needsFieldInquiry = confidence < 0.6 && unknownFields.length > 0;
const autoProcessed = confidence >= 0.8;

console.log('是否需要字段询问:', needsFieldInquiry ? '是' : '否');
console.log('是否自动处理:', autoProcessed ? '是' : '否');

if (needsFieldInquiry) {
  console.log('✅ 应该启动字段询问对话框');
} else if (autoProcessed) {
  console.log('✅ 应该自动跳过字段映射步骤');
} else {
  console.log('⚠️ 需要手动字段映射');
} 