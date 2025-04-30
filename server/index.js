const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json({limit: '10mb'})); // 增加限制以支持大型图片

// 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API代理服务正常运行' });
});

// 图片分析接口
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageUrl, prompt, provider, apiKey, modelId } = req.body;
    
    console.log(`接收到图片分析请求: 提供商=${provider}, 模型=${modelId}`);
    
    // 验证必要参数
    if (!imageUrl) {
      return res.status(400).json({ 
        error: true, 
        message: '缺少必要参数: imageUrl' 
      });
    }
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: true, 
        message: '缺少必要参数: apiKey' 
      });
    }
    
    // 构建OpenAI请求格式
    if (provider === 'openai') {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      const messages = [
        {
          role: 'system',
          content: prompt || '分析这张图片并提取其中的知识点'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ];
      
      const requestData = {
        model: modelId || 'gpt-4-vision-preview',
        messages,
        max_tokens: 2000
      };
      
      console.log('发送请求到OpenAI:', {
        model: requestData.model,
        messageCount: messages.length
      });
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        requestData,
        { headers }
      );
      
      console.log('OpenAI图片分析响应成功');
      res.json(response.data);
      return;
    }
    
    // 其他提供商的处理逻辑...
    res.status(400).json({
      error: true,
      message: `不支持的提供商: ${provider}`
    });
    
  } catch (error) {
    console.error('图片分析错误:', error.message);
    
    // 打印更详细的错误信息
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    
    res.status(500).json({
      error: true,
      message: error.message,
      details: error.response?.data || '未知错误'
    });
  }
});

// 豆包API代理
app.post('/api/proxy/doubao', async (req, res) => {
  try {
    const { model, messages, apiKey, apiId } = req.body;
    
    console.log(`接收到豆包API请求: 模型=${model}`);
    
    // 验证必要的参数
    if (!model) {
      console.error('缺少必要参数: model');
      return res.status(400).json({ 
        error: true, 
        message: '缺少必要参数: model' 
      });
    }
    
    if (!apiKey) {
      console.error('缺少必要参数: apiKey');
      return res.status(400).json({ 
        error: true, 
        message: '缺少必要参数: apiKey' 
      });
    }
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // 如果提供了API ID，添加到请求头
    if (apiId) {
      console.log(`使用API ID: ${apiId.substring(0, 4)}...`);
      headers['X-DashScope-API-ID'] = apiId;
    }
    
    console.log('认证头格式:', headers.Authorization.startsWith('Bearer ') ? 'Bearer格式' : '非Bearer格式');
    
    // 构建请求数据
    const requestData = {
      model,
      messages,
      temperature: req.body.temperature || 0.7,
      max_tokens: req.body.max_tokens || 2000,
      stream: req.body.stream || false
    };
    
    console.log('发送请求到豆包API:', {
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      model,
      messageCount: messages.length,
      headers: {
        'Content-Type': headers['Content-Type'],
        'Authorization': '********', // 隐藏实际密钥
        ...(apiId ? { 'X-DashScope-API-ID': '********' } : {})
      }
    });
    
    // 发送请求到豆包API
    const response = await axios.post(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      requestData,
      { headers }
    );
    
    console.log('豆包API响应成功');
    res.json(response.data);
  } catch (error) {
    console.error('豆包API代理错误:', error.message);
    
    // 打印更详细的错误信息
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应头:', error.response.headers);
      console.error('响应数据:', error.response.data);
    }
    
    // 返回详细错误信息
    res.status(500).json({
      error: true,
      message: error.message,
      details: error.response?.data || '未知错误',
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
});

// 通用API代理
app.post('/api/proxy/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { url, data, headers } = req.body;
    
    console.log(`接收到${provider}API请求`);
    
    // 发送请求到目标API
    const response = await axios.post(
      url,
      data,
      { headers }
    );
    
    console.log(`${provider}API响应成功`);
    res.json(response.data);
  } catch (error) {
    console.error(`${req.params.provider}API代理错误:`, error.message);
    
    res.status(500).json({
      error: true,
      message: error.message,
      details: error.response?.data || '未知错误'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`API代理服务器运行在 http://localhost:${PORT}`);
  console.log('可用的代理端点:');
  console.log(`- 豆包API: http://localhost:${PORT}/api/proxy/doubao`);
  console.log(`- 通用API: http://localhost:${PORT}/api/proxy/:provider`);
  console.log(`- 健康检查: http://localhost:${PORT}/health`);
}); 