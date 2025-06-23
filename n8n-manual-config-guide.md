# n8n智能解析工作流手动配置指南

## 🎯 配置目标
配置一个完整的智能成绩解析工作流，包含以下节点：
1. **Webhook** - 接收文件上传请求
2. **Code** - 解析CSV并映射字段
3. **AI Information Extractor** - AI数据质量分析
4. **Edit Fields** - 数据整理
5. **Supabase** - 数据存储
6. **Respond to Webhook** - 返回结果

## 📋 逐步配置指南

### 1. Webhook节点配置

**双击Webhook节点**，配置以下参数：

```
HTTP Method: POST
Path: parse-grade-file
Response Mode: Response Node
Authentication: None
Options:
  - Allowed Origins: *
```

### 2. Code节点配置

**双击Code节点**，在JavaScript Code区域输入以下代码：

```javascript
// 字段映射配置
const fieldMapping = {
  // 学生信息映射
  '学号': 'student_id',
  '姓名': 'name',
  '班级': 'class_name',
  '年级': 'grade',
  '性别': 'gender',
  
  // 成绩科目映射
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
  '政治': 'politics',
  '历史': 'history',
  '生物': 'biology',
  '地理': 'geography',
  '体育': 'pe',
  '音乐': 'music',
  '美术': 'art',
  '信息技术': 'it',
  '通用技术': 'general_tech',
  
  // 统计字段映射
  '总分': 'total_score',
  '平均分': 'average_score',
  '班级排名': 'rank_in_class',
  '年级排名': 'rank_in_grade',
  '校内排名': 'rank_in_school'
};

// 获取上传的文件数据
const fileData = $input.first().json.body;
console.log('接收到的文件数据:', fileData);

// 解析CSV数据的函数
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return { headers, data };
}

// 字段映射函数
function mapFields(data) {
  return data.map(row => {
    const mappedRow = {};
    
    // 基础字段映射
    Object.keys(row).forEach(key => {
      const mappedKey = fieldMapping[key] || key.toLowerCase().replace(/[^a-z0-9]/g, '_');
      mappedRow[mappedKey] = row[key];
    });
    
    // 确保必要字段存在
    if (!mappedRow.student_id && mappedRow.学号) {
      mappedRow.student_id = mappedRow.学号;
    }
    if (!mappedRow.name && mappedRow.姓名) {
      mappedRow.name = mappedRow.姓名;
    }
    if (!mappedRow.class_name && mappedRow.班级) {
      mappedRow.class_name = mappedRow.班级;
    }
    
    return mappedRow;
  });
}

// 数据验证函数
function validateData(data) {
  const errors = [];
  const validData = [];
  
  data.forEach((row, index) => {
    const rowErrors = [];
    
    // 验证必填字段
    if (!row.student_id || row.student_id.trim() === '') {
      rowErrors.push('学号不能为空');
    }
    if (!row.name || row.name.trim() === '') {
      rowErrors.push('姓名不能为空');
    }
    
    // 验证数据格式
    Object.keys(row).forEach(key => {
      if (key.includes('score') || key.includes('分') || /^(语文|数学|英语|物理|化学|政治|历史|生物|地理)$/.test(key)) {
        const value = parseFloat(row[key]);
        if (!isNaN(value) && (value < 0 || value > 150)) {
          rowErrors.push(`${key}分数超出合理范围(0-150)`);
        }
      }
    });
    
    if (rowErrors.length > 0) {
      errors.push({ row: index + 1, errors: rowErrors });
    } else {
      validData.push(row);
    }
  });
  
  return { validData, errors };
}

try {
  let parsedData;
  
  // 根据文件类型解析数据
  if (fileData.filename && fileData.filename.endsWith('.csv')) {
    parsedData = parseCSV(fileData.content);
  } else if (fileData.csvContent) {
    parsedData = parseCSV(fileData.csvContent);
  } else {
    throw new Error('不支持的文件格式或数据格式');
  }
  
  // 映射字段
  const mappedData = mapFields(parsedData.data);
  
  // 验证数据
  const validation = validateData(mappedData);
  
  // 返回处理结果
  return [{
    json: {
      success: true,
      originalHeaders: parsedData.headers,
      mappedData: validation.validData,
      errors: validation.errors,
      totalRows: parsedData.data.length,
      validRows: validation.validData.length,
      errorRows: validation.errors.length,
      fieldMapping: fieldMapping,
      timestamp: new Date().toISOString()
    }
  }];
  
} catch (error) {
  console.error('文件解析错误:', error);
  return [{
    json: {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }];
}
```

### 3. AI Information Extractor节点配置

**双击AI Information Extractor节点**，配置：

```
Model: gpt-3.5-turbo (或其他可用模型)
System Message: 你是一个教育数据分析专家，负责分析学生成绩数据的质量和合理性。请分析提供的数据，识别可能的异常值、数据质量问题，并提供改进建议。

User Message: 请分析以下学生成绩数据：{{ $json.mappedData }}

请重点关注：
1. 数据完整性
2. 分数合理性
3. 异常值检测
4. 数据质量评估

请以JSON格式返回分析结果。

Temperature: 0.3
```

### 4. Edit Fields节点配置

**双击Edit Fields节点**，添加以下字段：

```
Field 1:
  Name: processed_data
  Value: {{ $('Code').item.json.mappedData }}
  Type: Object

Field 2:
  Name: ai_analysis
  Value: {{ $('AI Information Extractor').item.json }}
  Type: Object

Field 3:
  Name: validation_errors
  Value: {{ $('Code').item.json.errors }}
  Type: Array

Field 4:
  Name: processing_summary
  Value: {{ { totalRows: $('Code').item.json.totalRows, validRows: $('Code').item.json.validRows, errorRows: $('Code').item.json.errorRows, timestamp: $('Code').item.json.timestamp } }}
  Type: Object
```

### 5. Supabase节点配置

**双击Supabase节点**，配置：

```
Authentication: Service Account
Supabase URL: https://giluhqotfjpmofowvogn.supabase.co
Supabase Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ

Operation: Insert
Table: grade_data
Records: {{ $json.processed_data }}

Options:
  - Upsert: true
```

### 6. Respond to Webhook节点配置

**双击Respond to Webhook节点**，配置：

```
Respond With: JSON
Response Body: {{ { success: true, message: '数据处理完成', summary: $json.processing_summary, aiAnalysis: $json.ai_analysis, errors: $json.validation_errors } }}
```

## 🔗 节点连接

确保节点按以下顺序连接：
```
Webhook → Code → AI Information Extractor → Edit Fields → Supabase → Respond to Webhook
```

## ✅ 激活工作流

1. 点击右上角的"Inactive"开关，激活工作流
2. 保存工作流（Ctrl+S 或点击Save按钮）

## 🧪 测试工作流

工作流激活后，Webhook URL为：
```
http://localhost:5678/webhook/parse-grade-file
```

测试数据格式：
```json
{
  "filename": "test.csv",
  "csvContent": "学号,姓名,班级,语文,数学,英语\n001,张三,一班,85,90,88\n002,李四,一班,78,85,82"
}
```

## 🎯 预期结果

成功配置后，工作流将能够：
1. 接收CSV格式的成绩数据
2. 智能映射中文字段到英文数据库字段
3. 验证数据完整性和合理性
4. 使用AI分析数据质量
5. 将处理后的数据存储到Supabase
6. 返回处理结果和分析报告

## 🔧 故障排除

1. **节点配置错误**：检查每个节点的参数配置
2. **连接问题**：确保节点间连接正确
3. **数据格式错误**：检查输入数据格式是否符合要求
4. **API密钥问题**：确认Supabase密钥有效
5. **AI模型问题**：确认AI模型配置正确

## 📝 注意事项

1. 确保所有节点都已正确配置
2. 工作流必须激活才能接收请求
3. 测试时使用小量数据验证功能
4. 生产环境使用前进行充分测试

# n8n Webhook节点手动配置指南

## 问题描述
当前Webhook节点报错：**"Webhook node not correctly configured"**

错误详情：**"Set the "Respond" parameter to "Using Respond to Webhook Node" or remove the Respond to Webhook node"**

## 解决方案

### 方法1：修改Webhook节点配置（推荐）

1. **打开Webhook节点配置**
   - 双击"POST Webhook"节点
   - 或右键点击节点 → "Open"

2. **找到"Respond"参数**
   - 在配置面板中找到"Respond"字段
   - 当前可能设置为"Immediately"或未设置

3. **修改Respond设置**
   - 将"Respond"参数改为：**"Using Respond to Webhook Node"**
   - 这告诉n8n使用工作流末尾的"Respond to Webhook"节点来响应

4. **保存配置**
   - 点击"Save"保存节点配置
   - 点击工作流的"Save"按钮保存整个工作流

### 方法2：删除Respond to Webhook节点（备选）

如果不需要自定义响应，可以：
1. 删除工作流末尾的"Respond to Webhook"节点
2. 将Webhook节点的"Respond"设置为"Immediately"

## 配置完成后的验证

1. **激活工作流**
   - 点击工作流右上角的激活开关
   - 确保状态变为"Active"

2. **测试工作流**
   ```bash
   # 使用正确的webhook URL测试
   curl -X POST http://localhost:5678/webhook/083f9843-c404-4c8f-8210-e64563608f57 \
     -H "Content-Type: application/json" \
     -d '{"csvData": "学号,姓名,班级\nTEST001,张三,初三1班"}'
   ```

3. **检查执行日志**
   - 在"Executions"标签中查看执行结果
   - 确保所有节点都成功执行（绿色勾号）

## 预期结果

配置正确后，工作流应该能够：
- ✅ 接收CSV数据
- ✅ 解析和处理数据
- ✅ 使用AI提取字段信息
- ✅ 保存到Supabase数据库
- ✅ 返回处理结果

## 故障排除

如果仍有问题：
1. 检查AI模型配置（OpenAI/Deepseek凭据）
2. 验证Supabase连接配置
3. 查看具体的错误日志信息
4. 确保所有必需的字段都已配置

---
**注意**：这是n8n工作流配置中的常见问题，正确配置Respond参数是关键。 