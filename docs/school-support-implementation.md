# 多学校支持架构实施文档

## 📋 项目背景

**问题描述**: 用户反馈教师历次追踪板块显示所有学校的教师数据，缺少学校隔离机制。

**根本原因**: 系统原本设计为单学校系统，数据库没有学校(school)概念。

**解决方案**: 实施方案A - 数据库架构升级，添加完整的多学校支持。

---

## ✅ 实施内容

### 1. 数据库架构变更

#### 新建表
- **schools表**: 学校基本信息管理
  - 字段: id, school_name, school_code, address, contact_phone, principal, etc.
  - 自动插入"默认学校"用于数据迁移

#### 新增字段
为6个核心表添加`school_id`外键：
1. **teachers表** - 教师所属学校
2. **class_info表** - 班级所属学校
3. **students表** - 学生所属学校
4. **teacher_student_subjects表** - 教学关联所属学校
5. **grade_data表** - 成绩所属学校
6. **value_added_cache表** - 增值缓存所属学校

#### 性能索引
创建9个性能索引：
- `idx_schools_school_name`
- `idx_schools_is_active`
- `idx_teachers_school_id`
- `idx_class_info_school_id`
- `idx_students_school_id`
- `idx_teacher_student_subjects_school_id`
- `idx_grade_data_school_id`
- `idx_value_added_cache_school_id`
- `idx_value_added_cache_school_activity`

#### RLS策略更新
更新3个表的RLS策略支持学校隔离：
- **teachers表**: 教师只能查看同校教师
- **grade_data表**: 教师只能查看同校成绩
- **value_added_cache表**: 教师只能查看同校增值数据
- **管理员**: 仍可查看所有学校数据

#### 辅助函数
创建2个PostgreSQL函数：
1. `get_current_user_school_id()` - 获取当前用户学校ID
2. `can_access_school(target_school_id)` - 检查学校访问权限

---

### 2. TypeScript类型定义更新

**文件**: `src/types/valueAddedTypes.ts`

添加`school_id?: string`字段到以下接口：
- `TeacherStudentSubject`
- `ValueAddedCache`
- `StudentValueAdded`
- `TeacherValueAdded`
- `ClassValueAdded`

---

### 3. Service层代码修改

**文件**: `src/services/historicalTrackingService.ts`

#### 新增辅助函数
```typescript
async function getCurrentUserSchoolId(): Promise<string | null>
```
- 查询当前登录用户的school_id
- 添加日志方便调试
- 错误处理返回null

#### 修改函数
1. **fetchTeachersWithHistory()** (lines 398-442)
   - ✅ 添加school_id筛选
   - ✅ 只返回当前用户所属学校的教师

2. **fetchClassesWithHistory()** (lines 464-502)
   - ✅ 添加school_id筛选
   - ✅ 只返回当前用户所属学校的班级

---

## 📊 数据迁移结果

执行迁移后的数据统计：
- ✅ schools表: 1条记录（默认学校）
- ✅ teachers表: 74位教师已关联学校
- ✅ class_info表: 21个班级已关联学校
- ✅ students表: 所有学生已关联学校（通过班级推断）
- ✅ teacher_student_subjects表: 所有记录已关联学校（通过教师推断）
- ✅ grade_data表: 所有成绩已关联学校（通过学生推断）
- ℹ️ value_added_cache表: 0条（需要重新计算增值评价）

---

## 🔒 安全性增强

### RLS策略示例

**教师表访问控制**:
```sql
CREATE POLICY "teachers_and_admins_can_view_teachers" ON teachers
  FOR SELECT
  USING (
    -- 管理员可以查看所有学校
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- 教师只能查看同校教师
    school_id = (
      SELECT school_id FROM teachers WHERE id = auth.uid()
    )
  );
```

---

## 🎯 使用指南

### 1. 添加新学校
```sql
INSERT INTO schools (school_name, school_code, school_type)
VALUES ('示范中学', 'DEMO_MIDDLE_SCHOOL', '初中');
```

### 2. 分配教师到学校
```sql
UPDATE teachers
SET school_id = (SELECT id FROM schools WHERE school_name = '示范中学')
WHERE name = '张老师';
```

### 3. 分配班级到学校
```sql
UPDATE class_info
SET school_id = (SELECT id FROM schools WHERE school_name = '示范中学')
WHERE class_name = '初一1班';
```

### 4. 查询当前用户学校
```sql
SELECT get_current_user_school_id();
```

### 5. 检查学校访问权限
```sql
SELECT can_access_school('00000000-0000-0000-0000-000000000001'::uuid);
```

---

## 🚀 后续工作建议

### Phase 2: UI增强（预估2-3小时）
1. 创建学校管理界面
   - 新建: `src/components/settings/SchoolManagement.tsx`
   - 功能: 添加、编辑、停用学校
2. 在教师/班级管理界面添加学校筛选器
3. 在数据导入时支持学校选择

### Phase 3: 增值计算服务修改（预估3-4小时）
修改以下service文件，在保存结果时自动关联school_id：
- `src/services/teacherValueAddedService.ts`
- `src/services/classValueAddedService.ts`
- `src/services/studentValueAddedService.ts`

### Phase 4: 数据清理（可选）
1. 将现有数据按实际情况分配到正确的学校
2. 删除"默认学校"记录
3. 添加school_id NOT NULL约束

---

## ⚠️ 注意事项

1. **现有增值缓存数据需要重新计算**
   - value_added_cache表中的历史数据没有school_id
   - 建议重新执行增值计算任务

2. **RLS策略影响**
   - 普通教师只能看到同校数据
   - 管理员可以看到所有学校数据
   - 如需跨校查看，需要admin角色

3. **默认学校**
   - ID: `00000000-0000-0000-0000-000000000001`
   - 所有现有数据都关联到此学校
   - 可在后续根据实际情况重新分配

4. **新数据自动关联**
   - 新创建的教师/班级/学生会继承创建者的school_id
   - 需要在创建逻辑中添加school_id赋值

---

## 📁 变更文件清单

### 数据库
- `supabase/migrations/20260210_add_school_support.sql` (新建)

### 代码
- `src/types/valueAddedTypes.ts` (修改5个接口)
- `src/services/historicalTrackingService.ts` (修改2个函数，新增1个辅助函数)

### 文档
- `docs/school-support-implementation.md` (本文档)

---

## ✅ 验证清单

- [x] 数据库迁移执行成功
- [x] schools表创建成功
- [x] 6个核心表添加school_id字段
- [x] 9个性能索引创建成功
- [x] 现有数据迁移到默认学校
- [x] RLS策略更新成功
- [x] TypeScript类型定义更新
- [x] historicalTrackingService.ts修改完成
- [x] 类型检查通过（无新增错误）
- [ ] 重新计算增值评价数据
- [ ] 创建学校管理UI
- [ ] 修改增值计算服务

---

**实施日期**: 2026-02-10
**实施人**: Claude Sonnet 4.5
**版本**: v1.0
**优先级**: P0（修复学校数据隔离问题）
