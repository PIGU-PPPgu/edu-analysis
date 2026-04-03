# ExamManagementCenter 拆分边界分析

**文件**: `src/components/exam/ExamManagementCenter.tsx`（2552 行）
**分析日期**: 2026-04-02

---

## 一、Tab 结构

组件有 4 个 Tab：`dashboard`（仪表盘）、`list`（考试列表）、`analytics`（数据分析）、`settings`（设置管理）。

---

## 二、各 Tab 使用的 state 变量

### dashboard Tab
- `exams`（展示最近 3 条）
- `examTypes`（emoji 映射）
- `statistics`（统计卡片）
- `isLoading`
- `activeTab`（快速操作按钮切换 tab）
- `selectedExams`（批量导出按钮）

### list Tab
- `exams`（数据源）
- `examTypes`（类型 emoji）
- `isLoading`
- `selectedExams`（多选框）
- `searchTerm`
- `statusFilter`
- `typeFilter`
- `selectedTermId`
- `academicTerms`
- `searchDebounce`
- `currentPage`
- `pageSize`
- `filteredExams`（derived）
- `paginatedExams`（derived）
- `paginationInfo`（derived）
- `isCreateDialogOpen`
- `editingExamId`
- `examForm`
- `reportExamId`
- `isSubjectScoreDialogOpen`
- `selectedExamForScoreConfig`
- `currentExamSubjectScores`

### analytics Tab
- `statistics`
- `examTypes`
- `exams`（按类型计数）

### settings Tab
- `examTypes`（类型管理列表）
- `exams`（每种类型的考试数量）
- `isSubjectScoreDialogOpen`（设置 tab 内无直接引用，但通过 handleQuickAction 触发）

---

## 三、各 Tab 使用的 handler 函数

### dashboard Tab
- `setIsCreateDialogOpen`（创建考试按钮）
- `handleBatchAction("export")`
- `setActiveTab`（跳转到 analytics/settings）
- `handleQuickAction(exam, "view")`（最近考试点击）
- `getStatusBadge`（工具函数）

### list Tab
- `setSearchTerm`
- `setStatusFilter`
- `setTypeFilter`
- `handleTermChange`
- `setCurrentPage`
- `setPageSize`
- `setSelectedExams`
- `handleBatchAction`（export / delete）
- `handleQuickAction`（edit / view / duplicate / delete / analysis / subject-score-config / generate-report / warning-analysis）
- `handleCreateExam`（Dialog 内提交）
- `setIsCreateDialogOpen`
- `setEditingExamId`
- `setExamForm`
- `setReportExamId`
- `handleSubjectScoreConfig`
- `handleSaveSubjectScores`
- `getStatusBadge`

### analytics Tab
- 无交互 handler，纯展示（只读 `statistics`、`examTypes`、`exams`）

### settings Tab
- `toast.success`（占位，功能未实现）
- `handleBatchAction("export")`（数据管理区）

---

## 四、跨 Tab 共享的 state / handler（必须留在父组件）

| 名称 | 类型 | 原因 |
|------|------|------|
| `exams` / `setExams` | state | dashboard、list、analytics、settings 均读取 |
| `examTypes` / `setExamTypes` | state | 所有 tab 均用于 emoji 映射或类型列表 |
| `statistics` / `setStatistics` | state | dashboard、analytics 展示；list 的 create/delete 会更新 |
| `academicTerms` / `setAcademicTerms` | state | list 的 SemesterFilter；handleTermChange 依赖 |
| `currentTerm` / `setCurrentTerm` | state | 初始化时设置 selectedTermId |
| `isLoading` / `setIsLoading` | state | 全局加载遮罩（list tab 展示） |
| `activeTab` / `setActiveTab` | state | dashboard 快速操作按钮切换 tab |
| `selectedExams` / `setSelectedExams` | state | header 批量操作栏 + list tab |
| `isCreateDialogOpen` / `setIsCreateDialogOpen` | state | header 按钮 + dashboard + list |
| `editingExamId` / `setEditingExamId` | state | Dialog 标题判断 + handleQuickAction |
| `examForm` / `setExamForm` | state | Dialog 表单 + handleCreateExam |
| `reportExamId` / `setReportExamId` | state | ReportViewer Dialog |
| `isSubjectScoreDialogOpen` | state | ExamSubjectScoreDialog |
| `selectedExamForScoreConfig` | state | ExamSubjectScoreDialog |
| `currentExamSubjectScores` | state | ExamSubjectScoreDialog |
| `handleCreateExam` | handler | Dialog 提交，修改 exams + statistics |
| `handleQuickAction` | handler | list tab 每行操作，触发多个共享 state |
| `handleBatchAction` | handler | header + dashboard + list |
| `handleSubjectScoreConfig` | handler | list tab 触发，修改 isSubjectScoreDialogOpen |
| `handleSaveSubjectScores` | handler | ExamSubjectScoreDialog 回调 |
| `handleAnalysisNavigation` | handler | handleQuickAction 内部调用 |
| `mapExam` / `mapExamType` | 工具函数 | 数据加载和 delete 后重新映射 |
| `getStatusBadge` | 工具函数 | dashboard + list |
| `loadDerivedExamsFromGrades` | 工具函数 | 初始化 useEffect 内 |

---

## 五、直接调用 examService.ts 的位置（行号 + 函数名）

| 行号 | 函数名 | 调用场景 |
|------|--------|----------|
| 317 | `getExamTypes()` | 初始化 useEffect 并行加载 |
| 318 | `getExams()` | 初始化 useEffect 并行加载 |
| 319 | `getExamOverviewStatistics()` | 初始化 useEffect 并行加载 |
| 320 | `getAcademicTerms()` | 初始化 useEffect 并行加载 |
| 321 | `getCurrentAcademicTerm()` | 初始化 useEffect 并行加载 |
| 356 | `getExamParticipantCount(exam.id)` | 初始化后异步补充参与人数 |
| 496 | `getExamSubjectScores(exam.id)` | handleSubjectScoreConfig |
| 527 | `saveExamSubjectScores(...)` | handleSaveSubjectScores |
| 660 | `updateExam(editingExamId, updateData)` | handleCreateExam（编辑模式） |
| 686 | `createExam(createData)` | handleCreateExam（创建模式） |
| 912 | `duplicateExam(exam.id)` | handleQuickAction("duplicate") |
| 939 | `deleteExam(exam.id)` | handleQuickAction("delete") |
| 943 | `getExamTypes()` | handleQuickAction("delete") 后重新加载 |
| 944 | `getExams()` | handleQuickAction("delete") 后重新加载 |
| 945 | `getExamOverviewStatistics()` | handleQuickAction("delete") 后重新加载 |

另有直接调用 `supabase` 的位置：
- 行 289：`supabase.from("grade_data").select(...)` — `loadDerivedExamsFromGrades` 内

---

## 六、拆分后文件结构建议

```
src/components/exam/
├── ExamManagementCenter.tsx          # 父组件（壳），保留共享 state + 全局 Dialog，≈150 行
├── tabs/
│   ├── ExamDashboardTab.tsx          # 仪表盘 Tab，≈120 行（只读 props）
│   ├── ExamListTab.tsx               # 列表 Tab，≈250 行（搜索/筛选/分页/卡片）
│   ├── ExamAnalyticsTab.tsx          # 数据分析 Tab，≈150 行（纯展示）
│   └── ExamSettingsTab.tsx           # 设置 Tab，≈180 行（类型管理/评分/通知）
├── hooks/
│   └── useExamData.ts                # 封装初始化加载逻辑 + examService 调用，≈120 行
└── ExamSubjectScoreDialog.tsx        # 已存在，不动
```

### 父组件职责（ExamManagementCenter.tsx）
- 持有所有跨 Tab 共享 state
- 渲染 header（批量操作栏、创建按钮）
- 渲染统计卡片（StatCard × 4）
- 渲染 Tabs 容器，将 props 下传给各 Tab
- 渲染 CreateExamDialog、ExamSubjectScoreDialog、ReportViewer Dialog

### useExamData.ts 职责
- 封装初始化 useEffect（并行加载 5 个接口）
- 封装 `loadDerivedExamsFromGrades`（supabase 直查）
- 返回 `{ exams, examTypes, statistics, academicTerms, currentTerm, isLoading, reload }`
- **T002 阶段**：将 examService 调用替换为 ExamDataService 调用

### Tab 组件接口约定（props 传入，不持有自己的 state）
- `ExamListTab`：接收 `exams, examTypes, academicTerms, selectedTermId, isLoading, selectedExams` 及对应 setter/handler
- `ExamAnalyticsTab`：接收 `statistics, examTypes, exams`（只读）
- `ExamSettingsTab`：接收 `examTypes, exams`（只读，设置功能目前均为 toast 占位）
- `ExamDashboardTab`：接收 `exams, examTypes, statistics, onCreateExam, onBatchExport, onNavigate`

### 数据访问迁移路径（T002）
将 `useExamData.ts` 中所有 `examService.*` 调用替换为 `ExamDataService.getInstance().*`，`supabase` 直查移入 `ExamDataService.getDerivedExams()`，组件层完全不感知数据来源。
