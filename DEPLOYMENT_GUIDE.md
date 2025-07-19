# 🚀 部署指南 v1.4.0

## 📋 部署前准备

### 1. 环境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Supabase项目**: 已配置数据库和Edge Functions
- **AI API**: DeepSeek、Anthropic等API密钥

### 2. 依赖检查
```bash
# 检查Node版本
node --version

# 检查npm版本
npm --version

# 安装依赖
npm install

# 检查安全漏洞
npm audit
```

## 🔧 环境配置

### 1. 创建环境变量文件
```bash
# 复制模板文件
cp .env.hooks.template .env.hooks

# 编辑配置
nano .env.hooks
```

### 2. 必需的环境变量
```bash
# DeepSeek AI
DEEPSEEK_API_KEY=your_deepseek_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 机器人Webhooks
WECHAT_WORK_WEBHOOK=your_wechat_webhook
DINGTALK_WEBHOOK=your_dingtalk_webhook
```

## 🗄️ 数据库设置

### 1. 创建必要的表
```sql
-- 用户分析偏好表
CREATE TABLE IF NOT EXISTS user_analysis_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL DEFAULT 'detailed',
    preferred_model TEXT NOT NULL DEFAULT 'deepseek-reasoner',
    auto_trigger_enabled BOOLEAN DEFAULT true,
    focus_mode TEXT DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 机器人设置表
CREATE TABLE IF NOT EXISTS bot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_type TEXT NOT NULL CHECK (bot_type IN ('wechat', 'dingtalk')),
    bot_name TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. 部署Edge Functions
```bash
# 登录Supabase
npx supabase login

# 部署分析函数
npx supabase functions deploy analyze-grades

# 部署触发器函数
npx supabase functions deploy grade-analysis-trigger

# 验证部署
npx supabase functions list
```

### 3. 设置数据库触发器
```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION trigger_grade_analysis_edge()
RETURNS TRIGGER AS $$
-- [详细触发器代码请参考项目文件]
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER grade_analysis_auto_trigger
    AFTER INSERT ON grade_data_new
    FOR EACH ROW
    EXECUTE FUNCTION trigger_grade_analysis_edge();
```

## 🌐 前端部署

### 1. 构建项目
```bash
# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### 2. 部署到Vercel
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 配置环境变量
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### 3. 部署到Netlify
```bash
# 构建并部署
npm run build
netlify deploy --prod --dir=dist
```

## 🔧 Supabase配置

### 1. RLS策略设置
```sql
-- 用户分析偏好策略
CREATE POLICY "用户只能管理自己的分析偏好" 
ON user_analysis_preferences FOR ALL 
USING (auth.uid() = user_id);

-- 机器人设置策略
CREATE POLICY "用户只能管理自己的机器人" 
ON bot_settings FOR ALL 
USING (auth.uid() = user_id);
```

### 2. 数据库索引优化
```sql
-- 创建必要索引
CREATE INDEX IF NOT EXISTS idx_grade_data_new_student_exam 
ON grade_data_new(student_id, exam_title);

CREATE INDEX IF NOT EXISTS idx_user_analysis_preferences_user_id 
ON user_analysis_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_bot_settings_user_type 
ON bot_settings(user_id, bot_type);
```

## 🧪 部署验证

### 1. 功能测试
```bash
# 测试AI连接
node scripts/test-ai-connection.js

# 测试成绩分析
node scripts/test-grade-analysis.js

# 测试机器人推送
node scripts/test-wechat-push.sh
```

### 2. 端到端测试
1. **用户注册/登录**: 验证认证流程
2. **成绩导入**: 上传测试Excel文件
3. **AI分析配置**: 设置分析偏好
4. **机器人配置**: 添加Webhook地址
5. **自动触发**: 验证导入后自动分析
6. **手动推送**: 测试手动触发功能

### 3. 性能检查
```bash
# 检查构建大小
npm run build:analyze

# 运行性能测试
npm run test:performance

# 检查内存使用
npm run test:memory
```

## 🚨 故障排除

### 常见问题

#### 1. Edge Function调用失败
```bash
# 检查函数日志
npx supabase functions logs analyze-grades

# 验证环境变量
npx supabase secrets list
```

#### 2. 数据库连接问题
```sql
-- 检查RLS策略
SELECT * FROM pg_policies WHERE tablename = 'user_analysis_preferences';

-- 检查表权限
SELECT * FROM information_schema.table_privileges;
```

#### 3. API密钥问题
```bash
# 验证DeepSeek API
curl -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json"
```

#### 4. 前端构建失败
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 检查TypeScript错误
npm run type-check
```

## 🔄 更新流程

### 1. 代码更新
```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重新构建
npm run build
```

### 2. 数据库迁移
```bash
# 运行数据库迁移
npx supabase db reset

# 应用新的Edge Functions
npx supabase functions deploy --no-verify-jwt
```

### 3. 验证更新
- 检查新功能是否正常工作
- 验证现有数据完整性
- 测试API接口响应

## 📊 监控和维护

### 1. 日志监控
- Supabase Dashboard: 监控数据库性能
- Edge Functions Logs: 检查函数执行状态
- 前端错误追踪: 使用Sentry等工具

### 2. 性能监控
- API响应时间
- 数据库查询性能
- Edge Function执行时间
- 前端加载速度

### 3. 定期维护
- 依赖库更新
- 安全补丁应用
- 数据库清理
- 日志归档

---

**版本**: v1.4.0  
**最后更新**: 2025-07-19  
**维护者**: Claude Code Assistant

如有问题，请参考 [故障排除指南](SECURITY_NOTES.md) 或联系技术支持。