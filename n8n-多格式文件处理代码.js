// 多格式文件处理代码 - 支持CSV、Excel等格式
const items = [];

try {
  // 获取文件数据
  const inputData = $input.first();
  let fileContent = '';
  let fileName = '';
  let fileExtension = '';
  
  // 尝试获取文件名和扩展名
  if (inputData.json && inputData.json.filename) {
    fileName = inputData.json.filename;
    fileExtension = fileName.split('.').pop().toLowerCase();
  } else if (inputData.binary && inputData.binary.fileName) {
    fileName = inputData.binary.fileName;
    fileExtension = fileName.split('.').pop().toLowerCase();
  }
  
  // 获取文件内容
  if (inputData.json && inputData.json.data) {
    fileContent = inputData.json.data;
  } else if (inputData.binary && inputData.binary.data) {
    fileContent = Buffer.from(inputData.binary.data, 'base64').toString('utf8');
  } else {
    throw new Error('无法获取文件内容');
  }
  
  console.log(`处理文件: ${fileName}, 扩展名: ${fileExtension}`);
  
  let csvData = '';
  
  // 根据文件扩展名处理不同格式
  if (fileExtension === 'csv' || fileExtension === 'txt') {
    // CSV文件直接处理
    csvData = fileContent;
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    // Excel文件需要特殊处理
    // 由于n8n环境限制，我们返回错误提示用户转换格式
    return [{
      error: true,
      message: `检测到Excel文件格式 (.${fileExtension})`,
      suggestion: '请将Excel文件另存为CSV格式后重新上传',
      supported_formats: ['csv', 'txt'],
      received_format: fileExtension,
      filename: fileName
    }];
  } else {
    // 未知格式，尝试按CSV处理
    console.log(`未知文件格式 .${fileExtension}，尝试按CSV处理`);
    csvData = fileContent;
  }
  
  // 解析CSV数据
  if (!csvData || csvData.trim() === '') {
    throw new Error('文件内容为空');
  }
  
  // 处理CSV内容
  const lines = csvData.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV文件格式不正确，至少需要标题行和一行数据');
  }
  
  // 解析标题行
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  console.log('检测到的列标题:', headers);
  
  // 验证必要的列是否存在
  const requiredColumns = ['学号', '姓名'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    return [{
      error: true,
      message: `缺少必要的列: ${missingColumns.join(', ')}`,
      detected_headers: headers,
      required_headers: requiredColumns,
      suggestion: '请确保CSV文件包含"学号"和"姓名"列'
    }];
  }
  
  // 处理数据行
  let processedRows = 0;
  let skippedRows = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    
    if (values.length < headers.length) {
      skippedRows++;
      continue;
    }
    
    // 创建行对象
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // 跳过空行
    if (!row.学号 || !row.姓名) {
      skippedRows++;
      continue;
    }
    
    // 基础记录信息
    const baseRecord = {
      student_id: String(row.学号).trim(),
      name: String(row.姓名).trim(),
      class_name: String(row.班级 || '').trim(),
      exam_title: "907九下月考成绩",
      exam_type: "月考",
      exam_date: "2025-01-22",
      source_file: fileName,
      import_time: new Date().toISOString()
    };
    
    // 处理各科成绩
    const subjects = ['语文', '数学', '英语', '物理', '化学', '政治', '历史', '生物', '地理'];
    let hasValidScore = false;
    
    for (const subject of subjects) {
      if (row[subject] && row[subject] !== '' && row[subject] !== null) {
        const score = parseFloat(row[subject]);
        if (!isNaN(score) && score >= 0 && score <= 150) { // 合理的分数范围
          items.push({
            ...baseRecord,
            subject: subject,
            score: score
          });
          hasValidScore = true;
        }
      }
    }
    
    // 处理总分
    if (row.总分 && row.总分 !== '' && row.总分 !== null) {
      const totalScore = parseFloat(row.总分);
      if (!isNaN(totalScore) && totalScore >= 0) {
        items.push({
          ...baseRecord,
          subject: '总分',
          score: totalScore
        });
        hasValidScore = true;
      }
    }
    
    if (hasValidScore) {
      processedRows++;
    } else {
      skippedRows++;
    }
  }
  
  // 返回处理结果
  if (items.length === 0) {
    return [{
      error: true,
      message: '没有解析到有效的成绩数据',
      statistics: {
        total_lines: lines.length - 1,
        processed_rows: processedRows,
        skipped_rows: skippedRows
      },
      suggestion: '请检查数据格式和分数是否有效'
    }];
  }
  
  // 添加处理统计信息到第一条记录
  if (items.length > 0) {
    items[0].processing_stats = {
      total_records: items.length,
      processed_rows: processedRows,
      skipped_rows: skippedRows,
      file_format: fileExtension,
      source_file: fileName
    };
  }
  
  console.log(`成功处理 ${processedRows} 行数据，跳过 ${skippedRows} 行，生成 ${items.length} 条记录`);
  
  return items;
  
} catch (error) {
  console.error('文件处理错误:', error);
  return [{
    error: true,
    message: error.message,
    error_type: 'processing_error',
    debug_info: {
      input_type: typeof $input.first(),
      input_keys: Object.keys($input.first() || {}),
      stack_trace: error.stack
    }
  }];
} 