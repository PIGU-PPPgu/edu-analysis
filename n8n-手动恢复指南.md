# n8n工作流手动恢复指南

## 🚨 问题说明

由于自动配置脚本导致原工作流损坏，现在需要手动重新创建工作流。

## 🔧 手动恢复步骤

### 第一步：创建新工作流

1. **访问n8n界面**：打开 `http://localhost:5678`
2. **创建新工作流**：点击 "New Workflow" 按钮
3. **设置工作流名称**：命名为 "智能CSV解析工作流"

### 第二步：添加Webhook节点

1. **添加节点**：点击 "+" 按钮，搜索 "Webhook"
2. **配置Webhook**：
   - HTTP Method: `POST`
   - Path: `083f9843-c404-4c8f-8210-e64563608f57`
   - Respond: `Using Respond to Webhook Node` ⚠️ **重要**
3. **保存配置**

### 第三步：添加Code节点

1. **添加Code节点**：搜索 "Code" 并添加
2. **配置JavaScript代码**：
```javascript
// 预处理CSV数据
const items = $input.all();
const processedItems = [];

for (const item of items) {
  if (item.binary && item.binary.data) {
    // 获取文件内容
    const fileContent = Buffer.from(item.binary.data.data, 'base64').toString('utf-8');
    
    processedItems.push({
      json: {
        csvContent: fileContent,
        fileName: item.binary.data.fileName || 'unknown.csv',
        mimeType: item.binary.data.mimeType || 'text/csv'
      }
    });
  }
}

return processedItems;
```

### 第四步：添加Information Extractor节点

1. **添加节点**：搜索 "Information Extractor"
2. **配置AI模型**：
   - 选择已配置的AI模型（Deepseek或OpenAI）
3. **设置系统提示词**：
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

4. **设置用户提示词**：
```
请从以下CSV数据中提取学生成绩信息：

{{ $json.csvContent }}

请准确识别并提取所有可用的字段信息。
```

5. **添加属性字段**：按照以下列表逐个添加71个属性

### 第五步：配置71个属性字段

**基础信息字段 (5个)**：
```
student_id - 学号
name - 姓名
class_name - 学生所在的班级名称，如初三7班
grade - 年级信息
gender - 性别
```

**科目成绩字段 (14个)**：
```
chinese - 语文成绩分数
math - 数学成绩分数
english - 英语成绩分数
physics - 物理成绩分数
chemistry - 化学成绩分数
politics - 政治成绩分数
history - 历史成绩分数
biology - 生物成绩分数
geography - 地理成绩分数
pe - 体育成绩分数
music - 音乐成绩分数
art - 美术成绩分数
it - 信息技术成绩分数
general_tech - 通用技术成绩分数
```

**科目等级字段 (14个)**：
```
chinese_grade - 语文等级，如A+、A、B+等
math_grade - 数学等级
english_grade - 英语等级
physics_grade - 物理等级
chemistry_grade - 化学等级
politics_grade - 政治等级
history_grade - 历史等级
biology_grade - 生物等级
geography_grade - 地理等级
pe_grade - 体育等级
music_grade - 音乐等级
art_grade - 美术等级
it_grade - 信息技术等级
general_tech_grade - 通用技术等级
```

**班级排名字段 (14个)**：
```
chinese_class_rank - 语文班级排名
math_class_rank - 数学班级排名
english_class_rank - 英语班级排名
physics_class_rank - 物理班级排名
chemistry_class_rank - 化学班级排名
politics_class_rank - 政治班级排名
history_class_rank - 历史班级排名
biology_class_rank - 生物班级排名
geography_class_rank - 地理班级排名
pe_class_rank - 体育班级排名
music_class_rank - 音乐班级排名
art_class_rank - 美术班级排名
it_class_rank - 信息技术班级排名
general_tech_class_rank - 通用技术班级排名
```

**年级排名字段 (14个)**：
```
chinese_grade_rank - 语文年级排名
math_grade_rank - 数学年级排名
english_grade_rank - 英语年级排名
physics_grade_rank - 物理年级排名
chemistry_grade_rank - 化学年级排名
politics_grade_rank - 政治年级排名
history_grade_rank - 历史年级排名
biology_grade_rank - 生物年级排名
geography_grade_rank - 地理年级排名
pe_grade_rank - 体育年级排名
music_grade_rank - 音乐年级排名
art_grade_rank - 美术年级排名
it_grade_rank - 信息技术年级排名
general_tech_grade_rank - 通用技术年级排名
```

**统计信息字段 (6个)**：
```
total_score - 总分
average_score - 平均分
rank_in_class - 班级总排名
rank_in_grade - 年级总排名
rank_in_school - 校内总排名
total_grade - 总分等级
```

**考试信息字段 (4个)**：
```
exam_title - 考试名称
exam_type - 考试类型，如月考、期中考试
exam_date - 考试日期
exam_scope - 考试范围，如class、grade、school
```

### 第六步：添加Edit Fields节点

1. **添加Edit Fields节点**：搜索 "Edit Fields" 或 "Set"
2. **配置字段**：
   - 添加字段：`processed_data`，值：`{{ $json }}`，类型：Object
   - 添加字段：`timestamp`，值：`{{ new Date().toISOString() }}`，类型：String

### 第七步：添加Supabase节点

1. **添加Supabase节点**：搜索 "Supabase"
2. **配置连接**：
   - Operation: `Insert`
   - Table: `grade_data`
   - Columns: `Auto-map Input Data`
3. **配置凭据**：使用项目的Supabase凭据

### 第八步：添加Respond to Webhook节点

1. **添加节点**：搜索 "Respond to Webhook"
2. **配置响应**：
   - Respond With: `JSON`
   - Response Body:
```json
{{ { "success": true, "message": "数据处理完成", "processed_count": $json.processed_data ? ($json.processed_data.length || 1) : 0, "timestamp": $json.timestamp } }}
```

### 第九步：连接节点

按以下顺序连接节点：
```
Webhook → Code → Information Extractor → Edit Fields → Supabase → Respond to Webhook
```

### 第十步：激活工作流

1. **保存工作流**：点击保存按钮
2. **激活工作流**：点击右上角的激活开关
3. **确认状态**：确保显示为 "Active"

## 🧪 测试工作流

### 测试命令
```bash
curl -X POST http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57 \
  -H "Content-Type: multipart/form-data" \
  -F "file=@907九下月考成绩.csv"
```

### 预期结果
```json
{
  "success": true,
  "message": "数据处理完成",
  "processed_count": 3,
  "timestamp": "2025-01-15T15:58:00.000Z"
}
```

## ⚠️ 重要注意事项

1. **Webhook响应配置**：必须设置为 "Using Respond to Webhook Node"
2. **AI模型配置**：确保AI模型凭据正确配置
3. **Supabase凭据**：确保Supabase连接正常
4. **字段映射**：所有71个字段都需要正确配置

## 🔧 故障排除

### 如果Webhook不工作
- 检查Webhook响应配置
- 确认工作流已激活
- 查看n8n执行日志

### 如果AI解析失败
- 检查AI模型凭据
- 确认提示词配置正确
- 查看AI模型配额

### 如果数据保存失败
- 检查Supabase凭据
- 确认数据库表结构
- 查看Supabase日志

## 📞 完成确认

完成所有步骤后，您应该有：
- ✅ 一个包含6个节点的完整工作流
- ✅ 71个配置好的属性字段
- ✅ 正常工作的Webhook URL
- ✅ 能够处理CSV文件并保存到数据库

恢复完成后，智能CSV解析功能将重新可用！ 