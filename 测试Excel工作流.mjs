#!/usr/bin/env node

/**
 * 测试n8n Excel工作流
 * 测试Excel和CSV文件上传处理功能
 */

import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/csv-upload';

console.log('🧪 测试n8n Excel工作流');
console.log('================================');

// 测试用例
const testCases = [
  {
    name: 'CSV文件测试',
    file: '907九下月考成绩.csv',
    examInfo: {
      examTitle: 'Excel工作流测试-CSV',
      examType: '月考',
      examDate: '2025-01-22',
      examScope: 'class',
      mergeStrategy: 'replace'
    }
  }
];

// 创建测试Excel文件
function createTestExcelFile() {
  const testData = `学号,姓名,班级,语文,数学,英语,物理,化学,总分
108110907001,张三,初三7班,85,90,88,82,86,431
108110907002,李四,初三7班,78,85,92,88,84,427
108110907003,王五,初三7班,92,88,85,90,89,444`;
  
  fs.writeFileSync('测试Excel数据.csv', testData, 'utf8');
  console.log('✅ 创建测试Excel文件: 测试Excel数据.csv');
  
  return {
    name: 'Excel文件测试（CSV格式）',
    file: '测试Excel数据.csv',
    examInfo: {
      examTitle: 'Excel工作流测试-新建',
      examType: '期中考试',
      examDate: '2025-01-22',
      examScope: 'grade',
      mergeStrategy: 'update'
    }
  };
}

async function testWorkflow(testCase) {
  console.log(`\n📋 测试: ${testCase.name}`);
  console.log('--------------------------------');
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(testCase.file)) {
      throw new Error(`文件不存在: ${testCase.file}`);
    }
    
    const fileStats = fs.statSync(testCase.file);
    console.log(`📁 文件大小: ${fileStats.size} 字节`);
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testCase.file));
    
    // 添加考试信息
    Object.entries(testCase.examInfo).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    console.log('📤 发送请求到n8n工作流...');
    console.log(`URL: ${N8N_WEBHOOK_URL}`);
    console.log('考试信息:', testCase.examInfo);
    
    // 发送请求
    const startTime = Date.now();
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`⏱️  处理时间: ${processingTime}ms`);
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ 工作流执行成功');
      
      try {
        const jsonResult = JSON.parse(result);
        console.log('📋 返回结果:');
        
        if (jsonResult._metadata) {
          console.log(`   - 总处理记录: ${jsonResult._metadata.totalProcessed}`);
          console.log(`   - 成功记录: ${jsonResult._metadata.successCount}`);
          console.log(`   - 错误记录: ${jsonResult._metadata.errorCount}`);
          console.log(`   - 考试信息: ${jsonResult._metadata.examInfo.examTitle}`);
        } else if (Array.isArray(jsonResult)) {
          console.log(`   - 返回记录数: ${jsonResult.length}`);
          if (jsonResult.length > 0) {
            console.log('   - 第一条记录示例:');
            console.log('    ', JSON.stringify(jsonResult[0], null, 2));
          }
        } else {
          console.log('   - 结果:', JSON.stringify(jsonResult, null, 2));
        }
      } catch (parseError) {
        console.log('📄 返回内容 (非JSON):');
        console.log(result.substring(0, 500) + (result.length > 500 ? '...' : ''));
      }
      
    } else {
      console.log('❌ 工作流执行失败');
      const errorText = await response.text();
      console.log('错误信息:', errorText);
    }
    
  } catch (error) {
    console.log('❌ 测试失败');
    console.log('错误:', error.message);
  }
}

async function runAllTests() {
  console.log('🔍 检查n8n服务状态...');
  
  try {
    const healthCheck = await fetch('http://localhost:5678');
    if (healthCheck.ok) {
      console.log('✅ n8n服务正常运行');
    } else {
      console.log('⚠️  n8n服务状态异常');
    }
  } catch (error) {
    console.log('❌ 无法连接到n8n服务');
    console.log('请确保n8n正在运行: n8n start');
    return;
  }
  
  // 添加测试Excel文件
  const excelTestCase = createTestExcelFile();
  testCases.push(excelTestCase);
  
  // 运行所有测试
  for (const testCase of testCases) {
    await testWorkflow(testCase);
    
    // 测试间隔
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('\n⏳ 等待3秒后进行下一个测试...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n🎉 所有测试完成！');
  
  // 清理测试文件
  if (fs.existsSync('测试Excel数据.csv')) {
    fs.unlinkSync('测试Excel数据.csv');
    console.log('🧹 清理测试文件');
  }
}

// 运行测试
runAllTests().catch(console.error); 