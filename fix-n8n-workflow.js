#!/usr/bin/env node

/**
 * n8n工作流修复脚本
 * 使用API密钥自动修复工作流配置问题
 */

import fetch from 'node-fetch';
import fs from 'fs';

const N8N_BASE_URL = 'http://localhost:5678';
const WORKFLOW_ID = 'TX3mvXbjU0z6PdDm';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5ODg3NDc2LCJleHAiOjE3NTI0NjU2MDB9.hsRUMthJk6MGh4tSuGChUorBbvQY75IBOKa9wNNsOng';

console.log('🔧 n8n工作流修复脚本 (使用API密钥)');
console.log('=====================================');

const headers = {
  'Content-Type': 'application/json',
  'X-N8N-API-KEY': API_KEY
};

async function checkN8nStatus() {
  try {
    console.log('📡 检查n8n服务状态...');
    const response = await fetch(`${N8N_BASE_URL}/healthz`);
    if (response.ok) {
      console.log('✅ n8n服务正常运行');
      return true;
    }
  } catch (error) {
    console.log('❌ n8n服务连接失败:', error.message);
    return false;
  }
}

async function getWorkflowDetails() {
  try {
    console.log('📋 获取工作流详情...');
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      headers
    });
    
    if (response.ok) {
      const workflow = await response.json();
      console.log('✅ 工作流获取成功');
      console.log(`   - 名称: ${workflow.name}`);
      console.log(`   - 状态: ${workflow.active ? 'Active' : 'Inactive'}`);
      console.log(`   - 节点数量: ${workflow.nodes?.length || 0}`);
      
      // 检查每个节点的配置状态
      if (workflow.nodes) {
        console.log('\n📊 节点配置状态:');
        workflow.nodes.forEach(node => {
          const hasParameters = node.parameters && Object.keys(node.parameters).length > 0;
          const status = hasParameters ? '✅' : '❌';
          console.log(`   ${status} ${node.name} (${node.type})`);
          
          if (!hasParameters) {
            console.log(`      ⚠️  缺少配置参数`);
          }
        });
      }
      
      return workflow;
    } else {
      const errorText = await response.text();
      console.log('❌ 无法获取工作流详情:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ 获取工作流详情失败:', error.message);
    return null;
  }
}

async function diagnoseWorkflowIssues(workflow) {
  console.log('\n🔍 诊断工作流问题...');
  
  const issues = [];
  
  if (!workflow.nodes || workflow.nodes.length === 0) {
    issues.push('工作流没有节点');
    return issues;
  }
  
  workflow.nodes.forEach(node => {
    switch (node.type) {
      case 'n8n-nodes-base.webhook':
        if (!node.parameters?.httpMethod) {
          issues.push(`Webhook节点 "${node.name}" 缺少HTTP方法配置`);
        }
        break;
        
      case 'n8n-nodes-base.code':
        if (!node.parameters?.jsCode) {
          issues.push(`Code节点 "${node.name}" 缺少JavaScript代码`);
        }
        break;
        
      case 'n8n-nodes-base.supabase':
        if (!node.parameters?.operation) {
          issues.push(`Supabase节点 "${node.name}" 缺少操作配置`);
        }
        break;
        
      case '@n8n/n8n-nodes-langchain.informationExtractor':
        if (!node.parameters?.model) {
          issues.push(`AI Information Extractor节点 "${node.name}" 缺少模型配置`);
        }
        break;
    }
  });
  
  if (issues.length === 0) {
    console.log('✅ 未发现明显的配置问题');
  } else {
    console.log('❌ 发现以下问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  return issues;
}

async function createFixedWorkflow(originalWorkflow) {
  console.log('\n🛠️  创建修复后的工作流配置...');
  
  // 读取我们已经验证的代码
  let jsCode = '';
  try {
    jsCode = fs.readFileSync('./n8n-workflow-code.js', 'utf8');
    console.log('✅ 成功读取验证的JavaScript代码');
  } catch (error) {
    console.log('⚠️  无法读取n8n-workflow-code.js，使用默认代码');
    jsCode = `
// 智能CSV解析和字段映射
const csvData = $input.first().json.body;
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

return { processedData };
    `;
  }
  
  // 基于原始工作流创建修复版本
  const fixedWorkflow = {
    ...originalWorkflow,
    name: "智能CSV解析工作流 (已修复)",
    nodes: originalWorkflow.nodes.map(node => {
      const fixedNode = { ...node };
      
      switch (node.type) {
        case 'n8n-nodes-base.webhook':
          fixedNode.parameters = {
            ...node.parameters,
            httpMethod: 'POST',
            path: 'parse-csv',
            responseMode: 'responseNode'
          };
          break;
          
        case 'n8n-nodes-base.code':
          fixedNode.parameters = {
            ...node.parameters,
            jsCode: jsCode
          };
          break;
          
        case 'n8n-nodes-base.supabase':
          fixedNode.parameters = {
            ...node.parameters,
            operation: 'insert',
            table: 'grade_data',
            data: '={{ $json.processedData }}'
          };
          break;
          
        case 'n8n-nodes-base.respondToWebhook':
          fixedNode.parameters = {
            ...node.parameters,
            respondWith: 'json',
            responseBody: '={{ { success: true, processed: $json.length || 0 } }}'
          };
          break;
      }
      
      return fixedNode;
    }),
    active: false
  };
  
  return fixedWorkflow;
}

async function saveFixedWorkflow(workflow) {
  try {
    console.log('💾 保存修复后的工作流...');
    
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(workflow)
    });
    
    if (response.ok) {
      console.log('✅ 工作流保存成功');
      return true;
    } else {
      const error = await response.text();
      console.log('❌ 工作流保存失败:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ 保存工作流时出错:', error.message);
    return false;
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
  console.log('开始修复n8n工作流...\n');
  
  // 1. 检查n8n服务状态
  const isN8nRunning = await checkN8nStatus();
  if (!isN8nRunning) {
    console.log('\n❌ n8n服务未运行，请先启动n8n服务');
    process.exit(1);
  }
  
  // 2. 获取当前工作流详情
  const currentWorkflow = await getWorkflowDetails();
  if (!currentWorkflow) {
    console.log('\n❌ 无法获取工作流信息');
    process.exit(1);
  }
  
  // 3. 诊断问题
  const issues = await diagnoseWorkflowIssues(currentWorkflow);
  
  // 4. 修复工作流
  console.log('\n🛠️  开始自动修复...');
  
  const fixedWorkflow = await createFixedWorkflow(currentWorkflow);
  const saved = await saveFixedWorkflow(fixedWorkflow);
  
  if (saved) {
    // 5. 尝试激活工作流
    const activated = await activateWorkflow();
    
    if (activated) {
      // 6. 测试工作流
      await testWorkflow();
    }
  }
  
  console.log('\n📋 修复完成！');
  console.log('=====================================');
  
  if (saved) {
    console.log('✅ 工作流已成功修复和配置');
    console.log('🔗 Webhook URL: http://localhost:5678/webhook/parse-csv');
    console.log('📝 使用POST方法发送CSV数据进行测试');
  } else {
    console.log('❌ 自动修复失败，请参考以下文档进行手动配置:');
    console.log('- n8n-问题诊断与解决方案.md');
    console.log('- n8n-integration-test-plan.md');
  }
  
  console.log('\n💡 备用方案：使用已验证的解析代码直接集成到系统中');
}

// 运行主函数
main().catch(console.error); 