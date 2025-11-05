const express = require('express');
const cors = require('cors');
const axios = require('axios');
const {
  securityHeaders,
  strictRateLimit,
  apiRateLimit,
  speedLimiter,
  validateInput,
  validateApiKey,
  requestSizeLimit,
  securityLogger,
  secureErrorHandler,
  ipWhitelist,
  schemas
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// 信任代理设置
app.set('trust proxy', 1);

// 1. 安全头配置（必须在最前面）
app.use(securityHeaders);

// 2. 请求日志记录
app.use(securityLogger);

// 3. 请求大小限制
app.use(requestSizeLimit);

// 4. 全局速度限制
app.use(speedLimiter);
app.use(strictRateLimit);

// 5. CORS配置 - 严格限制
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的前端域名
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite默认端口
      'https://your-domain.com' // 生产环境域名
    ];
    
    // 开发环境允许无origin（如Postman）
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY-ALERT] 未授权的CORS请求来源: ${origin}`);
      callback(new Error('CORS政策不允许该来源访问'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 300 // 缓存预检请求5分钟
};

app.use(cors(corsOptions));

// 6. JSON解析配置
app.use(express.json({
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

// IP白名单（可选，生产环境启用）
if (process.env.NODE_ENV === 'production') {
  const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
  app.use(ipWhitelist(allowedIPs));
}

// 健康检查接口（无需认证）
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API代理服务正常运行',
    timestamp: new Date().toISOString(),
    version: '2.0.0-secure'
  });
});

// API路由保护中间件
const protectApiRoutes = [
  apiRateLimit,
  validateApiKey
];

// 图片分析接口 - 增强安全验证
app.post('/api/analyze-image', 
  protectApiRoutes,
  validateInput(schemas.analyzeImage),
  async (req, res) => {
    try {
      const { imageUrl, prompt, provider, apiKey, modelId } = req.body;
      
      console.log(`[API] 图片分析请求: 提供商=${provider}, 模型=${modelId}, IP=${req.ip}`);
      
      // 验证图片URL安全性
      if (!isValidImageUrl(imageUrl)) {
        return res.status(400).json({
          error: true,
          message: '图片URL不安全或格式不支持'
        });
      }
      
      // OpenAI API请求
      if (provider === 'openai') {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'FigmaFrameFaithful/2.0'
        };
        
        const messages = [
          {
            role: 'system',
            content: sanitizePrompt(prompt || '分析这张图片并提取其中的知识点')
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ];
        
        const requestData = {
          model: modelId || 'gpt-4-vision-preview',
          messages,
          max_tokens: 2000,
          temperature: 0.3
        };
        
        console.log(`[API] 发送请求到OpenAI: 模型=${requestData.model}`);
        
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          requestData,
          { 
            headers,
            timeout: 30000, // 30秒超时
            maxRedirects: 0 // 禁止重定向
          }
        );
        
        console.log('[API] OpenAI图片分析响应成功');
        
        // 清理响应数据，移除敏感信息
        const cleanResponse = sanitizeApiResponse(response.data);
        res.json(cleanResponse);
        return;
      }
      
      res.status(400).json({
        error: true,
        message: `不支持的提供商: ${provider}`
      });
      
    } catch (error) {
      console.error('[API-ERROR] 图片分析错误:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        ip: req.ip
      });
      
      // 安全的错误响应
      const secureError = getSecureErrorResponse(error);
      res.status(secureError.status).json(secureError.body);
    }
  }
);

// 豆包API代理 - 增强安全验证
app.post('/api/proxy/doubao',
  protectApiRoutes,
  validateInput(schemas.proxyDoubao),
  async (req, res) => {
    try {
      const { model, messages, apiKey, apiId, temperature, max_tokens, stream } = req.body;
      
      console.log(`[API] 豆包API请求: 模型=${model}, IP=${req.ip}`);
      
      // 验证消息内容安全性
      if (!validateMessages(messages)) {
        return res.status(400).json({
          error: true,
          message: '消息内容包含不安全内容'
        });
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'FigmaFrameFaithful/2.0'
      };
      
      if (apiId) {
        headers['X-DashScope-API-ID'] = apiId;
      }
      
      const requestData = {
        model,
        messages: sanitizeMessages(messages),
        temperature,
        max_tokens,
        stream
      };
      
      console.log(`[API] 发送请求到豆包API: 模型=${model}`);
      
      const response = await axios.post(
        'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        requestData,
        { 
          headers,
          timeout: 60000, // 60秒超时
          maxRedirects: 0
        }
      );
      
      console.log('[API] 豆包API响应成功');
      
      const cleanResponse = sanitizeApiResponse(response.data);
      res.json(cleanResponse);
      
    } catch (error) {
      console.error('[API-ERROR] 豆包API代理错误:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        ip: req.ip
      });
      
      const secureError = getSecureErrorResponse(error);
      res.status(secureError.status).json(secureError.body);
    }
  }
);

// 通用API代理 - 严格限制
app.post('/api/proxy/:provider',
  protectApiRoutes,
  validateInput(schemas.genericProxy),
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { url, data, headers } = req.body;
      
      console.log(`[API] ${provider}API请求: ${url}, IP=${req.ip}`);
      
      // 验证目标URL白名单
      if (!isAllowedProxyUrl(url)) {
        return res.status(403).json({
          error: true,
          message: '目标URL不在允许的代理列表中'
        });
      }
      
      // 清理请求头
      const cleanHeaders = sanitizeHeaders(headers);
      
      const response = await axios.post(url, data, { 
        headers: cleanHeaders,
        timeout: 30000,
        maxRedirects: 0
      });
      
      console.log(`[API] ${provider}API响应成功`);
      
      const cleanResponse = sanitizeApiResponse(response.data);
      res.json(cleanResponse);
      
    } catch (error) {
      console.error(`[API-ERROR] ${req.params.provider}API代理错误:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        ip: req.ip
      });
      
      const secureError = getSecureErrorResponse(error);
      res.status(secureError.status).json(secureError.body);
    }
  }
);

// 404处理
app.use('*', (req, res) => {
  console.warn(`[SECURITY-ALERT] 404请求: ${req.method} ${req.originalUrl}, IP=${req.ip}`);
  res.status(404).json({
    error: true,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use(secureErrorHandler);

// 安全工具函数
function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // 只允许HTTPS和特定域名
    if (urlObj.protocol !== 'https:') return false;
    
    // 验证文件扩展名
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const pathname = urlObj.pathname.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
    
    return hasValidExtension;
  } catch {
    return false;
  }
}

function sanitizePrompt(prompt) {
  // 移除潜在的注入代码
  return prompt
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .substring(0, 1000); // 限制长度
}

function validateMessages(messages) {
  return messages.every(msg => {
    if (typeof msg.content !== 'string') return false;
    
    // 检查恶意内容
    const maliciousPatterns = [
      /javascript:/i,
      /<script/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i
    ];
    
    return !maliciousPatterns.some(pattern => pattern.test(msg.content));
  });
}

function sanitizeMessages(messages) {
  return messages.map(msg => ({
    ...msg,
    content: sanitizePrompt(msg.content)
  }));
}

function sanitizeHeaders(headers) {
  const allowedHeaders = [
    'content-type',
    'authorization',
    'x-api-key'
  ];
  
  const cleanHeaders = {};
  Object.keys(headers).forEach(key => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      cleanHeaders[key] = headers[key];
    }
  });
  
  return cleanHeaders;
}

function isAllowedProxyUrl(url) {
  const allowedDomains = [
    'api.openai.com',
    'ark.cn-beijing.volces.com',
    'api.anthropic.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return allowedDomains.includes(urlObj.hostname) && urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeApiResponse(data) {
  // 移除可能包含敏感信息的字段
  const { id, object, created, model, choices, usage } = data;
  return {
    id,
    object,
    created,
    model,
    choices: choices?.map(choice => ({
      index: choice.index,
      message: choice.message,
      finish_reason: choice.finish_reason
    })),
    usage
  };
}

function getSecureErrorResponse(error) {
  // 统一的安全错误响应
  if (error.response?.status === 401) {
    return {
      status: 401,
      body: { error: true, message: 'API密钥无效' }
    };
  } else if (error.response?.status === 429) {
    return {
      status: 429,
      body: { error: true, message: '请求频率过高，请稍后重试' }
    };
  } else if (error.code === 'ECONNABORTED') {
    return {
      status: 408,
      body: { error: true, message: '请求超时' }
    };
  } else {
    return {
      status: 500,
      body: { 
        error: true, 
        message: '服务暂时不可用，请稍后重试',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[SERVER] 收到SIGTERM信号，正在优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SERVER] 收到SIGINT信号，正在优雅关闭...');
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`[SERVER] API代理服务器启动成功 - 端口: ${PORT}`);
  console.log(`[SERVER] 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('[SERVER] 安全功能已启用: ');
  console.log('  ✓ 安全请求头');
  console.log('  ✓ 速率限制');
  console.log('  ✓ 输入验证');
  console.log('  ✓ CORS保护');
  console.log('  ✓ 请求大小限制');
  console.log('  ✓ 安全日志记录');
  console.log(`[SERVER] 可用的安全端点:`);
  console.log(`  - 健康检查: http://localhost:${PORT}/health`);
  console.log(`  - 图片分析: http://localhost:${PORT}/api/analyze-image`);
  console.log(`  - 豆包代理: http://localhost:${PORT}/api/proxy/doubao`);
  console.log(`  - 通用代理: http://localhost:${PORT}/api/proxy/:provider`);
});