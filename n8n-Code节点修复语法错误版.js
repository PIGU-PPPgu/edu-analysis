// n8n Code节点完整代码 - 修复语法错误版本
// 解决重复声明items变量的问题

// 从webhook获取考试信息
const webhookData = $('Webhook').first().json;
const examInfo = {
  examTitle: webhookData.body?.examTitle || webhookData.examTitle || '未知考试',
  examType: webhookData.body?.examType || webhookData.examType || '月考',
  examDate: webhookData.body?.examDate || webhookData.examDate || new Date().toISOString().split('T')[0],
  examScope: webhookData.body?.examScope || webhookData.examScope || 'class',
  mergeStrategy: webhookData.body?.mergeStrategy || webhookData.mergeStrategy || 'replace'
};

console.log('考试信息:', examInfo);
console.log('Webhook数据结构:', JSON.stringify(webhookData, null, 2));

// 处理结果
const results = [];
let totalProcessed = 0;
let successCount = 0;
let errorCount = 0;
const errors = [];
let allProcessedData = []; // 存储所有处理后的数据

// 获取输入数据
const inputItems = $input.all();

for (const item of inputItems) {
  try {
    console.log('处理项目:', JSON.stringify(item, null, 2));
    
    // 多源文件检测
    let fileData = null;
    let fileName = '';
    
    // 检查各种可能的文件数据源
    if (item.binary && item.binary.data) {
      fileData = item.binary.data.data;
      fileName = item.binary.data.fileName || 'unknown.xlsx';
      console.log('从binary.data获取文件');
    } else if (item.json && item.json.body && item.json.body.file) {
      fileData = item.json.body.file;
      fileName = item.json.body.fileName || 'unknown.xlsx';
      console.log('从json.body.file获取文件');
    } else if (item.json && item.json.file) {
      fileData = item.json.file;
      fileName = item.json.fileName || 'unknown.xlsx';
      console.log('从json.file获取文件');
    } else if (item.json && item.json.data) {
      fileData = item.json.data;
      fileName = item.json.fileName || 'unknown.xlsx';
      console.log('从json.data获取文件');
    } else if (webhookData.body && webhookData.body.file) {
      fileData = webhookData.body.file;
      fileName = webhookData.body.fileName || 'unknown.xlsx';
      console.log('从webhook.body.file获取文件');
    } else if (webhookData.file) {
      fileData = webhookData.file;
      fileName = webhookData.fileName || 'unknown.xlsx';
      console.log('从webhook.file获取文件');
    }
    
    if (!fileData) {
      console.log('未找到文件数据，跳过此项目');
      continue;
    }
    
    console.log('文件名:', fileName);
    console.log('文件数据长度:', fileData.length);
    
    // 解码base64数据
    let buffer;
    try {
      buffer = Buffer.from(fileData, 'base64');
      console.log('成功解码base64数据，缓冲区大小:', buffer.length);
    } catch (error) {
      console.error('base64解码失败:', error);
      errors.push(`base64解码失败: ${error.message}`);
      errorCount++;
      continue;
    }
    
    let data = [];
    
    // 根据文件类型处理
    if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      // Excel文件处理
      try {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Excel解析成功，行数:', data.length);
      } catch (error) {
        console.error('Excel解析失败:', error);
        errors.push(`Excel解析失败: ${error.message}`);
        errorCount++;
        continue;
      }
    } else {
      // CSV文件处理
      try {
        const csvContent = buffer.toString('utf-8');
        data = csvContent.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        console.log('CSV解析成功，行数:', data.length);
      } catch (error) {
        console.error('CSV解析失败:', error);
        errors.push(`CSV解析失败: ${error.message}`);
        errorCount++;
        continue;
      }
    }
    
    if (data.length === 0) {
      console.log('文件为空，跳过');
      continue;
    }
    
    // 获取表头
    const headers = data[0];
    console.log('表头:', headers);
    
    // 智能字段映射
    const fieldMapping = {
      '学号': 'student_id',
      '姓名': 'name',
      '班级': 'class_name',
      '语文': 'chinese',
      '数学': 'math',
      '英语': 'english',
      '物理': 'physics',
      '化学': 'chemistry',
      '政治': 'politics',
      '历史': 'history',
      '生物': 'biology',
      '地理': 'geography',
      '总分': 'total_score',
      '排名': 'rank_in_class'
    };
    
    // 处理数据行
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length === 0 || !row[0]) continue; // 跳过空行
      
      totalProcessed++;
      
      try {
        const record = {
          exam_id: null, // 将在后续步骤中设置
          exam_title: examInfo.examTitle,
          exam_type: examInfo.examType,
          exam_date: examInfo.examDate,
          exam_scope: examInfo.examScope,
          merge_strategy: examInfo.mergeStrategy,
          created_at: new Date().toISOString()
        };
        
        // 映射字段
        headers.forEach((header, index) => {
          const value = row[index];
          if (value !== undefined && value !== '') {
            const mappedField = fieldMapping[header] || header;
            record[mappedField] = value;
          }
        });
        
        // 数据验证和清洗
        if (!record.student_id || !record.name) {
          console.log('跳过无效记录（缺少学号或姓名）:', record);
          continue;
        }
        
        // 生成唯一ID用于去重
        record.grade_id = `${record.student_id}_${examInfo.examTitle}_${examInfo.examDate}`;
        
        allProcessedData.push(record);
        successCount++;
        
      } catch (error) {
        console.error('处理行数据失败:', error);
        errors.push(`第${i+1}行处理失败: ${error.message}`);
        errorCount++;
      }
    }
    
  } catch (error) {
    console.error('处理项目失败:', error);
    errors.push(`项目处理失败: ${error.message}`);
    errorCount++;
  }
}

// 去重处理（基于grade_id）
const uniqueData = [];
const seenIds = new Set();

for (const record of allProcessedData) {
  if (!seenIds.has(record.grade_id)) {
    seenIds.add(record.grade_id);
    uniqueData.push(record);
  }
}

console.log(`去重前: ${allProcessedData.length} 条，去重后: ${uniqueData.length} 条`);

// 为Information Extractor准备文本格式的数据
const textForAI = `
考试数据处理结果：

考试信息：
- 考试标题：${examInfo.examTitle}
- 考试类型：${examInfo.examType}
- 考试日期：${examInfo.examDate}
- 考试范围：${examInfo.examScope}

处理统计：
- 总处理行数：${totalProcessed}
- 成功处理条数：${successCount}
- 错误数量：${errorCount}

成绩数据样本（前5条）：
${uniqueData.slice(0, 5).map(record => 
  `学号：${record.student_id}，姓名：${record.name}，班级：${record.class_name || '未知'}`
).join('\n')}

${errors.length > 0 ? `\n错误信息：\n${errors.join('\n')}` : ''}
`;

// 构造返回结果
const returnData = [];

// 第一个项目：文本数据（给Information Extractor）
returnData.push({
  json: {
    text: textForAI,
    summary: {
      examInfo: examInfo,
      totalProcessed: totalProcessed,
      successCount: successCount,
      errorCount: errorCount,
      uniqueRecords: uniqueData.length
    }
  }
});

// 后续项目：JSON数据（给Supabase存储）
uniqueData.forEach(record => {
  returnData.push({
    json: record
  });
});

console.log('最终返回数据项目数:', returnData.length);
console.log('第一个项目（文本）:', returnData[0]);
console.log('数据项目样本:', returnData.slice(1, 3));

return returnData; 