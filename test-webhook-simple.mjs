// 简单的webhook测试脚本
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const webhookUrl = 'http://localhost:5678/webhook/csv-upload';
const testFile = '907九下月考成绩.csv';

console.log('🧪 开始简单webhook测试...\n');

async function testWebhook() {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(testFile)) {
      console.error(`❌ 测试文件不存在: ${testFile}`);
      return;
    }

    console.log(`📤 发送文件到webhook: ${testFile}`);
    
    // 创建FormData
    const form = new FormData();
    const fileStream = fs.createReadStream(testFile);
    
    form.append('file', fileStream, {
      filename: testFile,
      contentType: 'text/csv'
    });
    
    // 添加测试参数
    form.append('examTitle', '907九下月考成绩测试');
    form.append('examType', '月考');
    form.append('examDate', '2024-05-14');
    
    console.log(`📋 文件大小: ${fs.statSync(testFile).size} bytes`);
    
    // 发送请求
    const startTime = Date.now();
    const response = await axios.post(webhookUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Webhook响应成功 (耗时: ${duration}ms)`);
    console.log(`📊 状态码: ${response.status}`);
    console.log(`📄 响应头:`, response.headers);
    console.log(`📄 响应数据:`, response.data);
    
    // 等待一下，然后检查数据库
    console.log('\n⏳ 等待5秒后检查数据库...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查最新数据
    const checkResponse = await axios.get(
      'https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data?order=created_at.desc&limit=3',
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
        }
      }
    );
    
    console.log('\n🗄️ 最新数据库记录:');
    checkResponse.data.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.name} (${record.class_name}) - ${record.subject}: ${record.score} (${record.created_at})`);
    });
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   响应数据:`, error.response.data);
    }
  }
}

testWebhook(); 