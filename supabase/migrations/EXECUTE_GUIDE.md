# 数据库迁移执行指南

## 🎯 当前待执行迁移

### ⚠️ P0: RLS策略修复 (必须立即执行)
**文件**: `20260213_fix_rls_policies.sql`
**优先级**: P0 - 严重安全问题
**预计时间**: 2-3分钟

---

## 📋 执行方式（选择其一）

### 方式1: Supabase Dashboard（推荐）⭐

1. **打开Supabase Dashboard**
   - 访问: https://app.supabase.com
   - 选择项目: `edu-analysis`

2. **进入SQL Editor**
   - 左侧菜单 → `SQL Editor`
   - 点击 `New Query`

3. **复制SQL内容**
   ```bash
   # 在本地复制迁移文件内容
   cat supabase/migrations/20260213_fix_rls_policies.sql | pbcopy
   ```
   或直接打开文件复制全部内容

4. **执行SQL**
   - 粘贴SQL到编辑器
   - 点击 `Run` 或按 `Cmd+Enter`
   - 等待执行完成（约30秒）

5. **验证结果**
   - 检查是否有错误提示
   - 如果成功，会显示 "Success. No rows returned"

---

### 方式2: Supabase CLI（如已安装）

```bash
# 1. 安装CLI（如未安装）
brew install supabase/tap/supabase

# 2. 登录
supabase login

# 3. 关联项目
supabase link --project-ref <your-project-ref>

# 4. 执行迁移
supabase db push
```

---

### 方式3: psql命令行（高级）

```bash
# 1. 从Supabase Dashboard获取连接字符串
# Settings → Database → Connection string → URI

# 2. 执行迁移
psql "postgresql://..." -f supabase/migrations/20260213_fix_rls_policies.sql
```

---

## ✅ 执行后验证

### 1. 检查策略是否创建成功

在SQL Editor执行：

```sql
-- 查看value_added_activities表的策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'value_added_activities';

-- 查看value_added_cache表的策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'value_added_cache';
```

**预期结果**:
- `value_added_activities`: 3个策略
  - `users_view_same_school_activities`
  - `users_create_same_school_activities`
  - `users_update_own_activities`
- `value_added_cache`: 3个策略
  - `users_view_same_school_cache`
  - `system_can_write_cache`
  - `system_can_update_cache`

### 2. 检查索引是否创建

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('value_added_cache', 'teachers')
  AND indexname LIKE 'idx_%school%';
```

**预期结果**:
- `idx_value_added_cache_school_user`
- `idx_teachers_school_user`

### 3. 检查函数是否创建

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'can_access_school';
```

**预期结果**: 1行，显示 `can_access_school` 函数

---

## 🚨 常见问题

### Q1: 提示"policy already exists"
**原因**: 策略已存在
**解决**: 先执行DROP语句，再执行CREATE

### Q2: 提示"permission denied"
**原因**: 当前用户权限不足
**解决**: 确保使用了service_role权限或数据库owner账号

### Q3: 提示"function exec_sql does not exist"
**原因**: 尝试使用代码执行，但函数不存在
**解决**: 改用Dashboard SQL Editor

---

## 📊 迁移影响范围

- **修改表**: `value_added_activities`, `value_added_cache`
- **新增策略**: 6个RLS策略
- **新增索引**: 2个性能索引
- **新增函数**: 1个权限检查函数
- **数据变更**: 无（仅修改权限结构）
- **停机时间**: 0秒（热更新）

---

## 🔐 安全说明

**修复前**:
- ❌ 任何用户可查看所有学校数据
- ❌ 存在跨学校数据泄露风险

**修复后**:
- ✅ 管理员可查看所有学校
- ✅ 教师只能查看本校数据
- ✅ 学生只能查看本人数据
- ✅ 数据库层和应用层双重隔离

---

## 📝 执行记录

**执行人**: _________
**执行时间**: _________
**执行方式**: □ Dashboard  □ CLI  □ psql
**执行结果**: □ 成功  □ 失败（原因：__________）
**验证结果**: □ 通过  □ 未通过

---

**生成时间**: 2026-02-16
**优先级**: P0 - 必须立即执行
