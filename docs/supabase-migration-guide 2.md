# Supabase迁移指南

本指南将帮助您将学生画像系统从Supabase迁移到自己的服务器。

## 目录

1. [迁移前准备](#迁移前准备)
2. [数据库迁移](#数据库迁移)
3. [边缘函数替代方案](#边缘函数替代方案)
4. [身份验证迁移](#身份验证迁移)
5. [存储服务迁移](#存储服务迁移)
6. [前端代码调整](#前端代码调整)
7. [环境变量配置](#环境变量配置)
8. [测试与部署](#测试与部署)

## 迁移前准备

### 导出Supabase数据和架构

1. 使用Supabase CLI工具导出数据库架构：

```bash
# 安装Supabase CLI（如果尚未安装）
npm install -g supabase

# 登录Supabase
supabase login

# 导出项目的数据库架构
supabase db dump -p your-project-ref > schema.sql
```

2. 导出存储的文件：

```bash
# 使用Supabase Storage API下载所有文件
supabase storage download
```

3. 获取Supabase项目的相关信息：
   - 项目ID
   - 数据库连接串
   - API URL
   - 当前使用的表名和字段结构

## 数据库迁移

### 设置PostgreSQL数据库

1. 在自己的服务器上安装PostgreSQL：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

2. 创建数据库和用户：

```sql
CREATE DATABASE student_portrait;
CREATE USER portrait_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE student_portrait TO portrait_user;
```

3. 导入数据库架构：

```bash
psql -U portrait_user -d student_portrait -f schema.sql
```

4. 导入数据（如果有导出的数据）：

```bash
psql -U portrait_user -d student_portrait -f data.sql
```

### 修改数据库架构

由于Supabase的RLS（行级安全）和身份验证依赖于Supabase特定的schema，我们需要调整数据库架构：

1. 删除Supabase特定的RLS策略：

```sql
DROP POLICY IF EXISTS view_student_portraits ON student_portraits;
DROP POLICY IF EXISTS students_view_own_portraits ON student_portraits;
DROP POLICY IF EXISTS teachers_update_portraits ON student_portraits;
DROP POLICY IF EXISTS teachers_insert_portraits ON student_portraits;
-- 删除其他RLS策略
```

2. 创建自定义的权限控制表和存储过程（根据您的权限系统调整）：

```sql
-- 创建自定义权限表（示例）
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_type VARCHAR(255),
  resource_id VARCHAR(255),
  permission VARCHAR(50),
  UNIQUE (user_id, resource_type, resource_id, permission)
);

-- 创建检查权限的函数（示例）
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, resource_type VARCHAR, resource_id VARCHAR, required_permission VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = $1 
    AND resource_type = $2 
    AND (resource_id = $3 OR resource_id = '*')
    AND permission = $4
  );
END;
$$ LANGUAGE plpgsql;
```

## 边缘函数替代方案

### 设置Node.js后端服务

1. 创建一个基于Express.js的API服务：

```bash
# 创建新的Node.js项目
mkdir portrait-backend
cd portrait-backend
npm init -y

# 安装依赖
npm install express cors pg dotenv axios
npm install -D typescript ts-node @types/express @types/pg @types/cors
```

2. 创建项目结构：

```
portrait-backend/
├── src/
│   ├── config/
│   │   └── database.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── portraitController.ts
│   ├── middlewares/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   └── portrait.ts
│   ├── services/
│   │   ├── aiService.ts
│   │   └── portraitService.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

3. 实现Supabase Edge Function替代方案：

```typescript
// src/services/aiService.ts
import axios from 'axios';
import { Request, Response } from 'express';

export async function generateStudentProfile(req: Request, res: Response) {
  try {
    const { studentName, studentId, scores, aiConfig } = req.body;
    
    if (!aiConfig || !aiConfig.provider || !aiConfig.apiKey) {
      return res.status(400).json({ error: "缺少 AI 配置信息" });
    }

    // 准备AI模型的提示词
    const prompt = `分析以下学生的学习数据并生成个性化画像标签:

学生姓名: ${studentName}
学生ID: ${studentId}

科目成绩明细:
${scores.map((score: any) => `${score.subject}: ${score.score}`).join('\n')}

请生成以下四个分类的标签:
1. 学习风格 (3个标签)
2. 优势领域 (3个标签)
3. 提升空间 (3个标签)
4. 性格特质 (3个标签)

每个分类的标签应简洁明了，最多3-4个字。返回的格式必须是JSON对象。`;

    // 根据不同的AI服务提供商调用API
    let responseData;
    switch (aiConfig.provider) {
      case "openai":
        // 调用OpenAI API
        responseData = await callOpenAI(prompt, aiConfig);
        break;
      case "anthropic":
        // 调用Anthropic API
        responseData = await callAnthropic(prompt, aiConfig);
        break;
      // 添加其他AI提供商的处理
      default:
        return res.status(400).json({ error: `不支持的AI提供商: ${aiConfig.provider}` });
    }

    return res.status(200).json({ tags: responseData });
  } catch (error) {
    console.error('Error generating profile:', error);
    return res.status(500).json({ 
      error: '无法生成学生画像',
      details: error.message 
    });
  }
}

// OpenAI API调用实现
async function callOpenAI(prompt: string, aiConfig: any) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: aiConfig.version || 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`
      }
    }
  );

  return JSON.parse(response.data.choices[0].message.content);
}

// Anthropic API调用实现
async function callAnthropic(prompt: string, aiConfig: any) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: aiConfig.version || 'claude-3-sonnet-20240229',
      system: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiConfig.apiKey,
        'anthropic-version': '2023-06-01'
      }
    }
  );

  return JSON.parse(response.data.content[0].text);
}
```

4. 创建API入口点：

```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import portraitRoutes from './routes/portrait';
import authRoutes from './routes/auth';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/portrait', portraitRoutes);

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
```

## 身份验证迁移

### 实现自定义身份验证系统

1. 安装必要依赖：

```bash
npm install jsonwebtoken bcrypt cookie-parser
npm install -D @types/jsonwebtoken @types/bcrypt @types/cookie-parser
```

2. 实现身份验证控制器：

```typescript
// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/database';

// 用户登录
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // 从数据库获取用户
    const userResult = await db.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码不正确' });
    }

    const user = userResult.rows[0];

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码不正确' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 返回用户信息和令牌
    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 用户注册
export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body;

    // 检查用户是否已存在
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role || 'student']
    );

    // 生成JWT令牌
    const token = jwt.sign(
      { 
        id: newUser.rows[0].id, 
        email: newUser.rows[0].email,
        role: newUser.rows[0].role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 返回用户信息和令牌
    res.status(201).json({
      token,
      user: {
        id: newUser.rows[0].id,
        name: newUser.rows[0].name,
        email: newUser.rows[0].email,
        role: newUser.rows[0].role
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 验证当前用户
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      const userResult = await db.query(
        'SELECT id, name, email, role FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      res.status(200).json({ user: userResult.rows[0] });
    } catch (error) {
      return res.status(401).json({ error: '令牌无效或已过期' });
    }
  } catch (error) {
    console.error('获取当前用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}
```

3. 添加认证中间件：

```typescript
// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

export function authorize(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未授权' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    next();
  };
}
```

## 存储服务迁移

### 设置文件存储服务

1. 选择存储解决方案：
   - 本地文件存储（简单项目）
   - 对象存储服务，如MinIO（自托管S3兼容服务）
   - 第三方云存储，如阿里云OSS或腾讯云COS

2. 使用MinIO作为示例：

```bash
# 安装MinIO（Docker方式）
docker run -p 9000:9000 -p 9001:9001 \
  --name minio \
  -v /path/to/data:/data \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

3. 添加文件上传和下载API：

```typescript
// src/controllers/fileController.ts
import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// 配置S3客户端（可以连接到MinIO）
const s3Client = new S3Client({
  region: 'us-east-1', // MinIO不关心这个值
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
  },
  forcePathStyle: true // 必须为MinIO设置
});

// 文件上传
export async function uploadFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' });
    }
    
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const bucketName = process.env.S3_BUCKET || 'student-portraits';
    
    // 上传到S3/MinIO
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // 返回文件信息
    res.status(200).json({
      fileName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `${process.env.S3_PUBLIC_URL || 'http://localhost:9000'}/${bucketName}/${fileName}`
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
}

// 获取文件下载链接
export async function getFileUrl(req: Request, res: Response) {
  try {
    const { fileName } = req.params;
    const bucketName = process.env.S3_BUCKET || 'student-portraits';
    
    // 创建预签名URL
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.status(200).json({ url: signedUrl });
  } catch (error) {
    console.error('获取文件链接失败:', error);
    res.status(500).json({ error: '获取文件链接失败' });
  }
}
```

## 前端代码调整

修改前端代码，以适应新的后端API：

1. 创建新的API客户端：

```typescript
// src/lib/api/client.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器，用于添加认证信息
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
```

2. 更新portrait.ts API文件：

```typescript
// src/lib/api/portrait.ts

// ... 保持现有接口定义不变 ...

class PortraitAPI {
  private cache: Map<string, {data: any, timestamp: number}> = new Map();
  private CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存有效期
  
  // ... 保持现有缓存方法不变 ...
  
  /**
   * 获取班级画像统计数据
   */
  async getClassPortraitStats(classId: string): Promise<ClassPortraitStats | null> {
    try {
      const cacheKey = `class_stats_${classId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      // 使用新的API客户端
      const response = await apiClient.get(`/portrait/class/${classId}/stats`);
      const stats = response.data;
      
      this.updateCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('获取班级画像统计数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取班级所有学生基本信息
   */
  async getClassStudents(classId: string): Promise<StudentPortraitData[]> {
    try {
      const cacheKey = `class_students_${classId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)!.data;
      }
      
      // 使用新的API客户端
      const response = await apiClient.get(`/portrait/class/${classId}/students`);
      const students = response.data;
      
      this.updateCache(cacheKey, students);
      return students;
    } catch (error) {
      console.error('获取班级学生列表失败:', error);
      return [];
    }
  }
  
  // ... 类似地修改其他方法 ...
  
  /**
   * 使用AI生成学生画像标签
   */
  async generateAIPortraitTags(
    studentId: string, 
    aiConfig: {
      provider: string;
      version: string;
      apiKey: string;
      customProviders?: string;
    }
  ): Promise<{
    learningStyle: string[];
    strengths: string[];
    improvements: string[];
    personalityTraits: string[];
  } | null> {
    try {
      // 使用新的API客户端
      const response = await apiClient.post(`/portrait/student/${studentId}/generate-tags`, {
        aiConfig
      });
      
      const aiTags = response.data.tags;
      
      // 更新缓存
      const cacheKey = `student_portrait_${studentId}`;
      if (this.isCacheValid(cacheKey)) {
        const cachedData = this.cache.get(cacheKey)!.data;
        this.updateCache(cacheKey, {
          ...cachedData,
          aiTags
        });
      }
      
      return aiTags;
    } catch (error) {
      console.error("生成AI标签失败:", error);
      throw error;
    }
  }
  
  /**
   * 保存教师自定义标签
   */
  async saveCustomTags(studentId: string, customTags: string[]): Promise<void> {
    try {
      // 使用新的API客户端
      await apiClient.post(`/portrait/student/${studentId}/custom-tags`, {
        customTags
      });
      
      // 更新缓存
      const cacheKey = `student_portrait_${studentId}`;
      if (this.isCacheValid(cacheKey)) {
        const cachedData = this.cache.get(cacheKey)!.data;
        this.updateCache(cacheKey, {
          ...cachedData,
          customTags
        });
      }
    } catch (error) {
      console.error("保存自定义标签失败:", error);
      throw error;
    }
  }
}

// 导出单例实例
export const portraitAPI = new PortraitAPI();
```

3. 更新身份验证相关代码：

```typescript
// src/lib/auth.ts
import apiClient from './api/client';

export async function login(email: string, password: string) {
  const response = await apiClient.post('/auth/login', { email, password });
  const { token, user } = response.data;
  
  // 保存令牌和用户信息
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  return user;
}

export async function register(userData: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  const response = await apiClient.post('/auth/register', userData);
  const { token, user } = response.data;
  
  // 保存令牌和用户信息
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  return user;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

export async function refreshUserInfo() {
  try {
    const response = await apiClient.get('/auth/me');
    const { user } = response.data;
    
    // 更新本地存储的用户信息
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('刷新用户信息失败:', error);
    // 如果令牌已过期，则登出
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      logout();
    }
    return null;
  }
}
```

## 环境变量配置

1. 创建后端环境变量文件 (.env)：

```
# 服务器配置
PORT=3001
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=portrait_user
DB_PASSWORD=your_secure_password
DB_NAME=student_portrait

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES=24h

# 存储配置 (MinIO/S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=student-portraits
S3_PUBLIC_URL=http://localhost:9000
```

2. 创建前端环境变量文件 (.env.production)：

```
VITE_API_URL=http://your-api-server.com/api
```

## 测试与部署

### 本地测试

1. 启动后端服务：

```bash
cd portrait-backend
npm run dev
```

2. 启动前端应用：

```bash
cd ../figma-frame-faithful-front
npm run dev
```

3. 测试所有功能是否正常工作

### 部署到生产环境

1. 后端部署：

```bash
# 构建后端
cd portrait-backend
npm run build

# 使用PM2管理服务
npm install -g pm2
pm2 start dist/index.js --name portrait-api
```

2. 前端部署：

```bash
# 构建前端
cd ../figma-frame-faithful-front
npm run build

# 部署到Nginx或其他Web服务器
```

3. 配置Nginx：

```nginx
# Nginx配置示例
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 迁移注意事项

1. **数据导出导入**：确保在迁移前完整导出并备份所有数据
2. **安全性**：更换所有密钥和敏感信息，不要使用Supabase的任何密钥
3. **分阶段迁移**：可以先部署新服务，然后逐步将流量从Supabase迁移到新服务
4. **监控**：增加监控和日志记录，以便在迁移过程中及时发现问题
5. **数据同步**：如果需要平滑过渡，可以实现临时的数据同步机制
6. **用户通知**：如果有必要，在迁移前通知用户可能的服务中断 