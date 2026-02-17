# 智能教育数据分析平台

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/PIGU-PPPgu/edu-analysis)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e.svg)](https://supabase.com/)

面向高中教学管理的一站式数据分析平台，集成成绩分析、增值评价、AI 智能诊断与报告导出功能。

## 核心功能

### 成绩分析

- 数据看板：平均分、分数段分布、箱线图、散点图
- 班级分析：班级对比、学科排名、成绩趋势追踪
- 高级分析：多维交叉分析、异常检测（2 sigma）、科目相关性、学生贡献度

### 增值评价系统

- **数据导入**：Excel 模板导入，自动校验学生信息、教学编排和考试成绩
- **增值活动**：创建分析任务，配置前测/后测，一键计算增值率
- **增值报告**：
  - 班级增值评价（班级增值率排名、科目增值对比）
  - 教师增值评价（教师教学效能排名、历次追踪）
  - 学生增值评价（个体成长轨迹、趋势预测）
  - 学科均衡分析（科目间教学效果对比）
  - AI 智能分析（自动生成诊断报告、改进建议）
  - 数据对比工具（跨活动/跨班级对比）
- **报告导出**：PPT 一键导出（Positivus 风格，支持图表与富文本）

### AI 智能分析

- 多维度筛选（班级、科目、分层）后自动生成分析报告
- 算法洞察：异常检测、趋势预测、分层诊断
- 支持多 AI 提供商（OpenAI、Anthropic 等）

### 其他模块

- 知识点评估：从作业中提取知识点并追踪掌握度
- 预警系统：自动识别成绩异常学生
- 学生画像：AI 标签与自定义标签
- 考试管理：考试创建、等级分数线配置、x 段评价

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + TypeScript 5.8 |
| 构建工具 | Vite 7 |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 动画 | framer-motion + anime.js |
| 图表 | Recharts |
| 后端 | Supabase (PostgreSQL + Auth + RLS) |
| AI | OpenAI / Anthropic API |
| 导出 | pptxgenjs (PPT) + xlsx (Excel) |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/PIGU-PPPgu/edu-analysis.git
cd edu-analysis

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`

### 环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run typecheck    # TypeScript 类型检查
npm run lint:fix     # ESLint 自动修复
npm run format       # Prettier 格式化
```

## 项目结构

```
src/
  components/
    analysis/       # 成绩分析核心组件（数据导入、计算引擎）
    value-added/    # 增值评价系统
      activity/     #   增值活动管理
      ai/           #   AI 洞察面板
      analysis/     #   AI 分析页面
      charts/       #   可视化图表
      class/        #   班级增值报告
      comparison/   #   数据对比工具
      config/       #   配置管理
      import/       #   数据导入工作流
      reports/      #   报告菜单与专业报告查看器
      student/      #   学生增值报告
      subject/      #   学科均衡分析
      teacher/      #   教师增值报告
      tracking/     #   历次追踪
    ui/             # shadcn/ui 基础组件
  services/         # 业务逻辑（计算引擎、AI 分析、PPT 导出）
  types/            # TypeScript 类型定义
  utils/            # 工具函数（统计、缓存、优化）
  pages/            # 路由页面
  integrations/     # Supabase 客户端配置
```

## 部署

支持 Vercel / Netlify / GitHub Pages 等静态托管平台，或任何 Node.js 服务器环境。

## 许可证

[Apache License 2.0](LICENSE) | Copyright 2024 Linzhang Wu
