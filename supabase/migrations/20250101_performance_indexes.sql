-- 性能优化索引
-- 针对预警分析系统的查询模式优化数据库索引

-- 1. 预警记录表索引优化
-- 按状态和创建时间查询的复合索引
CREATE INDEX IF NOT EXISTS idx_warning_records_status_created 
ON warning_records(status, created_at DESC);

-- 按学生和状态查询的复合索引
CREATE INDEX IF NOT EXISTS idx_warning_records_student_status 
ON warning_records(student_id, status);

-- 按规则ID和状态查询的复合索引
CREATE INDEX IF NOT EXISTS idx_warning_records_rule_status 
ON warning_records(rule_id, status);

-- 按严重程度查询的索引（通过连接warning_rules表）
CREATE INDEX IF NOT EXISTS idx_warning_rules_severity 
ON warning_rules(severity);

-- 2. 成绩数据表索引优化
-- 按考试ID和学生ID查询的复合索引
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_student 
ON grade_data(exam_id, student_id);

-- 按考试ID和分数范围查询的复合索引
CREATE INDEX IF NOT EXISTS idx_grade_data_exam_score 
ON grade_data(exam_id, score DESC);

-- 按学生ID和考试日期查询的复合索引
CREATE INDEX IF NOT EXISTS idx_grade_data_student_date 
ON grade_data(student_id, created_at DESC);

-- 3. 考试表索引优化
-- 按考试日期查询的索引
CREATE INDEX IF NOT EXISTS idx_exams_date 
ON exams(exam_date DESC);

-- 按考试类型和日期查询的复合索引
CREATE INDEX IF NOT EXISTS idx_exams_type_date 
ON exams(exam_type, exam_date DESC);

-- 按科目和年级查询的复合索引
CREATE INDEX IF NOT EXISTS idx_exams_subject_grade 
ON exams(subject, grade_level);

-- 4. 学生表索引优化
-- 按班级ID查询的索引
CREATE INDEX IF NOT EXISTS idx_students_class 
ON students(class_id);

-- 按年级查询的索引
CREATE INDEX IF NOT EXISTS idx_students_grade 
ON students(grade_level);

-- 5. 预警规则表索引优化
-- 按范围和分类查询的复合索引
CREATE INDEX IF NOT EXISTS idx_warning_rules_scope_category 
ON warning_rules(scope, category);

-- 按优先级和状态查询的复合索引
CREATE INDEX IF NOT EXISTS idx_warning_rules_priority_status 
ON warning_rules(priority DESC, is_active);

-- 6. 针对时间范围查询的分区索引（如果表很大）
-- 为最近3个月的数据创建专门索引
CREATE INDEX IF NOT EXISTS idx_warning_records_recent 
ON warning_records(created_at DESC, status) 
WHERE created_at > CURRENT_DATE - INTERVAL '3 months';

-- 为最近6个月的成绩数据创建专门索引
CREATE INDEX IF NOT EXISTS idx_grade_data_recent 
ON grade_data(exam_id, created_at DESC) 
WHERE created_at > CURRENT_DATE - INTERVAL '6 months';

-- 7. 统计查询优化索引
-- 预警统计查询优化
CREATE INDEX IF NOT EXISTS idx_warning_records_stats 
ON warning_records(status, severity, created_at) 
WHERE status = 'active';

-- 成绩统计查询优化
CREATE INDEX IF NOT EXISTS idx_grade_data_stats 
ON grade_data(exam_id, score) 
WHERE score IS NOT NULL;

-- 8. 全文搜索索引（如果需要）
-- 为考试名称创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_exams_search 
ON exams USING gin(to_tsvector('chinese', name));

-- 为学生姓名创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_students_search 
ON students USING gin(to_tsvector('chinese', name));

-- 9. 外键索引（确保存在）
-- 这些索引通常在创建外键时自动创建，但确保存在
CREATE INDEX IF NOT EXISTS idx_warning_records_student_fk 
ON warning_records(student_id);

CREATE INDEX IF NOT EXISTS idx_warning_records_rule_fk 
ON warning_records(rule_id);

CREATE INDEX IF NOT EXISTS idx_grade_data_student_fk 
ON grade_data(student_id);

CREATE INDEX IF NOT EXISTS idx_grade_data_exam_fk 
ON grade_data(exam_id);

-- 10. 添加表注释说明索引用途
COMMENT ON INDEX idx_warning_records_status_created IS '预警记录按状态和时间查询优化';
COMMENT ON INDEX idx_grade_data_exam_student IS '成绩数据按考试和学生查询优化';
COMMENT ON INDEX idx_exams_date IS '考试按日期查询优化';
COMMENT ON INDEX idx_warning_rules_scope_category IS '预警规则按范围和分类查询优化';

-- 11. 分析表统计信息（提高查询计划准确性）
ANALYZE warning_records;
ANALYZE grade_data;
ANALYZE exams;
ANALYZE students;
ANALYZE warning_rules; 