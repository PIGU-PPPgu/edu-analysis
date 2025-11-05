-- ==========================================
-- 初始化用户班级访问权限
-- ==========================================

-- 这个脚本用于为现有用户分配初始权限
-- 执行前请根据实际情况修改

-- 示例1: 为所有教师角色的用户分配所有班级的访问权限
INSERT INTO user_class_access (user_id, class_name, access_type)
SELECT
  ur.user_id,
  ci.class_name,
  'teacher'::TEXT
FROM user_roles ur
CROSS JOIN class_info ci
WHERE ur.role = 'teacher'
ON CONFLICT (user_id, class_name) DO NOTHING;

-- 示例2: 为学生分配其所在班级的访问权限
INSERT INTO user_class_access (user_id, class_name, access_type)
SELECT
  s.user_id,
  s.class_id::TEXT,
  'student'::TEXT
FROM students s
WHERE s.user_id IS NOT NULL
AND s.class_id IS NOT NULL
ON CONFLICT (user_id, class_name) DO NOTHING;

-- 示例3: 查看当前权限分配情况
-- SELECT
--   up.email,
--   ur.role,
--   uca.class_name,
--   uca.access_type
-- FROM user_class_access uca
-- JOIN auth.users up ON up.id = uca.user_id
-- LEFT JOIN user_roles ur ON ur.user_id = uca.user_id
-- ORDER BY up.email, uca.class_name;
