const fs = require('fs');

console.log('🧪 测试完整的数据转换过程...\n');

// 读取CSV文件
const csvContent = fs.readFileSync('./907九下月考成绩.csv', 'utf8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

// 模拟handleFinalImportInDialog中的数据处理
function simulateDataProcessing() {
  console.log('📊 模拟handleFinalImportInDialog中的数据处理...');
  
  // 模拟confirmedMappings（字段映射）- 修复后的版本
  const confirmedMappings = {
    '姓名': 'name',
    '班级': 'class_name',
    // 注意：不再将分数字段映射到同一个字段
  };
  
  // 模拟examInfo
  const examInfo = {
    title: '907九下月考成绩',
    type: '月考',
    date: '2024-01-15',
    subject: ''
  };
  
  // 取第一个学生数据进行测试
  const sampleRow = lines[1].split(',');
  const rowData = {};
  headers.forEach((header, index) => {
    rowData[header.trim()] = sampleRow[index];
  });
  
  console.log('原始行数据:', {
    姓名: rowData['姓名'],
    班级: rowData['班级'],
    总分分数: rowData['总分分数'],
    语文分数: rowData['语文分数'],
    数学分数: rowData['数学分数']
  });
  
  // 模拟processedData的生成过程 - 修复后的版本
  const formattedRow = {};
  
  // 检查是否是宽表格式
  const scoreFields = Object.keys(rowData).filter(key => key.includes('分数'));
  const isWideFormat = scoreFields.length > 1;
  
  console.log(`检测到${scoreFields.length}个分数字段，${isWideFormat ? '宽表' : '长表'}格式`);
  
  if (isWideFormat) {
    // 宽表格式：保留所有原始字段，只映射基础字段
    Object.keys(rowData).forEach(header => {
      const mappedField = confirmedMappings[header];
      
      // 对于基础字段（姓名、班级等），使用映射
      if (mappedField && ['name', 'class_name', 'student_id'].includes(mappedField)) {
        formattedRow[mappedField] = String(rowData[header]);
      } else {
        // 对于科目分数字段，保留原始字段名
        formattedRow[header] = rowData[header];
      }
    });
  } else {
    // 长表格式：使用正常的字段映射
    Object.keys(confirmedMappings).forEach(header => {
      const mappedField = confirmedMappings[header];
      if (mappedField && rowData[header] !== undefined && rowData[header] !== null) {
        formattedRow[mappedField] = String(rowData[header]);
      }
    });
  }
  
  // 添加考试信息
  formattedRow.exam_title = examInfo.title;
  formattedRow.exam_type = examInfo.type;
  formattedRow.exam_date = examInfo.date;
  if (examInfo.subject) formattedRow.subject = examInfo.subject;
  
  console.log('处理后的数据:', formattedRow);
  
  return { formattedRow, examInfo };
}

// 模拟convertWideToLongFormat函数
function simulateConvertWideToLong(item, baseStudentRecord, examInfo) {
  console.log('\\n🔄 模拟convertWideToLongFormat转换...');
  
  const result = [];
  
  // 提取学生信息
  const studentInfo = {
    student_id: baseStudentRecord.student_id || item.student_id || 'AUTO_0001',
    name: baseStudentRecord.name || item.name || '',
    class_name: item.class_name || baseStudentRecord.class_name || '未知班级',
  };
  
  console.log('学生信息:', studentInfo);
  
  // 提取考试信息
  const examinationInfo = {
    exam_title: examInfo.title || '',
    exam_type: examInfo.type || '',
    exam_date: examInfo.date || new Date().toISOString().split('T')[0],
    exam_id: 'test_exam_id'
  };
  
  // 科目识别模式
  const ENHANCED_SUBJECT_PATTERNS = {
    '语文': ['语文', '语', 'chinese', 'yuwen'],
    '数学': ['数学', '数', 'math', 'mathematics', 'shuxue'],
    '英语': ['英语', '英', 'english', 'yingyu'],
    '物理': ['物理', '物', 'physics', 'wuli'],
    '化学': ['化学', '化', 'chemistry', 'huaxue'],
    '生物': ['生物', '生', 'biology', 'shengwu'],
    '政治': ['政治', '政', 'politics', 'zhengzhi', '道法', '道德与法治'],
    '历史': ['历史', '史', 'history', 'lishi'],
    '地理': ['地理', '地', 'geography', 'dili'],
    '总分': ['总分', '总', 'total', '合计']
  };
  
  // 扫描每个列，寻找科目相关数据
  const allColumns = Object.keys(item);
  const subjectData = {};
  
  console.log('所有列名:', allColumns);
  
  // 智能识别科目字段
  allColumns.forEach(col => {
    // 跳过非科目字段
    if (['姓名', '名字', '班级', '学号', 'student_id', 'name', 'class_name'].includes(col)) {
      return;
    }
    
    // 遍历所有科目模式进行匹配
    for (const [subject, patterns] of Object.entries(ENHANCED_SUBJECT_PATTERNS)) {
      for (const pattern of patterns) {
        if (col.toLowerCase().includes(pattern.toLowerCase())) {
          // 初始化科目数据对象
          if (!subjectData[subject]) {
            subjectData[subject] = {};
          }
          
          // 判断字段类型
          if (col.includes('分数') || col.includes('score')) {
            subjectData[subject].score = parseFloat(item[col]) || 0;
            console.log(`识别到 ${subject} 分数: ${item[col]} -> ${subjectData[subject].score}`);
          } else if (col.includes('等级') || col.includes('grade')) {
            subjectData[subject].grade = item[col];
            console.log(`识别到 ${subject} 等级: ${item[col]}`);
          }
          break;
        }
      }
    }
  });
  
  console.log('识别到的科目数据:', subjectData);
  
  // 为每个识别到的科目创建记录
  Object.entries(subjectData).forEach(([subject, data]) => {
    if (data.score !== undefined || data.grade !== undefined) {
      const subjectRecord = {
        ...studentInfo,
        ...examinationInfo,
        subject,
        score: data.score || null,
        grade: data.grade || null,
      };
      
      result.push(subjectRecord);
      console.log(`创建 ${subject} 记录:`, subjectRecord);
    }
  });
  
  console.log(`转换结果: ${result.length} 条记录`);
  return result;
}

// 运行测试
const { formattedRow, examInfo } = simulateDataProcessing();

// 模拟学生匹配（假设没有匹配到现有学生）
const baseStudentRecord = {
  student_id: 'AUTO_0001',
  name: formattedRow.name,
  class_name: formattedRow.class_name
};

// 测试宽表到长表转换
const longTableRecords = simulateConvertWideToLong(formattedRow, baseStudentRecord, examInfo);

console.log('\\n📝 测试结果总结:');
console.log(`✅ 数据处理: 生成了格式化的行数据`);
console.log(`✅ 字段映射: ${Object.keys(formattedRow).length} 个字段被映射`);
console.log(`✅ 宽表转长表: ${longTableRecords.length} 条长表记录`);

console.log('\\n⚠️ 潜在问题分析:');
if (longTableRecords.length === 0) {
  console.log('❌ 宽表到长表转换失败 - 没有生成任何记录');
  console.log('   可能原因: 字段映射逻辑有问题，科目识别失败');
}

if (!formattedRow.name) {
  console.log('❌ 学生姓名缺失');
}

if (!formattedRow.class_name) {
  console.log('❌ 班级信息缺失');
}

// 检查分数字段是否正确提取
const hasValidScores = longTableRecords.some(record => record.score && record.score > 0);
if (!hasValidScores) {
  console.log('❌ 分数数据提取失败 - 所有记录的分数都为空或0');
} 