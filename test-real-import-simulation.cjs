const fs = require('fs');
const path = require('path');

// 模拟智能字段映射服务
function analyzeCSVHeaders(headers) {
  console.log('[智能分析] 开始分析CSV表头:', headers);
  
  // 直接使用真正的智能字段映射服务
  try {
    const { analyzeCSVHeaders: realAnalyze } = require('./src/services/intelligentFieldMapper.ts');
    return realAnalyze(headers);
  } catch (error) {
    console.error('[智能分析] 无法加载真正的智能字段映射服务，使用简化版本:', error.message);
    
    // 如果无法加载真正的服务，使用简化版本作为后备
    const mappings = [];
    const subjects = new Set();
    const studentFields = [];
    
    // 科目识别模式（简化版）
    const SUBJECT_PATTERNS = {
      '语文': { keywords: ['语文', '语'], aliases: ['语文分数', '语文等级', '语文班名', '语文校名', '语文级名'] },
      '数学': { keywords: ['数学', '数'], aliases: ['数学分数', '数学等级', '数学班名', '数学校名', '数学级名'] },
      '英语': { keywords: ['英语', '英'], aliases: ['英语分数', '英语等级', '英语班名', '英语校名', '英语级名'] },
      '物理': { keywords: ['物理', '物'], aliases: ['物理分数', '物理等级', '物理班名', '物理校名', '物理级名'] },
      '化学': { keywords: ['化学', '化'], aliases: ['化学分数', '化学等级', '化学班名', '化学校名', '化学级名'] },
      '政治': { keywords: ['政治', '政', '道法', '道德与法治'], aliases: ['政治分数', '道法分数', '道法等级', '道法班名', '道法校名', '道法级名'] },
      '历史': { keywords: ['历史', '史'], aliases: ['历史分数', '历史等级', '历史班名', '历史校名', '历史级名'] },
      '总分': { keywords: ['总分', '总', 'total', '合计'], aliases: ['总分分数', '总分等级', '总分班名', '总分校名', '总分级名'] }
    };
    
    // 学生信息字段模式
    const STUDENT_INFO_PATTERNS = {
      name: ['姓名', 'name', '学生姓名'],
      student_id: ['学号', 'student_id', '学生编号', 'id'],
      class_name: ['班级', 'class', '班级名称', 'class_name']
    };
    
    headers.forEach(header => {
      const normalizedHeader = header.trim();
      
      // 检查学生信息字段
      for (const [field, patterns] of Object.entries(STUDENT_INFO_PATTERNS)) {
        if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
          studentFields.push({
            originalField: header,
            mappedField: field,
            dataType: 'student_info',
            confidence: 0.9
          });
          mappings.push({
            originalField: header,
            mappedField: field,
            dataType: 'student_info',
            confidence: 0.9
          });
          return;
        }
      }
      
      // 检查科目相关字段 - 使用更精确的匹配逻辑
      const sortedSubjects = Object.entries(SUBJECT_PATTERNS).sort((a, b) => {
        const maxLengthA = Math.max(...a[1].keywords.map(k => k.length));
        const maxLengthB = Math.max(...b[1].keywords.map(k => k.length));
        return maxLengthB - maxLengthA;
      });
      
      for (const [subject, config] of sortedSubjects) {
        const matchedKeyword = config.keywords
          .sort((a, b) => b.length - a.length)
          .find(keyword => {
            if (keyword.length === 1) {
              // 对于单字符关键词，需要更严格的匹配
              const regex = new RegExp(`(?:^|[^\\u4e00-\\u9fa5])${keyword}(?:[^\\u4e00-\\u9fa5]|$)`);
              return regex.test(normalizedHeader) || normalizedHeader === keyword;
            } else {
              return normalizedHeader.includes(keyword);
            }
          });
        
        if (matchedKeyword) {
          subjects.add(subject);
          
          let dataType = 'score';
          let confidence = 0.8;
          
          if (normalizedHeader.includes('分数') || normalizedHeader.endsWith(subject)) {
            dataType = 'score';
            confidence = 0.9;
          } else if (normalizedHeader.includes('等级')) {
            dataType = 'grade';
            confidence = 0.9;
          } else if (normalizedHeader.includes('班名')) {
            dataType = 'rank_class';
            confidence = 0.9;
          } else if (normalizedHeader.includes('校名')) {
            dataType = 'rank_school';
            confidence = 0.9;
          } else if (normalizedHeader.includes('级名')) {
            dataType = 'rank_grade';
            confidence = 0.9;
          }
          
          mappings.push({
            originalField: header,
            mappedField: `${subject}_${dataType}`,
            subject,
            dataType,
            confidence
          });
          break;
        }
      }
    });
    
    const confidence = mappings.length / headers.length;
    
    console.log('[智能分析] 分析结果:', {
      总字段数: headers.length,
      已映射字段数: mappings.length,
      识别的科目: Array.from(subjects),
      置信度: confidence
    });
    
    return {
      mappings,
      subjects: Array.from(subjects),
      studentFields,
      confidence
    };
  }
}

function convertWideToLongFormatEnhanced(rowData, mappings, examInfo) {
  console.log('[增强转换] 开始转换数据行:', Object.keys(rowData));
  
  // 提取学生基本信息
  const studentInfo = {};
  const studentMappings = mappings.filter(m => m.dataType === 'student_info');
  
  studentMappings.forEach(mapping => {
    const value = rowData[mapping.originalField];
    if (value !== undefined && value !== null && value !== '') {
      studentInfo[mapping.mappedField] = value;
    }
  });
  
  console.log('[增强转换] 提取的学生信息:', studentInfo);
  
  // 按科目分组数据
  const subjectGroups = {};
  const subjectMappings = mappings.filter(m => m.subject);
  
  subjectMappings.forEach(mapping => {
    const value = rowData[mapping.originalField];
    if (value !== undefined && value !== null && value !== '') {
      if (!subjectGroups[mapping.subject]) {
        subjectGroups[mapping.subject] = {};
      }
      
      switch (mapping.dataType) {
        case 'score':
          subjectGroups[mapping.subject].score = parseFloat(value) || 0;
          break;
        case 'grade':
          subjectGroups[mapping.subject].grade = value;
          break;
        case 'rank_class':
          subjectGroups[mapping.subject].rank_in_class = parseInt(value) || 0;
          break;
        case 'rank_school':
          subjectGroups[mapping.subject].rank_in_school = parseInt(value) || 0;
          break;
        case 'rank_grade':
          subjectGroups[mapping.subject].rank_in_grade = parseInt(value) || 0;
          break;
      }
    }
  });
  
  // 生成长表格记录
  const result = [];
  
  Object.entries(subjectGroups).forEach(([subject, data]) => {
    if (data.score !== undefined || data.grade !== undefined) {
      const record = {
        subject,
        ...data
      };
      result.push(record);
    }
  });
  
  console.log('[增强转换] 转换结果:', {
    科目数量: result.length,
    科目列表: result.map(r => r.subject),
    学生信息: studentInfo
  });
  
  return result;
}

// 模拟真实导入过程
async function simulateRealImport() {
  console.log('🚀 模拟真实导入过程测试\n');
  
  try {
    // 1. 读取真实CSV文件
    console.log('📁 第一步：读取真实CSV文件');
    const csvPath = path.join(__dirname, '907九下月考成绩.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log(`✅ 文件读取成功: ${headers.length} 个字段, ${lines.length - 1} 行数据`);
    console.log('字段列表:', headers.slice(0, 10).join(', ') + '...');
    
    // 2. 解析数据
    console.log('\n📊 第二步：解析CSV数据');
    const processedData = [];
    for (let i = 1; i < Math.min(lines.length, 4); i++) { // 只处理前3行数据进行测试
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // 确保行数据有效
      if (row.姓名 || row.name) {
        processedData.push(row);
      }
    }
    
    console.log(`✅ 数据解析完成: ${processedData.length} 行数据`);
    
    if (processedData.length === 0) {
      console.log('❌ 没有有效的数据行');
      return;
    }
    
    console.log('样本数据字段:', Object.keys(processedData[0]).slice(0, 10).join(', ') + '...');
    console.log('第一行学生:', processedData[0].姓名 || processedData[0].name || '未知');
    
    // 3. 智能字段分析
    console.log('\n🔍 第三步：智能字段分析');
    const headerAnalysis = analyzeCSVHeaders(headers);
    
    console.log(`✅ 分析完成:`);
    console.log(`  - 识别的科目: ${headerAnalysis.subjects.join(', ')}`);
    console.log(`  - 置信度: ${(headerAnalysis.confidence * 100).toFixed(1)}%`);
    console.log(`  - 是否宽表格: ${headerAnalysis.subjects.length > 1 ? '是' : '否'}`);
    console.log(`  - 字段映射数量: ${headerAnalysis.mappings.length}`);
    
    // 4. 检查是否需要转换
    if (headerAnalysis.subjects.length > 1 && headerAnalysis.confidence > 0.7) {
      console.log('\n🔄 第四步：宽表格转换');
      console.log('✅ 检测到宽表格格式，开始转换...');
      
      const convertedData = [];
      
      processedData.forEach((row, index) => {
        try {
          console.log(`\n转换第${index + 1}行: ${row.姓名 || row.name || '未知'}`);
          
          // 添加详细的字段映射调试信息
          console.log(`[调试] 原始数据行字段数: ${Object.keys(row).length}`);
          console.log(`[调试] 字段映射数量: ${headerAnalysis.mappings.length}`);
          console.log(`[调试] 前5个映射:`, headerAnalysis.mappings.slice(0, 5).map(m => 
            `${m.originalField} -> ${m.subject || 'student'}_${m.dataType} (${m.confidence.toFixed(2)})`
          ));
          
          const subjectRecords = convertWideToLongFormatEnhanced(
            row, 
            headerAnalysis.mappings, 
            {
              title: '测试考试',
              type: '月考',
              date: '2024-01-01',
              exam_id: 'test-exam-id'
            }
          );
          
          // 提取学生信息
          const studentInfo = {
            student_id: row.学号 || row.student_id || '',
            name: row.姓名 || row.name || '',
            class_name: row.班级 || row.class_name || ''
          };
          
          console.log(`学生信息:`, studentInfo);
          console.log(`科目记录数: ${subjectRecords.length}`);
          
          // 为每个科目创建完整记录
          subjectRecords.forEach((subjectData, subIndex) => {
            const completeRecord = {
              ...studentInfo,
              subject: subjectData.subject,
              score: subjectData.score,
              grade: subjectData.grade,
              rank_in_class: subjectData.rank_in_class,
              rank_in_school: subjectData.rank_in_school,
              rank_in_grade: subjectData.rank_in_grade,
              exam_title: '测试考试',
              exam_type: '月考',
              exam_date: '2024-01-01'
            };
            
            convertedData.push(completeRecord);
            console.log(`  ${subIndex + 1}. ${subjectData.subject}: ${subjectData.score}分 ${subjectData.grade || ''}`);
          });
          
        } catch (error) {
          console.error(`❌ 转换第${index + 1}行数据时出错:`, error.message);
          console.error('错误详情:', error.stack);
        }
      });
      
      console.log(`\n✅ 转换完成: ${processedData.length}行 → ${convertedData.length}条记录`);
      
      // 5. 显示转换结果样本
      console.log('\n📋 第五步：转换结果样本');
      convertedData.slice(0, 10).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.name} - ${record.subject}: ${record.score}分 ${record.grade || ''} (班排${record.rank_in_class || 'N/A'})`);
      });
      
      // 6. 验证数据完整性
      console.log('\n🎯 第六步：数据完整性验证');
      const studentsCount = new Set(convertedData.map(r => r.name)).size;
      const subjectsCount = new Set(convertedData.map(r => r.subject)).size;
      const recordsWithScore = convertedData.filter(r => r.score && r.score > 0).length;
      
      console.log(`✅ 验证结果:`);
      console.log(`  - 学生数量: ${studentsCount}`);
      console.log(`  - 科目数量: ${subjectsCount}`);
      console.log(`  - 有效成绩记录: ${recordsWithScore}/${convertedData.length}`);
      console.log(`  - 数据完整性: ${(recordsWithScore / convertedData.length * 100).toFixed(1)}%`);
      
      if (recordsWithScore === 0) {
        console.log('❌ 警告: 没有有效的成绩数据！');
        console.log('🔍 调试信息:');
        if (convertedData.length > 0) {
          console.log('样本记录:', JSON.stringify(convertedData[0], null, 2));
        }
      } else {
        console.log('✅ 数据转换成功，可以保存到数据库');
      }
      
    } else {
      console.log('\n⚠️ 第四步：跳过转换');
      console.log('原因: 不是宽表格格式或置信度不足');
    }
    
    console.log('\n🎉 模拟导入过程完成！');
    
  } catch (error) {
    console.error('❌ 模拟导入过程失败:', error);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
simulateRealImport(); 