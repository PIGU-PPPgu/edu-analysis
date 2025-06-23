#!/usr/bin/env node

/**
 * n8n工作流恢复脚本
 * 重新创建完整的智能CSV解析工作流
 */

import axios from 'axios';

// n8n配置
const N8N_BASE_URL = 'http://localhost:5678';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag';

// 完整的工作流定义
const WORKFLOW_DEFINITION = {
  "name": "智能CSV解析工作流",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "083f9843-c404-4c8f-8210-e64563608f57",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "f8b0c2e1-8d4a-4c5b-9e3f-1a2b3c4d5e6f",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "083f9843-c404-4c8f-8210-e64563608f57"
    },
    {
      "parameters": {
        "jsCode": "// 预处理CSV数据\nconst items = $input.all();\nconst processedItems = [];\n\nfor (const item of items) {\n  if (item.binary && item.binary.data) {\n    // 获取文件内容\n    const fileContent = Buffer.from(item.binary.data.data, 'base64').toString('utf-8');\n    \n    processedItems.push({\n      json: {\n        csvContent: fileContent,\n        fileName: item.binary.data.fileName || 'unknown.csv',\n        mimeType: item.binary.data.mimeType || 'text/csv'\n      }\n    });\n  }\n}\n\nreturn processedItems;"
      },
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Code",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "model": {
          "model": "deepseek-chat",
          "options": {}
        },
        "systemPromptTemplate": "你是一个专业的教育数据解析专家。请从CSV数据中准确提取学生成绩信息。\\n\\n重要规则：\\n1. 学号(student_id)是必填字段，不能为空\\n2. 姓名(name)是必填字段，不能为空\\n3. 分数字段应该是数字，如果无法解析则返回null\\n4. 等级字段通常是A+、A、A-、B+、B、B-、C+、C、C-、D+、D、E等\\n5. 排名字段应该是正整数，如果无法解析则返回null\\n6. 班级名称应该标准化，如\\\"初三7班\\\"、\\\"高二3班\\\"等\\n7. 如果某个字段在数据中不存在，请返回null而不是空字符串\\n\\n科目对应关系：\\n- 语文 → chinese\\n- 数学 → math\\n- 英语 → english\\n- 物理 → physics\\n- 化学 → chemistry\\n- 政治/道法 → politics\\n- 历史 → history\\n- 生物 → biology\\n- 地理 → geography\\n- 体育 → pe\\n- 音乐 → music\\n- 美术 → art\\n- 信息技术 → it\\n- 通用技术 → general_tech\\n\\n请仔细分析CSV的列标题，智能匹配对应的字段。",
        "userPromptTemplate": "请从以下CSV数据中提取学生成绩信息：\\n\\n{{ $json.csvContent }}\\n\\n请准确识别并提取所有可用的字段信息。",
        "attributes": [
          { "name": "student_id", "description": "学号" },
          { "name": "name", "description": "姓名" },
          { "name": "class_name", "description": "学生所在的班级名称，如初三7班" },
          { "name": "grade", "description": "年级信息" },
          { "name": "gender", "description": "性别" },
          { "name": "chinese", "description": "语文成绩分数" },
          { "name": "math", "description": "数学成绩分数" },
          { "name": "english", "description": "英语成绩分数" },
          { "name": "physics", "description": "物理成绩分数" },
          { "name": "chemistry", "description": "化学成绩分数" },
          { "name": "politics", "description": "政治成绩分数" },
          { "name": "history", "description": "历史成绩分数" },
          { "name": "biology", "description": "生物成绩分数" },
          { "name": "geography", "description": "地理成绩分数" },
          { "name": "pe", "description": "体育成绩分数" },
          { "name": "music", "description": "音乐成绩分数" },
          { "name": "art", "description": "美术成绩分数" },
          { "name": "it", "description": "信息技术成绩分数" },
          { "name": "general_tech", "description": "通用技术成绩分数" },
          { "name": "chinese_grade", "description": "语文等级，如A+、A、B+等" },
          { "name": "math_grade", "description": "数学等级" },
          { "name": "english_grade", "description": "英语等级" },
          { "name": "physics_grade", "description": "物理等级" },
          { "name": "chemistry_grade", "description": "化学等级" },
          { "name": "politics_grade", "description": "政治等级" },
          { "name": "history_grade", "description": "历史等级" },
          { "name": "biology_grade", "description": "生物等级" },
          { "name": "geography_grade", "description": "地理等级" },
          { "name": "pe_grade", "description": "体育等级" },
          { "name": "music_grade", "description": "音乐等级" },
          { "name": "art_grade", "description": "美术等级" },
          { "name": "it_grade", "description": "信息技术等级" },
          { "name": "general_tech_grade", "description": "通用技术等级" },
          { "name": "chinese_class_rank", "description": "语文班级排名" },
          { "name": "math_class_rank", "description": "数学班级排名" },
          { "name": "english_class_rank", "description": "英语班级排名" },
          { "name": "physics_class_rank", "description": "物理班级排名" },
          { "name": "chemistry_class_rank", "description": "化学班级排名" },
          { "name": "politics_class_rank", "description": "政治班级排名" },
          { "name": "history_class_rank", "description": "历史班级排名" },
          { "name": "biology_class_rank", "description": "生物班级排名" },
          { "name": "geography_class_rank", "description": "地理班级排名" },
          { "name": "pe_class_rank", "description": "体育班级排名" },
          { "name": "music_class_rank", "description": "音乐班级排名" },
          { "name": "art_class_rank", "description": "美术班级排名" },
          { "name": "it_class_rank", "description": "信息技术班级排名" },
          { "name": "general_tech_class_rank", "description": "通用技术班级排名" },
          { "name": "chinese_grade_rank", "description": "语文年级排名" },
          { "name": "math_grade_rank", "description": "数学年级排名" },
          { "name": "english_grade_rank", "description": "英语年级排名" },
          { "name": "physics_grade_rank", "description": "物理年级排名" },
          { "name": "chemistry_grade_rank", "description": "化学年级排名" },
          { "name": "politics_grade_rank", "description": "政治年级排名" },
          { "name": "history_grade_rank", "description": "历史年级排名" },
          { "name": "biology_grade_rank", "description": "生物年级排名" },
          { "name": "geography_grade_rank", "description": "地理年级排名" },
          { "name": "pe_grade_rank", "description": "体育年级排名" },
          { "name": "music_grade_rank", "description": "音乐年级排名" },
          { "name": "art_grade_rank", "description": "美术年级排名" },
          { "name": "it_grade_rank", "description": "信息技术年级排名" },
          { "name": "general_tech_grade_rank", "description": "通用技术年级排名" },
          { "name": "total_score", "description": "总分" },
          { "name": "average_score", "description": "平均分" },
          { "name": "rank_in_class", "description": "班级总排名" },
          { "name": "rank_in_grade", "description": "年级总排名" },
          { "name": "rank_in_school", "description": "校内总排名" },
          { "name": "total_grade", "description": "总分等级" },
          { "name": "exam_title", "description": "考试名称" },
          { "name": "exam_type", "description": "考试类型，如月考、期中考试" },
          { "name": "exam_date", "description": "考试日期" },
          { "name": "exam_scope", "description": "考试范围，如class、grade、school" }
        ]
      },
      "id": "b2c3d4e5-f6g7-8901-bcde-f23456789012",
      "name": "Information Extractor",
      "type": "@n8n/n8n-nodes-langchain.informationExtractor",
      "typeVersion": 1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "field1",
              "name": "processed_data",
              "value": "={{ $json }}",
              "type": "object"
            },
            {
              "id": "field2", 
              "name": "timestamp",
              "value": "={{ new Date().toISOString() }}",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "id": "c3d4e5f6-g7h8-9012-cdef-345678901234",
      "name": "Edit Fields",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [900, 300]
    },
    {
      "parameters": {
        "operation": "insert",
        "table": {
          "value": "grade_data"
        },
        "columns": {
          "mappingMode": "autoMapInputData",
          "value": {},
          "matchingColumns": [],
          "schema": []
        },
        "options": {}
      },
      "id": "d4e5f6g7-h8i9-0123-defg-456789012345",
      "name": "Supabase",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1120, 300],
      "credentials": {
        "supabaseApi": {
          "id": "supabase_credentials",
          "name": "Supabase API"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"success\": true, \"message\": \"数据处理完成\", \"processed_count\": $json.processed_data ? ($json.processed_data.length || 1) : 0, \"timestamp\": $json.timestamp } }}",
        "options": {}
      },
      "id": "e5f6g7h8-i9j0-1234-efgh-567890123456",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [1340, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Code",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Code": {
      "main": [
        [
          {
            "node": "Information Extractor",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Information Extractor": {
      "main": [
        [
          {
            "node": "Edit Fields",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Edit Fields": {
      "main": [
        [
          {
            "node": "Supabase",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase": {
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
  },
  "pinData": {},
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "tags": [],
  "triggerCount": 0,
  "updatedAt": new Date().toISOString(),
  "versionId": "1"
};

async function restoreWorkflow() {
  try {
    console.log('🚀 开始恢复n8n工作流...');
    
    // 创建新的工作流
    const response = await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows`,
      WORKFLOW_DEFINITION,
      {
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 工作流创建成功！');
    console.log('工作流ID:', response.data.id);
    console.log('工作流名称:', response.data.name);
    
    // 激活工作流
    const activateResponse = await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows/${response.data.id}/activate`,
      {},
      {
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 工作流激活成功！');
    console.log('🔗 Webhook URL: http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57');
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 恢复工作流失败:', error.response?.data || error.message);
    throw error;
  }
}

// 执行恢复
restoreWorkflow()
  .then((workflow) => {
    console.log('🎉 工作流恢复完成！');
    console.log('📋 工作流详情:');
    console.log('   - ID:', workflow.id);
    console.log('   - 名称:', workflow.name);
    console.log('   - 节点数:', workflow.nodes.length);
    console.log('   - 状态: 已激活');
    console.log('');
    console.log('🧪 测试命令:');
    console.log('curl -X POST http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57 \\');
    console.log('  -H "Content-Type: multipart/form-data" \\');
    console.log('  -F "file=@907九下月考成绩.csv"');
  })
  .catch((error) => {
    console.error('💥 恢复失败，请检查n8n服务状态和API密钥');
  }); 