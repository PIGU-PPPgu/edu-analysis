-- 🔧 数据库性能优化和索引策略
-- 基于实际查询模式分析，优化grade_data表的索引配置

-- =============================================
-- 1. 分析当前查询模式
-- =============================================

-- 主要查询模式：
-- 1. 按考试ID查询: WHERE exam_id = ?
-- 2. 按学生ID查询: WHERE student_id = ?  
-- 3. 按班级查询: WHERE class_name = ?
-- 4. 按科目查询: 通过long-table转换后的subject字段
-- 5. 时间排序: ORDER BY created_at DESC
-- 6. 考试标题查询: WHERE exam_title = ?
-- 7. 成绩范围查询: WHERE total_score >= ? AND total_score <= ?
-- 8. 复合查询: 学生+考试，班级+考试等组合

-- =============================================
-- 2. 删除现有基础索引（如果存在）
-- =============================================

DROP INDEX IF EXISTS idx_grade_data_student_id;
DROP INDEX IF EXISTS idx_grade_data_class_name;
DROP INDEX IF EXISTS idx_grade_data_exam_title;

-- =============================================
-- 3. 创建优化索引策略
-- =============================================

-- 🎯 核心业务索引 - 覆盖最常用查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_student 
ON grade_data(exam_id, student_id);

-- 🎯 学生查询索引 - 支持学生成绩历史查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_student_exam_date 
ON grade_data(student_id, exam_date DESC, exam_id);

-- 🎯 班级分析索引 - 支持班级统计和比较
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_class_exam 
ON grade_data(class_name, exam_id, total_score DESC);

-- 🎯 考试查询索引 - 支持考试维度分析
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_comprehensive 
ON grade_data(exam_id, exam_date, total_score, created_at DESC);

-- 🎯 时间序列索引 - 支持最新数据快速查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_timeline 
ON grade_data(created_at DESC, exam_date DESC, exam_id);

-- 🎯 成绩分析索引 - 支持成绩分布和统计查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_scores_analysis 
ON grade_data(total_score, chinese_score, math_score, english_score) 
WHERE total_score IS NOT NULL;

-- 🎯 考试标题查询索引（保留，但优化）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_title_optimized 
ON grade_data(exam_title, exam_date DESC, class_name);

-- =============================================
-- 4. 单科成绩分析索引
-- =============================================

-- 语文成绩索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_chinese 
ON grade_data(chinese_score, chinese_grade) 
WHERE chinese_score IS NOT NULL;

-- 数学成绩索引  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_math 
ON grade_data(math_score, math_grade) 
WHERE math_score IS NOT NULL;

-- 英语成绩索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_english 
ON grade_data(english_score, english_grade) 
WHERE english_score IS NOT NULL;

-- =============================================
-- 5. 部分索引 - 针对活跃数据
-- =============================================

-- 最近3个月的数据索引（热数据）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_recent 
ON grade_data(exam_date, student_id, total_score) 
WHERE exam_date >= CURRENT_DATE - INTERVAL '3 months';

-- 有效总分数据索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_valid_total_scores 
ON grade_data(total_score DESC, student_id, class_name) 
WHERE total_score IS NOT NULL AND total_score > 0;

-- =============================================
-- 6. 复合查询优化索引
-- =============================================

-- 学生+科目复合查询（基于long-table转换模式）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_student_subjects 
ON grade_data(student_id, chinese_score, math_score, english_score, physics_score, chemistry_score);

-- 班级+时间复合查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_class_timeline 
ON grade_data(class_name, exam_date DESC, total_score DESC, student_id);

-- =============================================
-- 7. 统计查询优化索引  
-- =============================================

-- 支持AVG、COUNT等聚合查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_aggregation 
ON grade_data(exam_id, class_name, total_score, chinese_score, math_score, english_score) 
WHERE total_score IS NOT NULL;

-- =============================================
-- 8. 性能监控查询
-- =============================================

-- 查看索引使用情况
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename = 'grade_data'
ORDER BY idx_scan DESC;

-- 查看表大小和索引大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables 
WHERE tablename = 'grade_data';

-- =============================================
-- 9. 表统计信息更新
-- =============================================

-- 更新表统计信息，帮助查询优化器选择最佳执行计划
ANALYZE grade_data;
ANALYZE exams;

-- 显示优化完成信息
SELECT 
    '数据库性能优化完成' as status,
    COUNT(*) as new_indexes_count
FROM pg_indexes 
WHERE tablename = 'grade_data';