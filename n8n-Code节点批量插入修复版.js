// n8n Code节点批量插入修复版 - 解决HTTP Request多items问题
// 返回单个包含所有记录的数组，用于Supabase批量插入

// 获取webhook数据
const webhookData = $('Webhook').first().json;

// 提取考试信息
const examInfo = {
  examTitle: webhookData.body?.examTitle || webhookData.examTitle || '期中考试',
  examType: webhookData.body?.examType || webhookData.examType || '期中考试',
  examDate: webhookData.body?.examDate || webhookData.examDate || '2024-06-16',
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
  console.error('❌ 未找到文件数据');
  return [{
    json: {
      error: '未找到文件数据',
      exam_info: examInfo,
      records: []
    }
  }];
}

try {
  // 解码文件数据
  const buffer = Buffer.from(fileData, 'base64');
  const csvContent = buffer.toString('utf-8');
  
  console.log('📄 CSV内容长度:', csvContent.length);
  
  // 解析CSV
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  console.log('📋 CSV表头:', headers);
  console.log('📊 数据行数:', lines.length - 1);
  
  const records = [];
  
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
          case '生物':
            record.biology = parseFloat(value) || null;
            break;
          case '政治':
            record.politics = parseFloat(value) || null;
            break;
          case '历史':
            record.history = parseFloat(value) || null;
            break;
          case '地理':
            record.geography = parseFloat(value) || null;
            break;
          case '总分':
            record.total_score = parseFloat(value) || null;
            break;
          default:
            // 处理自定义字段
            record[`custom_${header}`] = value;
        }
      }
    });
    
    // 验证必要字段
    if (record.student_id && record.name) {
      records.push(record);
    }
  }
  
  console.log('✅ 解析完成，共', records.length, '条有效记录');
  
  // 🎯 关键修复：返回单个item，包含所有记录的数组
  // 这样HTTP Request节点就可以正确处理批量插入
  return [{
    json: records  // 直接返回记录数组，供HTTP Request节点使用
  }];
  
} catch (error) {
  console.error('❌ 处理失败:', error);
  return [{
    json: {
      error: error.message,
      stack: error.stack,
      exam_info: examInfo,
      records: []
    }
  }];
} 