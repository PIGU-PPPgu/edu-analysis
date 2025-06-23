# n8n Information Extractor 最终解决方案

## 🎯 问题分析

Information Extractor节点一直报错 "Text for item 0 is not defined"，这是因为：
1. Information Extractor期望接收包含`text`字段的数据
2. 我们的Code节点输出格式与其期望不匹配
3. 工作流配置中的模板变量解析有问题

## ✅ 推荐解决方案：绕过Information Extractor

### 步骤1：删除Information Extractor节点

1. 打开n8n界面：http://localhost:5678
2. 找到工作流ID：`FppT8sCsSxcUnNnj`
3. 选中 "Information Extractor" 节点
4. 按 `Delete` 键删除该节点

### 步骤2：重新连接节点

1. 将 "Code" 节点直接连接到 "Supabase" 节点
2. 确保连接线正确：Webhook → Code → Supabase

### 步骤3：更新Code节点代码

复制以下代码到Code节点：

```javascript
// n8n Code节点 - 直连Supabase最终版

// 获取webhook数据
const webhookData = $('Webhook').first().json;

// 提取考试信息
const examInfo = {
  examTitle: webhookData.body?.examTitle || webhookData.examTitle || '未知考试',
  examType: webhookData.body?.examType || webhookData.examType || '月考',
  examDate: webhookData.body?.examDate || webhookData.examDate || new Date().toISOString().split('T')[0],
  examScope: webhookData.body?.examScope || webhookData.examScope || 'class'
};

console.log('📊 考试信息:', examInfo);

// 获取文件数据
let fileData = null;
if (webhookData.body?.file) {
  fileData = webhookData.body.file;
} else if (webhookData.file) {
  fileData = webhookData.file;
}

if (!fileData) {
  console.log('❌ 未找到文件数据');
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
  
  console.log('📄 文件内容长度:', csvContent.length);
  
  // 解析CSV
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('文件内容不足');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('📋 表头:', headers);
  
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
            record.chinese = parseFloat(value) || 0;
            break;
          case '数学':
            record.math = parseFloat(value) || 0;
            break;
          case '英语':
            record.english = parseFloat(value) || 0;
            break;
          case '物理':
            record.physics = parseFloat(value) || 0;
            break;
          case '化学':
            record.chemistry = parseFloat(value) || 0;
            break;
          case '总分':
            record.total_score = parseFloat(value) || 0;
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

### 步骤4：保存并测试

1. 点击 "Save" 保存工作流
2. 使用测试文件验证功能

## 🧪 验证测试

运行以下命令测试：

```bash
node test-information-extractor-fix.mjs
```

## 🎯 预期结果

- ✅ 不再出现 "Text for item 0 is not defined" 错误
- ✅ 文件数据正确解析并存储到Supabase
- ✅ 工作流运行稳定

## 💡 为什么这个方案有效？

1. **简化架构**：去掉了有问题的Information Extractor节点
2. **直接处理**：Code节点直接输出Supabase需要的格式
3. **减少依赖**：避免了复杂的AI文本处理步骤
4. **提高稳定性**：减少了出错的环节

## 🔄 如果仍需要AI分析

如果你确实需要AI文本分析功能，可以：
1. 在前端应用中调用AI服务
2. 使用Supabase Edge Functions处理AI分析
3. 将AI分析作为独立的后处理步骤

这样可以保持文件上传的稳定性，同时满足AI分析需求。 