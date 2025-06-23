# n8n Information Extractor 手动配置完整指南

## 🎯 配置目标

将n8n工作流中的Information Extractor节点从当前的3个字段扩展到71个字段，实现完整的学生成绩数据智能解析。

## 📋 当前状态

**已配置字段** (3个):
- `student_id` (学号)
- `name` (姓名)
- `class_name` (学生所在的班级名称，如初三7班)

**需要添加字段** (68个): 见下方详细列表

## 🔧 操作步骤

### 第一步：打开配置界面
1. 访问 `http://localhost:5678`
2. 找到工作流 "TX3mvXbjU0z6PdDm"
3. 双击 **"Information Extractor"** 节点
4. 在弹出的配置窗口中找到 **"Attributes"** 部分

### 第二步：批量添加字段
按以下分类顺序添加字段，每次点击 **"Add Attribute"** 按钮添加一个新字段：

## 📊 完整字段列表 (71个)

### 🎯 第一批：科目成绩分数 (14个)
```
字段名: chinese
描述: 语文成绩分数

字段名: math
描述: 数学成绩分数

字段名: english
描述: 英语成绩分数

字段名: physics
描述: 物理成绩分数

字段名: chemistry
描述: 化学成绩分数

字段名: politics
描述: 政治成绩分数

字段名: history
描述: 历史成绩分数

字段名: biology
描述: 生物成绩分数

字段名: geography
描述: 地理成绩分数

字段名: pe
描述: 体育成绩分数

字段名: music
描述: 音乐成绩分数

字段名: art
描述: 美术成绩分数

字段名: it
描述: 信息技术成绩分数

字段名: general_tech
描述: 通用技术成绩分数
```

### 📈 第二批：科目等级 (14个)
```
字段名: chinese_grade
描述: 语文等级，如A+、A、B+等

字段名: math_grade
描述: 数学等级

字段名: english_grade
描述: 英语等级

字段名: physics_grade
描述: 物理等级

字段名: chemistry_grade
描述: 化学等级

字段名: politics_grade
描述: 政治等级

字段名: history_grade
描述: 历史等级

字段名: biology_grade
描述: 生物等级

字段名: geography_grade
描述: 地理等级

字段名: pe_grade
描述: 体育等级

字段名: music_grade
描述: 音乐等级

字段名: art_grade
描述: 美术等级

字段名: it_grade
描述: 信息技术等级

字段名: general_tech_grade
描述: 通用技术等级
```

### 🏆 第三批：班级排名 (14个)
```
字段名: chinese_class_rank
描述: 语文班级排名

字段名: math_class_rank
描述: 数学班级排名

字段名: english_class_rank
描述: 英语班级排名

字段名: physics_class_rank
描述: 物理班级排名

字段名: chemistry_class_rank
描述: 化学班级排名

字段名: politics_class_rank
描述: 政治班级排名

字段名: history_class_rank
描述: 历史班级排名

字段名: biology_class_rank
描述: 生物班级排名

字段名: geography_class_rank
描述: 地理班级排名

字段名: pe_class_rank
描述: 体育班级排名

字段名: music_class_rank
描述: 音乐班级排名

字段名: art_class_rank
描述: 美术班级排名

字段名: it_class_rank
描述: 信息技术班级排名

字段名: general_tech_class_rank
描述: 通用技术班级排名
```

### 🎖️ 第四批：年级排名 (14个)
```
字段名: chinese_grade_rank
描述: 语文年级排名

字段名: math_grade_rank
描述: 数学年级排名

字段名: english_grade_rank
描述: 英语年级排名

字段名: physics_grade_rank
描述: 物理年级排名

字段名: chemistry_grade_rank
描述: 化学年级排名

字段名: politics_grade_rank
描述: 政治年级排名

字段名: history_grade_rank
描述: 历史年级排名

字段名: biology_grade_rank
描述: 生物年级排名

字段名: geography_grade_rank
描述: 地理年级排名

字段名: pe_grade_rank
描述: 体育年级排名

字段名: music_grade_rank
描述: 音乐年级排名

字段名: art_grade_rank
描述: 美术年级排名

字段名: it_grade_rank
描述: 信息技术年级排名

字段名: general_tech_grade_rank
描述: 通用技术年级排名
```

### 📊 第五批：统计信息 (6个)
```
字段名: total_score
描述: 总分

字段名: average_score
描述: 平均分

字段名: rank_in_class
描述: 班级总排名

字段名: rank_in_grade
描述: 年级总排名

字段名: rank_in_school
描述: 校内总排名

字段名: total_grade
描述: 总分等级
```

### 📅 第六批：考试信息 (4个)
```
字段名: exam_title
描述: 考试名称

字段名: exam_type
描述: 考试类型，如月考、期中考试

字段名: exam_date
描述: 考试日期

字段名: exam_scope
描述: 考试范围，如class、grade、school
```

### 👤 第七批：学生信息 (2个)
```
字段名: grade
描述: 年级信息

字段名: gender
描述: 性别
```

## 🤖 第三步：优化AI提示词

在Information Extractor节点的配置中，找到 **"System Message"** 和 **"User Message"** 字段，替换为以下内容：

### System Message (系统提示词)
```
你是一个专业的教育数据解析专家。请从CSV数据中准确提取学生成绩信息。

重要规则：
1. 学号(student_id)是必填字段，不能为空
2. 姓名(name)是必填字段，不能为空
3. 分数字段应该是数字，如果无法解析则返回null
4. 等级字段通常是A+、A、A-、B+、B、B-、C+、C、C-、D+、D、E等
5. 排名字段应该是正整数，如果无法解析则返回null
6. 班级名称应该标准化，如"初三7班"、"高二3班"等
7. 如果某个字段在数据中不存在，请返回null而不是空字符串

科目对应关系：
- 语文 → chinese
- 数学 → math  
- 英语 → english
- 物理 → physics
- 化学 → chemistry
- 政治/道法 → politics
- 历史 → history
- 生物 → biology
- 地理 → geography
- 体育 → pe
- 音乐 → music
- 美术 → art
- 信息技术 → it
- 通用技术 → general_tech

请仔细分析CSV的列标题，智能匹配对应的字段。
```

### User Message (用户提示词)
```
请从以下CSV数据中提取学生成绩信息。CSV可能包含以下类型的列：
- 学生基本信息：学号、姓名、班级、年级、性别
- 各科成绩分数：语文、数学、英语、物理、化学等
- 各科等级：A+、A、B+等等级制评价
- 各科排名：班级排名、年级排名
- 统计信息：总分、平均分、总排名
- 考试信息：考试名称、类型、日期

请准确识别并提取所有可用的字段信息。
```

## ⚡ 提高效率的技巧

### 1. 复制粘贴策略
- 打开两个浏览器标签页：一个用于n8n配置，一个用于查看此指南
- 直接复制字段名和描述，避免手动输入错误
- 每添加10-15个字段就保存一次配置

### 2. 分批操作
- 按照上述7个批次分别添加，避免一次性操作过多
- 每个批次完成后点击"Save"保存进度
- 如果界面卡顿，可以刷新页面重新进入

### 3. 验证配置
添加完所有字段后：
1. 确认总字段数为71个
2. 检查字段名是否正确（无拼写错误）
3. 确认AI提示词已更新
4. 保存配置并测试工作流

## 🔧 第四步：修复Webhook配置

完成Information Extractor配置后，还需要修复Webhook响应配置：

1. 双击 **"POST Webhook"** 节点
2. 找到 **"Respond"** 参数
3. 将其设置为 **"Using Respond to Webhook Node"**
4. 保存配置

## ✅ 配置完成验证

配置完成后，您的工作流应该具备以下能力：

### 智能字段识别
- 自动识别CSV中的71种不同类型字段
- 智能匹配中文列名到英文字段名
- 处理各种格式的成绩数据

### 数据类型转换
- 分数字段自动转换为数字类型
- 排名字段转换为整数类型
- 等级字段保持文本格式
- 日期字段标准化处理

### 错误处理
- 缺失字段返回null值
- 无效数据格式的容错处理
- 重复字段的智能合并

## 🧪 测试建议

配置完成后，建议使用以下CSV数据进行测试：

1. **基础测试**：包含学号、姓名、班级的简单CSV
2. **完整测试**：包含所有71个字段的复杂CSV
3. **边界测试**：包含缺失值、异常格式的CSV

## 📞 技术支持

如果在配置过程中遇到问题：

1. **界面问题**：刷新浏览器，重新进入配置
2. **保存失败**：检查网络连接，分批保存
3. **字段错误**：对照此指南检查字段名和描述
4. **测试失败**：检查Webhook配置和AI模型连接

---

## 📋 配置检查清单

- [ ] 71个字段全部添加完成
- [ ] 字段名称无拼写错误
- [ ] AI提示词已更新
- [ ] Webhook响应参数已修复
- [ ] 工作流可以成功激活
- [ ] 测试数据解析正常

完成以上所有步骤后，您的n8n智能CSV解析工作流就可以完美支持学生画像系统的71个字段数据解析了！ 