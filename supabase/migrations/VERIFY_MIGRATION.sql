-- ============================================
-- 增值评价系统迁移验证脚本
-- 用于检查数据库是否已正确配置
-- ============================================

-- ============================================
-- 1. 检查所有表是否存在
-- ============================================

SELECT
  CASE
    WHEN COUNT(*) = 5 THEN '✅ 所有增值评价表已创建'
    ELSE '❌ 缺少部分表，已创建: ' || COUNT(*) || ' / 5'
  END AS status,
  STRING_AGG(table_name, ', ') AS existing_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'teacher_student_subjects',
    'grade_levels_config',
    'value_added_activities',
    'value_added_cache',
    'exam_series'
  );

-- ============================================
-- 2. 检查RLS策略
-- ============================================

SELECT
  tablename AS "表名",
  COUNT(*) AS "策略数量",
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ 策略完整'
    ELSE '⚠️  策略可能不完整'
  END AS "状态"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teacher_student_subjects',
    'grade_levels_config',
    'value_added_activities',
    'value_added_cache',
    'exam_series',
    'grade_data',
    'students',
    'exams'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 3. 检查当前用户权限
-- ============================================

SELECT
  auth.uid() AS "当前用户ID",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN '✅ 拥有admin角色'
    ELSE '❌ 没有admin角色（需要手动添加）'
  END AS "权限状态";

-- ============================================
-- 4. 检查默认配置
-- ============================================

SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ 默认等级配置已创建'
    ELSE '❌ 缺少默认等级配置'
  END AS "配置状态",
  name AS "配置名称"
FROM grade_levels_config
WHERE is_default = true;

-- ============================================
-- 5. 检查用户统计
-- ============================================

SELECT
  (SELECT COUNT(*) FROM auth.users) AS "总用户数",
  (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') AS "Admin用户数",
  (SELECT COUNT(*) FROM user_roles WHERE role = 'teacher') AS "教师用户数",
  (SELECT COUNT(*) FROM user_roles WHERE role = 'student') AS "学生用户数";

-- ============================================
-- 6. 检查触发器
-- ============================================

SELECT
  trigger_name AS "触发器名称",
  event_manipulation AS "触发事件",
  event_object_table AS "目标表",
  CASE
    WHEN trigger_name = 'on_auth_user_created_assign_admin' THEN '✅ 自动分配admin角色已启用'
    ELSE action_statement
  END AS "状态"
FROM information_schema.triggers
WHERE trigger_schema = 'auth' OR trigger_schema = 'public'
  AND trigger_name LIKE '%admin%'
ORDER BY trigger_name;

-- ============================================
-- 7. 测试写入权限
-- ============================================

-- 测试是否可以创建临时数据（会立即删除）
DO $$
DECLARE
  test_activity_id UUID;
  can_write BOOLEAN := false;
BEGIN
  -- 尝试插入测试数据
  BEGIN
    INSERT INTO value_added_activities (
      name, description,
      entry_exam_id, entry_exam_title,
      exit_exam_id, exit_exam_title,
      grade_level, student_year, academic_year, semester
    ) VALUES (
      '测试活动', '权限测试',
      'test-entry', '入口测试',
      'test-exit', '出口测试',
      '高一', '2024', '2024-2025', '第一学期'
    ) RETURNING id INTO test_activity_id;

    can_write := true;

    -- 立即删除测试数据
    DELETE FROM value_added_activities WHERE id = test_activity_id;

    RAISE NOTICE '✅ 写入权限正常 - 可以创建和删除增值活动';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ 写入权限异常 - %', SQLERRM;
  END;
END $$;

-- ============================================
-- 总结
-- ============================================

SELECT
  '🎉 验证完成！' AS "状态",
  '请检查上方各项是否全部通过。' AS "提示",
  '如果所有项都显示 ✅，说明迁移成功！' AS "说明";
