# 🚀 Supabase Edge Functions 部署指南

## 📋 概述

本文档说明如何将本地后端重构为Supabase Edge Functions的无服务器架构。

## 🏗️ 架构变更

### 旧架构
```
前端(8081) ──代理──> 本地后端(3001) ──HTTP──> 外部API
     │                        │
     └── Supabase ←───────────┘
```

### 新架构
```
前端 ──supabase.functions.invoke──> Supabase Edge Functions ──HTTP──> 外部API
  │                                          │
  └─────────── Supabase DB ←─────────────────┘
```

## 📁 Edge Functions 文件结构

```
supabase/
└── functions/
    ├── test-wechat/
    │   └── index.ts          # 企业微信测试函数
    └── analyze-grades/
        └── index.ts          # 成绩分析函数
```

## 🛠️ 部署步骤

### 1. 安装Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 其他平台参见: https://supabase.com/docs/guides/cli
```

### 2. 登录并链接项目

```bash
# 登录Supabase
supabase login

# 链接到现有项目
supabase link --project-ref giluhqotfjpmofowvogn
```

### 3. 设置环境变量

```bash
# 创建环境变量文件
cat > supabase/.env.local << EOF
DEEPSEEK_API_KEY=your_deepseek_api_key_here
SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF
```

### 4. 部署Edge Functions

```bash
# 部署企业微信测试函数
supabase functions deploy test-wechat --no-verify-jwt

# 部署成绩分析函数
supabase functions deploy analyze-grades --no-verify-jwt
```

### 5. 设置秘钥

```bash
# 设置DeepSeek API密钥
supabase secrets set DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 设置Supabase配置
supabase secrets set SUPABASE_URL=https://giluhqotfjpmofowvogn.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🔧 前端更新

### 已更新的文件

1. **`src/services/wechatSettingsService.ts`**
   - 更新`testWechatWebhook`函数使用`supabase.functions.invoke('test-wechat')`

2. **`src/components/analysis/AutoAnalysisTrigger.tsx`**
   - 更新分析触发逻辑使用`supabase.functions.invoke('analyze-grades')`
   - 添加成绩数据获取函数
   - 添加智能分析类型选择

### 调用示例

```typescript
// 企业微信测试
const { data, error } = await supabase.functions.invoke('test-wechat', {
  body: { webhook_url: 'https://qyapi.weixin.qq.com/...' }
});

// 成绩分析
const { data, error } = await supabase.functions.invoke('analyze-grades', {
  body: {
    exam_title: '期中考试',
    class_name: '高一1班',
    analysis_type: 'detailed',
    grade_data: 'csv格式的成绩数据',
    enable_wechat_push: true,
    webhook_url: 'https://qyapi.weixin.qq.com/...'
  }
});
```

## 🗄️ 数据库更新

需要创建以下表（如果不存在）：

```sql
-- 分析结果存储表
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_title TEXT NOT NULL,
  class_name TEXT,
  analysis_type TEXT NOT NULL,
  result_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analysis_results_exam_title ON analysis_results(exam_title);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at);
```

## 📋 验证部署

### 1. 检查函数状态

```bash
# 列出已部署的函数
supabase functions list
```

### 2. 测试函数

```bash
# 测试企业微信函数
curl -X POST "https://giluhqotfjpmofowvogn.supabase.co/functions/v1/test-wechat" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test"}'

# 测试分析函数
curl -X POST "https://giluhqotfjpmofowvogn.supabase.co/functions/v1/analyze-grades" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"exam_title": "测试", "grade_data": "姓名,总分\n张三,85", "analysis_type": "simple"}'
```

### 3. 前端验证

1. 访问AI设置页面，测试企业微信连接
2. 导入成绩数据，观察自动分析是否触发
3. 检查Supabase函数日志：`supabase functions logs`

## 🧹 清理旧架构

部署成功后，可以清理以下内容：

### 1. 移除本地后端文件

```bash
# 停止本地服务器
pkill -f "node.*server"

# 删除服务器文件（可选）
rm -rf server/
```

### 2. 移除前端代理配置

```typescript
// vite.config.ts - 移除proxy配置
server: {
  // 移除这部分
  // proxy: {
  //   '/api': {
  //     target: 'http://localhost:3001',
  //     changeOrigin: true,
  //     secure: false,
  //   },
  // },
}
```

### 3. 更新环境变量

移除不需要的本地服务器环境变量。

## 🎯 优势总结

✅ **无服务器**: 无需维护本地后端服务器  
✅ **自动扩缩容**: Supabase自动处理负载  
✅ **无CORS问题**: 服务端到服务端调用  
✅ **简化部署**: 只需部署前端应用  
✅ **更好的安全性**: API密钥存储在Supabase Secrets中  
✅ **统一管理**: 数据库和函数都在Supabase平台上  

## 🔍 监控和调试

```bash
# 查看函数日志
supabase functions logs test-wechat
supabase functions logs analyze-grades

# 实时日志
supabase functions logs --follow
```

## 🚨 注意事项

1. **API密钥安全**: 确保在生产环境中使用Supabase Secrets
2. **函数超时**: Edge Functions有时间限制，大规模分析可能需要优化
3. **错误处理**: 确保前端正确处理Edge Function的错误响应
4. **成本控制**: 监控Edge Function的调用次数和资源使用

---

**部署完成后记得测试所有功能！** 🎉