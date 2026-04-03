# Architecture Overview

## Tech Stack

- **框架**: React 18 + TypeScript 5 + Vite 7
- **路由**: react-router-dom v6
- **数据**: @tanstack/react-query v5（服务端状态）+ React Context（全局状态）
- **UI**: Radix UI + Tailwind CSS v3 + shadcn/ui
- **后端**: Supabase（PostgreSQL + RLS + Auth）
- **AI**: OpenAI SDK
- **测试**: Vitest + Playwright（E2E）
- **打包目标**: Web + Electron + Capacitor（iOS）

## System Diagram

```
pages/          薄壳路由页面（仅组合布局，无业务逻辑）
    ↓
components/     业务 UI 组件（按域分目录：exam / class / student / analysis）
    ↓
services/       业务服务层（两条数据访问路径并存，见下）
    ↓
Supabase        PostgreSQL + RLS + Auth
```

## Data Access — 两条路径并存（过渡期）

```
旧路径（直接）:  Component → services/*.ts → supabase client
新路径（网关）:  Component → services/domains/*.ts → DataGateway → SupabaseAdapter → supabase
过渡层:         services/examService.enhanced.ts 包装旧接口，内部转发到新路径
```

**规则**: 新功能走新路径（DataGateway）。旧代码逐步迁移，不强制一次性重写。

## Key Components

| 组件 | 职责 | 位置 |
|------|------|------|
| ExamManagementCenter | 考试管理主容器（2552行，待拆分） | `src/components/exam/` |
| ExamManagementCenterNew | 重构版主容器（DataGateway 架构） | `src/components/exam/` |
| DataGateway | 数据访问抽象层 | `src/services/data/` |
| ExamDataService | 考试领域服务（单例） | `src/services/domains/` |
| ExamDialog | 创建/编辑考试表单 | `src/components/exam/components/` |
| ExamList | 考试列表（多选、排序、操作） | `src/components/exam/components/` |
| ExamStatsOverview | 统计概览卡片 | `src/components/exam/components/` |

## Data Model（考试域）

```
exam（考试）
  ├── exam_type（考试类型）
  ├── semester（学期）
  ├── subject_scores（各科目总分/及格分配置）
  └── grade_data（学生成绩，多科目一行）
        ├── student_id → students
        └── class_name → class_info
```

## Dependency Rules

- `pages/` 只能 import `components/` 和 `contexts/`
- `components/` 可以 import `services/`、`hooks/`、`types/`、`utils/`
- `services/` 不能 import `components/`（单向依赖）
- `services/domains/` 通过 `DataGateway` 访问数据，不直接 import supabase client
- 禁止循环依赖

## Key Decisions

- **DataGateway 抽象**: 解耦业务逻辑与 Supabase，便于测试和未来切换数据源
- **双路径并存**: 旧代码不强制迁移，enhanced 包装层保持接口兼容
- **ExamManagementCenter 拆分**: 2552 行的主容器是当前最大的技术债，计划拆分为独立子模块
- **grade_data 宽表设计**: 一行存一次考试所有科目成绩，便于横向统计，代价是列多
