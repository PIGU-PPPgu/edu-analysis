-- 为关键表添加索引以提高查询性能

-- 考试表索引
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_type ON exams(type);

-- 成绩数据表索引
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_student_id ON grade_data(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_data_class_name ON grade_data(class_name);
CREATE INDEX IF NOT EXISTS idx_grade_data_subject ON grade_data(subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_date ON grade_data(exam_date);

-- 预警记录表索引 - 修正为只包含表中存在的列
CREATE INDEX IF NOT EXISTS idx_warning_records_student_id ON warning_records(student_id);
CREATE INDEX IF NOT EXISTS idx_warning_records_rule_id ON warning_records(rule_id);
CREATE INDEX IF NOT EXISTS idx_warning_records_status ON warning_records(status);
CREATE INDEX IF NOT EXISTS idx_warning_records_created_at ON warning_records(created_at);

-- 干预计划表索引
CREATE INDEX IF NOT EXISTS idx_intervention_plans_warning_id ON intervention_plans(warning_id);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_status ON intervention_plans(status);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_created_at ON intervention_plans(created_at);

-- 干预活动表索引
CREATE INDEX IF NOT EXISTS idx_intervention_activities_plan_id ON intervention_activities(plan_id);
CREATE INDEX IF NOT EXISTS idx_intervention_activities_status ON intervention_activities(status);
CREATE INDEX IF NOT EXISTS idx_intervention_activities_scheduled_date ON intervention_activities(scheduled_date);

-- 学生成绩趋势分析索引
CREATE INDEX IF NOT EXISTS idx_combined_student_exam ON grade_data(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_combined_class_exam ON grade_data(class_name, exam_id);

-- 数据库级联规则检查
COMMENT ON TABLE grade_data IS '成绩数据表，包含外键约束以确保数据一致性';
COMMENT ON TABLE intervention_activities IS '干预活动表，包含外键约束确保与干预计划关联';
COMMENT ON TABLE intervention_assessments IS '干预评估表，包含外键约束确保与干预计划关联'; 