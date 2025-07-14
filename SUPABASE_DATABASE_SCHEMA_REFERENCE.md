# 🗄️ Supabase数据库架构完整参考文档

## 📋 项目概述
这是一个基于Supabase的教育管理系统，主要功能包括学生管理、成绩管理、作业系统、知识点追踪和预警系统。

## 🏗️ 数据库架构概览

### 🔐 认证和权限层
- **主要组件**: Supabase Auth + 自定义角色系统
- **权限模型**: RBAC (基于角色的访问控制)
- **支持角色**: admin, teacher, student

### 📊 核心业务层
- **学校管理**: 学生、教师、班级、科目
- **成绩系统**: 多维度成绩记录和分析
- **作业系统**: 作业发布、提交、批改
- **知识点系统**: 知识点掌握度追踪
- **预警系统**: 自动预警和干预

---

## 📑 数据表详细结构

### 🔐 用户认证和权限管理

#### `auth.users` (Supabase内置)
**用途**: Supabase原生用户认证表
```sql
-- 主要字段
id UUID PRIMARY KEY
email TEXT UNIQUE
phone TEXT
created_at TIMESTAMPTZ
```

#### `user_profiles`
**用途**: 用户扩展信息表，存储用户的详细资料
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT UNIQUE,
  user_type TEXT DEFAULT 'student',
  bio TEXT,
  social_links JSONB,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**关联**: `auth.users` (1:1)

#### `user_roles`
**用途**: 用户角色管理，支持多角色分配
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL, -- ENUM: 'admin', 'teacher', 'student'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
```
**业务规则**: 
- 新用户默认分配student角色
- 支持一个用户拥有多个角色

#### `user_settings`
**用途**: 用户个人设置和偏好
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  default_grading_scale_id UUID REFERENCES grading_scales(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `notification_settings`
**用途**: 通知偏好设置
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  homework_due BOOLEAN DEFAULT true,
  grade_posted BOOLEAN DEFAULT true,
  system_announcement BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true
);
```

### 👥 学校基础信息管理

#### `students`
**用途**: 学生基本信息管理
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT UNIQUE NOT NULL, -- 学号
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id),
  user_id UUID REFERENCES auth.users(id),
  admission_year TEXT,
  gender TEXT CHECK (gender IN ('男', '女', '其他')),
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**关键索引**: student_id, class_id, user_id
**业务规则**: student_id作为业务主键，支持与auth.users关联

#### `teachers`
**用途**: 教师信息管理
```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**设计理念**: 直接使用auth.users的ID作为主键，强制关联

#### `class_info`
**用途**: 班级详细信息管理（主班级表）
```sql
CREATE TABLE class_info (
  class_name TEXT PRIMARY KEY,
  grade_level TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  homeroom_teacher TEXT,
  student_count INTEGER,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**注意**: 使用class_name作为主键，便于业务查询

#### `classes`
**用途**: 简化班级表（考虑废弃，与class_info重复）
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, grade)
);
```
**状态**: 🚨 **建议废弃** - 与class_info功能重复

#### `subjects`
**用途**: 科目管理
```sql
CREATE TABLE subjects (
  subject_code TEXT PRIMARY KEY,
  subject_name TEXT NOT NULL,
  credit NUMERIC,
  category TEXT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `academic_terms`
**用途**: 学年学期管理
```sql
CREATE TABLE academic_terms (
  id UUID PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  UNIQUE(academic_year, semester)
);
```

#### `course_classes`
**用途**: 课程-班级-教师关联表
```sql
CREATE TABLE course_classes (
  id UUID PRIMARY KEY,
  subject_code TEXT NOT NULL REFERENCES subjects(subject_code),
  class_name TEXT NOT NULL REFERENCES class_info(class_name),
  teacher_id UUID REFERENCES teachers(id),
  term_id UUID REFERENCES academic_terms(id),
  schedule JSONB,
  UNIQUE(subject_code, class_name, term_id)
);
```

### 📊 成绩管理系统

#### `grade_data` (推荐主成绩表)
**用途**: 综合成绩管理，支持多科目一体化存储
```sql
CREATE TABLE grade_data (
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
  total_max_score NUMERIC DEFAULT 523,
  total_grade TEXT,
  
  -- 各科目成绩 (chinese, math, english, physics, chemistry, politics, history, biology, geography)
  chinese_score NUMERIC,
  chinese_grade TEXT,
  math_score NUMERIC,
  math_grade TEXT,
  -- ... 其他科目类似
  
  -- 排名信息
  total_rank_in_class INTEGER,
  total_rank_in_school INTEGER,
  total_rank_in_grade INTEGER,
  
  -- 各科目排名
  chinese_rank_in_class INTEGER,
  math_rank_in_class INTEGER,
  -- ... 其他科目类似
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
**设计优势**: 
- 一行记录包含学生一次考试的所有科目成绩
- 便于横向比较和统计分析
- 支持灵活的排名计算

#### `grades` (简化成绩表)
**用途**: 单科目成绩记录
```sql
CREATE TABLE grades (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id),
  subject TEXT NOT NULL,
  score NUMERIC NOT NULL,
  exam_date DATE,
  exam_type TEXT,
  exam_title TEXT,
  rank_in_class INTEGER,
  rank_in_grade INTEGER,
  grade_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**状态**: 🔄 **可考虑简化** - 功能被grade_data覆盖

### 📝 作业和评分系统

#### `homework`
**用途**: 作业管理
```sql
CREATE TABLE homework (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  class_id UUID REFERENCES classes(id),
  created_by UUID REFERENCES auth.users(id),
  grading_scale_id UUID REFERENCES grading_scales(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `homework_submissions`
**用途**: 作业提交记录
```sql
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES homework(id),
  student_id UUID NOT NULL REFERENCES students(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  files JSONB,
  status TEXT DEFAULT 'submitted',
  score NUMERIC,
  grade TEXT,
  feedback TEXT,
  teacher_feedback TEXT,
  ai_analysis JSONB,
  knowledge_points_assessed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `grading_scales`
**用途**: 评分方案管理
```sql
CREATE TABLE grading_scales (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
**业务规则**: 确保至少有一个默认评分方案

#### `grading_scale_levels`
**用途**: 评分等级定义
```sql
CREATE TABLE grading_scale_levels (
  id UUID PRIMARY KEY,
  scale_id UUID REFERENCES grading_scales(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  color TEXT,
  description TEXT,
  position INTEGER NOT NULL
);
```

### 🧠 知识点和学习管理

#### `knowledge_points`
**用途**: 知识点定义
```sql
CREATE TABLE knowledge_points (
  id UUID PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES homework(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `student_knowledge_mastery`
**用途**: 学生知识点掌握度记录（推荐主表）
```sql
CREATE TABLE student_knowledge_mastery (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id),
  knowledge_point_id UUID NOT NULL REFERENCES knowledge_points(id),
  homework_id UUID NOT NULL REFERENCES homework(id),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id),
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  mastery_grade TEXT DEFAULT 'C' CHECK (mastery_grade IN ('A', 'B', 'C', 'D', 'E')),
  assessment_count INTEGER DEFAULT 1,
  comments TEXT,
  UNIQUE(student_id, knowledge_point_id, homework_id)
);
```

#### `submission_knowledge_points`
**用途**: 提交-知识点关联（考虑与上表合并）
```sql
CREATE TABLE submission_knowledge_points (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES homework_submissions(id),
  knowledge_point_id UUID NOT NULL REFERENCES knowledge_points(id),
  mastery_level NUMERIC DEFAULT 0,
  ai_confidence NUMERIC,
  mastery_grade TEXT DEFAULT 'C'
);
```
**状态**: 🔄 **可考虑合并** - 与student_knowledge_mastery功能重复

#### `knowledge_point_thresholds`
**用途**: 知识点掌握度阈值设置
```sql
CREATE TABLE knowledge_point_thresholds (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL
);
```

### ⚠️ 预警系统

#### `warning_rules`
**用途**: 预警规则配置
```sql
CREATE TABLE warning_rules (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id)
);
```

#### `warning_records`
**用途**: 预警记录
```sql
CREATE TABLE warning_records (
  id UUID PRIMARY KEY,
  student_id TEXT REFERENCES students(student_id),
  rule_id UUID REFERENCES warning_rules(id),
  details JSONB NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);
```

### 🎯 其他系统表

#### `student_portraits`
**用途**: 学生画像系统
```sql
CREATE TABLE student_portraits (
  id UUID PRIMARY KEY,
  student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  ai_tags JSONB,
  custom_tags TEXT[],
  last_updated TIMESTAMPTZ DEFAULT now()
);
```

#### `learning_resources`
**用途**: 学习资源管理
```sql
CREATE TABLE learning_resources (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN ('document', 'video', 'audio', 'link', 'other')),
  url TEXT,
  file_path TEXT,
  subject_code TEXT REFERENCES subjects(subject_code),
  knowledge_point_id UUID REFERENCES knowledge_points(id),
  creator_id UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false
);
```

---

## 🔗 表关联关系图

```mermaid
graph TB
    %% 用户认证核心
    AU[auth.users<br/>Supabase认证] --> UP[user_profiles<br/>用户资料]
    AU --> UR[user_roles<br/>角色管理]
    AU --> T[teachers<br/>教师表]
    AU --> NS[notification_settings<br/>通知设置]
    AU --> US[user_settings<br/>用户设置]

    %% 学校基础架构
    T --> CC[course_classes<br/>课程班级]
    S[students<br/>学生表] --> C[classes<br/>班级]
    S --> CI[class_info<br/>班级信息]
    S --> G[grades<br/>成绩]
    S --> GD[grade_data<br/>综合成绩]
    S --> HS[homework_submissions<br/>作业提交]
    S --> SKM[student_knowledge_mastery<br/>知识点掌握]
    S --> SP[student_portraits<br/>学生画像]

    %% 科目和学期
    SUB[subjects<br/>科目] --> CC
    SUB --> G
    AT[academic_terms<br/>学年学期] --> CC
    CI --> CC

    %% 作业系统
    H[homework<br/>作业] --> HS
    H --> KP[knowledge_points<br/>知识点]
    C --> H
    GS[grading_scales<br/>评分方案] --> H
    GS --> GSL[grading_scale_levels<br/>评分等级]

    %% 知识点系统
    KP --> SKM
    KP --> SKP[submission_knowledge_points<br/>提交知识点]
    HS --> SKP
    HS --> SKM

    %% 预警系统
    WRU[warning_rules<br/>预警规则] --> WR[warning_records<br/>预警记录]
    S --> WR

    %% 样式
    classDef userAuth fill:#ff9999
    classDef school fill:#99ccff  
    classDef grade fill:#99ff99
    classDef homework fill:#ffcc99
    classDef knowledge fill:#cc99ff
    classDef warning fill:#ffff99
    classDef deprecated fill:#cccccc,stroke-dasharray: 5 5

    class AU,UP,UR,T,NS,US userAuth
    class S,CI,C,SUB,AT,CC school
    class G,GD grade  
    class H,HS,GS,GSL homework
    class KP,SKM,SKP knowledge
    class WRU,WR warning
    class C deprecated
```

---

## 🚨 数据库设计问题和建议

### ❌ 重复表问题

1. **`classes` vs `class_info`**
   - **问题**: 功能重复，数据分散
   - **建议**: 统一使用`class_info`，废弃`classes`表
   - **迁移**: 将`classes`的引用改为`class_info.class_name`

2. **`grades` vs `grade_data`**
   - **问题**: 两套成绩存储方案，数据可能不一致
   - **建议**: 优先使用`grade_data`，`grades`作为兼容层

3. **知识点掌握记录重复**
   - **冗余表**: `student_knowledge_mastery` vs `submission_knowledge_points`
   - **建议**: 合并为一个表，避免数据同步问题

### 🔧 优化建议

#### 1. 索引优化
```sql
-- 高频查询索引
CREATE INDEX CONCURRENTLY idx_grade_data_student_exam ON grade_data(student_id, exam_id);
CREATE INDEX CONCURRENTLY idx_homework_submissions_homework_student ON homework_submissions(homework_id, student_id);
CREATE INDEX CONCURRENTLY idx_students_class ON students(class_id);
```

#### 2. 分区表考虑
对于大量历史数据的表，考虑按时间分区：
```sql
-- 按月分区grade_data表
CREATE TABLE grade_data_y2024m01 PARTITION OF grade_data
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### 3. 物化视图优化
为常用统计查询创建物化视图：
```sql
-- 班级成绩统计
CREATE MATERIALIZED VIEW mv_class_grade_stats AS
SELECT 
    class_name,
    exam_title,
    AVG(total_score) as avg_score,
    COUNT(*) as student_count
FROM grade_data 
GROUP BY class_name, exam_title;
```

---

## 🔒 安全策略 (RLS)

### 核心安全原则
1. **数据隔离**: 用户只能访问自己创建的数据
2. **角色控制**: 不同角色有不同的访问权限
3. **审计追踪**: 重要操作记录创建者和时间

### 典型RLS策略
```sql
-- 学生数据访问策略
CREATE POLICY "用户只能查看自己的学生数据" ON students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
    OR user_id = auth.uid()
  );

-- 成绩数据访问策略  
CREATE POLICY "教师可以查看所教班级的成绩" ON grade_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM course_classes cc
      JOIN teachers t ON t.id = cc.teacher_id  
      WHERE cc.class_name = grade_data.class_name AND t.id = auth.uid()
    )
  );
```

---

## 📊 常用查询模式

### 1. 学生成绩查询
```sql
-- 查询学生某次考试的详细成绩
SELECT * FROM grade_data 
WHERE student_id = ? AND exam_title = ?;

-- 查询学生成绩趋势
SELECT exam_date, total_score, total_rank_in_class
FROM grade_data 
WHERE student_id = ?
ORDER BY exam_date;
```

### 2. 班级分析查询
```sql
-- 班级平均分统计
SELECT 
    class_name,
    AVG(total_score) as avg_score,
    COUNT(*) as student_count
FROM grade_data 
WHERE exam_title = ?
GROUP BY class_name;
```

### 3. 知识点掌握度查询
```sql
-- 学生知识点掌握情况
SELECT 
    kp.name as knowledge_point,
    skm.mastery_level,
    skm.mastery_grade
FROM student_knowledge_mastery skm
JOIN knowledge_points kp ON kp.id = skm.knowledge_point_id
WHERE skm.student_id = ?;
```

### 4. 预警查询
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

## ⚡ 性能优化指南

### 1. 查询优化
- 使用索引覆盖高频查询字段
- 避免全表扫描，善用WHERE条件
- 复杂统计查询考虑使用物化视图

### 2. 数据归档
- 定期归档历史数据
- 对大表考虑分区策略
- 设置合理的数据保留期

### 3. 监控指标
- 慢查询监控
- 表大小监控  
- 索引命中率监控

---

## 🔧 维护建议

### 1. 数据清理
```sql
-- 清理重复表中的冗余数据
-- 1. 先迁移classes表的数据到class_info
-- 2. 更新外键引用
-- 3. 删除classes表

-- 定期清理过期的预警记录
DELETE FROM warning_records 
WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '1 year';
```

### 2. 定期维护
- 重建统计信息: `ANALYZE;`
- 清理无用索引
- 更新物化视图: `REFRESH MATERIALIZED VIEW mv_class_grade_stats;`

### 3. 备份策略
- 数据库全量备份（每日）
- 增量备份（每小时）
- 重要表的实时同步备份

---

## 📝 开发注意事项

### 1. 字段命名规范
- 使用snake_case命名
- 时间字段统一使用`_at`后缀
- 布尔字段使用`is_`前缀

### 2. 数据类型选择
- 主键统一使用UUID
- 金额字段使用DECIMAL而非FLOAT
- 时间字段使用TIMESTAMPTZ

### 3. 约束建议
- 重要字段添加NOT NULL约束
- 枚举字段使用CHECK约束
- 外键约束确保数据完整性

### 4. 事务处理
- 批量操作使用事务包装
- 长事务注意锁等待
- 关键业务逻辑使用存储过程

---

**文档版本**: v1.0  
**最后更新**: 2024年12月  
**维护者**: Claude Code Assistant 