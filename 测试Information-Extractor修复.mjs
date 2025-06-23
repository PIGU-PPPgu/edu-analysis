 #!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// 测试Information Extractor修复
async function testInformationExtractorFix() {
  console.log('🧪 测试Information Extractor修复...\n');

  // 创建测试CSV数据
  const testCsvData = `学号,姓名,班级,语文,数学,英语,物理,化学,总分
108110907001,张三,初三1班,85,92,78,88,90,433
108110907002,李四,初三1班,90,88,85,92,87,442
108110907003,王五,初三2班,78,85,90,85,88,426`;

  // 将CSV转换为base64
  const csvBase64 = Buffer.from(testCsvData).toString('base64');

  // 构造测试请求数据
  const testData = {
    examTitle: "期中考试",
    examType: "期中考试", 
    examDate: "2024-11-15",
    examScope: "grade",
    file: csvBase64
  };

  try {
    console.log('📤 发送测试请求...');
    console.log('考试信息:', {
      examTitle: testData.examTitle,
      examType: testData.examType,
      examDate: testData.examDate,
      examScope: testData.examScope
    });
    console.log('文件大小:', testCsvData.length, 'characters');

    const response = await fetch('http://localhost:5678/webhook/csv-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('\n📥 响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.text();
      console.log('✅ 响应内容:');
      console.log(result);
      
      // 尝试解析JSON响应
      try {
        const jsonResult = JSON.parse(result);
        console.log('\n📊 解析后的结果:');
        console.log(JSON.stringify(jsonResult, null, 2));
      } catch (parseError) {
        console.log('\n📝 响应为纯文本格式');
      }
      
      console.log('\n✅ 测试成功！Information Extractor应该能正常处理文本数据');
    } else {
      const errorText = await response.text();
      console.log('❌ 请求失败:');
      console.log(errorText);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 请确保n8n服务正在运行 (http://localhost:5678)');
    }
  }
}

// 运行测试
testInformationExtractorFix(); 