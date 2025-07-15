# 🗄️ Supabase数据库架构完整参考文档

## 📋 项目概述
这是一个基于Supabase的教育管理系统，主要功能包括学生管理、成绩管理、作业系统、知识点追踪和预警系统。

## 🎯 **实际数据库状态（2024年12月）**

### ✅ **已存在且有数据的表**
- **`grade_data_new`**: 92条记录 - 主成绩表（多科目一体化）
- **`students`**: 10,654条记录 - 学生基本信息
- **`teachers`**: 1条记录 - 教师信息
- **`homework_submissions`**: 156条记录 - 作业提交记录
- **`exams`**: 2条记录 - 考试信息
- **`classes`**: 18条记录 - 班级信息
- **`user_profiles`**: 4条记录 - 用户扩展信息
- **`user_roles`**: 2条记录 - 用户角色管理
- **`warning_rules`**: 5条记录 - 预警规则配置
- **`warning_records`**: 6条记录 - 预警记录
- **`knowledge_points`**: 6条记录 - 知识点定义
- **`grading_scales`**: 2条记录 - 评分方案

### 🔶 **已存在但为空的表**
- **`homework`**: 0条记录 - 作业管理
- **`class_info`**: 0条记录 - 班级详细信息
- **`student_knowledge_mastery`**: 0条记录 - 知识点掌握度

### ❌ **不存在的表**
- **`grade_data`** - 已被 `grade_data_new` 替代

---

## 🏗️ 数据库架构概览

### 🔐 认证和权限层
- **主要组件**: Supabase Auth + 自定义角色系统
- **权限模型**: RBAC (基于角色的访问控制)
- **支持角色**: admin, teacher, student

### 📊 核心业务层
- **学校管理**: 学生、教师、班级、科目
- **成绩系统**: 多维度成绩记录和分析（主要使用 `grade_data_new`）
- **作业系统**: 作业发布、提交、批改
- **知识点系统**: 知识点掌握度追踪
- **预警系统**: 自动预警和干预

---

## 📑 核心数据表详细结构

### 📊 **`grade_data_new` - 主成绩表** ⭐
**用途**: 综合成绩管理，支持多科目一体化存储
**状态**: ✅ 已使用，92条记录

**字段结构**:
```sql
CREATE TABLE grade_data_new (
  id UUID PRIMARY KEY,
  exam_id TEXT,
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  exam_title TEXT,
  exam_type TEXT,
  exam_date DATE,
  
  -- 总分信息
  total_score NUMERIC,
  total_max_score NUMERIC,
  total_grade TEXT,
  total_rank_in_class INTEGER,
  total_rank_in_school INTEGER,
  total_rank_in_grade INTEGER,
  
  -- 各科目成绩和排名
  chinese_score NUMERIC,
  chinese_max_score NUMERIC,
  chinese_grade TEXT,
  chinese_rank_in_class INTEGER,
  chinese_rank_in_school INTEGER,
  chinese_rank_in_grade INTEGER,
  
  math_score NUMERIC,
  math_max_score NUMERIC,
  math_grade TEXT,
  math_rank_in_class INTEGER,
  math_rank_in_school INTEGER,
  math_rank_in_grade INTEGER,
  
  english_score NUMERIC,
  english_max_score NUMERIC,
  english_grade TEXT,
  english_rank_in_class INTEGER,
  english_rank_in_school INTEGER,
  english_rank_in_grade INTEGER,
  
  physics_score NUMERIC,
  physics_max_score NUMERIC,
  physics_grade TEXT,
  physics_rank_in_class INTEGER,
  physics_rank_in_school INTEGER,
  physics_rank_in_grade INTEGER,
  
  chemistry_score NUMERIC,
  chemistry_max_score NUMERIC,
  chemistry_grade TEXT,
  chemistry_rank_in_class INTEGER,
  chemistry_rank_in_school INTEGER,
  chemistry_rank_in_grade INTEGER,
  
  biology_score NUMERIC,
  biology_max_score NUMERIC,
  biology_grade TEXT,
  biology_rank_in_class INTEGER,
  biology_rank_in_school INTEGER,
  biology_rank_in_grade INTEGER,
  
  geography_score NUMERIC,
  geography_max_score NUMERIC,
  geography_grade TEXT,
  geography_rank_in_class INTEGER,
  geography_rank_in_school INTEGER,
  geography_rank_in_grade INTEGER,
  
  history_score NUMERIC,
  history_max_score NUMERIC,
  history_grade TEXT,
  history_rank_in_class INTEGER,
  history_rank_in_school INTEGER,
  history_rank_in_grade INTEGER,
  
  politics_score NUMERIC,
  politics_max_score NUMERIC,
  politics_grade TEXT,
  politics_rank_in_class INTEGER,
  politics_rank_in_school INTEGER,
  politics_rank_in_grade INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 👥 **`students` - 学生表** ⭐
**用途**: 学生基本信息管理
**状态**: ✅ 已使用，10,654条记录

### 👨‍🏫 **`teachers` - 教师表**
**用途**: 教师信息管理
**状态**: ✅ 已使用，1条记录

### 📝 **`homework_submissions` - 作业提交表**
**用途**: 作业提交记录
**状态**: ✅ 已使用，156条记录

### 🔍 **`exams` - 考试表**
**用途**: 考试基本信息
**状态**: ✅ 已使用，2条记录

### 🏫 **`classes` - 班级表**
**用途**: 班级基本信息
**状态**: ✅ 已使用，18条记录

### ⚠️ **`warning_rules` - 预警规则表**
**用途**: 预警规则配置
**状态**: ✅ 已使用，5条记录

### 📊 **`warning_records` - 预警记录表**
**用途**: 预警记录管理
**状态**: ✅ 已使用，6条记录

### 🧠 **`knowledge_points` - 知识点表**
**用途**: 知识点定义
**状态**: ✅ 已使用，6条记录

### 📏 **`grading_scales` - 评分标准表**
**用途**: 评分方案管理
**状态**: ✅ 已使用，2条记录

---

## 🎯 **组件与数据表映射关系**

### 📊 **成绩相关组件**
| 组件/文件 | 使用的表 | 主要功能 |
|----------|---------|---------|
| `ModernGradeAnalysisContext.tsx` | `grade_data_new`, `exams` | 成绩分析上下文，加载考试和成绩数据 |
| `SimpleGradeImporter.tsx` | `grade_data_new` | 成绩导入功能 |
| `OptimizedGradeDataTable.tsx` | `grade_data_new` | 成绩数据表格显示 |
| `EnhancedGradeAnalysis.tsx` | `grade_data_new` | 增强成绩分析 |
| `EnhancedSubjectCorrelationMatrix.tsx` | `grade_data_new` | 科目关联性分析 |
| `examService.ts` | `grade_data_new` | 考试和成绩服务 |
| `gradeAnalysisService.ts` | `grade_data_new` | 成绩分析服务 |

### 👥 **学生相关组件**
| 组件/文件 | 使用的表 | 主要功能 |
|----------|---------|---------|
| `StudentManagement.tsx` | `students` | 学生信息管理 |
| `StudentPortraitManagement.tsx` | `students` | 学生画像管理 |
| `ClassProfile.tsx` | `students` | 班级学生信息展示 |
| `IntelligentPortraitAnalysis.tsx` | `students` | 智能画像分析 |
| `RecordStudentHomeworkDialog.tsx` | `students`, `homework_submissions` | 学生作业记录 |

### 📝 **作业相关组件**
| 组件/文件 | 使用的表 | 主要功能 |
|----------|---------|---------|
| `HomeworkManagement.tsx` | `homework`, `homework_submissions` | 作业管理主页 |
| `HomeworkDetail.tsx` | `homework`, `homework_submissions` | 作业详情页面 |
| `SubmitHomeworkDialog.tsx` | `homework_submissions` | 学生作业提交 |
| `KnowledgePointManager.tsx` | `knowledge_points` | 知识点管理 |

### ⚠️ **预警相关组件**
| 组件/文件 | 使用的表 | 主要功能 |
|----------|---------|---------|
| `WarningDashboard.tsx` | `warning_rules`, `warning_records` | 预警看板 |
| `ExamWarningAnalysis.tsx` | `warning_records` | 考试预警分析 |

### 🏫 **班级相关组件**
| 组件/文件 | 使用的表 | 主要功能 |
|----------|---------|---------|
| `ClassManagement.tsx` | `classes` | 班级管理 |
| `ClassStudentsList.tsx` | `students` | 班级学生列表 |

---

## 🚨 **当前数据库设计问题**

### ❌ **废弃的表引用**
1. **`grade_data` 表已不存在**
   - ✅ **已解决**: 所有引用已更新为 `grade_data_new`
   - 📂 **影响文件**: `examService.ts`, `gradeAnalysisService.ts`, `ModernGradeAnalysisContext.tsx`

### 🔶 **空表问题**
1. **`homework` 表为空**
   - 🎯 **建议**: 检查作业创建流程是否正常
   - 📂 **相关组件**: `HomeworkManagement.tsx`

2. **`class_info` 表为空**
   - 🎯 **建议**: 考虑与 `classes` 表合并或迁移数据
   - 📂 **当前状态**: `classes` 表有18条记录，`class_info` 为空

3. **`student_knowledge_mastery` 表为空**
   - 🎯 **建议**: 检查知识点评估功能是否启用
   - 📂 **相关组件**: `KnowledgePointManager.tsx`

---

## 🔧 **推荐的优化操作**

### 1. **清理废弃表引用**
```sql
-- 确认所有代码已更新后，可以考虑删除schema中的grade_data表定义
-- 注意：实际数据库中该表已不存在
```

### 2. **合并重复表**
```sql
-- 考虑将classes表数据迁移到class_info表，或者废弃class_info表
-- 当前classes表有数据，class_info表为空
```

### 3. **性能优化索引**
```sql
-- 为高频查询字段添加索引
CREATE INDEX IF NOT EXISTS idx_grade_data_new_student_exam 
ON grade_data_new(student_id, exam_id);

CREATE INDEX IF NOT EXISTS idx_grade_data_new_class_exam 
ON grade_data_new(class_name, exam_title);
```

---

## 📊 **常用查询模式**

### 1. **学生成绩查询**
```sql
-- 查询学生某次考试的详细成绩
SELECT * FROM grade_data_new 
WHERE student_id = ? AND exam_title = ?;

-- 查询学生成绩趋势
SELECT exam_date, total_score, total_rank_in_class
FROM grade_data_new 
WHERE student_id = ?
ORDER BY exam_date;
```

### 2. **班级分析查询**
```sql
-- 班级平均分统计
SELECT 
    class_name,
    AVG(total_score) as avg_score,
    COUNT(*) as student_count
FROM grade_data_new 
WHERE exam_title = ?
GROUP BY class_name;
```

### 3. **学生信息查询**
```sql
-- 获取班级学生列表
SELECT * FROM students 
WHERE class_name = ?
ORDER BY name;
```

### 4. **预警查询**
```sql
-- 活跃预警统计
SELECT 
    s.name as student_name,
    s.class_name,
    COUNT(*) as warning_count,
    MAX(wr.created_at) as latest_warning
FROM warning_records wr
JOIN students s ON s.student_id = wr.student_id
WHERE wr.status = 'active'
GROUP BY s.student_id, s.name, s.class_name;
```

---

## ⚡ **数据统计概览**

| 表名 | 记录数 | 状态 | 主要用途 |
|------|--------|------|----------|
| `grade_data_new` | 92 | ✅ 活跃 | 成绩管理核心表 |
| `students` | 10,654 | ✅ 活跃 | 学生信息管理 |
| `homework_submissions` | 156 | ✅ 活跃 | 作业提交记录 |
| `classes` | 18 | ✅ 活跃 | 班级基本信息 |
| `knowledge_points` | 6 | ✅ 活跃 | 知识点定义 |
| `warning_records` | 6 | ✅ 活跃 | 预警记录 |
| `warning_rules` | 5 | ✅ 活跃 | 预警规则 |
| `exams` | 2 | ✅ 活跃 | 考试信息 |
| `grading_scales` | 2 | ✅ 活跃 | 评分标准 |
| `user_roles` | 2 | ✅ 活跃 | 用户角色 |
| `user_profiles` | 4 | ✅ 活跃 | 用户资料 |
| `teachers` | 1 | ✅ 活跃 | 教师信息 |

---

## 🔒 **安全策略建议**

### RLS 策略重点
1. **成绩数据访问控制**
   - 学生只能查看自己的成绩
   - 教师只能查看所教班级的成绩
   - 管理员可以查看所有成绩

2. **学生信息保护**
   - 严格控制学生个人信息的访问权限
   - 实施数据脱敏策略

---

**文档版本**: v2.0 (基于实际数据库结构)  
**最后更新**: 2024年12月17日  
**数据库检查时间**: 2024年12月17日  
**维护者**: Claude Assistant 