const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const Joi = require('joi');

// 安全头配置
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://ark.cn-beijing.volces.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// 严格的请求频率限制
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: {
    error: true,
    message: '请求过于频繁，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API端点特定限制
const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 10, // 每分钟最多10次API调用
  message: {
    error: true,
    message: 'API调用频率过高，请1分钟后再试'
  },
  keyGenerator: (req) => {
    return req.ip + ':' + (req.headers['x-api-key'] || '');
  }
});

// 慢速攻击防护
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15分钟
  delayAfter: 50, // 前50个请求正常
  delayMs: 500 // 之后每个请求延迟500ms
});

// 输入验证schema
const schemas = {
  analyzeImage: Joi.object({
    imageUrl: Joi.string().uri().required().max(2048),
    prompt: Joi.string().max(1000).default('分析这张图片'),
    provider: Joi.string().valid('openai').required(),
    apiKey: Joi.string().pattern(/^sk-[A-Za-z0-9-_]{32,}$/).required(),
    modelId: Joi.string().max(100).default('gpt-4-vision-preview')
  }),
  
  proxyDoubao: Joi.object({
    model: Joi.string().required().max(100),
    messages: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('system', 'user', 'assistant').required(),
        content: Joi.string().required().max(10000)
      })
    ).required().max(20),
    apiKey: Joi.string().required().max(200),
    apiId: Joi.string().max(200),
    temperature: Joi.number().min(0).max(2).default(0.7),
    max_tokens: Joi.number().min(1).max(4000).default(2000),
    stream: Joi.boolean().default(false)
  }),
  
  genericProxy: Joi.object({
    url: Joi.string().uri().required().max(1000),
    data: Joi.object().required(),
    headers: Joi.object().pattern(
      Joi.string(),
      Joi.string().max(1000)
    )
  })
};

// 输入验证中间件
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        error: true,
        message: '输入验证失败',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};

// API密钥验证中间件
const validateApiKey = (req, res, next) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(401).json({
      error: true,
      message: '缺少API密钥'
    });
  }
  
  // 检查API密钥格式（基本验证）
  if (typeof apiKey !== 'string' || apiKey.length < 20) {
    return res.status(401).json({
      error: true,
      message: 'API密钥格式无效'
    });
  }
  
  next();
};

// 请求大小限制
const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > MAX_SIZE) {
    return res.status(413).json({
      error: true,
      message: '请求体过大，最大允许10MB'
    });
  }
  
  next();
};

// 安全日志记录
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 记录安全相关信息
    console.log(`[SECURITY] ${new Date().toISOString()} - ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
      contentLength: req.headers['content-length'] || '0'
    });
    
    // 记录可疑请求
    if (responseTime > 5000 || res.statusCode >= 400) {
      console.warn(`[SECURITY-ALERT] 可疑请求:`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent']
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// 错误处理中间件
const secureErrorHandler = (err, req, res, next) => {
  console.error(`[SECURITY-ERROR] ${new Date().toISOString()}:`, {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    path: req.path,
    method: req.method
  });
  
  // 不暴露内部错误详情
  res.status(500).json({
    error: true,
    message: '服务器内部错误',
    timestamp: new Date().toISOString()
  });
};

// IP白名单验证（可选）
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // 如果没有设置白名单，跳过验证
    }
    
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP)) {
      console.warn(`[SECURITY-ALERT] IP未授权访问: ${clientIP}`);
      return res.status(403).json({
        error: true,
        message: '访问被拒绝'
      });
    }
    
    next();
  };
};

module.exports = {
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
};