# n8n CSV处理替代解决方案

## 🔍 问题分析
您的n8n环境中没有"Spreadsheet File"节点，我们需要使用其他方式处理CSV文件。

## 🛠️ 解决方案1: 使用Google Sheets节点

从您的截图看到有"Google Sheets"节点，我们可以这样处理：

### 步骤1: 使用Convert to File节点
1. 添加"Convert to File"节点
2. 配置：Convert JSON data to binary data
3. 这将把webhook接收的文件转换为可处理的格式

### 步骤2: 使用Extract from File节点  
1. 添加"Extract from File"节点
2. 配置：Convert binary data to JSON
3. 这将提取CSV文件内容

### 步骤3: 使用Code节点处理数据
使用不依赖外部库的纯JavaScript代码：

```javascript
// 处理CSV数据的纯JavaScript代码
const items = [];

// 获取文件内容
const fileContent = $input.first().binary.data;
const csvText = Buffer.from(fileContent, 'base64').toString('utf8');

// 解析CSV
const lines = csvText.split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
  
  if (values.length < headers.length) continue;
  
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || '';
  });
  
  // 跳过空行
  if (!row.学号 || !row.姓名) continue;
  
  // 基础信息
  const baseRecord = {
    student_id: String(row.学号).trim(),
    name: String(row.姓名).trim(),
    class_name: String(row.班级 || '').trim(),
    exam_title: "907九下月考成绩",
    exam_type: "月考",
    exam_date: "2025-01-22"
  };
  
  // 处理各科成绩
  const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
  
  for (const subject of subjects) {
    if (row[subject] && row[subject] !== '' && row[subject] !== null) {
      const score = parseFloat(row[subject]);
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
  if (row.总分 && row.总分 !== '' && row.总分 !== null) {
    const totalScore = parseFloat(row.总分);
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

## 🛠️ 解决方案2: 简化的纯Code节点方案

如果上面的方案还是复杂，我们可以用一个Code节点处理所有逻辑：

```javascript
// 一体化CSV处理代码
const items = [];

try {
  // 从webhook获取文件数据
  const inputData = $input.all();
  
  // 检查是否有文件数据
  if (!inputData || inputData.length === 0) {
    throw new Error('没有接收到文件数据');
  }
  
  // 获取第一个输入项
  const firstItem = inputData[0];
  
  // 尝试不同的数据获取方式
  let csvContent = '';
  
  if (firstItem.binary && firstItem.binary.data) {
    // 如果是二进制数据
    csvContent = Buffer.from(firstItem.binary.data, 'base64').toString('utf8');
  } else if (firstItem.json && typeof firstItem.json === 'string') {
    // 如果是字符串数据
    csvContent = firstItem.json;
  } else if (firstItem.json && firstItem.json.data) {
    // 如果数据在json.data中
    csvContent = firstItem.json.data;
  } else {
    // 尝试直接使用整个json对象
    csvContent = JSON.stringify(firstItem.json);
  }
  
  if (!csvContent) {
    throw new Error('无法获取CSV内容');
  }
  
  // 解析CSV内容
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV文件格式不正确或为空');
  }
  
  // 解析标题行
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  
  // 处理数据行
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    
    if (values.length < headers.length) continue;
    
    // 创建行对象
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // 跳过空行
    if (!row.学号 || !row.姓名) continue;
    
    // 基础记录信息
    const baseRecord = {
      student_id: String(row.学号).trim(),
      name: String(row.姓名).trim(),
      class_name: String(row.班级 || '').trim(),
      exam_title: "907九下月考成绩",
      exam_type: "月考",
      exam_date: "2025-01-22"
    };
    
    // 处理各科成绩
    const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
    
    for (const subject of subjects) {
      if (row[subject] && row[subject] !== '' && row[subject] !== null) {
        const score = parseFloat(row[subject]);
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
    if (row.总分 && row.总分 !== '' && row.总分 !== null) {
      const totalScore = parseFloat(row.总分);
      if (!isNaN(totalScore)) {
        items.push({
          ...baseRecord,
          subject: '总分',
          score: totalScore
        });
      }
    }
  }
  
  if (items.length === 0) {
    throw new Error('没有解析到有效的成绩数据');
  }
  
  return items;
  
} catch (error) {
  // 返回错误信息用于调试
  return [{
    error: true,
    message: error.message,
    debug_info: {
      input_type: typeof $input.all()[0],
      input_keys: Object.keys($input.all()[0] || {}),
      first_item_sample: JSON.stringify($input.all()[0]).substring(0, 200)
    }
  }];
}
```

## 🛠️ 解决方案3: 使用Microsoft Excel 365节点

如果您有Microsoft 365账号，可以：
1. 使用"Microsoft Excel 365"节点
2. 先将CSV上传到Excel Online
3. 然后读取数据进行处理

## 📋 推荐操作步骤

我建议您先尝试**解决方案2**（纯Code节点方案）：

1. **删除**有问题的"多格式文件解析器"节点
2. **添加**一个新的Code节点
3. **粘贴**上面的一体化CSV处理代码
4. **连接**Webhook → Code节点 → HTTP Request (Supabase)
5. **保存并激活**工作流

## 🧪 测试方法

修改后，运行测试：
```bash
./测试修复后的工作流.sh
```

如果还有问题，Code节点会返回详细的错误信息和调试数据，帮助我们进一步诊断问题。

## 🔍 调试技巧

如果代码执行失败，可以在n8n中查看：
1. 工作流执行历史
2. 每个节点的输入输出数据
3. 错误信息和堆栈跟踪

这样我们就能看到具体是在哪一步出了问题。 