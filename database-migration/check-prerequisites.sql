-- ============================================================================
-- 前置条件检查脚本
-- 功能: 在执行 003_create_group_tables.sql 前检查必要的表是否存在
-- ============================================================================

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '检查小组管理表创建的前置条件';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';

    -- 检查 class_info 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_info') THEN
        missing_tables := array_append(missing_tables, 'class_info');
        RAISE WARNING '❌ class_info 表不存在';
    ELSE
        RAISE NOTICE '✅ class_info 表存在';
    END IF;

    -- 检查 students 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
        missing_tables := array_append(missing_tables, 'students');
        RAISE WARNING '❌ students 表不存在';
    ELSE
        RAISE NOTICE '✅ students 表存在';
    END IF;

    -- 检查 user_roles 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        missing_tables := array_append(missing_tables, 'user_roles');
        RAISE WARNING '❌ user_roles 表不存在 (RLS策略需要)';
    ELSE
        RAISE NOTICE '✅ user_roles 表存在';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '====================================';

    -- 检查是否已经存在目标表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_groups') THEN
        RAISE WARNING '⚠️  student_groups 表已存在,迁移脚本会跳过创建';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
        RAISE WARNING '⚠️  group_members 表已存在,迁移脚本会跳过创建';
    END IF;

    RAISE NOTICE '';

    -- 最终判断
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '====================================';
        RAISE NOTICE '前置条件检查: ❌ 失败';
        RAISE NOTICE '====================================';
        RAISE NOTICE '缺少以下表:';
        FOREACH table_name IN ARRAY missing_tables
        LOOP
            RAISE NOTICE '  - %', table_name;
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE '建议操作:';
        RAISE NOTICE '1. 确保基础表已创建';
        RAISE NOTICE '2. 执行必要的迁移脚本';
        RAISE NOTICE '3. 重新运行此检查脚本';
        RAISE EXCEPTION '前置条件不满足,无法继续迁移';
    ELSE
        RAISE NOTICE '====================================';
        RAISE NOTICE '前置条件检查: ✅ 通过';
        RAISE NOTICE '====================================';
        RAISE NOTICE '可以安全执行 003_create_group_tables.sql';
        RAISE NOTICE '';
    END IF;
END $$;
