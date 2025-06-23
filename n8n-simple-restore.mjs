#!/usr/bin/env node

/**
 * n8n工作流简化恢复脚本
 * 创建基础的智能CSV解析工作流
 */

import axios from 'axios';

// n8n配置
const N8N_BASE_URL = 'http://localhost:5678';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag';

// 简化的工作流定义
const SIMPLE_WORKFLOW = {
  "name": "智能CSV解析工作流-恢复版",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "083f9843-c404-4c8f-8210-e64563608f57",
        "responseMode": "responseNode"
      },
      "id": "webhook-node",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"success\": true, \"message\": \"工作流已恢复，请手动配置Information Extractor节点\" } }}"
      },
      "id": "response-node",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [460, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
};

async function createSimpleWorkflow() {
  try {
    console.log('🚀 创建简化工作流...');
    
    // 创建基础工作流
    const response = await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows`,
      SIMPLE_WORKFLOW,
      {
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 基础工作流创建成功！');
    console.log('工作流ID:', response.data.id);
    
    // 激活工作流
    await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows/${response.data.id}/activate`,
      {},
      {
        headers: {
          'X-N8N-API-KEY': API_KEY
        }
      }
    );
    
    console.log('✅ 工作流已激活！');
    console.log('🔗 Webhook URL: http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57');
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 创建失败:', error.response?.data || error.message);
    throw error;
  }
}

// 执行创建
createSimpleWorkflow()
  .then((workflow) => {
    console.log('🎉 基础工作流恢复完成！');
    console.log('');
    console.log('📋 下一步操作:');
    console.log('1. 访问 http://localhost:5678');
    console.log('2. 打开工作流:', workflow.name);
    console.log('3. 手动添加以下节点:');
    console.log('   - Code节点 (用于预处理CSV)');
    console.log('   - Information Extractor节点 (AI解析)');
    console.log('   - Edit Fields节点 (数据处理)');
    console.log('   - Supabase节点 (数据保存)');
    console.log('4. 连接节点并配置参数');
    console.log('');
    console.log('🧪 当前可以测试基础Webhook:');
    console.log('curl -X POST http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57');
  })
  .catch((error) => {
    console.error('💥 恢复失败');
  }); 