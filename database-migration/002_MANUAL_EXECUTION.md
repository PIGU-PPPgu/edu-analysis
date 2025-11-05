# 🗄️ 数据库迁移 002 - 手动执行指南

## ⚠️ 必须手动执行原因
MCP权限不足以执行DDL操作(创建表、视图、索引)。

---

## 📋 执行步骤 (3分钟完成)

### Step 1: 打开Supabase SQL Editor

访问链接: https://supabase.com/dashboard/project/gxkblzrqsbfvmzdqsqpb/sql/new

或手动导航:
1. 打开 https://supabase.com/dashboard
2. 选择项目: gxkblzrqsbfvmzdqsqpb
3. 左侧菜单 → SQL Editor → New Query

---

### Step 2: 复制SQL脚本

在终端执行以下命令复制到剪贴板:

```bash
cat "/Users/iguppp/Library/Mobile Documents/com~apple~CloudDocs/代码备份/figma-frame-faithful-front/database-migration/002_class_unification_and_groups.sql" | pbcopy
```

或手动打开文件:
```
/Users/iguppp/Library/Mobile Documents/com~apple~CloudDocs/代码备份/figma-frame-faithful-front/database-migration/002_class_unification_and_groups.sql
```

---

### Step 3: 执行SQL

1. 粘贴到SQL Editor (Cmd+V)
2. 点击右上角 **"Run"** 按钮 (或按 Cmd+Enter)
3. 等待执行完成 (约10-20秒)

---

### Step 4: 验证结果

**成功标志**: 看到输出结果包含
```
✅ 数据库迁移 002 完成: 班级统一 + 小组管理系统
```

**验证查询** (可选,在新Query中执行):
```sql
-- 1. 检查unified_classes视图
SELECT * FROM unified_classes LIMIT 3;

-- 2. 检查新表
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'group_members', 'group_recommendations');

-- 3. 检查索引
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_students_%';

-- 4. 检查RPC函数
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_available_students_for_grouping';
```

**预期结果**:
- unified_classes应返回你的班级数据
- 应该看到3个新表: groups, group_members, group_recommendations
- 应该看到3个新索引: idx_students_class_student, idx_students_class_name_match, idx_students_full_match
- 应该看到新RPC函数: get_available_students_for_grouping

---

## 🚨 如果遇到错误

### 错误1: "relation does not exist"
**原因**: class_info表不存在
**解决**: 确认你的数据库有class_info表,或修改脚本使用classes表

### 错误2: "permission denied"
**原因**: 当前用户权限不足
**解决**: 使用Supabase管理员账号登录

### 错误3: "syntax error"
**原因**: SQL语法错误
**解决**: 复制完整错误信息告诉Claude

---

## ✅ 执行完成后

回到终端告诉Claude: **"数据库迁移完成"**

Claude会继续执行下一步: classService重构
