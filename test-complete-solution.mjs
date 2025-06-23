#!/usr/bin/env node

// 测试完整解决方案 - 验证数据是否真的保存到数据库
import fs from 'fs';

console.log('🧪 测试完整解决方案');

// 读取真实的CSV文件
const csvFilePath = './test-real-csv.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error('❌ CSV文件不存在:', csvFilePath);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
console.log('📄 CSV文件内容:');
console.log(csvContent);

// 转换为base64
const base64Data = Buffer.from(csvContent).toString('base64');

// 构造测试数据
const testData = {
  examTitle: '完整解决方案测试',
  examType: '测试考试',
  examDate: '2024-06-16',
  examScope: 'class',
  file: base64Data
};

console.log('\n🎯 测试信息:');
console.log('- 考试标题:', testData.examTitle);
console.log('- 考试类型:', testData.examType);
console.log('- 考试日期:', testData.examDate);
console.log('- 文件大小:', csvContent.length, '字符');

// 发送测试请求
const webhookUrl = 'http://localhost:5678/webhook/csv-upload';

try {
  console.log('\n🚀 发送测试请求到:', webhookUrl);
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData)
  });
  
  console.log('📊 响应状态:', response.status, response.statusText);
  
  const responseText = await response.text();
  console.log('📄 响应内容:');
  console.log(responseText);
  
  // 保存响应到文件
  fs.writeFileSync('test-complete-response.json', responseText);
  console.log('💾 响应已保存到 test-complete-response.json');
  
  // 等待一下，然后检查数据库
  console.log('\n⏳ 等待3秒后检查数据库...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 检查数据库
  await checkDatabase();
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
}

async function checkDatabase() {
  try {
    console.log('\n🔍 检查数据库中的数据...');
    
    // 导入Supabase客户端
    const { createClient } = await import('@supabase/supabase-js');
    
    const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 查询今天的测试数据
    const { data: testData, error } = await supabase
      .from('grade_data')
      .select('*')
      .eq('exam_title', '完整解决方案测试')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ 查询失败:', error);
      return;
    }
    
    if (testData && testData.length > 0) {
      console.log('✅ 找到测试数据!');
      console.log('📊 数据条数:', testData.length);
      console.log('📄 第一条记录:');
      console.log(JSON.stringify(testData[0], null, 2));
      
      console.log('\n🎉 完整解决方案测试成功！');
      console.log('- ✅ CSV文件正确解析');
      console.log('- ✅ 数据成功保存到数据库');
      console.log('- ✅ Supabase节点问题已解决');
      
    } else {
      console.log('❌ 没有找到测试数据');
      console.log('可能的原因:');
      console.log('1. Code节点代码没有正确更新');
      console.log('2. Supabase API调用失败');
      console.log('3. 数据保存时出现错误');
    }
    
  } catch (error) {
    console.error('❌ 检查数据库失败:', error.message);
  }
} 