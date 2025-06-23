# n8n工作流调试指南

## 🔍 问题现状

- ✅ n8n工作流返回200 OK
- ✅ CSV文件正确解析（8条记录）
- ❌ 数据没有保存到Supabase数据库

## 🛠️ 调试步骤

### 1. 检查n8n工作流执行日志

1. 打开n8n界面：http://localhost:5678
2. 找到工作流：`FppT8sCsSxcUnNnj`
3. 点击"Executions"查看执行历史
4. 找到最近的执行记录，检查每个节点的状态

### 2. 检查各节点输出

#### Code节点输出检查
- 确认Code节点是否正确输出了8条记录
- 检查每条记录的字段格式是否正确
- 确认字段名称是否与Supabase表结构匹配

#### Edit Fields节点检查
- 确认字段映射是否正确
- 检查是否有字段转换错误

#### Supabase节点检查
- 查看是否有错误信息
- 确认表名是否正确（应该是`grade_data`）
- 检查字段映射是否匹配数据库结构

### 3. 可能的问题和解决方案

#### 问题1：Supabase节点配置错误
**解决方案**：
- 检查Supabase URL和API Key是否正确
- 确认表名为`grade_data`
- 检查操作类型是否为"Insert"

#### 问题2：字段名称不匹配
**解决方案**：
- 确保Code节点输出的字段名与数据库表字段一致
- 主要字段：`student_id`, `name`, `class_name`, `exam_title`, `exam_type`, `exam_date`

#### 问题3：数据格式问题
**解决方案**：
- 确保日期格式正确（YYYY-MM-DD）
- 确保数字字段是数值类型，不是字符串

### 4. 推荐的Code节点代码

确保Code节点使用以下代码：

```javascript
// 获取webhook数据
const webhookData = $('Webhook').first().json;

// 提取考试信息
const examInfo = {
  examTitle: webhookData.body?.examTitle || webhookData.examTitle || '期中考试',
  examType: webhookData.body?.examType || webhookData.examType || '期中考试',
  examDate: webhookData.body?.examDate || webhookData.examDate || '2024-06-15',
  examScope: webhookData.body?.examScope || webhookData.examScope || 'class'
};

// 获取文件数据
let fileData = null;
if (webhookData.body?.file) {
  fileData = webhookData.body.file;
} else if (webhookData.file) {
  fileData = webhookData.file;
}

if (!fileData) {
  return [{
    json: {
      error: '未找到文件数据',
      exam_info: examInfo
    }
  }];
}

try {
  // 解码文件数据
  const buffer = Buffer.from(fileData, 'base64');
  const csvContent = buffer.toString('utf-8');
  
  // 解析CSV
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const results = [];
  
  // 处理数据行
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === 0) continue;
    
    const record = {
      exam_title: examInfo.examTitle,
      exam_type: examInfo.examType,
      exam_date: examInfo.examDate,
      exam_scope: examInfo.examScope,
      created_at: new Date().toISOString()
    };
    
    // 字段映射
    headers.forEach((header, index) => {
      const value = values[index];
      if (value && value !== '') {
        switch (header) {
          case '学号':
            record.student_id = value;
            break;
          case '姓名':
            record.name = value;
            break;
          case '班级':
            record.class_name = value;
            break;
          case '语文':
            record.chinese = parseFloat(value) || null;
            break;
          case '数学':
            record.math = parseFloat(value) || null;
            break;
          case '英语':
            record.english = parseFloat(value) || null;
            break;
          case '物理':
            record.physics = parseFloat(value) || null;
            break;
          case '化学':
            record.chemistry = parseFloat(value) || null;
            break;
          case '总分':
            record.total_score = parseFloat(value) || null;
            break;
          default:
            record[header] = value;
        }
      }
    });
    
    // 验证必要字段
    if (record.student_id && record.name) {
      results.push({ json: record });
    }
  }
  
  console.log('✅ 处理完成，共', results.length, '条记录');
  return results;
  
} catch (error) {
  console.error('❌ 处理失败:', error);
  return [{
    json: {
      error: error.message,
      exam_info: examInfo
    }
  }];
}
```

### 5. Supabase节点配置

确保Supabase节点配置：
- **Operation**: Insert
- **Table**: grade_data
- **Columns**: 自动映射或手动映射所有字段

### 6. 测试建议

1. 先在n8n中手动执行工作流，查看每个节点的输出
2. 检查Supabase节点是否有错误信息
3. 如果有错误，根据错误信息调整配置
4. 确认数据库表结构与输入数据匹配

## 🎯 下一步行动

1. 按照上述步骤检查n8n工作流
2. 修复发现的问题
3. 重新测试CSV上传
4. 确认数据成功保存到数据库 