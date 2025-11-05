# 数据库迁移脚本

本目录包含数据库架构迁移脚本,用于创建和更新Supabase数据库表结构。

## 📁 文件说明

| 文件 | 说明 | 状态 |
|------|------|------|
| `001_initial_schema.sql` | 初始数据库架构 | 已执行 |
| `002_class_unification_and_groups.sql` | 班级表统一和小组架构设计 | 待执行 |
| `003_create_group_tables.sql` | **创建小组管理表** | 🆕 待执行 |
| `check-prerequisites.sql` | 前置条件检查脚本 | 辅助工具 |
| `execute-migration.md` | 执行指南 | 文档 |

## 🚀 快速开始

### 执行迁移 003: 创建小组管理表

**步骤1: 前置条件检查**

```sql
-- 在 Supabase SQL Editor 中执行
\i check-prerequisites.sql
```

**步骤2: 执行迁移脚本**

```sql
-- 在 Supabase SQL Editor 中执行
\i 003_create_group_tables.sql
```

**步骤3: 验证结果**

```sql
-- 查看创建的表
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('student_groups', 'group_members')
ORDER BY table_name;

-- 查看统计视图
SELECT * FROM group_statistics LIMIT 5;
```

## 📋 迁移 003 详细信息

### 创建的数据库对象

#### 1. **student_groups** 表
学生小组主表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 小组唯一标识 |
| class_name | TEXT | 所属班级(外键 → class_info) |
| group_name | TEXT | 小组名称 |
| description | TEXT | 小组描述 |
| leader_student_id | UUID | 组长ID(外键 → students) |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

**约束**:
- UNIQUE(class_name, group_name) - 同一班级小组名称唯一

#### 2. **group_members** 表
小组成员关联表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 记录唯一标识 |
| group_id | UUID | 所属小组(外键 → student_groups) |
| student_id | UUID | 学生ID(外键 → students) |
| role | TEXT | 角色: leader/member |
| joined_at | TIMESTAMPTZ | 加入时间 |

**约束**:
- UNIQUE(group_id, student_id) - 学生不会重复加入同一小组
- CHECK(role IN ('leader', 'member'))

#### 3. **group_statistics** 视图
小组统计汇总视图

提供每个小组的:
- 成员数量
- 组长信息
- 基本信息汇总

#### 4. 索引

```sql
-- student_groups 表
idx_student_groups_class_name
idx_student_groups_leader
idx_student_groups_created_at

-- group_members 表
idx_group_members_group_id
idx_group_members_student_id
```

#### 5. RLS 策略

**student_groups**:
- SELECT: 所有认证用户可查看
- INSERT/UPDATE/DELETE: 仅教师和管理员

**group_members**:
- SELECT: 所有认证用户可查看
- ALL: 仅教师和管理员

## 🔧 配合使用的服务

### groupService (src/services/groupService.ts)

```typescript
import * as groupService from '@/services/groupService';

// 创建小组
const group = await groupService.createGroup({
  class_name: '高一(1)班',
  group_name: '数学兴趣小组',
  description: '数学学习互助小组',
});

// 添加成员
await groupService.addMemberToGroup(group.id, studentId, 'member');

// 获取班级所有小组
const groups = await groupService.getGroupsByClass('高一(1)班');

// 获取小组统计
const stats = await groupService.getGroupStats(groupId);
```

### UI 组件

**SmartGroupManager**
- 智能分组生成
- 手动分组创建
- 分组管理(CRUD)

**GroupPortraitAnalysis**
- 小组画像分析
- 成绩统计展示
- 成员贡献分析

## 🛠️ 故障排查

### 错误1: 外键约束失败

```
ERROR: insert or update on table "student_groups" violates foreign key constraint
```

**原因**: class_info 表不存在或缺少对应的班级记录

**解决**:
1. 先执行 `002_class_unification_and_groups.sql`
2. 确保 class_info 表中有对应的班级记录

### 错误2: RLS策略相关错误

```
ERROR: function auth.uid() does not exist
```

**原因**: 本地PostgreSQL环境缺少Supabase auth函数

**解决**: 必须在Supabase云端环境执行迁移脚本

### 错误3: 唯一约束冲突

```
ERROR: duplicate key value violates unique constraint "unique_group_per_class"
```

**原因**: 尝试在同一班级创建重名小组

**解决**: 使用不同的小组名称,或先删除旧的小组

## 📊 数据示例

### 创建示例小组

```sql
-- 创建小组
INSERT INTO student_groups (class_name, group_name, description)
VALUES ('高一(1)班', '数学学习小组', '互助学习数学知识');

-- 添加成员
INSERT INTO group_members (group_id, student_id, role)
SELECT
    sg.id,
    s.id,
    CASE WHEN ROW_NUMBER() OVER() = 1 THEN 'leader' ELSE 'member' END
FROM student_groups sg
CROSS JOIN students s
WHERE sg.group_name = '数学学习小组'
  AND s.class_id = (SELECT id FROM classes WHERE name = '高一(1)班')
LIMIT 5;
```

### 查询小组信息

```sql
-- 查看班级所有小组
SELECT * FROM group_statistics
WHERE class_name = '高一(1)班'
ORDER BY created_at DESC;

-- 查看小组成员
SELECT
    sg.group_name,
    s.name AS student_name,
    gm.role,
    gm.joined_at
FROM group_members gm
JOIN student_groups sg ON gm.group_id = sg.id
JOIN students s ON gm.student_id = s.id
WHERE sg.group_name = '数学学习小组'
ORDER BY gm.role DESC, s.name;
```

## 🔙 回滚

如需回滚此次迁移:

```sql
-- 删除所有相关对象
DROP VIEW IF EXISTS group_statistics CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS student_groups CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

⚠️ **警告**: 回滚会删除所有小组数据,请谨慎操作!

## 📝 维护日志

| 日期 | 版本 | 说明 | 作者 |
|------|------|------|------|
| 2025-01-04 | 003 | 创建小组管理表和视图 | Claude Code |

## 🔗 相关文档

- [groupService API文档](../src/services/groupService.ts)
- [小组管理组件文档](../src/components/group/)
- [数据库架构完整参考](../CLAUDE.md#数据库架构完整参考文档)
