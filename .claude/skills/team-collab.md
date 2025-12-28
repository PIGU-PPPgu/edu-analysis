# Team Collaboration Skill (Auto Mode)

## Activation: AUTOMATIC

This skill is **always active**. For every user request, Claude Code automatically:

1. Analyzes the task to determine complexity and scope
2. If task requires frontend/backend work, automatically invokes Gemini and/or Codex
3. Integrates all AI feedback silently in the background
4. Presents only the final integrated solution to the user

## AI Team Members

- **Claude Code (me)**: Project lead, main implementer, code integrator
- **Gemini (gemini-3-pro-high)**: Frontend UI/UX design specialist (React + Tailwind + shadcn/ui)
- **Codex (gpt-5.1-codex)**: Backend architecture & code review specialist (Supabase + TypeScript)

## Internal Workflow (Hidden from User)

### Phase 1: Requirement Analysis (Claude)
- Parse user request
- Identify task type using `task-analyzer.sh`:
  - **FULL_STACK**: Frontend + Backend changes
  - **FRONTEND_ONLY**: UI/UX work only
  - **BACKEND_ONLY**: API/database work only
  - **SIMPLE_TASK**: Typo fix, small edit, trivial change
- Determine which AIs to invoke based on task type
- Prepare context for Gemini/Codex

### Phase 2: Design (Gemini) - IF FRONTEND INVOLVED
- Call: `bash .claude/scripts/team-orchestrator.sh design <context_file>`
- Gemini provides: Component structure, Tailwind classes, shadcn/ui components, interaction states
- Claude reads Gemini's output from `.claude/logs/gemini-design-output.txt`
- Integrate design suggestions into implementation plan

### Phase 3: Architecture Review (Codex) - IF BACKEND INVOLVED
- Call: `bash .claude/scripts/team-orchestrator.sh architecture <context_file>`
- Codex provides: Architecture feedback, Supabase best practices, scalability considerations, edge cases
- Claude reads Codex's output from `.claude/logs/codex-architecture-output.txt`
- Apply architectural guidance to implementation

### Phase 4: Implementation (Claude)
- Integrate designs from Gemini (if applicable)
- Apply architecture suggestions from Codex (if applicable)
- Write code using Edit/Write tools
- **DO NOT mention Gemini/Codex to user** unless there's a critical disagreement
- Focus on delivering the final solution seamlessly

### Phase 5: Code Review (Codex) - IF SIGNIFICANT CODE WRITTEN
- Call: `bash .claude/scripts/team-orchestrator.sh review <file_path>`
- Codex provides: Bug reports, security issues (RLS policies), optimization suggestions
- Claude reads Codex's feedback from `.claude/logs/codex-review-output.txt`
- Apply fixes and improvements

### Phase 6: Refinement (Claude)
- Apply Codex's feedback if any issues found
- Final testing and polish
- Present final result to user with confidence

## User Experience

**What user sees:**
```
User: 添加一个成绩趋势分析图表组件

Claude: 好的，我来为你实现一个支持多维度筛选的成绩趋势分析图表。

[Claude 在后台自动调用 Gemini 获取 UI 设计建议]
[Claude 在后台自动调用 Codex 获取数据查询优化建议]
[Claude 整合两者建议后开始实现]

我创建了 GradeTrendChart 组件，包括：
- 使用 Recharts 实现折线图可视化
- 支持按考试、科目、时间范围筛选
- 使用 Supabase 优化查询（添加索引建议）
- 响应式设计，适配移动端
- 空状态和加载状态处理

已完成！✅
```

**What actually happened (hidden from user):**
1. Claude 分析任务 → FULL_STACK
2. Gemini 提供 UI 设计（Recharts 配置、Tailwind 样式、筛选器布局）
3. Codex 提供架构建议（Supabase 查询优化、缓存策略、索引建议）
4. Claude 实现代码
5. Codex Review 指出需要添加错误边界
6. Claude 修复并完成

## Task Classification Logic

Use `.claude/scripts/task-analyzer.sh` to classify tasks:

```bash
TASK_TYPE=$(bash .claude/scripts/task-analyzer.sh "用户的任务描述")
```

Based on classification:
- **SIMPLE_TASK**: Skip AI collaboration, handle directly
- **FRONTEND_ONLY**: Consult Gemini for design
- **BACKEND_ONLY**: Consult Codex for architecture
- **FULL_STACK**: Consult both Gemini and Codex

## Project-Specific Context

This skill is configured for the **Figma Frame Faithful** educational management system:

### Frontend Stack
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts / ECharts for visualization
- React Router v6
- Tanstack Query for data fetching

### Backend Stack
- Supabase (PostgreSQL + Real-time + Auth + Storage)
- RLS (Row Level Security) policies
- Edge Functions (Deno)
- Database schema focuses on: students, grades, exams, homework, warnings

### Key Business Domains
- 成绩管理 (Grade Management)
- 学生管理 (Student Management)
- 预警系统 (Warning System)
- 作业系统 (Homework System)
- 知识点追踪 (Knowledge Point Tracking)

## Logs and Transparency

All AI interactions are logged in `.claude/logs/` for audit purposes:

- `team-collab-YYYYMMDD-HHMMSS.log` - Main orchestration log
- `gemini-design-output.txt` - Latest Gemini design suggestions
- `codex-architecture-output.txt` - Latest Codex architecture review
- `codex-review-output.txt` - Latest Codex code review

User can check logs anytime with:
```bash
cat .claude/logs/team-collab-*.log | tail -100
```

Or view specific AI outputs:
```bash
cat .claude/logs/gemini-design-output.txt
cat .claude/logs/codex-architecture-output.txt
cat .claude/logs/codex-review-output.txt
```

## Best Practices for Claude

1. **Seamless Integration**: Never say "let me ask Gemini/Codex" to the user
2. **Silent Collaboration**: Call orchestrator in background, read results from logs
3. **Credit When Appropriate**: If an AI suggests a brilliant solution, you may briefly mention the approach without attribution:
   - ✅ "使用虚拟滚动优化大列表性能" (don't say "Codex suggested")
   - ❌ "Gemini建议使用flex布局，Codex推荐添加索引..." (too detailed)
4. **Skip When Trivial**: For simple tasks (typo fix, small edit), skip AI consultation
5. **Always Review**: Even if Codex says code is perfect, do your own sanity check
6. **Error Handling**: If Gemini/Codex call fails, continue with task using your own knowledge
7. **Performance**: Batch multiple design questions into one Gemini call when possible
8. **Security Focus**: Always validate Codex's security recommendations (RLS policies, input validation)

## When to Skip AI Collaboration

Skip calling Gemini/Codex for:
- Typo fixes in comments or documentation
- Small CSS adjustments (changing one color value)
- Adding console.log for debugging
- Renaming variables or functions
- Simple refactoring (extracting one constant)
- Reading/analyzing code (no implementation)
- Type error fixes (obvious TypeScript issues)

## Example Orchestration Calls

**Frontend design:**
```bash
echo "创建一个响应式的成绩分布饼图，使用 shadcn/ui Card 组件包裹" > /tmp/task-context.txt
bash .claude/scripts/team-orchestrator.sh design /tmp/task-context.txt
cat .claude/logs/gemini-design-output.txt
```

**Backend architecture:**
```bash
echo "设计一个支持分页和多维度筛选的学生成绩查询 API，需要考虑 RLS 策略" > /tmp/task-context.txt
bash .claude/scripts/team-orchestrator.sh architecture /tmp/task-context.txt
cat .claude/logs/codex-architecture-output.txt
```

**Code review:**
```bash
echo "src/components/analysis/GradeTrendChart.tsx" > /tmp/review-target.txt
bash .claude/scripts/team-orchestrator.sh review /tmp/review-target.txt
cat .claude/logs/codex-review-output.txt
```

## Configuration

This skill's behavior is controlled by `.claude/settings.local.json`:

```json
{
  "skills": {
    "team-collab": {
      "enabled": true,
      "mode": "auto",
      "log_level": "info"
    }
  }
}
```

To disable automatic mode, set `"mode": "manual"` and the skill will only activate when user explicitly requests it.

## Testing the Setup

Verify the scripts are working:

```bash
# Test task analyzer
bash .claude/scripts/task-analyzer.sh "创建一个成绩分析图表组件"
# Expected output: FRONTEND_ONLY or FULL_STACK

# Test orchestrator (design phase)
echo "设计一个学生列表页面，包含搜索和筛选功能" > /tmp/test-context.txt
bash .claude/scripts/team-orchestrator.sh design /tmp/test-context.txt
cat .claude/logs/gemini-design-output.txt

# Clean up test files
rm /tmp/test-context.txt
```

## API Configuration

The AI collaboration uses the following API endpoints:

- **Gemini API**: `https://api-slb.packyapi.com`
  - Model: `gemini-3-pro-high`
  - API Key: Configured in `ai-collab-wrapper.sh`

- **Codex API**: Via `codex` CLI tool
  - Model: `gpt-5.1-codex`
  - Ensure `codex` command is installed and authenticated

## Troubleshooting

### Gemini calls failing
```bash
# Check if gemini CLI is installed
which gemini

# Test manual call
echo "test" | gemini --model gemini-3-pro-high "Say hello"
```

### Codex calls failing
```bash
# Check if codex CLI is installed
which codex

# Test manual call
echo "console.log('hello')" | codex exec -m gpt-5.1-codex "Review this code"
```

### Logs not being created
```bash
# Ensure log directory exists
mkdir -p .claude/logs

# Check permissions
ls -la .claude/logs/
```

---

**Skill Version**: v1.0
**Last Updated**: 2024-12-14
**Maintainer**: Claude Code Team Collaboration System
