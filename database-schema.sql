-- 用户表扩展信息 (Supabase已经提供了auth.users表)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT UNIQUE,
  user_type TEXT DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 学生表
CREATE TABLE students (
  student_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL REFERENCES class_info(class_name),
  admission_year TEXT,
  gender TEXT CHECK (gender IN ('男', '女', '其他')),
  contact_phone TEXT,
  contact_email TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 班级信息表
CREATE TABLE class_info (
  class_name TEXT PRIMARY KEY,
  grade_level TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  homeroom_teacher TEXT,
  student_count INTEGER,
  department TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 科目表
CREATE TABLE subjects (
  subject_code TEXT PRIMARY KEY,
  subject_name TEXT NOT NULL,
  credit NUMERIC,
  category TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 教师表
CREATE TABLE teachers (
  teacher_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  title TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 成绩表
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(student_id),
  subject TEXT NOT NULL REFERENCES subjects(subject_code),
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  exam_date DATE NOT NULL,
  exam_type TEXT NOT NULL,
  semester TEXT,
  teacher_id TEXT REFERENCES teachers(teacher_id),
  comments TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 考试类型表
CREATE TABLE exam_types (
  exam_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 学年学期表
CREATE TABLE academic_terms (
  term_id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(academic_year, semester)
);

-- 考试记录表
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(title, date, type)  -- 防止重复考试记录
);

-- 权限设置触发器
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 当新用户注册时创建用户资料
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Row Level Security (RLS) 策略
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- 用户个人资料的访问策略
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 学生数据访问策略 - 用户只能看到自己创建的学生数据
CREATE POLICY "Users can view their own students"
  ON students FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own students"
  ON students FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own students"
  ON students FOR DELETE
  USING (auth.uid() = created_by);

-- 班级信息访问策略
CREATE POLICY "Users can view their own classes"
  ON class_info FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create classes"
  ON class_info FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own classes"
  ON class_info FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own classes"
  ON class_info FOR DELETE
  USING (auth.uid() = created_by);

-- 科目访问策略
CREATE POLICY "Users can view their own subjects"
  ON subjects FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create subjects"
  ON subjects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own subjects"
  ON subjects FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own subjects"
  ON subjects FOR DELETE
  USING (auth.uid() = created_by);

-- 教师访问策略
CREATE POLICY "Users can view their own teachers"
  ON teachers FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create teachers"
  ON teachers FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own teachers"
  ON teachers FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own teachers"
  ON teachers FOR DELETE
  USING (auth.uid() = created_by);

-- 成绩访问策略
CREATE POLICY "Users can view their own grades"
  ON grades FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create grades"
  ON grades FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own grades"
  ON grades FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own grades"
  ON grades FOR DELETE
  USING (auth.uid() = created_by);

-- 考试类型访问策略
CREATE POLICY "Users can view their own exam types"
  ON exam_types FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create exam types"
  ON exam_types FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own exam types"
  ON exam_types FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own exam types"
  ON exam_types FOR DELETE
  USING (auth.uid() = created_by);

-- 学年学期访问策略
CREATE POLICY "Users can view their own academic terms"
  ON academic_terms FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create academic terms"
  ON academic_terms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own academic terms"
  ON academic_terms FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own academic terms"
  ON academic_terms FOR DELETE
  USING (auth.uid() = created_by);

-- 考试记录访问策略
CREATE POLICY "Users can view their own exams"
  ON exams FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create exams"
  ON exams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own exams"
  ON exams FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own exams"
  ON exams FOR DELETE
  USING (auth.uid() = created_by);

-- 索引优化
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject ON grades(subject);
CREATE INDEX idx_students_class_name ON students(class_name);
CREATE INDEX idx_grades_exam_date ON grades(exam_date);
CREATE INDEX idx_grades_created_by ON grades(created_by);
CREATE INDEX idx_students_created_by ON students(created_by);
CREATE INDEX idx_class_info_created_by ON class_info(created_by);
CREATE INDEX idx_exams_created_by ON exams(created_by);
