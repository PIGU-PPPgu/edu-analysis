#!/usr/bin/env node

/**
 * n8n Excel文件处理实用方案
 * 使用n8n内置节点处理Excel和CSV文件，支持数据去重
 */

import fetch from 'node-fetch';

const N8N_BASE_URL = 'http://localhost:5678';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTQ0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTY0NTA3fQ.XEfOpGPsIeeA-3nzU1jH4MXFtJKjpAW9PByqd991dY0';

// 完整的工作流配置 - 支持Excel和CSV，包含数据去重
const EXCEL_WORKFLOW_CONFIG = {
  "name": "智能成绩文件处理器",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "smart-grade-upload",
        "options": {}
      },
      "id": "webhook-node",
      "name": "文件上传接收器",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "smart-grade-upload"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.fileName}}",
              "operation": "contains",
              "value2": ".xlsx"
            }
          ]
        }
      },
      "id": "excel-check",
      "name": "Excel文件检测",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "operation": "fromBinary",
        "options": {
          "headerRow": true,
          "delimiter": ","
        }
      },
      "id": "csv-parser",
      "name": "CSV解析器",
      "type": "n8n-nodes-base.spreadsheetFile",
      "typeVersion": 1,
      "position": [680, 200]
    },
    {
      "parameters": {
        "operation": "fromBinary",
        "options": {
          "headerRow": true,
          "sheetName": "Sheet1"
        }
      },
      "id": "excel-parser",
      "name": "Excel解析器", 
      "type": "n8n-nodes-base.spreadsheetFile",
      "typeVersion": 1,
      "position": [680, 400]
    },
    {
      "parameters": {
        "jsCode": `
// 智能数据处理和去重
const items = [];
const duplicateMap = new Map();
const stats = {
  total_input: 0,
  duplicates_found: 0,
  unique_records: 0,
  processing_errors: []
};

try {
  // 获取输入数据
  const inputItems = $input.all();
  stats.total_input = inputItems.length;
  
  console.log('开始处理数据，输入条数:', stats.total_input);
  
  for (const item of inputItems) {
    const data = item.json;
    
    // 验证必要字段
    if (!data.学号 || !data.姓名) {
      stats.processing_errors.push({
        error: '缺少必要字段',
        data: data,
        required: ['学号', '姓名']
      });
      continue;
    }
    
    // 基础记录信息
    const baseRecord = {
      student_id: String(data.学号).trim(),
      name: String(data.姓名).trim(),
      class_name: String(data.班级 || data.班级名称 || '').trim(),
      exam_title: '智能导入考试',
      exam_type: '月考',
      exam_date: new Date().toISOString().split('T')[0],
      import_batch: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 处理各科成绩
    const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
    
    for (const subject of subjects) {
      if (data[subject] && data[subject] !== '' && data[subject] !== null) {
        const score = parseFloat(data[subject]);
        
        if (!isNaN(score) && score >= 0 && score <= 150) {
          const recordKey = \`\${baseRecord.student_id}_\${subject}_\${baseRecord.exam_title}\`;
          
          const record = {
            ...baseRecord,
            subject: subject,
            score: score,
            grade: calculateGrade(score),
            metadata: {
              source: 'n8n_smart_import',
              record_key: recordKey
            }
          };
          
          // 去重处理
          if (duplicateMap.has(recordKey)) {
            const existing = duplicateMap.get(recordKey);
            stats.duplicates_found++;
            
            // 保留分数更高的记录
            if (score > existing.score) {
              duplicateMap.set(recordKey, record);
              console.log(\`更新重复记录: \${baseRecord.name} \${subject} \${existing.score} -> \${score}\`);
            }
          } else {
            duplicateMap.set(recordKey, record);
            stats.unique_records++;
          }
        }
      }
    }
    
    // 处理总分
    if (data.总分 && data.总分 !== '' && data.总分 !== null) {
      const totalScore = parseFloat(data.总分);
      if (!isNaN(totalScore) && totalScore >= 0) {
        const recordKey = \`\${baseRecord.student_id}_总分_\${baseRecord.exam_title}\`;
        
        const record = {
          ...baseRecord,
          subject: '总分',
          score: totalScore,
          total_score: totalScore,
          grade: calculateGrade(totalScore, true),
          metadata: {
            source: 'n8n_smart_import',
            record_key: recordKey
          }
        };
        
        if (!duplicateMap.has(recordKey)) {
          duplicateMap.set(recordKey, record);
          stats.unique_records++;
        }
      }
    }
  }
  
  // 转换为数组并添加统计信息
  for (const [key, record] of duplicateMap) {
    delete record.metadata.record_key; // 移除临时字段
    items.push(record);
  }
  
  // 在第一条记录中添加处理统计
  if (items.length > 0) {
    items[0].processing_stats = stats;
  }
  
  console.log(\`数据处理完成: 输入\${stats.total_input}条，输出\${items.length}条，去重\${stats.duplicates_found}条\`);
  
  return items;
  
} catch (error) {
  console.error('数据处理错误:', error);
  return [{
    error: true,
    message: error.message,
    error_type: 'data_processing_error',
    timestamp: new Date().toISOString(),
    stats: stats
  }];
}

// 计算成绩等级
function calculateGrade(score, isTotal = false) {
  const threshold = isTotal ? 
    { A: 540, B: 480, C: 420, D: 360 } : 
    { A: 90, B: 80, C: 70, D: 60 };
    
  if (score >= threshold.A) return 'A';
  if (score >= threshold.B) return 'B';
  if (score >= threshold.C) return 'C';
  if (score >= threshold.D) return 'D';
  return 'E';
}
`
      },
      "id": "data-processor",
      "name": "智能数据处理器",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [900, 300]
    },
    {
      "parameters": {
        "url": "https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpMethod": "POST",
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
              "value": "return=representation"
            }
          ]
        },
        "sendBody": true,
        "bodyContentType": "json",
        "jsonBody": "={{ $json }}",
        "options": {}
      },
      "id": "supabase-save",
      "name": "保存到Supabase",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1120, 300]
    }
  ],
  "connections": {
    "文件上传接收器": {
      "main": [
        [
          {
            "node": "Excel文件检测",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Excel文件检测": {
      "main": [
        [
          {
            "node": "Excel解析器",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "CSV解析器",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "CSV解析器": {
      "main": [
        [
          {
            "node": "智能数据处理器",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Excel解析器": {
      "main": [
        [
          {
            "node": "智能数据处理器",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "智能数据处理器": {
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
  },
  "active": true,
  "settings": {},
  "versionId": "1"
};

async function createSmartWorkflow() {
  try {
    console.log('🚀 创建智能文件处理工作流...');
    
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': API_KEY
      },
      body: JSON.stringify(EXCEL_WORKFLOW_CONFIG)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`创建工作流失败: ${response.status} - ${error}`);
    }
    
    const workflow = await response.json();
    console.log('✅ 工作流创建成功!');
    console.log(`📋 工作流ID: ${workflow.id}`);
    console.log(`🌐 Webhook URL: ${N8N_BASE_URL}/webhook/smart-grade-upload`);
    
    return workflow;
    
  } catch (error) {
    console.error('❌ 创建工作流失败:', error.message);
    throw error;
  }
}

async function testSmartWorkflow() {
  try {
    console.log('🧪 测试智能文件处理...');
    
    // 创建测试Excel数据
    const testData = {
      fileName: 'test-grades.xlsx',
      data: 'base64encodedexceldata', // 这里应该是实际的Excel文件数据
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const response = await fetch(`${N8N_BASE_URL}/webhook/smart-grade-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 测试成功!');
      console.log('📊 处理结果:', JSON.stringify(result, null, 2));
    } else {
      console.log('⚠️ 测试响应:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 主函数
async function main() {
  try {
    console.log('🎯 开始部署智能文件处理方案...\n');
    
    // 创建工作流
    const workflow = await createSmartWorkflow();
    
    console.log('\n📋 工作流功能特性:');
    console.log('✅ 支持Excel (.xlsx) 和 CSV 文件');
    console.log('✅ 自动文件格式检测和分支处理');
    console.log('✅ 智能数据去重和合并');
    console.log('✅ 成绩等级自动计算');
    console.log('✅ 详细的处理统计信息');
    console.log('✅ 错误处理和数据验证');
    
    console.log('\n🔧 使用方法:');
    console.log(`1. 上传文件到: ${N8N_BASE_URL}/webhook/smart-grade-upload`);
    console.log('2. 支持的文件格式: .xlsx, .csv');
    console.log('3. 必需的列: 学号, 姓名');
    console.log('4. 可选的列: 班级, 语文, 数学, 英语, 物理, 化学, 政治, 历史, 生物, 地理, 总分');
    
    console.log('\n🎯 数据去重策略:');
    console.log('- 基于 学号+科目+考试标题 进行去重');
    console.log('- 重复数据保留分数更高的记录');
    console.log('- 提供详细的去重统计信息');
    
    // 可选：运行测试
    // await testSmartWorkflow();
    
  } catch (error) {
    console.error('💥 部署失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createSmartWorkflow, testSmartWorkflow }; 