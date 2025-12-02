-- ============================================
-- 清理临时表：删除 grade_data_new
-- ============================================
--
-- 背景：
-- grade_data_new 是临时迁移表，数据已通过 20251105_migrate_to_grade_data.sql
-- 迁移到 grade_data 表。现在 grade_data_new 为空表（0条记录），可以安全删除。
--
-- 已完成的准备工作：
-- 1. ✅ 验证数据迁移完整性 (grade_data: 2,231条记录)
-- 2. ✅ 批量替换代码引用 (59个文件，234处引用 grade_data_new -> grade_data)
-- 3. ✅ 提交代码更改 (commit e86970f)
--
-- 执行日期：2024-12-02
-- ============================================

DO $$
DECLARE
  table_exists BOOLEAN;
  record_count INTEGER;
BEGIN
  -- 检查 grade_data_new 表是否存在
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'grade_data_new'
  ) INTO table_exists;

  IF table_exists THEN
    -- 检查表中是否有数据（安全检查）
    EXECUTE 'SELECT COUNT(*) FROM public.grade_data_new' INTO record_count;

    IF record_count > 0 THEN
      RAISE WARNING '⚠️  grade_data_new 表中仍有 % 条记录，为安全起见，不执行删除操作！', record_count;
      RAISE WARNING '请手动检查数据并确认后再删除。';
    ELSE
      -- 安全删除空表
      DROP TABLE IF EXISTS public.grade_data_new CASCADE;
      RAISE NOTICE '✅ grade_data_new 表已成功删除（原表为空，0条记录）';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  grade_data_new 表不存在，无需删除';
  END IF;
END $$;

-- 验证删除结果
DO $$
DECLARE
  table_still_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'grade_data_new'
  ) INTO table_still_exists;

  IF NOT table_still_exists THEN
    RAISE NOTICE '✅ 验证成功：grade_data_new 表已完全移除';
  ELSE
    RAISE WARNING '⚠️  grade_data_new 表仍然存在，请检查删除操作';
  END IF;
END $$;

SELECT '✅ Grade data new table cleanup completed!' as status;
