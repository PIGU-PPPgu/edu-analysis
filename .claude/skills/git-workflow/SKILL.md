---
name: Git Workflow
description: 标准化的 Git 操作流程，包括提交、分支管理和代码审查
tags: [git, workflow, version-control]
---

# Git Workflow Skill

规范化的 Git 操作流程。

## 何时使用

执行 Git 相关操作时自动激活：
- 创建分支
- 提交代码
- 合并分支
- 解决冲突
- 查看历史

## 分支策略

### 分支命名规范
- `feature/功能描述` - 新功能开发
- `fix/问题描述` - Bug 修复
- `refactor/重构描述` - 代码重构
- `docs/文档更新` - 文档更新
- `style/样式调整` - UI/样式调整
- `chore/杂项任务` - 构建/配置更新

### 示例
```bash
git checkout -b feature/add-student-report-viewer
git checkout -b fix/supabase-rls-policy-error
git checkout -b refactor/optimize-exam-management
```

## 提交消息规范

### 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新

### Scope 范围（可选）
- `ui`: UI 组件
- `db`: 数据库
- `api`: API 相关
- `auth`: 认证相关
- `report`: 报告系统
- `grade`: 成绩系统
- `homework`: 作业系统

### 示例提交
```bash
# 功能开发
git commit -m "feat(report): add report viewer in exam management interface"

# Bug 修复
git commit -m "fix(db): resolve RLS policy 406 error for analysis_reports"

# 重构
git commit -m "refactor(ui): unify Positivus brand colors across components"

# 样式调整
git commit -m "style(button): apply consistent shadow effects"
```

## 标准工作流程

### 1. 开始新功能
```bash
# 确保在最新的 main 分支
git checkout main
git pull origin main

# 创建功能分支
git checkout -b feature/new-feature

# 开发...
# 提交代码
git add .
git commit -m "feat(scope): add feature description"
```

### 2. 推送和创建 PR
```bash
# 推送到远程
git push -u origin feature/new-feature

# 使用 gh CLI 创建 PR（如果可用）
gh pr create --title "Add new feature" --body "Description of changes"
```

### 3. 更新分支（与 main 同步）
```bash
git checkout main
git pull origin main
git checkout feature/new-feature
git rebase main

# 如果有冲突，解决后
git add .
git rebase --continue
```

### 4. 合并到主分支
```bash
# 使用 squash merge 保持历史清晰
git checkout main
git merge --squash feature/new-feature
git commit -m "feat: feature summary"
git push origin main

# 删除功能分支
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

## 常用命令

### 查看状态和历史
```bash
# 查看当前状态
git status

# 查看最近提交
git log --oneline -10

# 查看文件变更
git diff
git diff --staged
```

### 暂存和恢复
```bash
# 暂存当前修改
git stash save "work in progress"

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop
```

### 撤销操作
```bash
# 撤销工作区修改
git restore <file>

# 撤销暂存区
git restore --staged <file>

# 修改最后一次提交
git commit --amend

# 回退到某个提交
git reset --soft HEAD~1  # 保留修改
git reset --hard HEAD~1  # 丢弃修改
```

## 最佳实践

1. **小而频繁的提交**: 每个提交只做一件事
2. **清晰的提交消息**: 让团队成员能快速理解变更
3. **分支隔离**: 每个功能/修复使用独立分支
4. **定期同步**: 经常从 main 拉取更新
5. **代码审查**: 重要变更通过 PR 进行审查

## 冲突解决

```bash
# 当 rebase 或 merge 出现冲突时
git status  # 查看冲突文件

# 手动编辑冲突文件，解决 <<<< ==== >>>> 标记

# 标记为已解决
git add <resolved-file>

# 继续 rebase
git rebase --continue

# 或者放弃 rebase
git rebase --abort
```

## 注意事项

- 永远不要 force push 到 main 分支
- 提交前运行 `npm run typecheck` 和 `npm run lint`
- 敏感信息不要提交到仓库
- 大文件使用 Git LFS
