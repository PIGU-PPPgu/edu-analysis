# 🔒 安全配置指南

## GitHub密钥保护问题解决

### 问题说明
GitHub检测到代码中包含API密钥并阻止了推送，这是正确的安全行为。

### 解决步骤

#### 1. 设置环境变量
创建 `.env` 文件（不要提交到git）：
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，填入真实的API密钥
nano .env
```

在 `.env` 文件中添加：
```bash
# Linear MCP Integration
LINEAR_API_KEY=lin_api_YOUR_ACTUAL_API_KEY_HERE
LINEAR_PROFILE=your-linear-workspace-name

# 其他配置...
```

#### 2. 验证MCP配置
当前 `.mcp.json` 配置已更新为使用环境变量：
```json
{
  "mcpServers": {
    "linear": {
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}",
        "LINEAR_PROFILE": "${LINEAR_PROFILE}"
      }
    }
  }
}
```

#### 3. 启动方式
```bash
# 加载环境变量并启动Claude Code
source .env && claude

# 或者使用dotenv
npx dotenv-cli claude
```

## 最佳实践

### 🔐 密钥管理
1. **永远不要**在代码中硬编码API密钥
2. **使用环境变量**存储敏感信息
3. **提交 .env.example**作为模板
4. **在 .gitignore 中排除 .env**

### 📋 环境变量清单
- `LINEAR_API_KEY` - Linear API密钥
- `LINEAR_PROFILE` - Linear工作区名称
- `VITE_SUPABASE_URL` - Supabase项目URL
- `VITE_SUPABASE_ANON_KEY` - Supabase匿名密钥

### 🚨 如果密钥泄露
1. **立即撤销**泄露的API密钥
2. **生成新密钥**
3. **更新环境变量**
4. **清理git历史**（如果需要）

### 🔧 本地开发设置
```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑并添加真实密钥
vim .env

# 3. 验证MCP连接
source .env && claude

# 4. 测试Linear集成
# 在Claude Code中使用Linear MCP工具
```

---
**重要提醒**：确保团队成员都了解这些安全最佳实践！