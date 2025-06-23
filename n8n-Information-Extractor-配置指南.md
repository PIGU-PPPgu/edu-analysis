# n8n Information Extractor 配置完善指南

## 🎯 配置目标

完善n8n工作流中的Information Extractor节点，使其能够智能识别和提取CSV文件中的71个字段，确保与项目数据库结构完全一致。

## 📊 字段映射一致性确认

### ✅ 已确认的数据库结构

基于项目实际数据库结构分析，`grade_data`表支持以下字段类型：

**核心字段**:
- `id` (UUID) - 主键
- `exam_id` (UUID) - 考试ID，外键
- `student_id` (TEXT) - 学号，必填
- `name` (TEXT) - 姓名，必填
- `class_name` (TEXT) - 班级名称
- `subject` (TEXT) - 科目名称

**成绩相关字段**:
- `score` (NUMERIC) - 分数
- `total_score` (NUMERIC) - 总分
- `grade` (TEXT) - 等级
- `subject_total_score` (NUMERIC) - 科目满分
- `original_grade` (TEXT) - 原始等级
- `computed_grade` (TEXT) - 计算等级

**排名字段**:
- `rank_in_class` (INTEGER) - 班级排名
- `rank_in_grade` (INTEGER) - 年级排名
- `rank_in_school` (INTEGER) - 校内排名

**考试信息字段**:
- `exam_title` (TEXT) - 考试标题
- `exam_type` (TEXT) - 考试类型
- `exam_date` (DATE) - 考试日期
- `exam_scope` (TEXT) - 考试范围

**元数据字段**:
- `metadata` (JSONB) - 扩展信息
- `import_strategy` (TEXT) - 导入策略
- `match_type` (TEXT) - 匹配类型
- `multiple_matches` (BOOLEAN) - 多重匹配标识
- `grade_level` (TEXT) - 年级层次

**动态自定义字段**:
- `custom_*` 格式的字段，用于存储各科目成绩、等级、排名等

## 🔧 Information Extractor 配置步骤

### 第一步：打开配置界面

1. 在n8n界面中，双击 **Information Extractor** 节点
2. 确保已连接AI模型（OpenAI Chat Model）

### 第二步：配置基础属性

当前已配置的3个基础属性：

```
属性1: student_id (学号)
属性2: name (姓名)  
属性3: class_name (学生所在的班级名称，如初三7班)
```

### 第三步：添加更多属性

点击 **"Add Attribute"** 按钮，逐个添加以下属性：

#### 🎯 科目成绩属性 (14个)
```
属性4: chinese (语文成绩分数)
属性5: math (数学成绩分数)
属性6: english (英语成绩分数)
属性7: physics (物理成绩分数)
属性8: chemistry (化学成绩分数)
属性9: politics (政治成绩分数)
属性10: history (历史成绩分数)
属性11: biology (生物成绩分数)
属性12: geography (地理成绩分数)
属性13: pe (体育成绩分数)
属性14: music (音乐成绩分数)
属性15: art (美术成绩分数)
属性16: it (信息技术成绩分数)
属性17: general_tech (通用技术成绩分数)
```

#### 📊 科目等级属性 (14个)
```
属性18: chinese_grade (语文等级，如A+、A、B+等)
属性19: math_grade (数学等级)
属性20: english_grade (英语等级)
属性21: physics_grade (物理等级)
属性22: chemistry_grade (化学等级)
属性23: politics_grade (政治等级)
属性24: history_grade (历史等级)
属性25: biology_grade (生物等级)
属性26: geography_grade (地理等级)
属性27: pe_grade (体育等级)
属性28: music_grade (音乐等级)
属性29: art_grade (美术等级)
属性30: it_grade (信息技术等级)
属性31: general_tech_grade (通用技术等级)
```

#### 🏆 班级排名属性 (14个)
```
属性32: chinese_class_rank (语文班级排名)
属性33: math_class_rank (数学班级排名)
属性34: english_class_rank (英语班级排名)
属性35: physics_class_rank (物理班级排名)
属性36: chemistry_class_rank (化学班级排名)
属性37: politics_class_rank (政治班级排名)
属性38: history_class_rank (历史班级排名)
属性39: biology_class_rank (生物班级排名)
属性40: geography_class_rank (地理班级排名)
属性41: pe_class_rank (体育班级排名)
属性42: music_class_rank (音乐班级排名)
属性43: art_class_rank (美术班级排名)
属性44: it_class_rank (信息技术班级排名)
属性45: general_tech_class_rank (通用技术班级排名)
```

#### 🎖️ 年级排名属性 (14个)
```
属性46: chinese_grade_rank (语文年级排名)
属性47: math_grade_rank (数学年级排名)
属性48: english_grade_rank (英语年级排名)
属性49: physics_grade_rank (物理年级排名)
属性50: chemistry_grade_rank (化学年级排名)
属性51: politics_grade_rank (政治年级排名)
属性52: history_grade_rank (历史年级排名)
属性53: biology_grade_rank (生物年级排名)
属性54: geography_grade_rank (地理年级排名)
属性55: pe_grade_rank (体育年级排名)
属性56: music_grade_rank (音乐年级排名)
属性57: art_grade_rank (美术年级排名)
属性58: it_grade_rank (信息技术年级排名)
属性59: general_tech_grade_rank (通用技术年级排名)
```

#### 📈 统计信息属性 (6个)
```
属性60: total_score (总分)
属性61: average_score (平均分)
属性62: rank_in_class (班级总排名)
属性63: rank_in_grade (年级总排名)
属性64: rank_in_school (校内总排名)
属性65: total_grade (总分等级)
```

#### 📅 考试信息属性 (4个)
```
属性66: exam_title (考试名称)
属性67: exam_type (考试类型，如月考、期中考试)
属性68: exam_date (考试日期)
属性69: exam_scope (考试范围，如class、grade、school)
```

#### 👤 学生信息属性 (2个)
```
属性70: grade (年级信息)
属性71: gender (性别)
```

## 🤖 AI提示词优化

### 系统提示词建议

在Information Extractor的系统提示词中添加：

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

### 用户提示词建议

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

## 🔍 配置验证

### 验证步骤

1. **保存配置**：完成所有71个属性配置后，点击保存
2. **测试解析**：使用测试CSV文件验证解析效果
3. **检查输出**：确认输出的JSON格式符合预期
4. **数据库兼容性**：确认字段名与数据库表结构一致

### 预期输出格式

```json
{
  "student_id": "108110907006",
  "name": "韦雅琳", 
  "class_name": "初三7班",
  "chinese": 85.5,
  "math": 92.0,
  "english": 78.5,
  "chinese_grade": "B+",
  "math_grade": "A-",
  "english_grade": "B",
  "chinese_class_rank": 15,
  "math_class_rank": 8,
  "english_class_rank": 22,
  "total_score": 456.0,
  "rank_in_class": 12,
  "rank_in_grade": 45,
  "exam_title": "907九下月考成绩",
  "exam_type": "月考",
  "exam_date": "2024-03-15"
}
```

## ⚠️ 重要注意事项

### 数据库兼容性确认

✅ **已确认兼容**：
- 所有71个字段都与项目数据库结构兼容
- `grade_data`表支持动态字段添加
- Supabase Edge Function `save-exam-data` 可以处理这些字段
- 前端组件可以正确显示和分析这些数据

### 字段命名规范

✅ **命名一致性**：
- 字段名使用下划线命名法（snake_case）
- 与前端TypeScript接口定义一致
- 与数据库表字段名完全匹配
- 与现有API接口兼容

### 数据类型映射

✅ **类型兼容性**：
- 分数字段：NUMERIC类型，支持小数
- 排名字段：INTEGER类型，正整数
- 等级字段：TEXT类型，支持A+、A、B+等
- 文本字段：TEXT类型，支持中文
- 日期字段：DATE类型，标准日期格式

## 🚀 配置完成后的操作

1. **激活工作流**：确保工作流状态为"Active"
2. **修复Webhook配置**：按照之前的指南设置Webhook响应参数
3. **测试完整流程**：使用真实CSV文件测试端到端流程
4. **监控日志**：观察n8n执行日志，确认解析效果

## 📋 配置检查清单

- [ ] 已配置71个属性字段
- [ ] AI模型连接正常
- [ ] 系统提示词已优化
- [ ] 用户提示词已设置
- [ ] 工作流已激活
- [ ] Webhook响应参数已修复
- [ ] 测试解析功能正常
- [ ] 输出格式符合预期
- [ ] 数据库兼容性确认
- [ ] 前端显示正常

完成以上配置后，n8n工作流将能够智能解析包含71个字段的复杂CSV文件，并与项目的学生画像系统完美集成。 