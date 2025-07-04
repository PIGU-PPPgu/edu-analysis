
/**
 * 🚑 临时适配的智能字段验证器
 * 基于当前数据库实际字段结构
 */

// 基于实际数据库结构的字段定义
export const ADAPTED_DATABASE_FIELDS = {
  // 必需字段（确认存在）
  required: {
    student_id: { name: '学号', type: 'string', required: true, dbColumn: 'student_id' },
    name: { name: '姓名', type: 'string', required: true, dbColumn: 'name' },
    class_name: { name: '班级', type: 'string', required: true, dbColumn: 'class_name' }
  },
  
  // 成绩字段（使用现有字段）
  scores: {
    total_score: { name: '总分', type: 'number', range: [0, 900], dbColumn: 'total_score' },
    score: { name: '分数', type: 'number', range: [0, 150], dbColumn: 'score' },
    // 临时使用custom字段存储各科成绩
    chinese_score: { name: '语文分数', type: 'number', range: [0, 150], dbColumn: 'total_score' },
    math_score: { name: '数学分数', type: 'number', range: [0, 150], dbColumn: 'subject' },
    english_score: { name: '英语分数', type: 'number', range: [0, 150], dbColumn: 'custom_1d8d05c1-e4d7-4c79-ab48-f3063656be90' },
    physics_score: { name: '物理分数', type: 'number', range: [0, 150], dbColumn: 'custom_c316f6bf-684e-4d2a-b510-2ab1e33911e2' },
    chemistry_score: { name: '化学分数', type: 'number', range: [0, 150], dbColumn: 'custom_0afe3098-4bc1-498f-8b66-9cdc19039acf' },
    biology_score: { name: '生物分数', type: 'number', range: [0, 150], dbColumn: 'custom_eb526d63-5745-48af-ab96-02e4820bbf36' },
    politics_score: { name: '政治分数', type: 'number', range: [0, 150], dbColumn: 'custom_df6ffec1-7cc9-47e8-8273-a06c5b852382' },
    history_score: { name: '历史分数', type: 'number', range: [0, 150], dbColumn: 'custom_95a679a2-a689-4cd2-8e6d-74569b8fa325' },
    geography_score: { name: '地理分数', type: 'number', range: [0, 150], dbColumn: 'custom_7433e86d-1005-478d-9923-1bff62e1e16e' }
  },
  
  // 其他字段
  additional: {
    grade: { name: '等级', type: 'string', dbColumn: 'grade' },
    subject: { name: '科目', type: 'string', dbColumn: 'subject' },
    rank_in_class: { name: '班级排名', type: 'number', dbColumn: 'rank_in_class' },
    rank_in_grade: { name: '年级排名', type: 'number', dbColumn: 'rank_in_grade' },
    exam_id: { name: '考试ID', type: 'uuid', dbColumn: 'exam_id' },
    exam_title: { name: '考试标题', type: 'string', dbColumn: 'exam_title' },
    exam_type: { name: '考试类型', type: 'string', dbColumn: 'exam_type' },
    exam_date: { name: '考试日期', type: 'date', dbColumn: 'exam_date' }
  }
};

// 科目模式匹配（保持原有逻辑）
export const ADAPTED_SUBJECT_PATTERNS = {
  chinese: {
    name: '语文',
    patterns: [/^语文|chinese|语$/i],
    field: 'chinese_score'
  },
  math: {
    name: '数学', 
    patterns: [/^数学|math|数$/i],
    field: 'math_score'
  },
  english: {
    name: '英语',
    patterns: [/^英语|english|英$/i],
    field: 'english_score'
  },
  physics: {
    name: '物理',
    patterns: [/^物理|physics|理$/i],
    field: 'physics_score'
  },
  chemistry: {
    name: '化学',
    patterns: [/^化学|chemistry|化$/i],
    field: 'chemistry_score'
  },
  biology: {
    name: '生物',
    patterns: [/^生物|biology|生$/i],
    field: 'biology_score'
  },
  total: {
    name: '总分',
    patterns: [/^总分|total|合计|总成绩$/i],
    field: 'total_score'
  }
};

export class AdaptedIntelligentFieldValidator {
  validateMapping(headers, currentMappings, sampleData) {
    const mappedFields = [];
    const unmappedFields = [];
    const missingRequired = [];
    const suggestions = [];
    
    // 获取所有可用字段
    const allDbFields = {
      ...ADAPTED_DATABASE_FIELDS.required,
      ...ADAPTED_DATABASE_FIELDS.scores,
      ...ADAPTED_DATABASE_FIELDS.additional
    };
    
    // 检查已映射字段
    Object.entries(currentMappings).forEach(([header, dbField]) => {
      if (allDbFields[dbField]) {
        mappedFields.push(header);
      }
    });
    
    // 找出未映射字段
    headers.forEach(header => {
      if (!currentMappings[header]) {
        const analysis = this.analyzeField(header, sampleData);
        unmappedFields.push(analysis);
      }
    });
    
    // 检查必需字段
    Object.keys(ADAPTED_DATABASE_FIELDS.required).forEach(requiredField => {
      const isMapped = Object.values(currentMappings).includes(requiredField);
      if (!isMapped) {
        missingRequired.push(requiredField);
      }
    });
    
    return {
      isValid: missingRequired.length === 0,
      mappedFields,
      unmappedFields,
      missingRequired,
      suggestions: [
        `发现 ${unmappedFields.length} 个未映射字段`,
        missingRequired.length > 0 ? `缺少必需字段：${missingRequired.join('、')}` : ''
      ].filter(Boolean),
      score: Math.round((mappedFields.length / headers.length) * 100)
    };
  }
  
  analyzeField(header, sampleData) {
    const headerLower = header.toLowerCase();
    let suggestedSubject = '';
    let suggestedType = 'score';
    let confidence = 0.5;
    const reasons = [];
    
    // 科目识别
    for (const [subjectKey, subjectInfo] of Object.entries(ADAPTED_SUBJECT_PATTERNS)) {
      if (subjectInfo.patterns.some(pattern => pattern.test(headerLower))) {
        suggestedSubject = subjectKey;
        suggestedType = 'score';
        confidence = 0.8;
        reasons.push(`匹配科目: ${subjectInfo.name}`);
        break;
      }
    }
    
    // 类型识别
    if (headerLower.includes('排名') || headerLower.includes('名次')) {
      suggestedType = 'rank';
      confidence = 0.7;
    } else if (headerLower.includes('等级')) {
      suggestedType = 'grade';
      confidence = 0.7;
    }
    
    return {
      originalName: header,
      sampleValues: sampleData.slice(0, 3).map(row => row[header] || ''),
      suggestedSubject,
      suggestedType,
      confidence,
      reasons
    };
  }
  
  generateDbFieldName(subject, type) {
    if (type === 'rank') return 'rank_in_class';
    if (type === 'grade') return 'grade';
    if (subject && ADAPTED_SUBJECT_PATTERNS[subject]) {
      return ADAPTED_SUBJECT_PATTERNS[subject].field;
    }
    return 'score'; // 默认使用通用score字段
  }
  
  isValidDbField(fieldName) {
    const allFields = {
      ...ADAPTED_DATABASE_FIELDS.required,
      ...ADAPTED_DATABASE_FIELDS.scores,
      ...ADAPTED_DATABASE_FIELDS.additional
    };
    return !!allFields[fieldName];
  }
}

export const adaptedFieldValidator = new AdaptedIntelligentFieldValidator();
