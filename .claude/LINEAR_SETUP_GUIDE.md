# Linear MCP 完整设置指南

## 1. 获取Linear API密钥

### 步骤1：访问Linear设置
1. 访问 https://linear.app/settings/api
2. 点击 "Create API Key"
3. 输入描述（如 "Claude Code Integration"）
4. 复制生成的API密钥

### 步骤2：更新MCP配置
将 `.mcp.json` 中的 `YOUR_LINEAR_API_KEY` 替换为你的实际API密钥：

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@tacticlaunch/mcp-linear"],
      "env": {
        "LINEAR_API_KEY": "lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxx",
        "LINEAR_PROFILE": "your-workspace-name"
      }
    }
  }
}
```

### 步骤3：重启Claude Code
重新启动Claude Code以加载新的MCP配置。

## 2. Linear项目管理结构设置

### 2.1 创建团队和项目
建议为你的教育数据分析平台创建以下结构：

#### 团队架构
- **Frontend Team** - 前端开发
- **Backend Team** - 后端开发  
- **AI/Analytics Team** - AI分析功能
- **DevOps Team** - 部署和运维
- **Product Team** - 产品规划

#### 项目结构
- **Grade Analysis System** - 成绩分析系统
- **AI Knowledge Point Analysis** - AI知识点分析
- **Warning System** - 预警系统
- **Student Portrait System** - 学生画像系统
- **Homework Management** - 作业管理系统

### 2.2 工作流状态
为每个团队设置合适的工作流：

#### 开发团队工作流
- Backlog (待办)
- Todo (准备开始)
- In Progress (进行中)
- Review (代码审查)
- Testing (测试中)
- Done (已完成)

#### 产品团队工作流
- Idea (想法)
- Planning (规划中)
- Design (设计中)
- Development (开发中)
- Testing (测试中)
- Released (已发布)

### 2.3 标签系统
创建以下标签分类：

#### 优先级标签
- 🔴 Critical (紧急)
- 🟡 High (高优先级)
- 🟢 Medium (中优先级)
- 🔵 Low (低优先级)

#### 类型标签
- 🚀 Feature (新功能)
- 🐛 Bug (错误修复)
- 📚 Documentation (文档)
- 🔧 Refactor (重构)
- 🎨 UI/UX (界面设计)
- 🔒 Security (安全)
- ⚡ Performance (性能)

#### 组件标签
- Frontend
- Backend
- Database
- AI/ML
- API
- Testing
- DevOps

## 3. Linear-GitHub集成

### 3.1 GitHub集成设置
1. 在Linear中访问 Settings → Integrations → GitHub
2. 点击 "Install GitHub App"
3. 选择要集成的GitHub仓库
4. 配置权限（建议选择全部权限）

### 3.2 自动化功能
启用以下自动化功能：

#### PR/Issue同步
- 自动创建Linear issue对应GitHub PR
- PR合并时自动关闭Linear issue
- 同步PR状态到Linear

#### 分支管理
- 从Linear issue创建GitHub分支
- 自动生成分支名称（如 `feature/LIN-123-add-ai-analysis`）
- 支持Git Flow工作流

#### 提交消息规范
```
feat: add AI analysis feature (LIN-123)
fix: resolve grade calculation bug (LIN-456)
docs: update API documentation (LIN-789)
```

### 3.3 GitHub Actions集成
创建自动化工作流：

#### PR创建时
- 自动更新Linear issue状态为 "In Review"
- 运行测试并更新Linear
- 检查代码质量

#### PR合并时
- 自动关闭Linear issue
- 更新项目进度
- 发送通知

## 4. 项目管理最佳实践

### 4.1 Issue管理
- 使用模板创建标准化的issue描述
- 添加验收标准 (Acceptance Criteria)
- 设置预估时间和实际时间跟踪
- 定期更新进度

### 4.2 Sprint规划
- 每2周进行一次Sprint规划
- 使用Linear的Cycle功能管理Sprint
- 设置Sprint目标和关键成果

### 4.3 代码审查流程
1. 开发完成后创建PR
2. 自动触发Linear状态更新
3. 团队成员进行代码审查
4. 通过后合并并自动关闭issue

### 4.4 发布管理
- 使用Linear的Project功能跟踪发布
- 创建Release milestone
- 自动生成发布说明

## 5. 团队协作工具

### 5.1 通知设置
- 配置Slack/Discord通知
- 设置关键事件提醒
- 个人通知偏好设置

### 5.2 报告和分析
- 使用Linear Insights查看团队效率
- 跟踪Sprint燃尽图
- 分析交付周期时间

### 5.3 客户反馈集成
- 连接客户支持工具
- 自动创建feature request
- 跟踪用户反馈到产品改进

## 6. 常用Linear CLI命令

```bash
# 创建新issue
linear issue create --title "Add AI analysis feature" --team "AI"

# 查看当前sprint
linear cycle current

# 更新issue状态
linear issue update ISS-123 --state "In Progress"

# 创建项目
linear project create --name "Grade Analysis v2.0"
```

## 7. 故障排除

### 常见问题
1. **API密钥无效**：检查密钥格式和权限
2. **GitHub集成失败**：确认GitHub App权限
3. **通知不工作**：检查Webhook配置
4. **同步延迟**：等待或手动触发同步

### 调试步骤
1. 检查MCP服务器状态
2. 验证API密钥有效性
3. 查看集成日志
4. 联系Linear支持

## 8. 进阶功能

### 8.1 自定义字段
- 添加项目特定字段
- 创建下拉选择器
- 设置必填字段

### 8.2 自动化规则
- 状态变化触发器
- 标签分配规则
- 通知自动化

### 8.3 API集成
- 自定义集成脚本
- 批量操作工具
- 数据导出功能

---

完成设置后，重启Claude Code并使用Linear MCP工具进行项目管理！