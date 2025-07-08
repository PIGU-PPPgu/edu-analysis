-- 创建考试表
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建成绩数据表（宽表格设计）
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT,
  
  -- 学生基本信息
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  
  -- 考试信息
  exam_title TEXT,
  exam_type TEXT,
  exam_date DATE,
  
  -- 总分信息
  total_score NUMERIC,
  total_grade TEXT,
  total_rank_in_class INTEGER,
  total_rank_in_school INTEGER,
  total_rank_in_grade INTEGER,
  
  -- 语文
  chinese_score NUMERIC,
  chinese_grade TEXT,
  chinese_rank_in_class INTEGER,
  chinese_rank_in_school INTEGER,
  chinese_rank_in_grade INTEGER,
  
  -- 数学
  math_score NUMERIC,
  math_grade TEXT,
  math_rank_in_class INTEGER,
  math_rank_in_school INTEGER,
  math_rank_in_grade INTEGER,
  
  -- 英语
  english_score NUMERIC,
  english_grade TEXT,
  english_rank_in_class INTEGER,
  english_rank_in_school INTEGER,
  english_rank_in_grade INTEGER,
  
  -- 物理
  physics_score NUMERIC,
  physics_grade TEXT,
  physics_rank_in_class INTEGER,
  physics_rank_in_school INTEGER,
  physics_rank_in_grade INTEGER,
  
  -- 化学
  chemistry_score NUMERIC,
  chemistry_grade TEXT,
  chemistry_rank_in_class INTEGER,
  chemistry_rank_in_school INTEGER,
  chemistry_rank_in_grade INTEGER,
  
  -- 道法
  politics_score NUMERIC,
  politics_grade TEXT,
  politics_rank_in_class INTEGER,
  politics_rank_in_school INTEGER,
  politics_rank_in_grade INTEGER,
  
  -- 历史
  history_score NUMERIC,
  history_grade TEXT,
  history_rank_in_class INTEGER,
  history_rank_in_school INTEGER,
  history_rank_in_grade INTEGER,
  
  -- 元数据
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- 唯一约束：一个学生在一次考试中只能有一条记录
  UNIQUE(exam_id, student_id)
);

-- 创建成绩标签表
CREATE TABLE IF NOT EXISTS grade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建成绩数据和标签的关联表
CREATE TABLE IF NOT EXISTS grade_data_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT grade_data_tags_grade_id_tag_id_key UNIQUE (grade_id, tag_id),
  CONSTRAINT grade_data_tags_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES grade_data(id) ON DELETE CASCADE,
  CONSTRAINT grade_data_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES grade_tags(id) ON DELETE CASCADE
);

-- 创建干预计划表
CREATE TABLE IF NOT EXISTS intervention_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
);

-- 创建干预活动表
CREATE TABLE IF NOT EXISTS intervention_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES intervention_plans(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  responsible_person TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建干预评估表
CREATE TABLE IF NOT EXISTS intervention_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES intervention_plans(id) ON DELETE CASCADE,
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  effectiveness_rating INTEGER NOT NULL,
  metrics JSONB,
  observations TEXT,
  next_steps TEXT,
  assessed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 