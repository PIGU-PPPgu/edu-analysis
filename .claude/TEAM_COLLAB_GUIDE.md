# 🤖 多AI协作系统使用指南

## 📋 系统概述

这是一个自动化的3AI协作系统，能够在后台无缝集成多个AI的专业建议：

- **Claude Code（主控）**：项目负责人和主要实现者
- **Gemini (gemini-3-pro-high)**：前端UI/UX设计专家（React + Tailwind + shadcn/ui）
- **Codex (gpt-5.1-codex)**：后端架构和代码审查专家（Supabase + TypeScript）

## 🚀 快速开始

### 1. 验证安装

```bash
# 检查脚本是否正确安装
ls -la .claude/scripts/

# 应该看到：
# ai-collab-wrapper.sh    - AI API调用封装
# task-analyzer.sh        - 任务类型分析器
# team-orchestrator.sh    - 多AI协作编排器
```

### 2. 测试任务分类器

```bash
# 测试全栈任务识别
bash .claude/scripts/task-analyzer.sh "创建成绩分析图表，包含数据库查询和UI展示"
# 输出: FULL_STACK

# 测试前端任务识别
bash .claude/scripts/task-analyzer.sh "设计一个响应式导航栏"
# 输出: FRONTEND_ONLY

# 测试后端任务识别
bash .claude/scripts/task-analyzer.sh "优化学生成绩查询API性能"
# 输出: BACKEND_ONLY

# 测试简单任务识别
bash .claude/scripts/task-analyzer.sh "修复拼写错误"
# 输出: SIMPLE_TASK
```

## 🎯 工作模式

### 自动模式（默认）

系统会自动在后台工作，用户体验如下：

```
你: 添加一个学生成绩趋势分析图表

Claude: 好的，我来为你实现一个成绩趋势分析图表组件。

[后台自动发生的事情:]
[1. 分析任务类型 → FULL_STACK]
[2. 调用 Gemini 获取UI设计建议]
[3. 调用 Codex 获取数据查询优化建议]
[4. 整合建议并实现代码]

我创建了 GradeTrendChart 组件，包括：
- 使用 Recharts 实现可视化
- 支持多维度筛选
- Supabase 查询优化
- 响应式设计

已完成！✅
```

### 手动测试模式

你也可以手动调用各个阶段：

#### 获取UI设计建议
```bash
# 1. 创建任务描述文件
echo "设计一个学生列表页面，包含搜索框、筛选器和分页" > /tmp/task-context.txt

# 2. 调用 Gemini 设计阶段
bash .claude/scripts/team-orchestrator.sh design /tmp/task-context.txt

# 3. 查看设计建议
cat .claude/logs/gemini-design-output.txt
```

#### 获取架构审查建议
```bash
# 1. 创建设计描述
echo "设计一个支持分页和多维度筛选的成绩查询API" > /tmp/task-context.txt

# 2. 调用 Codex 架构审查
bash .claude/scripts/team-orchestrator.sh architecture /tmp/task-context.txt

# 3. 查看架构建议
cat .claude/logs/codex-architecture-output.txt
```

#### 代码审查
```bash
# 1. 指定要审查的文件路径
echo "src/components/analysis/GradeTrendChart.tsx" > /tmp/review-target.txt

# 2. 调用 Codex 代码审查
bash .claude/scripts/team-orchestrator.sh review /tmp/review-target.txt

# 3. 查看审查反馈
cat .claude/logs/codex-review-output.txt
```

## 📊 任务分类逻辑

系统会根据关键词自动分类任务：

### FRONTEND_ONLY 关键词
```
component, ui, 界面, 样式, tailwind, css, 前端, 页面,
按钮, 表单, modal, dialog, 布局, 响应式, 动画,
hover, 点击, 设计, shadcn, 图表, 可视化, 导航, 菜单
```

### BACKEND_ONLY 关键词
```
api, endpoint, database, 数据库, 后端, 服务, 接口,
模型, schema, 认证, 权限, query, 查询, crud,
middleware, 验证, security, 缓存, supabase, rls,
migration, 成绩, 学生, 班级, 考试, 预警
```

### FULL_STACK
同时包含前端和后端关键词

### SIMPLE_TASK
不包含以上任何关键词（如拼写错误、小调整等）

## 📝 日志和审计

所有AI交互都会记录在 `.claude/logs/` 目录：

```bash
# 查看最近的协作日志
cat .claude/logs/team-collab-*.log | tail -100

# 查看最新的 Gemini 设计建议
cat .claude/logs/gemini-design-output.txt

# 查看最新的 Codex 架构审查
cat .claude/logs/codex-architecture-output.txt

# 查看最新的 Codex 代码审查
cat .claude/logs/codex-review-output.txt

# 列出所有日志文件
ls -lh .claude/logs/
```

## 🔧 配置信息

### API 配置

脚本使用以下API配置（已内置在 `ai-collab-wrapper.sh`）：

```bash
# Gemini API
BASE_URL: https://api-slb.packyapi.com
MODEL: gemini-3-pro-high
API_KEY: 已配置

# Codex API
MODEL: gpt-5.1-codex
通过 codex CLI 工具调用
```

### 权限配置

所有脚本执行权限已添加到 `.claude/settings.local.json`：

```json
{
  "permissions": {
    "allow": [
      "Bash(bash .claude/scripts/task-analyzer.sh:*)",
      "Bash(bash .claude/scripts/team-orchestrator.sh:*)",
      "Bash(cat .claude/logs/*.txt:*)",
      ...
    ]
  }
}
```

## 🎨 适用场景

### 适合使用多AI协作的任务
✅ 创建复杂的UI组件
✅ 设计新的数据库架构
✅ 实现全栈功能
✅ 优化性能瓶颈
✅ 审查关键代码

### 不需要AI协作的任务
❌ 修复拼写错误
❌ 小的CSS调整
❌ 添加调试日志
❌ 简单的变量重命名
❌ 阅读和理解代码

## 🛠️ 故障排除

### Gemini 调用失败

```bash
# 检查 gemini CLI 是否安装
which gemini

# 测试手动调用
echo "test" | gemini --model gemini-3-pro-high "Say hello"
```

### Codex 调用失败

```bash
# 检查 codex CLI 是否安装
which codex

# 测试手动调用
echo "console.log('hello')" | codex exec -m gpt-5.1-codex "Review this code"
```

### 日志目录不存在

```bash
# 创建日志目录
mkdir -p .claude/logs

# 检查权限
ls -la .claude/logs/
```

## 📚 相关文档

- **技能文档**: `.claude/skills/team-collab.md`
- **API封装**: `.claude/scripts/ai-collab-wrapper.sh`
- **任务分析器**: `.claude/scripts/task-analyzer.sh`
- **编排引擎**: `.claude/scripts/team-orchestrator.sh`

## 💡 最佳实践

1. **信任自动化**：让系统在后台运行，专注于结果
2. **查看日志**：遇到问题时检查日志了解详情
3. **手动测试**：在重要决策前可以手动调用获取建议
4. **保持更新**：定期查看日志文件，了解AI建议的质量

---

**版本**: v1.0
**最后更新**: 2024-12-14
**状态**: ✅ 已配置完成，可以使用
