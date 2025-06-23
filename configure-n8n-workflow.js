#!/usr/bin/env node

/**
 * n8n工作流节点配置脚本
 * 逐个配置每个节点以避免API限制
 */

import fetch from 'node-fetch';
import fs from 'fs';

const N8N_BASE_URL = 'http://localhost:5678';
const WORKFLOW_ID = 'TX3mvXbjU0z6PdDm';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5ODg3NDc2LCJleHAiOjE3NTI0NjU2MDB9.hsRUMthJk6MGh4tSuGChUorBbvQY75IBOKa9wNNsOng';

console.log('⚙️  n8n工作流节点配置脚本');
console.log('=====================================');

const headers = {
  'Content-Type': 'application/json',
  'X-N8N-API-KEY': API_KEY
};

async function getWorkflow() {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      headers
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      console.log('❌ 无法获取工作流');
      return null;
    }
  } catch (error) {
    console.log('❌ 获取工作流失败:', error.message);
    return null;
  }
}

async function updateWorkflow(workflow) {
  try {
    // 只保留必要的字段
    const cleanWorkflow = {
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      active: false,
      settings: workflow.settings || {},
      staticData: workflow.staticData || {}
    };
    
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(cleanWorkflow)
    });
    
    if (response.ok) {
      console.log('✅ 工作流更新成功');
      return true;
    } else {
      const error = await response.text();
      console.log('❌ 工作流更新失败:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ 更新工作流时出错:', error.message);
    return false;
  }
}

async function configureNodes() {
  console.log('📋 开始配置节点...');
  
  const workflow = await getWorkflow();
  if (!workflow) {
    return false;
  }
  
  console.log(`📊 当前工作流有 ${workflow.nodes.length} 个节点`);
  
  // 读取验证的JavaScript代码
  let jsCode = '';
  try {
    jsCode = fs.readFileSync('./n8n-workflow-code.js', 'utf8');
    console.log('✅ 成功读取验证的JavaScript代码');
  } catch (error) {
    console.log('⚠️  使用默认代码');
    jsCode = `
// 智能CSV解析和字段映射
const csvData = $input.first().json.body;

// 字段映射配置
const fieldMapping = {
  '学号': 'student_id',
  '姓名': 'name',
  '班级': 'class_name',
  '数学': 'math',
  '语文': 'chinese',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
  '政治': 'politics',
  '历史': 'history',
  '生物': 'biology',
  '地理': 'geography'
};

// 解析CSV数据
const lines = csvData.split('\\n').filter(line => line.trim());
const headers = lines[0].split(',');
const processedData = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const record = {};
  
  headers.forEach((header, index) => {
    const cleanHeader = header.trim();
    const mappedField = fieldMapping[cleanHeader] || cleanHeader;
    record[mappedField] = values[index]?.trim();
  });
  
  processedData.push(record);
}

console.log('处理的数据:', processedData);
return { processedData };
    `;
  }
  
  // 配置每个节点
  let updated = false;
  
  workflow.nodes.forEach(node => {
    console.log(`🔧 配置节点: ${node.name} (${node.type})`);
    
    switch (node.type) {
      case 'n8n-nodes-base.webhook':
        node.parameters = {
          ...node.parameters,
          httpMethod: 'POST',
          path: 'parse-csv',
          responseMode: 'responseNode'
        };
        console.log('   ✅ Webhook节点配置完成');
        updated = true;
        break;
        
      case 'n8n-nodes-base.code':
        node.parameters = {
          ...node.parameters,
          jsCode: jsCode
        };
        console.log('   ✅ Code节点配置完成');
        updated = true;
        break;
        
      case 'n8n-nodes-base.supabase':
        node.parameters = {
          ...node.parameters,
          operation: 'insert',
          table: 'grade_data',
          data: '={{ $json.processedData }}'
        };
        console.log('   ✅ Supabase节点配置完成');
        updated = true;
        break;
        
      case 'n8n-nodes-base.respondToWebhook':
        node.parameters = {
          ...node.parameters,
          respondWith: 'json',
          responseBody: '={{ { success: true, processed: $json.processedData.length || 0 } }}'
        };
        console.log('   ✅ Respond to Webhook节点配置完成');
        updated = true;
        break;
        
      case '@n8n/n8n-nodes-langchain.informationExtractor':
        // 暂时禁用AI节点，因为它需要额外的配置
        console.log('   ⚠️  AI Information Extractor节点需要手动配置');
        break;
        
      case 'n8n-nodes-base.set':
        node.parameters = {
          ...node.parameters,
          options: {},
          values: {}
        };
        console.log('   ✅ Edit Fields节点配置完成');
        updated = true;
        break;
        
      default:
        console.log(`   ⏭️  跳过节点: ${node.type}`);
    }
  });
  
  if (updated) {
    return await updateWorkflow(workflow);
  } else {
    console.log('⚠️  没有需要更新的节点');
    return true;
  }
}

async function activateWorkflow() {
  try {
    console.log('🚀 尝试激活工作流...');
    
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/activate`, {
      method: 'POST',
      headers
    });
    
    if (response.ok) {
      console.log('✅ 工作流激活成功！');
      return true;
    } else {
      const error = await response.text();
      console.log('❌ 工作流激活失败:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ 激活工作流时出错:', error.message);
    return false;
  }
}

async function testWorkflow() {
  try {
    console.log('\n🧪 测试工作流...');
    
    const testData = `学号,姓名,班级,数学,语文
TEST001,测试学生1,测试班级,85,90
TEST002,测试学生2,测试班级,92,87`;
    
    const response = await fetch(`${N8N_BASE_URL}/webhook/parse-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: testData
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 工作流测试成功！');
      console.log('📊 测试结果:', JSON.stringify(result, null, 2));
      return true;
    } else {
      const error = await response.text();
      console.log('❌ 工作流测试失败:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ 测试工作流时出错:', error.message);
    return false;
  }
}

async function main() {
  console.log('开始配置n8n工作流节点...\n');
  
  // 1. 配置节点
  const configured = await configureNodes();
  
  if (configured) {
    console.log('\n✅ 节点配置完成');
    
    // 2. 尝试激活工作流
    const activated = await activateWorkflow();
    
    if (activated) {
      // 3. 测试工作流
      await testWorkflow();
      
      console.log('\n🎉 工作流配置和测试完成！');
      console.log('=====================================');
      console.log('✅ 工作流已成功配置并激活');
      console.log('🔗 Webhook URL: http://localhost:5678/webhook/parse-csv');
      console.log('📝 使用POST方法发送CSV数据进行测试');
    } else {
      console.log('\n⚠️  工作流配置完成但激活失败');
      console.log('请检查节点配置或手动激活');
    }
  } else {
    console.log('\n❌ 节点配置失败');
    console.log('请参考手动配置文档');
  }
  
  console.log('\n📚 相关文档:');
  console.log('- n8n-问题诊断与解决方案.md');
  console.log('- n8n-integration-test-plan.md');
  console.log('- n8n-最终解决方案总结.md');
}

// 运行主函数
main().catch(console.error); 