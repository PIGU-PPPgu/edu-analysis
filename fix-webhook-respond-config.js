import axios from 'axios';

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNzY0NTFkYy1jNGJjLTQ1M2ItOTBhNy05MTU1YjYzZTg0MzkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzQ5ODg3NDc2LCJleHAiOjE3NTI0NjU2MDB9.hsRUMthJk6MGh4tSuGChUorBbvQY75IBOKa9wNNsOng';
const N8N_BASE_URL = 'http://localhost:5678/api/v1';
const WORKFLOW_ID = 'TX3mvXbjU0z6PdDm';

const headers = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json'
};

async function fixWebhookRespond() {
  try {
    console.log('🔍 获取当前工作流配置...');
    
    // 获取工作流详情
    const response = await axios.get(`${N8N_BASE_URL}/workflows/${WORKFLOW_ID}`, { headers });
    const workflow = response.data;
    
    console.log('📋 当前工作流节点数量:', workflow.nodes.length);
    
    // 查找Webhook节点
    const webhookNode = workflow.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    if (!webhookNode) {
      console.log('❌ 未找到Webhook节点');
      return;
    }
    
    console.log('🎯 找到Webhook节点:', webhookNode.name);
    console.log('📊 当前Respond配置:', webhookNode.parameters?.respond);
    
    // 修复Webhook节点的Respond配置
    if (!webhookNode.parameters) {
      webhookNode.parameters = {};
    }
    
    // 设置为使用Respond to Webhook Node
    webhookNode.parameters.respond = 'respondToWebhook';
    
    console.log('🔧 修复Webhook节点配置...');
    console.log('✅ 设置Respond参数为: respondToWebhook');
    
    // 更新工作流
    const updateResponse = await axios.put(`${N8N_BASE_URL}/workflows/${WORKFLOW_ID}`, workflow, { headers });
    
    if (updateResponse.status === 200) {
      console.log('✅ 工作流配置已成功更新!');
      console.log('🎉 Webhook节点的Respond配置已修复');
      
      // 尝试激活工作流
      console.log('🚀 尝试激活工作流...');
      try {
        const activateResponse = await axios.post(`${N8N_BASE_URL}/workflows/${WORKFLOW_ID}/activate`, {}, { headers });
        if (activateResponse.status === 200) {
          console.log('🎉 工作流已成功激活!');
        }
      } catch (activateError) {
        console.log('⚠️ 激活工作流时出现问题:', activateError.response?.data?.message || activateError.message);
      }
    } else {
      console.log('❌ 更新工作流失败');
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.response?.data || error.message);
  }
}

// 运行修复
fixWebhookRespond(); 