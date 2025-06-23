# n8n工作流xlsx依赖问题修复指南

## 🚨 问题诊断
错误信息显示：`Cannot find module 'xlsx'`
- **问题节点**: "多格式文件解析器" (Code节点)
- **问题原因**: n8n环境中没有安装xlsx模块
- **解决方案**: 使用n8n内置节点替换自定义Code节点

## 🔧 手动修复步骤

### 步骤1: 打开n8n工作流编辑器
1. 访问 http://localhost:5678
2. 找到工作流 "CSV智能解析工作流" (ID: FppT8sCsSxcUnNnj)
3. 点击编辑

### 步骤2: 删除有问题的Code节点
1. 找到名为 "多格式文件解析器" 的节点
2. 右键点击该节点
3. 选择 "删除"

### 步骤3: 添加Spreadsheet File节点
1. 点击 "+" 添加新节点
2. 搜索 "Spreadsheet File"
3. 选择 "Spreadsheet File" 节点
4. 配置参数：
   ```
   Operation: Read
   File Format: CSV
   Options:
     - Delimiter: , (逗号)
     - Header Row: true (启用)
     - Encoding: utf8
   ```

### 步骤4: 重新连接节点
1. 将 "CSV文件上传" (Webhook) 连接到 "Spreadsheet File"
2. 将 "Spreadsheet File" 连接到下一个处理节点

### 步骤5: 修改数据转换逻辑
如果有其他Code节点需要处理数据，确保代码不依赖外部模块：

```javascript
// ✅ 正确的代码 - 不依赖外部模块
const items = [];

for (const item of $input.all()) {
  const data = item.json;
  
  // 跳过空行
  if (!data.学号 || !data.姓名) continue;
  
  // 基础信息
  const baseRecord = {
    student_id: String(data.学号).trim(),
    name: String(data.姓名).trim(),
    class_name: String(data.班级 || '').trim(),
    exam_title: "907九下月考成绩",
    exam_type: "月考",
    exam_date: "2025-01-22"
  };
  
  // 处理各科成绩
  const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
  
  for (const subject of subjects) {
    if (data[subject] && data[subject] !== '' && data[subject] !== null) {
      const score = parseFloat(data[subject]);
      if (!isNaN(score)) {
        items.push({
          ...baseRecord,
          subject: subject,
          score: score
        });
      }
    }
  }
  
  // 处理总分
  if (data.总分 && data.总分 !== '' && data.总分 !== null) {
    const totalScore = parseFloat(data.总分);
    if (!isNaN(totalScore)) {
      items.push({
        ...baseRecord,
        subject: '总分',
        score: totalScore
      });
    }
  }
}

return items;
```

### 步骤6: 保存并激活工作流
1. 点击 "保存" 按钮
2. 点击右上角的开关激活工作流
3. 确认工作流状态为 "Active"

## 🧪 测试修复结果

### 测试命令
```bash
curl -X POST http://localhost:5678/webhook/csv-upload \
  -F "file=@907九下月考成绩.csv"
```

### 预期结果
- HTTP状态码: 200
- 响应: 成功消息
- 数据库: 新增成绩记录

### 验证数据库
```bash
# 检查记录数量变化
curl -X GET "https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data?select=count" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"

# 查看最新记录
curl -X GET "https://giluhqotfjpmofowvogn.supabase.co/rest/v1/grade_data?order=created_at.desc&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"
```

## 🔍 故障排除

### 如果Spreadsheet File节点报错
1. 检查文件格式是否为CSV
2. 确认文件编码为UTF-8
3. 验证CSV文件有标题行

### 如果数据转换失败
1. 检查字段名称是否匹配
2. 确认数据类型转换正确
3. 添加调试输出查看数据结构

### 如果Supabase插入失败
1. 检查API密钥是否正确
2. 验证数据格式符合数据库表结构
3. 确认RLS策略允许插入

## 📋 完整工作流结构

修复后的工作流应该包含以下节点：

1. **CSV文件上传** (Webhook)
   - 接收POST请求和文件

2. **CSV文件解析** (Spreadsheet File)
   - 解析CSV文件内容

3. **数据转换** (Code)
   - 转换数据格式为Supabase兼容格式

4. **保存到Supabase** (HTTP Request)
   - 插入数据到grade_data表

## ✅ 修复完成检查清单

- [ ] 删除了有问题的"多格式文件解析器"节点
- [ ] 添加了Spreadsheet File节点
- [ ] 重新连接了节点流程
- [ ] 修改了数据转换代码（如需要）
- [ ] 保存并激活了工作流
- [ ] 测试文件上传功能
- [ ] 验证数据库中有新记录

---

**注意**: 这种修复方法避免了外部依赖问题，使用n8n内置功能，更加稳定可靠。 