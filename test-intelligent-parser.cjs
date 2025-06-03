const fs = require('fs');
const path = require('path');

// 模拟智能解析器的核心逻辑
class TestIntelligentParser {
  
  // 字段类型枚举
  static FieldType = {
    STUDENT_ID: 'student_id',
    NAME: 'name', 
    CLASS_NAME: 'class_name',
    SCORE: 'score',
    SUBJECT: 'subject',
    EXAM_DATE: 'exam_date',
    EXAM_TYPE: 'exam_type', 
    EXAM_TITLE: 'exam_title',
    RANK_IN_CLASS: 'rank_in_class',
    RANK_IN_GRADE: 'rank_in_grade',
    GRADE: 'grade',
    UNKNOWN: 'unknown'
  };

  // 字段识别模式
  static FIELD_PATTERNS = {
    [TestIntelligentParser.FieldType.STUDENT_ID]: [
      /^(学号|学生号|student_?id|id)$/i,
      /学号/i
    ],
    [TestIntelligentParser.FieldType.NAME]: [
      /^(姓名|学生姓名|name|student_?name)$/i,
      /姓名/i
    ],
    [TestIntelligentParser.FieldType.CLASS_NAME]: [
      /^(班级|class|class_?name)$/i,
      /班级/i
    ],
    [TestIntelligentParser.FieldType.SCORE]: [
      /^(分数|成绩|得分|score|grade|mark)$/i,
      /分数$/i,
      /成绩$/i,
      /得分$/i,
      // 支持"科目+分数"格式
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)分数$/i,
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)成绩$/i,
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)得分$/i
    ],
    [TestIntelligentParser.FieldType.RANK_IN_CLASS]: [
      /^(班级排名|班排|class_?rank|rank_?in_?class)$/i,
      /班级排名/i,
      /班排/i,
      // 支持"科目+班名"格式
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)班名$/i,
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)班级排名$/i
    ],
    [TestIntelligentParser.FieldType.RANK_IN_GRADE]: [
      /^(年级排名|级排|grade_?rank|rank_?in_?grade)$/i,
      /年级排名/i,
      /级排/i,
      // 支持"科目+校名/级名"格式
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)校名$/i,
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)级名$/i,
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)年级排名$/i
    ],
    [TestIntelligentParser.FieldType.GRADE]: [
      /^(等级|评级|level|grade_?level)$/i,
      /等级$/i,
      /评级$/i,
      // 支持"科目+等级"格式
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)等级$/i,
      /(语文|数学|英语|物理|化学|生物|政治|历史|地理|道法|道德与法治|总分)评级$/i
    ]
  };

  // 科目识别模式
  static SUBJECT_PATTERNS = [
    { pattern: /语文|chinese/i, subject: '语文' },
    { pattern: /数学|math/i, subject: '数学' },
    { pattern: /英语|english/i, subject: '英语' },
    { pattern: /物理|physics/i, subject: '物理' },
    { pattern: /化学|chemistry/i, subject: '化学' },
    { pattern: /生物|biology/i, subject: '生物' },
    { pattern: /政治|politics/i, subject: '政治' },
    { pattern: /历史|history/i, subject: '历史' },
    { pattern: /地理|geography/i, subject: '地理' },
    { pattern: /道法|道德与法治|思想品德|品德/i, subject: '道德与法治' },
    { pattern: /总分|总成绩|total/i, subject: '总分' }
  ];

  // 解析CSV文件
  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    return { headers, data };
  }

  // 生成字段映射
  generateFieldMappings(headers, data) {
    const mappings = {};
    
    console.log('[字段映射] 开始生成字段映射，表头:', headers);
    
    headers.forEach(header => {
      const trimmedHeader = header.trim();
      let matched = false;
      
      console.log(`[字段映射] 处理字段: ${trimmedHeader}`);
      
      // 首先检查科目相关字段（优先级最高）
      for (const subjectPattern of TestIntelligentParser.SUBJECT_PATTERNS) {
        if (subjectPattern.pattern.test(trimmedHeader)) {
          const subject = subjectPattern.subject;
          
          // 检查是否是分数字段
          if (/分数$|成绩$|得分$/i.test(trimmedHeader)) {
            mappings[header] = `${subject}_score`;
            console.log(`[字段映射] ${trimmedHeader} -> ${subject}_score (分数字段)`);
            matched = true;
            break;
          }
          // 检查是否是等级字段
          else if (/等级$|评级$/i.test(trimmedHeader)) {
            mappings[header] = `${subject}_grade`;
            console.log(`[字段映射] ${trimmedHeader} -> ${subject}_grade (等级字段)`);
            matched = true;
            break;
          }
          // 检查是否是班级排名字段
          else if (/班名$|班级排名$/i.test(trimmedHeader)) {
            mappings[header] = `${subject}_class_rank`;
            console.log(`[字段映射] ${trimmedHeader} -> ${subject}_class_rank (班级排名字段)`);
            matched = true;
            break;
          }
          // 检查是否是年级排名字段
          else if (/校名$|级名$|年级排名$/i.test(trimmedHeader)) {
            mappings[header] = `${subject}_grade_rank`;
            console.log(`[字段映射] ${trimmedHeader} -> ${subject}_grade_rank (年级排名字段)`);
            matched = true;
            break;
          }
        }
      }
      
      // 如果没有匹配到科目字段，检查基础字段类型
      if (!matched) {
        for (const [fieldType, patterns] of Object.entries(TestIntelligentParser.FIELD_PATTERNS)) {
          for (const pattern of patterns) {
            if (pattern.test(trimmedHeader)) {
              mappings[header] = fieldType;
              console.log(`[字段映射] ${trimmedHeader} -> ${fieldType} (基础字段)`);
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      }
      
      if (!matched) {
        mappings[header] = TestIntelligentParser.FieldType.UNKNOWN;
        console.log(`[字段映射] ${trimmedHeader} -> UNKNOWN (未识别)`);
      }
    });
    
    console.log('[字段映射] 最终映射结果:', mappings);
    return mappings;
  }

  // 检测科目
  detectSubjects(headers) {
    const subjects = new Set();
    
    headers.forEach(header => {
      const trimmedHeader = header.trim();
      
      for (const subjectPattern of TestIntelligentParser.SUBJECT_PATTERNS) {
        if (subjectPattern.pattern.test(trimmedHeader)) {
          subjects.add(subjectPattern.subject);
          break;
        }
      }
    });
    
    return Array.from(subjects);
  }

  // 计算置信度
  calculateConfidence(mappings, subjects) {
    let confidence = 0;
    
    console.log('[置信度计算] 开始计算置信度');
    console.log('[置信度计算] 字段映射:', mappings);
    console.log('[置信度计算] 检测到的科目:', subjects);
    
    // 基础分数
    confidence += 0.2;
    
    // 检查关键字段的映射质量
    const mappedFields = Object.values(mappings);
    const hasStudentId = mappedFields.includes(TestIntelligentParser.FieldType.STUDENT_ID);
    const hasName = mappedFields.includes(TestIntelligentParser.FieldType.NAME);
    const hasClassName = mappedFields.includes(TestIntelligentParser.FieldType.CLASS_NAME);
    
    // 检查科目分数字段
    const scoreFields = mappedFields.filter(field => field.endsWith('_score'));
    const hasScoreFields = scoreFields.length > 0;
    
    console.log('[置信度计算] 关键字段检查:', {
      hasStudentId,
      hasName,
      hasClassName,
      scoreFieldsCount: scoreFields.length,
      hasScoreFields
    });
    
    // 学生身份字段（学号或姓名至少有一个）
    if (hasStudentId || hasName) {
      confidence += 0.25;
      console.log('[置信度计算] 有学生身份字段 +0.25');
    }
    
    // 班级信息
    if (hasClassName) {
      confidence += 0.15;
      console.log('[置信度计算] 有班级字段 +0.15');
    }
    
    // 分数字段（最重要）
    if (hasScoreFields) {
      const scoreBonus = Math.min(scoreFields.length / 3, 1) * 0.3; // 最多3个科目就给满分
      confidence += scoreBonus;
      console.log(`[置信度计算] 有分数字段 +${scoreBonus} (${scoreFields.length}个分数字段)`);
    }
    
    // 科目检测质量
    if (subjects.length > 0) {
      const subjectBonus = Math.min(subjects.length / 5, 1) * 0.1;
      confidence += subjectBonus;
      console.log(`[置信度计算] 科目检测 +${subjectBonus} (${subjects.length}个科目)`);
    }
    
    // 总体映射比例
    const totalFields = Object.keys(mappings).length;
    const unknownFields = mappedFields.filter(field => field === TestIntelligentParser.FieldType.UNKNOWN).length;
    const mappingRatio = (totalFields - unknownFields) / totalFields;
    const mappingBonus = mappingRatio * 0.1;
    confidence += mappingBonus;
    console.log(`[置信度计算] 映射比例 +${mappingBonus} (${totalFields - unknownFields}/${totalFields})`);
    
    const finalConfidence = Math.min(confidence, 1);
    console.log(`[置信度计算] 最终置信度: ${finalConfidence}`);
    
    return finalConfidence;
  }

  // 测试文件解析
  testFile(filePath) {
    console.log(`\n=== 测试文件: ${filePath} ===`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const { headers, data } = this.parseCSV(content);
    
    console.log(`文件包含 ${headers.length} 个字段，${data.length} 行数据`);
    console.log('字段列表:', headers);
    
    const mappings = this.generateFieldMappings(headers, data);
    const subjects = this.detectSubjects(headers);
    const confidence = this.calculateConfidence(mappings, subjects);
    
    console.log('\n=== 解析结果 ===');
    console.log('字段映射:', mappings);
    console.log('检测到的科目:', subjects);
    console.log('置信度:', confidence);
    console.log('是否达到自动处理阈值(0.8):', confidence >= 0.8 ? '是' : '否');
    
    return { mappings, subjects, confidence };
  }
}

// 测试907九下月考成绩.csv文件
const parser = new TestIntelligentParser();
const testFile = '907九下月考成绩.csv';

if (fs.existsSync(testFile)) {
  parser.testFile(testFile);
} else {
  console.log(`文件 ${testFile} 不存在`);
} 