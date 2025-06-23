# n8n智能文件处理完整方案

## 🎯 设计理念
- **用户友好**：教师无需转换文件格式，直接上传Excel或CSV
- **智能处理**：自动识别格式并选择合适的处理路径
- **数据去重**：处理重复数据和合并同类项
- **错误恢复**：提供详细的错误信息和处理建议

## 🏗️ 多路径工作流设计

### 方案1: 分支处理架构
```
Webhook (文件上传)
    ↓
文件格式检测节点
    ↓
   分支处理
  ↙        ↘
CSV路径    Excel路径
  ↓          ↓
CSV解析    Excel解析
  ↓          ↓
   数据合并节点
      ↓
   数据去重处理
      ↓
   保存到Supabase
```

### 方案2: 统一智能处理（推荐）
```
Webhook → 智能文件处理节点 → 数据去重节点 → Supabase
```

## 🔧 智能文件处理代码

### 核心处理逻辑
```javascript
// 智能文件处理 - 支持CSV、Excel、数据去重
const items = [];
const duplicateTracker = new Map(); // 用于去重

try {
  const inputData = $input.first();
  let fileContent = '';
  let fileName = '';
  let fileExtension = '';
  
  // 获取文件信息
  if (inputData.binary && inputData.binary.fileName) {
    fileName = inputData.binary.fileName;
    fileExtension = fileName.split('.').pop().toLowerCase();
    
    // 处理二进制文件数据
    const fileBuffer = Buffer.from(inputData.binary.data, 'base64');
    
    if (fileExtension === 'csv' || fileExtension === 'txt') {
      // CSV文件处理
      fileContent = fileBuffer.toString('utf8');
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Excel文件处理 - 使用简单的解析方法
      fileContent = await parseExcelToCSV(fileBuffer, fileExtension);
    } else {
      // 尝试按文本文件处理
      fileContent = fileBuffer.toString('utf8');
    }
  } else if (inputData.json && inputData.json.data) {
    // 处理JSON格式的文件数据
    fileContent = inputData.json.data;
    fileName = inputData.json.filename || 'unknown.csv';
    fileExtension = fileName.split('.').pop().toLowerCase();
  }
  
  console.log(`处理文件: ${fileName} (${fileExtension})`);
  
  // 解析CSV数据
  const parsedData = parseCSVContent(fileContent);
  
  // 数据验证和处理
  const processedData = processGradeData(parsedData, fileName);
  
  // 数据去重处理
  const deduplicatedData = deduplicateData(processedData);
  
  return deduplicatedData;
  
} catch (error) {
  console.error('文件处理错误:', error);
  return [{
    error: true,
    message: error.message,
    error_type: 'file_processing_error',
    timestamp: new Date().toISOString()
  }];
}

// Excel解析函数（简化版）
async function parseExcelToCSV(buffer, extension) {
  try {
    // 由于n8n环境限制，我们使用基础的XML解析方法处理xlsx
    if (extension === 'xlsx') {
      // 简化的xlsx处理 - 提取共享字符串和工作表数据
      const content = buffer.toString('utf8');
      
      // 这里需要实现基础的xlsx解析
      // 由于复杂性，我们先返回提示信息
      throw new Error('Excel文件处理需要专门的解析器，请使用CSV格式或联系管理员');
    } else {
      // xls格式更复杂，建议转换
      throw new Error('请将.xls文件另存为.xlsx或.csv格式后重新上传');
    }
  } catch (error) {
    throw new Error(`Excel文件解析失败: ${error.message}`);
  }
}

// CSV内容解析
function parseCSVContent(content) {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('文件内容不足，至少需要标题行和一行数据');
  }
  
  // 智能分隔符检测
  const delimiter = detectDelimiter(lines[0]);
  
  // 解析标题行
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''));
  
  // 验证必要列
  const requiredColumns = ['学号', '姓名'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`缺少必要的列: ${missingColumns.join(', ')}`);
  }
  
  // 解析数据行
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
    
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      if (row.学号 && row.姓名) {
        rows.push(row);
      }
    }
  }
  
  return { headers, rows };
}

// 智能分隔符检测
function detectDelimiter(line) {
  const delimiters = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const delimiter of delimiters) {
    const count = (line.match(new RegExp('\\' + delimiter, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

// 成绩数据处理
function processGradeData(parsedData, fileName) {
  const { rows } = parsedData;
  const items = [];
  
  // 获取当前时间作为导入批次标识
  const importBatch = new Date().toISOString();
  
  for (const row of rows) {
    const baseRecord = {
      student_id: String(row.学号).trim(),
      name: String(row.姓名).trim(),
      class_name: String(row.班级 || '').trim(),
      exam_title: extractExamTitle(fileName),
      exam_type: "月考",
      exam_date: new Date().toISOString().split('T')[0],
      source_file: fileName,
      import_batch: importBatch
    };
    
    // 处理各科成绩
    const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
    
    for (const subject of subjects) {
      if (row[subject] && row[subject] !== '') {
        const score = parseFloat(row[subject]);
        if (!isNaN(score) && score >= 0 && score <= 150) {
          items.push({
            ...baseRecord,
            subject: subject,
            score: score,
            record_key: `${baseRecord.student_id}_${subject}_${baseRecord.exam_title}` // 用于去重
          });
        }
      }
    }
    
    // 处理总分
    if (row.总分 && row.总分 !== '') {
      const totalScore = parseFloat(row.总分);
      if (!isNaN(totalScore) && totalScore >= 0) {
        items.push({
          ...baseRecord,
          subject: '总分',
          score: totalScore,
          record_key: `${baseRecord.student_id}_总分_${baseRecord.exam_title}`
        });
      }
    }
  }
  
  return items;
}

// 提取考试标题
function extractExamTitle(fileName) {
  // 从文件名中智能提取考试信息
  const name = fileName.replace(/\.(csv|xlsx|xls)$/i, '');
  
  // 常见的考试类型匹配
  if (name.includes('月考')) return name;
  if (name.includes('期中')) return name.replace(/期中/, '期中考试');
  if (name.includes('期末')) return name.replace(/期末/, '期末考试');
  if (name.includes('模拟')) return name.replace(/模拟/, '模拟考试');
  
  return name || '未命名考试';
}

// 数据去重处理
function deduplicateData(items) {
  const uniqueItems = [];
  const duplicateMap = new Map();
  const duplicateStats = {
    total_input: items.length,
    duplicates_found: 0,
    unique_records: 0,
    merge_actions: []
  };
  
  for (const item of items) {
    const key = item.record_key;
    
    if (duplicateMap.has(key)) {
      // 发现重复数据
      const existing = duplicateMap.get(key);
      duplicateStats.duplicates_found++;
      
      // 合并策略：保留最新的分数，或者分数更高的
      if (item.score !== existing.score) {
        duplicateStats.merge_actions.push({
          student_id: item.student_id,
          subject: item.subject,
          old_score: existing.score,
          new_score: item.score,
          action: item.score > existing.score ? 'keep_higher' : 'keep_latest'
        });
        
        // 选择保留哪个分数（这里选择保留更高的分数）
        if (item.score > existing.score) {
          duplicateMap.set(key, item);
        }
      }
    } else {
      // 新记录
      duplicateMap.set(key, item);
      duplicateStats.unique_records++;
    }
  }
  
  // 转换为数组
  for (const [key, item] of duplicateMap) {
    // 移除临时的record_key字段
    delete item.record_key;
    uniqueItems.push(item);
  }
  
  // 添加处理统计信息到第一条记录
  if (uniqueItems.length > 0) {
    uniqueItems[0].processing_stats = duplicateStats;
  }
  
  console.log(`去重完成: 输入${duplicateStats.total_input}条，输出${uniqueItems.length}条，发现${duplicateStats.duplicates_found}条重复`);
  
  return uniqueItems;
}
```

## 🔄 Excel文件处理的替代方案

### 方案A: 使用Google Sheets节点
1. 用户上传Excel文件
2. 自动上传到Google Sheets
3. 从Google Sheets读取数据
4. 处理并保存到Supabase

### 方案B: 使用Microsoft Excel 365节点
1. 连接到用户的OneDrive
2. 上传Excel文件到OneDrive
3. 使用Excel 365 API读取数据
4. 处理并保存

### 方案C: 文件转换服务
1. 集成在线文件转换API
2. Excel自动转换为CSV
3. 按CSV流程处理

## 📋 推荐实施步骤

### 第一阶段：基础功能
1. 实现智能CSV处理和去重
2. 添加详细的错误处理和用户提示
3. 测试数据验证和合并逻辑

### 第二阶段：Excel支持
1. 选择一种Excel处理方案实施
2. 添加文件格式自动检测
3. 实现无缝的用户体验

### 第三阶段：高级功能
1. 批量文件处理
2. 历史数据对比
3. 智能数据修复建议

## 🧪 测试用例

### 数据去重测试
- 同一学生同一科目多次成绩
- 不同批次导入相同数据
- 分数更新场景

### 文件格式测试
- 标准CSV文件
- 不同编码的CSV文件
- Excel文件（如果支持）
- 格式错误的文件

### 边界情况测试
- 空文件
- 只有标题行的文件
- 缺少必要列的文件
- 特殊字符和中文处理 