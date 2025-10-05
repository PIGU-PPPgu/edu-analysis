# 数据库迁移执行指南

## 迁移 003: 创建小组管理表

### 执行步骤

1. **登录 Supabase Dashboard**
   - 访问: https://supabase.com/dashboard
   - 选择你的项目

2. **打开 SQL Editor**
   - 左侧菜单 → SQL Editor
   - 点击 "New query"

3. **复制并执行迁移脚本**
   - 打开文件: `database-migration/003_create_group_tables.sql`
   - 复制全部内容
   - 粘贴到 SQL Editor
   - 点击 "Run" 按钮执行

4. **验证迁移结果**

   执行成功后,你应该看到类似输出:
   ```
   ✅ 小组管理表迁移成功完成!
      - student_groups 表已创建
      - group_members 表已创建
      - 相关索引已创建
      - RLS策略已配置
      - group_statistics 视图已创建
   ```

5. **验证表结构**

   可以运行以下查询验证:
   ```sql
   -- 查看 student_groups 表
   SELECT * FROM student_groups LIMIT 1;

   -- 查看 group_members 表
   SELECT * FROM group_members LIMIT 1;

   -- 查看统计视图
   SELECT * FROM group_statistics LIMIT 1;
   ```

### 回滚脚本(如需要)

如果需要撤销此次迁移,执行以下SQL:

```sql
-- 删除视图
DROP VIEW IF EXISTS group_statistics;

-- 删除表(会自动删除触发器和策略)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS student_groups CASCADE;

-- 删除索引(如果表已删除,索引会自动删除)
```

### 注意事项

1. **执行前确认**:
   - 确保 `class_info` 表存在
   - 确保 `students` 表存在
   - 确保 `user_roles` 表存在(用于RLS策略)

2. **权限要求**:
   - 需要数据库管理员权限
   - 确保当前用户有创建表、视图、策略的权限

3. **数据安全**:
   - 此迁移创建新表,不会影响现有数据
   - 建议在测试环境先执行验证

### 后续操作

迁移成功后,你可以:

1. 在前端使用 `groupService` 进行小组管理
2. 使用 `SmartGroupManager` 组件创建和管理小组
3. 使用 `GroupPortraitAnalysis` 组件查看小组画像

### 故障排查

**问题1: class_info 表不存在**
```
ERROR: relation "class_info" does not exist
```
解决: 先执行 `002_class_unification_and_groups.sql` 迁移

**问题2: students 表不存在**
```
ERROR: relation "students" does not exist
```
解决: 确保基础表已创建,检查初始迁移脚本

**问题3: RLS策略创建失败**
```
ERROR: function auth.uid() does not exist
```
解决: 确保在Supabase环境中执行,本地PostgreSQL可能缺少auth函数
