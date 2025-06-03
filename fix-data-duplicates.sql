-- 修复grade_data表的字段和约束问题
-- 作用：1. 添加rank_in_school字段
--      2. 修改唯一约束，支持更新已有数据

-- 添加缺失字段
DO $$
BEGIN
  -- 添加rank_in_school字段（如果不存在）
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grade_data' 
    AND column_name = 'rank_in_school'
  ) THEN
    ALTER TABLE grade_data ADD COLUMN rank_in_school INTEGER;
    COMMENT ON COLUMN grade_data.rank_in_school IS '校内排名';
    RAISE NOTICE 'rank_in_school字段已添加';
  ELSE
    RAISE NOTICE 'rank_in_school字段已存在，无需添加';
  END IF;
  
  -- 检查唯一约束
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'grade_data_exam_id_student_id_key' 
    AND conrelid = 'grade_data'::regclass
  ) THEN
    -- 删除旧约束
    ALTER TABLE grade_data DROP CONSTRAINT grade_data_exam_id_student_id_key;
    RAISE NOTICE '已删除旧的唯一约束 grade_data_exam_id_student_id_key';
    
    -- 添加新约束，包含subject字段使多学科数据能够共存
    ALTER TABLE grade_data ADD CONSTRAINT grade_data_exam_id_student_id_subject_key 
      UNIQUE (exam_id, student_id, subject);
    RAISE NOTICE '已添加新的唯一约束 grade_data_exam_id_student_id_subject_key';
  ELSE
    RAISE NOTICE '未找到需要替换的约束';
    
    -- 确保存在正确的约束
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'grade_data_exam_id_student_id_subject_key' 
      AND conrelid = 'grade_data'::regclass
    ) THEN
      ALTER TABLE grade_data ADD CONSTRAINT grade_data_exam_id_student_id_subject_key 
        UNIQUE (exam_id, student_id, subject);
      RAISE NOTICE '已添加新的唯一约束 grade_data_exam_id_student_id_subject_key';
    END IF;
  END IF;
END $$;

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_grade_data_subject ON grade_data(subject);
CREATE INDEX IF NOT EXISTS idx_grade_data_rank_in_school ON grade_data(rank_in_school); 