-- Migration: Add composite indexes to grade_data table for query performance optimization
-- Expected Impact: 60-80% query performance improvement, targeting sub-200ms response times
-- Risk Level: Low (using CONCURRENTLY to avoid table locks)

-- Index 1: Optimize queries filtering by exam_id and class_name
-- Use Case: "Get all grades for a specific exam and class"
-- Query Pattern: SELECT * FROM grade_data WHERE exam_id = ? AND class_name = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_class
ON grade_data(exam_id, class_name);

-- Index 2: Optimize queries filtering by student_id and exam_id
-- Use Case: "Get student's exam history"
-- Query Pattern: SELECT * FROM grade_data WHERE student_id = ? AND exam_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_student_exam
ON grade_data(student_id, exam_id);

-- Index 3: Optimize exam-based queries and ranking calculations
-- Use Case: "Student ranking calculations within an exam"
-- Query Pattern: SELECT * FROM grade_data WHERE exam_id = ? ORDER BY total_score DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_score
ON grade_data(exam_id, total_score DESC);

-- Index 4: Optimize student lookup and timeline queries
-- Use Case: "Get all records for a specific student ordered by date"
-- Query Pattern: SELECT * FROM grade_data WHERE student_id = ? ORDER BY exam_date DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_student_date
ON grade_data(student_id, exam_date DESC);

-- Index 5: Optimize class performance aggregations
-- Use Case: "Class performance aggregation by exam_title"
-- Query Pattern: SELECT class_name, AVG(total_score) FROM grade_data WHERE exam_title = ? GROUP BY class_name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grade_data_exam_title_class
ON grade_data(exam_title, class_name)
WHERE exam_title IS NOT NULL;

-- Performance Notes:
-- 1. CONCURRENTLY keyword allows index creation without locking the table for writes
-- 2. Partial index on idx_grade_data_exam_title_class reduces index size by excluding NULL values
-- 3. DESC ordering on score/date columns optimizes ORDER BY DESC queries
-- 4. Estimated index size: ~2-3MB per index for 20k records (minimal storage impact)
-- 5. Write performance impact: ~5-10% slower INSERTs/UPDATEs (acceptable tradeoff)

-- Index Maintenance:
-- PostgreSQL automatically maintains these B-tree indexes
-- Consider REINDEX if index bloat exceeds 30% after heavy update workloads
-- Monitor with: SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
--                FROM pg_stat_user_indexes WHERE tablename = 'grade_data';
