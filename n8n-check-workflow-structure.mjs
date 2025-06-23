#!/usr/bin/env node

/**
 * n8n工作流结构检查脚本
 * 检查工作流 hdvsS4C8zIFfruqD 的详细结构
 */

import axios from 'axios';

// n8n配置
const N8N_BASE_URL = 'http://localhost:5678';
const WORKFLOW_ID = 'hdvsS4C8zIFfruqD';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5OTE2MDM3LCJleHAiOjE3NTI0NjU2MDB9.sIc0OGZbAevld3vGNlwT_UGh5sOINJMk2ABktcqiuag';

// 创建axios实例
const api = axios.create({
  baseURL: N8N_BASE_URL,
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
});

async function main() {
  try {
    console.log('🔍 检查n8n工作流结构...');
    console.log(`📋 工作流ID: ${WORKFLOW_ID}`);
    
    // 获取工作流详情
    const workflowResponse = await api.get(`/api/v1/workflows/${WORKFLOW_ID}`);
    const workflow = workflowResponse.data;
    
    console.log('\n📊 工作流基本信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`名称: ${workflow.name}`);
    console.log(`ID: ${workflow.id}`);
    console.log(`状态: ${workflow.active ? '激活' : '未激活'}`);
    console.log(`节点数: ${workflow.nodes.length}`);
    console.log(`连接数: ${Object.keys(workflow.connections || {}).length}`);
    
    console.log('\n🔧 节点详细信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    workflow.nodes.forEach((node, index) => {
      console.log(`\n${index + 1}. 节点: ${node.name}`);
      console.log(`   类型: ${node.type}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   位置: [${node.position[0]}, ${node.position[1]}]`);
      
      if (node.parameters && Object.keys(node.parameters).length > 0) {
        console.log(`   参数:`);
        Object.entries(node.parameters).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            console.log(`     ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
          } else {
            console.log(`     ${key}: ${value}`);
          }
        });
      }
    });
    
    console.log('\n🔗 连接信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (workflow.connections && Object.keys(workflow.connections).length > 0) {
      Object.entries(workflow.connections).forEach(([nodeId, connections]) => {
        const nodeName = workflow.nodes.find(n => n.id === nodeId)?.name || nodeId;
        console.log(`从 "${nodeName}" 的连接:`);
        
        Object.entries(connections).forEach(([outputIndex, outputs]) => {
          outputs.forEach((output, idx) => {
            const targetNode = workflow.nodes.find(n => n.id === output.node)?.name || output.node;
            console.log(`  输出${outputIndex} → "${targetNode}" 输入${output.input}`);
          });
        });
      });
    } else {
      console.log('没有节点连接');
    }
    
    // 检查是否有Webhook节点
    const webhookNode = workflow.nodes.find(node => 
      node.type === 'n8n-nodes-base.webhook'
    );
    
    if (webhookNode) {
      console.log('\n🌐 Webhook信息:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Webhook路径: ${webhookNode.parameters?.path || '未设置'}`);
      console.log(`HTTP方法: ${webhookNode.parameters?.httpMethod || '未设置'}`);
      console.log(`响应模式: ${webhookNode.parameters?.responseMode || '未设置'}`);
      
      if (webhookNode.parameters?.path) {
        console.log(`完整URL: http://localhost:5678/webhook/${webhookNode.parameters.path}`);
      }
    }
    
    console.log('\n💡 建议的完善方案:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (workflow.nodes.length < 6) {
      console.log('🔧 当前工作流节点较少，建议添加以下节点:');
      
      const hasWebhook = workflow.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
      const hasCode = workflow.nodes.some(n => n.type === 'n8n-nodes-base.code');
      const hasExtractor = workflow.nodes.some(n => n.type.includes('informationExtractor'));
      const hasSupabase = workflow.nodes.some(n => n.type.includes('supabase'));
      const hasRespond = workflow.nodes.some(n => n.type === 'n8n-nodes-base.respondToWebhook');
      
      if (!hasWebhook) console.log('  ❌ 缺少 Webhook 节点');
      if (!hasCode) console.log('  ❌ 缺少 Code 节点 (CSV预处理)');
      if (!hasExtractor) console.log('  ❌ 缺少 Information Extractor 节点');
      if (!hasSupabase) console.log('  ❌ 缺少 Supabase 节点');
      if (!hasRespond) console.log('  ❌ 缺少 Respond to Webhook 节点');
      
      console.log('\n🚀 我可以帮您自动添加缺失的节点！');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:');
    console.error('错误信息:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行主函数
main().catch(console.error); 