#!/usr/bin/env node

/**
 * 创建简化但可用的n8n智能CSV解析工作流
 * 解决 "propertyValues[itemName] is not iterable" 错误
 */

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag';
const BASE_URL = 'http://localhost:5678/api/v1';

// 简化的工作流配置 - 避免复杂的字段映射导致的错误
const simpleWorkflow = {
  name: "简化智能CSV解析",
  active: false,
  nodes: [
    // 1. Webhook节点
    {
      parameters: {
        httpMethod: "POST",
        path: "simple-csv-parser",
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
        jsCode: `
// 预处理CSV数据
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
        mimeType: item.binary.data.mimeType || 'text/csv'
      }
    });
  } else if (item.json) {
    // 直接传递JSON数据
    processedItems.push(item);
  }
}

return processedItems;
        `
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [220, 0],
      id: "code-preprocess",
      name: "预处理CSV"
    },
    
    // 3. Information Extractor节点 - 简化字段配置
    {
      parameters: {
        text: "{{ $json.csvContent }}",
        attributes: [
          // 基础信息 (5个)
          {"name": "student_id", "description": "学号", "type": "string"},
          {"name": "name", "description": "姓名", "type": "string"},
          {"name": "class_name", "description": "班级名称", "type": "string"},
          {"name": "grade", "description": "年级", "type": "string"},
          {"name": "gender", "description": "性别", "type": "string"},
          
          // 主要科目成绩 (9个)
          {"name": "chinese", "description": "语文成绩", "type": "string"},
          {"name": "math", "description": "数学成绩", "type": "string"},
          {"name": "english", "description": "英语成绩", "type": "string"},
          {"name": "physics", "description": "物理成绩", "type": "string"},
          {"name": "chemistry", "description": "化学成绩", "type": "string"},
          {"name": "politics", "description": "政治成绩", "type": "string"},
          {"name": "history", "description": "历史成绩", "type": "string"},
          {"name": "biology", "description": "生物成绩", "type": "string"},
          {"name": "geography", "description": "地理成绩", "type": "string"},
          
          // 统计信息 (4个)
          {"name": "total_score", "description": "总分", "type": "string"},
          {"name": "average_score", "description": "平均分", "type": "string"},
          {"name": "rank_in_class", "description": "班级排名", "type": "string"},
          {"name": "rank_in_grade", "description": "年级排名", "type": "string"},
          
          // 考试信息 (3个)
          {"name": "exam_title", "description": "考试名称", "type": "string"},
          {"name": "exam_type", "description": "考试类型", "type": "string"},
          {"name": "exam_date", "description": "考试日期", "type": "string"}
        ],
        options: {},
        systemMessage: `你是一个专业的教育数据解析专家。请从CSV数据中准确提取学生成绩信息。

重要规则：
1. 学号(student_id)是必填字段，不能为空
2. 姓名(name)是必填字段，不能为空  
3. 分数字段应该是数字，如果无法解析则返回null
4. 如果某个字段在数据中不存在，请返回null而不是空字符串

科目对应关系：
- 语文 → chinese
- 数学 → math
- 英语 → english
- 物理 → physics
- 化学 → chemistry
- 政治/道法 → politics
- 历史 → history
- 生物 → biology
- 地理 → geography

请仔细分析CSV的列标题，智能匹配对应的字段。`
      },
      type: "@n8n/n8n-nodes-langchain.informationExtractor",
      typeVersion: 1.1,
      position: [440, 0],
      id: "info-extractor",
      name: "Information Extractor"
    },
    
    // 4. DeepSeek AI模型
    {
      parameters: {
        options: {}
      },
      type: "@n8n/n8n-nodes-langchain.lmChatDeepSeek",
      typeVersion: 1,
      position: [440, 120],
      id: "deepseek-model",
      name: "DeepSeek Chat Model",
      credentials: {
        deepSeekApi: {
          id: "EriBj5p7vLUecFo7",
          name: "DeepSeek account"
        }
      }
    },
    
    // 5. Code节点 - 数据后处理和格式化
    {
      parameters: {
        jsCode: `
// 数据后处理和格式化
const items = $input.all();
const processedItems = [];

for (const item of items) {
  // 确保必填字段存在
  if (!item.json.student_id || !item.json.name) {
    console.log('跳过无效记录：缺少学号或姓名');
    continue;
  }
  
  // 格式化数据
  const processedItem = {
    json: {
      // 基础信息
      student_id: item.json.student_id,
      name: item.json.name,
      class_name: item.json.class_name || null,
      grade: item.json.grade || null,
      gender: item.json.gender || null,
      
      // 成绩信息
      chinese: parseFloat(item.json.chinese) || null,
      math: parseFloat(item.json.math) || null,
      english: parseFloat(item.json.english) || null,
      physics: parseFloat(item.json.physics) || null,
      chemistry: parseFloat(item.json.chemistry) || null,
      politics: parseFloat(item.json.politics) || null,
      history: parseFloat(item.json.history) || null,
      biology: parseFloat(item.json.biology) || null,
      geography: parseFloat(item.json.geography) || null,
      
      // 统计信息
      total_score: parseFloat(item.json.total_score) || null,
      average_score: parseFloat(item.json.average_score) || null,
      rank_in_class: parseInt(item.json.rank_in_class) || null,
      rank_in_grade: parseInt(item.json.rank_in_grade) || null,
      
      // 考试信息
      exam_title: item.json.exam_title || null,
      exam_type: item.json.exam_type || null,
      exam_date: item.json.exam_date || null,
      
      // 元数据
      created_at: new Date().toISOString(),
      exam_scope: 'class'
    }
  };
  
  processedItems.push(processedItem);
}

return processedItems;
        `
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [660, 0],
      id: "code-postprocess",
      name: "数据后处理"
    },
    
    // 6. Supabase节点 - 简化配置
    {
      parameters: {
        operation: "insert",
        tableId: "grade_data",
        dataToSend: "={{ $json }}"
      },
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [880, 0],
      id: "supabase-insert",
      name: "保存到Supabase",
      credentials: {
        supabaseApi: {
          id: "supabase-credentials",
          name: "Supabase API"
        }
      }
    },
    
    // 7. Respond to Webhook节点
    {
      parameters: {
        respondWith: "json",
        responseBody: `{
  "success": true,
  "message": "数据解析和保存成功",
  "processed_count": {{ $json.length || 1 }},
  "timestamp": "{{ $now }}"
}`
      },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [1100, 0],
      id: "respond-webhook",
      name: "返回响应"
    }
  ],
  
  // 节点连接
  connections: {
    "webhook-node": {
      "main": [[{"node": "code-preprocess", "type": "main", "index": 0}]]
    },
    "code-preprocess": {
      "main": [[{"node": "info-extractor", "type": "main", "index": 0}]]
    },
    "info-extractor": {
      "main": [[{"node": "code-postprocess", "type": "main", "index": 0}]]
    },
    "deepseek-model": {
      "ai_languageModel": [[{"node": "info-extractor", "type": "ai_languageModel", "index": 0}]]
    },
    "code-postprocess": {
      "main": [[{"node": "supabase-insert", "type": "main", "index": 0}]]
    },
    "supabase-insert": {
      "main": [[{"node": "respond-webhook", "type": "main", "index": 0}]]
    }
  },
  
  settings: {
    executionOrder: "v1"
  },
  staticData: {},
  meta: {
    templateCredsSetupCompleted: true
  },
  pinData: {},
  tags: []
};

async function createSimpleWorkflow() {
  try {
    console.log('🚀 开始创建简化的智能CSV解析工作流...');
    
    const response = await fetch(`${BASE_URL}/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simpleWorkflow)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ 工作流创建成功！');
    console.log(`📋 工作流ID: ${result.id}`);
    console.log(`📝 工作流名称: ${result.name}`);
    
    // 获取Webhook URL
    const webhookNode = result.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    if (webhookNode && webhookNode.webhookId) {
      console.log(`🌐 Webhook URL: http://localhost:5678/webhook/${webhookNode.webhookId}`);
    }
    
    console.log('\n🎯 下一步：');
    console.log('1. 在n8n界面中激活工作流');
    console.log('2. 测试Webhook URL');
    console.log('3. 上传CSV文件进行测试');
    
    return result;
    
  } catch (error) {
    console.error('❌ 创建工作流失败:', error.message);
    throw error;
  }
}

// 执行创建
createSimpleWorkflow()
  .then(() => {
    console.log('\n🎉 简化工作流创建完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 创建失败:', error);
    process.exit(1);
  }); 