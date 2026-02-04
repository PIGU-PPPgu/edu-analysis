-- 为现有表添加 config_id 字段，实现配置隔离
-- 这样每个配置的数据相互独立，避免混淆

-- 1. students 表添加 config_id
ALTER TABLE students
ADD COLUMN config_id UUID REFERENCES import_configurations(id) ON DELETE SET NULL;

CREATE INDEX idx_students_config ON students(config_id);

COMMENT ON COLUMN students.config_id IS '关联的导入配置ID，用于数据隔离';

-- 2. teacher_student_subjects 表添加 config_id
ALTER TABLE teacher_student_subjects
ADD COLUMN config_id UUID REFERENCES import_configurations(id) ON DELETE SET NULL;

CREATE INDEX idx_teacher_student_subjects_config ON teacher_student_subjects(config_id);

COMMENT ON COLUMN teacher_student_subjects.config_id IS '关联的导入配置ID';

-- 3. grade_data 表添加 config_id
ALTER TABLE grade_data
ADD COLUMN config_id UUID REFERENCES import_configurations(id) ON DELETE SET NULL;

CREATE INDEX idx_grade_data_config ON grade_data(config_id);

COMMENT ON COLUMN grade_data.config_id IS '关联的导入配置ID，用于成绩数据隔离';

-- 4. exams 表添加 config_id（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'exams' AND table_schema = 'public'
  ) THEN
    ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS config_id UUID REFERENCES import_configurations(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_exams_config ON exams(config_id);

    COMMENT ON COLUMN exams.config_id IS '关联的导入配置ID';
  END IF;
END $$;

-- 更新 RLS 策略（确保配置隔离在权限层面也生效）
-- 注意：这里不修改现有策略，只是为将来的查询提供基础
