const fs = require('fs');
const path = require('path');

// 模拟测试智能解析功能
async function testIntelligentParser() {
  console.log('=== 智能解析功能测试 ===');
  
  // 读取测试文件
  const csvFile = '907九下月考成绩.csv';
  
  if (!fs.existsSync(csvFile)) {
    console.error('测试文件不存在:', csvFile);
    return;
  }
  
  const content = fs.readFileSync(csvFile, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  console.log('文件头部字段:', headers);
  console.log('数据行数:', lines.length - 1);
  
  // 模拟智能解析逻辑
  const scoreFields = headers.filter(h => 
    /分数$|成绩$|得分$/i.test(h) || 
    /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)分数$/i.test(h)
  );
  
  const nameFields = headers.filter(h => /姓名/i.test(h));
  const classFields = headers.filter(h => /班级/i.test(h));
  
  console.log('检测到的分数字段:', scoreFields);
  console.log('检测到的姓名字段:', nameFields);
  console.log('检测到的班级字段:', classFields);
  
  // 计算置信度
  let confidence = 0.2; // 基础分数
  
  if (nameFields.length > 0) confidence += 0.25;
  if (classFields.length > 0) confidence += 0.15;
  if (scoreFields.length > 0) {
    const scoreBonus = Math.min(scoreFields.length / 3, 1) * 0.3;
    confidence += scoreBonus;
  }
  
  console.log('计算的置信度:', confidence);
  console.log('是否应该自动处理:', confidence >= 0.8 ? '是' : '否');
  
  // 检查宽表格式
  const isWideFormat = scoreFields.length >= 2;
  console.log('是否为宽表格式:', isWideFormat ? '是' : '否');
  
  if (confidence >= 0.8 && isWideFormat) {
    console.log('✅ 应该自动跳过字段映射步骤');
  } else {
    console.log('❌ 需要手动字段映射');
  }
}

testIntelligentParser().catch(console.error); 