-- =============================================
-- 基础信息表创建脚本
-- 版本: v1.0
-- 日期: 2025-01-21
-- 说明: 创建班级、学生、教师等基础表
-- =============================================

-- ========== 1. 班级信息表 ==========
DROP TABLE IF EXISTS classes CASCADE;
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_classes_grade ON classes(grade);
CREATE INDEX idx_classes_year ON classes(academic_year);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_grade_year ON classes(grade, academic_year);

-- 添加注释
COMMENT ON TABLE classes IS '班级信息表';
COMMENT ON COLUMN classes.class_name IS '班级名称，如：九年级1班';
COMMENT ON COLUMN classes.metadata IS '扩展信息，JSON格式存储额外数据';

-- ========== 2. 教师信息表 ==========
DROP TABLE IF EXISTS teachers CASCADE;
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_teachers_name ON teachers(name);
CREATE INDEX idx_teachers_status ON teachers(status);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects);

-- 添加注释
COMMENT ON TABLE teachers IS '教师信息表';
COMMENT ON COLUMN teachers.subjects IS '教授科目列表';

-- ========== 3. 学生信息表 ==========
DROP TABLE IF EXISTS students CASCADE;
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
    status student_status DEFAULT 'active',  -- 状态
    user_id UUID,                            -- 关联用户账号
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_students_class FOREIGN KEY (class_id) 
        REFERENCES classes(id) ON DELETE RESTRICT
);

-- 创建索引
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_no ON students(student_no);
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_user_id ON students(user_id);
-- 创建全文搜索索引
CREATE INDEX idx_students_name_trgm ON students USING gin(name gin_trgm_ops);

-- 添加注释
COMMENT ON TABLE students IS '学生信息表';
COMMENT ON COLUMN students.status IS '状态: active-在读, graduated-毕业, transferred-转学, suspended-休学';

-- ========== 4. 科目信息表 ==========
DROP TABLE IF EXISTS subjects CASCADE;
CREATE TABLE subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL UNIQUE,-- 科目代码
    subject_name VARCHAR(50) NOT NULL,       -- 科目名称
    subject_name_en VARCHAR(50),             -- 英文名称
    category VARCHAR(30),                    -- 分类: 主科/副科
    full_score DECIMAL(10,2) DEFAULT 100,    -- 满分
    pass_score DECIMAL(10,2) DEFAULT 60,     -- 及格分
    is_required BOOLEAN DEFAULT TRUE,        -- 是否必修
    grade_levels INTEGER[],                  -- 适用年级
    weight DECIMAL(5,2) DEFAULT 1.0,        -- 权重系数
    sort_order INTEGER DEFAULT 0,            -- 排序
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_subjects_code ON subjects(subject_code);
CREATE INDEX idx_subjects_category ON subjects(category);

-- 插入默认科目数据
INSERT INTO subjects (subject_code, subject_name, subject_name_en, category, full_score, grade_levels, sort_order) VALUES
    ('CHN', '语文', 'Chinese', '主科', 150, '{7,8,9}', 1),
    ('MAT', '数学', 'Mathematics', '主科', 150, '{7,8,9}', 2),
    ('ENG', '英语', 'English', '主科', 150, '{7,8,9}', 3),
    ('PHY', '物理', 'Physics', '主科', 100, '{8,9}', 4),
    ('CHM', '化学', 'Chemistry', '主科', 100, '{9}', 5),
    ('BIO', '生物', 'Biology', '副科', 100, '{7,8}', 6),
    ('POL', '政治', 'Politics', '副科', 100, '{7,8,9}', 7),
    ('HIS', '历史', 'History', '副科', 100, '{7,8,9}', 8),
    ('GEO', '地理', 'Geography', '副科', 100, '{7,8}', 9);

-- ========== 5. 学期信息表 ==========
DROP TABLE IF EXISTS academic_terms CASCADE;
CREATE TABLE academic_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,      -- 学年: "2024-2025"
    semester VARCHAR(20) NOT NULL,           -- 学期: "第一学期"/"第二学期"
    start_date DATE NOT NULL,                -- 开始日期
    end_date DATE NOT NULL,                  -- 结束日期
    is_current BOOLEAN DEFAULT FALSE,        -- 是否当前学期
    week_count INTEGER,                      -- 教学周数
    holidays JSONB,                          -- 节假日信息
    metadata JSONB,                          -- 扩展信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uk_academic_term UNIQUE (academic_year, semester),
    CONSTRAINT check_date_range CHECK (end_date > start_date)
);

-- 创建索引
CREATE INDEX idx_terms_year ON academic_terms(academic_year);
CREATE INDEX idx_terms_current ON academic_terms(is_current) WHERE is_current = TRUE;

-- 添加更新触发器
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terms_updated_at BEFORE UPDATE ON academic_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ 基础信息表创建完成';
    RAISE NOTICE '📋 已创建表: classes, teachers, students, subjects, academic_terms';
    RAISE NOTICE '📊 已插入9个默认科目';
END $$;