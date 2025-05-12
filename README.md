# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3612dbef-1ec7-4699-a7e7-45f7484c3789

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3612dbef-1ec7-4699-a7e7-45f7484c3789) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3612dbef-1ec7-4699-a7e7-45f7484c3789) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## AI知识点分析功能

系统集成了AI分析功能，能够自动从作业中提取知识点并进行分析。

### 主要功能

1. **AI密钥管理**
   - 用户可上传自己的AI API密钥（如OpenAI、Anthropic等）
   - 密钥安全加密存储在Supabase数据库中
   - 支持多种AI提供商和模型选择

2. **知识点提取**
   - 从作业内容中自动识别相关知识点
   - 为每个知识点提供描述和重要性评级
   - 自动过滤与已有知识点相似的内容

3. **知识点评估**
   - 评估学生对各知识点的掌握程度
   - 生成掌握程度可视化报告
   - 为教师提供针对性教学建议

### 使用方法

1. 在"AI设置"页面配置您的AI服务：
   - 选择AI提供商（OpenAI、Anthropic等）
   - 输入您的API密钥
   - 选择合适的模型版本
   - 启用AI分析功能

2. 在作业详情页面，使用"AI分析"功能：
   - 上传作业内容或学生答案
   - 系统自动提取相关知识点
   - 检查并确认提取的知识点
   - 保存到知识库

3. 在评分页面，使用知识点评估：
   - 为每个知识点设置掌握程度
   - 生成基于知识点的反馈
   - 查看班级整体知识点掌握情况

### 技术说明

- AI配置信息和密钥安全存储在Supabase数据库的`user_ai_configs`表中
- API密钥经过加密后存储，确保安全性
- 使用行级安全(RLS)策略确保用户只能访问自己的AI配置
- 通过Supabase Edge Functions验证API密钥有效性
- 支持离线模式，在AI服务不可用时使用模拟数据

# 成绩分析系统

## 功能概述

本系统是一个全面的成绩分析平台，旨在帮助教师更好地理解和分析学生成绩数据。系统提供了多角度的数据分析功能，包括班级整体分析、学生个人进步分析、高级统计分析以及AI智能分析助手。

### 主要功能模块

1. **数据看板**
   - 成绩总览：平均分、最高分、最低分等基本统计
   - 分数分布：不同分数段的学生分布情况
   - 箱线图分析：直观展示成绩分布和离群值

2. **班级分析**
   - 班级成绩概览：班级整体表现统计
   - 分数段分布：优秀、良好、中等、及格、不及格比例
   - 学生排名：班级内学生成绩排名

3. **学生进步**
   - 学生历次成绩趋势
   - 进步幅度分析
   - 各科目进步情况对比

4. **高级分析**
   - 班级间成绩对比
   - 学科分析
   - 多维度统计分析

5. **标签分析**
   - 自定义标签管理
   - 为成绩添加标签
   - 按标签筛选和分析成绩

6. **AI助手**
   - 智能成绩分析
   - 教学建议生成
   - 问答式分析交互

## 技术栈

- 前端：React、TypeScript、Tailwind CSS
- 后端：Supabase (PostgreSQL)
- AI分析：OpenAI API

## 数据结构

系统包含以下主要数据表：

- `exams`: 考试基本信息
- `grade_data`: 学生成绩数据
- `grade_tags`: 成绩标签
- `grade_data_tags`: 成绩与标签的关联

## 使用指南

1. 导入成绩数据
2. 在数据看板查看基本分析
3. 使用班级分析和学生进步功能深入了解具体情况
4. 通过标签功能对成绩进行分类管理
5. 使用AI助手获取智能分析和建议

## 开发者说明

项目使用模块化组件设计，各功能模块相对独立，便于扩展和维护。
