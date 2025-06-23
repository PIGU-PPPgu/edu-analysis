// n8n Code节点直连Supabase版 - 跳过Information Extractor

// 获取webhook数据
const webhookData = $('Webhook').first().json;
const examInfo = {
  examTitle: webhookData.body?.examTitle || webhookData.examTitle || '未知考试',
  examType: webhookData.body?.examType || webhookData.examType || '月考',
  examDate: webhookData.body?.examDate || webhookData.examDate || new Date().toISOString().split('T')[0],
  examScope: webhookData.body?.examScope || webhookData.examScope || 'class'
};

console.log('考试信息:', examInfo);

// 获取输入数据
const inputData = $input.all();
const results = [];

for (const dataItem of inputData) {
  try {
    // 检查文件数据
    let fileData = null;
    
    if (dataItem.binary?.data?.data) {
      fileData = dataItem.binary.data.data;
    } else if (dataItem.json?.body?.file) {
      fileData = dataItem.json.body.file;
    } else if (dataItem.json?.file) {
      fileData = dataItem.json.file;
    } else if (webhookData.body?.file) {
      fileData = webhookData.body.file;
    } else if (webhookData.file) {
      fileData = webhookData.file;
    }
    
    if (!fileData) {
      console.log('未找到文件数据');
      continue;
    }
    
    // 解码文件数据
    const buffer = Buffer.from(fileData, 'base64');
    const csvContent = buffer.toString('utf-8');
    
    // 简单CSV解析
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('表头:', headers);
    
    // 处理数据行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      if (values.length === 0) continue;
      
      // 构造记录
      const record = {
        exam_title: examInfo.examTitle,
        exam_type: examInfo.examType,
        exam_date: examInfo.examDate,
        exam_scope: examInfo.examScope,
        created_at: new Date().toISOString()
      };
      
      // 映射字段
      headers.forEach((header, index) => {
        const value = values[index];
        if (value && value !== '') {
          // 简单字段映射
          if (header === '学号') record.student_id = value;
          else if (header === '姓名') record.name = value;
          else if (header === '班级') record.class_name = value;
          else if (header === '语文') record.chinese = parseFloat(value) || 0;
          else if (header === '数学') record.math = parseFloat(value) || 0;
          else if (header === '英语') record.english = parseFloat(value) || 0;
          else if (header === '物理') record.physics = parseFloat(value) || 0;
          else if (header === '化学') record.chemistry = parseFloat(value) || 0;
          else if (header === '总分') record.total_score = parseFloat(value) || 0;
          else record[header] = value;
        }
      });
      
      // 验证必要字段
      if (record.student_id && record.name) {
        results.push({ json: record });
      }
    }
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

console.log('处理完成，共', results.length, '条记录');

// 如果没有数据，返回一个状态记录
if (results.length === 0) {
  results.push({
    json: {
      status: 'no_data',
      message: '未找到有效数据',
      exam_info: examInfo
    }
  });
}

return results; 