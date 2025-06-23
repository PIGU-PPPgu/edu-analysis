#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// 测试Information Extractor修复
async function testInformationExtractorFix() {
  console.log('🧪 测试Information Extractor修复');

  // 创建测试CSV数据
  const testCsvData = `学号,姓名,班级,语文,数学,英语,总分
108110907001,张三,初三7班,85,90,88,263
108110907002,李四,初三7班,78,85,82,245
108110907003,王五,初三7班,92,88,90,270`;

  // 转换为base64
  const base64Data = Buffer.from(testCsvData).toString('base64');

  // 构造测试数据
  const testData = {
    examTitle: '期中考试',
    examType: '期中考试',
    examDate: '2024-06-15',
    file: base64Data
  };

  console.log('📊 测试数据准备完成');
  console.log('- 考试标题:', testData.examTitle);
  console.log('- 考试类型:', testData.examType);
  console.log('- 考试日期:', testData.examDate);
  console.log('- 文件大小:', testCsvData.length, '字符');

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

    console.log('📡 响应状态:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ 响应内容:', result);
      
      // 保存响应到文件
      fs.writeFileSync('test-response.json', result);
      console.log('💾 响应已保存到 test-response.json');
      
    } else {
      const errorText = await response.text();
      console.log('❌ 错误响应:', errorText);
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示：请确保n8n服务正在运行 (http://localhost:5678)');
    }
  }

  console.log('\n📋 下一步操作：');
  console.log('1. 如果仍然出错，请使用方案2（绕过Information Extractor）');
  console.log('2. 检查n8n工作流的执行日志');
  console.log('3. 确认Code节点代码已正确更新');
}

// 运行测试
testInformationExtractorFix(); 