# Linear MCP 快速设置指南

## 立即修复步骤

### 1. 获取正确的Linear API密钥
```bash
# 1. 访问 https://linear.app/settings/api
# 2. 点击 "Create API Key"  
# 3. 输入描述: "Claude Code Integration"
# 4. 复制生成的密钥 (格式: lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxx)
```

### 2. 更新MCP配置
```bash
# 编辑 .mcp.json 文件
# 将 "lin_api_YOUR_ACTUAL_KEY_HERE" 替换为你的实际API密钥
```

### 3. 重启Claude Code
```bash
# 退出当前Claude Code会话
# 重新运行: claude
```

## Linear项目管理建议结构

### 为你的教育数据分析平台创建：

#### 团队结构
- **Frontend** - React/TypeScript前端开发
- **Backend** - Supabase/API后端开发  
- **AI/Analytics** - AI分析和知识点功能
- **DevOps** - 部署和运维

#### 项目结构
1. **Grade Analysis System** - 成绩分析系统
2. **AI Knowledge Point Analysis** - AI知识点分析
3. **Warning System** - 学生预警系统
4. **Student Portrait System** - 学生画像系统
5. **Homework Management** - 作业管理系统

#### 当前代码状态分析
基于你的代码库，建议创建以下issues：

**紧急修复**
- 修复DOM类型错误
- 优化AI解析引擎性能
- 完善数据导入流程

**新功能开发**
- 完成MCP配置优化
- 实现智能导入系统
- 增强预警分析功能

**代码重构**
- 优化TypeScript类型定义
- 重构组件结构
- 完善错误处理

## Linear-GitHub集成

### 自动化工作流
1. **PR创建时**：自动更新Linear issue状态
2. **代码合并时**：自动关闭相关issue
3. **分支管理**：从Linear issue创建GitHub分支

### 提交消息规范
```
feat: add AI analysis feature (LIN-123)
fix: resolve grade calculation bug (LIN-456)
docs: update API documentation (LIN-789)
```

---

完成API密钥设置后，我将帮你创建完整的项目管理结构！