-- ============================================
-- 统一成绩表：grade_data_new -> grade_data
-- ============================================

-- 1. 检查 grade_data_new 是否存在
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grade_data_new') THEN
    RAISE NOTICE 'grade_data_new 表存在，开始迁移数据...';

    -- 2. 如果 grade_data 表不存在，先创建它
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grade_data') THEN
      RAISE NOTICE '创建 grade_data 表...';
      CREATE TABLE public.grade_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exam_id TEXT,
        student_id TEXT NOT NULL,
        name TEXT,
        class_name TEXT,
        exam_title TEXT,
        exam_type TEXT,
        exam_date DATE,

        -- 总分信息
        total_score NUMERIC,
        total_max_score NUMERIC DEFAULT 750,
        total_grade TEXT,

        -- 各科目成绩
        chinese_score NUMERIC,
        chinese_grade TEXT,
        math_score NUMERIC,
        math_grade TEXT,
        english_score NUMERIC,
        english_grade TEXT,
        physics_score NUMERIC,
        physics_grade TEXT,
        chemistry_score NUMERIC,
        chemistry_grade TEXT,
        politics_score NUMERIC,
        politics_grade TEXT,
        history_score NUMERIC,
        history_grade TEXT,
        biology_score NUMERIC,
        biology_grade TEXT,
        geography_score NUMERIC,
        geography_grade TEXT,

        -- 排名信息
        total_rank_in_class INTEGER,
        total_rank_in_school INTEGER,
        total_rank_in_grade INTEGER,

        -- 各科目排名
        chinese_rank_in_class INTEGER,
        math_rank_in_class INTEGER,
        english_rank_in_class INTEGER,
        physics_rank_in_class INTEGER,
        chemistry_rank_in_class INTEGER,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 创建索引
      CREATE INDEX grade_data_student_id_idx ON public.grade_data(student_id);
      CREATE INDEX grade_data_class_name_idx ON public.grade_data(class_name);
      CREATE INDEX grade_data_exam_id_idx ON public.grade_data(exam_id);
      CREATE INDEX grade_data_exam_student_idx ON public.grade_data(exam_id, student_id);
    END IF;

    -- 3. 迁移数据从 grade_data_new 到 grade_data
    RAISE NOTICE '迁移数据...';
    INSERT INTO public.grade_data
    SELECT * FROM public.grade_data_new
    ON CONFLICT (id) DO UPDATE SET
      exam_id = EXCLUDED.exam_id,
      student_id = EXCLUDED.student_id,
      name = EXCLUDED.name,
      class_name = EXCLUDED.class_name,
      exam_title = EXCLUDED.exam_title,
      exam_type = EXCLUDED.exam_type,
      exam_date = EXCLUDED.exam_date,
      total_score = EXCLUDED.total_score,
      total_max_score = EXCLUDED.total_max_score,
      total_grade = EXCLUDED.total_grade,
      chinese_score = EXCLUDED.chinese_score,
      chinese_grade = EXCLUDED.chinese_grade,
      math_score = EXCLUDED.math_score,
      math_grade = EXCLUDED.math_grade,
      english_score = EXCLUDED.english_score,
      english_grade = EXCLUDED.english_grade,
      physics_score = EXCLUDED.physics_score,
      physics_grade = EXCLUDED.physics_grade,
      chemistry_score = EXCLUDED.chemistry_score,
      chemistry_grade = EXCLUDED.chemistry_grade,
      politics_score = EXCLUDED.politics_score,
      politics_grade = EXCLUDED.politics_grade,
      history_score = EXCLUDED.history_score,
      history_grade = EXCLUDED.history_grade,
      biology_score = EXCLUDED.biology_score,
      biology_grade = EXCLUDED.biology_grade,
      geography_score = EXCLUDED.geography_score,
      geography_grade = EXCLUDED.geography_grade,
      total_rank_in_class = EXCLUDED.total_rank_in_class,
      total_rank_in_school = EXCLUDED.total_rank_in_school,
      total_rank_in_grade = EXCLUDED.total_rank_in_grade,
      chinese_rank_in_class = EXCLUDED.chinese_rank_in_class,
      math_rank_in_class = EXCLUDED.math_rank_in_class,
      english_rank_in_class = EXCLUDED.english_rank_in_class,
      physics_rank_in_class = EXCLUDED.physics_rank_in_class,
      chemistry_rank_in_class = EXCLUDED.chemistry_rank_in_class,
      updated_at = EXCLUDED.updated_at;

    RAISE NOTICE '数据迁移完成！';

    -- 4. 删除 grade_data_new 表（可选，如果想保留备份可以注释掉）
    -- DROP TABLE IF EXISTS public.grade_data_new CASCADE;
    -- RAISE NOTICE 'grade_data_new 表已删除';

  ELSE
    RAISE NOTICE 'grade_data_new 表不存在，无需迁移';
  END IF;
END $$;

-- 5. 确保 grade_data 表启用 RLS 并设置策略
ALTER TABLE IF EXISTS grade_data ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "authenticated_read_grade_data" ON grade_data;
DROP POLICY IF EXISTS "authenticated_insert_grade_data" ON grade_data;
DROP POLICY IF EXISTS "authenticated_update_grade_data" ON grade_data;

-- 创建新策略
CREATE POLICY "authenticated_read_grade_data" ON grade_data
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_grade_data" ON grade_data
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_grade_data" ON grade_data
FOR UPDATE TO authenticated USING (true);

-- 6. 显示结果
DO $$
DECLARE
  grade_data_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO grade_data_count FROM public.grade_data;
  RAISE NOTICE '✅ 迁移完成！grade_data 表当前有 % 条记录', grade_data_count;
END $$;

SELECT '✅ Grade data migration completed!' as status;
