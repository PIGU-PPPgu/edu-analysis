-- Fix grade_data unique constraint
-- The old constraint UNIQUE(exam_id, student_id) prevents storing multiple subjects
-- per student per exam. The correct constraint is (exam_id, student_id, subject).

DO $$
BEGIN
  -- Drop old 2-column constraint if it exists (may have various names)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'grade_data'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 2
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE grade_data DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'grade_data'::regclass
        AND contype = 'u'
        AND array_length(conkey, 1) = 2
      LIMIT 1
    );
  END IF;

  -- Add correct 3-column constraint if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'grade_data'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 3
  ) THEN
    ALTER TABLE grade_data
      ADD CONSTRAINT grade_data_exam_student_subject_key
      UNIQUE (exam_id, student_id, subject);
  END IF;
END $$;
