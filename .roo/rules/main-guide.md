---
description: 
globs: 
alwaysApply: true
---
# 学生画像系统开发指南总览

这是一个基于React + Supabase的学生成绩分析与画像系统，主要面向教师用户提供数据分析、作业管理、学生画像生成等功能。

## 🎯 项目概述

**系统定位**: 教育数据分析平台，帮助教师更好地了解学生学习状况
**目标用户**: 中小学教师
**核心价值**: 数据驱动的教学决策支持

## 🏗️ 技术架构概览

- **前端**: React 18 + TypeScript + Vite
- **UI库**: Shadcn UI + Tailwind CSS  
- **后端**: Supabase (数据库 + 认证 + Edge Functions)
- **状态管理**: React Query + React Context
- **图表库**: Recharts + Nivo
- **AI集成**: OpenAI + 豆包等多模型支持

## 📚 规则导航指南

### 🔍 什么时候使用哪个规则？

**开始新功能开发时**:
→ 阅读 [project-architecture.md](mdc:project-architecture.md) 了解项目结构
→ 参考 [feature-modules.md](mdc:feature-modules.md) 了解现有功能模块

**UI开发时**:
→ 使用 [ui-components.md](mdc:ui-components.md) 查看组件规范和样式约定

**数据操作时**:
→ 参考 [database-operations.md](mdc:database-operations.md) 了解数据库操作模式

**遇到开发问题时**:
→ 查看 [ai-support.md](mdc:ai-support.md) 学习如何有效提问
→ 参考 [development-workflow.md](mdc:development-workflow.md) 了解开发流程

**认证相关功能**:
→ 参考 [authentication.md](mdc:authentication.md) 了解认证系统

**路由导航功能**:
→ 参考 [routing-navigation.md](mdc:routing-navigation.md) 了解路由配置

## 🎯 核心功能模块

### 已实现的主要功能
1. **用户认证系统** - 教师登录注册、权限管理
2. **数据导入管理** - 学生信息、成绩数据批量导入
3. **作业管理系统** - 作业发布、批改、统计分析
4. **成绩分析中心** - 多维度数据分析、可视化图表
5. **预警分析系统** - 学生风险识别、预警规则管理
6. **学生画像生成** - AI驱动的个性化学生分析
7. **班级管理** - 班级信息管理、学生组织
8. **AI配置中心** - 多AI模型接入、参数配置

### 技术实现要点
- **数据流**: 导入 → 存储(Supabase) → 分析(AI) → 展示(图表)
- **AI集成**: 通过Edge Functions代理多种AI服务
- **响应式设计**: 支持桌面端和移动端访问

## 🚀 快速开始

### 新功能开发流程
1. **需求分析**: 确定功能在哪个模块，参考 [feature-modules.md](mdc:feature-modules.md)
2. **技术选型**: 查看 [project-architecture.md](mdc:project-architecture.md) 确定技术方案
3. **UI设计**: 使用 [ui-components.md](mdc:ui-components.md) 中的组件和样式规范
4. **数据操作**: 按照 [database-operations.md](mdc:database-operations.md) 实现数据逻辑
5. **测试调试**: 遇到问题时参考 [ai-support.md](mdc:ai-support.md) 寻求帮助

### 项目关键文件
- [src/App.tsx](mdc:src/App.tsx) - 应用主入口和路由配置
- [src/integrations/supabase/client.ts](mdc:src/integrations/supabase/client.ts) - Supabase客户端
- [database-schema.sql](mdc:database-schema.sql) - 数据库结构定义
- [tailwind.config.ts](mdc:tailwind.config.ts) - 样式配置
- [package.json](mdc:package.json) - 依赖管理

## 🔗 文档资源

项目文档位于 [.doc/](mdc:.doc) 文件夹：
- [项目结构分析.md](mdc:.doc/项目结构分析.md) - 详细的项目架构说明
- [功能模块梳理.md](mdc:.doc/功能模块梳理.md) - 功能模块关系分析
- [学生画像系统项目分析报告.md](mdc:.doc/学生画像系统项目分析报告.md) - 完整项目分析
- [界面功能分析.md](mdc:.doc/界面功能分析.md) - UI功能详解
- [进度统计.md](mdc:.doc/进度统计.md) - 开发进度追踪

## 🎨 开发原则

1. **用户体验优先**: 界面简洁直观，操作流程清晰
2. **数据驱动**: 所有功能围绕教育数据分析展开
3. **模块化设计**: 功能模块相对独立，易于维护扩展
4. **响应式设计**: 适配不同设备屏幕尺寸
5. **AI增强**: 充分利用AI能力提升用户体验

记住：这是一个面向教师的教育工具，所有设计和开发决策都应该围绕提升教学效率和学生管理效果来考虑。
