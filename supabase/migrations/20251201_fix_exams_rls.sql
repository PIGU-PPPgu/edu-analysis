-- ============================================
-- 修复 exams 表的 RLS 策略
-- 目的: 允许认证用户进行测试，与其他表保持一致
-- 创建时间: 2024-12-01
-- ============================================

-- 1️⃣ 删除旧的严格策略
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 删除 exams 的所有策略
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'exams' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.exams', r.policyname);
    END LOOP;
END $$;

-- 2️⃣ 创建新的宽松策略（与students、grade_data_new等表一致）
CREATE POLICY "authenticated_read_exams" ON public.exams
FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_exams" ON public.exams
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_exams" ON public.exams
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_exams" ON public.exams
FOR DELETE TO authenticated USING (true);

-- ✅ 完成
SELECT '✅ exams 表 RLS 策略已修复！' as status;
