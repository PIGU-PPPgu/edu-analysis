const fs = require('fs');
const path = require('path');

// 模拟前端的智能字段映射逻辑（从实际代码复制）
const SUBJECT_PATTERNS = {
  '语文': {
    keywords: ['语文', '语', 'chinese', 'yuwen'],
    aliases: ['语文分数', '语文等级', '语文班名', '语文校名', '语文级名']
  },
  '数学': {
    keywords: ['数学', '数', 'math', 'mathematics', 'shuxue'],
    aliases: ['数学分数', '数学等级', '数学班名', '数学校名', '数学级名']
  },
  '英语': {
    keywords: ['英语', '英', 'english', 'yingyu'],
    aliases: ['英语分数', '英语等级', '英语班名', '英语校名', '英语级名']
  },
  '物理': {
    keywords: ['物理', '物', 'physics', 'wuli'],
    aliases: ['物理分数', '物理等级', '物理班名', '物理校名', '物理级名']
  },
  '化学': {
    keywords: ['化学', '化', 'chemistry', 'huaxue'],
    aliases: ['化学分数', '化学等级', '化学班名', '化学校名', '化学级名']
  },
  '生物': {
    keywords: ['生物', '生', 'biology', 'shengwu'],
    aliases: ['生物分数', '生物等级', '生物班名', '生物校名', '生物级名']
  },
  '政治': {
    keywords: ['政治', '政', 'politics', 'zhengzhi', '道法', '道德与法治', '道德法治'],
    aliases: ['政治分数', '政治等级', '政治班名', '政治校名', '政治级名', '道法分数', '道法等级', '道法班名', '道法校名', '道法级名']
  },
  '历史': {
    keywords: ['历史', '史', 'history', 'lishi'],
    aliases: ['历史分数', '历史等级', '历史班名', '历史校名', '历史级名']
  },
  '地理': {
    keywords: ['地理', '地', 'geography', 'dili'],
    aliases: ['地理分数', '地理等级', '地理班名', '地理校名', '地理级名']
  },
  '总分': {
    keywords: ['总分', '总', 'total', '合计', '总成绩'],
    aliases: ['总分分数', '总分等级', '总分班名', '总分校名', '总分级名']
  }
};

const FIELD_TYPE_PATTERNS = {
  score: ['分数', 'score', '成绩', '得分'],
  grade: ['等级', 'grade', '级别', '档次'],
  rank_class: ['班名', 'class_rank', '班级排名', '班排'],
  rank_school: ['校名', 'school_rank', '学校排名', '校排'],
  rank_grade: ['级名', 'grade_rank', '年级排名', '级排']
};

const STUDENT_INFO_PATTERNS = {
  name: ['姓名', '名字', 'name', '学生姓名'],
  student_id: ['学号', 'student_id', 'id', '学生编号'],
  class_name: ['班级', 'class', 'class_name', '所在班级']
};

function identifyField(header) {
  const normalizedHeader = header.trim();
  
  // 1. 检查学生信息字段
  for (const [field, patterns] of Object.entries(STUDENT_INFO_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalizedHeader.includes(pattern)) {
        return {
          originalField: header,
          mappedField: field,
          dataType: 'student_info',
          confidence: 0.9
        };
      }
    }
  }
  
  // 2. 检查科目相关字段
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
          const regex = new RegExp(`(?:^|[^\\u4e00-\\u9fa5])${keyword}(?:[^\\u4e00-\\u9fa5]|$)`);
          return regex.test(normalizedHeader) || normalizedHeader === keyword;
        } else {
          return normalizedHeader.includes(keyword);
        }
      });
    
    if (matchedKeyword) {
      // 确定字段类型
      let dataType = 'score';
      let confidence = 0.7;
      
      for (const [type, patterns] of Object.entries(FIELD_TYPE_PATTERNS)) {
        if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
          dataType = type;
          confidence = 0.9;
          break;
        }
      }
      
      if (confidence === 0.7) {
        if (normalizedHeader.includes('分数') || normalizedHeader.endsWith(subject) || normalizedHeader.startsWith(subject)) {
          dataType = 'score';
          confidence = 0.9;
        } else if (normalizedHeader.includes('等级')) {
          dataType = 'grade';
          confidence = 0.9;
        } else if (normalizedHeader.includes('班名') || normalizedHeader.includes('班级排名')) {
          dataType = 'rank_class';
          confidence = 0.9;
        } else if (normalizedHeader.includes('校名') || normalizedHeader.includes('学校排名')) {
          dataType = 'rank_school';
          confidence = 0.9;
        } else if (normalizedHeader.includes('级名') || normalizedHeader.includes('年级排名')) {
          dataType = 'rank_grade';
          confidence = 0.9;
        } else {
          dataType = 'score';
          confidence = 0.8;
        }
      }
      
      return {
        originalField: header,
        mappedField: `${subject}_${dataType}`,
        subject,
        dataType,
        confidence
      };
    }
  }
  
  return null;
}

function analyzeCSVHeaders(headers) {
  const mappings = [];
  const subjects = new Set();
  const studentFields = [];
  
  headers.forEach(header => {
    const mapping = identifyField(header);
    if (mapping) {
      mappings.push(mapping);
      
      if (mapping.subject) {
        subjects.add(mapping.subject);
      }
      
      if (mapping.dataType === 'student_info') {
        studentFields.push(mapping);
      }
    }
  });
  
  const confidence = mappings.length / headers.length;
  
  return {
    mappings,
    subjects: Array.from(subjects),
    studentFields,
    confidence
  };
}

// 模拟IntelligentFileParser的parseFile方法
function simulateIntelligentFileParser() {
  console.log('🧪 测试修复后的IntelligentFileParser逻辑\n');
  
  try {
    // 读取CSV文件
    const csvPath = path.join(__dirname, '907九下月考成绩.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log('📁 文件信息:');
    console.log(`  - 文件: ${csvPath}`);
    console.log(`  - 字段数: ${headers.length}`);
    console.log(`  - 数据行数: ${lines.length - 1}`);
    
    // 使用增强的智能字段映射
    console.log('\n🔍 使用增强的智能字段映射分析...');
    const intelligentAnalysis = analyzeCSVHeaders(headers);
    
    console.log('\n📊 智能分析结果:');
    console.log(`  - 置信度: ${(intelligentAnalysis.confidence * 100).toFixed(1)}%`);
    console.log(`  - 已映射字段: ${intelligentAnalysis.mappings.length}/${headers.length}`);
    console.log(`  - 识别的科目: ${intelligentAnalysis.subjects.join(', ')}`);
    console.log(`  - 学生信息字段: ${intelligentAnalysis.studentFields.length}`);
    
    // 转换映射格式
    const suggestedMappings = {};
    intelligentAnalysis.mappings.forEach(mapping => {
      suggestedMappings[mapping.originalField] = mapping.mappedField;
    });
    
    console.log('\n🗺️ 字段映射结果:');
    Object.entries(suggestedMappings).forEach(([original, mapped]) => {
      console.log(`  ${original} -> ${mapped}`);
    });
    
    // 判断是否应该自动跳过字段映射
    const shouldAutoSkip = intelligentAnalysis.confidence >= 0.8;
    
    console.log('\n🎯 处理决策:');
    console.log(`  - 置信度阈值: 80%`);
    console.log(`  - 当前置信度: ${(intelligentAnalysis.confidence * 100).toFixed(1)}%`);
    console.log(`  - 自动跳过字段映射: ${shouldAutoSkip ? '✅ 是' : '❌ 否'}`);
    
    if (shouldAutoSkip) {
      console.log('\n✅ 智能解析成功！');
      console.log('   - 可以自动跳过手动字段映射步骤');
      console.log('   - 系统将直接进入学生信息策略步骤');
      console.log('   - autoProcessed = true');
    } else {
      console.log('\n⚠️ 智能解析置信度不足');
      console.log('   - 需要用户手动确认字段映射');
      console.log('   - 系统将显示字段映射界面');
      console.log('   - autoProcessed = false');
    }
    
    // 模拟返回结果
    const mockResult = {
      data: [], // 实际数据会在这里
      headers,
      metadata: {
        fileType: 'csv',
        totalRows: lines.length - 1,
        detectedStructure: 'wide',
        confidence: intelligentAnalysis.confidence,
        suggestedMappings,
        detectedSubjects: intelligentAnalysis.subjects,
        examInfo: {
          title: '907九下月考',
          type: '月考',
          date: new Date().toISOString().split('T')[0]
        },
        unknownFields: [],
        autoProcessed: shouldAutoSkip
      }
    };
    
    console.log('\n📦 模拟返回结果:');
    console.log(`  - autoProcessed: ${mockResult.metadata.autoProcessed}`);
    console.log(`  - confidence: ${mockResult.metadata.confidence}`);
    console.log(`  - detectedStructure: ${mockResult.metadata.detectedStructure}`);
    console.log(`  - detectedSubjects: ${mockResult.metadata.detectedSubjects.length} 个科目`);
    
    return mockResult;
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return null;
  }
}

// 运行测试
console.log('🚀 开始测试修复后的智能字段映射功能\n');
const result = simulateIntelligentFileParser();

if (result && result.metadata.autoProcessed) {
  console.log('\n🎉 测试成功！智能字段映射功能已修复');
  console.log('   - 置信度达到要求，可以自动跳过字段映射');
  console.log('   - 前端应该直接从步骤2跳转到步骤4');
} else {
  console.log('\n❌ 测试失败或置信度不足');
} 