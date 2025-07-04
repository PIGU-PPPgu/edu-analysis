---
description: 
globs: 
alwaysApply: true
---
# 项目架构详解

> 🎯 **使用场景**: 了解项目整体架构、目录结构、技术栈选型、数据流设计时使用此规则

基于[.doc/项目结构分析.md](mdc:.doc/项目结构分析.md)的详细架构分析。

## 🏗️ 技术栈详解

### 前端技术栈
```
核心框架:
├── React 18 - 用户界面库
├── TypeScript - 类型安全
├── Vite - 构建工具
└── Next.js - 部分页面使用

状态管理:
├── React Query - 服务器状态管理
├── React Context - 全局状态共享
└── React Hook Form - 表单状态

UI & 样式:
├── Shadcn UI (基于Radix UI) - 组件库
├── Tailwind CSS - 样式框架
├── Material UI - 部分组件
└── Ant Design - 特定场景组件

数据可视化:
├── Recharts - 主要图表库
├── Nivo (@nivo/bar, @nivo/line) - 高级图表
└── Chart.js - 特定图表需求

工具库:
├── Lodash - 工具函数
├── date-fns - 日期处理
├── Zod - 数据验证
└── React Router - 路由管理
```

### 后端技术栈
```
Supabase 生态:
├── PostgreSQL - 数据库
├── Supabase Auth - 用户认证
├── Edge Functions - 服务端逻辑
├── Real-time - 实时数据同步
└── Storage - 文件存储

AI服务集成:
├── OpenAI API - 主要AI服务
├── 豆包(火山方舟) - 国产AI模型
├── DeepSeek - 开源模型
├── 百川大模型 - 垂直领域模型
└── 通义千问 - 阿里云AI服务
```

## 📁 目录结构详解

### 根目录结构
```
figma-frame-faithful-front/
├── .doc/              # 📚 项目文档和分析报告
├── docs/              # 📖 用户文档
├── public/            # 🌐 静态资源
│   └── api/           # API相关静态文件
├── server/            # 🖥️ 本地服务器代码
├── services/          # 🔧 服务层代码
├── src/               # 💻 前端源代码 (核心)
├── storage/           # 💾 文件存储
│   ├── homework_files/   # 作业文件
│   └── homework_images/  # 作业图片
├── supabase/          # 🗄️ Supabase后端配置
├── tools/             # 🛠️ 开发工具
└── [配置文件...]      # ⚙️ 各种配置文件
```

### 前端源码 (src/) 详细结构
```
src/
├── app/                    # 🎯 应用级代码
│   ├── components/         # 应用级组件
│   │   └── class/         # 班级相关组件
│   ├── db/                # 数据库相关
│   │   └── migrations/    # 数据迁移脚本
│   └── teacher/           # 教师功能模块
│       └── homework/      # 教师作业管理
│
├── components/            # 🧩 可重用业务组件
│   ├── analysis/          # 📊 数据分析组件
│   │   ├── student/       # 学生分析
│   │   ├── subject/       # 学科分析
│   │   └── utils/         # 分析工具
│   ├── assignment/        # 📝 作业相关组件
│   ├── auth/              # 🔐 认证相关组件
│   ├── class/             # 👥 班级管理组件
│   ├── db/                # 🗃️ 数据库操作组件
│   ├── home/              # 🏠 主页组件
│   ├── homework/          # 📚 作业管理组件
│   ├── landing/           # 🚀 登录页组件
│   ├── onboarding/        # 🎯 引导流程组件
│   ├── portrait/          # 👤 学生画像组件
│   ├── profile/           # ⚙️ 用户配置组件
│   ├── settings/          # 🛠️ 设置相关组件
│   ├── shared/            # 🔄 共享组件
│   ├── test/              # 🧪 测试组件
│   ├── ui/                # 🎨 基础UI组件
│   └── warning/           # ⚠️ 预警分析组件
│
├── config/                # ⚙️ 应用配置
├── constants/             # 📋 常量定义
├── contexts/              # 🔄 React上下文
├── data/                  # 📊 静态数据
├── hooks/                 # 🎣 自定义钩子
├── integrations/          # 🔌 外部集成
│   └── supabase/          # Supabase客户端配置
├── lib/                   # 📚 工具库
│   └── api/               # API相关工具
├── migrations/            # 🔄 数据库迁移
├── pages/                 # 📄 页面组件
│   ├── api/               # API路由
│   ├── settings/          # 设置页面
│   ├── test/              # 测试页面
│   └── tools/             # 工具页面
├── services/              # 🔧 服务层
│   └── __tests__/         # 服务测试
├── sql/                   # 📝 SQL查询文件
├── tools/                 # 🛠️ 工具脚本
├── types/                 # 📋 TypeScript类型定义
└── utils/                 # 🔧 工具函数
```

### Supabase后端结构
```
supabase/
├── functions/             # ☁️ Edge Functions
│   ├── _shared/           # 共享代码和工具
│   ├── ai-file-analysis/  # 📊 AI文件分析服务
│   ├── analyze-data/      # 📈 数据分析服务
│   ├── analyze-grades/    # 🎯 成绩分析服务
│   ├── auto-analyze-data/ # 🤖 自动数据分析
│   ├── generate-student-learning-profile/ # 👤 学习画像生成
│   ├── generate-student-profile/ # 📝 学生画像生成
│   ├── get-class-boxplot-data/ # 📊 班级箱线图数据
│   ├── get-student-subject-contribution-data/ # 📈 学科贡献度
│   ├── proxy-ai-request/  # 🔄 AI请求代理
│   ├── recommend-charts/  # 📊 图表推荐
│   ├── save-exam-data/    # 💾 考试数据保存
│   ├── sync-notion-data/  # 🔄 Notion数据同步
│   └── validate-api-key/  # 🔑 API密钥验证
├── migrations/            # 📈 数据库迁移文件
└── .temp/                # 🗂️ 临时文件
```

## 🔄 数据流架构

### 主要数据流向
```
1. 用户交互层 (React组件)
    ↓ 触发操作
2. 服务层 (services/)
    ↓ 调用API
3. Supabase客户端 (integrations/supabase/)
    ↓ 数据库操作 / Edge Function调用
4. Supabase后端
    ↓ 数据处理 / AI分析
5. 数据返回到前端
    ↓ 状态更新
6. UI重新渲染
```

### AI分析数据流
```
前端数据 → Edge Function (代理) → AI服务 → 结果处理 → 数据库存储 → 前端展示
```

## 🎯 关键架构决策

### 为什么选择这些技术？

**React + TypeScript**:
- ✅ 组件化开发，便于维护
- ✅ 类型安全，减少运行时错误
- ✅ 生态丰富，社区支持好

**Supabase**:
- ✅ 降低后端开发复杂度
- ✅ 内置认证和实时功能
- ✅ PostgreSQL兼容，SQL灵活性
- ✅ Edge Functions支持复杂业务逻辑

**Shadcn UI + Tailwind**:
- ✅ 现代化设计风格
- ✅ 组件可定制性强
- ✅ 开发效率高
- ✅ 响应式设计友好

**React Query**:
- ✅ 服务器状态管理专业化
- ✅ 缓存和同步机制完善
- ✅ 错误处理和重试机制

## 📊 核心数据模型

### 主要数据表结构
```
用户相关:
├── user_profiles     # 用户配置信息
├── teachers         # 教师信息
└── auth.users       # Supabase认证表

教学管理:
├── students         # 学生信息
├── class_info       # 班级信息  
├── subjects         # 科目信息
└── academic_terms   # 学年学期

成绩数据:
├── grades           # 学生成绩
├── exam_types       # 考试类型
└── grade_data       # 成绩明细

作业系统:
├── homework         # 作业信息
├── homework_submissions # 作业提交
└── homework_files   # 作业文件

分析预警:
├── student_warnings # 学生预警
├── warning_rules    # 预警规则
└── analysis_results # 分析结果
```

## 🔌 系统集成点

### 主要集成接口
1. **AI服务集成** - [supabase/functions/proxy-ai-request/](mdc:supabase/functions/proxy-ai-request)
2. **文件上传** - Supabase Storage
3. **实时通信** - Supabase Realtime
4. **认证服务** - Supabase Auth

### 关键配置文件
- [src/integrations/supabase/client.ts](mdc:src/integrations/supabase/client.ts) - Supabase客户端配置
- [vite.config.ts](mdc:vite.config.ts) - Vite构建配置
- [tailwind.config.ts](mdc:tailwind.config.ts) - Tailwind样式配置
- [database-schema.sql](mdc:database-schema.sql) - 数据库结构定义

## 🚀 性能优化策略

1. **代码分割**: 使用React.lazy进行路由级别分割
2. **状态缓存**: React Query缓存服务器数据
3. **图片优化**: 使用Supabase Storage的图片转换
4. **构建优化**: Vite的快速HMR和优化打包
5. **数据库优化**: 合理的索引和查询优化

参考[main-guide.md](mdc:main-guide.md)获取更多导航信息。
