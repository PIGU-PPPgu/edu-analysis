// n8n Information Extractor 配置测试脚本
// 用于验证AI数据提取和Supabase对接是否正常工作

const axios = require('axios');
const fs = require('fs');

// 配置信息
const config = {
  n8n: {
    baseUrl: 'http://localhost:5678',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag',
    workflowId: 'FppT8sCsSxcUnNnj'
  },
  webhook: {
    url: 'http://localhost:5678/webhook/csv-upload'
  }
};

// 测试数据
const testCsvData = `学号,姓名,班级,语文,数学,英语,物理,化学,总分,班级排名
108110907001,张三,初三7班,85,90,88,78,82,423,5
108110907002,李四,初三7班,92,87,91,85,88,443,3
108110907003,王五,初三7班,78,85,82,75,79,399,8
108110907004,赵六,初三7班,95,93,89,88,91,456,1`;

// 1. 检查工作流状态
async function checkWorkflowStatus() {
  try {
    console.log('🔍 检查工作流状态...');
    
    const response = await axios.get(
      `${config.n8n.baseUrl}/api/v1/workflows/${config.n8n.workflowId}`,
      {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ 工作流状态:', {
      id: response.data.id,
      name: response.data.name,
      active: response.data.active,
      nodes: response.data.nodes?.length || 0
    });

    return response.data;
  } catch (error) {
    console.error('❌ 工作流状态检查失败:', error.response?.data || error.message);
    return null;
  }
}

// 2. 激活工作流
async function activateWorkflow() {
  try {
    console.log('🚀 激活工作流...');
    
    const response = await axios.post(
      `${config.n8n.baseUrl}/api/v1/workflows/${config.n8n.workflowId}/activate`,
      {},
      {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ 工作流已激活');
    return true;
  } catch (error) {
    console.error('❌ 工作流激活失败:', error.response?.data || error.message);
    return false;
  }
}

// 3. 测试Webhook端点
async function testWebhook() {
  try {
    console.log('📡 测试Webhook端点...');
    
    const response = await axios.post(
      config.webhook.url,
      {
        csv_data: testCsvData,
        filename: '测试成绩数据.csv',
        exam_info: {
          title: '907九下月考成绩测试',
          type: '月考',
          date: '2024-01-15'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      }
    );

    console.log('✅ Webhook测试成功:', {
      status: response.status,
      data: response.data
    });

    return response.data;
  } catch (error) {
    console.error('❌ Webhook测试失败:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

// 4. 检查工作流执行历史
async function checkExecutionHistory() {
  try {
    console.log('📊 检查执行历史...');
    
    const response = await axios.get(
      `${config.n8n.baseUrl}/api/v1/executions`,
      {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey,
          'Content-Type': 'application/json'
        },
        params: {
          workflowId: config.n8n.workflowId,
          limit: 5
        }
      }
    );

    console.log('✅ 最近执行记录:');
    response.data.data.forEach((execution, index) => {
      console.log(`  ${index + 1}. ${execution.id} - ${execution.finished ? '✅' : '❌'} ${execution.mode} (${new Date(execution.startedAt).toLocaleString()})`);
    });

    return response.data.data;
  } catch (error) {
    console.error('❌ 执行历史检查失败:', error.response?.data || error.message);
    return [];
  }
}

// 5. 获取执行详情
async function getExecutionDetails(executionId) {
  try {
    console.log(`🔍 获取执行详情: ${executionId}`);
    
    const response = await axios.get(
      `${config.n8n.baseUrl}/api/v1/executions/${executionId}`,
      {
        headers: {
          'X-N8N-API-KEY': config.n8n.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const execution = response.data;
    console.log('📋 执行详情:', {
      id: execution.id,
      status: execution.finished ? '完成' : '进行中',
      startTime: new Date(execution.startedAt).toLocaleString(),
      endTime: execution.stoppedAt ? new Date(execution.stoppedAt).toLocaleString() : '未完成',
      mode: execution.mode
    });

    // 检查每个节点的执行结果
    if (execution.data && execution.data.resultData) {
      console.log('🔧 节点执行结果:');
      Object.keys(execution.data.resultData.runData).forEach(nodeName => {
        const nodeData = execution.data.resultData.runData[nodeName];
        console.log(`  - ${nodeName}: ${nodeData[0]?.error ? '❌ 错误' : '✅ 成功'}`);
        
        if (nodeData[0]?.error) {
          console.log(`    错误信息: ${nodeData[0].error.message}`);
        }
      });
    }

    return execution;
  } catch (error) {
    console.error('❌ 执行详情获取失败:', error.response?.data || error.message);
    return null;
  }
}

// 6. 创建测试CSV文件
function createTestCsvFile() {
  const filename = 'test-grade-data.csv';
  fs.writeFileSync(filename, testCsvData, 'utf8');
  console.log(`📄 测试CSV文件已创建: ${filename}`);
  return filename;
}

// 7. 主测试函数
async function runTests() {
  console.log('🧪 开始n8n Information Extractor配置测试\n');

  // 1. 检查工作流状态
  const workflow = await checkWorkflowStatus();
  if (!workflow) {
    console.log('❌ 无法获取工作流信息，请检查工作流ID和API密钥');
    return;
  }

  // 2. 激活工作流（如果未激活）
  if (!workflow.active) {
    const activated = await activateWorkflow();
    if (!activated) {
      console.log('❌ 工作流激活失败，无法继续测试');
      return;
    }
  }

  // 3. 创建测试文件
  createTestCsvFile();

  // 4. 测试Webhook
  console.log('\n📡 开始Webhook测试...');
  const webhookResult = await testWebhook();
  
  if (webhookResult) {
    console.log('✅ Webhook测试成功，等待5秒后检查执行结果...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 5. 检查执行历史
    const executions = await checkExecutionHistory();
    
    if (executions.length > 0) {
      // 6. 获取最新执行的详情
      await getExecutionDetails(executions[0].id);
    }
  }

  console.log('\n🎯 测试完成！');
  console.log('\n📋 下一步操作建议:');
  console.log('1. 如果测试失败，请检查n8n工作流配置');
  console.log('2. 确认Information Extractor节点的AI模型配置');
  console.log('3. 验证Supabase连接和表结构');
  console.log('4. 查看n8n执行历史中的详细错误信息');
}

// 8. 错误处理和清理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  checkWorkflowStatus,
  activateWorkflow,
  testWebhook,
  checkExecutionHistory,
  getExecutionDetails,
  runTests
}; 