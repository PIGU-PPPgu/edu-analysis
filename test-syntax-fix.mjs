#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// 测试语法错误修复
async function testSyntaxFix() {
  console.log('🧪 测试语法错误修复...\n');

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

    const response = await fetch('http://localhost:5678/webhook/csv-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📥 响应状态:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ 测试成功！');
      console.log('响应内容:', result);
      
      // 检查响应是否包含成功信息
      if (result.includes('成功') || result.includes('success') || response.status === 200) {
        console.log('🎉 语法错误修复验证成功！');
      } else {
        console.log('⚠️ 响应成功但内容可能有问题');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ 测试失败');
      console.log('错误响应:', errorText);
      
      // 检查是否还有语法错误
      if (errorText.includes('SyntaxError') || errorText.includes('already been declared')) {
        console.log('🚨 仍然存在语法错误，需要进一步修复');
      }
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

// 运行测试
testSyntaxFix().catch(console.error); 