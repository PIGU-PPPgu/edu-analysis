# 智能教育数据分析平台

## 系统简介

本系统是一个全面的智能教育数据分析平台，专为教师设计，集成了成绩分析和知识点评估双重功能。平台通过数据可视化和AI技术，帮助教师深入理解学生表现，发现教学盲点，并优化教学策略。

## 功能模块

### 1. 成绩分析系统

#### 数据看板
- **成绩总览**：平均分、最高分、最低分等基本统计
- **分数分布**：各分数段学生分布情况
- **箱线图分析**：直观展示成绩分布和离群值

#### 班级分析
- **班级成绩概览**：班级整体表现统计
- **分数段分布**：优秀、良好、中等、及格、不及格比例
- **学生排名**：班级内学生成绩排名

#### 高级分析
- **多维交叉分析**：任意维度（班级、科目、考试时间等）交叉分析
- **成绩异常检测**：智能识别学生成绩异常（成绩骤降、异常高分等）
- **科目相关性分析**：分析不同科目成绩之间的关联程度
- **班级学科箱线图**：各个班级不同学科的分数分布，帮助发现极端值
- **学生贡献度分析**：分析并展示学生在各科目的优势和劣势

### 2. AI知识点分析功能

#### AI密钥管理
- 支持多种AI提供商和模型选择（OpenAI、Anthropic等）
- 用户可上传自己的API密钥
- 密钥安全加密存储

#### 知识点提取与评估
- 从作业内容中自动识别相关知识点
- 评估学生对各知识点的掌握程度
- 生成掌握程度可视化报告
- 为教师提供针对性教学建议

## 技术栈

- **前端**：React、TypeScript、Tailwind CSS、shadcn-ui
- **后端**：Supabase (PostgreSQL)
- **AI分析**：OpenAI API、Anthropic API
- **构建工具**：Vite

## 数据结构

系统包含以下主要数据表：

- `exams`：考试基本信息
- `grade_data`：学生成绩数据
- `grade_tags`：成绩标签
- `grade_data_tags`：成绩与标签的关联
- `user_ai_configs`：用户AI配置信息

## 使用指南

1. 克隆项目并安装依赖
```bash
git clone https://github.com/PIGU-PPPgu/edu-analysis.git
cd edu-analysis
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

3. 配置AI服务（可选）
   - 在"AI设置"页面选择AI提供商
   - 输入您的API密钥
   - 选择合适的模型版本

4. 导入成绩数据并开始分析

## 部署说明

本项目可通过以下方式部署：
- GitHub Pages
- Vercel
- Netlify
- 任何支持Node.js的服务器环境

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 许可证开源。

Copyright © 2024 [Linzhang Wu]

根据Apache许可证2.0版本授权
您可以在遵守许可证的前提下自由使用、修改和分发本软件

## 性能优化说明

本项目包含以下性能优化内容：

### 1. 数据缓存

项目实现了缓存机制以减少重复请求，主要文件：
- `/src/utils/cacheUtils.ts` - 缓存工具实现
- 服务中已添加缓存支持

### 2. 数据库优化

为提高数据库性能，需要执行以下操作：

1. 创建必要的数据表：
```bash
# 登录Supabase并运行create_tables.sql脚本
```

2. 添加性能索引：
```bash
# 登录Supabase并运行create_indexes.sql脚本
```

### 3. 性能工具函数

项目提供了优化渲染的工具函数：
- 节流函数 `throttle()` - 限制高频事件
- 防抖函数 `debounce()` - 优化输入处理
- 批处理函数 `processBatches()` - 优化大数据处理

使用示例：
```jsx
import { throttle } from '@/utils/optimizationUtils';

// 防止频繁触发事件导致性能问题
const handleScroll = throttle(() => {
  // 滚动处理逻辑
}, 300);

window.addEventListener('scroll', handleScroll);
```

更多优化内容请参考 `optimization-summary.md` 文件。
