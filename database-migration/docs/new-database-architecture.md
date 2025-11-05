# 新数据库架构设计文档

## 🎯 设计原则

1. **简洁性**: 从77个表减少到15个核心表
2. **清晰性**: 表名和字段名清晰表达业务含义
3. **一致性**: 统一命名规范和数据类型
4. **性能**: 合理的索引和分区策略
5. **扩展性**: 预留扩展字段和JSON字段

## 📊 核心表设计

### 1. 基础信息表

#### `classes` - 班级信息表
```sql
CREATE TABLE classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL UNIQUE,  -- 如: "九年级1班"
    grade VARCHAR(20) NOT NULL,              -- 年级: "九年级"
    grade_number INTEGER NOT NULL,           -- 年级数字: 9
    class_number INTEGER NOT NULL,           -- 班号: 1
    academic_year VARCHAR(20) NOT NULL,      -- 学年: "2024-2025"
    teacher_id UUID,                         -- 班主任ID
    student_count INTEGER DEFAULT 0,         -- 学生人数
    status VARCHAR(20) DEFAULT 'active',     -- 状态: active/archived
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_classes_grade (grade),
    INDEX idx_classes_year (academic_year),
    INDEX idx_classes_status (status)
);
```

#### `students` - 学生信息表
```sql
CREATE TABLE students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_no VARCHAR(30) NOT NULL UNIQUE,  -- 学号
    name VARCHAR(100) NOT NULL,              -- 姓名
    gender VARCHAR(10),                      -- 性别
    class_id UUID NOT NULL,                  -- 班级ID
    admission_year VARCHAR(10),              -- 入学年份
    id_card VARCHAR(18),                     -- 身份证号
    phone VARCHAR(20),                       -- 联系电话
    email VARCHAR(100),                      -- 邮箱
    address TEXT,                            -- 地址
    status VARCHAR(20) DEFAULT 'active',     -- 状态: active/graduated/transferred
    user_id UUID,                            -- 关联用户账号
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (class_id) REFERENCES classes(id),
    INDEX idx_students_class (class_id),
    INDEX idx_students_no (student_no),
    INDEX idx_students_name (name),
    INDEX idx_students_status (status)
);
```

#### `teachers` - 教师信息表
```sql
CREATE TABLE teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_no VARCHAR(30) UNIQUE,           -- 工号
    name VARCHAR(100) NOT NULL,              -- 姓名
    gender VARCHAR(10),                      -- 性别
    phone VARCHAR(20),                       -- 联系电话
    email VARCHAR(100),                      -- 邮箱
    subjects TEXT[],                         -- 教授科目
    classes UUID[],                          -- 任教班级
    is_homeroom BOOLEAN DEFAULT FALSE,       -- 是否班主任
    user_id UUID,                            -- 关联用户账号
    status VARCHAR(20) DEFAULT 'active',     -- 状态
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_teachers_name (name),
    INDEX idx_teachers_status (status)
);
```

### 2. 成绩管理表

#### `exams` - 考试信息表
```sql
CREATE TABLE exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_name VARCHAR(100) NOT NULL,         -- 考试名称
    exam_type VARCHAR(50) NOT NULL,          -- 类型: 月考/期中/期末/模拟
    academic_year VARCHAR(20) NOT NULL,      -- 学年
    semester VARCHAR(20) NOT NULL,           -- 学期
    grade VARCHAR(20) NOT NULL,              -- 年级
    exam_date DATE NOT NULL,                 -- 考试日期
    subjects TEXT[],                         -- 考试科目
    total_score DECIMAL(10,2),              -- 总分
    status VARCHAR(20) DEFAULT 'planned',    -- 状态: planned/ongoing/completed
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_exams_date (exam_date),
    INDEX idx_exams_grade (grade),
    INDEX idx_exams_type (exam_type),
    UNIQUE (exam_name, grade, exam_date)
);
```

#### `exam_scores` - 考试成绩表
```sql
CREATE TABLE exam_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,                -- 学生ID
    exam_id UUID NOT NULL,                   -- 考试ID
    
    -- 各科成绩
    chinese DECIMAL(10,2),                   -- 语文
    math DECIMAL(10,2),                      -- 数学
    english DECIMAL(10,2),                   -- 英语
    physics DECIMAL(10,2),                   -- 物理
    chemistry DECIMAL(10,2),                 -- 化学
    biology DECIMAL(10,2),                   -- 生物
    politics DECIMAL(10,2),                  -- 政治
    history DECIMAL(10,2),                   -- 历史
    geography DECIMAL(10,2),                 -- 地理
    
    -- 统计数据
    total_score DECIMAL(10,2),              -- 总分
    average_score DECIMAL(10,2),            -- 平均分
    class_rank INTEGER,                      -- 班级排名
    grade_rank INTEGER,                      -- 年级排名
    
    -- 进步情况
    progress_score DECIMAL(10,2),           -- 进步分数
    progress_rank INTEGER,                   -- 进步名次
    
    status VARCHAR(20) DEFAULT 'normal',     -- 状态: normal/absent/cheating
    metadata JSONB,                          -- 扩展信息（含各科排名等）
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    INDEX idx_scores_student (student_id),
    INDEX idx_scores_exam (exam_id),
    INDEX idx_scores_total (total_score DESC),
    UNIQUE (student_id, exam_id)
);
```

### 3. 作业管理表

#### `homeworks` - 作业信息表
```sql
CREATE TABLE homeworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,             -- 作业标题
    description TEXT,                        -- 作业描述
    subject VARCHAR(50) NOT NULL,            -- 科目
    class_id UUID NOT NULL,                  -- 班级ID
    teacher_id UUID NOT NULL,                -- 教师ID
    homework_type VARCHAR(50),               -- 类型: 日常/周末/假期
    due_date TIMESTAMPTZ NOT NULL,           -- 截止时间
    total_score DECIMAL(10,2) DEFAULT 100,   -- 总分
    difficulty VARCHAR(20),                  -- 难度: easy/medium/hard
    requirements TEXT,                        -- 要求
    attachments JSONB,                       -- 附件
    status VARCHAR(20) DEFAULT 'published',  -- 状态
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    INDEX idx_homeworks_class (class_id),
    INDEX idx_homeworks_teacher (teacher_id),
    INDEX idx_homeworks_due (due_date),
    INDEX idx_homeworks_subject (subject)
);
```

#### `homework_submissions` - 作业提交表
```sql
CREATE TABLE homework_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    homework_id UUID NOT NULL,               -- 作业ID
    student_id UUID NOT NULL,                -- 学生ID
    content TEXT,                            -- 提交内容
    attachments JSONB,                       -- 附件
    submitted_at TIMESTAMPTZ DEFAULT NOW(),  -- 提交时间
    score DECIMAL(10,2),                    -- 得分
    feedback TEXT,                           -- 教师反馈
    graded_at TIMESTAMPTZ,                  -- 批改时间
    graded_by UUID,                         -- 批改人
    status VARCHAR(20) DEFAULT 'submitted',  -- 状态: submitted/graded/returned
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (homework_id) REFERENCES homeworks(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_submissions_homework (homework_id),
    INDEX idx_submissions_student (student_id),
    INDEX idx_submissions_status (status),
    UNIQUE (homework_id, student_id)
);
```

### 4. 分析系统表

#### `student_portraits` - 学生画像表
```sql
CREATE TABLE student_portraits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL UNIQUE,         -- 学生ID
    
    -- 学业分析
    academic_level VARCHAR(20),              -- 学业水平: 优秀/良好/中等/待提高
    learning_style VARCHAR(50),              -- 学习风格
    strengths TEXT[],                        -- 优势科目
    weaknesses TEXT[],                       -- 薄弱科目
    
    -- 行为特征
    attendance_rate DECIMAL(5,2),           -- 出勤率
    homework_rate DECIMAL(5,2),             -- 作业完成率
    participation_score DECIMAL(5,2),       -- 课堂参与度
    
    -- AI分析
    ai_tags JSONB,                          -- AI标签
    ai_suggestions TEXT,                     -- AI建议
    risk_level VARCHAR(20),                 -- 风险等级
    
    -- 统计数据
    total_exams INTEGER DEFAULT 0,          -- 参加考试次数
    avg_score DECIMAL(10,2),                -- 平均成绩
    avg_rank INTEGER,                       -- 平均排名
    best_rank INTEGER,                      -- 最佳排名
    
    metadata JSONB,                          -- 扩展信息
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_portraits_student (student_id),
    INDEX idx_portraits_level (academic_level),
    INDEX idx_portraits_risk (risk_level)
);
```

#### `knowledge_mastery` - 知识点掌握表
```sql
CREATE TABLE knowledge_mastery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,                -- 学生ID
    subject VARCHAR(50) NOT NULL,            -- 科目
    knowledge_point VARCHAR(200) NOT NULL,   -- 知识点
    mastery_level INTEGER DEFAULT 0,         -- 掌握度: 0-100
    mastery_grade VARCHAR(10),              -- 等级: A/B/C/D/E
    last_tested TIMESTAMPTZ,                -- 最后测试时间
    test_count INTEGER DEFAULT 0,           -- 测试次数
    correct_rate DECIMAL(5,2),             -- 正确率
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_mastery_student (student_id),
    INDEX idx_mastery_subject (subject),
    INDEX idx_mastery_level (mastery_level),
    UNIQUE (student_id, subject, knowledge_point)
);
```

### 5. 预警系统表

#### `warning_rules` - 预警规则表
```sql
CREATE TABLE warning_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,         -- 规则名称
    rule_type VARCHAR(50) NOT NULL,          -- 类型: 成绩/出勤/作业/行为
    description TEXT,                        -- 描述
    conditions JSONB NOT NULL,               -- 触发条件
    priority VARCHAR(20) DEFAULT 'medium',   -- 优先级: low/medium/high/critical
    actions JSONB,                           -- 触发动作
    is_active BOOLEAN DEFAULT TRUE,          -- 是否启用
    is_system BOOLEAN DEFAULT FALSE,         -- 是否系统规则
    created_by UUID,                         -- 创建人
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_rules_type (rule_type),
    INDEX idx_rules_priority (priority),
    INDEX idx_rules_active (is_active)
);
```

#### `warning_records` - 预警记录表
```sql
CREATE TABLE warning_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,                -- 学生ID
    rule_id UUID NOT NULL,                   -- 规则ID
    warning_level VARCHAR(20) NOT NULL,      -- 级别: info/warning/danger/critical
    title VARCHAR(200) NOT NULL,             -- 标题
    message TEXT NOT NULL,                   -- 详细信息
    data JSONB,                             -- 相关数据
    status VARCHAR(20) DEFAULT 'active',     -- 状态: active/handled/resolved/ignored
    handled_by UUID,                        -- 处理人
    handled_at TIMESTAMPTZ,                 -- 处理时间
    resolution TEXT,                         -- 处理结果
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (rule_id) REFERENCES warning_rules(id),
    INDEX idx_warnings_student (student_id),
    INDEX idx_warnings_rule (rule_id),
    INDEX idx_warnings_level (warning_level),
    INDEX idx_warnings_status (status),
    INDEX idx_warnings_created (created_at DESC)
);
```

#### `warning_statistics` - 预警统计表
```sql
CREATE TABLE warning_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_type VARCHAR(20) NOT NULL,        -- 统计周期: daily/weekly/monthly
    period_date DATE NOT NULL,               -- 统计日期
    
    -- 统计数据
    total_warnings INTEGER DEFAULT 0,        -- 总预警数
    critical_count INTEGER DEFAULT 0,        -- 严重预警数
    high_count INTEGER DEFAULT 0,            -- 高级预警数
    medium_count INTEGER DEFAULT 0,          -- 中级预警数
    low_count INTEGER DEFAULT 0,             -- 低级预警数
    
    -- 处理情况
    handled_count INTEGER DEFAULT 0,         -- 已处理数
    resolved_count INTEGER DEFAULT 0,        -- 已解决数
    pending_count INTEGER DEFAULT 0,         -- 待处理数
    
    -- 分类统计
    by_type JSONB,                          -- 按类型统计
    by_class JSONB,                         -- 按班级统计
    by_subject JSONB,                       -- 按科目统计
    
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (period_type, period_date),
    INDEX idx_stats_period (period_type, period_date DESC)
);
```

### 6. 系统管理表

#### `system_config` - 系统配置表
```sql
CREATE TABLE system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE, -- 配置键
    config_value JSONB NOT NULL,            -- 配置值
    config_type VARCHAR(50),                -- 配置类型
    description TEXT,                        -- 描述
    is_public BOOLEAN DEFAULT FALSE,        -- 是否公开
    created_by UUID,                        -- 创建人
    updated_by UUID,                        -- 更新人
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_config_key (config_key),
    INDEX idx_config_type (config_type)
);
```

#### `operation_logs` - 操作日志表
```sql
CREATE TABLE operation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,                           -- 操作用户
    action VARCHAR(100) NOT NULL,           -- 操作动作
    target_type VARCHAR(50),                -- 目标类型
    target_id UUID,                         -- 目标ID
    changes JSONB,                          -- 变更内容
    ip_address INET,                        -- IP地址
    user_agent TEXT,                        -- 用户代理
    status VARCHAR(20) DEFAULT 'success',   -- 状态
    error_message TEXT,                     -- 错误信息
    metadata JSONB,                         -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_logs_user (user_id),
    INDEX idx_logs_action (action),
    INDEX idx_logs_target (target_type, target_id),
    INDEX idx_logs_created (created_at DESC)
);
```

## 📊 索引策略

### 主要索引
1. **主键索引**: 所有表的ID字段
2. **唯一索引**: 学号、班级名称等
3. **外键索引**: 所有外键字段
4. **查询索引**: 高频查询字段
5. **复合索引**: 常用组合查询

### 性能索引
```sql
-- 成绩查询优化
CREATE INDEX idx_scores_student_exam ON exam_scores(student_id, exam_id);
CREATE INDEX idx_scores_exam_rank ON exam_scores(exam_id, class_rank);

-- 预警查询优化
CREATE INDEX idx_warnings_active ON warning_records(status, created_at DESC) 
WHERE status = 'active';

-- 作业查询优化
CREATE INDEX idx_homework_pending ON homework_submissions(status, homework_id) 
WHERE status = 'submitted';
```

## 🔒 数据约束

### 1. 外键约束
- 所有关联关系建立外键
- 设置合理的级联规则
- 跨库关联使用软外键

### 2. 检查约束
```sql
-- 分数范围
ALTER TABLE exam_scores ADD CONSTRAINT check_score_range 
CHECK (total_score >= 0 AND total_score <= 1000);

-- 排名范围
ALTER TABLE exam_scores ADD CONSTRAINT check_rank_positive 
CHECK (class_rank > 0 AND grade_rank > 0);

-- 状态枚举
ALTER TABLE students ADD CONSTRAINT check_student_status 
CHECK (status IN ('active', 'graduated', 'transferred', 'suspended'));
```

### 3. 默认值
- 时间字段默认NOW()
- 状态字段默认active
- 计数字段默认0

## 📈 分区策略

### 按时间分区
```sql
-- 成绩表按学年分区
CREATE TABLE exam_scores_2024 PARTITION OF exam_scores
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 日志表按月分区
CREATE TABLE operation_logs_2025_01 PARTITION OF operation_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## 🔄 数据迁移映射

### 表映射关系
| 旧表 | 新表 | 说明 |
|------|------|------|
| classes + class_info + unified_classes | classes | 合并去重 |
| students | students | 字段规范化 |
| grade_data_new + grades | exam_scores | 数据整合 |
| homework | homeworks | 字段调整 |
| homework_submissions | homework_submissions | 基本不变 |
| student_portraits + student_ai_tags + student_learning_* | student_portraits | 合并 |
| warning_rules | warning_rules | 简化 |
| warning_records + warning_executions | warning_records | 合并 |
| 新增 | warning_statistics | 统计表 |

## 🚀 性能优化建议

1. **使用连接池**: 配置合理的连接池大小
2. **批量操作**: 使用批量插入和更新
3. **异步处理**: 非关键操作异步执行
4. **缓存策略**: Redis缓存热点数据
5. **定期维护**: VACUUM和ANALYZE

---

设计人：Claude Assistant  
设计日期：2025-01-21  
版本：v1.0