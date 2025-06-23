# n8n智能解析工作流完整配置指南

> 🎯 **目标**: 配置完整的n8n工作流，实现文件上传 → AI解析 → 数据验证 → 数据库保存的完整流程

## 📋 工作流概览

```
Webhook接收文件 → Code解析文件 → AI提取信息 → Edit Fields标准化 → Supabase保存 → 响应结果
```

## 🔧 节点配置详情

### 1. **Webhook节点配置**

**节点名称**: `POST Webhook`
**节点类型**: Webhook
**配置参数**:

```json
{
  "httpMethod": "POST",
  "path": "parse-grade-file",
  "responseMode": "responseNode",
  "options": {
    "allowedOrigins": "*",
    "rawBody": false
  }
}
```

**说明**: 接收文件上传请求，支持CSV/Excel文件

---

### 2. **Code节点配置**

**节点名称**: `Code`
**节点类型**: Code
**JavaScript代码**:

```javascript
// 文件解析和初步处理
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

// 字段映射配置
const FIELD_MAPPING = {
  // 学生信息映射
  '学号': 'student_id',
  '姓名': 'name',
  '班级': 'class_name',
  '年级': 'grade',
  
  // 成绩科目映射
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
  '政治': 'politics',
  '历史': 'history',
  '生物': 'biology',
  '地理': 'geography'
};

// 获取输入数据
const inputData = $input.all();
const fileData = inputData[0].body;

let parsedData = [];
let fileType = '';
let fileName = '';

try {
  // 检测文件类型
  if (fileData.includes('Content-Type: text/csv') || fileName.endsWith('.csv')) {
    fileType = 'CSV';
    // 解析CSV文件
    const csvContent = fileData.split('\n').filter(line => line.trim());
    const headers = csvContent[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < csvContent.length; i++) {
      const values = csvContent[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      parsedData.push(row);
    }
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    fileType = 'Excel';
    // 解析Excel文件（需要处理二进制数据）
    // 这里简化处理，实际需要更复杂的Excel解析
    console.log('Excel文件解析需要特殊处理');
  } else {
    // 尝试作为CSV解析
    fileType = 'Unknown';
    const lines = fileData.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        parsedData.push(row);
      }
    }
  }

  // 应用字段映射
  const mappedData = parsedData.map(item => {
    const mapped = {};
    for (const [key, value] of Object.entries(item)) {
      const mappedKey = FIELD_MAPPING[key] || key;
      // 尝试转换数值
      mapped[mappedKey] = isNaN(value) ? value : Number(value);
    }
    return mapped;
  });

  // 基础数据验证
  const validData = mappedData.filter(item => {
    return item.student_id && item.name && item.class_name;
  });

  const invalidData = mappedData.filter(item => {
    return !item.student_id || !item.name || !item.class_name;
  });

  // 返回处理结果
  return [{
    json: {
      success: true,
      fileType: fileType,
      totalRows: parsedData.length,
      validRows: validData.length,
      invalidRows: invalidData.length,
      data: validData,
      invalidData: invalidData,
      fieldMapping: FIELD_MAPPING,
      timestamp: new Date().toISOString()
    }
  }];

} catch (error) {
  return [{
    json: {
      success: false,
      error: error.message,
      fileType: fileType,
      timestamp: new Date().toISOString()
    }
  }];
}
```

---

### 3. **AI Information Extractor节点配置**

**节点名称**: `Model* Information Extractor`
**节点类型**: AI Agent
**配置参数**:

```json
{
  "model": "gpt-4",
  "prompt": "你是一个教育数据分析专家。请分析以下学生成绩数据，提取关键信息并进行智能分析。\n\n数据内容：{{ $json.data }}\n\n请提供以下分析：\n1. 数据质量评估\n2. 字段识别和标准化建议\n3. 异常数据检测\n4. 数据完整性分析\n\n返回JSON格式的分析结果。",
  "options": {
    "temperature": 0.3,
    "maxTokens": 2000
  }
}
```

**说明**: 使用AI分析数据质量和提供优化建议

---

### 4. **Edit Fields节点配置**

**节点名称**: `Edit Fields`
**节点类型**: Edit Fields
**配置参数**:

```json
{
  "operations": [
    {
      "operation": "set",
      "name": "processedData",
      "value": "={{ $('Code').item.json.data }}"
    },
    {
      "operation": "set", 
      "name": "aiAnalysis",
      "value": "={{ $('Model* Information Extractor').item.json }}"
    },
    {
      "operation": "set",
      "name": "examInfo",
      "value": {
        "title": "{{ $('Code').item.json.examTitle || '导入考试' }}",
        "type": "{{ $('Code').item.json.examType || '测试' }}",
        "date": "{{ $('Code').item.json.examDate || new Date().toISOString().split('T')[0] }}"
      }
    },
    {
      "operation": "set",
      "name": "metadata",
      "value": {
        "importTime": "{{ new Date().toISOString() }}",
        "source": "n8n-workflow",
        "fileType": "{{ $('Code').item.json.fileType }}",
        "totalRows": "{{ $('Code').item.json.totalRows }}",
        "validRows": "{{ $('Code').item.json.validRows }}"
      }
    }
  ]
}
```

**说明**: 标准化数据格式，准备数据库插入

---

### 5. **Supabase节点配置**

**节点名称**: `Supabase create: row`
**节点类型**: Supabase
**配置参数**:

```json
{
  "resource": "row",
  "operation": "create",
  "tableId": "grade_data",
  "credentials": {
    "host": "https://giluhqotfjpmofowvogn.supabase.co",
    "serviceRole": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"
  },
  "additionalFields": {
    "upsert": false
  }
}
```

**字段映射**:
```json
{
  "student_id": "={{ $item.student_id }}",
  "name": "={{ $item.name }}",
  "class_name": "={{ $item.class_name }}",
  "subject": "={{ $item.subject || 'unknown' }}",
  "score": "={{ $item.score }}",
  "exam_title": "={{ $('Edit Fields').item.json.examInfo.title }}",
  "exam_type": "={{ $('Edit Fields').item.json.examInfo.type }}",
  "exam_date": "={{ $('Edit Fields').item.json.examInfo.date }}",
  "metadata": "={{ $('Edit Fields').item.json.metadata }}"
}
```

**说明**: 将处理后的数据保存到Supabase数据库

---

### 6. **Respond to Webhook节点配置**

**节点名称**: `Respond to Webhook`
**节点类型**: Respond to Webhook
**配置参数**:

```json
{
  "options": {
    "responseCode": 200,
    "responseHeaders": {
      "Content-Type": "application/json"
    }
  },
  "responseBody": {
    "success": true,
    "message": "数据处理完成",
    "summary": {
      "totalProcessed": "={{ $('Edit Fields').item.json.metadata.totalRows }}",
      "successfulInserts": "={{ $('Supabase create: row').all().length }}",
      "processingTime": "{{ new Date().toISOString() }}",
      "aiAnalysis": "={{ $('Model* Information Extractor').item.json.summary || '分析完成' }}"
    },
    "details": {
      "fileType": "={{ $('Edit Fields').item.json.metadata.fileType }}",
      "importTime": "={{ $('Edit Fields').item.json.metadata.importTime }}",
      "examInfo": "={{ $('Edit Fields').item.json.examInfo }}"
    }
  }
}
```

**说明**: 返回处理结果给客户端

---

## 🔗 节点连接关系

```
Webhook → Code → AI Extractor → Edit Fields → Supabase → Respond
```

## 🧪 测试配置

### 测试数据示例

```csv
学号,姓名,班级,数学,语文,英语
TEST001,张三,初三1班,85,92,78
TEST002,李四,初三1班,90,88,85
TEST003,王五,初三2班,78,85,92
```

### 测试请求

```bash
curl -X POST http://localhost:5678/webhook/parse-grade-file \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_grades.csv"
```

### 预期响应

```json
{
  "success": true,
  "message": "数据处理完成",
  "summary": {
    "totalProcessed": 3,
    "successfulInserts": 3,
    "processingTime": "2025-01-15T10:30:00.000Z",
    "aiAnalysis": "数据质量良好，所有字段识别正确"
  },
  "details": {
    "fileType": "CSV",
    "importTime": "2025-01-15T10:30:00.000Z",
    "examInfo": {
      "title": "导入考试",
      "type": "测试",
      "date": "2025-01-15"
    }
  }
}
```

## 🚀 部署步骤

1. **保存工作流**: 点击"Save"按钮保存配置
2. **激活工作流**: 切换"Activate workflow"开关
3. **测试工作流**: 使用测试数据验证功能
4. **集成前端**: 在前端系统中调用webhook URL
5. **监控日志**: 查看执行日志确保正常运行

## 📊 监控和维护

- **执行日志**: 在"Executions"标签查看运行历史
- **错误处理**: 配置错误通知和重试机制
- **性能优化**: 监控处理时间和资源使用
- **数据验证**: 定期检查数据质量和完整性

## 🔧 故障排除

### 常见问题

1. **文件解析失败**: 检查文件格式和编码
2. **AI分析超时**: 调整模型参数或增加超时时间
3. **数据库连接失败**: 验证Supabase凭据和网络连接
4. **字段映射错误**: 检查字段映射配置和数据格式

### 调试技巧

- 使用"Execute step"逐步测试每个节点
- 查看节点输出数据确认数据流
- 启用详细日志记录
- 使用小数据集进行测试

---

> 📝 **注意**: 配置完成后，记得测试完整流程并验证数据正确性。 