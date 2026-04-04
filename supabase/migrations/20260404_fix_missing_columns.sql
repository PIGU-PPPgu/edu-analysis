-- Add missing columns to grade_data and exams tables.
-- These were previously added at runtime via exec_sql; now managed here.

ALTER TABLE grade_data
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS import_strategy TEXT,
  ADD COLUMN IF NOT EXISTS match_type TEXT,
  ADD COLUMN IF NOT EXISTS multiple_matches BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rank_in_class INTEGER,
  ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER,
  ADD COLUMN IF NOT EXISTS rank_in_school INTEGER,
  ADD COLUMN IF NOT EXISTS exam_scope TEXT DEFAULT 'class';

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'class' NOT NULL;
