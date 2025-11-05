---
description: 
globs: 
alwaysApply: true
---
# 数据库操作

本应用使用Supabase作为后端数据库，以下是常见数据库操作的模式和最佳实践。

## Supabase客户端设置

所有数据库操作都通过Supabase客户端进行。客户端在以下文件中配置：

[src/integrations/supabase/client.ts](mdc:src/integrations/supabase/client.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ
";

// 导入方式：
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

# 🎯 **版本**: v3.0  
> 📅 **更新时间**: 2025-01-15  
> 👤 **维护者**: 学生画像系统开发团队  
> 🔍 **数据源**: Supabase 数据库实际结构 (项目ID: giluhqotfjpmofowvogn)

## 📋 概述

本文档基于 Supabase 数据库的实际结构，详细记录了学生画像系统中所有数据库表、字段及其统一性规范。经过实际数据库查询验证，确保文档准确性，是系统数据一致性的"基础中的基础"。

## 🎯 核心原则

1. **实际性原则**: 基于真实数据库结构，确保文档准确性
2. **唯一性原则**: 每个字段在系统中有且仅有一个标准命名
3. **一致性原则**: 前端显示名称、后端字段名、API接口字段保持映射一致
4. **可追溯原则**: 所有字段变更都有明确的版本记录
5. **标准化原则**: 遵循统一的命名规范和数据类型约定

## 📊 核心数据库表分类

### 🏫 教学管理核心表
- `students` - 学生信息表 (核心实体)
- `classes` - 班级管理表
- `class_info` - 班级详细信息表
- `teachers` - 教师信息表
- `subjects` - 科目配置表

### 📚 考试成绩数据表
- `exams` - 考试信息表
- `grade_data` - 成绩数据表 (主要成绩存储)
- `grades` - 标准化成绩表
- `exam_scores` - 考试分数表

### 📝 作业管理表
- `homework` - 作业任务表
- `homework_submissions` - 作业提交表
- `grading_criteria` - 评分标准表
- `knowledge_points` - 知识点表

### ⚠️ 预警分析表
- `warning_rules` - 预警规则表
- `warning_records` - 预警记录表
- `student_warnings` - 学生预警表 (视图)

### 👤 学生画像表
- `student_portraits` - 学生画像表
- `student_ai_tags` - AI标签表
- `student_learning_behaviors` - 学习行为表
- `student_learning_styles` - 学习风格表

### 🔧 系统配置表
- `user_profiles` - 用户配置表
- `user_ai_configs` - AI配置表
- `academic_terms` - 学期管理表

## 🗄️ 详细表结构

### 1. 学生信息表 (students) 🎓

**表用途**: 存储学生基本信息，系统核心实体表  
**主键**: `id` (UUID)  
**业务主键**: `student_id` (学号)  
**当前数据**: 约200+条学生记录

| 字段名 | 数据类型 | 是否必填 | 默认值 | 约束条件 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|----------|------|
| `id` | UUID | 是 | gen_random_uuid() | 主键 | 系统ID | 内部唯一标识 |
| `student_id` | TEXT | 是 | - | 唯一约束 | 学号 | 业务主键，如"108110907006" |
| `name` | TEXT | 是 | - | - | 姓名 | 学生真实姓名 |
| `class_id` | UUID | 否 | NULL | 外键→classes.id | 班级ID | 所属班级的系统ID |
| `class_name` | TEXT | 否 | NULL | - | 班级名称 | 冗余字段，如"初三7班" |
| `grade` | TEXT | 否 | NULL | - | 年级 | 所在年级 |
| `gender` | TEXT | 否 | NULL | ('男','女','其他') | 性别 | 性别信息 |
| `admission_year` | TEXT | 否 | NULL | - | 入学年份 | 学生入学年份 |
| `contact_phone` | TEXT | 否 | NULL | - | 联系电话 | 联系方式 |
| `contact_email` | TEXT | 否 | NULL | - | 联系邮箱 | 邮箱地址 |
| `user_id` | UUID | 否 | NULL | 外键→auth.users.id | 用户ID | 关联登录账号 |
| `metadata` | JSONB | 否 | '{}' | - | 元数据 | 扩展信息存储 |
| `created_at` | TIMESTAMPTZ | 否 | now() | - | 创建时间 | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | 否 | now() | - | 更新时间 | 记录更新时间 |

**约束关系**:
- 主键约束: `students_pkey` (id)
- 唯一约束: `students_student_id_key` (student_id)
- 唯一约束: `students_student_id_unique` (student_id)
- 外键约束: `students_class_id_fkey` → classes(id)
- 外键约束: `students_user_id_fkey` → auth.users(id) ON DELETE SET NULL
- 检查约束: `students_gender_check` (gender IN ('男', '女', '其他'))

**数据样本**:
```json
{
  "student_id": "108110907006",
  "name": "韦雅琳",
  "class_name": "初三7班",
  "grade": null,
  "created_at": "2025-05-14T06:34:37.861256Z"
}
```

### 2. 考试信息表 (exams) 📝

**表用途**: 存储考试基本信息，作为所有成绩数据的关联主表  
**主键**: `id` (UUID)  
**唯一约束**: `title + date + type`

| 字段名 | 数据类型 | 是否必填 | 默认值 | 约束条件 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|----------|------|
| `id` | UUID | 是 | gen_random_uuid() | 主键 | 考试ID | 系统唯一标识 |
| `title` | TEXT | 是 | - | - | 考试标题 | 如"907九下月考成绩" |
| `type` | TEXT | 是 | - | - | 考试类型 | 如"月考"、"期中考试" |
| `date` | DATE | 是 | - | - | 考试日期 | 考试举行日期 |
| `subject` | TEXT | 否 | NULL | - | 科目 | 单科考试时使用 |
| `scope` | TEXT | 否 | 'class' | - | 考试范围 | 'class'/'grade'/'school' |
| `created_by` | UUID | 否 | NULL | 外键→auth.users.id | 创建者 | 考试创建人 |
| `created_at` | TIMESTAMPTZ | 否 | now() | - | 创建时间 | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | 否 | now() | - | 更新时间 | 记录更新时间 |

**约束关系**:
- 主键约束: `exams_pkey` (id)
- 唯一约束: `exams_title_date_type_key` (title, date, type)
- 外键约束: `exams_created_by_fkey` → auth.users(id)

### 3. 成绩数据表 (grade_data) 📊

**表用途**: 存储学生成绩数据，系统主要成绩表，支持多科目和自定义字段  
**主键**: `id` (UUID)  
**唯一约束**: `exam_id + student_id + subject`

| 字段名 | 数据类型 | 是否必填 | 默认值 | 约束条件 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|----------|------|
| `id` | UUID | 是 | gen_random_uuid() | 主键 | 记录ID | 系统唯一标识 |
| `exam_id` | UUID | 是 | - | 外键→exams.id | 考试ID | 关联考试信息 |
| `student_id` | TEXT | 是 | - | - | 学号 | 关联学生 |
| `name` | TEXT | 是 | - | - | 姓名 | 冗余存储便于查询 |
| `class_name` | TEXT | 否 | '未知班级' | - | 班级名称 | 冗余存储便于查询 |
| `subject` | TEXT | 否 | NULL | - | 科目 | 当前成绩所属科目 |
| `score` | NUMERIC | 否 | NULL | - | 分数 | 该科目的得分 |
| `total_score` | NUMERIC | 否 | NULL | - | 总分 | 多科总分 |
| `grade` | TEXT | 否 | NULL | - | 等级 | 成绩等级 |
| `rank_in_class` | INTEGER | 否 | NULL | - | 班级排名 | 班内排名 |
| `rank_in_grade` | INTEGER | 否 | NULL | - | 年级排名 | 年级内排名 |
| `rank_in_school` | INTEGER | 否 | NULL | - | 校内排名 | 全校排名 |
| `grade_level` | TEXT | 否 | NULL | - | 年级层次 | 所在年级 |
| `subject_total_score` | NUMERIC | 否 | NULL | - | 科目满分 | 该科目满分值 |
| `original_grade` | TEXT | 否 | NULL | - | 原始等级 | 导入时的等级 |
| `computed_grade` | TEXT | 否 | NULL | - | 计算等级 | 系统计算的等级 |
| `percentile` | NUMERIC | 否 | NULL | - | 百分位数 | 统计分析用 |
| `z_score` | NUMERIC | 否 | NULL | - | Z分数 | 标准化分数 |
| `is_analyzed` | BOOLEAN | 否 | false | - | 是否已分析 | AI分析状态 |
| `analyzed_at` | TIMESTAMPTZ | 否 | NULL | - | 分析时间 | AI分析时间 |
| `exam_title` | TEXT | 否 | NULL | - | 考试标题 | 冗余存储 |
| `exam_type` | TEXT | 否 | NULL | - | 考试类型 | 冗余存储 |
| `exam_date` | DATE | 否 | NULL | - | 考试日期 | 冗余存储 |
| `exam_scope` | TEXT | 否 | 'class' | - | 考试范围 | 考试覆盖范围 |
| `import_strategy` | TEXT | 否 | NULL | - | 导入策略 | 数据导入方式 |
| `match_type` | TEXT | 否 | NULL | - | 匹配类型 | 学生匹配方式 |
| `multiple_matches` | BOOLEAN | 否 | false | - | 多重匹配 | 是否存在多重匹配 |
| `metadata` | JSONB | 否 | '{}' | - | 元数据 | 扩展信息 |
| `created_at` | TIMESTAMPTZ | 否 | now() | - | 创建时间 | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | 否 | now() | - | 更新时间 | 记录更新时间 |

**动态自定义字段**: 系统支持`custom_*`格式的动态字段，用于存储导入时的自定义科目成绩

**约束关系**:
- 主键约束: `grade_data_pkey` (id)
- 唯一约束: `grade_data_exam_id_student_id_subject_key` (exam_id, student_id, subject)
- 外键约束: `grade_data_exam_id_fkey` → exams(id) ON DELETE CASCADE

**数据样本**:
```json
{
  "student_id": "108110907002",
  "name": "张英乐",
  "class_name": "初三7班",
  "subject": "语文",
  "score": "85.5",
  "grade": "B+"
}
```

### 4. 班级信息表 (class_info) 🏫

**表用途**: 存储班级详细信息和配置  
**主键**: `class_name` (TEXT)

| 字段名 | 数据类型 | 是否必填 | 默认值 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|------|
| `class_name` | TEXT | 是 | - | 班级名称 | 主键，如"初三7班" |
| `grade_level` | TEXT | 是 | - | 年级层次 | 如"初三" |
| `academic_year` | TEXT | 是 | - | 学年 | 如"2025" |
| `homeroom_teacher` | TEXT | 否 | NULL | 班主任 | 班主任姓名 |
| `student_count` | INTEGER | 否 | NULL | 学生人数 | 班级总人数 |
| `department` | TEXT | 否 | NULL | 所属部门 | 组织架构 |
| `created_at` | TIMESTAMPTZ | 否 | now() | 创建时间 | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | 否 | now() | 更新时间 | 记录更新时间 |

### 5. 预警规则表 (warning_rules) ⚠️

**表用途**: 存储学生预警的规则配置  
**主键**: `id` (UUID)

| 字段名 | 数据类型 | 是否必填 | 默认值 | 约束条件 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|----------|------|
| `id` | UUID | 是 | gen_random_uuid() | 主键 | 规则ID | 系统唯一标识 |
| `name` | TEXT | 是 | - | - | 规则名称 | 如"连续不及格预警" |
| `description` | TEXT | 否 | NULL | - | 规则描述 | 详细说明 |
| `conditions` | JSONB | 是 | - | - | 触发条件 | JSON格式的条件配置 |
| `severity` | TEXT | 是 | - | ('low','medium','high') | 严重程度 | 预警级别 |
| `is_active` | BOOLEAN | 否 | true | - | 是否启用 | 规则开关 |
| `is_system` | BOOLEAN | 否 | false | - | 是否系统规则 | 系统预置规则 |
| `created_by` | UUID | 否 | NULL | 外键→auth.users.id | 创建者 | 规则创建人 |
| `created_at` | TIMESTAMPTZ | 否 | now() | - | 创建时间 | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | 否 | now() | - | 更新时间 | 记录更新时间 |

**条件配置样本**:
```json
{
  "type": "consecutive_fails",
  "times": 2,
  "subject": null,
  "score_threshold": 60
}
```

### 6. 作业管理表 (homework) 📝

**表用途**: 存储作业任务信息  
**主键**: `id` (UUID)

| 字段名 | 数据类型 | 是否必填 | 默认值 | 约束条件 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|----------|------|
| `id` | UUID | 是 | gen_random_uuid() | 主键 | 作业ID | 系统唯一标识 |
| `title` | TEXT | 是 | - | - | 作业标题 | 作业名称 |
| `description` | TEXT | 否 | NULL | - | 作业描述 | 详细说明 |
| `due_date` | DATE | 否 | NULL | - | 截止日期 | 提交截止时间 |
| `class_id` | UUID | 否 | NULL | 外键→classes.id | 班级ID | 关联班级 |
| `created_by` | UUID | 否 | NULL | 外键→auth.users.id | 创建者 | 作业发布人 |
| `grading_scale_id` | UUID | 否 | NULL | 外键→grading_scales.id | 评分标准 | 评分规则 |
| `created_at` | TIMESTAMPTZ | 否 | now() | - | 创建时间 | 记录创建时间 |

### 7. 用户AI配置表 (user_ai_configs) 🤖

**表用途**: 存储用户的AI服务配置  
**主键**: `id` (UUID)

| 字段名 | 数据类型 | 是否必填 | 默认值 | 约束条件 | 中文含义 | 说明 |
|--------|----------|----------|--------|----------|----------|------|
| `id` | UUID | 是 | uuid_generate_v4() | 主键 | 配置ID | 系统唯一标识 |
| `user_id` | UUID | 是 | - | 外键→auth.users.id,唯一 | 用户ID | 关联用户 |
| `provider` | VARCHAR(255) | 是 | - | - | AI服务商 | 如"openai","doubao" |
| `version` | VARCHAR(255) | 否 | NULL | - | 模型版本 | AI模型版本 |
| `api_key_encrypted` | TEXT | 是 | - | - | 加密API密钥 | 加密存储的密钥 |
| `enabled` | BOOLEAN | 否 | true | - | 是否启用 | 配置开关 |
| `custom_providers` | JSONB | 否 | NULL | - | 自定义提供商 | 自定义AI配置 |
| `created_at` | TIMESTAMPTZ | 否 | now() | - | 创建时间 | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | 否 | now() | - | 更新时间 | 记录更新时间 |

## 🔗 核心表关系图

```mermaid
graph TB
    A[auth.users<br/>Supabase认证] --> B[user_profiles<br/>用户配置]
    A --> C[teachers<br/>教师表]
    A --> D[user_ai_configs<br/>AI配置]
    
    E[academic_terms<br/>学期管理] --> F[course_classes<br/>课程班级]
    C --> F
    
    G[subjects<br/>科目表] --> F
    G --> H[grades<br/>标准成绩表]
    
    I[class_info<br/>班级信息] --> J[students<br/>学生表]
    I --> F
    
    K[classes<br/>班级管理] --> L[homework<br/>作业表]
    K --> J
    J --> M[homework_submissions<br/>作业提交]
    L --> M
    
    N[exams<br/>考试表] --> O[grade_data<br/>成绩数据表]
    J --> O
    J --> H
    
    P[warning_rules<br/>预警规则] --> Q[warning_records<br/>预警记录]
    J --> Q
    
    J --> R[student_portraits<br/>学生画像]
    J --> S[student_ai_tags<br/>AI标签]
```

## 🎯 前端字段映射规范

### TypeScript 核心接口定义

```typescript
// src/types/database.ts
export interface Student {
  id: string;
  student_id: string;      // 🔑 业务主键
  name: string;
  class_id?: string;
  class_name?: string;
  grade?: string;
  gender?: '男' | '女' | '其他';
  admission_year?: string;
  contact_phone?: string;
  contact_email?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Exam {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
  scope?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GradeData {
  id: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  rank_in_school?: number;
  // ... 其他字段
}
```

### 字段映射配置

```typescript
// src/config/fieldMapping.ts
export const FIELD_MAPPING = {
  // 学生信息映射
  '学号': 'student_id',
  '姓名': 'name', 
  '班级': 'class_name',
  '年级': 'grade',
  '性别': 'gender',
  
  // 成绩科目映射
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
  '政治': 'politics',
  '历史': 'history',
  '生物': 'biology',
  '地理': 'geography',
  
  // 考试类型映射
  '月考': 'monthly_exam',
  '期中考试': 'midterm_exam',
  '期末考试': 'final_exam',
  '模拟考试': 'mock_exam'
} as const;
```

## 🔧 数据库视图和函数

### 重要视图

1. **grade_analysis_view** - 成绩分析视图
2. **class_performance_summary** - 班级表现汇总
3. **subject_comparison_view** - 科目对比视图
4. **student_progress_summary** - 学生进步汇总
5. **active_warnings_summary** - 活跃预警汇总

### 系统函数

- **get_student_grade_summary()** - 获取学生成绩汇总
- **calculate_class_statistics()** - 计算班级统计信息
- **update_warning_statistics()** - 更新预警统计

## ⚠️ 当前已知问题

### 高优先级问题
1. **临时学号问题**: 导入时生成`temp_*`格式的临时学号，需要替换为真实学号
2. **字段冗余**: `grade_data`表中`name`、`class_name`等字段冗余存储
3. **等级计算不一致**: 不同组件使用不同的等级计算规则

### 中优先级问题
1. **自定义字段管理**: `custom_*`字段缺乏统一管理机制
2. **数据同步**: 冗余字段的数据同步机制需要完善
3. **约束检查**: 部分业务规则缺乏数据库层面的约束

## 📝 开发使用指南

### 1. 新增字段流程
1. 确认字段在此文档中的定义
2. 更新TypeScript接口定义
3. 更新字段映射配置
4. 执行数据库迁移
5. 更新相关API接口
6. 更新前端组件

### 2. 查询最佳实践
```sql
-- ✅ 推荐：使用视图进行复杂查询
SELECT * FROM grade_analysis_view 
WHERE class_name = '初三7班';

-- ✅ 推荐：明确指定字段，避免SELECT *
SELECT student_id, name, class_name, score 
FROM grade_data 
WHERE exam_id = $1;

-- ❌ 避免：直接在应用层做复杂计算
-- 应该通过数据库函数或视图实现
```

### 3. 数据导入规范
1. 优先匹配`student_id`字段
2. 使用标准化的科目代码
3. 遵循字段映射配置
4. 验证数据完整性和约束

## 📊 数据统计信息

- **总表数**: 60+ 个表
- **核心业务表**: 20+ 个表
- **视图数**: 10+ 个视图
- **当前学生数**: 200+ 条记录
- **当前成绩记录**: 1000+ 条记录

---
> 📌 **重要提醒**: 此文档应与实际数据库保持同步，任何数据库结构变更都应及时更新此文档。 
