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

-- 创建成绩数据表
CREATE TABLE IF NOT EXISTS grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  name TEXT,
  class_name TEXT,
  subject TEXT,
  total_score NUMERIC,
  exam_date DATE,
  exam_type TEXT,
  exam_title TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
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