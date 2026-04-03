# Product Requirements

## Current Goals

优化 `/exam-management` 路由下的所有模块，目标：
1. 拆分 `ExamManagementCenter.tsx`（2552行）为职责单一的子模块
2. 统一数据访问路径（旧路径迁移到 DataGateway）
3. 提升可测试性和可维护性

## Acceptance Criteria

- [ ] `ExamManagementCenter` 拆分后单文件不超过 300 行
- [ ] 考试列表、统计、设置三个 Tab 各自独立为模块，可单独测试
- [ ] 所有数据访问通过 `ExamDataService`（DataGateway 路径），不直接调用 supabase
- [ ] 旧的 `examService.ts` 直接调用路径不再被新组件引用
- [ ] 核心业务逻辑（CRUD、筛选、统计）有单元测试覆盖
- [ ] TypeScript 无 any 类型新增
- [ ] lint 无新增 error

## Out of Scope

- 不改动 UI 视觉（用户不感知）
- 不迁移 exam 以外的其他域（class、student、analysis 等）
- 不重写 Supabase schema

## User Stories

- 教师：管理考试（创建、编辑、删除），查看统计概览，配置科目分数线
- 管理员：批量操作考试，筛选历史考试，导出数据
