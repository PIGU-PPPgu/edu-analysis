-- 完全按照CSV结构设计的表 - 零转换成本！
DROP TABLE IF EXISTS grade_data CASCADE;

CREATE TABLE grade_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联键
  exam_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- 完全映射CSV列 - 与907九下月考成绩.csv一模一样
  姓名 TEXT,
  班级 TEXT,
  总分分数 NUMERIC,
  总分等级 TEXT,
  总分班名 INTEGER,
  总分校名 INTEGER,
  总分级名 INTEGER,
  语文分数 NUMERIC,
  语文等级 TEXT,
  语文班名 INTEGER,
  语文校名 INTEGER,
  语文级名 INTEGER,
  数学分数 NUMERIC,
  数学等级 TEXT,
  数学班名 INTEGER,
  数学校名 INTEGER,
  数学级名 INTEGER,
  英语分数 NUMERIC,
  英语等级 TEXT,
  英语班名 INTEGER,
  英语校名 INTEGER,
  英语级名 INTEGER,
  物理分数 NUMERIC,
  物理等级 TEXT,
  物理班名 INTEGER,
  物理校名 INTEGER,
  物理级名 INTEGER,
  化学分数 NUMERIC,
  化学等级 TEXT,
  化学班名 INTEGER,
  化学校名 INTEGER,
  化学级名 INTEGER,
  道法分数 NUMERIC,
  道法等级 TEXT,
  道法班名 INTEGER,
  道法校名 INTEGER,
  道法级名 INTEGER,
  历史分数 NUMERIC,
  历史等级 TEXT,
  历史班名 INTEGER,
  历史校名 INTEGER,
  历史级名 INTEGER
);

-- 创建索引
CREATE INDEX idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX idx_grade_data_name ON grade_data(姓名);
CREATE INDEX idx_grade_data_class ON grade_data(班级);

-- 唯一约束
ALTER TABLE grade_data ADD CONSTRAINT unique_exam_student UNIQUE (exam_id, 姓名);