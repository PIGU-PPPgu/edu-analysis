#!/usr/bin/env node

// 测试真实CSV文件上传到n8n工作流
import fs from 'fs';

console.log('🧪 测试真实CSV文件上传');

// 读取真实的CSV文件
const csvFilePath = './test-real-csv.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error('❌ CSV文件不存在:', csvFilePath);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
console.log('📄 CSV文件内容:');
console.log(csvContent);
console.log('\n📊 文件信息:');
console.log('- 文件大小:', csvContent.length, '字符');
console.log('- 行数:', csvContent.split('\n').length);

// 转换为base64
const base64Data = Buffer.from(csvContent).toString('base64');

// 构造测试数据
const testData = {
  examTitle: '期中考试',
  examType: '期中考试',
  examDate: '2024-06-15',
  examScope: 'class',
  file: base64Data
};

console.log('\n🎯 考试信息:');
console.log('- 考试标题:', testData.examTitle);
console.log('- 考试类型:', testData.examType);
console.log('- 考试日期:', testData.examDate);
console.log('- 考试范围:', testData.examScope);

// 发送测试请求
const webhookUrl = 'http://localhost:5678/webhook/csv-upload';

try {
  console.log('\n🚀 发送请求到:', webhookUrl);
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData)
  });

  console.log('📡 响应状态:', response.status, response.statusText);
  
  if (response.ok) {
    const result = await response.text();
    console.log('✅ 响应内容:');
    console.log(result);
    
    // 保存响应到文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const responseFile = `test-response-${timestamp}.json`;
    fs.writeFileSync(responseFile, result);
    console.log('\n💾 响应已保存到:', responseFile);
    
    // 尝试解析JSON响应
    try {
      const jsonResult = JSON.parse(result);
      console.log('\n📊 解析后的响应:');
      console.log(JSON.stringify(jsonResult, null, 2));
    } catch (parseError) {
      console.log('\n📝 响应是纯文本格式');
    }
    
  } else {
    const errorText = await response.text();
    console.log('❌ 错误响应:');
    console.log(errorText);
    
    // 保存错误响应
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorFile = `test-error-${timestamp}.txt`;
    fs.writeFileSync(errorFile, errorText);
    console.log('\n💾 错误响应已保存到:', errorFile);
  }
  
} catch (error) {
  console.error('❌ 请求失败:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('\n💡 提示：');
    console.log('1. 请确保n8n服务正在运行: http://localhost:5678');
    console.log('2. 检查工作流ID是否正确: FppT8sCsSxcUnNnj');
    console.log('3. 确认webhook URL是否正确');
  }
}

console.log('\n📋 测试完成！');
console.log('如果成功，数据应该已经保存到Supabase数据库中。'); 