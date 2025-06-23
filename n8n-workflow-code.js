// n8n智能CSV解析和字段映射代码
// 支持完整的教育数据字段映射，包括成绩、等级、排名等

// 获取输入数据
const csvData = $input.first().json.body;
console.log('接收到的CSV数据:', csvData);

// 完整的字段映射配置
const fieldMapping = {
  // 基础信息字段
  '学号': 'student_id',
  '姓名': 'name',
  '班级': 'class_name',
  '年级': 'grade',
  '性别': 'gender',
  
  // 科目成绩字段
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
  
  // 科目等级字段
  '语文等级': 'chinese_grade',
  '数学等级': 'math_grade',
  '英语等级': 'english_grade',
  '物理等级': 'physics_grade',
  '化学等级': 'chemistry_grade',
  '政治等级': 'politics_grade',
  '历史等级': 'history_grade',
  '生物等级': 'biology_grade',
  '地理等级': 'geography_grade',
  '体育等级': 'pe_grade',
  '音乐等级': 'music_grade',
  '美术等级': 'art_grade',
  '信息技术等级': 'it_grade',
  '通用技术等级': 'general_tech_grade',
  
  // 科目班级排名字段
  '语文班级排名': 'chinese_class_rank',
  '数学班级排名': 'math_class_rank',
  '英语班级排名': 'english_class_rank',
  '物理班级排名': 'physics_class_rank',
  '化学班级排名': 'chemistry_class_rank',
  '政治班级排名': 'politics_class_rank',
  '历史班级排名': 'history_class_rank',
  '生物班级排名': 'biology_class_rank',
  '地理班级排名': 'geography_class_rank',
  '体育班级排名': 'pe_class_rank',
  '音乐班级排名': 'music_class_rank',
  '美术班级排名': 'art_class_rank',
  '信息技术班级排名': 'it_class_rank',
  '通用技术班级排名': 'general_tech_class_rank',
  
  // 科目年级排名字段
  '语文年级排名': 'chinese_grade_rank',
  '数学年级排名': 'math_grade_rank',
  '英语年级排名': 'english_grade_rank',
  '物理年级排名': 'physics_grade_rank',
  '化学年级排名': 'chemistry_grade_rank',
  '政治年级排名': 'politics_grade_rank',
  '历史年级排名': 'history_grade_rank',
  '生物年级排名': 'biology_grade_rank',
  '地理年级排名': 'geography_grade_rank',
  '体育年级排名': 'pe_grade_rank',
  '音乐年级排名': 'music_grade_rank',
  '美术年级排名': 'art_grade_rank',
  '信息技术年级排名': 'it_grade_rank',
  '通用技术年级排名': 'general_tech_grade_rank',
  
  // 统计字段
  '总分': 'total_score',
  '平均分': 'average_score',
  '班级排名': 'rank_in_class',
  '年级排名': 'rank_in_grade',
  '校内排名': 'rank_in_school',
  '总分等级': 'total_grade',
  
  // 考试信息字段
  '考试名称': 'exam_title',
  '考试类型': 'exam_type',
  '考试日期': 'exam_date',
  '考试范围': 'exam_scope'
};

// 数据验证规则
const validationRules = {
  required: ['student_id', 'name'],
  scoreFields: [
    'chinese', 'math', 'english', 'physics', 'chemistry', 
    'politics', 'history', 'biology', 'geography', 'pe', 
    'music', 'art', 'it', 'general_tech', 'total_score', 'average_score'
  ],
  gradeValues: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E'],
  scoreRange: { min: 0, max: 150 },
  rankRange: { min: 1, max: 1000 }
};

// 解析CSV数据函数
function parseCSV(csvText) {
  try {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV数据为空');
    }
    
    // 解析表头
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('检测到的表头:', headers);
    
    const processedData = [];
    
    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const record = {};
      
      // 字段映射和数据处理
      headers.forEach((header, index) => {
        const cleanHeader = header.trim();
        const mappedField = fieldMapping[cleanHeader] || cleanHeader.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const value = values[index]?.trim() || '';
        
        // 数据类型转换
        if (value !== '') {
          // 分数字段处理
          if (validationRules.scoreFields.includes(mappedField)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              record[mappedField] = numValue;
            } else {
              record[mappedField] = value; // 保留原始值用于调试
            }
          }
          // 排名字段处理
          else if (mappedField.includes('rank') || mappedField.includes('排名')) {
            const rankValue = parseInt(value);
            if (!isNaN(rankValue)) {
              record[mappedField] = rankValue;
            } else {
              record[mappedField] = value;
            }
          }
          // 等级字段处理
          else if (mappedField.includes('grade') && mappedField !== 'grade') {
            record[mappedField] = value.toUpperCase();
          }
          // 其他字段
          else {
            record[mappedField] = value;
          }
        }
      });
      
      // 数据验证
      const validation = validateRecord(record, i + 1);
      if (validation.isValid) {
        processedData.push(record);
      } else {
        console.log(`第${i + 1}行数据验证失败:`, validation.errors);
        // 即使验证失败也保留数据，但标记错误
        record._validation_errors = validation.errors;
        processedData.push(record);
      }
    }
    
    return processedData;
  } catch (error) {
    console.error('CSV解析错误:', error);
    throw error;
  }
}

// 数据验证函数
function validateRecord(record, rowNumber) {
  const errors = [];
  
  // 必填字段检查
  validationRules.required.forEach(field => {
    if (!record[field] || record[field].toString().trim() === '') {
      errors.push(`${field}字段不能为空`);
    }
  });
  
  // 分数范围检查
  validationRules.scoreFields.forEach(field => {
    if (record[field] !== undefined && record[field] !== '') {
      const score = parseFloat(record[field]);
      if (!isNaN(score)) {
        if (score < validationRules.scoreRange.min || score > validationRules.scoreRange.max) {
          errors.push(`${field}分数超出合理范围(${validationRules.scoreRange.min}-${validationRules.scoreRange.max})`);
        }
      }
    }
  });
  
  // 等级值检查
  Object.keys(record).forEach(field => {
    if (field.includes('grade') && field !== 'grade' && record[field]) {
      const gradeValue = record[field].toString().toUpperCase();
      if (!validationRules.gradeValues.includes(gradeValue)) {
        errors.push(`${field}等级值无效: ${gradeValue}`);
      }
    }
  });
  
  // 排名范围检查
  Object.keys(record).forEach(field => {
    if (field.includes('rank') && record[field]) {
      const rankValue = parseInt(record[field]);
      if (!isNaN(rankValue)) {
        if (rankValue < validationRules.rankRange.min || rankValue > validationRules.rankRange.max) {
          errors.push(`${field}排名超出合理范围(${validationRules.rankRange.min}-${validationRules.rankRange.max})`);
        }
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 主处理逻辑
try {
  console.log('开始处理CSV数据...');
  
  // 解析CSV数据
  const processedData = parseCSV(csvData);
  
  console.log(`成功处理 ${processedData.length} 条记录`);
  console.log('处理结果示例:', processedData.slice(0, 2));
  
  // 统计信息
  const stats = {
    totalRecords: processedData.length,
    validRecords: processedData.filter(r => !r._validation_errors).length,
    errorRecords: processedData.filter(r => r._validation_errors).length,
    fieldMapping: fieldMapping,
    timestamp: new Date().toISOString()
  };
  
  console.log('处理统计:', stats);
  
  // 返回处理结果
  return {
    processedData: processedData,
    stats: stats,
    success: true
  };
  
} catch (error) {
  console.error('数据处理失败:', error);
  
  return {
    processedData: [],
    stats: {
      totalRecords: 0,
      validRecords: 0,
      errorRecords: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    },
    success: false,
    error: error.message
  };
} 