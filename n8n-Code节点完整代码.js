// n8n Code节点完整代码 - 直接处理Excel/CSV文件上传
// 删除Convert to File节点，直接在这里处理所有逻辑

const items = $input.all();

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

for (const item of items) {
  try {
    console.log('处理项目:', JSON.stringify(item, null, 2));
    
    // 尝试获取文件数据 - 多种可能的字段名
    let fileData = null;
    let fileName = '';
    let mimeType = '';
    
    // 方法1: 从binary数据获取
    if (item.binary && item.binary.data) {
      fileData = Buffer.from(item.binary.data.data, 'base64');
      fileName = item.binary.data.fileName || 'unknown';
      mimeType = item.binary.data.mimeType || '';
      console.log('从binary获取文件:', fileName, mimeType);
    }
    // 方法2: 从json.body获取
    else if (item.json.body && item.json.body.file) {
      const fileInfo = item.json.body.file;
      if (typeof fileInfo === 'string') {
        fileData = Buffer.from(fileInfo, 'base64');
      } else if (fileInfo.data) {
        fileData = Buffer.from(fileInfo.data, 'base64');
        fileName = fileInfo.name || fileInfo.filename || 'unknown';
        mimeType = fileInfo.type || fileInfo.mimetype || '';
      }
      console.log('从body.file获取文件:', fileName, mimeType);
    }
    // 方法3: 从json直接获取
    else if (item.json.file) {
      const fileInfo = item.json.file;
      if (typeof fileInfo === 'string') {
        fileData = Buffer.from(fileInfo, 'base64');
      } else if (fileInfo.data) {
        fileData = Buffer.from(fileInfo.data, 'base64');
        fileName = fileInfo.name || fileInfo.filename || 'unknown';
        mimeType = fileInfo.type || fileInfo.mimetype || '';
      }
      console.log('从json.file获取文件:', fileName, mimeType);
    }
    // 方法4: 从其他可能的字段获取
    else if (item.json.data) {
      fileData = Buffer.from(item.json.data, 'base64');
      console.log('从json.data获取文件');
    }
    
    if (!fileData) {
      throw new Error('未找到文件数据。可能的字段: binary.data, json.body.file, json.file, json.data');
    }
    
    console.log('文件大小:', fileData.length, 'bytes');
    
    // 解析文件内容
    let parsedData = [];
    
    // 判断文件类型并解析
    if (mimeType.includes('spreadsheet') || fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      // Excel文件处理
      console.log('处理Excel文件');
      try {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(fileData, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Excel解析成功，行数:', parsedData.length);
      } catch (xlsxError) {
        console.log('XLSX模块不可用，尝试简单解析');
        // 如果XLSX不可用，返回错误信息
        throw new Error('Excel文件需要XLSX模块支持，请使用CSV格式或联系管理员安装依赖');
      }
    } else {
      // CSV文件处理
      console.log('处理CSV文件');
      const csvContent = fileData.toString('utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      parsedData = lines.map(line => {
        // 简单CSV解析（处理逗号分隔）
        const cells = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());
        return cells;
      });
      console.log('CSV解析成功，行数:', parsedData.length);
    }
    
    if (parsedData.length === 0) {
      throw new Error('文件内容为空或解析失败');
    }
    
    // 数据处理和转换
    const headers = parsedData[0];
    const dataRows = parsedData.slice(1);
    
    console.log('表头:', headers);
    console.log('数据行数:', dataRows.length);
    
    // 字段映射 - 智能识别列名
    const fieldMapping = {};
    headers.forEach((header, index) => {
      const headerLower = header.toString().toLowerCase();
      if (headerLower.includes('学号') || headerLower.includes('id') || headerLower.includes('student')) {
        fieldMapping.studentId = index;
      } else if (headerLower.includes('姓名') || headerLower.includes('name')) {
        fieldMapping.name = index;
      } else if (headerLower.includes('班级') || headerLower.includes('class')) {
        fieldMapping.class = index;
      } else if (headerLower.includes('语文') || headerLower.includes('chinese')) {
        fieldMapping.chinese = index;
      } else if (headerLower.includes('数学') || headerLower.includes('math')) {
        fieldMapping.math = index;
      } else if (headerLower.includes('英语') || headerLower.includes('english')) {
        fieldMapping.english = index;
      } else if (headerLower.includes('物理') || headerLower.includes('physics')) {
        fieldMapping.physics = index;
      } else if (headerLower.includes('化学') || headerLower.includes('chemistry')) {
        fieldMapping.chemistry = index;
      } else if (headerLower.includes('总分') || headerLower.includes('total')) {
        fieldMapping.total = index;
      }
    });
    
    console.log('字段映射:', fieldMapping);
    
    // 转换数据格式
    const processedData = [];
    
    for (const row of dataRows) {
      if (row.length === 0 || !row[fieldMapping.studentId]) continue;
      
      const studentId = row[fieldMapping.studentId]?.toString().trim();
      const name = row[fieldMapping.name]?.toString().trim();
      const className = row[fieldMapping.class]?.toString().trim();
      
      if (!studentId || !name) {
        console.log('跳过无效行:', row);
        continue;
      }
      
      // 基础学生信息
      const baseRecord = {
        student_id: studentId,
        name: name,
        class: className || '',
        exam_title: examInfo.examTitle,
        exam_type: examInfo.examType,
        exam_date: examInfo.examDate,
        exam_scope: examInfo.examScope,
        created_at: new Date().toISOString()
      };
      
      // 添加各科成绩
      const subjects = ['chinese', 'math', 'english', 'physics', 'chemistry'];
      const subjectNames = ['语文', '数学', '英语', '物理', '化学'];
      
      subjects.forEach((subject, index) => {
        if (fieldMapping[subject] !== undefined) {
          const score = parseFloat(row[fieldMapping[subject]]) || 0;
          processedData.push({
            ...baseRecord,
            subject: subjectNames[index],
            score: score,
            full_score: 100, // 默认满分100
            grade_id: `${studentId}_${examInfo.examTitle}_${subjectNames[index]}`
          });
        }
      });
      
      // 添加总分
      if (fieldMapping.total !== undefined) {
        const totalScore = parseFloat(row[fieldMapping.total]) || 0;
        processedData.push({
          ...baseRecord,
          subject: '总分',
          score: totalScore,
          full_score: 500, // 默认总分500
          grade_id: `${studentId}_${examInfo.examTitle}_总分`
        });
      }
    }
    
    console.log('处理后的数据条数:', processedData.length);
    
    // 数据去重（基于grade_id）
    const uniqueData = [];
    const seenIds = new Set();
    
    for (const record of processedData) {
      if (!seenIds.has(record.grade_id)) {
        seenIds.add(record.grade_id);
        uniqueData.push(record);
      }
    }
    
    console.log('去重后的数据条数:', uniqueData.length);
    
    // 添加到结果
    results.push(...uniqueData.map(record => ({ json: record })));
    
    totalProcessed += dataRows.length;
    successCount += uniqueData.length;
    
  } catch (error) {
    console.error('处理错误:', error.message);
    errorCount++;
    errors.push(error.message);
  }
}

// 添加统计信息
const summary = {
  json: {
    summary: {
      totalProcessed,
      successCount,
      errorCount,
      errors,
      examInfo,
      timestamp: new Date().toISOString()
    }
  }
};

results.unshift(summary);

console.log('最终结果:', {
  totalItems: results.length,
  summary: summary.json.summary
});

return results; 