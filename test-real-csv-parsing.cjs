const fs = require('fs');

console.log('🧪 测试真实CSV文件的智能解析...\n');

// 读取CSV文件
const csvContent = fs.readFileSync('./907九下月考成绩.csv', 'utf8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

// 模拟智能解析的字段映射逻辑
function simulateFieldMapping() {
  console.log('📋 模拟字段映射过程...');
  
  const mappings = {};
  const detectedSubjects = [];
  
  // 模拟现有的字段识别逻辑
  headers.forEach(header => {
    const cleanHeader = header.trim();
    
    // 学生信息字段
    if (cleanHeader === '姓名') {
      mappings[cleanHeader] = 'name';
    } else if (cleanHeader === '班级') {
      mappings[cleanHeader] = 'class_name';
    }
    // 分数字段 - 这里可能有问题
    else if (cleanHeader.includes('分数')) {
      const subject = cleanHeader.replace('分数', '');
      mappings[cleanHeader] = `${subject}_score`;
      detectedSubjects.push(subject);
    }
  });
  
  console.log('检测到的字段映射:', mappings);
  console.log('检测到的科目:', detectedSubjects);
  
  return { mappings, detectedSubjects };
}

// 模拟宽表到长表转换
function simulateWideToLongConversion() {
  console.log('\n📊 模拟宽表到长表转换...');
  
  const { mappings, detectedSubjects } = simulateFieldMapping();
  
  // 取第一个学生数据进行测试
  const sampleRow = lines[1].split(',');
  const studentData = {};
  
  headers.forEach((header, index) => {
    studentData[header.trim()] = sampleRow[index];
  });
  
  console.log('原始学生数据:', {
    姓名: studentData['姓名'],
    班级: studentData['班级'],
    总分分数: studentData['总分分数'],
    语文分数: studentData['语文分数'],
    数学分数: studentData['数学分数']
  });
  
  // 转换为长表格式
  const longTableRecords = [];
  
  detectedSubjects.forEach(subject => {
    const scoreField = `${subject}分数`;
    const score = studentData[scoreField];
    
    if (score && score.trim() !== '') {
      const record = {
        student_id: 'AUTO_0001', // 虚拟学号
        name: studentData['姓名'],
        class_name: studentData['班级'],
        subject: subject,
        score: parseFloat(score) || 0
      };
      longTableRecords.push(record);
    }
  });
  
  console.log('转换后的长表记录:');
  longTableRecords.forEach((record, index) => {
    console.log(`${index + 1}. ${record.subject}: ${record.score}分`);
  });
  
  return longTableRecords;
}

// 模拟置信度计算
function simulateConfidenceCalculation() {
  console.log('\n🎯 模拟置信度计算...');
  
  const { mappings, detectedSubjects } = simulateFieldMapping();
  
  let confidence = 0;
  
  // 学生身份字段权重 (0.3)
  const hasName = mappings['姓名'] === 'name';
  const hasClass = mappings['班级'] === 'class_name';
  const studentFieldScore = (hasName ? 0.15 : 0) + (hasClass ? 0.15 : 0);
  
  // 分数字段权重 (0.4)
  const scoreFieldCount = detectedSubjects.length;
  const scoreFieldScore = Math.min(scoreFieldCount * 0.05, 0.4);
  
  // 数据完整性权重 (0.3)
  const dataCompletenessScore = 0.3; // 假设数据完整
  
  confidence = studentFieldScore + scoreFieldScore + dataCompletenessScore;
  
  console.log('置信度计算详情:');
  console.log(`  学生字段得分: ${studentFieldScore} (姓名:${hasName}, 班级:${hasClass})`);
  console.log(`  分数字段得分: ${scoreFieldScore} (检测到${scoreFieldCount}个科目)`);
  console.log(`  数据完整性得分: ${dataCompletenessScore}`);
  console.log(`  总置信度: ${confidence.toFixed(2)}`);
  
  return confidence;
}

// 运行测试
const { mappings, detectedSubjects } = simulateFieldMapping();
const longTableRecords = simulateWideToLongConversion();
const confidence = simulateConfidenceCalculation();

console.log('\n📝 测试结果总结:');
console.log(`✅ 字段映射: ${Object.keys(mappings).length} 个字段被映射`);
console.log(`✅ 科目检测: ${detectedSubjects.length} 个科目`);
console.log(`✅ 数据转换: ${longTableRecords.length} 条长表记录`);
console.log(`✅ 置信度: ${confidence.toFixed(2)} ${confidence >= 0.8 ? '(高置信度)' : '(需要人工确认)'}`);

console.log('\n⚠️ 潜在问题:');
if (detectedSubjects.length === 0) {
  console.log('❌ 没有检测到任何科目分数字段');
}
if (longTableRecords.length === 0) {
  console.log('❌ 宽表到长表转换失败');
}
if (confidence < 0.6) {
  console.log('❌ 置信度过低，需要人工干预');
} 