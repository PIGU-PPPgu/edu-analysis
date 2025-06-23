#!/usr/bin/env node

/**
 * 创建简化但可用的n8n智能CSV解析工作流
 * 避免复杂的71字段配置，使用简单的数据传递方式
 */

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag';
const BASE_URL = 'http://localhost:5678/api/v1';

// 简化的工作流配置 - 避免复杂的字段映射
const simpleWorkflow = {
  name: "简化CSV解析工作流",
  active: false,
  nodes: [
    // 1. Webhook节点
    {
      parameters: {
        httpMethod: "POST",
        path: "simple-csv-upload",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, 0],
      id: "webhook-node",
      name: "Webhook"
    },
    
    // 2. Code节点 - 预处理CSV
    {
      parameters: {
        jsCode: `// 简化的CSV预处理
const items = $input.all();
const processedItems = [];

for (const item of items) {
  if (item.binary && item.binary.data) {
    // 获取文件内容
    const fileContent = Buffer.from(item.binary.data.data, 'base64').toString('utf-8');
    
    processedItems.push({
      json: {
        csvContent: fileContent,
        fileName: item.binary.data.fileName || 'unknown.csv',
        timestamp: new Date().toISOString()
      }
    });
  }
}

return processedItems;`
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [220, 0],
      id: "code-preprocess",
      name: "CSV预处理"
    },
    
    // 3. Information Extractor - 只配置基础字段
    {
      parameters: {
        text: "{{ $json.csvContent }}",
        attributes: [
          {
            name: "student_id",
            description: "学号",
            type: "string"
          },
          {
            name: "name", 
            description: "姓名",
            type: "string"
          },
          {
            name: "class_name",
            description: "班级名称，如初三7班",
            type: "string"
          },
          {
            name: "chinese",
            description: "语文成绩分数",
            type: "string"
          },
          {
            name: "math",
            description: "数学成绩分数", 
            type: "string"
          },
          {
            name: "english",
            description: "英语成绩分数",
            type: "string"
          },
          {
            name: "total_score",
            description: "总分",
            type: "string"
          },
          {
            name: "rank_in_class",
            description: "班级排名",
            type: "string"
          }
        ],
        options: {},
        systemMessage: "你是一个专业的教育数据解析专家。请从CSV数据中准确提取学生成绩信息。重要规则：1. 学号和姓名是必填字段 2. 分数应该是数字 3. 如果字段不存在返回null"
      },
      type: "@n8n/n8n-nodes-langchain.informationExtractor",
      typeVersion: 1.1,
      position: [440, 0],
      id: "info-extractor",
      name: "信息提取"
    },
    
    // 4. DeepSeek AI模型
    {
      parameters: {
        options: {}
      },
      type: "@n8n/n8n-nodes-langchain.lmChatDeepSeek",
      typeVersion: 1,
      position: [440, 200],
      id: "deepseek-model",
      name: "DeepSeek AI",
      credentials: {
        deepSeekApi: {
          id: "EriBj5p7vLUecFo7",
          name: "DeepSeek account"
        }
      }
    },
    
    // 5. Supabase节点 - 简化配置
    {
      parameters: {
        operation: "insert",
        tableId: "grade_data",
        // 使用简单的数据传递方式，避免复杂的字段映射
        dataToSend: "={{ $json }}"
      },
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [660, 0],
      id: "supabase-insert",
      name: "保存到数据库",
      credentials: {
        supabaseApi: {
          id: "supabase-credentials",
          name: "Supabase API"
        }
      }
    },
    
    // 6. 响应节点
    {
      parameters: {
        respondWith: "json",
        responseBody: `{
  "success": true,
  "message": "CSV数据解析和保存成功",
  "processed_count": {{ $json.length || 1 }},
  "timestamp": "{{ $now }}"
}`
      },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [880, 0],
      id: "webhook-response",
      name: "返回结果"
    }
  ],
  
  // 节点连接
  connections: {
    "webhook-node": {
      main: [[{
        node: "code-preprocess",
        type: "main",
        index: 0
      }]]
    },
    "code-preprocess": {
      main: [[{
        node: "info-extractor",
        type: "main", 
        index: 0
      }]]
    },
    "deepseek-model": {
      ai_languageModel: [[{
        node: "info-extractor",
        type: "ai_languageModel",
        index: 0
      }]]
    },
    "info-extractor": {
      main: [[{
        node: "supabase-insert",
        type: "main",
        index: 0
      }]]
    },
    "supabase-insert": {
      main: [[{
        node: "webhook-response",
        type: "main",
        index: 0
      }]]
    }
  },
  
  settings: {
    executionOrder: "v1"
  },
  staticData: null,
  meta: {
    templateCredsSetupCompleted: true
  },
  pinData: {}
};

async function createWorkflow() {
  try {
    console.log('🚀 创建简化的n8n工作流...');
    
    const response = await fetch(`${BASE_URL}/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simpleWorkflow)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API错误: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ 工作流创建成功!');
    console.log(`📋 工作流ID: ${result.id}`);
    console.log(`🔗 工作流URL: http://localhost:5678/workflow/${result.id}`);
    
    // 获取Webhook URL
    const webhookNode = result.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    if (webhookNode && webhookNode.webhookId) {
      console.log(`🌐 Webhook URL: http://localhost:5678/webhook/${webhookNode.webhookId}`);
    }
    
    // 激活工作流
    console.log('🔄 激活工作流...');
    const activateResponse = await fetch(`${BASE_URL}/workflows/${result.id}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...result,
        active: true
      })
    });
    
    if (activateResponse.ok) {
      console.log('✅ 工作流已激活!');
    } else {
      console.log('⚠️ 工作流创建成功，但激活失败，请手动激活');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ 创建工作流失败:', error.message);
    throw error;
  }
}

// 执行创建
createWorkflow()
  .then(result => {
    console.log('\n🎉 工作流配置完成!');
    console.log('📝 下一步: 在n8n界面中检查工作流并测试');
  })
  .catch(error => {
    console.error('\n💥 创建失败:', error.message);
    process.exit(1);
  }); 