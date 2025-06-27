-- Safe deletion of confirmed empty junk tables
-- Generated on: 2025-06-26
-- Verified: All tables below are empty (0 rows) and safe to delete

-- 1. Drop test_grades table (0 rows - test table)
DROP TABLE IF EXISTS test_grades CASCADE;

-- 2. Drop temp_grades table (0 rows - temporary table)
DROP TABLE IF EXISTS temp_grades CASCADE;

-- 3. Drop backup_grades table (0 rows - unused backup)
DROP TABLE IF EXISTS backup_grades CASCADE;

-- 4. Drop temp_students table (0 rows - temporary table)
DROP TABLE IF EXISTS temp_students CASCADE;

-- Verification: Check that tables were dropped successfully
-- Run this to confirm cleanup:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('test_grades', 'temp_grades', 'backup_grades', 'temp_students');