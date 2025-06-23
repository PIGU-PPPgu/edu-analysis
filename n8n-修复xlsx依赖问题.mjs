import fetch from 'node-fetch';

const N8N_BASE_URL = 'http://localhost:5678';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTQ0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTY0NTA3fQ.XEfOpGPsIeeA-3nzU1jH4MXFtJKjpAW9PByqd991dY0';

async function fixWorkflowXlsxIssue() {
  console.log('🔧 开始修复n8n工作流xlsx依赖问题...\n');

  try {
    // 1. 获取当前工作流
    console.log('1. 获取当前工作流配置...');
    const getResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/FppT8sCsSxcUnNnj`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!getResponse.ok) {
      throw new Error(`获取工作流失败: ${getResponse.status} ${getResponse.statusText}`);
    }

    const workflow = await getResponse.json();
    console.log('✅ 工作流获取成功');

    // 2. 修复工作流配置 - 替换Code节点为内置节点
    console.log('\n2. 修复工作流配置...');
    
    const fixedWorkflow = {
      ...workflow,
      nodes: [
        // Webhook节点保持不变
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "csv-upload",
            "options": {}
          },
          "id": "webhook-node",
          "name": "CSV文件上传",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 2,
          "position": [240, 300],
          "webhookId": "csv-upload"
        },
        
        // 使用Spreadsheet File节点替换Code节点
        {
          "parameters": {
            "operation": "read",
            "fileFormat": "csv",
            "options": {
              "delimiter": ",",
              "enableBOM": false,
              "encoding": "utf8",
              "headerRow": true
            }
          },
          "id": "spreadsheet-node",
          "name": "CSV文件解析",
          "type": "n8n-nodes-base.spreadsheetFile",
          "typeVersion": 2,
          "position": [460, 300]
        },
        
        // 数据处理节点
        {
          "parameters": {
            "values": {
              "string": [
                {
                  "name": "exam_title",
                  "value": "907九下月考成绩"
                },
                {
                  "name": "exam_type", 
                  "value": "月考"
                },
                {
                  "name": "exam_date",
                  "value": "2025-01-22"
                }
              ]
            },
            "options": {}
          },
          "id": "set-exam-info",
          "name": "设置考试信息",
          "type": "n8n-nodes-base.set",
          "typeVersion": 3.4,
          "position": [680, 300]
        },
        
        // 数据转换节点
        {
          "parameters": {
            "jsCode": `// 处理CSV数据，转换为Supabase格式
const items = [];

for (const item of $input.all()) {
  const data = item.json;
  
  // 跳过空行或标题行
  if (!data.学号 || !data.姓名) continue;
  
  // 基础信息
  const baseRecord = {
    student_id: String(data.学号).trim(),
    name: String(data.姓名).trim(),
    class_name: String(data.班级 || '').trim(),
    exam_title: "907九下月考成绩",
    exam_type: "月考", 
    exam_date: "2025-01-22"
  };
  
  // 处理各科成绩
  const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
  
  for (const subject of subjects) {
    if (data[subject] && data[subject] !== '' && data[subject] !== null) {
      const score = parseFloat(data[subject]);
      if (!isNaN(score)) {
        items.push({
          ...baseRecord,
          subject: subject,
          score: score
        });
      }
    }
  }
  
  // 如果有总分
  if (data.总分 && data.总分 !== '' && data.总分 !== null) {
    const totalScore = parseFloat(data.总分);
    if (!isNaN(totalScore)) {
      items.push({
        ...baseRecord,
        subject: '总分',
        score: totalScore
      });
    }
  }
}

return items;`
          },
          "id": "data-transform",
          "name": "数据转换",
          "type": "n8n-nodes-base.code",
          "typeVersion": 2,
          "position": [900, 300]
        },
        
        // Supabase插入节点
        {
          "parameters": {
            "url": "https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "supabaseApi",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "apikey",
                  "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"
                },
                {
                  "name": "Authorization",
                  "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"
                },
                {
                  "name": "Content-Type",
                  "value": "application/json"
                },
                {
                  "name": "Prefer",
                  "value": "return=minimal"
                }
              ]
            },
            "sendBody": true,
            "bodyParameters": {
              "parameters": []
            },
            "jsonBody": "={{ JSON.stringify($json) }}",
            "options": {}
          },
          "id": "supabase-insert",
          "name": "保存到Supabase",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.2,
          "position": [1120, 300]
        }
      ],
      
      // 连接关系
      connections: {
        "CSV文件上传": {
          "main": [
            [
              {
                "node": "CSV文件解析",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "CSV文件解析": {
          "main": [
            [
              {
                "node": "设置考试信息",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "设置考试信息": {
          "main": [
            [
              {
                "node": "数据转换",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "数据转换": {
          "main": [
            [
              {
                "node": "保存到Supabase",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      }
    };

    // 3. 更新工作流
    console.log('3. 更新工作流配置...');
    const updateResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/FppT8sCsSxcUnNnj`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fixedWorkflow)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`更新工作流失败: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
    }

    console.log('✅ 工作流修复成功！');

    // 4. 激活工作流
    console.log('\n4. 激活工作流...');
    const activateResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/FppT8sCsSxcUnNnj/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!activateResponse.ok) {
      console.log('⚠️ 工作流激活可能失败，但修复已完成');
    } else {
      console.log('✅ 工作流已激活');
    }

    console.log('\n🎉 修复完成！主要变更：');
    console.log('- 移除了依赖xlsx模块的Code节点');
    console.log('- 使用n8n内置的Spreadsheet File节点处理CSV');
    console.log('- 简化了数据处理逻辑');
    console.log('- 保持了完整的数据流程');
    
    console.log('\n📝 现在可以重新测试文件上传：');
    console.log('curl -X POST http://localhost:5678/webhook/csv-upload \\');
    console.log('  -F "file=@907九下月考成绩.csv"');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    if (error.stack) {
      console.error('错误详情:', error.stack);
    }
  }
}

// 执行修复
fixWorkflowXlsxIssue(); 