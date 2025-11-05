# 数据库表依赖关系分析

## 📊 核心依赖链

### 1. 用户认证链
```
auth.users (Supabase)
    ├── user_profiles
    ├── user_roles
    ├── user_settings
    ├── teachers
    └── students (通过 user_id)
```

### 2. 班级管理链
```
class_info / classes (冗余)
    ├── students (class_id)
    ├── course_classes
    ├── homework
    └── unified_classes (冗余)
```

### 3. 成绩数据链
```
students
    ├── grade_data_new (student_id)
    ├── grades (student_id)
    ├── exam_subject_scores
    └── student_portraits
```

### 4. 作业系统链
```
homework
    ├── homework_submissions
    ├── knowledge_points
    └── submission_knowledge_points
```

### 5. 预警系统链
```
warning_rules
    ├── warning_records
    ├── warning_rule_executions
    ├── warning_executions
    ├── warning_execution_results
    ├── warning_execution_steps
    └── warning_execution_errors
```

## 🔴 必须解决的依赖问题

### 1. 班级表混乱
- **问题**: 5个班级表相互引用
- **影响表**: students, homework, course_classes
- **解决方案**: 统一使用新的 `classes` 表

### 2. 成绩表重复
- **问题**: grade_data_new 和 grades 功能重叠
- **影响**: 统计查询需要查多个表
- **解决方案**: 合并为 `exam_scores` 表

### 3. 学生ID不统一
- **问题**: 有些用 UUID，有些用 student_id (字符串)
- **影响**: 关联查询困难
- **解决方案**: 统一使用 student_id 作为业务主键

### 4. 预警系统过度拆分
- **问题**: 11个表处理一个功能
- **影响**: 维护困难，性能差
- **解决方案**: 简化为3个表

## 📋 迁移顺序（基于依赖）

### Phase 1: 基础数据（无依赖）
1. subjects（科目）
2. academic_terms（学期）
3. teachers（教师）

### Phase 2: 班级体系
4. classes（班级） - 合并5个表
5. students（学生） - 清理关联

### Phase 3: 成绩体系
6. exams（考试信息）
7. exam_scores（成绩） - 合并3个表

### Phase 4: 功能模块
8. homeworks（作业）
9. homework_submissions（提交）
10. knowledge_mastery（知识点） - 合并2个表
11. student_portraits（画像） - 合并多个表

### Phase 5: 预警系统
12. warning_rules（规则）
13. warning_records（记录）
14. warning_stats（统计） - 新增

### Phase 6: 系统表
15. system_config（配置）
16. operation_logs（日志）

## 🚨 高风险依赖

### 1. auth.users 依赖
- **风险**: 大量表依赖Supabase认证
- **缓解**: 保持混合架构，不迁移认证

### 2. student_id 混乱
- **风险**: 不同表使用不同的学生标识
- **缓解**: 建立映射表，逐步统一

### 3. 实时数据依赖
- **风险**: 某些功能依赖Supabase实时推送
- **缓解**: 保留实时功能在Supabase

## 📝 数据清理规则

### 需要删除的表
```sql
-- 备份表
DROP TABLE IF EXISTS grade_data_legacy_backup;
DROP TABLE IF EXISTS classes_legacy_view;

-- 系统表（误入）
DROP TABLE IF EXISTS pg_class;
DROP TABLE IF EXISTS pg_opclass;

-- 过度设计的预警表
DROP TABLE IF EXISTS warning_execution_performance;
DROP TABLE IF EXISTS warning_execution_steps;
DROP TABLE IF EXISTS warning_audit_logs;
```

### 需要合并的表
```sql
-- 班级表合并
-- classes + class_info + unified_classes + class_id_mapping -> 新 classes

-- 成绩表合并  
-- grades + grade_data_new + exam_subject_scores -> 新 exam_scores

-- 知识点表合并
-- student_knowledge_mastery + submission_knowledge_points -> 新 knowledge_mastery

-- 学生信息表合并
-- student_portraits + student_ai_tags + student_custom_tags + student_learning_* -> 新 student_portraits
```

## 🔄 外键迁移策略

### 保留的外键
- students.class_id -> classes.id
- homework_submissions.student_id -> students.id
- homework_submissions.homework_id -> homeworks.id
- warning_records.student_id -> students.id

### 需要重建的外键
- 所有指向旧班级表的外键 -> 指向新 classes.id
- 所有指向旧成绩表的外键 -> 指向新 exam_scores.id

### 软关联（不建外键）
- 跨数据库关联（Supabase <-> 自建）
- 高频更新的表（避免锁）

## 📊 数据量影响分析

| 表名 | 数据量 | 迁移优先级 | 风险等级 |
|------|--------|-----------|----------|
| students | 7,228 | 高 | 中 |
| grade_data_new | 2,001 | 高 | 高 |
| grades | 750 | 高 | 中 |
| homework_submissions | 156 | 中 | 低 |
| classes/class_info | 20-22 | 高 | 高（混乱）|
| warning_records | 9 | 低 | 低 |
| homework | 4 | 低 | 低 |

## ✅ 依赖验证检查清单

- [ ] 所有外键关系已记录
- [ ] 级联删除规则已确认
- [ ] 孤立数据已识别
- [ ] 循环依赖已解决
- [ ] 跨库依赖已处理
- [ ] 触发器依赖已梳理
- [ ] 视图依赖已更新
- [ ] 函数依赖已检查

---

最后更新：2025-01-21