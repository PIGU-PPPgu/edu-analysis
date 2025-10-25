# 🔐 用户数据隔离和权限管理

## ⚠️ 重要提示

当前系统**没有数据隔离**，所有用户都能看到所有数据。这是一个**严重的安全漏洞**！

本目录包含修复此问题的SQL脚本和使用说明。

---

## 📋 问题说明

### 当前存在的问题：

1. ❌ **数据库表没有RLS（Row Level Security）策略**
   - 任何登录用户都能查询所有数据
   - 没有基于用户的数据隔离

2. ❌ **前端代码没有用户筛选**
   - 查询时不限制用户ID
   - 所有用户看到相同的数据

3. ❌ **没有用户-班级关联机制**
   - 无法定义哪些用户可以访问哪些班级

---

## 🛠️ 解决方案

### 第一步：执行数据库迁移

**按顺序**在Supabase SQL编辑器中执行以下脚本：

#### 1. 启用RLS和创建权限表

```bash
# 文件：01-enable-rls.sql
```

这个脚本会：
- ✅ 创建`user_class_access`表（用户-班级关联）
- ✅ 为所有关键表启用RLS
- ✅ 创建RLS策略（确保用户只能访问授权的数据）
- ✅ 创建辅助函数（`is_admin()`, `get_user_accessible_classes()`）

#### 2. 初始化用户权限

```bash
# 文件：02-init-user-access.sql
```

这个脚本会：
- ✅ 为所有教师分配所有班级的访问权限
- ✅ 为学生分配其所在班级的访问权限

**⚠️ 重要**: 执行前请根据实际需求修改此脚本！

---

### 第二步：验证RLS是否生效

在Supabase SQL编辑器中运行：

```sql
-- 1. 检查RLS是否启用
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('grade_data_new', 'students', 'homework', 'warning_records')
AND rowsecurity = true;
-- 应该返回4行，rowsecurity都为true

-- 2. 检查策略是否创建
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('grade_data_new', 'students', 'homework', 'warning_records');
-- 应该返回多条策略记录

-- 3. 查看用户权限分配情况
SELECT
  u.email,
  uca.class_name,
  uca.access_type
FROM user_class_access uca
JOIN auth.users u ON u.id = uca.user_id
ORDER BY u.email, uca.class_name;
```

---

### 第三步：测试数据隔离

#### 测试步骤：

1. **使用两个不同账号登录**
   - 账号A：分配班级"高一1班"的访问权限
   - 账号B：分配班级"高一2班"的访问权限

2. **为账号A分配权限**

```sql
-- 假设账号A的user_id是 'xxx-xxx-xxx'
INSERT INTO user_class_access (user_id, class_name, access_type)
VALUES ('xxx-xxx-xxx', '高一1班', 'teacher');
```

3. **为账号B分配权限**

```sql
-- 假设账号B的user_id是 'yyy-yyy-yyy'
INSERT INTO user_class_access (user_id, class_name, access_type)
VALUES ('yyy-yyy-yyy', '高一2班', 'teacher');
```

4. **验证结果**
   - 账号A登录后应该只能看到"高一1班"的数据
   - 账号B登录后应该只能看到"高一2班"的数据
   - 如果两者都能看到所有数据，说明RLS未生效

---

## 🔑 权限管理

### 授予班级访问权限

```sql
-- 授予用户对某个班级的访问权限
INSERT INTO user_class_access (user_id, class_name, access_type)
VALUES (
  '<用户UUID>',
  '<班级名称>',
  'teacher'  -- 或 'student', 'owner', 'readonly'
);
```

### 撤销班级访问权限

```sql
-- 撤销用户对某个班级的访问权限
DELETE FROM user_class_access
WHERE user_id = '<用户UUID>'
AND class_name = '<班级名称>';
```

### 批量授予权限

```sql
-- 为教师授予所有班级的访问权限
INSERT INTO user_class_access (user_id, class_name, access_type)
SELECT
  '<用户UUID>',
  class_name,
  'teacher'
FROM class_info
ON CONFLICT (user_id, class_name) DO NOTHING;
```

---

## 🎯 管理员功能

### 如何设置管理员？

管理员可以查看所有数据。设置方法：

```sql
-- 授予admin角色
INSERT INTO user_roles (user_id, role)
VALUES ('<用户UUID>', 'admin');
```

### 管理员特权

管理员账号会自动绕过RLS限制，可以：
- ✅ 查看所有班级的数据
- ✅ 管理所有用户的权限
- ✅ 访问系统所有功能

---

## 📌 常见问题

### Q1: 执行RLS后，用户看不到任何数据？

**原因**: 没有为用户分配班级访问权限。

**解决**: 运行`02-init-user-access.sql`或手动为用户分配权限。

### Q2: RLS策略不生效？

**检查清单**:
1. 确认RLS已启用：`SELECT rowsecurity FROM pg_tables WHERE tablename='grade_data_new';`
2. 确认策略已创建：`SELECT * FROM pg_policies WHERE tablename='grade_data_new';`
3. 确认用户有权限记录：`SELECT * FROM user_class_access WHERE user_id = auth.uid();`

### Q3: 如何临时禁用RLS进行调试？

```sql
-- ⚠️ 仅用于调试，生产环境禁止使用
ALTER TABLE grade_data_new DISABLE ROW LEVEL SECURITY;

-- 调试完成后重新启用
ALTER TABLE grade_data_new ENABLE ROW LEVEL SECURITY;
```

### Q4: 学生如何访问自己的数据？

学生访问自己的数据有两种方式：
1. **通过班级权限**: 在`user_class_access`表中授予其所在班级的`student`权限
2. **通过user_id关联**: `students`表中的`user_id`字段与认证用户关联

---

## 🚀 前端代码修改

启用RLS后，前端代码**不需要修改**，因为：

1. **RLS在数据库层面生效** - 无论前端如何查询，数据库都会自动过滤
2. **查询会自动限制** - 用户只能查询到有权限的数据
3. **透明化权限控制** - 前端无感知，后端自动处理

但建议在前端添加：
```typescript
import { getUserAccessibleClasses } from "@/services/userAccessService";

// 获取用户可访问的班级列表
const accessibleClasses = await getUserAccessibleClasses();
```

---

## 📝 维护建议

1. **定期审计权限**
   ```sql
   -- 查看所有权限分配
   SELECT u.email, uca.class_name, uca.access_type, uca.created_at
   FROM user_class_access uca
   JOIN auth.users u ON u.id = uca.user_id
   ORDER BY uca.created_at DESC;
   ```

2. **清理无效权限**
   ```sql
   -- 删除已删除用户的权限记录
   DELETE FROM user_class_access
   WHERE user_id NOT IN (SELECT id FROM auth.users);
   ```

3. **监控异常访问**
   - 开启Supabase的日志功能
   - 监控RLS策略拒绝的查询

---

## ⚠️ 重要警告

1. **不要禁用RLS** - 除非明确知道后果
2. **不要删除RLS策略** - 会导致数据泄露
3. **谨慎授予admin权限** - admin可以访问所有数据
4. **备份再执行** - 执行SQL前务必备份数据库

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. Supabase控制台 → Database → Policies
2. Supabase控制台 → Table Editor → user_class_access
3. 浏览器控制台的错误信息

---

**最后更新**: 2025-01-23
