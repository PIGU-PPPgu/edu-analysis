// n8n工作流完整测试脚本 (ES模块版本)
// 测试CSV文件上传和数据处理流程

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

// 配置信息
const config = {
  n8n: {
    baseUrl: 'http://localhost:5678',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTQ0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag',
    workflowId: 'FppT8sCsSxcUnNnj',
    webhookUrl: 'http://localhost:5678/webhook/csv-upload'
  },
  supabase: {
    url: 'https://giluhqotfjpmofowvogn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
  }
};

// 测试文件路径
const testFiles = [
  '907九下月考成绩.csv',
  'test_grades.csv'
];

console.log('🚀 开始n8n工作流完整测试...\n');

// 1. 检查n8n服务状态
async function checkN8nStatus() {
  try {
    console.log('📡 检查n8n服务状态...');
    const response = await axios.get(`${config.n8n.baseUrl}/healthz`);
    console.log('✅ n8n服务正常运行');
    return true;
  } catch (error) {
    console.error('❌ n8n服务不可用:', error.message);
    return false;
  }
}

// 2. 检查工作流状态
async function checkWorkflowStatus() {
  try {
    console.log('🔍 检查工作流状态...');
    const response = await axios.get(
      `${config.n8n.baseUrl}/api/v1/workflows/${config.n8n.workflowId}`,
      {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey
        }
      }
    );
    
    const workflow = response.data;
    console.log(`✅ 工作流状态: ${workflow.active ? '激活' : '未激活'}`);
    console.log(`📊 节点数量: ${workflow.nodes.length}`);
    
    // 显示节点信息
    workflow.nodes.forEach((node, index) => {
      console.log(`   ${index + 1}. ${node.name} (${node.type})`);
    });
    
    return workflow.active;
  } catch (error) {
    console.error('❌ 获取工作流状态失败:', error.message);
    return false;
  }
}

// 3. 测试文件上传
async function testFileUpload(filePath) {
  try {
    console.log(`\n📤 测试文件上传: ${filePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`);
      return false;
    }
    
    // 创建FormData
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    
    form.append('file', fileStream, {
      filename: fileName,
      contentType: fileName.endsWith('.csv') ? 'text/csv' : 'application/vnd.ms-excel'
    });
    
    // 添加额外参数
    form.append('examTitle', '907九下月考成绩');
    form.append('examType', '月考');
    form.append('examDate', '2024-05-14');
    
    console.log(`📋 文件信息:`);
    console.log(`   文件名: ${fileName}`);
    console.log(`   文件大小: ${fs.statSync(filePath).size} bytes`);
    
    // 发送请求
    const startTime = Date.now();
    const response = await axios.post(config.n8n.webhookUrl, form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60秒超时
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 文件上传成功 (耗时: ${duration}ms)`);
    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📄 响应数据:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ 文件上传失败:`, error.message);
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   响应数据:`, error.response.data);
    }
    return false;
  }
}

// 4. 检查Supabase数据
async function checkSupabaseData() {
  try {
    console.log('\n🗄️ 检查Supabase数据...');
    
    // 检查最新的考试数据
    const examResponse = await axios.get(
      `${config.supabase.url}/rest/v1/exams?order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`
        }
      }
    );
    
    console.log(`📊 最新考试记录 (${examResponse.data.length}条):`);
    examResponse.data.forEach((exam, index) => {
      console.log(`   ${index + 1}. ${exam.title} (${exam.type}) - ${exam.date}`);
    });
    
    // 检查最新的成绩数据
    const gradeResponse = await axios.get(
      `${config.supabase.url}/rest/v1/grade_data?order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`
        }
      }
    );
    
    console.log(`📈 最新成绩记录 (${gradeResponse.data.length}条):`);
    gradeResponse.data.forEach((grade, index) => {
      console.log(`   ${index + 1}. ${grade.name} (${grade.class_name}) - ${grade.subject}: ${grade.score}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ 检查Supabase数据失败:', error.message);
    return false;
  }
}

// 5. 获取工作流执行历史
async function getWorkflowExecutions() {
  try {
    console.log('\n📜 获取工作流执行历史...');
    
    const response = await axios.get(
      `${config.n8n.baseUrl}/api/v1/executions?workflowId=${config.n8n.workflowId}&limit=5`,
      {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey
        }
      }
    );
    
    const executions = response.data.data;
    console.log(`📊 最近执行记录 (${executions.length}条):`);
    
    executions.forEach((execution, index) => {
      const status = execution.finished ? '✅ 成功' : execution.stoppedAt ? '❌ 失败' : '⏳ 运行中';
      const startTime = new Date(execution.startedAt).toLocaleString();
      console.log(`   ${index + 1}. ${status} - ${startTime}`);
      
      if (execution.finished && execution.data) {
        console.log(`      处理节点: ${Object.keys(execution.data.resultData.runData).join(', ')}`);
      }
    });
    
    return executions;
    
  } catch (error) {
    console.error('❌ 获取执行历史失败:', error.message);
    return [];
  }
}

// 主测试函数
async function runCompleteTest() {
  console.log('🎯 n8n工作流完整测试开始\n');
  console.log('=' .repeat(50));
  
  // 步骤1: 检查服务状态
  const n8nStatus = await checkN8nStatus();
  if (!n8nStatus) {
    console.log('\n❌ 测试终止: n8n服务不可用');
    return;
  }
  
  // 步骤2: 检查工作流状态
  const workflowActive = await checkWorkflowStatus();
  if (!workflowActive) {
    console.log('\n⚠️ 警告: 工作流未激活，但继续测试...');
  }
  
  // 步骤3: 测试文件上传
  let uploadSuccess = false;
  for (const filePath of testFiles) {
    if (fs.existsSync(filePath)) {
      const result = await testFileUpload(filePath);
      if (result) {
        uploadSuccess = true;
        break; // 成功上传一个文件就够了
      }
    } else {
      console.log(`⚠️ 跳过不存在的文件: ${filePath}`);
    }
  }
  
  if (!uploadSuccess) {
    console.log('\n❌ 测试终止: 所有文件上传都失败');
    return;
  }
  
  // 步骤4: 等待处理完成
  console.log('\n⏳ 等待工作流处理完成...');
  await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
  
  // 步骤5: 检查执行历史
  await getWorkflowExecutions();
  
  // 步骤6: 检查数据库结果
  await checkSupabaseData();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 测试完成！');
  console.log('\n📋 测试总结:');
  console.log(`✅ n8n服务: ${n8nStatus ? '正常' : '异常'}`);
  console.log(`✅ 工作流状态: ${workflowActive ? '激活' : '未激活'}`);
  console.log(`✅ 文件上传: ${uploadSuccess ? '成功' : '失败'}`);
}

// 运行测试
runCompleteTest().catch(error => {
  console.error('\n💥 测试过程中发生错误:', error);
  process.exit(1);
}); 