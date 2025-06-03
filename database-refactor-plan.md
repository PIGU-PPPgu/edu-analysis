# 数据库表命名标准化重构计划

## 🎯 目标
解决数据库表命名混乱问题，明确区分成绩分析系统和作业管理系统的数据表，不影响现有功能。

## 📊 当前表结构分析

### 成绩分析系统
- `grade_data` (46条记录) - 考试成绩数据，命名不清晰
- `exams` (10条记录) - 考试信息表，命名合适
- `students` (50条记录) - 学生信息表，两系统共用

### 作业管理系统
- `homework` (1条记录) - 作业信息表，命名合适
- `homework_submissions` (144条记录) - 作业提交表，包含`grade`字段
- `students` (50条记录) - 学生信息表，两系统共用

### 问题表
- `grades` (0条记录) - 空表，历史遗留，容易与作业系统混淆

## 🔧 重构方案：渐进式重命名

### 阶段1：创建新表（不影响现有功能）
```sql
-- 1. 创建新的考试成绩表
CREATE TABLE exam_scores AS SELECT * FROM grade_data;

-- 2. 重命名作业评分字段，明确语义
-- homework_submissions.grade → homework_submissions.homework_score
-- homework_submissions.score → homework_submissions.homework_points
```

### 阶段2：更新应用代码
```typescript
// 成绩分析相关代码
- .from('grade_data')
+ .from('exam_scores')

// 作业管理相关代码保持不变
.from('homework_submissions')
```

### 阶段3：清理旧表
```sql
-- 确认新表运行稳定后
DROP TABLE grade_data;
DROP TABLE grades; -- 清理空的历史表
```

## 📋 标准化后的表命名规范

### 🎓 考试成绩系统
```
exam_scores       - 考试成绩数据表 (原 grade_data)
exams            - 考试信息表
exam_analytics   - 考试分析结果表 (如需要)
```

### 📝 作业管理系统
```
homework              - 作业信息表
homework_submissions  - 作业提交表
homework_analytics    - 作业分析结果表 (如需要)
```

### 👥 共享数据表
```
students         - 学生信息表
classes          - 班级信息表
teachers         - 教师信息表
user_profiles    - 用户资料表
```

## 🚀 实施步骤

### 第1步：创建新表（立即执行）
```sql
-- 复制现有数据到新表
CREATE TABLE exam_scores AS SELECT * FROM grade_data;

-- 添加索引
CREATE INDEX idx_exam_scores_exam_id ON exam_scores(exam_id);
CREATE INDEX idx_exam_scores_student_id ON exam_scores(student_id);
```

### 第2步：更新前端代码（逐步替换）
- 修改 `gradeAnalysisService.ts` 中的表名引用
- 修改 `GradeAnalysisLayout.tsx` 中的查询
- 修改相关组件中的数据获取逻辑

### 第3步：测试验证（重要）
- 确保成绩分析功能正常工作
- 确保作业管理功能不受影响
- 数据一致性检查

### 第4步：清理旧表（谨慎执行）
```sql
-- 仅在新表运行稳定后执行
DROP TABLE grade_data;
DROP TABLE grades;
```

## ⚠️ 注意事项

1. **备份数据**：执行任何表操作前先备份
2. **渐进式更新**：不要一次性修改所有代码
3. **功能测试**：每个阶段都要完整测试两个系统
4. **回滚计划**：准备回滚方案以防出现问题

## 🔍 字段命名优化建议

### exam_scores表字段清理
```sql
-- 当前字段过多且有很多custom_字段
-- 建议保留核心字段：
- id, exam_id, student_id, score
- name, class_name (从students表获取更好)
- exam_title, exam_type, exam_date (从exams表获取更好)
- created_at, updated_at
```

### 清理建议
1. 移除大量的`custom_`字段，改用JSON字段存储
2. 规范化数据，避免冗余字段
3. 建立正确的外键关系

## 📈 预期收益

1. **语义清晰**：表名明确表达用途
2. **易于维护**：开发者更容易理解数据结构
3. **扩展性好**：为未来功能扩展提供清晰的结构
4. **减少混淆**：避免grade一词的歧义使用 