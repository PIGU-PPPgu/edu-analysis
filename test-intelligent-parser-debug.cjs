/**
 * 智能解析调试脚本
 * 测试智能字段映射和数据转换逻辑
 */

const fs = require('fs');

// 模拟CSV数据（来自907九下月考成绩.csv）
const mockCSVData = [
  {
    '姓名': '张英乐',
    '班级': '初三7班',
    '总分分数': 373,
    '总分等级': 'B+',
    '总分班名': 1,
    '总分校名': 212,
    '总分级名': 3072,
    '语文分数': 85.5,
    '语文等级': 'B+',
    '语文班名': 14,
    '语文校名': 295,
    '语文级名': 4625,
    '数学分数': 68,
    '数学等级': 'B+',
    '数学班名': 13,
    '数学校名': 330,
    '数学级名': 4340,
    '英语分数': 66,
    '英语等级': 'A',
    '英语班名': 1,
    '英语校名': 90,
    '英语级名': 1229
  }
];

// 模拟智能字段分析函数
function analyzeCSVHeaders(headers) {
  console.log('[调试] 开始分析表头:', headers);
  
  const subjects = [];
  const studentFields = [];
  const mappings = [];
  
  // 识别学生字段
  if (headers.includes('姓名')) {
    studentFields.push({ originalField: '姓名', mappedField: 'name', confidence: 1.0 });
  }
  if (headers.includes('班级')) {
    studentFields.push({ originalField: '班级', mappedField: 'class_name', confidence: 1.0 });
  }
  
  // 识别科目
  const subjectPatterns = {
    '语文': ['语文分数', '语文等级', '语文班名', '语文校名', '语文级名'],
    '数学': ['数学分数', '数学等级', '数学班名', '数学校名', '数学级名'],
    '英语': ['英语分数', '英语等级', '英语班名', '英语校名', '英语级名'],
    '物理': ['物理分数', '物理等级', '物理班名', '物理校名', '物理级名'],
    '化学': ['化学分数', '化学等级', '化学班名', '化学校名', '化学级名'],
    '道法': ['道法分数', '道法等级', '道法班名', '道法校名', '道法级名'],
    '历史': ['历史分数', '历史等级', '历史班名', '历史校名', '历史级名'],
    '总分': ['总分分数', '总分等级', '总分班名', '总分校名', '总分级名']
  };
  
  Object.keys(subjectPatterns).forEach(subject => {
    const hasSubjectFields = subjectPatterns[subject].some(field => headers.includes(field));
    if (hasSubjectFields) {
      subjects.push(subject);
      
      // 为每个科目创建映射
      subjectPatterns[subject].forEach(field => {
        if (headers.includes(field)) {
          let mappedField = '';
          if (field.includes('分数')) mappedField = 'score';
          else if (field.includes('等级')) mappedField = 'grade';
          else if (field.includes('班名')) mappedField = 'rank_in_class';
          else if (field.includes('校名')) mappedField = 'rank_in_school';
          else if (field.includes('级名')) mappedField = 'rank_in_grade';
          
          mappings.push({
            originalField: field,
            mappedField,
            subject,
            dataType: field.includes('分数') ? 'score' : field.includes('等级') ? 'grade' : 'rank_class',
            confidence: 0.95
          });
        }
      });
    }
  });
  
  const confidence = subjects.length > 0 ? 0.95 : 0.3;
  
  console.log('[调试] 分析结果:', {
    subjects,
    studentFields,
    mappings: mappings.length,
    confidence
  });
  
  return {
    subjects,
    studentFields,
    mappings,
    confidence
  };
}

// 模拟数据转换函数
function convertWideToLongFormatEnhanced(row, mappings, examInfo) {
  console.log('[调试] 开始转换数据行:', row.姓名);
  
  const subjectRecords = [];
  const subjectData = {};
  
  // 按科目分组映射
  mappings.forEach(mapping => {
    if (!subjectData[mapping.subject]) {
      subjectData[mapping.subject] = {};
    }
    
    const value = row[mapping.originalField];
    if (value !== undefined && value !== null && value !== '') {
      subjectData[mapping.subject][mapping.mappedField] = value;
    }
  });
  
  // 为每个科目创建记录
  Object.keys(subjectData).forEach(subject => {
    const record = {
      subject,
      ...subjectData[subject]
    };
    subjectRecords.push(record);
    console.log(`[调试]   ${subject}: 分数=${record.score}, 等级=${record.grade}`);
  });
  
  return subjectRecords;
}

// 主测试函数
function testIntelligentParsing() {
  console.log('🔍 开始智能解析调试测试\n');
  
  try {
    // 1. 分析表头
    const headers = Object.keys(mockCSVData[0]);
    console.log('1️⃣ CSV表头:', headers.slice(0, 10), '...(共' + headers.length + '个)');
    
    const headerAnalysis = analyzeCSVHeaders(headers);
    
    // 2. 检查置信度
    console.log('\n2️⃣ 置信度检查:');
    console.log(`置信度: ${headerAnalysis.confidence}`);
    console.log(`是否满足阈值(0.7): ${headerAnalysis.confidence > 0.7 ? '✅ 是' : '❌ 否'}`);
    console.log(`科目数量: ${headerAnalysis.subjects.length}`);
    console.log(`是否宽表格: ${headerAnalysis.subjects.length > 1 ? '✅ 是' : '❌ 否'}`);
    
    // 3. 测试数据转换
    if (headerAnalysis.subjects.length > 1 && headerAnalysis.confidence > 0.7) {
      console.log('\n3️⃣ 开始数据转换测试...');
      
      const convertedData = [];
      
      mockCSVData.forEach((row, index) => {
        console.log(`\n转换第${index + 1}行: ${row.姓名}`);
        
        try {
          const subjectRecords = convertWideToLongFormatEnhanced(
            row, 
            headerAnalysis.mappings, 
            {
              title: '测试23',
              type: '月考',
              date: '2024-01-15'
            }
          );
          
          // 提取学生信息
          const studentInfo = {
            student_id: row.学号 || row.student_id || '',
            name: row.姓名 || row.name || '',
            class_name: row.班级 || row.class_name || ''
          };
          
          console.log(`学生信息:`, studentInfo);
          
          // 为每个科目创建完整记录
          subjectRecords.forEach(subjectData => {
            const completeRecord = {
              ...studentInfo,
              subject: subjectData.subject,
              score: subjectData.score,
              grade: subjectData.grade,
              rank_in_class: subjectData.rank_in_class,
              rank_in_school: subjectData.rank_in_school,
              rank_in_grade: subjectData.rank_in_grade,
              exam_title: '测试23',
              exam_type: '月考',
              exam_date: '2024-01-15'
            };
            
            convertedData.push(completeRecord);
          });
          
        } catch (error) {
          console.error(`❌ 转换第${index + 1}行数据时出错:`, error);
        }
      });
      
      console.log(`\n4️⃣ 转换结果:`);
      console.log(`原始数据: ${mockCSVData.length} 行`);
      console.log(`转换后: ${convertedData.length} 条记录`);
      
      if (convertedData.length > 0) {
        console.log('\n转换后的数据样本:');
        convertedData.slice(0, 3).forEach((record, index) => {
          console.log(`${index + 1}. ${record.name} - ${record.subject}: ${record.score}分`);
        });
        
        console.log('\n✅ 数据转换成功！');
      } else {
        console.log('\n❌ 数据转换失败，没有生成任何记录');
      }
      
    } else {
      console.log('\n❌ 不满足智能转换条件:');
      console.log(`  - 置信度: ${headerAnalysis.confidence} (需要 > 0.7)`);
      console.log(`  - 科目数: ${headerAnalysis.subjects.length} (需要 > 1)`);
    }
    
    // 5. 诊断结论
    console.log('\n🎯 诊断结论:');
    
    if (headerAnalysis.confidence <= 0.7) {
      console.log('❌ 问题: 智能分析置信度过低');
      console.log('💡 建议: 降低置信度阈值或改进字段识别逻辑');
    } else if (headerAnalysis.subjects.length <= 1) {
      console.log('❌ 问题: 未识别到多个科目');
      console.log('💡 建议: 检查科目识别模式');
    } else {
      console.log('✅ 智能分析逻辑正常');
      console.log('💡 问题可能在于: 实际数据与测试数据不一致，或者后续保存逻辑有问题');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
  }
}

// 运行测试
testIntelligentParsing(); 