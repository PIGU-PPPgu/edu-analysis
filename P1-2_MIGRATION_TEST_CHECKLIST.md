# P1-2 迁移测试检查清单

**迁移版本**: Priority 1 + Priority 2
**测试日期**: ___________
**测试人员**: ___________

---

## 📋 测试概述

本测试清单覆盖 homework 表从 `class_id` (UUID) 迁移到 `class_name` (TEXT) 的全部功能验证。

**关键原则**:
- ✅ 双字段并存期：系统同时支持 class_id 和 class_name
- ✅ 向后兼容：旧数据（仅含 class_id）仍可正常使用
- ✅ 优先使用 class_name，回退到 class_id

---

## 1️⃣ 数据库层测试

### 1.1 数据库迁移验证

- [ ] **迁移脚本执行成功**
  ```sql
  SELECT COUNT(*) FROM homework WHERE class_name IS NULL;
  -- 预期结果: 0 (所有记录都应有 class_name)
  ```

- [ ] **字段存在性检查**
  ```sql
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'homework'
    AND column_name IN ('class_id', 'class_name');
  ```
  预期结果:
  - class_id: UUID, 允许为空
  - class_name: TEXT, 允许为空

- [ ] **索引已创建**
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'homework' AND indexname = 'idx_homework_class_name';
  ```
  预期结果: 索引存在

- [ ] **触发器正常工作**
  ```sql
  -- 测试写入 class_name，验证 class_id 自动同步
  INSERT INTO homework (title, description, class_name, created_by, due_date)
  VALUES ('测试作业', '测试', '高一(1)班', '<user_id>', NOW());

  -- 检查 class_id 是否自动填充
  SELECT class_name, class_id FROM homework WHERE title = '测试作业';

  -- 清理测试数据
  DELETE FROM homework WHERE title = '测试作业';
  ```
  预期结果: class_id 应自动填充对应的 UUID

### 1.2 数据完整性验证

- [ ] **历史数据迁移完整性**
  ```sql
  -- 统计 homework 记录数
  SELECT
    COUNT(*) as total_count,
    COUNT(class_name) as has_class_name,
    COUNT(class_id) as has_class_id
  FROM homework;
  ```
  预期结果: total_count = has_class_name = has_class_id

- [ ] **班级名称准确性**
  ```sql
  -- 抽查5条记录，验证 class_name 与 class_info 表匹配
  SELECT h.id, h.class_name, ci.class_name
  FROM homework h
  LEFT JOIN class_info ci ON ci.class_name = h.class_name
  LIMIT 5;
  ```
  预期结果: 所有记录的 class_name 都能在 class_info 表中找到

---

## 2️⃣ Service 层测试 (Priority 1)

### 2.1 homework.ts - 作业服务

#### 创建作业测试

- [ ] **使用 class_name 创建作业**
  ```typescript
  const result = await createHomework({
    title: "测试作业A",
    description: "测试描述",
    class_name: "高一(1)班", // 仅传 class_name
    due_date: "2024-12-31",
    created_by: userId
  });
  ```
  预期结果:
  - 成功创建
  - 数据库中 class_name 和 class_id 都已填充

- [ ] **使用 class_id 创建作业（向后兼容）**
  ```typescript
  const result = await createHomework({
    title: "测试作业B",
    description: "测试描述",
    class_id: "<UUID>", // 仅传 class_id
    due_date: "2024-12-31",
    created_by: userId
  });
  ```
  预期结果:
  - 成功创建
  - class_name 自动同步

- [ ] **同时传递两个字段**
  ```typescript
  const result = await createHomework({
    title: "测试作业C",
    class_name: "高一(1)班",
    class_id: "<UUID>", // 两个字段都传
    // ...其他字段
  });
  ```
  预期结果: 成功创建，优先使用 class_name

#### 查询作业测试

- [ ] **按 class_name 查询**
  ```typescript
  const result = await getClassHomework("高一(1)班");
  ```
  预期结果: 返回该班级的所有作业

- [ ] **按 class_id 查询（向后兼容）**
  ```typescript
  const result = await getClassHomework("<UUID>");
  ```
  预期结果: 返回该班级的所有作业

- [ ] **查询不存在的班级**
  ```typescript
  const result = await getClassHomework("不存在的班级");
  ```
  预期结果: 返回空数组，无错误

#### 更新作业测试

- [ ] **更新 class_name**
  ```typescript
  const result = await updateHomework(homeworkId, {
    class_name: "高一(2)班"
  });
  ```
  预期结果:
  - 更新成功
  - class_id 自动同步

#### 统计分析测试

- [ ] **getHomeworkAnalytics() 支持双字段**
  ```typescript
  const result = await getHomeworkAnalytics(homeworkId);
  ```
  预期结果:
  - 正确统计该作业的提交情况
  - 学生列表查询正常

### 2.2 classes.ts - 班级服务

- [ ] **getAllClasses() 返回班级名称**
  ```typescript
  const classes = await getAllClasses();
  console.log(classes[0].id); // 应该是班级名称，不是 UUID
  ```
  预期结果:
  - `cls.id` 字段值为班级名称（如 "高一(1)班"）
  - 不是 UUID 格式

---

## 3️⃣ Component 层测试 (Priority 1 核心组件)

### 3.1 CreateHomeworkDialog.tsx - 创建作业对话框

#### 功能测试

- [ ] **选择班级创建作业**
  1. 打开创建作业对话框
  2. 从下拉列表选择班级（如 "高一(1)班"）
  3. 填写作业信息并提交

  预期结果:
  - 作业创建成功
  - 查看数据库: class_name = "高一(1)班", class_id 已同步

- [ ] **班级列表显示正确**
  预期结果:
  - 下拉列表显示班级名称（不是 UUID）
  - 所有班级都能正常显示

### 3.2 EditHomeworkDialog.tsx - 编辑作业对话框

#### 功能测试

- [ ] **编辑旧作业（仅含 class_id）**
  1. 选择一个旧作业（迁移前创建，仅有 class_id）
  2. 打开编辑对话框

  预期结果:
  - 班级名称正确显示（通过 class_id 回退查询）
  - 可以正常修改并保存

- [ ] **编辑新作业（含 class_name）**
  1. 选择新作业（迁移后创建，有 class_name）
  2. 打开编辑对话框

  预期结果:
  - 班级名称优先从 class_name 读取
  - 修改后保存成功

- [ ] **更换班级**
  1. 编辑作业时更换班级
  2. 保存

  预期结果:
  - class_name 和 class_id 都更新为新班级

### 3.3 TeacherHomeworkList.tsx - 教师作业列表

#### 功能测试

- [ ] **快速创建作业**
  1. 点击快速创建按钮
  2. 填写作业信息（含班级选择）
  3. 提交

  预期结果:
  - 作业创建成功
  - 列表立即刷新显示新作业

- [ ] **作业列表显示**
  预期结果:
  - 所有作业都正确显示班级名称
  - 旧作业（仅含 class_id）也能正确显示

- [ ] **班级筛选功能**
  1. 使用班级筛选器选择特定班级

  预期结果:
  - 只显示该班级的作业
  - 旧作业和新作业都能被正确筛选

---

## 4️⃣ Component 层测试 (Priority 2 次要组件)

### 4.1 StudentDataImporter.tsx - 学生数据导入

#### Excel 文件导入测试

- [ ] **导入包含 class_name 的文件**
  准备 Excel 文件:
  | 学号 | 姓名 | class_name |
  |------|------|-----------|
  | 2024001 | 张三 | 高一(1)班 |
  | 2024002 | 李四 | 高一(1)班 |

  预期结果:
  - 导入成功
  - students 表中 class_name 和 class_id 都已填充

- [ ] **导入包含 class_id 的文件（向后兼容）**
  准备 Excel 文件:
  | 学号 | 姓名 | class_id |
  |------|------|---------|
  | 2024003 | 王五 | <UUID> |

  预期结果:
  - 导入成功
  - class_name 自动同步

- [ ] **导入包含中文"班级"列的文件**
  准备 Excel 文件:
  | 学号 | 姓名 | 班级 |
  |------|------|------|
  | 2024004 | 赵六 | 高一(2)班 |

  预期结果:
  - 正确识别"班级"列为 class_name
  - 导入成功

### 4.2 RecordStudentHomeworkDialog.tsx - 记录作业

#### 功能测试

- [ ] **记录学生作业**
  1. 打开某个作业详情页
  2. 点击"记录学生作业"
  3. 选择学生

  预期结果:
  - 学生列表正确显示该班级的所有学生
  - 旧班级（仅含 class_id）和新班级（含 class_name）都能正常查询

- [ ] **过滤已提交学生**
  预期结果:
  - 已提交作业的学生不在列表中
  - 过滤逻辑正确

### 4.3 scenarios.ts - 预警规则 SQL 模板

#### SQL 模板测试

- [ ] **"连续未提交作业"预警规则**
  1. 创建测试场景:
     - 学生 A (高一(1)班) 有3次未提交作业
  2. 触发预警规则

  预期结果:
  - SQL JOIN 正确执行
  - 预警正确生成
  - 学生 A 出现在预警列表中

- [ ] **SQL 查询性能**
  ```sql
  EXPLAIN ANALYZE
  SELECT s.student_id, s.name, s.class_name, COUNT(*) as missing_count
  FROM students s
  JOIN homework h ON (s.class_name = h.class_name OR s.class_id = h.class_id)
  LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND s.id = hs.student_id
  WHERE hs.id IS NULL
  GROUP BY s.student_id, s.name, s.class_name;
  ```
  预期结果:
  - 查询时间 < 500ms
  - 使用了 idx_homework_class_name 索引

### 4.4 PriorityDashboardCards.tsx - 教师看板

#### 待批改作业卡片测试

- [ ] **作业列表显示**
  预期结果:
  - 显示最近3个待批改作业
  - 每个作业显示正确的班级名称
  - 旧作业也能正确显示

- [ ] **提交进度统计**
  预期结果:
  - "已提交/总人数" 统计准确
  - 学生数量查询正确（使用 OR 条件）

- [ ] **点击跳转**
  1. 点击任一作业卡片

  预期结果:
  - 正确跳转到作业详情页

---

## 5️⃣ 边界条件测试

### 5.1 空值处理

- [ ] **班级字段为空**
  ```sql
  INSERT INTO homework (title, class_name, class_id, created_by, due_date)
  VALUES ('测试空班级', NULL, NULL, '<user_id>', NOW());
  ```
  预期结果:
  - 创建成功（允许为空）
  - 前端显示 "未知班级" 或类似提示

### 5.2 不存在的班级

- [ ] **使用不存在的 class_name**
  ```typescript
  const result = await createHomework({
    title: "测试不存在班级",
    class_name: "不存在的班级999",
    // ...
  });
  ```
  预期结果:
  - 创建成功（无外键约束）
  - 但查询学生时返回空列表

### 5.3 数据不一致

- [ ] **class_name 和 class_id 不匹配**
  ```sql
  -- 手动创建不一致数据
  INSERT INTO homework (title, class_name, class_id, created_by, due_date)
  VALUES ('测试不一致', '高一(1)班', '<另一个班级的UUID>', '<user_id>', NOW());
  ```
  预期结果:
  - 系统优先使用 class_name
  - 触发器不会覆盖已有值

---

## 6️⃣ 性能测试

### 6.1 查询性能

- [ ] **大量作业查询**
  ```sql
  -- 查询1000条作业记录
  SELECT * FROM homework
  WHERE class_name = '高一(1)班'
  ORDER BY due_date DESC;
  ```
  预期结果: 查询时间 < 200ms

- [ ] **OR 条件查询性能**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM students
  WHERE class_name = '高一(1)班' OR class_id = '<UUID>';
  ```
  预期结果: 使用索引扫描，非全表扫描

### 6.2 并发测试

- [ ] **同时创建多个作业**
  使用工具模拟10个用户同时创建作业

  预期结果:
  - 所有作业创建成功
  - 无数据竞争或死锁

---

## 7️⃣ 安全性测试

### 7.1 SQL 注入防护

- [ ] **恶意 class_name 输入**
  ```typescript
  const result = await createHomework({
    title: "测试SQL注入",
    class_name: "'; DROP TABLE homework; --",
    // ...
  });
  ```
  预期结果:
  - 创建失败或按字面值存储
  - homework 表未被删除

### 7.2 XSS 防护

- [ ] **XSS 脚本班级名称**
  ```typescript
  const result = await createHomework({
    title: "测试XSS",
    class_name: "<script>alert('XSS')</script>",
    // ...
  });
  ```
  预期结果:
  - 前端显示时正确转义
  - 不执行脚本

---

## 8️⃣ 回归测试

### 8.1 作业系统核心功能

- [ ] **完整作业流程**
  1. 教师创建作业
  2. 学生提交作业
  3. 教师批改作业
  4. 学生查看反馈

  预期结果: 整个流程无错误

### 8.2 预警系统

- [ ] **预警生成**
  预期结果: 各类预警规则正常触发

### 8.3 统计分析

- [ ] **班级统计**
  预期结果: 各班级数据统计准确

---

## 9️⃣ 用户体验测试

### 9.1 显示测试

- [ ] **班级名称显示一致性**
  检查以下页面班级名称显示:
  - 作业列表
  - 作业详情
  - 学生列表
  - 预警列表
  - 统计图表

  预期结果: 所有页面显示一致，无 UUID 泄漏

### 9.2 加载速度

- [ ] **页面加载速度**
  测试以下页面加载时间:
  - 作业管理页
  - 教师看板
  - 学生列表

  预期结果: 加载时间无明显增加（< 2秒）

---

## 🔟 清理计划准备

### 10.1 过渡期监控

- [ ] **记录双字段使用情况**
  ```sql
  -- 统计仅使用 class_name 的记录
  SELECT COUNT(*) FROM homework WHERE class_name IS NOT NULL AND class_id IS NULL;

  -- 统计仅使用 class_id 的记录
  SELECT COUNT(*) FROM homework WHERE class_id IS NOT NULL AND class_name IS NULL;
  ```
  目标: 1-2周后，所有记录都应有 class_name

### 10.2 清理检查点

- [ ] **确认无依赖 class_id 的代码**
  搜索代码库:
  ```bash
  grep -r "\.class_id" src/
  grep -r "class_id\.eq" src/
  ```
  预期结果: 只剩下双字段兼容代码，无单独依赖 class_id 的逻辑

---

## ✅ 测试总结

### 测试通过标准

- [ ] 所有 **必须通过** 的测试项全部通过
- [ ] 无严重 Bug（P0/P1）
- [ ] 性能无明显降级
- [ ] 用户体验无负面影响

### 测试结论

- **测试通过**: ✅ / ❌
- **发现 Bug 数量**: _____
- **性能影响**: 无影响 / 轻微提升 / 轻微降低
- **建议**:
  - [ ] 可以进入生产环境
  - [ ] 需要修复 Bug 后再测试
  - [ ] 需要优化性能

---

## 📝 测试记录

| 测试项 | 测试结果 | 问题描述 | 解决方案 | 负责人 | 状态 |
|--------|---------|---------|---------|--------|------|
| 1.1 数据库迁移 | ✅ | - | - | - | 完成 |
| 2.1 创建作业 | ✅ | - | - | - | 完成 |
| ... | ... | ... | ... | ... | ... |

---

**测试完成日期**: ___________
**审核人**: ___________
**批准人**: ___________

---

## 📚 相关文档

- [P1-2 迁移计划](.claude/plans/quizzical-stirring-bunny.md)
- [Priority 1 Commit](https://github.com/your-repo/commit/74e79be)
- [Priority 2 Commit](https://github.com/your-repo/commit/941c8ad)
- [数据库架构文档](CLAUDE.md#supabase数据库架构完整参考文档)

---

**生成时间**: 2024-12-03
**文档版本**: v1.0
**维护者**: P1-2 迁移团队
